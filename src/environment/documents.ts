// I documenti d'anno aperti: i recenti (ne restano dodici) e i preferiti (non
// scadono), in un elenco solo in `userData`, perché i documenti stanno in
// cartelle diverse.
//
// Un file sparito (la cartella risponde, lui no) si toglie dall'elenco; se non
// risponde nemmeno la cartella (chiavetta staccata, rete assente) la voce resta
// come «non disponibile». Vedi `verificaDocumenti`.

import { app } from 'electron'
import { stat } from 'node:fs/promises'
import { depositoJson } from './jsonStore.js'
import { ESTENSIONE as ESTENSIONE_PACCHETTO } from '../data/package.js'
import * as percorso from 'node:path'

import { EventEmitter } from './events.js'

const NOME_FILE = 'documenti.json'

/** Quanti recenti si tengono. I preferiti non contano: non scadono. */
const QUANTI_RECENTI = 12

/** L'estensione dei documenti d'anno, da `data/package.ts`. */
const ESTENSIONE = new RegExp(`${ESTENSIONE_PACCHETTO.replace('.', '\\.')}$`, 'i')

/**
 * Ogni quanto l'elenco mostrato si ricontrolla sul disco: `documentiNoti()`
 * parte a ogni spinta di stato, e uno `stat` ogni volta sarebbe troppo.
 */
const VERIFICA_OGNI_MS = 30_000

/** Attesa massima di uno `stat` prima di dire il file irraggiungibile (reti appese). */
const TETTO_STAT_MS = 5_000

/** Un documento che si è aperto almeno una volta, o che si è messo da parte. */
export interface DocumentoNoto {
  /** Il percorso sul disco: fa da chiave. */
  percorso: string
  /** Il nome dell'anno, senza estensione: `2026-2027`. */
  nome: string
  /** L'anno scolastico scritto nel file («2026/27»), o `null` se non ancora letto. */
  etichetta: string | null
  /** La cartella che lo contiene, per distinguere due anni omonimi. */
  cartella: string
  preferito: boolean
  /** Quando lo si è aperto l'ultima volta, in millisecondi. */
  ultimoUso: number
  /** All'ultima verifica non hanno risposto né il file né la cartella. */
  mancante: boolean
  /** È il documento aperto adesso; calcolato qui perché la pagina non ha `path`. */
  aperto: boolean
}

/** Quel che si scrive nel file: solo ciò che non si ricava dal percorso. */
interface VoceScritta {
  percorso: string
  preferito?: boolean
  ultimoUso?: number
  /** L'anno scolastico del file all'ultima apertura. */
  etichetta?: string
}

type Mutazione = (attuale: VoceScritta[]) => VoceScritta[]

const emettitore = new EventEmitter<DocumentoNoto[]>()

/** Scatta quando l'elenco cambia (menu e pannello si aggiornano). */
export const alCambioDocumenti = emettitore.event

function file (): string {
  return percorso.join(app.getPath('userData'), NOME_FILE)
}

/**
 * Le voci lette dal disco, senza quelle prive di percorso e fondendo i doppioni
 * dello stesso file (es. ritoccato a mano): vince la più fresca, la stella resta.
 */
function riconosci (letto: unknown): VoceScritta[] {
  const elenco = Array.isArray(letto) ? letto : (letto as { voci?: unknown })?.voci
  if (!Array.isArray(elenco)) return []
  const fuse: VoceScritta[] = []
  for (const grezza of elenco) {
    if (grezza === null || typeof grezza !== 'object') continue
    const { percorso: cammino, preferito, ultimoUso, etichetta } = grezza as Record<string, unknown>
    if (typeof cammino !== 'string' || cammino.trim() === '') continue
    const voce: VoceScritta = {
      percorso: cammino,
      ...(preferito === true ? { preferito: true } : {}),
      ...(typeof ultimoUso === 'number' && Number.isFinite(ultimoUso) ? { ultimoUso } : {}),
      ...(typeof etichetta === 'string' && etichetta.trim() !== '' ? { etichetta } : {}),
    }
    const indice = fuse.findIndex((v) => stessoFile(v.percorso, cammino))
    if (indice === -1) {
      fuse.push(voce)
      continue
    }
    const gia = fuse[indice]
    const piuFresca = (voce.ultimoUso ?? 0) > (gia.ultimoUso ?? 0) ? voce : gia
    fuse[indice] = {
      ...piuFresca,
      ...(gia.preferito || voce.preferito ? { preferito: true } : {}),
    }
  }
  return fuse
}

// Illeggibile: elenco vuoto per la sessione, senza avvisi e senza toccare il file.
const deposito = depositoJson<VoceScritta[]>(file, riconosci, () => [])

/**
 * Cambiamenti non ancora scritti (file bloccato, disco pieno): si mostrano lo
 * stesso e si riprovano alla scrittura dopo.
 */
let inAttesa: Mutazione[] = []

/** L'elenco visibile: quel che è scritto più quel che aspetta. */
function caricate (): VoceScritta[] {
  return inAttesa.reduce((voci, muta) => muta(voci), deposito.contenuto())
}

function salva (muta: Mutazione, opzioni: { verifica?: boolean } = {}): void {
  // Una mutazione che torna lo stesso array non cambia niente (convenzione di
  // `depositoJson`): niente verifica né avvisi. `ricordaEtichetta` arriva a ogni
  // salvataggio.
  const prima = caricate()
  if (muta(prima) === prima) return
  const tutte = [...inAttesa, muta]
  let scritto = false
  try {
    scritto = deposito.salva((attuale) => tutte.reduce((voci, m) => m(voci), attuale))
  } catch {
    // Non scritto: resta in attesa per la prossima scrittura.
  }
  inAttesa = scritto ? [] : tutte
  // Elenco cambiato: verifica asincrona, che rispinge l'elenco se trova qualcosa.
  if (opzioni.verifica !== false) void verificaDocumenti()
  emettitore.fire(documentiNoti())
}

/**
 * Se due percorsi indicano lo stesso file (su Windows senza badare alle
 * maiuscole). È l'unico confronto valido: da qui viene anche `aperto`.
 */
function stessoFile (uno: string, altro: string): boolean {
  const normale = (valore: string) => percorso.resolve(valore)
  return process.platform === 'win32'
    ? normale(uno).toLowerCase() === normale(altro).toLowerCase()
    : normale(uno) === normale(altro)
}

// ------------------------------------------------------------- la verifica

/** I file dell'elenco che non rispondono («non disponibile»), dall'ultima verifica. */
let mancanti = new Set<string>()
let ultimaVerifica = 0
let verificaInCorso: Promise<void> | null = null
let verificaDaRifare = false

/** Come ha risposto un file dell'elenco. */
type Esito = 'presente' | 'sparito' | 'irraggiungibile'

/**
 * Guarda un file dell'elenco con `stat` soltanto: leggerlo scaricherebbe i file
 * «solo online» di OneDrive.
 * - `sparito`: percorso relativo, estensione sbagliata, cartella al suo posto,
 *   o cartella che risponde senza di lui.
 * - `irraggiungibile`: non risponde nemmeno la cartella, o il sistema rifiuta.
 */
async function esitoDi (cammino: string): Promise<Esito> {
  if (!percorso.isAbsolute(cammino) || !ESTENSIONE.test(cammino)) {
    return 'sparito'
  }
  try {
    return (await stat(cammino)).isFile() ? 'presente' : 'sparito'
  } catch (errore) {
    if ((errore as { code?: string } | null)?.code !== 'ENOENT') return 'irraggiungibile'
  }
  try {
    return (await stat(percorso.dirname(cammino))).isDirectory() ? 'sparito' : 'irraggiungibile'
  } catch {
    return 'irraggiungibile'
  }
}

/** `esitoDi`, con un tetto: chi non risponde in tempo è irraggiungibile. */
function esitoEntroIlTetto (cammino: string): Promise<Esito> {
  return new Promise((risolvi) => {
    const timer = setTimeout(() => risolvi('irraggiungibile'), TETTO_STAT_MS)
    // Un disco appeso non deve tenere vivo il processo all'uscita.
    timer.unref?.()
    esitoDi(cammino).then(
      (esito) => { clearTimeout(timer); risolvi(esito) },
      () => { clearTimeout(timer); risolvi('irraggiungibile') },
    )
  })
}

async function unGiroDiVerifica (): Promise<void> {
  const voci = caricate()
  const esiti = await Promise.all(voci.map((voce) => esitoEntroIlTetto(voce.percorso)))

  const nuoviMancanti = new Set<string>()
  const sparite = new Set<VoceScritta>()
  voci.forEach((voce, i) => {
    if (esiti[i] === 'irraggiungibile') nuoviMancanti.add(voce.percorso)
    if (esiti[i] === 'sparito') sparite.add(voce)
  })
  const cambiati =
    nuoviMancanti.size !== mancanti.size || [...nuoviMancanti].some((p) => !mancanti.has(p))
  mancanti = nuoviMancanti

  if (sparite.size > 0) {
    // Per identità, non per percorso: una voce riaperta nel frattempo è un
    // oggetto nuovo, e resta.
    salva((attuale) => {
      const rimaste = attuale.filter((v) => !sparite.has(v))
      return rimaste.length === attuale.length ? attuale : rimaste
    }, { verifica: false })
    return
  }
  if (cambiati) emettitore.fire(documentiNoti())
}

/**
 * Ricontrolla l'elenco sul disco e toglie dal file i documenti spariti. Non
 * solleva; chiamata durante una verifica, ne accoda un'altra alla fine.
 */
export function verificaDocumenti (): Promise<void> {
  if (verificaInCorso) {
    verificaDaRifare = true
    return verificaInCorso
  }
  verificaInCorso = (async () => {
    try {
      do {
        verificaDaRifare = false
        ultimaVerifica = Date.now()
        try {
          await unGiroDiVerifica()
        } catch (errore) {
          console.error('verifica dei documenti recenti', errore)
        }
      } while (verificaDaRifare)
    } finally {
      verificaInCorso = null
    }
  })()
  return verificaInCorso
}

function noto (voce: VoceScritta, corrente: string | null): DocumentoNoto {
  const nome = percorso.basename(voce.percorso).replace(ESTENSIONE, '')
  return {
    percorso: voce.percorso,
    nome,
    etichetta: voce.etichetta ?? null,
    cartella: percorso.dirname(voce.percorso),
    preferito: Boolean(voce.preferito),
    ultimoUso: voce.ultimoUso ?? 0,
    mancante: mancanti.has(voce.percorso),
    aperto: corrente !== null && stessoFile(voce.percorso, corrente),
  }
}

/**
 * L'elenco da mostrare: preferiti in cima, poi recenti dal più fresco. Torna
 * subito; se l'ultima verifica è vecchia ne avvia una.
 */
export function documentiNoti (corrente: string | null = null): DocumentoNoto[] {
  const voci = caricate()
  if (!verificaInCorso && Date.now() - ultimaVerifica >= VERIFICA_OGNI_MS) void verificaDocumenti()
  return voci
    .map((voce) => noto(voce, corrente))
    .sort((a, b) => {
      if (a.preferito !== b.preferito) return a.preferito ? -1 : 1
      return b.ultimoUso - a.ultimoUso
    })
}

/** Taglia i recenti di troppo. I preferiti restano comunque. */
function potaRecenti (elenco: VoceScritta[]): VoceScritta[] {
  const recenti = elenco
    .filter((v) => !v.preferito)
    .sort((a, b) => (b.ultimoUso ?? 0) - (a.ultimoUso ?? 0))
  const daTogliere = new Set(recenti.slice(QUANTI_RECENTI))
  return daTogliere.size === 0 ? elenco : elenco.filter((v) => !daTogliere.has(v))
}

/** «Ultimo uso» da scrivere: adesso, ma sempre dopo tutti gli altri, così non ci sono pari. */
function dopoTutti (elenco: VoceScritta[], adesso: number): number {
  return elenco.reduce((massimo, v) => Math.max(massimo, (v.ultimoUso ?? 0) + 1), adesso)
}

/**
 * Segna un documento come appena aperto (in testa ai recenti, percorso
 * assoluto) e lo aggiunge ai recenti del sistema operativo. Lo chiama
 * `startup.ts` solo quando un anno si è aperto davvero.
 */
export function segnaDocumentoAperto (percorsoFile: string, etichetta?: string): void {
  const intero = percorso.resolve(percorsoFile)
  const adesso = Date.now()
  // Appena aperto: c'è, qualunque cosa dicesse l'ultima verifica.
  mancanti = new Set([...mancanti].filter((p) => !stessoFile(p, intero)))
  salva((attuale) => {
    // Le voci dello stesso file diventano una, col percorso di adesso e la stella se c'era.
    const gia = attuale.filter((v) => stessoFile(v.percorso, intero))
    const altri = attuale.filter((v) => !gia.includes(v))
    const nota = etichetta ?? gia.find((v) => v.etichetta)?.etichetta
    const voce: VoceScritta = {
      percorso: intero,
      ...(gia.some((v) => v.preferito) ? { preferito: true } : {}),
      ultimoUso: dopoTutti(attuale, adesso),
      ...(nota ? { etichetta: nota } : {}),
    }
    return potaRecenti([...altri, voce])
  })

  // `?.`: manca nell'Electron finto delle prove.
  try {
    app.addRecentDocument?.(intero)
  } catch {
    // Su Linux la lista di sistema può mancare: non è un guasto.
  }
}

/**
 * Ricorda l'anno scolastico del documento aperto; gli altri file non si aprono
 * per leggerlo (chiavette, cartelle sincronizzate).
 */
export function ricordaEtichetta (percorsoFile: string, etichetta: string): void {
  const pulita = etichetta.trim()
  if (!pulita) return
  salva((attuale) => {
    const gia = attuale.find((v) => stessoFile(v.percorso, percorsoFile))
    if (!gia || gia.etichetta === pulita) return attuale
    return attuale.map((v) => (v === gia ? { ...v, etichetta: pulita } : v))
  })
}

/** Mette da parte un documento, o lo lascia tornare fra i recenti. */
export function impostaPreferito (percorsoFile: string, preferito: boolean): void {
  const intero = percorso.resolve(percorsoFile)
  const adesso = Date.now()
  salva((attuale) => {
    const gia = attuale.find((v) => stessoFile(v.percorso, intero))
    if (gia) {
      if (Boolean(gia.preferito) === preferito) return attuale
      return potaRecenti(attuale.map((v) => (v === gia ? { ...v, preferito } : v)))
    }
    if (!preferito) return attuale
    return potaRecenti(
      [...attuale, { percorso: intero, preferito: true, ultimoUso: dopoTutti(attuale, adesso) }],
    )
  })
}

/** Toglie un documento dall'elenco. Il file sul disco non si tocca. */
export function dimenticaDocumento (percorsoFile: string): void {
  salva((attuale) => {
    const rimasti = attuale.filter((v) => !stessoFile(v.percorso, percorsoFile))
    return rimasti.length === attuale.length ? attuale : rimasti
  })
}

/** Rilegge il file; per le prove, che usano una `userData` propria. */
export function ricaricaDocumenti (): void {
  deposito.dimentica()
  inAttesa = []
  mancanti = new Set()
  ultimaVerifica = 0
}
