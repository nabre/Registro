// I testi delle procedure di `finestra`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento. «avanti», «indietro» e
// «azzera» sono valori del campo `verso` e non si traducono.

import { catalogo } from '../../../i18n/index.js'

const it = {
  schermoIntero: {
    titolo: 'Mette a schermo intero la finestra del registro, o la rimette com’era',
  },
  zoom: {
    titolo: 'Ingrandisce o riduce quel che si vede nella finestra del registro',
    verso:
      'Di un passo: «avanti» ingrandisce, «indietro» riduce, ' +
      '«azzera» rimette la finestra alla sua misura',
  },
}

export const testi = catalogo(it, {
  de: {
    schermoIntero: {
      titolo:
        'Schaltet das Fenster des Klassenbuchs auf Vollbild oder stellt es wieder her, wie es war',
    },
    zoom: {
      titolo: 'Vergrössert oder verkleinert, was im Fenster des Klassenbuchs zu sehen ist',
      verso:
        'Um einen Schritt: «avanti» vergrössert, «indietro» verkleinert, ' +
        '«azzera» stellt das Fenster auf seine normale Grösse zurück',
    },
  },
  fr: {
    schermoIntero: {
      titolo: 'Met la fenêtre du registre en plein écran, ou la remet comme elle était',
    },
    zoom: {
      titolo: 'Agrandit ou réduit ce que l’on voit dans la fenêtre du registre',
      verso:
        'D’un cran : « avanti » agrandit, « indietro » réduit, ' +
        '« azzera » remet la fenêtre à sa taille normale',
    },
  },
  en: {
    schermoIntero: {
      titolo: 'Puts the register window in full screen, or puts it back as it was',
    },
    zoom: {
      titolo: 'Enlarges or shrinks what is shown in the register window',
      verso:
        'By one step: “avanti” zooms in, “indietro” zooms out, ' +
        '“azzera” resets the window to its normal size',
    },
  },
})
