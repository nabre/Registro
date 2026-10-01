// I lettori elementari (`testo`, `numero`, `elenco`, …) e quelli delle parti
// del registro: anni, classi e allievi, materie e corsi, lezioni, piani,
// valutazioni, fascicoli. Gli altri file della cartella leggono con questi.

import { annoAllineato, ordinaSettimane } from '#core/dominio/years.js'
import {
  etichettaAnno,
  isoValida,
  istanteAdesso,
  minutiInUd,
  oggi,
  oraValida,
  sommaMinuti,
} from '#core/dominio/dates.js'
import { nomeDelFile, percorsoRelativo } from '#core/dominio/text.js'
import { chiaveIndirizzo } from '#core/dominio/map.js'
import { contaUd } from '#core/dominio/calculations.js'
import { coloreValido } from '#core/dominio/lists.js'
import { COLORI_CLASSE, SCALA_PREDEFINITA } from '#core/dominio/factories.js'
import {
  CONTATTI,
  ETICHETTE,
  conPrefissoInternazionale,
  etichettaProposta,
  separaNumeri,
} from '#core/dominio/phones.js'
import { leggiIndirizzo, type Indirizzo } from '#core/dominio/addresses.js'
import {
  nuovoIdAllievo,
  nuovoIdAnno,
  nuovoIdAttivita,
  nuovoIdClasse,
  nuovoIdLezione,
  nuovoIdCorso,
  nuovoIdFascicolo,
  nuovoIdMateria,
  nuovoIdOsservazione,
  nuovoIdPiano,
  nuovoIdRisorsa,
  nuovoIdAllegato,
  nuovoIdBloccoAssenze,
  nuovoIdComunicazione,
  nuovoIdDocumento,
  nuovoIdRecapito,
  nuovoIdRicorrenza,
  nuovoIdSemestre,
  nuovoIdSospensione,
  nuovoIdSlot,
  nuovoIdTelefono,
  nuovoIdValutazione,
} from '#core/dominio/identifiers.js'
import type {
  Allievo,
  Coordinata,
  AnnoScolastico,
  CalendarioDellAnno,
  Attivita,
  AvanzamentoAttivita,
  CellaOsservata,
  Classe,
  Lezione,
  MomentoValutazione,
  Osservazione,
  PianoLezione,
  Presenza,
  RecuperoProva,
  Scala,
  SegnoOsservato,
  Allegato,
  BloccoAssenze,
  CategoriaDocumento,
  Comunicazione,
  FoglioAssenze,
  InvioAssenze,
  RigaAssenze,
  Corso,
  Documento,
  Fascicolo,
  Materia,
  Recapito,
  Ricorrenza,
  Risorsa,
  Semestre,
  Sospensione,
  StatoComunicazione,
  ValutazionePrevista,
  Slot,
  ContattoTelefonico,
  EtichettaTelefono,
  Telefono,
  StatoPresenza,
  TipoRisorsa,
  Voto,
} from '#core/dominio/models.js'
import { SIGLE_PRESENZA, Uno, chiaviDi } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { testi as testiFabbrica } from '#core/dominio/factories.testi.js'
import { testi } from './readers.testi.js'
import { TIPI_RAPPORTO } from '#core/dominio/models.js'
import { urlValido } from '#core/dominio/validation.js'

// ------------------------------------------------------------------ normalizzazione

export function testo (valore: unknown, predefinito = ''): string {
  return typeof valore === 'string' ? valore : predefinito
}

/** Un identificatore riferito (foreign key): stringa non vuota, oppure null. Mai stringa vuota. */
export function riferimento (valore: unknown): string | null {
  return typeof valore === 'string' && valore.trim() ? valore.trim() : null
}

export function numero (valore: unknown, predefinito: number): number {
  // La virgola vale come punto: chi corregge i file a mano scrive «1,5».
  if (typeof valore === 'number') return Number.isFinite(valore) ? valore : predefinito
  // Solo il testo si legge: un oggetto o un elenco convertito lancerebbe
  // (`{ "toString": null }`) o darebbe un numero a caso (`["3"]`).
  if (typeof valore !== 'string') return predefinito
  // Il vuoto non è zero (`Number('')` fa 0): resta il valore di ripiego.
  const scritto = valore.trim().replace(',', '.')
  if (scritto === '') return predefinito
  const n = Number(scritto)
  return Number.isFinite(n) ? n : predefinito
}

export function booleano (valore: unknown, predefinito: boolean): boolean {
  return typeof valore === 'boolean' ? valore : predefinito
}

export function unaData (valore: unknown, predefinito: string): string {
  return isoValida(valore) ? valore : predefinito
}

export function unOra (valore: unknown, predefinito: string): string {
  return oraValida(valore) ? valore : predefinito
}

export function unaVoce<T extends string> (valore: unknown, ammesse: readonly T[], predefinito: T): T {
  return ammesse.includes(valore as T) ? (valore as T) : predefinito
}

export function elenco (valore: unknown): unknown[] {
  return Array.isArray(valore) ? valore : []
}

export function oggetto (valore: unknown): Record<string, unknown> {
  return valore && typeof valore === 'object' && !Array.isArray(valore)
    ? (valore as Record<string, unknown>)
    : {}
}

// Dal dizionario del lessico: uno stato nuovo nel tipo non si può dimenticare
// qui, se no si rileggerebbe come «non impostato».
const STATI_PRESENZA = chiaviDi(SIGLE_PRESENZA)

/**
 * Gli stati tolti, e come si leggono: un registro si apre anche da una
 * macchina rimasta indietro. Una giustificazione resta un'assenza (la scusa sta
 * nella nota), un'uscita anticipata resta un'ora rotta, come il ritardo.
 */
const STATI_VECCHI: Record<string, StatoPresenza> = {
  giustificato: 'assente',
  'uscita-anticipata': 'ritardo',
}

/**
 * Uno stato letto da disco. Quel che non si riconosce diventa «non impostato»,
 * non «presente»: sarebbe inventarselo.
 */
function unoStatoPresenza (grezzo: unknown): StatoPresenza {
  const nome = typeof grezzo === 'string' ? grezzo : ''
  return STATI_VECCHI[nome] ?? unaVoce(nome, STATI_PRESENZA, 'non-impostato')
}
// Derivati dai dizionari del lessico (`Record<Tipo, string>`, esaustivi per il
// compilatore): un tipo nuovo non può uscire da `unaVoce` come il primo valore
// dell'elenco. Contano le chiavi, uguali in ogni lingua.
const DIZIONARI = lessico.in('it')
const TIPI_OSSERVAZIONE = chiaviDi(DIZIONARI.tipiOsservazione)
const STATI_LEZIONE = chiaviDi(DIZIONARI.statiLezione)
const TIPI_ATTIVITA = chiaviDi(DIZIONARI.tipiAttivita)
const TIPI_VALUTAZIONE = chiaviDi(DIZIONARI.tipiValutazione)

export function normalizzaScala (grezzo: unknown): Scala {
  const dati = oggetto(grezzo)
  const min = numero(dati.min, SCALA_PREDEFINITA.min)
  const max = numero(dati.max, SCALA_PREDEFINITA.max)
  const massimo = max > min ? max : min + 1
  const sufficienza = numero(dati.sufficienza, SCALA_PREDEFINITA.sufficienza)
  const passo = numero(dati.passo, SCALA_PREDEFINITA.passo)
  // Le stesse regole di `validaScala`: un file scritto a mano non passa dalla
  // porta di servizio.
  return {
    min,
    max: massimo,
    sufficienza: Math.min(massimo, Math.max(min, sufficienza)),
    passo: passo > 0 ? passo : SCALA_PREDEFINITA.passo,
  }
}

function normalizzaSemestri (grezzo: unknown, inizioAnno: string, fineAnno: string): Semestre[] {
  const voci = elenco(grezzo).map((v, indice): Semestre => {
    const dati = oggetto(v)
    return {
      id: testo(dati.id) || nuovoIdSemestre(),
      // Un'etichetta scritta da un registro di prima si lascia cadere: il nome
      // lo dà il numero.
      numero: indice === 0 ? 1 : 2,
      inizio: unaData(dati.inizio, inizioAnno),
      fine: unaData(dati.fine, fineAnno),
    }
  })
  return voci.slice(0, 2)
}

function normalizzaSospensione (grezzo: unknown, inizioAnno: string): Sospensione {
  const dati = oggetto(grezzo)
  const dal = unaData(dati.dal, inizioAnno)
  const al = unaData(dati.al, dal)
  return {
    id: testo(dati.id) || nuovoIdSospensione(),
    etichetta: testo(dati.etichetta, testiFabbrica().sospensione),
    dal,
    // Una sospensione al contrario è un refuso: dura un giorno invece di sparire.
    al: al >= dal ? al : dal,
  }
}

export function normalizzaAnno (grezzo: unknown): AnnoScolastico {
  const dati = oggetto(grezzo)
  const inizio = unaData(dati.inizio, '2024-09-01')
  const fine = unaData(dati.fine, '2025-06-30')
  const semestri = normalizzaSemestri(dati.semestri, inizio, fine)
  const calendarioUfficiale = normalizzaCalendarioDellAnno(dati.calendarioUfficiale)

  // Le date dell'anno scritte nel file valgono solo senza semestri: con i
  // semestri le riscrive `annoAllineato`.
  return annoAllineato({
    id: testo(dati.id) || nuovoIdAnno(),
    etichetta: testo(dati.etichetta, etichettaAnno(inizio)),
    inizio,
    fine,
    semestri,
    sospensioni: elenco(dati.sospensioni)
      .map((v) => normalizzaSospensione(v, inizio))
      .sort((a, b) => a.dal.localeCompare(b.dal)),
    // Settimane A e B: via chiavi non date e lettere sconosciute; una data
    // qualsiasi diventa il lunedì della sua settimana.
    settimane: ordinaSettimane(oggetto(dati.settimane)),
    note: testo(dati.note),
    ...(calendarioUfficiale ? { calendarioUfficiale } : {}),
  })
}

/**
 * Il calendario ufficiale di un anno, se si legge: un cantone e un anno
 * «AAAA/AAAA+1». Storto vale assente, cioè anno scritto a mano: un marcatore
 * sbagliato bloccherebbe voci che nessun calendario riconosce.
 */
function normalizzaCalendarioDellAnno (grezzo: unknown): CalendarioDellAnno | undefined {
  const dati = oggetto(grezzo)
  const cantone = testo(dati.cantone).trim().toUpperCase()
  const annoScolastico = testo(dati.annoScolastico).trim().replace('-', '/')
  const anni = /^(\d{4})\/(\d{4})$/.exec(annoScolastico)
  if (!cantone || !anni || Number(anni[2]) !== Number(anni[1]) + 1) return undefined
  return { cantone, annoScolastico }
}

/**
 * Un indirizzo collocato, se è davvero un punto: coordinate fuori scala o
 * indirizzo vuoto valgono «non ancora cercato».
 */
function normalizzaCoordinata (grezzo: unknown): Coordinata | null {
  const dati = oggetto(grezzo)
  const lat = numero(dati.lat, NaN)
  const lon = numero(dati.lon, NaN)
  const indirizzo = testo(dati.indirizzo).trim()
  if (!indirizzo) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return {
    // La chiave si ricalcola dall'indirizzo: una chiave scritta a mano che non
    // corrisponde farebbe una voce introvabile.
    chiave: chiaveIndirizzo(indirizzo),
    indirizzo,
    lat,
    lon,
    etichetta: testo(dati.etichetta) || undefined,
    approssimato: booleano(dati.approssimato, false) || undefined,
    trovatoIl: testo(dati.trovatoIl) || istanteAdesso(),
  }
}

/**
 * Le coordinate dell'anno: quelle del loro file più quelle nelle anagrafiche
 * vecchie (`geo`, `geoDatore`), che `normalizzaAllievo` non rilegge. Al primo
 * salvataggio restano solo qui, una per indirizzo.
 */
export function coordinateDellAnno (dati: Record<string, unknown>, classiGrezze: unknown[]): Coordinata[] {
  const perChiave = new Map<string, Coordinata>()

  const accogli = (grezzo: unknown) => {
    const voce = normalizzaCoordinata(grezzo)
    if (!voce) return
    const gia = perChiave.get(voce.chiave)
    // A parità di indirizzo vince la risposta più recente.
    if (!gia || gia.trovatoIl < voce.trovatoIl) perChiave.set(voce.chiave, voce)
  }

  for (const grezzo of elenco(dati.coordinate)) accogli(grezzo)

  for (const grezzaClasse of classiGrezze) {
    for (const grezzoAllievo of elenco(oggetto(grezzaClasse).allievi)) {
      const allievo = oggetto(grezzoAllievo)
      // Nelle anagrafiche vecchie il punto porta l'indirizzo per cui vale: basta
      // per farne una voce.
      accogli(allievo.geo)
      accogli(allievo.geoDatore)
    }
  }

  return [...perChiave.values()].sort((a, b) => a.chiave.localeCompare(b.chiave, 'it'))
}

/**
 * Un indirizzo letto da un file di qualunque età. Una riga sola (forma
 * vecchia) si spezza con `leggiIndirizzo`, che non perde niente: la riga
 * ricomposta è la chiave delle coordinate.
 */
function normalizzaIndirizzo (grezzo: unknown): Indirizzo {
  if (typeof grezzo === 'string') return leggiIndirizzo(grezzo)
  const dati = oggetto(grezzo)
  return {
    presso: testo(dati.presso) || undefined,
    via: testo(dati.via),
    casella: testo(dati.casella) || undefined,
    cap: testo(dati.cap),
    localita: testo(dati.localita),
    paese: testo(dati.paese) || undefined,
  }
}

/**
 * I numeri di telefono di un allievo, da un file di qualunque età. I vecchi
 * campi `telefono` e `telefonoDatore` diventano voci dell'elenco (cellulare
 * della persona, centralino del datore) e al salvataggio spariscono. Si
 * aggiungono anche accanto all'elenco nuovo, ma solo se il numero non c'è già.
 */
function normalizzaTelefoni (dati: Record<string, unknown>): Telefono[] {
  const voci: Telefono[] = []

  /**
   * Aggiunge i numeri scritti in una casella. L'etichetta scritta vale; se
   * manca si propone dal numero. Solo il primo pezzo tiene id ed etichetta: gli
   * altri numeri della stessa casella hanno la loro.
   */
  const aggiungi = (
    contatto: ContattoTelefonico,
    grezzo: string,
    etichetta?: EtichettaTelefono,
    id?: string,
  ) => {
    separaNumeri(grezzo).forEach((pezzo, indice) => {
      const numero = conPrefissoInternazionale(pezzo)
      if (numero === '') return
      // Lo stesso numero due volte per lo stesso contatto è un doppione.
      if (voci.some((v) => v.contatto === contatto && v.numero === numero)) return
      voci.push({
        id: indice === 0 && id ? id : nuovoIdTelefono(),
        contatto,
        etichetta:
          indice === 0 && etichetta ? etichetta : etichettaProposta(contatto, numero),
        numero,
      })
    })
  }

  for (const grezzo of elenco(dati.telefoni)) {
    const voce = oggetto(grezzo)
    const contatto = CONTATTI.includes(voce.contatto as ContattoTelefonico)
      ? (voce.contatto as ContattoTelefonico)
      : 'pif'
    const etichetta = ETICHETTE.includes(voce.etichetta as EtichettaTelefono)
      ? (voce.etichetta as EtichettaTelefono)
      : undefined
    aggiungi(contatto, testo(voce.numero), etichetta, testo(voce.id) || undefined)
  }

  // I campi vecchi, se ci sono ancora.
  aggiungi('pif', testo(dati.telefono))
  aggiungi('datore', testo(dati.telefonoDatore))

  return voci
}

function normalizzaAllievo (grezzo: unknown): Allievo {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdAllievo(),
    cognome: testo(dati.cognome),
    nome: testo(dati.nome),
    // Solo se è una data: un '23.05.2010' incollato uscirebbe come trattino.
    dataNascita: isoValida(dati.dataNascita) ? dati.dataNascita : '',
    iscrittoIl: isoValida(dati.iscrittoIl) ? dati.iscrittoIl : undefined,
    indirizzo: normalizzaIndirizzo(dati.indirizzo),
    email: testo(dati.email),
    emailTutore: testo(dati.emailTutore),
    azienda: testo(dati.azienda),
    indirizzoDatore: normalizzaIndirizzo(dati.indirizzoDatore),
    // Le coordinate stanno in `registro.coordinate`; i `geo` vecchi li
    // raccoglie `coordinateDellAnno`.
    emailDatore: testo(dati.emailDatore),
    telefoni: normalizzaTelefoni(dati),
    // Il ritratto è un percorso: il file sta nella cartella della classe.
    foto: testo(dati.foto),
    // Le note dell'anagrafica non si rileggono: restano nel file vecchio e
    // smettono di comparire.
    attivo: booleano(dati.attivo, true),
  }
}

export const CATEGORIE_DOCUMENTO: CategoriaDocumento[] = [
  'certificato',
  'autorizzazione',
  'giustificazione',
  'modulo',
  'altro',
]

const STATI_COMUNICAZIONE: StatoComunicazione[] = ['bozza', 'inviata', 'errore']

function normalizzaRecapito (grezzo: unknown): Recapito {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdRecapito(),
    etichetta: testo(dati.etichetta, testi().recapito),
    email: testo(dati.email).trim(),
    predefinito: booleano(dati.predefinito, true),
  }
}

function normalizzaDocumento (grezzo: unknown): Documento {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdDocumento(),
    allievoId: riferimento(dati.allievoId),
    titolo: testo(dati.titolo, Uno(lessico().documento)),
    categoria: unaVoce(dati.categoria, CATEGORIE_DOCUMENTO, 'altro'),
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    scadenza: isoValida(dati.scadenza) ? (dati.scadenza) : undefined,
    note: testo(dati.note),
    aggiuntoIl: testo(dati.aggiuntoIl, ora),
  }
}

function normalizzaComunicazione (grezzo: unknown): Comunicazione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdComunicazione(),
    oggetto: testo(dati.oggetto, testi().senzaOggetto),
    corpo: testo(dati.corpo),
    aAllievi: booleano(dati.aAllievi, true),
    aTutori: booleano(dati.aTutori, false),
    recapitiIds: elenco(dati.recapitiIds).map((r) => testo(r)).filter(Boolean),
    documentiIds: elenco(dati.documentiIds).map((d) => testo(d)).filter(Boolean),
    stato: unaVoce(dati.stato, STATI_COMUNICAZIONE, 'bozza'),
    destinatari: elenco(dati.destinatari).map((d) => testo(d)).filter(Boolean),
    errore: testo(dati.errore) || undefined,
    creataIl: testo(dati.creataIl, ora),
    inviataIl: testo(dati.inviataIl) || undefined,
    // Assente vuol dire «non si sa», diverso da `false`.
  }
}

function normalizzaFoglioAssenze (grezzo: unknown): FoglioAssenze {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    tipo: unaVoce(dati.tipo, TIPI_RAPPORTO, 'assenze'),
    firmato: booleano(dati.firmato, false),
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    aggiuntoIl: testo(dati.aggiuntoIl, istanteAdesso()),
  }
}

function normalizzaInvioAssenze (grezzo: unknown): InvioAssenze | null {
  if (grezzo === null || grezzo === undefined) return null
  const dati = oggetto(grezzo)
  return {
    destinatari: elenco(dati.destinatari).map((d) => testo(d)).filter(Boolean),
    inviatoIl: testo(dati.inviatoIl, istanteAdesso()),
    errore: testo(dati.errore) || undefined,
  }
}

function normalizzaRigaAssenze (grezzo: unknown): RigaAssenze {
  const dati = oggetto(grezzo)
  return {
    allievoId: testo(dati.allievoId),
    // Un foglio senza file è una riga lasciata a metà nel JSON: si butta.
    fogli: elenco(dati.fogli).map(normalizzaFoglioAssenze).filter((f) => f.file),
    invio: normalizzaInvioAssenze(dati.invio),
    note: testo(dati.note),
  }
}

// La lettera di serie vecchia nominava sempre assenze e ritardi; ora lo dicono
// `{tipi}` e `{rapporti}` secondo gli allegati. I periodi si aggiornano in
// lettura, ma solo se il testo è ancora identico a quello di serie: una
// lettera riscritta dal docente non si tocca.
// testo-fisso: l'oggetto di serie di prima, in italiano, da riconoscere su disco
const OGGETTO_PRIMA = 'Assenze e ritardi — {allievo}'

const FRASI_PRIMA: Array<[string, string]> = [
  // testo-fisso: la lettera di serie di prima, da riconoscere su disco
  ['il rapporto delle assenze e dei ritardi di {allievo}', '{rapporti} di {allievo}'],
  // testo-fisso: la lettera di serie di prima, da riconoscere su disco
  ['controfirmare i documenti e di rispedirceli', 'controfirmare quanto allegato e di rispedircelo'],
]

function oggettoAggiornato (oggetto: string): string {
  return oggetto.startsWith(OGGETTO_PRIMA)
    ? `{tipi} — {allievo}${oggetto.slice(OGGETTO_PRIMA.length)}`
    : oggetto
}

function corpoAggiornato (corpo: string): string {
  let scritto = corpo
  for (const [prima, adesso] of FRASI_PRIMA) scritto = scritto.replace(prima, adesso)
  return scritto
}

/**
 * Un periodo di assenze. Un periodo al contrario si raddrizza invece di
 * rifiutare il file.
 */
function normalizzaBloccoAssenze (grezzo: unknown): BloccoAssenze {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const primo = unaData(dati.dal, oggi())
  const secondo = unaData(dati.al, primo)
  return {
    id: testo(dati.id) || nuovoIdBloccoAssenze(),
    etichetta: testo(dati.etichetta, Uno(lessico().periodo)),
    dal: primo <= secondo ? primo : secondo,
    al: primo <= secondo ? secondo : primo,
    oggetto: oggettoAggiornato(testo(dati.oggetto)),
    corpo: corpoAggiornato(testo(dati.corpo)),
    aAllievo: booleano(dati.aAllievo, false),
    aTutore: booleano(dati.aTutore, false),
    recapitiIds: elenco(dati.recapitiIds).map((r) => testo(r)).filter(Boolean),
    righe: elenco(dati.righe).map(normalizzaRigaAssenze).filter((r) => r.allievoId),
    note: testo(dati.note),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

export function normalizzaMateria (grezzo: unknown): Materia {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdMateria(),
    nome: testo(dati.nome, Uno(lessico().materia)),
    sigla: testo(dati.sigla),
    colore: testo(dati.colore),
    note: testo(dati.note),
  }
}

function normalizzaRicorrenza (grezzo: unknown, minutiUd: number): Ricorrenza {
  const dati = oggetto(grezzo)
  const giorno = Math.round(numero(dati.giorno, 1))
  return {
    id: testo(dati.id) || nuovoIdRicorrenza(),
    giorno: giorno >= 1 && giorno <= 7 ? giorno : 1,
    inizio: unOra(dati.inizio, '08:00'),
    durataMin: minutiInUd(numero(dati.durataMin, minutiUd), minutiUd),
    aula: testo(dati.aula),
    dal: isoValida(dati.dal) ? (dati.dal) : undefined,
    al: isoValida(dati.al) ? (dati.al) : undefined,
  }
}

export function normalizzaCorso (grezzo: unknown, minutiUd: number): Corso {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdCorso(),
    classeId: testo(dati.classeId),
    materiaId: testo(dati.materiaId),
    titolo: testo(dati.titolo, Uno(lessico().corso)),
    orario: elenco(dati.orario)
      .map((ricorrenza) => normalizzaRicorrenza(ricorrenza, minutiUd))
      .sort((a, b) => a.giorno - b.giorno || a.inizio.localeCompare(b.inizio)),
    note: testo(dati.note),
    ...(coloreValido(testo(dati.colore)) ? { colore: testo(dati.colore) } : {}),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/** Il fascicolo di una classe. Le tre raccolte dentro sono sue, non della classe. */
export function normalizzaFascicolo (grezzo: unknown): Fascicolo {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdFascicolo(),
    classeId: testo(dati.classeId),
    recapiti: elenco(dati.recapiti).map(normalizzaRecapito),
    documenti: elenco(dati.documenti).map(normalizzaDocumento),
    comunicazioni: elenco(dati.comunicazioni).map(normalizzaComunicazione),
    assenze: elenco(dati.assenze).map(normalizzaBloccoAssenze),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

export function normalizzaClasse (grezzo: unknown, indice = 0): Classe {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdClasse(),
    annoId: testo(dati.annoId),
    nome: testo(dati.nome, testi().classeSenzaNome),
    sede: testo(dati.sede),
    // Senza un colore buono, uno dalla tavolozza a rotazione.
    colore: coloreValido(testo(dati.colore))
      ? testo(dati.colore)
      : COLORI_CLASSE[indice % COLORI_CLASSE.length],
    note: testo(dati.note),
    allievi: elenco(dati.allievi).map(normalizzaAllievo),
    archiviata: booleano(dati.archiviata, false),
    docenteDiClasse: booleano(dati.docenteDiClasse, false),
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

function normalizzaSlot (grezzo: unknown, minutiUd: number): Slot {
  const dati = oggetto(grezzo)
  const inizio = unOra(dati.inizio, '08:00')
  return {
    id: testo(dati.id) || nuovoIdSlot(),
    inizio,
    fine: unOra(dati.fine, sommaMinuti(inizio, minutiUd)),
    tipo: unaVoce(dati.tipo, ['lezione', 'pausa'] as const, 'lezione'),
    etichetta: testo(dati.etichetta),
    ...(dati.ics === true ? { ics: true as const } : {}),
  }
}

/**
 * L'appello di un allievo, portato alla lunghezza dell'ora (`quante` UD): le
 * caselle in più restano non impostate, quelle in avanzo cadono. Uno `stato`
 * unico (forma vecchia) vale per ogni UD.
 */
function normalizzaPresenza (grezzo: unknown, quante: number): Presenza {
  const dati = oggetto(grezzo)
  // `stati` lascia vuote le UD che non nomina (aggiunte dopo); lo stato unico
  // si ripete su tutte, perché parlava dell'ora intera.
  const perUd = Array.isArray(dati.stati)
  const salvati = perUd
    ? (dati.stati as unknown[]).map(unoStatoPresenza)
    : [unoStatoPresenza(dati.stato)]
  const riempitivo: StatoPresenza = perUd ? 'non-impostato' : salvati[0] ?? 'non-impostato'
  const stati = Array.from(
    { length: Math.max(quante, 1) },
    (_, i) => salvati[i] ?? riempitivo,
  )
  return {
    allievoId: testo(dati.allievoId),
    stati,
    minuti: dati.minuti === undefined ? undefined : numero(dati.minuti, 0),
    nota: testo(dati.nota),
  }
}

function normalizzaOsservazione (grezzo: unknown): Osservazione {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdOsservazione(),
    allievoId: riferimento(dati.allievoId),
    tipo: unaVoce(dati.tipo, TIPI_OSSERVAZIONE, 'nota'),
    testo: testo(dati.testo),
    ora: oraValida(dati.ora) ? (dati.ora) : undefined,
    creataIl: testo(dati.creataIl, istanteAdesso()),
  }
}

/**
 * Una casella della matrice del comportamento, riletta. `null` senza persona,
 * senza aspetto, o senza né segno né annotazione (come fa `osservazione.cella`).
 */
function normalizzaCellaOsservata (grezzo: unknown): CellaOsservata | null {
  const dati = oggetto(grezzo)
  const allievoId = testo(dati.allievoId)
  const aspetto = testo(dati.aspetto)
  if (!allievoId || !aspetto) return null
  const segno: SegnoOsservato | null =
    dati.segno === 'positivo' || dati.segno === 'negativo' ? dati.segno : null
  const nota = testo(dati.nota).trim()
  if (!segno && !nota) return null
  return { allievoId, aspetto, segno, ...(nota ? { nota } : {}) }
}

function normalizzaAvanzamento (grezzo: unknown): AvanzamentoAttivita {
  const dati = oggetto(grezzo)
  return {
    attivitaId: testo(dati.attivitaId),
    titolo: testo(dati.titolo),
    stato: unaVoce(dati.stato, ['da-fare', 'svolta', 'parziale', 'saltata'] as const, 'da-fare'),
    nota: testo(dati.nota),
  }
}

/** Le caselle segnate di un'ora, o niente: vedi `normalizzaLezione`. */
function matriceLetta (grezzo: unknown): { matrice?: CellaOsservata[] } {
  const celle = elenco(grezzo)
    .map(normalizzaCellaOsservata)
    .filter((cella): cella is CellaOsservata => cella !== null)
  return celle.length > 0 ? { matrice: celle } : {}
}

export function normalizzaLezione (grezzo: unknown, minutiUd: number, corsoId = ''): Lezione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const letti = elenco(dati.slot).map((s) => normalizzaSlot(s, minutiUd))
  // Un'ora senza fasce ne prende una da un'UD: vuota non si vedrebbe né si
  // potrebbe togliere.
  const slot = letti.length > 0 ? letti : [normalizzaSlot({}, minutiUd)]
  const quanteUd = contaUd({ slot } as Lezione, minutiUd)
  return {
    id: testo(dati.id) || nuovoIdLezione(),
    corsoId: corsoId || testo(dati.corsoId),
    data: unaData(dati.data, oggi()),
    slot,
    aula: testo(dati.aula),
    stato: unaVoce(dati.stato, STATI_LEZIONE, 'pianificata'),
    pianoId: riferimento(dati.pianoId),
    avanzamento: elenco(dati.avanzamento).map(normalizzaAvanzamento),
    presenze: elenco(dati.presenze).map((p) => normalizzaPresenza(p, quanteUd)),
    osservazioni: elenco(dati.osservazioni).map(normalizzaOsservazione),
    // La matrice del comportamento: va riletta qui, se no alla riapertura
    // sparirebbe. Solo quando c'è qualcosa: niente elenchi vuoti.
    ...matriceLetta(dati.matrice),
    // Il vecchio titolo della lezione confluisce qui invece di sparire.
    argomenti: testo(dati.argomenti) || testo(dati.titolo),
    materiali: testo(dati.materiali),
    consuntivo: testo(dati.consuntivo),
    // Solo quando è vera: una lezione normale non porta il campo.
    ...(dati.supplenza === true ? { supplenza: true } : {}),
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

const TIPI_RISORSA: TipoRisorsa[] = ['collegamento', 'file', 'immagine']

/**
 * Una risorsa: il tipo comanda. Un collegamento senza indirizzo valido diventa
 * una riga senza link; un file senza percorso resta annunciato.
 */
export function normalizzaRisorsa (grezzo: unknown): Risorsa {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const tipo = unaVoce(dati.tipo, TIPI_RISORSA, 'collegamento')
  const file = percorsoRelativo(dati.file)
  const url = testo(dati.url).trim()
  return {
    id: testo(dati.id) || nuovoIdRisorsa(),
    tipo,
    titolo:
      testo(dati.titolo) || testo(dati.nome) || nomeDelFile(file) || url || Uno(lessico().risorsa),
    url: tipo === 'collegamento' && urlValido(url) ? url : undefined,
    file: tipo === 'collegamento' ? undefined : file || undefined,
    nome: testo(dati.nome) || nomeDelFile(file) || undefined,
    note: testo(dati.note) || undefined,
    aggiuntaIl: testo(dati.aggiuntaIl, ora),
  }
}

/**
 * L'UD con cui si rileggono i piani scritti in minuti (forma vecchia): sempre
 * 45 minuti, la durata di allora, non quella del documento.
 */
const UD_DEI_PIANI_IN_MINUTI = 45

function normalizzaAttivita (grezzo: unknown): Attivita {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdAttivita(),
    titolo: testo(dati.titolo, Uno(lessico().attivita)),
    tipo: unaVoce(dati.tipo, TIPI_ATTIVITA, 'spiegazione'),
    // I piani in minuti si rileggono in UD: minuti diviso UD, senza arrotondare
    // (un'attività da venti minuti riarrotondata al quarto tornerebbe a schermo
    // da ventitré). Basta che sia positivo.
    durataUd: Math.max(
      0.01,
      dati.durataUd !== undefined
        ? numero(dati.durataUd, 0.5)
        : numero(dati.durataMin, UD_DEI_PIANI_IN_MINUTI / 2) / UD_DEI_PIANI_IN_MINUTI,
    ),
    descrizione: testo(dati.descrizione),
    materiali: testo(dati.materiali),
    raggruppamento: unaVoce(
      dati.raggruppamento,
      ['plenaria', 'individuale', 'coppie', 'gruppi'] as const,
      'plenaria',
    ),
    risorse: elenco(dati.risorse).map(normalizzaRisorsa),
    // I parametri si tengono come sono, anche con chiavi non più previste; si
    // butta solo quel che non è un valore semplice.
    parametri: parametriPuliti(dati.parametri),
    valutazione: normalizzaValutazionePrevista(dati.valutazione) ?? undefined,
    // Assente sulle tappe che non lavorano per un progetto: i piani restano leggeri.
    progettoId: riferimento(dati.progettoId) ?? undefined,
    // Senza progetto non c'è fase; che la fase sia del progetto lo guarda
    // `fasiDelleTappe` in `normalizzaRegistro`, che vede anche i progetti.
    faseProgettoId: riferimento(dati.progettoId) ? riferimento(dati.faseProgettoId) ?? undefined : undefined,
  }
}

/** Solo valori che un campo sa mostrare: testo, numero, sì/no. */
function parametriPuliti (grezzo: unknown): Record<string, string | number | boolean> | undefined {
  const dati = oggetto(grezzo)
  const puliti: Record<string, string | number | boolean> = {}
  for (const [chiave, valore] of Object.entries(dati)) {
    if (typeof valore === 'string' || typeof valore === 'number' || typeof valore === 'boolean') {
      puliti[chiave] = valore
    }
  }
  return Object.keys(puliti).length > 0 ? puliti : undefined
}

/**
 * La ponderazione dentro i suoi estremi: da 0 («non fa media») a 10, uno se
 * non si capisce. Un peso fuori scala ribalterebbe una media senza dirlo.
 */
function pesoValido (grezzo: unknown): number {
  return Math.min(10, Math.max(0, numero(grezzo, 1)))
}

/** La valutazione prevista da un piano: assente vuol dire che il piano non ne porta. */
function normalizzaValutazionePrevista (grezzo: unknown): ValutazionePrevista | null {
  if (grezzo === null || grezzo === undefined) return null
  const dati = oggetto(grezzo)
  return {
    titolo: testo(dati.titolo, lessico().tipiAttivita.verifica),
    tipo: unaVoce(dati.tipo, TIPI_VALUTAZIONE, 'scritto'),
    peso: pesoValido(dati.peso),
  }
}

/**
 * La valutazione prevista dei piani vecchi, rimessa su una tappa. Se la
 * scaletta dichiara già una prova, comanda quella; altrimenti va sulla prima
 * tappa di tipo verifica; se non ce n'è, si aggiunge una tappa in fondo, perché
 * la prova non sparisca.
 */
function valutazioneSullaScaletta (
  attivita: Attivita[],
  prevista: ValutazionePrevista | null,
): Attivita[] {
  if (!prevista) return attivita
  if (attivita.some((a) => a.valutazione)) return attivita

  const verifica = attivita.find((a) => a.tipo === 'verifica')
  if (verifica) {
    verifica.valutazione = prevista
    return attivita
  }
  return [
    ...attivita,
    {
      id: nuovoIdAttivita(),
      titolo: prevista.titolo,
      tipo: 'verifica',
      durataUd: 0.5,
      descrizione: '',
      materiali: '',
      raggruppamento: 'plenaria',
      risorse: [],
      valutazione: prevista,
    },
  ]
}

/**
 * Il titolo dei piani vecchi, rimesso in cima ai prerequisiti. I riempitivi di serie
 * («Piano senza titolo») non si conservano.
 */
// testo-fisso: i riempitivi italiani che il registro scriveva da sé, da riconoscere
const TITOLI_VUOTI = new Set(['piano senza titolo', 'senza titolo', 'nuovo piano'])

function unisciVecchioTitolo (titolo: string, sotto: string): string {
  const suo = titolo.trim()
  if (!suo || TITOLI_VUOTI.has(suo.toLowerCase())) return sotto
  if (sotto.includes(suo)) return sotto
  return sotto ? `${suo}
${sotto}` : suo
}

export function normalizzaPiano (grezzo: unknown, corsoId: string | null = null): PianoLezione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const suo = riferimento(dati.corsoId)
  return {
    id: testo(dati.id) || nuovoIdPiano(),
    corsoId: suo ?? corsoId,
    obiettivi: elenco(dati.obiettivi).map((o) => testo(o)).filter(Boolean),
    // Il titolo dei piani vecchi finisce in cima ai prerequisiti; le note le
    // ha già portate lì il passo del formato 4.
    prerequisiti: unisciVecchioTitolo(testo(dati.titolo), testo(dati.prerequisiti)),
    // La valutazione dei piani vecchi si posa sulla tappa che la faceva.
    attivita: valutazioneSullaScaletta(
      elenco(dati.attivita).map(normalizzaAttivita),
      normalizzaValutazionePrevista(dati.valutazione),
    ),
    risorse: elenco(dati.risorse).map(normalizzaRisorsa),
    tag: elenco(dati.tag).map((t) => testo(t)).filter(Boolean),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

function normalizzaVoto (grezzo: unknown): Voto {
  const dati = oggetto(grezzo)
  // Vuoto o illeggibile resta vuoto: `Number('')` fa 0, un voto fuori scala
  // che entrerebbe nella media. La virgola vale come punto, come in `numero()`.
  const valore = numero(dati.valore, Number.NaN)
  return {
    allievoId: testo(dati.allievoId),
    valore: Number.isFinite(valore) ? valore : null,
    assente: booleano(dati.assente, false),
    nota: testo(dati.nota),
    // Solo se è una data vera; se no «non riconsegnata».
    riconsegnataIl: isoValida(dati.riconsegnataIl) ? dati.riconsegnataIl : null,
  }
}

/**
 * Una riga della tabella dei recuperi, o `null` senza data, nota né rinuncia:
 * non direbbe niente e mostrerebbe un recupero «da fissare» due volte.
 */
function normalizzaRecupero (grezzo: unknown): RecuperoProva | null {
  const dati = oggetto(grezzo)
  const allievoId = testo(dati.allievoId)
  if (!allievoId) return null

  const previstoIl = isoValida(dati.previstoIl) ? dati.previstoIl : null
  const riconsegnataIl = isoValida(dati.riconsegnataIl) ? dati.riconsegnataIl : null
  const nota = testo(dati.nota)
  const dispensato = booleano(dati.dispensato, false)
  if (!previstoIl && !nota && !dispensato && !riconsegnataIl) return null

  return {
    allievoId,
    previstoIl,
    riconsegnataIl,
    nota: nota || undefined,
    dispensato: dispensato || undefined,
    aggiornatoIl: testo(dati.aggiornatoIl, istanteAdesso()),
  }
}

/**
 * La tabella dei recuperi, comprese le righe della forma vecchia dentro il
 * voto: sono decisioni prese da chi insegna, e non si buttano.
 */
function recuperiDellaProva (dati: Record<string, unknown>): RecuperoProva[] {
  const righe = elenco(dati.recuperi)
    .map(normalizzaRecupero)
    .filter((r): r is RecuperoProva => r !== null)
  const gia = new Set(righe.map((r) => r.allievoId))

  for (const grezzo of elenco(dati.voti)) {
    const voto = oggetto(grezzo)
    if (!voto.recupero) continue
    const vecchia = normalizzaRecupero({ ...oggetto(voto.recupero), allievoId: voto.allievoId })
    if (vecchia && !gia.has(vecchia.allievoId)) {
      righe.push(vecchia)
      gia.add(vecchia.allievoId)
    }
  }

  return righe
}

const RUOLI_ALLEGATO = [
  'verifica',
  'soluzione',
  'prova',
  'recupero',
  'recupero-soluzione',
] as const

function normalizzaAllegato (grezzo: unknown): Allegato {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdAllegato(),
    ruolo: unaVoce(dati.ruolo, RUOLI_ALLEGATO, 'verifica'),
    allievoId: riferimento(dati.allievoId),
    nome: testo(dati.nome) || nomeDelFile(file) || 'allegato.pdf',
    file,
    aggiuntoIl: testo(dati.aggiuntoIl, ora),
  }
}

export function normalizzaValutazione (grezzo: unknown, corsoId = ''): MomentoValutazione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdValutazione(),
    corsoId: corsoId || testo(dati.corsoId),
    lezioneId: riferimento(dati.lezioneId),
    pianoId: riferimento(dati.pianoId),
    attivitaId: riferimento(dati.attivitaId),
    progettoId: riferimento(dati.progettoId),
    titolo: testo(dati.titolo, Uno(lessico().momento)),
    tipo: unaVoce(dati.tipo, TIPI_VALUTAZIONE, 'scritto'),
    data: unaData(dati.data, oggi()),
    peso: pesoValido(dati.peso),
    scala: normalizzaScala(dati.scala),
    descrizione: testo(dati.descrizione),
    // La data di riconsegna del momento (forma vecchia) scende sui voti che non
    // ne hanno una: buttarla riaprirebbe nel todo prove già chiuse.
    voti: conRiconsegnaDelMomento(elenco(dati.voti).map(normalizzaVoto), dati.riconsegnataIl),
    recuperi: recuperiDellaProva(dati),
    allegati: elenco(dati.allegati).map(normalizzaAllegato).filter((a) => a.file !== ''),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/**
 * Porta la data di riconsegna del momento su ogni voto che non ne ha una sua;
 * quella del voto, più precisa, vince.
 */
function conRiconsegnaDelMomento (voti: Voto[], grezza: unknown): Voto[] {
  if (!isoValida(grezza)) return voti
  return voti.map((voto) => (voto.riconsegnataIl ? voto : { ...voto, riconsegnataIl: grezza }))
}
