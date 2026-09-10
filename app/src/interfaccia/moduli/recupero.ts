// Il recupero di una prova: quando si rifà, o che non si rifà.
//
// È una finestra minuscola — una data e una nota — e potrebbe sembrare di
// troppo: fissare una data si fa anche con un pulsante. Il pulsante infatti
// c'è, e mette la prossima ora del corso, che è la risposta giusta nove volte
// su dieci. Questa serve per la decima: il recupero che si fa in un altro
// giorno, in un altro modo, e che va detto — «solo la parte B», «in
// laboratorio, con il computer».

import { formattaData } from '../../dominio/date.js'
import type { Recupero } from '../../dominio/recuperi.js'
import { postoAllegato } from '../componenti/allegati.js'
import { campo, pulsante, riga } from '../componenti/base.js'
import { apriModale } from '../componenti/modale.js'
import { h, rimpiazza } from '../dom.js'
import { nomeCorso, valutazionePerId } from '../stato.js'

import { salva, testo } from './comune.js'

/** Il nome e cognome di chi rifà la prova, come si scrive in un elenco. */
function nome (recupero: Recupero): string {
  return `${recupero.allievo.cognome} ${recupero.allievo.nome}`.trim()
}

/**
 * I documenti della prova rifatta: il testo, e la scansione del compito.
 *
 * Stanno qui perché è qui che si ha in mano la carta. Fissare un recupero e
 * archiviarne i fogli sono lo stesso gesto in due momenti — si prepara la
 * prova, si decide quando farla — e mandare a cercare la scheda della
 * valutazione per allegare un PDF era il giro lungo che si finisce per non
 * fare: il file resta in Download, e a giugno non c'è.
 *
 * Sono gli stessi posti della tabella dei recuperi, e gli stessi file: il
 * testo è uno per tutti quelli che rifanno la prova, la scansione è di questo
 * allievo. Vivono fra gli allegati del momento, che resta uno.
 */
function documentiDelRecupero (recupero: Recupero): HTMLElement {
  const contenitore = h('div', { class: 'allegati allegati--modulo' })

  const disegna = (): void => {
    // Il momento si rilegge dallo stato a ogni giro: dopo un caricamento
    // quello catturato alla costruzione della finestra è vecchio di un PDF.
    const momento = valutazionePerId(recupero.momento.id) ?? recupero.momento
    rimpiazza(
      contenitore,
      h('h4', { class: 'modulo__titolo-sezione' }, 'Documenti del recupero'),
      postoAllegato(momento, 'recupero', 'Testo della prova di recupero', { dopo: disegna }),
      // Il recupero ha un testo suo, e quindi una soluzione sua: quella della
      // prova originale risponde a domande che qui non ci sono.
      postoAllegato(momento, 'recupero-soluzione', 'Soluzione del recupero', {
        dopo: disegna,
      }),
      postoAllegato(momento, 'recupero', `Scansione di ${nome(recupero)}`, {
        allievoId: recupero.allievo.id,
        dopo: disegna,
      }),
      h(
        'p',
        { class: 'testo-quieto' },
        'Il voto va nella casella di sempre, nella griglia: la prova è una, e la colonna ' +
          'è la stessa per tutta la classe.',
      ),
    )
  }

  disegna()
  return contenitore
}

/**
 * Fissa il recupero, o lo dispensa.
 *
 * La dispensa sta qui in basso, fra le azioni secondarie, come l'eliminazione
 * negli altri moduli: è la scelta che chiude la faccenda senza un voto, e va
 * fatta guardando in faccia quel che si sta rinunciando a valutare.
 */
export function moduloRecupero (recupero: Recupero, dopo?: () => void): void {
  const manda = (
    contesto: Parameters<typeof salva>[0],
    previstoIl: string | null,
    nota: string,
    dispensato: boolean,
    messaggio: string,
    riconsegnataIl?: string | null,
  ) =>
    salva(
      contesto,
      {
        tipo: 'recupero.imposta',
        valutazioneId: recupero.momento.id,
        allievoId: recupero.allievo.id,
        previstoIl,
        nota,
        dispensato,
        riconsegnataIl,
      },
      messaggio,
      () => dopo?.(),
    )

  apriModale({
    titolo: 'Recupero della prova',
    sottotitolo: `${nome(recupero)} · ${recupero.momento.titolo}`,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          `${nomeCorso(recupero.corsoId)} · prova del ` +
            `${formattaData(recupero.momento.data, 'lungo')}` +
            (recupero.daAppello
              ? ' · risulta assente dall’appello di quell’ora'
              : ' · segnato assente alla prova'),
        ),
        riga(
          campo({
            nome: 'previstoIl',
            etichetta: 'Si rifà il',
            tipo: 'date',
            valore: recupero.previstoIl ?? '',
            aiuto: 'Vuoto lo rimette fra quelli da fissare.',
            larghezza: 'meta',
          }),
          // La riconsegna è di questo allievo: il suo compito rifatto torna
          // indietro quando è corretto, non il giorno in cui la classe ha
          // riavuto il proprio.
          campo({
            nome: 'riconsegnataIl',
            etichetta: 'Riconsegnata il',
            tipo: 'date',
            valore: recupero.riconsegnataIl ?? '',
            aiuto: 'Il giorno in cui ha riavuto la sua prova corretta.',
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'nota',
          etichetta: 'Nota',
          valore: recupero.nota,
          segnaposto: 'solo la parte B, in laboratorio, ultima ora…',
        }),
        documentiDelRecupero(recupero),
      ),
    alSalva: async (valori, contesto) => {
      const previstoIl = testo(valori.previstoIl) || null
      await manda(
        contesto,
        previstoIl,
        testo(valori.nota),
        false,
        previstoIl
          ? `Recupero fissato per il ${formattaData(previstoIl, 'giorno')}.`
          : 'Recupero rimesso fra quelli da fissare.',
        testo(valori.riconsegnataIl) || null,
      )
    },
    azioniSecondarie: (contesto) =>
      pulsante({
        testo: recupero.stato === 'dispensato' ? 'Torna a recuperarla' : 'Non si recupera',
        simbolo: recupero.stato === 'dispensato' ? 'ricarica' : 'chiudi',
        variante: 'fantasma',
        al: () =>
          recupero.stato === 'dispensato'
            ? manda(contesto, recupero.previstoIl, recupero.nota, false, 'Recupero riaperto.')
            : manda(contesto, null, recupero.nota, true, 'La prova non si recupera.'),
      }),
  })
}
