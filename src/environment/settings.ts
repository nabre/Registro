// Le impostazioni: un file JSON in `userData`.
//
// Le chiavi restano piatte e puntate — `registroDocenti.posta.mittente` — e i
// valori predefiniti si leggono da `src/manifest.ts`, che è l'unico elenco.
// Riscriverli a mano qui vorrebbe dire due elenchi da tenere allineati, e la
// divergenza si scoprirebbe fra un anno da un'impostazione che vale una cosa
// nella finestra e un'altra dentro il registro.
//
// La lettura è sincrona perché mezzo registro chiama `get` in mezzo a un
// calcolo. Il file è di poche righe: si legge una volta all'avvio e resta in
// memoria.

import { app } from 'electron'
import { depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

import {
  IMPOSTAZIONI as VOCI_IMPOSTAZIONI,
  predefinitiImpostazioni,
  sospesa,
  type VoceImpostazione,
} from '../manifest.js'
import { sembraIndirizzo } from '../domain/mailbox.js'
import type { VoceProgramma } from '../protocol.js'
import { EventEmitter } from './events.js'

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

// Un file che non c'è vuol dire avvio pulito; un file che non si riesce a
// leggere vuol dire che va protetto, non riscritto. `depositoJson` conosce la
// differenza — qui c'era un `catch` solo, e bastava un `EBUSY` di OneDrive
// perché il salvataggio dopo cancellasse tutte le impostazioni.
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
 * Rilegge il file. Serve alle prove, e a nient'altro.
 *
 * La frase diceva anche «e a chi guarda le modifiche da fuori», e non era
 * vero: fuori dalle prove non la chiama nessuno, e un `impostazioni.json`
 * cambiato a mano mentre il registro gira resta invisibile fino al riavvio.
 * Fra il togliere la mezza frase e l'iscriversi al file, si toglie la mezza
 * frase: il file lo scrive il registro stesso, e un osservatore che non sa
 * distinguere le proprie scritture dalle altrui riaccenderebbe il condotto e
 * ridisegnerebbe il pannello a ogni spunta. Quella distinzione è lavoro vero,
 * e nessuno ha mai chiesto di modificare le impostazioni con il blocco note
 * aperto accanto.
 */
export function ricaricaImpostazioni (): void {
  deposito.dimentica()
}

/**
 * Cambia una chiave e scrive. Falso se il file sul disco non si è potuto
 * leggere e va protetto, o se non c'era niente da cambiare.
 *
 * Il cambiamento si applica dentro il deposito, sul contenuto riletto un
 * istante prima: fra il momento in cui si legge per decidere e il momento in
 * cui si scrive c'è una rilettura — quella che ricontrolla se il blocco
 * dell'antivirus si è sciolto — e prima quel che si scriveva era la fotografia
 * di prima, cioè i predefiniti. Un `impostazioni.json` intero sostituito da
 * una chiave sola, con `salva` che tornava `true`.
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

function predefinito (piena: string): unknown {
  return PREDEFINITI_IMPOSTAZIONI[piena]
}

/**
 * Le impostazioni di una sezione.
 *
 * `AmbitoImpostazione` si accetta ma non si guarda: sul desktop non ci sono
 * tre livelli — utente, cartella, sottocartella — ce n'è uno solo, e i tre
 * finiscono tutti nello stesso file. È una semplificazione voluta: `mail.ts`
 * cancella un'impostazione su tutti e tre i livelli per essere sicuro di
 * averla tolta, e qui la prima cancellazione basta.
 */
export function getConfiguration (sezione?: string): Configurazione {
  const piena = (chiave: string): string => (sezione ? `${sezione}.${chiave}` : chiave)

  function leggi<T> (chiave: string, ripiego?: T): T | undefined {
    const nome = piena(chiave)
    const valori = caricate()
    if (Object.prototype.hasOwnProperty.call(valori, nome)) {
      const valore = valori[nome]
      if (valore !== undefined) return valore as T
    }
    const dato = predefinito(nome)
    return (dato !== undefined ? dato : ripiego) as T | undefined
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
      // File bloccato: non si scrive e non si annuncia niente. Dire che
      // l'impostazione è cambiata farebbe ridisegnare l'interfaccia su un
      // valore che al riavvio non ci sarà. Stesso silenzio quando il valore
      // era già quello: non è successo niente da annunciare.
      if (!scriviChiave(nome, valore)) return
      emettitore.fire({
        affectsConfiguration: (prefisso: string) => nome === prefisso || nome.startsWith(`${prefisso}.`),
      })
    },
  }
}

// ------------------------------------------------- le voci, come si mostrano

/**
 * Le impostazioni del programma come le mostra chi le mostra: il manifesto, più
 * lo stato di adesso.
 *
 * Sta qui e non in `shell/windows/menu.ts` perché i lettori sono due — la finestra
 * nativa e la pagina Impostazioni del pannello — e due elenchi costruiti in due
 * posti diversi divergono: basta una voce esclusa di qua e non di là, e la
 * stessa impostazione si può cambiare da una parte e non dall'altra.
 */
export function vociImpostazioni (): VoceProgramma[] {
  const configurazione = getConfiguration()

  // Tutte, anche le nascoste: servono a `sospesa`, che ha bisogno del valore
  // del padre e non può trovarlo in un elenco già sfoltito. Sfoltire prima
  // vorrebbe dire che una figlia di una chiave nascosta risulterebbe libera
  // per il solo fatto che il padre non si vede.
  const tutte = Object.entries(VOCI_IMPOSTAZIONI).map(([chiave, voce]) => {
    // Da `inspect` e non da `get`: serve sapere non solo il valore ma anche se
    // è stato scritto, perché chi lo mostra lo dice e offre di ritirarlo.
    const stato = configurazione.inspect<string | number | boolean>(chiave)
    const scritto = stato?.globalValue
    return {
      voce,
      fuori: {
        chiave,
        tipo: voce.tipo,
        descrizione: voce.descrizione,
        formato: voce.formato ?? null,
        scelte: voce.scelte ? voce.scelte.map((scelta) => ({ ...scelta })) : null,
        minimo: voce.minimo ?? null,
        massimo: voce.massimo ?? null,
        predefinito: stato?.defaultValue ?? voce.predefinito,
        valore: scritto !== undefined ? scritto : stato?.defaultValue ?? voce.predefinito,
        scritta: scritto !== undefined,
        dipendeDa: voce.dipendeDa ?? null,
        // Riempita subito sotto, quando tutte le altre si conoscono.
        sospesa: false as boolean,
        avanzata: Boolean(voce.avanzata),
      } satisfies VoceProgramma,
    }
  })

  const valori = tutte.map((riga) => riga.fuori)
  for (const riga of tutte) riga.fuori.sospesa = sospesa(riga.fuori, valori)

  // Le nascoste restano fuori: non sono scelte da offrire, sono lo stato che
  // il widget dell'agenda si scrive addosso. Restano scrivibili — la dogana le
  // conosce — ma da nessuna delle due superfici, perché è di qui che tutte e
  // due prendono l'elenco.
  return tutte.filter((riga) => !riga.voce.nascosta).map((riga) => riga.fuori)
}

/** Se una chiave è dichiarata nel manifesto. Le nascoste contano: esistono. */
export function impostazioneDichiarata (chiave: string): boolean {
  return Object.prototype.hasOwnProperty.call(VOCI_IMPOSTAZIONI, chiave)
}

/**
 * Il valore, se è di quelli che si possono scrivere per quella chiave.
 *
 * È la dogana fra chi chiede e il file: una chiave inventata, un numero
 * arrivato come testo o una scelta fuori dall'elenco finirebbero dentro le
 * impostazioni, e di lì dentro il registro. `undefined` vuol dire «non
 * scrivere», e chi chiama non ha altro da decidere.
 *
 * Guarda tutto quel che il manifesto dichiara, e non solo il tipo: `formato`
 * e gli estremi dei numeri sono regole come le `scelte`. Prima non lo erano, e
 * si vedeva: `posta.mittente = "pippo"` entrava da ogni parte tranne che dalla
 * finestra nativa, che lo fermava per conto suo con un `checkValidity()` — cioè
 * la regola valeva dove capitava, invece che dove si scrive.
 *
 * Le chiavi nascoste passano di qui come tutte le altre: sono lo stato del
 * widget, e il widget deve poterle scrivere. Nascosto vuol dire «non da
 * offrire», non «non da accettare».
 */
export function valoreAccettabile (chiave: string, valore: unknown): string | number | boolean | undefined {
  return perche(chiave, valore).valore
}

/**
 * La stessa dogana, con il motivo del rifiuto quando c'è.
 *
 * `valoreAccettabile` da solo dice «no» e basta, e va bene per chi il no lo
 * traduce da sé. Le due superfici no: la finestra nativa taceva del tutto —
 * campo che resta com'è, nessun messaggio, e il riquadro dell'errore in pagina
 * era codice morto — e chi aveva battuto un indirizzo storto non aveva modo di
 * sapere che non era stato salvato. Il motivo nasce qui, dove si conosce la
 * regola violata, e non presso chi disegna, dove sarebbe da indovinare.
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
  if (!voce) return no(`«${chiave}» non è un’impostazione del registro.`)
  if (voce.scelte && !voce.scelte.some((scelta) => scelta.valore === valore)) {
    return no(`Non è una delle scelte: ${voce.scelte.map((scelta) => scelta.valore).join(', ')}.`)
  }

  switch (voce.tipo) {
    case 'boolean':
      return typeof valore === 'boolean' ? { valore, motivo: null } : no('Vuole acceso o spento.')

    case 'number': {
      if (typeof valore !== 'number' || !Number.isFinite(valore)) return no('Vuole un numero.')
      if (voce.minimo !== undefined && valore < voce.minimo) {
        return no(`Sotto il minimo: non meno di ${voce.minimo}.`)
      }
      if (voce.massimo !== undefined && valore > voce.massimo) {
        return no(`Sopra il massimo: non più di ${voce.massimo}.`)
      }
      return { valore, motivo: null }
    }

    case 'string': {
      if (typeof valore !== 'string') return no('Vuole del testo.')
      // Il vuoto passa sempre: è il predefinito di tutti e due gli indirizzi
      // della posta, e vuol dire «lo stesso dell'altro». Chiedere un indirizzo
      // a chi sta svuotando il campo sarebbe impedire di svuotarlo.
      if (voce.formato === 'email' && valore.trim() !== '' && !sembraIndirizzo(valore)) {
        return no('Non sembra un indirizzo di posta: ci vuole qualcosa come nome@dominio.ch.')
      }
      return { valore, motivo: null }
    }

    default:
      return no('Tipo non riconosciuto.')
  }
}
