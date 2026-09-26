// I testi di `history.ts`: com'è andato un Ctrl+Z, o un Ctrl+Y.

import { catalogo } from '../i18n/index.js'
import type { NomeCollezione } from '../data/paths.js'

const it = {
  /** Come si chiama una collezione per chi legge il rifiuto. */
  collezioni: {
    registro: 'anni, materie e impostazioni',
    classi: 'classi',
    corsi: 'corsi',
    lezioni: 'lezioni',
    piani: 'piani di lezione',
    valutazioni: 'valutazioni',
    fascicoli: 'fascicoli di classe',
    consegne: 'consegne',
    check: 'liste di controllo',
    smistamenti: 'smistamenti',
    coordinate: 'indirizzi sulla mappa',
  } as Record<NomeCollezione, string>,
  annullato: 'Annullato.',
  ripristinato: 'Ripristinato.',
  irreversibile: 'L’ultimo gesto ha tolto dei file dal documento: non si può annullare.',
  nienteDaAnnullare: 'Non c’è niente da annullare.',
  nienteDaRipristinare: 'Non c’è niente da ripristinare.',
  conflitto: (dove: string, annulla: boolean) =>
    `Nel frattempo è cambiato altro in ${dove}: non si può ${
      annulla ? 'annullare' : 'ripristinare'
    } senza perderlo. La storia dei passi è stata azzerata.`,
}

export const testi = catalogo(it, {
  de: {
    collezioni: {
      registro: 'Schuljahre, Fächer und Einstellungen',
      classi: 'Klassen',
      corsi: 'Kurse',
      lezioni: 'Stunden',
      piani: 'Unterrichtspläne',
      valutazioni: 'Leistungsbeurteilungen',
      fascicoli: 'Klassendossiers',
      consegne: 'Aufträge',
      check: 'Checklisten',
      smistamenti: 'Zuordnungen',
      coordinate: 'Adressen auf der Karte',
    },
    annullato: 'Rückgängig gemacht.',
    ripristinato: 'Wiederholt.',
    irreversibile:
      'Der letzte Schritt hat Dateien aus dem Dokument entfernt: ' +
      'Er lässt sich nicht rückgängig machen.',
    nienteDaAnnullare: 'Es gibt nichts rückgängig zu machen.',
    nienteDaRipristinare: 'Es gibt nichts zu wiederholen.',
    conflitto: (dove, annulla) =>
      `Inzwischen hat sich in ${dove} etwas anderes geändert: ${
        annulla ? 'Rückgängig machen' : 'Wiederholen'
      } geht nicht, ohne es zu verlieren. Der Verlauf der Schritte wurde geleert.`,
  },
  fr: {
    collezioni: {
      registro: 'années, branches et paramètres',
      classi: 'classes',
      corsi: 'cours',
      lezioni: 'leçons',
      piani: 'plans de leçon',
      valutazioni: 'évaluations',
      fascicoli: 'dossiers de classe',
      consegne: 'devoirs',
      check: 'listes de contrôle',
      smistamenti: 'tris',
      coordinate: 'adresses sur la carte',
    },
    annullato: 'Annulé.',
    ripristinato: 'Rétabli.',
    irreversibile: 'Le dernier geste a retiré des fichiers du document : on ne peut pas l’annuler.',
    nienteDaAnnullare: 'Il n’y a rien à annuler.',
    nienteDaRipristinare: 'Il n’y a rien à rétablir.',
    conflitto: (dove, annulla) =>
      `Entre-temps, autre chose a changé dans ${dove} : impossible ${
        annulla ? 'd’annuler' : 'de rétablir'
      } sans le perdre. L’historique des étapes a été remis à zéro.`,
  },
  en: {
    collezioni: {
      registro: 'years, subjects and settings',
      classi: 'classes',
      corsi: 'courses',
      lezioni: 'lessons',
      piani: 'lesson plans',
      valutazioni: 'assessments',
      fascicoli: 'class files',
      consegne: 'assignments',
      check: 'checklists',
      smistamenti: 'sortings',
      coordinate: 'addresses on the map',
    },
    annullato: 'Undone.',
    ripristinato: 'Redone.',
    irreversibile: 'The last action removed files from the document: it can’t be undone.',
    nienteDaAnnullare: 'There’s nothing to undo.',
    nienteDaRipristinare: 'There’s nothing to redo.',
    conflitto: (dove, annulla) =>
      `Something else has changed in the meantime in ${dove}: it can’t be ${
        annulla ? 'undone' : 'redone'
      } without losing it. The step history has been cleared.`,
  },
})
