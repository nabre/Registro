// I testi dei comandi della proiezione (`projection.ts`). La guida cita i nomi
// dei pulsanti fra virgolette: cambiandone uno va cambiato anche là, in tutte
// le lingue.

import { catalogo, minuscolo } from '#core/i18n/index.js'

const it = {
  schermoSpento: 'Lo schermo per la classe è spento.',
  unaSchedaSola: 'C’è una scheda sola accesa: non c’è niente fra cui scorrere.',
  // I blocchi dello schermo per la classe.
  bloccoRiservato: (nome: string) =>
    `${nome}: parla delle singole persone. Aprendolo, lo vede tutta la classe.`,
  mostraBlocco: (nome: string) => `Mostra ${minuscolo(nome)} alla classe`,
  // La proiezione.
  spegniSchermo: 'Spegni lo schermo',
  proietta: 'Proietta',
  spegniSchermoAiuto: 'Chiude la finestra che sta sul proiettore',
  proiettaAiuto:
    'Apre lo schermo per la classe, in una finestra da portare sul proiettore',
  riprendi: 'Riprendi',
  pausa: 'Pausa',
  pausaAiuto:
    'Spegne il contenuto lasciando la finestra dov’è: si riprende com’era',
  schedaPrecedente: 'Scheda precedente',
  schedaSuccessiva: 'Scheda successiva',
  nomiVisibili: 'Nomi visibili',
  senzaNomi: 'Senza nomi',
  nomiAiuto: 'Se accanto ai voti e ai documenti mancanti compaiono i nomi',
  misureStrette: 'Misure strette',
  misureLarghe: 'Misure larghe',
  misureStretteAiuto: 'Caratteri più piccoli: ci sta più roba nella pagina',
  misureLargheAiuto:
    'Caratteri più grandi: si legge da più lontano, ma ci sta meno',
  vistaProiettataAiuto: 'Il giorno è quello aperto nel calendario del registro',
  calendarioNonAperto:
    'La scheda Calendario non è quella aperta sullo schermo.',
}

export const testi = catalogo(it, {
  de: {
    schermoSpento: 'Der Bildschirm für die Klasse ist aus.',
    unaSchedaSola:
      'Es ist nur eine Karte eingeschaltet: Es gibt nichts zum Durchblättern.',
    bloccoRiservato: (nome) =>
      `${nome}: betrifft einzelne Personen. Wird es geöffnet, sieht es die ganze Klasse.`,
    mostraBlocco: (nome) => `${nome} der Klasse zeigen`,
    spegniSchermo: 'Bildschirm ausschalten',
    proietta: 'Projizieren',
    spegniSchermoAiuto: 'Schliesst das Fenster auf dem Projektor',
    proiettaAiuto:
      'Öffnet den Bildschirm für die Klasse, in einem Fenster, das man auf den Projektor zieht',
    riprendi: 'Fortsetzen',
    pausa: 'Pause',
    pausaAiuto:
      'Blendet den Inhalt aus und lässt das Fenster, wo es ist: Es geht weiter wie vorher',
    schedaPrecedente: 'Vorherige Karte',
    schedaSuccessiva: 'Nächste Karte',
    nomiVisibili: 'Namen sichtbar',
    senzaNomi: 'Ohne Namen',
    nomiAiuto:
      'Ob neben den Noten und den fehlenden Dokumenten die Namen erscheinen',
    misureStrette: 'Kompakt',
    misureLarghe: 'Gross',
    misureStretteAiuto: 'Kleinere Schrift: Es passt mehr auf die Seite',
    misureLargheAiuto:
      'Grössere Schrift: Man liest es von weiter weg, aber es passt weniger hin',
    vistaProiettataAiuto:
      'Der Tag ist der, der im Kalender des Klassenbuchs offen ist',
    calendarioNonAperto:
      'Die Karte Kalender ist nicht die, die auf dem Bildschirm offen ist.',
  },
  fr: {
    schermoSpento: 'L’écran pour la classe est éteint.',
    unaSchedaSola:
      'Une seule fiche est allumée : il n’y a rien à faire défiler.',
    bloccoRiservato: (nome) =>
      `${nome} : parle de personnes précises. En l’ouvrant, toute la classe le voit.`,
    mostraBlocco: (nome) => `Montrer à la classe : ${minuscolo(nome)}`,
    spegniSchermo: 'Éteindre l’écran',
    proietta: 'Projeter',
    spegniSchermoAiuto: 'Ferme la fenêtre qui est sur le projecteur',
    proiettaAiuto:
      'Ouvre l’écran pour la classe, dans une fenêtre à amener sur le projecteur',
    riprendi: 'Reprendre',
    pausa: 'Pause',
    pausaAiuto:
      'Masque le contenu en laissant la fenêtre où elle est : on reprend comme avant',
    schedaPrecedente: 'Fiche précédente',
    schedaSuccessiva: 'Fiche suivante',
    nomiVisibili: 'Noms visibles',
    senzaNomi: 'Sans noms',
    nomiAiuto:
      'Si les noms apparaissent à côté des notes et des documents manquants',
    misureStrette: 'Compact',
    misureLarghe: 'Grand',
    misureStretteAiuto:
      'Caractères plus petits : il tient plus de choses sur la page',
    misureLargheAiuto:
      'Caractères plus grands : on lit de plus loin, mais il en tient moins',
    vistaProiettataAiuto:
      'Le jour est celui ouvert dans le calendrier du registre',
    calendarioNonAperto:
      'La fiche Calendrier n’est pas celle ouverte à l’écran.',
  },
  en: {
    schermoSpento: 'The class screen is off.',
    unaSchedaSola: 'Only one card is on: there is nothing to scroll through.',
    bloccoRiservato: (nome) =>
      `${nome}: this is about individual people. Open it and the whole class sees it.`,
    mostraBlocco: (nome) => `Show ${minuscolo(nome)} to the class`,
    spegniSchermo: 'Turn off the screen',
    proietta: 'Project',
    spegniSchermoAiuto: 'Closes the window on the projector',
    proiettaAiuto:
      'Opens the class screen, in a window to move onto the projector',
    riprendi: 'Resume',
    pausa: 'Pause',
    pausaAiuto:
      'Hides the content and leaves the window where it is: it picks up as it was',
    schedaPrecedente: 'Previous card',
    schedaSuccessiva: 'Next card',
    nomiVisibili: 'Names shown',
    senzaNomi: 'No names',
    nomiAiuto:
      'Whether the names appear next to the grades and the missing documents',
    misureStrette: 'Compact',
    misureLarghe: 'Large',
    misureStretteAiuto: 'Smaller type: more fits on the page',
    misureLargheAiuto: 'Larger type: it reads from further away, but less fits',
    vistaProiettataAiuto: 'The day is the one open in the register’s calendar',
    calendarioNonAperto: 'The Calendar card is not the one open on the screen.',
  },
})
