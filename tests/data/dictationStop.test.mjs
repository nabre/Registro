// Fermare una dettatura in corso, come fa chi spegne il registro.
//
// `whisper-cli` è un programma a parte, e una frase su un modello grande può
// tenerlo occupato per tutta l'attesa dichiarata. Senza un segnale, chi spegne
// l'applicazione doveva aspettarlo o lasciarlo girare — e con lui restava sul
// disco il WAV della voce. Qui si fa partire, al posto di whisper, un programma
// che non finisce mai da sé, e si guarda che `fermaDettature()` lo fermi, che
// l'errore dica «fermata» e non «scaduta», e che la cartella della voce sparisca.
//
// Il programma che non finisce è `cmd.exe`: agli argomenti di whisper non
// risponde con un errore, resta ad aspettare comandi sullo standard input — che
// `execFile` tiene aperto. Per questo la prova gira solo su Windows, che è dove
// il registro gira.

import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { describe, it } from 'node:test'

import { importaSorgente } from './bundleDiProva.mjs'

// In un bundle solo: `fermaDettature` si prende da `dictation.ts`, che è la
// faccia da cui la chiamerà lo spegnimento, e il motore da `whisper.ts`. Due
// bundle separati avrebbero due segnali diversi.
const { WHISPER, fermaDettature } = await importaSorgente(
  "export { WHISPER } from './src/data/whisper.ts'\n" +
    "export { fermaDettature } from './src/data/dictation.ts'\n",
)

const suWindows = process.platform === 'win32'

/** Le cartelle della voce che ci sono adesso in `%TEMP%`. */
function cartelleVoce () {
  return new Set(readdirSync(tmpdir()).filter((nome) => nome.startsWith('registro-voce-')))
}

describe('fermaDettature', { skip: suWindows ? false : 'serve cmd.exe' }, () => {
  it('ferma la trascrizione in corso e cancella la voce', async () => {
    const prima = cartelleVoce()
    const collegamento = {
      programma: process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe',
      modello: 'nessuno.bin',
      lingua: 'it',
      attesaMs: 60_000,
      suggerimento: '',
    }
    const registrazione = { campioni: new Int16Array(16_000), frequenza: 16_000 }

    const inizio = Date.now()
    const trascrizione = WHISPER.trascrivi(collegamento, registrazione)
    setTimeout(() => fermaDettature(), 300)

    await assert.rejects(trascrizione, /fermata/)
    assert.ok(Date.now() - inizio < 10_000, 'non si è fermata: è arrivata a scadenza')
    const nuove = [...cartelleVoce()].filter((nome) => !prima.has(nome))
    assert.deepEqual(nuove, [], 'la cartella della voce è rimasta')
  })

  it('dopo averla fermata, la dettatura dopo parte con un segnale nuovo', async () => {
    fermaDettature()
    const collegamento = {
      programma: process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe',
      modello: 'nessuno.bin',
      lingua: 'it',
      attesaMs: 1_500,
      suggerimento: '',
    }
    const registrazione = { campioni: new Int16Array(16_000), frequenza: 16_000 }
    // Con un segnale già tirato morirebbe subito con «fermata»; con quello
    // nuovo arriva fino alla sua scadenza.
    await assert.rejects(WHISPER.trascrivi(collegamento, registrazione), /non ha finito entro/)
  })
})
