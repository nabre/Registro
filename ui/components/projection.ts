// Che cosa sta vedendo la classe adesso, detto dentro la barra dei comandi,
// perché lo schermo grande è alle spalle e da qui non si vede. I comandi sono
// nella scheda «Proiezione» della barra (`dove: ['schermo']`); qui stanno le
// tre cose che un pulsante di comando non sa dire da sé: se lo schermo è in
// pausa, quali schede sono accese ma non in vista, e quando sullo schermo ci
// sono dati di singole persone.

import {
  NOMI_BLOCCO,
  bloccoAperto,
  riservato,
  type BloccoProiezione,
  type ImpostazioniProiezione,
} from '#core/dominio/projection.js'
import type { ComandoUI } from '#ui/commands.js'
import { h, type Figlio } from '#ui/dom.js'
import { stato } from '#ui/state.js'
import { icona } from './icons.js'
import { testi } from './projection.testi.js'

/** Il prefisso dei comandi che mettono una scheda sullo schermo (`comandoDiBlocco`). */
const PREFISSO_BLOCCO = 'proiezione.blocco.'

/**
 * La frase sui dati riservati, se la scheda in vista ne ha. Solo per quella:
 * un allarme su un blocco che nessuno vede si imparerebbe a ignorare.
 */
export function avvisoRiservato (impostazioni: ImpostazioniProiezione): string | null {
  const aperto = bloccoAperto(impostazioni)
  if (impostazioni.sospesa || !aperto || !riservato(aperto)) return null
  return `${testi().sulloSchermo(NOMI_BLOCCO[aperto])}${impostazioni.nomi ? testi().conINomi : ''}.`
}

/**
 * Il primo riquadro della riga dello schermo: in proiezione o in pausa, e
 * l'avviso quando la classe vede dati di singole persone. Non è un pulsante:
 * la pausa si comanda col suo interruttore, qui accanto.
 */
export function statoDelloSchermo (): Figlio {
  if (!stato.proiezione.aperta) return null
  const impostazioni = stato.proiezione.impostazioni
  const avviso = avvisoRiservato(impostazioni)

  return h(
    'div',
    {
      class: [
        'barra-comandi__gruppo',
        'stato-schermo',
        impostazioni.sospesa && 'stato-schermo--sospeso',
        avviso && 'stato-schermo--riservato',
      ],
      attr: { role: 'status', 'aria-label': testi().cheCosaVede },
    },
    h(
      'span',
      { class: 'stato-schermo__marchio' },
      icona(impostazioni.sospesa ? 'pausa' : 'schermo'),
      h('strong', null, impostazioni.sospesa ? testi().inPausa : testi().inProiezione),
    ),
    avviso
      ? h('span', { class: 'stato-schermo__avviso' }, icona('avviso', 'icona--minuta'), avviso)
      : null,
  )
}

/**
 * Il terzo stato delle schede: accesa ma non in vista (fra quelle fra cui si
 * passa con avanti e indietro). «In vista» è già `comando--acceso`; i blocchi
 * riservati restano riconoscibili anche spenti, vanno guardati due volte.
 */
export function segnaBlocco (bottone: HTMLElement, comando: ComandoUI): void {
  if (!comando.id.startsWith(PREFISSO_BLOCCO)) return
  const blocco = comando.id.slice(PREFISSO_BLOCCO.length) as BloccoProiezione
  const impostazioni = stato.proiezione.impostazioni
  const acceso = impostazioni.blocchi.includes(blocco)
  const inVista = acceso && bloccoAperto(impostazioni) === blocco

  bottone.classList.toggle('comando--in-coda', acceso && !inVista)
  bottone.classList.toggle('comando--riservato', riservato(blocco))
  // Solo «in vista» ha una frase sua: ricliccare toglie quel che si sta vedendo.
  if (inVista && !bottone.hasAttribute('disabled')) {
    bottone.title = testi().inVista(NOMI_BLOCCO[blocco])
  }
}
