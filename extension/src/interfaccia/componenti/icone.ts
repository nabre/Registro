// Icone disegnate a mano, in SVG inline.
//
// Una libreria di icone vorrebbe dire spedirsi anche il suo font, e un font
// intero per venti simboli non vale il peso. Sono tutti sullo
// stesso tracciato: riquadro 24, linea di 1.8, estremi arrotondati — così stanno
// insieme e prendono il colore del testo che li circonda.

import { svg } from '../dom.js'

const TRACCIATI: Record<string, string> = {
  calendario: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  settimana: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 9.5v11M15 9.5v11"/>',
  mese: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 9.5v11M15 9.5v11"/>',
  agenda: '<path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11"/>',
  classi: '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6"/>',
  piano: '<path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5l1.3 1.3L7.5 4M4 12l1.3 1.3L7.5 11M4 19l1.3 1.3L7.5 18"/>',
  valutazioni: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="0.6"/><rect x="12.5" y="8" width="3" height="9" rx="0.6"/><rect x="18" y="14" width="3" height="3" rx="0.6"/>',
  impostazioni: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  matita: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 6.5l3 3"/>',
  cestino: '<path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M10 11v6M14 11v6"/>',
  sinistra: '<path d="M15 5l-7 7 7 7"/>',
  destra: '<path d="M9 5l7 7-7 7"/>',
  giu: '<path d="M6 9l6 6 6-6"/>',
  su: '<path d="M6 15l6-6 6 6"/>',
  chiudi: '<path d="M6 6l12 12M18 6L6 18"/>',
  spunta: '<path d="M4.5 12.5l5 5 10-11"/>',
  avviso: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  informazione: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
  orologio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  pausa: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  esporta: '<path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  utente: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>',
  cartella: '<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h3.7l2 2.5h7.3A1.5 1.5 0 0 1 20 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
  ricarica: '<path d="M20 11a8 8 0 1 0-.7 4.3"/><path d="M20 5v6h-6"/>',
  libro: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19v3H5.5A1.5 1.5 0 0 1 4 19.5z"/>',
  allegato: '<path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l8-8a3.1 3.1 0 0 1 4.4 4.4l-8 8a1.6 1.6 0 0 1-2.2-2.2l7.3-7.3"/>',
  posta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  // Una casella da spuntare, e non una lista di righe: nella barra sta a due
  // voci dal segno del piano, che di righe e' fatto, e due forme simili lette
  // di sfuggita diventano la stessa macchia.
  todo: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="m8 12.3 2.7 2.7L16.5 9"/>',
  documento: '<path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M13 3v5h5"/>',
  collegamento: '<path d="M10 13a4.5 4.5 0 0 0 6.6.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5"/><path d="M14 11a4.5 4.5 0 0 0-6.6-.4l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>',
  immagine: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 17 4.5-4.5 3 3L15 12l5 5"/>',
  // La presa del trascinamento: due solchi, come le zigrinature di una maniglia.
  presa: '<path d="M9 7h6M9 12h6M9 17h6"/>',
  // Lo schermo per la classe: un monitor con il suo piedistallo. Non un
  // proiettore — di proiettori ce ne sono di tre forme e nessuna si riconosce
  // a sedici pixel.
  schermo: '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
  duplica: '<rect x="4" y="4" width="10" height="10" rx="2"/><path d="M8 18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2"/>',
  // La firma: uno svolazzo sopra la riga su cui si firma. Sta accanto al segno
  // del documento e deve distinguersene da lontano — è l'unica cosa che dice
  // se un foglio è tornato indietro o è ancora in giro.
  firma: '<path d="M3 16c2.5 0 3-8 5.5-8S10.5 15 13 15s2.5-2.5 4-2.5"/><path d="M4 20h16"/>',
}

export type NomeIcona = keyof typeof TRACCIATI

export function icona (nome: NomeIcona | string, classe = ''): SVGSVGElement {
  const tracciato = Object.hasOwn(TRACCIATI, nome) ? TRACCIATI[nome] : TRACCIATI.informazione
  return svg('0 0 24 24', tracciato, `icona ${classe}`.trim())
}
