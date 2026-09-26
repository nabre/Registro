// Nessuna azione perde per strada un campo. Il ponte passa al gestore
// l'ingresso della procedura, e `oggetto()` **scarta le chiavi che non
// dichiara**: uno schema a cui manca un campo non rompe niente di visibile, il
// campo semplicemente non arriva. Il compilatore non lo vede, quindi si
// confrontano qui l'unione `Azione` di `src/protocol.ts` (letta dal sorgente) e
// i campi dello schema.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { azioniSottoContratto, procedure, registraTutte } from '../../dist-tests/api.mjs'

registraTutte()

const protocollo = readFileSync(
  fileURLToPath(new URL('../../src/protocol.ts', import.meta.url)),
  'utf8',
)

/**
 * Le varianti dell'unione `Azione`, con i loro campi. Si taglia contando le
 * graffe: le varianti stanno su una riga o su più righe.
 */
function varianti () {
  const inizio = protocollo.indexOf('export type Azione =')
  assert.ok(inizio > 0, 'l’unione Azione non si trova in src/protocol.ts')

  const trovate = new Map()
  let i = inizio
  while (i < protocollo.length) {
    const apertura = protocollo.indexOf('{', i)
    if (apertura < 0) break

    // Fuori dall'unione: la prima dichiarazione a colonna zero chiude la ricerca.
    const primaRiga = protocollo.lastIndexOf('\n', apertura)
    const testaDellaRiga = protocollo.slice(primaRiga + 1, apertura)
    if (/^(export|interface|type|function|const)\b/.test(testaDellaRiga.trim())) break

    let profondita = 0
    let j = apertura
    for (; j < protocollo.length; j++) {
      if (protocollo[j] === '{') profondita++
      else if (protocollo[j] === '}') {
        profondita--
        if (profondita === 0) break
      }
    }
    // I commenti si tolgono prima di cercare i campi: una frase con i due punti
    // sembrerebbe una dichiarazione.
    const corpo = protocollo
      .slice(apertura + 1, j)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
    const tipo = /\btipo\s*:\s*'([^']+)'/.exec(corpo)
    if (tipo) {
      const campi = new Set()
      for (const riga of corpo.split(/[;\n]/)) {
        const campo = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\??\s*:/.exec(riga)
        if (campo && campo[1] !== 'tipo') campi.add(campo[1])
      }
      trovate.set(tipo[1], campi)
    }
    i = j + 1
  }
  return trovate
}

const AZIONI = varianti()

describe('la copertura del protocollo', () => {
  it('trova tutte le azioni dichiarate, e sono quelle che ci si aspetta', () => {
    // Se questo numero cambia è cambiato il protocollo: va bene, ma va visto.
    assert.equal(AZIONI.size, 168, `azioni trovate: ${AZIONI.size}`)
  })

  it('ogni azione del protocollo ha una procedura che la prende in carico', () => {
    const coperte = new Set(azioniSottoContratto())
    const scoperte = [...AZIONI.keys()].filter((tipo) => !coperte.has(tipo)).sort()
    assert.deepEqual(scoperte, [], `azioni senza procedura: ${scoperte.join(', ')}`)
  })

  it('nessuna procedura dichiara un’azione che il protocollo non conosce', () => {
    const inventate = azioniSottoContratto().filter((tipo) => !AZIONI.has(tipo))
    assert.deepEqual(inventate, [], `azioni inesistenti: ${inventate.join(', ')}`)
  })

  it('nessuno schema perde per strada un campo dell’azione', () => {
    const perse = []
    for (const p of procedure()) {
      if (!p.azione) continue
      const attesi = AZIONI.get(p.azione)
      if (!attesi) continue
      const forma = p.ingresso.forma
      // Una forma che non è un oggetto non scarta niente.
      if (forma.genere !== 'oggetto') continue
      const dichiarati = new Set(Object.keys(forma.campi))
      for (const campo of attesi) {
        if (!dichiarati.has(campo)) perse.push(`${p.nome} (${p.azione}) non dichiara «${campo}»`)
      }
    }
    assert.deepEqual(perse, [], perse.join('\n'))
  })

  it('due procedure non prendono in carico la stessa azione', () => {
    const viste = new Map()
    const doppie = []
    for (const p of procedure()) {
      if (!p.azione) continue
      const gia = viste.get(p.azione)
      if (gia) doppie.push(`${p.azione}: ${gia} e ${p.nome}`)
      else viste.set(p.azione, p.nome)
    }
    assert.deepEqual(doppie, [], doppie.join('\n'))
  })

  it('ogni procedura dichiara quel che serve a chi la chiama da fuori', () => {
    const storte = []
    for (const p of procedure()) {
      if (!/^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)+$/.test(p.nome)) {
        storte.push(`${p.nome}: il nome non è nella forma area.cosa.verbo`)
      }
      if (!p.titolo || p.titolo.length < 8) storte.push(`${p.nome}: senza titolo leggibile`)
      if (typeof p.idempotente !== 'boolean') storte.push(`${p.nome}: idempotenza non dichiarata`)
      if (p.genere !== 'lettura' && p.genere !== 'scrittura') {
        storte.push(`${p.nome}: genere «${String(p.genere)}»`)
      }
      // Una lettura che dichiara collezioni: o legge, o scrive.
      if (p.genere === 'lettura' && p.collezioni && p.collezioni.length > 0) {
        storte.push(`${p.nome}: è una lettura e dichiara collezioni`)
      }
      if (p.genere === 'lettura' && p.azione) {
        storte.push(`${p.nome}: è una lettura e prende in carico un’azione di scrittura`)
      }
    }
    assert.deepEqual(storte, [], storte.join('\n'))
  })
})
