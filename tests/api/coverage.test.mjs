// La rete sotto la migrazione: che nessuna azione perda per strada un campo.
//
// Mettere centoquarantuno azioni sotto contratto è un'operazione con un modo
// di fallire silenzioso, e uno solo. Il ponte toglie il `tipo` e passa al
// gestore quel che resta dell'ingresso — ma `oggetto()` **scarta le chiavi che
// non dichiara**, per tolleranza verso un pannello più nuovo. Le due cose
// insieme fanno che uno schema a cui manca un campo non rompe niente in modo
// visibile: l'azione continua a rispondere «fatto», e quel campo semplicemente
// non arriva più. Una nota che non si salva. Una data di scadenza che sparisce.
//
// Il compilatore non può accorgersene: `daGestore` riceve un oggetto costruito
// a mano, e i campi mancanti diventano `undefined`, che per un campo opzionale
// è un valore legittimo.
//
// Quindi lo si controlla qui, leggendo le due verità e confrontandole: la
// forma dichiarata nell'unione `Azione` di `src/protocol.ts`, e i campi che
// lo schema della procedura dice di accettare. Sono le stesse prove che il
// progetto fa già altrove leggendo il sorgente — vedi
// `tests/domain/jsonStore.test.mjs` — e per la stessa ragione: alcune
// verità stanno nei tipi, e i tipi a runtime non ci sono più.

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
 * Le varianti dell'unione `Azione`, con i campi di ciascuna.
 *
 * Si legge il sorgente e si taglia sulle graffe, contandole: le varianti sono
 * scritte in due modi — su una riga sola con i punti e virgola, o su più righe
 * — e un'espressione regolare che provasse a coprirli tutti e due sarebbe più
 * fragile di un contatore di parentesi.
 */
function varianti () {
  const inizio = protocollo.indexOf('export type Azione =')
  assert.ok(inizio > 0, 'l’unione Azione non si trova in src/protocol.ts')

  const trovate = new Map()
  let i = inizio
  while (i < protocollo.length) {
    const apertura = protocollo.indexOf('{', i)
    if (apertura < 0) break

    // Fuori dall'unione: la prima dichiarazione che comincia a colonna zero
    // dopo l'unione chiude la ricerca.
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
    // I commenti vanno via prima di cercare i campi, e non dopo: la prosa di
    // questo protocollo è fitta di frasi con i due punti dentro, e una di
    // quelle letta come dichiarazione produce campi che non esistono — si è
    // visto, e cercava «e» dentro `anno.crea`.
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
    // Se questo numero cambia, è cambiato il protocollo: va bene, ma va visto.
    // Erano 143 finché `modello.leggi` e `modello.prova` sono state azioni:
    // due scritture che non scrivevano, ritirate quando il protocollo ha avuto
    // un canale per le domande. Adesso sono le procedure di lettura
    // `modelli.leggi` e `modelli.prova`, e con loro se ne sono andati i tre
    // campi — `testo`, `nomi`, `pdf` — che stavano nella busta di ogni
    // scrittura per servire quelle due sole.
    //
    // Sono tornate 149 con le due che danno all'assistente di che cosa si sta
    // parlando e come si cambia pagina: `assistente.contesto` e `vista.apri`.
    //
    // 152 da quando il registro si disegna la barra del titolo da sé: su
    // Windows e Linux la barra dei menu di sistema non si vede più, e le tre
    // voci che vivevano solo là — lo zoom, lo schermo intero, la via d'uscita
    // — sono diventate comandi del registro come tutti gli altri.
    assert.equal(AZIONI.size, 152, `azioni trovate: ${AZIONI.size}`)
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
      // Una forma che non è un oggetto accetta tutto quel che le arriva: non
      // scarta niente, e quindi non può perdere un campo.
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
      // Una lettura che dichiara collezioni sta dicendo due cose che non
      // stanno insieme: o legge, o scrive.
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
