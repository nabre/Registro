// La barra dei menu sta solo sui pannelli. Le finestre di servizio (messaggi e
// domande, benvenuto, impostazioni, lettore) e lo schermo della classe non la
// portano: né quella predefinita di Electron, che all'avvio arriva prima del
// menu nostro, né quella del registro, che `Menu.setApplicationMenu` rimette a
// ogni finestra. E portano la barra del titolo del pannello, non quella di sistema.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

import { bancoElectron, finestreCostruite, nativeTheme } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const DATI = mkdtempSync(percorso.join(tmpdir(), 'registro-barra-menu-'))
process.env.REGISTRO_USERDATA = DATI
process.env.REGISTRO_APPPATH = percorso.join(DATI, 'app', 'dist')
after(() => rmSync(DATI, { recursive: true, force: true }))

// Un bundle solo: il tema deve ricordare le stesse finestre che il menu ripulisce.
const { installaMenu, mostraBenvenuto, mostraDocumento, osservaTema, comandi, dialoghi, finestre, ViewColumn, Uri } =
  await importaSorgente(`export { installaMenu } from './desktop/shell/windows/menu.ts'
export { mostraBenvenuto } from './desktop/shell/windows/welcome.ts'
export { mostraDocumento } from './desktop/shell/windows/reader.ts'
export { osservaTema } from './desktop/apparato/theme.ts'
export { comandi, dialoghi, finestre, ViewColumn, Uri } from 'apparato'
`)

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
})

/** La finestra nata durante `apri`. */
function nataDa (apri) {
  const primo = finestreCostruite.length
  void apri()
  return finestreCostruite[primo]
}

/** Le quattro finestre di servizio, aperte una dopo l'altra. */
function finestreDiServizio () {
  return {
    // Modale: col pannello aperto un messaggio senza bottoni sarebbe una nuvoletta.
    messaggio: nataDa(() => dialoghi.errore('Regiklass: non riesco a scrivere.', { modal: true })),
    benvenuto: nataDa(() => mostraBenvenuto({ scegliDocumento: async () => null })),
    impostazioni: nataDa(() => comandi.esegui('registroDocenti.impostazioniFinestra')),
    lettore: nataDa(() => mostraDocumento(Uri.file(percorso.join(DATI, 'a.pdf')), 'a.pdf')),
  }
}

describe('la barra dei menu', () => {
  it('le finestre di servizio nascono senza, anche col menu predefinito di Electron', () => {
    installaMenu({ apriDocumento: async () => {} })
    for (const [nome, finestra] of Object.entries(finestreDiServizio())) {
      assert.ok(finestra, `${nome}: la finestra è nata`)
      assert.equal(finestra.conMenu, false, `${nome} ha la barra dei menu`)
    }
  })

  it('ridisegnare il menu non gliela rimette, e al pannello sì', () => {
    const pannello = nataDa(() => finestre.crea('registroDocenti.pannello', 'Registro', ViewColumn.One, {}))
    const proiezione = nataDa(() => finestre.crea('registroDocenti.proiezione', 'Proiezione', ViewColumn.Beside, {}))
    const servizio = finestreDiServizio()
    // Il menu si ridisegna a ogni cambio di lingua o di recenti: è la stessa chiamata.
    installaMenu({ apriDocumento: async () => {} })
    assert.equal(pannello.conMenu, true, 'il pannello ha perso il menu')
    assert.equal(proiezione.conMenu, false, 'lo schermo della classe ha la barra dei menu')
    for (const [nome, finestra] of Object.entries(servizio)) {
      assert.equal(finestra.conMenu, false, `${nome} ha ripreso la barra dei menu`)
    }
  })
})

describe('la barra del titolo', () => {
  const mac = process.platform === 'darwin'

  it('le finestre di servizio la disegnano da sé, come il pannello', () => {
    const pannello = nataDa(() => finestre.crea('registroDocenti.pannello', 'Registro', ViewColumn.One, {}))
    for (const [nome, finestra] of Object.entries(finestreDiServizio())) {
      for (const opzione of ['titleBarStyle', 'titleBarOverlay', 'trafficLightPosition']) {
        assert.deepEqual(finestra.opzioni[opzione], pannello.opzioni[opzione], `${nome}: ${opzione}`)
      }
      assert.ok(finestra.opzioni.titleBarStyle, `${nome} ha la cornice di sistema`)
      // La pagina sa di doversi disegnare la barra, e dove stanno i pulsanti.
      const indirizzo = new URL(finestra.caricati.at(-1))
      assert.equal(indirizzo.searchParams.get('cornice'), process.platform, nome)
    }
  })

  it('il lettore mette il PDF nella sua pagina, con il nome', () => {
    const { lettore } = finestreDiServizio()
    const indirizzo = new URL(lettore.caricati.at(-1))
    assert.equal(`${indirizzo.protocol}//${indirizzo.host}${indirizzo.pathname}`, 'registro://app/dist/reader.html')
    assert.match(indirizzo.searchParams.get('file'), /^registro:\/\/dati\/.*a\.pdf$/)
    assert.equal(indirizzo.searchParams.get('titolo'), 'a.pdf')
  })

  it('al cambio di tema i pulsanti di sistema cambiano colore', { skip: mac && 'su macOS ci sono i semafori' }, () => {
    const servizio = finestreDiServizio()
    const smaltitore = osservaTema()
    try {
      const prima = servizio.benvenuto.opzioni.titleBarOverlay.color
      bancoElectron.sistemaScuro = true
      nativeTheme.themeSource = 'system'
      for (const voce of bancoElectron.ascoltatoriTema) if (voce.nome === 'updated') voce.ascoltatore()
      for (const [nome, finestra] of Object.entries(servizio)) {
        assert.ok(finestra.fascia, `${nome}: fascia non ridipinta`)
        assert.notEqual(finestra.fascia.color, prima, nome)
      }
    } finally {
      bancoElectron.sistemaScuro = false
      smaltitore.dispose()
    }
  })
})
