// I testi dei comandi dei progetti (`projects.ts`). La guida cita i nomi dei
// pulsanti fra virgolette: cambiandone uno va cambiato anche là, in tutte le
// lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nuovoProgetto: 'Nuovo progetto',
  nuovoProgettoAiuto: 'Un progetto del corso: compiti, criteri a livelli e giudizi',
  nessunProgettoAperto: 'Nessun progetto aperto.',
  progettoModificaAiuto: 'Titolo, stato, date, descrizione, obiettivi e collegamenti',
  nuovoCompito: 'Nuovo compito',
  nuovoCompitoAiuto: 'Un compito per tutti, con la sua fine comune',
  fasiProgetto: 'Fasi',
  fasiProgettoAiuto: 'Le fasi del progetto: ognuna raccoglie le attività dei piani',
  criteriProgetto: 'Criteri',
  livelliProgetto: 'Livelli',
  eliminaProgettoAiuto: 'Toglie il progetto; fasi e valutazioni restano, sganciate',
}

export const testi = catalogo(it, {
  de: {
    nuovoProgetto: 'Neues Projekt',
    nuovoProgettoAiuto: 'Ein Projekt des Kurses: Aufgaben, Kriterien mit Stufen und Einschätzungen',
    nessunProgettoAperto: 'Kein Projekt geöffnet.',
    progettoModificaAiuto: 'Titel, Status, Daten, Beschreibung, Ziele und Links',
    nuovoCompito: 'Neue Aufgabe',
    nuovoCompitoAiuto: 'Eine Aufgabe für alle, mit gemeinsamem Ende',
    fasiProgetto: 'Phasen',
    fasiProgettoAiuto: 'Die Phasen des Projekts: Jede sammelt Aktivitäten der Pläne',
    criteriProgetto: 'Kriterien',
    livelliProgetto: 'Stufen',
    eliminaProgettoAiuto: 'Entfernt das Projekt; Phasen und Beurteilungen bleiben, losgelöst',
  },
  fr: {
    nuovoProgetto: 'Nouveau projet',
    nuovoProgettoAiuto: 'Un projet du cours : tâches, critères à niveaux et appréciations',
    nessunProgettoAperto: 'Aucun projet ouvert.',
    progettoModificaAiuto: 'Titre, état, dates, description, objectifs et liens',
    nuovoCompito: 'Nouvelle tâche',
    nuovoCompitoAiuto: 'Une tâche pour tous, avec sa fin commune',
    fasiProgetto: 'Phases',
    fasiProgettoAiuto: 'Les phases du projet : chacune réunit des activités des plans',
    criteriProgetto: 'Critères',
    livelliProgetto: 'Niveaux',
    eliminaProgettoAiuto: 'Retire le projet ; phases et évaluations restent, détachées',
  },
  en: {
    nuovoProgetto: 'New project',
    nuovoProgettoAiuto: 'A course project: tasks, criteria with levels and comments',
    nessunProgettoAperto: 'No project open.',
    progettoModificaAiuto: 'Title, status, dates, description, objectives and links',
    nuovoCompito: 'New task',
    nuovoCompitoAiuto: 'A task for everyone, with its common end',
    fasiProgetto: 'Phases',
    fasiProgettoAiuto: 'The project’s phases: each gathers plan activities',
    criteriProgetto: 'Criteria',
    livelliProgetto: 'Levels',
    eliminaProgettoAiuto: 'Removes the project; phases and assessments stay, unlinked',
  },
})
