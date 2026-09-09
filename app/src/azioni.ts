// Il centralino: ogni azione che arriva dal webview passa di qui, viene
// convalidata e applicata all'archivio.
//
// Regola tenuta ovunque: si valida prima di toccare lo stato, e se la
// validazione non passa non si scrive niente. Il webview riceve indietro gli
// errori e li mostra dov'erano — così non esistono salvataggi a metà.
//
// Qui non c'è più il lavoro, solo l'elenco di chi lo fa: una funzione da
// duemila righe con novantanove casi è diventata otto file, uno per area del
// registro, e questo indice li somma. La rete che c'era prima — lo `switch`
// esaustivo, che non compilava se un'azione restava scoperta — è passata al
// tipo `Mappa`: aggiungendo un'azione al protocollo senza darle un gestore, la
// riga qui sotto smette di compilare.

import type { Archivio } from './dati/archivio.js'
import type { Azione } from './protocollo.js'
import { consegne } from './azioni/consegne.js'
import { contestoDi, type EsitoAzione, type Gestore, type Mappa } from './azioni/contesto.js'
import { docenteClasse } from './azioni/docenteClasse.js'
import { ore } from './azioni/ore.js'
import { piani } from './azioni/piani.js'
import { proiezione } from './azioni/proiezione.js'
import { programmaRigenerazione, rapporti } from './azioni/rapporti.js'
import { corsiDaRifare, type Riferimenti } from './dominio/automazione.js'
import { registro } from './azioni/registro.js'
import { sistema } from './azioni/sistema.js'
import { smistamento } from './azioni/smistamento.js'
import { valutazioni } from './azioni/valutazioni.js'

const GESTORI: Mappa = {
  ...registro,
  ...ore,
  ...piani,
  ...proiezione,
  ...valutazioni,
  ...consegne,
  ...docenteClasse,
  ...smistamento,
  ...rapporti,
  ...sistema,
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

/**
 * Gli id che un'azione porta con sé, per capire quale corso ha toccato.
 *
 * Si leggono dal messaggio invece di chiederli a ogni gestore: sono gli stessi
 * nomi in tutto il protocollo — `corsoId`, `lezioneId`, `classeId` — e
 * dedurli qui vuol dire che un'azione nuova entra nell'automazione senza che
 * nessuno debba ricordarsi di registrarla.
 */
function riferimentiDi (azione: Azione): Riferimenti {
  const dati = azione as unknown as Record<string, unknown>
  const id = (nome: string) => (typeof dati[nome] === 'string' ? (dati[nome] as string) : null)
  return {
    corsoId: id('corsoId'),
    lezioneId: id('lezioneId'),
    valutazioneId: id('valutazioneId'),
    pianoId: id('pianoId'),
    classeId: id('classeId'),
    allievoId: id('allievoId'),
  }
}

export async function esegui (archivio: Archivio, azione: Azione): Promise<EsitoAzione> {
  // Il gestore e l'azione hanno lo stesso tipo per costruzione — la mappa non
  // ammette accostamenti diversi — ma il compilatore non correla da sé la
  // chiave con il valore che ne esce: è l'unico punto in cui glielo si dice.
  const gestore = GESTORI[azione.tipo] as Gestore<Azione['tipo']>
  const prima = archivio.revisione
  const esito = await gestore(contestoDi(archivio), azione as never)

  // I documenti seguono i dati. Qui e non dentro i gestori perché è una regola
  // sola — «se il registro è cambiato, quel che ne è stato stampato è vecchio»
  // — e ripeterla in novantanove posti vuol dire dimenticarla nel centesimo.
  //
  // Si guarda la revisione e non l'esito: esportare un CSV, aprire un allegato
  // o stampare un rapporto riescono senza toccare il registro, e reagire al
  // solo «è andata bene» vorrebbe dire rifare venti PDF ogni volta che se ne
  // apre uno.
  if (esito.ok && archivio.revisione !== prima) {
    const registro = archivio.registro
    programmaRigenerazione(registro, corsiDaRifare(registro, riferimentiDi(azione)))
  }
  return esito
}
