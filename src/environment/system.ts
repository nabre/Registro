// I programmi di Windows, chiamati per percorso intero.
//
// Un `execFile('reg', …)` sembra innocuo e non lo è: Windows cerca un nome nudo
// **prima nella cartella di lavoro** e solo dopo nel PATH. E la cartella di
// lavoro del registro, aperto con un doppio clic su un `.registro`, è la
// cartella del documento — che può essere una cartella condivisa della scuola,
// dove chiunque può lasciare un `reg.exe` suo. Quel file partirebbe al posto di
// quello vero, con i permessi di chi usa il registro, a ogni finestra aperta.
//
// Da qui la regola: un programma di sistema si chiama con il percorso di
// System32 davanti, sempre. La fa rispettare `tests/environment/systemPrograms.test.mjs`,
// che legge i sorgenti e si ferma al primo nome nudo.
//
// Sta in un file suo, senza dipendenze, perché lo usano sia `theme.ts` — che
// `platform.ts` lo importa, e quindi non può importare `platform.ts` — sia gli
// strati di sotto, che lo ricevono da `apparato`.

import { join } from 'node:path'

/** Un programma di System32 per percorso intero: mai cercato nella cartella di lavoro. */
export function diSistema (nome: string): string {
  return join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', nome)
}
