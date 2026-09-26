// Una stampa è una stampa in ogni lingua («Presenze», «Präsenzliste»,
// «Présences»):
//
//   1. rifarla in un'altra lingua ne prende il posto; quelle di un altro
//      periodo o di un'altra ora restano, distinte dai pezzi del nome che non
//      si traducono;
//   2. la migrazione della cartella unica riconosce come stampa anche quella
//      in un'altra lingua (non finisce in `archivio/`), e un caricamento vero
//      resta un caricamento.
//
// La prova gira in italiano e posa le stampe delle altre lingue coi loro nomi.
// Gira su `dist-tests/data.mjs`: anno in uso e deposito sono di modulo.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-stampe-lingue-')

const CLASSE = 'DIC4a'
const MATERIA = 'Matematica'
/** Dove finiscono le stampe della classe per quella materia. */
const CARTELLA = `esportazioni/${MATERIA}/${CLASSE}/classe`
/** Anno, classe e materia: come comincia il nome di ogni stampa. */
const TESTA = `2026-2027_${CLASSE}_${MATERIA}`

let moduli
let archivio
/** La cartella gemella del documento, dove la migrazione sposta i file. */
let gemella

/** Il contenuto di un PDF finto: basta che si riconosca. */
function pdf (etichetta) {
  return Buffer.from(`%PDF-1.7\n${etichetta}\n`, 'utf8')
}

/** Scrive un file finto sul disco, dentro la cartella gemella. */
function posa (...pezzi) {
  const dove = percorso.join(gemella, ...pezzi)
  mkdirSync(percorso.dirname(dove), { recursive: true })
  writeFileSync(dove, pdf(pezzi.at(-1)))
}

/** Vero se il file c'è sul disco, al percorso relativo alla cartella gemella. */
function sulDisco (relativo) {
  return existsSync(percorso.join(gemella, ...relativo.split('/')))
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
  const { creaAnno, creaClasse, creaCorso, creaMateria } =
    await import('../../dist-tests/domain.mjs')

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )

  // Una classe con un corso solo: le presenze di `docente-di-classe/` passano
  // sotto la materia.
  const classe = creaClasse(archivio.registro.anni[0].id, CLASSE)
  const materia = creaMateria(MATERIA)
  const corso = creaCorso(classe.id, materia.id, `${CLASSE} — ${MATERIA}`)
  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])

  gemella = percorso.join(dati, archivio.cartellaCorrente)
})

after(() => {
  archivio?.dispose()
  smonta(radice)
})

describe('rifare una stampa in un’altra lingua', () => {
  it('prende il posto della stessa stampa nelle altre lingue', async () => {
    const { deposito, riscrivi } = moduli
    const tedesca = `${CARTELLA}/${TESTA}_Präsenzliste_ganzes Jahr.pdf`
    const francese = `${CARTELLA}/${TESTA}_Présences_année entière.pdf`
    // Lo stesso documento di un altro periodo: il semestre non si traduce e la
    // tiene distinta.
    const altroPeriodo = `${CARTELLA}/${TESTA}_Attendance_1° semestre.pdf`
    // Un altro documento dello stesso periodo.
    const valutazioni = `${CARTELLA}/${TESTA}_Beurteilungen_ganzes Jahr.pdf`
    for (const file of [tedesca, francese, altroPeriodo, valutazioni]) {
      deposito().scrivi(file, pdf(file))
    }

    const italiana = `${CARTELLA}/${TESTA}_Presenze_anno intero.pdf`
    const esito = await riscrivi(italiana, pdf('oggi'))

    assert.deepEqual(esito, { relativo: italiana })
    assert.equal(deposito().esiste(italiana), true)
    assert.equal(deposito().esiste(tedesca), false, 'la copia tedesca resta accanto')
    assert.equal(deposito().esiste(francese), false, 'la copia francese resta accanto')
    assert.equal(deposito().esiste(altroPeriodo), true, 'un altro periodo non è la stessa stampa')
    assert.equal(deposito().esiste(valutazioni), true, 'un altro documento non è la stessa stampa')
  })

  it('il verbale di un’altra ora resta, anche nella stessa lingua di quello tolto', async () => {
    const { deposito, riscrivi } = moduli
    const stessaOra = `${CARTELLA}/${TESTA}_Protokolle_260907 08.20.pdf`
    const inglese = `${CARTELLA}/${TESTA}_Lesson records_260907 08.20.pdf`
    const altraOra = `${CARTELLA}/${TESTA}_Protokolle_260907 10.10.pdf`
    for (const file of [stessaOra, inglese, altraOra]) deposito().scrivi(file, pdf(file))

    await riscrivi(`${CARTELLA}/${TESTA}_Verbali_260907 08.20.pdf`, pdf('verbale'))

    assert.equal(deposito().esiste(stessaOra), false)
    assert.equal(deposito().esiste(inglese), false)
    assert.equal(deposito().esiste(altraOra), true)
  })

  it('un fascicolo composto no: il suo nome l’ha scelto qualcuno', async () => {
    const { deposito, riscrivi } = moduli
    const cartella = `esportazioni/docente-di-classe/${CLASSE}/classe`
    const suo = `${cartella}/${CLASSE}_Protokolle.pdf`
    deposito().scrivi(suo, pdf(suo))

    await riscrivi(`${cartella}/${CLASSE}_Verbali.pdf`, pdf('fascicolo'), [], { doppioni: false })

    assert.equal(deposito().esiste(suo), true)
  })
})

describe('la migrazione della cartella unica, con stampe fatte in altre lingue', () => {
  before(async () => {
    // Le presenze vecchie stavano sotto il docente di classe, una cartella per
    // documento: qui col nome tedesco.
    posa('documentazione', CLASSE, 'docente-di-classe', 'Präsenzliste',
      `${CLASSE}_Präsenzliste_ganzes Jahr.pdf`)
    posa('documentazione', CLASSE, MATERIA, `${CLASSE}_Procès-verbaux_260907 08.20.pdf`)
    posa('documentazione', CLASSE, MATERIA, `${CLASSE}_Class photo_261001.pdf`)
    // Un caricamento: non si chiama come nessuna stampa, in nessuna lingua.
    posa('documentazione', CLASSE, MATERIA, `${CLASSE}_Verifica 1_testo.pdf`)

    await moduli.migraArchivio(archivio)
  })

  it('le stampe in tedesco, francese e inglese finiscono fra le stampe', () => {
    for (const nome of [
      `${CLASSE}_Präsenzliste_ganzes Jahr.pdf`,
      `${CLASSE}_Procès-verbaux_260907 08.20.pdf`,
      `${CLASSE}_Class photo_261001.pdf`,
    ]) {
      assert.equal(sulDisco(`${CARTELLA}/${nome}`), true, `${nome} non è fra le stampe`)
      assert.equal(
        sulDisco(`archivio/${MATERIA}/${CLASSE}/classe/${nome}`),
        false,
        `${nome} è finito fra i caricamenti`,
      )
    }
  })

  it('il caricamento resta in «archivio/»', () => {
    const caricato = `${CLASSE}_Verifica 1_testo.pdf`
    assert.equal(sulDisco(`archivio/${MATERIA}/${CLASSE}/classe/${caricato}`), true)
    assert.equal(sulDisco(`${CARTELLA}/${caricato}`), false)
  })

  it('la cartella di prima se ne va', () => {
    assert.equal(existsSync(percorso.join(gemella, 'documentazione')), false)
  })
})
