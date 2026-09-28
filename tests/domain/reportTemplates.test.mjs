// I modelli di `templates/` e i dati che il registro gli mette dentro. Un
// `{{nome}}` che nessuno riempie sparisce in silenzio, e una `tabella:` con un
// nome che il registro non produce toglie la sezione: qui si controlla che
// ogni segnaposto, elenco e tabella dei modelli di serie trovi qualcosa.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  componiCorpo,
  conBase,
  leggiBlocchi,
  leggiRichiestaBlocco,
  leggiRichiestaGalleria,
  leggiRichiestaTabella,
  leggiTesti,
  leggiModello,
} from '../../dist-tests/domain.mjs'

import { leggiModelli } from '../../tools/templates.mjs'
import { datiDelGenere, registroCompleto } from '../helpers/modelli.mjs'

/** In intestazione e piede li mette l'impaginatore, non i dati del rapporto. */
const DELLA_PAGINA = new Set(['pagina', 'pagine'])

/**
 * Il genere di dati che riceve ogni rapporto: la stessa coppia che
 * `actions/reports.ts` fa, scritta qui e non letta dal catalogo.
 */
const GENERE_DEL_RAPPORTO = {
  'verbale-lezione': 'lezione',
  'momento-valutazione': 'momento',
  'piano-lezione': 'piano',
  'valutazioni-classe': 'valutazioni',
  'presenze-classe': 'presenze',
  'fascicolo-classe': 'fascicolo',
  'scheda-allievo': 'allievo',
  'foto-classe': 'foto-classe',
}

/** Che cosa ogni modello riceve. */
function datiPerModello (registro) {
  return Object.fromEntries(Object.entries(GENERE_DEL_RAPPORTO)
    .map(([nome, genere]) => [nome, datiDelGenere(registro, genere)]))
}

/**
 * I nomi che un modello chiede: segnaposto, elenchi, tabelle, grafici. Un
 * `{{frase.nome}}` è una frase di `_testi.tpl`: si guardano i segnaposto
 * scritti dentro di lei.
 */
function chiesti (modello, frasi = {}, pezzi = {}) {
  const segnaposto = new Set()
  const elenchi = new Set()
  const tabelle = new Set()
  const grafici = new Set()
  const gallerie = new Set()
  const condizioni = new Set()
  const fraseMancante = []

  // `locali` sono i parametri del blocco: li riempie chi lo chiama, non i dati.
  const daTesto = (testo, dentroUnaFrase = false, locali = new Set()) => {
    for (const trovato of testo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) {
      const nome = trovato[1]
      if (!nome.startsWith('frase.')) {
        if (!locali.has(nome)) segnaposto.add(nome)
        continue
      }
      // Una frase dentro una frase non si risolve: `riempi` fa un giro solo.
      if (dentroUnaFrase) continue
      const frase = frasi[nome.slice('frase.'.length)]
      if (frase === undefined) fraseMancante.push(nome)
      else daTesto(frase, true)
    }
  }

  for (const riga of [...modello.intestazione, ...modello.piede]) {
    daTesto(`${riga.sinistra} ${riga.centro} ${riga.destra}`)
  }

  // I blocchi si aprono: quel che sta in un `usa:` è contenuto del rapporto.
  const bloccoMancante = []
  const percorri = (blocchi, dentro = new Set(), locali = new Set()) => {
    for (const blocco of blocchi) {
      if (blocco.tipo === 'usa') {
        const { nome, parametri } = leggiRichiestaBlocco(blocco.valore)
        // I parametri li scrive chi chiama, con i segnaposto del suo rapporto.
        for (const valore of Object.values(parametri)) daTesto(valore, false, locali)
        if (!(nome in pezzi)) bloccoMancante.push(nome)
        else if (!dentro.has(nome)) {
          percorri(pezzi[nome], new Set([...dentro, nome]), new Set(Object.keys(parametri)))
        }
        continue
      }
      // Un `se:` può nominare una tabella o un elenco: «c'è qualcosa da mostrare?».
      if (blocco.tipo === 'se' || blocco.tipo === 'altrimenti') {
        const solo = blocco.valore.trim().match(/^\{\{\s*([\w.-]+)\s*\}\}$/)
        if (solo) condizioni.add(solo[1])
        else daTesto(blocco.valore, false, locali)
        continue
      }
      if (blocco.tipo === 'elenco') elenchi.add(blocco.valore)
      else if (blocco.tipo === 'tabella') tabelle.add(leggiRichiestaTabella(blocco.valore).nome)
      else if (blocco.tipo === 'grafico') grafici.add(blocco.valore)
      else if (blocco.tipo === 'galleria') gallerie.add(leggiRichiestaGalleria(blocco.valore).nome)
      else daTesto(blocco.valore, false, locali)
    }
  }
  percorri(modello.corpo)

  return {
    segnaposto, elenchi, tabelle, grafici, gallerie, condizioni, fraseMancante, bloccoMancante,
  }
}

describe('i modelli di serie e i dati dei rapporti', () => {
  const modelli = new Map(leggiModelli().map(({ nome, testo }) => [nome, testo]))
  // Gli strati si compongono come nel registro: `_stile` sotto `_base`, `_base`
  // sotto ogni rapporto.
  const base = conBase(
    leggiModello('_base', modelli.get('_base')),
    leggiModello('_stile', modelli.get('_stile')),
  )
  const registro = registroCompleto()
  const dati = datiPerModello(registro)
  const parole = leggiTesti(modelli.get('_testi') ?? '')
  const pezzi = leggiBlocchi(modelli.get('_blocchi') ?? '')

  it('sono uno per rapporto, e nessuno di più', () => {
    // Ogni modello in cartella ha un'azione che lo riempie, e viceversa. Il
    // trattino basso segna gli strati comuni (`_base`, `_stile`), che da soli non
    // si stampano.
    assert.deepEqual(
      [...modelli.keys()].filter((nome) => !nome.startsWith('_')).sort(),
      Object.keys(dati).sort(),
    )
  })

  for (const nome of Object.keys(dati).sort()) {
    it(`«${nome}» chiede solo quel che il registro produce`, () => {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      const chiesto = chiesti(modello, parole.frasi, pezzi)
      const {
        segnaposto, elenchi, tabelle, grafici, gallerie, condizioni, fraseMancante, bloccoMancante,
      } = chiesto
      const suoi = dati[nome]

      assert.deepEqual(fraseMancante, [], `frasi che _testi.tpl non ha: ${fraseMancante.join(', ')}`)
      assert.deepEqual(bloccoMancante, [], `blocchi che _blocchi.tpl non ha: ${bloccoMancante.join(', ')}`)

      const mancanti = [...segnaposto]
        .filter((chiave) => !DELLA_PAGINA.has(chiave))
        .filter((chiave) => !(chiave in suoi.valori))
      assert.deepEqual(mancanti, [], `segnaposto senza valore: ${mancanti.join(', ')}`)

      const senzaElenco = [...elenchi].filter((chiave) => !(chiave in suoi.elenchi))
      assert.deepEqual(senzaElenco, [], `elenchi senza dati: ${senzaElenco.join(', ')}`)

      const senzaTabella = [...tabelle].filter((chiave) => !(chiave in suoi.tabelle))
      assert.deepEqual(senzaTabella, [], `tabelle senza dati: ${senzaTabella.join(', ')}`)

      const senzaGrafico = [...grafici].filter((chiave) => !(chiave in suoi.grafici))
      assert.deepEqual(senzaGrafico, [], `grafici senza dati: ${senzaGrafico.join(', ')}`)

      const senzaGalleria = [...gallerie].filter((chiave) => !(chiave in (suoi.gallerie ?? {})))
      assert.deepEqual(senzaGalleria, [], `gallerie senza dati: ${senzaGalleria.join(', ')}`)

      // Un `se:` che nomina qualcosa che non esiste è sempre falso: il pezzo non si
      // stamperebbe mai.
      const senzaNiente = [...condizioni].filter(
        (chiave) =>
          !DELLA_PAGINA.has(chiave) &&
          !(chiave in suoi.valori) &&
          !(chiave in suoi.elenchi) &&
          !(chiave in suoi.tabelle) &&
          !(chiave in suoi.grafici) &&
          !(chiave in (suoi.gallerie ?? {})),
      )
      assert.deepEqual(senzaNiente, [], `«se:» su nomi che non esistono: ${senzaNiente.join(', ')}`)
    })
  }

  it('la testata comune esce riempita su tutti', () => {
    // Ogni rapporto sa dire che anno è: la testata comune.
    for (const [nome, suoi] of Object.entries(dati)) {
      for (const chiave of ['titolo', 'anno', 'periodo', 'generato', 'classe', 'materia', 'corso']) {
        assert.ok(chiave in suoi.valori, `«${nome}» non dice ${chiave}`)
      }
      assert.notEqual(suoi.valori.titolo, '', `«${nome}» senza titolo in testata`)
      assert.notEqual(suoi.valori.periodo, '', `«${nome}» senza periodo in testata`)
    }
  })

  it('quel che è lungo va in un paragrafo, non in un testo', () => {
    // `testo:` stampa una riga sola e tronca il resto: una nota lunga va in un
    // paragrafo. Il limite è largo: distingue una riga da un discorso.
    for (const nome of Object.keys(dati)) {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      for (const blocco of componiCorpo(modello, dati[nome])) {
        if (blocco.tipo !== 'testo') continue
        assert.ok(
          blocco.valore.length <= 120,
          `«${nome}» stampa con «testo:» una riga di ${blocco.valore.length} caratteri: ` +
            'sul PDF viene troncata, va scritta con «paragrafo:»',
        )
      }
    }
  })

  it('ogni modello compone un corpo, e non lascia graffe dentro', () => {
    // Dopo `componiCorpo` un `{{` rimasto è un segnaposto scritto male.
    for (const nome of Object.keys(dati)) {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      const corpo = componiCorpo(modello, dati[nome])

      assert.ok(corpo.length > 0, `«${nome}» non stampa niente`)
      for (const blocco of corpo) {
        assert.ok(
          blocco.tipo === 'tabella' ||
            blocco.tipo === 'elenco' ||
            blocco.tipo === 'grafico' ||
            !blocco.valore.includes('{{'),
          `«${nome}» lascia un segnaposto in «${blocco.valore}»`,
        )
      }
    }
  })
})
