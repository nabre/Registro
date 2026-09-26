// I lettori del registro: da quel che c'è su disco a oggetti validi.
//
// `normalizza…` produce sempre un oggetto valido, riempiendo i buchi con i
// predefiniti: i file stanno in una cartella sincronizzata e si aprono a mano,
// quindi un campo mancante o un JSON di una versione precedente deve
// degradare, non far cadere il programma. Qui anche le conversioni delle forme
// vecchie (compiti e documenti che diventano consegne), che solo un lettore
// può fare. Le regole condivise con le convalide si importano da
// `validation.ts`, mai il contrario.

import { annoAllineato, etichettaSemestreNuovo, ordinaSettimane } from './years.js'
import {
  LIMITI_UD,
  etichettaAnno,
  giornoDi,
  isoValida,
  istanteAdesso,
  minutiInUd,
  oggi,
  oraValida,
  sommaMinuti,
} from './dates.js'
import { emailValida, nomeDelFile, percorsoRelativo } from './text.js'
import { chiaveIndirizzo } from './map.js'
import { allieviAttivi, contaUd } from './calculations.js'
import { QUANDO_RIFARE_PDF } from './automation.js'
import { coloreValido, normalizzaListe } from './lists.js'
import { COLORI_CLASSE, IMPOSTAZIONI_PREDEFINITE, SCALA_PREDEFINITA } from './factories.js'
import { LIMITI_PAUSE, pauseDentroIlGiorno } from './breaks.js'
import {
  CONTATTI,
  ETICHETTE,
  conPrefissoInternazionale,
  etichettaProposta,
  separaNumeri,
} from './phones.js'
import { leggiIndirizzo, type Indirizzo } from './addresses.js'
import {
  nuovoIdAllievo,
  nuovoIdAnno,
  nuovoIdAttivita,
  nuovoIdCheck,
  nuovoIdClasse,
  nuovoIdLezione,
  nuovoIdCorso,
  nuovoIdFascicolo,
  nuovoIdMateria,
  nuovoIdConsegna,
  nuovoIdOsservazione,
  nuovoIdPiano,
  nuovoIdRisorsa,
  nuovoIdAllegato,
  nuovoIdBloccoAssenze,
  nuovoIdComunicazione,
  nuovoIdDocumento,
  nuovoIdRecapito,
  nuovoIdCalendarioEsterno,
  nuovoIdRegolaCalendario,
  nuovoIdRicorrenza,
  nuovoIdSemestre,
  nuovoIdSospensione,
  nuovoIdSlot,
  nuovoIdSmistamento,
  nuovoIdTelefono,
  nuovoIdBlocco,
  nuovoIdValutazione,
} from './identifiers.js'
import type {
  Allievo,
  Coordinata,
  AnnoScolastico,
  Attivita,
  Check,
  Consegna,
  Divisione,
  AvanzamentoAttivita,
  CellaOsservata,
  Classe,
  Impostazioni,
  CalendarioEsterno,
  RegolaCalendario,
  SorgenteCalendario,
  Lezione,
  MomentoValutazione,
  Osservazione,
  PianoLezione,
  Presenza,
  RecuperoProva,
  Registro,
  Scala,
  SegnoOsservato,
  Allegato,
  BloccoAssenze,
  CategoriaDocumento,
  Comunicazione,
  FoglioAssenze,
  InvioAssenze,
  RigaAssenze,
  TipoRapporto,
  Corso,
  Documento,
  Fascicolo,
  Materia,
  Recapito,
  Ricorrenza,
  RiquadroPagina,
  Risorsa,
  Semestre,
  Sospensione,
  StatoComunicazione,
  ValutazionePrevista,
  Slot,
  Smistamento,
  BloccoDaSmistare,
  ContattoTelefonico,
  EtichettaTelefono,
  Telefono,
  SpuntaCheck,
  SpuntaConsegna,
  StatoPresenza,
  TipoRisorsa,
  Voto,
  QuandoRifarePdf,
  Intestazione,
  CartaIntestata,
  PauseGiornata,
} from './models.js'
import { SIGLE_PRESENZA, Uno, chiaviDi } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { testi as testiFabbrica } from './factories.testi.js'
import { testi } from './normalization.testi.js'
import { ALTEZZA_LOGO, CHI_INSEGNA, VERSIONE_DATI } from './models.js'
import { cartaVuota, completaCarte, nuovoIdCarta } from './letterhead.js'
import { colonneRipulite } from './check.js'
import { Migrazione } from './migration.js'
import { urlValido } from './validation.js'

/** Riesportata da `text.ts` per chi la importa da qui. */
export { emailValida }

// ------------------------------------------------------------------ normalizzazione

function testo (valore: unknown, predefinito = ''): string {
  return typeof valore === 'string' ? valore : predefinito
}

function numero (valore: unknown, predefinito: number): number {
  // La virgola vale come punto: chi corregge i file a mano scrive «1,5».
  if (typeof valore === 'number') return Number.isFinite(valore) ? valore : predefinito
  // Il vuoto non è zero (`Number('')` fa 0): resta il valore di ripiego.
  const scritto = String(valore ?? '').trim().replace(',', '.')
  if (scritto === '') return predefinito
  const n = Number(scritto)
  return Number.isFinite(n) ? n : predefinito
}

function booleano (valore: unknown, predefinito: boolean): boolean {
  return typeof valore === 'boolean' ? valore : predefinito
}

function unaData (valore: unknown, predefinito: string): string {
  return isoValida(valore) ? valore : predefinito
}

function unOra (valore: unknown, predefinito: string): string {
  return oraValida(valore) ? valore : predefinito
}

function unaVoce<T extends string> (valore: unknown, ammesse: readonly T[], predefinito: T): T {
  return ammesse.includes(valore as T) ? (valore as T) : predefinito
}

function elenco (valore: unknown): unknown[] {
  return Array.isArray(valore) ? valore : []
}

function oggetto (valore: unknown): Record<string, unknown> {
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

function normalizzaScala (grezzo: unknown): Scala {
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
      numero: indice === 0 ? 1 : 2,
      etichetta: testo(dati.etichetta) || etichettaSemestreNuovo(indice + 1),
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

function normalizzaAnno (grezzo: unknown): AnnoScolastico {
  const dati = oggetto(grezzo)
  const inizio = unaData(dati.inizio, '2024-09-01')
  const fine = unaData(dati.fine, '2025-06-30')
  const semestri = normalizzaSemestri(dati.semestri, inizio, fine)

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
  })
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
function coordinateDellAnno (dati: Record<string, unknown>, classiGrezze: unknown[]): Coordinata[] {
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

const CATEGORIE_DOCUMENTO: CategoriaDocumento[] = [
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
    allievoId: typeof dati.allievoId === 'string' && dati.allievoId ? dati.allievoId : null,
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

/** I due fogli di un periodo, nell'ordine in cui si guardano. */
export const TIPI_RAPPORTO: readonly TipoRapporto[] = ['assenze', 'ritardi']

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

function normalizzaMateria (grezzo: unknown): Materia {
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

function normalizzaCorso (grezzo: unknown, minutiUd: number): Corso {
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
function normalizzaFascicolo (grezzo: unknown): Fascicolo {
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

function normalizzaClasse (grezzo: unknown, indice = 0): Classe {
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
    allievoId: typeof dati.allievoId === 'string' ? dati.allievoId : null,
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

function normalizzaLezione (grezzo: unknown, minutiUd: number, corsoId = ''): Lezione {
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
    pianoId: typeof dati.pianoId === 'string' ? dati.pianoId : null,
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
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

const TIPI_RISORSA: TipoRisorsa[] = ['collegamento', 'file', 'immagine']

/**
 * Una risorsa: il tipo comanda. Un collegamento senza indirizzo valido diventa
 * una riga senza link; un file senza percorso resta annunciato.
 */
function normalizzaRisorsa (grezzo: unknown): Risorsa {
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
 * Il titolo dei piani vecchi, rimesso nelle note. I riempitivi di serie
 * («Piano senza titolo») non si conservano.
 */
// testo-fisso: i riempitivi italiani che il registro scriveva da sé, da riconoscere
const TITOLI_VUOTI = new Set(['piano senza titolo', 'senza titolo', 'nuovo piano'])

function unisciVecchioTitolo (titolo: string, note: string): string {
  const suo = titolo.trim()
  if (!suo || TITOLI_VUOTI.has(suo.toLowerCase())) return note
  if (note.includes(suo)) return note
  return note ? `${suo}
${note}` : suo
}

export function normalizzaPiano (grezzo: unknown, corsoId: string | null = null): PianoLezione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const suo = typeof dati.corsoId === 'string' && dati.corsoId ? dati.corsoId : null
  return {
    id: testo(dati.id) || nuovoIdPiano(),
    corsoId: suo ?? corsoId,
    obiettivi: elenco(dati.obiettivi).map((o) => testo(o)).filter(Boolean),
    prerequisiti: testo(dati.prerequisiti),
    // La valutazione dei piani vecchi si posa sulla tappa che la faceva.
    attivita: valutazioneSullaScaletta(
      elenco(dati.attivita).map(normalizzaAttivita),
      normalizzaValutazionePrevista(dati.valutazione),
    ),
    risorse: elenco(dati.risorse).map(normalizzaRisorsa),
    // Il titolo dei piani vecchi finisce in cima alle note.
    note: unisciVecchioTitolo(testo(dati.titolo), testo(dati.note)),
    tag: elenco(dati.tag).map((t) => testo(t)).filter(Boolean),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

function normalizzaVoto (grezzo: unknown): Voto {
  const dati = oggetto(grezzo)
  // Un valore che non è un numero («4,5» a mano) resta vuoto invece di valere zero.
  const letto = typeof dati.valore === 'number' ? dati.valore : Number(dati.valore)
  const valore =
    dati.valore === null || dati.valore === undefined || !Number.isFinite(letto) ? null : letto
  return {
    allievoId: testo(dati.allievoId),
    valore,
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
    allievoId: typeof dati.allievoId === 'string' && dati.allievoId ? dati.allievoId : null,
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
    lezioneId: typeof dati.lezioneId === 'string' ? dati.lezioneId : null,
    pianoId: typeof dati.pianoId === 'string' && dati.pianoId ? dati.pianoId : null,
    attivitaId: typeof dati.attivitaId === 'string' && dati.attivitaId ? dati.attivitaId : null,
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

/**
 * La durata dell'UD scritta nel file, o quella di fabbrica. Fuori dagli
 * estremi torna dentro invece di sparire.
 */
function minutiUdLetti (grezzo: unknown): number {
  return interoFra(grezzo, LIMITI_UD.predefinita, LIMITI_UD)
}

export function normalizzaImpostazioni (grezzo: unknown): Impostazioni {
  const dati = oggetto(grezzo)
  const calendario = normalizzaCalendario(dati.calendario)
  const minutiUd = minutiUdLetti(dati.minutiUd)
  const pause = normalizzaPause(dati.pause, minutiUd)
  const giorni = elenco(dati.giorniVisibili)
    .map((g) => numero(g, 0))
    .filter((g) => g >= 1 && g <= 7)
  return {
    scala: normalizzaScala(dati.scala),
    oraInizioGiornata: unOra(dati.oraInizioGiornata, IMPOSTAZIONI_PREDEFINITE.oraInizioGiornata),
    oraFineGiornata: unOra(dati.oraFineGiornata, IMPOSTAZIONI_PREDEFINITE.oraFineGiornata),
    giorniVisibili: giorni.length > 0 ? giorni : [...IMPOSTAZIONI_PREDEFINITE.giorniVisibili],
    // Zero vuol dire «non arrotondare»; oltre il massimo della scala
    // schiaccerebbe ogni nota su un valore solo.
    passoFineSemestre: Math.min(10, Math.max(0, numero(dati.passoFineSemestre, 0.5))),
    // In percento, fra 0 e 100.
    sogliaAssenza: Math.min(100, Math.max(0, numero(dati.sogliaAssenza, 20))),
    minutiUd,
    durataSlotPredefinita: minutiInUd(numero(dati.durataSlotPredefinita, minutiUd), minutiUd),
    // Gli estremi di una pausa della giornata, minuti interi: fuori, la
    // convalida la rifiuterebbe.
    durataPausaPredefinita: interoFra(dati.durataPausaPredefinita, 15, LIMITI_PAUSE.durata),
    // Assenti e non vuote: senza pause dichiarate la lezione è un blocco solo.
    ...(pause ? { pause } : {}),
    // Un valore sconosciuto torna al predefinito invece di spegnere
    // l'automazione senza dirlo.
    pdfAutomatici: QUANDO_RIFARE_PDF.includes(dati.pdfAutomatici as QuandoRifarePdf)
      ? (dati.pdfAutomatici as QuandoRifarePdf)
      : IMPOSTAZIONI_PREDEFINITE.pdfAutomatici,
    // Solo le liste riconosciute e le voci offribili (vedi `domain/lists.ts`).
    liste: normalizzaListe(dati.liste),
    // Assente e non vuoto: senza calendario non si scrive una sorgente vuota.
    ...(calendario ? { calendario } : {}),
    intestazione: normalizzaIntestazione(dati.intestazione),
  }
}

/** Un intero dentro gli estremi: quel che sta fuori torna dentro, non sparisce. */
function interoFra (
  valore: unknown,
  riserva: number,
  estremi: { minimo: number, massimo: number },
): number {
  return Math.min(estremi.massimo, Math.max(estremi.minimo, Math.round(numero(valore, riserva))))
}

/**
 * Le pause della giornata dal file. Senza una prima pausa con orario non ce
 * n'è nessuna. Durate e distanze tornano negli estremi; cadono le pause oltre
 * il numero ammesso e quelle dopo mezzanotte (con le seguenti).
 */
export function normalizzaPause (grezzo: unknown, minutiUd: number): PauseGiornata | undefined {
  const dati = oggetto(grezzo)
  const prima = oggetto(dati.prima)
  if (!oraValida(prima.inizio)) return undefined
  const { durata, distanza, quante } = LIMITI_PAUSE
  return pauseDentroIlGiorno({
    prima: { inizio: prima.inizio, durataMin: interoFra(prima.durataMin, 15, durata) },
    seguenti: elenco(dati.seguenti)
      .slice(0, quante - 1)
      .map((voce) => {
        const seguente = oggetto(voce)
        return {
          dopoUd: interoFra(seguente.dopoUd, 2, distanza),
          durataMin: interoFra(seguente.durataMin, 15, durata),
        }
      }),
  }, minutiUd)
}

/** Una riga di testo della carta intestata: spazi stretti, e un tetto. */
function rigaIntestazione (valore: unknown): string {
  return typeof valore === 'string' ? valore.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
}

/**
 * Una carta intestata dal file. Il logo passa solo se è un'immagine dentro il
 * documento (un nome che finisce a un lettore di file non deve uscirne);
 * un'altezza fuori misura torna negli estremi.
 */
function normalizzaCarta (grezzo: unknown, riserva: string): CartaIntestata {
  const dati = oggetto(grezzo)
  const logo = typeof dati.logo === 'string' && logoAmmesso(dati.logo) ? dati.logo : undefined
  const alta = numero(dati.altezzaLogo, ALTEZZA_LOGO.predefinita)
  // Solo lettere, cifre, trattini: l'id finisce nel nome del file del logo.
  const id = typeof dati.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(dati.id) ? dati.id : riserva
  return {
    id,
    sede: rigaIntestazione(dati.sede),
    ...(logo ? { logo } : {}),
    altezzaLogo: Math.min(ALTEZZA_LOGO.massimo, Math.max(ALTEZZA_LOGO.minimo, alta)),
    corsi: elenco(dati.corsi).filter((c): c is string => typeof c === 'string'),
  }
}

/**
 * L'intestazione dal file, sempre con almeno una carta: la forma a carta
 * unica (sede e logo senza `carte`) diventa la prima carta. Due carte con lo
 * stesso id si separano, la seconda con un id nuovo. La matrice dei corsi la
 * completa `normalizzaRegistro` con `completaCarte`.
 */
export function normalizzaIntestazione (grezzo: unknown): Intestazione {
  const dati = oggetto(grezzo)
  const grezze = Array.isArray(dati.carte) ? dati.carte : [dati]
  const visti = new Set<string>()
  const carte = grezze.map((carta, i) => {
    const fatta = normalizzaCarta(carta, i === 0 ? 'car-prima' : nuovoIdCarta())
    // Con un id nuovo la carta non si porta il logo: il file è dell'altra.
    if (visti.has(fatta.id)) {
      fatta.id = nuovoIdCarta()
      delete fatta.logo
    }
    visti.add(fatta.id)
    return fatta
  })
  // La firma HTML si tiene com'è (incollata da Outlook), con un tetto di
  // lunghezza.
  const firma = typeof dati.firma === 'string' && dati.firma.trim() !== ''
    ? dati.firma.slice(0, 50_000)
    : undefined
  return {
    carte: carte.length > 0 ? carte : [cartaVuota('car-prima')],
    docente: rigaIntestazione(dati.docente),
    ...(firma ? { firma } : {}),
    ...(dati.vecchiaCartellaVista === true ? { vecchiaCartellaVista: true } : {}),
  }
}

/**
 * Le impostazioni con la matrice delle carte completa: ogni corso del
 * registro su una carta sola (vedi `completaCarte`).
 */
export function conCarteComplete (
  impostazioni: Impostazioni,
  corsi: readonly Corso[],
): Impostazioni {
  return {
    ...impostazioni,
    intestazione: {
      ...impostazioni.intestazione,
      carte: completaCarte(impostazioni.intestazione.carte, corsi.map((corso) => corso.id)),
    },
  }
}

/** Un percorso di logo accettabile: dentro `intestazione/`, PNG o JPEG, senza giri. */
export function logoAmmesso (percorso: string): boolean {
  return /^intestazione\/[^/\\:*?"<>|]+\.(png|jpe?g)$/i.test(percorso) && !percorso.includes('..')
}

/**
 * Il calendario esterno dal file, o niente. Una regola senza testo si butta;
 * una senza `corsoId` vale «non è una lezione», la lettura più prudente.
 */
export function normalizzaCalendario (grezzo: unknown): CalendarioEsterno | undefined {
  if (grezzo === undefined || grezzo === null) return undefined
  const dati = oggetto(grezzo)
  const regole: RegolaCalendario[] = []
  for (const voce of elenco(dati.regole)) {
    const regola = oggetto(voce)
    const scritto = testo(regola.testo).trim()
    // Solo il vuoto si butta: una regex di soli simboli dice qualcosa, e una
    // che non compila si tiene per essere corretta.
    if (!scritto) continue
    regole.push({
      id: testo(regola.id) || nuovoIdRegolaCalendario(),
      testo: scritto,
      corsoId: typeof regola.corsoId === 'string' && regola.corsoId ? regola.corsoId : null,
    })
  }
  const calendari: SorgenteCalendario[] = []
  const visti = new Set<string>()
  for (const voce of elenco(dati.calendari)) {
    const calendario = oggetto(voce)
    const origine = testo(calendario.origine).trim()
    // Senza origine o senza copia un calendario è un avanzo.
    if (!origine) continue
    let id = testo(calendario.id)
    if (!id || visti.has(id)) id = nuovoIdCalendarioEsterno()
    visti.add(id)
    const copiatoIl = testo(calendario.copiatoIl)
    calendari.push({
      id,
      nome: testo(calendario.nome).trim() || nomeDaOrigine(origine),
      origine,
      ...(copiatoIl ? { copiatoIl } : {}),
    })
  }
  // La forma vecchia a sorgente unica diventa il primo calendario; la copia
  // si fa alla prima lettura.
  const vecchia = testo(dati.sorgente).trim()
  if (vecchia && !calendari.some((c) => c.origine === vecchia)) {
    calendari.unshift({
      id: nuovoIdCalendarioEsterno(),
      nome: nomeDaOrigine(vecchia),
      origine: vecchia,
    })
  }
  if (calendari.length === 0 && regole.length === 0) return undefined
  return { calendari, regole }
}

/**
 * Il nome di un calendario senza nome: il nome del file, o solo l'host
 * dell'indirizzo (il resto porta spesso il gettone d'accesso).
 */
export function nomeDaOrigine (origine: string): string {
  const pulita = origine.trim()
  const indirizzo = /^(?:https?|webcals?):\/\/([^/?#]+)/i.exec(pulita)
  if (indirizzo) return indirizzo[1]
  const file = pulita.split(/[\\/]/).pop() ?? ''
  return file.replace(/\.ics$/i, '') || Uno(lessico().calendario)
}

/**
 * Un registro completo da quel che c'è su disco, di qualunque versione. Non
 * lancia mai: al peggio un registro vuoto. `Archivio` si accorge delle
 * migrazioni e riscrive i file una volta.
 */
export function normalizzaRegistro (grezzo: unknown): Registro {
  const dati = oggetto(grezzo)
  // Prima la durata dell'UD: orari e fasce si leggono in UD di quella lunghezza.
  const minutiUd = minutiUdLetti(oggetto(dati.impostazioni).minutiUd)
  const anni = elenco(dati.anni).map(normalizzaAnno)
  const annoCorrenteId = testo(dati.annoCorrenteId)
  const classiGrezze = elenco(dati.classi)

  // La migrazione riceve dati e fabbriche invece di importare questo file (che
  // la importa).
  const migrazione = new Migrazione(
    elenco(dati.materie).map(normalizzaMateria),
    classiGrezze.map((grezza) => {
      const classe = oggetto(grezza)
      return {
        id: testo(classe.id),
        materiaId: typeof classe.materiaId === 'string' ? classe.materiaId : '',
        materia: testo(classe.materia),
      }
    }),
    { materia: normalizzaMateria, corso: (corso) => normalizzaCorso(corso, minutiUd) },
  )
  const classi = classiGrezze.map((grezza, indice) => normalizzaClasse(grezza, indice))

  // Prima i corsi scritti (v2), poi i programmi (v1), poi le coppie implicite
  // nelle classi: chi arriva prima tiene il suo id e i suoi piani.
  for (const grezzo of elenco(dati.corsi)) migrazione.accogli(normalizzaCorso(grezzo, minutiUd))
  for (const grezzo of elenco(dati.programmi)) {
    migrazione.accogli(normalizzaCorso(grezzo, minutiUd), testo(oggetto(grezzo).id))
  }
  for (const classe of classi) {
    if (migrazione.corsi.some((c) => c.classeId === classe.id)) continue
    const grezza = oggetto(classiGrezze.find((c) => testo(oggetto(c).id) === classe.id))
    const suaMateria = typeof grezza.materiaId === 'string' && grezza.materiaId
    if (suaMateria || testo(grezza.materia).trim()) migrazione.corsoDiClasse(classe.id)
  }

  // Le lezioni: le nuove hanno il corso, le vecchie lo trovano dalla coppia
  // classe+materia. Un `corsoId` che è l'id di una classe si riaggancia. Tutte
  // passano da `conCorsoVero`, che le sposta dal doppione scartato.
  const lezioni = elenco(dati.lezioni).map((grezza) => {
    const dato = oggetto(migrazione.conCorsoVero(grezza))
    const suo = testo(dato.corsoId)
    if (suo && migrazione.conosce(suo)) return normalizzaLezione(dato, minutiUd, suo)
    if (suo && migrazione.eUnaClasse(suo)) {
      return normalizzaLezione(dato, minutiUd, migrazione.corsoDiClasse(suo).id)
    }
    if (suo) return normalizzaLezione(dato, minutiUd, suo)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaLezione(dato, minutiUd)
    const materiaId = typeof dato.materiaId === 'string' ? dato.materiaId : null
    return normalizzaLezione(dato, minutiUd, migrazione.corsoDiClasse(classeId, materiaId).id)
  })

  // I piani si legano alla materia (dal programma o dalla classe), non più ad
  // anno e classe.
  const piani = elenco(dati.piani).map((grezzo) => {
    const dato = oggetto(migrazione.conCorsoVero(grezzo))
    if (typeof dato.corsoId === 'string' && dato.corsoId) return normalizzaPiano(dato)
    // I piani legati alla materia vanno sul primo corso che la porta.
    if (typeof dato.materiaId === 'string' && dato.materiaId) {
      const suo = migrazione.corsi.find((c) => c.materiaId === dato.materiaId)
      return normalizzaPiano(dato, suo?.id ?? null)
    }
    const dalProgramma = migrazione.corsoDelProgramma(testo(dato.programmaId))
    if (dalProgramma) return normalizzaPiano(dato, dalProgramma.id)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaPiano(dato)
    return normalizzaPiano(dato, migrazione.corsoDiClasse(classeId).id)
  })

  // Le valutazioni: il corso dalla lezione, o dalla classe. Il semestre
  // salvato si butta: lo dice la data.
  const lezionePerId = new Map(lezioni.map((l) => [l.id, l]))
  const valutazioni = elenco(dati.valutazioni).map((grezzo) => {
    const dato = oggetto(migrazione.conCorsoVero(grezzo))
    const suo = testo(dato.corsoId)
    if (suo && migrazione.conosce(suo)) return normalizzaValutazione(dato, suo)
    if (suo && migrazione.eUnaClasse(suo)) {
      return normalizzaValutazione(dato, migrazione.corsoDiClasse(suo).id)
    }
    if (suo) return normalizzaValutazione(dato, suo)
    const lezione = lezionePerId.get(testo(dato.lezioneId))
    if (lezione?.corsoId) return normalizzaValutazione(dato, lezione.corsoId)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaValutazione(dato)
    return normalizzaValutazione(dato, migrazione.corsoDiClasse(classeId).id)
  })

  // I fascicoli: quelli scritti, più quelli che stavano dentro le classi.
  const fascicoli = elenco(dati.fascicoli).map(normalizzaFascicolo)
  const gia = new Set(fascicoli.map((f) => f.classeId))
  for (const grezza of classiGrezze) {
    const classe = oggetto(grezza)
    const classeId = testo(classe.id)
    if (!classeId || gia.has(classeId)) continue
    const roba =
      elenco(classe.recapiti).length +
      elenco(classe.documenti).length +
      elenco(classe.comunicazioni).length
    if (roba === 0) continue
    fascicoli.push(
      normalizzaFascicolo({
        classeId,
        recapiti: classe.recapiti,
        documenti: classe.documenti,
        comunicazioni: classe.comunicazioni,
      }),
    )
    gia.add(classeId)
  }

  migrazione.intitola(classi)

  // Prima del return: svuota dai fascicoli i documenti che ha convertito.
  const dallaRaccolta = documentiDiventatiConsegne(fascicoli, migrazione.corsi)

  return {
    versione: VERSIONE_DATI,
    anni,
    annoCorrenteId: anni.some((a) => a.id === annoCorrenteId)
      ? annoCorrenteId
      : anni[0]?.id ?? null,
    materie: migrazione.materie,
    classi,
    corsi: migrazione.corsi,
    lezioni,
    piani,
    valutazioni,
    fascicoli,
    consegne: conSpunteDiChiusura(
      [
        ...elenco(dati.consegne).map((g) => normalizzaConsegna(migrazione.conCorsoVero(g))),
        ...compitiDiventatiConsegne(elenco(dati.lezioni), lezioni),
        ...dallaRaccolta,
      ],
      // Chiuse a mano, più i compiti migrati, che nascono chiusi.
      new Set([
        ...elenco(dati.consegne)
          .filter((grezza) => Boolean(oggetto(grezza).chiusa))
          .map((grezza) => testo(oggetto(grezza).id)),
        ...compitiDiventatiConsegne(elenco(dati.lezioni), lezioni).map((c) => c.id),
      ]),
      classi,
      migrazione.corsi,
    ),
    check: unCheckPerCorso(
      elenco(dati.check).map((g) => normalizzaCheck(migrazione.conCorsoVero(g))),
    ),
    smistamenti: elenco(dati.smistamenti).map(normalizzaSmistamento),
    coordinate: coordinateDellAnno(dati, classiGrezze),
    impostazioni: conCarteComplete(normalizzaImpostazioni(dati.impostazioni), migrazione.corsi),
  }
}

/**
 * La chiusura dell'intera consegna (forma vecchia) diventa una spunta per
 * ciascuno, col giorno della chiusura: buttarla riaprirebbe tutto. Non tocca
 * chi ha già la sua spunta, con la data vera.
 */
function conSpunteDiChiusura (
  consegne: Consegna[],
  chiuse: Set<string>,
  classi: Classe[],
  corsi: Corso[],
): Consegna[] {
  if (chiuse.size === 0) return consegne
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, classi.find((c) => c.id === corso.classeId) ?? null]),
  )

  return consegne.map((consegna) => {
    if (!chiuse.has(consegna.id)) return consegna
    const classe = classePerCorso.get(consegna.corsoId) ?? null
    const attivi = new Set((classe ? allieviAttivi(classe) : []).map((a) => a.id))
    const destinatari =
      consegna.a === 'docente'
        ? [CHI_INSEGNA]
        : consegna.a === 'allievi'
          ? consegna.allieviIds.filter((id) => attivi.has(id))
          : [...attivi]

    const gia = new Set(consegna.fatte.map((f) => f.chi))
    return {
      ...consegna,
      fatte: [
        ...consegna.fatte,
        ...destinatari
          .filter((chi) => !gia.has(chi))
          .map((chi) => ({ chi, fattaIl: consegna.aggiornataIl })),
      ],
    }
  })
}

// ------------------------------------------------------------------ consegne

const TIPI_CONSEGNA = [
  'compito',
  'studio',
  'materiale',
  'consegna',
  'preparazione',
  'amministrativo',
  'altro',
] as const

const DESTINATARI_CONSEGNA = ['classe', 'docente', 'allievi'] as const

const VERSI_DOCUMENTO = ['ricevo', 'consegno'] as const

const MODI_CONSEGNA = ['mano', 'email'] as const

function normalizzaSpunta (grezzo: unknown): SpuntaConsegna {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    chi: testo(dati.chi),
    fattaIl: testo(dati.fattaIl, istanteAdesso()),
    nota: testo(dati.nota),
    file: file || undefined,
    nome: file ? testo(dati.nome) || nomeDelFile(file) : undefined,
    modo: dati.modo === undefined || dati.modo === null
      ? undefined
      : unaVoce(dati.modo, MODI_CONSEGNA, 'mano'),
    destinatari: elenco(dati.destinatari).map((x) => testo(x)).filter(Boolean),
  }
}

export function normalizzaConsegna (grezzo: unknown): Consegna {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const a = unaVoce(dati.a, DESTINATARI_CONSEGNA, 'classe')
  const fatte = elenco(dati.fatte).map(normalizzaSpunta).filter((s) => s.chi)

  // I file dentro le spunte (forma vecchia) diventano documenti della
  // consegna, senza doppioni.
  const documenti = elenco((dati.documenti ?? dati.daConsegnare))
    .map((voce) => {
      const dato = oggetto(voce)
      const percorso = percorsoRelativo(dato.file)
      return {
        allievoId: testo(dato.allievoId),
        file: percorso,
        nome: testo(dato.nome) || nomeDelFile(percorso),
        aggiuntoIl: testo(dato.aggiuntoIl, ora),
      }
    })
    .filter((d) => d.allievoId && d.file)
  for (const spunta of fatte) {
    if (!spunta.file) continue
    if (!documenti.some((d) => d.allievoId === spunta.chi)) {
      documenti.push({
        allievoId: spunta.chi,
        file: spunta.file,
        nome: spunta.nome || nomeDelFile(spunta.file),
        aggiuntoIl: spunta.fattaIl,
      })
      spunta.file = undefined
      spunta.nome = undefined
    }
    // Se c'era già un documento per quella persona, il file resta sulla
    // spunta: buttare il percorso lo renderebbe introvabile.
  }

  return {
    id: testo(dati.id) || nuovoIdConsegna(),
    corsoId: testo(dati.corsoId),
    testo: testo(dati.testo),
    tipo: unaVoce(dati.tipo, TIPI_CONSEGNA, 'compito'),
    // Solo se c'è scritto: distingue una consegna che si spunta da una che
    // chiede un foglio.
    documento:
      dati.documento === undefined || dati.documento === null
        ? undefined
        : unaVoce(dati.documento, CATEGORIE_DOCUMENTO, 'altro'),
    verso: dati.documento === undefined || dati.documento === null
      ? undefined
      : unaVoce(dati.verso, VERSI_DOCUMENTO, 'ricevo'),
    modoConsegna: dati.documento === undefined || dati.documento === null
      ? undefined
      : unaVoce(dati.modoConsegna, MODI_CONSEGNA, 'mano'),
    mailAllievo: booleano(dati.mailAllievo, true),
    mailTutore: booleano(dati.mailTutore, true),
    oggettoMail: testo(dati.oggettoMail) || undefined,
    corpoMail: testo(dati.corpoMail) || undefined,
    documenti,
    fileTutti: percorsoRelativo(dati.fileTutti) || undefined,
    nomeTutti: testo(dati.nomeTutti) || undefined,
    firmeRichieste: dati.documento === undefined || dati.documento === null
      ? undefined
      : booleano(dati.firmeRichieste, false),
    fileFirme: percorsoRelativo(dati.fileFirme) || undefined,
    nomeFirme: testo(dati.nomeFirme) || undefined,
    a,
    // I nomi valgono solo per una consegna a persone scelte.
    allieviIds: a === 'allievi' ? elenco(dati.allieviIds).map((x) => testo(x)).filter(Boolean) : [],
    dataLezioneId: typeof dati.dataLezioneId === 'string' ? dati.dataLezioneId : null,
    data: unaData(dati.data, oggi()),
    scadenzaLezioneId: typeof dati.scadenzaLezioneId === 'string' ? dati.scadenzaLezioneId : null,
    scadenza: isoValida(dati.scadenza) ? String(dati.scadenza) : null,
    note: testo(dati.note),
    fatte,
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

// --------------------------------------------------------------------- check

/**
 * Una casella spuntata dal file. Il giorno di riserva, se illeggibile, è quello
 * in cui la spunta è stata scritta.
 */
function normalizzaSpuntaCheck (grezzo: unknown): SpuntaCheck {
  const dati = oggetto(grezzo)
  const fattaIl = testo(dati.fattaIl, istanteAdesso())
  return {
    allievoId: testo(dati.allievoId),
    colonnaId: testo(dati.colonnaId),
    lezioneId: typeof dati.lezioneId === 'string' && dati.lezioneId ? dati.lezioneId : null,
    data: unaData(dati.data, giornoDi(fattaIl) ?? oggi()),
    fattaIl,
  }
}

/**
 * La lista di controllo dal file. Colonne ripulite come al salvataggio; spunte
 * solo con allievo e colonna esistente. Due spunte sulla stessa casella: vale
 * la prima, come dal pannello.
 */
export function normalizzaCheck (grezzo: unknown): Check {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const colonne = colonneRipulite(
    elenco(dati.colonne).map((voce) => {
      const colonna = oggetto(voce)
      return { id: testo(colonna.id), titolo: testo(colonna.titolo) }
    }),
  )
  const esistenti = new Set(colonne.map((c) => c.id))
  const caselle = new Set<string>()
  const spunte: SpuntaCheck[] = []
  for (const spunta of elenco(dati.spunte).map(normalizzaSpuntaCheck)) {
    if (!spunta.allievoId || !esistenti.has(spunta.colonnaId)) continue
    const casella = `${spunta.allievoId} ${spunta.colonnaId}`
    if (caselle.has(casella)) continue
    caselle.add(casella)
    spunte.push(spunta)
  }
  return {
    id: testo(dati.id) || nuovoIdCheck(),
    corsoId: testo(dati.corsoId),
    colonne,
    spunte,
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/**
 * Versa una lista in un'altra senza perdere niente: colonne e spunte che non
 * ha. Colonne riconosciute per id, non per titolo: due «Quaderno» di corsi
 * diversi restano due.
 */
export function fondiCheck (dentro: Check, altro: Check): void {
  const colonne = new Set(dentro.colonne.map((c) => c.id))
  for (const colonna of altro.colonne) {
    if (colonne.has(colonna.id)) continue
    colonne.add(colonna.id)
    dentro.colonne.push({ ...colonna })
  }
  const caselle = new Set(dentro.spunte.map((s) => `${s.allievoId} ${s.colonnaId}`))
  for (const spunta of altro.spunte) {
    const casella = `${spunta.allievoId} ${spunta.colonnaId}`
    if (caselle.has(casella)) continue
    caselle.add(casella)
    dentro.spunte.push({ ...spunta })
  }
  if (altro.aggiornatoIl > dentro.aggiornatoIl) dentro.aggiornatoIl = altro.aggiornatoIl
}

/**
 * Una lista per corso: le doppie (file toccato a mano, due finestre) si
 * fondono nella prima, perché `checkDelCorso` ne vede una sola.
 */
function unCheckPerCorso (elenco: Check[]): Check[] {
  const primi = new Map<string, Check>()
  const esito: Check[] = []
  for (const check of elenco) {
    const primo = check.corsoId ? primi.get(check.corsoId) : undefined
    if (primo) {
      fondiCheck(primo, check)
      continue
    }
    if (check.corsoId) primi.set(check.corsoId, check)
    esito.push(check)
  }
  return esito
}

// --------------------------------------------------------------- smistamenti

const MOTIVI_QUARANTENA = [
  // Anche `'a-mano'`, che `sorting.ts` produce per passo fisso e divisione a
  // mano: se no `unaVoce` lo degraderebbe a `'senza-nome'`.
  'a-mano',
  'senza-nome',
  'senza-testo',
  'ambiguo',
  'gia-consegnato',
  'fuori-elenco',
  'senza-consegna',
  'da-confermare',
] as const

const LETTURE = ['testo', 'ocr', 'niente'] as const

/**
 * Come il PDF è stato diviso, riletto dal disco: va conservato, se no al
 * riavvio si tornerebbe a `nomi`.
 */
function divisioneSana (valore: unknown): Divisione | undefined {
  if (!valore || typeof valore !== 'object') return undefined
  const modo = (valore as { modo?: unknown }).modo
  if (modo === 'nomi' || modo === 'mano') return { modo }
  if (modo === 'passo') {
    const pagine = Math.max(1, Math.round(numero((valore as { pagine?: unknown }).pagine, 1)))
    return { modo: 'passo', pagine }
  }
  return undefined
}

/**
 * Un blocco in quarantena, con le pagine in ordine e nel verso giusto: un
 * intervallo rovesciato sarebbe un taglio vuoto.
 */
function normalizzaBlocco (grezzo: unknown): BloccoDaSmistare {
  const dati = oggetto(grezzo)
  const da = Math.max(1, Math.round(numero(dati.da, 1)))
  const a = Math.max(da, Math.round(numero(dati.a, da)))
  return {
    id: testo(dati.id) || nuovoIdBlocco(),
    da,
    a,
    allievoId: typeof dati.allievoId === 'string' && dati.allievoId ? dati.allievoId : null,
    motivo: unaVoce(dati.motivo, MOTIVI_QUARANTENA, 'senza-nome'),
    estratto: testo(dati.estratto),
    fiducia: Math.min(1, Math.max(0, numero(dati.fiducia, 0))),
    lettura: unaVoce(dati.lettura, LETTURE, 'testo'),
    anteprima: percorsoRelativo(dati.anteprima) || undefined,
  }
}

/**
 * Il riquadro del nome letto, ristretto dentro il foglio (sono frazioni); se
 * non resta niente, nessun riquadro.
 */
function riquadroPagina (grezzo: unknown): RiquadroPagina | undefined {
  if (!grezzo || typeof grezzo !== 'object') return undefined
  const dato = oggetto(grezzo)
  const dentro = (valore: unknown) => Math.min(1, Math.max(0, numero(valore, 0)))
  const x = dentro(dato.x)
  const y = dentro(dato.y)
  const larghezza = Math.min(1 - x, dentro(dato.larghezza))
  const altezza = Math.min(1 - y, dentro(dato.altezza))
  if (larghezza <= 0 || altezza <= 0) return undefined
  return { x, y, larghezza, altezza }
}

/**
 * La casella di assenze in cui sono finite delle pagine. Senza periodo o
 * classe è `undefined`, e la fetta vale come archiviata in una consegna.
 */
function destinazioneAssenze (
  grezzo: unknown,
): { classeId: string, bloccoId: string, tipo: TipoRapporto, firmato: boolean } | undefined {
  if (!grezzo || typeof grezzo !== 'object') return undefined
  const dato = oggetto(grezzo)
  const classeId = testo(dato.classeId)
  const bloccoId = testo(dato.bloccoId)
  if (!classeId || !bloccoId) return undefined
  return {
    classeId,
    bloccoId,
    tipo: unaVoce(dato.tipo, TIPI_RAPPORTO, 'assenze'),
    firmato: dato.firmato === true,
  }
}

function normalizzaSmistamento (grezzo: unknown): Smistamento {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdSmistamento(),
    consegnaId: typeof dati.consegnaId === 'string' && dati.consegnaId ? dati.consegnaId : null,
    classeId: typeof dati.classeId === 'string' && dati.classeId ? dati.classeId : null,
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    pagine: Math.max(0, Math.round(numero(dati.pagine, 0))),
    assegnate: elenco(dati.assegnate).map((voce) => {
      const dato = oggetto(voce)
      const da = Math.max(1, Math.round(numero(dato.da, 1)))
      return {
        allievoId: testo(dato.allievoId),
        consegnaId: testo(dato.consegnaId) || undefined,
        // Il foglio firme riguarda tutta la colonna: l'allievo resta vuoto.
        firme: dato.firme === true ? (true as const) : undefined,
        assenze: destinazioneAssenze(dato.assenze),
        da,
        a: Math.max(da, Math.round(numero(dato.a, da))),
      }
    }).filter((v) => v.allievoId || v.firme),
    letture: elenco(dati.letture)
      .map((voce) => {
        const dato = oggetto(voce)
        return {
          numero: Math.max(1, Math.round(numero(dato.numero, 1))),
          testo: testo(dato.testo),
          lettura: unaVoce(dato.lettura, LETTURE, 'niente'),
          anteprima: percorsoRelativo(dato.anteprima) || undefined,
          riquadroNome: riquadroPagina(dato.riquadroNome),
        }
      })
      .sort((x, y) => x.numero - y.numero),
    blocchi: elenco(dati.blocchi).map(normalizzaBlocco),
    divisione: divisioneSana(dati.divisione),
    errore: testo(dati.errore) || undefined,
    arrivatoIl: testo(dati.arrivatoIl, istanteAdesso()),
  }
}

/**
 * I vecchi «compiti assegnati» della lezione diventano consegne alla classe.
 * Nascono già spuntate per tutti, se no a gennaio ci sarebbero centinaia di
 * falsi arretrati; il testo resta leggibile dov'era.
 */
function compitiDiventatiConsegne (grezze: unknown[], lezioni: Lezione[]): Consegna[] {
  const esito: Consegna[] = []

  for (const [indice, grezza] of grezze.entries()) {
    const compiti = testo(oggetto(grezza).compiti)
    const lezione = lezioni[indice]
    if (!compiti || !lezione?.corsoId) continue

    esito.push({
      id: `cns-da-${lezione.id}`,
      corsoId: lezione.corsoId,
      testo: compiti,
      tipo: 'compito',
      a: 'classe',
      allieviIds: [],
      dataLezioneId: lezione.id,
      data: lezione.data,
      scadenzaLezioneId: null,
      scadenza: null,
      note: '',
      // Le spunte le mette `conSpunteDiChiusura`, che conosce la classe.
      fatte: [],
      creataIl: lezione.creataIl,
      aggiornataIl: lezione.aggiornataIl,
    })
  }

  return esito
}

/**
 * I documenti del fascicolo (forma vecchia) diventano consegne: una per
 * titolo, con i file raccolti come spunte. Serve un corso della classe; se non
 * c'è, restano nel fascicolo e si riprova alla prossima apertura.
 */
function documentiDiventatiConsegne (fascicoli: Fascicolo[], corsi: Corso[]): Consegna[] {
  const esito: Consegna[] = []
  const primoCorso = new Map<string, Corso>()
  for (const corso of corsi) {
    if (!primoCorso.has(corso.classeId)) primoCorso.set(corso.classeId, corso)
  }

  for (const fascicolo of fascicoli) {
    if (fascicolo.documenti.length === 0) continue
    const corso = primoCorso.get(fascicolo.classeId)
    if (!corso) continue

    // Stessa regola con cui li si leggeva a matrice: il titolo è il documento.
    const gruppi = new Map<string, Documento[]>()
    for (const documento of fascicolo.documenti) {
      const chiave =
        documento.allievoId === null
          ? `solo:${documento.id}` // testo-fisso: una chiave di raggruppamento
          : documento.titolo.trim().toLowerCase().replace(/\s+/g, ' ')
      const gia = gruppi.get(chiave)
      if (gia) gia.push(documento)
      else gruppi.set(chiave, [documento])
    }

    for (const documenti of gruppi.values()) {
      const capo = documenti[0]
      const diClasse = capo.allievoId === null
      // Passa da `normalizzaConsegna`: i file vanno fra i `documenti`, la forma
      // che leggono le comunicazioni, già in questa sessione.
      const conFile = documenti.filter((d) => d.file)
      esito.push(
        normalizzaConsegna({
          // Un documento di classe tiene il suo id: le comunicazioni lo citano.
          id: diClasse ? capo.id : `cns-da-${capo.id}`, // testo-fisso: un identificatore
          corsoId: corso.id,
          testo: capo.titolo,
          tipo: 'consegna',
          documento: capo.categoria,
          a: diClasse ? 'docente' : 'allievi',
          allieviIds: diClasse
            ? []
            : documenti.map((d) => d.allievoId).filter((id): id is string => id !== null),
          // Il giorno sull'orologio locale: i primi dieci caratteri di un
          // istante sono il giorno UTC.
          data: giornoDi(capo.aggiuntoIl) ?? capo.aggiuntoIl.slice(0, 10),
          scadenza: capo.scadenza ?? null,
          note: capo.note ?? '',
          documenti: conFile.map((d) => ({
            allievoId: d.allievoId ?? CHI_INSEGNA,
            file: d.file,
            nome: d.nome,
            aggiuntoIl: d.aggiuntoIl,
          })),
          fatte: conFile.map((d) => ({ chi: d.allievoId ?? CHI_INSEGNA, fattaIl: d.aggiuntoIl })),
          creataIl: capo.aggiuntoIl,
          aggiornataIl: capo.aggiuntoIl,
        }),
      )
    }

    fascicolo.documenti = []
  }

  return esito
}
