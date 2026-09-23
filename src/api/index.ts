// L'elenco delle procedure che il registro espone.
//
// Una riga per area, e l'area è il primo segmento del nome: `ore.appello.riga`
// sta in `procedure/ore/`, e il resto del nome è il nome del file. Il percorso
// *è* l'indirizzo — si trova una procedura senza cercarla, e si vede a colpo
// d'occhio quante ne ha un'area e quanto è grande ciascuna.
//
// L'elenco è completo: ogni azione del protocollo ha la sua procedura, e
// `tests/api/coverage.test.mjs` lo verifica leggendo l'unione `Azione` dal
// sorgente. Non è una formalità. `oggetto()` scarta le chiavi che non dichiara
// — è la tolleranza che permette a un pannello più nuovo di parlare con un host
// più vecchio — e il ponte passa al gestore quel che resta dell'ingresso. Le due
// cose insieme fanno che uno schema a cui manca un campo **non rompe niente di
// visibile**: l'azione risponde «fatto» e quel campo smette semplicemente di
// arrivare. Una nota che non si salva. Una scadenza che sparisce. È l'unico modo
// in cui questa migrazione poteva fallire in silenzio, ed è il motivo per cui
// quella prova confronta campo per campo invece di contare le procedure.
//
// Le aree si tengono a mano anche qui, come gli indici d'area tengono a mano i
// propri file: una cartella nuova che nessuno nomina non si registra, e questo
// è il punto in cui ci si accorge che manca.

import type { ProceduraQualunque } from './contract.js'
import { registra } from './core.js'
import { procedureAnni } from './procedures/anni/index.js'
import { procedureAssistente } from './procedures/assistente/index.js'
import { procedureAvanzamento } from './procedures/avanzamento/index.js'
import { procedureClasse } from './procedures/classe/index.js'
import { procedureClassi } from './procedures/classi/index.js'
import { procedureComposizioni } from './procedures/composizioni/index.js'
import { procedureConsegne } from './procedures/consegne/index.js'
import { procedureCorsi } from './procedures/corsi/index.js'
import { procedureCorso } from './procedures/corso/index.js'
import { procedureDocumenti } from './procedures/documenti/index.js'
import { procedureDocumento } from './procedures/documento/index.js'
import { procedureEsporta } from './procedures/esporta/index.js'
import { procedureEsportazioni } from './procedures/esportazioni/index.js'
import { procedureFinestra } from './procedures/finestra/index.js'
import { procedureImpostazioni } from './procedures/impostazioni/index.js'
import { procedureLlm } from './procedures/llm/index.js'
import { procedureManutenzione } from './procedures/manutenzione/index.js'
import { procedureMappa } from './procedures/mappa/index.js'
import { procedureMaterie } from './procedures/materie/index.js'
import { procedureModelli } from './procedures/modelli/index.js'
import { procedureOrario } from './procedures/orario/index.js'
import { procedureOre } from './procedures/ore/index.js'
import { procedurePersone } from './procedures/persone/index.js'
import { procedurePiani } from './procedures/piani/index.js'
import { procedurePosta } from './procedures/posta/index.js'
import { procedureProgramma } from './procedures/programma/index.js'
import { procedureProiezione } from './procedures/proiezione/index.js'
import { procedureRapporti } from './procedures/rapporti/index.js'
import { procedureRegistro } from './procedures/registro/index.js'
import { procedureRisorse } from './procedures/risorse/index.js'
import { procedureSistema } from './procedures/sistema/index.js'
import { procedureSmistamento } from './procedures/smistamento/index.js'
import { procedureStato } from './procedures/stato/index.js'
import { procedureValutazioni } from './procedures/valutazioni/index.js'
import { procedureVista } from './procedures/vista/index.js'

export const TUTTE: ReadonlyArray<ProceduraQualunque> = [
  ...procedureAnni,
  ...procedureAssistente,
  ...procedureAvanzamento,
  ...procedureClasse,
  ...procedureClassi,
  ...procedureComposizioni,
  ...procedureConsegne,
  ...procedureCorsi,
  ...procedureCorso,
  ...procedureDocumenti,
  ...procedureDocumento,
  ...procedureEsporta,
  ...procedureEsportazioni,
  ...procedureFinestra,
  ...procedureImpostazioni,
  ...procedureLlm,
  ...procedureManutenzione,
  ...procedureMappa,
  ...procedureMaterie,
  ...procedureModelli,
  ...procedureOrario,
  ...procedureOre,
  ...procedurePersone,
  ...procedurePiani,
  ...procedurePosta,
  ...procedureProgramma,
  ...procedureProiezione,
  ...procedureRapporti,
  ...procedureRegistro,
  ...procedureRisorse,
  ...procedureSistema,
  ...procedureSmistamento,
  ...procedureStato,
  ...procedureValutazioni,
  ...procedureVista,
]

/**
 * Le mette nell'elenco del nucleo.
 *
 * Si può chiamare più volte senza danno: rimettere nell'elenco **lo stesso
 * oggetto** è una ripetizione innocua, ed è quel che succede quando il condotto
 * e il ponte la chiamano tutti e due.
 *
 * Due oggetti **diversi** con lo stesso nome invece fermano tutto, e vale la
 * pena dire che quel caso esiste: se un bundle caricasse questo modulo da due
 * strade, le procedure sarebbero duplicate e distinte, e `registra` lancerebbe.
 * È voluto — una copia che sovrascrive l'originale è il difetto che quel
 * controllo esiste per prevenire — ed è atomico: o entrano tutte o non entra
 * nessuna, così la mappa non resta popolata a metà. Vedi `registra` in
 * `api/core.ts`.
 */
export function registraTutte (): void {
  registra(...TUTTE)
}
