// Le assenze da far firmare: i fogli di un periodo, la mail che li accompagna,
// le firme che tornano. Tre fasi per venticinque nomi in un posto solo, per
// rispondere a «di chi manca ancora la firma?».
//
// Qui la regola, non i file: copia dei PDF e invio stanno nell'extension host
// (`actions.ts`, `data/mail.ts`) e chiedono a queste funzioni cosa e a chi.

import { nomeCompleto } from './calculations.js'
import { scriviIndirizzo } from './addresses.js'
import { nomeFileArchivio, percorsoArchivio } from './locations.js'
import { fascicoloDellaClasse } from './courses.js'
import { formattaData, istanteAdesso, periodoNelNome } from './dates.js'
import type {
  Allievo,
  BloccoAssenze,
  Classe,
  Fascicolo,
  FoglioAssenze,
  Iso,
  Istante,
  Registro,
  RigaAssenze,
  Semestre,
  TipoRapporto,
} from './models.js'
import { FIDUCIA_SUFFICIENTE, indiceNomi, riconosci } from './sorting.js'
import { Maiuscola } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { testi } from './absences.testi.js'
import { aggiungiIndirizzo, compilaModello, confrontaNomi, emailValida, nomeSicuro } from './text.js'

import { TIPI_RAPPORTO } from './normalization.js'
import { valoriDi } from './objects.js'

export { TIPI_RAPPORTO } from './normalization.js'

/** Come si chiama un foglio nelle etichette: 'assenze firmate', 'ritardi'. */
export function etichettaFoglio (tipo: TipoRapporto, firmato: boolean): string {
  return testi().foglio(tipo, firmato)
}

// ------------------------------------------------------------------ le righe

/** La riga di un allievo, o `null` se per lui non c'è ancora niente. */
export function rigaDi (blocco: BloccoAssenze, allievoId: string): RigaAssenze | null {
  return blocco.righe.find((r) => r.allievoId === allievoId) ?? null
}

/** Un foglio preciso di una riga: questo tipo, in questa versione. */
export function foglioDi (
  riga: RigaAssenze | null,
  tipo: TipoRapporto,
  firmato: boolean,
): FoglioAssenze | null {
  return riga?.fogli.find((f) => f.tipo === tipo && f.firmato === firmato) ?? null
}

/** I fogli vergini di una riga: quel che c'è da spedire. */
export function vergini (riga: RigaAssenze | null): FoglioAssenze[] {
  return (riga?.fogli ?? []).filter((f) => !f.firmato)
}

/** I fogli firmati: quel che è tornato indietro. */
export function firmati (riga: RigaAssenze | null): FoglioAssenze[] {
  return (riga?.fogli ?? []).filter((f) => f.firmato)
}

/** Vero se la mail di quella riga è partita davvero. */
export function inviata (riga: RigaAssenze | null): boolean {
  return Boolean(riga?.invio && !riga.invio.errore)
}

/**
 * A che punto è un allievo, in una parola, nell'ordine delle fasi. Una firma
 * arrivata senza mail conta lo stesso: conta il foglio firmato. `fuori` è chi
 * nel periodo non ha niente da far firmare.
 */
export type FaseAssenze = 'fuori' | 'da-spedire' | 'in-attesa' | 'firmato'

export function faseRiga (riga: RigaAssenze | null): FaseAssenze {
  const daMandare = vergini(riga)
  if (daMandare.length === 0 && firmati(riga).length === 0) return 'fuori'
  // Firmato: per ogni foglio partito ne è tornato uno.
  const tutti = daMandare.every((f) => foglioDi(riga, f.tipo, true) !== null)
  if (tutti && firmati(riga).length > 0) return 'firmato'
  if (inviata(riga)) return 'in-attesa'
  return 'da-spedire'
}

/** Chi in questo periodo ha qualcosa da far firmare. */
export function righeVive (blocco: BloccoAssenze): RigaAssenze[] {
  return blocco.righe.filter((r) => faseRiga(r) !== 'fuori')
}

interface AvanzamentoAssenze {
  /** Quanti allievi hanno qualcosa in questo periodo. */
  interessati: number
  /** Di questi, quanti hanno già almeno un foglio vergine pronto. */
  conVergini: number
  inviate: number
  firmate: number
  /** Gli invii andati storti: sono da rifare, e vanno detti. */
  falliti: number
  /** Vero quando ogni riga viva è arrivata in fondo. */
  completo: boolean
}

/**
 * A che punto è il periodo intero. Senza righe non è completo: i fogli non
 * sono ancora stati caricati, e c'è tutto da fare.
 */
export function avanzamentoAssenze (blocco: BloccoAssenze): AvanzamentoAssenze {
  const vive = righeVive(blocco)
  const conVergini = vive.filter((r) => vergini(r).length > 0).length
  const inviate = vive.filter((r) => inviata(r)).length
  const firmate = vive.filter((r) => faseRiga(r) === 'firmato').length
  return {
    interessati: vive.length,
    conVergini,
    inviate,
    firmate,
    falliti: vive.filter((r) => r.invio?.errore).length,
    completo: vive.length > 0 && firmate === vive.length,
  }
}

/** Chi ha i fogli pronti e la mail ancora da mandare: quel che parte in blocco. */
export function daSpedire (blocco: BloccoAssenze): RigaAssenze[] {
  return blocco.righe.filter((r) => vergini(r).length > 0 && !inviata(r))
}

/**
 * I rapporti partiti e non tornati firmati, tipo per tipo: l'azienda può
 * rimandarne indietro uno solo.
 */
export function tipiDaFirmare (riga: RigaAssenze | null): TipoRapporto[] {
  return TIPI_RAPPORTO.filter(
    (tipo) => foglioDi(riga, tipo, false) !== null && foglioDi(riga, tipo, true) === null,
  )
}

// ------------------------------------------------- le richieste, una per allievo

/**
 * Una richiesta di firma vista dal todo: di chi, di che periodo, a che punto.
 * Nasce col caricamento del primo foglio: da lì va spedita e poi aspettata.
 */
export interface RichiestaFirma {
  classeId: string
  /** Il nome della classe: nel todo le righe di classi diverse stanno insieme. */
  classe: string
  bloccoId: string
  /** Come si chiama il periodo, e quando comincia: serve a metterle in fila. */
  periodo: string
  dal: Iso
  al: Iso
  allievo: Allievo
  fase: FaseAssenze
  /** Che rapporti si stanno facendo firmare: assenze, ritardi, o tutti e due. */
  tipi: TipoRapporto[]
  /** Di quali manca ancora la firma: è il caricamento che chiude la pratica. */
  daFirmare: TipoRapporto[]
  /** Il giorno in cui la mail è partita, quando è partita. */
  inviatoIl?: Istante
  /** Perché l'ultima mail non è partita: allora è di nuovo da spedire. */
  errore?: string
}

export interface RichiesteFirma {
  /** Fogli caricati e mail ancora da mandare. */
  daSpedire: RichiestaFirma[]
  /** Mail partita, firma non ancora tornata. */
  inAttesa: RichiestaFirma[]
  /** Tornate firmate: stanno in fondo, chiuse. */
  firmate: RichiestaFirma[]
}

/** Prima le più vecchie, poi per classe e per cognome: l'ordine di una lista di lavoro. */
function ordinaRichieste (a: RichiestaFirma, b: RichiestaFirma): number {
  return (
    a.dal.localeCompare(b.dal) ||
    confrontaNomi(a.classe, b.classe) ||
    nomeCompleto(a.allievo).localeCompare(nomeCompleto(b.allievo), 'it')
  )
}

/**
 * Tutte le richieste di firma delle classi date (filtro di chi chiama), divise
 * per che cosa manca. Chi nel periodo non ha mancato niente non compare.
 */
export function richiesteFirma (
  registro: { fascicoli: Fascicolo[] },
  classi: Classe[],
): RichiesteFirma {
  const esito: RichiesteFirma = { daSpedire: [], inAttesa: [], firmate: [] }

  for (const classe of classi) {
    const fascicolo = registro.fascicoli.find((f) => f.classeId === classe.id)
    if (!fascicolo) continue
    for (const blocco of fascicolo.assenze) {
      for (const riga of blocco.righe) {
        const fase = faseRiga(riga)
        if (fase === 'fuori') continue
        const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
        if (!allievo) continue

        const richiesta: RichiestaFirma = {
          classeId: classe.id,
          classe: classe.nome,
          bloccoId: blocco.id,
          periodo: nomePeriodo(blocco),
          dal: blocco.dal,
          al: blocco.al,
          allievo,
          fase,
          tipi: TIPI_RAPPORTO.filter((tipo) => foglioDi(riga, tipo, false) !== null),
          daFirmare: tipiDaFirmare(riga),
          inviatoIl: riga.invio?.inviatoIl,
          errore: riga.invio?.errore,
        }

        if (fase === 'firmato') esito.firmate.push(richiesta)
        else if (fase === 'in-attesa') esito.inAttesa.push(richiesta)
        else esito.daSpedire.push(richiesta)
      }
    }
  }

  for (const mucchio of valoriDi(esito)) mucchio.sort(ordinaRichieste)
  return esito
}

/** Quante richieste chiedono ancora qualcosa: la mail da mandare o la firma da avere. */
export function richiesteAperte (gruppi: RichiesteFirma): number {
  return gruppi.daSpedire.length + gruppi.inAttesa.length
}

// ------------------------------------------------------------ i destinatari

interface DestinatariAssenze {
  /** Gli indirizzi buoni, senza doppioni: il datore prima di tutti. */
  indirizzi: string[]
  /** Chi doveva ricevere e non ha un indirizzo: va detto prima di spedire. */
  senzaIndirizzo: string[]
}

/**
 * A chi va la richiesta di firma di un allievo. Il datore di lavoro è il
 * destinatario (firma lui); allievo e tutore solo se il periodo lo prevede; i
 * recapiti fissi sono la segreteria. Senza l'indirizzo dell'azienda la mail non
 * parte.
 */
export function destinatariAssenze (
  blocco: BloccoAssenze,
  allievo: Allievo,
  fascicolo: Fascicolo,
): DestinatariAssenze {
  const indirizzi = new Set<string>()
  const senzaIndirizzo: string[] = []

  if (!aggiungiIndirizzo(indirizzi, allievo.emailDatore)) {
    senzaIndirizzo.push(allievo.azienda?.trim() || lessico().datore.singolare)
  }
  if (blocco.aAllievo && !aggiungiIndirizzo(indirizzi, allievo.email)) {
    senzaIndirizzo.push(nomeCompleto(allievo))
  }
  if (blocco.aTutore && !aggiungiIndirizzo(indirizzi, allievo.emailTutore)) {
    senzaIndirizzo.push(testi().rappresentanteDi(nomeCompleto(allievo)))
  }
  for (const id of blocco.recapitiIds) {
    const recapito = fascicolo.recapiti.find((r) => r.id === id)
    if (!recapito) continue
    if (!aggiungiIndirizzo(indirizzi, recapito.email)) senzaIndirizzo.push(recapito.etichetta)
  }

  return { indirizzi: [...indirizzi], senzaIndirizzo }
}

/** Vero se le si può scrivere: c'è la casella di chi deve firmare. */
export function raggiungibile (allievo: Allievo): boolean {
  return emailValida((allievo.emailDatore ?? '').trim())
}

// ------------------------------------------------------------------ il testo

/**
 * Il nome di un periodo: quello del semestre in cui sta, ricavato dalle date e
 * non chiesto (due fonti per lo stesso fatto potrebbero contraddirsi). Fuori
 * dai semestri non ne ha: valgono le date.
 */
export function etichettaPeriodo (semestri: Semestre[], dal: Iso, al: Iso): string {
  return semestri.find((s) => dal >= s.inizio && al <= s.fine)?.etichetta ?? ''
}

/**
 * Il periodo in breve, dove c'è poco posto: il nome se ce l'ha, se no le due
 * date.
 */
export function nomePeriodo (blocco: BloccoAssenze): string {
  if (blocco.etichetta) return blocco.etichetta
  return `${formattaData(blocco.dal, 'corto')}–${formattaData(blocco.al, 'corto')}`
}

/** Il periodo scritto come lo si legge: «1° semestre (01.09.2025 – 31.01.2026)». */
export function periodoDetto (blocco: BloccoAssenze): string {
  const estremi = `${formattaData(blocco.dal)} – ${formattaData(blocco.al)}`
  return blocco.etichetta ? `${blocco.etichetta} (${estremi})` : estremi
}

/**
 * Quali rapporti ci sono davvero, in ordine fisso (assenze, poi ritardi), non
 * di caricamento: la lettera si legge uguale per tutti.
 */
function tipiPresenti (fogli: FoglioAssenze[]): TipoRapporto[] {
  return TIPI_RAPPORTO.filter((tipo) => fogli.some((foglio) => foglio.tipo === tipo))
}

/**
 * I rapporti allegati detti nella frase: «il rapporto delle assenze», «dei
 * ritardi», «delle assenze e dei ritardi». La lettera parte per allievo, e dice
 * quel che gli si allega. Senza fogli resta la formula completa.
 */
export function rapportiDetti (fogli: FoglioAssenze[]): string {
  return testi().rapporti(tipiPresenti(fogli))
}

/** Gli stessi rapporti come si scrivono in un oggetto: «Assenze e ritardi». */
export function tipiDetti (fogli: FoglioAssenze[]): string {
  return testi().tipi(tipiPresenti(fogli))
}

/**
 * Il testo di una riga: il modello del periodo con i dati di uno. Segnaposto
 * fra graffe; uno sconosciuto resta scritto (un `{azienda}` rimasto si vede, un
 * buco no). `fogli` sono gli allegati di questo allievo, da cui dipendono
 * `{rapporti}` e `{tipi}`.
 */
export function testoAssenze (
  modello: string,
  blocco: BloccoAssenze,
  allievo: Allievo,
  classe: Classe,
  fogli: FoglioAssenze[] = [],
): string {
  const valori: Record<string, string> = {
    allievo: nomeCompleto(allievo),
    cognome: allievo.cognome,
    nome: allievo.nome,
    classe: classe.nome,
    azienda: allievo.azienda?.trim() || '',
    // Indirizzo dell'azienda e nascita: per intestare la lettera e distinguere
    // due omonimi.
    indirizzoAzienda: scriviIndirizzo(allievo.indirizzoDatore),
    nascita: allievo.dataNascita ? formattaData(allievo.dataNascita) : '',
    periodo: periodoDetto(blocco),
    etichetta: blocco.etichetta,
    dal: formattaData(blocco.dal),
    al: formattaData(blocco.al),
    rapporti: rapportiDetti(fogli),
    tipi: tipiDetti(fogli),
  }
  return compilaModello(modello, valori)
}

/** I segnaposto che si possono usare, per dirlo nel modulo. */
export const SEGNAPOSTO_ASSENZE = [
  '{allievo}',
  '{cognome}',
  '{nome}',
  '{classe}',
  '{azienda}',
  '{indirizzoAzienda}',
  '{nascita}',
  '{periodo}',
  '{etichetta}',
  '{dal}',
  '{al}',
  '{rapporti}',
  '{tipi}',
]

// --------------------------------------------------------------- i file

/**
 * Che documento è un foglio, nel nome del file archiviato: «Assenze 1° sem»,
 * «Ritardi firmati 2° sem». Il periodo c'è perché due semestri stanno nella
 * stessa cartella; classe e nome dell'allievo li mette chi compone intorno.
 */
export function documentoFoglio (
  tipo: TipoRapporto,
  firmato: boolean,
  periodo: string,
): string {
  const cosa = etichettaFoglio(tipo, firmato)
  // Ripiego vuoto: chi chiama compone il nome attorno a questo pezzo, e un
  // «senza nome» in mezzo direbbe il falso.
  return nomeSicuro(`${Maiuscola(cosa)} ${periodo}`, '')
}

/**
 * A chi appartiene un file, letto dal suo nome, per l'importazione in blocco.
 * Decide il riconoscitore dello smistamento, con la sua prudenza: sotto la
 * soglia, o con due candidati, non si assegna niente. Meglio un file da
 * mettere a mano che le assenze di uno all'azienda di un altro.
 */
export function allievoDelFile (nomeFile: string, allievi: Allievo[]): Allievo | null {
  const esito = riconosci(nomeFile, indiceNomi(allievi))
  if (!esito.allievoId || esito.ambiguo || esito.fiducia < FIDUCIA_SUFFICIENTE) return null
  return allievi.find((a) => a.id === esito.allievoId) ?? null
}


// ------------------------------------------------- dove sta un periodo

/**
 * Dove si va a prendere un periodo di assenze: classe, fascicolo e blocco
 * insieme, perché chi scrive un foglio li tocca tutti e tre.
 */
export function trovaBloccoAssenze (
  registro: Registro,
  classeId: string,
  bloccoId: string,
): { classe: Classe, fascicolo: Fascicolo, blocco: BloccoAssenze } | null {
  const classe = registro.classi.find((c) => c.id === classeId)
  const fascicolo = fascicoloDellaClasse(registro, classeId)
  const blocco = fascicolo?.assenze.find((b) => b.id === bloccoId)
  return classe && fascicolo && blocco ? { classe, fascicolo, blocco } : null
}

/**
 * Dove finisce il foglio di una persona:
 * `archivio/docente-di-classe/<classe>/allievi/<nome>/`. Il nome del file dice
 * classe, documento, persona e periodo, perché si apre anche fuori dal registro
 * e va allegato alle mail. Una regola sola per i due ingressi (da disco,
 * ritagliato da un PDF di classe).
 */
export function percorsoFoglioAssenze (
  nomeClasse: string,
  blocco: BloccoAssenze,
  allievo: Allievo,
  tipo: TipoRapporto,
  firmato: boolean,
  estensione: string,
): string {
  const chi = nomeCompleto(allievo)
  return percorsoArchivio(
    nomeClasse,
    null,
    nomeFileArchivio(
      nomeClasse,
      chi,
      documentoFoglio(tipo, firmato, blocco.etichetta),
      periodoNelNome(blocco.dal, blocco.al),
      estensione,
    ),
    chi,
  )
}

/**
 * Mette un foglio nella riga di un allievo, creandola se serve: è così che un
 * allievo entra nel periodo. Lo stesso foglio rimesso sostituisce il precedente.
 */
export function scriviFoglioAssenze (
  registro: Registro,
  dove: { classeId: string, bloccoId: string, allievoId: string },
  foglio: FoglioAssenze,
): void {
  const trovato = trovaBloccoAssenze(registro, dove.classeId, dove.bloccoId)
  if (!trovato) return
  const { blocco, fascicolo } = trovato
  let riga = blocco.righe.find((x) => x.allievoId === dove.allievoId)
  if (!riga) {
    riga = { allievoId: dove.allievoId, fogli: [], invio: null, note: '' }
    blocco.righe.push(riga)
  }
  riga.fogli = riga.fogli.filter(
    (f) => !(f.tipo === foglio.tipo && f.firmato === foglio.firmato),
  )
  riga.fogli.push(foglio)
  blocco.aggiornatoIl = foglio.aggiuntoIl
  fascicolo.aggiornatoIl = foglio.aggiuntoIl
}

/**
 * Toglie un foglio dalla riga di un allievo; con l'ultimo se ne va la riga,
 * salvo che una mail sia già partita.
 */
export function togliFoglioAssenze (
  registro: Registro,
  dove: { classeId: string, bloccoId: string, allievoId: string },
  tipo: TipoRapporto,
  firmato: boolean,
): void {
  const trovato = trovaBloccoAssenze(registro, dove.classeId, dove.bloccoId)
  const riga = trovato ? rigaDi(trovato.blocco, dove.allievoId) : null
  if (!trovato || !riga) return
  riga.fogli = riga.fogli.filter((f) => !(f.tipo === tipo && f.firmato === firmato))
  if (riga.fogli.length === 0 && !riga.invio) {
    trovato.blocco.righe = trovato.blocco.righe.filter((x) => x !== riga)
  }
  const ora = istanteAdesso()
  trovato.blocco.aggiornatoIl = ora
  trovato.fascicolo.aggiornatoIl = ora
}
