// La chiave di un gesto: quando due azioni a pochi istanti diventano un passo
// solo da annullare. Due gesti diversi fusi porterebbero via con un Ctrl+Z
// anche il lavoro dell'altro (cinque spunte tolte credendo di toglierne una).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-chiave-gesto-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let chiaveDelGesto

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  ;({ chiaveDelGesto } = await importaSorgente('src/panels/panel.ts', { nodeLlama: 'tests/helpers/fake-node-llama.mjs' }))
})

describe('la chiave di un gesto', () => {
  it('due spunte su due allievi diversi sono due gesti', () => {
    const a = chiaveDelGesto({ tipo: 'consegna.spunta', consegnaId: 'c1', chi: 'al-1', fatta: true })
    const b = chiaveDelGesto({ tipo: 'consegna.spunta', consegnaId: 'c1', chi: 'al-2', fatta: true })
    assert.ok(a && b)
    assert.notEqual(a, b)
  })

  it('la stessa casella cliccata più volte è un gesto solo', () => {
    const a = chiaveDelGesto({ tipo: 'consegna.spunta', consegnaId: 'c1', chi: 'al-1', fatta: true })
    const b = chiaveDelGesto({ tipo: 'consegna.spunta', consegnaId: 'c1', chi: 'al-1', fatta: false })
    assert.ok(a)
    assert.equal(a, b)
  })

  it('le battute nello stesso campo della stessa lezione sono un gesto solo', () => {
    const a = chiaveDelGesto({ tipo: 'lezione.testi', lezioneId: 'l1', consuntivo: 'Equa' })
    const b = chiaveDelGesto({ tipo: 'lezione.testi', lezioneId: 'l1', consuntivo: 'Equazioni di primo' })
    assert.ok(a)
    assert.equal(a, b)
  })

  it('due campi diversi della stessa lezione sono due gesti', () => {
    const a = chiaveDelGesto({ tipo: 'lezione.testi', lezioneId: 'l1', consuntivo: 'x' })
    const b = chiaveDelGesto({ tipo: 'lezione.testi', lezioneId: 'l1', argomenti: 'x' })
    assert.notEqual(a, b)
  })

  it('le presenze distinguono l’ora, e non lo stato scritto', () => {
    const colonna = (ud, stato) => chiaveDelGesto({ tipo: 'presenze.colonna', lezioneId: 'l1', ud, stato })
    assert.notEqual(colonna(1, 'presente'), colonna(2, 'presente'))
    assert.equal(colonna(1, 'presente'), colonna(1, 'assente'))
    const cella = (allievoId, ud, stato) =>
      chiaveDelGesto({ tipo: 'presenze.ud', lezioneId: 'l1', allievoId, ud, stato })
    assert.notEqual(cella('al-1', 1, 'assente'), cella('al-1', 2, 'assente'))
    assert.equal(cella('al-1', 1, 'presente'), cella('al-1', 1, 'assente'))
  })

  it('la settimana dell’anno distingue il giorno, e non la lettera', () => {
    const settimana = (giorno, lettera) => chiaveDelGesto({ tipo: 'anno.settimana', annoId: 'a1', giorno, lettera })
    assert.notEqual(settimana('2026-09-14', 'A'), settimana('2026-09-21', 'A'))
    assert.equal(settimana('2026-09-14', 'A'), settimana('2026-09-14', 'B'))
  })

  it('i valori che non sono quel che si scrive contano tutti: meglio un Ctrl+Z in più', () => {
    const a = chiaveDelGesto({ tipo: 'check.data', corsoId: 'c', allievoId: 'x', colonnaId: 'k', data: '2026-10-01' })
    const b = chiaveDelGesto({ tipo: 'check.data', corsoId: 'c', allievoId: 'y', colonnaId: 'k', data: '2026-10-01' })
    assert.notEqual(a, b)
    const riga = (chi) => chiaveDelGesto({ tipo: 'consegna.raccogli', consegnaId: 'c1', chi })
    assert.notEqual(riga('al-1'), riga('al-2'))
    // Un `null` che dice «nessuna attività» non è la stessa cosa di un'attività.
    const risorsa = (attivitaId) => chiaveDelGesto({
      tipo: 'risorsa.elimina', pianoId: 'p', attivitaId, risorsaId: 'r',
    })
    assert.notEqual(risorsa(null), risorsa('att-1'))
  })

  it('le id annidate contano ancora, e un elenco non si fonde', () => {
    const oss = (id) => chiaveDelGesto({ tipo: 'osservazione.salva', lezioneId: 'l1', osservazione: { id, testo: 't' } })
    assert.notEqual(oss('o1'), oss('o2'))
    assert.equal(
      chiaveDelGesto({ tipo: 'orario.imposta', corsoId: 'c', orario: [] }),
      undefined,
    )
  })
})
