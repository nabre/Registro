// «Importa da un altro registro…» (`registro.sfoglia`, `registro.altrove`,
// `registro.importa`). Due documenti veri: foto, logo, allegati dei piani e
// copie dei calendari passano dai byte dell'uno al deposito dell'altro, e
// l'origine resta com'era. Che cosa arriva blocco per blocco lo prova
// `tests/domain/importRegister`.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-importa-registro-')

/** L'anno scorso: il documento da cui si porta. */
const SCORSO = percorso.join(dati, '2025-2026.regi')
/** L'anno aperto. */
const APERTO = percorso.join(dati, '2026-2027.regi')
const FOTO = 'archivio/docente-di-classe/I MEC A/foto/Rossi Maria.jpg'
const BYTE_FOTO = new TextEncoder().encode('jpeg di Rossi')
const LOGO = 'intestazione/car-prima-vecchio.png'
const BYTE_LOGO = new TextEncoder().encode('png della scuola di là')
const LOGO_QUI = 'intestazione/car-prima-qui.png'
const SCHEDA = 'archivio/I MEC A/I MEC A — Matematica/scheda frazioni.pdf'
const BYTE_SCHEDA = new TextEncoder().encode('%PDF-1.4 scheda')
const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'

let api
let archivio
/** Le cose di là, con i loro id di là. */
let la

const importa = (ingresso = {}) => api.chiama(archivio, 'registro.importa', {
  percorso: SCORSO,
  impostazioni: true,
  materie: true,
  classi: la.classi.map((c) => ({ classeId: c.id, anagrafica: true, corsi: true })),
  piani: true,
  calendari: true,
  ...ingresso,
})

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()
  const {
    Archivio, Uri, creaAllievo, creaAnno, creaAttivita, creaClasse, creaCorso, creaLezione,
    creaMateria,
    creaPiano, creaRisorsa, creaValutazione,
  } = api

  // L'anno scorso: due classi, due corsi, un piano con un allegato, le
  // impostazioni con la carta e il logo, un calendario con la sua copia.
  const scorso = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await scorso.apri(null)
  await scorso.creaAnno(creaAnno('2025-09-01', '2026-06-30'), Uri.file(SCORSO))
  const annoScorso = scorso.registro.anni[0].id
  const mec = creaClasse(annoScorso, 'I MEC A')
  const rossi = creaAllievo('Rossi', 'Maria')
  rossi.foto = FOTO
  mec.allievi.push(rossi, creaAllievo('Bianchi', 'Luca'))
  const ele = creaClasse(annoScorso, 'II ELE B')
  ele.allievi.push(creaAllievo('Verdi', 'Anna'))
  const matematica = creaMateria('Matematica', 'MAT')
  const inglese = creaMateria('Inglese', 'ING')
  const corsoMat = creaCorso(mec.id, matematica.id, 'I MEC A — Matematica')
  const corsoEle = creaCorso(ele.id, inglese.id, 'II ELE B — Inglese')
  const piano = creaPiano(corsoMat.id)
  const tappa = creaAttivita('Esercizi', 1)
  tappa.risorse.push({ ...creaRisorsa('file', 'Scheda'), file: SCHEDA, nome: 'scheda frazioni.pdf' })
  piano.attivita.push(tappa)
  scorso.deposito.scrivi(FOTO, BYTE_FOTO)
  scorso.deposito.scrivi(LOGO, BYTE_LOGO)
  scorso.deposito.scrivi(SCHEDA, BYTE_SCHEDA)
  scorso.deposito.scrivi('calendari/ics-sede.ics', new TextEncoder().encode(ICS))
  scorso.modifica((r) => {
    r.classi.push(mec, ele)
    r.materie.push(matematica, inglese)
    r.corsi.push(corsoMat, corsoEle)
    r.piani.push(piano)
    r.lezioni.push(creaLezione(corsoMat.id, '2025-09-09', '08:20', 90))
    r.valutazioni.push(creaValutazione(corsoMat.id, 'Verifica'))
    r.impostazioni = {
      ...r.impostazioni,
      scala: { min: 1, max: 10, sufficienza: 6, passo: 0.5 },
      sogliaAssenza: 30,
      calendario: {
        calendari: [{ id: 'ics-sede', nome: 'Sede', origine: 'https://esempio.ch/sede.ics', copiatoIl: '2025-09-01T08:00:00.000Z' }],
        regole: [
          { id: 'rgc-1', testo: 'MEC A MAT', corsoId: corsoMat.id },
          { id: 'rgc-2', testo: 'ELE B ING', corsoId: corsoEle.id },
        ],
      },
      intestazione: {
        carte: [{ id: 'car-prima', sede: 'Scuola di là', logo: LOGO, altezzaLogo: 14, corsi: [corsoMat.id, corsoEle.id] }],
        docente: 'Mario Rossi',
      },
    }
  }, ['classi', 'registro', 'corsi', 'piani', 'lezioni', 'valutazioni'])
  await scorso.salva()
  assert.equal(await scorso.chiudi(), true)
  scorso.dispose()
  la = { classi: [mec, ele], mec, ele, corsoMat }

  // L'anno aperto: «matematica» già scritta a modo suo, una II ELE B già
  // fatta, e un logo suo che l'import sostituisce.
  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(creaAnno('2026-09-01', '2027-06-30'), Uri.file(APERTO))
  api.registraDeposito(archivio.deposito)
  const annoQui = archivio.registro.anni[0].id
  archivio.deposito.scrivi(LOGO_QUI, new TextEncoder().encode('png di qui'))
  archivio.modifica((r) => {
    r.materie.push(creaMateria(' matematica '))
    r.classi.push(creaClasse(annoQui, 'II ELE B'))
    r.impostazioni.intestazione.carte[0].logo = LOGO_QUI
  }, ['registro', 'classi'])
})

after(() => smonta(radice, archivio))

describe('registro.sfoglia', () => {
  it('torna il file scelto col dialogo, filtrato sui .regi', async () => {
    const banco = globalThis.__bancoElectron
    banco.rispostaAlleAperture = { canceled: false, filePaths: [SCORSO] }
    try {
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, 'registro.sfoglia', {})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(esito.dati.percorso, SCORSO)
      assert.equal(archivio.revisione, prima)
      assert.deepEqual(banco.aperture.at(-1).filters, [{ name: 'Regiclass', extensions: ['regi'] }])
    } finally {
      banco.rispostaAlleAperture = { canceled: true, filePaths: [] }
    }
  })

  it('chiuso senza scegliere torna null', async () => {
    const esito = await api.chiama(archivio, 'registro.sfoglia', {})
    assert.equal(esito.ok, true)
    assert.equal(esito.dati.percorso, null)
  })
})

describe('registro.altrove', () => {
  it('racconta i blocchi, e che cosa qui c’è già', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'registro.altrove', { percorso: SCORSO })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
    const d = esito.dati
    assert.equal(d.impostazioni.scala, '1–10, sufficienza 6')
    assert.equal(d.impostazioni.loghi, 1)
    assert.equal(d.impostazioni.docente, 'Mario Rossi')
    assert.deepEqual(d.materie, [{ nome: 'Inglese', nuova: true }, { nome: 'Matematica', nuova: false }])
    assert.deepEqual(d.classi.map((c) => [c.nome, c.persone, c.corsi, c.piani, c.esiste]), [
      ['I MEC A', 2, 1, 1, false],
      ['II ELE B', 1, 1, 0, true],
    ])
    assert.deepEqual(d.calendari, ['Sede'])
    assert.equal(d.regole, 2)
  })

  it('rifiuta il documento aperto', async () => {
    const esito = await api.chiama(archivio, 'registro.altrove', { percorso: APERTO })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato')
  })
})

describe('registro.importa', () => {
  it('niente di spuntato si rifiuta, e non scrive', async () => {
    const prima = archivio.revisione
    const esito = await importa({
      impostazioni: false, materie: false, classi: [], calendari: false,
    })
    assert.equal(esito.ok, false)
    assert.match(esito.messaggi.join(' '), /niente da portare/)
    assert.equal(archivio.revisione, prima)
  })

  it('un ingresso senza le spunte si rifiuta prima di leggere', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'registro.importa', { percorso: SCORSO, classi: [] })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(archivio.revisione, prima)
  })

  it('porta i blocchi, ricopia i file, salta la classe che c’è già', async () => {
    const bytePrima = readFileSync(SCORSO)
    const cartellaPrima = readdirSync(dati).sort()
    const esito = await importa()
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.match(esito.dati.messaggio.testo, /1 classe, 2 persone, 1 corso, 1 materia nuova, 1 piano, 1 calendario, 1 regola, impostazioni; saltata II ELE B: c’è già/)
    assert.equal(esito.dati.messaggio.livello, 'avviso')
    const r = archivio.registro

    // La classe, con la foto ricopiata nella sua cartella.
    const mec = r.classi.find((c) => c.nome === 'I MEC A')
    assert.ok(mec)
    const rossi = mec.allievi.find((a) => a.cognome === 'Rossi')
    assert.ok(rossi.foto)
    assert.deepEqual(new Uint8Array(archivio.deposito.leggi(rossi.foto)), BYTE_FOTO)
    assert.equal(r.classi.filter((c) => c.nome === 'II ELE B').length, 1, 'la II ELE B si è raddoppiata')

    // Il corso sta sulla matematica di qui; l'inglese è nato.
    const corso = r.corsi.find((c) => c.classeId === mec.id)
    assert.equal(r.materie.find((m) => m.id === corso.materiaId).nome.trim(), 'matematica')
    assert.ok(r.materie.some((m) => m.nome === 'Inglese'))

    // Il piano, sul corso nuovo, con l'allegato ricopiato.
    assert.equal(r.piani.length, 1)
    const piano = r.piani[0]
    assert.equal(piano.corsoId, corso.id)
    const risorsa = piano.attivita[0].risorse[0]
    assert.notEqual(risorsa.file, SCHEDA)
    assert.deepEqual(new Uint8Array(archivio.deposito.leggi(risorsa.file)), BYTE_SCHEDA)

    // Le impostazioni: scala e firma di là, il logo ricopiato, quello di prima fuori.
    assert.deepEqual(r.impostazioni.scala, { min: 1, max: 10, sufficienza: 6, passo: 0.5 })
    assert.equal(r.impostazioni.sogliaAssenza, 30)
    assert.equal(r.impostazioni.intestazione.docente, 'Mario Rossi')
    const carta = r.impostazioni.intestazione.carte[0]
    assert.equal(carta.sede, 'Scuola di là')
    assert.ok(carta.logo && carta.logo !== LOGO_QUI)
    assert.deepEqual(new Uint8Array(archivio.deposito.leggi(carta.logo)), BYTE_LOGO)
    assert.ok(!archivio.deposito.leggi(LOGO_QUI), 'il logo di prima è rimasto nel documento')
    // Ogni corso su una carta: quello portato e quelli di qui.
    const nominati = r.impostazioni.intestazione.carte.flatMap((c) => c.corsi).sort()
    assert.deepEqual(nominati, r.corsi.map((c) => c.id).sort())

    // Il calendario, con un id nuovo e la copia sotto quell'id; la regola del
    // corso portato riagganciata, quella della classe saltata lasciata là.
    const [calendario] = r.impostazioni.calendario.calendari
    assert.notEqual(calendario.id, 'ics-sede')
    assert.equal(new TextDecoder().decode(archivio.deposito.leggi(`calendari/${calendario.id}.ics`)), ICS)
    assert.deepEqual(r.impostazioni.calendario.regole.map((x) => [x.testo, x.corsoId]), [['MEC A MAT', corso.id]])

    // Niente di quel che è successo là.
    assert.equal(r.lezioni.length, 0)
    assert.equal(r.valutazioni.length, 0)

    // L'origine com'era: stessi byte, nessuna serratura, nessun file nuovo accanto.
    await archivio.salva()
    assert.deepEqual(readFileSync(SCORSO), bytePrima)
    assert.equal(existsSync(percorso.join(dati, '.2025-2026.regi.serratura')), false)
    assert.deepEqual(readdirSync(dati).sort(), cartellaPrima)
  })

  it('una seconda volta si salta tutto quel che c’è già: niente doppioni di classi', async () => {
    const classiPrima = archivio.registro.classi.length
    const esito = await importa({
      impostazioni: false, materie: false, piani: false, calendari: false,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.registro.classi.length, classiPrima)
    assert.match(esito.dati.messaggio.testo, /saltate I MEC A: c’è già; II ELE B: c’è già/)
  })
})
