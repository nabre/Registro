// I recuperi: chi non c'era il giorno della prova, e che cosa se ne fa.
//
// Un recupero non è un momento di valutazione a parte: è la stessa prova rifatta
// un altro giorno. Sta nella tabella `recuperi` del momento (giorno, nota,
// scansioni); il voto va nella casella di sempre della griglia.
//
// I recuperi si deducono: un allievo è da recuperare se la sua casella è vuota
// e o è segnato assente alla prova, o l'appello di quell'ora dice che non
// c'era. Così l'appello non va ribattuto nella griglia dei voti.

import { allieviAttivi, contaUd, nomeCompleto, statiAllineati, statoDellOra } from './calculations.js'
import { sommaGiorni } from './dates.js'
import { valoriDi } from './objects.js'
import type {
  Allegato,
  Allievo,
  Classe,
  Iso,
  Lezione,
  MomentoValutazione,
  RecuperoProva,
  Registro,
  Voto,
} from './models.js'

/**
 * Che cosa è un recupero rispetto a un giorno. `da-fissare` è il solo che
 * chiede una decisione; gli altri seguono una data già presa.
 */
export type StatoRecupero =
  | 'da-fissare'
  | 'fissato'
  | 'oggi'
  | 'scaduto'
  | 'fatto'
  | 'dispensato'

/** Un recupero in sospeso: la prova, l'allievo, e a che punto è. */
export interface Recupero {
  momento: MomentoValutazione
  allievo: Allievo
  corsoId: string
  classeId: string
  stato: StatoRecupero
  /** Il giorno in cui si rifà, se è stato fissato. */
  previstoIl: Iso | null
  /** Il giorno in cui la prova rifatta è tornata a lui: uno per allievo. */
  riconsegnataIl: Iso | null
  nota: string
  /** Il voto preso rifacendola: sta nella casella di sempre, non qui accanto. */
  voto: number | null
  /** La scansione della sua prova di recupero, quando è stata archiviata. */
  documento: Allegato | null
  /**
   * Vero se l'assenza è solo dedotta dall'appello, non dichiarata nella
   * griglia: ipotesi buona, ma l'allievo può aver fatto la prova lo stesso.
   */
  daAppello: boolean
}

/**
 * Vero se l'allievo era assente all'ora della prova. È un fatto distinto
 * dall'essere segnato assente alla prova; serve a proporre il recupero.
 */
export function assenteAllOra (
  registro: Registro,
  momento: MomentoValutazione,
  allievoId: string,
): boolean {
  if (!momento.lezioneId) return false
  const lezione = registro.lezioni.find((l) => l.id === momento.lezioneId)
  if (!lezione) return false
  const presenza = lezione.presenze.find((p) => p.allievoId === allievoId)
  if (!presenza) return false
  const quante = contaUd(lezione, registro.impostazioni.minutiUd)
  return statoDellOra(statiAllineati(presenza, quante)) === 'assente'
}

/** Il voto di un allievo in un momento, se la casella è stata toccata. */
function votoDi (momento: MomentoValutazione, allievoId: string): Voto | null {
  return momento.voti.find((v) => v.allievoId === allievoId) ?? null
}

/** La riga della tabella dei recuperi che riguarda un allievo. */
export function rigaDelRecupero (
  momento: MomentoValutazione,
  allievoId: string,
): RecuperoProva | null {
  return (momento.recuperi ?? []).find((r) => r.allievoId === allievoId) ?? null
}

/**
 * La scansione della prova di recupero di un allievo: un allegato del momento
 * con ruolo `recupero`. Con `allievoId` nullo è il testo della prova di
 * recupero, uno per tutti.
 */
function documentoDelRecupero (
  momento: MomentoValutazione,
  allievoId: string | null,
): Allegato | null {
  return (
    momento.allegati.find((a) => a.ruolo === 'recupero' && a.allievoId === allievoId) ?? null
  )
}

/**
 * A che punto è il recupero di un allievo, o `null` se non ce n'è uno. Un voto
 * messo lo chiude da sé; la dispensa è una scelta esplicita.
 */
export function statoDelRecupero (
  registro: Registro,
  momento: MomentoValutazione,
  allievoId: string,
  giorno: Iso,
): StatoRecupero | null {
  const voto = votoDi(momento, allievoId)
  const riga = rigaDelRecupero(momento, allievoId)
  const mancava = voto?.assente === true || assenteAllOra(registro, momento, allievoId)

  // Il voto c'è: fatto. Anche senza riga di recupero, che è il caso normale
  // (assenza dedotta dall'appello, voto scritto dritto): altrimenti la riga
  // sparirebbe invece di passare a «recuperata».
  if (voto && voto.valore !== null) return riga || mancava ? 'fatto' : null
  if (riga?.dispensato) return 'dispensato'

  if (!mancava) return null

  const previsto = riga?.previstoIl ?? null
  if (!previsto) return 'da-fissare'
  if (previsto === giorno) return 'oggi'
  return previsto < giorno ? 'scaduto' : 'fissato'
}

/**
 * I recuperi di una prova, uno per allievo che manca. Solo chi frequenta:
 * il recupero di un ritirato resterebbe aperto per sempre.
 */
export function recuperiDelMomento (
  registro: Registro,
  momento: MomentoValutazione,
  classe: Classe | null,
  giorno: Iso,
): Recupero[] {
  if (!classe) return []
  const esito: Recupero[] = []

  for (const allievo of allieviAttivi(classe)) {
    const stato = statoDelRecupero(registro, momento, allievo.id, giorno)
    if (!stato) continue
    const voto = votoDi(momento, allievo.id)
    const riga = rigaDelRecupero(momento, allievo.id)
    esito.push({
      momento,
      allievo,
      corsoId: momento.corsoId,
      classeId: classe.id,
      stato,
      previstoIl: riga?.previstoIl ?? null,
      // Senza riga di recupero vale la riconsegna del voto.
      riconsegnataIl: riga ? riga.riconsegnataIl ?? null : voto?.riconsegnataIl ?? null,
      nota: riga?.nota ?? '',
      voto: voto?.valore ?? null,
      documento: documentoDelRecupero(momento, allievo.id),
      daAppello: voto?.assente !== true,
    })
  }

  return esito
}

/** I mucchi in cui si guardano i recuperi: gli stessi del todo delle consegne. */
export interface RecuperiDaFare {
  /** Fissati per un giorno che è passato: la prova non è stata rifatta. */
  scaduti: Recupero[]
  /** Nessuna data: quelli da promuovere. */
  daFissare: Recupero[]
  oggi: Recupero[]
  /** Entro la settimana. */
  presto: Recupero[]
  avanti: Recupero[]
  /**
   * Rifatta e valutata, ma non ancora ridata all'allievo: è la parte che si
   * dimentica, e dalla data di riconsegna contano i termini di ricorso.
   */
  daRiconsegnare: Recupero[]
  chiusi: Recupero[]
}

/** Entro quanti giorni una data conta come «sta arrivando». */
const GIORNI_VICINI = 7

function ordina (a: Recupero, b: Recupero): number {
  return (
    (a.previstoIl ?? a.momento.data).localeCompare(b.previstoIl ?? b.momento.data) ||
    a.momento.data.localeCompare(b.momento.data) ||
    nomeCompleto(a.allievo).localeCompare(nomeCompleto(b.allievo), 'it')
  )
}

/**
 * Tutti i recuperi dei corsi dati, divisi per quanto premono. `daFissare`
 * viene prima di tutto: senza data un recupero non accadrà mai.
 */
export function recuperiDaFare (
  registro: Registro,
  corsi: Array<{ id: string, classeId: string }>,
  giorno: Iso,
): RecuperiDaFare {
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, registro.classi.find((c) => c.id === corso.classeId) ?? null]),
  )
  const esito: RecuperiDaFare = {
    scaduti: [],
    daFissare: [],
    oggi: [],
    presto: [],
    avanti: [],
    daRiconsegnare: [],
    chiusi: [],
  }

  for (const momento of registro.valutazioni) {
    if (!classePerCorso.has(momento.corsoId)) continue
    const classe = classePerCorso.get(momento.corsoId) ?? null
    for (const recupero of recuperiDelMomento(registro, momento, classe, giorno)) {
      if (recupero.stato === 'fatto') {
        // Il voto c'è: resta da ridare il foglio.
        if (recupero.riconsegnataIl) esito.chiusi.push(recupero)
        else esito.daRiconsegnare.push(recupero)
      } else if (recupero.stato === 'dispensato') {
        esito.chiusi.push(recupero)
      } else if (recupero.stato === 'da-fissare') {
        esito.daFissare.push(recupero)
      } else if (recupero.stato === 'scaduto') {
        esito.scaduti.push(recupero)
      } else if (recupero.stato === 'oggi') {
        esito.oggi.push(recupero)
      } else if (
        recupero.previstoIl !== null &&
        recupero.previstoIl <= sommaGiorni(giorno, GIORNI_VICINI)
      ) {
        esito.presto.push(recupero)
      } else {
        esito.avanti.push(recupero)
      }
    }
  }

  for (const mucchio of valoriDi(esito)) mucchio.sort(ordina)
  return esito
}

/** Quanti recuperi aspettano una decisione o una data ormai passata. */
export function recuperiUrgenti (gruppi: RecuperiDaFare): number {
  return gruppi.daFissare.length + gruppi.scaduti.length
}

/**
 * I recuperi fissati per una lezione: chi rifà la prova in quest'ora, solo per
 * il corso dell'ora. Compresi i chiusi: l'ora è il verbale della prova rifatta,
 * e mettere il voto non deve far sparire la riga.
 */
export function recuperiDellaLezione (registro: Registro, lezione: Lezione): Recupero[] {
  const classeId = registro.corsi.find((c) => c.id === lezione.corsoId)?.classeId ?? null
  const classe = registro.classi.find((c) => c.id === classeId) ?? null

  const esito: Recupero[] = []
  for (const momento of registro.valutazioni) {
    if (momento.corsoId !== lezione.corsoId) continue
    for (const recupero of recuperiDelMomento(registro, momento, classe, lezione.data)) {
      if (recupero.previstoIl === lezione.data) esito.push(recupero)
    }
  }
  return esito.sort(ordina)
}
