// I documenti già esportati: guardarne uno qui dentro, aprirne uno con il
// programma del sistema, buttarne via uno.
//
// Fin qui la pagina Documenti sapeva fare una cosa sola — rifare un foglio e
// aprirlo — e per rileggere una scheda bisognava ricomporla. Sono tre gesti
// diversi: *rifare* è del registro che è cambiato, *guardare* è di chi controlla
// che cosa uscirà dalla stampante, *togliere* è di chi tiene in ordine una
// cartella che si consegna. Gli ultimi due non toccano il registro, e per questo
// stanno qui e non fra i rapporti.
//
// Tutti e tre accettano un percorso qualsiasi e tutti e tre lo rifiutano se non
// comincia per `esportazioni/`: il webview manda stringhe, e un'azione che
// cancella per percorso senza guardare dove punta è un'azione che può cancellare
// una verifica scansionata — l'unica copia che ne esiste.

import * as apparato from 'apparato'

import { ESPORTAZIONI } from '../domain/locations.js'
import { fraIFascicoli, pdfDi } from '../domain/compositions.js'
import { ricettePresenti } from '../data/compositions.js'
import { deposito, percorsoVero } from '../data/store.js'
import { apriConIlSistema } from '../data/opening.js'
import { buttaIlFascicolo } from './compositions.js'
import { conMessaggio, rifiuta, type Parte } from './context.js'


/**
 * Vero se il percorso sta davvero fra le esportazioni.
 *
 * Il `..` non serve controllarlo qui — il deposito normalizza — ma la radice sì:
 * è la differenza fra un file che si rifà premendo un pulsante e un file che se
 * si perde è perso.
 */
function fraLeEsportazioni (percorso: string): boolean {
  return percorso.startsWith(`${ESPORTAZIONI}/`) && !percorso.includes('..')
}


export const esportazioni = {
  'esportazione.apri': async (_contesto, azione) => {
    if (!fraLeEsportazioni(azione.percorso)) return rifiuta('Non è un documento esportato.')
    // Sta dentro il documento dell'anno, e il lettore di PDF sa aprire solo i
    // file: se ne materializza una copia, e si apre quella.
    const file = await percorsoVero(azione.percorso)
    if (!file) return rifiuta('Quel documento non c’è più: si rifà con «Aggiorna».')
    if (!(await apriConIlSistema(file))) {
      return rifiuta('Il documento c’è, ma non si è potuto aprire da qui.')
    }
    // Aprire non cambia niente nel registro: nessuno stato da rispingere.
    return { ok: true, invariato: true }
  },

  'esportazione.mostra': async (_contesto, azione) => {
    if (!fraLeEsportazioni(azione.percorso)) return rifiuta('Non è un documento esportato.')
    // Anche il lettore interno legge un file vero: la finestra carica un
    // indirizzo `registro://`, e dietro quell'indirizzo c'è la copia
    // materializzata.
    const file = await percorsoVero(azione.percorso)
    if (!file) return rifiuta('Quel documento non c’è più: si rifà con «Aggiorna».')
    const nome = azione.percorso.split('/').pop() ?? 'Documento'
    await apparato.comandi.esegui(
      'registroDocenti.mostraDocumento',
      file.fsPath,
      azione.titolo ?? nome,
    )
    return { ok: true, invariato: true }
  },

  /**
   * Mette insieme i documenti scelti in un PDF solo, e dice dov'è.
   *
   * Il fascicolo si compone qui e non nella pagina: i byte stanno dentro il
   * documento dell'anno, che il webview non vede — vive in una sandbox — e
   * `@cantoo/pdf-lib` non è codice da spedire dentro una pagina per un gesto che si fa
   * a fine semestre.
   *
   * Niente stato del registro da rispingere: il file nasce fra le copie, e
   * quel che la pagina deve sapere è soltanto dove guardare.
   */
  'esportazione.elimina': (_contesto, azione) => {
    if (!fraLeEsportazioni(azione.percorso)) return rifiuta('Non è un documento esportato.')
    const dove = deposito()
    if (!dove) return rifiuta('Nessun anno aperto.')

    // Il PDF di un fascicolo non è solo un PDF: c'è una ricetta che lo nomina,
    // e toglierne uno dei due lascia l'altro a dire il falso — un elenco che
    // nomina un file che non c'è, o un file che nessuno sa più rifare. Qui ci
    // si arriva da fuori la scheda dei fascicoli: la cornice dell'anteprima, un
    // comando, una versione di prima del webview.
    if (fraIFascicoli(azione.percorso)) {
      const ricetta = ricettePresenti().find((r) => pdfDi(r.composizione) === azione.percorso)
      if (ricetta) return buttaIlFascicolo(ricetta)
    }

    if (!dove.elimina(azione.percorso)) return rifiuta('Quel documento non c’è più.')
    // La voce di prima resta dentro il documento d'anno finché non lo si
    // compatta, e lo storico la ricorda: un ripensamento ha dove tornare.
    return conMessaggio('Documento buttato via. Si rifà con «Aggiorna».')
  },

} satisfies Parte
