// I testi delle procedure di `finestra`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento. «avanti», «indietro» e
// «azzera» sono valori del campo `verso` e non si traducono, come i nomi delle
// pagine (`pagina.calendario`).

import { catalogo } from '#core/i18n/index.js'

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
  nuova: {
    titolo: 'Apre un’altra finestra del registro, figlia della principale, su una pagina',
    pagina: 'La pagina da mostrare, col suo nome stabile; senza posto, quella della finestra su cui si lavora',
    soggettoTipo: 'Che cosa è aperto nella pagina: corso, classe, lezione, allievo, piano, valutazione, progetto',
    soggettoId: 'L’id di quel che è aperto nella pagina',
    scheda: 'La sezione delle impostazioni, per la pagina Impostazioni',
    scelto: 'L’id scelto per quel genere, o null se nessuno',
  },
  principale: {
    titolo: 'Porta davanti la finestra principale del registro',
  },
  porta: {
    titolo: 'Porta davanti una finestra del registro, per numero',
    n: 'Il numero della finestra: 1 la principale, da 2 le altre',
  },
  chiudi: {
    titolo: 'Chiude una finestra in più del registro, per numero',
    n: 'Il numero della finestra, da 2: la principale si chiude dalla sua ✕',
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
    nuova: {
      titolo: 'Öffnet ein weiteres Fenster des Klassenbuchs, abhängig vom Hauptfenster, auf einer Seite',
      pagina: 'Die Seite, die gezeigt wird, mit ihrem festen Namen; ohne Ort die des Fensters, in dem du arbeitest',
      soggettoTipo: 'Was auf der Seite offen ist: Kurs, Klasse, Lektion, Lernende, Plan, Bewertung, Projekt',
      soggettoId: 'Die ID dessen, was auf der Seite offen ist',
      scheda: 'Der Abschnitt der Einstellungen, für die Seite Einstellungen',
      scelto: 'Die gewählte ID für diese Art, oder null, wenn keine',
    },
    principale: {
      titolo: 'Holt das Hauptfenster des Klassenbuchs nach vorne',
    },
    porta: {
      titolo: 'Holt ein Fenster des Klassenbuchs nach vorne, nach Nummer',
      n: 'Die Nummer des Fensters: 1 das Hauptfenster, ab 2 die weiteren',
    },
    chiudi: {
      titolo: 'Schliesst ein weiteres Fenster des Klassenbuchs, nach Nummer',
      n: 'Die Nummer des Fensters, ab 2: Das Hauptfenster schliesst man mit seinem ✕',
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
    nuova: {
      titolo: 'Ouvre une autre fenêtre du registre, dépendante de la principale, sur une page',
      pagina: 'La page à afficher, avec son nom stable ; sans lieu, celle de la fenêtre où l’on travaille',
      soggettoTipo: 'Ce qui est ouvert dans la page : cours, classe, leçon, personne en formation, plan, évaluation, projet',
      soggettoId: 'L’identifiant de ce qui est ouvert dans la page',
      scheda: 'La section des réglages, pour la page Réglages',
      scelto: 'L’identifiant choisi pour ce genre, ou null si aucun',
    },
    principale: {
      titolo: 'Met au premier plan la fenêtre principale du registre',
    },
    porta: {
      titolo: 'Met au premier plan une fenêtre du registre, par numéro',
      n: 'Le numéro de la fenêtre : 1 la principale, à partir de 2 les autres',
    },
    chiudi: {
      titolo: 'Ferme une fenêtre supplémentaire du registre, par numéro',
      n: 'Le numéro de la fenêtre, à partir de 2 : la principale se ferme avec son ✕',
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
    nuova: {
      titolo: 'Opens another register window, dependent on the main one, on a page',
      pagina: 'The page to show, by its stable name; without a place, the one of the window you are working in',
      soggettoTipo: 'What is open in the page: course, class, lesson, learner, plan, assessment, project',
      soggettoId: 'The ID of what is open in the page',
      scheda: 'The settings section, for the Settings page',
      scelto: 'The chosen ID for that kind, or null if none',
    },
    principale: {
      titolo: 'Brings the main register window to the front',
    },
    porta: {
      titolo: 'Brings a register window to the front, by number',
      n: 'The window number: 1 is the main one, 2 and up the others',
    },
    chiudi: {
      titolo: 'Closes an extra register window, by number',
      n: 'The window number, from 2: the main one is closed with its ✕',
    },
  },
})
