// I testi di `microsoft.ts`: collegare e togliere un account per OneDrive, e i
// rifiuti di Microsoft Graph detti in quel che c'è da fare.

import { catalogo } from '#core/i18n/index.js'

const it = {
  senzaPortachiavi: 'Il portachiavi del sistema non è disponibile.',
  titoloAggiungi: 'Aggiungi un account Microsoft',
  domandaIndirizzo:
    'Con che account entri in OneDrive? L’indirizzo della scuola, o quello personale.',
  serveIndirizzo: 'Serve un indirizzo completo, come nome.cognome@scuola.ch.',
  nonCollegato: (perche: string) => `L’account non è collegato. ${perche}`,
  collegato: (indirizzo: string) =>
    `${indirizzo} è collegato: il registro può cercare i documenti nel suo OneDrive.`,
  collegatoAltro: (entrato: string, scritto: string) =>
    `Nel browser si è entrati come ${entrato}, non come ${scritto}: è collegato ${entrato}.`,
  sconosciuto: (indirizzo: string) => `${indirizzo} non è fra gli account collegati.`,
  tolto: (indirizzo: string) =>
    `${indirizzo} è scollegato. Il permesso dato a Microsoft si ritira dalla pagina del ` +
    'proprio account.',
  daRicollegare: (indirizzo: string) =>
    `Il permesso di ${indirizzo} non c’è più: ricollega l’account nelle impostazioni.`,
  nonTrovato: 'L’elemento non c’è più su OneDrive: forse è stato spostato o cancellato.',
  negato: (detto: string) =>
    'Microsoft non lascia leggere questo elemento con l’account scelto.' + (detto ? ` (${detto})` : ''),
  senzaRete: 'Microsoft non risponde: controlla la connessione e riprova.',
  graphRifiuta: (stato: number, detto: string) =>
    `Microsoft ha risposto con un errore ${stato}.` + (detto ? ` ${detto}` : ''),
}

export const testi = catalogo(it, {
  de: {
    senzaPortachiavi: 'Der Schlüsselbund des Systems ist nicht verfügbar.',
    titoloAggiungi: 'Microsoft-Konto hinzufügen',
    domandaIndirizzo:
      'Mit welchem Konto meldest du dich bei OneDrive an? Die Adresse der Schule oder die ' +
      'persönliche.',
    serveIndirizzo: 'Es braucht eine vollständige Adresse, wie vorname.name@schule.ch.',
    nonCollegato: (perche) => `Das Konto ist nicht verbunden. ${perche}`,
    collegato: (indirizzo) =>
      `${indirizzo} ist verbunden: Das Klassenbuch kann die Dokumente in seinem OneDrive suchen.`,
    collegatoAltro: (entrato, scritto) =>
      `Im Browser wurde ${entrato} angemeldet, nicht ${scritto}: Verbunden ist ${entrato}.`,
    sconosciuto: (indirizzo) => `${indirizzo} ist nicht unter den verbundenen Konten.`,
    tolto: (indirizzo) =>
      `${indirizzo} ist getrennt. Die Berechtigung bei Microsoft widerrufst du auf der Seite ` +
      'deines Kontos.',
    daRicollegare: (indirizzo) =>
      `Die Berechtigung von ${indirizzo} ist nicht mehr da: Verbinde das Konto in den ` +
      'Einstellungen neu.',
    nonTrovato:
      'Das Element ist nicht mehr auf OneDrive: Vielleicht wurde es verschoben oder gelöscht.',
    negato: (detto) =>
      'Microsoft lässt dieses Element mit dem gewählten Konto nicht lesen.' +
      (detto ? ` (${detto})` : ''),
    senzaRete: 'Microsoft antwortet nicht: Prüf die Verbindung und versuch es noch einmal.',
    graphRifiuta: (stato, detto) =>
      `Microsoft hat mit einem Fehler ${stato} geantwortet.` + (detto ? ` ${detto}` : ''),
  },
  fr: {
    senzaPortachiavi: 'Le trousseau du système n’est pas disponible.',
    titoloAggiungi: 'Ajouter un compte Microsoft',
    domandaIndirizzo:
      'Avec quel compte te connectes-tu à OneDrive ? L’adresse de l’école, ou la personnelle.',
    serveIndirizzo: 'Il faut une adresse complète, comme prenom.nom@ecole.ch.',
    nonCollegato: (perche) => `Le compte n’est pas connecté. ${perche}`,
    collegato: (indirizzo) =>
      `${indirizzo} est connecté : le registre peut chercher les documents dans son OneDrive.`,
    collegatoAltro: (entrato, scritto) =>
      `Dans le navigateur, la connexion s’est faite avec ${entrato}, pas ${scritto} : c’est ` +
      `${entrato} qui est connecté.`,
    sconosciuto: (indirizzo) => `${indirizzo} ne fait pas partie des comptes connectés.`,
    tolto: (indirizzo) =>
      `${indirizzo} est déconnecté. L’autorisation donnée à Microsoft se retire depuis la page ` +
      'de son compte.',
    daRicollegare: (indirizzo) =>
      `L’autorisation de ${indirizzo} n’existe plus : reconnecte le compte dans les paramètres.`,
    nonTrovato:
      'L’élément n’est plus sur OneDrive : il a peut-être été déplacé ou supprimé.',
    negato: (detto) =>
      'Microsoft ne laisse pas lire cet élément avec le compte choisi.' +
      (detto ? ` (${detto})` : ''),
    senzaRete: 'Microsoft ne répond pas : vérifie la connexion et réessaie.',
    graphRifiuta: (stato, detto) =>
      `Microsoft a répondu par une erreur ${stato}.` + (detto ? ` ${detto}` : ''),
  },
  en: {
    senzaPortachiavi: 'The system keychain is not available.',
    titoloAggiungi: 'Add a Microsoft account',
    domandaIndirizzo:
      'Which account do you sign in to OneDrive with? The school address, or your personal one.',
    serveIndirizzo: 'A full address is needed, like first.last@school.ch.',
    nonCollegato: (perche) => `The account is not connected. ${perche}`,
    collegato: (indirizzo) =>
      `${indirizzo} is connected: the register can look for documents in its OneDrive.`,
    collegatoAltro: (entrato, scritto) =>
      `The browser signed in as ${entrato}, not ${scritto}: ${entrato} is the one connected.`,
    sconosciuto: (indirizzo) => `${indirizzo} is not among the connected accounts.`,
    tolto: (indirizzo) =>
      `${indirizzo} is disconnected. The permission given to Microsoft is withdrawn from the ` +
      'account’s own page.',
    daRicollegare: (indirizzo) =>
      `The permission for ${indirizzo} is gone: reconnect the account in the settings.`,
    nonTrovato: 'The item is no longer on OneDrive: it may have been moved or deleted.',
    negato: (detto) =>
      'Microsoft doesn’t let the chosen account read this item.' + (detto ? ` (${detto})` : ''),
    senzaRete: 'Microsoft is not answering: check the connection and try again.',
    graphRifiuta: (stato, detto) =>
      `Microsoft answered with error ${stato}.` + (detto ? ` ${detto}` : ''),
  },
})
