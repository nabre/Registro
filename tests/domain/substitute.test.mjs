// Il pacchetto per chi mi sostituisce, prima di finire nello zip: i nomi che
// non si pestano e il foglio delle foto che dice solo quel che serve in aula.

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

let m

before(async () => {
  m = await importaSorgente([
    "export * from './core/dominio/index.ts'",
    "export * from './core/dominio/substitute.ts'",
  ].join('\n'))
})

/** Un registro con una classe di due allievi, una con l'azienda, e due ore senza orario. */
function registroDiProva () {
  const registro = m.normalizzaRegistro({})
  const anno = m.creaAnno('2026-08-01', '2027-07-31')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  const classe = m.creaClasse(anno.id, '3A')
  const rossi = { ...m.creaAllievo('Rossi', 'Maria'), azienda: 'Officine Bernasconi SA' }
  classe.allievi.push(rossi, m.creaAllievo('Bianchi', 'Luca'))
  const materia = m.creaMateria('Matematica')
  const corso = m.creaCorso(classe.id, materia.id, '3A — Matematica')
  const senzaOrario = () => ({ ...m.creaLezione(corso.id, '2026-10-06', '08:00', 45), slot: [] })
  const mattino = senzaOrario()
  const pomeriggio = senzaOrario()
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)
  registro.lezioni.push(mattino, pomeriggio)
  return { registro, classe, ore: [mattino, pomeriggio].sort(m.confrontaLezioni) }
}

describe('nomeDelloZip', () => {
  it('due supplenze dello stesso giorno senza orario, per la stessa classe, hanno due nomi', () => {
    const { registro, ore: [prima, seconda] } = registroDiProva()
    const uno = m.nomeDelloZip(registro, [prima])
    const due = m.nomeDelloZip(registro, [seconda])
    assert.notEqual(uno, due)
    assert.equal(uno, 'Supplenza 2026-10-06 3A.zip')
    assert.equal(due, 'Supplenza 2026-10-06 3A (2).zip')
  })

  it('la stessa supplenza rifatta ha lo stesso nome, e sostituisce lo zip di prima', () => {
    const { registro, ore: [, seconda] } = registroDiProva()
    assert.equal(m.nomeDelloZip(registro, [seconda]), m.nomeDelloZip(registro, [seconda]))
  })
})

describe('datiFotoSupplenza', () => {
  it('sotto la foto solo il nome: l’azienda non serve a chi sostituisce', () => {
    const { registro, classe } = registroDiProva()
    const celle = m.datiFotoSupplenza(registro, classe).gallerie.allievi.celle
    assert.equal(celle.length, 2)
    assert.ok(celle.some((c) => c.titolo.includes('Rossi')))
    assert.ok(celle.every((c) => c.sotto === ''), JSON.stringify(celle))
  })
})
