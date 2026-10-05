// I testi della posta nelle impostazioni (`settings/mail.tsx`). Nomi e
// descrizioni delle voci vengono dal manifesto.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nessunaRisposta: 'Non è arrivata nessuna risposta.',
  partonoDalRegistro: (server: string) =>
    `le comunicazioni partono dal registro, consegnate a ${server}`,
  esconoComeEml: 'le comunicazioni escono come file .eml, da spedire dal programma di posta',
  daCollegare: 'casella da collegare',
  premiCollega:
    'Premi «Collega la casella»: chiede solo l’account, apre l’accesso nel browser e fa ' +
    'scegliere il mittente fra gli indirizzi dell’account.',
  collegata: 'casella collegata',
  collegaInAccount: 'Si collega in Utente › Account, insieme ai permessi di OneDrive.',
  vaiAdAccount: 'Vai ad Account',
  vaiAdAccountAiuto: 'Collegare, provare, scollegare e azzerare la casella stanno lì',
  senzaEffetto: 'senza effetto: casella non collegata',
  account: 'Account',
  mittente: 'Mittente («Da»)',
  mittenteAiuto:
    'Gli indirizzi del tuo account, come li dice Microsoft. Se la scuola non lascia spedire ' +
    'dagli alias, il server rifiuta con 5.7.60: torna all’indirizzo principale.',
  nonDetto: '—',
  server: 'Server',
  serverValore: (server: string, porta: number) =>
    server ? `${server}, porta ${porta}, STARTTLS` : '—',
  autenticazione: 'Accesso',
  autenticazioneValore:
    'account Microsoft dal browser; il registro ha solo il permesso di spedire, nel portachiavi',
  comunicazioni: 'Comunicazioni',
  quandoParte: 'Quando parte',
  posta: 'Posta',
  ricollega: 'Ricollega la casella',
  collega: 'Collega la casella',
  collegaAiuto:
    'Chiede l’account, apre la pagina di Microsoft nel browser, fa scegliere il mittente e ' +
    'prova. Quel che apre la casella va nel portachiavi del sistema, non nelle impostazioni.',
  prova: 'Prova il collegamento',
  provaAiuto: 'Va a bussare alla casella e si fa dire di chi è. Non manda niente.',
  mandaProva: 'Manda una prova',
  mandaProvaAiuto:
    'Manda una mail vera all’indirizzo che scrivi — di solito il tuo. È l’unico modo ' +
    'di vedere se il permesso di spedire c’è e se la firma arriva com’è scritta.',
  scollega: 'Scollega',
  scollegaAiuto:
    'Toglie dal portachiavi il gettone di Microsoft e la password: si torna ai file ' +
    '.eml. L’autorizzazione data al programma si revoca dal profilo Microsoft.',
  firmaDiSerieMancante:
    'Vuota, vale la firma di serie: chi firma e la scuola della prima carta intestata, ' +
    'in Impostazioni › Utente › Chi sei e Carta e stampa. Adesso mancano tutti e due, e le e-mail partono senza firma.',
  collegamento: 'Collegamento',
  collegaIndirizzo: 'Collega',
  indirizzoSegnaposto: 'www.scuola.ch, nome@scuola.ch',
  indirizzoAiuto: 'Una pagina o una mail. Vuoto, toglie il collegamento.',
  firma: 'Firma delle e-mail',
  firmaAiuto:
    'Si salva nel file dell’anno, non su questo computer. Vuota, vale la firma di serie con il ' +
    'nome di chi firma e la scuola della prima carta intestata. Va in fondo alle mail che ' +
    'spedisce il registro; le bozze .eml escono senza, perché la firma la mette il ' +
    'programma di posta.',
  firmaNota:
    'Si scrive come in un programma di posta, e se ne può incollare una da Outlook con i suoi ' +
    'colori. Lasciata vuota, vale quella di serie che si vede in grigio.',
}

export const testi = catalogo(it, {
  de: {
    nessunaRisposta: 'Es ist keine Antwort gekommen.',
    partonoDalRegistro: (server) =>
      `die Mitteilungen gehen vom Klassenbuch aus, zugestellt über ${server}`,
    esconoComeEml:
      'die Mitteilungen gehen als .eml-Dateien hinaus, zum Versand aus dem Mailprogramm',
    daCollegare: 'Postfach nicht verbunden',
    premiCollega:
      'Drücke «Postfach verbinden»: Es fragt nur nach dem Konto, öffnet die Anmeldung im ' +
      'Browser und lässt den Absender unter den Adressen des Kontos wählen.',
    collegata: 'Postfach verbunden',
    collegaInAccount: 'Verbunden wird es unter Benutzer › Konten, zusammen mit den Berechtigungen für OneDrive.',
    vaiAdAccount: 'Zu den Konten',
    vaiAdAccountAiuto: 'Verbinden, testen, trennen und zurücksetzen des Postfachs sind dort',
    senzaEffetto: 'ohne Wirkung: Postfach nicht verbunden',
    account: 'Konto',
    mittente: 'Absender («Von»)',
    mittenteAiuto:
      'Die Adressen deines Kontos, wie Microsoft sie angibt. Erlaubt die Schule das Senden von ' +
      'Aliasen nicht, lehnt der Server mit 5.7.60 ab: Nimm wieder die Hauptadresse.',
    nonDetto: '—',
    server: 'Server',
    serverValore: (server, porta) => (server ? `${server}, Port ${porta}, STARTTLS` : '—'),
    autenticazione: 'Anmeldung',
    autenticazioneValore:
      'Microsoft-Konto im Browser; das Klassenbuch hat nur die Berechtigung zu senden, im ' +
      'Schlüsselbund',
    comunicazioni: 'Mitteilungen',
    quandoParte: 'Wann es verschickt wird',
    posta: 'E-Mail',
    ricollega: 'Postfach neu verbinden',
    collega: 'Postfach verbinden',
    collegaAiuto:
      'Fragt nach dem Konto, öffnet die Seite von Microsoft im Browser, lässt den Absender wählen ' +
      'und testet. Was das Postfach öffnet, kommt in den Schlüsselbund des Systems, nicht in ' +
      'die Einstellungen.',
    prova: 'Verbindung testen',
    provaAiuto: 'Klopft beim Postfach an und lässt sich sagen, wem es gehört. Verschickt nichts.',
    mandaProva: 'Test senden',
    mandaProvaAiuto:
      'Schickt eine echte Mail an die Adresse, die du angibst — meist deine eigene. Nur so ' +
      'sieht man, ob die Berechtigung zum Senden da ist und ob die Signatur so ankommt, wie ' +
      'sie geschrieben ist.',
    scollega: 'Trennen',
    scollegaAiuto:
      'Entfernt das Microsoft-Token und das Passwort aus dem Schlüsselbund: Man kehrt zu den ' +
      '.eml-Dateien zurück. Die dem Programm erteilte Berechtigung widerruft man im ' +
      'Microsoft-Profil.',
    firmaDiSerieMancante:
      'Leer gilt die Standardsignatur: wer unterschreibt und die Schule des ersten Briefpapiers, ' +
      'unter Einstellungen › Benutzer › Wer du bist und Briefpapier und Druck. Im Moment fehlt beides, und die E-Mails gehen ohne ' +
      'Signatur hinaus.',
    collegamento: 'Link',
    collegaIndirizzo: 'Verknüpfen',
    indirizzoSegnaposto: 'www.schule.ch, name@schule.ch',
    indirizzoAiuto: 'Eine Seite oder eine Mailadresse. Leer entfernt den Link.',
    firma: 'E-Mail-Signatur',
    firmaAiuto:
      'Wird in der Datei des Jahres gespeichert, nicht auf diesem Computer. Leer gilt die ' +
      'Standardsignatur mit dem Namen der unterschreibenden Person und der Schule des ersten ' +
      'Briefpapiers. Sie steht am Ende der Mails, die das Klassenbuch verschickt; die ' +
      '.eml-Entwürfe gehen ohne hinaus, weil die Signatur das Mailprogramm setzt.',
    firmaNota:
      'Man schreibt sie wie in einem Mailprogramm und kann eine aus Outlook samt Farben ' +
      'einfügen. Leer gilt die Standardsignatur, die grau angezeigt wird.',
  },
  fr: {
    nessunaRisposta: 'Aucune réponse n’est arrivée.',
    partonoDalRegistro: (server) =>
      `les communications partent du registre, remises à ${server}`,
    esconoComeEml:
      'les communications sortent en fichiers .eml, à envoyer depuis le programme de messagerie',
    daCollegare: 'boîte à connecter',
    premiCollega:
      'Clique sur « Connecter la boîte » : il demande seulement le compte, ouvre la connexion ' +
      'dans le navigateur et fait choisir l’expéditeur parmi les adresses du compte.',
    collegata: 'boîte connectée',
    collegaInAccount: 'Elle se connecte dans Utilisateur › Comptes, avec les autorisations de OneDrive.',
    vaiAdAccount: 'Aller aux comptes',
    vaiAdAccountAiuto: 'Connecter, tester, déconnecter et réinitialiser la boîte se font là',
    senzaEffetto: 'sans effet : boîte non connectée',
    account: 'Compte',
    mittente: 'Expéditeur (« De »)',
    mittenteAiuto:
      'Les adresses de ton compte, telles que Microsoft les donne. Si l’école ne laisse pas ' +
      'envoyer depuis les alias, le serveur refuse avec 5.7.60 : reviens à l’adresse principale.',
    nonDetto: '—',
    server: 'Serveur',
    serverValore: (server, porta) => (server ? `${server}, port ${porta}, STARTTLS` : '—'),
    autenticazione: 'Connexion',
    autenticazioneValore:
      'compte Microsoft dans le navigateur ; le registre n’a que l’autorisation d’envoyer, ' +
      'dans le trousseau',
    comunicazioni: 'Communications',
    quandoParte: 'Quand ça part',
    posta: 'Messagerie',
    ricollega: 'Reconnecter la boîte',
    collega: 'Connecter la boîte',
    collegaAiuto:
      'Demande le compte, ouvre la page de Microsoft dans le navigateur, fait choisir ' +
      'l’expéditeur et teste. Ce qui ouvre la boîte va dans le trousseau du système, pas dans ' +
      'les paramètres.',
    prova: 'Tester la connexion',
    provaAiuto: 'Va frapper à la boîte et se fait dire à qui elle est. N’envoie rien.',
    mandaProva: 'Envoyer un test',
    mandaProvaAiuto:
      'Envoie un vrai e-mail à l’adresse que tu indiques — en général la tienne. C’est le seul ' +
      'moyen de voir si l’autorisation d’envoyer existe et si la signature arrive telle qu’elle ' +
      'est écrite.',
    scollega: 'Déconnecter',
    scollegaAiuto:
      'Retire du trousseau le jeton de Microsoft et le mot de passe : on revient aux fichiers ' +
      '.eml. L’autorisation donnée au programme se révoque depuis le profil Microsoft.',
    firmaDiSerieMancante:
      'Vide, c’est la signature standard qui vaut : qui signe et l’école du premier papier à ' +
      'en-tête, dans Paramètres › Utilisateur › Qui tu es et Papier et impression. En ce moment les deux manquent, et les e-mails ' +
      'partent sans signature.',
    collegamento: 'Lien',
    collegaIndirizzo: 'Relier',
    indirizzoSegnaposto: 'www.ecole.ch, nom@ecole.ch',
    indirizzoAiuto: 'Une page ou une adresse e-mail. Vide, retire le lien.',
    firma: 'Signature des e-mails',
    firmaAiuto:
      'S’enregistre dans le fichier de l’année, pas sur cet ordinateur. Vide, c’est la ' +
      'signature standard qui vaut, avec le nom de qui signe et l’école du premier papier à ' +
      'en-tête. Elle va à la fin des e-mails qu’envoie le registre ; les brouillons .eml sortent ' +
      'sans, parce que c’est le programme de messagerie qui met la signature.',
    firmaNota:
      'Elle s’écrit comme dans un programme de messagerie, et on peut en coller une depuis ' +
      'Outlook avec ses couleurs. Laissée vide, c’est celle standard, visible en gris, qui vaut.',
  },
  en: {
    nessunaRisposta: 'No reply arrived.',
    partonoDalRegistro: (server) => `messages go out from the register, delivered to ${server}`,
    esconoComeEml: 'messages go out as .eml files, to be sent from the mail program',
    daCollegare: 'mailbox to connect',
    premiCollega:
      'Press “Connect the mailbox”: it asks only for the account, opens the sign-in in the ' +
      'browser and lets you choose the sender among the account’s addresses.',
    collegata: 'mailbox connected',
    collegaInAccount: 'It is connected in User › Accounts, together with the OneDrive permissions.',
    vaiAdAccount: 'Go to Accounts',
    vaiAdAccountAiuto: 'Connecting, testing, disconnecting and resetting the mailbox happen there',
    senzaEffetto: 'no effect: mailbox not connected',
    account: 'Account',
    mittente: 'Sender (“From”)',
    mittenteAiuto:
      'Your account’s addresses, as Microsoft gives them. If the school does not allow sending ' +
      'from aliases, the server refuses with 5.7.60: go back to the primary address.',
    nonDetto: '—',
    server: 'Server',
    serverValore: (server, porta) => (server ? `${server}, port ${porta}, STARTTLS` : '—'),
    autenticazione: 'Sign-in',
    autenticazioneValore:
      'Microsoft account in the browser; the register only has the permission to send, in the ' +
      'keychain',
    comunicazioni: 'Communications',
    quandoParte: 'When it goes out',
    posta: 'Mail',
    ricollega: 'Reconnect the mailbox',
    collega: 'Connect the mailbox',
    collegaAiuto:
      'Asks for the account, opens Microsoft’s page in the browser, lets you choose the sender ' +
      'and tests. What opens the mailbox goes into the system keychain, not into the settings.',
    prova: 'Test the connection',
    provaAiuto: 'Knocks on the mailbox and asks whose it is. Sends nothing.',
    mandaProva: 'Send a test',
    mandaProvaAiuto:
      'Sends a real email to the address you give — usually your own. It is the only way to see ' +
      'whether the permission to send is there and whether the signature arrives as written.',
    scollega: 'Disconnect',
    scollegaAiuto:
      'Removes the Microsoft token and the password from the keychain: you go back to .eml ' +
      'files. The permission given to the program is revoked from your Microsoft profile.',
    firmaDiSerieMancante:
      'If empty, the standard signature applies: who signs and the school of the first ' +
      'letterhead, in Settings › User › Who you are and Letterheads and printing. Right now both are missing, and emails go out ' +
      'without a signature.',
    collegamento: 'Link',
    collegaIndirizzo: 'Link',
    indirizzoSegnaposto: 'www.school.ch, name@school.ch',
    indirizzoAiuto: 'A page or an email address. Empty removes the link.',
    firma: 'Email signature',
    firmaAiuto:
      'Saved in the year’s file, not on this computer. If empty, the standard signature ' +
      'applies, with the name of the person who signs and the school of the first letterhead. ' +
      'It goes at the end of the emails the register sends; .eml drafts go out without it, ' +
      'because the mail program adds the signature.',
    firmaNota:
      'You write it as in a mail program, and you can paste one from Outlook with its colours. ' +
      'Left empty, the standard one shown in grey applies.',
  },
})
