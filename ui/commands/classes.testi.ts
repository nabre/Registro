// I testi dei comandi delle classi e del docente di classe (`classes.ts`). La
// guida cita i nomi dei pulsanti fra virgolette: cambiandone uno va cambiato
// anche là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'
import { PIF } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'

const it = {
  selezionaClasse: 'Seleziona una classe di cui sei docente',
  primaUnCorso: 'Crea prima un corso per questa classe',
  // Le persone e la classe.
  nuovaPersona: `Nuova ${PIF.singolare}`,
  nuovaPersonaAiuto:
    'Una persona nuova in una classe dell’anno: la classe si sceglie, se ce n’è più d’una',
  aggiungiAlGruppo: 'Aggiungi al gruppo',
  incollaElenco: 'Incolla elenco',
  incollaElencoAiuto:
    'Un elenco copiato da un foglio diventa il gruppo della classe',
  importaClasse: 'Importa classe dall’anno…',
  importaClasseAiuto: `Una classe di un altro anno, con le sue ${PIF.plurale} e se si vuole i suoi corsi`,
  nessunAltroAnno:
    'Fra i recenti non c’è un altro anno da cui portare una classe.',
  nuovaComunicazione: 'Nuova comunicazione',
  nuovoPeriodoAssenze: 'Nuovo periodo assenze',
  nuovoPeriodoAssenzeAiuto:
    'Il foglio delle assenze da far firmare, per un periodo',
  // Il docente di classe.
  nuovaPendenza: 'Nuova pendenza',
  chiediDocumento: 'Chiedi un documento',
  caricaPdf: 'Carica dei PDF',
  rileggiScansioni: 'Rileggi le scansioni',
  rileggiScansioniAiuto:
    'Rimette in coda la lettura di tutte le pagine ancora da smistare, in tutti i PDF di ' +
    'questa classe. Le pagine già archiviate restano dove sono.',
  ocrSpento: 'La lettura automatica delle scansioni è spenta',
  nessunPdf: 'Non c’è nessun PDF da dividere',
  nuovoPeriodo: 'Nuovo periodo',
  nuovoRecapito: 'Nuovo recapito',
}

export const testi = catalogo(it, {
  de: {
    selezionaClasse: 'Wähle eine Klasse, deren Klassenlehrperson du bist',
    primaUnCorso: 'Erstelle zuerst einen Kurs für diese Klasse',
    nuovaPersona: 'Neue Lernende',
    nuovaPersonaAiuto:
      'Eine neue Person in einer Klasse des Schuljahrs: Die Klasse wählt man, wenn es mehrere gibt',
    aggiungiAlGruppo: 'Zur Gruppe hinzufügen',
    incollaElenco: 'Liste einfügen',
    incollaElencoAiuto:
      'Eine aus einer Tabelle kopierte Liste wird zur Gruppe der Klasse',
    importaClasse: 'Klasse aus einem Jahr importieren…',
    importaClasseAiuto:
      'Eine Klasse aus einem anderen Schuljahr, mit ihren Lernenden und, wenn gewünscht, ihren ' +
      'Kursen',
    nessunAltroAnno:
      'Unter den zuletzt geöffneten gibt es kein anderes Schuljahr, aus dem man eine Klasse ' +
      'holen könnte.',
    nuovaComunicazione: 'Neue Mitteilung',
    nuovoPeriodoAssenze: 'Neuer Absenzzeitraum',
    nuovoPeriodoAssenzeAiuto:
      'Das Absenzenblatt zum Unterschreiben, für einen Zeitraum',
    nuovaPendenza: 'Neue Pendenz',
    chiediDocumento: 'Ein Dokument verlangen',
    caricaPdf: 'PDFs laden',
    rileggiScansioni: 'Scans neu lesen',
    rileggiScansioniAiuto:
      'Stellt das Lesen aller noch zuzuordnenden Seiten in allen PDFs dieser Klasse wieder in ' +
      'die Warteschlange. Schon archivierte Seiten bleiben, wo sie sind.',
    ocrSpento: 'Das automatische Lesen der Scans ist ausgeschaltet',
    nessunPdf: 'Es gibt kein PDF zum Aufteilen',
    nuovoPeriodo: 'Neuer Zeitraum',
    nuovoRecapito: 'Neue Kontaktadresse',
  },
  fr: {
    selezionaClasse: 'Choisis une classe dont tu es maître de classe',
    primaUnCorso: 'Crée d’abord un cours pour cette classe',
    nuovaPersona: 'Nouvelle personne en formation',
    nuovaPersonaAiuto:
      'Une nouvelle personne dans une classe de l’année : on choisit la classe, s’il y en a ' +
      'plusieurs',
    aggiungiAlGruppo: 'Ajouter au groupe',
    incollaElenco: 'Coller la liste',
    incollaElencoAiuto:
      'Une liste copiée depuis un tableau devient le groupe de la classe',
    importaClasse: 'Importer une classe d’une année…',
    importaClasseAiuto: `Une classe d’une autre année, avec ses ${lessico().pif.plurale} et, si on veut, ses cours`,
    nessunAltroAnno:
      'Parmi les récents, il n’y a pas d’autre année d’où reprendre une classe.',
    nuovaComunicazione: 'Nouvelle communication',
    nuovoPeriodoAssenze: 'Nouvelle période d’absence',
    nuovoPeriodoAssenzeAiuto:
      'La feuille des absences à faire signer, pour une période',
    nuovaPendenza: 'Nouvelle tâche en suspens',
    chiediDocumento: 'Demander un document',
    caricaPdf: 'Charger des PDF',
    rileggiScansioni: 'Relire les scans',
    rileggiScansioniAiuto:
      'Remet en file la lecture de toutes les pages encore à trier, dans tous les PDF de ' +
      'cette classe. Les pages déjà archivées restent où elles sont.',
    ocrSpento: 'La lecture automatique des scans est désactivée',
    nessunPdf: 'Il n’y a aucun PDF à diviser',
    nuovoPeriodo: 'Nouvelle période',
    nuovoRecapito: 'Nouvelle adresse de contact',
  },
  en: {
    selezionaClasse: 'Select a class you are the class teacher of',
    primaUnCorso: 'Create a course for this class first',
    nuovaPersona: 'New learner',
    nuovaPersonaAiuto:
      'A new person in a class of the year: you choose the class, if there is more than one',
    aggiungiAlGruppo: 'Add to group',
    incollaElenco: 'Paste list',
    incollaElencoAiuto:
      'A list copied from a spreadsheet becomes the class group',
    importaClasse: 'Import class from year…',
    importaClasseAiuto: `A class from another year, with its ${lessico().pif.plurale} and, if you like, its courses`,
    nessunAltroAnno:
      'Among the recent ones there is no other year to bring a class from.',
    nuovaComunicazione: 'New message',
    nuovoPeriodoAssenze: 'New absence period',
    nuovoPeriodoAssenzeAiuto: 'The absence sheet to be signed, for one period',
    nuovaPendenza: 'New pending item',
    chiediDocumento: 'Request a document',
    caricaPdf: 'Load PDFs',
    rileggiScansioni: 'Reread the scans',
    rileggiScansioniAiuto:
      'Queues again the reading of all the pages still to sort, in all this class’s PDFs. ' +
      'Pages already filed stay where they are.',
    ocrSpento: 'Automatic reading of scans is off',
    nessunPdf: 'There is no PDF to split',
    nuovoPeriodo: 'New period',
    nuovoRecapito: 'New contact address',
  },
})
