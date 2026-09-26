// La migrazione delle cartelle non rispedisce i file nella radice vecchia.
// `dividiClasseEAllievi` svuota le cartelle per tipo (`Verbali/`,
// `Presenze/`) su tre radici (`documentazione/`, `archivio/`,
// `esportazioni/`): ogni file resta nella radice da cui viene. Conta, perché
// `archivio/` non si cancella e `esportazioni/` sì.
//
// La prova costruisce la disposizione vecchia **dentro le radici nuove** e
// guarda dove finiscono i file, sul disco e nel registro.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-migrazione-radici-'))
const lavoro = percorso.join(radice, 'lavoro')
const impostazioni = percorso.join(radice, 'userData')
process.env.REGISTRO_USERDATA = impostazioni

const dati = percorso.join(lavoro, 'registro')

let Archivio
let Uri
let migraArchivio
let creaAllievo
let creaAnno
let creaClasse
let creaCorso
let creaMateria
let creaValutazione

const DAL = '2026-09-01'
const AL = '2027-06-30'
const CLASSE = 'I MEC A'
const MATERIA = 'Matematica'
/** Come si chiama la persona: il suo nome compare dentro il nome dei suoi file. */
const PERSONA = 'Rossi Mario'

let archivio
/** La cartella gemella del documento, dove stanno le radici. */
let gemella

/** Scrive un file finto, creando le cartelle che servono. */
function posa (...pezzi) {
  const dove = percorso.join(gemella, ...pezzi)
  mkdirSync(percorso.dirname(dove), { recursive: true })
  writeFileSync(dove, 'finto')
  return pezzi.join('/')
}

before(async () => {
  mkdirSync(impostazioni, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(impostazioni, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  ;({ Archivio, Uri, migraArchivio } = await import('../../dist-tests/data.mjs'))
  ;({
    creaAllievo, creaAnno, creaClasse, creaCorso, creaMateria, creaValutazione,
  } = await import('../../dist-tests/domain.mjs'))

  archivio = new Archivio(Uri.file(impostazioni))
  await archivio.apri(null)
  await archivio.creaAnno(creaAnno(DAL, AL), Uri.file(percorso.join(dati, '2026-2027.regi')))
  const annoId = archivio.registro.anni[0].id

  const classe = creaClasse(annoId, CLASSE)
  const [cognome, nome] = PERSONA.split(' ')
  const allievo = creaAllievo(cognome, nome)
  classe.allievi.push(allievo)
  const materia = creaMateria(MATERIA)
  const corso = creaCorso(classe.id, materia.id, `${CLASSE} — ${MATERIA}`)

  const momento = creaValutazione(corso.id, 'Frazioni', undefined, '2026-10-05')

  gemella = percorso.join(dati, archivio.cartellaCorrente)

  // La disposizione vecchia già dentro le radici nuove, come la lascia il passo
  // precedente.
  const caricato = posa('archivio', CLASSE, MATERIA, 'Verbali', `${CLASSE}_Verbale_01.pdf`)
  const suo = posa('archivio', CLASSE, MATERIA, 'Prove', `${CLASSE}_Prova_${PERSONA}.pdf`)
  posa('esportazioni', CLASSE, MATERIA, 'Presenze', `${CLASSE}_Presenze.pdf`)
  posa('esportazioni', CLASSE, MATERIA, 'Schede', `${CLASSE}_Scheda_${PERSONA}.pdf`)

  // Due allegati verso `archivio/`: la migrazione riscrive questi riferimenti,
  // da cui il pannello apre il file.
  momento.allegati = [
    {
      id: 'all-1', ruolo: 'verifica', allievoId: null,
      nome: 'Verbale 01.pdf', file: caricato, aggiuntoIl: '2026-10-05T10:00:00.000Z',
    },
    {
      id: 'all-2', ruolo: 'consegna', allievoId: allievo.id,
      nome: 'Prova.pdf', file: suo, aggiuntoIl: '2026-10-05T10:00:00.000Z',
    },
  ]

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.valutazioni.push(momento)
  }, ['classi', 'corsi', 'valutazioni', 'registro'])

  await migraArchivio(archivio)
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

/** Tutti i percorsi che il registro si è segnato dopo la migrazione. */
function percorsiSegnati () {
  return archivio.registro.valutazioni.flatMap((v) => v.allegati.map((a) => a.file))
}

describe('la migrazione svuota le cartelle dentro la radice in cui stanno', () => {
  it('niente torna sotto «documentazione/»', () => {
    assert.equal(
      existsSync(percorso.join(gemella, 'documentazione')),
      false,
      'la cartella vecchia non deve nemmeno rinascere',
    )
    for (const file of percorsiSegnati()) {
      assert.ok(
        !file.startsWith('documentazione/'),
        `il registro punta ancora nella cartella vecchia: ${file}`,
      )
    }
  })

  it('i file caricati restano in «archivio/», divisi fra classe e persone', () => {
    // La materia davanti alla classe: l'ultimo passo della migrazione.
    assert.equal(
      existsSync(percorso.join(gemella, 'archivio', MATERIA, CLASSE, 'classe', `${CLASSE}_Verbale_01.pdf`)),
      true,
    )
    assert.equal(
      existsSync(percorso.join(gemella, 'archivio', MATERIA, CLASSE, 'allievi', PERSONA, `${CLASSE}_Prova_${PERSONA}.pdf`)),
      true,
    )
    // Il registro punta lì, o il pannello segnalerebbe l'allegato come rotto.
    assert.deepEqual(percorsiSegnati().sort(), [
      `archivio/${MATERIA}/${CLASSE}/allievi/${PERSONA}/${CLASSE}_Prova_${PERSONA}.pdf`,
      `archivio/${MATERIA}/${CLASSE}/classe/${CLASSE}_Verbale_01.pdf`,
    ].sort())
  })

  it('le stampe restano in «esportazioni/», che è la radice che si può buttare', () => {
    assert.equal(
      existsSync(percorso.join(gemella, 'esportazioni', MATERIA, CLASSE, 'classe', `${CLASSE}_Presenze.pdf`)),
      true,
    )
    assert.equal(
      existsSync(percorso.join(gemella, 'esportazioni', MATERIA, CLASSE, 'allievi', PERSONA, `${CLASSE}_Scheda_${PERSONA}.pdf`)),
      true,
    )
  })
})
