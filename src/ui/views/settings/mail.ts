// La posta: i gesti, e l'unico interruttore che conta.
//
// Collegare una casella non è scrivere un valore in un file: è un giro di
// autorizzazione con Microsoft, e quel che ne esce va nel portachiavi del
// sistema. Per questo i gesti stanno qui e non fra le righe delle impostazioni.
//
// La scheda dice tre cose e si ferma: dove va a finire una comunicazione — nel
// sottotitolo — di chi è la casella collegata, e se il registro spedisce da sé.
// Le prime due si leggono, la terza si cambia qui: `invioDiretto` stava in
// fondo alla pagina, in fila con impostazioni che si toccano una volta nella
// vita, e decide invece *se una comunicazione parte o resta lì*. Ora la riga
// che ne racconta l'effetto e l'interruttore che lo decide sono a un
// centimetro di distanza, e `CHIAVI_IN_SCHEDA` in `sections.ts` la toglie
// dall'elenco di sotto: la stessa riga due volte nella stessa pagina è peggio
// che una volta sola nel posto sbagliato.
//
// C'è stata anche una scala di tre gradini — la casella, il collegamento,
// l'invio — ed è caduta: il perché sta su `statoCasella`, che è quel che ne
// resta.

import { avviso, pastiglia, pulsante, scheda } from '../../components/base.js'
import { h, type Figlio } from '../../dom.js'
import { PIF, un } from '../../../domain/lexicon.js'
import type { Messaggio, VoceProgramma } from '../../../protocol.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'
import { vociProgramma } from './program.js'
import { CHIAVI_IN_SCHEDA } from './sections.js'

/**
 * Scrive sotto le azioni com'è andata, e ce lo lascia.
 *
 * La notifica passa e chi ha premuto sta ancora correggendo le impostazioni:
 * il motivo per cui il server ha detto di no deve restare leggibile mentre si
 * rimedia, non sparire dopo tre secondi.
 */
function mostraEsito (dove: HTMLElement, detto: Messaggio | undefined): void {
  dove.replaceChildren(
    detto
      ? avviso(
          detto.testo,
          detto.livello === 'errore'
            ? 'negativo'
            : detto.livello === 'avviso'
              ? 'attenzione'
              : 'informativo',
        )
      : avviso('Non è arrivata nessuna risposta.', 'attenzione'),
  )
}

/**
 * Dove va a finire davvero una comunicazione, adesso.
 *
 * È la sola domanda che chi apre questa scheda si sta facendo, e la risposta
 * dipende da due cose che stanno in due punti diversi della pagina: se la
 * casella è collegata, e se l'invio diretto è acceso.
 */
function doveFinisce (posta: typeof stato.posta): string {
  return posta.invioDiretto && posta.exchange
    ? `le comunicazioni partono dal registro, consegnate a ${posta.server}`
    : 'le comunicazioni escono come file .eml, da spedire dal programma di posta'
}

/**
 * Di chi è la casella collegata, in una riga.
 *
 * Qui c'era una scala di tre gradini — la casella, il collegamento, l'invio —
 * ed era ceremonia. Il primo gradino diceva l'indirizzo, che però lo scrive il
 * comando che collega: non esiste lo stato «indirizzo sì, collegamento no»,
 * salvo per l'istante dopo un tentativo fallito. Il terzo diceva se l'invio
 * diretto è acceso, ed è un interruttore disegnato come interruttore due
 * centimetri più sotto. Restava un fatto solo, e un fatto solo non è una
 * sequenza.
 *
 * Quel che serve saperne è questo: se si è collegati, e a che casella. I due
 * indirizzi si scrivono tutti e due quando sono diversi — nel tenant di una
 * scuola lo sono quasi sempre — perché scambiati sono la causa di
 * `5.7.60 does not have permissions to send as`, e leggerli qui vicini è il
 * modo di accorgersene prima.
 */
function statoCasella (posta: typeof stato.posta): HTMLElement {
  if (!posta.exchange) {
    return h(
      'p',
      { class: 'posta-stato' },
      pastiglia('casella da collegare', 'quiete', 'collegamento'),
      'Premi «Collega la casella»: chiede l’indirizzo e apre l’accesso nel browser.',
    )
  }

  const altroAccesso =
    posta.accesso && posta.accesso.toLowerCase() !== posta.mittente.toLowerCase()

  return h(
    'p',
    { class: 'posta-stato' },
    pastiglia('casella collegata', 'positivo', 'collegamento'),
    h('strong', null, posta.mittente),
    altroAccesso ? ` · accesso ${posta.accesso}` : null,
    ` · consegna a ${posta.server}`,
  )
}

/** La riga promossa, presa dalle stesse voci che disegna l'elenco di sotto. */
function scelteDellaPosta (): Figlio {
  const voci = new Map(stato.programma.map((voce: VoceProgramma) => [voce.chiave, voce]))
  const trovate = (CHIAVI_IN_SCHEDA.posta ?? [])
    .map((chiave) => voci.get(chiave))
    .filter((voce): voce is VoceProgramma => Boolean(voce))
  if (trovate.length === 0) return null
  return h(
    'section',
    { class: 'gruppo-opzioni' },
    h('h4', { class: 'gruppo-opzioni__titolo' }, 'Quando parte'),
    h('div', { class: 'voci-opzioni' }, ...trovate.map((voce) => vociProgramma(voce))),
  )
}

/**
 * La posta: a che punto è il collegamento, dove vanno le comunicazioni, e dove
 * sta la firma.
 *
 * La firma non si scrive qui: sta in `templates/_firma.html`, con le
 * intestazioni dei rapporti, perché è la stessa specie di cosa — un pezzo di
 * testo che si scrive una volta e si corregge a mano quando cambia un numero di
 * telefono. Qui c'è la porta per arrivarci.
 */
export function schedaPosta (): HTMLElement {
  const posta = stato.posta

  // L'esito delle prove, che compare qui sotto e ci resta: la notifica passa,
  // e chi ha premuto per sapere di che casella si tratta vuole poterlo
  // rileggere mentre corregge le impostazioni.
  const esito = h('div', { class: 'posta-esito' })

  return scheda({
    titolo: 'Posta',
    sottotitolo: doveFinisce(posta),
    azioni: [
      pulsante({
        testo: posta.exchange ? 'Ricollega la casella' : 'Collega la casella',
        simbolo: 'collegamento',
        variante: posta.exchange ? 'sottile' : 'primario',
        titolo:
          'Chiede l’indirizzo, apre la pagina di Microsoft nel browser, e prova. Quel che apre ' +
          'la casella va nel portachiavi del sistema, non nelle impostazioni.',
        al: async () => {
          const risposta = await azione({ tipo: 'posta.collega' })
          mostraEsito(esito, risposta.messaggio)
        },
      }),
      pulsante({
        testo: 'Prova il collegamento',
        simbolo: 'posta',
        variante: 'sottile',
        titolo: 'Va a bussare alla casella e si fa dire di chi è. Non manda niente.',
        al: async () => {
          const risposta = await azione({ tipo: 'posta.prova' })
          mostraEsito(esito, risposta.messaggio)
        },
      }),
      // L'altra metà della prova, e sta accanto alla prima apposta: entrare
      // nella casella e uscirne sono due permessi diversi, e chi ha visto la
      // riga verde della prima crede di aver finito.
      ...(posta.exchange
        ? [
            pulsante({
              testo: 'Manda una prova',
              simbolo: 'posta',
              variante: 'sottile',
              titolo:
                'Manda una mail vera all’indirizzo che scrivi — di solito il tuo. È l’unico modo ' +
                'di vedere se il permesso di spedire c’è e se la firma arriva com’è scritta.',
              al: async () => {
                const risposta = await azione({ tipo: 'posta.invioProva' })
                mostraEsito(esito, risposta.messaggio)
              },
            }),
            pulsante({
              testo: 'Scollega',
              simbolo: 'chiudi',
              variante: 'fantasma',
              titolo:
                'Toglie dal portachiavi il gettone di Microsoft e la password: si torna ai file ' +
                '.eml. L’autorizzazione data al programma si revoca dal profilo Microsoft.',
              al: async () => {
                const risposta = await azione({ tipo: 'posta.scollega' })
                mostraEsito(esito, risposta.messaggio)
              },
            }),
          ]
        : []),
    ],
    contenuto: h(
      'div',
      { class: 'posta-corpo' },
      statoCasella(posta),
      esito,
      scelteDellaPosta(),
      h(
        'section',
        { class: 'posta-firma' },
        h('h4', { class: 'gruppo-opzioni__titolo' }, 'La firma'),
        h(
          'p',
          null,
          'Va in fondo a ogni e-mail — comunicazioni, richieste di firma alle aziende, documenti ' +
            `mandati a ${un(PIF)} — e sta in `,
          h('code', null, 'templates/_firma.html'),
          '. È HTML, e con una firma in HTML tutta l’e-mail parte in HTML; svuotando il file ' +
            'l’e-mail parte senza firma.',
        ),
        pulsante({
          testo: 'Apri i modelli',
          simbolo: 'cartella',
          variante: 'sottile',
          titolo: 'La cartella templates/, dove sta anche la firma delle e-mail',
          al: () => azione({ tipo: 'rapporto.modelli' }),
        }),
      ),
    ),
  })
}
