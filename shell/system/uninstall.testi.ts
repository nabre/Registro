// I testi della disinstallazione dal menu: la domanda, che cosa se ne va, e le
// tre domande su che cosa tenere della cartella dei dati.

import { catalogo } from '../../src/i18n/index.js'

/** Le parti della cartella dei dati che si possono tenere: i `GRUPPI` di `src/cli/disinstalla.mjs`. */
export type GruppoDaTenere = 'modelli' | 'account' | 'impostazioni'

interface Gruppo {
  /** La domanda: «Togliere anche…?». */
  readonly domanda: string
  /** Che cosa c'è dentro, detto a chi deve decidere. */
  readonly dettaglio: string
}

const it = {
  disinstalla: 'Disinstalla',
  domanda: 'Disinstallare Regiclass?',
  cosaSeNeVa: (cartella: string) =>
    "Si tolgono dal computer le impostazioni, gli account, l'elenco dei registri recenti, i modelli " +
    `scaricati, il comando «regi» e tutto quel che il registro ha salvato per sé in «${cartella}».`,
  documentiRestano: 'I documenti degli anni scolastici — i file .regi — restano dove sono.',
  chiederàCosaTenere: 'Il disinstallatore chiederà se tenere i modelli, gli account e le impostazioni.',
  programmaResta: 'Il programma resta installato: toglilo con il gestore dei pacchetti del sistema.',
  scegliCosaTenere: 'Scegli che cosa tenere…',
  togliTutto: 'Togli tutto',
  gruppi: {
    modelli: {
      domanda: 'Togliere anche i modelli scaricati?',
      dettaglio: 'Modelli del linguaggio (.gguf), corredi della dettatura e della lettura.',
    },
    account: {
      domanda: 'Togliere anche gli account?',
      dettaglio: "Password della posta e collegamento con l'account Microsoft.",
    },
    impostazioni: {
      domanda: 'Togliere anche le impostazioni?',
      dettaglio: 'Impostazioni del programma, registri recenti, posizione delle finestre.',
    },
  } satisfies Record<GruppoDaTenere, Gruppo>,
  seLiTieni: 'Se li tieni, li ritrovi reinstallando il registro.',
  tieni: 'Tieni',
  soloInstallato: 'La disinstallazione vale solo per il registro installato.',
}

export const testi = catalogo(it, {
  de: {
    disinstalla: 'Deinstallieren',
    domanda: 'Regiclass deinstallieren?',
    cosaSeNeVa: (cartella) =>
      'Vom Computer entfernt werden die Einstellungen, die Konten, die Liste der zuletzt ' +
      'geöffneten Klassenbücher, die heruntergeladenen Modelle, der Befehl «regi» und alles, ' +
      `was das Klassenbuch für sich in «${cartella}» gespeichert hat.`,
    documentiRestano: 'Die Dokumente der Schuljahre — die .regi-Dateien — bleiben, wo sie sind.',
    chiederàCosaTenere:
      'Das Deinstallationsprogramm fragt, ob die Modelle, die Konten und die Einstellungen ' +
      'bleiben sollen.',
    programmaResta:
      'Das Programm bleibt installiert: Entferne es mit der Paketverwaltung des Systems.',
    scegliCosaTenere: 'Auswählen, was bleibt…',
    togliTutto: 'Alles entfernen',
    gruppi: {
      modelli: {
        domanda: 'Auch die heruntergeladenen Modelle entfernen?',
        dettaglio: 'Sprachmodelle (.gguf), Zubehör für das Diktat und das Lesen der Scans.',
      },
      account: {
        domanda: 'Auch die Konten entfernen?',
        dettaglio: 'Mail-Passwörter und die Verbindung mit dem Microsoft-Konto.',
      },
      impostazioni: {
        domanda: 'Auch die Einstellungen entfernen?',
        dettaglio: 'Programmeinstellungen, zuletzt geöffnete Klassenbücher, Position der Fenster.',
      },
    },
    seLiTieni: 'Wenn du sie behältst, findest du sie bei einer Neuinstallation wieder.',
    tieni: 'Behalten',
    soloInstallato: 'Die Deinstallation gilt nur für das installierte Klassenbuch.',
  },
  fr: {
    disinstalla: 'Désinstaller',
    domanda: 'Désinstaller Regiclass ?',
    cosaSeNeVa: (cartella) =>
      'Sont retirés de l’ordinateur les paramètres, les comptes, la liste des registres récents, ' +
      'les modèles téléchargés, la commande « regi » et tout ce que le registre a enregistré ' +
      `pour lui dans « ${cartella} ».`,
    documentiRestano:
      'Les documents des années scolaires — les fichiers .regi — restent où ils sont.',
    chiederàCosaTenere:
      'Le programme de désinstallation demandera s’il faut garder les modèles, les comptes et ' +
      'les paramètres.',
    programmaResta:
      'Le programme reste installé : retire-le avec le gestionnaire de paquets du système.',
    scegliCosaTenere: 'Choisir ce qu’on garde…',
    togliTutto: 'Tout retirer',
    gruppi: {
      modelli: {
        domanda: 'Retirer aussi les modèles téléchargés ?',
        dettaglio: 'Modèles de langage (.gguf), fichiers de la dictée et de la lecture des scans.',
      },
      account: {
        domanda: 'Retirer aussi les comptes ?',
        dettaglio: 'Mots de passe de la messagerie et liaison avec le compte Microsoft.',
      },
      impostazioni: {
        domanda: 'Retirer aussi les paramètres ?',
        dettaglio: 'Paramètres du programme, registres récents, position des fenêtres.',
      },
    },
    seLiTieni: 'Si tu les gardes, tu les retrouves en réinstallant le registre.',
    tieni: 'Garder',
    soloInstallato: 'La désinstallation ne vaut que pour le registre installé.',
  },
  en: {
    disinstalla: 'Uninstall',
    domanda: 'Uninstall Regiclass?',
    cosaSeNeVa: (cartella) =>
      'This removes from the computer the settings, the accounts, the list of recent registers, ' +
      'the downloaded models, the “regi” command and everything the register saved for itself ' +
      `in “${cartella}”.`,
    documentiRestano: 'The school-year documents — the .regi files — stay where they are.',
    chiederàCosaTenere: 'The uninstaller will ask whether to keep the models, the accounts and the settings.',
    programmaResta: 'The program stays installed: remove it with the system’s package manager.',
    scegliCosaTenere: 'Choose what to keep…',
    togliTutto: 'Remove everything',
    gruppi: {
      modelli: {
        domanda: 'Remove the downloaded models too?',
        dettaglio: 'Language models (.gguf), the files for dictation and for reading scans.',
      },
      account: {
        domanda: 'Remove the accounts too?',
        dettaglio: 'Email passwords and the link with the Microsoft account.',
      },
      impostazioni: {
        domanda: 'Remove the settings too?',
        dettaglio: 'Program settings, recent registers, window positions.',
      },
    },
    seLiTieni: 'If you keep them, you’ll find them again when you reinstall the register.',
    tieni: 'Keep',
    soloInstallato: 'Uninstalling only applies to the installed register.',
  },
})
