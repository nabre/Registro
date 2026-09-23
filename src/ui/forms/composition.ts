// Il nome di una composizione, chiesto prima di comporla.
//
// È l'unica domanda che si fa: i documenti li ha già scelti chi ha spuntato le
// caselle, e l'ordine è quello in cui la pagina li elenca. Il nome però serve,
// e non è una formalità — è il nome del PDF che finisce in `esportazioni/`, ed
// è come lo si ritrova fra tre mesi quando bisogna rifarlo con le schede
// aggiornate.

import { campo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { invia } from '../bridge.js'
import { aggiorna, stato } from '../state.js'

import { testo } from './common.js'

/**
 * Chiede come si chiama la composizione, la compone, e la apre.
 *
 * Il PDF che ne esce è un documento come gli altri — sta nella cartella, si
 * guarda nella cornice, si rifà — e per questo alla fine si apre lì: chi ha
 * appena messo insieme venticinque schede vuole vedere che cosa consegnerà.
 *
 * Le spunte se ne vanno solo se la composizione è stata fatta davvero: se l'host
 * rifiuta — un nome già usato, un documento sparito — restano dov'erano, e si
 * riprova senza rispuntare venticinque caselle.
 */
export function moduloComposizione (scelti: Array<{ percorso: string, nome: string }>): void {
  if (scelti.length < 2) {
    notifica('Spunta almeno due documenti da combinare.', 'avviso')
    return
  }
  const percorsi = scelti.map((s) => s.percorso)

  apriModale({
    titolo: 'Combina in una composizione',
    larghezza: 'stretta',
    testoSalva: 'Combina',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          `${percorsi.length} documenti, in quest’ordine. ` +
            'La composizione si rifà quando serve: l’elenco resta scritto, e «aggiorna» la ' +
            'ricompone con i fogli di adesso.',
        ),
        // L'elenco per esteso, numerato: l'ordine delle pagine dentro un
        // composizione è la cosa che chi la consegna guarda per prima, ed è anche
        // l'unica che non si vede finché il PDF non è fatto. Mostrarlo qui
        // costa tre righe e toglie il giro «componi, apri, guarda, rifà».
        h(
          'ol',
          { class: 'composizione__ordine' },
          scelti.map((foglio) => h('li', { attr: { title: foglio.percorso } }, foglio.nome)),
        ),
        campo({
          nome: 'nome',
          etichetta: 'Nome della composizione',
          valore: '',
          segnaposto: 'Schede 1° semestre',
          richiesto: true,
          aiuto: 'È anche il nome del file PDF',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const nome = testo(valori.nome).trim()
      if (!nome) {
        contesto.mostraErrori(['La composizione ha bisogno di un nome.'])
        return
      }
      contesto.occupato(true)
      const risposta = await invia({ tipo: 'composizione.crea', nome, percorsi })
      contesto.occupato(false)
      if (!risposta.ok) {
        contesto.mostraErrori(risposta.errori ?? ['Fascicolo non composto.'])
        return
      }
      contesto.chiudi()
      aggiorna({
        documentiScelti: [],
        anteprima: risposta.documento ?? stato.anteprima,
      })
    },
  })
}
