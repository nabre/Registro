// I modelli del linguaggio: quel che si scarica, quel che si sceglie, quel che
// si butta.
//
// Nessuna di queste azioni tocca il registro — non c'è una lezione, non c'è una
// valutazione — e passano lo stesso dalle azioni, come `assistente.stacca`, per
// la ragione dichiarata in `protocol.ts`: scrivono gigabyte sul disco di chi
// insegna, si possono annullare, e vogliono il giornale. Tornano `invariato`,
// quindi il pannello non si fa rispingere il registro intero perché è arrivato
// un file.
//
// ---------------------------------------------------------- uno per volta
//
// Lo scarico in corso è **uno**. Non è una limitazione tecnica — si potrebbero
// tenere due `AbortController` in una mappa — è quel che serve: chi scarica
// quattro gigabyte su una linea di scuola e ne avvia un secondo li dimezza
// tutti e due, e la pagina mostrerebbe due barre che non finiscono mai. Chi ne
// vuole un altro ferma quello che c'è, e lo vede scritto.
//
// ------------------------------------------------------- perché non si aspetta
//
// `llm.scarica` **ritorna subito**. Un'azione che aspettasse la fine dello
// scarico terrebbe la coda delle scritture occupata per venti minuti: in quei
// venti minuti il registro non potrebbe segnare un'assenza. Quel che succede
// dopo si racconta con i messaggi di avanzamento, che è esattamente la forma
// per cui `MessaggioScarico` esiste.
//
// -------------------------------------------------------- chi riceve i messaggi
//
// Non si sa da qui. Come per la finestra dell'assistente, chi sa mandarli al
// pannello si iscrive (`registraAvanzamentoScarico`): questo file non conosce i
// webview, e conoscerli vorrebbe dire un anello fra le azioni e i pannelli che
// `npm run layers` prenderebbe al primo giro. In una prova che esercita il
// centralino senza un guscio intorno nessuno si iscrive, e lo scarico avanza
// senza raccontarlo — che è quel che deve succedere.

import * as apparato from 'apparato'

import { elimina as eliminaModello, importa, scarica } from '../data/gguf.js'
import { indirizzo } from '../data/huggingFace.js'
import { pesiCaricati, scaricaPesi } from '../data/llamaCpp.js'
import { modelloNellaCartella } from '../data/gguf.js'
import type { MessaggioScarico } from '../protocol.js'
import { conMessaggio, invariato, motivoSicuro, rifiuta, scegliFile, type Parte } from './context.js'

/**
 * Ogni quanto si racconta a che punto si è: più spesso sarebbe rumore.
 *
 * `node-llama-cpp` chiama `onProgress` **a ogni pezzo scritto**, e con più
 * connessioni aperte in parallelo sono centinaia di volte al secondo. Senza
 * questo respiro ognuna di quelle volte diventava un messaggio al pannello, e
 * nel pannello un `aggiorna({})`: il registro si ridisegnava per intero a ogni
 * fotogramma per tutti i venti minuti dello scarico. Quel che si vedeva non era
 * una barra che corre — era una finestra in cui non si riusciva più a
 * navigare: i menu si chiudevano da soli, il fuoco saltava fuori dai campi e i
 * clic finivano su nodi già sostituiti.
 *
 * Si possono buttare i messaggi in mezzo senza perdere niente: ognuno porta
 * `byte` e `totale` assoluti, non un incremento. Quello finale — `finito` — non
 * passa di qui e parte sempre.
 *
 * Stesso numero e stesso motivo di `RESPIRO_MS` in `data/kit.ts`, che è
 * l'altro scarico lungo del registro.
 */
const RESPIRO_MS = 250

/** Chi sa raccontare al pannello a che punto è lo scarico, quando c'è. */
let racconta: ((avanzamento: Omit<MessaggioScarico, 'tipo'>) => void) | null = null

/**
 * Chi racconta, e come si smette.
 *
 * Torna il gesto per disiscriversi perché chi si iscrive è un pannello, e un
 * pannello si chiude: senza, un riferimento alla finestra chiusa resterebbe
 * qui, e il primo scarico dopo la chiusura scriverebbe dentro un webview che
 * non c'è più.
 */
export function registraAvanzamentoScarico (
  al: (avanzamento: Omit<MessaggioScarico, 'tipo'>) => void,
): { dispose: () => void } {
  racconta = al
  return {
    dispose: () => {
      if (racconta === al) racconta = null
    },
  }
}

/** Lo scarico in corso, se ce n'è uno. Vedi la nota in testa al file. */
let inCorso: { file: string, ferma: AbortController } | null = null

/**
 * Scrive un'impostazione del registro.
 *
 * È l'unico punto del programma in cui un'azione scrive nelle impostazioni, ed
 * è voluto: la pagina dei modelli sceglie chi lavora per quale mestiere, e
 * lasciarglielo fare da sé vorrebbe dire dare al webview la penna sul file di
 * configurazione. Da qui passa, e passa per una chiave sola per volta.
 */
async function imposta (chiave: string, valore: string): Promise<void> {
  await apparato.impostazioni.leggi('registroDocenti').update(chiave, valore)
}

/** Che cosa dice adesso un'impostazione dei modelli. */
function scrittoOra (chiave: string): string {
  return apparato.impostazioni.leggi('registroDocenti').get<string>(chiave, '')
}

export const llm = {
  /**
   * Avvia lo scarico di un modello.
   *
   * Quel che arriva è un deposito e un file come la pagina li ha letti
   * dall'albero di Hugging Face; l'indirizzo lo compone `data/huggingFace.ts` e
   * la cartella la decide `data/gguf.ts`. Qui in mezzo non si sceglie niente:
   * si tiene il filo, si racconta, e si ricorda che cosa fermare.
   */
  'llm.scarica': (_contesto, azione) => {
    if (inCorso) {
      return rifiuta(
        `Sta già scendendo «${inCorso.file}»: aspetta che finisca, o fermalo prima di ` +
        'cominciarne un altro.',
      )
    }
    const ferma = new AbortController()
    inCorso = { file: azione.file, ferma }

    // Che cosa lavorava per quel mestiere **quando lo scarico è partito**.
    // Serve alla fine: uno scarico dura venti minuti, e in venti minuti chi
    // guarda può aver scelto un altro modello. Vedi sotto.
    const chiavePer = azione.per
      ? `${azione.per}.${/mmproj/i.test(azione.file) ? 'proiettore' : 'modello'}`
      : ''
    const primaCera = chiavePer ? scrittoOra(chiavePer) : ''

    // L'ultima volta che si è raccontato: vedi `RESPIRO_MS`. Sta qui e non
    // accanto a `inCorso` perché muore con lo scarico che la usa.
    let ultimoRacconto = 0

    // Volutamente non atteso: vedi la nota in testa al file. Quel che succede
    // dopo arriva alla pagina come avanzamento, e i guasti pure — sollevare qui
    // non lo vedrebbe nessuno, perché chi ha chiesto se n'è già andato.
    void (async () => {
      try {
        const arrivato = await scarica({
          uri: indirizzo(azione.deposito, azione.file),
          nome: azione.file,
          // Da dove viene, scritto accanto ai pesi: è quel che permette a
          // «Riprendi» di rifare questo stesso scarico dopo che
          // l'applicazione è stata chiusa a metà.
          sorgente: {
            deposito: azione.deposito,
            file: azione.file,
            ...(azione.per ? { per: azione.per } : {}),
          },
          segnale: ferma.signal,
          al: ({ byte, totale }) => {
            const adesso = Date.now()
            if (adesso - ultimoRacconto < RESPIRO_MS) return
            ultimoRacconto = adesso
            racconta?.({ file: azione.file, byte, totale })
          },
        })
        // Scaricato *per* un mestiere: si sceglie da sé. È il gesto che chi
        // guarda si aspetta — ha premuto «scarica» sulla riga dell'assistente —
        // e chiederglielo una seconda volta subito dopo sarebbe un modo di
        // fargli ripetere quel che ha appena detto.
        //
        // **Ma non si scavalca una scelta fatta nel frattempo.** Venti minuti
        // sono tanti: chi ha scaricato può aver scelto un altro modello mentre
        // aspettava — magari proprio perché aspettava — e vederselo cambiare da
        // sé venti minuti dopo, a scarico dimenticato, è il genere di cosa che
        // fa dubitare di quel che si legge nelle impostazioni. Si scrive
        // soltanto se da allora non ha deciso nessun altro.
        if (azione.per) {
          const chiave = `${azione.per}.${arrivato.proiettore ? 'proiettore' : 'modello'}`
          if (scrittoOra(chiave) === primaCera) await imposta(chiave, arrivato.nome)
        }
        racconta?.({
          file: azione.file,
          byte: arrivato.byte,
          totale: arrivato.byte,
          finito: true,
          nome: arrivato.nome,
        })
      } catch (guasto) {
        racconta?.({
          file: azione.file,
          byte: 0,
          totale: 0,
          finito: true,
          motivo: ferma.signal.aborted
            ? 'Scarico fermato.'
            : guasto instanceof Error ? guasto.message : 'Lo scarico non è riuscito.',
        })
      } finally {
        inCorso = null
      }
    })()

    return invariato
  },

  'llm.annulla': () => {
    if (!inCorso) return invariato
    inCorso.ferma.abort()
    return invariato
  },

  /**
   * Porta fra i modelli un file che si ha già.
   *
   * Il percorso arriva da fuori — da quel che si è trascinato sulla pagina, o
   * dal dialogo — e non è il percorso che verrà aperto: `data/gguf.ts` guarda
   * che sia davvero un GGUF e ne fa una copia nella cartella. Quel che si
   * rifiuta si rifiuta con la frase che dice *che cosa* è stato trascinato,
   * perché quasi sempre è il file sbagliato e non un attacco.
   */
  'llm.importa': async (_contesto, azione) => {
    // Senza percorso: è il pulsante «Carica un file…», che apre il dialogo di
    // sistema. Il webview non lo può aprire da sé — non ha il filesystem, ed è
    // il motivo per cui questo gesto è un'azione e non tre righe nella pagina.
    let file = azione.file.trim()
    if (file === '') {
      const scelti = await scegliFile({
        titolo: 'Scegli un modello del linguaggio',
        tasto: 'Prendi',
        filtri: { 'Modelli GGUF': ['gguf'] },
      })
      // Chiuso senza scegliere: non è un errore e non si dice.
      if (!scelti) return invariato
      file = scelti[0].uri.fsPath
    }
    try {
      const arrivato = importa(file)
      return conMessaggio(`«${arrivato.nome}» è fra i modelli.`)
    } catch (guasto) {
      return rifiuta(motivoSicuro(guasto, 'Il file non si è potuto leggere.'))
    }
  },

  /**
   * Toglie un modello dalla cartella.
   *
   * Prima si scaricano i pesi dalla memoria, e non è un'ottimizzazione: su
   * Windows un file aperto non si cancella, e il `.gguf` che l'assistente ha
   * caricato è un file aperto. Senza questa riga, «Elimina» sul modello in uso
   * risponderebbe che il file è occupato da un altro programma — e quell'altro
   * programma saremmo noi.
   */
  'llm.elimina': async (_contesto, azione) => {
    const file = modelloNellaCartella(azione.nome)
    if (file !== '' && file === pesiCaricati()) await scaricaPesi()
    try {
      eliminaModello(azione.nome)
      return conMessaggio(`«${azione.nome}» non è più fra i modelli.`)
    } catch (guasto) {
      return rifiuta(motivoSicuro(guasto, 'Il modello non si è potuto togliere.'))
    }
  },

  /**
   * Dice quale modello lavora per quale mestiere.
   *
   * Il modello vuoto è legittimo e vuol dire «nessuno»: è il modo di disfare
   * una scelta senza doverne fare un'altra, e `prontezza()` in `data/llm.ts` lo
   * racconta a chi prova a usarlo.
   */
  'llm.scegli': async (_contesto, azione) => {
    if (azione.modello !== '' && modelloNellaCartella(azione.modello) === '') {
      return rifiuta(`«${azione.modello}» non è fra i modelli scaricati.`)
    }
    await imposta(`${azione.uso}.modello`, azione.modello)
    if (azione.proiettore !== undefined) {
      if (azione.proiettore !== '' && modelloNellaCartella(azione.proiettore) === '') {
        return rifiuta(`«${azione.proiettore}» non è fra i modelli scaricati.`)
      }
      await imposta(`${azione.uso}.proiettore`, azione.proiettore)
    }
    return invariato
  },
} satisfies Parte
