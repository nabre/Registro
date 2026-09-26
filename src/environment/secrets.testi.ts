// Perché una password non si salva. Minuscoli perché finiscono in coda a un altro messaggio.

import { catalogo } from '../i18n/index.js'

const it = {
  segretiBloccati:
    'il file dei segreti non si è potuto leggere e non va riscritto: chiudi i programmi ' +
    'che lo tengono aperto (sincronizzazione, antivirus) e riprova',
  senzaPortachiavi:
    'il portachiavi del sistema non è disponibile: la password della casella non può essere salvata',
}

export const testi = catalogo(it, {
  de: {
    segretiBloccati:
      'die Datei mit den Geheimnissen liess sich nicht lesen und darf nicht überschrieben werden: ' +
      'schliesse die Programme, die sie offen halten (Synchronisierung, Virenschutz), und versuche ' +
      'es erneut',
    senzaPortachiavi:
      'der Schlüsselbund des Systems ist nicht verfügbar: das Passwort des Postfachs kann nicht ' +
      'gespeichert werden',
  },
  fr: {
    segretiBloccati:
      'le fichier des secrets n’a pas pu être lu et ne doit pas être réécrit : ferme les ' +
      'programmes qui le gardent ouvert (synchronisation, antivirus) et réessaie',
    senzaPortachiavi:
      'le trousseau du système n’est pas disponible : le mot de passe de la boîte ne peut pas ' +
      'être enregistré',
  },
  en: {
    segretiBloccati:
      'the secrets file could not be read and must not be rewritten: close the programs that ' +
      'keep it open (sync, antivirus) and try again',
    senzaPortachiavi:
      'the system keychain is not available: the mailbox password cannot be saved',
  },
})
