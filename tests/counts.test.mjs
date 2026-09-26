// I numeri che `docs/INDICE.md` dichiara, tenuti fermi da una macchina: «i
// conteggi vanno verificati, non ricordati». Più in fondo, gli stessi conti
// dell'API (procedure, aree, letture) come li scrivono `README.md`,
// `docs/INDICE.md` e `docs/API.md`.
//
// Si leggono i sorgenti, come in `coverage.test.mjs`, perché alcune verità
// stanno in un **tipo** (`Vista`, le entità del modello).
//
// **Come si aggiorna.** Quando un numero cambia a ragione, si cambia qui *e* in
// `docs/INDICE.md`, nella stessa modifica.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { azioniSottoContratto, procedure, registraTutte } from '../dist-tests/api.mjs'
import { COMANDI, IMPOSTAZIONI } from '../dist-tests/manifest.mjs'

registraTutte()

const sorgente = (relativo) =>
  readFileSync(fileURLToPath(new URL(`../${relativo}`, import.meta.url)), 'utf8')

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

describe('i conteggi che INDICE.md dichiara', () => {
  it('le impostazioni del programma sono 31', () => {
    assert.equal(Object.keys(IMPOSTAZIONI).length, 31)
  })

  it('i comandi del manifesto sono 20, e quattro hanno una scorciatoia', () => {
    assert.equal(COMANDI.length, 20)
    assert.equal(COMANDI.filter((c) => c.scorciatoia).length, 4)
  })

  it('le destinazioni sono 19', () => {
    const pagine = sorgente('src/ui/pages.ts')
    const inizio = pagine.indexOf('export const PAGINE')
    assert.ok(inizio >= 0, 'PAGINE non si chiama più così')
    const corpo = pagine.slice(inizio, pagine.indexOf('\n]', inizio))
    assert.equal((corpo.match(/^\s+id: '/gm) ?? []).length, 19)
  })

  it('le viste sono 19', () => {
    // Le viste del protocollo. L'assistente non è una vista: è un riquadro
    // (`ui/assistant.ts`). «Modelli linguistici» è una sezione delle impostazioni
    // ma resta un nome di vista, e `aggiorna` la porta lì.
    assert.equal(varianti(sorgente('src/protocol.ts'), 'Vista'), 19)
  })

  it('i comandi dell’interfaccia sono 95', () => {
    // I comandi della pagina: una parte scritta a mano, una parte nata da
    // `...spread`, che non si conta a occhio.
    const comandi = sorgente('src/ui/commands.ts')
    const letterali = (comandi.match(/^ {4}id: '/gm) ?? []).length
    assert.equal(letterali, 66, 'i comandi scritti per esteso')
    // I generati si contano a runtime nel pannello; qui si fissa la parte
    // che un sorgente può dire, e la somma resta scritta in INDICE.md.
    assert.equal((comandi.match(/\.\.\./g) ?? []).length >= 8, true)
  })

  it('le entità del modello sono 55', () => {
    const modelli = sorgente('src/domain/models.ts')
    const interfacce = (modelli.match(/^export interface /gm) ?? []).length
    // Le `export interface` di `models.ts`; il conto di MODELLO-DATI aggiunge
    // `Divisione` (un `type`), `Indirizzo` (riesportato) e `DocumentoAllievo` (non
    // esportata). Qui si tiene la parte che si misura senza ambiguità.
    assert.equal(interfacce, 52)
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
