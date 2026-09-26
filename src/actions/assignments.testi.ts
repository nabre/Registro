// I testi di `assignments.ts`: consegne, documenti raccolti e distribuiti per posta.

import { catalogo } from '../i18n/index.js'
import { PIF, quanti } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'
import { plurale } from '../domain/text.js'

const it = {
  corsoAssente: 'Il corso della consegna non esiste.',
  documentoRaccolto:
    'Quella consegna ha un documento raccolto: togli prima il documento, ' +
    'altrimenti se ne andrebbe con la spunta.',
  raccogli: 'Raccogli',
  perTuttiTitolo: (testo: string) => `${testo} — lo stesso per tutti`,
  /** Le code del nome del file archiviato, quando non è di una persona. */
  fileMio: 'mio',
  filePerTutti: 'per tutti',
  nessunoPronto: 'Non c’è nessun documento pronto da aprire.',
  giaTolto: 'Non c’è nessun documento da togliere: è già stato tolto.',
  siRaccoglie: 'Questa richiesta si raccoglie, non si consegna.',
  senzaDocumento: (nome: string) => `${nome}: nessun documento pronto`,
  senzaIndirizzo: (nome: string) => `${nome}: nessun indirizzo`,
  fuoriAnno: (nome: string) => `${nome}: documento non più nell’anno`,
  spediti: (n: number) => plurale(n, 'documento spedito', 'documenti spediti'),
  domanda: (testo: string, n: number) => `Spedire «${testo}» a ${quanti(n, PIF)}?`,
  dettaglio: `Una e-mail per ${PIF.singolare}, con il suo documento in allegato.`,
  nientePartito: 'Non è partito niente: i documenti restano da mandare.',
  bozzePronte: (n: number, dove: string) =>
    `${n} bozze pronte in ${dove}. Mandale una alla volta dal programma ` +
    `di posta e spunta ogni ${PIF.singolare} quando il suo documento è partito.`,
  cambiatoDurante: (partiti: number, segnati: number) =>
    `${plurale(partiti, 'documento spedito', 'documenti spediti')}, ma il documento aperto ` +
    `è cambiato: ${segnati} segnati, gli altri no.`,
}

export const testi = catalogo(it, {
  de: {
    corsoAssente: 'Den Kurs des Auftrags gibt es nicht.',
    documentoRaccolto:
      'Zu diesem Auftrag wurde ein Dokument eingesammelt: Entferne zuerst das Dokument, ' +
      'sonst würde es mit dem Häkchen verschwinden.',
    raccogli: 'Einsammeln',
    perTuttiTitolo: (testo) => `${testo} — dasselbe für alle`,
    fileMio: 'meins',
    filePerTutti: 'für alle',
    nessunoPronto: 'Es gibt kein Dokument, das zum Öffnen bereit ist.',
    giaTolto: 'Es gibt kein Dokument zu entfernen: Es wurde schon entfernt.',
    siRaccoglie: 'Diese Anfrage wird eingesammelt, nicht ausgehändigt.',
    senzaDocumento: (nome) => `${nome}: kein Dokument bereit`,
    senzaIndirizzo: (nome) => `${nome}: keine Adresse`,
    fuoriAnno: (nome) => `${nome}: Dokument nicht mehr im Schuljahr`,
    spediti: (n) => plurale(n, 'Dokument verschickt', 'Dokumente verschickt'),
    domanda: (testo, n) => `«${testo}» an ${quanti(n, lessico.in('de').pif)} verschicken?`,
    dettaglio: 'Eine E-Mail pro lernende Person, mit ihrem Dokument im Anhang.',
    nientePartito: 'Es wurde nichts verschickt: Die Dokumente bleiben zu versenden.',
    bozzePronte: (n, dove) =>
      `${plurale(n, 'Entwurf', 'Entwürfe')} bereit in ${dove}. Verschicke sie einzeln aus dem ` +
      'E-Mail-Programm und hake jede lernende Person ab, sobald ihr Dokument verschickt ist.',
    cambiatoDurante: (partiti, segnati) =>
      `${plurale(partiti, 'Dokument verschickt', 'Dokumente verschickt')}, aber inzwischen ist ` +
      `ein anderes Dokument geöffnet: ${segnati} abgehakt, die anderen nicht.`,
  },
  fr: {
    corsoAssente: 'Le cours du devoir n’existe pas.',
    documentoRaccolto:
      'Ce devoir a un document recueilli : retire d’abord le document, ' +
      'sinon il disparaîtrait avec la coche.',
    raccogli: 'Recueillir',
    perTuttiTitolo: (testo) => `${testo} — le même pour tous`,
    fileMio: 'le mien',
    filePerTutti: 'pour tous',
    nessunoPronto: 'Il n’y a aucun document prêt à ouvrir.',
    giaTolto: 'Il n’y a aucun document à retirer : il a déjà été retiré.',
    siRaccoglie: 'Cette demande se recueille, elle ne se remet pas.',
    senzaDocumento: (nome) => `${nome} : aucun document prêt`,
    senzaIndirizzo: (nome) => `${nome} : aucune adresse`,
    fuoriAnno: (nome) => `${nome} : le document n’est plus dans l’année`,
    spediti: (n) => plurale(n, 'document envoyé', 'documents envoyés'),
    domanda: (testo, n) => `Envoyer « ${testo} » à ${quanti(n, lessico.in('fr').pif)} ?`,
    dettaglio: 'Un e-mail par personne en formation, avec son document en pièce jointe.',
    nientePartito: 'Rien n’est parti : les documents restent à envoyer.',
    bozzePronte: (n, dove) =>
      `${plurale(n, 'brouillon prêt', 'brouillons prêts')} dans ${dove}. Envoie-les un par un ` +
      'depuis le programme de messagerie et coche chaque personne en formation quand son ' +
      'document est parti.',
    cambiatoDurante: (partiti, segnati) =>
      `${plurale(partiti, 'document envoyé', 'documents envoyés')}, mais un autre document ` +
      `a été ouvert entre-temps : ${segnati} cochés, les autres non.`,
  },
  en: {
    corsoAssente: 'The assignment’s course doesn’t exist.',
    documentoRaccolto:
      'That assignment has a collected document: remove the document first, ' +
      'otherwise it would disappear along with the tick.',
    raccogli: 'Collect',
    perTuttiTitolo: (testo) => `${testo} — the same for everyone`,
    fileMio: 'mine',
    filePerTutti: 'for everyone',
    nessunoPronto: 'There’s no document ready to open.',
    giaTolto: 'There’s no document to remove: it has already been removed.',
    siRaccoglie: 'This request is collected, not handed out.',
    senzaDocumento: (nome) => `${nome}: no document ready`,
    senzaIndirizzo: (nome) => `${nome}: no address`,
    fuoriAnno: (nome) => `${nome}: document no longer in the year`,
    spediti: (n) => plurale(n, 'document sent', 'documents sent'),
    domanda: (testo, n) => `Send “${testo}” to ${quanti(n, lessico.in('en').pif)}?`,
    dettaglio: 'One email per learner, with their document attached.',
    nientePartito: 'Nothing was sent: the documents are still to be sent.',
    bozzePronte: (n, dove) =>
      `${plurale(n, 'draft', 'drafts')} ready in ${dove}. Send them one at a time from the ` +
      'email program and tick each learner when their document has gone.',
    cambiatoDurante: (partiti, segnati) =>
      `${plurale(partiti, 'document sent', 'documents sent')}, but a different document ` +
      `is now open: ${segnati} ticked, the others not.`,
  },
})
