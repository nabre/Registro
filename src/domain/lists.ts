// Le liste di sistema: che cosa c'è dentro i menu a tendina.
//
// Gli elenchi sono dati: le voci predefinite stanno qui (un registro nuovo ha
// già le tendine piene), e da Impostazioni si riordinano, rinominano e, dove
// ha senso, si allungano.
//
// Una lista è *aperta* quando il valore è testo libero (una voce in più non
// tocca niente); *chiusa* quando il valore ha un significato per il programma
// (il tipo di attività decide campi, tinta e conti): lì si cambiano solo parola,
// ordine e colore. Una lista può dichiarare `attributi: ['colore']`.
//
// Una voce tolta non si perde: le tappe che l'avevano la conservano, e la
// tendina la ripresenta in coda finché non se ne sceglie un'altra.

import { lessico } from './lexicon.testi.js'
import { testi } from './lists.testi.js'
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
  'tipoSettimana',
] as const

export type ChiaveLista = typeof CHIAVI_LISTA[number]

/**
 * Quel che una voce può portare oltre a valore e parola, dichiarato per lista:
 * la pagina delle impostazioni ne ricava le colonne.
 */
type AttributoVoce = 'colore'

interface DefinizioneLista {
  chiave: ChiaveLista
  /** Come si chiama la lista in Impostazioni. */
  etichetta: string
  /** Dove si vede, detto in una riga: è quel che fa trovare la lista giusta. */
  descrizione: string
  /**
   * Se si possono aggiungere e togliere voci: aperta (testo libero) o chiusa
   * (valore legato al codice, si cambiano solo parola e ordine).
   */
  aperta: boolean
  /** Le voci con cui un registro nuovo comincia. */
  predefinite: readonly VoceLista[]
  /** Quel che ogni voce porta oltre alla parola: assente, niente. */
  attributi?: readonly AttributoVoce[]
}

/** Le voci di una lista ricavate da un elenco del lessico, nel suo ordine. */
function da (nomi: Readonly<Record<string, string>>, ordine?: readonly string[]): VoceLista[] {
  const chiavi = ordine ?? Object.keys(nomi)
  return chiavi.map((valore) => ({ valore, testo: nomi[valore] ?? valore }))
}

/**
 * L'ordine in cui i tipi di attività si offrono: prima i più scelti, non
 * l'ordine del lessico.
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

/**
 * Il colore di fabbrica di ogni tipo di attività: il filetto della tappa in
 * scaletta, nel registro dell'ora e sullo schermo in aula. Uguale fra chiaro e
 * scuro perché è un codice; regge in tutti e due perché non fa mai da fondo a
 * un testo lungo. Sta qui perché si cambia da Impostazioni.
 */
const COLORI_TIPI_ATTIVITA: Readonly<Record<string, string>> = {
  introduzione: '#6366f1',
  spiegazione: '#3b82f6',
  esercizio: '#10b981',
  laboratorio: '#06b6d4',
  discussione: '#f59e0b',
  gruppo: '#8b5cf6',
  verifica: '#ef4444',
  // Fucsia: al buio un verde lime coinciderebbe con l'accento.
  ripasso: '#d946ef',
  compito: '#ec4899',
  'docenza-di-classe': '#0ea5e9',
  altro: '#94a3b8',
}

/**
 * Il colore di quel che non ha colore (valore sconosciuto, lista senza colori):
 * il grigio di «altro».
 */
export const COLORE_DI_RIPIEGO = '#94a3b8'

/**
 * Se un valore è un colore `#rrggbb` così com'è, senza trim e senza badare a
 * maiuscole: una regola sola per voci, corsi, classi, materie. Il ripiego lo
 * decide chi chiede.
 */
export function coloreValido (valore: unknown): valore is string {
  return typeof valore === 'string' && /^#[0-9a-fA-F]{6}$/.test(valore)
}

/** Il colore scritto, se è un `#rrggbb`; minuscolo, come lo rende `<input type="color">`. */
function coloreLetto (grezzo: unknown): string | undefined {
  const pulito = typeof grezzo === 'string' ? grezzo.trim() : grezzo
  return coloreValido(pulito) ? pulito.toLowerCase() : undefined
}

/** Le liste con le parole nella lingua attuale, chieste ogni volta (la lingua si sceglie dopo il caricamento). */
function liste (): readonly DefinizioneLista[] {
  const t = testi()
  const L = lessico()
  return [
    {
      chiave: 'tipoAttivita',
      ...t.liste.tipoAttivita,
      // Chiusa: il tipo decide i campi della tappa e se l'ora conta come
      // docenza di classe. La tinta invece si sceglie come la parola.
      aperta: false,
      predefinite: da(L.tipiAttivita, ORDINE_TIPI_ATTIVITA).map((voce) => ({
        ...voce,
        colore: COLORI_TIPI_ATTIVITA[voce.valore] ?? COLORE_DI_RIPIEGO,
      })),
      attributi: ['colore'],
    },
    {
      chiave: 'tipoValutazione',
      ...t.liste.tipoValutazione,
      // Chiusa: il tipo di prova passa dal piano al momento e finisce nei rapporti.
      aperta: false,
      predefinite: da(L.tipiValutazione),
    },
    {
      chiave: 'raggruppamento',
      ...t.liste.raggruppamento,
      aperta: false,
      predefinite: da(L.raggruppamenti),
    },
    {
      chiave: 'supporto',
      ...t.liste.supporto,
      aperta: true,
      predefinite: [
        { valore: 'lavagna', testo: t.supporto.lavagna },
        { valore: 'proiezione', testo: t.supporto.proiezione },
        { valore: 'libro', testo: t.supporto.libro },
        { valore: 'dispensa', testo: t.supporto.dispensa },
      ],
    },
    {
      chiave: 'correzione',
      ...t.liste.correzione,
      aperta: true,
      predefinite: [
        { valore: 'in-classe', testo: t.correzione.inClasse },
        { valore: 'a-casa', testo: t.correzione.aCasa },
        { valore: 'ritirata', testo: t.correzione.ritirata },
      ],
    },
    {
      chiave: 'composizioneGruppi',
      ...t.liste.composizioneGruppi,
      aperta: true,
      predefinite: [
        { valore: 'liberi', testo: t.composizioneGruppi.liberi },
        { valore: 'sorteggio', testo: t.composizioneGruppi.sorteggio },
        { valore: 'assegnati', testo: t.composizioneGruppi.assegnati },
      ],
    },
    {
      chiave: 'aspettoOsservato',
      ...t.liste.aspettoOsservato,
      // Aperta: che cosa si osserva dipende da che cosa si fa in classe. Il
      // valore è solo la chiave di una colonna.
      aperta: true,
      predefinite: [
        { valore: 'partecipazione', testo: t.aspettoOsservato.partecipazione },
        { valore: 'collaborazione', testo: t.aspettoOsservato.collaborazione },
        { valore: 'rispetto', testo: t.aspettoOsservato.rispetto },
        { valore: 'impegno', testo: t.aspettoOsservato.impegno },
        { valore: 'autonomia', testo: t.aspettoOsservato.autonomia },
      ],
    },
    {
      chiave: 'temaDocenza',
      ...t.liste.temaDocenza,
      aperta: true,
      predefinite: [
        { valore: 'comunicazioni', testo: t.temaDocenza.comunicazioni },
        { valore: 'documenti', testo: t.temaDocenza.documenti },
        { valore: 'colloqui', testo: t.temaDocenza.colloqui },
        { valore: 'organizzazione', testo: t.temaDocenza.organizzazione },
        { valore: 'disciplina', testo: t.temaDocenza.disciplina },
      ],
    },
    {
      chiave: 'tipoSettimana',
      ...t.liste.tipoSettimana,
      // Aperta: c'è chi ha tre turni o chiama le settimane per nome. Rinominare
      // la voce non cambia le settimane già marcate.
      aperta: true,
      predefinite: [
        { valore: 'A', testo: 'A' },
        { valore: 'B', testo: 'B' },
      ],
    },
  ]
}

export function definizioneLista (chiave: ChiaveLista): DefinizioneLista {
  const lista = liste().find((candidata) => candidata.chiave === chiave)
  // testo-fisso: un errore di programmazione, per chi sviluppa
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
    (voce, i) =>
      voce.valore !== predefinite[i].valore ||
      voce.testo !== predefinite[i].testo ||
      // Un colore assente è quello di fabbrica, non una modifica.
      (voce.colore !== undefined && voce.colore !== predefinite[i].colore),
  )
}

/** Vero se le voci di questa lista portano un colore. */
export function listaConColore (chiave: ChiaveLista): boolean {
  return definizioneLista(chiave).attributi?.includes('colore') ?? false
}

/** Come si scrive una voce che la lista non ha più: il nome di prima, se c'era. */
function testoNonInLista (chiave: ChiaveLista, valore: string): string {
  const predefinita = definizioneLista(chiave).predefinite.find((voce) => voce.valore === valore)
  return predefinita ? testi().toltaDallElenco(predefinita.testo) : valore
}

/**
 * Le voci da offrire in una tendina che ha già un valore: se il valore non è
 * nella lista (tolto, o da un altro registro) torna in coda, se no il primo
 * salvataggio lo cambierebbe di nascosto.
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
 * Senza impostazioni vale il predefinito del lessico (rapporti, esportazioni).
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
 * Il colore di un valore: quello della voce, o quello di fabbrica della voce
 * omonima (una lista salvata senza colori non spegne le tinte), o il grigio.
 * Arriva a ogni superficie come variabile CSS `--tinta-tappa`, così scaletta,
 * registro e proiezione danno la stessa risposta.
 */
export function coloreDiVoce (
  impostazioni: Impostazioni | null | undefined,
  chiave: ChiaveLista,
  valore: string,
): string {
  const diValore = (voce: VoceLista) => voce.valore === valore
  const scritto = vociDiLista(impostazioni, chiave).find(diValore)?.colore
  const predefinito = definizioneLista(chiave).predefinite.find(diValore)?.colore
  return coloreLetto(scritto) ?? coloreLetto(predefinito) ?? COLORE_DI_RIPIEGO
}

/**
 * Le liste come si possono salvare. Una lista chiusa con valori sconosciuti o
 * una lista vuota tornano alle predefinite, l'unico ripiego che lascia le
 * tendine usabili.
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
      // Il colore resta solo dove la lista lo dichiara e se è un colore valido;
      // altrimenti vale quello di fabbrica.
      const colore = lista.attributi?.includes('colore') ? coloreLetto(voce.colore) : undefined
      visti.add(valore)
      voci.push({ valore, testo: testo || valore, ...(colore ? { colore } : {}) })
    }

    // Vuota vuol dire «nessuno l'ha scritta»: tornano le predefinite.
    if (voci.length === 0) continue
    esito[chiave] = voci
  }

  return esito
}
