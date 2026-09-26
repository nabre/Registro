// I testi del campo della firma (`settings/signature.ts`). Le lettere dei
// gesti di stile seguono la lingua (G, C, S; F, K, U); le scorciatoie restano
// Ctrl+B, Ctrl+I, Ctrl+U, decise dal campo.

import { catalogo } from '../../../i18n/index.js'

/** Un gesto della barra: quel che c'è scritto sul pulsante e quel che dice il suo titolo. */
interface Gesto {
  testo: string
  titolo: string
}

const it = {
  grassetto: { testo: 'G', titolo: 'Grassetto (Ctrl+B)' },
  corsivo: { testo: 'C', titolo: 'Corsivo (Ctrl+I)' },
  sottolineato: { testo: 'S', titolo: 'Sottolineato (Ctrl+U)' },
  piccolo: { testo: 'Piccolo', titolo: 'Testo piccolo' },
  normale: { testo: 'Normale', titolo: 'Testo normale' },
  grande: { testo: 'Grande', titolo: 'Testo grande' },
  collegamento: { testo: 'Collegamento', titolo: 'Fa della parte scelta un collegamento' },
  rimuovi: {
    testo: 'Rimuovi formattazione',
    titolo: 'Toglie grassetti, colori, misure e collegamenti dalla parte scelta',
  },
  coloreTesto: 'Colore del testo',
  barra: 'Formattazione della firma',
  campo: 'Firma delle e-mail',
} satisfies Record<string, Gesto | string>

export const testi = catalogo(it, {
  de: {
    grassetto: { testo: 'F', titolo: 'Fett (Ctrl+B)' },
    corsivo: { testo: 'K', titolo: 'Kursiv (Ctrl+I)' },
    sottolineato: { testo: 'U', titolo: 'Unterstrichen (Ctrl+U)' },
    piccolo: { testo: 'Klein', titolo: 'Kleiner Text' },
    normale: { testo: 'Normal', titolo: 'Normaler Text' },
    grande: { testo: 'Gross', titolo: 'Grosser Text' },
    collegamento: { testo: 'Link', titolo: 'Macht aus der Auswahl einen Link' },
    rimuovi: {
      testo: 'Formatierung entfernen',
      titolo: 'Entfernt Fettdruck, Farben, Grössen und Links aus der Auswahl',
    },
    coloreTesto: 'Textfarbe',
    barra: 'Formatierung der Signatur',
    campo: 'E-Mail-Signatur',
  },
  fr: {
    grassetto: { testo: 'G', titolo: 'Gras (Ctrl+B)' },
    corsivo: { testo: 'I', titolo: 'Italique (Ctrl+I)' },
    sottolineato: { testo: 'S', titolo: 'Souligné (Ctrl+U)' },
    piccolo: { testo: 'Petit', titolo: 'Petit texte' },
    normale: { testo: 'Normal', titolo: 'Texte normal' },
    grande: { testo: 'Grand', titolo: 'Grand texte' },
    collegamento: { testo: 'Lien', titolo: 'Fait de la partie choisie un lien' },
    rimuovi: {
      testo: 'Effacer la mise en forme',
      titolo: 'Retire gras, couleurs, tailles et liens de la partie choisie',
    },
    coloreTesto: 'Couleur du texte',
    barra: 'Mise en forme de la signature',
    campo: 'Signature des e-mails',
  },
  en: {
    grassetto: { testo: 'B', titolo: 'Bold (Ctrl+B)' },
    corsivo: { testo: 'I', titolo: 'Italic (Ctrl+I)' },
    sottolineato: { testo: 'U', titolo: 'Underline (Ctrl+U)' },
    piccolo: { testo: 'Small', titolo: 'Small text' },
    normale: { testo: 'Normal', titolo: 'Normal text' },
    grande: { testo: 'Large', titolo: 'Large text' },
    collegamento: { testo: 'Link', titolo: 'Turns the selected part into a link' },
    rimuovi: {
      testo: 'Clear formatting',
      titolo: 'Removes bold, colours, sizes and links from the selected part',
    },
    coloreTesto: 'Text colour',
    barra: 'Signature formatting',
    campo: 'Email signature',
  },
})
