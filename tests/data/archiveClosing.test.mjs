// Chiudere e cambiare anno quando il documento non si lascia scrivere (EPERM
// da OneDrive o dall'antivirus): le modifiche non si buttano, e la risposta non
// dice che è andato tutto bene.
//
// Il disco che rifiuta è finto: `Pacchetto.prototype.salva` sostituito per il
// file bloccato e rimesso alla fine di ogni prova.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, afterEach, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-chiusura-'))
const lavoro = percorso.join(radice, 'lavoro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let Archivio
let Pacchetto
let Uri
let leggiZip
let creaAnnoCorrente
let creaClasse
let salvaVero

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(lavoro, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  ;({ Archivio, Pacchetto, Uri } = await import('../../dist-tests/data.mjs'))
  ;({ leggiZip } = await import('../../dist-tests/zip.mjs'))
  ;({ creaAnnoCorrente, creaClasse } = await import('../../dist-tests/domain.mjs'))
  salvaVero = Pacchetto.prototype.salva
})

afterEach(() => {
  Pacchetto.prototype.salva = salvaVero
})

/** Da qui in poi il file `bloccato` risponde EPERM a ogni scrittura. */
function blocca (bloccato) {
  Pacchetto.prototype.salva = function (...argomenti) {
    if (this.file.fsPath === bloccato.fsPath) {
      return Promise.reject(Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' }))
    }
    return salvaVero.apply(this, argomenti)
  }
}

let contatore = 0
/** Una cartella tutta sua, e dentro il posto di un documento. */
function posto () {
  contatore += 1
  const cartella = percorso.join(radice, `anni-${contatore}`)
  mkdirSync(cartella, { recursive: true })
  return Uri.file(percorso.join(cartella, `anno-${contatore}.regi`))
}

/** Un archivio con un anno aperto, e dentro una classe già scritta. */
async function annoAperto () {
  const archivio = new Archivio(Uri.file(percorso.join(radice, 'utente')))
  const errori = []
  archivio.allErrore((testo) => errori.push(testo))
  await archivio.apri(null)
  const file = posto()
  const anno = await archivio.creaAnno(creaAnnoCorrente(), file)
  archivio.modifica((r) => {
    r.classi.push(creaClasse(anno.id, 'I MEC A'))
  }, ['classi'])
  await archivio.salva()
  return { archivio, file, anno, errori }
}

/** I nomi delle classi scritte nel documento sul disco. */
function classiSulDisco (file) {
  const voce = leggiZip(readFileSync(file.fsPath)).find((v) => v.nome === 'classi.json')
  return voce ? JSON.parse(new TextDecoder().decode(voce.dati)).map((c) => c.nome) : []
}

describe('chiudere un anno che non si lascia scrivere', () => {
  it('«Chiudi l’anno» rifiuta, e le modifiche restano', async () => {
    const { archivio, file, anno, errori } = await annoAperto()
    blocca(file)
    archivio.modifica((r) => {
      r.classi.push(creaClasse(anno.id, 'II MEC B'))
    }, ['classi'])

    const chiuso = await archivio.chiudi()

    assert.equal(chiuso, false, 'un anno con modifiche non scritte non si chiude')
    assert.equal(archivio.documentoAperto?.fsPath, file.fsPath, 'l’anno resta aperto')
    assert.deepEqual(archivio.registro.classi.map((c) => c.nome), ['I MEC A', 'II MEC B'])
    assert.ok(errori.some((e) => /Non lascio/.test(e)), 'il rifiuto si dice')

    // Il file torna libero: il salvataggio dopo porta la modifica sul disco.
    Pacchetto.prototype.salva = salvaVero
    await archivio.salva()
    assert.deepEqual(classiSulDisco(file), ['I MEC A', 'II MEC B'])
    assert.equal(await archivio.chiudi(), true)
    archivio.dispose()
  })

  it('il cambio d’anno rifiuta, e l’anno di prima resta aperto con le sue modifiche', async () => {
    const { archivio, file, anno } = await annoAperto()
    const altro = await annoAperto()
    await altro.archivio.chiudi()
    altro.archivio.dispose()

    blocca(file)
    archivio.modifica((r) => {
      r.classi.push(creaClasse(anno.id, 'III MEC C'))
    }, ['classi'])
    await archivio.apri(altro.file)

    assert.equal(archivio.documentoAperto?.fsPath, file.fsPath)
    assert.ok(archivio.registro.classi.some((c) => c.nome === 'III MEC C'))

    Pacchetto.prototype.salva = salvaVero
    await archivio.apri(altro.file)
    assert.equal(archivio.documentoAperto?.fsPath, altro.file.fsPath, 'libero il file, il cambio passa')
    assert.deepEqual(classiSulDisco(file), ['I MEC A', 'III MEC C'])
    await archivio.chiudi()
    archivio.dispose()
  })

  it('allo spegnimento quel che non si scrive finisce in una copia d’emergenza accanto', async () => {
    const { archivio, file, anno, errori } = await annoAperto()
    blocca(file)
    archivio.modifica((r) => {
      r.classi.push(creaClasse(anno.id, 'IV MEC D'))
    }, ['classi'])

    archivio.spegni()
    assert.equal(await archivio.chiudi(), true)

    const cartella = percorso.dirname(file.fsPath)
    const copie = readdirSync(cartella).filter((n) => n.includes('copia di emergenza') && n.endsWith('.regi'))
    assert.equal(copie.length, 1, 'accanto al documento c’è la sua copia')
    const copia = Uri.file(percorso.join(cartella, copie[0]))
    assert.deepEqual(classiSulDisco(copia), ['I MEC A', 'IV MEC D'])
    assert.ok(errori.some((e) => e.includes(copie[0])), 'e si dice dove sta')
    // La serratura va via lo stesso: lo spegnimento non rifiuta.
    assert.equal(existsSync(percorso.join(cartella, `.${percorso.basename(file.fsPath)}.serratura`)), false)

    // Dopo lo spegnimento nessun documento si riapre: la serratura resterebbe.
    Pacchetto.prototype.salva = salvaVero
    await archivio.apri(file)
    assert.equal(archivio.documentoAperto, null)
    archivio.dispose()
  })
})

describe('fra la chiusura e l’apertura che segue', () => {
  it('una modifica si rifiuta invece di rispondere «fatto» e sparire', async () => {
    const { archivio, anno } = await annoAperto()
    const chiusura = archivio.chiudi()
    // Mentre si chiude: il documento non si nomina più, e scriverci no.
    assert.equal(archivio.documentoAperto, null)
    assert.throws(() => archivio.modifica((r) => {
      r.classi.push(creaClasse(anno.id, 'persa'))
    }, ['classi']), /si sta chiudendo/)
    assert.equal(await chiusura, true)
    // Chiuso, lo stato in memoria è ancora quello dell'anno: niente scritture.
    assert.throws(() => archivio.modifica(() => undefined, ['classi']), /si sta chiudendo/)

    await archivio.apri(null)
    assert.doesNotThrow(() => archivio.modifica(() => undefined, ['classi']))
    archivio.dispose()
  })
})

describe('aprire un anno che non si apre', () => {
  it('l’anno di prima resta aperto, e non si dice aperto quello nuovo', async () => {
    const { archivio, file } = await annoAperto()
    const recente = posto()
    // Scritto da un registro più recente: si rifiuta, e l'anno di prima resta
    // aperto.
    const pacchetto = Pacchetto.nuovo(recente)
    pacchetto.scrivi('registro.json', JSON.stringify({ versione: 999, anno: { id: 'x', etichetta: '2099/2100' }, materie: [] }))
    await pacchetto.salva({ forza: true })

    await archivio.apri(recente)
    assert.equal(archivio.documentoAperto?.fsPath, file.fsPath)
    assert.deepEqual(archivio.registro.classi.map((c) => c.nome), ['I MEC A'])
    // La serratura dell'anno rimasto aperto è ancora lì.
    assert.equal(existsSync(percorso.join(percorso.dirname(file.fsPath), `.${percorso.basename(file.fsPath)}.serratura`)), true)
    await archivio.chiudi()

    // Senza un anno di prima: nessun anno, e nessun documento nominato.
    await archivio.apri(recente)
    assert.equal(archivio.documentoAperto, null)
    assert.equal(archivio.registro.anni.length, 0)
    archivio.dispose()
  })
})
