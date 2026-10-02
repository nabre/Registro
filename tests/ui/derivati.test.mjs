// I conti di `derivato()` (`ui/state.ts`) valgono finché sono le stesse le
// chiavi del registro che hanno letto: un registro nuovo con le stesse
// collezioni (le differenze, `ui/statePatches.ts`) non li rifà, una collezione
// letta cambiata sì, anche quando la legge un conto chiesto dentro un altro.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { registroVuoto, creaAnno, creaClasse, creaMateria, creaCorso, creaLezione } =
  await importaSorgente('core/dominio/factories.ts')

function annoDiProva () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  for (const nome of ['DIC4b', 'DIC4a']) {
    const classe = creaClasse(anno.id, nome)
    classe.docenteDiClasse = true
    const materia = creaMateria('Matematica')
    const corso = creaCorso(classe.id, materia.id, `${nome} · Matematica`)
    registro.classi.push(classe)
    registro.materie.push(materia)
    registro.corsi.push(corso)
    registro.lezioni.push(creaLezione(corso.id, '2026-09-14', '08:20', 45))
  }
  return registro
}

describe('i conti del pannello per collezione', () => {
  it('un registro nuovo con le stesse collezioni lette non rifà il conto', () => {
    const ui = apriInterfaccia({ getState: () => null, setState: () => {} })
    const r0 = annoDiProva()
    ui.aggiorna({ registro: r0, caricato: true })
    const classi = ui.classiVisibili()
    const docente = ui.classiDiCuiSonoDocente()
    assert.deepEqual(classi.map((c) => c.nome), ['DIC4a', 'DIC4b'])

    // Le lezioni cambiate: classi e anno sono gli stessi oggetti.
    const r1 = { ...r0, lezioni: [...r0.lezioni, creaLezione(r0.corsi[0].id, '2026-09-15', '08:20', 45)] }
    ui.aggiorna({ registro: r1 })
    assert.equal(ui.classiVisibili(), classi)
    // Chiesto dentro un altro conto, quello di fuori dipende da quel che ha letto lui.
    assert.equal(ui.classiDiCuiSonoDocente(), docente)

    // Le classi cambiate: il conto si rifà, e con lui chi lo chiede.
    const classiNuove = r1.classi.map((c, i) => i === 0 ? { ...c, docenteDiClasse: false } : c)
    const r2 = { ...r1, classi: classiNuove }
    ui.aggiorna({ registro: r2 })
    assert.notEqual(ui.classiVisibili(), classi)
    assert.deepEqual(ui.classiDiCuiSonoDocente().map((c) => c.nome), ['DIC4a'])

    // L'anno in uso cambiato (una chiave dell'intestazione): anche.
    const altro = creaAnno('2027-09-01', '2028-06-30')
    ui.aggiorna({ registro: { ...r2, anni: [...r2.anni, altro], annoCorrenteId: altro.id } })
    assert.deepEqual(ui.classiVisibili(), [])
    // E il registro della pagina è sempre quello vero, mai la spia dei conti.
    assert.equal(ui.stato.registro.annoCorrenteId, altro.id)
  })
})
