// I testi delle procedure di `classe` (assenze da firmare, comunicazioni,
// recapiti, elenco delle persone). Si leggono al momento dell'uso
// (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  assenze: {
    elimina: {
      titolo: 'Elimina un periodo e toglie dal documento dell’anno i fogli che ci stavano dentro',
      bloccoId: 'Il periodo da eliminare',
    },
    foglio: {
      aggiungi: {
        titolo: 'Aggiunge un foglio alla riga di una persona: vergine o firmato',
        allievoId: 'Di chi è il foglio',
        genere: 'Che cosa racconta il foglio',
        firmato: 'Vero è quello tornato indietro con la firma sopra',
      },
      apri: { titolo: 'Apre un foglio di assenze nel programma del sistema' },
      togli: {
        titolo:
          'Toglie un foglio dal documento dell’anno (non va nel cestino di sistema): ' +
          'quella casella torna vuota',
      },
    },
    importa: { titolo: 'Importa una cartella di fogli e li assegna dal nome del file' },
    invia: {
      titolo: 'Prepara e manda le richieste di firma: una e-mail per persona',
      allieviIds: 'Vuoto vuol dire: tutti quelli pronti e non ancora spediti',
    },
    salva: {
      titolo: 'Crea o aggiorna un periodo di assenze da far firmare',
      blocco: 'Periodo di assenze',
    },
    spunta: {
      titolo: 'Segna spedita la richiesta di una persona, o la riporta da mandare',
      spedita: 'Falso la riporta da mandare e la casella torna a offrire la bozza',
    },
  },
  comunicazioni: {
    elimina: { titolo: 'Butta via una comunicazione dal fascicolo' },
    invia: { titolo: 'Manda la comunicazione ai destinatari, in copia nascosta' },
    salva: { titolo: 'Salva la bozza di una comunicazione alla classe' },
    spunta: {
      titolo: 'Segna la comunicazione come spedita, o la riporta a bozza',
      spedita: 'Falso la riporta a bozza e cancella i destinatari scritti',
    },
  },
  recapiti: {
    elimina: {
      titolo: 'Toglie un recapito, e con lui il destinatario dalle comunicazioni che lo citavano',
    },
    salva: {
      titolo: 'Salva un recapito fisso nel fascicolo della classe',
      classeId: 'La classe di cui si tiene il fascicolo',
      recapito: 'Recapito',
    },
  },
  persone: {
    titolo: 'Le persone in formazione di una classe, con recapiti e azienda',
    classeId: 'La classe di cui si vuole l’elenco',
    ritirati: 'Vero per avere anche chi non frequenta più: di norma restano fuori',
    quante: 'Quante persone tornano in questa busta',
    comune: 'Il comune chiesto. Vuoto quando non se n’è chiesto',
    cap: 'Il NAP chiesto, anche a metà. Vuoto quando non se n’è chiesto',
    fuoriZona: 'Quante restano fuori perché il domicilio non è nella zona chiesta',
    escluse: 'Quante restano fuori perché non frequentano più: con «ritirati» a vero rientrano',
    nomeCompleto: 'Come si scrive parlandone: «Rossi Maria»',
    attivo: 'Falso per chi si è ritirato: resta nel registro',
    telefoni: 'Quanti numeri ha in rubrica',
    indirizzo: 'Il domicilio in una riga, come si scrive su una busta',
    via: 'La via con il civico, da sola: è la casella, non la frase',
    capPersona: 'Il NAP: si ordina e si raggruppa, la riga composta no',
    localita: 'Il comune: è quel che si conta in «chi viene da dove»',
    indirizzoDatore: 'Dove sta l’azienda, in una riga. Vuoto se non c’è',
    presentazione: {
      titolo: 'Le persone della classe',
      classe: 'Classe',
      persone: 'Persone',
      ritirate: 'Ritirate, fuori dal filtro',
      comune: 'Comune',
      nap: 'NAP',
      fuoriZona: 'Fuori dalla zona',
      azienda: 'Azienda',
      domicilio: 'Domicilio',
      posta: 'Posta',
      frequenta: 'Frequenta',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    assenze: {
      elimina: {
        titolo:
          'Löscht einen Zeitraum und entfernt die Blätter, die darin lagen, aus dem Jahresdokument',
        bloccoId: 'Der Zeitraum, der gelöscht wird',
      },
      foglio: {
        aggiungi: {
          titolo: 'Fügt der Zeile einer Person ein Blatt hinzu: leer oder unterschrieben',
          allievoId: 'Wem das Blatt gehört',
          genere: 'Wovon das Blatt berichtet',
          firmato: 'Wahr: das Blatt, das mit der Unterschrift darauf zurückgekommen ist',
        },
        apri: { titolo: 'Öffnet ein Absenzenblatt im Programm des Systems' },
        togli: {
          titolo:
            'Entfernt ein Blatt aus dem Jahresdokument (es kommt nicht in den Papierkorb des ' +
            'Systems): Dieses Feld ist wieder leer',
        },
      },
      importa: {
        titolo: 'Importiert einen Ordner mit Blättern und ordnet sie nach dem Dateinamen zu',
      },
      invia: {
        titolo: 'Bereitet die Unterschriftsanfragen vor und verschickt sie: eine E-Mail pro Person',
        allieviIds: 'Leer heisst: alle, die bereit und noch nicht verschickt sind',
      },
      salva: {
        titolo: 'Erstellt oder aktualisiert einen Absenzenzeitraum zum Unterschreiben',
        blocco: 'Absenzenzeitraum',
      },
      spunta: {
        titolo:
          'Markiert die Anfrage einer Person als verschickt oder setzt sie auf «zu senden» zurück',
        spedita:
          'Falsch setzt sie auf «zu senden» zurück, und das Feld bietet wieder den Entwurf an',
      },
    },
    comunicazioni: {
      elimina: { titolo: 'Löscht eine Mitteilung aus dem Klassendossier' },
      invia: { titolo: 'Schickt die Mitteilung an die Empfänger, in Blindkopie' },
      salva: { titolo: 'Speichert den Entwurf einer Mitteilung an die Klasse' },
      spunta: {
        titolo: 'Markiert die Mitteilung als verschickt oder setzt sie auf Entwurf zurück',
        spedita: 'Falsch setzt sie auf Entwurf zurück und löscht die eingetragenen Empfänger',
      },
    },
    recapiti: {
      elimina: {
        titolo:
          'Entfernt eine Kontaktadresse und mit ihr den Empfänger aus den Mitteilungen, die sie ' +
          'nannten',
      },
      salva: {
        titolo: 'Speichert eine feste Kontaktadresse im Klassendossier',
        classeId: 'Die Klasse, deren Dossier geführt wird',
        recapito: 'Kontaktadresse',
      },
    },
    persone: {
      titolo: 'Die Lernenden einer Klasse, mit Kontaktadressen und Lehrbetrieb',
      classeId: 'Die Klasse, deren Liste man will',
      ritirati:
        'Wahr, um auch Personen zu erhalten, die nicht mehr teilnehmen: Normalerweise bleiben ' +
        'sie draussen',
      quante: 'Wie viele Personen in dieser Antwort zurückkommen',
      comune: 'Die gefragte Gemeinde. Leer, wenn keine gefragt wurde',
      cap: 'Die gefragte PLZ, auch nur der Anfang. Leer, wenn keine gefragt wurde',
      fuoriZona: 'Wie viele draussen bleiben, weil der Wohnort nicht in der gefragten Region liegt',
      escluse:
        'Wie viele draussen bleiben, weil sie nicht mehr teilnehmen: ' +
        'mit «ritirati» auf wahr kommen sie wieder dazu',
      nomeCompleto: 'Wie man ihn im Gespräch schreibt: «Rossi Maria»',
      attivo: 'Falsch für ausgetretene Personen: bleibt im Klassenbuch',
      telefoni: 'Wie viele Nummern im Adressbuch stehen',
      indirizzo: 'Der Wohnort in einer Zeile, wie man ihn auf einen Umschlag schreibt',
      via: 'Die Strasse mit Hausnummer, allein: das Feld, nicht der Satz',
      capPersona:
        'Die PLZ: Sie lässt sich sortieren und gruppieren, die zusammengesetzte Zeile nicht',
      localita: 'Die Gemeinde: Das zählt man bei «wer kommt woher»',
      indirizzoDatore: 'Wo der Lehrbetrieb liegt, in einer Zeile. Leer, wenn es keinen gibt',
      presentazione: {
        titolo: 'Die Personen der Klasse',
        classe: 'Klasse',
        persone: 'Personen',
        ritirate: 'Ausgetreten, ausserhalb des Filters',
        comune: 'Gemeinde',
        nap: 'PLZ',
        fuoriZona: 'Ausserhalb der Region',
        azienda: 'Lehrbetrieb',
        domicilio: 'Wohnort',
        posta: 'E-Mail',
        frequenta: 'Nimmt teil',
      },
    },
  },
  fr: {
    assenze: {
      elimina: {
        titolo:
          'Supprime une période et retire du document de l’année les feuilles qui s’y trouvaient',
        bloccoId: 'La période à supprimer',
      },
      foglio: {
        aggiungi: {
          titolo: 'Ajoute une feuille à la ligne d’une personne : vierge ou signée',
          allievoId: 'À qui appartient la feuille',
          genere: 'Ce que raconte la feuille',
          firmato: 'Vrai, c’est celle qui est revenue avec la signature',
        },
        apri: { titolo: 'Ouvre une feuille d’absences dans le programme du système' },
        togli: {
          titolo:
            'Retire une feuille du document de l’année (elle ne va pas dans la corbeille du ' +
            'système) : cette case redevient vide',
        },
      },
      importa: {
        titolo: 'Importe un dossier de feuilles et les attribue d’après le nom du fichier',
      },
      invia: {
        titolo: 'Prépare et envoie les demandes de signature : un e-mail par personne',
        allieviIds: 'Vide veut dire : toutes celles qui sont prêtes et pas encore envoyées',
      },
      salva: {
        titolo: 'Crée ou met à jour une période d’absences à faire signer',
        blocco: 'Période d’absences',
      },
      spunta: {
        titolo: 'Marque la demande d’une personne comme envoyée, ou la remet à envoyer',
        spedita: 'Faux la remet à envoyer, et la case propose de nouveau le brouillon',
      },
    },
    comunicazioni: {
      elimina: { titolo: 'Supprime une communication du dossier de classe' },
      invia: { titolo: 'Envoie la communication aux destinataires, en copie cachée' },
      salva: { titolo: 'Enregistre le brouillon d’une communication à la classe' },
      spunta: {
        titolo: 'Marque la communication comme envoyée, ou la remet en brouillon',
        spedita: 'Faux la remet en brouillon et efface les destinataires inscrits',
      },
    },
    recapiti: {
      elimina: {
        titolo:
          'Retire une adresse de contact, et avec elle le destinataire des communications qui la ' +
          'citaient',
      },
      salva: {
        titolo: 'Enregistre une adresse de contact fixe dans le dossier de la classe',
        classeId: 'La classe dont on tient le dossier',
        recapito: 'Adresse de contact',
      },
    },
    persone: {
      titolo: 'Les personnes en formation d’une classe, avec adresses de contact et entreprise',
      classeId: 'La classe dont on veut la liste',
      ritirati:
        'Vrai pour avoir aussi les personnes qui ne suivent plus les cours : en principe elles ' +
        'restent de côté',
      quante: 'Combien de personnes reviennent dans cette réponse',
      comune: 'La commune demandée. Vide quand il n’y en a pas eu',
      cap: 'Le NPA demandé, même en partie. Vide quand il n’y en a pas eu',
      fuoriZona: 'Combien restent de côté parce que le domicile n’est pas dans la zone demandée',
      escluse:
        'Combien restent de côté parce qu’elles ne suivent plus les cours : ' +
        'avec « ritirati » à vrai, elles reviennent',
      nomeCompleto: 'Comment on l’écrit en en parlant : « Rossi Maria »',
      attivo: 'Faux pour qui a abandonné : reste dans le registre',
      telefoni: 'Combien de numéros il y a dans le carnet',
      indirizzo: 'Le domicile en une ligne, comme on l’écrit sur une enveloppe',
      via: 'La rue avec le numéro, seule : c’est la case, pas la phrase',
      capPersona: 'Le NPA : il se trie et se regroupe, la ligne composée non',
      localita: 'La commune : c’est ce qu’on compte dans « qui vient d’où »',
      indirizzoDatore: 'Où se trouve l’entreprise, en une ligne. Vide s’il n’y en a pas',
      presentazione: {
        titolo: 'Les personnes de la classe',
        classe: 'Classe',
        persone: 'Personnes',
        ritirate: 'Ayant abandonné, hors filtre',
        comune: 'Commune',
        nap: 'NPA',
        fuoriZona: 'Hors de la zone',
        azienda: 'Entreprise',
        domicilio: 'Domicile',
        posta: 'E-mail',
        frequenta: 'Suit les cours',
      },
    },
  },
  en: {
    assenze: {
      elimina: {
        titolo: 'Deletes a period and removes the sheets that were in it from the year document',
        bloccoId: 'The period to delete',
      },
      foglio: {
        aggiungi: {
          titolo: 'Adds a sheet to a person’s row: blank or signed',
          allievoId: 'Whose sheet it is',
          genere: 'What the sheet is about',
          firmato: 'True is the one that came back with the signature on it',
        },
        apri: { titolo: 'Opens an absence sheet in the system’s program' },
        togli: {
          titolo:
            'Removes a sheet from the year document (it does not go to the system recycle bin): ' +
            'that box is empty again',
        },
      },
      importa: { titolo: 'Imports a folder of sheets and assigns them by file name' },
      invia: {
        titolo: 'Prepares and sends the signature requests: one email per person',
        allieviIds: 'Empty means: all those ready and not yet sent',
      },
      salva: {
        titolo: 'Creates or updates a period of absences to be signed',
        blocco: 'Absence period',
      },
      spunta: {
        titolo: 'Marks a person’s request as sent, or puts it back to be sent',
        spedita: 'False puts it back to be sent and the box offers the draft again',
      },
    },
    comunicazioni: {
      elimina: { titolo: 'Deletes a message from the class file' },
      invia: { titolo: 'Sends the message to the recipients, in blind copy' },
      salva: { titolo: 'Saves the draft of a message to the class' },
      spunta: {
        titolo: 'Marks the message as sent, or puts it back to draft',
        spedita: 'False puts it back to draft and clears the recipients written down',
      },
    },
    recapiti: {
      elimina: {
        titolo:
          'Removes a contact address, and with it the recipient from the messages that named it',
      },
      salva: {
        titolo: 'Saves a fixed contact address in the class file',
        classeId: 'The class whose file is kept',
        recapito: 'Contact address',
      },
    },
    persone: {
      titolo: 'The learners of a class, with contact addresses and training company',
      classeId: 'The class whose list is wanted',
      ritirati: 'True to include those who no longer attend: normally they are left out',
      quante: 'How many people come back in this reply',
      comune: 'The municipality asked for. Empty when none was asked for',
      cap: 'The postcode asked for, even just the start. Empty when none was asked for',
      fuoriZona: 'How many are left out because their home is not in the area asked for',
      escluse:
        'How many are left out because they no longer attend: ' +
        'with “ritirati” set to true they come back in',
      nomeCompleto: 'How it is written when talking about them: “Rossi Maria”',
      attivo: 'False for those who have withdrawn: stays in the register',
      telefoni: 'How many numbers are in the address book',
      indirizzo: 'The home address in one line, as written on an envelope',
      via: 'The street with the number, on its own: the field, not the sentence',
      capPersona: 'The postcode: it can be sorted and grouped, the combined line cannot',
      localita: 'The municipality: it is what is counted in “who comes from where”',
      indirizzoDatore: 'Where the company is, in one line. Empty if there is none',
      presentazione: {
        titolo: 'The people in the class',
        classe: 'Class',
        persone: 'People',
        ritirate: 'Withdrawn, outside the filter',
        comune: 'Municipality',
        nap: 'Postcode',
        fuoriZona: 'Outside the area',
        azienda: 'Company',
        domicilio: 'Home',
        posta: 'Email',
        frequenta: 'Attends',
      },
    },
  },
})
