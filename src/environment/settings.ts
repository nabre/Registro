// Le impostazioni del programma: `impostazioni.json` in `userData`, chiavi piatte
// e puntate, predefiniti da `src/manifest.ts` (l'unico elenco). Lettura sincrona
// da memoria, perché `get` si chiama in mezzo ai calcoli.

import { app } from 'electron'
import { depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

import {
  CHIAVI_DISMESSE,
  IMPOSTAZIONI as VOCI_IMPOSTAZIONI,
  predefinitiImpostazioni,
  requisitoMancante,
  sospesa,
  type VoceImpostazione,
} from '../manifest.js'
import { perchéNonLocale } from '../domain/loopback.js'
import { sembraIndirizzo } from '../domain/mailbox.js'
import type { VoceProgramma } from '../protocol.js'
import { EventEmitter } from './events.js'
import { testi } from './settings.testi.js'

/** I predefiniti del manifesto, appiattiti una volta sola. */
const PREDEFINITI_IMPOSTAZIONI: Record<string, unknown> = predefinitiImpostazioni()

export enum AmbitoImpostazione {
  Global = 1,
  Workspace = 2,
  CartellaDiLavoro = 3,
}

export interface CambioImpostazione {
  affectsConfiguration (sezione: string): boolean
}

export interface Configurazione {
  get<T> (chiave: string): T | undefined
  get<T> (chiave: string, ripiego: T): T
  has (chiave: string): boolean
  inspect<T> (chiave: string): { key: string, defaultValue?: T, globalValue?: T } | undefined
  update (chiave: string, valore: unknown, target?: AmbitoImpostazione): Promise<void>
}

const NOME_FILE = 'impostazioni.json'


const emettitore = new EventEmitter<CambioImpostazione>()

/** Scatta quando un'impostazione cambia. */
export const onDidChangeConfiguration = emettitore.event

function file (): string {
  return percorso.join(app.getPath('userData'), NOME_FILE)
}

// `depositoJson` distingue il file assente da quello illeggibile, che va protetto.
const deposito = depositoJson<Record<string, unknown>>(
  file,
  (letto) =>
    letto !== null && typeof letto === 'object' ? { ...(letto as Record<string, unknown>) } : {},
  () => ({}),
)

function caricate (): Record<string, unknown> {
  return deposito.contenuto()
}

/**
 * Rilegge il file; serve solo alle prove. Un cambio a mano mentre il registro
 * gira si vede al riavvio.
 */
export function ricaricaImpostazioni (): void {
  deposito.dimentica()
}

/**
 * Cambia una chiave sul contenuto riletto e scrive. Falso se il file va
 * protetto o se non c'era niente da cambiare.
 */
function scriviChiave (nome: string, valore: unknown): boolean {
  let cambiato = false
  const scritto = deposito.salva((attuale) => {
    if (valore === undefined) {
      if (!Object.prototype.hasOwnProperty.call(attuale, nome)) return attuale
      const { [nome]: _tolto, ...rimasti } = attuale
      cambiato = true
      return rimasti
    }
    if (attuale[nome] === valore) return attuale
    cambiato = true
    return { ...attuale, [nome]: valore }
  })
  return scritto && cambiato
}

/**
 * Toglie dal file, all'avvio e senza annunci, le chiavi di `CHIAVI_DISMESSE`:
 * una chiave omonima futura non deve ritrovarne il valore.
 */
export function ritiraChiaviDismesse (): void {
  const valori = caricate()
  const scritte = CHIAVI_DISMESSE.filter((chiave) =>
    Object.prototype.hasOwnProperty.call(valori, chiave),
  )
  if (scritte.length === 0) return
  deposito.salva((attuale) => {
    const rimasti = { ...attuale }
    for (const chiave of scritte) delete rimasti[chiave]
    return rimasti
  })
}

function predefinito (piena: string): unknown {
  return PREDEFINITI_IMPOSTAZIONI[piena]
}

/** Il nome leggibile di una voce: `etichetta`, o l'ultimo pezzo della chiave a parole. */
function etichettaDi (chiave: string): string {
  const scritta = VOCI_IMPOSTAZIONI[chiave]?.etichetta
  if (scritta) return scritta
  const ultimo = chiave.split('.').pop() ?? chiave
  const parole = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return parole.charAt(0).toUpperCase() + parole.slice(1)
}

/** Quel che serve al dialogo di sistema per scegliere il percorso di una voce. */
interface DialogoPercorso {
  titolo: string
  cartella: boolean
  /** Per nome del filtro, le estensioni senza punto. Vuoto per le cartelle. */
  filtri: Record<string, string[]>
  /** Da dove parte il dialogo: il percorso scritto adesso, se c'è. */
  da: string
}

/**
 * Il dialogo per una voce che tiene un percorso, o `null`. Unico per pannello
 * (`actions/system.ts`) e finestra nativa (`shell/windows/menu.ts`).
 */
export function dialogoPercorso (chiave: string): DialogoPercorso | null {
  const voce = VOCI_IMPOSTAZIONI[chiave]
  if (!voce || voce.tipo !== 'string') return null
  const da = String(grezzo(chiave) ?? '')
  const titolo = etichettaDi(chiave)
  switch (voce.formato) {
    case 'cartella':
      return { titolo, cartella: true, filtri: {}, da }
    case 'eseguibile':
      return { titolo, cartella: false, filtri: { [testi().filtroProgrammi]: ['exe'] }, da }
    case 'file':
      return { titolo, cartella: false, filtri: { [testi().filtroFile]: [...(voce.estensioni ?? ['*'])] }, da }
    default:
      return null
  }
}

/** Quel che dice il file per una chiave piena, o il predefinito: senza regole. */
function grezzo (piena: string): unknown {
  const valori = caricate()
  if (Object.prototype.hasOwnProperty.call(valori, piena) && valori[piena] !== undefined) {
    return valori[piena]
  }
  return predefinito(piena)
}

/**
 * Le chiavi toccate da un cambio: quella scritta e gli interruttori che la
 * richiedono (tolto il modello, `assistente.attivo` si legge spento).
 */
function toccate (piena: string): string[] {
  const richiedenti = Object.entries(VOCI_IMPOSTAZIONI)
    .filter(([, voce]) => voce.richiede?.chiavi.includes(piena))
    .map(([chiave]) => chiave)
  return [piena, ...richiedenti]
}

/** Le impostazioni di una sezione. `AmbitoImpostazione` si ignora: il livello è uno solo. */
export function getConfiguration (sezione?: string): Configurazione {
  const piena = (chiave: string): string => (sezione ? `${sezione}.${chiave}` : chiave)

  function leggi<T> (chiave: string, ripiego?: T): T | undefined {
    const nome = piena(chiave)
    const dato = grezzo(nome)
    if (dato === undefined) return ripiego
    // Un interruttore a cui manca quel che `richiede` si legge spento, qui per
    // tutti i lettori.
    if (dato === true && requisitoMancante(nome, grezzo) !== null) return false as T
    return dato as T
  }

  return {
    get: leggi,

    has (chiave: string): boolean {
      const nome = piena(chiave)
      return (
        Object.prototype.hasOwnProperty.call(caricate(), nome) ||
        Object.prototype.hasOwnProperty.call(PREDEFINITI_IMPOSTAZIONI, nome)
      )
    },

    inspect<T> (chiave: string) {
      const nome = piena(chiave)
      const valori = caricate()
      return {
        key: nome,
        defaultValue: predefinito(nome) as T | undefined,
        globalValue: Object.prototype.hasOwnProperty.call(valori, nome)
          ? (valori[nome] as T)
          : undefined,
      }
    },

    async update (chiave: string, valore: unknown): Promise<void> {
      const nome = piena(chiave)
      // Niente annuncio se il file è bloccato o il valore era già quello.
      if (!scriviChiave(nome, valore)) return
      const nomi = toccate(nome)
      emettitore.fire({
        affectsConfiguration: (prefisso: string) =>
          nomi.some((toccata) => toccata === prefisso || toccata.startsWith(`${prefisso}.`)),
      })
    },
  }
}

// ------------------------------------------------- le voci, come si mostrano

/**
 * Le impostazioni come si mostrano: manifesto più stato attuale. Un elenco solo
 * per la finestra nativa e la pagina Impostazioni del pannello.
 */
export function vociImpostazioni (): VoceProgramma[] {
  const configurazione = getConfiguration()

  const valori = Object.entries(VOCI_IMPOSTAZIONI).map(([chiave, voce]): VoceProgramma => {
    // `inspect` perché serve anche sapere se il valore è scritto (si può ritirare).
    const stato = configurazione.inspect<string | number | boolean>(chiave)
    const scritto = stato?.globalValue
    const valore = scritto !== undefined ? scritto : stato?.defaultValue ?? voce.predefinito
    const manca = requisitoMancante(chiave, grezzo)
    return {
      chiave,
      tipo: voce.tipo,
      etichetta: etichettaDi(chiave),
      descrizione: voce.descrizione,
      formato: voce.formato ?? null,
      scelte: voce.scelte ? voce.scelte.map((scelta) => ({ ...scelta })) : null,
      minimo: voce.minimo ?? null,
      massimo: voce.massimo ?? null,
      predefinito: stato?.defaultValue ?? voce.predefinito,
      // Spento se manca quel che richiede, come lo legge il registro.
      valore: valore === true && manca !== null ? false : valore,
      scritta: scritto !== undefined,
      bloccata: manca !== null ? voce.richiede?.motivo ?? null : null,
      dipendeDa: voce.dipendeDa ?? null,
      // Riempita subito sotto, quando tutte le altre si conoscono.
      sospesa: false,
      avanzata: Boolean(voce.avanzata),
    }
  })

  for (const voce of valori) voce.sospesa = sospesa(voce, valori)
  return valori
}

/** Se una chiave è dichiarata nel manifesto. */
export function impostazioneDichiarata (chiave: string): boolean {
  return Object.prototype.hasOwnProperty.call(VOCI_IMPOSTAZIONI, chiave)
}

/**
 * La dogana di ogni scrittura: il valore ammesso per la chiave secondo tutto il
 * manifesto (tipo, `scelte`, `formato`, estremi), o `undefined` con il motivo.
 */
export function valoreConMotivo (
  chiave: string,
  valore: unknown,
): { valore: string | number | boolean | undefined, motivo: string | null } {
  return perche(chiave, valore)
}

function perche (
  chiave: string,
  valore: unknown,
): { valore: string | number | boolean | undefined, motivo: string | null } {
  const no = (motivo: string) => ({ valore: undefined, motivo })
  const voce: VoceImpostazione | undefined = VOCI_IMPOSTAZIONI[chiave]
  const t = testi()
  if (!voce) return no(t.nonÈUnImpostazione(chiave))
  if (voce.scelte && !voce.scelte.some((scelta) => scelta.valore === valore)) {
    return no(t.nonÈUnaScelta(voce.scelte.map((scelta) => scelta.valore).join(', ')))
  }

  switch (voce.tipo) {
    case 'boolean': {
      if (typeof valore !== 'boolean') return no(t.vuoleAccesoOSpento)
      // Spegnere si può sempre; accendere solo se c'è quel che serve.
      if (valore && voce.richiede && requisitoMancante(chiave, grezzo) !== null) {
        return no(voce.richiede.motivo)
      }
      return { valore, motivo: null }
    }

    case 'number': {
      if (typeof valore !== 'number' || !Number.isFinite(valore)) return no(t.vuoleUnNumero)
      if (voce.minimo !== undefined && valore < voce.minimo) {
        return no(t.sottoIlMinimo(voce.minimo))
      }
      if (voce.massimo !== undefined && valore > voce.massimo) {
        return no(t.sopraIlMassimo(voce.massimo))
      }
      return { valore, motivo: null }
    }

    case 'string': {
      if (typeof valore !== 'string') return no(t.vuoleDelTesto)
      // Il vuoto passa: per gli indirizzi della posta vuol dire «lo stesso dell'altro».
      if (voce.formato === 'email' && valore.trim() !== '' && !sembraIndirizzo(valore)) {
        return no(t.nonÈUnIndirizzo)
      }
      // Qui il vuoto no: per il predefinito si ritira la voce.
      if (voce.formato === 'indirizzoLocale') {
        const fuori = perchéNonLocale(valore)
        if (fuori) return no(fuori)
      }
      const guasto = percorsoStorto(voce, valore.trim())
      if (guasto) return no(guasto)
      return { valore: voce.formato && voce.formato !== 'email' && voce.formato !== 'modello' ? valore.trim() : valore, motivo: null }
    }

    default:
      return no(t.tipoIgnoto)
  }
}

/**
 * Perché un percorso non va, o `null`. Il vuoto passa («ci pensa il registro»);
 * un relativo no, perché dipenderebbe da dove il registro è stato lanciato.
 */
function percorsoStorto (voce: VoceImpostazione, valore: string): string | null {
  if (valore === '') return null
  const t = testi()
  switch (voce.formato) {
    case 'cartella':
      return percorso.isAbsolute(valore) ? null : t.cartellaIntera
    case 'eseguibile':
      if (!percorso.isAbsolute(valore)) return t.programmaIntero
      return /\.exe$/i.test(valore) ? null : t.soloExe
    case 'file': {
      if (!percorso.isAbsolute(valore)) return t.fileIntero
      const estensioni = voce.estensioni ?? []
      const sua = percorso.extname(valore).slice(1).toLowerCase()
      return estensioni.length === 0 || estensioni.includes(sua) ? null : t.unFile(estensioni)
    }
    default:
      return null
  }
}
