// Che cosa sta vedendo la classe adesso: la fascia sotto la barra a
// proiezione accesa, perché lo schermo grande segue l'ora aperta e da qui non
// si vede. I comandi stanno nella scheda «Proiezione» della barra (`dove:
// ['schermo']`); qui restano le linguette a tre stati — spenta, accesa in coda,
// in vista — che un pulsante di comando non sa dire. Si premono con lo stesso
// gesto del comando (`apriBlocco` in `commands.ts`).

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
import { testi } from './projection.testi.js'

/**
 * Una linguetta a tre stati: spenta, accesa, in vista (quel che la classe
 * guarda adesso). Nome e aiuto sono quelli del comando
 * `proiezione.blocco.<nome>`, perché è lo stesso gesto.
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
        // Solo «in vista» ha una frase sua: ricliccare toglie quel che si sta vedendo.
        title: corrente
          ? testi().inVista(nome)
          : (comando && aiutoDi(comando)) ?? nome,
      },
      onclick: (evento: MouseEvent) =>
        void conAttesa(evento.currentTarget as HTMLButtonElement, apriBlocco(blocco)),
    },
    h('span', null, nome),
  )
}

/**
 * L'avviso che dice quando sullo schermo ci sono i nomi: non chiede conferme,
 * dice quel che si sta proiettando a chi ci ritorna dopo un po'.
 */
function avvisoRiservato (impostazioni: ImpostazioniProiezione): Figlio {
  // Solo per la scheda in vista: un allarme su un blocco che nessuno vede si
  // imparerebbe a ignorare.
  const aperto = bloccoAperto(impostazioni)
  if (!aperto || !riservato(aperto)) return null
  return h(
    'div',
    { class: 'barra-proiezione__avviso' },
    icona('avviso'),
    h(
      'span',
      null,
      testi().sulloSchermo(NOMI_BLOCCO[aperto]),
      impostazioni.nomi ? testi().conINomi : '',
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
      attr: { 'aria-label': testi().cheCosaVede },
    },
    h(
      'div',
      { class: 'barra-proiezione__riga' },
      h(
        'span',
        { class: 'barra-proiezione__marchio' },
        icona('schermo'),
        h('strong', null, impostazioni.sospesa ? testi().inPausa : testi().inProiezione),
      ),
      h('div', { class: 'barra-proiezione__blocchi' }, ...BLOCCHI.map(scheda)),
    ),
    avvisoRiservato(impostazioni),
  )
}
