// Le tinte dei tipi di attività hanno una sola fonte, la lista: il colore è un
// dato della voce (`coloreDiVoce`) e arriva a ogni riga come variabile
// scritta sull'elemento. La prova legge i fogli di stile e impedisce le regole
// per valore, che vincerebbero in silenzio sul colore scelto in Impostazioni.

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const CARTELLA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'ui', 'styles')

/** I valori dei tipi di fabbrica, più `docenza`, che nessuna regola deve nominare. */
const TIPI = [
  'introduzione', 'spiegazione', 'esercizio', 'laboratorio', 'discussione', 'gruppo',
  'verifica', 'ripasso', 'compito', 'docenza', 'docenza-di-classe', 'altro',
]

describe('le tinte dei tipi di attività', () => {
  const fogli = readdirSync(CARTELLA).filter((nome) => nome.endsWith('.css'))

  it('nessun foglio colora per `data-tipo`', () => {
    assert.ok(fogli.length > 0)
    for (const nome of fogli) {
      const testo = readFileSync(join(CARTELLA, nome), 'utf8')
      assert.doesNotMatch(testo, /\[data-tipo\b/, `${nome} sceglie ancora la tinta per valore`)
    }
  })

  it('nessun foglio ha una regola per valore di tipo, sotto altro nome', () => {
    // Anche con un altro selettore (`[data-attivita='esercizio']`,
    // `.tappa--laboratorio`) sarebbe una regola per valore.
    const nomi = TIPI.join('|')
    const perValore = new RegExp(
      `\\[data-[a-z-]+=['"]?(${nomi})['"]?\\]|\\.(tappa|attivita-riga)--(${nomi})\\b`,
    )
    for (const nome of fogli) {
      const testo = readFileSync(join(CARTELLA, nome), 'utf8')
      assert.doesNotMatch(testo, perValore, `${nome} sceglie ancora la tinta per valore`)
    }
  })
})
