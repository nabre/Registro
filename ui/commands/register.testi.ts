// I testi dei comandi del calendario e del creare (`register.ts`). La guida
// cita i nomi dei pulsanti fra virgolette: cambiandone uno va cambiato anche
// là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nessunCorsoPerLezioni: 'Non c’è ancora nessun corso a cui dare le lezioni.',
  // Il calendario.
  oggiAiuto: 'Il calendario sulla settimana di oggi',
  mesePrima: 'Il mese prima',
  settimanaPrima: 'La settimana prima',
  meseDopo: 'Il mese dopo',
  settimanaDopo: 'La settimana dopo',
  modificaAiuto:
    'Le lezioni in mano: nel calendario tira sul vuoto per crearne una, tira le maniglie per ' +
    'allungarla, frecce per spostarla, Ctrl+D per copiarla, Canc per eliminarla, Esc per uscire',
  calendarioIcs: 'Calendario ICS',
  calendarioIcsAiuto:
    'Mostra, tratteggiati accanto alle lezioni, gli eventi del calendario ICS del documento',
  aggiornaIcs: 'Aggiorna ICS',
  aggiornaIcsAiuto:
    'Riscarica i calendari ICS collegati con un indirizzo, come a ogni avvio del registro',
  nessunCalendarioIcs:
    'Nessun calendario ICS nel documento: si aggiunge da Impostazioni › Calendario › ' +
    'Calendari esterni.',
  confronta: 'Confronta con il calendario',
  confrontaAiuto:
    'I calendari ICS del documento: se ne sceglie uno da confrontare, e il registro propone le ' +
    'lezioni da creare o allineare',
  oraDaCompilare: 'Lezione da compilare',
  prossimaOra: 'Prossima lezione',
  oraDaCompilareAiuto:
    'Apre la lezione che aspetta: il buco da riempire, o quella che viene',
  nessunOraDaCompilare: 'Non c’è nessuna lezione da compilare.',
  stai: 'È la lezione che stai compilando.',
  nuovaOraAiuto:
    'Una lezione fuori orario, o la prima di un corso appena fatto',
  nuovaConsegna: 'Nuova consegna',
  nuovaConsegnaAiuto:
    'Qualcosa che si dà e deve tornare indietro: un compito, un documento',
  nuovoCorso: 'Nuovo corso',
  nuovoCorsoAiuto: 'Una materia a una classe, con il suo orario',
}

export const testi = catalogo(it, {
  de: {
    nessunCorsoPerLezioni:
      'Es gibt noch keinen Kurs, für den man Stunden anlegen könnte.',
    oggiAiuto: 'Zeigt im Kalender die Woche von heute',
    mesePrima: 'Der Monat davor',
    settimanaPrima: 'Die Woche davor',
    meseDopo: 'Der Monat danach',
    settimanaDopo: 'Die Woche danach',
    modificaAiuto:
      'Die Stunden in der Hand: Im Kalender ins Leere ziehen, um eine zu erstellen, an den ' +
      'Griffen ziehen, um sie zu verlängern, Pfeiltasten zum Verschieben, Ctrl+D zum Kopieren, ' +
      'Entf zum Löschen, Esc zum Beenden',
    calendarioIcs: 'ICS-Kalender',
    calendarioIcsAiuto:
      'Zeigt gestrichelt neben den Stunden die Termine aus dem ICS-Kalender des Dokuments',
    aggiornaIcs: 'ICS aktualisieren',
    aggiornaIcsAiuto:
      'Lädt die über eine Adresse verknüpften ICS-Kalender neu, wie bei jedem Start des Klassenbuchs',
    nessunCalendarioIcs:
      'Kein ICS-Kalender im Dokument: Er wird unter Einstellungen › Kalender › ' +
      'Externe Kalender hinzugefügt.',
    confronta: 'Mit dem Kalender abgleichen',
    confrontaAiuto:
      'Die ICS-Kalender des Dokuments: Man wählt einen zum Vergleichen, und das Klassenbuch ' +
      'schlägt die Stunden vor, die zu erstellen oder anzugleichen sind',
    oraDaCompilare: 'Auszufüllende Stunde',
    prossimaOra: 'Nächste Stunde',
    oraDaCompilareAiuto:
      'Öffnet die wartende Stunde: die Lücke zum Füllen, oder die nächste',
    nessunOraDaCompilare: 'Es gibt keine auszufüllende Stunde.',
    stai: 'Das ist die Stunde, die du gerade ausfüllst.',
    nuovaOraAiuto:
      'Eine Stunde ausserhalb des Stundenplans, oder die erste eines neuen Kurses',
    nuovaConsegna: 'Neuer Auftrag',
    nuovaConsegnaAiuto:
      'Etwas, das man ausgibt und das zurückkommen muss: eine Aufgabe, ein Dokument',
    nuovoCorso: 'Neuer Kurs',
    nuovoCorsoAiuto: 'Ein Fach für eine Klasse, mit seinem Stundenplan',
  },
  fr: {
    nessunCorsoPerLezioni:
      'Il n’y a encore aucun cours pour lequel créer des leçons.',
    oggiAiuto: 'Affiche dans le calendrier la semaine d’aujourd’hui',
    mesePrima: 'Le mois d’avant',
    settimanaPrima: 'La semaine d’avant',
    meseDopo: 'Le mois d’après',
    settimanaDopo: 'La semaine d’après',
    modificaAiuto:
      'Les leçons en main : dans le calendrier, tire sur le vide pour en créer une, tire les ' +
      'poignées pour l’allonger, flèches pour la déplacer, Ctrl+D pour la copier, Suppr pour la ' +
      'supprimer, Échap pour sortir',
    calendarioIcs: 'Calendrier ICS',
    calendarioIcsAiuto:
      'Montre, en pointillé à côté des leçons, les événements du calendrier ICS du document',
    aggiornaIcs: 'Mettre à jour l’ICS',
    aggiornaIcsAiuto:
      'Retélécharge les calendriers ICS reliés par une adresse, comme à chaque démarrage du registre',
    nessunCalendarioIcs:
      'Aucun calendrier ICS dans le document : il s’ajoute depuis Paramètres › Calendrier › ' +
      'Calendriers externes.',
    confronta: 'Comparer avec le calendrier',
    confrontaAiuto:
      'Les calendriers ICS du document : on en choisit un à comparer, et le registre propose les ' +
      'leçons à créer ou à aligner',
    oraDaCompilare: 'Leçon à remplir',
    prossimaOra: 'Prochaine leçon',
    oraDaCompilareAiuto:
      'Ouvre la leçon qui attend : le trou à combler, ou celle qui vient',
    nessunOraDaCompilare: 'Il n’y a aucune leçon à remplir.',
    stai: 'C’est la leçon que tu es en train de remplir.',
    nuovaOraAiuto:
      'Une leçon hors horaire, ou la première d’un cours tout juste créé',
    nuovaConsegna: 'Nouveau devoir',
    nuovaConsegnaAiuto:
      'Quelque chose qu’on donne et qui doit revenir : un devoir, un document',
    nuovoCorso: 'Nouveau cours',
    nuovoCorsoAiuto: 'Une branche pour une classe, avec son horaire',
  },
  en: {
    nessunCorsoPerLezioni: 'There is no course yet to create lessons for.',
    oggiAiuto: 'Shows this week in the calendar',
    mesePrima: 'The previous month',
    settimanaPrima: 'The previous week',
    meseDopo: 'The next month',
    settimanaDopo: 'The next week',
    modificaAiuto:
      'Lessons in hand: in the calendar drag on an empty spot to create one, drag the handles ' +
      'to lengthen it, arrows to move it, Ctrl+D to copy it, Del to delete it, Esc to leave',
    calendarioIcs: 'ICS calendar',
    calendarioIcsAiuto:
      'Shows the events of the document’s ICS calendar, dashed, next to the lessons',
    aggiornaIcs: 'Update ICS',
    aggiornaIcsAiuto:
      'Downloads again the ICS calendars linked by an address, as at every start of the register',
    nessunCalendarioIcs:
      'No ICS calendar in the document: add one from Settings › Calendar › External ' +
      'calendars.',
    confronta: 'Compare with the calendar',
    confrontaAiuto:
      'The document’s ICS calendars: you choose one to compare, and the register suggests the ' +
      'lessons to create or align',
    oraDaCompilare: 'Lesson to fill in',
    prossimaOra: 'Next lesson',
    oraDaCompilareAiuto:
      'Opens the lesson that is waiting: the gap to fill, or the one coming up',
    nessunOraDaCompilare: 'There is no lesson to fill in.',
    stai: 'This is the lesson you are filling in.',
    nuovaOraAiuto:
      'A lesson outside the timetable, or the first of a course just created',
    nuovaConsegna: 'New assignment',
    nuovaConsegnaAiuto:
      'Something handed out that has to come back: a task, a document',
    nuovoCorso: 'New course',
    nuovoCorsoAiuto: 'A subject for a class, with its timetable',
  },
})
