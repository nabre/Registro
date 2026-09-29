// Le scritture non lasciano dati intestati ad altri né tolgono file di altri:
//
//   - una copia di piano (`piano.perLezione`) ha i suoi file, ed eliminarla non
//     cestina il PDF dell'originale;
//   - `classe.duplica` dà alla copia una foto sua;
//   - `classe.salva` con un elenco più corto toglie le persone con il loro
//     seguito (voti, presenze);
//   - `voto.imposta` e `recupero.imposta` rifiutano persone di un'altra classe;
//   - `lezione.salva` non sposta su un'altra classe un'ora con l'appello, né su
//     un altro corso un'ora citata da momenti, consegne o spunte;
//   - `ore.salva` rifiuta un corso inesistente;
//   - `corso.salva` non cambia classe né materia di un corso esistente;
//   - `materia.unisci` porta le regole del calendario sul corso superstite;
//   - un'eliminazione in un documento che si chiude non cestina i file;
//   - `piano.salva` toglie dal pacchetto i file di una tappa tolta;
//   - `piano.assegna` non lega a una lezione il piano di un altro corso, e un
//     piano generato ha timbri completi e tappe sui minuti dell'UD;
//   - gli identificatori nati nello stesso millisecondo non si ripetono.
//
// Le azioni passano da `esegui`, la strada del pannello, col deposito vero.

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { creaCorso, creaLezione, generaPianoPerLezione } from '../../dist-tests/domain.mjs'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-scritture-piani-')

let api
let archivio
let annoId
let classe
let altra
let rossi
let bianchi
let verdi
let corso
let storia
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
const ISTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

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
  storia = creaMateria('Storia')
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

  it('un’ora citata da un momento non passa a un altro corso', async () => {
    const lezione = oraCon([])
    const citante = api.creaValutazione(corso.id, 'Verifica', archivio.registro.impostazioni.scala, lezione.data)
    citante.lezioneId = lezione.id
    archivio.modifica((r) => { r.valutazioni.push(citante) }, ['valutazioni'])
    const esito = await salva(lezione, corsoStessaClasse.id)
    assert.equal(esito.ok, false)
    assert.equal(lezionePerId(lezione.id).corsoId, corso.id)
  })

  it('nemmeno un’ora citata da una consegna', async () => {
    const lezione = oraCon([])
    const consegna = api.creaConsegna(corso.id, 'Esercizi', lezione.data, lezione.id)
    archivio.modifica((r) => { r.consegne.push(consegna) }, ['consegne'])
    const esito = await salva(lezione, corsoStessaClasse.id)
    assert.equal(esito.ok, false)
  })

  it('nemmeno un’ora citata da una spunta del check', async () => {
    const lezione = oraCon([])
    const lista = {
      id: 'chk-prova-rimando',
      corsoId: corso.id,
      colonne: [],
      spunte: [{
        allievoId: rossi.id, colonnaId: 'col-1', lezioneId: lezione.id, data: lezione.data,
        fattaIl: '2026-10-05T08:30:00.000Z',
      }],
      creatoIl: '2026-10-05T08:30:00.000Z',
      aggiornatoIl: '2026-10-05T08:30:00.000Z',
    }
    archivio.modifica((r) => { r.check.push(lista) }, ['check'])
    const esito = await salva(lezione, corsoStessaClasse.id)
    assert.equal(esito.ok, false)
    archivio.modifica((r) => { r.check = r.check.filter((c) => c.id !== lista.id) }, ['check'])
  })

  it('un appello vuoto nell’ingresso non cancella quello del registro', async () => {
    const lezione = oraCon([{ allievoId: rossi.id, stati: ['assente'] }])
    const esito = await esegui({
      tipo: 'lezione.salva',
      lezione: { ...lezionePerId(lezione.id), corsoId: corsoAltraClasse.id, presenze: [] },
    })
    assert.equal(esito.ok, false)
    assert.equal(lezionePerId(lezione.id).presenze.length, 1)
  })

  it('ore.salva rifiuta un corso che non c’è', async () => {
    const lezione = api.creaLezione('cor-mai-esistito', '2026-10-06', '08:20', 45)
    const esito = await api.chiama(archivio, 'ore.salva', { lezione })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato', JSON.stringify(esito))
    assert.equal(lezionePerId(lezione.id), undefined)
  })

  it('rifiuta un piano assegnato a un altro corso', async () => {
    const pianoAltro = api.creaPiano('Piano altro corso')
    pianoAltro.corsoId = corsoAltraClasse.id
    archivio.modifica((r) => { r.piani.push(pianoAltro) }, ['piani'])
    const ora = oraCon([])
    const esito = await esegui({
      tipo: 'lezione.salva',
      lezione: { ...lezionePerId(ora.id), pianoId: pianoAltro.id },
    })
    assert.equal(esito.ok, false)
  })
})

describe('corso.salva e materia.unisci', () => {
  it('un corso nuovo esige classe e materia esistenti', async () => {
    const corsoInvalido1 = api.creaCorso('cls-mai', storia.id, 'Invalido 1')
    const esito1 = await esegui({ tipo: 'corso.salva', corso: corsoInvalido1 })
    assert.equal(esito1.ok, false)

    const corsoInvalido2 = api.creaCorso(classe.id, 'mat-mai', 'Invalido 2')
    const esito2 = await esegui({ tipo: 'corso.salva', corso: corsoInvalido2 })
    assert.equal(esito2.ok, false)
  })

  it('classe e materia di un corso esistente non cambiano', async () => {
    const vivo = archivio.registro.corsi.find((c) => c.id === corsoStessaClasse.id)
    const esito = await esegui({ tipo: 'corso.salva', corso: { ...vivo, classeId: corsoAltraClasse.classeId } })
    assert.equal(esito.ok, false)
    const materia = await esegui({ tipo: 'corso.salva', corso: { ...vivo, materiaId: corso.materiaId } })
    assert.equal(materia.ok, false)
    assert.equal(archivio.registro.corsi.find((c) => c.id === vivo.id).materiaId, storia.id)
  })

  it('le regole del calendario seguono il corso superstite', async () => {
    const doppia = api.creaMateria('Mate')
    const doppione = api.creaCorso(classe.id, doppia.id, 'I MEC A — Mate')
    archivio.modifica((r) => {
      r.materie.push(doppia)
      r.corsi.push(doppione)
      r.impostazioni.calendario = {
        calendari: [],
        regole: [{ id: 'reg-prova-mate', testo: 'MATE', corsoId: doppione.id }],
      }
    }, ['registro', 'corsi'])
    const esito = await esegui({ tipo: 'materia.unisci', daId: doppia.id, aId: corso.materiaId })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.registro.impostazioni.calendario.regole[0].corsoId, corso.id)
  })
})

describe('eliminare mentre il documento si chiude', () => {
  it('non cestina i file se la scrittura poi sarebbe vietata', async () => {
    const consegna = api.creaConsegna(corso.id, 'Relazione', '2026-10-05')
    const file = 'consegne/prova/relazione.pdf'
    archivio.deposito.scrivi(file, new TextEncoder().encode('pdf'))
    consegna.fileTutti = file
    archivio.modifica((r) => { r.consegne.push(consegna) }, ['consegne'])

    archivio.inChiusura = true
    try {
      await esegui({ tipo: 'consegna.elimina', consegnaId: consegna.id }).catch(() => null)
    } finally {
      archivio.inChiusura = false
    }
    assert.ok(archivio.deposito.esiste(file), 'il file è uscito ma la consegna è rimasta')
    assert.ok(archivio.registro.consegne.some((c) => c.id === consegna.id))
  })
})

describe('generaPianoPerLezione', () => {
  // Pura: un corso fuori dal registro basta.
  const corso = creaCorso('cls-prova', 'mat-prova', 'I MEC A — Matematica')

  it('i timbri sono istanti completi, come quelli di creaPiano', () => {
    const lezione = creaLezione(corso.id, '2026-09-14', '08:20', 45)
    const piano = generaPianoPerLezione(lezione, corso, { minutiUd: 45 })
    assert.match(piano.creatoIl, ISTANTE)
    assert.match(piano.aggiornatoIl, ISTANTE)
  })

  it('con UD da 45′ ogni tappa dura un multiplo di 5 minuti e la scaletta riempie l’ora', () => {
    for (const durata of [45, 90, 135]) {
      const lezione = creaLezione(corso.id, '2026-09-14', '08:20', durata)
      const piano = generaPianoPerLezione(lezione, corso, { minutiUd: 45 })
      for (const tappa of piano.attivita) {
        const minuti = tappa.durataUd * 45
        assert.ok(
          Math.abs(minuti - Math.round(minuti / 5) * 5) < 1e-6,
          `${tappa.titolo}: ${minuti} minuti non sono un multiplo di 5 (ora di ${durata}′)`,
        )
      }
      const totale = piano.attivita.reduce((s, a) => s + a.durataUd * 45, 0)
      assert.ok(Math.abs(totale - durata) < 1e-6, `scaletta di ${totale}′ per un’ora di ${durata}′`)
    }
  })
})

describe('piano.assegna e il corso del piano', () => {
  let lezione
  let suo
  let altrui
  let libero

  before(() => {
    lezione = api.creaLezione(corso.id, '2026-09-14', '08:20', 45)
    suo = api.creaPiano(corso.id)
    altrui = api.creaPiano(corsoStessaClasse.id)
    libero = api.creaPiano(null)
    archivio.modifica((r) => {
      r.lezioni.push(lezione)
      r.piani.push(suo, altrui, libero)
    }, ['lezioni', 'piani'])
  })

  const assegna = (pianoId) =>
    api.esegui(archivio, { tipo: 'piano.assegna', lezioneId: lezione.id, pianoId })
  const pianoDellaLezione = () =>
    archivio.registro.lezioni.find((l) => l.id === lezione.id).pianoId

  it('rifiuta il piano di un altro corso e lascia la lezione com’era', async () => {
    const esito = await assegna(altrui.id)
    assert.equal(esito.ok, false, 'assegnato il piano di un altro corso')
    assert.equal(pianoDellaLezione(), null)
  })

  it('accetta il piano del corso della lezione', async () => {
    const esito = await assegna(suo.id)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(pianoDellaLezione(), suo.id)
  })

  it('accetta un piano senza corso', async () => {
    const esito = await assegna(libero.id)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(pianoDellaLezione(), libero.id)
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
