// I testi di `forms/calendar.ts`: il confronto con un calendario ICS, i mucchi
// di voci da spuntare, le regole che abbinano gli eventi ai corsi.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  titolo: 'Confronto con il calendario',
  sottotitolo: 'il calendario propone, il registro decide: niente si cancella',
  applicaLeSpunte: 'Applica le spunte',
  /** Come un evento è finito sotto un corso. */
  vie: {
    regola: 'per regola',
    nome: 'dal nome',
    orario: 'dall’orario',
    sovrapposizione: 'dall’ora già a calendario',
  },
  calendarioDaConfrontare: 'Il calendario da confrontare',
  segnapostoNuovo: 'Aggiungi: https://… oppure webcal://… oppure C:\\…\\orario.ics',
  indirizzoNuovo: 'Indirizzo o file di un calendario da aggiungere',
  nessunCalendario:
    'Il documento non ha ancora calendari: aggiungine uno qui sopra, da un indirizzo o da un file.',
  lettura: 'Lettura del calendario…',
  nonSiLegge: 'Il calendario non si legge.',
  tutteDi: (titolo: string) => `Tutte: ${titolo}`,
  eventiSenzaCorso: (quanti: number) => `Eventi senza corso (${quanti})`,
  aiutoSenzaCorso:
    'Il testo si cerca nel titolo e nel luogo degli eventi, con le parole in qualsiasi ' +
    'ordine: accorciandolo — «DIC4a» invece del titolo intero — la stessa scelta vale per ' +
    'tutti gli eventi che lo contengono. Per più varianti «DIC1a | DIC1b», per un prefisso ' +
    '«DIC1*».',
  testoDellaRegola: 'Il testo della regola',
  diCheCorso: 'Di che corso è',
  daDecidere: 'Da decidere…',
  nonELezione: 'Non è una lezione',
  /** Quanti eventi ha un gruppo senza corso, e quando cadono. */
  gruppo: (quanti: number, quando: string) => `${plurale(quanti, 'evento', 'eventi')}, ${quando}`,
  dalAl: (dal: string, al: string) => `dal ${dal} al ${al}`,
  regole: (quanti: number) => `Regole di abbinamento (${quanti})`,
  /** Il testo di una regola, fra le virgolette. */
  citata: (testo: string) => `«${testo}»`,
  nonELezioneRegola: 'non è una lezione',
  regolaIlleggibile: 'non si legge: non abbina niente',
  togliRegola: 'Togli la regola',
  assenti: (quanti: number) => `Nel registro ma non nel calendario (${quanti})`,
  aiutoAssenti:
    'Solo segnalate: il confronto non cancella niente. Se un’ora non c’è davvero, la si ' +
    'toglie o la si segna annullata dalla sua scheda.',
  eventiLetti: (n: number) => plurale(n, 'evento letto', 'eventi letti'),
  combaciano: (n: number) => plurale(n, 'lezione combacia', 'lezioni combaciano'),
  ignorati: (n: number) => plurale(n, 'ignorato per regola', 'ignorati per regola'),
  scartati: (n: number) =>
    plurale(n, 'di un giorno intero, lasciato fuori', 'di un giorno intero, lasciati fuori'),
  nessunEvento: 'Nel periodo dell’anno in uso il calendario non ha eventi.',
  daCreare: 'Da creare',
  aiutoDaCreare: 'Eventi di un corso senza una lezione sotto: diventano lezioni pianificate.',
  daAllineare: 'Da allineare',
  aiutoDaAllineare:
    'La lezione c’è, ma a un’altra ora o in un’altra aula: si porta a quel che dice il ' +
    'calendario. Appello, piano e testi restano.',
  svolteSenzaSpunta: 'Le ore già svolte partono senza spunta.',
  daAnnullare: 'Da annullare',
  aiutoDaAnnullare: 'Il calendario le dà annullate: si segnano annullate, non si cancellano.',
  combacianoTitolo: (quanti: number) => `Combaciano (${quanti})`,
  calendario: 'Calendario',
  aiutoCalendario:
    'Si confronta la copia che sta nel documento: per il calendario di oggi si preme ' +
    '«Aggiorna» nelle impostazioni, sezione Calendari ICS. Lì si rinominano e si tolgono.',
  confronta: 'Confronta',
  unFile: 'Un file…',
  aiutoUnFile: 'Sceglie un file .ics dal disco e lo aggiunge',
  nonApplicato: 'Non è stato possibile applicare il confronto.',
  applicato: 'Confronto applicato.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Abgleich mit dem Kalender',
    sottotitolo: 'der Kalender schlägt vor, das Klassenbuch entscheidet: Gelöscht wird nichts',
    applicaLeSpunte: 'Angehakte übernehmen',
    vie: {
      regola: 'per Regel',
      nome: 'aus dem Namen',
      orario: 'aus dem Stundenplan',
      sovrapposizione: 'aus der schon eingetragenen Stunde',
    },
    calendarioDaConfrontare: 'Der abzugleichende Kalender',
    segnapostoNuovo: 'Hinzufügen: https://… oder webcal://… oder C:\\…\\stundenplan.ics',
    indirizzoNuovo: 'Adresse oder Datei eines Kalenders, der hinzukommen soll',
    nessunCalendario:
      'Das Dokument hat noch keine Kalender: Füge oben einen hinzu, über eine Adresse oder ' +
      'eine Datei.',
    lettura: 'Kalender wird gelesen…',
    nonSiLegge: 'Der Kalender lässt sich nicht lesen.',
    tutteDi: (titolo) => `Alle: ${titolo}`,
    eventiSenzaCorso: (quanti) => `Termine ohne Kurs (${quanti})`,
    aiutoSenzaCorso:
      'Der Text wird in Titel und Ort der Termine gesucht, die Wörter in beliebiger ' +
      'Reihenfolge: Kürzt du ihn — «DIC4a» statt des ganzen Titels —, gilt dieselbe Wahl für ' +
      'alle Termine, die ihn enthalten. Für mehrere Varianten «DIC1a | DIC1b», für einen ' +
      'Anfang «DIC1*».',
    testoDellaRegola: 'Der Text der Regel',
    diCheCorso: 'Zu welchem Kurs er gehört',
    daDecidere: 'Noch offen…',
    nonELezione: 'Keine Stunde',
    gruppo: (quanti, quando) => `${plurale(quanti, 'Termin', 'Termine')}, ${quando}`,
    dalAl: (dal, al) => `vom ${dal} bis ${al}`,
    regole: (quanti) => `Zuordnungsregeln (${quanti})`,
    citata: (testo) => `«${testo}»`,
    nonELezioneRegola: 'keine Stunde',
    regolaIlleggibile: 'unlesbar: ordnet nichts zu',
    togliRegola: 'Regel entfernen',
    assenti: (quanti) => `Im Klassenbuch, aber nicht im Kalender (${quanti})`,
    aiutoAssenti:
      'Nur gemeldet: Der Abgleich löscht nichts. Findet eine Stunde wirklich nicht statt, ' +
      'entfernst du sie oder markierst sie in ihrer Ansicht als ausgefallen.',
    eventiLetti: (n) => plurale(n, 'Termin gelesen', 'Termine gelesen'),
    combaciano: (n) =>
      plurale(n, 'Stunde stimmt überein', 'Stunden stimmen überein'),
    ignorati: (n) => plurale(n, 'per Regel ignoriert', 'per Regel ignoriert'),
    scartati: (n) =>
      plurale(n, 'ganztägiger Termin weggelassen', 'ganztägige Termine weggelassen'),
    nessunEvento: 'Im Zeitraum des aktuellen Schuljahrs hat der Kalender keine Termine.',
    daCreare: 'Zu erstellen',
    aiutoDaCreare:
      'Termine eines Kurses ohne Stunde dazu: Sie werden zu geplanten Stunden.',
    daAllineare: 'Anzugleichen',
    aiutoDaAllineare:
      'Die Stunde existiert, aber zu einer anderen Zeit oder in einem anderen Zimmer: ' +
      'Sie wird an den Kalender angepasst. Präsenzkontrolle, Plan und Texte bleiben.',
    svolteSenzaSpunta: 'Bereits gehaltene Stunden sind zu Beginn nicht angehakt.',
    daAnnullare: 'Abzusagen',
    aiutoDaAnnullare:
      'Der Kalender führt sie als abgesagt: Sie werden als ausgefallen markiert, nicht gelöscht.',
    combacianoTitolo: (quanti) => `Übereinstimmend (${quanti})`,
    calendario: 'Kalender',
    aiutoCalendario:
      'Abgeglichen wird die Kopie im Dokument: Für den heutigen Stand des Kalenders drückst du ' +
      '«Aktualisieren» in den Einstellungen, Bereich ICS-Kalender. Dort werden Kalender auch ' +
      'umbenannt und entfernt.',
    confronta: 'Abgleichen',
    unFile: 'Eine Datei…',
    aiutoUnFile: 'Wählt eine .ics-Datei auf dem Datenträger aus und fügt sie hinzu',
    nonApplicato: 'Der Abgleich konnte nicht übernommen werden.',
    applicato: 'Abgleich übernommen.',
  },
  fr: {
    titolo: 'Comparaison avec le calendrier',
    sottotitolo: 'le calendrier propose, le registre décide : rien n’est supprimé',
    applicaLeSpunte: 'Appliquer les coches',
    vie: {
      regola: 'par règle',
      nome: 'd’après le nom',
      orario: 'd’après l’horaire',
      sovrapposizione: 'd’après la leçon déjà au calendrier',
    },
    calendarioDaConfrontare: 'Le calendrier à comparer',
    segnapostoNuovo: 'Ajouter : https://… ou webcal://… ou C:\\…\\horaire.ics',
    indirizzoNuovo: 'Adresse ou fichier d’un calendrier à ajouter',
    nessunCalendario:
      'Le document n’a pas encore de calendrier : ajoutes-en un ci-dessus, depuis une adresse ' +
      'ou un fichier.',
    lettura: 'Lecture du calendrier…',
    nonSiLegge: 'Le calendrier est illisible.',
    tutteDi: (titolo) => `Toutes : ${titolo}`,
    eventiSenzaCorso: (quanti) => `Événements sans cours (${quanti})`,
    aiutoSenzaCorso:
      'Le texte est cherché dans le titre et le lieu des événements, les mots dans n’importe ' +
      'quel ordre : en le raccourcissant — « DIC4a » au lieu du titre entier —, le même choix ' +
      'vaut pour tous les événements qui le contiennent. Pour plusieurs variantes ' +
      '« DIC1a | DIC1b », pour un début « DIC1* ».',
    testoDellaRegola: 'Le texte de la règle',
    diCheCorso: 'À quel cours il appartient',
    daDecidere: 'À décider…',
    nonELezione: 'Pas une leçon',
    gruppo: (quanti, quando) => `${plurale(quanti, 'événement', 'événements')}, ${quando}`,
    dalAl: (dal, al) => `du ${dal} au ${al}`,
    regole: (quanti) => `Règles d’association (${quanti})`,
    citata: (testo) => `« ${testo} »`,
    nonELezioneRegola: 'pas une leçon',
    regolaIlleggibile: 'illisible : n’associe rien',
    togliRegola: 'Retirer la règle',
    assenti: (quanti) => `Dans le registre mais pas dans le calendrier (${quanti})`,
    aiutoAssenti:
      'Seulement signalées : la comparaison ne supprime rien. Si une leçon n’a vraiment pas ' +
      'lieu, retire-la ou marque-la comme annulée depuis sa fiche.',
    eventiLetti: (n) => plurale(n, 'événement lu', 'événements lus'),
    combaciano: (n) => plurale(n, 'leçon correspond', 'leçons correspondent'),
    ignorati: (n) => plurale(n, 'ignoré par règle', 'ignorés par règle'),
    scartati: (n) =>
      plurale(
        n,
        'sur une journée entière, laissé de côté',
        'sur une journée entière, laissés de côté',
      ),
    nessunEvento: 'Sur la période de l’année en cours, le calendrier n’a aucun événement.',
    daCreare: 'À créer',
    aiutoDaCreare:
      'Événements d’un cours sans leçon correspondante : ils deviennent des leçons prévues.',
    daAllineare: 'À aligner',
    aiutoDaAllineare:
      'La leçon existe, mais à une autre heure ou dans une autre salle : elle est alignée sur ' +
      'le calendrier. L’appel, le plan et les textes restent.',
    svolteSenzaSpunta: 'Les leçons déjà données ne sont pas cochées au départ.',
    daAnnullare: 'À annuler',
    aiutoDaAnnullare:
      'Le calendrier les indique comme annulées : elles sont marquées annulées, pas supprimées.',
    combacianoTitolo: (quanti) => `Concordantes (${quanti})`,
    calendario: 'Calendrier',
    aiutoCalendario:
      'On compare la copie qui se trouve dans le document : pour le calendrier d’aujourd’hui, ' +
      'appuie sur « Mettre à jour » dans les paramètres, section Calendriers ICS. C’est là qu’on ' +
      'les renomme et qu’on les retire.',
    confronta: 'Comparer',
    unFile: 'Un fichier…',
    aiutoUnFile: 'Choisit un fichier .ics sur le disque et l’ajoute',
    nonApplicato: 'Impossible d’appliquer la comparaison.',
    applicato: 'Comparaison appliquée.',
  },
  en: {
    titolo: 'Compare with the calendar',
    sottotitolo: 'the calendar suggests, the register decides: nothing gets deleted',
    applicaLeSpunte: 'Apply ticked items',
    vie: {
      regola: 'by rule',
      nome: 'from the name',
      orario: 'from the timetable',
      sovrapposizione: 'from the lesson already scheduled',
    },
    calendarioDaConfrontare: 'The calendar to compare',
    segnapostoNuovo: 'Add: https://… or webcal://… or C:\\…\\timetable.ics',
    indirizzoNuovo: 'Address or file of a calendar to add',
    nessunCalendario:
      'The document has no calendars yet: add one above, from an address or from a file.',
    lettura: 'Reading the calendar…',
    nonSiLegge: 'The calendar can’t be read.',
    tutteDi: (titolo) => `All: ${titolo}`,
    eventiSenzaCorso: (quanti) => `Events without a course (${quanti})`,
    aiutoSenzaCorso:
      'The text is looked for in the title and location of the events, with the words in any ' +
      'order: shorten it — “DIC4a” instead of the whole title — and the same choice applies to ' +
      'every event that contains it. For several variants “DIC1a | DIC1b”, for a beginning ' +
      '“DIC1*”.',
    testoDellaRegola: 'The rule text',
    diCheCorso: 'Which course it belongs to',
    daDecidere: 'To be decided…',
    nonELezione: 'Not a lesson',
    gruppo: (quanti, quando) => `${plurale(quanti, 'event', 'events')}, ${quando}`,
    dalAl: (dal, al) => `from ${dal} to ${al}`,
    regole: (quanti) => `Matching rules (${quanti})`,
    citata: (testo) => `“${testo}”`,
    nonELezioneRegola: 'not a lesson',
    regolaIlleggibile: 'unreadable: matches nothing',
    togliRegola: 'Remove the rule',
    assenti: (quanti) => `In the register but not in the calendar (${quanti})`,
    aiutoAssenti:
      'Only flagged: the comparison deletes nothing. If a lesson really isn’t happening, ' +
      'remove it or mark it cancelled from its own page.',
    eventiLetti: (n) => plurale(n, 'event read', 'events read'),
    combaciano: (n) => plurale(n, 'lesson matches', 'lessons match'),
    ignorati: (n) => plurale(n, 'ignored by rule', 'ignored by rule'),
    scartati: (n) => plurale(n, 'all-day event left out', 'all-day events left out'),
    nessunEvento: 'The calendar has no events in the period of the current school year.',
    daCreare: 'To create',
    aiutoDaCreare: 'Events of a course with no lesson behind them: they become planned lessons.',
    daAllineare: 'To align',
    aiutoDaAllineare:
      'The lesson is there, but at another time or in another room: it’s brought in line with ' +
      'the calendar. Attendance, plan and texts stay.',
    svolteSenzaSpunta: 'Lessons already held start unticked.',
    daAnnullare: 'To cancel',
    aiutoDaAnnullare:
      'The calendar has them as cancelled: they’re marked cancelled, not deleted.',
    combacianoTitolo: (quanti) => `Matching (${quanti})`,
    calendario: 'Calendar',
    aiutoCalendario:
      'What’s compared is the copy in the document: for today’s calendar, press “Update” in ' +
      'the settings, ICS calendars section. That’s also where calendars are renamed and removed.',
    confronta: 'Compare',
    unFile: 'A file…',
    aiutoUnFile: 'Picks an .ics file from disk and adds it',
    nonApplicato: 'The comparison couldn’t be applied.',
    applicato: 'Comparison applied.',
  },
})
