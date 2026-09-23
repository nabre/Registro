// Le pagine di un PDF si archiviano una volta sola.
//
// Il controllo sui numeri — da 1 al numero di pagine — lasciava passare una
// pagina già archiviata: esce dalle letture, ma resta dentro il PDF. Trascinare
// due volte la stessa selezione su due persone archiviava le stesse pagine per
// tutte e due, cioè il documento di un minore nel fascicolo di un altro.
//
// Accanto, la quarantena: due PDF con lo stesso nome arrivati nello stesso
// secondo prendevano lo stesso percorso, e il secondo copriva il primo.
//
// Gira su `dist-tests/data.mjs` come `sorting.test.mjs`, e con lo stesso
// contesto finto: un grafo solo, un deposito solo.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-giro7-smistamento-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let moduli
let archivio
let classe
let consegna

/** Un PDF di classe: una pagina per persona, con il nome in testa. */
async function pagelle (nomi) {
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (const nome of nomi) {
    const pagina = documento.addPage([595, 842])
    pagina.drawText(`Allievo: ${nome}`, { x: 60, y: 740, size: 12, font })
  }
  return documento.save()
}

/** L'azione, chiamata come la chiama il centralino. */
function esegui (azione) {
  const contesto = {
    archivio,
    registro: archivio.registro,
    modifica: (cambia, collezioni) => {
      archivio.modifica(cambia, collezioni)
      return { ok: true, errori: [] }
    },
  }
  return moduli.smistamento[azione.tipo](contesto, azione)
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  moduli = await import('../../dist-tests/data.mjs')
  const { Archivio, registraDeposito, Uri, impostaCaratteri, impostaWorker } = moduli
  const dominio = await import('../../dist-tests/domain.mjs')
  impostaWorker(
    pathToFileURL(fileURLToPath(new URL('../../dist-tests/pdf.worker.mjs', import.meta.url))).href,
  )
  impostaCaratteri(fileURLToPath(new URL('../../dist-tests/pdf-fonts', import.meta.url)))

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    dominio.creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )

  const annoId = archivio.registro.anni[0].id
  const materia = dominio.creaMateria('Matematica', 'MAT')
  classe = dominio.creaClasse(annoId, 'DIC4a')
  classe.allievi = [dominio.creaAllievo('Rossi', 'Mario'), dominio.creaAllievo('Bianchi', 'Luca')]
  const corso = dominio.creaCorso(classe.id, materia.id, 'DIC4a — Matematica')
  consegna = dominio.creaConsegna(corso.id, 'Pagella 3° anno', '2026-10-01')
  consegna.documento = 'modulo'

  archivio.modifica((r) => {
    r.materie.push(materia)
    r.classi.push(classe)
    r.corsi.push(corso)
    r.consegne.push(consegna)
  }, ['classi', 'corsi', 'consegne'])
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
