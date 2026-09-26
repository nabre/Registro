// Le parole di categoria nelle altre lingue: «persone.cerca» con «Lernende»,
// «élève» o «learners» è la domanda «tutte». Le forme si tolgono come quelle
// italiane (`reads.test.mjs`), con accenti e maiuscole come le scrive chi
// chiede, e il resto della ricerca resta.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-categoria-')

let api
let archivio

before(async () => {
  ({ api, archivio } = await archivioDiProva({ lavoro, dati }))
  const { creaAllievo, creaClasse } = api
  const classe = creaClasse(archivio.registro.anni[0].id, 'I MEC A')
  classe.allievi.push(creaAllievo('Rossi', 'Maria'), creaAllievo('Bianchi', 'Luca'))
  archivio.modifica((r) => { r.classi.push(classe) }, ['classi'])
})

after(() => smonta(radice, archivio))

describe('persone.cerca — le parole di categoria in tedesco, francese e inglese', () => {
  it('la parola che nomina la categoria non filtra: tornano tutte, e la busta lo dice', async () => {
    for (const [scritta, tolta] of [
      ['Lernende', 'lernende'],
      ['Lernenden', 'lernenden'],
      ['Personen', 'personen'],
      ['élève', 'eleve'],
      ['élèves', 'eleves'],
      ['Personnes', 'personnes'],
      ['apprentis', 'apprentis'],
      ['learner', 'learner'],
      ['learners', 'learners'],
      ['Students', 'students'],
      ['people', 'people'],
    ]) {
      const esito = await api.chiama(archivio, 'persone.cerca', { cerca: scritta })
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(esito.dati.quante, 2, `«${scritta}» ha filtrato qualcosa`)
      assert.equal(esito.dati.cerca, '', 'il filtro applicato è nessun filtro')
      assert.equal(esito.dati.ignorato, tolta, 'e la busta dice che cosa ha tolto')
    }
  })

  it('tolta la parola di categoria, il resto del filtro resta', async () => {
    for (const cercato of ['Rossi Lernende', 'élève rossi', 'rossi learners']) {
      const esito = await api.chiama(archivio, 'persone.cerca', { cerca: cercato })
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.deepEqual(
        esito.dati.persone.map((p) => p.nomeCompleto),
        ['Rossi Maria'],
        `«${cercato}» non ha trovato solo Rossi`,
      )
      assert.equal(esito.dati.cerca, 'rossi')
    }
  })

  it('le parole italiane si tolgono come prima', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { cerca: 'allievi' })
    assert.equal(esito.dati.quante, 2)
    assert.equal(esito.dati.ignorato, 'allievi')
  })
})
