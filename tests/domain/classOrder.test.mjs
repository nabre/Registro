// Le classi in ordine numerico: la IV INF2 prima della IV INF10, in ogni
// elenco che le mostra una sotto l'altra (compleanni, cose da fare, richieste
// di firma).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  compleanniDelGiorno,
  creaAllievo,
  creaBloccoAssenze,
  creaClasse,
  richiesteFirma,
  riepilogoTodo,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

describe('le classi in ordine numerico', () => {
  /** Due classi dello stesso anno, INF10 e INF2, con una persona ciascuna nata lo stesso giorno. */
  function dueClassi () {
    const base = scuolaMinima()
    const classi = ['INF10', 'INF2'].map((nome) => {
      const classe = creaClasse(base.anno.id, nome)
      const allievo = creaAllievo(`Neri ${nome}`, 'Ugo')
      allievo.dataNascita = '2008-10-19'
      classe.allievi.push(allievo)
      base.registro.classi.push(classe)
      return classe
    })
    return { ...base, classi }
  }

  it('nei compleanni del giorno', () => {
    const { registro, anno } = dueClassi()
    const giorno = compleanniDelGiorno(registro, anno.id, '2026-10-19')
    assert.deepEqual(giorno.map((c) => c.classe), ['INF2', 'INF10'])
  })

  it('nel riepilogo delle cose da fare', () => {
    const { registro, classi } = dueClassi()
    const riepilogo = riepilogoTodo(registro, classi, [], '2026-10-19')
    assert.deepEqual(riepilogo.classi.map((c) => c.classe), ['INF2', 'INF10'])
  })

  it('nelle richieste di firma', () => {
    const { classi } = dueClassi()
    const fascicoli = classi.map((classe) => ({
      classeId: classe.id,
      assenze: [
        {
          ...creaBloccoAssenze('2025-09-01', '2026-01-31', undefined, '1° semestre'),
          righe: [
            {
              allievoId: classe.allievi[0].id,
              fogli: [{ tipo: 'assenze', firmato: false, file: 'a.pdf', nome: 'a.pdf', aggiuntoIl: '2026-01-10' }],
              invio: null,
              note: '',
            },
          ],
        },
      ],
    }))
    const gruppi = richiesteFirma({ fascicoli }, classi)
    assert.deepEqual(gruppi.daSpedire.map((r) => r.classe), ['INF2', 'INF10'])
  })
})

