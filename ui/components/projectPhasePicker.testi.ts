// I testi di `components/projectPhasePicker.tsx`: la scelta di progetto e fase.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nessunProgetto: 'Nessun progetto',
  etichetta: 'Progetto e fase',
  cerca: 'Cerca un progetto o una fase',
  attivita: (n: number) => n === 0 ? 'nessuna attività' : n === 1 ? 'un’attività' : `${n} attività`,
  nuovaFaseIn: (titolo: string) => `Nuova fase in «${titolo}»`,
  nuovoProgetto: 'Nuovo progetto…',
  niente: 'Niente corrisponde.',
  nonNelCorso: 'non ancora nel corso',
}

export const testi = catalogo(it, {
  de: {
    nessunProgetto: 'Kein Projekt',
    etichetta: 'Projekt und Phase',
    cerca: 'Projekt oder Phase suchen',
    attivita: (n) => n === 0 ? 'keine Aktivität' : n === 1 ? 'eine Aktivität' : `${n} Aktivitäten`,
    nuovaFaseIn: (titolo) => `Neue Phase in «${titolo}»`,
    nuovoProgetto: 'Neues Projekt…',
    niente: 'Nichts passt.',
    nonNelCorso: 'noch nicht im Kurs',
  },
  fr: {
    nessunProgetto: 'Aucun projet',
    etichetta: 'Projet et phase',
    cerca: 'Chercher un projet ou une phase',
    attivita: (n) => n === 0 ? 'aucune activité' : n === 1 ? 'une activité' : `${n} activités`,
    nuovaFaseIn: (titolo) => `Nouvelle phase dans « ${titolo} »`,
    nuovoProgetto: 'Nouveau projet…',
    niente: 'Rien ne correspond.',
    nonNelCorso: 'pas encore dans le cours',
  },
  en: {
    nessunProgetto: 'No project',
    etichetta: 'Project and phase',
    cerca: 'Search a project or a phase',
    attivita: (n) => n === 0 ? 'no activities' : n === 1 ? 'one activity' : `${n} activities`,
    nuovaFaseIn: (titolo) => `New phase in “${titolo}”`,
    nuovoProgetto: 'New project…',
    niente: 'Nothing matches.',
    nonNelCorso: 'not in the course yet',
  },
})
