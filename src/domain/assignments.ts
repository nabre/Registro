// Le consegne: quel che si è dato da fare, e a chi.
//
// A differenza del campo `compiti` di una lezione (un verbale), una consegna
// vive: nasce in un'ora, ha un termine, e si ripresenta in ogni lezione del
// corso finché non è spuntata. Le due date si legano a una lezione (e la
// seguono se si sposta) o a un giorno secco, quando il termine non è un'ora.

import { allieviAttivi } from './calculations.js'
import { sommaGiorni } from './dates.js'
import { CHI_INSEGNA } from './models.js'
import { compilaModello } from './text.js'
import type {
  Classe,
  Consegna,
  Iso,
  Lezione,
  Registro,
  SpuntaConsegna,
} from './models.js'

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
 * Il giorno entro cui va fatta, o `null`: una consegna senza termine è
 * ammessa e si chiude a mano.
 */
export function scadenzaConsegna (registro: Registro, consegna: Consegna): Iso | null {
  return lezioneDi(registro, consegna.scadenzaLezioneId)?.data ?? consegna.scadenza
}

/**
 * Chi deve spuntarla: il docente, gli iscritti attivi della classe, o i nomi
 * scelti. Fuori chi non frequenta più, se no resterebbe incompleta per sempre.
 */
export function destinatariConsegna (consegna: Consegna, classe: Classe | null): string[] {
  if (consegna.a === 'docente') return [CHI_INSEGNA]
  const attivi = new Set((classe ? allieviAttivi(classe) : []).map((a) => a.id))
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
 * Il documento pronto per un allievo, se c'è: il suo (la pagella, dallo
 * smistamento) o quello uguale per tutti (la circolare).
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
 * Chi aspetta ancora il documento: gliene tocca uno, è pronto, e non gli è
 * arrivato. L'elenco della distribuzione e il numero del todo.
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
 * Il testo di un messaggio con i segnaposto {allievo}, {classe}, {documento}
 * riempiti: gli stessi in tutto il registro.
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
 * Le richieste di documenti dei corsi dati, dalla scadenza più vicina: consegne
 * come le altre, guardate come una riga per documento e una casella per allievo.
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

/**
 * Un file nell'archivio della classe, con il perché ci sta: le caselle piene
 * della matrice lette come elenco, per scorrere i fogli uno dopo l'altro.
 */
interface FileRaccolto {
  /** Il percorso dentro l'anno: è quel che l'anteprima inquadra. */
  file: string
  /** Come si chiamava il file quando è arrivato. */
  nome: string
  consegnaId: string
  /** Di chi è. Null per i fogli che valgono per tutta la colonna. */
  allievoId: string | null
  /**
   * Che cosa ci fa lì:
   *
   * - `persona`  la scansione di uno;
   * - `tutti`    un foglio uguale per tutti: la circolare da distribuire;
   * - `firme`    il foglio che dimostra la consegna;
   * - `docente`  quel che il docente raccoglie per sé.
   */
  genere: 'persona' | 'tutti' | 'firme' | 'docente'
  aggiuntoIl: Iso | null
}

/**
 * I file dell'archivio di una classe, nell'ordine della pagina (richieste come
 * nella matrice, persone come in elenco), che è l'ordine delle frecce
 * dell'anteprima. I fogli di colonna (firme, circolare) vengono prima dei
 * singoli.
 */
export function raccoltiDiClasse (
  consegne: Consegna[],
  allievi: Array<{ id: string }>,
): FileRaccolto[] {
  const raccolti: FileRaccolto[] = []
  for (const consegna of consegne) {
    const quando = (chi: string): Iso | null =>
      (consegna.documenti ?? []).find((d) => d.allievoId === chi)?.aggiuntoIl ?? null

    const mio = (consegna.documenti ?? []).find((d) => d.allievoId === CHI_INSEGNA)
    if (mio) {
      raccolti.push({
        file: mio.file,
        nome: mio.nome,
        consegnaId: consegna.id,
        allievoId: null,
        genere: 'docente',
        aggiuntoIl: quando(CHI_INSEGNA),
      })
    }
    if (consegna.fileTutti) {
      raccolti.push({
        file: consegna.fileTutti,
        nome: consegna.nomeTutti || consegna.fileTutti,
        consegnaId: consegna.id,
        allievoId: null,
        genere: 'tutti',
        aggiuntoIl: null,
      })
    }
    if (consegna.fileFirme) {
      raccolti.push({
        file: consegna.fileFirme,
        nome: consegna.nomeFirme || consegna.fileFirme,
        consegnaId: consegna.id,
        allievoId: null,
        genere: 'firme',
        aggiuntoIl: null,
      })
    }
    for (const allievo of allievi) {
      const suo = (consegna.documenti ?? []).find((d) => d.allievoId === allievo.id)
      if (!suo) continue
      raccolti.push({
        file: suo.file,
        nome: suo.nome,
        consegnaId: consegna.id,
        allievoId: allievo.id,
        genere: 'persona',
        aggiuntoIl: suo.aggiuntoIl ?? null,
      })
    }
  }
  return raccolti
}

interface AvanzamentoConsegna {
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
 * A che punto è una consegna. Senza destinatari non è completa (a settembre la
 * classe è spesso vuota): resta aperta finché qualcuno non la spunta o la
 * cancella.
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
function consegneDelCorso (registro: Registro, corsoId: string): Consegna[] {
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
 * Quel che una consegna è rispetto a un giorno: `scade` va ritirata oggi,
 * `arretrata` ha il termine passato e manca ancora qualcuno.
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

interface ConsegneDellaLezione {
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
 * Che cosa mostrare aprendo una lezione: le consegne del corso già date e non
 * chiuse si ripresentano a ogni ora finché servono.
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
 * Tutte le consegne dei corsi dati, divise per quanto premono: la vista
 * d'insieme fuori da una lezione.
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
      return (
        sa.localeCompare(sb) ||
        dataConsegna(registro, a).localeCompare(dataConsegna(registro, b))
      )
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
