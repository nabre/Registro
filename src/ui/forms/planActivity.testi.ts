// I testi di `forms/planActivity.ts`: la scaletta di un piano, tappa per tappa,
// con il dettaglio di ogni tappa e i gruppi di unità didattiche della lezione.

import { catalogo } from '../../i18n/index.js'

const it = {
  // Il dettaglio di una tappa.
  comeSiSvolge: 'Come si svolge',
  segnapostoSvolgimento: 'i passaggi, le consegne, quel che si dice',
  comeLavoraLaClasse: 'Come lavora la classe',
  materialeDAula: 'Materiale d’aula',
  segnapostoMateriale: 'fotocopie, righello, chiavi del laboratorio',
  aiutoMateriale: 'Quel che bisogna avere in mano: si ritrova nella scaletta stampata.',
  eUnaProva: 'Questa tappa è una prova',
  aiutoProva:
    'Da qui nascono i voti: dentro la lezione la tappa propone il momento di valutazione',
  titoloProva: 'Titolo della prova',
  comeLaTappa: 'come la tappa',
  tipoProva: 'Tipo di prova',
  peso: 'Peso (da 0 a 10)',
  zeroNonFaMedia: 'Zero non fa media.',
  svolgimento: 'Svolgimento',
  dettagliDi: (tipo: string) => `Dettagli · ${tipo}`,
  valutazione: 'Valutazione',
  materialeDellaTappa: 'Materiale della tappa',

  // La riga di una tappa.
  conPeso: (peso: number) => ` · peso ${peso}`,
  tipoPremi: (tipo: string) => `Tipo: ${tipo}. Premi per cambiarlo.`,
  tipoDiAttivita: (tipo: string) => `Tipo di attività: ${tipo}`,
  segnapostoTitolo: 'titolo dell’attività',
  titoloAttivita: 'Titolo dell’attività',
  durataInMinuti: 'Durata in minuti',
  min: 'min',
  quandoCade: 'Quando cade, orologio alla mano',
  chiudiDettaglio: 'Chiudi il dettaglio',
  dettaglioTappa: 'Dettaglio della tappa',
  togliAttivita: 'Togli l’attività',

  // Le intestazioni delle colonne.
  minuti: 'Minuti',
  quando: 'Quando',

  // I gruppi di unità didattiche della lezione.
  intervallo: (minuti: number, da: string, a: string) =>
    `Intervallo · ${minuti} min · ${da}–${a}`,
  gruppo: (numero: number) => `Gruppo ${numero}`,
  udAttaccate: (ud: number) => `${ud} UD${ud > 1 ? ' attaccate' : ''}`,
  orarioGruppo: (inizio: string, fine: string, occupati: number, capienza: number) =>
    `${inizio}–${fine} · ${occupati}/${capienza} min`,
  pieno: 'pieno',
  minutiLiberi: (minuti: number) => `${minuti} min liberi`,
  minutiDiTroppo: (minuti: number) => `${minuti} min di troppo`,
  oltreLaFine: 'Oltre la fine della lezione',

  // Il piede della scaletta.
  nessunaAttivita: 'Nessuna attività: la scaletta è ancora vuota.',
  aggiungiAttivita: 'Aggiungi attività',
  totaleSu: (totale: string, lezione: string, ud: string) => `${totale} su ${lezione} (${ud})`,
  totale: (durata: string) => `totale ${durata}`,
}

export const testi = catalogo(it, {
  de: {
    comeSiSvolge: 'Wie es abläuft',
    segnapostoSvolgimento: 'die Schritte, die Aufträge, was gesagt wird',
    comeLavoraLaClasse: 'Wie die Klasse arbeitet',
    materialeDAula: 'Material im Schulzimmer',
    segnapostoMateriale: 'Kopien, Lineal, Laborschlüssel',
    aiutoMateriale: 'Was du zur Hand haben musst: Es steht auch im gedruckten Ablauf.',
    eUnaProva: 'Diese Etappe ist eine Prüfung',
    aiutoProva:
      'Hier entstehen die Noten: In der Stunde schlägt die Etappe die ' +
      'Leistungsbeurteilung vor',
    titoloProva: 'Titel der Prüfung',
    comeLaTappa: 'wie die Etappe',
    tipoProva: 'Art der Prüfung',
    peso: 'Gewichtung (0 bis 10)',
    zeroNonFaMedia: 'Null zählt nicht für den Durchschnitt.',
    svolgimento: 'Durchführung',
    dettagliDi: (tipo) => `Details · ${tipo}`,
    valutazione: 'Beurteilung',
    materialeDellaTappa: 'Material der Etappe',

    conPeso: (peso) => ` · Gewichtung ${peso}`,
    tipoPremi: (tipo) => `Art: ${tipo}. Zum Ändern klicken.`,
    tipoDiAttivita: (tipo) => `Art der Aktivität: ${tipo}`,
    segnapostoTitolo: 'Titel der Aktivität',
    titoloAttivita: 'Titel der Aktivität',
    durataInMinuti: 'Dauer in Minuten',
    min: 'min',
    quandoCade: 'Wann sie stattfindet, nach der Uhr',
    chiudiDettaglio: 'Details schliessen',
    dettaglioTappa: 'Details der Etappe',
    togliAttivita: 'Aktivität entfernen',

    minuti: 'Minuten',
    quando: 'Wann',

    intervallo: (minuti, da, a) => `Pause · ${minuti} min · ${da}–${a}`,
    gruppo: (numero) => `Gruppe ${numero}`,
    udAttaccate: (ud) => `${ud} Lekt.${ud > 1 ? ' am Stück' : ''}`,
    orarioGruppo: (inizio, fine, occupati, capienza) =>
      `${inizio}–${fine} · ${occupati}/${capienza} min`,
    pieno: 'voll',
    minutiLiberi: (minuti) => `${minuti} min frei`,
    minutiDiTroppo: (minuti) => `${minuti} min zu viel`,
    oltreLaFine: 'Über das Ende der Stunde hinaus',

    nessunaAttivita: 'Keine Aktivitäten: Der Ablauf ist noch leer.',
    aggiungiAttivita: 'Aktivität hinzufügen',
    totaleSu: (totale, lezione, ud) => `${totale} von ${lezione} (${ud})`,
    totale: (durata) => `insgesamt ${durata}`,
  },
  fr: {
    comeSiSvolge: 'Comment ça se passe',
    segnapostoSvolgimento: 'les étapes, les consignes, ce qu’on dit',
    comeLavoraLaClasse: 'Comment la classe travaille',
    materialeDAula: 'Matériel de classe',
    segnapostoMateriale: 'photocopies, règle, clés du labo',
    aiutoMateriale:
      'Ce qu’il faut avoir sous la main : on le retrouve dans le déroulement imprimé.',
    eUnaProva: 'Cette étape est une épreuve',
    aiutoProva:
      'C’est d’ici que naissent les notes : pendant la leçon, l’étape propose ' +
      'l’évaluation',
    titoloProva: 'Titre de l’épreuve',
    comeLaTappa: 'comme l’étape',
    tipoProva: 'Type d’épreuve',
    peso: 'Pondération (de 0 à 10)',
    zeroNonFaMedia: 'Zéro ne compte pas dans la moyenne.',
    svolgimento: 'Mise en œuvre',
    dettagliDi: (tipo) => `Détails · ${tipo}`,
    valutazione: 'Évaluation',
    materialeDellaTappa: 'Matériel de l’étape',

    conPeso: (peso) => ` · pondération ${peso}`,
    tipoPremi: (tipo) => `Type : ${tipo}. Clique pour le changer.`,
    tipoDiAttivita: (tipo) => `Type d’activité : ${tipo}`,
    segnapostoTitolo: 'titre de l’activité',
    titoloAttivita: 'Titre de l’activité',
    durataInMinuti: 'Durée en minutes',
    min: 'min',
    quandoCade: 'Quand elle tombe, montre en main',
    chiudiDettaglio: 'Fermer le détail',
    dettaglioTappa: 'Détail de l’étape',
    togliAttivita: 'Retirer l’activité',

    minuti: 'Minutes',
    quando: 'Quand',

    intervallo: (minuti, da, a) => `Pause · ${minuti} min · ${da}–${a}`,
    gruppo: (numero) => `Groupe ${numero}`,
    udAttaccate: (ud) => `${ud} pér.${ud > 1 ? ' d’affilée' : ''}`,
    orarioGruppo: (inizio, fine, occupati, capienza) =>
      `${inizio}–${fine} · ${occupati}/${capienza} min`,
    pieno: 'plein',
    minutiLiberi: (minuti) => `${minuti} min libres`,
    minutiDiTroppo: (minuti) => `${minuti} min de trop`,
    oltreLaFine: 'Au-delà de la fin de la leçon',

    nessunaAttivita: 'Aucune activité : le déroulement est encore vide.',
    aggiungiAttivita: 'Ajouter une activité',
    totaleSu: (totale, lezione, ud) => `${totale} sur ${lezione} (${ud})`,
    totale: (durata) => `total ${durata}`,
  },
  en: {
    comeSiSvolge: 'How it goes',
    segnapostoSvolgimento: 'the steps, the instructions, what gets said',
    comeLavoraLaClasse: 'How the class works',
    materialeDAula: 'Classroom materials',
    segnapostoMateriale: 'photocopies, ruler, lab keys',
    aiutoMateriale: 'What you need to have to hand: it also appears in the printed outline.',
    eUnaProva: 'This step is a test',
    aiutoProva: 'This is where grades come from: in the lesson, the step suggests the assessment',
    titoloProva: 'Test title',
    comeLaTappa: 'same as the step',
    tipoProva: 'Type of test',
    peso: 'Weight (0 to 10)',
    zeroNonFaMedia: 'Zero doesn’t count towards the average.',
    svolgimento: 'Delivery',
    dettagliDi: (tipo) => `Details · ${tipo}`,
    valutazione: 'Assessment',
    materialeDellaTappa: 'Step materials',

    conPeso: (peso) => ` · weight ${peso}`,
    tipoPremi: (tipo) => `Type: ${tipo}. Click to change it.`,
    tipoDiAttivita: (tipo) => `Activity type: ${tipo}`,
    segnapostoTitolo: 'activity title',
    titoloAttivita: 'Activity title',
    durataInMinuti: 'Duration in minutes',
    min: 'min',
    quandoCade: 'When it happens, by the clock',
    chiudiDettaglio: 'Close the details',
    dettaglioTappa: 'Step details',
    togliAttivita: 'Remove the activity',

    minuti: 'Minutes',
    quando: 'When',

    intervallo: (minuti, da, a) => `Break · ${minuti} min · ${da}–${a}`,
    gruppo: (numero) => `Group ${numero}`,
    udAttaccate: (ud) => `${ud} per.${ud > 1 ? ' back to back' : ''}`,
    orarioGruppo: (inizio, fine, occupati, capienza) =>
      `${inizio}–${fine} · ${occupati}/${capienza} min`,
    pieno: 'full',
    minutiLiberi: (minuti) => `${minuti} min free`,
    minutiDiTroppo: (minuti) => `${minuti} min too many`,
    oltreLaFine: 'Past the end of the lesson',

    nessunaAttivita: 'No activities: the outline is still empty.',
    aggiungiAttivita: 'Add activity',
    totaleSu: (totale, lezione, ud) => `${totale} of ${lezione} (${ud})`,
    totale: (durata) => `total ${durata}`,
  },
})
