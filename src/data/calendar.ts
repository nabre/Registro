// Il testo di un calendario ICS, da un indirizzo o da un file: la sola parte
// che tocca rete o disco (il resto in `domain/calendar.ts`). Esce solo un GET
// all'indirizzo scritto dal docente; l'indirizzo non va mai nei messaggi,
// perché spesso contiene un gettone.

import * as apparato from 'apparato'

import type { SorgenteCalendario } from '../domain/models.js'
import { deposito } from './store.js'
import { istanteAdesso } from '../domain/dates.js'
import { testi } from './calendar.testi.js'

/** Un calendario d'istituto sta sotto il megabyte; oltre dieci è un'altra cosa. */
const MASSIMO_BYTE = 10 * 1024 * 1024
const ATTESA_MS = 20_000
/**
 * Per quanto si ricorda un calendario senza copia letto dall'origine: il
 * confronto si rifà a ogni scelta. Chiave: l'id del calendario.
 */
const RICORDO_MS = 60_000

const letti = new Map<string, { quando: number; testo: string }>()

/** Vero se la sorgente è un indirizzo di rete e non un percorso. */
function sorgenteInRete (sorgente: string): boolean {
  return /^(https?|webcals?):\/\//i.test(sorgente.trim())
}

async function scarica (indirizzo: string): Promise<string> {
  // `webcal://` è `https://` con un altro nome, per i link «abbonati».
  const vero = indirizzo.trim().replace(/^webcals?:\/\//i, 'https://')
  let risposta: Response
  try {
    risposta = await fetch(vero, {
      headers: { accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(ATTESA_MS),
    })
  } catch {
    throw new Error(testi().nonRisponde)
  }
  if (!risposta.ok) throw new Error(testi().serverHaRisposto(risposta.status))
  const dichiarati = Number(risposta.headers.get('content-length') ?? 0)
  if (dichiarati > MASSIMO_BYTE) throw new Error(testi().troppoGrande)
  const byte = new Uint8Array(await risposta.arrayBuffer())
  if (byte.byteLength > MASSIMO_BYTE) throw new Error(testi().troppoGrande)
  return new TextDecoder('utf-8').decode(byte)
}

async function daFile (percorso: string): Promise<string> {
  const pulito = percorso.trim().replace(/^"|"$/g, '')
  const uri = /^file:\/\//i.test(pulito) ? apparato.Uri.parse(pulito) : apparato.Uri.file(pulito)
  let byte: Uint8Array
  try {
    byte = await apparato.file.readFile(uri)
  } catch {
    throw new Error(testi().fileNonSiApre)
  }
  if (byte.byteLength > MASSIMO_BYTE) throw new Error(testi().fileTroppoGrande)
  return new TextDecoder('utf-8').decode(byte)
}

/** Controlla che il testo sia un calendario, e lo torna. */
function soloCalendario (testo: string): string {
  if (!/BEGIN:VCALENDAR/i.test(testo)) {
    throw new Error(testi().nonIcs)
  }
  return testo
}

/** Il testo all'origine (indirizzo o file) letto adesso, senza ricordo. */
async function leggiOrigine (origine: string): Promise<string> {
  const chiave = origine.trim()
  if (!chiave) throw new Error(testi().manca)
  return soloCalendario(sorgenteInRete(chiave) ? await scarica(chiave) : await daFile(chiave))
}

// -------------------------------------------------------------------- la copia
//
// Ogni calendario si legge da una copia nel documento, in `calendari/`: funziona
// senza rete e non cambia fra un confronto e l'altro. Si rifà solo a mano.

/** La cartella delle copie, dentro il documento. */
const CALENDARI = 'calendari'

function percorsoCopia (id: string): string {
  return `${CALENDARI}/${id}.ics`
}

/**
 * Rilegge l'origine, ne scrive la copia e torna il momento della copia. Se
 * l'origine non si legge, la copia precedente resta.
 */
export async function copiaDallOrigine (calendario: SorgenteCalendario): Promise<string> {
  const dove = deposito()
  if (!dove) throw new Error(testi().nessunAnno)
  const testo = await leggiOrigine(calendario.origine)
  if (!dove.scrivi(percorsoCopia(calendario.id), new TextEncoder().encode(testo))) {
    throw new Error(testi().copiaNonScritta)
  }
  letti.delete(calendario.id)
  return istanteAdesso()
}

/**
 * Scrive sotto un id nuovo la copia presa da un altro documento («Importa da
 * un altro registro…»). Falso se non si scrive: il calendario arriva senza
 * copia, e la farà «Aggiorna».
 */
export function scriviCopia (id: string, byte: Uint8Array): boolean {
  const dove = deposito()
  if (!dove || !dove.scrivi(percorsoCopia(id), byte)) return false
  letti.delete(id)
  return true
}

/** Dove sta, dentro un documento, la copia del calendario con quell'id. */
export function percorsoCopiaCalendario (id: string): string {
  return percorsoCopia(id)
}

/** Toglie la copia di un calendario dal documento. Nessuna copia: niente da fare. */
export function eliminaCopia (id: string): void {
  deposito()?.elimina(percorsoCopia(id))
  letti.delete(id)
}

/**
 * Il testo di un calendario, o un errore da mostrare. Dalla copia nel
 * documento; senza copia dall'origine, senza scriverla (una lettura non scrive).
 */
export async function testoDelCalendario (calendario: SorgenteCalendario): Promise<string> {
  const copia = deposito()?.leggiTesto(percorsoCopia(calendario.id))
  if (copia) return soloCalendario(copia)

  const ricordato = letti.get(calendario.id)
  if (ricordato && Date.now() - ricordato.quando < RICORDO_MS) return ricordato.testo
  const testo = await leggiOrigine(calendario.origine)
  letti.set(calendario.id, { quando: Date.now(), testo })
  return testo
}
