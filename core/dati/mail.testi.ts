// I testi della posta: stato del collegamento, domande per collegare la
// casella, mail di prova. Le impostazioni si citano con la chiave
// (`registroDocenti.posta.*`), i comandi con il nome del menu in quella lingua.

import { catalogo } from '../i18n/index.js'

const it = {
  invioAcceso: 'L’invio diretto è acceso: le comunicazioni partono da qui.',
  invioSpento: 'L’invio diretto è spento: le comunicazioni restano bozze da rileggere.',
  serverRisponde: (casella: string, dove: string, coda: string) =>
    `Il server risponde: ${casella} su ${dove}. ${coda}`,
  serverZitto: 'Il server non ha detto niente.',
  finoARimedio: 'Fino a che non si rimedia, le comunicazioni escono come file .eml.',
  accountDaCollegare: (utente: string) => `L’account ${utente} non è collegato. `,
  senzaCasella:
    'Senza casella collegata le comunicazioni escono come file .eml, che il ' +
    'registro apre nel programma di posta: a spedirle sei tu, e le spunti quando sono partite.',
  nessunAnno: 'Nessun anno aperto: le bozze non si sanno dove mettere.',
  nessunDestinatario: 'Nessun destinatario.',
  bozzaFallita: (motivo: string) => `La bozza non si è potuta scrivere: ${motivo}`,
  bozzaNonAperta: (percorso: string) => `La bozza è pronta ma non si è aperta da sola: sta in ${percorso}`,
  /** Dove sono finiti i messaggi di un giro, detto dentro una frase. */
  doveServer: 'il server della posta',
  doveProgramma: 'il programma di posta',
  spedisciOra: 'Spedisci ora',
  senzaRitorno: (dettaglio: string) => `${dettaglio}\n\nQuel che parte non si può richiamare.`,
  nessunaCasella: 'Nessuna casella scritta nelle impostazioni: prima «Collega la casella».',
  casellaNonCollegata:
    'La casella non è collegata: non c’è niente da cui far partire una prova. Premi ' +
    '«Collega la casella», poi riprova.',
  titoloProva: 'Regiklass — manda una mail di prova',
  domandaProva:
    'A che indirizzo mandarla. Parte davvero, adesso, e non si può richiamare: di solito si ' +
    'manda a sé stessi.',
  serveIndirizzo: 'Ci vuole un indirizzo di posta.',
  oggettoProva: (quando: string) => `Prova del registro — ${quando}`,
  corpoProva: (casella: string, server: string, quando: string) =>
    'Questa è una mail di prova mandata da Regiklass.\n\n' +
    `Casella: ${casella}\n` +
    `Server: ${server}\n` +
    `Quando: ${quando}\n\n` +
    'Se la leggi, il registro sa spedire: la firma qui sotto è quella che le famiglie e le ' +
    'aziende vedranno in fondo a ogni comunicazione. Se manca, o se al posto del testo ci ' +
    'sono dei tag, la firma va corretta in Impostazioni › Documenti e stampa › Intestazione.',
  provaFallita: (motivo: string) => `La prova non è partita. ${motivo}`,
  nessunaSpiegazione: 'Non è arrivata nessuna spiegazione.',
  provaSpedita: (a: string, server: string) =>
    `Prova spedita a ${a}: ${server} l’ha presa in carico. Se non ` +
    'arriva entro qualche minuto, guarda nella posta indesiderata di chi la riceve — da qui ' +
    'in poi il registro non la vede più.',
  titoloCollega: 'Regiklass — collega la casella',
  domandaAccesso:
    'Con che account entri nella posta della scuola? Il nome di accesso, per esempio ' +
    'xxx000@edu.ti.ch: l’indirizzo da cui scrivi lo scegli dopo, fra quelli dell’account.',
  serveAccesso: 'Ci vuole un nome di accesso nella forma di un indirizzo.',
  titoloMittente: 'Regiklass — da che indirizzo scrivi',
  domandaMittente: 'L’indirizzo che le famiglie vedono in «Da», fra quelli del tuo account',
  principale: 'indirizzo principale',
  alias: 'alias',
  nomeDiAccesso: 'nome di accesso',
  inUso: 'in uso adesso',
  accountNonCollegato: (motivo: string) => `Account non collegato. ${motivo}`,
  accountCollegato: (casella: string, dove: string) => `Account collegato: ${casella}, consegna a ${dove}. `,
  daAccendere:
    'Per far partire le comunicazioni da sé resta da accendere ' +
    'registroDocenti.posta.invioDiretto.',
  provoAEntrare: 'Regiklass: provo a entrare…',
  postaAzzerata:
    'Posta azzerata: tolti il gettone dal portachiavi, quelli in memoria, i tenant ricordati ' +
    'e tutte le impostazioni registroDocenti.posta.*. Ora si riparte da zero con «Collega la ' +
    'casella di posta».',
  accountScollegato:
    'Account scollegato: il registro non usa più l’autorizzazione di Microsoft, che resta ' +
    'visibile nel profilo Microsoft sotto le app collegate e di là si revoca. Le ' +
    'comunicazioni tornano a uscire come file .eml.',
}

export const testi = catalogo(it, {
  de: {
    invioAcceso: 'Der Direktversand ist eingeschaltet: Die Mitteilungen gehen von hier aus weg.',
    invioSpento: 'Der Direktversand ist ausgeschaltet: Die Mitteilungen bleiben Entwürfe zum Durchlesen.',
    serverRisponde: (casella, dove, coda) => `Der Server antwortet: ${casella} auf ${dove}. ${coda}`,
    serverZitto: 'Der Server hat nichts gesagt.',
    finoARimedio: 'Bis das behoben ist, gehen die Mitteilungen als .eml-Dateien hinaus.',
    accountDaCollegare: (utente) => `Das Konto ${utente} ist nicht verbunden. `,
    senzaCasella:
      'Ohne verbundenes Postfach gehen die Mitteilungen als .eml-Dateien hinaus, die das ' +
      'Klassenbuch im E-Mail-Programm öffnet: Senden musst du sie selbst, und du hakst sie ab, ' +
      'wenn sie verschickt sind.',
    nessunAnno: 'Kein Schuljahr geöffnet: Es ist unklar, wohin die Entwürfe sollen.',
    nessunDestinatario: 'Keine Empfänger.',
    bozzaFallita: (motivo) => `Der Entwurf konnte nicht geschrieben werden: ${motivo}`,
    bozzaNonAperta: (percorso) => `Der Entwurf ist bereit, hat sich aber nicht von selbst geöffnet: Er liegt in ${percorso}`,
    doveServer: 'der Mailserver',
    doveProgramma: 'das E-Mail-Programm',
    spedisciOra: 'Jetzt senden',
    senzaRitorno: (dettaglio) => `${dettaglio}\n\nWas verschickt ist, lässt sich nicht zurückholen.`,
    nessunaCasella: 'In den Einstellungen ist kein Postfach eingetragen: Wähle zuerst «Postfach verbinden».',
    casellaNonCollegata:
      'Das Postfach ist nicht verbunden: Es gibt nichts, von dem ein Test ausgehen könnte. ' +
      'Wähle «Postfach verbinden» und versuche es dann erneut.',
    titoloProva: 'Regiklass — Test-E-Mail senden',
    domandaProva:
      'An welche Adresse sie gehen soll. Sie wird wirklich gesendet, jetzt, und lässt sich nicht ' +
      'zurückholen: Meist schickst du sie dir selbst.',
    serveIndirizzo: 'Es braucht eine E-Mail-Adresse.',
    oggettoProva: (quando) => `Test des Klassenbuchs — ${quando}`,
    corpoProva: (casella, server, quando) =>
      'Dies ist eine Test-E-Mail von Regiklass.\n\n' +
      `Postfach: ${casella}\n` +
      `Server: ${server}\n` +
      `Zeitpunkt: ${quando}\n\n` +
      'Wenn du das liest, kann das Klassenbuch senden: Die Signatur hier unten ist die, die Familien ' +
      'und Lehrbetriebe unter jeder Mitteilung sehen werden. Fehlt sie, oder stehen statt des ' +
      'Textes Tags da, muss die Signatur unter Einstellungen › Dokumente und Druck › Briefkopf ' +
      'korrigiert werden.',
    provaFallita: (motivo) => `Der Test wurde nicht gesendet. ${motivo}`,
    nessunaSpiegazione: 'Es kam keine Erklärung.',
    provaSpedita: (a, server) =>
      `Test an ${a} gesendet: ${server} hat ihn übernommen. Kommt er nicht innert einiger ` +
      'Minuten an, schau im Spam-Ordner der empfangenden Person nach — ab hier sieht das ' +
      'Klassenbuch ihn nicht mehr.',
    titoloCollega: 'Regiklass — Postfach verbinden',
    domandaAccesso:
      'Mit welchem Konto meldest du dich bei der Mail der Schule an? Der Anmeldename, zum ' +
      'Beispiel xxx000@edu.ti.ch: Die Adresse, von der du schreibst, wählst du danach unter ' +
      'denen des Kontos.',
    serveAccesso: 'Es braucht einen Anmeldenamen in Form einer Adresse.',
    titoloMittente: 'Regiklass — von welcher Adresse du schreibst',
    domandaMittente: 'Die Adresse, die die Familien unter «Von» sehen, unter denen deines Kontos',
    principale: 'Hauptadresse',
    alias: 'Alias',
    nomeDiAccesso: 'Anmeldename',
    inUso: 'jetzt in Gebrauch',
    accountNonCollegato: (motivo) => `Konto nicht verbunden. ${motivo}`,
    accountCollegato: (casella, dove) => `Konto verbunden: ${casella}, Zustellung an ${dove}. `,
    daAccendere:
      'Damit die Mitteilungen von selbst hinausgehen, muss noch ' +
      'registroDocenti.posta.invioDiretto eingeschaltet werden.',
    provoAEntrare: 'Regiklass: Anmeldung läuft…',
    postaAzzerata:
      'E-Mail zurückgesetzt: Entfernt wurden das Token aus dem Schlüsselbund, die Tokens im ' +
      'Speicher, die gemerkten Tenants und alle Einstellungen registroDocenti.posta.*. Jetzt ' +
      'beginnst du von vorn mit «Postfach verbinden».',
    accountScollegato:
      'Konto getrennt: Das Klassenbuch verwendet die Berechtigung von Microsoft nicht mehr; sie ' +
      'bleibt im Microsoft-Profil unter den verbundenen Apps sichtbar und wird dort widerrufen. ' +
      'Die Mitteilungen gehen wieder als .eml-Dateien hinaus.',
  },
  fr: {
    invioAcceso: 'L’envoi direct est activé : les communications partent d’ici.',
    invioSpento: 'L’envoi direct est désactivé : les communications restent des brouillons à relire.',
    serverRisponde: (casella, dove, coda) => `Le serveur répond : ${casella} sur ${dove}. ${coda}`,
    serverZitto: 'Le serveur n’a rien dit.',
    finoARimedio: 'Tant que ce n’est pas réglé, les communications sortent en fichiers .eml.',
    accountDaCollegare: (utente) => `Le compte ${utente} n’est pas connecté. `,
    senzaCasella:
      'Sans boîte aux lettres connectée, les communications sortent en fichiers .eml, que le ' +
      'registre ouvre dans le programme de messagerie : c’est toi qui les envoies, et tu les ' +
      'coches quand elles sont parties.',
    nessunAnno: 'Aucune année ouverte : on ne sait pas où mettre les brouillons.',
    nessunDestinatario: 'Aucun destinataire.',
    bozzaFallita: (motivo) => `Le brouillon n’a pas pu être écrit : ${motivo}`,
    bozzaNonAperta: (percorso) => `Le brouillon est prêt mais ne s’est pas ouvert tout seul : il se trouve dans ${percorso}`,
    doveServer: 'le serveur de messagerie',
    doveProgramma: 'le programme de messagerie',
    spedisciOra: 'Envoyer maintenant',
    senzaRitorno: (dettaglio) => `${dettaglio}\n\nCe qui part ne peut pas être rappelé.`,
    nessunaCasella:
      'Aucune boîte aux lettres dans les paramètres : choisis d’abord « Connecter la boîte aux lettres ».',
    casellaNonCollegata:
      'La boîte aux lettres n’est pas connectée : il n’y a rien d’où faire partir un essai. ' +
      'Choisis « Connecter la boîte aux lettres », puis réessaie.',
    titoloProva: 'Regiklass — envoyer un e-mail de test',
    domandaProva:
      'À quelle adresse l’envoyer. Il part vraiment, maintenant, et ne peut pas être rappelé : ' +
      'en général, tu te l’envoies à toi-même.',
    serveIndirizzo: 'Il faut une adresse e-mail.',
    oggettoProva: (quando) => `Test du registre — ${quando}`,
    corpoProva: (casella, server, quando) =>
      'Ceci est un e-mail de test envoyé par Regiklass.\n\n' +
      `Boîte aux lettres : ${casella}\n` +
      `Serveur : ${server}\n` +
      `Quand : ${quando}\n\n` +
      'Si tu le lis, le registre sait envoyer : la signature ci-dessous est celle que les ' +
      'familles et les entreprises verront au bas de chaque communication. Si elle manque, ou si ' +
      'des balises apparaissent à la place du texte, la signature est à corriger dans Paramètres › ' +
      'Documents et impression › En-tête.',
    provaFallita: (motivo) => `Le test n’est pas parti. ${motivo}`,
    nessunaSpiegazione: 'Aucune explication n’est arrivée.',
    provaSpedita: (a, server) =>
      `Test envoyé à ${a} : ${server} l’a pris en charge. S’il n’arrive pas d’ici quelques ` +
      'minutes, regarde dans les indésirables de la personne qui le reçoit — à partir d’ici, le ' +
      'registre ne le voit plus.',
    titoloCollega: 'Regiklass — connecter la boîte aux lettres',
    domandaAccesso:
      'Avec quel compte te connectes-tu à la messagerie de l’école ? Le nom de connexion, par ' +
      'exemple xxx000@edu.ti.ch : l’adresse depuis laquelle tu écris se choisit ensuite, parmi ' +
      'celles du compte.',
    serveAccesso: 'Il faut un nom de connexion sous la forme d’une adresse.',
    titoloMittente: 'Regiklass — depuis quelle adresse tu écris',
    domandaMittente: 'L’adresse que les familles voient dans « De », parmi celles de ton compte',
    principale: 'adresse principale',
    alias: 'alias',
    nomeDiAccesso: 'nom de connexion',
    inUso: 'utilisée maintenant',
    accountNonCollegato: (motivo) => `Compte non connecté. ${motivo}`,
    accountCollegato: (casella, dove) => `Compte connecté : ${casella}, remise à ${dove}. `,
    daAccendere:
      'Pour que les communications partent d’elles-mêmes, il reste à activer ' +
      'registroDocenti.posta.invioDiretto.',
    provoAEntrare: 'Regiklass : connexion en cours…',
    postaAzzerata:
      'Messagerie remise à zéro : le jeton du trousseau, ceux en mémoire, les tenants mémorisés ' +
      'et tous les paramètres registroDocenti.posta.* ont été retirés. Tu repars maintenant de ' +
      'zéro avec « Connecter la boîte aux lettres ».',
    accountScollegato:
      'Compte déconnecté : le registre n’utilise plus l’autorisation de Microsoft, qui reste ' +
      'visible dans le profil Microsoft parmi les applications connectées et se révoque de là. ' +
      'Les communications ressortent en fichiers .eml.',
  },
  en: {
    invioAcceso: 'Direct sending is on: messages go out from here.',
    invioSpento: 'Direct sending is off: messages stay as drafts to reread.',
    serverRisponde: (casella, dove, coda) => `The server is responding: ${casella} on ${dove}. ${coda}`,
    serverZitto: 'The server said nothing.',
    finoARimedio: 'Until this is fixed, messages go out as .eml files.',
    accountDaCollegare: (utente) => `The account ${utente} is not connected. `,
    senzaCasella:
      'Without a connected mailbox, messages go out as .eml files, which the register opens in ' +
      'the email program: you send them yourself, and tick them off once they have gone.',
    nessunAnno: 'No year open: there is nowhere to put the drafts.',
    nessunDestinatario: 'No recipients.',
    bozzaFallita: (motivo) => `The draft could not be written: ${motivo}`,
    bozzaNonAperta: (percorso) => `The draft is ready but did not open by itself: it is in ${percorso}`,
    doveServer: 'the mail server',
    doveProgramma: 'the email program',
    spedisciOra: 'Send now',
    senzaRitorno: (dettaglio) => `${dettaglio}\n\nWhat goes out cannot be recalled.`,
    nessunaCasella: 'No mailbox in the settings: choose “Connect the mailbox” first.',
    casellaNonCollegata:
      'The mailbox is not connected: there is nothing to send a test from. Choose ' +
      '“Connect the mailbox”, then try again.',
    titoloProva: 'Regiklass — send a test email',
    domandaProva:
      'Which address to send it to. It really goes out, now, and cannot be recalled: usually you ' +
      'send it to yourself.',
    serveIndirizzo: 'An email address is needed.',
    oggettoProva: (quando) => `Register test — ${quando}`,
    corpoProva: (casella, server, quando) =>
      'This is a test email sent by Regiklass.\n\n' +
      `Mailbox: ${casella}\n` +
      `Server: ${server}\n` +
      `When: ${quando}\n\n` +
      'If you are reading this, the register can send: the signature below is the one families ' +
      'and companies will see at the bottom of every message. If it is missing, or if there are ' +
      'tags instead of text, correct the signature in Settings › Documents and printing › Letterhead.',
    provaFallita: (motivo) => `The test did not go out. ${motivo}`,
    nessunaSpiegazione: 'No explanation came back.',
    provaSpedita: (a, server) =>
      `Test sent to ${a}: ${server} has taken it on. If it does not arrive within a few minutes, ` +
      'look in the recipient’s junk mail — from here on the register can no longer see it.',
    titoloCollega: 'Regiklass — connect the mailbox',
    domandaAccesso:
      'Which account do you sign in to the school mail with? The sign-in name, for example ' +
      'xxx000@edu.ti.ch: you choose the address you write from afterwards, among the ' +
      'account’s addresses.',
    serveAccesso: 'A sign-in name in the form of an address is needed.',
    titoloMittente: 'Regiklass — which address you write from',
    domandaMittente: 'The address families see in “From”, among those of your account',
    principale: 'primary address',
    alias: 'alias',
    nomeDiAccesso: 'sign-in name',
    inUso: 'in use now',
    accountNonCollegato: (motivo) => `Account not connected. ${motivo}`,
    accountCollegato: (casella, dove) => `Account connected: ${casella}, delivering to ${dove}. `,
    daAccendere:
      'For messages to go out by themselves, registroDocenti.posta.invioDiretto still has to be ' +
      'switched on.',
    provoAEntrare: 'Regiklass: signing in…',
    postaAzzerata:
      'Mail reset: the token in the keychain, the ones in memory, the remembered tenants and ' +
      'all the registroDocenti.posta.* settings have been removed. Now start again from scratch ' +
      'with “Connect the mailbox”.',
    accountScollegato:
      'Account disconnected: the register no longer uses Microsoft’s authorisation, which stays ' +
      'visible in the Microsoft profile under connected apps and can be revoked from there. ' +
      'Messages go out as .eml files again.',
  },
})
