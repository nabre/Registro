// Le consegne: quel che si è dato da fare, e a chi.
//
// La differenza con il campo `compiti` di una lezione è tutta qui: quello è il
// verbale di un'ora — si scrive una volta e resta lì — mentre una consegna vive.
// Nasce in un'ora, ha un termine, e torna a galla in ogni lezione successiva
// del corso finché non è spuntata. È la differenza fra «l'avevo scritto» e «me
// l'ero segnato»: la prima si legge solo riaprendo quel giorno, la seconda si
// presenta da sola quando serve.
//
// Le date sono due, e ognuna può essere detta in due modi: una lezione o un
// giorno. Legarla alla lezione è quasi sempre la cosa giusta — «per la prossima
// volta» non è una data, è un'ora — e spostando quella lezione la consegna si
// sposta con lei. Un giorno secco serve quando il termine non coincide con
// nessuna ora: la gita, la consegna in segreteria, il modulo da firmare.

import { inizioLezione } from './calcoli.js'
import { sommaGiorni } from './date.js'
import { CHI_INSEGNA } from './modelli.js'
import { compilaModello } from './testo.js'
import type {
  Classe,
  Consegna,
  Iso,
  Lezione,
  Registro,
  SpuntaConsegna,
} from './modelli.js'

/** La lezione a cui una consegna è legata, se esiste ancora. */
function lezioneDi (registro: Registro, id: string | null): Lezione | null {
  return id ? registro.lezioni.find((l) => l.id === id) ?? null : null
}

/**
 * Il giorno in cui la consegna è stata data. Se è legata a un'ora, è il giorno
 * di quell'ora — anche se nel frattempo l'ora si è spostata.
 */
export function dataConsegna (registro: Registro, consegna: Consegna): Iso {
  return lezioneDi(registro, consegna.dataLezioneId)?.data ?? consegna.data
}

/**
 * Il giorno entro cui va fatta, o `null` se non c'è un termine.
 *
 * Una consegna senza termine non è un errore: «tenere d'occhio Rossi» non
 * scade, e si chiude quando si è visto quel che c'era da vedere.
 */
export function scadenzaConsegna (registro: Registro, consegna: Consegna): Iso | null {
  return lezioneDi(registro, consegna.scadenzaLezioneId)?.data ?? consegna.scadenza
}

/**
 * Chi deve spuntarla. Uno solo per il docente, tutti gli iscritti attivi per la
 * classe, i nomi scelti quando è di qualcuno in particolare.
 *
 * Gli allievi che non frequentano più restano fuori: una consegna che risulta
 * eternamente incompleta perché la aspetta chi si è ritirato è un allarme che
 * si impara a ignorare, e da lì in poi non serve più a niente.
 */
export function destinatariConsegna (consegna: Consegna, classe: Classe | null): string[] {
  if (consegna.a === 'docente') return [CHI_INSEGNA]
  const attivi = new Set((classe?.allievi ?? []).filter((a) => a.attivo).map((a) => a.id))
  if (consegna.a === 'allievi') return consegna.allieviIds.filter((id) => attivi.has(id))
  return [...attivi]
}

export function haFatto (consegna: Consegna, chi: string): boolean {
  return consegna.fatte.some((f) => f.chi === chi)
}

/** La spunta di uno: quando l'ha fatta e, se ne raccoglieva uno, il file. */
export function spuntaDi (consegna: Consegna, chi: string): SpuntaConsegna | null {
  return consegna.fatte.find((f) => f.chi === chi) ?? null
}

/** Se spuntarla vuol dire consegnare un foglio. */
export function raccoglieDocumento (consegna: Consegna): boolean {
  return consegna.documento !== undefined
}

/** Vero quando è il docente a distribuire il documento, non a raccoglierlo. */
export function siConsegna (consegna: Consegna): boolean {
  return raccoglieDocumento(consegna) && consegna.verso === 'consegno'
}

/**
 * Il documento pronto per un allievo, se c'è: il suo, o quello uguale per tutti.
 *
 * Sono due casi diversi dello stesso gesto. La pagella è di uno solo e arriva
 * dallo smistamento di un PDF di classe; la circolare è la stessa per tutti e
 * si allega una volta. Chi consegna non deve saperlo: chiede «che cosa do a
 * Rossi» e qui c'è la risposta.
 */
export function documentoPer (
  consegna: Consegna,
  allievoId: string,
): { file: string, nome: string } | null {
  const suo = (consegna.documenti ?? []).find((d) => d.allievoId === allievoId)
  if (suo) return { file: suo.file, nome: suo.nome }
  if (consegna.fileTutti) {
    return { file: consegna.fileTutti, nome: consegna.nomeTutti || consegna.fileTutti }
  }
  return null
}

/**
 * Chi aspetta ancora il documento: gliene tocca uno, ce n'è uno pronto, e non
 * gli è ancora arrivato. È l'elenco su cui lavora la distribuzione, e il numero
 * che il todo mostra — «da consegnare a 12».
 */
export function daConsegnareA (consegna: Consegna, classe: Classe | null): string[] {
  if (!siConsegna(consegna)) return []
  return destinatariConsegna(consegna, classe).filter(
    (chi) => chi !== CHI_INSEGNA && !haFatto(consegna, chi) && documentoPer(consegna, chi) !== null,
  )
}

/** Chi ha diritto al documento ma un documento pronto non ce l'ha. */
export function senzaDocumento (consegna: Consegna, classe: Classe | null): string[] {
  if (!siConsegna(consegna)) return []
  return destinatariConsegna(consegna, classe).filter(
    (chi) => chi !== CHI_INSEGNA && documentoPer(consegna, chi) === null,
  )
}

/**
 * Il testo di un messaggio con i segnaposto riempiti: {allievo}, {classe},
 * {documento}. Sono gli stessi tre di tutto il registro, perché una formula
 * imparata una volta deve valere ovunque.
 */
export function testoConsegna (
  modello: string,
  nomeAllievo: string,
  nomeClasse: string,
  documento: string,
): string {
  return compilaModello(modello, { allievo: nomeAllievo, classe: nomeClasse, documento })
}

/**
 * Le richieste di documenti dei corsi dati, dalla scadenza più vicina.
 *
 * Sono consegne come tutte le altre e stanno nello stesso elenco: quel che
 * cambia è come le si guarda — una riga per documento, una casella per
 * allievo — perché la domanda è chi non ha ancora portato quel foglio, e su
 * venticinque nomi non la si legge in un elenco.
 */
export function consegneDocumento (
  registro: Registro,
  corsi: Array<{ id: string }>,
): Consegna[] {
  const suoi = new Set(corsi.map((c) => c.id))
  return registro.consegne
    .filter((c) => suoi.has(c.corsoId) && raccoglieDocumento(c))
    .sort((a, b) => {
      const sa = scadenzaConsegna(registro, a)
      const sb = scadenzaConsegna(registro, b)
      return (
        Number(sb !== null) - Number(sa !== null) ||
        (sa ?? '').localeCompare(sb ?? '') ||
        a.testo.localeCompare(b.testo, 'it')
      )
    })
}

export interface AvanzamentoConsegna {
  destinatari: string[]
  fatte: number
  mancano: string[]
  /** Vero quando l'hanno fatta tutti quelli che dovevano. */
  completa: boolean
  /** Da 0 a 1. Senza destinatari resta a zero: non c'è niente di fatto. */
  quota: number
  /**
   * Nessuno a cui chiederla: la classe è ancora vuota, o non frequenta più
   * nessuno di quelli scelti.
   */
  senzaNessuno: boolean
}

/**
 * A che punto è una consegna.
 *
 * Una consegna senza destinatari **non** è completa. Sembrava sensato — nessuno
 * da aspettare, quindi niente da fare — ma è la situazione più comune di
 * settembre: la classe esiste, gli allievi non ci sono ancora, e la consegna
 * spariva fra le fatte il minuto dopo averla scritta. Resta aperta finché
 * qualcuno non la spunta o non la cancella: sono due gesti di chi sa quel che
 * sta facendo, invece di una deduzione del registro.
 */
export function avanzamentoConsegna (
  consegna: Consegna,
  classe: Classe | null,
): AvanzamentoConsegna {
  const destinatari = destinatariConsegna(consegna, classe)
  const mancano = destinatari.filter((chi) => !haFatto(consegna, chi))
  const fatte = destinatari.length - mancano.length
  return {
    destinatari,
    fatte,
    mancano,
    completa: destinatari.length > 0 && mancano.length === 0,
    quota: destinatari.length === 0 ? 0 : fatte / destinatari.length,
    senzaNessuno: destinatari.length === 0,
  }
}

/** Le consegne di un corso, dalla più urgente: prima chi scade, poi chi no. */
export function consegneDelCorso (registro: Registro, corsoId: string): Consegna[] {
  return registro.consegne
    .filter((c) => c.corsoId === corsoId)
    .sort((a, b) => {
      const sa = scadenzaConsegna(registro, a)
      const sb = scadenzaConsegna(registro, b)
      if (sa && sb) return sa.localeCompare(sb)
      if (sa) return -1
      if (sb) return 1
      return dataConsegna(registro, b).localeCompare(dataConsegna(registro, a))
    })
}

/**
 * Quel che una consegna è, rispetto a un giorno preciso.
 *
 * `scade` è il momento in cui va ritirata, `arretrata` è quando il termine è
 * passato e manca ancora qualcuno. La distinzione conta: la prima chiede di
 * fare l'appello delle consegne, la seconda di decidere che cosa farne.
 */
export type StatoConsegna = 'aperta' | 'scade' | 'arretrata' | 'completa'

export function statoConsegna (
  registro: Registro,
  consegna: Consegna,
  classe: Classe | null,
  giorno: Iso,
): StatoConsegna {
  if (avanzamentoConsegna(consegna, classe).completa) return 'completa'
  const scadenza = scadenzaConsegna(registro, consegna)
  if (!scadenza) return 'aperta'
  if (scadenza === giorno) return 'scade'
  return scadenza < giorno ? 'arretrata' : 'aperta'
}

export interface ConsegneDellaLezione {
  /** Date in questa lezione: è il verbale di quel che si è assegnato. */
  date: Consegna[]
  /** Scadono oggi: sono quelle da ritirare adesso. */
  scadono: Consegna[]
  /** Il termine è passato e manca ancora qualcuno. */
  arretrate: Consegna[]
  /** Aperte, con termine più in là o senza termine: si tengono d'occhio. */
  aperte: Consegna[]
}

/**
 * Che cosa mostrare aprendo una lezione.
 *
 * È il punto di tutta la funzionalità: una consegna data il 12 deve ripresentarsi
 * il 19 e il 26 finché non è chiusa, senza che nessuno debba ricordarsi di
 * cercarla. Si guardano solo le consegne del corso, e solo quelle già date —
 * una consegna che nascerà a maggio non ha niente da dire a novembre.
 */
export function consegneDellaLezione (
  registro: Registro,
  lezione: Lezione,
  classe: Classe | null,
): ConsegneDellaLezione {
  const esito: ConsegneDellaLezione = { date: [], scadono: [], arretrate: [], aperte: [] }

  for (const consegna of consegneDelCorso(registro, lezione.corsoId)) {
    if (consegna.dataLezioneId === lezione.id) esito.date.push(consegna)

    // Non ancora data: in quest'ora non esiste.
    if (dataConsegna(registro, consegna) > lezione.data) continue

    const stato = statoConsegna(registro, consegna, classe, lezione.data)
    if (stato === 'completa') continue
    if (stato === 'scade') esito.scadono.push(consegna)
    else if (stato === 'arretrata') esito.arretrate.push(consegna)
    else esito.aperte.push(consegna)
  }

  return esito
}

/**
 * Le consegne che chiedono attenzione oggi, in tutto il registro: quelle
 * arretrate e quelle in scadenza. Serve al cruscotto, che deve dire quanto si è
 * indietro senza aprire nulla.
 */
export function consegneDaGuardare (
  registro: Registro,
  corsi: Array<{ id: string, classeId: string }>,
  giorno: Iso,
): { arretrate: Consegna[], scadono: Consegna[] } {
  const classePerCorso = new Map(
    corsi.map((corso) => [
      corso.id,
      registro.classi.find((c) => c.id === corso.classeId) ?? null,
    ]),
  )
  const arretrate: Consegna[] = []
  const scadono: Consegna[] = []

  for (const consegna of registro.consegne) {
    if (!classePerCorso.has(consegna.corsoId)) continue
    const stato = statoConsegna(registro, consegna, classePerCorso.get(consegna.corsoId) ?? null, giorno)
    if (stato === 'arretrata') arretrate.push(consegna)
    else if (stato === 'scade') scadono.push(consegna)
  }

  return { arretrate, scadono }
}

/** I mucchi in cui si guardano le consegne quando non si è dentro una lezione. */
export interface ConsegneDaFare {
  arretrate: Consegna[]
  oggi: Consegna[]
  /** Con un termine entro i prossimi giorni: quel che sta arrivando. */
  presto: Consegna[]
  /** Aperte, ma con il termine più in là o senza termine. */
  avanti: Consegna[]
  completate: Consegna[]
}

/** Entro quanti giorni una scadenza conta come «sta arrivando». */
const GIORNI_VICINI = 7

/**
 * Tutte le consegne dei corsi dati, divise per quanto premono.
 *
 * È la vista d'insieme: quella che serve la domenica sera per sapere che cosa
 * si è lasciato in giro, e che dentro una lezione non si può avere perché lì si
 * guarda un corso solo.
 */
export function consegneDaFare (
  registro: Registro,
  corsi: Array<{ id: string, classeId: string }>,
  giorno: Iso,
): ConsegneDaFare {
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, registro.classi.find((c) => c.id === corso.classeId) ?? null]),
  )
  const esito: ConsegneDaFare = {
    arretrate: [],
    oggi: [],
    presto: [],
    avanti: [],
    completate: [],
  }

  const ordinate = [...registro.consegne]
    .filter((c) => classePerCorso.has(c.corsoId))
    .sort((a, b) => {
      const sa = scadenzaConsegna(registro, a) ?? '9999-12-31'
      const sb = scadenzaConsegna(registro, b) ?? '9999-12-31'
      return sa.localeCompare(sb) || dataConsegna(registro, a).localeCompare(dataConsegna(registro, b))
    })

  for (const consegna of ordinate) {
    const classe = classePerCorso.get(consegna.corsoId) ?? null
    const stato = statoConsegna(registro, consegna, classe, giorno)
    if (stato === 'completa') {
      esito.completate.push(consegna)
      continue
    }
    if (stato === 'arretrata') {
      esito.arretrate.push(consegna)
      continue
    }
    if (stato === 'scade') {
      esito.oggi.push(consegna)
      continue
    }
    const scadenza = scadenzaConsegna(registro, consegna)
    const vicina = scadenza !== null && scadenza <= sommaGiorni(giorno, GIORNI_VICINI)
    if (vicina) esito.presto.push(consegna)
    else esito.avanti.push(consegna)
  }

  return esito
}

/** L'ora in cui una consegna è stata data: serve solo alle etichette. */
export function oraDellaConsegna (registro: Registro, consegna: Consegna): string {
  const lezione = lezioneDi(registro, consegna.dataLezioneId)
  return lezione ? inizioLezione(lezione) ?? '' : ''
}
