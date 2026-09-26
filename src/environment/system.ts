// I programmi di Windows si chiamano sempre per percorso intero: un nome nudo
// Windows lo cerca prima nella cartella di lavoro, che può essere una cartella
// condivisa con un `reg.exe` altrui. Lo verifica
// `tests/environment/systemPrograms.test.mjs`. Senza dipendenze, perché lo usa
// anche `theme.ts`, che non può importare `platform.ts`.

import { join } from 'node:path'

/** Un programma di System32 per percorso intero: mai cercato nella cartella di lavoro. */
export function diSistema (nome: string): string {
  return join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', nome)
}
