// I testi della pagina Classi (`classes.ts`).
import { catalogo } from '../../i18n/index.js'
import { PERSONE, PIF, del } from '../../domain/lexicon.js'

const it = {
  // La tabella delle persone.
  classeVuota: 'Classe ancora vuota',
  comeSiRiempie: `Le ${PIF.plurale} si aggiungono una per una, oppure incollando l’elenco.`,
  aggiungiPif: `Aggiungi ${PIF.singolare}`,
  incollaElenco: 'Incolla elenco',
  nascita: 'Nascita',
  indirizzoDatore: `Indirizzo ${del(PERSONE.datore)}`,
  emailDatore: `E-mail ${del(PERSONE.datore)}`,
  apriScheda: `Apri la scheda ${del(PIF)}`,
  nonFrequenta: 'non frequenta',

  // I dettagli della classe.
  coloreNelCalendario: 'Colore nel calendario',
  coloreDellaClasse: 'Il colore della classe nel calendario',
  noteSullaClasse: 'Note sulla classe',
  eliminaClasse: 'Elimina la classe…',
  cosaSiPortaVia: 'Toglie la classe con le sue persone, i corsi e quel che vi si aggancia',
  /** Il nome della classe: non è `parole().nome`, che è il nome di una persona. */
  nomeClasse: 'Nome',
  sonoDocenteDiClasse: 'Sono docente di classe',
  aiutoDocenteDiClasse:
    'Raccogli documenti e scrivi alle famiglie: compare il pannello del docente di classe',
  archiviata: 'Archiviata',
  aiutoArchiviata: 'Esce dagli elenchi dell’anno e dalla matrice dei corsi; resta nello storico',

  // Importa classe dall'anno.
  nessunAltroAnno: 'Non c’è un altro anno fra i recenti da cui portare una classe.',
  nomeNuovaClasse: 'Nome della nuova classe',
  aiutoNome:
    'Di norma la stessa sigla, o quella dell’anno dopo: «II MEC A» che diventa «III MEC A»',
  lettura: 'Lettura…',
  nessunaClasse: 'Nessuna classe',
  nonSiLegge: 'Quel documento non si legge.',
  nessunaClasseInQuellAnno: 'Nessuna classe in quell’anno',
  titoloImporta: 'Importa classe dall’anno…',
  aiutoImporta:
    'Una classe di un altro anno portata in questo. L’altro documento si legge soltanto: ' +
    'non si apre e non cambia. Lezioni, voti e piani restano là.',
  dallAnno: 'Dall’anno',
  anagrafica: 'Anagrafica e foto',
  aiutoAnagrafica:
    `Le ${PIF.plurale} della classe con i loro dati e le foto. Senza, la classe arriva vuota`,
  corsiEMaterie: 'Corsi e materie',
  aiutoCorsi:
    'I corsi della classe con il loro orario. Una materia che qui ha lo stesso nome si ' +
    'usa quella; le altre si aggiungono',
  obbligatori: 'Anno, classe e nome sono obbligatori.',
  importata: (nome: string) => `Classe ${nome} importata.`,

  // La pagina.
  classiInUnAnno: 'Le classi appartengono a un anno.',
  titolo: `Classi e ${PIF.plurale}`,
  anno: (etichetta: string) => `anno ${etichetta}`,
  aiuto: 'recapiti, indirizzi e datori di lavoro',
  archiviataMinuscolo: 'archiviata',
  nessunaClasseTitolo: 'Nessuna classe',
  cheCosEUnaClasse: `Una classe raccoglie le ${PIF.plurale} e tiene insieme lezioni e valutazioni.`,
  primaClasse: 'Crea la prima classe',
}

export const testi = catalogo(it, {
  de: {
    classeVuota: 'Klasse noch leer',
    comeSiRiempie: 'Lernende fügst du einzeln hinzu, oder du fügst die ganze Liste ein.',
    aggiungiPif: 'Lernende hinzufügen',
    incollaElenco: 'Liste einfügen',
    nascita: 'Geburtsdatum',
    indirizzoDatore: 'Adresse Arbeitgeber',
    emailDatore: 'E-Mail Arbeitgeber',
    apriScheda: 'Personenblatt der lernenden Person öffnen',
    nonFrequenta: 'besucht nicht mehr',
    coloreNelCalendario: 'Farbe im Kalender',
    coloreDellaClasse: 'Die Farbe der Klasse im Kalender',
    noteSullaClasse: 'Notizen zur Klasse',
    eliminaClasse: 'Klasse löschen…',
    cosaSiPortaVia: 'Entfernt die Klasse mit ihren Personen, den Kursen und allem, was daran hängt',
    nomeClasse: 'Name',
    sonoDocenteDiClasse: 'Ich bin Klassenlehrperson',
    aiutoDocenteDiClasse:
      'Dokumente einsammeln und den Familien schreiben: Das Panel der Klassenlehrperson erscheint',
    archiviata: 'Archiviert',
    aiutoArchiviata:
      'Verschwindet aus den Listen des Jahres und aus der Kursmatrix; bleibt im Verlauf erhalten',
    nessunAltroAnno:
      'Unter den zuletzt geöffneten gibt es kein anderes Jahr, aus dem du eine Klasse ' +
      'holen kannst.',
    nomeNuovaClasse: 'Name der neuen Klasse',
    aiutoNome:
      'Meist dasselbe Kürzel oder das des folgenden Jahres: «II MEC A» wird zu «III MEC A»',
    lettura: 'Wird gelesen…',
    nessunaClasse: 'Keine Klasse',
    nonSiLegge: 'Dieses Dokument lässt sich nicht lesen.',
    nessunaClasseInQuellAnno: 'Keine Klasse in diesem Jahr',
    titoloImporta: 'Klasse aus einem Jahr importieren…',
    aiutoImporta:
      'Eine Klasse aus einem anderen Jahr, in dieses übernommen. Das andere Dokument wird nur ' +
      'gelesen: Es wird weder geöffnet noch verändert. Stunden, Noten und Pläne ' +
      'bleiben dort.',
    dallAnno: 'Aus dem Jahr',
    anagrafica: 'Personalien und Fotos',
    aiutoAnagrafica:
      'Die Lernenden der Klasse mit ihren Daten und Fotos. Ohne kommt die Klasse leer an',
    corsiEMaterie: 'Kurse und Fächer',
    aiutoCorsi:
      'Die Kurse der Klasse mit ihrem Stundenplan. Gibt es hier ein Fach mit demselben Namen, ' +
      'wird dieses verwendet; die anderen kommen dazu',
    obbligatori: 'Jahr, Klasse und Name sind Pflicht.',
    importata: (nome) => `Klasse ${nome} importiert.`,
    classiInUnAnno: 'Klassen gehören zu einem Schuljahr.',
    titolo: 'Klassen und Lernende',
    anno: (etichetta) => `Jahr ${etichetta}`,
    aiuto: 'Kontaktadressen, Wohnadressen und Arbeitgeber',
    archiviataMinuscolo: 'archiviert',
    nessunaClasseTitolo: 'Keine Klassen',
    cheCosEUnaClasse:
      'Eine Klasse fasst die Lernenden zusammen und hält Stunden und ' +
      'Beurteilungen beisammen.',
    primaClasse: 'Erste Klasse anlegen',
  },
  fr: {
    classeVuota: 'Classe encore vide',
    comeSiRiempie:
      'Les personnes en formation s’ajoutent une par une, ou en collant la liste.',
    aggiungiPif: 'Ajouter une personne en formation',
    incollaElenco: 'Coller la liste',
    nascita: 'Naissance',
    indirizzoDatore: 'Adresse de l’employeur',
    emailDatore: 'E-mail de l’employeur',
    apriScheda: 'Ouvrir la fiche de la personne en formation',
    nonFrequenta: 'ne suit plus',
    coloreNelCalendario: 'Couleur dans le calendrier',
    coloreDellaClasse: 'La couleur de la classe dans le calendrier',
    noteSullaClasse: 'Notes sur la classe',
    eliminaClasse: 'Supprimer la classe…',
    cosaSiPortaVia: 'Retire la classe avec ses personnes, ses cours et tout ce qui s’y rattache',
    nomeClasse: 'Nom',
    sonoDocenteDiClasse: 'Je suis maître de classe',
    aiutoDocenteDiClasse:
      'Recueille des documents et écris aux familles : le panneau du maître de classe apparaît',
    archiviata: 'Archivée',
    aiutoArchiviata:
      'Sort des listes de l’année et de la matrice des cours ; reste dans l’historique',
    nessunAltroAnno: 'Il n’y a pas d’autre année parmi les récentes d’où reprendre une classe.',
    nomeNuovaClasse: 'Nom de la nouvelle classe',
    aiutoNome:
      'En général le même sigle, ou celui de l’année suivante : ' +
      '« II MEC A » qui devient « III MEC A »',
    lettura: 'Lecture…',
    nessunaClasse: 'Aucune classe',
    nonSiLegge: 'Ce document ne peut pas être lu.',
    nessunaClasseInQuellAnno: 'Aucune classe cette année-là',
    titoloImporta: 'Importer une classe d’une année…',
    aiutoImporta:
      'Une classe d’une autre année reprise dans celle-ci. L’autre document est seulement lu : ' +
      'il ne s’ouvre pas et ne change pas. Leçons, notes et plans restent là-bas.',
    dallAnno: 'De l’année',
    anagrafica: 'Données personnelles et photos',
    aiutoAnagrafica:
      'Les personnes en formation de la classe avec leurs données et leurs photos. Sans, la ' +
      'classe arrive vide',
    corsiEMaterie: 'Cours et branches',
    aiutoCorsi:
      'Les cours de la classe avec leur horaire. Une branche qui porte ici le même nom est ' +
      'reprise telle quelle ; les autres s’ajoutent',
    obbligatori: 'L’année, la classe et le nom sont obligatoires.',
    importata: (nome) => `Classe ${nome} importée.`,
    classiInUnAnno: 'Les classes appartiennent à une année.',
    titolo: 'Classes et personnes en formation',
    anno: (etichetta) => `année ${etichetta}`,
    aiuto: 'adresses de contact, domiciles et employeurs',
    archiviataMinuscolo: 'archivée',
    nessunaClasseTitolo: 'Aucune classe',
    cheCosEUnaClasse:
      'Une classe réunit les personnes en formation et rassemble leçons et évaluations.',
    primaClasse: 'Créer la première classe',
  },
  en: {
    classeVuota: 'Class still empty',
    comeSiRiempie: 'Learners are added one by one, or by pasting the list.',
    aggiungiPif: 'Add learner',
    incollaElenco: 'Paste list',
    nascita: 'Date of birth',
    indirizzoDatore: 'Employer’s address',
    emailDatore: 'Employer’s email',
    apriScheda: 'Open the learner’s record',
    nonFrequenta: 'no longer attending',
    coloreNelCalendario: 'Colour in the calendar',
    coloreDellaClasse: 'The class’s colour in the calendar',
    noteSullaClasse: 'Notes on the class',
    eliminaClasse: 'Delete the class…',
    cosaSiPortaVia: 'Removes the class with its people, its courses and everything attached to it',
    nomeClasse: 'Name',
    sonoDocenteDiClasse: 'I’m the class teacher',
    aiutoDocenteDiClasse:
      'Collect documents and write to families: the class teacher panel appears',
    archiviata: 'Archived',
    aiutoArchiviata: 'Leaves the year’s lists and the course matrix; stays in the history',
    nessunAltroAnno: 'There’s no other year among the recent ones to bring a class from.',
    nomeNuovaClasse: 'Name of the new class',
    aiutoNome: 'Usually the same code, or next year’s: “II MEC A” becoming “III MEC A”',
    lettura: 'Reading…',
    nessunaClasse: 'No class',
    nonSiLegge: 'That document can’t be read.',
    nessunaClasseInQuellAnno: 'No classes in that year',
    titoloImporta: 'Import class from year…',
    aiutoImporta:
      'A class from another year brought into this one. The other document is only read: ' +
      'it isn’t opened and doesn’t change. Lessons, grades and plans stay there.',
    dallAnno: 'From year',
    anagrafica: 'Personal details and photos',
    aiutoAnagrafica:
      'The class’s learners with their details and photos. Without them, the class arrives empty',
    corsiEMaterie: 'Courses and subjects',
    aiutoCorsi:
      'The class’s courses with their timetable. A subject with the same name here is used ' +
      'as is; the others are added',
    obbligatori: 'Year, class and name are required.',
    importata: (nome) => `Class ${nome} imported.`,
    classiInUnAnno: 'Classes belong to a school year.',
    titolo: 'Classes and learners',
    anno: (etichetta) => `year ${etichetta}`,
    aiuto: 'contact addresses, home addresses and employers',
    archiviataMinuscolo: 'archived',
    nessunaClasseTitolo: 'No classes',
    cheCosEUnaClasse: 'A class groups the learners and holds lessons and assessments together.',
    primaClasse: 'Create the first class',
  },
})
