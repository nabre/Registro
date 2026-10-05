// I controlli delle impostazioni (`core/controlli/`, ADR-52), gli stessi nel
// pannello e nella finestra nativa: come si dividono nome e frase di una
// scelta, quale disegno prende ogni voce del manifesto, e la divisione in aree
// e sezioni della finestra nativa (`areas.ts`), che deve restare quella del
// pannello (`sections.ts`). Quel che si vede e si preme (tastiera, ruoli, esito
// sotto il campo) si prova su Chromium: `tests/interfaccia/controlli.spec.ts`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { disegnoDellaVoce, nomeEAiuto } = await importaSorgente('core/controlli/control.tsx')
const { AREE, sezioniDellArea } = await importaSorgente('core/controlli/areas.ts')
const { IMPOSTAZIONI } = await import('../../dist-tests/manifest.mjs')
const { SEZIONI_PROGRAMMA } = await import('../../dist-tests/settingsSections.mjs')

function voceDi (chiave, altro = {}) {
  const dichiarata = IMPOSTAZIONI[chiave]
  return {
    chiave,
    tipo: dichiarata.tipo,
    etichetta: dichiarata.etichetta ?? chiave,
    descrizione: dichiarata.descrizione,
    formato: dichiarata.formato ?? null,
    scelte: dichiarata.scelte ? dichiarata.scelte.map((s) => ({ ...s })) : null,
    minimo: dichiarata.minimo ?? null,
    massimo: dichiarata.massimo ?? null,
    passo: dichiarata.tipo === 'number' ? dichiarata.passo ?? 1 : null,
    unita: dichiarata.unita ?? null,
    controllo: dichiarata.controllo ?? null,
    scelteDinamiche: dichiarata.scelteDinamiche ?? null,
    sceltaLibera: dichiarata.sceltaLibera ?? false,
    predefinito: dichiarata.predefinito,
    valore: dichiarata.predefinito,
    scritta: false,
    bloccata: null,
    nonPronta: null,
    dipendeDa: dichiarata.dipendeDa ?? null,
    sospesa: false,
    avanzata: dichiarata.avanzata ?? false,
    delCollegamento: chiave.startsWith('registroDocenti.posta.') && chiave !== 'registroDocenti.posta.invioDiretto',
    ...altro,
  }
}

/** Una voce inventata, per i disegni che il manifesto di oggi non usa. */
function voceFinta (altro) {
  return voceDi('registroDocenti.vassoio.attivo', { chiave: 'registroDocenti.prova.voce', etichetta: 'Prova', ...altro })
}

// ------------------------------------------------------------------ le prove

describe('il nome e la frase di una scelta', () => {
  it('si dividono ai due punti o al trattino lungo, e senza separatore l’aiuto è il nome', () => {
    assert.deepEqual(nomeEAiuto('Chiaro: sempre, anche di sera.'), { nome: 'Chiaro', aiuto: 'Sempre, anche di sera.' })
    assert.deepEqual(nomeEAiuto('turbo — il più accurato.'), { nome: 'turbo', aiuto: 'Il più accurato.' })
    assert.deepEqual(nomeEAiuto('Système : suit Windows.'), { nome: 'Système', aiuto: 'Suit Windows.' })
    assert.deepEqual(nomeEAiuto('Solo lettura: si guarda — ma non si cambia.').nome, 'Solo lettura')
    assert.deepEqual(nomeEAiuto('Outlook sul web, nel browser.'), { nome: 'Outlook sul web, nel browser.', aiuto: '' })
  })
})

describe('ogni voce del manifesto prende il suo disegno', () => {
  const disegno = (voce) => disegnoDellaVoce(voce)

  it('ogni chiave ha un disegno', () => {
    for (const chiave of Object.keys(IMPOSTAZIONI)) assert.ok(disegno(voceDi(chiave)), chiave)
  })

  it('figura, segmenti, tendina, interruttore, percorso, modello, collegamento, testo', () => {
    const attesi = {
      'registroDocenti.aspetto.lingua': 'figura',
      'registroDocenti.aspetto.tema': 'figura',
      'registroDocenti.vassoio.attivo': 'interruttore',
      'registroDocenti.promemoria.avviso': 'tendina',
      'registroDocenti.dettatura.taglia': 'segmenti',
      'registroDocenti.api.accesso': 'tendina',
      'registroDocenti.modelli.cartella': 'percorso',
      'registroDocenti.ocr.lettore': 'percorso',
      'registroDocenti.ocr.modello': 'modello',
      'registroDocenti.posta.mittente': 'collegamento',
      'registroDocenti.dettatura.porta': 'numero',
    }
    for (const [chiave, atteso] of Object.entries(attesi)) {
      assert.equal(disegno(voceDi(chiave)), atteso, chiave)
    }
    for (const [chiave, dichiarata] of Object.entries(IMPOSTAZIONI)) {
      if (dichiarata.tipo === 'boolean') assert.equal(disegno(voceDi(chiave)), 'interruttore', chiave)
    }
  })

  it('un segmento con una frase intera dentro diventa tendina; senza disegno, fino a quattro brevi', () => {
    const lunghe = [{ valore: 'a', aiuto: 'Una frase lunga senza nome davanti.' }, { valore: 'b', aiuto: 'B: corta.' }]
    assert.equal(disegno(voceFinta({ tipo: 'string', controllo: 'segmenti', scelte: lunghe, valore: 'a' })), 'tendina')
    const brevi = ['A', 'B', 'C', 'D', 'E'].map((n) => ({ valore: n, aiuto: `${n}: la scelta ${n}.` }))
    assert.equal(disegno(voceFinta({ tipo: 'string', scelte: brevi.slice(0, 4), valore: 'A' })), 'segmenti')
    assert.equal(disegno(voceFinta({ tipo: 'string', scelte: brevi, valore: 'A' })), 'tendina')
  })

  it('un numero è intero se non si dice altro; il cursore vuole i due estremi', () => {
    assert.equal(disegno(voceFinta({ tipo: 'number', valore: 5, passo: 1 })), 'numero')
    assert.equal(disegno(voceFinta({ tipo: 'number', valore: 5, controllo: 'cursore', minimo: 0 })), 'numero')
    assert.equal(disegno(voceFinta({ tipo: 'number', valore: 5, controllo: 'cursore', minimo: 0, massimo: 10 })), 'cursore')
  })
})

describe('le aree della finestra nativa', () => {
  const voci = Object.keys(IMPOSTAZIONI).map((chiave) => voceDi(chiave))

  it('ogni chiave del manifesto sta in una sezione sola, di Utente o di Programma', () => {
    const viste = new Map()
    for (const area of AREE) {
      for (const sezione of sezioniDellArea(area, voci)) {
        assert.ok(['utente', 'programma'].includes(area), `${sezione.id} in ${area}`)
        const sue = [...sezione.gruppi.flatMap((g) => g.voci), ...sezione.avanzate]
        for (const voce of sue) {
          assert.ok(!viste.has(voce.chiave), `${voce.chiave} in ${viste.get(voce.chiave)} e in ${sezione.id}`)
          viste.set(voce.chiave, sezione.id)
        }
      }
    }
    assert.deepEqual([...viste.keys()].sort(), Object.keys(IMPOSTAZIONI).sort())
  })

  it('le sezioni prendono gli stessi prefissi di quelle del pannello', () => {
    for (const area of ['utente', 'programma']) {
      for (const sezione of sezioniDellArea(area, voci)) {
        const delPannello = SEZIONI_PROGRAMMA.find((s) => s.id === sezione.id)
        assert.ok(delPannello, sezione.id)
        const sue = [...sezione.gruppi.flatMap((g) => g.voci), ...sezione.avanzate]
          .map((v) => v.chiave)
        const prefissi = delPannello.prefissi
        for (const chiave of sue) {
          assert.ok(
            delPannello.raccoglie || prefissi.some((p) => chiave === p || chiave.startsWith(`${p}.`)),
            `${chiave} fuori da ${sezione.id}`,
          )
        }
        assert.equal(sezione.titolo, delPannello.titolo)
      }
    }
  })
})
