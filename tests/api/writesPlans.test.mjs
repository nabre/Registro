// Le scritture non lasciano dati intestati ad altri né tolgono file di altri:
//
//   - una copia di piano (`piano.perLezione`) ha i suoi file, ed eliminarla non
//     cestina il PDF dell'originale;
//   - `classe.duplica` dà alla copia una foto sua;
//   - `classe.salva` con un elenco più corto toglie le persone con il loro
//     seguito (voti, presenze);
//   - `voto.imposta` e `recupero.imposta` rifiutano persone di un'altra classe;
//   - `lezione.salva` non sposta su un'altra classe un'ora con l'appello;
//   - `piano.salva` toglie dal pacchetto i file di una tappa tolta;
//   - gli identificatori nati nello stesso millisecondo non si ripetono.
//
// Le azioni passano da `esegui`, la strada del pannello, col deposito vero.

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro12-scritture-')

let api
let archivio
let annoId
let classe
let altra
let rossi
let bianchi
let verdi
let corso
let corsoStessaClasse
let corsoAltraClasse
let momento

/** Un'immagine che il dialogo finto «sceglie»: i byte non contano, il nome sì. */
const scelta = percorso.join(radice, 'nuova.png')

const byte = (testo) => new TextEncoder().encode(testo)
const esegui = (azione) => api.esegui(archivio, azione)
const deposito = () => archivio.deposito
const pianoPerId = (id) => archivio.registro.piani.find((p) => p.id === id)
const classePerId = (id) => archivio.registro.classi.find((c) => c.id === id)
const lezionePerId = (id) => archivio.registro.lezioni.find((l) => l.id === id)

/** Un piano con una risorsa-file su una tappa, e il file davvero nel deposito. */
function pianoConFile (nomeFile, titoloTappa = 'Lavoro di gruppo') {
  const piano = api.creaPiano(corso.id)
  const file = `archivio/prove/${nomeFile}`
  deposito().scrivi(file, byte(`contenuto di ${nomeFile}`))
  piano.attivita.push({
    id: `att-${nomeFile}`,
    titolo: titoloTappa,
    tipo: 'spiegazione',
    durataUd: 1,
    descrizione: '',
    materiali: '',
    raggruppamento: 'plenaria',
    risorse: [{
      id: `ris-${nomeFile}`,
      tipo: 'file',
      titolo: nomeFile,
      file,
      nome: nomeFile,
      aggiuntaIl: '2026-09-01T08:00:00.000Z',
    }],
  })
  archivio.modifica((r) => { r.piani.push(piano) }, ['piani'])
  return { piano, file }
}

before(async () => {
  writeFileSync(scelta, byte('png nuovo'))
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    deposito: true,
    pdfAutomatici: 'mai',
  }))
  const {
    creaAllievo, creaClasse, creaCorso, creaMateria, creaValutazione,
  } = api

  annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)
  altra = creaClasse(annoId, 'II ELE B')
  verdi = creaAllievo('Verdi', 'Anna')
  altra.allievi.push(verdi)
  const matematica = creaMateria('Matematica')
  const storia = creaMateria('Storia')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  corsoStessaClasse = creaCorso(classe.id, storia.id, 'I MEC A — Storia')
  corsoAltraClasse = creaCorso(altra.id, matematica.id, 'II ELE B — Matematica')
  momento = creaValutazione(corso.id, 'Verifica sulle frazioni')

  archivio.modifica((r) => {
    r.classi.push(classe, altra)
    r.materie.push(matematica, storia)
    r.corsi.push(corso, corsoStessaClasse, corsoAltraClasse)
    r.valutazioni.push(momento)
  }, ['classi', 'corsi', 'valutazioni', 'registro'])
})

after(() => smonta(radice, archivio))

describe('piano.perLezione con un piano da copiare', () => {
  it('la copia ha i suoi file: eliminarla non cestina quelli dell’originale', async () => {
    const { piano, file } = pianoConFile('scheda-per-lezione.pdf')
    const lezione = api.creaLezione(corso.id, '2026-09-14', '08:20', 45)
    archivio.modifica((r) => { r.lezioni.push(lezione) }, ['lezioni'])

    const esito = await esegui({
      tipo: 'piano.perLezione', lezioneId: lezione.id, daPianoId: piano.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const copia = pianoPerId(esito.creato.id)
    const suo = copia.attivita[0].risorse[0].file
    assert.notEqual(suo, file, 'la copia punta ancora al file dell’originale')
    assert.ok(deposito().esiste(suo))
    assert.equal(lezionePerId(lezione.id).pianoId, copia.id)

    const via = await esegui({ tipo: 'piano.elimina', pianoId: copia.id })
    assert.equal(via.ok, true)
    assert.ok(deposito().esiste(file), 'eliminare la copia ha cestinato il file dell’originale')
  })
})

describe('piano.salva e i file delle tappe tolte', () => {
  it('una tappa tolta nell’editor si porta via il suo file', async () => {
    const { piano, file } = pianoConFile('scheda-tolta.pdf')
    const esito = await esegui({ tipo: 'piano.salva', piano: { ...piano, attivita: [] } })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(deposito().esiste(file), false, 'il file della tappa tolta è rimasto orfano')
  })

  it('un file che un altro piano cita ancora resta', async () => {
    const { piano, file } = pianoConFile('scheda-condivisa.pdf')
    // Un documento vecchio, con una copia che condivide i file dell'originale.
    const gemello = structuredClone(piano)
    gemello.id = 'pia-gemello-0001'
    archivio.modifica((r) => { r.piani.push(gemello) }, ['piani'])

    const esito = await esegui({ tipo: 'piano.salva', piano: { ...piano, attivita: [] } })
    assert.equal(esito.ok, true)
    assert.ok(deposito().esiste(file), 'cestinato un file che un altro piano cita')
  })

  it('senza tappe tolte non si cestina niente', async () => {
    const { piano, file } = pianoConFile('scheda-intatta.pdf')
    const esito = await esegui({ tipo: 'piano.salva', piano: { ...piano, note: 'riviste' } })
    assert.equal(esito.ok, true)
    assert.ok(deposito().esiste(file))
  })
})

describe('le foto di una classe duplicata', () => {
  it('classe.duplica ricopia le foto, e togliere quella della copia lascia l’originale', async () => {
    const foto = 'archivio/docente-di-classe/I MEC A/foto/Rossi Maria.jpg'
    deposito().scrivi(foto, byte('jpeg di Rossi'))
    archivio.modifica((r) => {
      r.classi.find((c) => c.id === classe.id).allievi[0].foto = foto
    }, ['classi'])

    const esito = await esegui({
      tipo: 'classe.duplica', classeId: classe.id, annoId, nome: 'II MEC A',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const copia = classePerId(esito.creato.id).allievi.find((a) => a.cognome === 'Rossi')
    assert.ok(copia.foto, 'la copia ha perso la foto')
    assert.notEqual(copia.foto, foto, 'la copia divide il file con l’originale')
    const suaFoto = copia.foto
    assert.ok(deposito().esiste(suaFoto))

    const via = await esegui({
      tipo: 'allievo.foto.togli', classeId: esito.creato.id, allievoId: copia.id,
    })
    assert.equal(via.ok, true)
    assert.ok(deposito().esiste(foto), 'togliere la foto alla copia l’ha tolta all’originale')
    assert.equal(deposito().esiste(suaFoto), false)
  })

  it('allievo.foto.togli non cestina un file che un altro allievo cita ancora', async () => {
    // Un documento vecchio con due classi sullo stesso file.
    const foto = 'archivio/docente-di-classe/I MEC A/foto/Bianchi Luca.jpg'
    deposito().scrivi(foto, byte('jpeg di Bianchi'))
    const vecchia = structuredClone(classePerId(classe.id))
    vecchia.id = 'cls-vecchia-0001'
    vecchia.nome = 'I MEC A (2025)'
    vecchia.allievi = [{ ...structuredClone(bianchi), id: 'alv-vecchio-0001', foto }]
    archivio.modifica((r) => {
      r.classi.find((c) => c.id === classe.id).allievi[1].foto = foto
      r.classi.push(vecchia)
    }, ['classi'])

    const esito = await esegui({
      tipo: 'allievo.foto.togli', classeId: vecchia.id, allievoId: 'alv-vecchio-0001',
    })
    assert.equal(esito.ok, true)
    assert.equal(classePerId(vecchia.id).allievi[0].foto, undefined)
    assert.ok(deposito().esiste(foto), 'cestinata la foto che l’altra classe cita ancora')
  })

  it('allievo.foto.imposta non cestina né sovrascrive la foto che un altro cita', async () => {
    const foto = 'archivio/docente-di-classe/II ELE B/foto/Verdi Anna.jpg'
    deposito().scrivi(foto, byte('jpeg di Verdi'))
    const vecchia = structuredClone(classePerId(altra.id))
    vecchia.id = 'cls-vecchia-0002'
    vecchia.nome = 'II ELE B (2025)'
    vecchia.allievi = [{ ...structuredClone(verdi), id: 'alv-vecchio-0002', foto }]
    archivio.modifica((r) => {
      r.classi.find((c) => c.id === altra.id).allievi[0].foto = foto
      r.classi.push(vecchia)
    }, ['classi'])

    globalThis.__bancoElectron.rispostaAlleAperture = { canceled: false, filePaths: [scelta] }
    try {
      const esito = await esegui({
        tipo: 'allievo.foto.imposta', classeId: vecchia.id, allievoId: 'alv-vecchio-0002',
      })
      assert.equal(esito.ok, true, JSON.stringify(esito))
    } finally {
      globalThis.__bancoElectron.rispostaAlleAperture = { canceled: true, filePaths: [] }
    }
    const nuova = classePerId(vecchia.id).allievi[0].foto
    assert.notEqual(nuova, foto)
    assert.ok(deposito().esiste(foto), 'cestinata la foto che l’altra classe cita ancora')
    assert.equal(new TextDecoder().decode(deposito().leggi(foto)), 'jpeg di Verdi')
  })
})

describe('classe.salva non toglie persone', () => {
  it('un elenco senza una persona che c’era si rifiuta, e dice che strada prendere', async () => {
    const viva = classePerId(classe.id)
    const esito = await esegui({
      tipo: 'classe.salva',
      classe: { ...viva, allievi: viva.allievi.filter((a) => a.id !== bianchi.id) },
    })
    assert.equal(esito.ok, false)
    assert.match(esito.errori.join(' '), /Bianchi/)
    assert.match(esito.errori.join(' '), /persone\.elimina/)
    assert.ok(classePerId(classe.id).allievi.some((a) => a.id === bianchi.id))
  })

  it('l’elenco intero, con una persona in più, passa come prima', async () => {
    const viva = classePerId(classe.id)
    const nuovo = api.creaAllievo('Neri', 'Paolo')
    const esito = await esegui({
      tipo: 'classe.salva',
      classe: { ...viva, note: 'aggiornata', allievi: [...viva.allievi, nuovo] },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(classePerId(classe.id).allievi.some((a) => a.id === nuovo.id))
  })
})

describe('voti e recuperi solo per chi è della classe', () => {
  const voti = () => archivio.registro.valutazioni.find((v) => v.id === momento.id).voti

  it('voto.imposta rifiuta una persona di un’altra classe', async () => {
    const esito = await esegui({
      tipo: 'voto.imposta', valutazioneId: momento.id, allievoId: verdi.id,
      valore: 5, assente: false,
    })
    assert.equal(esito.ok, false)
    assert.ok(!voti().some((v) => v.allievoId === verdi.id))
  })

  it('recupero.imposta rifiuta una persona di un’altra classe', async () => {
    const esito = await esegui({
      tipo: 'recupero.imposta', valutazioneId: momento.id, allievoId: verdi.id,
      previstoIl: '2026-12-01',
    })
    assert.equal(esito.ok, false)
    assert.ok(!voti().some((v) => v.allievoId === verdi.id))
  })

  it('chi è della classe entra come prima', async () => {
    const esito = await esegui({
      tipo: 'voto.imposta', valutazioneId: momento.id, allievoId: rossi.id,
      valore: 5, assente: false,
    })
    assert.equal(esito.ok, true)
    assert.equal(voti().find((v) => v.allievoId === rossi.id).valore, 5)
  })
})

describe('lezione.salva e il cambio di corso', () => {
  /** Un'ora del corso di matematica, con l'appello come lo si vuole. */
  function oraCon (presenze, altro = {}) {
    const lezione = api.creaLezione(corso.id, '2026-10-05', '08:20', 45)
    Object.assign(lezione, { presenze, ...altro })
    archivio.modifica((r) => { r.lezioni.push(lezione) }, ['lezioni'])
    return lezione
  }
  const salva = (lezione, corsoId) =>
    esegui({ tipo: 'lezione.salva', lezione: { ...lezionePerId(lezione.id), corsoId } })

  it('un’ora con l’appello fatto non passa a un corso di un’altra classe', async () => {
    const ora = oraCon([{ allievoId: rossi.id, stati: ['assente'] }])
    const esito = await salva(ora, corsoAltraClasse.id)
    assert.equal(esito.ok, false)
    assert.equal(lezionePerId(ora.id).corsoId, corso.id)
  })

  it('nemmeno con un’osservazione su una persona', async () => {
    const ora = oraCon([], {
      osservazioni: [{
        id: 'oss-prova-0001', allievoId: rossi.id, tipo: 'nota', testo: 'Assente giustificato',
        creataIl: '2026-10-05T08:30:00.000Z',
      }],
    })
    const esito = await salva(ora, corsoAltraClasse.id)
    assert.equal(esito.ok, false)
  })

  it('con le sole righe mute dell’appello passa, e le righe se ne vanno', async () => {
    const ora = oraCon([
      { allievoId: rossi.id, stati: ['non-impostato'] },
      { allievoId: bianchi.id, stati: ['non-impostato'] },
    ])
    const esito = await salva(ora, corsoAltraClasse.id)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(lezionePerId(ora.id).corsoId, corsoAltraClasse.id)
    assert.deepEqual(lezionePerId(ora.id).presenze, [])
  })

  it('verso un altro corso della stessa classe l’appello resta', async () => {
    const ora = oraCon([{ allievoId: rossi.id, stati: ['assente'] }])
    const esito = await salva(ora, corsoStessaClasse.id)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(lezionePerId(ora.id).presenze.length, 1)
  })
})

describe('gli identificatori nello stesso millisecondo', () => {
  it('cinquemila id nati nello stesso istante sono tutti diversi', async () => {
    const dominio = await import('../../dist-tests/domain.mjs')
    const vero = Date.now
    Date.now = () => 1_790_000_000_000
    let ids
    try {
      ids = Array.from({ length: 5000 }, () => dominio.nuovoIdLezione())
    } finally {
      Date.now = vero
    }
    // Con quattro caratteri casuali (un milione e mezzo di valori) una coppia
    // uguale su cinquemila sarebbe quasi certa.
    assert.equal(new Set(ids).size, ids.length)
  })
})
