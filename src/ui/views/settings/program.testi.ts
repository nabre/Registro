// I testi della pagina delle impostazioni del programma (`settings/program.ts`).
// Nomi e descrizioni delle voci li scrive il manifesto.

import { catalogo } from '../../../i18n/index.js'

const it = {
  tornaAlPredefinito: (nome: string) => `${nome}: torna al predefinito.`,
  // Come si legge un valore fuori dal suo campo, nelle pastiglie.
  acceso: 'acceso',
  spento: 'spento',
  // L'etichetta accanto alla casella.
  Acceso: 'Acceso',
  Spento: 'Spento',
  ciPensaIlRegistro: 'Ci pensa il registro',
  sceglieConDialogo: (cartella: boolean) =>
    `Sceglie ${cartella ? 'una cartella' : 'un file'} con il dialogo del sistema`,
  svuota: 'Svuota',
  svuotaAiuto: 'Torna a lasciarlo fare al registro',
  sospesa: (padre: string) => `sospesa · ${padre} è spento`,
  nonSiAccende: 'non si accende',
  modificata: (prima: string) => `modificata · prima: ${prima}`,
  predefinito: (valore: string) => `predefinito: ${valore}`,
  ritira: 'Ritira',
  ritiraAiuto: (valore: string) => `Torna al predefinito: ${valore}`,
  nienteDaRaccogliere: 'Niente da raccogliere',
  nienteDaRaccogliereTesto:
    'Questa sezione non ha impostazioni sue: tiene quel che nessuna delle altre ha nominato, '
    + 'e resta vuota finché non ce n’è nessuna da raccogliere.',
  nonArrivate: 'Impostazioni non ancora arrivate',
  nonArrivateTesto:
    'Questa sezione ha delle impostazioni, ma non sono ancora state lette. Succede per un '
    + 'istante all’apertura; se resta così, il registro non sta rispondendo.',
  giaInstallati: (quanti: number) => `Programmi già installati (${quanti})`,
  ripristinaQuante: (quante: number) => `Ripristina (${quante})`,
  ripristinaAiuto: 'Ritira i valori decisi a mano in questa sezione',
  ripristinare: (sezione: string) => `Ripristinare «${sezione}»?`,
  tornano: (quante: number) =>
    `${quante} impostazion${quante === 1 ? 'e torna' : 'i tornano'} al valore ` +
    'predefinito. Quel che sta nel documento d’anno non si tocca.',
  ripristina: 'Ripristina',
  ripristinata: (sezione: string) => `«${sezione}»: tornata ai predefiniti.`,
  restanoQui: 'Restano su questa macchina. ',
  restanoQuiTesto:
    'Valgono per tutti gli anni e per tutti i documenti aperti qui, e non viaggiano con il ' +
    'file del registro: aprendo lo stesso documento su un altro computer, lì valgono le ' +
    'impostazioni di quel computer.',
}

export const testi = catalogo(it, {
  de: {
    tornaAlPredefinito: (nome) => `${nome}: zurück zum Standardwert.`,
    acceso: 'ein',
    spento: 'aus',
    Acceso: 'Ein',
    Spento: 'Aus',
    ciPensaIlRegistro: 'Das Klassenbuch kümmert sich darum',
    sceglieConDialogo: (cartella) =>
      `Wählt ${cartella ? 'einen Ordner' : 'eine Datei'} im Dialog des Systems`,
    svuota: 'Leeren',
    svuotaAiuto: 'Wieder dem Klassenbuch überlassen',
    sospesa: (padre) => `ausgesetzt · ${padre} ist aus`,
    nonSiAccende: 'lässt sich nicht einschalten',
    modificata: (prima) => `geändert · vorher: ${prima}`,
    predefinito: (valore) => `Standard: ${valore}`,
    ritira: 'Zurücknehmen',
    ritiraAiuto: (valore) => `Zurück zum Standardwert: ${valore}`,
    nienteDaRaccogliere: 'Nichts aufzunehmen',
    nienteDaRaccogliereTesto:
      'Dieser Abschnitt hat keine eigenen Einstellungen: Er nimmt auf, was keiner der anderen '
      + 'nennt, und bleibt leer, solange es nichts aufzunehmen gibt.',
    nonArrivate: 'Einstellungen noch nicht angekommen',
    nonArrivateTesto:
      'Dieser Abschnitt hat Einstellungen, aber sie sind noch nicht gelesen. Das passiert beim '
      + 'Öffnen für einen Augenblick; bleibt es so, antwortet das Klassenbuch nicht.',
    giaInstallati: (quanti) => `Bereits installierte Programme (${quanti})`,
    ripristinaQuante: (quante) => `Zurücksetzen (${quante})`,
    ripristinaAiuto: 'Nimmt die von Hand festgelegten Werte in diesem Abschnitt zurück',
    ripristinare: (sezione) => `«${sezione}» zurücksetzen?`,
    tornano: (quante) =>
      `${quante} ${quante === 1 ? 'Einstellung kehrt' : 'Einstellungen kehren'} zum ` +
      'Standardwert zurück. Was im Jahresdokument steht, bleibt unberührt.',
    ripristina: 'Zurücksetzen',
    ripristinata: (sezione) => `«${sezione}»: auf die Standardwerte zurückgesetzt.`,
    restanoQui: 'Bleiben auf diesem Computer. ',
    restanoQuiTesto:
      'Sie gelten für alle Jahre und alle hier geöffneten Dokumente und reisen nicht mit der ' +
      'Datei des Klassenbuchs: Öffnest du dasselbe Dokument auf einem anderen Computer, gelten ' +
      'dort die Einstellungen jenes Computers.',
  },
  fr: {
    tornaAlPredefinito: (nome) => `${nome} : retour à la valeur par défaut.`,
    acceso: 'activé',
    spento: 'désactivé',
    Acceso: 'Activé',
    Spento: 'Désactivé',
    ciPensaIlRegistro: 'Le registre s’en occupe',
    sceglieConDialogo: (cartella) =>
      `Choisit ${cartella ? 'un dossier' : 'un fichier'} avec la boîte de dialogue du système`,
    svuota: 'Vider',
    svuotaAiuto: 'Laisser de nouveau faire le registre',
    sospesa: (padre) => `suspendu · ${padre} est désactivé`,
    nonSiAccende: 'ne peut pas être activé',
    modificata: (prima) => `modifié · avant : ${prima}`,
    predefinito: (valore) => `par défaut : ${valore}`,
    ritira: 'Retirer',
    ritiraAiuto: (valore) => `Retour à la valeur par défaut : ${valore}`,
    nienteDaRaccogliere: 'Rien à recueillir',
    nienteDaRaccogliereTesto:
      'Cette section n’a pas de paramètres à elle : elle recueille ce qu’aucune autre n’a '
      + 'nommé, et reste vide tant qu’il n’y a rien à recueillir.',
    nonArrivate: 'Paramètres pas encore arrivés',
    nonArrivateTesto:
      'Cette section a des paramètres, mais ils n’ont pas encore été lus. Cela arrive un instant '
      + 'à l’ouverture ; si cela dure, le registre ne répond pas.',
    giaInstallati: (quanti) => `Programmes déjà installés (${quanti})`,
    ripristinaQuante: (quante) => `Réinitialiser (${quante})`,
    ripristinaAiuto: 'Retire les valeurs choisies à la main dans cette section',
    ripristinare: (sezione) => `Réinitialiser « ${sezione} » ?`,
    tornano: (quante) =>
      `${quante} ${quante === 1 ? 'paramètre revient' : 'paramètres reviennent'} à la valeur ` +
      'par défaut. Ce qui est dans le document de l’année n’est pas touché.',
    ripristina: 'Réinitialiser',
    ripristinata: (sezione) => `« ${sezione} » : valeurs par défaut réinitialisées.`,
    restanoQui: 'Ils restent sur cette machine. ',
    restanoQuiTesto:
      'Ils valent pour toutes les années et tous les documents ouverts ici, et ne voyagent pas ' +
      'avec le fichier du registre : en ouvrant le même document sur un autre ordinateur, ce ' +
      'sont les paramètres de cet ordinateur-là qui valent.',
  },
  en: {
    tornaAlPredefinito: (nome) => `${nome}: back to the default.`,
    acceso: 'on',
    spento: 'off',
    Acceso: 'On',
    Spento: 'Off',
    ciPensaIlRegistro: 'The register takes care of it',
    sceglieConDialogo: (cartella) =>
      `Chooses ${cartella ? 'a folder' : 'a file'} with the system dialog`,
    svuota: 'Clear',
    svuotaAiuto: 'Leave it to the register again',
    sospesa: (padre) => `suspended · ${padre} is off`,
    nonSiAccende: 'cannot be turned on',
    modificata: (prima) => `changed · before: ${prima}`,
    predefinito: (valore) => `default: ${valore}`,
    ritira: 'Revert',
    ritiraAiuto: (valore) => `Back to the default: ${valore}`,
    nienteDaRaccogliere: 'Nothing to collect',
    nienteDaRaccogliereTesto:
      'This section has no settings of its own: it holds whatever none of the others names, '
      + 'and stays empty until there is something to collect.',
    nonArrivate: 'Settings not arrived yet',
    nonArrivateTesto:
      'This section has settings, but they have not been read yet. It happens for a moment on '
      + 'opening; if it stays like this, the register is not responding.',
    giaInstallati: (quanti) => `Programs already installed (${quanti})`,
    ripristinaQuante: (quante) => `Reset (${quante})`,
    ripristinaAiuto: 'Withdraws the values set by hand in this section',
    ripristinare: (sezione) => `Reset “${sezione}”?`,
    tornano: (quante) =>
      `${quante} ${quante === 1 ? 'setting returns' : 'settings return'} to the default ` +
      'value. What is in the year’s document is not touched.',
    ripristina: 'Reset',
    ripristinata: (sezione) => `“${sezione}”: back to the defaults.`,
    restanoQui: 'They stay on this machine. ',
    restanoQuiTesto:
      'They apply to all years and to all documents opened here, and do not travel with the ' +
      'register file: if you open the same document on another computer, that computer’s ' +
      'settings apply there.',
  },
})
