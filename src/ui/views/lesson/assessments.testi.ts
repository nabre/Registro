// I testi delle valutazioni dell'ora (`lesson/assessments.ts`).

import { catalogo } from '../../../i18n/index.js'

const it = {
  creaProva: 'Crea la prova',
  apri: (titolo: string) => `Apri «${titolo}»`,
  creaMomento:
    'Crea il momento di valutazione di questa tappa, dentro questa lezione',
  estremi: (minimo: string, massimo: string) => `da ${minimo} a ${massimo}`,
  valutazioni: 'Valutazioni',
  soloRecuperi: 'nessuna prova nata qui, ma oggi si recupera',
  valutatoQui: 'quel che si è valutato in questa lezione',
  momenti: (quanti: number) =>
    `${quanti === 1 ? 'un momento' : `${quanti} momenti`} · i voti si mettono qui`,
  /** La sigla è quella dell'assenza nell'appello, uguale in tutte le lingue. */
  aiuto: (sigla: string) =>
    `Un voto si scrive nella casella; «${sigla}» segna chi era assente, come nell’appello.`,
  niente:
    'In questa lezione non si è valutato niente. Un momento nasce dalla tappa del ' +
    'piano che dichiara di essere una prova: lo si crea dal suo pulsante, ' +
    'qui sopra nella scaletta.',
}

export const testi = catalogo(it, {
  de: {
    creaProva: 'Prüfung erstellen',
    apri: (titolo) => `«${titolo}» öffnen`,
    creaMomento:
      'Die Leistungsbeurteilung dieser Etappe erstellen, in dieser Stunde',
    estremi: (minimo, massimo) => `von ${minimo} bis ${massimo}`,
    valutazioni: 'Beurteilungen',
    soloRecuperi:
      'keine Prüfung aus dieser Stunde, aber heute gibt es eine Nachprüfung',
    valutatoQui: 'was in dieser Stunde beurteilt wurde',
    momenti: (quanti) =>
      `${quanti === 1 ? 'eine Beurteilung' : `${quanti} Beurteilungen`} · ` +
      'die Noten trägt man hier ein',
    aiuto: (sigla) =>
      `Eine Note trägt man ins Feld ein; «${sigla}» markiert, wer abwesend war, wie in der ` +
      'Präsenzkontrolle.',
    niente:
      'In dieser Stunde wurde nichts beurteilt. Eine Leistungsbeurteilung entsteht aus der ' +
      'Etappe des Plans, die sich als Prüfung ausweist: Man erstellt sie mit ihrem Knopf, ' +
      'weiter oben im Ablauf.',
  },
  fr: {
    creaProva: 'Créer l’épreuve',
    apri: (titolo) => `Ouvrir « ${titolo} »`,
    creaMomento: 'Créer l’évaluation de cette étape, dans cette leçon',
    estremi: (minimo, massimo) => `de ${minimo} à ${massimo}`,
    valutazioni: 'Évaluations',
    soloRecuperi:
      'aucune épreuve créée ici, mais aujourd’hui il y a un rattrapage',
    valutatoQui: 'ce qui a été évalué dans cette leçon',
    momenti: (quanti) =>
      `${quanti === 1 ? 'une évaluation' : `${quanti} évaluations`} · les notes se saisissent ici`,
    aiuto: (sigla) =>
      `Une note s’écrit dans la case ; « ${sigla} » marque qui était absent, comme dans l’appel.`,
    niente:
      'Rien n’a été évalué dans cette leçon. Une évaluation naît de l’étape du plan qui se ' +
      'déclare comme épreuve : on la crée depuis son bouton, plus haut dans le déroulement.',
  },
  en: {
    creaProva: 'Create the test',
    apri: (titolo) => `Open “${titolo}”`,
    creaMomento: 'Create this step’s assessment, within this lesson',
    estremi: (minimo, massimo) => `from ${minimo} to ${massimo}`,
    valutazioni: 'Assessments',
    soloRecuperi: 'no test set here, but there’s a resit today',
    valutatoQui: 'what was assessed in this lesson',
    momenti: (quanti) =>
      `${quanti === 1 ? 'one assessment' : `${quanti} assessments`} · grades go in here`,
    aiuto: (sigla) =>
      `Type a grade in the box; “${sigla}” marks who was absent, as in attendance.`,
    niente:
      'Nothing was assessed in this lesson. An assessment comes from the plan step that says ' +
      'it’s a test: you create it from its button, above in the outline.',
  },
})
