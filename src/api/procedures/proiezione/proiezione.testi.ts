// I testi delle procedure di `proiezione`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  apri: {
    titolo: 'Apre lo schermo per la classe',
  },
  chiudi: {
    titolo: 'Chiude lo schermo per la classe',
  },
  impostazioni: {
    titolo: 'Che cosa si vede sullo schermo grande: i blocchi, i nomi, la pausa',
    blocchi: 'Le schede che esistono, non quella aperta',
    aperto: 'La scheda che la classe sta guardando',
    nomi: 'Se accanto ai voti ci vanno i nomi',
    sospesa: 'Lo schermo in pausa',
    compatta: 'Misure strette: carattere più piccolo, meno aria',
  },
  mira: {
    titolo: 'Dice alla proiezione dove sta guardando il registro',
    data: 'Il giorno mostrato: vale quando non c’è un’ora aperta',
  },
}

export const testi = catalogo(it, {
  de: {
    apri: {
      titolo: 'Öffnet den Bildschirm für die Klasse',
    },
    chiudi: {
      titolo: 'Schliesst den Bildschirm für die Klasse',
    },
    impostazioni: {
      titolo: 'Was auf dem grossen Bildschirm zu sehen ist: die Blöcke, die Namen, die Pause',
      blocchi: 'Die Reiter, die es gibt, nicht der geöffnete',
      aperto: 'Der Reiter, den die Klasse gerade ansieht',
      nomi: 'Ob neben den Noten die Namen stehen',
      sospesa: 'Der Bildschirm in Pause',
      compatta: 'Enge Masse: kleinere Schrift, weniger Luft',
    },
    mira: {
      titolo: 'Sagt der Projektion, wohin das Klassenbuch gerade schaut',
      data: 'Der angezeigte Tag: gilt, wenn keine Stunde geöffnet ist',
    },
  },
  fr: {
    apri: {
      titolo: 'Ouvre l’écran pour la classe',
    },
    chiudi: {
      titolo: 'Ferme l’écran pour la classe',
    },
    impostazioni: {
      titolo: 'Ce que l’on voit sur le grand écran : les blocs, les noms, la pause',
      blocchi: 'Les onglets qui existent, pas celui qui est ouvert',
      aperto: 'L’onglet que la classe est en train de regarder',
      nomi: 'Si les noms figurent à côté des notes',
      sospesa: 'L’écran en pause',
      compatta: 'Mise en page serrée : caractères plus petits, moins d’espace',
    },
    mira: {
      titolo: 'Indique à la projection où le registre est en train de regarder',
      data: 'Le jour affiché : vaut quand aucune leçon n’est ouverte',
    },
  },
  en: {
    apri: {
      titolo: 'Opens the screen for the class',
    },
    chiudi: {
      titolo: 'Closes the screen for the class',
    },
    impostazioni: {
      titolo: 'What is shown on the big screen: the blocks, the names, the pause',
      blocchi: 'The tabs that exist, not the open one',
      aperto: 'The tab the class is looking at',
      nomi: 'Whether names appear next to the grades',
      sospesa: 'The screen paused',
      compatta: 'Tight spacing: smaller type, less room',
    },
    mira: {
      titolo: 'Tells the projection where the register is looking',
      data: 'The day shown: applies when no lesson is open',
    },
  },
})
