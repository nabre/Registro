// I guasti della consegna a Exchange e che cosa fare. I nomi tecnici (SMTP,
// tenant, comandi PowerShell) restano quelli che si cercano; le impostazioni si
// citano con la chiave `registroDocenti.posta.*`.

import { catalogo } from '../i18n/index.js'

const it = {
  serverMuto: 'Il server non risponde.',
  /**
   * Le parole comuni a `serverMuto` e `portaMuta`, da cui `rimedio` le
   * riconosce: devono comparire identiche in tutte e due.
   */
  sintomoMuto: 'non risponde',
  chiuso: 'Il server ha chiuso il collegamento.',
  portaMuta: (server: string, porta: number) => `${server} non risponde sulla porta ${porta}.`,
  senzaCifratura: (server: string) =>
    `${server} non offre un canale cifrato: di qui non passano né il gettone né gli ` +
    'indirizzi delle famiglie.',
  gettoneRifiutatoPerche: (stato: string) => `Il gettone non è stato accettato (${stato}).`,
  senzaCodice: 'senza codice',
  gettoneRifiutato: 'Il gettone non è stato accettato.',
  nonMicrosoft:
    'Il server non accetta l’accesso con l’account Microsoft: questa casella non è di ' +
    'Microsoft 365, e il registro non sa entrarci.',
  smtpSpentoNelTenant:
    'Il tenant tiene spenta la consegna SMTP autenticata: nessun gettone la fa ' +
    'funzionare. Va chiesto all’amministratore di accenderla sulla casella ' +
    '(Set-CASMailbox -SmtpClientAuthenticationDisabled $false). Fino ad allora restano le bozze.',
  smtpSpentoSullaCasella:
    'Exchange rifiuta il gettone: sulla casella la consegna SMTP autenticata è spenta, ' +
    'e va accesa da chi amministra il tenant.',
  gettoneScadutoOSpento: (detto: string) =>
    'Il gettone non è stato accettato. O l’autorizzazione è scaduta — allora si rifà il ' +
    'collegamento — o sulla casella la consegna SMTP è spenta, e allora la riaccende chi ' +
    `amministra il tenant. (${detto})`,
  mittenteNonConcesso:
    'La casella con cui si è entrati non può spedire da quell’indirizzo: ' +
    '«registroDocenti.posta.mittente» dev’essere un indirizzo della casella in cui si entra ' +
    'con «registroDocenti.posta.utente», o uno da cui si è autorizzati a spedire.',
  troppiMessaggi: (detto: string) =>
    'Exchange ha smesso di accettare messaggi per un po’: ne sono partiti troppi in poco ' +
    `tempo. Si riprova fra un minuto con quelli rimasti. (${detto})`,
  serverIntrovabile: (server: string, detto: string) =>
    `${server} non si trova: il computer non arriva al DNS, o la rete lo blocca. (${detto})`,
  reteChiusa: (detto: string) =>
    `Il server non risponde: ${detto} ` +
    'Da una rete che blocca la porta di consegna il collegamento non si apre — succede ' +
    'con certe reti di ospiti e con qualche antivirus.',
  senzaMittente: 'Manca l’indirizzo con cui spedire.',
  senzaAutorizzazione: 'L’account non è collegato: manca l’autorizzazione di Microsoft.',
  nonCollegato: 'L’account non è collegato.',
  speditoMaNonA: (rifiutati: string) => `Spedito, ma non a: ${rifiutati}`,
  nessunDestinatario: 'Nessun destinatario.',
  nessunoAccettato: (rifiutati: string) => `Nessun destinatario accettato: ${rifiutati}`,
}

export const testi = catalogo(it, {
  de: {
    serverMuto: 'Der Server antwortet nicht.',
    sintomoMuto: 'antwortet nicht',
    chiuso: 'Der Server hat die Verbindung geschlossen.',
    portaMuta: (server, porta) => `${server} antwortet nicht auf Port ${porta}.`,
    senzaCifratura: (server) =>
      `${server} bietet keinen verschlüsselten Kanal an: Darüber gehen weder das Token noch die ` +
      'Adressen der Familien.',
    gettoneRifiutatoPerche: (stato) => `Das Token wurde nicht angenommen (${stato}).`,
    senzaCodice: 'ohne Code',
    gettoneRifiutato: 'Das Token wurde nicht angenommen.',
    nonMicrosoft:
      'Der Server akzeptiert die Anmeldung mit dem Microsoft-Konto nicht: Dieses Postfach gehört ' +
      'nicht zu Microsoft 365, und das Klassenbuch kann sich dort nicht anmelden.',
    smtpSpentoNelTenant:
      'Im Tenant ist die authentifizierte SMTP-Zustellung ausgeschaltet: Kein Token bringt sie ' +
      'zum Laufen. Die Administration muss sie für das Postfach einschalten ' +
      '(Set-CASMailbox -SmtpClientAuthenticationDisabled $false). Bis dahin bleiben die Entwürfe.',
    smtpSpentoSullaCasella:
      'Exchange lehnt das Token ab: Für das Postfach ist die authentifizierte SMTP-Zustellung ' +
      'ausgeschaltet, und die Administration des Tenants muss sie einschalten.',
    gettoneScadutoOSpento: (detto) =>
      'Das Token wurde nicht angenommen. Entweder ist die Berechtigung abgelaufen — dann ' +
      'verbinde das Konto neu — oder für das Postfach ist die SMTP-Zustellung ausgeschaltet, und dann ' +
      `schaltet sie die Administration des Tenants wieder ein. (${detto})`,
    mittenteNonConcesso:
      'Das Postfach, mit dem du angemeldet bist, darf nicht von dieser Adresse senden: ' +
      '«registroDocenti.posta.mittente» muss eine Adresse des Postfachs sein, in das du dich ' +
      'mit «registroDocenti.posta.utente» anmeldest, oder eine, von der du senden darfst.',
    troppiMessaggi: (detto) =>
      'Exchange nimmt eine Weile keine Nachrichten mehr an: In kurzer Zeit wurden zu viele ' +
      `gesendet. In einer Minute wird es mit den restlichen erneut versucht. (${detto})`,
    serverIntrovabile: (server, detto) =>
      `${server} wird nicht gefunden: Der Computer erreicht das DNS nicht, oder das Netz blockiert es. (${detto})`,
    reteChiusa: (detto) =>
      `Der Server antwortet nicht: ${detto} ` +
      'Aus einem Netz, das den Zustellungsport sperrt, kommt die Verbindung nicht zustande — das ' +
      'passiert in manchen Gästenetzen und mit einigen Virenschutzprogrammen.',
    senzaMittente: 'Die Absenderadresse fehlt.',
    senzaAutorizzazione: 'Das Konto ist nicht verbunden: Die Berechtigung von Microsoft fehlt.',
    nonCollegato: 'Das Konto ist nicht verbunden.',
    speditoMaNonA: (rifiutati) => `Gesendet, aber nicht an: ${rifiutati}`,
    nessunDestinatario: 'Keine Empfänger.',
    nessunoAccettato: (rifiutati) => `Kein Empfänger angenommen: ${rifiutati}`,
  },
  fr: {
    serverMuto: 'Le serveur ne répond pas.',
    sintomoMuto: 'ne répond pas',
    chiuso: 'Le serveur a fermé la connexion.',
    portaMuta: (server, porta) => `${server} ne répond pas sur le port ${porta}.`,
    senzaCifratura: (server) =>
      `${server} n’offre pas de canal chiffré : ni le jeton ni les adresses des familles ne ` +
      'passent par là.',
    gettoneRifiutatoPerche: (stato) => `Le jeton n’a pas été accepté (${stato}).`,
    senzaCodice: 'sans code',
    gettoneRifiutato: 'Le jeton n’a pas été accepté.',
    nonMicrosoft:
      'Le serveur n’accepte pas la connexion avec le compte Microsoft : cette boîte aux lettres ' +
      'n’est pas une boîte Microsoft 365, et le registre ne sait pas s’y connecter.',
    smtpSpentoNelTenant:
      'Le tenant garde désactivée la remise SMTP authentifiée : aucun jeton ne la fait ' +
      'fonctionner. Il faut demander à l’administrateur de l’activer sur la boîte aux lettres ' +
      '(Set-CASMailbox -SmtpClientAuthenticationDisabled $false). D’ici là, il reste les brouillons.',
    smtpSpentoSullaCasella:
      'Exchange refuse le jeton : la remise SMTP authentifiée est désactivée sur la boîte aux ' +
      'lettres, et c’est à la personne qui administre le tenant de l’activer.',
    gettoneScadutoOSpento: (detto) =>
      'Le jeton n’a pas été accepté. Soit l’autorisation a expiré — il faut alors refaire la ' +
      'connexion —, soit la remise SMTP est désactivée sur la boîte aux lettres, et c’est alors ' +
      `à la personne qui administre le tenant de la réactiver. (${detto})`,
    mittenteNonConcesso:
      'La boîte aux lettres avec laquelle tu t’es connecté ne peut pas envoyer depuis cette ' +
      'adresse : « registroDocenti.posta.mittente » doit être une adresse de la boîte à ' +
      'laquelle tu te connectes avec « registroDocenti.posta.utente », ou une adresse depuis ' +
      'laquelle tu es autorisé à envoyer.',
    troppiMessaggi: (detto) =>
      'Exchange a cessé d’accepter des messages pour un moment : trop de messages sont partis en ' +
      `peu de temps. Nouvel essai dans une minute avec ceux qui restent. (${detto})`,
    serverIntrovabile: (server, detto) =>
      `${server} est introuvable : l’ordinateur n’atteint pas le DNS, ou le réseau le bloque. (${detto})`,
    reteChiusa: (detto) =>
      `Le serveur ne répond pas : ${detto} ` +
      'Depuis un réseau qui bloque le port de remise, la connexion ne s’ouvre pas — cela arrive ' +
      'avec certains réseaux d’invités et avec quelques antivirus.',
    senzaMittente: 'L’adresse d’envoi manque.',
    senzaAutorizzazione: 'Le compte n’est pas connecté : l’autorisation de Microsoft manque.',
    nonCollegato: 'Le compte n’est pas connecté.',
    speditoMaNonA: (rifiutati) => `Envoyé, mais pas à : ${rifiutati}`,
    nessunDestinatario: 'Aucun destinataire.',
    nessunoAccettato: (rifiutati) => `Aucun destinataire accepté : ${rifiutati}`,
  },
  en: {
    serverMuto: 'The server is not responding.',
    sintomoMuto: 'not responding',
    chiuso: 'The server closed the connection.',
    portaMuta: (server, porta) => `${server} is not responding on port ${porta}.`,
    senzaCifratura: (server) =>
      `${server} does not offer an encrypted channel: neither the token nor the families’ ` +
      'addresses go that way.',
    gettoneRifiutatoPerche: (stato) => `The token was not accepted (${stato}).`,
    senzaCodice: 'no code',
    gettoneRifiutato: 'The token was not accepted.',
    nonMicrosoft:
      'The server does not accept sign-in with the Microsoft account: this mailbox is not a ' +
      'Microsoft 365 one, and the register cannot get into it.',
    smtpSpentoNelTenant:
      'The tenant keeps authenticated SMTP submission switched off: no token will make it work. ' +
      'Ask the administrator to switch it on for the mailbox ' +
      '(Set-CASMailbox -SmtpClientAuthenticationDisabled $false). Until then, the drafts remain.',
    smtpSpentoSullaCasella:
      'Exchange rejects the token: authenticated SMTP submission is switched off for the mailbox, ' +
      'and whoever administers the tenant has to switch it on.',
    gettoneScadutoOSpento: (detto) =>
      'The token was not accepted. Either the authorisation has expired — in which case connect ' +
      'again — or SMTP submission is switched off for the mailbox, in which case whoever ' +
      `administers the tenant has to switch it back on. (${detto})`,
    mittenteNonConcesso:
      'The mailbox you signed in with cannot send from that address: ' +
      '“registroDocenti.posta.mittente” must be an address of the mailbox you sign in to with ' +
      '“registroDocenti.posta.utente”, or one you are allowed to send from.',
    troppiMessaggi: (detto) =>
      'Exchange has stopped accepting messages for a while: too many were sent in a short time. ' +
      `It will try again in a minute with the ones left. (${detto})`,
    serverIntrovabile: (server, detto) =>
      `${server} cannot be found: the computer cannot reach DNS, or the network is blocking it. (${detto})`,
    reteChiusa: (detto) =>
      `The server is not responding: ${detto} ` +
      'On a network that blocks the submission port the connection does not open — this ' +
      'happens with some guest networks and with some antivirus software.',
    senzaMittente: 'The sending address is missing.',
    senzaAutorizzazione: 'The account is not connected: Microsoft’s authorisation is missing.',
    nonCollegato: 'The account is not connected.',
    speditoMaNonA: (rifiutati) => `Sent, but not to: ${rifiutati}`,
    nessunDestinatario: 'No recipients.',
    nessunoAccettato: (rifiutati) => `No recipient accepted: ${rifiutati}`,
  },
})
