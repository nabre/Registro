// Il quadro delle presenze in CSV ha le stesse persone e numeri del PDF e
// delle segnalazioni: solo chi frequenta, tutti da
// `matriceDelCorsoNelPeriodo`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaLezione,
  datiPresenze,
  matriceDelCorsoNelPeriodo,
} from '../../dist-tests/domain.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const { csvPresenze } = await importaSorgente('src/data/exports.ts')

/** Due martedì con l'appello fatto, e Verdi ritirata. */
function scuolaConRitirata () {
  const base = scuolaMinima()
  base.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]
  for (const data of ['2026-09-15', '2026-09-22']) {
    const lezione = creaLezione(base.corso.id, data, '08:00', 90)
    lezione.stato = 'svolta'
    lezione.presenze = [
      { allievoId: base.rossi.id, stati: ['assente', 'presente'] },
      { allievoId: base.bianchi.id, stati: ['presente', 'presente'] },
    ]
    base.registro.lezioni.push(lezione)
  }
  base.verdi.attivo = false
  return base
}

const PERIODO = {
  id: 'sem-prova',
  numero: 1,
  etichetta: 'periodo di prova',
  inizio: '2026-09-15',
  fine: '2026-09-29',
}

describe('il CSV delle presenze', () => {
  it('non ha righe per chi si è ritirato', () => {
    const { registro, classe, corso } = scuolaConRitirata()
    const { matrice } = matriceDelCorsoNelPeriodo(registro, corso, PERIODO)
    const csv = csvPresenze(classe, matrice, PERIODO.etichetta)

    assert.match(csv, /Rossi Maria/)
    assert.match(csv, /Bianchi Luca/)
    assert.doesNotMatch(csv, /Verdi/, 'una ritirata non sta nel quadro')
  })

  it('ha le stesse persone e lo stesso monte ore del PDF', () => {
    const { registro, classe, corso } = scuolaConRitirata()
    const { matrice } = matriceDelCorsoNelPeriodo(registro, corso, PERIODO)
    const csv = csvPresenze(classe, matrice, PERIODO.etichetta)
    const pdf = datiPresenze(registro, corso, PERIODO)

    // Una riga per persona in tutti e due, nello stesso ordine.
    const nomiPdf = pdf.tabelle.presenze.righe.map((riga) => riga[0]).filter((n) => n !== 'Classe')
    for (const nome of nomiPdf) assert.match(csv, new RegExp(nome))
    assert.equal(matrice.righe.length, 2)
    // Tre martedì nel periodo, due UD ciascuno: il cento per cento dell'orario.
    assert.equal(pdf.valori.ud, String(matrice.udPreviste))
    assert.equal(matrice.udPreviste, 6)
    assert.match(csv, /Classe I MEC A — presenze — periodo di prova/)
  })
})
