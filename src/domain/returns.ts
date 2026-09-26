// Le riconsegne: le prove svolte ancora in mano a chi insegna.
//
// Dopo la prova non c'è niente che ricordi di correggerla e riportarla: qui la
// prova torna a chiedere qualcosa, come una consegna non spuntata. Lo stato lo
// dicono i voti (mancano: da correggere; ci sono: da riconsegnare). Si scrive
// solo il giorno in cui il foglio torna all'allievo, che non si deduce.

import { allieviAttivi, nomeCompleto } from './calculations.js'
import { rigaDelRecupero } from './retakes.js'
import { differenzaGiorni } from './dates.js'
import type { Allievo, Classe, Iso, MomentoValutazione, Registro, Voto } from './models.js'
import { valoriDi } from './objects.js'

/**
 * A che punto è una prova svolta. «Da correggere» e «da riconsegnare» sono due
 * lavori distinti: il primo si chiude mettendo i voti, il secondo va detto.
 */
export type StatoRiconsegna = 'da-correggere' | 'da-riconsegnare' | 'riconsegnata'

/** Una prova svolta, con quel che le manca per essere finita. */
export interface Riconsegna {
  momento: MomentoValutazione
  corsoId: string
  classeId: string | null
  stato: StatoRiconsegna
  /** Da quanti giorni la prova si è svolta: è la misura del ritardo. */
  giorniPassati: number
  /**
   * Ferma oltre `GIORNI_PER_RICONSEGNARE`. È una proprietà e non un mucchio:
   * la prova resta fra quelle da correggere o da riconsegnare, il ritardo dice
   * solo quali guardare prima.
   */
  inRitardo: boolean
  /** Quante caselle sono sistemate, su quanti allievi che frequentano. */
  corretti: number
  attesi: number
  /**
   * Quanti fogli sono ancora in mano al docente, nome per nome. Zero chiude la
   * prova, che la riconsegna sia stata segnata per classe o allievo per allievo.
   */
  daRidare: number
  /** Il giorno in cui si è chiusa: quello in cui è tornato l'ultimo foglio. */
  riconsegnataIl: Iso | null
}

/**
 * Dopo quanti giorni una prova svolta si fa notare: due settimane, il termine
 * dei regolamenti di quasi tutte le sedi. Non è una scadenza imposta.
 */
export const GIORNI_PER_RICONSEGNARE = 14

/** Vero se la prova non è ancora tornata agli allievi. */
export function apertaRiconsegna (stato: StatoRiconsegna): boolean {
  return stato !== 'riconsegnata'
}

/**
 * Vero se la casella di un allievo è sistemata: un voto o un'assenza (chi non
 * c'era è un recupero, un altro elenco).
 */
function sistemata (voto: Voto | undefined): boolean {
  if (!voto) return false
  if (voto.assente) return true
  return voto.valore !== null
}

/**
 * Lo stato di una prova rispetto a un giorno, o `null` se non si è ancora
 * svolta. Il giorno stesso conta già.
 */
export function riconsegnaDelMomento (
  momento: MomentoValutazione,
  classe: Classe | null,
  giorno: Iso,
): Riconsegna | null {
  if (momento.data > giorno) return null

  const allievi = classe ? allieviAttivi(classe) : []
  const corretti = allievi.filter((allievo) =>
    sistemata(momento.voti.find((v) => v.allievoId === allievo.id)),
  ).length

  // Chiusa quando non resta un foglio in mano al docente: una data di gruppo
  // non basta, chi mancava quel giorno non l'ha riavuta.
  const mancanti = riconsegneDegliAllievi(momento, classe, true)
  const tutteTornate = mancanti.length === 0
  const ultima =
    riconsegneDegliAllievi(momento, classe)
      .map((riga) => riga.riconsegnataIl)
      .filter((quando): quando is Iso => quando !== null)
      .sort()
      .at(-1) ?? null

  const stato: StatoRiconsegna =
    corretti < allievi.length ? 'da-correggere' : tutteTornate ? 'riconsegnata' : 'da-riconsegnare'
  // Si chiude con l'ultimo foglio tornato.
  const riconsegnataIl = tutteTornate ? ultima : null

  const giorniPassati = differenzaGiorni(momento.data, giorno)

  return {
    momento,
    corsoId: momento.corsoId,
    classeId: classe?.id ?? null,
    stato,
    giorniPassati,
    inRitardo: apertaRiconsegna(stato) && giorniPassati > GIORNI_PER_RICONSEGNARE,
    corretti,
    attesi: allievi.length,
    daRidare: mancanti.length,
    riconsegnataIl,
  }
}

/** I mucchi in cui si guardano le riconsegne: uno per lavoro da fare. */
export interface RiconsegneDaFare {
  /** Svolte, con caselle ancora vuote: la pila da correggere. */
  daCorreggere: Riconsegna[]
  /** Corrette e ferme: manca solo riportarle in classe. */
  daRiconsegnare: Riconsegna[]
  /** Tornate agli allievi: stanno in fondo, chiuse. */
  fatte: Riconsegna[]
}

/** Prima le più vecchie: è la pila, e in fondo alla pila c'è quel che aspetta di più. */
function ordina (a: Riconsegna, b: Riconsegna): number {
  return (
    a.momento.data.localeCompare(b.momento.data) ||
    a.momento.titolo.localeCompare(b.momento.titolo, 'it')
  )
}

/**
 * Tutte le prove svolte dei corsi dati, divise per che cosa manca. Il filtro
 * dei corsi lo fa chi chiama.
 */
export function riconsegneDaFare (
  registro: Registro,
  corsi: Array<{ id: string, classeId: string }>,
  giorno: Iso,
): RiconsegneDaFare {
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, registro.classi.find((c) => c.id === corso.classeId) ?? null]),
  )
  const esito: RiconsegneDaFare = { daCorreggere: [], daRiconsegnare: [], fatte: [] }

  for (const momento of registro.valutazioni) {
    if (!classePerCorso.has(momento.corsoId)) continue
    const riconsegna = riconsegnaDelMomento(
      momento,
      classePerCorso.get(momento.corsoId) ?? null,
      giorno,
    )
    if (!riconsegna) continue
    if (riconsegna.stato === 'riconsegnata') esito.fatte.push(riconsegna)
    else if (riconsegna.stato === 'da-correggere') esito.daCorreggere.push(riconsegna)
    else esito.daRiconsegnare.push(riconsegna)
  }

  for (const mucchio of valoriDi(esito)) mucchio.sort(ordina)
  return esito
}

/** Quante prove sono ferme da più tempo di quanto una correzione richieda. */
export function riconsegneUrgenti (gruppi: RiconsegneDaFare): number {
  return [...gruppi.daCorreggere, ...gruppi.daRiconsegnare].filter((r) => r.inRitardo).length
}

/** Quante prove sono ancora in mano al docente, in un modo o nell'altro. */
export function riconsegneAperte (gruppi: RiconsegneDaFare): number {
  return gruppi.daCorreggere.length + gruppi.daRiconsegnare.length
}

// ------------------------------------------------------- una prova per allievo

/**
 * La prova di un allievo, e il giorno in cui l'ha riavuta. La data è per riga
 * perché chi mancava alla riconsegna la riavrà un altro giorno; riconsegnare a
 * tutta la classe scrive lo stesso giorno su ognuna.
 */
export interface RiconsegnaAllievo {
  momento: MomentoValutazione
  allievo: Allievo
  corsoId: string
  classeId: string | null
  /** Il voto che deve tornare indietro: senza voto non c'è foglio da ridare. */
  voto: number
  /** Il giorno in cui l'ha riavuta la sua: nullo finché il foglio è in mano al docente. */
  riconsegnataIl: Iso | null
}

/**
 * Chi deve ancora riavere la sua prova, nome per nome. Solo chi ha un voto:
 * una casella vuota è una correzione da fare, un'assenza è un recupero.
 */
export function riconsegneDegliAllievi (
  momento: MomentoValutazione,
  classe: Classe | null,
  soloDaFare = false,
): RiconsegnaAllievo[] {
  const esito: RiconsegnaAllievo[] = []

  for (const allievo of classe ? allieviAttivi(classe) : []) {
    const voto = momento.voti.find((v) => v.allievoId === allievo.id)
    if (!voto || voto.assente || voto.valore === null) continue
    // Chi ha rifatto la prova ha il foglio del recupero, la cui riconsegna è
    // segnata là.
    if (rigaDelRecupero(momento, allievo.id)) continue

    const riconsegnataIl = voto.riconsegnataIl ?? null
    if (soloDaFare && riconsegnataIl) continue

    esito.push({
      momento,
      allievo,
      corsoId: momento.corsoId,
      classeId: classe?.id ?? null,
      voto: voto.valore,
      riconsegnataIl,
    })
  }

  return esito
}

/**
 * Le prove da ridare a qualcuno nei corsi dati, per allievo: la classe può
 * averla riavuta mentre chi mancava no.
 */
export function riconsegneAgliAllievi (
  registro: Registro,
  corsi: Array<{ id: string, classeId: string }>,
  giorno: Iso,
): RiconsegnaAllievo[] {
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, registro.classi.find((c) => c.id === corso.classeId) ?? null]),
  )

  const esito: RiconsegnaAllievo[] = []
  for (const momento of registro.valutazioni) {
    if (!classePerCorso.has(momento.corsoId)) continue
    // Una prova futura non ha niente da ridare.
    if (momento.data > giorno) continue
    esito.push(
      ...riconsegneDegliAllievi(momento, classePerCorso.get(momento.corsoId) ?? null, true),
    )
  }

  return esito.sort(
    (a, b) =>
      a.momento.data.localeCompare(b.momento.data) ||
      nomeCompleto(a.allievo).localeCompare(nomeCompleto(b.allievo), 'it'),
  )
}

