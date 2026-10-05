// I numeri che le docs dichiarano, confrontati con quelli che il codice dice:
// «i conteggi vanno verificati, non ricordati». Le cifre di `docs/INDICE.md`
// e dei titoli di `docs/CATALOGO.md` che si derivano dal sorgente, e i conti
// dell'API (procedure, aree, letture) come li scrivono `README.md`,
// `docs/INDICE.md` e `docs/API.md`.
//
// Si leggono i sorgenti, come in `coverage.test.mjs`, perché alcune verità
// stanno in un **tipo** (`Vista`, le entità del modello).
//
// **Come si aggiorna.** Qui non c'è nessun numero scritto: quando il codice
// cambia a ragione, si corregge la doc che la prova nomina.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { azioniSottoContratto, procedure, registraTutte } from '../dist-tests/api.mjs'
import { IMPOSTAZIONI } from '../dist-tests/manifest.mjs'

registraTutte()

// Con `core.autocrlf` git scrive le docs in CRLF: i titoli si confrontano senza `\r`.
const sorgente = (relativo) =>
  readFileSync(fileURLToPath(new URL(`../${relativo}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

/** Quante varianti ha un'unione di stringhe dichiarata come `export type X =`. */
function varianti (testo, nome) {
  const inizio = testo.indexOf(`export type ${nome} =`)
  assert.ok(inizio >= 0, `l'unione «${nome}» non c'è più: il nome è cambiato?`)
  // Fino alla prossima dichiarazione a colonna zero: l'unione è tutta lì.
  const resto = testo.slice(inizio)
  const fine = resto.search(/\n(?:export |\/\*\*|interface |const )/)
  const corpo = fine > 0 ? resto.slice(0, fine) : resto
  return (corpo.match(/'[^']+'/g) ?? []).length
}

/** Le destinazioni di `PAGINE`: un `id:` per voce. */
function destinazioni () {
  const pagine = sorgente('ui/pages.ts')
  const inizio = pagine.indexOf('export const PAGINE')
  assert.ok(inizio >= 0, 'PAGINE non si chiama più così')
  const corpo = pagine.slice(inizio, pagine.indexOf('\n]', inizio))
  return (corpo.match(/^\s+id: '/gm) ?? []).length
}

/** I gruppi della barra laterale: `GruppoPagina` non è esportato e sta su una riga. */
function gruppi () {
  const riga = /^type GruppoPagina = (.+)$/m.exec(sorgente('ui/pages.ts'))
  assert.ok(riga, '«type GruppoPagina» non c’è più in ui/pages.ts: il nome è cambiato?')
  return (riga[1].match(/'[^']+'/g) ?? []).length
}

// Le viste del protocollo. L'assistente non è una vista: è un riquadro
// (`ui/assistant.tsx`).
const viste = () => varianti(sorgente('contract/protocol.ts'), 'Vista')

describe('i conteggi che INDICE.md dichiara', () => {
  // Solo i numeri che il sorgente dice senza ambiguità. Comandi dell'interfaccia
  // (una parte nasce da `...spread`) ed entità (il conto somma `type` e
  // interfacce non esportate) non si derivano da un testo: non si fissano qui.
  const indice = sorgente('docs/INDICE.md').replace(/\s+/g, ' ')

  it('INDICE.md dice quante destinazioni e quante viste', () => {
    const scritto = /(\d+) destinazioni, (\d+) viste/.exec(indice)
    assert.ok(scritto, 'la frase «N destinazioni, N viste» non c’è più in INDICE.md: la forma è cambiata?')
    assert.deepEqual(scritto.slice(1).map(Number), [destinazioni(), viste()], 'destinazioni, viste')
  })

  it('INDICE.md dice quante impostazioni macchina', () => {
    const scritto = /(\d+) impostazioni macchina/.exec(indice)
    assert.ok(scritto, 'la frase «N impostazioni macchina» non c’è più in INDICE.md: la forma è cambiata?')
    assert.equal(Number(scritto[1]), Object.keys(IMPOSTAZIONI).length)
  })
})

describe('i conteggi che CATALOGO.md dichiara', () => {
  const catalogo = sorgente('docs/CATALOGO.md')

  /** Il numero del titolo che finisce con `coda`, com'è scritto (cifre o lettere). */
  function nelTitolo (coda) {
    const titolo = catalogo.split('\n').find((riga) => /^###? [\d.]+ /.test(riga) && riga.endsWith(coda))
    assert.ok(titolo, `il titolo «… ${coda}» non c’è più in CATALOGO.md: la forma è cambiata?`)
    return /^###? [\d.]+ (?:Le|Gli|I) (\S+) /.exec(titolo)?.[1]
  }

  it('CATALOGO.md dice quante pagine, gruppi e viste', () => {
    assert.equal(Number(nelTitolo(' `Pagina` di `PAGINE`')), destinazioni(), '§ 2.1, le pagine')
    assert.equal(nelTitolo(' gruppi'), inLettere(gruppi()), '§ 2.2, i gruppi in lettere')
    assert.equal(Number(nelTitolo(' `Vista`')), viste(), '§ 2.3, le viste')
  })

  it('CATALOGO.md dice quante chiavi del programma e quante azioni', () => {
    assert.equal(Number(nelTitolo(' chiavi del programma')), Object.keys(IMPOSTAZIONI).length, '§ 5.1')
    const azioni = /Le (\d+) varianti di `type Azione`/.exec(catalogo)
    assert.ok(azioni, 'la frase «Le N varianti di `type Azione`» non c’è più in CATALOGO.md')
    assert.equal(Number(azioni[1]), new Set(azioniSottoContratto()).size, '§ 6')
  })
})

/**
 * Un numero da 1 a 99 in lettere, come nelle docs, con l'elisione
 * («trentuno», non «trentauno»). Le docs scrivono in lettere solo i conti
 * piccoli.
 */
function inLettere (n) {
  const unita = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove']
  const dieci = ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici',
    'diciassette', 'diciotto', 'diciannove']
  const decine = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta',
    'ottanta', 'novanta']
  assert.ok(Number.isInteger(n) && n > 0 && n < 100, `fuori scala: ${n}`)
  if (n < 10) return unita[n]
  if (n < 20) return dieci[n - 10]
  const u = n % 10
  const d = decine[Math.floor(n / 10)]
  if (u === 0) return d
  const radice = u === 1 || u === 8 ? d.slice(0, -1) : d
  return radice + (u === 3 ? 'tré' : unita[u])
}

const maiuscola = (testo) => testo[0].toUpperCase() + testo.slice(1)

describe('i conteggi dell’API che le docs dichiarano', () => {
  // Dal registro vero: procedure registrate, letture, aree (primo segmento del
  // nome), azioni prese in carico. La prova dice quale file di docs è rimasto
  // indietro e con quale numero.
  const tutte = procedure()
  const letture = tutte.filter((p) => p.genere === 'lettura').length
  const scritture = tutte.filter((p) => p.genere === 'scrittura').length
  const aree = new Set(tutte.map((p) => p.nome.split('.')[0])).size
  const azioni = new Set(azioniSottoContratto()).size

  it('README.md dice quante procedure ci sono', () => {
    const riga = sorgente('README.md').split('\n').find((r) => r.includes('JSON-RPC'))
    assert.ok(riga, 'la riga della riga di comando e dell’API non c’è più in README.md')
    const scritto = Number(/(\d+) procedure/.exec(riga)?.[1])
    assert.equal(scritto, tutte.length, `README.md scrive ${scritto} procedure`)
  })

  it('INDICE.md dice azioni, procedure, scritture e letture', () => {
    const indice = sorgente('docs/INDICE.md')
    const conti = /(\d+) azioni, (\d+) procedure \((\d+) scritture e\s+(\d+)\s+letture\)/.exec(indice)
    assert.ok(conti, 'la frase dei conteggi non c’è più in INDICE.md: la forma è cambiata?')
    assert.deepEqual(
      conti.slice(1).map(Number),
      [azioni, tutte.length, scritture, letture],
      'azioni, procedure, scritture, letture',
    )
    const tabella = /le (\d+) procedure/.exec(indice)
    assert.equal(Number(tabella?.[1]), tutte.length, 'la riga di API.md nella tabella dei documenti')
  })

  it('API.md dice le aree e le letture in lettere', () => {
    const api = sorgente('docs/API.md')
    for (const atteso of [
      `### Le ${inLettere(aree)} aree`,
      `### Le ${inLettere(letture)} letture`,
      `**${maiuscola(inLettere(letture))} letture, e per il resto scritture.**`,
    ]) {
      assert.ok(api.includes(atteso), `API.md non scrive «${atteso}»`)
    }
  })

  it('i numeri in lettere si scrivono come nelle docs', () => {
    // La funzione qui sopra si prova: un «trentauno» farebbe fallire per il motivo
    // sbagliato.
    assert.equal(inLettere(31), 'trentuno')
    assert.equal(inLettere(39), 'trentanove')
    assert.equal(inLettere(38), 'trentotto')
    assert.equal(inLettere(23), 'ventitré')
    assert.equal(inLettere(16), 'sedici')
  })
})
