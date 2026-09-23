// Tutto l'anno dentro il documento: il giro intero.
//
// Le altre prove dei dati guardano un pezzo per volta. Questa mette in piedi un
// anno come lo trova il registro di un docente — le cartelle sul disco, con
// dentro i PDF — e verifica le tre cose che contano quando si sposta tutto
// dentro un file solo:
//
//   1. i documenti entrano e si rileggono interi;
//   2. le cartelle di prima se ne vanno, tranne quelle che sono porte verso
//      l'esterno: nella cassetta si trascinano i file, e in un archivio non si
//      trascina niente;
//   3. archiviare un documento è una modifica come le altre — si salva da solo,
//      senza aspettare che cambi anche una lezione.
//
// Gira su `dist-tests/data.mjs`, che è lo strato dei dati in un grafo solo: con
// bundle separati l'anno in uso e il deposito sarebbero due, e la prova
// guarderebbe due registri che non si conoscono.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-ingloba-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let moduli
let archivio

/** Byte che nessuna codifica di testo sopravviverebbe. */
function finoPdf (quanti = 2048) {
  const dati = Buffer.alloc(quanti)
  for (let n = 0; n < quanti; n += 1) dati[n] = (n * 13) % 256
  Buffer.from('%PDF-1.7\n', 'latin1').copy(dati, 0)
  return dati
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  moduli = await import('../../dist-tests/data.mjs')
  const { Archivio, registraDeposito, Uri } = moduli
  const { creaAnno } = await import('../../dist-tests/domain.mjs')

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
})

describe('tutto dentro il documento', () => {
  it('archiviare un documento lo mette nel file, e lo salva da sé', async () => {
    const { archivia } = moduli
    const pdf = finoPdf()
    const esito = await archivia('archivio/Calcolo/DIC4a/classe/DIC4a_Verifica 1.pdf', pdf)

    assert.ok('relativo' in esito, `archiviazione fallita: ${JSON.stringify(esito)}`)
    // Nessuna collezione è cambiata: se il salvataggio guardasse solo quelle,
    // questo PDF resterebbe in memoria fino alla prossima lezione battuta.
    await archivio.salva()

    const documento = percorso.join(dati, `${archivio.cartellaCorrente}.registro`)
    const { leggiZip } = await import('../../dist-tests/zip.mjs')
    const dentro = leggiZip(readFileSync(documento))
    const voce = dentro.find((v) => v.nome === esito.relativo)
    assert.ok(voce, `il PDF non è nel documento: ${dentro.map((v) => v.nome).join(', ')}`)
    assert.equal(Buffer.compare(Buffer.from(voce.dati), pdf), 0, 'il PDF è tornato diverso')
  })

  it('inglobare porta dentro le cartelle e lascia fuori la cassetta', async () => {
    const anno = percorso.join(dati, archivio.cartellaCorrente)
    // Un anno com'era: i documenti in cartelle vere, e la cassetta con dentro
    // un PDF ancora da smistare.
    for (const [dove, nome] of [
      ['archivio/Calcolo/DIC4a/allievi/Rossi Maria', 'DIC4a_Pagella.pdf'],
      ['esportazioni/Calcolo/DIC4a/classe', 'DIC4a_Medie.pdf'],
      ['assenze/classe-1', 'foglio.pdf'],
      ['in-arrivo/DIC4a — Pagella', 'appena arrivato.pdf'],
    ]) {
      mkdirSync(percorso.join(anno, dove), { recursive: true })
      writeFileSync(percorso.join(anno, dove, nome), finoPdf(512))
    }

    const entrati = await moduli.inglobaCartelle(archivio)
    assert.equal(entrati, 3, 'dovevano entrare i tre documenti, non quello nella cassetta')

    const { deposito } = moduli
    assert.equal(deposito().esiste('archivio/Calcolo/DIC4a/allievi/Rossi Maria/DIC4a_Pagella.pdf'), true)
    assert.equal(deposito().esiste('esportazioni/Calcolo/DIC4a/classe/DIC4a_Medie.pdf'), true)
    assert.equal(deposito().esiste('assenze/classe-1/foglio.pdf'), true)

    // Le cartelle inglobate se ne vanno; la cassetta resta, con dentro il suo
    // file: è la porta da cui entrano i PDF, e dentro un archivio non ci si
    // trascina niente.
    assert.equal(existsSync(percorso.join(anno, 'archivio')), false)
    assert.equal(existsSync(percorso.join(anno, 'esportazioni')), false)
    assert.equal(existsSync(percorso.join(anno, 'assenze')), false)
    assert.equal(
      existsSync(percorso.join(anno, 'in-arrivo', 'DIC4a — Pagella', 'appena arrivato.pdf')),
      true,
      'la cassetta non deve essere toccata',
    )
  })

  it('non ripassa su quel che è già dentro', async () => {
    const anno = percorso.join(dati, archivio.cartellaCorrente)
    // La cartella torna, con un contenuto vecchio: è quel che fa una
    // sincronizzazione da una macchina non ancora aggiornata.
    const dove = 'archivio/Calcolo/DIC4a/allievi/Rossi Maria'
    mkdirSync(percorso.join(anno, dove), { recursive: true })
    writeFileSync(percorso.join(anno, dove, 'DIC4a_Pagella.pdf'), Buffer.from('vecchio'))

    assert.equal(await moduli.inglobaCartelle(archivio), 0)
    // E quel che c'è dentro il documento è ancora quello di adesso.
    assert.equal(
      moduli.deposito().leggi(`${dove}/DIC4a_Pagella.pdf`).length,
      512,
      'il file vecchio ha coperto quello buono',
    )
  })

  it('un documento del documento si apre come un file, quando serve', async () => {
    const relativo = 'archivio/Calcolo/DIC4a/classe/DIC4a_Verifica 1.pdf'
    const dove = await moduli.percorsoVero(relativo)

    assert.ok(dove, 'il file doveva essere materializzato')
    assert.equal(percorso.basename(dove.fsPath), 'DIC4a_Verifica 1.pdf')
    assert.equal(readFileSync(dove.fsPath).subarray(0, 5).toString('latin1'), '%PDF-')
  })

  it('rigenerare una scheda elimina gli alias, ma conserva gli altri periodi e gli allegati', async () => {
    const { deposito, riscrivi } = moduli
    const cartella = 'esportazioni/Calcolo/DIC4a/allievi/Rossi Maria/'
    const vecchio = cartella + 'DIC4a_Schede allievo_Rossi Maria_anno intero.pdf'
    const numerato = vecchio.replace('.pdf', ' (2).pdf')
    const altroPeriodo = cartella + 'DIC4a_Schede allievo_Rossi Maria_1 semestre.pdf'
    const allegato = 'archivio/Calcolo/DIC4a/allievi/Rossi Maria/scansione.pdf'
    const nuovo = cartella + 'DIC4a_Scheda PiF_Rossi Maria_anno intero.pdf'
    for (const nome of [vecchio, numerato, altroPeriodo, allegato]) deposito().scrivi(nome, finoPdf(32))
    const byte = finoPdf(100)
    await riscrivi(nuovo, byte, [vecchio, allegato])
    assert.deepEqual(deposito().leggi(nuovo), byte)
    assert.equal(deposito().esiste(vecchio), false)
    assert.equal(deposito().esiste(numerato), false)
    assert.equal(deposito().esiste(altroPeriodo), true)
    assert.equal(deposito().esiste(allegato), true)
  })

  it('e si rilegge dopo aver chiuso e riaperto l’anno', async () => {
    await archivio.chiudi()

    const { Archivio, registraDeposito, deposito, Uri } = moduli
    const altro = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
    registraDeposito(altro.deposito)
    // Riaprire vuol dire consegnare l'indirizzo del documento: un archivio
    // nuovo non sa da sé su che cosa stava lavorando quello di prima.
    await altro.apri(Uri.file(percorso.join(dati, '2026-2027.registro')))

    const pagella = deposito().leggi(
      'archivio/Calcolo/DIC4a/allievi/Rossi Maria/DIC4a_Pagella.pdf',
    )
    assert.ok(pagella, 'la pagella non si ritrova dopo la riapertura')
    assert.equal(Buffer.from(pagella).subarray(0, 5).toString('latin1'), '%PDF-')
    await altro.chiudi()
  })
})
