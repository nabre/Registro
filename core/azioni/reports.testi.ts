// I testi di `reports.ts`: un rapporto scritto o una fila di rapporti rifatti.
// `dove` («di CP — DIC2», «di 3 corsi») lo compongono `diCorso`/`diCorsi`, e
// ogni lingua lo inserisce nella sua frase con lo spazio davanti.

import { catalogo, perNumero } from '#core/i18n/index.js'
import { PIF, frase } from '#core/dominio/lexicon.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  giroInterrotto: 'Il documento aperto è cambiato: giro interrotto.',
  senzaModello: (nome: string) => `Il programma non ha un modello «${nome}».`,
  composizioneFallita: (motivo: string) => `Composizione del rapporto non riuscita: ${motivo}`,
  senzaCartella: 'Nessuna cartella di lavoro aperta.',
  diCorso: (titolo: string) => ` di ${titolo}`,
  diCorsi: (quanti: number) => ` di ${quanti} corsi`,
  aggiornatiConErrori: (scritti: number, dove: string, falliti: number, primo: string) =>
    `Regiklass: ${plurale(scritti, 'documento', 'documenti')}${dove} ` +
    `${perNumero(scritti, 'aggiornato', 'aggiornati')}, ${falliti} no. ${primo}`,
  aggiornatiDopo: (scritti: number, dove: string, giorno: string) =>
    `Regiklass: ${plurale(scritti, 'documento', 'documenti')}${dove} ` +
    `${perNumero(scritti, 'aggiornato', 'aggiornati')} dopo la lezione del ${giorno}.`,
  nonRifattiDellaLezione: (giorno: string, motivo: string) =>
    `Regiklass: i documenti della lezione del ${giorno} non si sono potuti rifare: ${motivo}`,
  nonRifatti: (falliti: number, primo: string) =>
    `Regiklass: ${plurale(falliti, 'documento non si è potuto', 'documenti non si sono potuti')} rifare. ${primo}`,
  nonRifattiPerche: (motivo: string) => `Regiklass: i documenti non si sono potuti rifare: ${motivo}`,
  lezioneNonTrovata: 'Lezione non trovata.',
  pianoNonTrovato: 'Piano non trovato.',
  corsoNonTrovato: 'Corso non trovato.',
  momentoNonTrovato: 'Momento di valutazione non trovato.',
  classeNonTrovata: 'Classe non trovata.',
  progettoNonTrovato: 'Progetto non trovato.',
  pifNonTrovato: frase(PIF, 'trovato', { nega: true }),
  rapportoSconosciuto: 'Rapporto sconosciuto.',
  scritto: (relativo: string) => `Rapporto scritto in ${relativo}.`,
  nessunCorso: 'Nessun corso da esportare in quest’anno.',
  giaScritti: (scritti: number) => `${plurale(scritti, 'documento era già scritto', 'documenti erano già scritti')}.`,
  nessunoScritto: (dove: string, primo: string) => `Nessun documento${dove} scritto. ${primo}`,
  scrittiConErrori: (scritti: number, dove: string, falliti: number, primo: string) =>
    `${plurale(scritti, 'documento', 'documenti')}${dove} ` +
    `${perNumero(scritti, 'scritto', 'scritti')}, ${falliti} no. ${primo}`,
  scrittiTutti: (scritti: number, dove: string) =>
    `${plurale(scritti, 'documento', 'documenti')}${dove} ` +
    `${perNumero(scritti, 'scritto', 'scritti')} nella cartella dei dati.`,
}

export const testi = catalogo(it, {
  de: {
    giroInterrotto: 'Inzwischen ist ein anderes Dokument geöffnet: Durchgang abgebrochen.',
    senzaModello: (nome) => `Das Programm hat keine Vorlage «${nome}».`,
    composizioneFallita: (motivo) => `Der Bericht konnte nicht erstellt werden: ${motivo}`,
    senzaCartella: 'Kein Arbeitsordner geöffnet.',
    diCorso: (titolo) => ` von ${titolo}`,
    diCorsi: (quanti) => ` von ${quanti} Kursen`,
    aggiornatiConErrori: (scritti, dove, falliti, primo) =>
      `Regiklass: ${plurale(scritti, 'Dokument', 'Dokumente')}${dove} aktualisiert, ${falliti} nicht. ${primo}`,
    aggiornatiDopo: (scritti, dove, giorno) =>
      `Regiklass: ${plurale(scritti, 'Dokument', 'Dokumente')}${dove} nach der Stunde vom ${giorno} aktualisiert.`,
    nonRifattiDellaLezione: (giorno, motivo) =>
      `Regiklass: Die Dokumente der Stunde vom ${giorno} konnten nicht neu erstellt werden: ${motivo}`,
    nonRifatti: (falliti, primo) =>
      `Regiklass: ${plurale(falliti, 'Dokument konnte', 'Dokumente konnten')} nicht neu erstellt werden. ${primo}`,
    nonRifattiPerche: (motivo) => `Regiklass: Die Dokumente konnten nicht neu erstellt werden: ${motivo}`,
    lezioneNonTrovata: 'Stunde nicht gefunden.',
    pianoNonTrovato: 'Plan nicht gefunden.',
    corsoNonTrovato: 'Kurs nicht gefunden.',
    momentoNonTrovato: 'Leistungsbeurteilung nicht gefunden.',
    classeNonTrovata: 'Klasse nicht gefunden.',
    progettoNonTrovato: 'Projekt nicht gefunden.',
    pifNonTrovato: 'Lernende Person nicht gefunden.',
    rapportoSconosciuto: 'Unbekannter Bericht.',
    scritto: (relativo) => `Bericht gespeichert unter ${relativo}.`,
    nessunCorso: 'Kein Kurs in diesem Schuljahr zu exportieren.',
    giaScritti: (scritti) => `${plurale(scritti, 'Dokument war', 'Dokumente waren')} bereits geschrieben.`,
    nessunoScritto: (dove, primo) => `Kein Dokument${dove} geschrieben. ${primo}`,
    scrittiConErrori: (scritti, dove, falliti, primo) =>
      `${plurale(scritti, 'Dokument', 'Dokumente')}${dove} geschrieben, ${falliti} nicht. ${primo}`,
    scrittiTutti: (scritti, dove) =>
      `${plurale(scritti, 'Dokument', 'Dokumente')}${dove} in den Datenordner geschrieben.`,
  },
  fr: {
    giroInterrotto: 'Un autre document a été ouvert entre-temps : série interrompue.',
    senzaModello: (nome) => `Le programme n’a pas de modèle « ${nome} ».`,
    composizioneFallita: (motivo) => `La composition du rapport a échoué : ${motivo}`,
    senzaCartella: 'Aucun dossier de travail ouvert.',
    diCorso: (titolo) => ` de ${titolo}`,
    diCorsi: (quanti) => ` de ${quanti} cours`,
    aggiornatiConErrori: (scritti, dove, falliti, primo) =>
      `Regiklass : ${plurale(scritti, 'document', 'documents')}${dove} mis à jour, ${falliti} non. ${primo}`,
    aggiornatiDopo: (scritti, dove, giorno) =>
      `Regiklass : ${plurale(scritti, 'document', 'documents')}${dove} mis à jour après la leçon du ${giorno}.`,
    nonRifattiDellaLezione: (giorno, motivo) =>
      `Regiklass : les documents de la leçon du ${giorno} n’ont pas pu être refaits : ${motivo}`,
    nonRifatti: (falliti, primo) =>
      `Regiklass : ${plurale(falliti, 'document n’a pas pu être refait', 'documents n’ont pas pu être refaits')}. ${primo}`,
    nonRifattiPerche: (motivo) => `Regiklass : les documents n’ont pas pu être refaits : ${motivo}`,
    lezioneNonTrovata: 'Leçon introuvable.',
    pianoNonTrovato: 'Plan introuvable.',
    corsoNonTrovato: 'Cours introuvable.',
    momentoNonTrovato: 'Évaluation introuvable.',
    classeNonTrovata: 'Classe introuvable.',
    progettoNonTrovato: 'Projet introuvable.',
    pifNonTrovato: 'Personne en formation introuvable.',
    rapportoSconosciuto: 'Rapport inconnu.',
    scritto: (relativo) => `Rapport enregistré dans ${relativo}.`,
    nessunCorso: 'Aucun cours à exporter pour cette année.',
    giaScritti: (scritti) =>
      `${plurale(scritti, 'document était', 'documents étaient')} déjà ${perNumero(scritti, 'écrit', 'écrits')}.`,
    nessunoScritto: (dove, primo) => `Aucun document${dove} écrit. ${primo}`,
    scrittiConErrori: (scritti, dove, falliti, primo) =>
      `${plurale(scritti, 'document', 'documents')}${dove} ${perNumero(scritti, 'écrit', 'écrits')}, ${falliti} non. ${primo}`,
    scrittiTutti: (scritti, dove) =>
      `${plurale(scritti, 'document', 'documents')}${dove} ${perNumero(scritti, 'écrit', 'écrits')} dans le dossier des données.`,
  },
  en: {
    giroInterrotto: 'A different document is now open: run stopped.',
    senzaModello: (nome) => `The program has no template “${nome}”.`,
    composizioneFallita: (motivo) => `The report could not be composed: ${motivo}`,
    senzaCartella: 'No working folder open.',
    diCorso: (titolo) => ` for ${titolo}`,
    diCorsi: (quanti) => ` for ${quanti} courses`,
    aggiornatiConErrori: (scritti, dove, falliti, primo) =>
      `Regiklass: ${plurale(scritti, 'document', 'documents')}${dove} updated, ${falliti} not. ${primo}`,
    aggiornatiDopo: (scritti, dove, giorno) =>
      `Regiklass: ${plurale(scritti, 'document', 'documents')}${dove} updated after the lesson on ${giorno}.`,
    nonRifattiDellaLezione: (giorno, motivo) =>
      `Regiklass: the documents for the lesson on ${giorno} could not be redone: ${motivo}`,
    nonRifatti: (falliti, primo) =>
      `Regiklass: ${plurale(falliti, 'document', 'documents')} could not be redone. ${primo}`,
    nonRifattiPerche: (motivo) => `Regiklass: the documents could not be redone: ${motivo}`,
    lezioneNonTrovata: 'Lesson not found.',
    pianoNonTrovato: 'Plan not found.',
    corsoNonTrovato: 'Course not found.',
    momentoNonTrovato: 'Assessment not found.',
    classeNonTrovata: 'Class not found.',
    progettoNonTrovato: 'Project not found.',
    pifNonTrovato: 'Learner not found.',
    rapportoSconosciuto: 'Unknown report.',
    scritto: (relativo) => `Report written to ${relativo}.`,
    nessunCorso: 'No course to export this year.',
    giaScritti: (scritti) => `${plurale(scritti, 'document had', 'documents had')} already been written.`,
    nessunoScritto: (dove, primo) => `No document${dove} written. ${primo}`,
    scrittiConErrori: (scritti, dove, falliti, primo) =>
      `${plurale(scritti, 'document', 'documents')}${dove} written, ${falliti} not. ${primo}`,
    scrittiTutti: (scritti, dove) =>
      `${plurale(scritti, 'document', 'documents')}${dove} written to the data folder.`,
  },
})
