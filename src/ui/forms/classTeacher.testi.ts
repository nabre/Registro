// I testi di `forms/classTeacher.ts`: i recapiti fissi della classe e le
// comunicazioni alle famiglie, dalla bozza all'invio.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  recapito: {
    nuovo: 'Nuovo recapito',
    modifica: 'Modifica recapito',
    etichetta: 'Etichetta',
    segnapostoEtichetta: 'Segreteria',
    indirizzo: 'Indirizzo',
    predefinito: 'In copia a ogni comunicazione nuova',
    aggiunto: 'Recapito aggiunto.',
    aggiornato: 'Recapito aggiornato.',
    eliminare: (etichetta: string) => `Eliminare «${etichetta}»?`,
    sparisceAnche: 'Sparisce anche dalle comunicazioni che lo tenevano in copia.',
    tolto: 'Recapito tolto.',
  },
  comunicazione: {
    nuova: 'Nuova comunicazione',
    modifica: 'Modifica comunicazione',
    inviata: 'Comunicazione inviata',
    oggetto: 'Oggetto',
    testo: 'Testo',
    aiutoFirma:
      'La firma non va scritta qui: nella bozza aperta nel programma di posta la mette ' +
      'lui; quando spedisce il registro, in fondo va quella di Impostazioni › Comunicazioni.',
    destinatari: 'Destinatari',
    aiutoDestinatari: 'Gli indirizzi vanno in copia nascosta: nessuno vede la lista degli altri.',
    spedita: (giorno: string, n: number) => `Spedita il ${giorno} a ${n} indirizzi.`,
    indirizzi: (n: number) => `${n} indirizzi`,
    senzaEmail: (nomi: string) => ` · senza e-mail: ${nomi}`,
    salvaBozza: 'Salva bozza',
    bozzaSalvata: 'Bozza salvata.',
    eliminareInviata: 'Eliminare la comunicazione inviata?',
    sparisceLaTraccia:
      'Qui sparisce la sua traccia: quando è andata, a chi, e che cosa diceva. ' +
      'L’e-mail spedita resta nella casella di posta, dove è stata mandata.',
    eliminataDalloStorico: 'Comunicazione eliminata dallo storico.',
    salvaEApri: 'Salva e apri nella posta',
    preparare: (n: number) => `Preparare la bozza per ${n} destinatari?`,
    siApreNellaPosta:
      'Si apre nel programma di posta, con gli indirizzi già in copia nascosta. ' +
      'A spedirla sei tu: poi la spunti nell’elenco delle comunicazioni.',
    prepara: 'Prepara',
    invioNonRiuscito: 'Invio non riuscito.',
    eliminareBozza: 'Eliminare la bozza?',
    sparisceDalloStorico: 'Sparisce dallo storico della classe.',
    bozzaEliminata: 'Bozza eliminata.',
  },
}

export const testi = catalogo(it, {
  de: {
    recapito: {
      nuovo: 'Neue Kontaktadresse',
      modifica: 'Kontaktadresse bearbeiten',
      etichetta: 'Bezeichnung',
      segnapostoEtichetta: 'Sekretariat',
      indirizzo: 'E-Mail-Adresse',
      predefinito: 'Bei jeder neuen Mitteilung in Kopie',
      aggiunto: 'Kontaktadresse hinzugefügt.',
      aggiornato: 'Kontaktadresse aktualisiert.',
      eliminare: (etichetta) => `«${etichetta}» löschen?`,
      sparisceAnche: 'Sie verschwindet auch aus den Mitteilungen, bei denen sie in Kopie war.',
      tolto: 'Kontaktadresse entfernt.',
    },
    comunicazione: {
      nuova: 'Neue Mitteilung',
      modifica: 'Mitteilung bearbeiten',
      inviata: 'Versendete Mitteilung',
      oggetto: 'Betreff',
      testo: 'Text',
      aiutoFirma:
        'Die Signatur gehört nicht hierher: Im Entwurf, der sich im Mailprogramm öffnet, ' +
        'setzt dieses sie selbst ein; versendet das Klassenbuch, kommt unten die aus ' +
        'Einstellungen › Kommunikation hin.',
      destinatari: 'Empfänger',
      aiutoDestinatari:
        'Die Adressen kommen ins Bcc: Niemand sieht, an wen die Mitteilung sonst geht.',
      spedita: (giorno, n) => `Am ${giorno} an ${plurale(n, 'Adresse', 'Adressen')} versendet.`,
      indirizzi: (n) => plurale(n, 'Adresse', 'Adressen'),
      senzaEmail: (nomi) => ` · ohne E-Mail: ${nomi}`,
      salvaBozza: 'Entwurf speichern',
      bozzaSalvata: 'Entwurf gespeichert.',
      eliminareInviata: 'Versendete Mitteilung löschen?',
      sparisceLaTraccia:
        'Hier verschwindet ihre Spur: wann sie verschickt wurde, an wen und was darin stand. ' +
        'Die versendete E-Mail bleibt im Postfach, aus dem sie verschickt wurde.',
      eliminataDalloStorico: 'Mitteilung aus dem Verlauf gelöscht.',
      salvaEApri: 'Speichern und im Mailprogramm öffnen',
      preparare: (n) => `Entwurf für ${plurale(n, 'Empfänger', 'Empfänger')} vorbereiten?`,
      siApreNellaPosta:
        'Er öffnet sich im Mailprogramm, die Adressen schon im Bcc. Verschicken musst du ihn ' +
        'selbst: Danach hakst du ihn in der Liste der Mitteilungen ab.',
      prepara: 'Vorbereiten',
      invioNonRiuscito: 'Versand hat nicht geklappt.',
      eliminareBozza: 'Entwurf löschen?',
      sparisceDalloStorico: 'Er verschwindet aus dem Verlauf der Klasse.',
      bozzaEliminata: 'Entwurf gelöscht.',
    },
  },
  fr: {
    recapito: {
      nuovo: 'Nouvelle adresse de contact',
      modifica: 'Modifier l’adresse de contact',
      etichetta: 'Libellé',
      segnapostoEtichetta: 'Secrétariat',
      indirizzo: 'Adresse e-mail',
      predefinito: 'En copie de chaque nouvelle communication',
      aggiunto: 'Adresse de contact ajoutée.',
      aggiornato: 'Adresse de contact mise à jour.',
      eliminare: (etichetta) => `Supprimer « ${etichetta} » ?`,
      sparisceAnche: 'Elle disparaît aussi des communications qui la mettaient en copie.',
      tolto: 'Adresse de contact retirée.',
    },
    comunicazione: {
      nuova: 'Nouvelle communication',
      modifica: 'Modifier la communication',
      inviata: 'Communication envoyée',
      oggetto: 'Objet',
      testo: 'Texte',
      aiutoFirma:
        'N’écris pas la signature ici : dans le brouillon ouvert dans le logiciel de ' +
        'messagerie, c’est lui qui l’ajoute ; quand c’est le registre qui envoie, celle de ' +
        'Paramètres › Communications est mise à la fin.',
      destinatari: 'Destinataires',
      aiutoDestinatari:
        'Les adresses sont mises en copie cachée : personne ne voit la liste des autres.',
      spedita: (giorno, n) => `Envoyée le ${giorno} à ${plurale(n, 'adresse', 'adresses')}.`,
      indirizzi: (n) => plurale(n, 'adresse', 'adresses'),
      senzaEmail: (nomi) => ` · sans e-mail : ${nomi}`,
      salvaBozza: 'Enregistrer le brouillon',
      bozzaSalvata: 'Brouillon enregistré.',
      eliminareInviata: 'Supprimer la communication envoyée ?',
      sparisceLaTraccia:
        'Sa trace disparaît d’ici : quand elle est partie, à qui, et ce qu’elle disait. ' +
        'L’e-mail envoyé reste dans la boîte de messagerie d’où il est parti.',
      eliminataDalloStorico: 'Communication supprimée de l’historique.',
      salvaEApri: 'Enregistrer et ouvrir dans la messagerie',
      preparare: (n) =>
        `Préparer le brouillon pour ${plurale(n, 'destinataire', 'destinataires')} ?`,
      siApreNellaPosta:
        'Il s’ouvre dans le logiciel de messagerie, avec les adresses déjà en copie cachée. ' +
        'C’est toi qui l’envoies : ensuite, coche-le dans la liste des communications.',
      prepara: 'Préparer',
      invioNonRiuscito: 'L’envoi a échoué.',
      eliminareBozza: 'Supprimer le brouillon ?',
      sparisceDalloStorico: 'Il disparaît de l’historique de la classe.',
      bozzaEliminata: 'Brouillon supprimé.',
    },
  },
  en: {
    recapito: {
      nuovo: 'New contact address',
      modifica: 'Edit contact address',
      etichetta: 'Label',
      segnapostoEtichetta: 'School office',
      indirizzo: 'Email address',
      predefinito: 'Copied on every new message',
      aggiunto: 'Contact address added.',
      aggiornato: 'Contact address updated.',
      eliminare: (etichetta) => `Delete “${etichetta}”?`,
      sparisceAnche: 'It also comes off the messages it was copied on.',
      tolto: 'Contact address removed.',
    },
    comunicazione: {
      nuova: 'New message',
      modifica: 'Edit message',
      inviata: 'Sent message',
      oggetto: 'Subject',
      testo: 'Text',
      aiutoFirma:
        'Don’t write the signature here: in the draft opened in your email program, the ' +
        'program adds it; when the register sends, the one from Settings › Communications goes at ' +
        'the bottom.',
      destinatari: 'Recipients',
      aiutoDestinatari: 'Addresses go in Bcc: nobody sees who else it went to.',
      spedita: (giorno, n) => `Sent on ${giorno} to ${plurale(n, 'address', 'addresses')}.`,
      indirizzi: (n) => plurale(n, 'address', 'addresses'),
      senzaEmail: (nomi) => ` · no email: ${nomi}`,
      salvaBozza: 'Save draft',
      bozzaSalvata: 'Draft saved.',
      eliminareInviata: 'Delete the sent message?',
      sparisceLaTraccia:
        'Its record disappears from here: when it went, to whom, and what it said. ' +
        'The email itself stays in the mailbox it was sent from.',
      eliminataDalloStorico: 'Message deleted from the history.',
      salvaEApri: 'Save and open in email',
      preparare: (n) => `Prepare the draft for ${plurale(n, 'recipient', 'recipients')}?`,
      siApreNellaPosta:
        'It opens in your email program, with the addresses already in Bcc. You send it ' +
        'yourself, then tick it off in the list of messages.',
      prepara: 'Prepare',
      invioNonRiuscito: 'Sending didn’t work.',
      eliminareBozza: 'Delete the draft?',
      sparisceDalloStorico: 'It disappears from the class history.',
      bozzaEliminata: 'Draft deleted.',
    },
  },
})
