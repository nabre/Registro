// Le assenze da far firmare: i fogli di un periodo, la mail che li accompagna,
// le firme che tornano indietro.
//
// È il lavoro che il docente di classe fa tre volte l'anno, e che senza un
// posto suo si fa a memoria: la scuola stampa per ogni allievo il rapporto
// delle assenze e quello dei ritardi, il docente li manda all'azienda, e
// l'azienda li rispedisce firmati. Tre fasi, venticinque nomi, due fogli per
// nome: la domanda vera non è «dove sta quel PDF» ma «di chi manca ancora la
// firma», e a quella si risponde solo se le tre fasi stanno nello stesso posto.
//
// Qui c'è la regola, non i file: il dominio non tocca il disco e non spedisce
// niente. Copia dei PDF e invio stanno nell'extension host — `actions.ts`,
// `data/mail.ts` — e ricevono da qui che cosa allegare e a chi scrivere.

import { nomeCompleto } from './calculations.js'
import { scriviIndirizzo } from './addresses.js'
import { nomeFileArchivio, percorsoArchivio } from './locations.js'
import { fascicoloDellaClasse } from './courses.js'
import { formattaData, periodoNelNome } from './dates.js'
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
import { Maiuscola, PERSONE } from './lexicon.js'
import { aggiungiIndirizzo, compilaModello, emailValida, nomeSicuro } from './text.js'

import { TIPI_RAPPORTO } from './validation.js'
import { valoriDi } from './objects.js'

export { TIPI_RAPPORTO } from './validation.js'

/** Come si chiama un foglio nelle etichette: 'assenze firmate', 'ritardi'. */
export function etichettaFoglio (tipo: TipoRapporto, firmato: boolean): string {
  if (!firmato) return tipo
  return tipo === 'assenze' ? 'assenze firmate' : 'ritardi firmati'
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
 * A che punto è un allievo, in una parola.
 *
 * L'ordine è quello delle fasi, e non si salta: senza un foglio vergine non c'è
 * niente da mandare, e senza mail una firma che arriva è una firma che qualcuno
 * ha chiesto in un altro modo — succede, e allora la fase la si legge lo stesso
 * come completa, perché quel che conta è il foglio firmato in mano.
 *
 * `fuori` non è uno stato del lavoro: è chi in questo periodo non ha mancato
 * niente, e per cui non c'è nulla da fare.
 */
export type FaseAssenze = 'fuori' | 'da-spedire' | 'in-attesa' | 'firmato'

export function faseRiga (riga: RigaAssenze | null): FaseAssenze {
  const daMandare = vergini(riga)
  if (daMandare.length === 0 && firmati(riga).length === 0) return 'fuori'
  // Firmato vuol dire che per ogni foglio partito ne è tornato uno: chiedere
  // due fogli e riceverne uno solo non è una pratica chiusa.
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
 * A che punto è il periodo intero.
 *
 * Un periodo senza righe non è completo: è un periodo in cui i fogli non sono
 * ancora stati caricati, che è il momento in cui si comincia — dirlo «fatto»
 * lo farebbe sparire dagli occhi proprio quando c'è tutto da fare.
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
 * Di quali rapporti manca ancora la firma: quelli partiti che non sono tornati.
 *
 * È la lista dei caricamenti che restano da fare, e per questo si guarda un
 * tipo alla volta: a un'azienda si mandano assenze e ritardi, e può rimandarne
 * indietro uno solo — la pratica resta aperta per l'altro, e chi guarda deve
 * sapere quale.
 */
export function tipiDaFirmare (riga: RigaAssenze | null): TipoRapporto[] {
  return TIPI_RAPPORTO.filter(
    (tipo) => foglioDi(riga, tipo, false) !== null && foglioDi(riga, tipo, true) === null,
  )
}

// ------------------------------------------------- le richieste, una per allievo

/**
 * Una richiesta di firma vista dal todo: di chi è, di che periodo, a che punto.
 *
 * Nasce dal caricamento di un foglio e non da un gesto in più: appena la
 * scuola stampa i rapporti e li si mette nel registro, quella richiesta è un
 * lavoro aperto — va spedita, e poi va aspettata la firma. Fin qui quel lavoro
 * si vedeva solo aprendo la classe, nella scheda del periodo: chi la domenica
 * sera guarda il todo non lo trovava, e le richieste restavano ferme per
 * settimane senza che niente le reclamasse.
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
    a.classe.localeCompare(b.classe, 'it') ||
    nomeCompleto(a.allievo).localeCompare(nomeCompleto(b.allievo), 'it')
  )
}

/**
 * Tutte le richieste di firma delle classi date, divise per che cosa manca.
 *
 * Le classi arrivano già scelte da chi chiama: il filtro è una cosa del
 * pannello, non del dominio. Chi in un periodo non ha mancato niente non
 * compare: non c'è niente da fargli firmare.
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
 * A chi va la richiesta di firma di un allievo.
 *
 * Il datore di lavoro è il destinatario, non una copia: è lui che deve firmare.
 * Allievo e tutore ci vanno solo se il periodo lo prevede, i recapiti fissi
 * sono la segreteria che vuole sapere. Se manca l'indirizzo dell'azienda la
 * mail non parte: mandarla al solo allievo vorrebbe dire chiudere la pratica
 * senza averla aperta.
 */
export function destinatariAssenze (
  blocco: BloccoAssenze,
  allievo: Allievo,
  fascicolo: Fascicolo,
): DestinatariAssenze {
  const indirizzi = new Set<string>()
  const senzaIndirizzo: string[] = []

  if (!aggiungiIndirizzo(indirizzi, allievo.emailDatore)) {
    senzaIndirizzo.push(allievo.azienda?.trim() || 'datore di lavoro')
  }
  if (blocco.aAllievo && !aggiungiIndirizzo(indirizzi, allievo.email)) {
    senzaIndirizzo.push(nomeCompleto(allievo))
  }
  if (blocco.aTutore && !aggiungiIndirizzo(indirizzi, allievo.emailTutore)) {
    senzaIndirizzo.push(`${PERSONE.rappresentante.singolare} di ${nomeCompleto(allievo)}`)
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
 * Come si chiama un periodo, quando ha un nome: quello del semestre in cui sta.
 *
 * Non lo si chiede a chi lo crea, e non è una semplificazione del modulo: un
 * periodo *sono* le sue due date, e il nome è una cosa che se ne ricava. Chi
 * scriveva «1° semestre» in un campo accanto a due date che dicevano già
 * settembre–gennaio non aggiungeva niente, e poteva scrivere «2° semestre»
 * sopra le date del primo — due fonti per lo stesso fatto, e una che mente.
 *
 * Fuori dai semestri il nome non c’è, e va bene così: un periodo di due mesi
 * si legge dalle sue date, che è l’unica cosa vera che se ne può dire.
 */
export function etichettaPeriodo (semestri: Semestre[], dal: Iso, al: Iso): string {
  return semestri.find((s) => dal >= s.inizio && al <= s.fine)?.etichetta ?? ''
}

/**
 * Il periodo detto in breve: il nome se ce l’ha, se no le sue due date.
 *
 * Serve dove il posto è poco — una riga del todo, il titolo di una finestra —
 * e dove «periodo senza nome» non si può scrivere: lì sta quel che lo
 * distingue dagli altri, cioè quando comincia e quando finisce.
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
 * Quali rapporti ci sono davvero, in ordine: assenze prima, ritardi poi.
 *
 * L'ordine è quello dei tipi e non quello in cui i file sono stati caricati:
 * la stessa lettera deve leggersi uguale per venticinque allievi, e chi ha
 * importato prima i ritardi non deve ritrovarsi una frase rovesciata.
 */
function tipiPresenti (fogli: FoglioAssenze[]): TipoRapporto[] {
  return TIPI_RAPPORTO.filter((tipo) => fogli.some((foglio) => foglio.tipo === tipo))
}

/**
 * Come si nominano i rapporti allegati, dentro la frase: «il rapporto delle
 * assenze», «il rapporto dei ritardi», «i rapporti delle assenze e dei
 * ritardi».
 *
 * Serve perché la lettera parte per allievo e non per classe: a uno si mandano
 * tutti e due i fogli, a un altro solo i ritardi, e una frase fissa che parla
 * di assenze a chi non ne ha fatte è una lettera che l'azienda rimanda
 * indietro con una domanda. Senza fogli — un caso che non si spedisce — resta
 * la formula completa, che è quel che c'era scritto prima.
 */
export function rapportiDetti (fogli: FoglioAssenze[]): string {
  const tipi = tipiPresenti(fogli)
  const nomi = tipi.map((tipo) => (tipo === 'assenze' ? 'delle assenze' : 'dei ritardi'))
  if (nomi.length === 1) return `il rapporto ${nomi[0]}`
  return `i rapporti ${(nomi.length > 0 ? nomi : ['delle assenze', 'dei ritardi']).join(' e ')}`
}

/** Gli stessi rapporti come si scrivono in un oggetto: «Assenze e ritardi». */
export function tipiDetti (fogli: FoglioAssenze[]): string {
  const tipi = tipiPresenti(fogli)
  if (tipi.length === 1) return tipi[0] === 'assenze' ? 'Assenze' : 'Ritardi'
  return 'Assenze e ritardi'
}

/**
 * Il testo di una riga: il modello del periodo con dentro i dati di uno.
 *
 * I segnaposto si scrivono fra graffe e sono pochi apposta — quel che cambia da
 * una mail all'altra e nient'altro. Uno sconosciuto resta com'è scritto invece
 * di sparire: un `{azienda}` rimasto in mezzo alla lettera si vede subito,
 * mentre un buco si scopre solo dopo averla spedita a venticinque aziende.
 *
 * `fogli` sono quelli che si stanno allegando a questo allievo, e da loro
 * dipendono `{rapporti}` e `{tipi}`: la lettera dice quel che c'è in allegato,
 * non quel che di solito ci sarebbe.
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
    // L'indirizzo dell'azienda e la nascita di chi è in formazione: servono a
    // chi intesta la lettera come una lettera vera, e a distinguere due
    // omonimi in una richiesta che esce dalla scuola.
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
 * «Ritardi firmati 2° sem».
 *
 * È il pezzo che nell'archivio dice *che cosa* è il file, come «Dichiarazione»
 * o «Pagella» per gli altri documenti: chi lo compone ci mette intorno la
 * classe e il nome dell'allievo, e il periodo sta qui perché due semestri
 * dello stesso allievo finiscono nella stessa cartella e senza non si
 * distinguerebbero.
 *
 * Prima il nome dell'allievo stava anche qui, e il file finiva per chiamarsi
 * «DIC4a_1° sem_Rossi Maria_Rossi Maria — assenze.pdf»: quel doppione lo legge
 * l'azienda a cui il foglio viene allegato.
 */
export function documentoFoglio (
  tipo: TipoRapporto,
  firmato: boolean,
  periodo: string,
): string {
  const cosa = etichettaFoglio(tipo, firmato)
  // `nomeSicuro` fa già tutto quel che qui si riscriveva a mano, e in più
  // toglie i punti in coda e disinnesca i nomi riservati di Windows. Il
  // ripiego resta vuoto: chi chiama compone un nome di file attorno a questo
  // pezzo, e un «senza nome» piantato in mezzo direbbe il falso.
  return nomeSicuro(`${Maiuscola(cosa)} ${periodo}`, '')
}

/**
 * A chi appartiene un file, letto dal suo nome.
 *
 * Serve all'importazione in blocco: la scuola consegna venticinque PDF in una
 * cartella, e aprirli uno per uno per dire di chi sono è il lavoro che il
 * registro deve togliere.
 *
 * Chi decide è il riconoscitore dello smistamento, e non una regola scritta qui
 * accanto: la domanda è la stessa — di chi parla questo testo — e due risposte
 * sono due occasioni di darne di diverse sullo stesso nome. Da lì viene anche la
 * prudenza che serve: sotto la soglia di fiducia, o con due allievi che se la
 * giocano, non si assegna niente. Un file non riconosciuto lo si mette a mano
 * dalla sua casella; una proposta sbagliata manda le assenze di uno all'azienda
 * di un altro, e non se ne accorge nessuno.
 */
export function allievoDelFile (nomeFile: string, allievi: Allievo[]): Allievo | null {
  const esito = riconosci(nomeFile, indiceNomi(allievi))
  if (!esito.allievoId || esito.ambiguo || esito.fiducia < FIDUCIA_SUFFICIENTE) return null
  return allievi.find((a) => a.id === esito.allievoId) ?? null
}


// ------------------------------------------------- dove sta un periodo

/**
 * Dove si va a prendere un periodo di assenze: la classe, il suo fascicolo e
 * il blocco, tutti e tre insieme.
 *
 * Insieme perché chi scrive un foglio li tocca tutti e tre — il foglio sta nel
 * blocco, il blocco nel fascicolo, e la classe dice come si chiamano le
 * cartelle — e cercarli in tre punti diversi vuol dire tre modi di trovarne
 * due su tre.
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
 * Dove finisce il foglio di una persona: con le sue cose, in
 * `archivio/docente-di-classe/<classe>/allievi/<nome>/`.
 *
 * Il nome parla — classe, che documento è, di chi, di quando — perché la
 * cartella si apre anche da fuori dal registro, e perché quel file finisce
 * allegato a una mail che lo legge un'azienda. Le date del periodo ci stanno
 * dentro per la stessa ragione per cui ci sta il nome: due semestri della
 * stessa persona finiscono nella stessa cartella.
 *
 * Sta qui e non in chi archivia perché i fogli entrano da due parti — scelti
 * da disco e ritagliati da un PDF di classe — e due regole per lo stesso nome
 * vorrebbero dire due cartelle diverse per lo stesso documento.
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
 * Mette un foglio nella riga di un allievo, creando la riga se non c'era: è il
 * momento in cui un allievo entra nel periodo, ed è sempre l'arrivo del primo
 * foglio a farlo entrare.
 *
 * Lo stesso foglio rimesso sostituisce quello di prima invece di affiancarlo:
 * di un rapporto ce n'è uno, e due copie della stessa cosa nella stessa casella
 * sarebbero due risposte alla domanda «è arrivato?».
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
 * Toglie un foglio dalla riga di un allievo, e con l'ultimo se ne va la riga.
 *
 * Una riga senza più niente dentro non è un allievo «senza assenze»: è una riga
 * vuota che occupa un posto nell'elenco. Resta solo se una mail è già partita —
 * quella è una cosa successa, e va raccontata.
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
  const ora = new Date().toISOString()
  trovato.blocco.aggiornatoIl = ora
  trovato.fascicolo.aggiornatoIl = ora
}
