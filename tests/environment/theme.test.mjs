// Il tema: chiaro, scuro, o come il sistema. Si prova la catena, non i colori:
// `aspetto.tema` → `nativeTheme.themeSource` → `prefers-color-scheme` (il terzo
// anello è di Electron). E il colore di fondo delle finestre, scritto sia in
// CSS sia in `theme.ts`: la seconda copia cambia quando deve.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-tema-'))

const { bancoElectron, nativeTheme, BrowserWindow } = await import('../helpers/fake-electron.mjs')
const { applicaTema, coloreSfondo, osservaTema, ricaricaImpostazioni, scuro, impostazioni } =
  await import('../../dist-tests/environment.mjs')

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')
const CHIAVE = 'registroDocenti.aspetto.tema'

/** Scrive il file delle impostazioni come lo troverebbe l'applicazione all'avvio. */
function scritte (valori) {
  writeFileSync(FILE, JSON.stringify(valori), 'utf8')
  ricaricaImpostazioni()
}

beforeEach(() => {
  scritte({})
  bancoElectron.sistemaScuro = false
  bancoElectron.ascoltatoriTema.length = 0
  nativeTheme.themeSource = 'system'
})

describe('l’impostazione del tema arriva a nativeTheme', () => {
  it('senza niente scritto segue il sistema', () => {
    applicaTema()

    assert.equal(nativeTheme.themeSource, 'system')
  })

  it('«chiaro» e «scuro» comandano, e non chiedono niente al sistema', () => {
    scritte({ [CHIAVE]: 'scuro' })
    applicaTema()
    assert.equal(nativeTheme.themeSource, 'dark')
    assert.equal(scuro(), true)

    scritte({ [CHIAVE]: 'chiaro' })
    applicaTema()
    assert.equal(nativeTheme.themeSource, 'light')
    assert.equal(scuro(), false)
  })

  it('«sistema» lo lascia decidere al sistema, e cambia con lui', () => {
    scritte({ [CHIAVE]: 'sistema' })
    applicaTema()

    bancoElectron.sistemaScuro = true
    assert.equal(scuro(), true)

    bancoElectron.sistemaScuro = false
    assert.equal(scuro(), false)
  })

  it('un valore che non esiste non spegne il tema: si torna al sistema', () => {
    scritte({ [CHIAVE]: 'seppia' })
    applicaTema()

    assert.equal(nativeTheme.themeSource, 'system')
  })
})

describe('il colore di fondo segue il tema', () => {
  it('sono due colori diversi, e quello scuro è scuro davvero', () => {
    scritte({ [CHIAVE]: 'chiaro' })
    applicaTema()
    const chiaro = coloreSfondo()

    scritte({ [CHIAVE]: 'scuro' })
    applicaTema()
    const buio = coloreSfondo()

    assert.notEqual(chiaro, buio)
    // La somma delle tre componenti: un fondo scuro sta molto sotto la metà.
    const luce = (colore) =>
      [1, 3, 5].reduce((somma, dove) => somma + parseInt(colore.slice(dove, dove + 2), 16), 0)
    assert.ok(luce(buio) < 3 * 128, `${buio} non è un fondo scuro`)
    assert.ok(luce(chiaro) > 3 * 128, `${chiaro} non è un fondo chiaro`)
  })

  it('le finestre già aperte lo rifanno quando il tema gira', () => {
    scritte({ [CHIAVE]: 'chiaro' })
    applicaTema()
    const finestra = new BrowserWindow({ backgroundColor: coloreSfondo() })
    const iscrizione = osservaTema()

    scritte({ [CHIAVE]: 'scuro' })
    applicaTema()
    // È `nativeTheme` a dire «sono cambiato»: nel finto lo si dice a mano.
    for (const voce of bancoElectron.ascoltatoriTema) {
      if (voce.nome === 'updated') voce.ascoltatore()
    }

    assert.equal(finestra.sfondo, coloreSfondo())
    iscrizione.dispose()
    finestra.close()
  })

  it('cambiare l’impostazione basta: non serve riavviare', () => {
    scritte({ [CHIAVE]: 'chiaro' })
    applicaTema()
    const iscrizione = osservaTema()

    // Da `update`, come la finestra delle impostazioni: fa scattare
    // `onDidChangeConfiguration`, che `osservaTema` ascolta.
    void impostazioni.leggi().update(CHIAVE, 'scuro')

    assert.equal(nativeTheme.themeSource, 'dark')
    iscrizione.dispose()
  })
})
