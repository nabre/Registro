// I numeri che `docs/INDICE.md` dichiara, tenuti fermi da una macchina.
//
// `docs/INDICE.md` scrive la regola da sé: «i conteggi vanno verificati, non
// ricordati… se un numero non torna, ricontare e correggere — non arrotondare».
// Otto numeri sono dichiarati lì; tre avevano già una rete —
// `tests/api/coverage.test.mjs` per le 141 azioni, `scritture`/`letture` per
// le 141 scritture e le 8 letture — e **cinque no**.
//
// È costato: le impostazioni del programma sono passate da 26 a 27 con
// l'arrivo di `registroDocenti.api.condotto`, e il documento ha continuato a
// dire 26 senza che niente protestasse. Un conteggio senza prova non è un
// conteggio: è un ricordo.
//
// Qui si leggono i sorgenti, come fa già `coverage.test.mjs`, perché due di
// queste verità stanno in un **tipo** — `Vista` e le entità del modello — e i
// tipi a runtime non ci sono più.
//
// **Come si aggiorna.** Quando uno di questi numeri cambia perché è giusto che
// cambi, si cambia qui *e* in `docs/INDICE.md`, nella stessa modifica. È tutto
// il punto: la prova non impedisce il cambiamento, impedisce che il documento
// resti indietro senza accorgersene.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { COMANDI, IMPOSTAZIONI } from '../dist-tests/manifest.mjs'

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
  it('le impostazioni del programma sono 43', () => {
    // Era il numero senza rete, ed è quello che è scivolato. Da 29 a 33 con le
    // quattro dell'assistente, da 33 a 38 con le cinque della dettatura, e da
    // 38 a 39 con i modelli che sono diventati file: sono sparite le due
    // chiavi `url` — con Ollama non c'è più un indirizzo da sbagliare — e sono
    // arrivate la cartella dei modelli, il proiettore e il programma che sa
    // guardare le immagini. Da 39 a 41 con lo scarico automatico del corredo
    // della dettatura: l'interruttore, e dove il registro tiene quel che si
    // scarica. Da 41 a 43 con le due uguali per le scansioni, quando anche
    // `llama-mtmd-cli` ha smesso di volere sette passaggi a mano.
    assert.equal(Object.keys(IMPOSTAZIONI).length, 43)
  })

  it('i comandi del manifesto sono 21, e cinque hanno una scorciatoia', () => {
    assert.equal(COMANDI.length, 21)
    assert.equal(COMANDI.filter((c) => c.scorciatoia).length, 5)
  })

  it('le destinazioni sono 19', () => {
    const pagine = sorgente('src/ui/pages.ts')
    const inizio = pagine.indexOf('export const PAGINE')
    assert.ok(inizio >= 0, 'PAGINE non si chiama più così')
    const corpo = pagine.slice(inizio, pagine.indexOf('\n]', inizio))
    assert.equal((corpo.match(/^\s+id: '/gm) ?? []).length, 19)
  })

  it('le viste sono 17', () => {
    // L'assistente non è una vista e non è una destinazione: è un riquadro che
    // si apre a destra, accanto al lavoro — vedi `ui/assistant.ts`.
    // Per un giro lo è stato, ed è il motivo per cui questa riga era tornata a
    // 16; la diciassettesima è «Modelli linguistici», che è una pagina vera —
    // ci si scarica quel che l'assistente usa per rispondere.
    assert.equal(varianti(sorgente('src/protocol.ts'), 'Vista'), 17)
  })

  it('i comandi dell’interfaccia sono 94', () => {
    // Sessantacinque scritti a mano più ventinove che nascono da otto
    // `...spread`: contarli a occhio non si può, ed è il motivo per cui
    // nessuno lo faceva.
    //
    // Erano sessanta: i cinque nuovi sono quelli della finestra — zoom,
    // schermo intero, esci — che stavano nella barra dei menu di sistema
    // finché il registro non si è disegnato la barra del titolo da sé.
    const comandi = sorgente('src/ui/commands.ts')
    const letterali = (comandi.match(/^ {4}id: '/gm) ?? []).length
    assert.equal(letterali, 65, 'i comandi scritti per esteso')
    // I generati si contano a runtime nel pannello; qui si fissa la parte
    // che un sorgente può dire, e la somma resta scritta in INDICE.md.
    assert.equal((comandi.match(/\.\.\./g) ?? []).length >= 8, true)
  })

  it('le entità del modello sono 45', () => {
    const modelli = sorgente('src/domain/models.ts')
    const interfacce = (modelli.match(/^export interface /gm) ?? []).length
    // 42 `export interface` più `Divisione` (che è un `type`), `Indirizzo`
    // (riesportato) e `DocumentoAllievo` (interfaccia non esportata): il conto
    // di MODELLO-DATI è 45, e questa riga tiene ferma la parte che si misura
    // senza ambiguità.
    assert.equal(interfacce, 42)
  })
})
