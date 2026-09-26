// I testi delle procedure di `calendario`. I valori di `esito`, `via` e
// `statoLezione` («combacia», «regola», «pianificata») sono del contratto e
// restano uguali. Si leggono al momento dell'uso (`titolo: () => …`), mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  /** Quel che più procedure del calendario si dividono (`common.ts`). */
  comune: {
    regolaId: 'L’identificatore della regola; se manca se ne fa uno',
    regolaTesto:
      'Come si riconoscono gli eventi nel titolo o nel luogo: parole in qualsiasi ordine, ' +
      'varianti con |, prefisso con * in fondo, espressione regolare fra /…/. Senza maiuscole',
    regolaCorsoId:
      'Il corso di quegli eventi. Null vuol dire «non è una lezione»: l’evento non si propone più',
    fasciaTipo: 'Una fascia di lezione è fatta di unità didattiche intere',
    fasciaIcs:
      'Vero se la fascia è l’ora di un evento del calendario; le altre sono aggiunte a mano ' +
      'e l’allineamento le sposta con l’evento. Senza nessuna segnata, lo sono tutte',
    nessunCalendario: 'Il documento non ha calendari ICS: se ne aggiunge uno dalle impostazioni.',
    calendarioId: 'Il calendario del documento da leggere. Se manca, il primo',
    serveAnno: 'Senza un anno in uso servono le due date del periodo.',
    periodoRovescio: 'Il periodo finisce prima di cominciare.',
    nonSiLegge: 'Il calendario non si legge.',
    /** I valori ammessi, già in fila con le virgole. */
    unoFra: (valori: string) => `Uno fra: ${valori}`,
    scartati: 'Giornate intere e eventi a cavallo di due giorni',
    diUnGiornoIntero: 'Di un giorno intero',
    dalle: 'Dalle',
    alle: 'Alle',
  },
  aggiorna: {
    titolo: 'Riscarica un calendario ICS e ne aggiorna la copia nel documento',
    calendarioId: 'Il calendario da rileggere',
  },
  aggiungi: {
    titolo: 'Aggiunge un calendario ICS al documento, da un indirizzo o da un file',
    origine:
      'Un indirizzo https:// o webcal://, o il percorso di un file .ics. Vuota apre il dialogo ' +
      'per sceglierlo dal disco',
    nome: 'Come chiamarlo: «Orario di sede». Se manca, dal file o dal sito',
  },
  applica: {
    titolo: 'Crea, allinea o annulla le lezioni spuntate nel confronto con il calendario',
    regole:
      'Le regole di abbinamento, tutte: sostituiscono quelle salvate. Senza, restano come sono',
    automatico:
      'Vero dal giro che allinea da solo: ogni lezione si ricontrolla (pianificata, ' +
      'senza appello né testi, senza scontri) e una che non passa si rifiuta',
    crea: 'Le lezioni nuove, come le propone «calendario.confronta»',
    fasce: 'Le fasce nuove; se mancano l’orario non cambia',
    aula: 'L’aula nuova; se manca non cambia',
    allinea: 'Le lezioni da portare all’orario del calendario. Appello e testi restano',
    annulla: 'Le lezioni da segnare annullate. Nessuna si cancella',
  },
  confronta: {
    titolo: 'Confronta le lezioni con il calendario ICS del documento',
    regole: 'Le regole di abbinamento da provare. Se mancano, quelle salvate nel documento',
    dal: 'Da quando guardare. Se manca, dall’inizio dell’anno in uso',
    al: 'Fino a quando. Se manca, fino alla fine dell’anno in uso',
    id: 'La lezione, o corso|giorno|ora per una da creare',
    via: (valori: string) => `Come si è trovato il corso: ${valori}`,
    titoli: 'I titoli degli eventi che ci cadono',
    differenze: 'Che cosa cambierebbe, a parole',
    senzaCorso: 'Gli eventi che nessuna prova ha attribuito a un corso, per titolo',
    assenti: 'Le lezioni che il calendario, nei giorni che copre, non ha. Solo segnalate',
    presentazione: {
      titolo: 'Il confronto con il calendario',
      eventiLetti: 'Eventi letti',
      ignorati: 'Ignorati per regola',
      esito: 'Esito',
      cheCosaCambia: 'Che cosa cambia',
      soloNelRegistro: 'Nel registro, non nel calendario',
    },
  },
  eventi: {
    titolo: 'Gli eventi del calendario ICS del documento in un periodo',
    calendarioId: 'Il calendario del documento da leggere. Se manca, tutti',
    dal: 'Da quando. Se manca, dall’inizio dell’anno in uso',
    al: 'Fino a quando. Se manca, fino alla fine dell’anno in uso',
    chiave:
      'Il calendario, l’UID dell’evento e il momento: distingue le occorrenze di una ricorrenza',
    calendarioIdUscita: 'Il calendario da cui viene',
    annullato: 'L’evento è segnato STATUS:CANCELLED',
    motivo: 'Perché non si è letto, in una frase che non contiene l’indirizzo',
    guasti: 'I calendari che non si sono letti: gli altri rispondono lo stesso',
    presentazione: {
      titolo: 'Gli eventi del calendario',
      evento: 'Evento',
    },
  },
  modifica: {
    titolo: 'Rinomina un calendario ICS del documento, o ne cambia l’indirizzo o il file',
    calendarioId: 'Il calendario da cambiare',
    nome: 'Il nome nuovo. Se manca, resta quello',
    origine: 'Un indirizzo o un percorso nuovo: si scarica subito. Se manca, resta quella',
  },
  togli: {
    titolo: 'Toglie un calendario ICS dal documento, con la sua copia',
    calendarioId: 'Il calendario da togliere',
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      regolaId: 'Die Kennung der Regel; fehlt sie, wird eine erstellt',
      regolaTesto:
        'Woran man die Ereignisse in Titel oder Ort erkennt: Wörter in beliebiger Reihenfolge, ' +
        'Varianten mit |, Präfix mit * am Ende, regulärer Ausdruck zwischen /…/. Ohne ' +
        'Grossbuchstaben',
      regolaCorsoId:
        'Der Kurs dieser Ereignisse. Null heisst «ist keine Stunde»: Das Ereignis wird ' +
        'nicht mehr vorgeschlagen',
      fasciaTipo: 'Ein Zeitfenster für Unterricht besteht aus ganzen Lektionen',
      fasciaIcs:
        'Wahr, wenn das Zeitfenster die Zeit eines Kalenderereignisses ist; die anderen sind von ' +
        'Hand hinzugefügt und werden beim Abgleichen mit dem Ereignis verschoben. Ist keines ' +
        'markiert, sind es alle',
      nessunCalendario:
        'Das Dokument hat keine ICS-Kalender: Einen fügt man in den Einstellungen hinzu.',
      calendarioId: 'Der Kalender des Dokuments, der gelesen wird. Fehlt er, der erste',
      serveAnno: 'Ohne laufendes Schuljahr braucht es die beiden Daten des Zeitraums.',
      periodoRovescio: 'Der Zeitraum endet, bevor er beginnt.',
      nonSiLegge: 'Der Kalender lässt sich nicht lesen.',
      unoFra: (valori) => `Einer von: ${valori}`,
      scartati: 'Ganztägige Ereignisse und solche, die über zwei Tage gehen',
      diUnGiornoIntero: 'Ganztägig',
      dalle: 'Von',
      alle: 'Bis',
    },
    aggiorna: {
      titolo: 'Lädt einen ICS-Kalender neu herunter und aktualisiert seine Kopie im Dokument',
      calendarioId: 'Der Kalender, der neu gelesen wird',
    },
    aggiungi: {
      titolo: 'Fügt dem Dokument einen ICS-Kalender hinzu, von einer Adresse oder aus einer Datei',
      origine:
        'Eine Adresse https:// oder webcal:// oder der Pfad einer .ics-Datei. Leer öffnet den ' +
        'Dialog, um sie auf dem Datenträger auszuwählen',
      nome:
        'Wie er heissen soll: «Stundenplan der Schule». Fehlt er, aus der Datei oder der Website',
    },
    applica: {
      titolo:
        'Erstellt, gleicht ab oder streicht die im Kalenderabgleich angekreuzten Stunden',
      regole:
        'Die Zuordnungsregeln, alle: Sie ersetzen die gespeicherten. Ohne: Sie bleiben, wie sie ' +
        'sind',
      automatico:
        'Wahr beim Durchgang, der selbst abgleicht: Jede Stunde wird neu geprüft ' +
        '(geplant, ohne Präsenzkontrolle und Texte, ohne Überschneidungen), und eine, die nicht ' +
        'besteht, wird abgelehnt',
      crea: 'Die neuen Stunden, wie sie «calendario.confronta» vorschlägt',
      fasce: 'Die neuen Zeitfenster; fehlen sie, ändert sich die Zeit nicht',
      aula: 'Das neue Zimmer; fehlt es, ändert es sich nicht',
      allinea:
        'Die Stunden, die an die Zeiten des Kalenders angepasst werden. ' +
        'Präsenzkontrolle und Texte bleiben',
      annulla: 'Die Stunden, die als ausgefallen markiert werden. Keine wird gelöscht',
    },
    confronta: {
      titolo: 'Vergleicht die Stunden mit dem ICS-Kalender des Dokuments',
      regole:
        'Die Zuordnungsregeln, die ausprobiert werden. Fehlen sie, die im Dokument gespeicherten',
      dal: 'Ab wann geschaut wird. Fehlt es, ab Beginn des laufenden Schuljahres',
      al: 'Bis wann. Fehlt es, bis zum Ende des laufenden Schuljahres',
      id: 'Die Stunde, oder Kurs|Tag|Zeit für eine, die erstellt werden soll',
      via: (valori) => `Wie der Kurs gefunden wurde: ${valori}`,
      titoli: 'Die Titel der Ereignisse, die darauf fallen',
      differenze: 'Was sich ändern würde, in Worten',
      senzaCorso:
        'Die Ereignisse, die keine Regel einem Kurs zugeordnet hat, nach Titel',
      assenti:
        'Die Stunden, die der Kalender an den Tagen, die er abdeckt, nicht hat. ' +
        'Nur gemeldet',
      presentazione: {
        titolo: 'Der Abgleich mit dem Kalender',
        eventiLetti: 'Gelesene Ereignisse',
        ignorati: 'Wegen Regel ignoriert',
        esito: 'Ergebnis',
        cheCosaCambia: 'Was sich ändert',
        soloNelRegistro: 'Im Klassenbuch, nicht im Kalender',
      },
    },
    eventi: {
      titolo: 'Die Ereignisse des ICS-Kalenders des Dokuments in einem Zeitraum',
      calendarioId: 'Der Kalender des Dokuments, der gelesen wird. Fehlt er, alle',
      dal: 'Ab wann. Fehlt es, ab Beginn des laufenden Schuljahres',
      al: 'Bis wann. Fehlt es, bis zum Ende des laufenden Schuljahres',
      chiave:
        'Der Kalender, die UID des Ereignisses und der Zeitpunkt: unterscheidet die Vorkommen ' +
        'einer Serie',
      calendarioIdUscita: 'Der Kalender, aus dem es stammt',
      annullato: 'Das Ereignis ist als STATUS:CANCELLED markiert',
      motivo: 'Warum er nicht gelesen wurde, in einem Satz, der die Adresse nicht enthält',
      guasti: 'Die Kalender, die sich nicht lesen liessen: Die anderen antworten trotzdem',
      presentazione: {
        titolo: 'Die Ereignisse des Kalenders',
        evento: 'Ereignis',
      },
    },
    modifica: {
      titolo:
        'Benennt einen ICS-Kalender des Dokuments um oder ändert seine Adresse oder seine Datei',
      calendarioId: 'Der Kalender, der geändert wird',
      nome: 'Der neue Name. Fehlt er, bleibt der bisherige',
      origine:
        'Eine neue Adresse oder ein neuer Pfad: wird sofort heruntergeladen. Fehlt sie, bleibt ' +
        'die bisherige',
    },
    togli: {
      titolo: 'Entfernt einen ICS-Kalender samt seiner Kopie aus dem Dokument',
      calendarioId: 'Der Kalender, der entfernt wird',
    },
  },
  fr: {
    comune: {
      regolaId: 'L’identifiant de la règle ; s’il manque, on en crée un',
      regolaTesto:
        'Comment on reconnaît les événements dans le titre ou le lieu : des mots dans n’importe ' +
        'quel ordre, des variantes avec |, un préfixe avec * à la fin, une expression régulière ' +
        'entre /…/. Sans majuscules',
      regolaCorsoId:
        'Le cours de ces événements. Null veut dire « ce n’est pas une leçon » : l’événement ' +
        'n’est plus proposé',
      fasciaTipo: 'Une plage horaire de leçon est faite de périodes entières',
      fasciaIcs:
        'Vrai si la plage est l’heure d’un événement du calendrier ; les autres sont ajoutées à ' +
        'la main et l’alignement les déplace avec l’événement. Si aucune n’est marquée, elles ' +
        'le sont toutes',
      nessunCalendario:
        'Le document n’a pas de calendrier ICS : on en ajoute un depuis les paramètres.',
      calendarioId: 'Le calendrier du document à lire. S’il manque, le premier',
      serveAnno: 'Sans année en cours, il faut les deux dates de la période.',
      periodoRovescio: 'La période finit avant de commencer.',
      nonSiLegge: 'Le calendrier ne se lit pas.',
      unoFra: (valori) => `L’une de ces valeurs : ${valori}`,
      scartati: 'Journées entières et événements à cheval sur deux jours',
      diUnGiornoIntero: 'Sur une journée entière',
      dalle: 'De',
      alle: 'À',
    },
    aggiorna: {
      titolo: 'Retélécharge un calendrier ICS et met à jour sa copie dans le document',
      calendarioId: 'Le calendrier à relire',
    },
    aggiungi: {
      titolo: 'Ajoute un calendrier ICS au document, depuis une adresse ou un fichier',
      origine:
        'Une adresse https:// ou webcal://, ou le chemin d’un fichier .ics. Vide, ouvre la boîte ' +
        'de dialogue pour le choisir sur le disque',
      nome:
        'Comment l’appeler : « Horaire de l’école ». S’il manque, d’après le fichier ou le site',
    },
    applica: {
      titolo: 'Crée, aligne ou annule les leçons cochées dans la comparaison avec le calendrier',
      regole:
        'Les règles d’association, toutes : elles remplacent celles enregistrées. Sans : elles ' +
        'restent telles quelles',
      automatico:
        'Vrai pour le passage qui aligne tout seul : chaque leçon est revérifiée (prévue, sans ' +
        'appel ni textes, sans conflits) et une leçon qui ne passe pas est refusée',
      crea: 'Les nouvelles leçons, telles que les propose « calendario.confronta »',
      fasce: 'Les nouvelles plages ; si elles manquent, l’horaire ne change pas',
      aula: 'La nouvelle salle ; si elle manque, elle ne change pas',
      allinea: 'Les leçons à amener à l’horaire du calendrier. L’appel et les textes restent',
      annulla: 'Les leçons à marquer comme annulées. Aucune n’est effacée',
    },
    confronta: {
      titolo: 'Compare les leçons avec le calendrier ICS du document',
      regole:
        'Les règles d’association à essayer. Si elles manquent, celles enregistrées dans le ' +
        'document',
      dal: 'À partir de quand regarder. S’il manque, depuis le début de l’année en cours',
      al: 'Jusqu’à quand. S’il manque, jusqu’à la fin de l’année en cours',
      id: 'La leçon, ou cours|jour|heure pour une leçon à créer',
      via: (valori) => `Comment le cours a été trouvé : ${valori}`,
      titoli: 'Les titres des événements qui y tombent',
      differenze: 'Ce qui changerait, en mots',
      senzaCorso: 'Les événements qu’aucune règle n’a attribués à un cours, par titre',
      assenti:
        'Les leçons que le calendrier, sur les jours qu’il couvre, n’a pas. Seulement signalées',
      presentazione: {
        titolo: 'La comparaison avec le calendrier',
        eventiLetti: 'Événements lus',
        ignorati: 'Ignorés par une règle',
        esito: 'Résultat',
        cheCosaCambia: 'Ce qui change',
        soloNelRegistro: 'Dans le registre, pas dans le calendrier',
      },
    },
    eventi: {
      titolo: 'Les événements du calendrier ICS du document sur une période',
      calendarioId: 'Le calendrier du document à lire. S’il manque, tous',
      dal: 'À partir de quand. S’il manque, depuis le début de l’année en cours',
      al: 'Jusqu’à quand. S’il manque, jusqu’à la fin de l’année en cours',
      chiave:
        'Le calendrier, l’UID de l’événement et le moment : distingue les occurrences d’une ' +
        'récurrence',
      calendarioIdUscita: 'Le calendrier d’où il vient',
      annullato: 'L’événement est marqué STATUS:CANCELLED',
      motivo: 'Pourquoi il n’a pas été lu, en une phrase qui ne contient pas l’adresse',
      guasti: 'Les calendriers qui n’ont pas pu être lus : les autres répondent quand même',
      presentazione: {
        titolo: 'Les événements du calendrier',
        evento: 'Événement',
      },
    },
    modifica: {
      titolo: 'Renomme un calendrier ICS du document, ou en change l’adresse ou le fichier',
      calendarioId: 'Le calendrier à modifier',
      nome: 'Le nouveau nom. S’il manque, il reste le même',
      origine:
        'Une nouvelle adresse ou un nouveau chemin : téléchargé tout de suite. S’il manque, ' +
        'il reste le même',
    },
    togli: {
      titolo: 'Retire un calendrier ICS du document, avec sa copie',
      calendarioId: 'Le calendrier à retirer',
    },
  },
  en: {
    comune: {
      regolaId: 'The rule’s identifier; if missing, one is made',
      regolaTesto:
        'How events are recognised in the title or location: words in any order, variants ' +
        'with |, prefix with * at the end, regular expression between /…/. No capitals',
      regolaCorsoId:
        'The course of those events. Null means “not a lesson”: the event is no longer proposed',
      fasciaTipo: 'A lesson time slot is made of whole periods',
      fasciaIcs:
        'True if the slot is the time of a calendar event; the others are added by hand and ' +
        'aligning moves them with the event. If none is marked, they all are',
      nessunCalendario:
        'The document has no ICS calendars: add one from the settings.',
      calendarioId: 'The document calendar to read. If missing, the first one',
      serveAnno: 'Without a current year, both dates of the period are needed.',
      periodoRovescio: 'The period ends before it begins.',
      nonSiLegge: 'The calendar cannot be read.',
      unoFra: (valori) => `One of: ${valori}`,
      scartati: 'All-day events and events spanning two days',
      diUnGiornoIntero: 'All-day',
      dalle: 'From',
      alle: 'To',
    },
    aggiorna: {
      titolo: 'Downloads an ICS calendar again and updates its copy in the document',
      calendarioId: 'The calendar to read again',
    },
    aggiungi: {
      titolo: 'Adds an ICS calendar to the document, from an address or a file',
      origine:
        'An https:// or webcal:// address, or the path of an .ics file. Empty opens the dialog ' +
        'to choose it from the disk',
      nome: 'What to call it: “School timetable”. If missing, from the file or the site',
    },
    applica: {
      titolo: 'Creates, aligns or cancels the lessons ticked in the comparison with the calendar',
      regole:
        'The matching rules, all of them: they replace the saved ones. Without them, they stay ' +
        'as ' +
        'they are',
      automatico:
        'True from the round that aligns by itself: every lesson is checked again (planned, no ' +
        'attendance or texts, no clashes) and one that does not pass is refused',
      crea: 'The new lessons, as “calendario.confronta” proposes them',
      fasce: 'The new time slots; if missing, the times do not change',
      aula: 'The new room; if missing, it does not change',
      allinea: 'The lessons to bring into line with the calendar. Attendance and texts stay',
      annulla: 'The lessons to mark as cancelled. None is deleted',
    },
    confronta: {
      titolo: 'Compares the lessons with the document’s ICS calendar',
      regole: 'The matching rules to try. If missing, those saved in the document',
      dal: 'From when to look. If missing, from the start of the current year',
      al: 'Until when. If missing, until the end of the current year',
      id: 'The lesson, or course|day|time for one to be created',
      via: (valori) => `How the course was found: ${valori}`,
      titoli: 'The titles of the events that fall on it',
      differenze: 'What would change, in words',
      senzaCorso: 'The events that no rule assigned to a course, by title',
      assenti: 'The lessons the calendar does not have, on the days it covers. Only reported',
      presentazione: {
        titolo: 'The comparison with the calendar',
        eventiLetti: 'Events read',
        ignorati: 'Ignored by a rule',
        esito: 'Outcome',
        cheCosaCambia: 'What changes',
        soloNelRegistro: 'In the register, not in the calendar',
      },
    },
    eventi: {
      titolo: 'The events of the document’s ICS calendar in a period',
      calendarioId: 'The document calendar to read. If missing, all of them',
      dal: 'From when. If missing, from the start of the current year',
      al: 'Until when. If missing, until the end of the current year',
      chiave:
        'The calendar, the event’s UID and the moment: tells apart the occurrences of a ' +
        'recurring event',
      calendarioIdUscita: 'The calendar it comes from',
      annullato: 'The event is marked STATUS:CANCELLED',
      motivo: 'Why it was not read, in a sentence that does not contain the address',
      guasti: 'The calendars that could not be read: the others answer anyway',
      presentazione: {
        titolo: 'The calendar events',
        evento: 'Event',
      },
    },
    modifica: {
      titolo: 'Renames an ICS calendar of the document, or changes its address or file',
      calendarioId: 'The calendar to change',
      nome: 'The new name. If missing, it stays the same',
      origine: 'A new address or path: downloaded straight away. If missing, it stays the same',
    },
    togli: {
      titolo: 'Removes an ICS calendar from the document, with its copy',
      calendarioId: 'The calendar to remove',
    },
  },
})
