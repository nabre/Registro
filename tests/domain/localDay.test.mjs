// Il giorno di un istante si legge sull'orologio di chi insegna, non in UTC:
// si prova che fascicolo stampato e migrazione in consegna usano `giornoDi`.
// Il fuso si fissa in testa al file, perché in UTC le due letture coincidono.

process.env.TZ = 'Europe/Zurich'

const assert = (await import('node:assert/strict')).default
const { describe, it } = await import('node:test')
const { datiFascicolo, normalizzaRegistro } = await import('../../dist-tests/domain.mjs')

/** Mezzanotte e quaranta del 15 marzo, qui: in UTC è ancora il 14. */
const ISTANTE = new Date(2026, 2, 15, 0, 40).toISOString()

function documento () {
  return { id: 'doc-1', allievoId: null, titolo: 'Contratto', categoria: 'altro', file: '', nome: '', aggiuntoIl: ISTANTE }
}

const ANNO = { id: 'a1', inizio: '2025-09-01', fine: '2026-06-30' }

describe('il giorno in cui un documento è stato raccolto', () => {
  it('l’istante di prova cade davvero a cavallo della mezzanotte UTC', () => {
    assert.equal(ISTANTE.slice(0, 10), '2026-03-14')
  })

  it('sul fascicolo stampato è quello dell’orologio locale', () => {
    const registro = normalizzaRegistro({
      anni: [ANNO],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      fascicoli: [{ classeId: 'c1', documenti: [documento()] }],
    })
    const dati = datiFascicolo(registro, registro.classi[0])
    assert.equal(dati.tabelle.documenti.righe[0][3], '15.03.2026')
  })

  it('nella consegna in cui la migrazione lo trasforma è lo stesso', () => {
    const registro = normalizzaRegistro({
      anni: [ANNO],
      materie: [{ id: 'm1', nome: 'Matematica' }],
      classi: [{ id: 'c1', annoId: 'a1', nome: 'I MEC A' }],
      corsi: [{ id: 'cor1', classeId: 'c1', materiaId: 'm1' }],
      fascicoli: [{ classeId: 'c1', documenti: [documento()] }],
    })
    const consegna = registro.consegne.find((c) => c.id === 'doc-1')
    assert.ok(consegna, 'il documento di classe è diventato una consegna')
    assert.equal(consegna.data, '2026-03-15')
  })
})
