// Il centralino: ogni azione che arriva dal webview passa di qui, viene
// convalidata e applicata all'archivio.
//
// Regola tenuta ovunque: si valida prima di toccare lo stato, e se la
// validazione non passa non si scrive niente. Il webview riceve indietro gli
// errori e li mostra dov'erano — così non esistono salvataggi a metà.
//
// Qui non c'è più il lavoro, solo l'elenco di chi lo fa: una funzione da
// duemila righe è diventata quindici file, uno per area del registro, e questo
// indice li somma — centoquarantuno gestori in tutto. La rete che c'era prima — lo `switch`
// esaustivo, che non compilava se un'azione restava scoperta — è passata al
// tipo `Mappa`: aggiungendo un'azione al protocollo senza darle un gestore, la
// riga qui sotto smette di compilare.

import type { Archivio } from './data/archive.js'
import type { Azione } from './protocol.js'
import { assistente } from './actions/assistant.js'
import { composizioni } from './actions/compositions.js'
import { consegne } from './actions/assignments.js'
import { contestoDi, type EsitoAzione, type Gestore, type Mappa } from './actions/context.js'
import { docenteClasse } from './actions/classTeacher.js'
import { llm } from './actions/llm.js'
import { documenti } from './actions/documents.js'
import { esportazioni } from './actions/exports.js'
import { mappa } from './actions/map.js'
import { modelli } from './actions/templates.js'
import { ore } from './actions/hours.js'
import { piani } from './actions/plans.js'
import { proiezione } from './actions/projection.js'
import { rapporti, rigeneraDopoScrittura } from './actions/reports.js'
import { registro } from './actions/register.js'
import { sistema } from './actions/system.js'
import { smistamento } from './actions/sorting.js'
import { valutazioni } from './actions/assessments.js'
import { vista } from './actions/view.js'
import { azioniSottoContratto, gestoriDelleProcedure } from './api/bridge.js'
import type { Origine } from './api/contract.js'

// Sta in `actions/reports.ts`, accanto all'attesa che alimenta, e non qui:
// `api/core.ts` la deve poter chiamare, e da qui passerebbe per il ponte
// che a sua volta importa il nucleo — un giro chiuso.
export { rigeneraDopoScrittura }

const GESTORI: Mappa = {
  ...registro,
  ...ore,
  ...piani,
  ...proiezione,
  ...assistente,
  ...valutazioni,
  ...consegne,
  ...composizioni,
  ...docenteClasse,
  ...smistamento,
  ...rapporti,
  ...sistema,
  ...documenti,
  ...esportazioni,
  ...mappa,
  ...modelli,
  ...llm,
  ...vista,
  // Ultimo apposta: le azioni che una procedura ha preso in carico
  // (`src/api/bridge.ts`) sostituiscono qui sopra il gestore di prima. Il
  // lavoro è sempre quello — la procedura glielo ripassa — ma adesso davanti
  // c'è una convalida vera, un codice d'errore e una riga di giornale.
  ...gestoriDelleProcedure(),
}

/**
 * Vero se `tipo` ha un gestore. Il pannello lo controlla prima di chiamare
 * `esegui`: un messaggio da un webview con un protocollo più vecchio (o più
 * nuovo) non deve far esplodere «gestore is not a function» — deve tornare
 * un rifiuto leggibile.
 */
export function azioneValida (tipo: string): tipo is Azione['tipo'] {
  return tipo in GESTORI
}

/** Le azioni che passano da una procedura, e quindi da `chiama()`. */
let sottoContratto: Set<string> | null = null
function passaDaChiama (tipo: string): boolean {
  // Al primo uso e non al caricamento: `azioniSottoContratto` registra le
  // procedure, e farlo mentre gli import sono ancora a metà è un ordine che
  // non si controlla.
  sottoContratto ??= new Set(azioniSottoContratto())
  return sottoContratto.has(tipo)
}

export async function esegui (
  archivio: Archivio,
  azione: Azione,
  origine?: Origine,
): Promise<EsitoAzione> {
  // Il gestore e l'azione hanno lo stesso tipo per costruzione — la mappa non
  // ammette accostamenti diversi — ma il compilatore non correla da sé la
  // chiave con il valore che ne esce: è l'unico punto in cui glielo si dice.
  const gestore = GESTORI[azione.tipo] as Gestore<Azione['tipo']>
  const prima = archivio.revisione
  const esito = await gestore(contestoDi(archivio, origine), azione)

  // I documenti seguono i dati. Qui e non dentro i gestori perché è una regola
  // sola — «se il registro è cambiato, quel che ne è stato stampato è vecchio»
  // — e ripeterla in novantanove posti vuol dire dimenticarla nel centesimo.
  //
  // Si guarda la revisione e non l'esito: esportare un CSV, aprire un allegato
  // o stampare un rapporto riescono senza toccare il registro, e reagire al
  // solo «è andata bene» vorrebbe dire rifare venti PDF ogni volta che se ne
  // apre uno.
  //
  // Le azioni passate sotto contratto l'hanno già fatto dentro `chiama()`, che
  // è la strada di tutti: rifarlo qui sposterebbe soltanto l'orologio.
  if (esito.ok && archivio.revisione !== prima && !passaDaChiama(azione.tipo)) {
    rigeneraDopoScrittura(archivio, azione)
  }
  return esito
}
