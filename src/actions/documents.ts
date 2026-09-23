// I documenti d'anno visti dal registro: aprirne uno, tenerne da parte uno,
// dimenticarne uno. E il salvataggio chiesto a mano.
//
// Aprire un documento è l'unica azione del registro che può finire con
// l'applicazione che si riavvia — il documento può stare in un'altra cartella
// di lavoro, e allora cambia tutto quel che c'è sotto. Per questo qui non c'è
// il lavoro ma la richiesta: la fa il guscio, che è l'unico che sa di finestre.
//
// L'elenco dei recenti invece si tocca da qui: è una lista di percorsi in un
// file, non ha finestre né cicli di vita, e farla passare da un comando del
// guscio vorrebbe dire un giro in più per scrivere una riga in un JSON.

import * as apparato from 'apparato'

import { dimenticaDocumento, impostaPreferito } from '../environment/documents.js'
import { conMessaggio, fatto, invariato, type Parte } from './context.js'

export const documenti = {
  /**
   * Il salvataggio chiesto a mano: scrive quel che è in attesa e lo dice.
   *
   * Il registro salva da sé, e questo non cambia. Quel che cambia è che ora
   * esiste il gesto — Ctrl+S — e che risponde qualcosa invece di niente: chi
   * lo preme sta chiedendo «è al sicuro?», e la risposta giusta è sì, adesso.
   */
  'stato.salva': async (contesto, _azione) => {
    await contesto.archivio.salva()
    return conMessaggio('Tutto salvato.', 'info', { invariato: true })
  },

  'documento.apri': async (_contesto, azione) => {
    // Senza percorso è il dialogo del sistema, con il percorso è la voce di un
    // elenco: la differenza la fa il guscio, che in tutti e due i casi finisce
    // per ricaricare l'anno o riavviare l'applicazione.
    await apparato.comandi.esegui('registroDocenti.apriDocumento', azione.percorso)
    return invariato
  },

  'documento.chiudi': async (_contesto, _azione) => {
    // Come l'apertura: il lavoro è del guscio, che chiude il pannello, libera
    // il documento e rimette davanti il benvenuto. Qui resta la richiesta —
    // e nessuna risposta, perché chi l'ha chiesta fra un istante non c'è più.
    await apparato.comandi.esegui('registroDocenti.chiudiDocumento')
    return invariato
  },

  'documento.preferito': (_contesto, azione) => {
    impostaPreferito(azione.percorso, azione.preferito)
    // `invariato` no: nel registro non è cambiato niente, ma nell'elenco che il
    // pannello spinge sì — la stella si accende adesso.
    return fatto
  },

  'documento.dimentica': (_contesto, azione) => {
    dimenticaDocumento(azione.percorso)
    return fatto
  },
} satisfies Parte
