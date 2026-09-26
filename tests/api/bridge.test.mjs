// Il ponte: una procedura che dichiara `azione: 'presenze.riga'` prende il
// posto di quel gestore nel centralino, e per il pannello non cambia niente.
// Si guarda che il centralino conosca tutte le azioni prese in carico, che un
// rifiuto torni come `{ ok: false, errori }`, e che nessuna procedura si agganci
// a un'azione che il protocollo non dichiara (`azione` è una stringa).

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-ponte-')

let api
let archivio
let lezione
let rossi

/**
 * I tipi di azione del protocollo, letti dal sorgente: `Azione` a runtime non
 * esiste, e `azioneValida` direbbe vero anche per le chiavi appena aggiunte.
 */
function tipiDelProtocollo () {
  const file = fileURLToPath(new URL('../../src/protocol.ts', import.meta.url))
  const sorgente = readFileSync(file, 'utf8')
  const trovati = [...sorgente.matchAll(/^\s*\|?\s*(?:\{\s*)?tipo:\s*'([^']+)'/gm)].map((m) => m[1])
  assert.ok(trovati.length > 100, `il protocollo si legge male: ${trovati.length} tipi trovati`)
  return new Set(trovati)
}

before(async () => {
  // PDF automatici fermi: qui si prova il centralino.
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    registra: false,
    pdfAutomatici: 'mai',
  }))
  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  const annoId = archivio.registro.anni[0].id

  const classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')
  lezione = creaLezione(corso.id, '2026-09-01', '08:20', 90)

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(() => smonta(radice, archivio))

describe('il centralino dopo il ponte', () => {
  it('conosce ancora tutte le azioni passate sotto contratto', () => {
    const sotto = api.azioniSottoContratto()
    assert.ok(sotto.length > 0, 'nessuna azione è passata sotto contratto')
    for (const azione of sotto) {
      assert.ok(api.azioneValida(azione), `il centralino non conosce più «${azione}»`)
    }
  })

  it('nessuna procedura si aggancia a un’azione che il protocollo non dichiara', () => {
    const tipi = tipiDelProtocollo()
    const orfane = api.procedure()
      .filter((p) => p.azione)
      .filter((p) => !tipi.has(p.azione))
      .map((p) => `${p.nome} → ${p.azione}`)
    assert.deepEqual(orfane, [], 'procedure agganciate a un’azione inesistente')
  })

  it('ogni azione è presa in carico da una procedura sola', () => {
    // Due procedure sulla stessa azione: nella mappa vince l'ultima, e l'altra non
    // viene chiamata mai.
    const prese = api.procedure().map((p) => p.azione).filter(Boolean)
    assert.deepEqual([...new Set(prese)].sort(), [...prese].sort())
  })
})

describe('un’azione che già funzionava', () => {
  it('si comporta come prima: ok, e l’appello scritto', async () => {
    const esito = await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: lezione.id,
      allievoId: rossi.id,
      stato: 'presente',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))

    const riga = archivio.registro.lezioni
      .find((l) => l.id === lezione.id)
      .presenze.find((p) => p.allievoId === rossi.id)
    assert.deepEqual(riga.stati, ['presente', 'presente'])
  })

  it('con un ingresso cattivo torna { ok:false, errori }, non una busta nuova', async () => {
    // La forma che il pannello sa mostrare: `aEsitoAzione` trasforma `messaggi` in
    // `errori`.
    const esito = await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: lezione.id,
      allievoId: rossi.id,
      stato: 'boh',
    })
    assert.equal(esito.ok, false)
    assert.ok(Array.isArray(esito.errori))
    assert.ok(esito.errori.length > 0)
    // I campi della busta restano fuori.
    assert.equal(esito.api, undefined)
    assert.equal(esito.messaggi, undefined)
  })

  it('il codice del rifiuto arriva fino al pannello, e con lui il tracciato', () => {
    // `codice` e `tracciato` arrivano anche al pannello: il codice decide se
    // ritentare, il tracciato ritrova la chiamata nel giornale.
    return (async () => {
      const cattivo = await api.esegui(archivio, {
        tipo: 'presenze.riga',
        lezioneId: lezione.id,
        allievoId: rossi.id,
        stato: 'boh',
      })
      assert.equal(cattivo.codice, 'ingresso-non-valido')
      assert.equal(typeof cattivo.tracciato, 'string')

      const sparita = await api.esegui(archivio, {
        tipo: 'presenze.riga',
        lezioneId: 'lez-non-esiste-qui',
        allievoId: rossi.id,
        stato: 'presente',
      })
      // «Non c'è più» si ritenta dopo aver riletto, «non si può» no.
      assert.equal(sparita.codice, 'non-trovato')
    })()
  })

  it('un rifiuto del contratto non lascia niente scritto', async () => {
    const revisione = archivio.revisione
    await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: lezione.id,
      allievoId: rossi.id,
      stato: 'boh',
    })
    assert.equal(archivio.revisione, revisione)
  })

  it('«non c’è più» resta una frase leggibile, non un codice a schermo', async () => {
    // A chi ha premuto resta la frase in italiano, intatta.
    const esito = await api.esegui(archivio, {
      tipo: 'presenze.riga',
      lezioneId: 'lez-sparita-0001',
      allievoId: rossi.id,
      stato: 'presente',
    })
    assert.equal(esito.ok, false)
    assert.match(esito.errori[0], /Lezione/)
  })
})
