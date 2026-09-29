// Quel che il pannello ricorda fra un'apertura e l'altra, nel file
// `interfaccia/registro.json`. Le preferenze di forma (schede, calendario,
// barre) valgono per tutti i documenti; il posto e le scelte che portano id di
// un anno valgono per il suo `.regi`: riaprire un anno sul corso di un altro
// non ha senso.
//
// È puro (niente DOM, niente `state.ts`, che al caricamento legge il ponte):
// qui si legge, si convalida e si scrive il JSON; il ponte con `getState` e
// `setState` resta a `state.ts`. Vedi `tests/ui/memoria.test.mjs`.

import { isoValida } from '../../core/dominio/dates.js'
import type { Iso } from '../../core/dominio/models.js'
import {
  CAMPI_CONTESTO,
  areaDellaSezione,
  paginaValida,
  schedaValida,
  sezioneDiPrima,
  type Contesto,
  type Posto,
  type SezioneImpostazioni,
  type TipoSoggetto,
} from './posto.js'

const TIPI_SOGGETTO: readonly TipoSoggetto[] = [
  'corso',
  'classe',
  'lezione',
  'allievo',
  'piano',
  'valutazione',
]

// Gli elenchi chiusi delle preferenze di forma stanno qui e `state.ts` li
// importa: la lettura li convalida, lo stato ne ricava i tipi. Un valore che
// non c'è più si scarta e `state.ts` rimette il predefinito.
export const SCHEDE_LEZIONE = ['amministrazione', 'lezione', 'annotazioni'] as const
export const SCHEDE_PERSONA = ['anagrafica', 'docenteClasse', 'materie'] as const
export const SCHEDE_DOCUMENTI = ['corso', 'classe', 'allievi', 'lezioni', 'docente'] as const
export const SCHEDE_MAPPA = ['tutti', 'lavoro', 'domicilio'] as const
export const MODI_CALENDARIO = ['settimana', 'mese', 'anno', 'agenda'] as const

/** Le preferenze di forma: valgono per ogni documento. */
export interface Globali {
  schedaLezione: (typeof SCHEDE_LEZIONE)[number]
  schedaPersona: (typeof SCHEDE_PERSONA)[number]
  schedaDocumenti: (typeof SCHEDE_DOCUMENTI)[number]
  schedaMappa: (typeof SCHEDE_MAPPA)[number]
  modoCalendario: (typeof MODI_CALENDARIO)[number]
  mostraCalendarioEsterno: boolean
  strisciaSettimaneChiusa: boolean
  zoomSfoglio: number
  sidebarDesktop: boolean
  sidebarMobile: boolean
  assistenteAperto: boolean
  /** Grezzo: lo convalida `partiValide` di `assistant/parts.ts`. */
  contestoAssistente: Record<string, unknown>
  azioniNascoste: boolean
  /** La sezione delle impostazioni da cui si riapre la pagina, con la sua area. */
  sezioneImpostazioni: SezioneImpostazioni
  /**
   * Dove si era arrivati a leggere nelle pagine con un indice, per pagina
   * (`guida`, `impostazioni.<area>`): vedi `segnalibro.ts`.
   */
  segnalibri: Record<string, Segnalibro>
}

/** Un punto di lettura: la sezione in cima e di quanto il suo inizio era salito. */
export interface Segnalibro {
  sezione: string
  scarto: number
}

/** Le scelte con id di un anno, fuori dal posto. */
interface PreferenzeDocumento {
  filtroCorsoAgendaId: string | null
  classeMappaId: string | null
  bloccoAssenzeId: string | null
  schedaTodo: string
  classiApertePersone: string[]
  ricerca: string
}

/** I campi di posizione del JSON vecchio, grezzi: li interpreta `postoDaVecchi`. */
export interface CampiVecchi extends Contesto {
  vista?: string
  paginaId?: string
  schedaDocente?: string
  ambitoCheck?: string
  ambitoImpostazioni?: string
  schedaProgramma?: string
  schedaDocumento?: string
}

export interface VoceDocumento extends Partial<PreferenzeDocumento> {
  /** Quando il documento è stato guardato l'ultima volta (ISO completo). */
  usato: string
  /** `null`: da ricavare (vecchi) o pagina predefinita. */
  posto: Posto | null
  contesto: Contesto
  giorno?: Iso
  /** Assente: da allineare al semestre di oggi. `null`: l'anno intero. */
  semestreId?: string | null
  /** Solo nella voce `'*'` migrata senza `postoDaVecchi`. */
  vecchi?: CampiVecchi
}

export interface Memoria {
  v: 2
  globali: Partial<Globali>
  /** Per chiave del documento (`chiaveDocumento`), più `'*'` dopo una migrazione. */
  documenti: Record<string, VoceDocumento>
}

/** La voce senza documento: il JSON vecchio, in attesa del primo `.regi` aperto. */
export const VOCE_SENZA_DOCUMENTO = '*'

export const MASSIMO_DOCUMENTI = 20

/** Il limite di `desktop/apparato/uiState.ts`: oltre, il file non si scrive. */
export const LIMITE_CARATTERI = 256000

const MASSIMO_CLASSI_APERTE = 100
const MASSIMO_ID = 200
const MASSIMO_RICERCA = 200
const MASSIMO_CONTESTO_ASSISTENTE = 2000
const MASSIMO_SEGNALIBRI = 20
/** Oltre, lo scarto non è una pagina del registro: si scarta. */
const MASSIMO_SCARTO = 1_000_000

/** Chi migra il JSON vecchio in un posto; se manca, i campi restano grezzi. */
interface OpzioniLettura {
  postoDaVecchi?: (vecchi: CampiVecchi) => Posto | null
}

/**
 * La chiave di un documento: il percorso con le barre dritte e in minuscolo,
 * perché Windows non distingue maiuscole né barre. Un documento provvisorio
 * non ha memoria: sta in una cartella che non si riaprirà.
 */
export function chiaveDocumento (
  percorso: string | null | undefined,
  provvisorio = false,
): string | null {
  if (provvisorio || typeof percorso !== 'string' || percorso === '') return null
  return percorso.replace(/\\/g, '/').toLowerCase()
}

function oggetto (valore: unknown): Record<string, unknown> | null {
  return valore !== null && typeof valore === 'object' && !Array.isArray(valore)
    ? (valore as Record<string, unknown>)
    : null
}

function ammesso<T extends string> (ammessi: readonly T[], valore: unknown): T | undefined {
  return ammessi.includes(valore as T) ? (valore as T) : undefined
}

function id (valore: unknown): string | null {
  return typeof valore === 'string' && valore !== '' && valore.length <= MASSIMO_ID
    ? valore
    : null
}

function elenco (valore: unknown, massimo: number, lunghezza: number): string[] | undefined {
  if (!Array.isArray(valore)) return undefined
  return valore
    .filter((v): v is string => typeof v === 'string' && v !== '' && v.length <= lunghezza)
    .slice(0, massimo)
}

/** Mette in `destinazione` solo i campi con un valore buono. */
function copiaDefiniti<T extends object> (destinazione: T, campi: Partial<T>): T {
  for (const [nome, valore] of Object.entries(campi))
    if (valore !== undefined) (destinazione as Record<string, unknown>)[nome] = valore
  return destinazione
}

function booleano (valore: unknown): boolean | undefined {
  return typeof valore === 'boolean' ? valore : undefined
}

/** Le globali: stessi nomi nel JSON vecchio e nel nuovo. */
function globaliDa (grezzo: Record<string, unknown>): Partial<Globali> {
  const zoom = grezzo.zoomSfoglio
  const assistente = oggetto(grezzo.contestoAssistente)
  const globali = copiaDefiniti<Partial<Globali>>({}, {
    schedaLezione: ammesso(SCHEDE_LEZIONE, grezzo.schedaLezione),
    schedaPersona: ammesso(SCHEDE_PERSONA, grezzo.schedaPersona),
    schedaDocumenti: ammesso(SCHEDE_DOCUMENTI, grezzo.schedaDocumenti),
    schedaMappa: ammesso(SCHEDE_MAPPA, grezzo.schedaMappa),
    modoCalendario: ammesso(MODI_CALENDARIO, grezzo.modoCalendario),
    mostraCalendarioEsterno: booleano(grezzo.mostraCalendarioEsterno),
    strisciaSettimaneChiusa: booleano(grezzo.strisciaSettimaneChiusa),
    zoomSfoglio:
      typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0 && zoom <= 5000
        ? zoom
        : undefined,
    sidebarDesktop: booleano(grezzo.sidebarDesktop),
    sidebarMobile: booleano(grezzo.sidebarMobile),
    assistenteAperto: booleano(grezzo.assistenteAperto),
    contestoAssistente:
      assistente && JSON.stringify(assistente).length <= MASSIMO_CONTESTO_ASSISTENTE
        ? assistente
        : undefined,
    azioniNascoste: booleano(grezzo.azioniNascoste),
  })
  const sezione = sezioneImpostazioniDa(grezzo)
  if (sezione) globali.sezioneImpostazioni = sezione
  const segnalibri = segnalibriDa(grezzo.segnalibri)
  if (segnalibri) globali.segnalibri = segnalibri
  return globali
}

/** I punti di lettura buoni: chiave e sezione corte, scarto intero e sensato. */
function segnalibriDa (valore: unknown): Record<string, Segnalibro> | undefined {
  const grezzi = oggetto(valore)
  if (!grezzi) return undefined
  const buoni: Record<string, Segnalibro> = {}
  for (const [chiave, voce] of Object.entries(grezzi).slice(0, MASSIMO_SEGNALIBRI)) {
    const segno = oggetto(voce)
    const sezione = id(segno?.sezione)
    const scarto = segno?.scarto
    if (!id(chiave) || !sezione) continue
    if (typeof scarto !== 'number' || !Number.isInteger(scarto) || Math.abs(scarto) > MASSIMO_SCARTO) continue
    buoni[chiave] = { sezione, scarto }
  }
  return buoni
}

/**
 * La sezione delle impostazioni da cui si riapre. Prima delle aree se ne
 * ricordava una per ambito (`ultimaSchedaImpostazioni`), e ancora prima
 * stavano sciolte con l'ambito accanto: vale quella dell'ambito aperto per
 * ultimo, o quella del documento, che era il predefinito.
 */
function sezioneImpostazioniDa (grezzo: Record<string, unknown>): SezioneImpostazioni | undefined {
  const adesso = grezzo.sezioneImpostazioni
  if (typeof adesso === 'string' && areaDellaSezione(adesso)) return adesso as SezioneImpostazioni
  const ultima = oggetto(grezzo.ultimaSchedaImpostazioni)
  if (ultima) {
    return sezioneDiPrima('documento', ultima.documento) ?? sezioneDiPrima('programma', ultima.programma)
  }
  const ambito = grezzo.ambitoImpostazioni === 'programma' ? 'programma' : 'documento'
  return sezioneDiPrima(ambito, ambito === 'programma' ? grezzo.schedaProgramma : grezzo.schedaDocumento)
}

function contestoDa (grezzo: Record<string, unknown> | null): Contesto {
  const contesto = {} as Contesto
  for (const campo of CAMPI_CONTESTO) contesto[campo] = id(grezzo?.[campo])
  return contesto
}

/**
 * Il posto ricordato, se la sua pagina esiste ancora. Pagina e scheda si
 * convalidano qui con le regole di `posto.ts`; che il soggetto ci sia ancora
 * nel documento lo decide `completa`, che ha il registro.
 */
function postoDa (grezzo: unknown): Posto | null {
  const posto = oggetto(grezzo)
  if (!posto || !paginaValida(posto.pagina)) return null
  const letto: Posto = { pagina: posto.pagina }
  const soggetto = oggetto(posto.soggetto)
  const tipo = ammesso(TIPI_SOGGETTO, soggetto?.tipo)
  const idSoggetto = id(soggetto?.id)
  if (tipo && idSoggetto) letto.soggetto = { tipo, id: idSoggetto }
  const scheda = schedaValida(posto.scheda)
  if (scheda) letto.scheda = scheda
  return letto
}

/** Le preferenze del documento e il giorno: stessi nomi, tranne `data` → `giorno`. */
function preferenzeDa (
  grezzo: Record<string, unknown>,
  giorno: unknown,
): Omit<VoceDocumento, 'usato' | 'posto' | 'contesto'> {
  const ricerca = grezzo.ricerca
  const voce = copiaDefiniti<Omit<VoceDocumento, 'usato' | 'posto' | 'contesto'>>({}, {
    giorno: isoValida(giorno) ? giorno : undefined,
    filtroCorsoAgendaId: 'filtroCorsoAgendaId' in grezzo ? id(grezzo.filtroCorsoAgendaId) : undefined,
    classeMappaId: 'classeMappaId' in grezzo ? id(grezzo.classeMappaId) : undefined,
    bloccoAssenzeId: 'bloccoAssenzeId' in grezzo ? id(grezzo.bloccoAssenzeId) : undefined,
    schedaTodo:
      typeof grezzo.schedaTodo === 'string' && grezzo.schedaTodo.length <= MASSIMO_ID
        ? grezzo.schedaTodo
        : undefined,
    classiApertePersone: elenco(grezzo.classiApertePersone, MASSIMO_CLASSI_APERTE, MASSIMO_ID),
    ricerca: typeof ricerca === 'string' ? ricerca.slice(0, MASSIMO_RICERCA) : undefined,
  })
  // Assente e `null` dicono cose diverse: si copia solo una scelta vera.
  const semestre = grezzo.semestreId
  if (semestre === null || (typeof semestre === 'string' && id(semestre)))
    voce.semestreId = semestre
  return voce
}

function voceDa (grezzo: unknown): VoceDocumento | null {
  const voce = oggetto(grezzo)
  if (!voce) return null
  const letta: VoceDocumento = {
    usato: typeof voce.usato === 'string' ? voce.usato : '',
    posto: postoDa(voce.posto),
    contesto: contestoDa(oggetto(voce.contesto)),
    ...preferenzeDa(voce, voce.giorno),
  }
  // Una voce migrata e scritta prima di essere adottata tiene i suoi vecchi.
  const vecchi = oggetto(voce.vecchi)
  if (vecchi) letta.vecchi = vecchiDa(vecchi)
  return letta
}

function vecchiDa (grezzo: Record<string, unknown>): CampiVecchi {
  const vecchi: CampiVecchi = contestoDa(grezzo)
  for (const campo of [
    'vista',
    'paginaId',
    'schedaDocente',
    'ambitoCheck',
    'ambitoImpostazioni',
    'schedaProgramma',
    'schedaDocumento',
  ] as const) {
    const valore = grezzo[campo]
    if (typeof valore === 'string' && valore.length <= MASSIMO_ID) vecchi[campo] = valore
  }
  return vecchi
}

/** Il JSON vecchio: una voce `'*'` per il primo documento che si aprirà. */
function migrata (grezzo: Record<string, unknown>, opzioni: OpzioniLettura): Memoria {
  const vecchi = vecchiDa(grezzo)
  const voce: VoceDocumento = {
    // Il più vecchio di tutti: è la prima voce a cedere il posto.
    usato: new Date(0).toISOString(),
    posto: null,
    contesto: contestoDa(grezzo),
    ...preferenzeDa(grezzo, grezzo.data),
  }
  try {
    voce.posto = opzioni.postoDaVecchi?.(vecchi) ?? null
  } catch {
    voce.posto = null
  }
  if (!opzioni.postoDaVecchi) voce.vecchi = vecchi
  return { v: 2, globali: globaliDa(grezzo), documenti: { [VOCE_SENZA_DOCUMENTO]: voce } }
}

function vuota (): Memoria {
  return { v: 2, globali: {}, documenti: {} }
}

/**
 * La memoria dal ponte, qualunque cosa ci sia: un oggetto, un testo JSON, un
 * file vecchio senza `v`, niente. Quel che non si riconosce si scarta; non
 * lancia mai.
 */
export function leggiMemoria (json: unknown, opzioni: OpzioniLettura = {}): Memoria {
  let grezzo: unknown = json
  if (typeof json === 'string') {
    try {
      grezzo = JSON.parse(json)
    } catch {
      return vuota()
    }
  }
  const radice = oggetto(grezzo)
  if (!radice) return vuota()
  if (radice.v !== 2) return migrata(radice, opzioni)
  const documenti: Record<string, VoceDocumento> = {}
  for (const [chiave, valore] of Object.entries(oggetto(radice.documenti) ?? {})) {
    // `__proto__` da `JSON.parse` è una chiave vera: assegnata, cambierebbe il prototipo.
    const normale = chiave === VOCE_SENZA_DOCUMENTO ? chiave : chiaveDocumento(chiave)
    const voce = voceDa(valore)
    if (normale && normale !== '__proto__' && voce) documenti[normale] = voce
  }
  return potata({
    v: 2,
    globali: globaliDa(oggetto(radice.globali) ?? {}),
    documenti,
  })
}

/**
 * La voce del documento: la sua, altrimenti quella del JSON vecchio, che il
 * documento adotta (e che non resta per il prossimo), altrimenti nessuna.
 */
export function voceDel (
  memoria: Memoria,
  chiave: string | null,
): { memoria: Memoria, voce: VoceDocumento | null } {
  if (chiave === null) return { memoria, voce: null }
  const propria = memoria.documenti[chiave]
  if (propria) return { memoria, voce: propria }
  const { [VOCE_SENZA_DOCUMENTO]: adottata, ...altri } = memoria.documenti
  if (!adottata) return { memoria, voce: null }
  return {
    memoria: { ...memoria, documenti: { ...altri, [chiave]: adottata } },
    voce: adottata,
  }
}

/** Le chiavi dalla meno recente alla più recente. */
function perUso (documenti: Record<string, VoceDocumento>): string[] {
  return Object.keys(documenti).sort((a, b) =>
    documenti[a].usato < documenti[b].usato ? -1 : documenti[a].usato > documenti[b].usato ? 1 : 0)
}

/** Al più `MASSIMO_DOCUMENTI`, via i meno recenti. */
function potata (memoria: Memoria): Memoria {
  const chiavi = perUso(memoria.documenti)
  if (chiavi.length <= MASSIMO_DOCUMENTI) return memoria
  const documenti = { ...memoria.documenti }
  for (const chiave of chiavi.slice(0, chiavi.length - MASSIMO_DOCUMENTI))
    delete documenti[chiave]
  return { ...memoria, documenti }
}

/** La memoria con la voce del documento aggiornata; senza chiave, com'era. */
export function conVoce (
  memoria: Memoria,
  chiave: string | null,
  voce: VoceDocumento,
  adesso: Date,
): Memoria {
  const pulita = voceDa(voce)
  if (chiave === null || !pulita) return memoria
  return potata({
    ...memoria,
    documenti: { ...memoria.documenti, [chiave]: { ...pulita, usato: adesso.toISOString() } },
  })
}

/**
 * Il testo da scrivere, sempre sotto il limite del disco: se non ci sta,
 * cedono prima i documenti meno recenti, poi le liste lunghe dell'ultimo.
 */
export function serializza (memoria: Memoria): string {
  let testo = JSON.stringify(memoria)
  if (testo.length < LIMITE_CARATTERI) return testo
  const documenti = { ...memoria.documenti }
  const chiavi = perUso(documenti)
  while (testo.length >= LIMITE_CARATTERI && chiavi.length > 1) {
    delete documenti[chiavi.shift()!]
    testo = JSON.stringify({ ...memoria, documenti })
  }
  const ultima = chiavi[0]
  if (testo.length >= LIMITE_CARATTERI && ultima !== undefined) {
    documenti[ultima] = { ...documenti[ultima], classiApertePersone: [] }
    testo = JSON.stringify({ ...memoria, documenti })
  }
  // I limiti di lettura tengono la voce e le globali ben sotto: qui non si arriva.
  return testo.length < LIMITE_CARATTERI ? testo : JSON.stringify(vuota())
}
