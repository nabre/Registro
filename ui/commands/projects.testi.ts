// I testi dei comandi dei progetti (`projects.ts`). La guida cita i nomi dei
// pulsanti fra virgolette: cambiandone uno va cambiato anche là, in tutte le
// lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nuovoProgetto: 'Nuovo progetto',
  nuovoProgettoAiuto: 'Un progetto dell’anno: obiettivi, fasi con le attività, criteri e risorse',
  nuovoNelCorsoAiuto: 'Un progetto nuovo nella biblioteca, integrato subito in questo corso',
  nuovoCompito: 'Nuovo compito',
  nuovoCompitoAiuto: 'Un compito per tutti, con la sua fine comune',
  eliminaProgettoAiuto: 'Toglie il progetto da tutti i corsi; tappe dei piani e valutazioni restano, sganciate',
}

export const testi = catalogo(it, {
  de: {
    nuovoProgetto: 'Neues Projekt',
    nuovoProgettoAiuto: 'Ein Projekt des Jahres: Ziele, Phasen mit Aktivitäten, Kriterien und Ressourcen',
    nuovoNelCorsoAiuto: 'Ein neues Projekt in der Bibliothek, sofort in diesen Kurs eingebunden',
    nuovoCompito: 'Neue Aufgabe',
    nuovoCompitoAiuto: 'Eine Aufgabe für alle, mit gemeinsamem Ende',
    eliminaProgettoAiuto: 'Entfernt das Projekt aus allen Kursen; Schritte der Pläne und Beurteilungen bleiben, losgelöst',
  },
  fr: {
    nuovoProgetto: 'Nouveau projet',
    nuovoProgettoAiuto: 'Un projet de l’année : objectifs, phases avec activités, critères et ressources',
    nuovoNelCorsoAiuto: 'Un nouveau projet dans la bibliothèque, intégré tout de suite dans ce cours',
    nuovoCompito: 'Nouvelle tâche',
    nuovoCompitoAiuto: 'Une tâche pour tous, avec sa fin commune',
    eliminaProgettoAiuto: 'Retire le projet de tous les cours ; étapes des plans et évaluations restent, détachées',
  },
  en: {
    nuovoProgetto: 'New project',
    nuovoProgettoAiuto: 'A project of the year: objectives, phases with activities, criteria and resources',
    nuovoNelCorsoAiuto: 'A new project in the library, integrated straight into this course',
    nuovoCompito: 'New task',
    nuovoCompitoAiuto: 'A task for everyone, with its common end',
    eliminaProgettoAiuto: 'Removes the project from every course; plan steps and assessments stay, unlinked',
  },
})
