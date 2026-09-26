// I testi di `forms/lesson.ts`: il modulo di un'ora di lezione — l'editor delle
// fasce con le sue pause, il legame con il calendario ICS — e quello di
// un'osservazione.

import { catalogo } from '../../i18n/index.js'
import { FASCIA, Uno } from '../../domain/lexicon.js'

const it = {
  editor: {
    orarioAdattato:
      'Orario adattato alle pause della giornata. Per tenerlo com’era, spegni la casella.',
    contoLezione: (ud: number, durata: string) => `lezione ${ud} UD · ${durata}`,
    contoPause: (durata: string) => `pause ${durata}`,
    finoAlle: (ora: string) => `fino alle ${ora}`,
    inizioAttaccato: 'Inizio, dato dalla fascia precedente',
    inizioLezione: 'Inizio della lezione',
    titoloAncorata:
      'Si attacca all’ora del calendario ICS: per spostarla, trascina la riga sopra o sotto.',
    titoloAttaccato:
      'Comincia dove finisce la fascia sopra: per spostarla, cambia l’ordine o l’ora della ' +
      'prima fascia.',
    titoloPrimo: 'L’ora della lezione: le fasce sotto la seguono.',
    durataInMinuti: 'Durata in minuti',
    pausaDellaGiornata:
      'È una pausa della giornata: si cambia in Impostazioni › Anno e orario › Calendario.',
    minuti: 'min',
    quantiMinuti: (n: number) => `${n} min`,
    quanteUd: (n: number) => `${n} UD`,
    notaSullaFascia: 'nota sulla fascia',
    togliFascia: 'Togli la fascia',
    titoloIcs: 'Dal calendario ICS: è l’ora dell’evento, e si cambia nel calendario della scuola.',
    dalCalendarioIcs: 'Dal calendario ICS',
    dalCalendarioIcsInRiga: 'dal calendario ICS',
    /** Il nome della casella che spegne le pause della giornata, fra le virgolette. */
    pauseDellaGiornata: (casella: string) =>
      `Le pause le mette la giornata: per una pausa diversa, spegni «${casella}».`,
    fasciaDiLezione: `${Uno(FASCIA)} di lezione`,
    seguePause: 'Segue le pause della giornata',
    aiutoSeguePause:
      'Le unità didattiche finiscono prima di una pausa e riprendono dopo; l’inizio si ' +
      'aggancia alla griglia delle pause. Le pause si dichiarano in Impostazioni › Anno e ' +
      'orario › Calendario.',
  },
  lezione: {
    /** Il nome del pulsante che accende la modifica, fra le virgolette. */
    accendiModifica: (pulsante: string) => `Accendi «${pulsante}» (Ctrl+E) per cambiare l’ora.`,
    titoloModifica: 'Modifica lezione',
    titoloNuova: 'Nuova lezione',
    crea: 'Crea lezione',
    collegataConAula:
      'Collegata al calendario ICS: corso, data, aula e l’ora dell’evento li decide il ' +
      'calendario della scuola. Si possono aggiungere fasce e pause prima o dopo; ' +
      'stato e piano restano liberi.',
    collegataSenzaAula:
      'Collegata al calendario ICS: corso, data e l’ora dell’evento li decide il ' +
      'calendario della scuola. Si possono aggiungere fasce e pause prima o dopo; ' +
      'aula, stato e piano restano liberi.',
    aiutoCorso: 'La materia in questa classe: dice tutto quel che serve alla lezione.',
    aulaDaIcs: 'Dal luogo dell’evento nel calendario ICS.',
    orario: 'Orario',
    nessunPiano: '— nessun piano —',
    nuovoPiano: 'Nuovo piano per questa materia',
    aiutoPiano: 'La scaletta si può assegnare anche dopo, dal dettaglio della lezione.',
    aggiornata: 'Lezione aggiornata.',
    creata: 'Lezione creata.',
    sincronizza: 'Sincronizza da ICS',
    titoloSincronizza: 'Porta orario, aula e stato a quel che dice il calendario ICS',
    duplicata: 'Lezione duplicata: cambiare la data della copia.',
    eliminata: 'Lezione eliminata.',
  },
  osservazione: {
    titoloModifica: 'Modifica osservazione',
    titoloNuova: 'Nuova osservazione',
    riguarda: 'Riguarda',
    tuttaLaClasse: 'Tutta la classe',
    aggiornata: 'Osservazione aggiornata.',
    registrata: 'Osservazione registrata.',
    eliminare: 'Eliminare l’osservazione?',
    nonSiTorna: 'Non si torna indietro.',
    eliminata: 'Osservazione eliminata.',
  },
}

export const testi = catalogo(it, {
  de: {
    editor: {
      orarioAdattato:
        'Zeiten an die Pausen des Tages angepasst. Um sie so zu lassen, wie sie waren, ' +
        'deaktiviere das Kästchen.',
      contoLezione: (ud, durata) => `Stunde ${ud} Lekt. · ${durata}`,
      contoPause: (durata) => `Pausen ${durata}`,
      finoAlle: (ora) => `bis ${ora}`,
      inizioAttaccato: 'Beginn, vom vorherigen Zeitfenster vorgegeben',
      inizioLezione: 'Beginn der Stunde',
      titoloAncorata:
        'Schliesst an die Zeit aus dem ICS-Kalender an: Um das Zeitfenster zu verschieben, ' +
        'zieh die Zeile darüber oder darunter.',
      titoloAttaccato:
        'Beginnt, wo das Zeitfenster darüber endet: Um es zu verschieben, ändere die ' +
        'Reihenfolge oder die Zeit des ersten Zeitfensters.',
      titoloPrimo: 'Die Zeit der Stunde: Die Zeitfenster darunter folgen ihr.',
      durataInMinuti: 'Dauer in Minuten',
      pausaDellaGiornata:
        'Das ist eine Pause des Tages: Sie wird unter Einstellungen › Schuljahr und Stundenplan › ' +
        'Kalender geändert.',
      minuti: 'min',
      quantiMinuti: (n) => `${n} min`,
      quanteUd: (n) => `${n} Lekt.`,
      notaSullaFascia: 'Notiz zum Zeitfenster',
      togliFascia: 'Zeitfenster entfernen',
      titoloIcs:
        'Aus dem ICS-Kalender: Das ist die Zeit des Termins, und sie wird im Kalender der ' +
        'Schule geändert.',
      dalCalendarioIcs: 'Aus dem ICS-Kalender',
      dalCalendarioIcsInRiga: 'aus dem ICS-Kalender',
      pauseDellaGiornata: (casella) =>
        `Die Pausen setzt der Tag: Für eine andere Pause deaktiviere «${casella}».`,
      fasciaDiLezione: 'Zeitfenster für Unterricht',
      seguePause: 'Folgt den Pausen des Tages',
      aiutoSeguePause:
        'Die Lektionen enden vor einer Pause und gehen danach weiter; der Beginn rastet im ' +
        'Raster der Pausen ein. Die Pausen werden unter Einstellungen › Schuljahr und Stundenplan › ' +
        'Kalender festgelegt.',
    },
    lezione: {
      accendiModifica: (pulsante) =>
        `Schalte «${pulsante}» ein (Ctrl+E), um die Zeit zu ändern.`,
      titoloModifica: 'Stunde bearbeiten',
      titoloNuova: 'Neue Stunde',
      crea: 'Stunde erstellen',
      collegataConAula:
        'Mit dem ICS-Kalender verknüpft: Kurs, Datum, Zimmer und die Zeit des Termins bestimmt ' +
        'der Kalender der Schule. Davor oder danach lassen sich Zeitfenster und Pausen ' +
        'hinzufügen; Status und Plan bleiben frei.',
      collegataSenzaAula:
        'Mit dem ICS-Kalender verknüpft: Kurs, Datum und die Zeit des Termins bestimmt der ' +
        'Kalender der Schule. Davor oder danach lassen sich Zeitfenster und Pausen ' +
        'hinzufügen; Zimmer, Status und Plan bleiben frei.',
      aiutoCorso: 'Das Fach in dieser Klasse: Es sagt alles, was die Stunde braucht.',
      aulaDaIcs: 'Aus dem Ort des Termins im ICS-Kalender.',
      orario: 'Zeiten',
      nessunPiano: '— kein Plan —',
      nuovoPiano: 'Neuer Plan für dieses Fach',
      aiutoPiano:
        'Den Ablauf kannst du auch später zuweisen, in den Details der Stunde.',
      aggiornata: 'Stunde aktualisiert.',
      creata: 'Stunde erstellt.',
      sincronizza: 'Aus ICS synchronisieren',
      titoloSincronizza: 'Zeiten, Zimmer und Status an den ICS-Kalender angleichen',
      duplicata: 'Stunde dupliziert: Datum der Kopie anpassen.',
      eliminata: 'Stunde gelöscht.',
    },
    osservazione: {
      titoloModifica: 'Beobachtung bearbeiten',
      titoloNuova: 'Neue Beobachtung',
      riguarda: 'Betrifft',
      tuttaLaClasse: 'Die ganze Klasse',
      aggiornata: 'Beobachtung aktualisiert.',
      registrata: 'Beobachtung erfasst.',
      eliminare: 'Beobachtung löschen?',
      nonSiTorna: 'Das lässt sich nicht rückgängig machen.',
      eliminata: 'Beobachtung gelöscht.',
    },
  },
  fr: {
    editor: {
      orarioAdattato:
        'Horaire adapté aux pauses de la journée. Pour le garder tel qu’il était, décoche la case.',
      contoLezione: (ud, durata) => `leçon ${ud} pér. · ${durata}`,
      contoPause: (durata) => `pauses ${durata}`,
      finoAlle: (ora) => `jusqu’à ${ora}`,
      inizioAttaccato: 'Début, donné par la plage précédente',
      inizioLezione: 'Début de la leçon',
      titoloAncorata:
        'S’accroche à l’heure du calendrier ICS : pour la déplacer, fais glisser la ligne ' +
        'au-dessus ou en dessous.',
      titoloAttaccato:
        'Commence là où finit la plage du dessus : pour la déplacer, change l’ordre ou l’heure ' +
        'de la première plage.',
      titoloPrimo: 'L’heure de la leçon : les plages du dessous la suivent.',
      durataInMinuti: 'Durée en minutes',
      pausaDellaGiornata:
        'C’est une pause de la journée : elle se modifie dans Paramètres › Année et horaire › ' +
        'Calendrier.',
      minuti: 'min',
      quantiMinuti: (n) => `${n} min`,
      quanteUd: (n) => `${n} pér.`,
      notaSullaFascia: 'note sur la plage',
      togliFascia: 'Retirer la plage',
      titoloIcs:
        'Du calendrier ICS : c’est l’heure de l’événement, et elle se modifie dans le ' +
        'calendrier de l’école.',
      dalCalendarioIcs: 'Du calendrier ICS',
      dalCalendarioIcsInRiga: 'du calendrier ICS',
      pauseDellaGiornata: (casella) =>
        'Les pauses sont fixées par la journée : pour une pause différente, ' +
        `décoche « ${casella} ».`,
      fasciaDiLezione: 'Plage de cours',
      seguePause: 'Suit les pauses de la journée',
      aiutoSeguePause:
        'Les périodes s’arrêtent avant une pause et reprennent après ; le début s’aligne sur ' +
        'la grille des pauses. Les pauses se déclarent dans Paramètres › Année et horaire › ' +
        'Calendrier.',
    },
    lezione: {
      accendiModifica: (pulsante) => `Active « ${pulsante} » (Ctrl+E) pour changer l’heure.`,
      titoloModifica: 'Modifier la leçon',
      titoloNuova: 'Nouvelle leçon',
      crea: 'Créer la leçon',
      collegataConAula:
        'Liée au calendrier ICS : le cours, la date, la salle et l’heure de l’événement sont ' +
        'fixés par le calendrier de l’école. Tu peux ajouter des plages et des pauses avant ou ' +
        'après ; l’état et le plan restent libres.',
      collegataSenzaAula:
        'Liée au calendrier ICS : le cours, la date et l’heure de l’événement sont fixés par ' +
        'le calendrier de l’école. Tu peux ajouter des plages et des pauses avant ou après ; ' +
        'la salle, l’état et le plan restent libres.',
      aiutoCorso: 'La branche dans cette classe : elle dit tout ce dont la leçon a besoin.',
      aulaDaIcs: 'D’après le lieu de l’événement dans le calendrier ICS.',
      orario: 'Horaire',
      nessunPiano: '— aucun plan —',
      nuovoPiano: 'Nouveau plan pour cette branche',
      aiutoPiano:
        'Le déroulement peut aussi être attribué plus tard, depuis le détail de la leçon.',
      aggiornata: 'Leçon mise à jour.',
      creata: 'Leçon créée.',
      sincronizza: 'Synchroniser depuis ICS',
      titoloSincronizza: 'Aligner l’horaire, la salle et l’état sur le calendrier ICS',
      duplicata: 'Leçon dupliquée : modifier la date de la copie.',
      eliminata: 'Leçon supprimée.',
    },
    osservazione: {
      titoloModifica: 'Modifier l’observation',
      titoloNuova: 'Nouvelle observation',
      riguarda: 'Concerne',
      tuttaLaClasse: 'Toute la classe',
      aggiornata: 'Observation mise à jour.',
      registrata: 'Observation enregistrée.',
      eliminare: 'Supprimer l’observation ?',
      nonSiTorna: 'C’est irréversible.',
      eliminata: 'Observation supprimée.',
    },
  },
  en: {
    editor: {
      orarioAdattato:
        'Times adjusted to the day’s breaks. To keep them as they were, untick the box.',
      contoLezione: (ud, durata) => `lesson ${ud} per. · ${durata}`,
      contoPause: (durata) => `breaks ${durata}`,
      finoAlle: (ora) => `until ${ora}`,
      inizioAttaccato: 'Start, set by the previous slot',
      inizioLezione: 'Start of the lesson',
      titoloAncorata:
        'Attaches to the time in the ICS calendar: to move it, drag the row above or below.',
      titoloAttaccato:
        'Starts where the slot above ends: to move it, change the order or the time of the ' +
        'first slot.',
      titoloPrimo: 'The lesson’s time: the slots below follow it.',
      durataInMinuti: 'Length in minutes',
      pausaDellaGiornata:
        'This is one of the day’s breaks: change it in Settings › Year and timetable › Calendar.',
      minuti: 'min',
      quantiMinuti: (n) => `${n} min`,
      quanteUd: (n) => `${n} per.`,
      notaSullaFascia: 'note on the slot',
      togliFascia: 'Remove the slot',
      titoloIcs:
        'From the ICS calendar: it’s the event’s time, and it’s changed in the school ' +
        'calendar.',
      dalCalendarioIcs: 'From the ICS calendar',
      dalCalendarioIcsInRiga: 'from the ICS calendar',
      pauseDellaGiornata: (casella) =>
        `The day sets the breaks: for a different break, untick “${casella}”.`,
      fasciaDiLezione: 'Teaching slot',
      seguePause: 'Follows the day’s breaks',
      aiutoSeguePause:
        'Periods stop before a break and resume after it; the start snaps to the grid of ' +
        'breaks. Breaks are set in Settings › Year and timetable › Calendar.',
    },
    lezione: {
      accendiModifica: (pulsante) => `Turn on “${pulsante}” (Ctrl+E) to change the time.`,
      titoloModifica: 'Edit lesson',
      titoloNuova: 'New lesson',
      crea: 'Create lesson',
      collegataConAula:
        'Linked to the ICS calendar: the course, date, room and event time are set by the ' +
        'school calendar. You can add slots and breaks before or after; status and plan stay ' +
        'free.',
      collegataSenzaAula:
        'Linked to the ICS calendar: the course, date and event time are set by the school ' +
        'calendar. You can add slots and breaks before or after; room, status and plan stay ' +
        'free.',
      aiutoCorso: 'The subject in this class: it tells the lesson everything it needs.',
      aulaDaIcs: 'From the event’s location in the ICS calendar.',
      orario: 'Times',
      nessunPiano: '— no plan —',
      nuovoPiano: 'New plan for this subject',
      aiutoPiano: 'The outline can also be assigned later, from the lesson details.',
      aggiornata: 'Lesson updated.',
      creata: 'Lesson created.',
      sincronizza: 'Sync from ICS',
      titoloSincronizza: 'Bring times, room and status into line with the ICS calendar',
      duplicata: 'Lesson duplicated: change the date of the copy.',
      eliminata: 'Lesson deleted.',
    },
    osservazione: {
      titoloModifica: 'Edit observation',
      titoloNuova: 'New observation',
      riguarda: 'About',
      tuttaLaClasse: 'The whole class',
      aggiornata: 'Observation updated.',
      registrata: 'Observation recorded.',
      eliminare: 'Delete the observation?',
      nonSiTorna: 'This can’t be undone.',
      eliminata: 'Observation deleted.',
    },
  },
})
