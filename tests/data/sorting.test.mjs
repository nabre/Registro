// Un PDF che entra, dal trascinamento al pezzo archiviato. I file in ingresso
// stanno **dentro il documento dell'anno**, in `quarantena/` di
// `2026-2027.regi`: così la cartella sincronizzata li porta anche sull'altra
// macchina.
//
// Poi lo split a mano (pagine, chi, quale documento), provato anche su un PDF
// entrato senza documento.
//
// Gira su `dist-tests/data.mjs`: con bundle separati il deposito sarebbe due.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-smistamento-')

after(() => smonta(radice))

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
    pagina.drawText('Pagella — DIC4a', { x: 60, y: 780, size: 16, font })
    pagina.drawText(`Allievo: ${nome}`, { x: 60, y: 740, size: 12, font })
  }
  return documento.save()
}

/** Il contesto che il centralino passa a un'azione. */
function contesto () {
  return {
    archivio,
    registro: archivio.registro,
    modifica: (cambia, collezioni) => {
      archivio.modifica(cambia, collezioni)
      return { ok: true, errori: [] }
    },
  }
}

/** L'azione, chiamata come la chiama il centralino. */
function esegui (azione) {
  return moduli.smistamento[azione.tipo](contesto(), azione)
}

/** Lo smistamento che c'è adesso, uno solo: le prove vanno in fila. */
function solo () {
  const tutti = archivio.registro.smistamenti
  assert.equal(tutti.length, 1, `smistamenti in attesa: ${tutti.length}`)
  return tutti[0]
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

  // Il worker di pdfjs, come all'avvio: senza, nessuna pagina si legge.
  impostaWorker(
    pathToFileURL(fileURLToPath(new URL('../../dist-tests/pdf.worker.mjs', import.meta.url))).href,
  )
  impostaCaratteri(fileURLToPath(new URL('../../dist-tests/pdf-fonts', import.meta.url)))

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    dominio.creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )

  const annoId = archivio.registro.anni[0].id
  const materia = dominio.creaMateria('Matematica', 'MAT')
  classe = dominio.creaClasse(annoId, 'DIC4a')
  classe.docenteDiClasse = true
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

describe('un PDF trascinato nel pannello', () => {
  it('entra nel documento dell’anno e non lascia niente su disco', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    const esito = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'pagelle DIC4a.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
    })
    assert.ok(esito.ok, `rilascio rifiutato: ${JSON.stringify(esito.errori)}`)

    const smistamento = solo()
    assert.ok(
      smistamento.file.startsWith('quarantena/'),
      `il PDF non è finito in quarantena: ${smistamento.file}`,
    )
    assert.ok(moduli.deposito().esiste(smistamento.file), 'il PDF non è dentro il documento')
    assert.equal(smistamento.pagine, 2)
    assert.equal(smistamento.consegnaId, consegna.id)

    // Nessuna cartella d'ingresso fuori dal documento.
    assert.equal(
      existsSync(percorso.join(dati, '2026-2027', 'in-arrivo')),
      false,
      'è ricomparsa la cartella in-arrivo',
    )
  })

  it('compare nell’inventario che il pannello riceve, o la cornice lo dà per perso', () => {
    // Il pannello sa che un documento c'è se compare in questo elenco: la
    // quarantena ci sta dentro.
    const smistamento = solo()
    const inventario = moduli.archiviPresenti()
    const sua = inventario.find((voce) => voce.percorso === smistamento.file)
    assert.ok(sua, `il PDF in quarantena non è nell’inventario: ${JSON.stringify(inventario)}`)
    assert.ok(sua.misura > 0, 'misura a zero: la cornice lo direbbe vuoto')
  })

  it('riconosce chi è nominato nelle pagine e non archivia niente da sé', () => {
    const smistamento = solo()
    const conNome = smistamento.blocchi.filter((b) => b.allievoId)
    assert.equal(conNome.length, 2, 'le due pagelle non sono state riconosciute')
    const sua = archivio.registro.consegne.find((c) => c.id === consegna.id)
    assert.deepEqual(sua.documenti ?? [], [], 'ha archiviato senza una conferma')
  })

  it('un file vuoto si rifiuta invece di lasciare una riga senza PDF', async () => {
    const esito = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'niente.pdf',
      contenuto: '',
    })
    assert.equal(esito.ok, false, 'il file vuoto è passato')
    assert.equal(archivio.registro.smistamenti.length, 1, 'ha lasciato una riga in più')
  })
})

describe('dividere a mano', () => {
  it('archivia le pagine dette e le toglie da quel che resta', async () => {
    const smistamento = solo()
    const chi = classe.allievi[0]
    const esito = await esegui({
      tipo: 'smistamento.assegnaManuale',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: chi.id,
      da: 1,
      a: 1,
    })
    assert.ok(esito.ok, `assegnazione rifiutata: ${JSON.stringify(esito.errori)}`)

    const sua = archivio.registro.consegne.find((c) => c.id === consegna.id)
    const suo = (sua.documenti ?? []).find((d) => d.allievoId === chi.id)
    assert.ok(suo, 'il documento non è stato archiviato')
    assert.ok(moduli.deposito().esiste(suo.file), `il pezzo non è dentro il documento: ${suo.file}`)

    const resto = archivio.registro.smistamenti.find((s) => s.id === smistamento.id)
    assert.ok(resto, 'lo smistamento è sparito con una pagina ancora da decidere')
    assert.deepEqual(
      resto.letture.map((l) => l.numero),
      [2],
      'la pagina assegnata è rimasta in ballo',
    )
  })

  it('l’ultima pagina assegnata chiude lo smistamento e porta via il PDF', async () => {
    const smistamento = solo()
    const originale = smistamento.file
    const esito = await esegui({
      tipo: 'smistamento.assegnaManuale',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: classe.allievi[1].id,
      da: 2,
      a: 2,
    })
    assert.ok(esito.ok, `assegnazione rifiutata: ${JSON.stringify(esito.errori)}`)
    assert.deepEqual(archivio.registro.smistamenti, [], 'la riga è rimasta senza niente da fare')
    assert.equal(moduli.deposito().esiste(originale), false, 'il PDF originale è rimasto dentro')
  })
})

describe('un PDF senza documento', () => {
  it('entra lo stesso: lo si divide a mano dicendo a quale documento va', async () => {
    const byte = await pagelle(['Rossi Mario'])
    const esito = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: null,
      nome: 'segreteria.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
    })
    assert.ok(esito.ok, `rilascio rifiutato: ${JSON.stringify(esito.errori)}`)

    const smistamento = solo()
    assert.ok(moduli.deposito().esiste(smistamento.file), 'il PDF non è dentro il documento')

    // Il documento si dice al momento di dividere: qui la richiesta è già
    // soddisfatta, e non si rimpiazza un documento archiviato senza toglierlo.
    const assegnato = await esegui({
      tipo: 'smistamento.assegnaManuale',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: classe.allievi[0].id,
      da: 1,
      a: 1,
    })
    assert.equal(assegnato.ok, false, 'ha rimpiazzato un documento già archiviato')
    assert.match(assegnato.errori.join(' '), /ha già un documento/)
  })
})

describe('il taglio dichiarato da chi carica', () => {
  // Le prove vanno in fila: quel che le altre hanno lasciato se ne va prima.
  before(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
    archivio.modifica((r) => {
      for (const c of r.consegne) {
        c.documenti = []
        c.fatte = []
      }
    }, ['consegne'])
  })

  it('a passo fisso divide ogni tot pagine, senza leggere nomi', async () => {
    // Lo scanner a foglio doppio: nomi illeggibili ma una regola ferrea, che vale
    // più del riconoscimento.
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    const esito = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'scansione.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'passo', pagine: 2 },
    })
    assert.ok(esito.ok, `rilascio rifiutato: ${JSON.stringify(esito.errori)}`)

    const smistamento = solo()
    assert.deepEqual(smistamento.divisione, { modo: 'passo', pagine: 2 })
    assert.deepEqual(
      smistamento.blocchi.map((b) => [b.da, b.a]),
      [[1, 2]],
      'le due pagine dovevano restare un documento solo',
    )
  })

  it('cambiare modo rifà i blocchi rimasti, e il modo resta scritto', async () => {
    const smistamento = solo()
    const esito = await esegui({
      tipo: 'smistamento.dividi',
      smistamentoId: smistamento.id,
      divisione: { modo: 'passo', pagine: 1 },
    })
    assert.ok(esito.ok, `cambio rifiutato: ${JSON.stringify(esito.errori)}`)

    const dopo = solo()
    assert.deepEqual(dopo.divisione, { modo: 'passo', pagine: 1 })
    assert.deepEqual(dopo.blocchi.map((b) => [b.da, b.a]), [[1, 1], [2, 2]])
  })

  it('un passo scritto storto non diventa un taglio impossibile', async () => {
    const esito = await esegui({
      tipo: 'smistamento.dividi',
      smistamentoId: solo().id,
      divisione: { modo: 'passo', pagine: 0 },
    })
    assert.ok(esito.ok)
    assert.deepEqual(solo().divisione, { modo: 'passo', pagine: 1 })
  })

  it('assegnando resta il taglio scelto, non torna quello dai nomi', async () => {
    const smistamento = solo()
    const esito = await esegui({
      tipo: 'smistamento.assegnaManuale',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: classe.allievi[0].id,
      da: 1,
      a: 1,
    })
    assert.ok(esito.ok, `assegnazione rifiutata: ${JSON.stringify(esito.errori)}`)

    const resto = solo()
    assert.deepEqual(resto.divisione, { modo: 'passo', pagine: 1 })
    assert.deepEqual(resto.blocchi.map((b) => [b.da, b.a]), [[2, 2]])
  })
})

describe('le pagine trascinate sulla casella di qualcuno', () => {
  // La scrivania sgombra: quel che è in attesa se ne va, e le richieste tornano
  // senza documenti.
  before(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
    archivio.modifica((r) => {
      for (const c of r.consegne) {
        c.documenti = []
        c.fatte = []
      }
    }, ['consegne'])
  })

  it('archivia insieme pagine che non si toccano, e le toglie da quel che resta', async () => {
    // Le facciate di una persona lontane: la prima e la terza di Rossi, la
    // seconda di Bianchi.
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca', 'Rossi Mario'])
    const entrato = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'scansione doppia.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'mano' },
    })
    assert.ok(entrato.ok, `rilascio rifiutato: ${JSON.stringify(entrato.errori)}`)

    const smistamento = solo()
    const chi = classe.allievi[0]
    const esito = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: chi.id,
      pagine: [3, 1],
    })
    assert.ok(esito.ok, `assegnazione rifiutata: ${JSON.stringify(esito.errori)}`)

    const sua = archivio.registro.consegne.find((c) => c.id === consegna.id)
    const suo = (sua.documenti ?? []).find((d) => d.allievoId === chi.id)
    assert.ok(suo, 'il documento non è stato archiviato')

    // Due pagine in un documento solo, nell'ordine del PDF.
    const pezzo = await PDFDocument.load(moduli.deposito().leggi(suo.file))
    assert.equal(pezzo.getPageCount(), 2)

    const resto = solo()
    assert.deepEqual(
      resto.letture.map((l) => l.numero),
      [2],
      'le pagine archiviate sono rimaste in ballo',
    )
    assert.deepEqual(
      resto.assegnate.map((a) => [a.da, a.a]),
      [[1, 1], [3, 3]],
      'le pagine archiviate vanno segnate a intervalli, una riga per tratto',
    )
  })

  it('una casella già piena rifiuta, e le pagine restano da smistare', async () => {
    const smistamento = solo()
    const esito = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: classe.allievi[0].id,
      pagine: [2],
    })
    assert.equal(esito.ok, false, 'ha rimpiazzato un documento già archiviato')
    assert.match(esito.errori.join(' '), /ha già un documento/)
    assert.deepEqual(solo().letture.map((l) => l.numero), [2])
  })

  it('senza nemmeno una pagina dentro il PDF non archivia niente', async () => {
    const esito = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: solo().id,
      consegnaId: consegna.id,
      allievoId: classe.allievi[1].id,
      pagine: [9, 0],
    })
    assert.equal(esito.ok, false, 'ha archiviato delle pagine che non esistono')
    assert.deepEqual(solo().letture.map((l) => l.numero), [2])
  })

  it('l’ultima pagina trascinata chiude lo smistamento', async () => {
    const smistamento = solo()
    const esito = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: classe.allievi[1].id,
      pagine: [2],
    })
    assert.ok(esito.ok, `assegnazione rifiutata: ${JSON.stringify(esito.errori)}`)
    assert.deepEqual(archivio.registro.smistamenti, [], 'la riga è rimasta senza niente da fare')
  })
})

describe('le pagine trascinate sulla casella delle firme', () => {
  // Il foglio firme vale per tutta la colonna ma arriva nella scansione di
  // classe: la sua casella prende pagine come le altre.
  let distribuita

  it('archivia il foglio firme e lo riprende', async () => {
    const dominio = await import('../../dist-tests/domain.mjs')
    const corsoId = archivio.registro.corsi[0].id
    distribuita = dominio.creaConsegna(corsoId, 'Circolare di novembre', '2026-11-02')
    distribuita.documento = 'modulo'
    distribuita.verso = 'consegno'
    distribuita.firmeRichieste = true
    archivio.modifica((r) => r.consegne.push(distribuita), ['consegne'])

    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: distribuita.id,
      nome: 'circolare firmata.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'mano' },
    })

    const smistamento = solo()
    const esito = await esegui({
      tipo: 'smistamento.assegnaFirme',
      smistamentoId: smistamento.id,
      consegnaId: distribuita.id,
      pagine: [1],
    })
    assert.ok(esito.ok, `firme rifiutate: ${JSON.stringify(esito.errori)}`)

    const dopo = archivio.registro.consegne.find((c) => c.id === distribuita.id)
    assert.ok(dopo.fileFirme, 'il foglio firme non è stato archiviato')
    // Il percorso si tiene da parte: dopo la ripresa la consegna non lo ha più, ed
    // è quel che si controlla.
    const percorsoFirme = dopo.fileFirme
    assert.ok(moduli.deposito().esiste(percorsoFirme), 'il file non è dentro il documento dell’anno')

    const resto = solo()
    // Il tratto resta segnato, senza allievo: da lì si riprende.
    assert.deepEqual(
      resto.assegnate.map((a) => [a.allievoId, a.firme === true, a.da, a.a]),
      [['', true, 1, 1]],
    )
    assert.deepEqual(resto.letture.map((l) => l.numero), [2], 'la pagina è rimasta fra quelle da smistare')

    // Un foglio firme per colonna: non si sovrascrive in silenzio.
    const secondo = await esegui({
      tipo: 'smistamento.assegnaFirme',
      smistamentoId: smistamento.id,
      consegnaId: distribuita.id,
      pagine: [2],
    })
    assert.equal(secondo.ok, false, 'ha sovrascritto il foglio firme senza dirlo')

    const ripresa = await esegui({
      tipo: 'smistamento.riprendiPagine',
      smistamentoId: smistamento.id,
      pagine: [1],
    })
    assert.ok(ripresa.ok, `ripresa rifiutata: ${JSON.stringify(ripresa.errori)}`)

    const tornata = archivio.registro.consegne.find((c) => c.id === distribuita.id)
    assert.equal(tornata.fileFirme, undefined, 'il foglio firme è rimasto agganciato')
    assert.equal(moduli.deposito().esiste(percorsoFirme), false, 'il file è rimasto nell’archivio')
    assert.deepEqual(solo().letture.map((l) => l.numero), [1, 2], 'la pagina non è tornata da smistare')
  })

  after(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
  })
})

describe('riprendere una pagina finita nel posto sbagliato', () => {
  // Una pagina caduta sulla riga sbagliata si riprende da lì, senza togliere il
  // documento e ricaricare il PDF.
  before(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
    archivio.modifica((r) => {
      for (const c of r.consegne) {
        c.documenti = []
        c.fatte = []
      }
    }, ['consegne'])
  })

  it('il documento esce dal fascicolo e le pagine tornano da smistare', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'attestati.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'mano' },
    })

    const smistamento = solo()
    const chi = classe.allievi[0]
    await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: smistamento.id,
      consegnaId: consegna.id,
      allievoId: chi.id,
      pagine: [2],
    })

    const dopoArchiviazione = archivio.registro.consegne.find((c) => c.id === consegna.id)
    const documento = (dopoArchiviazione.documenti ?? []).find((d) => d.allievoId === chi.id)
    assert.ok(documento, 'non ha archiviato niente da riprendere')
    assert.ok(
      dopoArchiviazione.fatte.some((f) => f.chi === chi.id),
      'la spunta non è stata messa: la prova non direbbe niente sul ritorno',
    )
    // La consegna si segna accanto alla persona: da lì si riprende la pagina.
    assert.equal(solo().assegnate[0].consegnaId, consegna.id)

    const esito = await esegui({
      tipo: 'smistamento.riprendiPagine',
      smistamentoId: smistamento.id,
      pagine: [2],
    })
    assert.ok(esito.ok, `ripresa rifiutata: ${JSON.stringify(esito.errori)}`)

    const dopo = archivio.registro.consegne.find((c) => c.id === consegna.id)
    assert.equal((dopo.documenti ?? []).some((d) => d.allievoId === chi.id), false, 'il documento è rimasto nel fascicolo')
    assert.equal(dopo.fatte.some((f) => f.chi === chi.id), false, 'la spunta è rimasta su una consegna senza foglio')
    assert.equal(moduli.deposito().esiste(documento.file), false, 'il file è rimasto nell’archivio')

    const resto = solo()
    assert.deepEqual(resto.assegnate, [], 'la pagina risulta ancora archiviata')
    assert.deepEqual(resto.letture.map((l) => l.numero), [1, 2], 'la pagina non è tornata fra quelle da smistare')
    // Torna col suo testo: il PDF è ancora in quarantena, niente OCR da rifare.
    const tornata = resto.letture.find((l) => l.numero === 2)
    assert.match(tornata.testo, /Bianchi Luca/)
    assert.equal(tornata.lettura, 'testo')
  })

  it('riprendere pagine che nessuno ha archiviato si rifiuta', async () => {
    const esito = await esegui({
      tipo: 'smistamento.riprendiPagine',
      smistamentoId: solo().id,
      pagine: [1],
    })
    assert.equal(esito.ok, false)
    assert.match(esito.errori.join(' '), /non sono archiviate/)
  })
})

describe('le pagine trascinate sulla matrice delle assenze', () => {
  // I rapporti di assenze e ritardi della classe arrivano in un PDF solo: quale
  // rapporto sia lo dice la casella su cui si lasciano le pagine, non il
  // riconoscimento (si somigliano riga per riga).
  let blocco

  before(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
    const dominio = await import('../../dist-tests/domain.mjs')
    const fascicolo = dominio.creaFascicolo(classe.id)
    blocco = dominio.creaBloccoAssenze('2026-09-01', '2027-01-31', fascicolo, '1° sem')
    fascicolo.assenze.push(blocco)
    archivio.modifica((r) => r.fascicoli.push(fascicolo), ['fascicoli'])
  })

  it('archivia il foglio nella casella e ne riprende le pagine', async () => {
    const byte = await pagelle(['Rossi Mario', 'Bianchi Luca'])
    const entrato = await esegui({
      tipo: 'smistamento.deposita',
      // Senza documento: un PDF di assenze arriva con la sola classe.
      consegnaId: null,
      classeId: classe.id,
      nome: 'assenze DIC4a.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'mano' },
    })
    assert.ok(entrato.ok, `rilascio rifiutato: ${JSON.stringify(entrato.errori)}`)

    const smistamento = solo()
    const chi = classe.allievi[0]
    const comando = {
      smistamentoId: smistamento.id,
      classeId: classe.id,
      bloccoId: blocco.id,
      allievoId: chi.id,
      genere: 'assenze',
      firmato: false,
    }
    const esito = await esegui({ ...comando, tipo: 'smistamento.assegnaAssenze', pagine: [1] })
    assert.ok(esito.ok, `assegnazione rifiutata: ${JSON.stringify(esito.errori)}`)

    const suo = archivio.registro.fascicoli
      .find((f) => f.classeId === classe.id)
      .assenze.find((b) => b.id === blocco.id)
      .righe.find((r) => r.allievoId === chi.id)
    assert.ok(suo, 'la riga di quella persona non è nata con il suo primo foglio')
    const foglio = suo.fogli.find((f) => f.tipo === 'assenze' && !f.firmato)
    assert.ok(foglio, 'il foglio non è finito nella casella')
    assert.ok(moduli.deposito().esiste(foglio.file), `il pezzo non è dentro il documento: ${foglio.file}`)
    const percorso = foglio.file

    const resto = solo()
    assert.deepEqual(resto.letture.map((l) => l.numero), [2], 'la pagina archiviata è rimasta in ballo')
    // La casella si segna accanto alla persona, intera: da lì si riprende una
    // pagina caduta nella colonna sbagliata.
    assert.deepEqual(resto.assegnate[0].assenze, {
      classeId: classe.id,
      bloccoId: blocco.id,
      tipo: 'assenze',
      firmato: false,
    })

    // Un rapporto per casella: non si sovrascrive in silenzio.
    const secondo = await esegui({ ...comando, tipo: 'smistamento.assegnaAssenze', pagine: [2] })
    assert.equal(secondo.ok, false, 'ha rimpiazzato un foglio già archiviato')
    assert.match(secondo.errori.join(' '), /ha già il foglio/)

    const ripresa = await esegui({
      tipo: 'smistamento.riprendiPagine',
      smistamentoId: smistamento.id,
      pagine: [1],
    })
    assert.ok(ripresa.ok, `ripresa rifiutata: ${JSON.stringify(ripresa.errori)}`)

    const dopo = archivio.registro.fascicoli
      .find((f) => f.classeId === classe.id)
      .assenze.find((b) => b.id === blocco.id)
    assert.deepEqual(dopo.righe, [], 'la riga è rimasta in elenco senza più un foglio dentro')
    assert.equal(moduli.deposito().esiste(percorso), false, 'il file è rimasto nell’archivio')
    assert.deepEqual(solo().letture.map((l) => l.numero), [1, 2], 'la pagina non è tornata da smistare')
  })

  after(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
  })
})

describe('il PDF che attraversa due classi', () => {
  // Le scansioni di segreteria: nel mucchio ci sono due classi. Divisa la prima,
  // restano pagine.
  let altra

  before(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
    archivio.modifica((r) => {
      for (const c of r.consegne) {
        c.documenti = []
        c.fatte = []
      }
    }, ['consegne'])

    const dominio = await import('../../dist-tests/domain.mjs')
    const annoId = archivio.registro.anni[0].id
    altra = dominio.creaClasse(annoId, 'DIC4b')
    altra.docenteDiClasse = true
    altra.allievi = [dominio.creaAllievo('Verdi', 'Anna')]
    archivio.modifica((r) => {
      r.classi.push(altra)
    }, ['classi'])
  })

  it('le pagine già archiviate restano di chi le ha avute', async () => {
    const byte = await pagelle(['Rossi Mario', 'Verdi Anna'])
    const entrato = await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: consegna.id,
      nome: 'scansione mista.pdf',
      contenuto: Buffer.from(byte).toString('base64'),
      divisione: { modo: 'mano' },
    })
    assert.ok(entrato.ok, `rilascio rifiutato: ${JSON.stringify(entrato.errori)}`)

    // La pagina di Rossi va nel suo fascicolo: da lì è un documento.
    const rossi = classe.allievi[0]
    const archiviata = await esegui({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: solo().id,
      consegnaId: consegna.id,
      allievoId: rossi.id,
      pagine: [1],
    })
    assert.ok(archiviata.ok, `assegnazione rifiutata: ${JSON.stringify(archiviata.errori)}`)

    const primo = solo()
    assert.deepEqual(primo.letture.map((l) => l.numero), [2], 'la pagina archiviata è rimasta in ballo')

    const spostato = await esegui({
      tipo: 'smistamento.attribuisci',
      smistamentoId: primo.id,
      classeId: altra.id,
    })
    assert.ok(spostato.ok, `spostamento rifiutato: ${JSON.stringify(spostato.errori)}`)

    // Il lavoro fatto non si disfa: rileggendo il PDF da capo la pagina di Rossi
    // tornerebbe da smistare.
    const dopo = solo()
    assert.equal(dopo.classeId, altra.id, 'il mucchio non è passato all’altra classe')
    assert.equal(dopo.consegnaId, null, 'si è tenuto la richiesta della classe di prima')
    assert.deepEqual(dopo.letture.map((l) => l.numero), [2], 'una pagina già archiviata è tornata in ballo')

    const sua = archivio.registro.consegne.find((c) => c.id === consegna.id)
    assert.ok(
      (sua.documenti ?? []).some((d) => d.allievoId === rossi.id),
      'il documento archiviato prima dello spostamento è sparito',
    )
  })

  it('spostarlo dove già è non cambia niente', async () => {
    const prima = solo()
    const esito = await esegui({
      tipo: 'smistamento.attribuisci',
      smistamentoId: prima.id,
      classeId: altra.id,
    })
    assert.ok(esito.ok)
    assert.deepEqual(solo().letture.map((l) => l.numero), [2])
  })

  after(async () => {
    for (const rimasto of [...archivio.registro.smistamenti]) {
      await esegui({ tipo: 'smistamento.elimina', smistamentoId: rimasto.id })
    }
  })
})
