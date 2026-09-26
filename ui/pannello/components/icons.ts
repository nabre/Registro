// Icone disegnate a mano, in SVG inline: un font di icone per venti simboli non
// vale il peso. Stesso tracciato per tutte (riquadro 24, linea 1.7 da `.icona`
// in controls.css, estremi arrotondati), e prendono il colore del testo.
// Quelle che mancano si prendono da Lucide (https://lucide.dev, licenza ISC),
// copiando il tracciato e dicendolo accanto.

import { svg } from '../dom.js'

const TRACCIATI: Record<string, string> = {
  sidebar:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M5.5 8h1M5.5 12h1M5.5 16h1"/>',
  // L'interruttore della barra laterale, un'icona per stato: la freccia dice
  // dove andrà il bordo.
  sidebarRiduci:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M15.5 9.5 13 12l2.5 2.5"/>',
  sidebarEspandi:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M13 9.5l2.5 2.5-2.5 2.5"/>',
  // La spirale dell'anno: il segno del programma, lo stesso tracciato di
  // `resources/registro.svg` (da cui `npm run icons` fa l'icona della finestra).
  // Se cambia là, cambia qui.
  registro:
    '<path d="M13.8 4.205A8 8 0 1 1 8.874 19.364"/><path d="M5.962 17.248A8 8 0 0 1 5.143 16.12"/><path stroke-opacity="0.45" d="M4.03 12.697A8 8 0 0 1 10.2 4.205"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  calendario:
    '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  settimana:
    '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 9.5v11M15 9.5v11"/>',
  mese: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 9.5v11M15 9.5v11"/>',
  agenda: '<path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11"/>',
  // Quattro riquadri di sintesi: la Dashboard raccoglie conti e attività del giorno.
  dashboard:
    '<rect x="3" y="3" width="8" height="8" rx="2"/>' +
    '<rect x="13" y="3" width="8" height="5" rx="2"/>' +
    '<rect x="3" y="13" width="8" height="8" rx="2"/>' +
    '<rect x="13" y="10" width="8" height="11" rx="2"/>',
  classi:
    '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6"/>',
  piano:
    '<path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5l1.3 1.3L7.5 4M4 12l1.3 1.3L7.5 11M4 19l1.3 1.3L7.5 18"/>',
  valutazioni:
    '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="0.6"/><rect x="12.5" y="8" width="3" height="9" rx="0.6"/><rect x="18" y="14" width="3" height="3" rx="0.6"/>',
  impostazioni:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  meno: '<path d="M5 12h14"/>',
  matita:
    '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 6.5l3 3"/>',
  cestino:
    '<path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M10 11v6M14 11v6"/>',
  sinistra: '<path d="M15 5l-7 7 7 7"/>',
  destra: '<path d="M9 5l7 7-7 7"/>',
  giu: '<path d="M6 9l6 6 6-6"/>',
  su: '<path d="M6 15l6-6 6 6"/>',
  chiudi: '<path d="M6 6l12 12M18 6L6 18"/>',
  spegni: '<path d="M12 3v9"/><path d="M7.1 6.4a7.5 7.5 0 1 0 9.8 0"/>',
  spunta: '<path d="M4.5 12.5l5 5 10-11"/>',
  avviso: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  informazione: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
  orologio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  pausa:
    '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  microfono:
    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3M9 21h6"/>',
  esporta:
    '<path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  utente:
    '<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>',
  // La torta con la candelina: il compleanno. Non un pacco, che sul calendario
  // si leggerebbe come una consegna.
  torta:
    '<path d="M4 20.5h16"/>' +
    '<path d="M5.5 20.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6"/>' +
    '<path d="M5.5 16c1.6 0 1.6 1.3 3.25 1.3S10.35 16 12 16s1.6 1.3 3.25 1.3S16.9 16 18.5 16"/>' +
    '<path d="M12 12.5V9"/>' +
    '<path d="M12 4.8c1.3 1.3 1.3 3.2 0 3.2s-1.3-1.9 0-3.2z"/>',
  cartella:
    '<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h3.7l2 2.5h7.3A1.5 1.5 0 0 1 20 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
  ricarica: '<path d="M20 11a8 8 0 1 0-.7 4.3"/><path d="M20 5v6h-6"/>',
  // Le frecce della storia, piegate: la freccia dritta nel registro vuol dire «vai».
  annulla:
    '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  ripristina:
    '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  // Il registro come oggetto (quaderno col dorso), nella testata della barra
  // laterale; il logo sta nella barra del titolo.
  libro:
    '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v16H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M4 20.5A1.5 1.5 0 0 1 5.5 19H19v2H5.5A1.5 1.5 0 0 1 4 20.5z"/><path d="M8 7h7M8 10.5h7M8 14h4"/>',
  allegato:
    '<path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l8-8a3.1 3.1 0 0 1 4.4 4.4l-8 8a1.6 1.6 0 0 1-2.2-2.2l7.3-7.3"/>',
  posta:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  // Una casella spuntata, non righe: accanto al segno del piano si confonderebbe.
  todo: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="m8 12.3 2.7 2.7L16.5 9"/>',
  // Il check: una tabella con una casella spuntata; la griglia lo distingue dalle pendenze.
  check:
    '<rect x="3.5" y="4" width="17" height="16" rx="2"/>' +
    '<path d="M3.5 9h17M9.5 9v11"/>' +
    '<path d="m12.5 14.6 1.9 1.9 3.6-3.8"/>',
  documento:
    '<path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M13 3v5h5"/>',
  // La stella dei preferiti nei due stati. La piena si riempie a mano: il foglio
  // mette `fill: none` su tutte le icone.
  stella:
    '<path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9z"/>',
  stellaPiena:
    '<path fill="currentColor" d="M12 3.6l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9z"/>',
  collegamento:
    '<path d="M10 13a4.5 4.5 0 0 0 6.6.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5"/><path d="M14 11a4.5 4.5 0 0 0-6.6-.4l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>',
  immagine:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 17 4.5-4.5 3 3L15 12l5 5"/>',
  // La presa del trascinamento: due solchi, come le zigrinature di una maniglia.
  presa: '<path d="M9 7h6M9 12h6M9 17h6"/>',
  // La lente: cercare, nella palette e nella barra.
  lente: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
  // Lo schermo per la classe: un monitor; un proiettore non si riconosce a 16 px.
  schermo:
    '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
  duplica:
    '<rect x="4" y="4" width="10" height="10" rx="2"/><path d="M8 18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2"/>',
  // La firma: uno svolazzo sulla riga, da distinguere a colpo d'occhio dal documento.
  firma:
    '<path d="M3 16c2.5 0 3-8 5.5-8S10.5 15 13 15s2.5-2.5 4-2.5"/><path d="M4 20h16"/>',
  // La carta ripiegata: la mappa, che parla di molti posti insieme.
  mappa:
    '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/>',
  // Il segnaposto: un indirizzo che ha trovato il suo posto.
  segnaposto:
    '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  // Il tetto: dove si abita, da distinguere dal segnaposto nella legenda.
  casa: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.8V20h12V9.8"/><path d="M10 20v-5h4v5"/>',
  // Il sole: condizioni legate alla giornata. Tracciato di Lucide («sun», licenza ISC,
  // https://lucide.dev).
  sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  // Il muso con l'antenna: l'assistente. Non una nuvoletta (i messaggi sono le
  // comunicazioni per posta) né una scintilla: dice che dall'altra parte non c'è
  // una persona.
  bot:
    '<rect x="3.5" y="7.5" width="17" height="12.5" rx="3.5"/>' +
    '<path d="M12 4.3v3.2"/>' +
    '<circle cx="12" cy="3.1" r="1.3"/>' +
    '<path d="M1.8 12.6v2.8M22.2 12.6v2.8"/>' +
    '<path d="M9 12.6v.1M15 12.6v.1"/>' +
    '<path d="M9.8 16.4h4.4"/>',
  // Il capannone con la ciminiera: l'azienda del tirocinio.
  azienda: '<path d="M4 20V10l5 3V10l5 3V7l6 4v9z"/><path d="M4 20h16"/>',
  // L'imbuto: il filtro, cioè che cosa l'assistente sa della pagina. Gambo corto
  // e bocca larga, perché a 16 px un imbuto lungo sembra una freccia in giù.
  filtro: '<path d="M4 5h16l-6.2 7.4V19l-3.6-2.2v-4.4z"/>',
}

export type NomeIcona = keyof typeof TRACCIATI

/** Il tracciato di un'icona come testo, nel riquadro 24: per chi la mette dentro un disegno suo. */
export function tracciatoIcona (nome: NomeIcona): string {
  return Object.hasOwn(TRACCIATI, nome)
    ? TRACCIATI[nome]
    : TRACCIATI.informazione
}

export function icona (nome: NomeIcona, classe = ''): SVGSVGElement {
  return svg('0 0 24 24', tracciatoIcona(nome), `icona ${classe}`.trim()) // testo-fisso: classe CSS
}
