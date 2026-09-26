// I modelli dei rapporti in tutte le lingue: una struttura sola, le parole per
// lingua. I modelli chiamano le parole per nome (`{{frase.presenze}}`) e le
// parole stanno in `_testi.tpl`, `_testi-de.tpl`…; una frase che manca in una
// lingua esce vuota, senza ripiego. Si controlla che ogni lingua abbia tutte
// le frasi con gli stessi segnaposto, che nessuna sia rimasta in italiano, e
// che i modelli non scrivano parole fuori dai `_testi`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaLezione,
  fileDeiTesti,
  leggiTesti,
  rinominaColonne,
  scegliColonne,
} from '../../dist-tests/domain.mjs'
import { leggiModelli } from '../../tools/templates.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const { LINGUE } = await import('../../dist-tests/i18n.mjs')

const modelli = new Map(leggiModelli().map(({ nome, testo }) => [nome, testo]))
const italiano = leggiTesti(modelli.get(fileDeiTesti('it')) ?? '')
const ALTRE = LINGUE.filter((lingua) => lingua !== 'it')

/** I segnaposto di una frase, in ordine alfabetico: `{{udSenzaAppello}}`. */
function segnaposti (testo) {
  return [...testo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((trovato) => trovato[1]).sort()
}

/**
 * Parole che esistono solo in italiano: due nella stessa frase tradotta
 * vogliono dire che è rimasta com'era (come in `tests/i18n/catalogs.test.mjs`).
 */
const SOLO_ITALIANO = /\b(della|delle|degli|dello|nella|nelle|negli|questo|questa|sono|anche|perché|più|già|dell’|all’|sull’|nell’)\b/giu

describe('le parole dei rapporti, lingua per lingua', () => {
  it('l’italiano ha le sue frasi', () => {
    assert.ok(Object.keys(italiano.frasi).length > 50)
  })

  for (const lingua of ALTRE) {
    const file = fileDeiTesti(lingua)
    const sorgente = modelli.get(file)
    const tradotto = leggiTesti(sorgente ?? '')

    describe(`${file}.tpl`, () => {
      it('c’è, fra i modelli del programma', () => {
        assert.ok(sorgente, `manca templates/${file}.tpl`)
      })

      it('ha le stesse frasi dell’italiano, né una in più né una in meno', () => {
        assert.deepEqual(Object.keys(tradotto.frasi).sort(), Object.keys(italiano.frasi).sort())
      })

      it('nessuna frase vuota', () => {
        const vuote = Object.entries(tradotto.frasi).filter(([, testo]) => testo.trim() === '')
        assert.deepEqual(vuote.map(([nome]) => nome), [])
      })

      it('ogni frase ha gli stessi segnaposto dell’italiano', () => {
        // Un segnaposto perso o scritto male esce vuoto, e sul foglio non si vede.
        const diversi = Object.entries(italiano.frasi)
          .filter(([nome, testo]) => tradotto.frasi[nome] !== undefined &&
            segnaposti(tradotto.frasi[nome]).join() !== segnaposti(testo).join())
          .map(([nome]) => nome)
        assert.deepEqual(diversi, [])
      })

      it('un’etichetta non contiene i segni con cui si dividono i campi', () => {
        // «=», «;» e «|» spezzano una riga `campi:` e i parametri di `usa:`.
        const rotte = Object.entries(italiano.frasi)
          .filter(([, testo]) => !/[=;|]/.test(testo))
          .filter(([nome]) => /[=;|]/.test(tradotto.frasi[nome] ?? ''))
          .map(([nome]) => nome)
        assert.deepEqual(rotte, [])
      })

      it('nessuna frase rimasta in italiano', () => {
        const italiane = (testo) =>
          new Set((testo.match(SOLO_ITALIANO) ?? []).map((p) => p.toLowerCase()))
        const rimaste = Object.entries(tradotto.frasi)
          .filter(([, testo]) => italiane(testo).size >= 2)
          .map(([nome, testo]) => `${nome}: ${testo.slice(0, 60)}`)
        assert.deepEqual(rimaste, [])
      })
    })
  }
})

describe('i modelli non scrivono parole', () => {
  // Le direttive che stampano quel che hanno scritto accanto, e le parti di
  // una riga che finiscono sul foglio così come sono.
  const STAMPANO = new Set(['titolo', 'sottotitolo', 'sezione', 'paragrafo', 'testo', 'avviso', 'riga'])

  /** Quel che resta di un testo tolti i segnaposto, il grassetto e la punteggiatura. */
  const lettere = (testo) => testo.replace(/\{\{[^}]*\}\}/g, '').replace(/[^\p{L}]/gu, '')

  for (const [nome, sorgente] of modelli) {
    if (nome.startsWith('_testi') || nome.includes('.') || nome === '_stile') continue

    it(`«${nome}» chiama le parole per nome`, () => {
      const scritte = []
      sorgente.split(/\r?\n/).forEach((grezza, indice) => {
        const riga = grezza.trim()
        if (riga === '' || riga.startsWith('#') || riga.startsWith('[')) return
        const duePunti = riga.indexOf(':')
        if (duePunti < 0) return
        const chiave = riga.slice(0, duePunti).trim().toLowerCase()
        const valore = riga.slice(duePunti + 1)

        // I parametri di un blocco: il nome e le chiavi sono codice, i valori
        // finiscono sul foglio.
        const pezzi = chiave === 'usa'
          ? valore.split('|').slice(1).join('|').split(';').map((p) => p.slice(p.indexOf('=') + 1))
          // Le etichette dei campi finiscono sul foglio; `| colonne 1` no.
          : chiave === 'campi' || chiave === 'riquadro'
            ? valore.replace(/\|\s*colonne\s+\d+\s*$/i, '').split(';').map((p) => p.split('=')[0])
            : STAMPANO.has(chiave) ? [valore] : []

        for (const pezzo of pezzi) {
          if (lettere(pezzo) !== '') scritte.push(`riga ${indice + 1}: ${riga}`)
        }
      })
      assert.deepEqual(scritte, [], 'parole scritte nel modello invece che in _testi.tpl')
    })
  }
})

describe('le colonne hanno un nome di serie', () => {
  // Un modello sceglie e ribattezza le colonne col nome italiano, che vale in
  // tutte le lingue.
  const tedesca = {
    intestazione: ['LP', 'Lekt. Kurs', '% Anwesenheit'],
    chiavi: ['PiF', 'UD corso', '% presenza'],
    righe: [['Rossi Maria', '4', '100%']],
  }

  it('la scelta delle colonne va per nome di serie', () => {
    const scelta = scegliColonne(tedesca, ['% presenza', 'PiF'])
    assert.deepEqual(scelta.intestazione, ['% Anwesenheit', 'LP'])
    assert.deepEqual(scelta.chiavi, ['% presenza', 'PiF'])
    assert.deepEqual(scelta.righe, [['100%', 'Rossi Maria']])
  })

  it('e anche i nomi nuovi di [colonne]', () => {
    const ribattezzata = rinominaColonne(tedesca, { PiF: 'Name' })
    assert.deepEqual(ribattezzata.intestazione, ['Name', 'Lekt. Kurs', '% Anwesenheit'])
  })
})

// Un bundle solo: la lingua è uno stato del modulo.
const {
  componiCorpo,
  conBase,
  datiPresenze,
  datiLezione,
  impostaLingua,
  leggiBlocchi,
  leggiModello,
  paroleDeiModelli,
} = await importaSorgente([
  "export * from './src/domain/reportData.ts'",
  "export { componiCorpo, conBase, leggiBlocchi, leggiModello } from './src/domain/reports.ts'",
  "export { impostaLingua } from './src/i18n/index.ts'",
  "export { paroleDeiModelli } from './src/data/templates.ts'",
].join('\n'))

describe('un rapporto stampato in un’altra lingua', () => {
  const pezzi = leggiBlocchi(modelli.get('_blocchi'))
  const base = conBase(leggiModello('_base', modelli.get('_base')), leggiModello('_stile', modelli.get('_stile')))

  /** Il corpo di un modello, come lo compone chi stampa in quella lingua. */
  function corpo (nomeModello, lingua, fai) {
    impostaLingua(lingua)
    try {
      const parole = paroleDeiModelli(lingua)
      const dati = { ...fai(), frasi: parole.frasi, colonne: parole.colonne, blocchi: pezzi }
      return componiCorpo(conBase(leggiModello(nomeModello, modelli.get(nomeModello)), base), dati)
    } finally {
      impostaLingua('it')
    }
  }

  const scuola = scuolaMinima()
  scuola.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]
  const lezione = creaLezione(scuola.corso.id, '2026-09-15', '08:00', 90)
  lezione.stato = 'svolta'
  lezione.presenze = [{ allievoId: scuola.rossi.id, stati: ['assente', 'presente'] }]
  scuola.registro.lezioni.push(lezione)

  for (const lingua of ALTRE) {
    it(`${lingua}: le sezioni e le colonne escono nella lingua, senza graffe`, () => {
      const tradotto = leggiTesti(modelli.get(fileDeiTesti(lingua)))
      const blocchi = corpo('presenze-classe', lingua, () => datiPresenze(scuola.registro, scuola.corso, null))

      const sezioni = blocchi.filter((b) => b.tipo === 'sezione').map((b) => b.valore)
      assert.ok(sezioni.includes(tradotto.frasi['per-persona']), sezioni.join(' · '))

      const tabella = blocchi.find((b) => b.tipo === 'tabella')?.tabella
      assert.ok(tabella, 'la tabella delle presenze')
      assert.equal(tabella.chiavi?.[0], 'PiF', 'il nome di serie resta quello italiano')
      assert.notEqual(tabella.intestazione[0], 'PiF', 'e l’intestazione è tradotta')

      for (const blocco of blocchi) {
        if (blocco.tipo === 'tabella') continue
        assert.ok(!blocco.valore.includes('{{'), `«${blocco.valore}»`)
      }
    })

    it(`${lingua}: il verbale ha l’appello nella lingua`, () => {
      const tradotto = leggiTesti(modelli.get(fileDeiTesti(lingua)))
      const blocchi = corpo('verbale-lezione', lingua, () => datiLezione(scuola.registro, lezione, []))
      const sezioni = blocchi.filter((b) => b.tipo === 'sezione').map((b) => b.valore)
      assert.ok(sezioni.includes(tradotto.frasi.presenze), sezioni.join(' · '))
    })
  }
})
