// Tre modi di perdere dati senza dirlo:
//
//   - due registri sullo stesso documento (o un documento compattato altrove e
//     poi accodato da chi l'aveva letto prima): `Pacchetto.accoda` controlla
//     che sul disco ci sia ancora il file che ha letto;
//   - una modifica arrivata durante una ricarica non sparisce;
//   - i traslochi (`impacchettaAnni`, `migraAnni`) non scrivono un documento
//     senza la collezione illeggibile e non cestinano l'unica copia.
//
// Cartelle e impostazioni sono temporanee e si scrivono prima di importare lo
// strato dati, perché lo shim le legge una volta sola.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro7-')

after(() => smonta(radice))

let Archivio
let Pacchetto
let Uri
let impacchettaAnni
let migraAnni
let leggiZip
let creaAnnoCorrente
let creaClasse

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  ;({ Archivio, Pacchetto, Uri, impacchettaAnni, migraAnni } = await import('../../dist-tests/data.mjs'))
  ;({ leggiZip } = await import('../../dist-tests/zip.mjs'))
  ;({ creaAnnoCorrente, creaClasse } = await import('../../dist-tests/domain.mjs'))
})

let contatore = 0
/** Un documento mai usato, in una cartella tutta sua. */
function documento () {
  contatore += 1
  const cartella = percorso.join(radice, `pacchetti-${contatore}`)
  mkdirSync(cartella, { recursive: true })
  return Uri.file(percorso.join(cartella, `anno-${contatore}.regi`))
}

/** Un contenuto grande abbastanza da far scegliere a `salva` la via incrementale. */
function pesante (etichetta) {
  return JSON.stringify(Array.from({ length: 4000 }, (_, n) => ({ n, etichetta, x: Math.sin(n) })))
}

/** Tutte le voci del file sul disco, decompresse e verificate: solleva se il file è rotto. */
function vociSulDisco (file) {
  const voci = leggiZip(readFileSync(file.fsPath))
  return new Map(voci.map((v) => [v.nome, new TextDecoder().decode(v.dati)]))
}

describe('accodare solo sul file che si è letto', () => {
  it('due registri sullo stesso documento: il file resta leggibile, e chi salva per ultimo copre', async () => {
    const file = documento()
    const primo = Pacchetto.nuovo(file)
    primo.scrivi('lezioni.json', pesante('base'))
    await primo.salva()

    const a = await Pacchetto.apri(file)
    const b = await Pacchetto.apri(file)
    a.scrivi('classi.json', '["di A"]')
    await a.salva()
    b.scrivi('corsi.json', '["di B"]')
    await b.salva()
    a.scrivi('piani.json', '["ancora di A"]')
    await a.salva()

    // B non accoda all'offset letto sopra le voci appena accodate da A: il
    // documento si riapre intero.
    const voci = vociSulDisco(file)
    assert.equal(voci.get('classi.json'), '["di A"]')
    assert.equal(voci.get('piani.json'), '["ancora di A"]')
    const riaperto = await Pacchetto.apri(file)
    assert.equal(riaperto.testo('classi.json'), '["di A"]')
    assert.equal(JSON.parse(riaperto.testo('lezioni.json')).length, 4000)
  })

  it('un documento compattato altrove e poi accodato da chi l’aveva letto prima si riapre', async () => {
    const file = documento()
    const primo = Pacchetto.nuovo(file)
    primo.scrivi('lezioni.json', pesante('base'))
    primo.scrivi('classi.json', '["prima"]')
    await primo.salva()

    const vecchio = await Pacchetto.apri(file)
    const altrove = await Pacchetto.apri(file)
    altrove.scrivi('lezioni.json', pesante('rifatte'))
    await altrove.salva({ compatta: true })

    vecchio.scrivi('classi.json', '["dopo"]')
    await vecchio.salva()

    // Gli offset di un indice vecchio non nominano byte rimessi in fila da altri.
    const voci = vociSulDisco(file)
    assert.equal(voci.get('classi.json'), '["dopo"]')
    assert.equal(JSON.parse(voci.get('lezioni.json')).length, 4000)
  })

  it('un documento che nel frattempo è sparito si riscrive per intero', async () => {
    const file = documento()
    const primo = Pacchetto.nuovo(file)
    primo.scrivi('lezioni.json', pesante('base'))
    await primo.salva()
    const aperto = await Pacchetto.apri(file)
    rmSync(file.fsPath)

    aperto.scrivi('classi.json', '["ancora qui"]')
    await aperto.salva()

    const voci = vociSulDisco(file)
    assert.equal(voci.get('classi.json'), '["ancora qui"]')
    assert.equal(JSON.parse(voci.get('lezioni.json')).length, 4000)
  })
})

describe('una modifica durante una ricarica', () => {
  it('non si perde', async () => {
    const archivio = new Archivio()
    await archivio.apri(null)
    const proposto = creaAnnoCorrente()
    const file = Uri.file(percorso.join(dati, `${proposto.etichetta.replace(/[/]+/g, '-')}.regi`))
    const anno = await archivio.creaAnno(proposto, file)
    assert.ok(anno)

    archivio.modifica((registro) => {
      registro.classi.push(creaClasse(anno.id, 'I A'))
    }, ['classi'])
    await archivio.salva()

    // La ricarica parte (come fa l'osservatore quando il file cambia) e intanto
    // arriva una modifica: «II B» resta.
    const ricarica = archivio.carica()
    await new Promise((risolvi) => setImmediate(risolvi))
    archivio.modifica((registro) => {
      registro.classi.push(creaClasse(anno.id, 'II B'))
    }, ['classi'])
    assert.deepEqual(archivio.registro.classi.map((c) => c.nome), ['I A', 'II B'])
    await ricarica

    assert.deepEqual(archivio.registro.classi.map((c) => c.nome), ['I A', 'II B'])
    await archivio.chiudi()
    archivio.dispose()

    // E sul disco, riaprendo da capo.
    const dopo = new Archivio()
    await dopo.apri(file)
    assert.deepEqual(dopo.registro.classi.map((c) => c.nome), ['I A', 'II B'])
    await dopo.chiudi()
    dopo.dispose()
  })
})

describe('i traslochi non buttano quel che non hanno letto', () => {
  /**
   * Un file che c'è e non si legge: un collegamento verso una cartella che non
   * esiste, come un segnaposto di OneDrive che non si scarica.
   */
  function illeggibile (dove) {
    symlinkSync(percorso.join(radice, 'non-esiste', String((contatore += 1))), dove, 'junction')
  }

  it('impacchettaAnni: un JSON che non si legge ferma il documento e tiene la cartella', async () => {
    const cartella = percorso.join(dati, '2030-2031', 'dati')
    mkdirSync(percorso.join(cartella, '.storico'), { recursive: true })
    writeFileSync(
      percorso.join(cartella, 'registro.json'),
      JSON.stringify({ versione: 3, anno: { id: 'a1', etichetta: '2030/2031' }, materie: [] }),
    )
    writeFileSync(percorso.join(cartella, 'classi.json'), '[{"nome":"I MEC A"}]')
    illeggibile(percorso.join(cartella, 'lezioni.json'))

    // Niente documento senza lezioni e niente `dati/` nel cestino: al prossimo
    // avvio si riprova.
    assert.deepEqual(await impacchettaAnni(Uri.file(dati)), [])
    assert.equal(existsSync(percorso.join(dati, '2030-2031.regi')), false)
    assert.equal(existsSync(percorso.join(cartella, 'classi.json')), true)
  })

  it('impacchettaAnni: anche una copia dello storico che non si legge', async () => {
    const cartella = percorso.join(dati, '2031-2032', 'dati')
    mkdirSync(percorso.join(cartella, '.storico'), { recursive: true })
    writeFileSync(
      percorso.join(cartella, 'registro.json'),
      JSON.stringify({ versione: 3, anno: { id: 'a2', etichetta: '2031/2032' }, materie: [] }),
    )
    writeFileSync(percorso.join(cartella, 'classi.json'), '[]')
    illeggibile(percorso.join(cartella, '.storico', 'classi.2031-09-01-08-00.json'))

    assert.deepEqual(await impacchettaAnni(Uri.file(dati)), [])
    assert.equal(existsSync(percorso.join(dati, '2031-2032.regi')), false)
    assert.equal(existsSync(cartella), true)
  })

  it('migraAnni: un JSON che c’è e non si legge non va nel cestino', async () => {
    const mucchio = percorso.join(radice, 'mucchio')
    mkdirSync(mucchio, { recursive: true })
    writeFileSync(
      percorso.join(mucchio, 'registro.json'),
      JSON.stringify({ versione: 2, anni: [{ id: 'a1', etichetta: '2025/2026' }], materie: [] }),
    )
    writeFileSync(percorso.join(mucchio, 'classi.json'), '[{"id":"c1","annoId":"a1","nome":"I A"}]')
    writeFileSync(percorso.join(mucchio, 'lezioni.json'), '[{"id": rotto')

    // Niente anni senza lezioni, e `lezioni.json` resta.
    assert.equal(await migraAnni(Uri.file(mucchio)), null)
    assert.equal(readFileSync(percorso.join(mucchio, 'lezioni.json'), 'utf8'), '[{"id": rotto')
    assert.equal(existsSync(percorso.join(mucchio, 'classi.json')), true)
  })
})

describe('i reperti medi dello stesso giro', () => {
  /** Un documento scritto per intero, con dentro un anno e le voci date. */
  async function annoScritto (voci, versione = 1) {
    const file = documento()
    const pacchetto = Pacchetto.nuovo(file)
    pacchetto.scrivi(
      'registro.json',
      JSON.stringify({ versione, anno: { id: 'a9', etichetta: '2029/2030', inizio: '2029-09-01', fine: '2030-06-30' } }),
    )
    for (const [nome, testo] of Object.entries(voci)) pacchetto.scrivi(nome, testo)
    await pacchetto.salva()
    return file
  }

  it('un anno scritto da un registro più recente non si apre, e il file resta com’era', async () => {
    const file = await annoScritto({ 'classi.json': '[{"id":"c1","annoId":"a9","nome":"I A","futuro":1}]' }, 99)
    const prima = readFileSync(file.fsPath)
    const archivio = new Archivio()
    const errori = []
    archivio.allErrore((messaggio) => errori.push(messaggio))
    await archivio.apri(file)

    assert.equal(archivio.registro.anni.length, 0)
    assert.ok(errori.some((e) => /più recente/.test(e)), errori.join(' | '))
    await archivio.chiudi()
    archivio.dispose()
    assert.deepEqual(readFileSync(file.fsPath), prima)
  })

  it('una collezione con il blocco rovinato non ferma l’apertura, e alla modifica si mette da parte intera', async () => {
    const file = await annoScritto({ 'classi.json': '[{"id":"c1","annoId":"a9","nome":"I A"}]' })
    // Si guasta il CRC di `classi.json` nell'indice, come un settore rovinato o
    // una sincronizzazione a metà.
    const byte = readFileSync(file.fsPath)
    const nome = Buffer.from('classi.json')
    const dove = byte.lastIndexOf(nome) - 46
    assert.equal(byte.readUInt32LE(dove), 0x02014b50)
    byte.writeUInt32LE(byte.readUInt32LE(dove + 16) ^ 0xffffffff, dove + 16)
    writeFileSync(file.fsPath, byte)

    const archivio = new Archivio()
    const errori = []
    archivio.allErrore((messaggio) => errori.push(messaggio))
    await archivio.apri(file)
    assert.equal(archivio.registro.anni.length, 1)
    assert.deepEqual(archivio.registro.classi, [])
    assert.ok(errori.length > 0)

    archivio.modifica((registro) => {
      registro.classi.push(creaClasse('a9', 'II B'))
    }, ['classi'])
    await archivio.salva()
    assert.equal(archivio.statoSalvataggio.inSospeso, false)
    await archivio.chiudi()
    archivio.dispose()

    // Il blocco rotto è ancora nel documento, sotto un altro nome e com'era.
    const riaperto = await Pacchetto.apri(file)
    const rotte = riaperto.nomi().filter((n) => n.startsWith('classi.rotto-'))
    assert.equal(rotte.length, 1, riaperto.nomi().join(', '))
    assert.throws(() => riaperto.testo(rotte[0]), /controllo non torna/)
    assert.match(riaperto.testo('classi.json'), /II B/)
  })

  it('lo storico a gradini tiene le ultime dieci, una per giorno del mese e una per settimana oltre', async () => {
    const pacchetto = Pacchetto.nuovo(documento())
    const marca = (quando) => new Date(quando).toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const adesso = Date.now()
    const giorno = 24 * 60 * 60 * 1000
    // Venti copie di oggi, a un minuto l'una dall'altra, e una al giorno per i
    // cento giorni prima.
    for (let n = 1; n <= 20; n += 1) {
      pacchetto.scrivi(`.storico/classi.${marca(adesso - n * 60_000)}.json`, `[${n}]`)
    }
    for (let d = 1; d <= 100; d += 1) {
      pacchetto.scrivi(`.storico/classi.${marca(adesso - d * giorno)}.json`, `[-${d}]`)
    }
    pacchetto.scrivi('classi.json', '["adesso"]')
    pacchetto.conserva('classi.json', 10, { aGradini: true })

    const copie = pacchetto.copieDi('classi')
    assert.ok(copie.length <= 60, `troppe copie: ${copie.length}`)
    // Le dieci più recenti ci sono tutte, e l'ultima è quella appena fatta.
    assert.equal(pacchetto.testo(copie[copie.length - 1]), '["adesso"]')
    for (let n = 1; n <= 9; n += 1) {
      assert.ok(copie.includes(`.storico/classi.${marca(adesso - n * 60_000)}.json`), `manca la copia di ${n} minuti fa`)
    }
    // «Com'era ieri», e com'era tre settimane fa.
    assert.ok(copie.includes(`.storico/classi.${marca(adesso - giorno)}.json`), 'manca ieri')
    assert.ok(copie.includes(`.storico/classi.${marca(adesso - 21 * giorno)}.json`), 'mancano tre settimane fa')
    // Oltre il mese, una per settimana: fra i giorni 40 e 100 ne restano una
    // decina.
    const vecchie = copie.filter((c) => {
      const m = /\.(\d{4})-(\d{2})-(\d{2})-/.exec(c)
      return m && adesso - Date.UTC(+m[1], +m[2] - 1, +m[3]) > 40 * giorno
    })
    assert.ok(vecchie.length >= 7 && vecchie.length <= 10, `settimanali: ${vecchie.length}`)
  })
})
