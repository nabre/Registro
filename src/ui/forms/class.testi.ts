// I testi di `forms/class.ts`: la finestra della classe, quella della persona
// in formazione — anagrafica, indirizzi, telefoni, foto — e l'incolla-elenco.

import { catalogo } from '../../i18n/index.js'
import {
  CONTATTI_TELEFONICI,
  Maiuscola,
  PERSONE,
  PIF,
  del,
  frase,
} from '../../domain/lexicon.js'
import type { ContattoTelefonico } from '../../domain/models.js'

const it = {
  classe: {
    aggiungiMateria: 'Aggiungi una materia',
    materiaInsegnata: 'Materia insegnata',
    nessunaMateria: '— nessuna —',
    nuovaMateria: 'Nuova materia',
    aiutoMateria: 'Classe più materia fa un corso: le lezioni e i voti stanno lì.',
    giaInsegnate: (materie: string) => `Gia' insegnate: ${materie}.`,
    titolo: (nome: string) => `Classe ${nome}`,
    nuova: 'Nuova classe',
    nome: 'Nome della classe',
    segnapostoNome: 'I MEC A',
    sede: 'Sede',
    colore: 'Colore nel calendario',
    archiviata: 'Archiviata',
    aiutoArchiviata: 'Resta nello storico, sparisce dagli elenchi.',
    docenteDiClasse: 'Sono docente di classe',
    aiutoDocenteDiClasse: 'Aggiunge documenti, recapiti e comunicazioni alla scheda della classe.',
    aggiornata: 'Classe aggiornata.',
    creata: 'Classe creata.',
    eliminata: 'Classe eliminata.',
  },
  mappa: {
    nonAncora: 'Non ancora sulla mappa: «Trova gli indirizzi», nella Mappa.',
    cadeA: (coordinate: string) => `Sulla mappa cade a ${coordinate}.`,
  },
  telefoni: {
    titolo: 'Telefoni',
    cheNumero: 'Che numero è',
    numeroDi: (contatto: ContattoTelefonico) => `Numero ${del(CONTATTI_TELEFONICI[contatto])}`,
    numeroCome: (etichetta: string) => `${Maiuscola(etichetta)}, numero`,
    togli: 'Togli questo numero',
    aggiungi: 'Aggiungi un numero',
  },
  foto: {
    titolo: 'Foto',
    cambia: 'Cambia foto',
    aggiungi: 'Aggiungi foto',
    aiuto: 'Un JPEG o un PNG: finisce sulla scheda stampata e sulla parete della classe.',
    aiutoNuova:
      'Prima si salva, poi si mette la faccia: il file va nella cartella della classe ' +
      'sotto il suo nome, e l’host quel nome lo cerca nel registro.',
    subito: 'Si applica subito, senza aspettare «Salva».',
  },
  indirizzo: {
    via: 'Via e numero',
    nap: 'NAP',
    aiutoNap: 'Con la sigla davanti se è estero: I-22100.',
    localita: 'Località',
    presso: 'Presso',
    aiutoPresso: 'Quel che va scritto sopra la via: «c/o Rossi», il nome dello studio.',
    casella: 'Casella postale',
    aiutoCasella: 'Dove riceve la posta, che non è dove sta: sulla mappa non conta.',
    paese: 'Paese',
    aiutoPaese: 'Solo se non è la Svizzera: su una busta svizzera non si scrive.',
  },
  persona: {
    modifica: `Modifica ${PIF.singolare}`,
    nuova: `Nuova ${PIF.singolare}`,
    aiutoClasseScritta: 'Appelli, voti e foto stanno con la classe: qui si legge soltanto.',
    aiutoClasseNuova: 'La classe in cui entra: ne segue l’appello e i corsi.',
    chiE: 'Chi è',
    dataNascita: 'Data di nascita',
    aiutoDataNascita: 'Per i moduli della scuola, e per il compleanno sul calendario.',
    frequenta: 'Frequenta',
    aiutoFrequenta: 'Togliendo la spunta esce dagli appelli, ma resta nello storico.',
    comeRaggiungerla: 'Come la si raggiunge',
    doveAbita: 'Dove abita.',
    aiutoTelefoni:
      'Quanti ne servono. Il primo è quello che si prova per primo, e quello ' +
      'che finisce sui fogli stampati: si sposta trascinando la riga.',
    aiutoEmailRappresentante: 'Riceve le comunicazioni al posto suo, o insieme a lui.',
    aiutoTelefoniRappresentante:
      'Il numero di chi risponde per lei da minorenne: prima non aveva una ' +
      'casella, e finiva in quella sua.',
    nomeAzienda: 'Nome',
    aiutoAzienda: 'Dove fa il tirocinio: serve solo a riconoscerla negli elenchi.',
    aiutoIndirizzoAzienda: 'Per la visita in azienda e per quel che si spedisce.',
    emailDatore: `E-mail ${del(PERSONE.datore)}`,
    aiutoEmailDatore: 'Riceve i fogli delle assenze da controfirmare.',
    senzaEmailDatore: 'Senza, la richiesta non parte.',
    aiutoTelefoniDatore:
      'Per sollecitare una firma che non torna: il centralino e il diretto ' +
      'sono due numeri, e chiamarli in quest’ordine è quel che si fa.',
    classeTolta: 'La classe non c’è più: è stata tolta altrove.',
    toltaAltrove: 'Non c’è più: è stato tolto dalla classe altrove.',
    aggiornata: frase(PIF, 'aggiornato'),
    aggiunta: frase(PIF, 'aggiunto'),
    togliDallaClasse: 'Togli dalla classe',
    tolta: frase(PIF, 'tolto', { coda: 'dalla classe' }),
  },
  importa: {
    titolo: `Importa ${PIF.plurale}`,
    spiegazione:
      `Una riga per ${PIF.singolare}. Vanno bene «Rossi Mario», «Rossi, Mario» e le righe ` +
      'copiate da un foglio di calcolo, anche con l’e-mail in fondo. ' +
      'I nomi già presenti vengono saltati.',
    segnaposto: 'Bernasconi Luca\nRossi Maria; maria.rossi@edu.ti.ch',
    fatto: 'Elenco importato.',
  },
}

export const testi = catalogo(it, {
  de: {
    classe: {
      aggiungiMateria: 'Ein Fach hinzufügen',
      materiaInsegnata: 'Unterrichtetes Fach',
      nessunaMateria: '— keines —',
      nuovaMateria: 'Neues Fach',
      aiutoMateria:
        'Klasse plus Fach ergibt einen Kurs: Dort sind die Stunden und Noten.',
      giaInsegnate: (materie) => `Bereits unterrichtet: ${materie}.`,
      titolo: (nome) => `Klasse ${nome}`,
      nuova: 'Neue Klasse',
      nome: 'Name der Klasse',
      segnapostoNome: 'PM 1A',
      sede: 'Standort',
      colore: 'Farbe im Kalender',
      archiviata: 'Archiviert',
      aiutoArchiviata: 'Bleibt im Verlauf, verschwindet aus den Listen.',
      docenteDiClasse: 'Ich bin Klassenlehrperson',
      aiutoDocenteDiClasse:
        'Ergänzt das Blatt der Klasse um Dokumente, Kontaktadressen und Mitteilungen.',
      aggiornata: 'Klasse aktualisiert.',
      creata: 'Klasse erstellt.',
      eliminata: 'Klasse gelöscht.',
    },
    mappa: {
      nonAncora: 'Noch nicht auf der Karte: «Adressen suchen», in der Karte.',
      cadeA: (coordinate) => `Liegt auf der Karte bei ${coordinate}.`,
    },
    telefoni: {
      titolo: 'Telefonnummern',
      cheNumero: 'Welche Nummer',
      numeroDi: (contatto) => ({
        pif: 'Nummer der lernenden Person',
        rappresentante: 'Nummer der gesetzlichen Vertretung',
        datore: 'Nummer des Arbeitgebers',
      })[contatto],
      numeroCome: (etichetta) => `${Maiuscola(etichetta)}, Nummer`,
      togli: 'Diese Nummer entfernen',
      aggiungi: 'Nummer hinzufügen',
    },
    foto: {
      titolo: 'Foto',
      cambia: 'Foto ändern',
      aggiungi: 'Foto hinzufügen',
      aiuto: 'Ein JPEG oder PNG: Es kommt auf das gedruckte Blatt und auf die Fotowand der Klasse.',
      aiutoNuova:
        'Zuerst speichern, dann das Gesicht: Die Datei kommt unter dem Namen der Person in den ' +
        'Ordner der Klasse, und das Programm sucht diesen Namen im Klassenbuch.',
      subito: 'Gilt sofort, ohne auf «Speichern» zu warten.',
    },
    indirizzo: {
      via: 'Strasse und Nummer',
      nap: 'PLZ',
      aiutoNap: 'Mit Länderkürzel davor, wenn im Ausland: D-78462.',
      localita: 'Ort',
      presso: 'c/o',
      aiutoPresso: 'Was über der Strasse steht: «c/o Meier», der Name der Praxis.',
      casella: 'Postfach',
      aiutoCasella: 'Wo die Post ankommt, nicht wo man wohnt: Für die Karte zählt es nicht.',
      paese: 'Land',
      aiutoPaese: 'Nur wenn nicht die Schweiz: Auf einem Schweizer Couvert schreibt man es nicht.',
    },
    persona: {
      modifica: 'Lernende bearbeiten',
      nuova: 'Neue Lernende',
      aiutoClasseScritta:
        'Anwesenheiten, Noten und Fotos gehören zur Klasse: Hier lässt sie sich nur ablesen.',
      aiutoClasseNuova: 'Die Klasse, in die die Person eintritt: Sie folgt deren ' +
        'Präsenzkontrolle und Kursen.',
      chiE: 'Zur Person',
      dataNascita: 'Geburtsdatum',
      aiutoDataNascita: 'Für die Formulare der Schule und für den Geburtstag im Kalender.',
      frequenta: 'Besucht',
      aiutoFrequenta:
        'Ohne Häkchen fällt die Person aus der Präsenzkontrolle, bleibt aber im Verlauf.',
      comeRaggiungerla: 'So erreicht man sie',
      doveAbita: 'Wo sie wohnt.',
      aiutoTelefoni:
        'So viele wie nötig. Die erste wird zuerst angerufen und steht auf den gedruckten ' +
        'Blättern: Zum Verschieben die Zeile ziehen.',
      aiutoEmailRappresentante:
        'Erhält die Mitteilungen anstelle der Person oder zusammen mit ihr.',
      aiutoTelefoniRappresentante:
        'Die Nummer der Person, die bei Minderjährigen verantwortlich ist: Früher hatte sie ' +
        'kein eigenes Feld und landete in dem der lernenden Person.',
      nomeAzienda: 'Name',
      aiutoAzienda: 'Wo die Lehre gemacht wird: dient nur zum Wiedererkennen in den Listen.',
      aiutoIndirizzoAzienda: 'Für den Betriebsbesuch und für alles, was verschickt wird.',
      emailDatore: 'E-Mail des Arbeitgebers',
      aiutoEmailDatore: 'Erhält die Absenzenblätter zum Gegenzeichnen.',
      senzaEmailDatore: 'Ohne sie geht die Anfrage nicht raus.',
      aiutoTelefoniDatore:
        'Um eine Unterschrift anzumahnen, die nicht zurückkommt: Zentrale und Direktwahl sind ' +
        'zwei Nummern, und man ruft sie in dieser Reihenfolge an.',
      classeTolta: 'Die Klasse gibt es nicht mehr: Sie wurde anderswo entfernt.',
      toltaAltrove: 'Nicht mehr da: Die Person wurde anderswo aus der Klasse entfernt.',
      aggiornata: 'Lernende aktualisiert.',
      aggiunta: 'Lernende hinzugefügt.',
      togliDallaClasse: 'Aus der Klasse entfernen',
      tolta: 'Lernende aus der Klasse entfernt.',
    },
    importa: {
      titolo: 'Lernende importieren',
      spiegazione:
        'Eine Zeile pro lernende Person. Möglich sind «Meier Anna», «Meier, Anna» und Zeilen ' +
        'aus einer Tabellenkalkulation, auch mit der E-Mail am Ende. ' +
        'Bereits vorhandene Namen werden übersprungen.',
      segnaposto: 'Keller Lukas\nMeier Anna; anna.meier@schule.ch',
      fatto: 'Liste importiert.',
    },
  },
  fr: {
    classe: {
      aggiungiMateria: 'Ajouter une branche',
      materiaInsegnata: 'Branche enseignée',
      nessunaMateria: '— aucune —',
      nuovaMateria: 'Nouvelle branche',
      aiutoMateria:
        'Classe plus branche donne un cours : c’est là que sont les leçons et les notes.',
      giaInsegnate: (materie) => `Déjà enseignées : ${materie}.`,
      titolo: (nome) => `Classe ${nome}`,
      nuova: 'Nouvelle classe',
      nome: 'Nom de la classe',
      segnapostoNome: '1 MEC A',
      sede: 'Site',
      colore: 'Couleur dans le calendrier',
      archiviata: 'Archivée',
      aiutoArchiviata: 'Reste dans l’historique, disparaît des listes.',
      docenteDiClasse: 'Je suis maître de classe',
      aiutoDocenteDiClasse:
        'Ajoute documents, adresses de contact et communications à la fiche de la classe.',
      aggiornata: 'Classe mise à jour.',
      creata: 'Classe créée.',
      eliminata: 'Classe supprimée.',
    },
    mappa: {
      nonAncora: 'Pas encore sur la carte : « Trouver les adresses », dans la Carte.',
      cadeA: (coordinate) => `Sur la carte, tombe à ${coordinate}.`,
    },
    telefoni: {
      titolo: 'Téléphones',
      cheNumero: 'Quel numéro',
      numeroDi: (contatto) => ({
        pif: 'Numéro de la personne en formation',
        rappresentante: 'Numéro du représentant légal',
        datore: 'Numéro de l’employeur',
      })[contatto],
      numeroCome: (etichetta) => `${Maiuscola(etichetta)}, numéro`,
      togli: 'Retirer ce numéro',
      aggiungi: 'Ajouter un numéro',
    },
    foto: {
      titolo: 'Photo',
      cambia: 'Changer la photo',
      aggiungi: 'Ajouter une photo',
      aiuto: 'Un JPEG ou un PNG : elle figure sur la fiche imprimée et sur le trombinoscope de ' +
        'la classe.',
      aiutoNuova:
        'D’abord on enregistre, ensuite on met le visage : le fichier va dans le dossier de la ' +
        'classe sous son nom, et le programme cherche ce nom dans le registre.',
      subito: 'S’applique tout de suite, sans attendre « Enregistrer ».',
    },
    indirizzo: {
      via: 'Rue et numéro',
      nap: 'NPA',
      aiutoNap: 'Avec le code du pays devant si c’est à l’étranger : F-74100.',
      localita: 'Localité',
      presso: 'Chez',
      aiutoPresso: 'Ce qui s’écrit au-dessus de la rue : « c/o Dupont », le nom du cabinet.',
      casella: 'Case postale',
      aiutoCasella:
        'Là où arrive le courrier, pas là où on habite : sur la carte, ça ne compte pas.',
      paese: 'Pays',
      aiutoPaese:
        'Seulement si ce n’est pas la Suisse : sur une enveloppe suisse, on ne l’écrit pas.',
    },
    persona: {
      modifica: 'Modifier la personne en formation',
      nuova: 'Nouvelle personne en formation',
      aiutoClasseScritta:
        'Appels, notes et photos restent avec la classe : ici, on ne fait que la lire.',
      aiutoClasseNuova: 'La classe où elle entre : elle en suit l’appel et les cours.',
      chiE: 'Identité',
      dataNascita: 'Date de naissance',
      aiutoDataNascita:
        'Pour les formulaires de l’école, et pour l’anniversaire dans le calendrier.',
      frequenta: 'Fréquente',
      aiutoFrequenta: 'En décochant, elle sort des appels, mais reste dans l’historique.',
      comeRaggiungerla: 'Comment la joindre',
      doveAbita: 'Là où elle habite.',
      aiutoTelefoni:
        'Autant qu’il en faut. Le premier est celui qu’on essaie en premier, et celui qui ' +
        'figure sur les feuilles imprimées : on le déplace en faisant glisser la ligne.',
      aiutoEmailRappresentante: 'Reçoit les communications à sa place, ou avec elle.',
      aiutoTelefoniRappresentante:
        'Le numéro de qui répond d’elle tant qu’elle est mineure : avant, il n’avait pas de ' +
        'case à lui et finissait dans la sienne.',
      nomeAzienda: 'Nom',
      aiutoAzienda:
        'Là où se fait l’apprentissage : sert seulement à la reconnaître dans les listes.',
      aiutoIndirizzoAzienda: 'Pour la visite en entreprise et pour ce qu’on envoie.',
      emailDatore: 'E-mail de l’employeur',
      aiutoEmailDatore: 'Reçoit les feuilles d’absences à contresigner.',
      senzaEmailDatore: 'Sans adresse, la demande ne part pas.',
      aiutoTelefoniDatore:
        'Pour relancer une signature qui ne revient pas : le central et la ligne directe sont ' +
        'deux numéros, et on les appelle dans cet ordre.',
      classeTolta: 'La classe n’existe plus : elle a été supprimée ailleurs.',
      toltaAltrove: 'Elle n’est plus là : elle a été retirée de la classe ailleurs.',
      aggiornata: 'Personne en formation mise à jour.',
      aggiunta: 'Personne en formation ajoutée.',
      togliDallaClasse: 'Retirer de la classe',
      tolta: 'Personne en formation retirée de la classe.',
    },
    importa: {
      titolo: 'Importer des personnes en formation',
      spiegazione:
        'Une ligne par personne en formation. « Martin Marie », « Martin, Marie » et les lignes ' +
        'copiées d’un tableur conviennent, même avec l’e-mail à la fin. ' +
        'Les noms déjà présents sont ignorés.',
      segnaposto: 'Dupont Luc\nMartin Marie; marie.martin@edu.vd.ch',
      fatto: 'Liste importée.',
    },
  },
  en: {
    classe: {
      aggiungiMateria: 'Add a subject',
      materiaInsegnata: 'Subject taught',
      nessunaMateria: '— none —',
      nuovaMateria: 'New subject',
      aiutoMateria: 'Class plus subject makes a course: that’s where lessons and grades live.',
      giaInsegnate: (materie) => `Already taught: ${materie}.`,
      titolo: (nome) => `Class ${nome}`,
      nuova: 'New class',
      nome: 'Class name',
      segnapostoNome: 'MECH 1A',
      sede: 'Site',
      colore: 'Colour in the calendar',
      archiviata: 'Archived',
      aiutoArchiviata: 'Stays in the history, disappears from the lists.',
      docenteDiClasse: 'I’m the class teacher',
      aiutoDocenteDiClasse: 'Adds documents, contact addresses and messages to the class sheet.',
      aggiornata: 'Class updated.',
      creata: 'Class created.',
      eliminata: 'Class deleted.',
    },
    mappa: {
      nonAncora: 'Not on the map yet: “Find addresses”, in the Map.',
      cadeA: (coordinate) => `On the map it falls at ${coordinate}.`,
    },
    telefoni: {
      titolo: 'Phones',
      cheNumero: 'Which number',
      numeroDi: (contatto) => ({
        pif: 'Learner’s number',
        rappresentante: 'Legal guardian’s number',
        datore: 'Employer’s number',
      })[contatto],
      numeroCome: (etichetta) => `${Maiuscola(etichetta)}, number`,
      togli: 'Remove this number',
      aggiungi: 'Add a number',
    },
    foto: {
      titolo: 'Photo',
      cambia: 'Change photo',
      aggiungi: 'Add photo',
      aiuto: 'A JPEG or a PNG: it goes on the printed sheet and on the class photo wall.',
      aiutoNuova:
        'Save first, then add the face: the file goes in the class folder under their name, ' +
        'and the program looks that name up in the register.',
      subito: 'Applies straight away, without waiting for “Save”.',
    },
    indirizzo: {
      via: 'Street and number',
      nap: 'Postcode',
      aiutoNap: 'With the country code in front if abroad: I-22100.',
      localita: 'Town',
      presso: 'c/o',
      aiutoPresso: 'What goes above the street: “c/o Brown”, the name of the practice.',
      casella: 'PO box',
      aiutoCasella: 'Where the post arrives, not where they live: it doesn’t count on the map.',
      paese: 'Country',
      aiutoPaese: 'Only if it isn’t Switzerland: on a Swiss envelope you don’t write it.',
    },
    persona: {
      modifica: 'Edit learner',
      nuova: 'New learner',
      aiutoClasseScritta: 'Attendance, grades and photos belong to the class: here it’s read-only.',
      aiutoClasseNuova: 'The class they’re joining: they follow its attendance and courses.',
      chiE: 'Who they are',
      dataNascita: 'Date of birth',
      aiutoDataNascita: 'For school forms, and for the birthday on the calendar.',
      frequenta: 'Attends',
      aiutoFrequenta: 'Untick it and they drop out of attendance, but stay in the history.',
      comeRaggiungerla: 'How to reach them',
      doveAbita: 'Where they live.',
      aiutoTelefoni:
        'As many as you need. The first is the one you try first, and the one that goes on ' +
        'the printed sheets: drag a row to move it.',
      aiutoEmailRappresentante: 'Receives messages instead of the learner, or alongside them.',
      aiutoTelefoniRappresentante:
        'The number of whoever answers for them while they’re under age: it used to have no ' +
        'box of its own, and ended up in theirs.',
      nomeAzienda: 'Name',
      aiutoAzienda: 'Where they do their apprenticeship: only used to recognise it in lists.',
      aiutoIndirizzoAzienda: 'For the company visit and for anything you post.',
      emailDatore: 'Employer’s email',
      aiutoEmailDatore: 'Receives the absence sheets to countersign.',
      senzaEmailDatore: 'Without it, the request isn’t sent.',
      aiutoTelefoniDatore:
        'To chase a signature that doesn’t come back: the switchboard and the direct line are ' +
        'two numbers, and you call them in this order.',
      classeTolta: 'The class is no longer there: it was removed elsewhere.',
      toltaAltrove: 'No longer there: they were removed from the class elsewhere.',
      aggiornata: 'Learner updated.',
      aggiunta: 'Learner added.',
      togliDallaClasse: 'Remove from class',
      tolta: 'Learner removed from the class.',
    },
    importa: {
      titolo: 'Import learners',
      spiegazione:
        'One line per learner. “Brown Mary”, “Brown, Mary” and lines copied from a ' +
        'spreadsheet all work, even with the email at the end. ' +
        'Names already there are skipped.',
      segnaposto: 'Smith Luke\nBrown Mary; mary.brown@school.ch',
      fatto: 'List imported.',
    },
  },
})
