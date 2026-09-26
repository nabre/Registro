// I testi di `context.ts` e le frasi comuni a tutte le azioni (voce sparita,
// file, invii, guasti di sistema), scritte una volta sola perché restino uguali.

import { catalogo } from '../i18n/index.js'
import {
  CARTE,
  LEZIONE,
  PIF,
  SCUOLA,
  VALUTAZIONE,
  accorda,
  frase,
  type Termine,
} from '../domain/lexicon.js'

/** «Corso non trovato: forse è già sparito.», accordato al genere del termine. */
function sparita (termine: Termine): string {
  return `${frase(termine, 'trovato', { nega: true }).slice(0, -1)}: forse è già ` +
    `${accorda(termine, 'sparito')}.`
}

const it = {
  /** Che cosa vuol dire, per chi legge, un errore di sistema. */
  motiviDiSistema: {
    EBUSY: 'il file è aperto in un altro programma',
    EPERM: 'il sistema non lascia toccare il file (aperto altrove, o protetto)',
    EACCES: 'mancano i permessi sul file',
    ENOENT: 'il file non c’è più',
    ENOSPC: 'il disco è pieno',
    ENAMETOOLONG: 'il nome del file è troppo lungo',
    EEXIST: 'il file c’è già',
  } as Record<string, string>,
  erroreImprevisto: 'errore imprevisto',
  erroreDiSistema: (codice: string) => `errore di sistema ${codice}`,

  // ----------------------------------------------------------- giro di invii
  nientePartito: (falliti: readonly string[]) => `Non è partito niente. ${falliti.join(' · ')}`,
  nonATutti: (inParte: readonly string[]) => ` Non a tutti gli indirizzi: ${inParte.join(' · ')}`,
  rimastiIndietro: (partiti: string, falliti: readonly string[], nonATutti: string) =>
    `${partiti}. Rimasti indietro: ${falliti.join(' · ')}${nonATutti}`,
  nienteDaSpedire: 'Non c’è niente da spedire.',
  bozzeNonPreparate: 'Le bozze non si sono potute preparare.',

  // ------------------------------------------------------------------- file
  senzaFile: (etichetta: string) => `«${etichetta}» non ha un file.`,
  fuoriDallAnno: (etichetta: string) => `Il file di «${etichetta}» non è più dentro l’anno.`,
  nonApribile: (etichetta: string) =>
    `Il file di «${etichetta}» c'è, ma non si è potuto aprire da qui.`,
  /** Il tasto del dialogo che sceglie un file da allegare. */
  allega: 'Allega',
  copiaNonRiuscita: (errore: string) => `Copia non riuscita: ${errore}`,
  senzaAnno: 'Nessun anno scolastico aperto: i documenti si archiviano dentro un anno.',
  nessunAnno: 'Nessun anno aperto.',

  // -------------------------------------------------------- quel che manca
  nonTrovato: {
    allegato: 'Allegato non trovato.',
    anno: 'Anno scolastico non trovato.',
    classe: 'Classe non trovata.',
    comunicazione: 'Comunicazione non trovata.',
    consegna: 'Consegna non trovata.',
    corso: 'Corso non trovato.',
    lezione: 'Lezione non trovata.',
    materia: 'Materia non trovata.',
    momento: 'Momento di valutazione non trovato.',
    periodo: 'Periodo non trovato.',
    pif: frase(PIF, 'trovato', { nega: true }),
    piano: 'Piano non trovato.',
    risorsa: 'Risorsa non trovata.',
  },
  /** Le stesse, per quel che è sparito fra la domanda e la scrittura. */
  sparito: {
    consegna: 'Consegna non trovata: forse è già sparita.',
    momento: 'Momento di valutazione non trovato: forse è già sparito.',
  },
  /** Quel che `suVoce` non trova più, per raccolta. */
  vociSparite: {
    lezioni: sparita(LEZIONE.lezione),
    piani: sparita(LEZIONE.pianoLezione),
    valutazioni: sparita(VALUTAZIONE.momento),
    consegne: sparita(CARTE.consegna),
    classi: sparita(SCUOLA.classe),
    corsi: sparita(SCUOLA.corso),
    smistamenti: sparita(CARTE.smistamento),
    anni: sparita(SCUOLA.annoScolastico),
    materie: sparita(SCUOLA.materia),
  },

  fuoriClasse: 'Quella persona non è nella classe del corso.',
  classeDellaConsegna: 'La classe della consegna non esiste.',
  documentoCambiato: 'Il documento aperto è cambiato: non è stato scritto niente.',
  nonCePiu: 'Non c’è più: forse è già sparito.',
  classeSparita: 'La classe non c’è più: forse è già stata eliminata.',
  nienteDaEliminare: 'Non c’è più niente da eliminare: forse è già sparito.',
}

export const testi = catalogo(it, {
  de: {
    motiviDiSistema: {
      EBUSY: 'die Datei ist in einem anderen Programm geöffnet',
      EPERM: 'das System lässt die Datei nicht ändern (anderswo geöffnet oder geschützt)',
      EACCES: 'es fehlen die Berechtigungen für die Datei',
      ENOENT: 'die Datei ist nicht mehr da',
      ENOSPC: 'der Datenträger ist voll',
      ENAMETOOLONG: 'der Dateiname ist zu lang',
      EEXIST: 'die Datei gibt es schon',
    },
    erroreImprevisto: 'unerwarteter Fehler',
    erroreDiSistema: (codice) => `Systemfehler ${codice}`,
    nientePartito: (falliti) => `Es wurde nichts verschickt. ${falliti.join(' · ')}`,
    nonATutti: (inParte) => ` Nicht an alle Adressen: ${inParte.join(' · ')}`,
    rimastiIndietro: (partiti, falliti, nonATutti) =>
      `${partiti}. Nicht verschickt: ${falliti.join(' · ')}${nonATutti}`,
    nienteDaSpedire: 'Es gibt nichts zu verschicken.',
    bozzeNonPreparate: 'Die Entwürfe konnten nicht vorbereitet werden.',
    senzaFile: (etichetta) => `«${etichetta}» hat keine Datei.`,
    fuoriDallAnno: (etichetta) => `Die Datei von «${etichetta}» ist nicht mehr im Schuljahr.`,
    nonApribile: (etichetta) =>
      `Die Datei von «${etichetta}» ist da, liess sich aber von hier aus nicht öffnen.`,
    allega: 'Anhängen',
    copiaNonRiuscita: (errore) => `Kopieren fehlgeschlagen: ${errore}`,
    senzaAnno: 'Kein Schuljahr geöffnet: Die Dokumente werden in einem Schuljahr abgelegt.',
    nessunAnno: 'Kein Schuljahr geöffnet.',
    nonTrovato: {
      allegato: 'Anhang nicht gefunden.',
      anno: 'Schuljahr nicht gefunden.',
      classe: 'Klasse nicht gefunden.',
      comunicazione: 'Mitteilung nicht gefunden.',
      consegna: 'Auftrag nicht gefunden.',
      corso: 'Kurs nicht gefunden.',
      lezione: 'Stunde nicht gefunden.',
      materia: 'Fach nicht gefunden.',
      momento: 'Leistungsbeurteilung nicht gefunden.',
      periodo: 'Zeitraum nicht gefunden.',
      pif: 'Lernende Person nicht gefunden.',
      piano: 'Plan nicht gefunden.',
      risorsa: 'Ressource nicht gefunden.',
    },
    sparito: {
      consegna: 'Auftrag nicht gefunden: Vielleicht ist er schon weg.',
      momento: 'Leistungsbeurteilung nicht gefunden: Vielleicht ist sie schon weg.',
    },
    vociSparite: {
      lezioni: 'Stunde nicht gefunden: Vielleicht ist sie schon weg.',
      piani: 'Unterrichtsplan nicht gefunden: Vielleicht ist er schon weg.',
      valutazioni: 'Leistungsbeurteilung nicht gefunden: Vielleicht ist sie schon weg.',
      consegne: 'Auftrag nicht gefunden: Vielleicht ist er schon weg.',
      classi: 'Klasse nicht gefunden: Vielleicht ist sie schon weg.',
      corsi: 'Kurs nicht gefunden: Vielleicht ist er schon weg.',
      smistamenti: 'Zuordnung nicht gefunden: Vielleicht ist sie schon weg.',
      anni: 'Schuljahr nicht gefunden: Vielleicht ist es schon weg.',
      materie: 'Fach nicht gefunden: Vielleicht ist es schon weg.',
    },
    fuoriClasse: 'Diese Person ist nicht in der Klasse des Kurses.',
    classeDellaConsegna: 'Die Klasse des Auftrags gibt es nicht.',
    documentoCambiato: 'Inzwischen ist ein anderes Dokument geöffnet: Es wurde nichts gespeichert.',
    nonCePiu: 'Nicht mehr da: Vielleicht ist es schon weg.',
    classeSparita: 'Die Klasse ist nicht mehr da: Vielleicht wurde sie schon gelöscht.',
    nienteDaEliminare: 'Es gibt nichts mehr zu löschen: Vielleicht ist es schon weg.',
  },
  fr: {
    motiviDiSistema: {
      EBUSY: 'le fichier est ouvert dans un autre programme',
      EPERM: 'le système ne laisse pas toucher au fichier (ouvert ailleurs, ou protégé)',
      EACCES: 'les droits d’accès au fichier manquent',
      ENOENT: 'le fichier n’existe plus',
      ENOSPC: 'le disque est plein',
      ENAMETOOLONG: 'le nom du fichier est trop long',
      EEXIST: 'le fichier existe déjà',
    },
    erroreImprevisto: 'erreur inattendue',
    erroreDiSistema: (codice) => `erreur système ${codice}`,
    nientePartito: (falliti) => `Rien n’est parti. ${falliti.join(' · ')}`,
    nonATutti: (inParte) => ` Pas à toutes les adresses : ${inParte.join(' · ')}`,
    rimastiIndietro: (partiti, falliti, nonATutti) =>
      `${partiti}. Non envoyés : ${falliti.join(' · ')}${nonATutti}`,
    nienteDaSpedire: 'Il n’y a rien à envoyer.',
    bozzeNonPreparate: 'Les brouillons n’ont pas pu être préparés.',
    senzaFile: (etichetta) => `« ${etichetta} » n’a pas de fichier.`,
    fuoriDallAnno: (etichetta) =>
      `Le fichier de « ${etichetta} » n’est plus dans l’année.`,
    nonApribile: (etichetta) =>
      `Le fichier de « ${etichetta} » existe, mais il n’a pas pu être ouvert d’ici.`,
    allega: 'Joindre',
    copiaNonRiuscita: (errore) => `Copie impossible : ${errore}`,
    senzaAnno:
      'Aucune année scolaire ouverte : les documents sont archivés à l’intérieur d’une année.',
    nessunAnno: 'Aucune année ouverte.',
    nonTrovato: {
      allegato: 'Pièce jointe introuvable.',
      anno: 'Année scolaire introuvable.',
      classe: 'Classe introuvable.',
      comunicazione: 'Communication introuvable.',
      consegna: 'Devoir introuvable.',
      corso: 'Cours introuvable.',
      lezione: 'Leçon introuvable.',
      materia: 'Branche introuvable.',
      momento: 'Évaluation introuvable.',
      periodo: 'Période introuvable.',
      pif: 'Personne en formation introuvable.',
      piano: 'Plan introuvable.',
      risorsa: 'Ressource introuvable.',
    },
    sparito: {
      consegna: 'Devoir introuvable : il a peut-être déjà disparu.',
      momento: 'Évaluation introuvable : elle a peut-être déjà disparu.',
    },
    vociSparite: {
      lezioni: 'Leçon introuvable : elle a peut-être déjà disparu.',
      piani: 'Plan de leçon introuvable : il a peut-être déjà disparu.',
      valutazioni: 'Évaluation introuvable : elle a peut-être déjà disparu.',
      consegne: 'Devoir introuvable : il a peut-être déjà disparu.',
      classi: 'Classe introuvable : elle a peut-être déjà disparu.',
      corsi: 'Cours introuvable : il a peut-être déjà disparu.',
      smistamenti: 'Tri introuvable : il a peut-être déjà disparu.',
      anni: 'Année scolaire introuvable : elle a peut-être déjà disparu.',
      materie: 'Branche introuvable : elle a peut-être déjà disparu.',
    },
    fuoriClasse: 'Cette personne n’est pas dans la classe du cours.',
    classeDellaConsegna: 'La classe du devoir n’existe pas.',
    documentoCambiato: 'Un autre document a été ouvert entre-temps : rien n’a été enregistré.',
    nonCePiu: 'Il n’existe plus : il a peut-être déjà disparu.',
    classeSparita: 'La classe n’existe plus : elle a peut-être déjà été supprimée.',
    nienteDaEliminare: 'Il n’y a plus rien à supprimer : tout a peut-être déjà disparu.',
  },
  en: {
    motiviDiSistema: {
      EBUSY: 'the file is open in another program',
      EPERM: 'the system won’t let the file be changed (open elsewhere, or protected)',
      EACCES: 'you don’t have permission to access the file',
      ENOENT: 'the file is no longer there',
      ENOSPC: 'the disk is full',
      ENAMETOOLONG: 'the file name is too long',
      EEXIST: 'the file already exists',
    },
    erroreImprevisto: 'unexpected error',
    erroreDiSistema: (codice) => `system error ${codice}`,
    nientePartito: (falliti) => `Nothing was sent. ${falliti.join(' · ')}`,
    nonATutti: (inParte) => ` Not to every address: ${inParte.join(' · ')}`,
    rimastiIndietro: (partiti, falliti, nonATutti) =>
      `${partiti}. Not sent: ${falliti.join(' · ')}${nonATutti}`,
    nienteDaSpedire: 'There’s nothing to send.',
    bozzeNonPreparate: 'The drafts couldn’t be prepared.',
    senzaFile: (etichetta) => `“${etichetta}” has no file.`,
    fuoriDallAnno: (etichetta) => `The file for “${etichetta}” is no longer in the year.`,
    nonApribile: (etichetta) =>
      `The file for “${etichetta}” is there, but it couldn’t be opened from here.`,
    allega: 'Attach',
    copiaNonRiuscita: (errore) => `Copy failed: ${errore}`,
    senzaAnno: 'No school year open: documents are filed inside a year.',
    nessunAnno: 'No year open.',
    nonTrovato: {
      allegato: 'Attachment not found.',
      anno: 'School year not found.',
      classe: 'Class not found.',
      comunicazione: 'Message not found.',
      consegna: 'Assignment not found.',
      corso: 'Course not found.',
      lezione: 'Lesson not found.',
      materia: 'Subject not found.',
      momento: 'Assessment not found.',
      periodo: 'Period not found.',
      pif: 'Learner not found.',
      piano: 'Plan not found.',
      risorsa: 'Resource not found.',
    },
    sparito: {
      consegna: 'Assignment not found: it may already have gone.',
      momento: 'Assessment not found: it may already have gone.',
    },
    vociSparite: {
      lezioni: 'Lesson not found: it may already have gone.',
      piani: 'Lesson plan not found: it may already have gone.',
      valutazioni: 'Assessment not found: it may already have gone.',
      consegne: 'Assignment not found: it may already have gone.',
      classi: 'Class not found: it may already have gone.',
      corsi: 'Course not found: it may already have gone.',
      smistamenti: 'Sorting not found: it may already have gone.',
      anni: 'School year not found: it may already have gone.',
      materie: 'Subject not found: it may already have gone.',
    },
    fuoriClasse: 'That person isn’t in the course’s class.',
    classeDellaConsegna: 'The assignment’s class doesn’t exist.',
    documentoCambiato: 'A different document is now open: nothing was saved.',
    nonCePiu: 'It’s no longer there: it may already have gone.',
    classeSparita: 'The class is no longer there: it may already have been deleted.',
    nienteDaEliminare: 'There’s nothing left to delete: it may already have gone.',
  },
})
