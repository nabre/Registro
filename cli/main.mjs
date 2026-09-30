#!/usr/bin/env node
// La riga di comando del registro: un cliente del condotto e nient'altro.
// Chiede l'indice (`$elenco`) e le forme (`$schema`) al condotto, quindi segue
// le procedure senza cambiare. Solo moduli `node:`, niente compilazione: deve
// funzionare anche a costruzione rotta.
//
//   node cli/main.mjs elenco
//   node cli/main.mjs schema ore.appello.casella
//   node cli/main.mjs chiama corso.presenze --corsoId cor-...
//   node cli/main.mjs aspetta
//   node cli/main.mjs guarda
//
// Errori su stderr, dati su stdout, così `regi chiama ... --json | jq` funziona.

import { realpathSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { fileDellaChiave, leggiChiave, presentati } from './access.mjs'
import { cartellaUtente } from './common.mjs'
import { indirizzo } from './address.mjs'
import { collega, conversazione, CondottoMaiAcceso } from './link.mjs'
import { verificaProprietarioPipe } from './pipeOwner.mjs'
import { testi } from './texts.mjs'

import { comandoElenco } from './comandi/elenco.mjs'
import { comandoSchema } from './comandi/schema.mjs'
import { ErroreUso, SENZA_VALORE, comandoChiama } from './comandi/chiama.mjs'
import { comandoStato, comandoCatalogo } from './comandi/stato.mjs'
import { comandoGuarda } from './comandi/guarda.mjs'
import { comandoAspetta } from './comandi/aspetta.mjs'

export { indirizzo } from './address.mjs'
export { collega, conversazione, CondottoMaiAcceso } from './link.mjs'
export { leggiChiave, presentati } from './access.mjs'

/**
 * Il nome del comando nell'aiuto: lo dichiara il ponte di
 * `desktop/shell/system/commandLine.ts`, altrimenti vale quello installato.
 */
const COMANDO = process.env.REGISTRO_COMANDO ?? 'regi'

const USCITA_RIFIUTO = 1
const USCITA_MUTO = 2

/** I testi nella lingua della riga di comando: vedi `texts.mjs`. */
const t = testi()

const SPENTO = [t.nonRisponde, '', t.comeSiAccende].join('\n')

/**
 * Su Windows, quando manca il segreto e l'indirizzo non si conosce: dice dove
 * lo cercava, così chi ha i dati altrove sa di usare `REGISTRO_CONDOTTO`.
 */
function maiAcceso () {
  return [t.maiAcceso(cartellaUtente()), '', t.comeSiAccende].join('\n')
}

// ---------------------------------------------------------------- gli argomenti

/**
 * Scioglie la riga di comando.
 *
 * `--json` seguito da un oggetto è l'ingresso intero; da solo vuol dire «stampa
 * la busta grezza». Seguito da un elenco si rifiuta. `--campo=valore` equivale a
 * `--campo valore` e serve per i valori che cominciano con `--`.
 */
function analizza (argomenti) {
  const liberi = []
  const campi = new Map()
  let grezzo = false
  let corpo = null
  let aiuto = false
  let aspetta = false

  const metti = (nome, valore) => {
    if (campi.has(nome)) scriviErrore(t.scrittoPiùVolte(nome))
    campi.set(nome, valore)
  }
  const prendiCorpo = (testoInput) => {
    if (testoInput.trimStart().startsWith('[')) {
      throw new ErroreUso(t.jsonElenco)
    }
    corpo = testoInput
  }

  for (let i = 0; i < argomenti.length; i++) {
    const voce = argomenti[i]
    if (!voce.startsWith('--')) {
      liberi.push(voce)
      continue
    }
    const uguale = voce.indexOf('=')
    const nome = uguale >= 0 ? voce.slice(2, uguale) : voce.slice(2)
    const attaccato = uguale >= 0 ? voce.slice(uguale + 1) : undefined
    const dopo = argomenti[i + 1]
    if (nome === 'aiuto' || nome === 'help') {
      aiuto = true
      continue
    }
    if (nome === 'aspetta') {
      aspetta = true
      continue
    }
    if (nome === 'json') {
      if (attaccato !== undefined) {
        prendiCorpo(attaccato)
      } else if (dopo !== undefined && !dopo.startsWith('--') &&
        /^[{[]/.test(dopo.trimStart())) {
        prendiCorpo(dopo)
        i++
      } else grezzo = true
      continue
    }
    if (attaccato !== undefined) {
      metti(nome, attaccato)
      continue
    }
    if (dopo === undefined || dopo.startsWith('--')) {
      metti(nome, SENZA_VALORE)
      continue
    }
    metti(nome, dopo)
    i++
  }

  return { liberi, campi, grezzo, corpo, aiuto, aspetta }
}

// ------------------------------------------------------------------ la stampa

function scriviDati (testoInput) {
  process.stdout.write(`${testoInput}\n`)
}

function scriviErrore (testoInput) {
  process.stderr.write(`${testoInput}\n`)
}

/** Le frasi che il condotto ha mandato, o il messaggio JSON-RPC se non ce ne sono. */
function frasiDi (busta) {
  const dati = busta?.error?.data
  if (Array.isArray(dati?.messaggi) && dati.messaggi.length > 0) return dati.messaggi
  return [busta?.error?.message ?? t.nonHaDettoPerché]
}

function raccontaGuasto (busta) {
  for (const frase of frasiDi(busta)) scriviErrore(frase)
  const dati = busta?.error?.data
  if (dati?.campo) scriviErrore(t.campo(dati.campo))
  if (dati?.tracciato) scriviErrore(t.tracciato(dati.tracciato))
}

function muto () {
  scriviErrore(SPENTO)
  return USCITA_MUTO
}

const SENZA_CHIEDI = t.senzaChiedi(COMANDO)

// ------------------------------------------------------------------ il giro

/** Quante parole libere ogni comando legge, comando compreso. */
const PAROLE = {
  elenco: 1,
  stato: 1,
  catalogo: 1,
  schema: 2,
  chiama: 2,
  guarda: 1,
  aspetta: 1,
}

async function principale () {
  const { liberi, campi, grezzo, corpo, aiuto, aspetta: opzioneAspetta } =
    analizza(process.argv.slice(2))
  const comando = liberi[0]

  if (aiuto || !comando) {
    scriviDati(t.aiuto(COMANDO))
    return 0
  }
  if (comando === 'chiedi') {
    scriviErrore(SENZA_CHIEDI)
    return USCITA_RIFIUTO
  }
  if (!Object.hasOwn(PAROLE, comando)) {
    scriviErrore(t.nonSo(comando))
    return USCITA_RIFIUTO
  }

  // Gli errori d'uso prima di collegarsi, così non diventano «condotto spento».
  if ((comando === 'schema' || comando === 'chiama') && !liberi[1]) {
    throw new ErroreUso(t.serveIlNome(COMANDO, comando))
  }
  if (liberi.length > PAROLE[comando]) {
    throw new ErroreUso(
      t.paroleInPiù(liberi.slice(0, PAROLE[comando]).join(' '), liberi.slice(PAROLE[comando]).join(' ')) +
      (comando === 'chiama' ? t.valoriDopoIlCampo : t.lAiuto(COMANDO)),
    )
  }

  const deveAspettare = opzioneAspetta || comando === 'aspetta'

  let presa
  try {
    presa = await collega({ aspetta: deveAspettare })
  } catch (male) {
    if (male instanceof CondottoMaiAcceso) {
      scriviErrore(maiAcceso())
      return USCITA_MUTO
    }
    return muto()
  }

  // La chiave dopo il collegamento: con `--aspetta` il registro la scrive
  // accendendosi, prima di ascoltare.
  const chiave = leggiChiave()
  if (!chiave) {
    presa.destroy()
    scriviErrore(t.mancaChiave(fileDellaChiave()))
    return USCITA_MUTO
  }

  const condotto = conversazione(presa)
  const presentazione = await presentati(condotto, chiave)
  if (presentazione.esito !== 'riconosciuto') {
    condotto.chiudi()
    if (presentazione.esito === 'muto') return muto()
    if (process.platform === 'win32' && presentazione.esito === 'impostore') {
      const dove = indirizzo()
      if (dove && !verificaProprietarioPipe(dove)) {
        scriviErrore(t.impostore)
        return USCITA_MUTO
      }
    }
    scriviErrore(presentazione.esito === 'rifiutato' ? t.chiaveRifiutata : t.impostore)
    return USCITA_MUTO
  }

  const opzioniContesto = {
    COMANDO,
    USCITA_RIFIUTO,
    USCITA_MUTO,
    muto,
    raccontaGuasto,
    scriviDati,
    scriviErrore,
  }

  try {
    if (comando === 'elenco') return await comandoElenco(condotto, grezzo, opzioniContesto)
    if (comando === 'schema') return await comandoSchema(condotto, liberi[1], grezzo, opzioniContesto)
    if (comando === 'stato') return await comandoStato(condotto, grezzo, opzioniContesto)
    if (comando === 'catalogo') return await comandoCatalogo(condotto, opzioniContesto)
    if (comando === 'guarda') return await comandoGuarda(condotto, grezzo, opzioniContesto)
    if (comando === 'aspetta') return await comandoAspetta(condotto, grezzo, opzioniContesto)
    return await comandoChiama(condotto, liberi[1], campi, corpo, grezzo, opzioniContesto)
  } finally {
    condotto.chiudi()
  }
}

/**
 * Vero se questo file è il programma lanciato e non un modulo importato.
 */
function lanciato () {
  try {
    const avviato = process.argv[1]
    if (!avviato) return true
    return pathToFileURL(realpathSync(avviato)).href === import.meta.url
  } catch {
    return true
  }
}

if (lanciato()) {
  principale()
    .then((uscita) => {
      process.exitCode = uscita
    })
    .catch((male) => {
      if (male instanceof ErroreUso) {
        scriviErrore(male.message)
        process.exitCode = USCITA_RIFIUTO
        return
      }
      scriviErrore(t.storto(male instanceof Error ? male.message : String(male)))
      process.exitCode = USCITA_RIFIUTO
    })
}
