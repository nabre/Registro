// I testi di `classTeacher.ts`: il foglio delle firme di consegna, le
// comunicazioni alle famiglie, i fogli delle assenze e le richieste di firma.

import { catalogo } from '../i18n/index.js'
import { PIF, del } from '../domain/lexicon.js'
import { plurale } from '../domain/text.js'

const it = {
  firmeDi: (testo: string) => `Firme di consegna — ${testo}`,
  /** Il foglio delle firme: coda del nome del file, e nome del file da aprire. */
  fileFirme: 'firme di consegna',
  firme: 'Firme di consegna',
  nessunFoglioFirme: 'Non c’è nessun foglio firme.',
  nessunDocumento: 'Nessun documento da aprire.',
  nienteDaTogliere: 'Non c’è niente da togliere.',
  giaPartita: 'Questa comunicazione è già partita.',
  senzaIndirizzi: 'Nessun destinatario ha un indirizzo valido: la comunicazione resta bozza.',
  allegatoIlleggibile: (testo: string) => `L’allegato «${testo}» non si riesce a leggere.`,
  laComunicazione: 'la comunicazione',
  domandaComunicazione: (oggetto: string, n: number) => `Spedire «${oggetto}» a ${n} destinatari?`,
  dettaglioComunicazione: 'Partono dalla casella del registro, in copia nascosta.',
  nientePartitoComunicazione: 'Non è partito niente: la comunicazione resta com’era.',
  /** Il nome della bozza di una comunicazione senza oggetto. */
  comunicazione: 'Comunicazione',
  bozzaNonPreparata: 'La bozza non si è potuta preparare.',
  bozzaAperta: (n: number, percorso: string) =>
    `Bozza per ${n} destinatari in copia nascosta aperta nel programma di ` +
    `posta: ${percorso}. Quando l’hai spedita, spuntala nell’elenco.`,
  speditaMaCambiato: (n: number) =>
    `Comunicazione spedita a ${n} destinatari, ma il documento aperto è cambiato: ` +
    'non è stata segnata come inviata.',
  speditaNonATutti: (n: number, avviso: string) =>
    `Comunicazione spedita a ${n} destinatari, ma non a tutti: ${avviso}`,
  spedita: (n: number) => `Comunicazione spedita a ${n} destinatari.`,
  riportataABozza: 'Comunicazione riportata a bozza.',
  segnataSpedita: (n: number) => `Comunicazione segnata come spedita a ${n} destinatari.`,
  senzaFrequentanti: `La classe non ha ${PIF.plurale} che frequentano.`,
  assegnatiConFuori: (presi: number, fuori: readonly string[]) =>
    `${presi} fogli assegnati. Non riconosciuti: ${fuori.join(', ')}. ` +
    `Vanno aggiunti dalla casella ${del(PIF)}.`,
  assegnati: (presi: number) => `${presi} fogli assegnati.`,
  nessunFoglioDaAprire: 'Nessun foglio da aprire.',
  nessunFoglioDaTogliere: 'Nessun foglio da togliere.',
  nessunFoglioDaAllegare: (nome: string) => `${nome}: nessun foglio da allegare`,
  nessunIndirizzo: (chi: readonly string[]) => `nessun indirizzo (${chi.join(', ')})`,
  allegatoNonLeggibile: (nome: string) => `allegato «${nome}» non leggibile`,
  /** Il nome della bozza di una richiesta di firma. */
  richiestaDiFirma: 'Richiesta di firma',
  spediteRichieste: (n: number) =>
    plurale(n, 'richiesta di firma spedita', 'richieste di firma spedite'),
  domandaRichieste: (n: number) => `Spedire ${n} richieste di firma?`,
  dettaglioRichieste: (periodo: string) =>
    `Una per ${PIF.singolare}, agli indirizzi del periodo ${periodo}.`,
  nientePartitoRichieste: 'Non è partito niente: le richieste restano da mandare.',
  bozzePronte: (n: number, dove: string) =>
    `${n} bozze pronte in ${dove}. Mandale una alla volta dal programma ` +
    `di posta e spunta ogni ${PIF.singolare} quando la sua richiesta è partita.`,
  partiteMaCambiato: (partite: number, segnate: number) =>
    `${partite} richieste di firma partite, ma il documento aperto è ` +
    `cambiato: ${segnate} segnate, le altre no.`,
  richiestaNonTrovata: 'Richiesta non trovata.',
  riportataDaMandare: (nome: string) => `Richiesta di ${nome} riportata da mandare.`,
  richiestaSpedita: (nome: string) => `Richiesta di ${nome} segnata come spedita.`,
}

export const testi = catalogo(it, {
  de: {
    firmeDi: (testo) => `Übergabe-Unterschriften — ${testo}`,
    fileFirme: 'Übergabe-Unterschriften',
    firme: 'Übergabe-Unterschriften',
    nessunFoglioFirme: 'Es gibt kein Unterschriftenblatt.',
    nessunDocumento: 'Kein Dokument zum Öffnen.',
    nienteDaTogliere: 'Es gibt nichts zu entfernen.',
    giaPartita: 'Diese Mitteilung wurde schon verschickt.',
    senzaIndirizzi:
      'Keine empfangende Person hat eine gültige Adresse: Die Mitteilung bleibt ein Entwurf.',
    allegatoIlleggibile: (testo) => `Der Anhang «${testo}» lässt sich nicht lesen.`,
    laComunicazione: 'die Mitteilung',
    domandaComunicazione: (oggetto, n) =>
      `«${oggetto}» an ${plurale(n, 'Empfänger', 'Empfänger')} verschicken?`,
    dettaglioComunicazione: 'Die E-Mails gehen in Blindkopie vom Postfach des Klassenbuchs aus.',
    nientePartitoComunicazione: 'Es wurde nichts verschickt: Die Mitteilung bleibt, wie sie war.',
    comunicazione: 'Mitteilung',
    bozzaNonPreparata: 'Der Entwurf konnte nicht vorbereitet werden.',
    bozzaAperta: (n, percorso) =>
      `Entwurf für ${plurale(n, 'Empfänger', 'Empfänger')} in Blindkopie im E-Mail-Programm ` +
      `geöffnet: ${percorso}. Wenn du ihn verschickt hast, hake ihn in der Liste ab.`,
    speditaMaCambiato: (n) =>
      `Mitteilung an ${plurale(n, 'Empfänger', 'Empfänger')} verschickt, aber inzwischen ist ` +
      'ein anderes Dokument geöffnet: Die Mitteilung wurde nicht als verschickt markiert.',
    speditaNonATutti: (n, avviso) =>
      `Mitteilung an ${plurale(n, 'Empfänger', 'Empfänger')} verschickt, aber nicht an alle: ` +
      avviso,
    spedita: (n) => `Mitteilung an ${plurale(n, 'Empfänger', 'Empfänger')} verschickt.`,
    riportataABozza: 'Die Mitteilung ist wieder ein Entwurf.',
    segnataSpedita: (n) =>
      `Mitteilung als an ${plurale(n, 'Empfänger', 'Empfänger')} verschickt markiert.`,
    senzaFrequentanti: 'Die Klasse hat keine Lernenden, die sie besuchen.',
    assegnatiConFuori: (presi, fuori) =>
      `${plurale(presi, 'Blatt', 'Blätter')} zugewiesen. Nicht erkannt: ${fuori.join(', ')}. ` +
      'Diese Blätter müssen im Feld der lernenden Person hinzugefügt werden.',
    assegnati: (presi) => `${plurale(presi, 'Blatt', 'Blätter')} zugewiesen.`,
    nessunFoglioDaAprire: 'Kein Blatt zum Öffnen.',
    nessunFoglioDaTogliere: 'Kein Blatt zum Entfernen.',
    nessunFoglioDaAllegare: (nome) => `${nome}: kein Blatt zum Anhängen`,
    nessunIndirizzo: (chi) => `keine Adresse (${chi.join(', ')})`,
    allegatoNonLeggibile: (nome) => `Anhang «${nome}» nicht lesbar`,
    richiestaDiFirma: 'Bitte um Unterschrift',
    spediteRichieste: (n) =>
      plurale(n, 'Bitte um Unterschrift verschickt', 'Bitten um Unterschrift verschickt'),
    domandaRichieste: (n) =>
      `${plurale(n, 'Bitte um Unterschrift', 'Bitten um Unterschrift')} verschicken?`,
    dettaglioRichieste: (periodo) =>
      `Eine pro lernende Person, an die Adressen des Zeitraums ${periodo}.`,
    nientePartitoRichieste: 'Es wurde nichts verschickt: Die Bitten bleiben zu versenden.',
    bozzePronte: (n, dove) =>
      `${plurale(n, 'Entwurf', 'Entwürfe')} bereit in ${dove}. Verschicke sie einzeln aus dem ` +
      'E-Mail-Programm und hake jede lernende Person ab, sobald ihre Bitte verschickt ist.',
    partiteMaCambiato: (partite, segnate) =>
      `${plurale(partite, 'Bitte um Unterschrift', 'Bitten um Unterschrift')} verschickt, ` +
      `aber inzwischen ist ein anderes Dokument geöffnet: ${segnate} abgehakt, die anderen nicht.`,
    richiestaNonTrovata: 'Bitte nicht gefunden.',
    riportataDaMandare: (nome) => `Bitte von ${nome} wieder auf «zu versenden» gesetzt.`,
    richiestaSpedita: (nome) => `Bitte von ${nome} als verschickt markiert.`,
  },
  fr: {
    firmeDi: (testo) => `Signatures de remise — ${testo}`,
    fileFirme: 'signatures de remise',
    firme: 'Signatures de remise',
    nessunFoglioFirme: 'Il n’y a aucune feuille de signatures.',
    nessunDocumento: 'Aucun document à ouvrir.',
    nienteDaTogliere: 'Il n’y a rien à retirer.',
    giaPartita: 'Cette communication est déjà partie.',
    senzaIndirizzi:
      'Aucun destinataire n’a d’adresse valable : la communication reste un brouillon.',
    allegatoIlleggibile: (testo) => `La pièce jointe « ${testo} » ne peut pas être lue.`,
    laComunicazione: 'la communication',
    domandaComunicazione: (oggetto, n) =>
      `Envoyer « ${oggetto} » à ${plurale(n, 'destinataire', 'destinataires')} ?`,
    dettaglioComunicazione: 'Les e-mails partent de la boîte du registre, en copie cachée.',
    nientePartitoComunicazione: 'Rien n’est parti : la communication reste telle quelle.',
    comunicazione: 'Communication',
    bozzaNonPreparata: 'Le brouillon n’a pas pu être préparé.',
    bozzaAperta: (n, percorso) =>
      `Brouillon pour ${plurale(n, 'destinataire', 'destinataires')} en copie cachée ouvert ` +
      `dans le programme de messagerie : ${percorso}. ` +
      'Quand tu l’as envoyé, coche-le dans la liste.',
    speditaMaCambiato: (n) =>
      `Communication envoyée à ${plurale(n, 'destinataire', 'destinataires')}, mais un autre document ` +
      'a été ouvert entre-temps : elle n’a pas été marquée comme envoyée.',
    speditaNonATutti: (n, avviso) =>
      `Communication envoyée à ${plurale(n, 'destinataire', 'destinataires')}, mais pas à tous : ` +
      avviso,
    spedita: (n) => `Communication envoyée à ${plurale(n, 'destinataire', 'destinataires')}.`,
    riportataABozza: 'Communication remise en brouillon.',
    segnataSpedita: (n) =>
      `Communication marquée comme envoyée à ${plurale(n, 'destinataire', 'destinataires')}.`,
    senzaFrequentanti: 'La classe n’a aucune personne en formation qui la fréquente.',
    assegnatiConFuori: (presi, fuori) =>
      `${plurale(presi, 'feuille attribuée', 'feuilles attribuées')}. Non reconnues : ` +
      `${fuori.join(', ')}. Il faut les ajouter depuis la case de la personne en formation.`,
    assegnati: (presi) => `${plurale(presi, 'feuille attribuée', 'feuilles attribuées')}.`,
    nessunFoglioDaAprire: 'Aucune feuille à ouvrir.',
    nessunFoglioDaTogliere: 'Aucune feuille à retirer.',
    nessunFoglioDaAllegare: (nome) => `${nome} : aucune feuille à joindre`,
    nessunIndirizzo: (chi) => `aucune adresse (${chi.join(', ')})`,
    allegatoNonLeggibile: (nome) => `pièce jointe « ${nome} » illisible`,
    richiestaDiFirma: 'Demande de signature',
    spediteRichieste: (n) =>
      plurale(n, 'demande de signature envoyée', 'demandes de signature envoyées'),
    domandaRichieste: (n) =>
      `Envoyer ${plurale(n, 'demande de signature', 'demandes de signature')} ?`,
    dettaglioRichieste: (periodo) =>
      `Une par personne en formation, aux adresses valables pour l’intervalle ${periodo}.`,
    nientePartitoRichieste: 'Rien n’est parti : les demandes restent à envoyer.',
    bozzePronte: (n, dove) =>
      `${plurale(n, 'brouillon prêt', 'brouillons prêts')} dans ${dove}. Envoie-les un par un ` +
      'depuis le programme de messagerie et coche chaque personne en formation quand sa ' +
      'demande est partie.',
    partiteMaCambiato: (partite, segnate) =>
      `${plurale(partite, 'demande de signature partie', 'demandes de signature parties')}, ` +
      `mais un autre document a été ouvert entre-temps : ${segnate} cochées, les autres non.`,
    richiestaNonTrovata: 'Demande introuvable.',
    riportataDaMandare: (nome) => `Demande de ${nome} de nouveau à envoyer.`,
    richiestaSpedita: (nome) => `Demande de ${nome} marquée comme envoyée.`,
  },
  en: {
    firmeDi: (testo) => `Handover signatures — ${testo}`,
    fileFirme: 'hand-out signatures',
    firme: 'Handover signatures',
    nessunFoglioFirme: 'There’s no signature sheet.',
    nessunDocumento: 'No document to open.',
    nienteDaTogliere: 'There’s nothing to remove.',
    giaPartita: 'This message has already been sent.',
    senzaIndirizzi: 'No recipient has a valid address: the message stays a draft.',
    allegatoIlleggibile: (testo) => `The attachment “${testo}” can’t be read.`,
    laComunicazione: 'the message',
    domandaComunicazione: (oggetto, n) =>
      `Send “${oggetto}” to ${plurale(n, 'recipient', 'recipients')}?`,
    dettaglioComunicazione: 'They are sent from the register’s mailbox, as blind copies.',
    nientePartitoComunicazione: 'Nothing was sent: the message stays as it was.',
    comunicazione: 'Message',
    bozzaNonPreparata: 'The draft couldn’t be prepared.',
    bozzaAperta: (n, percorso) =>
      `Draft for ${plurale(n, 'recipient', 'recipients')} in blind copy opened in the email ` +
      `program: ${percorso}. When you’ve sent it, tick it in the list.`,
    speditaMaCambiato: (n) =>
      `Message sent to ${plurale(n, 'recipient', 'recipients')}, but a different document is ` +
      'now open: it hasn’t been marked as sent.',
    speditaNonATutti: (n, avviso) =>
      `Message sent to ${plurale(n, 'recipient', 'recipients')}, but not to all: ${avviso}`,
    spedita: (n) => `Message sent to ${plurale(n, 'recipient', 'recipients')}.`,
    riportataABozza: 'Message turned back into a draft.',
    segnataSpedita: (n) =>
      `Message marked as sent to ${plurale(n, 'recipient', 'recipients')}.`,
    senzaFrequentanti: 'The class has no learners attending.',
    assegnatiConFuori: (presi, fuori) =>
      `${plurale(presi, 'sheet', 'sheets')} assigned. Not recognised: ${fuori.join(', ')}. ` +
      'They need adding from the learner’s box.',
    assegnati: (presi) => `${plurale(presi, 'sheet', 'sheets')} assigned.`,
    nessunFoglioDaAprire: 'No sheet to open.',
    nessunFoglioDaTogliere: 'No sheet to remove.',
    nessunFoglioDaAllegare: (nome) => `${nome}: no sheet to attach`,
    nessunIndirizzo: (chi) => `no address (${chi.join(', ')})`,
    allegatoNonLeggibile: (nome) => `attachment “${nome}” can’t be read`,
    richiestaDiFirma: 'Signature request',
    spediteRichieste: (n) => plurale(n, 'signature request sent', 'signature requests sent'),
    domandaRichieste: (n) =>
      `Send ${plurale(n, 'signature request', 'signature requests')}?`,
    dettaglioRichieste: (periodo) =>
      `One per learner, to the addresses valid for the period ${periodo}.`,
    nientePartitoRichieste: 'Nothing was sent: the requests are still to be sent.',
    bozzePronte: (n, dove) =>
      `${plurale(n, 'draft', 'drafts')} ready in ${dove}. Send them one at a time from the ` +
      'email program and tick each learner when their request has gone.',
    partiteMaCambiato: (partite, segnate) =>
      `${plurale(partite, 'signature request', 'signature requests')} sent, but a different ` +
      `document is now open: ${segnate} ticked, the others not.`,
    richiestaNonTrovata: 'Request not found.',
    riportataDaMandare: (nome) => `Request for ${nome} marked as still to send.`,
    richiestaSpedita: (nome) => `Request for ${nome} marked as sent.`,
  },
})
