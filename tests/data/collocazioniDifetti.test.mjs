// Dove finiscono i PDF che il registro compone, quando due cose si chiamano
// uguali, e che cosa resta scritto quando qualcosa va storto:
//
//   1. due allievi omonimi nella stessa classe hanno fogli diversi, e «tutti i
//      fogli del corso» li scrive entrambi;
//   2. rifare il foglio di un progetto non butta quello del progetto omonimo
//      (« (2)») né quello di un progetto intitolato davvero «X (2)»;
//   3. la copia materializzata di un PDF aperto altrove non prende il nome di
//      un altro file del documento;
//   4. spegnendo, i fogli in attesa si rifanno invece di sparire;
//   5. un giro di fogli non li materializza su disco: lo fa chi li apre.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-collocazioni-')

let api
let dominio
let archivio
let corso
let primo
let secondo
const progetti = {}

/** Il percorso di un foglio, dal dominio. */
function dove (genere, id, contesto) {
  const collocazione = dominio.collocazioneDi(archivio.registro, genere, id, contesto)
  assert.ok(collocazione, `${genere} ${id} senza posto`)
  return dominio.percorsoDi(collocazione)
}

/** Scrive un foglio con la procedura, come il pulsante. */
async function genera (ingresso) {
  const esito = await api.chiama(archivio, 'rapporti.genera', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return esito.dati.documento
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true, pdfAutomatici: 'mai' }))
  dominio = await import('../../dist-tests/domain.mjs')

  const { creaAllievo, creaClasse, creaCorso, creaMateria, creaProgetto } = api
  const classe = creaClasse(archivio.registro.anni[0].id, 'I MEC A')
  primo = creaAllievo('Rossi', 'Mario')
  secondo = creaAllievo('Rossi', 'Mario')
  classe.allievi.push(primo, creaAllievo('Bianchi', 'Luca'), secondo)
  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  progetti.robotica = creaProgetto(corso.id, 'Robotica')
  progetti.robotica2 = creaProgetto(corso.id, 'Robotica')
  progetti.ponte = creaProgetto(corso.id, 'Ponte')
  progetti.ponteDue = creaProgetto(corso.id, 'Ponte (2)')

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.progetti.push(...Object.values(progetti))
  }, ['classi', 'corsi', 'progetti', 'registro'])

  const esito = await api.esegui(archivio, { tipo: 'rapporto.completo', corsoId: corso.id, semestreId: null })
  assert.ok(esito.ok, JSON.stringify(esito))
})

after(async () => {
  await api?.fermaRapporti(0)
  smonta(radice, archivio)
})

describe('due allievi omonimi nella stessa classe', () => {
  it('hanno schede e fogli di progetto a percorsi diversi', () => {
    const contesto = { corsoId: corso.id, semestreId: null }
    assert.notEqual(dove('allievo', primo.id, contesto), dove('allievo', secondo.id, contesto))
    assert.notEqual(
      dove('allievo', primo.id, { docenteDiClasse: true }),
      dove('allievo', secondo.id, { docenteDiClasse: true }),
    )
    assert.notEqual(
      dove('progetto-allievo', progetti.ponte.id, { corsoId: corso.id, allievoId: primo.id }),
      dove('progetto-allievo', progetti.ponte.id, { corsoId: corso.id, allievoId: secondo.id }),
    )
  })

  it('«tutti i fogli del corso» scrive la scheda di entrambi', () => {
    const contesto = { corsoId: corso.id, semestreId: null }
    for (const allievo of [primo, secondo]) {
      assert.equal(archivio.deposito.esiste(dove('allievo', allievo.id, contesto)), true)
      assert.equal(archivio.deposito.esiste(
        dove('progetto-allievo', progetti.ponte.id, { corsoId: corso.id, allievoId: allievo.id }),
      ), true)
    }
  })
})

describe('rifare il foglio di un progetto', () => {
  it('lascia quello del progetto omonimo, che porta « (2)»', async () => {
    const delSecondo = dove('progetto-classe', progetti.robotica2.id, { corsoId: corso.id })
    assert.match(delSecondo, / \(2\)\.pdf$/)
    assert.equal(archivio.deposito.esiste(delSecondo), true)

    await genera({ genere: 'progetto-classe', id: progetti.robotica.id, corsoId: corso.id })
    assert.equal(archivio.deposito.esiste(delSecondo), true, 'il foglio del progetto omonimo è sparito')
  })

  it('lascia quello di un progetto intitolato davvero «X (2)»', async () => {
    const diPonteDue = dove('progetto-classe', progetti.ponteDue.id, { corsoId: corso.id })
    assert.equal(archivio.deposito.esiste(diPonteDue), true)
    await genera({ genere: 'progetto-classe', id: progetti.ponte.id, corsoId: corso.id })
    assert.equal(archivio.deposito.esiste(diPonteDue), true, 'il foglio di «Ponte (2)» è sparito')
  })

  it('lascia il foglio personale del progetto omonimo', async () => {
    const contesto = { corsoId: corso.id, allievoId: primo.id }
    const delSecondo = dove('progetto-allievo', progetti.robotica2.id, contesto)
    assert.equal(archivio.deposito.esiste(delSecondo), true)
    await genera({ genere: 'progetto-allievo', id: progetti.robotica.id, ...contesto })
    assert.equal(archivio.deposito.esiste(delSecondo), true)
  })

  it('toglie ancora un doppione vero, che nessun progetto vivo scrive', async () => {
    const delPrimo = dove('progetto-classe', progetti.robotica.id, { corsoId: corso.id })
    const doppione = delPrimo.replace(/\.pdf$/, ' (3).pdf')
    archivio.deposito.scrivi(doppione, new TextEncoder().encode('%PDF-1.7\nvecchio\n'))
    await genera({ genere: 'progetto-classe', id: progetti.robotica.id, corsoId: corso.id })
    assert.equal(archivio.deposito.esiste(doppione), false)
  })
})

describe('un giro di fogli', () => {
  it('non materializza i PDF su disco', () => {
    const copie = archivio.deposito.radice()
    assert.ok(copie)
    assert.equal(existsSync(percorso.join(copie.fsPath, 'esportazioni')), false)
  })
})

describe('la copia accanto di un PDF aperto altrove', () => {
  const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-copie-accanto-'))
  after(() => rmSync(cartella, { recursive: true, force: true }))
  let numero = 0

  /** Un deposito su un documento nuovo, con la sua cartella di copie. */
  async function depositoNuovo () {
    const { Deposito } = await import('../../dist-tests/store.mjs')
    const { Pacchetto } = await import('../../dist-tests/package.mjs')
    const { Uri } = await import('../../dist-tests/environment.mjs')
    numero += 1
    const pacchetto = await Pacchetto.apri(Uri.file(percorso.join(cartella, `anno-${numero}.regi`)))
    const d = new Deposito(() => pacchetto, Uri.file(percorso.join(cartella, `copie-${numero}`)))
    /** Il file materializzato di quel nome è una cartella: scriverci fallisce, come su un PDF aperto. */
    const occupa = (nome) => mkdirSync(percorso.join(d.radice().fsPath, 'esportazioni', nome), { recursive: true })
    return { d, occupa }
  }

  const byte = (quanti) => new Uint8Array(quanti).fill(7)

  it('non copre la copia del foglio che si chiama « (2)»', async () => {
    const { d, occupa } = await depositoNuovo()
    d.scrivi('esportazioni/Piano.pdf', byte(100))
    d.scrivi('esportazioni/Piano (2).pdf', byte(200))
    const gemella = await d.materializza('esportazioni/Piano (2).pdf')
    assert.equal(readFileSync(gemella.fsPath).length, 200)

    occupa('Piano.pdf')
    const accanto = await d.materializza('esportazioni/Piano.pdf')
    assert.notEqual(accanto.fsPath, gemella.fsPath)
    assert.equal(readFileSync(accanto.fsPath).length, 100)

    const ancora = await d.materializza('esportazioni/Piano (2).pdf')
    assert.equal(readFileSync(ancora.fsPath).length, 200, 'la gemella apre il PDF dell’altro piano')
  })

  it('se il nome accanto è di un file del documento, la sua copia si rifà', async () => {
    const { d, occupa } = await depositoNuovo()
    d.scrivi('esportazioni/Voti.pdf', byte(100))
    d.scrivi('esportazioni/Voti ~2.pdf', byte(300))
    await d.materializza('esportazioni/Voti ~2.pdf')

    occupa('Voti.pdf')
    await d.materializza('esportazioni/Voti.pdf')

    const suo = await d.materializza('esportazioni/Voti ~2.pdf')
    assert.equal(readFileSync(suo.fsPath).length, 300)
  })
})

describe('lo spegnimento con fogli in attesa', () => {
  it('li rifà invece di scartarli', async () => {
    const { creaClasse, creaCorso, creaMateria, creaAllievo, creaLezione } = api
    const classe = creaClasse(archivio.registro.anni[0].id, 'II ELE B')
    const allievo = creaAllievo('Verdi', 'Anna')
    classe.allievi.push(allievo)
    const materia = creaMateria('Fisica')
    const fisica = creaCorso(classe.id, materia.id, 'II ELE B — Fisica')
    const lezione = creaLezione(fisica.id, '2026-09-08', '08:20', 90)
    archivio.modifica((r) => {
      r.impostazioni.pdfAutomatici = 'sempre'
      r.classi.push(classe)
      r.materie.push(materia)
      r.corsi.push(fisica)
      r.lezioni.push(lezione)
    }, ['classi', 'corsi', 'lezioni', 'registro'])
    try {
      await api.fermaRapporti(0)
      const esito = await api.chiama(
        archivio,
        'ore.appello.riga',
        { lezioneId: lezione.id, allievoId: allievo.id, stato: 'assente' },
        { origine: 'condotto' },
      )
      assert.ok(esito.ok, JSON.stringify(esito))
      assert.equal(api.rigenerazioniInAttesa(), 1)
      const diFisica = () => archivio.deposito.elenca('esportazioni/').filter((p) => p.includes('/II ELE B/'))
      assert.deepEqual(diFisica(), [])

      await api.fermaRapporti()
      assert.equal(api.rigenerazioniInAttesa(), 0)
      assert.ok(diFisica().length > 0, 'i fogli in attesa sono stati scartati')
    } finally {
      archivio.modifica((r) => { r.impostazioni.pdfAutomatici = 'mai' }, ['registro'])
    }
  })
})
