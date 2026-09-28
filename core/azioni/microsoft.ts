// Gli account Microsoft e OneDrive: collegare, scollegare, aprire un documento
// trovato. L'accesso e i gettoni li tiene l'host (`data/microsoft.ts`): qui
// arriva solo chi e che cosa, mai una credenziale.

import * as apparato from 'apparato'

import { aggiungiAccount, togliAccount } from '../dati/microsoft.js'
import { apriDaOneDrive } from '../dati/onedrive.js'
import { conMessaggio, invariato, motivoSicuro, rifiutaCon, type Parte } from './context.js'
import { testi } from './microsoft.testi.js'

export const microsoft = {
  /**
   * Collega un account: l'accesso passa dal browser, e il gettone resta nel
   * portachiavi. Non `invariato`: l'elenco degli account nel pannello cambia.
   */
  'microsoft.aggiungi': async (_contesto, azione) => {
    const esito = await aggiungiAccount(azione.indirizzo)
    // Domanda chiusa senza scrivere niente: non è un errore.
    if (!esito) return invariato
    if (!esito.ok) return rifiutaCon('non-disponibile', esito.testo)
    return conMessaggio(esito.testo)
  },

  'microsoft.togli': async (_contesto, azione) => {
    const esito = await togliAccount(azione.indirizzo)
    if (!esito.ok) return rifiutaCon('non-trovato', esito.testo)
    return conMessaggio(esito.testo)
  },

  /**
   * Apre un documento di OneDrive come se lo si scegliesse dal disco: il guscio
   * ricarica l'anno o riavvia l'app, quindi un messaggio nella risposta
   * potrebbe non arrivare. L'avviso della copia scaricata va in un dialogo.
   */
  'onedrive.apri': async (_contesto, azione) => {
    let esito
    try {
      esito = await apriDaOneDrive(azione.account, azione.drive, azione.id)
    } catch (guasto) {
      return rifiutaCon('non-disponibile', motivoSicuro(guasto))
    }
    // Dialogo chiuso senza scegliere dove scaricare.
    if (!esito) return invariato
    if (!esito.sincronizzato) void apparato.dialoghi.avvisa(testi().copiaScaricata(esito.percorso))
    await apparato.comandi.esegui('registroDocenti.apriDocumento', esito.percorso)
    return invariato
  },
} satisfies Parte
