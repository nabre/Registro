// Le riconsegne: le prove svolte che sono ancora nella borsa di chi insegna.
//
// Una verifica non finisce il giorno in cui si fa. Si raccoglie, si corregge,
// si riporta in classe: sono tre momenti, e i due ultimi non hanno niente che
// li ricordi. La prova svolta smette di comparire da qualsiasi parte — il
// calendario l'ha già passata, la scaletta di quell'ora è chiusa, la griglia
// dei voti sta ferma dove è sempre stata — e l'unico posto in cui esiste è la
// pila sulla scrivania. Da lì a «prof, quando ce la ridà?» passano tre
// settimane, ed è il genere di ritardo che nessuno decide: capita.
//
// Qui la prova svolta torna a chiedere qualcosa, come una consegna non
// spuntata. Lo stato lo dicono i voti — mancano, e allora c'è da correggere;
// ci sono tutti, e allora c'è da riconsegnare — così il primo pezzo si chiude
// da sé mettendo i voti, senza una spunta in più.
//
// L'unica cosa che si scrive è l'ultima: il giorno in cui la prova è tornata
// in mano agli allievi. Non si deduce da niente. Un voto messo è un voto che
// il docente conosce, non un voto che l'allievo ha visto.

import { allieviAttivi, nomeCompleto } from './calculations.js'
import { rigaDelRecupero } from './retakes.js'
import { differenzaGiorni } from './dates.js'
import type { Allievo, Classe, Iso, MomentoValutazione, Registro, Voto } from './models.js'
import { valoriDi } from './objects.js'

/**
 * A che punto è una prova svolta.
 *
 * Tre stati e non due: «da correggere» e «da riconsegnare» sono due lavori
 * diversi, si fanno in due momenti diversi, e un elenco che li mescola
 * costringe ad aprire ogni riga per sapere di che cosa si tratta. Il primo si
 * chiude mettendo i voti; il secondo va detto.
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
   * Passato il tempo che una correzione richiede, e ancora in mano al docente.
   *
   * Non è un errore ed è per questo che è una proprietà e non un mucchio a
   * parte: le prove in ritardo restano dove sono, fra quelle da correggere o
   * fra quelle da riconsegnare, perché il gesto che le chiude è lo stesso. Il
   * ritardo dice soltanto quali guardare per prime.
   */
  inRitardo: boolean
  /** Quante caselle sono sistemate, su quanti allievi che frequentano. */
  corretti: number
  attesi: number
  /**
   * Quanti fogli sono ancora in mano al docente, nome per nome.
   *
   * Zero chiude la prova: è la sola misura che conta, e vale anche quando la
   * data della classe non c'è. Chi segna la riconsegna allievo per allievo —
   * perché la pila è tornata indietro in tre volte, o perché quel giorno
   * mancava mezza classe — ha finito il lavoro esattamente come chi ha messo
   * una data sola.
   */
  daRidare: number
  /**
   * Il giorno in cui si è chiusa: quello della classe, o l'ultimo dei suoi.
   *
   * Il secondo caso non è un ripiego: una prova tornata indietro un nome alla
   * volta è finita quando è tornato l'ultimo foglio, ed è quella la data che
   * qualcuno verrebbe a cercare.
   */
  riconsegnataIl: Iso | null
}

/**
 * Dopo quanti giorni una prova svolta comincia a pesare.
 *
 * Due settimane: è il termine che quasi tutte le sedi mettono nel loro
 * regolamento, ed è anche il punto oltre il quale la classe comincia a
 * chiedere. Non è una scadenza — nessuno la impone qui dentro — ma è la
 * distanza a cui vale la pena che una riga si faccia notare.
 */
export const GIORNI_PER_RICONSEGNARE = 14

/** Vero se la prova non è ancora tornata agli allievi. */
export function apertaRiconsegna (stato: StatoRiconsegna): boolean {
  return stato !== 'riconsegnata'
}

/**
 * Vero se la casella di un allievo è sistemata.
 *
 * Un voto messo la sistema; un'assenza pure — chi non c'era non ha una prova
 * da farsi ridare, e la sua casella la guarda il todo dei recuperi, che è un
 * altro debito e un altro elenco. Contarla qui vorrebbe dire una verifica con
 * due assenti che non risulta mai corretta.
 */
function sistemata (voto: Voto | undefined): boolean {
  if (!voto) return false
  if (voto.assente) return true
  return voto.valore !== null
}

/**
 * Lo stato di una prova rispetto a un giorno, o `null` se non c'è niente da
 * dire.
 *
 * Niente da dire vuol dire una prova che non si è ancora svolta: quella è nel
 * calendario, e chiederne la riconsegna prima che si faccia sarebbe una riga
 * che parla di un futuro. Il giorno stesso invece sì — una verifica fatta
 * stamattina è già una pila da correggere.
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

  // La prova è chiusa quando non resta più un foglio in mano al docente. Non
  // c'è una data di gruppo che possa dirlo al posto delle righe: diceva «la
  // classe l'ha riavuta» anche di chi quel giorno mancava, ed erano proprio
  // quei due o tre fogli a restare nella cartella fino a giugno.
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
  // È finita quando è tornato l'ultimo foglio: quella è la data che qualcuno
  // verrebbe a cercare.
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
 * Tutte le prove svolte dei corsi dati, divise per che cosa manca.
 *
 * I corsi arrivano già scelti da chi chiama: il filtro per classe è una cosa
 * del pannello, non del dominio.
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
 * La prova di un allievo, e il giorno in cui l'ha riavuta.
 *
 * Ridistribuire la pila è un gesto solo, ma non arriva a tutti quel giorno:
 * chi mancava riavrà la sua un'altra volta, e di solito è chi ha più bisogno
 * di vederla. Con una data sola per la prova quei fogli non li reclamava
 * nessuno — il momento risultava riconsegnato, e i due o tre compiti restavano
 * nella cartella fino a giugno. Per questo la data sta qui, una per riga:
 * riconsegnare a tutta la classe scrive lo stesso giorno su ognuna.
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
 * Chi deve ancora riavere la sua prova, nome per nome.
 *
 * Solo chi ha un voto: una casella vuota non è un foglio da ridare — è una
 * correzione da fare, e la guarda `riconsegnaDelMomento`. Gli assenti nemmeno:
 * la loro prova non esiste ancora, e il loro debito è il recupero.
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
    // Chi ha rifatto la prova non ha un foglio del primo giro: il suo è quello
    // del recupero, e la sua riconsegna è segnata là. Contarlo anche qui
    // vorrebbe dire due righe per lo stesso compito — e quella di qui si
    // chiuderebbe da sola con la data della classe, che per lui non vale.
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
 * Le prove che restano da ridare a qualcuno, in tutti i corsi dati.
 *
 * Sono righe per allievo e non per prova: la prova può essere tornata alla
 * classe e restare in mano a chi quel giorno non c'era, e quel foglio lo
 * reclama solo un elenco che lo nomina.
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
    // Una prova che deve ancora svolgersi non ha niente da ridare, come per
    // la riconsegna di classe.
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

