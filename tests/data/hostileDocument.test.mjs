// Un `.regi` ricevuto da fuori non è fidato: chi l'ha fatto può aver scritto
// nomi di voce che risalgono le cartelle o misure gonfiate apposta.
//
//   voce `archivio/../../x.txt`     lasciata fuori, niente scritto fuori dalle copie
//   copia chiesta con `..`          resta sotto la cartella delle copie
//   voce che dichiara 300 MB        il documento si rifiuta prima di decomprimere
//   tante voci da un gigabyte       idem: la somma non sta nella misura del file

import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import { ErrorePacchetto, MANIFESTO, Pacchetto } from '../../dist-tests/package.mjs'
import { Deposito } from '../../dist-tests/store.mjs'
import { assembla, comprimi } from '../../dist-tests/zip.mjs'

const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-ostile-'))
after(() => rmSync(cartella, { recursive: true, force: true }))

const testo = (valore) => new TextEncoder().encode(valore)
const MB = 1024 * 1024
let contatore = 0

/** Un documento con il manifesto giusto e le voci date, già pronte. */
function documento (pronte) {
  const manifesto = comprimi({
    nome: MANIFESTO,
    dati: testo(JSON.stringify({ formato: 'registro-docenti/anno', versione: 2 })),
  })
  contatore += 1
  const file = percorso.join(cartella, `ostile-${contatore}.regi`)
  writeFileSync(file, assembla([manifesto, ...pronte]))
  return file
}

/** Una voce che dichiara di misurare `originale` byte, senza averli. */
function gonfiata (nome, originale) {
  return { ...comprimi({ nome, dati: testo('{}') }), originale }
}

/** Tutti i file sotto una cartella, con il percorso relativo. */
function tutti (radice, dentro = '') {
  return readdirSync(percorso.join(radice, dentro), { withFileTypes: true }).flatMap((voce) => {
    const relativo = percorso.join(dentro, voce.name)
    return voce.isDirectory() ? tutti(radice, relativo) : [relativo]
  })
}

describe('un documento ostile', () => {
  it('una voce che risale le cartelle non entra, e niente si scrive fuori', async () => {
    const maligne = [
      'archivio/x/../../../../../../fuori.txt',
      'archivio\\..\\..\\fuori.txt',
      '/assoluta.txt',
      'archivio/C:/fuori.txt',
    ]
    const file = documento([
      comprimi({ nome: 'archivio/buono.pdf', dati: testo('%PDF-1.7') }),
      ...maligne.map((nome) => comprimi({ nome, dati: testo('preso') })),
    ])
    // La cartella dell'utente dentro quella della prova: sei `..` dalla voce
    // arriverebbero qui, dove la prova guarda.
    const sotto = percorso.join(cartella, `utente-${contatore}`)

    const pacchetto = await Pacchetto.apri(Uri.file(file))
    assert.deepEqual(pacchetto.nomi(), ['archivio/buono.pdf'])

    const deposito = new Deposito(() => pacchetto, Uri.file(sotto))
    assert.ok(await deposito.materializza('archivio/buono.pdf'))
    for (const nome of maligne) {
      assert.equal(await deposito.materializza(nome), null, nome)
      await deposito.smaterializza(nome)
    }
    deposito.eliminaSotto('archivio')
    await deposito.inFila(async () => undefined)

    const presi = tutti(cartella).filter((nome) => /(fuori|assoluta)\.txt$/.test(nome))
    assert.deepEqual(presi, [])
  })

  it('il percorso di una copia resta sotto la cartella delle copie', async () => {
    const pacchetto = await Pacchetto.apri(Uri.file(percorso.join(cartella, 'vuoto.regi')))
    const deposito = new Deposito(() => pacchetto, Uri.file(percorso.join(cartella, 'copie')))
    const radice = deposito.radice().path
    // `percorsoCopia` è privato solo per TypeScript: chi la chiama oggi ripulisce
    // prima, questa è la seconda guardia.
    for (const dentro of ['a/../../../..', '..\\..\\x', 'b/./../../y']) {
      const dove = deposito.percorsoCopia(dentro).path
      assert.ok(dove === radice || dove.startsWith(`${radice}/`), `${dentro} → ${dove}`)
    }
  })

  it('una collezione che dichiara 300 MB rifiuta il documento', async () => {
    const file = documento([gonfiata('data/classi.json', 300 * MB)])
    await assert.rejects(Pacchetto.apri(Uri.file(file)), (errore) => {
      assert.ok(errore instanceof ErrorePacchetto)
      assert.match(errore.message, /data\/classi\.json/)
      return true
    })
  })

  it('tante voci da quasi un gigabyte in un file piccolo rifiutano il documento', async () => {
    const file = documento(
      [1, 2, 3].map((n) => gonfiata(`archivio/bomba-${n}.pdf`, 1000 * MB)),
    )
    await assert.rejects(Pacchetto.apri(Uri.file(file)), ErrorePacchetto)
  })

  it('un documento normale si apre come prima', async () => {
    const file = documento([
      comprimi({ nome: 'data/classi.json', dati: testo('[]') }),
      comprimi({ nome: '.storico/classi.2026-09-01-08-30.json', dati: testo('[]') }),
    ])
    const pacchetto = await Pacchetto.apri(Uri.file(file))
    assert.deepEqual(pacchetto.nomi().sort(), ['.storico/classi.2026-09-01-08-30.json', 'data/classi.json'])
  })
})
