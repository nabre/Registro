// Come una collezione diventa il testo che sta dentro il documento.
//
// Il registro tiene in memoria oggetti pieni: la normalizzazione tappa ogni
// buco con il suo valore predefinito, perché il resto del programma non debba
// chiedersi a ogni riga se un campo c'è. È la regola giusta in memoria — una
// `nota` che a volte è `undefined` e a volte `''` è un `if` in ogni punto che
// la legge — ed è la regola sbagliata su disco: `"nota": ""` ripetuto per ogni
// persona di ogni ora è un fatto che non è mai stato scritto da nessuno.
//
// In un registro vero di 113 ore e 62 persone quei campi vuoti sono un quinto
// del file delle lezioni, ed è il file che si riscrive a ogni presenza segnata.
// Il documento ne tiene dieci copie in `.storico/`: quel che si risparmia qui
// si risparmia dieci volte.
//
// **L'invariante è una sola, e vale la pena scriverla in chiaro:** quel che si
// toglie deve essere esattamente quel che la normalizzazione rimette. Un campo
// tolto che torna diverso non è un file più piccolo, è un dato perso — e la
// prova in `tests/domain/persistence.test.mjs` la verifica sul registro
// intero, non su un esempio scelto bene.
//
// Per questo si tolgono due sole cose, e non tutto quel che sembra vuoto:
//
//   La **stringa vuota**, che la normalizzazione ricostruisce con `testo()`.
//   L'**elenco vuoto**, che ricostruisce con `elenco()`.
//
// `false`, `0` e `null` restano scritti, e non è prudenza generica: `attivo`
// nasce `true` quando manca — toglierlo da chi si è ritirato lo rimetterebbe in
// classe — un voto `null` non è un voto assente, e `minuti: 0` è un ritardo di
// zero minuti che qualcuno ha battuto.

/**
 * Il filtro che toglie i campi vuoti mentre si scrive.
 *
 * Si guarda chi lo contiene, non solo il valore: dentro un elenco un elemento
 * scartato non sparisce, diventa `null` — `JSON.stringify` non può accorciare
 * un array — e una lista di stati d'appello si riempirebbe di buchi. Dentro un
 * elenco, quindi, non si tocca niente.
 */
function senzaVuoti (this: unknown, _chiave: string, valore: unknown): unknown {
  if (Array.isArray(this)) return valore
  if (valore === '') return undefined
  if (Array.isArray(valore) && valore.length === 0) return undefined
  return valore
}

/**
 * Una collezione nel testo esatto che finisce dentro il documento.
 *
 * Indentato e con l'a capo finale: questi JSON capita di leggerli a mano dopo
 * aver aperto l'archivio con un doppio clic, e un file su una riga sola non si
 * legge. L'indentazione costa il trenta per cento e vale quel che costa.
 */
export function testoCollezione (contenuto: unknown): string {
  // Una collezione che è essa stessa vuota non si toglie: non ha un oggetto
  // attorno da cui sparire, e `JSON.stringify` risponderebbe `undefined` — che
  // non è JSON, e il documento si ritroverebbe dentro un file illeggibile al
  // posto di `[]`. Succede davvero: in un anno appena cominciato le
  // valutazioni e gli smistamenti sono elenchi vuoti.
  const scritto = JSON.stringify(contenuto, senzaVuoti, 2)
  return `${scritto ?? JSON.stringify(contenuto)}\n`
}
