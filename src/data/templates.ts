// I modelli dei rapporti: stanno solo nel programma (`defaultTemplates.ts`,
// generato da `templates/` del repository). Di chi firma resta nel documento solo
// l'intestazione e la firma delle e-mail (`Impostazioni.intestazione`).
// Una cartella `templates/` accanto al documento si legge solo per portare
// quell'intestazione nel documento: vedi `vecchiaCartella()`.

import * as apparato from 'apparato'

import { lingua, type Lingua } from '../i18n/index.js'
import {
  conBase,
  leggiBlocchi,
  leggiModello,
  leggiTesti,
  riempi,
  testiVuoti,
  type Blocchi,
  type Modello,
  type Testi,
} from '../domain/reports.js'
import { fileDeiTesti, fileDelModello, fileDiTesto, nomeFileAmmesso } from '../domain/templateCatalog.js'
import type { Intestazione } from '../domain/models.js'
import { impronta } from '../domain/text.js'
import { MODELLI_PREDEFINITI } from './defaultTemplates.js'
import { esisteFile, radiceDiLavoro } from './paths.js'

/** Lo strato delle misure (foglio, corpi, colonne): sta sotto tutti, anche senza dichiararlo. */
const STILE = '_stile'

/** Limite alla catena di `estende`: rete contro modelli che si estendono a vicenda. */
const PROFONDITA_MASSIMA = 8

/**
 * Il testo di un modello del programma, o `null` se non c'è. Il nome passa dal
 * controllo del dominio: arriva anche dalla pagina e dall'assistente, e un nome
 * non valido deve dare «non c'è», non un errore.
 */
export function sorgenteModello (nome: string): string | null {
  const file = fileDelModello(nome)
  if (!nomeFileAmmesso(file) || !fileDiTesto(file)) return null
  return MODELLI_PREDEFINITI[nome] ?? null
}

/** Come sopra, per i nomi che arrivano da una riga `estende:`: solo parole. */
function sorgenteDi (nome: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(nome)) return null
  return sorgenteModello(nome)
}

/** Il nome del file con le frasi e i nomi delle colonne, in italiano. */
const TESTI = fileDeiTesti('it')

/** Il nome del file con i pezzi di corpo riusabili. */
export const BLOCCHI = '_blocchi'

/**
 * Le parole comuni nella lingua di stampa (`_testi.tpl`, `_testi-de.tpl`, …).
 * Senza ripiego sull'italiano: una frase mancante esce vuota (lo impedisce una prova).
 */
export function paroleDeiModelli (inLingua: Lingua = lingua()): Testi {
  const sorgente = sorgenteDi(fileDeiTesti(inLingua))
  return sorgente === null ? testiVuoti() : leggiTesti(sorgente)
}

/** I pezzi di corpo riusabili: `_blocchi.tpl`. */
export function blocchi (): Blocchi {
  const sorgente = sorgenteDi(BLOCCHI)
  return sorgente === null ? {} : leggiBlocchi(sorgente)
}

/**
 * Il modello con quel nome, posato su tutti quelli che estende (`_stile` in fondo).
 * Si compone dal più profondo in su, così il file chiesto vince su tutti.
 * `null` solo se il modello non esiste.
 */
export function modello (nome: string): Modello | null {
  const testo = sorgenteDi(nome)
  if (testo === null) return null

  const catena = [leggiModello(nome, testo)]
  const visti = new Set([nome])
  for (let passo = 0; passo < PROFONDITA_MASSIMA; passo += 1) {
    const padre = catena[catena.length - 1].estende
    if (!padre || visti.has(padre)) break
    const testoPadre = sorgenteDi(padre)
    if (testoPadre === null) break
    visti.add(padre)
    catena.push(leggiModello(padre, testoPadre))
  }

  if (!visti.has(STILE)) {
    const testoStile = sorgenteDi(STILE)
    if (testoStile !== null) catena.push(leggiModello(STILE, testoStile))
  }

  let composto = catena[catena.length - 1]
  for (let i = catena.length - 2; i >= 0; i -= 1) composto = conBase(catena[i], composto)
  return composto
}

// ------------------------------------------------------------------ la firma

/** Il file della firma fra i modelli del programma. */
const FIRMA = '_firma.html'

/** Un testo messo dentro HTML: le cinque lettere che lo romperebbero. */
function inHtml (testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * La firma delle mail del documento: quella scritta nel documento, altrimenti
 * quella di serie con nome e scuola; vuota se mancano entrambi.
 */
export function firmaPosta (intestazione: Intestazione): string {
  if (intestazione.firma) return intestazione.firma
  // La prima carta: una mail non riguarda un corso solo.
  const sede = intestazione.carte[0]?.sede ?? ''
  if (!intestazione.docente && !sede) return ''
  const modelloFirma = MODELLI_PREDEFINITI[FIRMA] ?? ''
  return riempi(modelloFirma, {
    docente: inHtml(intestazione.docente),
    sede: inHtml(sede),
  })
}

// ------------------------------------- la cartella dei modelli accanto al documento

/** La cartella dei modelli accanto al documento, da cui si importa l'intestazione. */
export const CARTELLA_MODELLI = 'templates'

/** Quel che la cartella accanto al documento porta nel documento. */
interface VecchiaCartella {
  sede: string
  docente: string
  /** Il logo nominato da `_base.tpl`, se il file c'è. */
  logo: { uri: apparato.Uri, estensione: string, altezza: number | null } | null
  /** La firma delle e-mail com'è su disco. */
  firma: string | null
  /** I modelli toccati a mano, che non valgono più: da segnalare. */
  personalizzati: string[]
}

async function testoDi (file: apparato.Uri): Promise<string | null> {
  try {
    return new TextDecoder().decode(await apparato.file.readFile(file))
  } catch {
    return null
  }
}

/** Le impronte in `_impronte.json`: dicono quali modelli sono stati toccati. */
async function vecchieImpronte (cartella: apparato.Uri): Promise<Record<string, string>> {
  const testo = await testoDi(apparato.Uri.joinPath(cartella, '_impronte.json'))
  if (testo === null) return {}
  try {
    const letto: unknown = JSON.parse(testo)
    if (!letto || typeof letto !== 'object') return {}
    const esito: Record<string, string> = {}
    for (const [nome, voce] of Object.entries(letto as Record<string, unknown>)) {
      const scritto = (voce as { scritto?: unknown } | null)?.scritto
      if (typeof scritto === 'string') esito[nome] = scritto
    }
    return esito
  } catch {
    return {}
  }
}

/** Nome e altezza dalla riga `immagine:` di `_base.tpl`; `logo.jpg` se manca. */
function logoDellaBase (base: string | null): { nome: string, altezza: number | null } {
  const riga = base?.match(/^immagine:\s*([^|\n]+?)\s*(?:\|([^\n]*))?$/m)
  if (!riga) return { nome: 'logo.jpg', altezza: null }
  const misura = riga[2]?.match(/altezza\s+(\d+(?:[.,]\d+)?)/i)
  return {
    nome: riga[1].trim(),
    altezza: misura ? Number(misura[1].replace(',', '.')) : null,
  }
}

/**
 * Quel che c'è in `templates/` accanto al documento, o `null` se non c'è.
 * Si prende quel che è in uso anche se mai toccato (sede, nome, logo, firma);
 * gli altri modelli toccati a mano si elencano soltanto. «Toccato» lo dice
 * `_impronte.json`, o in mancanza il confronto con la copia di serie.
 */
export async function vecchiaCartella (): Promise<VecchiaCartella | null> {
  const radice = radiceDiLavoro()
  if (!radice) return null
  const cartella = apparato.Uri.joinPath(radice, CARTELLA_MODELLI)
  const testiSuDisco = await testoDi(apparato.Uri.joinPath(cartella, `${TESTI}.tpl`))
  const baseSuDisco = await testoDi(apparato.Uri.joinPath(cartella, '_base.tpl'))
  const firma = await testoDi(apparato.Uri.joinPath(cartella, FIRMA))
  if (testiSuDisco === null && baseSuDisco === null && firma === null) return null

  const frasi = testiSuDisco === null ? {} : leggiTesti(testiSuDisco).frasi
  const { nome, altezza } = logoDellaBase(baseSuDisco)
  const estensione = nome.match(/\.(png|jpe?g)$/i)?.[1]?.toLowerCase() ?? null
  const fileLogo = estensione && !/[\\/]/.test(nome) ? apparato.Uri.joinPath(cartella, nome) : null
  const logo = fileLogo && (await esisteFile(fileLogo))
    ? { uri: fileLogo, estensione: estensione === 'jpeg' ? 'jpg' : (estensione as string), altezza }
    : null

  const impronte = await vecchieImpronte(cartella)
  const personalizzati: string[] = []
  for (const [nomeModello, diSerie] of Object.entries(MODELLI_PREDEFINITI)) {
    // Intestazione e firma passano nel documento: non vanno segnalate.
    if (nomeModello === TESTI || nomeModello === '_base' || nomeModello === FIRMA) continue
    const suDisco = await testoDi(apparato.Uri.joinPath(cartella, fileDelModello(nomeModello)))
    if (suDisco === null) continue
    const scritto = impronte[nomeModello]
    const toccato = scritto === undefined ? suDisco !== diSerie : impronta(suDisco) !== scritto
    if (toccato) personalizzati.push(fileDelModello(nomeModello))
  }

  return {
    sede: (frasi.sede ?? '').trim(),
    docente: (frasi.docente ?? '').trim(),
    logo,
    firma: firma && firma.trim() !== '' ? firma : null,
    personalizzati,
  }
}
