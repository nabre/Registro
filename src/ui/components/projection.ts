// Che cosa sta vedendo la classe adesso.
//
// La fascia compare sotto la barra a proiezione accesa, e risponde a una
// domanda sola: che cosa è finito sullo schermo grande. È l'unica cosa che da
// qui non si vede — la proiezione segue l'ora aperta, quindi cambia da sé — e
// senza un posto in cui leggerla si finisce per girare la testa verso il
// proiettore ogni volta.
//
// **I comandi non stanno più qui.** Stanno nella scheda «Proiezione» della
// barra, che compare a schermo acceso e porta i comandi `dove: ['schermo']`
// come ogni altra pagina porta i suoi. Qui erano scritti una seconda volta —
// «Nomi visibili», «Misure strette», «Pausa», le frecce, il selettore della
// vista del calendario — con testi propri e un'abilitazione calcolata a parte:
// due risposte alla stessa domanda, tenute d'accordo a mano.
//
// Quel che resta è quel che nella barra non si può dire. Le linguette hanno
// tre stati e non due — spenta, accesa ma in coda, in vista adesso — e il terzo
// è il punto di tutta la fascia. Il pulsante nella barra ne dice due, perché un
// comando o si può fare o no; la linguetta dice anche qual è quella che la
// classe ha davanti. Si preme, ed è lo stesso gesto del comando: `apriBlocco`
// sta in `commands.ts` e la regola dei tre stati è una sola.

import {
  BLOCCHI,
  NOMI_BLOCCO,
  bloccoAperto,
  riservato,
  type BloccoProiezione,
  type ImpostazioniProiezione,
} from '../../domain/projection.js'
import { aiutoDi, apriBlocco, comandoPerId, titoloDi } from '../commands.js'
import { h, type Figlio } from '../dom.js'
import { stato } from '../state.js'
import { conAttesa } from './base.js'
import { icona } from './icons.js'

/**
 * Una scheda nella barra del docente.
 *
 * Tre stati e non due: spenta, accesa ma non in vista, in vista. Il terzo è
 * quello che conta — dice che cosa sta guardando la classe in questo momento,
 * ed è l'unica cosa che da qui non si vede girando la testa.
 *
 * Il nome e la riga d'aiuto sono quelli del comando `proiezione.blocco.<nome>`:
 * chi cerca «consegne» nella palette e chi preme questa linguetta deve leggere
 * la stessa frase, perché è lo stesso gesto.
 */
function scheda (blocco: BloccoProiezione): HTMLElement {
  const impostazioni = stato.proiezione.impostazioni
  const acceso = impostazioni.blocchi.includes(blocco)
  const corrente = acceso && bloccoAperto(impostazioni) === blocco
  const delicato = riservato(blocco)
  const comando = comandoPerId(`proiezione.blocco.${blocco}`)
  const nome = comando ? titoloDi(comando) : NOMI_BLOCCO[blocco]

  return h(
    'button',
    {
      class: [
        'blocco-proiettato',
        acceso && 'blocco-proiettato--acceso',
        corrente && 'blocco-proiettato--in-vista',
        delicato && 'blocco-proiettato--riservato',
      ],
      type: 'button',
      attr: {
        'aria-pressed': corrente ? 'true' : 'false',
        // Solo lo stato «in vista» ha una frase sua: è il gesto che qui c'è e
        // nell'elenco no — ricliccare per togliere quel che si sta vedendo.
        title: corrente
          ? `${nome}: è quel che la classe sta vedendo. Cliccando lo si toglie.`
          : (comando && aiutoDi(comando)) ?? nome,
      },
      onclick: (evento: MouseEvent) =>
        void conAttesa(evento.currentTarget as HTMLButtonElement, apriBlocco(blocco)),
    },
    h('span', null, nome),
  )
}

/**
 * L'avviso che compare quando sullo schermo ci sono i nomi.
 *
 * Non è un divieto e non chiede conferme: dice quel che c'è scritto sul
 * proiettore, che è l'unica cosa che da qui non si vede. Chi l'ha acceso lo sa;
 * chi ci ritorna dopo mezz'ora di lezione no.
 */
function avvisoRiservato (impostazioni: ImpostazioniProiezione): Figlio {
  // Solo la scheda aperta: le altre sono accese ma non sullo schermo, e dire
  // «sullo schermo: valutazioni» di un blocco che nessuno vede sarebbe un
  // allarme che si impara a ignorare.
  const aperto = bloccoAperto(impostazioni)
  if (!aperto || !riservato(aperto)) return null
  return h(
    'div',
    { class: 'barra-proiezione__avviso' },
    icona('avviso'),
    h(
      'span',
      null,
      `Sullo schermo: ${NOMI_BLOCCO[aperto].toLowerCase()}`,
      impostazioni.nomi ? ', con i nomi' : '',
      '.',
    ),
  )
}

export function barraProiezione (): Figlio {
  if (!stato.proiezione.aperta) return null
  const impostazioni = stato.proiezione.impostazioni

  return h(
    'div',
    {
      class: ['barra-proiezione', impostazioni.sospesa && 'barra-proiezione--sospesa'],
      attr: { 'aria-label': 'Che cosa sta vedendo la classe' },
    },
    h(
      'div',
      { class: 'barra-proiezione__riga' },
      h(
        'span',
        { class: 'barra-proiezione__marchio' },
        icona('schermo'),
        h('strong', null, impostazioni.sospesa ? 'In pausa' : 'In proiezione'),
      ),
      h('div', { class: 'barra-proiezione__blocchi' }, ...BLOCCHI.map(scheda)),
    ),
    avvisoRiservato(impostazioni),
  )
}
