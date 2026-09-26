// Il catalogo per il modello e `resources/tools.json`, la sua copia su disco.
// Una copia che resta indietro fa comporre al modello chiamate che il nucleo
// rifiuta: si ricostruisce e si confronta byte per byte. Se cade, `npm run
// tools` e si rilegge la differenza.
//
// Poi: i nomi senza punto si ritraducono in nomi con il punto, e il genere del
// file è quello che il nucleo fa rispettare.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  catalogo,
  catalogoJson,
  daNomeFunzione,
  nomeFunzione,
  procedure,
  registraTutte,
} from '../../dist-tests/api.mjs'

registraTutte()

const PERCORSO = fileURLToPath(new URL('../../resources/tools.json', import.meta.url))

describe('il catalogo degli attrezzi', () => {
  it('è lo stesso che sta in resources/tools.json', () => {
    // Byte per byte: il file è `eol=lf` in `.gitattributes`, o `core.autocrlf`
    // lo riscriverebbe in CRLF al checkout. Normalizzare i ritorni a capo
    // renderebbe il confronto meno rigoroso.
    const suDisco = readFileSync(PERCORSO, 'utf8')
    assert.equal(
      catalogoJson(),
      suDisco,
      'resources/tools.json non è più quello che il codice genera: dare «npm run tools».',
    )
  })

  it('non cambia da sé: generato due volte è lo stesso file', () => {
    // Deterministico: niente date, contatori o ordini d'inserimento.
    assert.equal(catalogoJson(), catalogoJson())
  })

  it('racconta tutte le procedure e nient’altro', () => {
    const nel = catalogo().attrezzi.map((a) => a.nome).sort()
    const vere = procedure().map((p) => p.nome).sort()
    assert.deepEqual(nel, vere)
  })

  it('dichiara per ognuna lo stesso genere che il nucleo fa rispettare', () => {
    // Il genere del file è quello vero: chi si fida del file sceglie da lì gli
    // attrezzi per un modello.
    const vere = new Map(procedure().map((p) => [p.nome, p]))
    const storte = catalogo().attrezzi
      .filter((a) => a.genere !== vere.get(a.nome).genere)
      .map((a) => a.nome)
    assert.deepEqual(storte, [])
  })

  it('i nomi senza punto tornano indietro tutti', () => {
    const perse = procedure()
      .map((p) => p.nome)
      .filter((nome) => daNomeFunzione(nomeFunzione(nome)) !== nome)
    assert.deepEqual(perse, [], `nomi che non si ritraducono: ${perse.join(', ')}`)
  })

  it('due procedure non finiscono sullo stesso nome di funzione', () => {
    // `a.b` e `a_b` diventerebbero lo stesso attrezzo, e `daNomeFunzione` ne
    // sceglierebbe uno a caso.
    const funzioni = catalogo().attrezzi.map((a) => a.funzione)
    assert.equal(new Set(funzioni).size, funzioni.length)
  })

  it('ogni attrezzo porta uno schema d’ingresso che si sa leggere', () => {
    const storte = []
    for (const a of catalogo().attrezzi) {
      if (typeof a.parametri !== 'object' || a.parametri === null) {
        storte.push(`${a.nome}: senza parametri`)
        continue
      }
      // Il tool calling vuole un oggetto in cima.
      if (a.parametri.type !== 'object') storte.push(`${a.nome}: parametri di tipo «${a.parametri.type}»`)
      if (!a.titolo || a.titolo.length < 8) storte.push(`${a.nome}: senza una descrizione leggibile`)
      if (!a.riga.startsWith(`${catalogo().comando} chiama ${a.nome}`)) {
        storte.push(`${a.nome}: la riga di esempio non chiama questa procedura`)
      }
    }
    assert.deepEqual(storte, [], storte.join('\n'))
  })

  it('le istruzioni dicono al modello che non può scrivere', () => {
    // La riga del prompt che dice al modello di indicare il comando invece di
    // provare a scrivere.
    const istruzioni = catalogo().istruzioni
    assert.match(istruzioni, /sola lettura/)
    assert.match(istruzioni, /Non inventare mai/)
    // Il prompt nomina la deroga (non sono tutti di sola lettura), prendendo il
    // nome dal catalogo.
    const deroghe = catalogo().attrezzi.filter((a) => a.offribile && a.genere !== 'lettura')
    for (const a of deroghe) assert.ok(istruzioni.includes(`«${a.nome}»`), `${a.nome} non è detto`)
  })
})
