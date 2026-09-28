// Le pagine di un PDF si archiviano una volta sola: una pagina già archiviata
// esce dalle letture ma resta nel PDF, e non si archivia per una seconda
// persona.
//
// E la quarantena: due PDF con lo stesso nome nello stesso secondo prendono
// percorsi diversi.
//
// Gira su `dist-tests/data.mjs` come `sorting.test.mjs`: un grafo, un
// deposito.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { PDFDocument } from '@cantoo/pdf-lib'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'
import { archivioDiSmistamento, eseguiAzione, pagelle as pagelleDiClasse } from '../helpers/smistamento.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-smistamento-corse-')

after(() => smonta(radice))

let moduli
let archivio
let classe
let consegna

/** Un PDF di classe con il solo nome su ogni pagina. */
const pagelle = (nomi) => pagelleDiClasse(nomi, { titolo: null })

/** L'azione, chiamata come la chiama il centralino. */
const esegui = (azione) => eseguiAzione(archivio, moduli.smistamento, azione)

before(async () => {
  ;({ moduli, archivio, classe, consegna } = await archivioDiSmistamento({ lavoro, dati }))
})

after(() => archivio?.dispose())

describe('la stessa selezione trascinata due volte', () => {
  it('la seconda volta si rifiuta, e l’altra persona resta senza documento', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca', 'Verdi Anna'])
    const entrato = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'scansione.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'mano' },
    })
    assert.ok(entrato.ok, `rilascio rifiutato: ${JSON.stringify(entrato.errori)}`)
    const smistamentoId = archivio.registro.smistamenti[0].id
    const [rossi, bianchi] = classe.allievi

    const prima = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId,
      consegnaId: consegna.id,
      allievoId: rossi.id,
      pagine: [1],
    })
    assert.ok(prima.ok, `assegnazione rifiutata: ${JSON.stringify(prima.errori)}`)

    // La stessa pagina, un attimo dopo, sulla casella di un altro.
    const seconda = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId,
      consegnaId: consegna.id,
      allievoId: bianchi.id,
      pagine: [1],
    })
    assert.equal(seconda.ok, false, 'la stessa pagina è stata archiviata per due persone')
    assert.match(seconda.errori.join(' '), /non più da smistare/)

    const sua = archivio.registro.consegne.find((c) => c.id === consegna.id)
    assert.equal(
      (sua.documenti ?? []).some((d) => d.allievoId === bianchi.id),
      false,
      'il foglio di una persona è finito nel fascicolo di un’altra',
    )
    const suo = archivio.registro.smistamenti.find((s) => s.id === smistamentoId)
    assert.deepEqual(suo.letture.map((l) => l.numero), [2, 3], 'le pagine in ballo sono cambiate')
  })
})

describe('due PDF con lo stesso nome nello stesso secondo', () => {
  it('finiscono in quarantena tutti e due, uno accanto all’altro', async () => {
    const primo = await pagelle(['Rossi Mario'])
    const secondo = await pagelle(['Bianchi Luca', 'Rossi Mario'])
    // Nello stesso secondo: il prefisso della quarantena va al secondo.
    const smistatore = moduli.smistatoreDi(archivio)
    await Promise.all([
      smistatore.smista(primo, 'Scansione.pdf', consegna.id, '', { modo: 'mano' }),
      smistatore.smista(secondo, 'Scansione.pdf', consegna.id, '', { modo: 'mano' }),
    ])

    const nostri = archivio.registro.smistamenti.filter((s) => s.nome === 'Scansione.pdf')
    assert.equal(nostri.length, 2)
    const file = nostri.map((s) => s.file)
    assert.notEqual(file[0], file[1], `due smistamenti puntano allo stesso file: ${file[0]}`)
    const pagine = nostri
      .map((s) => PDFDocument.load(moduli.deposito().leggi(s.file)).then((d) => d.getPageCount()))
    assert.deepEqual((await Promise.all(pagine)).sort(), [1, 2], 'uno dei due PDF ha coperto l’altro')
  })
})
