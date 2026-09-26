// I testi delle impostazioni del documento d'anno (`settings/document.ts`).

import { catalogo } from '../../../i18n/index.js'
import { PIF, un } from '../../../domain/lexicon.js'
import { plurale } from '../../../domain/text.js'

const it = {
  // Quel che l'host ha corretto in silenzio, detto dopo il salvataggio.
  scostamenti: {
    minutiUd: 'durata dell’unità didattica',
    oraInizioGiornata: 'prima ora della giornata',
    oraFineGiornata: 'ultima ora della giornata',
    durataPausaPredefinita: 'durata della pausa',
    durataSlotPredefinita: 'durata della fascia',
    passoFineSemestre: 'passo della nota di fine semestre',
    sogliaAssenza: 'soglia di assenza',
    scalaMin: 'voto minimo',
    scalaMax: 'voto massimo',
    sufficienza: 'sufficienza',
    passoVoti: 'passo dei voti',
    altezzaLogo: 'altezza del logo',
  },
  portataA: (etichetta: string, valore: string) => `${etichetta} portata a ${valore}`,
  serveUnNumero: (etichetta: string) => `«${etichetta}» non è cambiata: serve un numero.`,
  serveUnOrario: (etichetta: string) => `«${etichetta}» non è cambiata: serve un orario.`,
  salvate: 'Impostazioni salvate.',
  salvateCorrette: (scarti: string) => `Impostazioni salvate, corrette: ${scarti}.`,

  // La valutazione.
  scala: 'Scala dei voti',
  scalaAiuto:
    'valori proposti per un nuovo momento di valutazione; ogni momento può poi avere la sua',
  votoMinimo: 'Voto minimo',
  votoMassimo: 'Voto massimo',
  sufficienza: 'Sufficienza',
  passoVoti: 'Passo dei voti',
  passoVotiFormato: '0.25 = mezzi e quarti',
  passoFineSemestre: 'Passo della nota di fine semestre',
  passoFineSemestreFormato: '0.5 = mezzi punti; 0 = non arrotondare',
  sogliaAssenza: 'Segnala l’assenza oltre il',
  sogliaAssenzaFormato: 'in percento; 0 = nessuna segnalazione',

  // Le materie.
  materie: 'Materie',
  materieAiuto: 'classe + anno + materia fanno il programma a cui appartengono i piani lezione',
  nuovaMateria: 'Nuova materia',
  nessunaMateria: 'Nessuna materia',
  nessunaMateriaTesto:
    'Finché non ce n’è una, le classi non hanno corsi e le lezioni non sanno di che ' +
    'cosa parlano.',
  contiMateria: (classi: number, corsi: number, piani: number) =>
    `${plurale(classi, 'classe', 'classi')} · ` +
    `${plurale(corsi, 'corso', 'corsi')} · ${plurale(piani, 'piano', 'piani')}`,
  modificaMateria: 'Modifica la materia',
  unisciMateria: 'Unisci questa materia a un’altra',
  eliminaMateria: 'Elimina la materia',
  materiaEliminata: (nome: string) => `Materia «${nome}» eliminata.`,

  // Il file.
  documento: 'Documento e dati',
  documentoAiuto: 'l’anno aperto è un file solo: dentro ci stanno i dati e i documenti. ',
  documentoDentro:
    `Dentro il documento stanno anche i file: le schede di ${un(PIF)}, i rapporti stampati, ` +
    'le scansioni archiviate. Spostare il file vuol dire spostare l’anno intero.',
  apriAltro: 'Apri un altro registro…',
  apriAltroAiuto: 'Sceglie un documento d’anno con il dialogo del sistema',
  mostraNellaCartella: 'Mostra nella cartella',
  ricarica: 'Ricarica',
  ricaricaAiuto: 'Rilegge il documento dal disco: serve se lo ha cambiato qualcun altro',
  ricaricati: 'Dati ricaricati dal disco.',
  provvisorio: (nome: string) =>
    `«${nome}» è un anno nuovo non ancora salvato: sta in una ` +
    'cartella provvisoria del programma. Salvalo con nome per scegliere come ' +
    'chiamarlo e dove tenerlo.',
  salvaConNome: 'Salva l’anno con nome…',
  nessunDocumento:
    'Nessun documento aperto: il registro sta lavorando su niente, e quel che si scrive ' +
    'non ha dove andare.',
  sintesi: {
    anni: 'anni',
    classi: 'classi',
    lezioni: 'lezioni',
    piani: 'piani',
    valutazioni: 'valutazioni',
  },
  riferimenti: 'Riferimenti che non tornano',
  eAltri: (quanti: number) => `…e altri ${quanti}.`,
  tuttiTornano: 'Tutti i riferimenti fra classi, lezioni, piani e valutazioni tornano.',
}

export const testi = catalogo(it, {
  de: {
    scostamenti: {
      minutiUd: 'Dauer der Lektion',
      oraInizioGiornata: 'erste Uhrzeit des Tages',
      oraFineGiornata: 'letzte Uhrzeit des Tages',
      durataPausaPredefinita: 'Dauer der Pause',
      durataSlotPredefinita: 'Dauer des Zeitfensters',
      passoFineSemestre: 'Schritt der Semesternote',
      sogliaAssenza: 'Absenzengrenze',
      scalaMin: 'tiefste Note',
      scalaMax: 'höchste Note',
      sufficienza: 'genügende Note',
      passoVoti: 'Notenschritt',
      altezzaLogo: 'Höhe des Logos',
    },
    portataA: (etichetta, valore) => `${etichetta} auf ${valore} gesetzt`,
    serveUnNumero: (etichetta) => `«${etichetta}» wurde nicht geändert: Es braucht eine Zahl.`,
    serveUnOrario: (etichetta) => `«${etichetta}» wurde nicht geändert: Es braucht eine Uhrzeit.`,
    salvate: 'Einstellungen gespeichert.',
    salvateCorrette: (scarti) => `Einstellungen gespeichert, korrigiert: ${scarti}.`,
    scala: 'Notenskala',
    scalaAiuto:
      'vorgeschlagene Werte für eine neue Leistungsbeurteilung; jede Beurteilung kann danach ' +
      'ihre eigenen haben',
    votoMinimo: 'Tiefste Note',
    votoMassimo: 'Höchste Note',
    sufficienza: 'Genügend ab',
    passoVoti: 'Notenschritt',
    passoVotiFormato: '0.25 = halbe und Viertelnoten',
    passoFineSemestre: 'Schritt der Semesternote',
    passoFineSemestreFormato: '0.5 = halbe Noten; 0 = nicht runden',
    sogliaAssenza: 'Absenz melden über',
    sogliaAssenzaFormato: 'in Prozent; 0 = keine Meldung',
    materie: 'Fächer',
    materieAiuto:
      'Klasse + Jahr + Fach ergeben das Programm, zu dem die Unterrichtspläne gehören',
    nuovaMateria: 'Neues Fach',
    nessunaMateria: 'Kein Fach',
    nessunaMateriaTesto:
      'Solange es keines gibt, haben die Klassen keine Kurse, und die Stunden wissen ' +
      'nicht, wovon sie handeln.',
    contiMateria: (classi, corsi, piani) =>
      `${plurale(classi, 'Klasse', 'Klassen')} · ` +
      `${plurale(corsi, 'Kurs', 'Kurse')} · ${plurale(piani, 'Plan', 'Pläne')}`,
    modificaMateria: 'Fach bearbeiten',
    unisciMateria: 'Dieses Fach mit einem anderen zusammenführen',
    eliminaMateria: 'Fach löschen',
    materiaEliminata: (nome) => `Fach «${nome}» gelöscht.`,
    documento: 'Dokument und Daten',
    documentoAiuto:
      'das offene Jahr ist eine einzige Datei: Darin stecken die Daten und die Dokumente. ',
    documentoDentro:
      'Im Dokument stecken auch die Dateien: die Blätter der Lernenden, die gedruckten ' +
      'Berichte, die archivierten Scans. Die Datei verschieben heisst, das ganze Jahr verschieben.',
    apriAltro: 'Anderes Klassenbuch öffnen…',
    apriAltroAiuto: 'Wählt ein Jahresdokument im Dialog des Systems',
    mostraNellaCartella: 'Im Ordner anzeigen',
    ricarica: 'Neu laden',
    ricaricaAiuto:
      'Liest das Dokument neu von der Festplatte: nötig, wenn jemand anderes es geändert hat',
    ricaricati: 'Daten von der Festplatte neu geladen.',
    provvisorio: (nome) =>
      `«${nome}» ist ein neues, noch nicht gespeichertes Jahr: Es liegt in einem provisorischen ` +
      'Ordner des Programms. Speichere es unter einem Namen, um zu wählen, wie es heisst und ' +
      'wo es liegt.',
    salvaConNome: 'Schuljahr speichern unter…',
    nessunDocumento:
      'Kein Dokument offen: Das Klassenbuch arbeitet mit nichts, und was man schreibt, hat ' +
      'keinen Ort.',
    sintesi: {
      anni: 'Jahre',
      classi: 'Klassen',
      lezioni: 'Stunden',
      piani: 'Pläne',
      valutazioni: 'Beurteilungen',
    },
    riferimenti: 'Verweise, die nicht aufgehen',
    eAltri: (quanti) => `…und ${quanti} weitere.`,
    tuttiTornano:
      'Alle Verweise zwischen Klassen, Stunden, Plänen und Beurteilungen gehen auf.',
  },
  fr: {
    scostamenti: {
      minutiUd: 'durée de la période',
      oraInizioGiornata: 'première heure de la journée',
      oraFineGiornata: 'dernière heure de la journée',
      durataPausaPredefinita: 'durée de la pause',
      durataSlotPredefinita: 'durée de la plage horaire',
      passoFineSemestre: 'pas de la note semestrielle',
      sogliaAssenza: 'seuil d’absence',
      scalaMin: 'note minimale',
      scalaMax: 'note maximale',
      sufficienza: 'seuil de suffisance',
      passoVoti: 'pas des notes',
      altezzaLogo: 'hauteur du logo',
    },
    portataA: (etichetta, valore) => `${etichetta} → ${valore}`,
    serveUnNumero: (etichetta) => `« ${etichetta} » n’a pas changé : il faut un nombre.`,
    serveUnOrario: (etichetta) => `« ${etichetta} » n’a pas changé : il faut une heure.`,
    salvate: 'Paramètres enregistrés.',
    salvateCorrette: (scarti) => `Paramètres enregistrés, avec des corrections : ${scarti}.`,
    scala: 'Barème',
    scalaAiuto:
      'valeurs proposées pour une nouvelle évaluation ; chaque évaluation peut ensuite avoir ' +
      'les siennes',
    votoMinimo: 'Note minimale',
    votoMassimo: 'Note maximale',
    sufficienza: 'Seuil de suffisance',
    passoVoti: 'Pas des notes',
    passoVotiFormato: '0.25 = demis et quarts',
    passoFineSemestre: 'Pas de la note semestrielle',
    passoFineSemestreFormato: '0.5 = demi-points ; 0 = ne pas arrondir',
    sogliaAssenza: 'Signaler l’absence au-delà de',
    sogliaAssenzaFormato: 'en pour cent ; 0 = aucun signalement',
    materie: 'Branches',
    materieAiuto:
      'classe + année + branche forment le programme auquel appartiennent les plans de leçon',
    nuovaMateria: 'Nouvelle branche',
    nessunaMateria: 'Aucune branche',
    nessunaMateriaTesto:
      'Tant qu’il n’y en a pas, les classes n’ont pas de cours et les leçons ne savent pas de ' +
      'quoi elles parlent.',
    contiMateria: (classi, corsi, piani) =>
      `${plurale(classi, 'classe', 'classes')} · ` +
      `${plurale(corsi, 'cours', 'cours')} · ${plurale(piani, 'plan', 'plans')}`,
    modificaMateria: 'Modifier la branche',
    unisciMateria: 'Fusionner cette branche avec une autre',
    eliminaMateria: 'Supprimer la branche',
    materiaEliminata: (nome) => `Branche « ${nome} » supprimée.`,
    documento: 'Document et données',
    documentoAiuto:
      'l’année ouverte est un seul fichier : il contient les données et les documents. ',
    documentoDentro:
      'Le document contient aussi les fichiers : les fiches des personnes en formation, les ' +
      'rapports imprimés, les scans archivés. Déplacer le fichier, c’est déplacer ' +
      'l’année entière.',
    apriAltro: 'Ouvrir un autre registre…',
    apriAltroAiuto: 'Choisit un document d’année avec la boîte de dialogue du système',
    mostraNellaCartella: 'Afficher dans le dossier',
    ricarica: 'Recharger',
    ricaricaAiuto:
      'Relit le document depuis le disque : utile si quelqu’un d’autre l’a modifié',
    ricaricati: 'Données rechargées depuis le disque.',
    provvisorio: (nome) =>
      `« ${nome} » est une nouvelle année pas encore enregistrée : elle se trouve dans un ` +
      'dossier provisoire du programme. Enregistre-la sous un nom pour choisir comment ' +
      'l’appeler et où la garder.',
    salvaConNome: 'Enregistrer l’année sous…',
    nessunDocumento:
      'Aucun document ouvert : le registre ne travaille sur rien, et ce qu’on écrit n’a nulle ' +
      'part où aller.',
    sintesi: {
      anni: 'années',
      classi: 'classes',
      lezioni: 'leçons',
      piani: 'plans',
      valutazioni: 'évaluations',
    },
    riferimenti: 'Références qui ne collent pas',
    eAltri: (quanti) => `…et ${quanti} autres.`,
    tuttiTornano:
      'Toutes les références entre classes, leçons, plans et évaluations collent.',
  },
  en: {
    scostamenti: {
      minutiUd: 'length of the period',
      oraInizioGiornata: 'first hour of the day',
      oraFineGiornata: 'last hour of the day',
      durataPausaPredefinita: 'length of the break',
      durataSlotPredefinita: 'length of the time slot',
      passoFineSemestre: 'step of the semester grade',
      sogliaAssenza: 'absence threshold',
      scalaMin: 'lowest grade',
      scalaMax: 'highest grade',
      sufficienza: 'pass mark',
      passoVoti: 'grade step',
      altezzaLogo: 'logo height',
    },
    portataA: (etichetta, valore) => `${etichetta} set to ${valore}`,
    serveUnNumero: (etichetta) => `“${etichetta}” was not changed: a number is needed.`,
    serveUnOrario: (etichetta) => `“${etichetta}” was not changed: a time is needed.`,
    salvate: 'Settings saved.',
    salvateCorrette: (scarti) => `Settings saved, corrected: ${scarti}.`,
    scala: 'Grading scale',
    scalaAiuto: 'values proposed for a new assessment; each assessment can then have its own',
    votoMinimo: 'Lowest grade',
    votoMassimo: 'Highest grade',
    sufficienza: 'Pass mark',
    passoVoti: 'Grade step',
    passoVotiFormato: '0.25 = halves and quarters',
    passoFineSemestre: 'Step of the semester grade',
    passoFineSemestreFormato: '0.5 = half points; 0 = no rounding',
    sogliaAssenza: 'Flag absence above',
    sogliaAssenzaFormato: 'as a percentage; 0 = no flagging',
    materie: 'Subjects',
    materieAiuto: 'class + year + subject make the programme the lesson plans belong to',
    nuovaMateria: 'New subject',
    nessunaMateria: 'No subjects',
    nessunaMateriaTesto:
      'Until there is one, classes have no courses and lessons don’t know what they are about.',
    contiMateria: (classi, corsi, piani) =>
      `${plurale(classi, 'class', 'classes')} · ` +
      `${plurale(corsi, 'course', 'courses')} · ${plurale(piani, 'plan', 'plans')}`,
    modificaMateria: 'Edit the subject',
    unisciMateria: 'Merge this subject into another',
    eliminaMateria: 'Delete the subject',
    materiaEliminata: (nome) => `Subject “${nome}” deleted.`,
    documento: 'Document and data',
    documentoAiuto: 'the open year is a single file: it holds the data and the documents. ',
    documentoDentro:
      'The document also holds the files: the learner sheets, the printed reports, the ' +
      'archived scans. Moving the file means moving the whole year.',
    apriAltro: 'Open another register…',
    apriAltroAiuto: 'Chooses a year document with the system dialog',
    mostraNellaCartella: 'Show in folder',
    ricarica: 'Reload',
    ricaricaAiuto: 'Reads the document again from disk: useful if someone else has changed it',
    ricaricati: 'Data reloaded from disk.',
    provvisorio: (nome) =>
      `“${nome}” is a new year that has not been saved yet: it sits in a temporary folder of ` +
      'the program. Save it with a name to choose what to call it and where to keep it.',
    salvaConNome: 'Save the year as…',
    nessunDocumento:
      'No document open: the register is working on nothing, and whatever you write has ' +
      'nowhere to go.',
    sintesi: {
      anni: 'years',
      classi: 'classes',
      lezioni: 'lessons',
      piani: 'plans',
      valutazioni: 'assessments',
    },
    riferimenti: 'References that don’t add up',
    eAltri: (quanti) => `…and ${quanti} more.`,
    tuttiTornano: 'All references between classes, lessons, plans and assessments add up.',
  },
})
