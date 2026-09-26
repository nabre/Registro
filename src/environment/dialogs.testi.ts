// Testi dei messaggi del guscio: il titolo di ripiego e la finestra dell'anno
// scritto da un registro più recente. Le parole comuni («Chiudi», «Annulla»…)
// le dà `parole()`.

import { catalogo } from '../i18n/index.js'

/** Quale versione del documento supera quella che il registro sa leggere. */
type CosaVersione = 'dati' | 'formato'

const it = {
  /** Titolo di un errore troppo lungo per fare da titolo. */
  qualcosaNonÈAndato: 'Qualcosa non è andato',

  // L'anno da un registro più recente
  nonLoApre:
    'Questo registro non lo apre: dentro ci possono essere cose che non sa leggere, e ' +
    'alla prima scrittura andrebbero perse. Il file resta com’è.',
  aggiornaDaQui:
    'Aggiorna il registro — anche da Impostazioni › Programma › Aggiornamenti — e poi riaprilo, ' +
    'oppure apri un altro anno.',
  aggiornaAMano: 'Scarica la versione nuova del registro e poi riaprilo, oppure apri un altro anno.',
  apriUnAltroAnno: 'Apri un altro anno…',
  scaricaLaNuova: 'Scarica la versione nuova',
  titoloPiùRecente: 'Anno da un registro più recente',
  vieneDaUnPiùRecente: (file: string) => `«${file}» viene da un registro più recente`,
  ilFile: (cosa: CosaVersione) =>
    `Il file, ${cosa === 'dati' ? 'versione dei dati' : 'versione del formato'}`,
  questoArrivaA: (versione: string) => `Questo registro (${versione}) arriva a`,
}

export const testi = catalogo(it, {
  de: {
    qualcosaNonÈAndato: 'Etwas hat nicht geklappt',
    nonLoApre:
      'Dieses Klassenbuch öffnet es nicht: Es könnte Dinge enthalten, die es nicht lesen kann, ' +
      'und beim ersten Speichern gingen sie verloren. Die Datei bleibt, wie sie ist.',
    aggiornaDaQui:
      'Aktualisiere das Klassenbuch — auch unter Einstellungen › Programm › Aktualisierungen — ' +
      'und öffne es dann wieder, oder öffne ein anderes Schuljahr.',
    aggiornaAMano:
      'Lade die neue Version des Klassenbuchs herunter und öffne es dann wieder, oder öffne ein ' +
      'anderes Schuljahr.',
    apriUnAltroAnno: 'Anderes Schuljahr öffnen…',
    scaricaLaNuova: 'Neue Version herunterladen',
    titoloPiùRecente: 'Schuljahr aus einem neueren Klassenbuch',
    vieneDaUnPiùRecente: (file) => `«${file}» stammt aus einem neueren Klassenbuch`,
    ilFile: (cosa) => `Die Datei, ${cosa === 'dati' ? 'Datenversion' : 'Formatversion'}`,
    questoArrivaA: (versione) => `Dieses Klassenbuch (${versione}) reicht bis`,
  },
  fr: {
    qualcosaNonÈAndato: 'Quelque chose n’a pas marché',
    nonLoApre:
      'Ce registre ne l’ouvre pas : il peut contenir des choses qu’il ne sait pas lire, et elles ' +
      'seraient perdues au premier enregistrement. Le fichier reste tel quel.',
    aggiornaDaQui:
      'Mets à jour le registre — aussi depuis Paramètres › Programme › Mises à jour — puis ' +
      'rouvre-le, ou ouvre une autre année.',
    aggiornaAMano:
      'Télécharge la nouvelle version du registre puis rouvre-le, ou ouvre une autre année.',
    apriUnAltroAnno: 'Ouvrir une autre année…',
    scaricaLaNuova: 'Télécharger la nouvelle version',
    titoloPiùRecente: 'Année d’un registre plus récent',
    vieneDaUnPiùRecente: (file) => `« ${file} » vient d’un registre plus récent`,
    ilFile: (cosa) => `Le fichier, ${cosa === 'dati' ? 'version des données' : 'version du format'}`,
    questoArrivaA: (versione) => `Ce registre (${versione}) va jusqu’à`,
  },
  en: {
    qualcosaNonÈAndato: 'Something went wrong',
    nonLoApre:
      'This register won’t open it: it may contain things it cannot read, and they would be ' +
      'lost the first time it saved. The file stays as it is.',
    aggiornaDaQui:
      'Update the register — also from Settings › Program › Updates — and then reopen it, or ' +
      'open another year.',
    aggiornaAMano: 'Download the new version of the register and then reopen it, or open another year.',
    apriUnAltroAnno: 'Open another year…',
    scaricaLaNuova: 'Download the new version',
    titoloPiùRecente: 'Year from a newer register',
    vieneDaUnPiùRecente: (file) => `“${file}” comes from a newer register`,
    ilFile: (cosa) => `The file, ${cosa === 'dati' ? 'data version' : 'format version'}`,
    questoArrivaA: (versione) => `This register (${versione}) goes up to`,
  },
})
