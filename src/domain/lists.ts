// Le liste di sistema: che cosa c'è dentro i menu a tendina.
//
// Mezzo registro chiede di scegliere da un elenco chiuso — che tipo di tappa è
// questa, su che supporto si spiega, dove si correggono gli esercizi — e fino a
// ieri quegli elenchi stavano scritti dentro il codice, uno per punto in cui si
// vedevano. Funzionava finché la scuola era una sola: chi insegna in
// laboratorio non ha «Lavagna» e «Proiezione», ha il banco e il tornio, e per
// aggiungerli bisognava ricompilare il programma.
//
// Qui gli elenchi sono dati, non codice, e stanno in un posto solo. Le voci
// predefinite restano scritte in questo file — un registro appena creato ha già
// le sue tendine piene, e nessuno deve riempirle prima di preparare la prima
// ora — ma da Impostazioni si riordinano, si rinominano, e dove ha senso se ne
// aggiungono.
//
// **Aperte e chiuse.** Una lista è *aperta* quando il valore che salva è testo
// libero: il supporto della spiegazione finisce dentro `parametri`, e una voce
// in più non tocca niente. È *chiusa* quando il valore ha un significato per il
// programma: il tipo di attività decide i campi che compaiono, la tinta nella
// striscia del tempo e il conto delle ore di docenza di classe, e un valore
// inventato non troverebbe nulla di tutto questo. Delle liste chiuse si cambia
// la parola che si legge e l'ordine in cui si offrono; le voci sono quelle.
//
// **Quel che si toglie non si perde.** Togliendo una voce da una lista, le
// tappe che l'avevano scelta restano come sono: la tendina se la ritrova in
// coda, dichiarata, finché qualcuno non ne sceglie un'altra. Cancellare una
// riga da Impostazioni non deve cambiare di nascosto un piano preparato l'anno
// scorso.

import { RAGGRUPPAMENTI, TIPI_ATTIVITA, TIPI_VALUTAZIONE } from './lexicon.js'
import type { Impostazioni, VoceLista } from './models.js'

export type { VoceLista }

/** Le liste che il registro conosce. Le chiavi sono quelle salvate nel file. */
export const CHIAVI_LISTA = [
  'tipoAttivita',
  'tipoValutazione',
  'raggruppamento',
  'supporto',
  'correzione',
  'composizioneGruppi',
  'temaDocenza',
  'aspettoOsservato',
] as const

export type ChiaveLista = typeof CHIAVI_LISTA[number]

interface DefinizioneLista {
  chiave: ChiaveLista
  /** Come si chiama la lista in Impostazioni. */
  etichetta: string
  /** Dove si vede, detto in una riga: è quel che fa trovare la lista giusta. */
  descrizione: string
  /**
   * Se si possono aggiungere e togliere voci.
   *
   * Aperta vuol dire che il valore è testo libero e non significa niente per il
   * programma; chiusa che il valore è legato al codice — campi, tinte, conti —
   * e allora si cambiano solo la parola e l'ordine.
   */
  aperta: boolean
  /** Le voci con cui un registro nuovo comincia. */
  predefinite: readonly VoceLista[]
}

/** Le voci di una lista ricavate da un elenco del lessico, nel suo ordine. */
function da (nomi: Readonly<Record<string, string>>, ordine?: readonly string[]): VoceLista[] {
  const chiavi = ordine ?? Object.keys(nomi)
  return chiavi.map((valore) => ({ valore, testo: nomi[valore] ?? valore }))
}

/**
 * L'ordine in cui i tipi di attività si offrono: prima quelli che si scelgono
 * più spesso. Il lessico li scrive nell'ordine in cui è comodo rileggerli, che
 * non è quello in cui è comodo sceglierli.
 */
const ORDINE_TIPI_ATTIVITA = [
  'introduzione',
  'spiegazione',
  'esercizio',
  'laboratorio',
  'discussione',
  'gruppo',
  'verifica',
  'ripasso',
  'compito',
  'docenza-di-classe',
  'altro',
]

const LISTE: readonly DefinizioneLista[] = [
  {
    chiave: 'tipoAttivita',
    etichetta: 'Tipi di attività',
    descrizione: 'la tendina «Tipo» di ogni tappa della scaletta di un piano lezione',
    // Il tipo non è un'etichetta: decide quali campi la tappa chiede, di che
    // tinta è nella striscia del tempo, e se quell'ora conta come docenza di
    // classe. Un tipo inventato non troverebbe niente di tutto questo.
    aperta: false,
    predefinite: da(TIPI_ATTIVITA, ORDINE_TIPI_ATTIVITA),
  },
  {
    chiave: 'tipoValutazione',
    etichetta: 'Tipi di prova',
    descrizione: 'la tendina del tipo, nella prova di una tappa e nel momento di valutazione',
    // Il tipo di prova viaggia dal piano al momento vero e finisce nei rapporti:
    // è un valore che il programma legge, non solo una parola che si stampa.
    aperta: false,
    predefinite: da(TIPI_VALUTAZIONE),
  },
  {
    chiave: 'raggruppamento',
    etichetta: 'Come lavora la classe',
    descrizione: 'in plenaria, a coppie, in gruppi: la tendina nel dettaglio di una tappa',
    aperta: false,
    predefinite: da(RAGGRUPPAMENTI),
  },
  {
    chiave: 'supporto',
    etichetta: 'Supporti della spiegazione',
    descrizione: 'con che cosa si spiega: nel dettaglio di una tappa di tipo Spiegazione',
    aperta: true,
    predefinite: [
      { valore: 'lavagna', testo: 'Lavagna' },
      { valore: 'proiezione', testo: 'Proiezione' },
      { valore: 'libro', testo: 'Libro di testo' },
      { valore: 'dispensa', testo: 'Dispensa' },
    ],
  },
  {
    chiave: 'correzione',
    etichetta: 'Dove si corregge un esercizio',
    descrizione: 'nel dettaglio di una tappa di tipo Esercizio',
    aperta: true,
    predefinite: [
      { valore: 'in-classe', testo: 'In classe' },
      { valore: 'a-casa', testo: 'A casa' },
      { valore: 'ritirata', testo: 'Ritirata e corretta da me' },
    ],
  },
  {
    chiave: 'composizioneGruppi',
    etichetta: 'Come si formano i gruppi',
    descrizione: 'nel dettaglio di una tappa di tipo Lavoro di gruppo',
    aperta: true,
    predefinite: [
      { valore: 'liberi', testo: 'A scelta loro' },
      { valore: 'sorteggio', testo: 'A sorteggio' },
      { valore: 'assegnati', testo: 'Assegnati da me' },
    ],
  },
  {
    chiave: 'aspettoOsservato',
    etichetta: 'Aspetti osservati in classe',
    descrizione: 'le colonne della matrice del comportamento, nel registro dell’ora',
    // Aperta, e non poteva essere altrimenti: che cosa si guardi di una classe
    // dipende da che cosa ci si fa dentro. In laboratorio si osserva il
    // rispetto delle procedure, in palestra il fair play, e nessuno dei due
    // sta in un elenco deciso qui. Il valore non significa niente per il
    // programma: è la chiave di una colonna, e basta.
    aperta: true,
    predefinite: [
      { valore: 'partecipazione', testo: 'Partecipazione' },
      { valore: 'collaborazione', testo: 'Collaborazione' },
      { valore: 'rispetto', testo: 'Rispetto delle regole' },
      { valore: 'impegno', testo: 'Impegno' },
      { valore: 'autonomia', testo: 'Autonomia' },
    ],
  },
  {
    chiave: 'temaDocenza',
    etichetta: 'Temi della docenza di classe',
    descrizione: 'di che cosa si tratta nell’ora da docente di classe',
    aperta: true,
    predefinite: [
      { valore: 'comunicazioni', testo: 'Comunicazioni' },
      { valore: 'documenti', testo: 'Documenti da raccogliere' },
      { valore: 'colloqui', testo: 'Colloqui' },
      { valore: 'organizzazione', testo: 'Organizzazione (gite, uscite)' },
      { valore: 'disciplina', testo: 'Andamento e disciplina' },
    ],
  },
]

const PER_CHIAVE = new Map<string, DefinizioneLista>(LISTE.map((lista) => [lista.chiave, lista]))

export function definizioneLista (chiave: ChiaveLista): DefinizioneLista {
  const lista = PER_CHIAVE.get(chiave)
  if (!lista) throw new Error(`Lista di sistema sconosciuta: ${chiave}`)
  return lista
}

/**
 * Le voci di una lista come stanno adesso: quelle scritte nelle impostazioni,
 * o le predefinite se nessuno le ha toccate.
 */
export function vociDiLista (
  impostazioni: Impostazioni | null | undefined,
  chiave: ChiaveLista,
): VoceLista[] {
  const scritte = impostazioni?.liste?.[chiave]
  if (scritte && scritte.length > 0) return scritte.map((voce) => ({ ...voce }))
  return definizioneLista(chiave).predefinite.map((voce) => ({ ...voce }))
}

/** Vero se qualcuno ha cambiato questa lista rispetto a com'è nata. */
export function listaCambiata (
  impostazioni: Impostazioni | null | undefined,
  chiave: ChiaveLista,
): boolean {
  const scritte = impostazioni?.liste?.[chiave]
  if (!scritte || scritte.length === 0) return false
  const predefinite = definizioneLista(chiave).predefinite
  if (scritte.length !== predefinite.length) return true
  return scritte.some(
    (voce, i) => voce.valore !== predefinite[i].valore || voce.testo !== predefinite[i].testo,
  )
}

/** Come si scrive una voce che la lista non ha più: il nome di prima, se c'era. */
function testoNonInLista (chiave: ChiaveLista, valore: string): string {
  const predefinita = definizioneLista(chiave).predefinite.find((voce) => voce.valore === valore)
  return predefinita ? `${predefinita.testo} (tolta dall’elenco)` : valore
}

/**
 * Le voci da offrire in una tendina che ha già un valore scelto.
 *
 * Se quel valore è stato tolto dalla lista — o non c'è mai stato, perché il
 * file arriva da un altro registro — torna in coda invece di sparire: una
 * tendina che non contiene quel che l'oggetto ha dentro lo cambia di nascosto
 * al primo salvataggio, ed è il modo peggiore di far rispettare una lista.
 */
export function vociConValore (
  impostazioni: Impostazioni | null | undefined,
  chiave: ChiaveLista,
  valore: string | null | undefined,
): VoceLista[] {
  const voci = vociDiLista(impostazioni, chiave)
  if (!valore || voci.some((voce) => voce.valore === valore)) return voci
  return [...voci, { valore, testo: testoNonInLista(chiave, valore) }]
}

/**
 * La parola con cui si legge un valore: quella della lista, o il valore com'è.
 *
 * Senza impostazioni vale il predefinito: quel che gira fuori dal registro —
 * rapporti, esportazioni — chiama le cose come le chiama il lessico.
 */
export function testoDiVoce (
  impostazioni: Impostazioni | null | undefined,
  chiave: ChiaveLista,
  valore: string,
): string {
  const voce = vociDiLista(impostazioni, chiave).find((candidata) => candidata.valore === valore)
  if (voce) return voce.testo
  const predefinita = definizioneLista(chiave).predefinite.find((c) => c.valore === valore)
  return predefinita?.testo ?? valore
}

/**
 * Le liste come si possono salvare: si tiene quel che è una lista vera e si
 * butta il resto.
 *
 * Una lista chiusa non può accogliere valori che il programma non conosce — li
 * salverebbe e poi non saprebbe che farsene — e nessuna lista può restare
 * vuota: una tendina senza voci è un campo che non si lascia compilare. In
 * tutti e due i casi si torna alle predefinite, che è l'unico ripiego che
 * lascia il registro utilizzabile.
 */
export function normalizzaListe (grezzo: unknown): Record<string, VoceLista[]> {
  if (!grezzo || typeof grezzo !== 'object' || Array.isArray(grezzo)) return {}
  const dati = grezzo as Record<string, unknown>
  const esito: Record<string, VoceLista[]> = {}

  for (const chiave of CHIAVI_LISTA) {
    const grezze = dati[chiave]
    if (!Array.isArray(grezze)) continue
    const lista = definizioneLista(chiave)
    const ammessi = new Set(lista.predefinite.map((voce) => voce.valore))
    const visti = new Set<string>()
    const voci: VoceLista[] = []

    for (const grezza of grezze) {
      if (!grezza || typeof grezza !== 'object') continue
      const voce = grezza as Record<string, unknown>
      const valore = typeof voce.valore === 'string' ? voce.valore.trim() : ''
      if (!valore || visti.has(valore)) continue
      if (!lista.aperta && !ammessi.has(valore)) continue
      const testo = typeof voce.testo === 'string' ? voce.testo.trim() : ''
      visti.add(valore)
      voci.push({ valore, testo: testo || valore })
    }

    // Vuota vuol dire «nessuno l'ha scritta»: la tendina torna alle predefinite
    // invece di restare senza voci.
    if (voci.length === 0) continue
    esito[chiave] = voci
  }

  return esito
}
