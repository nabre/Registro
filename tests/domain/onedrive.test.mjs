import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  cartelleSincronizzate,
  oneDriveSulComputer,
  èRegi,
  ordinaVoci,
  percorsoDaGraph,
  voceDaGraph,
} from '../../dist-tests/domain.mjs'

describe('onedrive: riconoscimento file e percorsi', () => {
  it('riconosce i documenti con estensione .regi', () => {
    assert.equal(èRegi('2026-2027.regi'), true)
    assert.equal(èRegi(' documento.REGI '), true)
    assert.equal(èRegi('documento.pdf'), false)
    assert.equal(èRegi(''), false)
  })

  it('ricava il percorso dalle risposte di Graph', () => {
    assert.deepEqual(percorsoDaGraph(undefined), [])
    assert.deepEqual(percorsoDaGraph('senza-due-punti'), [])
    assert.deepEqual(percorsoDaGraph('/drive/root:'), [])
    assert.deepEqual(percorsoDaGraph('/drive/root:/Scuola/Anno%201'), ['Scuola', 'Anno 1'])
  })

  it('estrae una voce valida da un elemento Graph', () => {
    assert.equal(voceDaGraph({ name: 'test.pdf', file: {} }), null)
    assert.equal(voceDaGraph({ name: '', id: '1' }), null)

    const cartella = voceDaGraph({
      id: 'cart-1',
      name: 'Classe 1A',
      folder: { childCount: 3 },
      parentReference: { driveId: 'drv-1', path: '/drive/root:/Scuola' },
    })
    assert.ok(cartella)
    assert.equal(cartella.genere, 'cartella')
    assert.equal(cartella.figli, 3)
    assert.deepEqual(cartella.percorso, ['Scuola'])

    const file = voceDaGraph({
      id: 'file-1',
      name: 'registro.regi',
      size: 1024,
      file: {},
      parentReference: { driveId: 'drv-1', path: '/drive/root:' },
    })
    assert.ok(file)
    assert.equal(file.genere, 'regi')
    assert.equal(file.dimensione, 1024)
    assert.deepEqual(file.percorso, [])
  })

  it('ordina le voci mettendo prima le cartelle e poi i documenti', () => {
    const voci = [
      { id: '1', drive: 'd', nome: 'Zeta.regi', genere: 'regi', dimensione: 10, modificato: '', percorso: [], figli: null },
      { id: '2', drive: 'd', nome: 'Beta', genere: 'cartella', dimensione: 0, modificato: '', percorso: [], figli: 2 },
      { id: '3', drive: 'd', nome: 'Alfa', genere: 'cartella', dimensione: 0, modificato: '', percorso: [], figli: 1 },
      { id: '4', drive: 'd', nome: 'Alfa.regi', genere: 'regi', dimensione: 10, modificato: '', percorso: [], figli: null },
    ]
    const ordinate = ordinaVoci(voci)
    assert.deepEqual(ordinate.map((v) => v.nome), ['Alfa', 'Beta', 'Alfa.regi', 'Zeta.regi'])
  })

  it('estrae le cartelle sincronizzate dal registro di sistema per l account cercato', () => {
    const outputReg = `
HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business1
    UserEmail    REG_SZ    docente@scuola.ch
    UserFolder   REG_SZ    C:\\Users\\Docente\\OneDrive - Scuola

HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Personal
    UserEmail    REG_SZ    personale@email.com
    UserFolder   REG_SZ    C:\\Users\\Docente\\OneDrive
`
    assert.deepEqual(cartelleSincronizzate(outputReg, 'docente@scuola.ch'), ['C:\\Users\\Docente\\OneDrive - Scuola'])
    assert.deepEqual(cartelleSincronizzate(outputReg, 'DOCENTE@scuola.ch'), ['C:\\Users\\Docente\\OneDrive - Scuola'])
    assert.deepEqual(cartelleSincronizzate(outputReg, 'altro@scuola.ch'), [])
  })

  it('legge dal registro anche nome e librerie condivise sincronizzate', () => {
    const outputReg = [
      'HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business2',
      '    UserEmail    REG_SZ    vxg000@edu.ti.ch',
      '    UserName    REG_SZ    Rossi Maria',
      '    UserFolder    REG_SZ    D:\\OneDrive - edu.ti.ch',
      '',
      'HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business2\\Tenants\\edu.ti.ch',
      '    D:\\edu.ti.ch\\Classe - General    REG_DWORD    0x841',
      '',
      'HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business2\\Tenants\\OneDrive - edu.ti.ch',
      '    D:\\OneDrive - edu.ti.ch    REG_DWORD    0x841',
      '',
      'HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\Business1',
      '    LastSignInTime    REG_QWORD    0x0',
    ].join('\r\n')
    assert.deepEqual(oneDriveSulComputer(outputReg), [{
      indirizzo: 'vxg000@edu.ti.ch',
      nome: 'Rossi Maria',
      cartelle: ['D:\\OneDrive - edu.ti.ch', 'D:\\edu.ti.ch\\Classe - General'],
    }])
  })
})
