// I testi della palette di Ctrl+K (`palette.ts`). I nomi dei gruppi persone,
// corsi e classi sono termini del registro: li dà `lessico()`.

import { catalogo } from '../../i18n/index.js'

const it = {
  /** La riga piccola sotto il nome di una pagina. */
  vaiA: 'Vai a',
  segnaposto: 'Cerca una pagina, un comando, una persona, un corso…',
  cerca: 'Cerca pagine, comandi, persone in formazione, corsi e classi',
  risultati: 'Risultati',
  comandi: 'Comandi',
  /** Il titolo del gruppo delle pagine. */
  pagine: 'Pagine',
  niente: 'Niente con questo nome.',
  /** Il conto in testa a un gruppo tagliato: «5 di 12». */
  diTanti: (mostrati: number, tutti: number) => `${mostrati} di ${tutti}`,
  /** La riga piccola sotto un corso: dove porta. */
  schedaDelCorso: 'Scheda del corso',
  // Il piede: i tasti della palette, ognuno con quel che fa.
  tastoInvio: 'Invio',
  perScegliere: 'per scegliere',
  perAprire: 'per aprire',
  perChiudere: 'per chiudere',
}

export const testi = catalogo(it, {
  de: {
    vaiA: 'Gehe zu',
    segnaposto: 'Suche eine Seite, einen Befehl, eine Person, einen Kurs…',
    cerca: 'Seiten, Befehle, Lernende, Kurse und Klassen suchen',
    risultati: 'Ergebnisse',
    comandi: 'Befehle',
    pagine: 'Seiten',
    niente: 'Nichts mit diesem Namen.',
    diTanti: (mostrati, tutti) => `${mostrati} von ${tutti}`,
    schedaDelCorso: 'Kursblatt',
    tastoInvio: 'Enter',
    perScegliere: 'zum Auswählen',
    perAprire: 'zum Öffnen',
    perChiudere: 'zum Schliessen',
  },
  fr: {
    vaiA: 'Aller à',
    segnaposto: 'Cherche une page, une commande, une personne, un cours…',
    cerca: 'Chercher des pages, des commandes, des personnes en formation, des cours et des classes',
    risultati: 'Résultats',
    comandi: 'Commandes',
    pagine: 'Pages',
    niente: 'Rien avec ce nom.',
    diTanti: (mostrati, tutti) => `${mostrati} sur ${tutti}`,
    schedaDelCorso: 'Fiche du cours',
    tastoInvio: 'Entrée',
    perScegliere: 'pour choisir',
    perAprire: 'pour ouvrir',
    perChiudere: 'pour fermer',
  },
  en: {
    vaiA: 'Go to',
    segnaposto: 'Search for a page, a command, a person, a course…',
    cerca: 'Search pages, commands, learners, courses and classes',
    risultati: 'Results',
    comandi: 'Commands',
    pagine: 'Pages',
    niente: 'Nothing by that name.',
    diTanti: (mostrati, tutti) => `${mostrati} of ${tutti}`,
    schedaDelCorso: 'Course sheet',
    tastoInvio: 'Enter',
    perScegliere: 'to move',
    perAprire: 'to open',
    perChiudere: 'to close',
  },
})
