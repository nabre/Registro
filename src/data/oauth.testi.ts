// I testi di `oauth.ts`: pagina di ritorno nel browser, avanzamento, e motivi
// di un collegamento fallito (che dicono che cosa fare, non la causa). Le voci
// del portale Microsoft sono scritte come il portale le mostra in quella lingua.

import { catalogo } from '../i18n/index.js'

const it = {
  senzaPortachiavi: 'Il portachiavi del sistema non è disponibile.',
  rispostaEstranea: 'Questa risposta non è quella che il registro aspetta.',
  /** Il dettaglio di `accessoNonAperto`: minuscolo, sta fra parentesi. */
  portaNonAperta: 'la porta in ascolto non si è aperta',
  browserNonAperto: 'il browser di sistema non si è aperto',
  /** Il titolo della pagina di ritorno quando il permesso non è arrivato. */
  nonAndata: 'Non è andata',
  permessoNegato:
    'Il registro non ha ricevuto il permesso. Torna al registro: là c’è scritto perché.',
  permessoRicevuto:
    'Il registro ha ricevuto il permesso. Puoi chiudere questa scheda e tornare al registro.',
  accedi: (indirizzo: string) => `Regiclass: accedi come ${indirizzo} nel browser che si è aperto…`,
  accessoNonAperto: (dettaglio: string) =>
    `Il registro non è riuscito ad aprire l’accesso nel browser. (${dettaglio})`,
  tempoScaduto: 'È passato troppo tempo senza che l’accesso finisse: riprova.',
  rispostaAltrui: 'La risposta arrivata non è quella della richiesta partita da qui: riprova.',
  codiceScaduto: 'Il codice è scaduto prima che fosse autorizzato: riprova.',
  rifiutata: 'L’autorizzazione è stata rifiutata.',
  nonPubblico:
    'L’applicazione registrata non è dichiarata come client pubblico: nel portale, in ' +
    'Autenticazione, metti «Consenti flussi client pubblici» su Sì e salva.',
  consensoAmministratore: (client: string) =>
    'La scuola non lascia che il registro spedisca dalla tua casella, e non è una cosa che ' +
    'si possa rimediare da qui: il consenso lo deve dare chi amministra il tenant. È una ' +
    'richiesta precisa, e conviene girargliela così com’è — «consenso amministratore per ' +
    `l’applicazione ${client} (Microsoft Graph Command Line Tools) sul permesso delegato ` +
    'SMTP.Send di Office 365 Exchange Online». Fino ad allora le comunicazioni escono come ' +
    'file .eml, e a spedirle sei tu.',
  clientSconosciuto: (client: string) =>
    `Microsoft non riconosce l’applicazione ${client}: se l’ha ritirata, il registro va ` +
    'aggiornato.',
  altraOrganizzazione:
    'L’account con cui hai autorizzato non appartiene all’organizzazione dell’indirizzo: ' +
    'rifai il collegamento accedendo con la casella della scuola.',
  consensoNegato:
    'Il consenso non è stato dato. Se la pagina dice che serve un amministratore, la scuola ' +
    'ha chiuso il consenso degli utenti: va chiesto a chi amministra il tenant.',
  senzaPerche: 'Microsoft non ha detto perché.',
}

export const testi = catalogo(it, {
  de: {
    senzaPortachiavi: 'Der Schlüsselbund des Systems ist nicht verfügbar.',
    rispostaEstranea: 'Diese Antwort ist nicht die, auf die das Klassenbuch wartet.',
    portaNonAperta: 'der Port zum Empfangen hat sich nicht geöffnet',
    browserNonAperto: 'der Browser des Systems hat sich nicht geöffnet',
    nonAndata: 'Hat nicht geklappt',
    permessoNegato:
      'Das Klassenbuch hat die Berechtigung nicht erhalten. Geh zurück zum Klassenbuch: ' +
      'Dort steht, warum.',
    permessoRicevuto:
      'Das Klassenbuch hat die Berechtigung erhalten. Du kannst diesen Tab schliessen und ' +
      'zum Klassenbuch zurückkehren.',
    accedi: (indirizzo) =>
      `Regiclass: Melde dich im geöffneten Browser als ${indirizzo} an…`,
    accessoNonAperto: (dettaglio) =>
      `Das Klassenbuch konnte die Anmeldung im Browser nicht öffnen. (${dettaglio})`,
    tempoScaduto: 'Es ist zu viel Zeit vergangen, ohne dass die Anmeldung abgeschlossen wurde: ' +
      'Versuch es noch einmal.',
    rispostaAltrui:
      'Die eingetroffene Antwort gehört nicht zur Anfrage, die von hier ausging: ' +
      'Versuch es noch einmal.',
    codiceScaduto: 'Der Code ist abgelaufen, bevor er bestätigt wurde: Versuch es noch einmal.',
    rifiutata: 'Die Berechtigung wurde verweigert.',
    nonPubblico:
      'Die registrierte Anwendung ist nicht als öffentlicher Client deklariert: Setz im Portal ' +
      'unter «Authentifizierung» die Option «Öffentliche Clientflows zulassen» auf «Ja» und ' +
      'speichere.',
    consensoAmministratore: (client) =>
      'Die Schule erlaubt dem Klassenbuch nicht, aus deinem Postfach zu senden, und das lässt ' +
      'sich von hier aus nicht beheben: Die Zustimmung muss erteilen, wer den Tenant ' +
      'verwaltet. Es ist eine genaue Anfrage, und am besten leitest du sie genau so weiter — ' +
      `«Administratorzustimmung für die Anwendung ${client} (Microsoft Graph Command Line ` +
      'Tools) für die delegierte Berechtigung SMTP.Send von Office 365 Exchange Online». Bis ' +
      'dahin werden die Mitteilungen als .eml-Dateien erstellt, und du versendest sie selbst.',
    clientSconosciuto: (client) =>
      `Microsoft erkennt die Anwendung ${client} nicht: Falls sie zurückgezogen wurde, muss ` +
      'das Klassenbuch aktualisiert werden.',
    altraOrganizzazione:
      'Das Konto, mit dem du die Berechtigung erteilt hast, gehört nicht zur Organisation der ' +
      'Adresse: Verbinde dich neu und melde dich mit dem Postfach der Schule an.',
    consensoNegato:
      'Die Zustimmung wurde nicht erteilt. Wenn die Seite sagt, dass es eine Administratorin ' +
      'oder einen Administrator braucht, hat die Schule die Zustimmung durch die Benutzenden ' +
      'gesperrt: Frag, wer den Tenant verwaltet.',
    senzaPerche: 'Microsoft hat nicht gesagt, warum.',
  },
  fr: {
    senzaPortachiavi: 'Le trousseau du système n’est pas disponible.',
    rispostaEstranea: 'Cette réponse n’est pas celle qu’attend le registre.',
    portaNonAperta: 'le port d’écoute ne s’est pas ouvert',
    browserNonAperto: 'le navigateur du système ne s’est pas ouvert',
    nonAndata: 'Ça n’a pas marché',
    permessoNegato:
      'Le registre n’a pas reçu l’autorisation. Retourne au registre : il y est écrit pourquoi.',
    permessoRicevuto:
      'Le registre a reçu l’autorisation. Tu peux fermer cet onglet et retourner au registre.',
    accedi: (indirizzo) =>
      `Regiclass : connecte-toi en tant que ${indirizzo} dans le navigateur qui s’est ouvert…`,
    accessoNonAperto: (dettaglio) =>
      `Le registre n’a pas réussi à ouvrir la connexion dans le navigateur. (${dettaglio})`,
    tempoScaduto: 'Trop de temps a passé sans que la connexion aboutisse : réessaie.',
    rispostaAltrui:
      'La réponse reçue n’est pas celle de la demande partie d’ici : réessaie.',
    codiceScaduto: 'Le code a expiré avant d’être autorisé : réessaie.',
    rifiutata: 'L’autorisation a été refusée.',
    nonPubblico:
      'L’application enregistrée n’est pas déclarée comme client public : dans le portail, ' +
      'sous « Authentification », mets « Autoriser les flux de clients publics » sur « Oui » ' +
      'et enregistre.',
    consensoAmministratore: (client) =>
      'L’école ne laisse pas le registre envoyer depuis ta boîte aux lettres, et ce n’est pas ' +
      'une chose qui se règle d’ici : le consentement doit être donné par la personne qui administre le ' +
      'tenant. C’est une demande précise, et mieux vaut la transmettre telle quelle — ' +
      `« consentement administrateur pour l’application ${client} (Microsoft Graph Command ` +
      'Line Tools) sur l’autorisation déléguée SMTP.Send d’Office 365 Exchange Online ». ' +
      'D’ici là, les communications sortent en fichiers .eml, et c’est toi qui les envoies.',
    clientSconosciuto: (client) =>
      `Microsoft ne reconnaît pas l’application ${client} : si elle a été retirée, le ` +
      'registre doit être mis à jour.',
    altraOrganizzazione:
      'Le compte avec lequel tu as donné l’autorisation n’appartient pas à l’organisation de ' +
      'l’adresse : refais la connexion en te connectant avec la boîte de l’école.',
    consensoNegato:
      'Le consentement n’a pas été donné. Si la page indique qu’il faut un administrateur, ' +
      'l’école a fermé le consentement des utilisateurs : il faut le demander à la personne qui ' +
      'administre le tenant.',
    senzaPerche: 'Microsoft n’a pas dit pourquoi.',
  },
  en: {
    senzaPortachiavi: 'The system keychain isn’t available.',
    rispostaEstranea: 'This isn’t the response the register is waiting for.',
    portaNonAperta: 'the listening port didn’t open',
    browserNonAperto: 'the system browser didn’t open',
    nonAndata: 'That didn’t work',
    permessoNegato:
      'The register didn’t receive permission. Go back to the register: it says why there.',
    permessoRicevuto:
      'The register has received permission. You can close this tab and go back to the ' +
      'register.',
    accedi: (indirizzo) => `Regiclass: sign in as ${indirizzo} in the browser that has opened…`,
    accessoNonAperto: (dettaglio) =>
      `The register couldn’t open the sign-in page in the browser. (${dettaglio})`,
    tempoScaduto: 'Too much time passed without the sign-in finishing: try again.',
    rispostaAltrui:
      'The response that arrived doesn’t belong to the request sent from here: try again.',
    codiceScaduto: 'The code expired before it was authorised: try again.',
    rifiutata: 'The authorisation was declined.',
    nonPubblico:
      'The registered application isn’t declared as a public client: in the portal, under ' +
      '“Authentication”, set “Allow public client flows” to “Yes” and save.',
    consensoAmministratore: (client) =>
      'The school doesn’t let the register send from your mailbox, and it isn’t something ' +
      'that can be fixed from here: consent has to be given by whoever administers the ' +
      'tenant. It’s a precise request, and it’s best to pass it on exactly as it is — ' +
      `“admin consent for the application ${client} (Microsoft Graph Command Line Tools) ` +
      'on the delegated permission SMTP.Send of Office 365 Exchange Online”. Until then, ' +
      'messages come out as .eml files, and you send them yourself.',
    clientSconosciuto: (client) =>
      `Microsoft doesn’t recognise the application ${client}: if it has been withdrawn, the ` +
      'register needs updating.',
    altraOrganizzazione:
      'The account you authorised with doesn’t belong to the organisation of the address: ' +
      'connect again, signing in with the school mailbox.',
    consensoNegato:
      'Consent wasn’t given. If the page says an administrator is needed, the school has ' +
      'turned off user consent: ask whoever administers the tenant.',
    senzaPerche: 'Microsoft didn’t say why.',
  },
})
