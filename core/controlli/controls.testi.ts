// I testi dei controlli delle impostazioni (`control.tsx`), uguali nel
// pannello e nella finestra nativa. Nomi, descrizioni, scelte e unità delle
// voci vengono dal manifesto, con la voce.

import { catalogo } from '#core/i18n/index.js'

const it = {
  /** La riga discreta sotto il campo, dopo ogni salvataggio andato a buon fine. */
  salvato: 'Salvato',
  // Un percorso vuoto: lo sceglie il registro.
  ciPensaIlRegistro: 'Ci pensa il registro',
  sceglieConDialogo: (cartella: boolean) =>
    `Sceglie ${cartella ? 'una cartella' : 'un file'} con il dialogo del sistema`,
  svuota: 'Svuota',
  svuotaAiuto: 'Torna a lasciarlo fare al registro',
  // Un modello si sceglie dove lo si scarica, non battendone il nome.
  nessunModello: 'nessuno',
  scegliModello: 'Scegli in Assistente e modelli',
  scegliModelloAiuto: 'Il file si sceglie fra quelli scaricati, nella sezione Assistente e modelli',
  modelloNelRegistro: 'Si sceglie nel registro, in Programma › Assistente e modelli.',
  /** Sotto le voci che scrive «Collega la casella»: qui si leggono soltanto. */
  delCollegamento: 'Lo scrive il collegamento della casella: si cambia in Utente › Posta.',
  nessunaCasella: 'Nessuna casella collegata',
  // Sotto «Sistema» di tema e lingua, quando è la scelta di adesso.
  comeWindows: (scuro: boolean) => `adesso: ${scuro ? 'scuro' : 'chiaro'}, come Windows`,
  /** Il nome della lingua arriva come la lingua chiama sé stessa: «Deutsch». */
  linguaAdesso: (nome: string) => `adesso: ${nome}, come Windows`,
}

export const testi = catalogo(it, {
  de: {
    salvato: 'Gespeichert',
    ciPensaIlRegistro: 'Das Klassenbuch kümmert sich darum',
    sceglieConDialogo: (cartella) =>
      `Wählt ${cartella ? 'einen Ordner' : 'eine Datei'} im Dialog des Systems`,
    svuota: 'Leeren',
    svuotaAiuto: 'Wieder dem Klassenbuch überlassen',
    nessunModello: 'keines',
    scegliModello: 'In Assistent und Modelle wählen',
    scegliModelloAiuto: 'Die Datei wählt man unter den heruntergeladenen, im Bereich Assistent und Modelle',
    modelloNelRegistro: 'Wird im Klassenbuch gewählt, unter Programm › Assistent und Modelle.',
    delCollegamento: 'Wird beim Verbinden des Postfachs gesetzt: Änderung unter Benutzer › Post.',
    nessunaCasella: 'Kein Postfach verbunden',
    comeWindows: (scuro) => `jetzt: ${scuro ? 'dunkel' : 'hell'}, wie Windows`,
    linguaAdesso: (nome) => `jetzt: ${nome}, wie Windows`,
  },
  fr: {
    salvato: 'Enregistré',
    ciPensaIlRegistro: 'Le registre s’en occupe',
    sceglieConDialogo: (cartella) =>
      `Choisit ${cartella ? 'un dossier' : 'un fichier'} avec la boîte de dialogue du système`,
    svuota: 'Vider',
    svuotaAiuto: 'Laisser de nouveau faire le registre',
    nessunModello: 'aucun',
    scegliModello: 'Choisir dans Assistant et modèles',
    scegliModelloAiuto: 'Le fichier se choisit parmi ceux téléchargés, dans la section Assistant et modèles',
    modelloNelRegistro: 'Se choisit dans le registre, sous Programme › Assistant et modèles.',
    delCollegamento: 'Écrit par la connexion de la boîte : se change sous Utilisateur › Messagerie.',
    nessunaCasella: 'Aucune boîte connectée',
    comeWindows: (scuro) => `en ce moment : ${scuro ? 'sombre' : 'clair'}, comme Windows`,
    linguaAdesso: (nome) => `en ce moment : ${nome}, comme Windows`,
  },
  en: {
    salvato: 'Saved',
    ciPensaIlRegistro: 'The register takes care of it',
    sceglieConDialogo: (cartella) =>
      `Chooses ${cartella ? 'a folder' : 'a file'} with the system dialog`,
    svuota: 'Clear',
    svuotaAiuto: 'Leave it to the register again',
    nessunModello: 'none',
    scegliModello: 'Choose in Assistant and models',
    scegliModelloAiuto: 'The file is chosen among the downloaded ones, in the Assistant and models section',
    modelloNelRegistro: 'Chosen in the register, under Program › Assistant and models.',
    delCollegamento: 'Set by connecting the mailbox: change it under User › Mail.',
    nessunaCasella: 'No mailbox connected',
    comeWindows: (scuro) => `now: ${scuro ? 'dark' : 'light'}, like Windows`,
    linguaAdesso: (nome) => `now: ${nome}, like Windows`,
  },
})
