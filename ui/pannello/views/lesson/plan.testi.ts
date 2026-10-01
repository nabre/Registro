// I testi della scaletta dell'ora (`lesson/plan.ts`).

import { catalogo } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  /** Come si chiama lo stato di una tappa, per valore. */
  stati: {
    'da-fare': 'Da fare',
    svolta: 'Svolta',
    parziale: 'Fatta in parte',
    saltata: 'Saltata',
  },
  nessunPiano: 'Nessun piano assegnato',
  nessunPianoTesto: 'Il piano è la scaletta delle attività: si prepara una volta e si riusa.',
  assegna: 'Assegna un piano',
  cambia: 'Cambia',
  modificaScaletta: 'Modifica la scaletta',
  svolto: (percento: number) => `${percento}% svolto`,
  piano: (durata: string) => `piano ${durata}`,
  diTroppo: (minuti: number) => `${minuti} min di troppo`,
  liberi: (minuti: number) => `${minuti} min liberi`,
  inOrario: 'in orario',
  oltreLaPausa: (quante: number) =>
    quante === 1
      ? '1 attività a cavallo dell’intervallo'
      : `${quante} attività a cavallo dell’intervallo`,
  obiettivi: 'Obiettivi',
  // Le colonne della scaletta
  durata: 'Durata',
  quando: 'Quando',
  collegamenti: 'Collegamenti',
  pendenze: 'Pendenze',
  check: 'Check',
  apriPendenza: (testo: string) => `Apri pendenza: ${testo}`,
  apriCheck: (titolo: string) => `Apri check: ${titolo}`,
  apriProgetto: (titolo: string) => `Progetto «${titolo}»: apri la scheda Progetto`,
  intervallo: (minuti: number) => `Intervallo · ${minuti} min`,
  aCavallo: 'a cavallo dell’intervallo',
}

export const testi = catalogo(it, {
  de: {
    stati: {
      'da-fare': 'Offen',
      svolta: 'Erledigt',
      parziale: 'Teilweise erledigt',
      saltata: 'Übersprungen',
    },
    nessunPiano: 'Kein Plan zugewiesen',
    nessunPianoTesto:
      'Der Plan ist der Ablauf der Aktivitäten: Man bereitet ihn einmal vor und verwendet ' +
      'ihn wieder.',
    assegna: 'Plan zuweisen',
    cambia: 'Wechseln',
    modificaScaletta: 'Ablauf bearbeiten',
    svolto: (percento) => `${percento}% erledigt`,
    piano: (durata) => `Plan ${durata}`,
    diTroppo: (minuti) => `${minuti} Min. zu viel`,
    liberi: (minuti) => `${minuti} Min. frei`,
    inOrario: 'im Zeitplan',
    oltreLaPausa: (quante) =>
      plurale(quante, 'Aktivität über die Pause hinweg', 'Aktivitäten über die Pause hinweg'),
    obiettivi: 'Ziele',
    durata: 'Dauer',
    quando: 'Wann',
    collegamenti: 'Verknüpfungen',
    pendenze: 'Pendenzen',
    check: 'Check',
    apriPendenza: (testo) => `Pendenz öffnen: ${testo}`,
    apriCheck: (titolo) => `Check öffnen: ${titolo}`,
    apriProgetto: (titolo) => `Projekt «${titolo}»: Registerkarte Projekt öffnen`,
    intervallo: (minuti) => `Pause · ${minuti} Min.`,
    aCavallo: 'über die Pause hinweg',
  },
  fr: {
    stati: {
      'da-fare': 'À faire',
      svolta: 'Faite',
      parziale: 'Faite en partie',
      saltata: 'Sautée',
    },
    nessunPiano: 'Aucun plan attribué',
    nessunPianoTesto:
      'Le plan est le déroulement des activités : on le prépare une fois et on le réutilise.',
    assegna: 'Attribuer un plan',
    cambia: 'Changer',
    modificaScaletta: 'Modifier le déroulement',
    svolto: (percento) => `${percento} % fait`,
    piano: (durata) => `plan ${durata}`,
    diTroppo: (minuti) => `${minuti} min de trop`,
    liberi: (minuti) => `${minuti} min libres`,
    inOrario: 'dans les temps',
    oltreLaPausa: (quante) =>
      plurale(quante, 'activité à cheval sur la pause', 'activités à cheval sur la pause'),
    obiettivi: 'Objectifs',
    durata: 'Durée',
    quando: 'Quand',
    collegamenti: 'Liens',
    pendenze: 'Tâches en suspens',
    check: 'Check',
    apriPendenza: (testo) => `Ouvrir la tâche en suspens : ${testo}`,
    apriCheck: (titolo) => `Ouvrir le check : ${titolo}`,
    apriProgetto: (titolo) => `Projet « ${titolo} » : ouvrir l’onglet Projet`,
    intervallo: (minuti) => `Pause · ${minuti} min`,
    aCavallo: 'à cheval sur la pause',
  },
  en: {
    stati: {
      'da-fare': 'To do',
      svolta: 'Done',
      parziale: 'Partly done',
      saltata: 'Skipped',
    },
    nessunPiano: 'No plan assigned',
    nessunPianoTesto: 'The plan is the outline of activities: you prepare it once and reuse it.',
    assegna: 'Assign a plan',
    cambia: 'Change',
    modificaScaletta: 'Edit the outline',
    svolto: (percento) => `${percento}% done`,
    piano: (durata) => `plan ${durata}`,
    diTroppo: (minuti) => `${minuti} min over`,
    liberi: (minuti) => `${minuti} min spare`,
    inOrario: 'on time',
    oltreLaPausa: (quante) =>
      plurale(quante, 'activity across the break', 'activities across the break'),
    obiettivi: 'Objectives',
    durata: 'Duration',
    quando: 'When',
    collegamenti: 'Links',
    pendenze: 'Pending items',
    check: 'Check',
    apriPendenza: (testo) => `Open pending item: ${testo}`,
    apriCheck: (titolo) => `Open check: ${titolo}`,
    apriProgetto: (titolo) => `Project “${titolo}”: open the Project tab`,
    intervallo: (minuti) => `Break · ${minuti} min`,
    aCavallo: 'across the break',
  },
})
