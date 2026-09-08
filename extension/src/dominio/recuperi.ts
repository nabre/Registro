// I recuperi: chi non c'era il giorno della prova, e che cosa se ne fa.
//
// Una verifica con tre assenti non è una verifica finita. Restano tre caselle
// vuote che nessuno rivendica: l'allievo non se ne ricorda, il registro dice
// solo «assente», e la media di fine semestre si calcola su quel che c'è —
// così un buco diventa uno sconto. Il recupero va promosso da chi insegna,
// nome per nome, e finché non è promosso non esiste da nessuna parte.
//
// Il momento di valutazione resta uno. Una prova recuperata non è un'altra
// prova: è la stessa verifica, sullo stesso argomento, con lo stesso peso, che
// due o tre allievi fanno un altro giorno. Farne un momento a parte voleva dire
// una colonna in più nella griglia per ogni assente, medie da ricomporre a mano
// e due prove nei rapporti dove ce n'era una — e il voto finiva in una colonna
// che per gli altri ventidue non vuol dire niente.
//
// Il recupero sta quindi in una tabella supplementare del momento, `recuperi`:
// una riga per allievo, con il giorno in cui rifà la prova, la nota, e i suoi
// documenti scansionati. Il voto invece no: quello va nella casella di sempre,
// nella griglia, perché è il voto di quella prova — è per averlo che il
// recupero si fa.
//
// I recuperi non si scrivono da zero: si *deducono* da quel che il registro sa
// già. Un allievo è da recuperare quando la sua casella è vuota e o è segnato
// assente alla prova, o l'appello di quell'ora dice che non c'era. La seconda
// regola è quella che conta: l'appello è già stato fatto, e ribattere gli
// stessi nomi nella griglia dei voti sarebbe la stessa informazione scritta due
// volte, con la possibilità che le due si contraddicano.

import { allieviAttivi, contaUd, statiAllineati, statoDellOra } from './calcoli.js'
import { sommaGiorni } from './date.js'
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
} from './modelli.js'

/**
 * Che cosa è un recupero, rispetto a un giorno preciso.
 *
 * `da-fissare` è il solo che chieda una decisione: gli altri quattro sono
 * l'attesa di una data già presa. La distinzione conta perché sono due gesti
 * diversi — «con Rossi devo ancora accordarmi» e «giovedì tocca a Rossi» — e
 * un elenco che li mescola non si guarda più.
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
   * L'assenza è dichiarata nella griglia dei voti, o solo dedotta dall'appello
   * dell'ora. Cambia quanto ci si può fidare: la seconda è un'ipotesi buona —
   * chi non c'era non ha fatto la prova — ma un allievo può essere entrato in
   * ritardo proprio per la verifica, o averla fatta un altro giorno.
   */
  daAppello: boolean
}

/**
 * Vero se l'allievo era assente all'ora in cui la prova si è fatta.
 *
 * Non è la stessa cosa che essere segnato assente alla prova: sono due fatti
 * distinti, ed è giusto che lo restino. Qui serve solo a proporre il recupero
 * senza aspettare che qualcuno riscriva a mano quel che l'appello sa già.
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
  return statoDellOra(statiAllineati(presenza, contaUd(lezione))) === 'assente'
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
 * La scansione della prova di recupero di un allievo.
 *
 * Sta fra gli allegati del momento come tutti gli altri PDF — stesso elenco,
 * stessa cartella, stesso cestino — e si distingue per il ruolo. Con
 * `allievoId` nullo è il testo della prova di recupero, che è uno per tutti.
 */
export function documentoDelRecupero (
  momento: MomentoValutazione,
  allievoId: string | null,
): Allegato | null {
  return (
    momento.allegati.find((a) => a.ruolo === 'recupero' && a.allievoId === allievoId) ?? null
  )
}

/**
 * A che punto è il recupero di un allievo, o `null` se non ce n'è uno.
 *
 * Un voto messo chiude il recupero da sé: è quel che il recupero doveva
 * produrre, e chiedere una seconda spunta per dire che è arrivato sarebbe una
 * pratica in più per niente. Chi dispensa lo dice esplicitamente — è una
 * decisione, non una conseguenza.
 */
export function statoDelRecupero (
  registro: Registro,
  momento: MomentoValutazione,
  allievoId: string,
  giorno: Iso,
): StatoRecupero | null {
  const voto = votoDi(momento, allievoId)
  const riga = rigaDelRecupero(momento, allievoId)

  // Il voto c'è: la prova è stata fatta, prima o dopo non importa.
  if (voto && voto.valore !== null) return riga ? 'fatto' : null
  if (riga?.dispensato) return 'dispensato'

  const mancava = voto?.assente === true || assenteAllOra(registro, momento, allievoId)
  if (!mancava) return null

  const previsto = riga?.previstoIl ?? null
  if (!previsto) return 'da-fissare'
  if (previsto === giorno) return 'oggi'
  return previsto < giorno ? 'scaduto' : 'fissato'
}

/**
 * I recuperi di una prova, uno per allievo che manca.
 *
 * Solo chi frequenta ancora: un recupero che aspetta chi si è ritirato resta
 * aperto per sempre, e un elenco che non si svuota mai è un elenco che si
 * impara a saltare.
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
      riconsegnataIl: riga?.riconsegnataIl ?? null,
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
  /** Nessuna data: sono quelli da promuovere, ed è il motivo di tutta la pagina. */
  daFissare: Recupero[]
  oggi: Recupero[]
  /** Entro la settimana. */
  presto: Recupero[]
  avanti: Recupero[]
  /**
   * Rifatta e valutata, ma non ancora tornata in mano all'allievo.
   *
   * È l'ultimo pezzo, e quello che si perde per strada: il voto è messo, il
   * recupero sparisce dagli elenchi di quel che manca, e il foglio corretto
   * resta nella cartella. Un voto che l'allievo non ha visto non è un voto
   * consegnato — e la data della riconsegna è quella da cui si contano i
   * termini di un ricorso.
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
    `${a.allievo.cognome} ${a.allievo.nome}`.localeCompare(
      `${b.allievo.cognome} ${b.allievo.nome}`,
      'it',
    )
  )
}

/**
 * Tutti i recuperi dei corsi dati, divisi per quanto premono.
 *
 * `daFissare` viene prima di tutto il resto, scaduti compresi: un recupero
 * senza data non è in ritardo, è *inesistente* — e finché nessuno lo fissa non
 * lo diventerà mai. È l'unica riga dell'elenco che chiede di fare qualcosa
 * adesso invece che di ricordarsi qualcosa.
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
        // Il voto c'è: quel che resta è ridare il foglio. Finché non è
        // successo la faccenda non è chiusa, ed è la parte che si dimentica —
        // dagli altri elenchi è già uscita.
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

  for (const mucchio of Object.values(esito)) mucchio.sort(ordina)
  return esito
}

/** Quanti recuperi aspettano una decisione o una data ormai passata. */
export function recuperiUrgenti (gruppi: RecuperiDaFare): number {
  return gruppi.daFissare.length + gruppi.scaduti.length
}

/**
 * I recuperi fissati per una lezione: chi rifà la prova in quest'ora.
 *
 * Si guarda entrando in aula, ed è il solo momento in cui la data fissata
 * serve a qualcosa. Sono quelli del corso, non della classe: in un'ora di
 * matematica non si rifà la verifica di storia.
 *
 * Ci sono anche quelli già chiusi. Mettere il voto è il gesto che chiude un
 * recupero, e filtrare via i chiusi voleva dire che la riga spariva un istante
 * dopo averla usata: si batteva la cifra e il riquadro si svuotava, come se
 * quell'ora non avesse più niente a che fare con quella prova. L'ora invece
 * resta quella in cui la prova è stata rifatta — è il suo verbale — e chi
 * riapre quel giorno deve ritrovarcela, con dentro il voto.
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
