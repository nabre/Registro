// I testi delle azioni sui modelli (`llm.ts`) e dell'assistente staccato in
// una finestra sua (`assistant.ts`).

import { catalogo } from '../i18n/index.js'

const it = {
  // ------------------------------------------------------------ assistant.ts
  nonSiStacca: 'L’assistente non può staccarsi: non c’è nessuna finestra da aprire.',
  finestraNonAperta:
    'Non è stato possibile aprire la finestra dell’assistente: ' +
    'controlla che l’assistente sia acceso nelle impostazioni.',

  // ------------------------------------------------------------ llm.ts
  scaricoFermato: (file: string) => `Scarico di «${file}» fermato.`,
  scaricoFallito: 'Lo scarico non è riuscito.',
  giaInDiscesa: (file: string) => `«${file}» è già fra quelli che scendono.`,
  inCoda: (file: string) => `«${file}» è in coda: scende quando finisce quello di prima.`,
  sceltaTitolo: 'Scegli un modello del linguaggio',
  sceltaTasto: 'Prendi',
  filtroGguf: 'Modelli GGUF',
  importato: (nome: string) => `«${nome}» è fra i modelli.`,
  nonLetto: 'Il file non si è potuto leggere.',
  nonTolto: 'Il modello non si è potuto togliere.',
  tolto: (nome: string) => `«${nome}» non è più fra i modelli.`,
  nonScaricato: (nome: string) => `«${nome}» non è fra i modelli scaricati.`,
}

export const testi = catalogo(it, {
  de: {
    nonSiStacca:
      'Der Assistent kann sich nicht abkoppeln: Es gibt kein Fenster, das sich öffnen liesse.',
    finestraNonAperta:
      'Das Fenster des Assistenten liess sich nicht öffnen: ' +
      'Prüfe, ob der Assistent in den Einstellungen eingeschaltet ist.',
    scaricoFermato: (file) => `Herunterladen von «${file}» angehalten.`,
    scaricoFallito: 'Das Herunterladen ist fehlgeschlagen.',
    giaInDiscesa: (file) => `«${file}» wird schon heruntergeladen.`,
    inCoda: (file) =>
      `«${file}» ist in der Warteschlange: Es folgt, sobald das vorherige fertig ist.`,
    sceltaTitolo: 'Sprachmodell wählen',
    sceltaTasto: 'Übernehmen',
    filtroGguf: 'GGUF-Modelle',
    importato: (nome) => `«${nome}» ist jetzt bei den Modellen.`,
    nonLetto: 'Die Datei liess sich nicht lesen.',
    nonTolto: 'Das Modell liess sich nicht entfernen.',
    tolto: (nome) => `«${nome}» ist nicht mehr bei den Modellen.`,
    nonScaricato: (nome) => `«${nome}» ist nicht unter den heruntergeladenen Modellen.`,
  },
  fr: {
    nonSiStacca: 'L’assistant ne peut pas se détacher : il n’y a aucune fenêtre à ouvrir.',
    finestraNonAperta:
      'Impossible d’ouvrir la fenêtre de l’assistant : ' +
      'vérifie que l’assistant est activé dans les paramètres.',
    scaricoFermato: (file) => `Téléchargement de « ${file} » arrêté.`,
    scaricoFallito: 'Le téléchargement n’a pas abouti.',
    giaInDiscesa: (file) => `« ${file} » est déjà en cours de téléchargement.`,
    inCoda: (file) =>
      `« ${file} » est en file d’attente : il se télécharge quand le précédent a fini.`,
    sceltaTitolo: 'Choisis un modèle de langage',
    sceltaTasto: 'Prendre',
    filtroGguf: 'Modèles GGUF',
    importato: (nome) => `« ${nome} » fait partie des modèles.`,
    nonLetto: 'Le fichier n’a pas pu être lu.',
    nonTolto: 'Le modèle n’a pas pu être retiré.',
    tolto: (nome) => `« ${nome} » ne fait plus partie des modèles.`,
    nonScaricato: (nome) => `« ${nome} » ne fait pas partie des modèles téléchargés.`,
  },
  en: {
    nonSiStacca: 'The assistant cannot detach: there is no window to open.',
    finestraNonAperta:
      'The assistant window could not be opened: ' +
      'check that the assistant is switched on in the settings.',
    scaricoFermato: (file) => `Download of “${file}” stopped.`,
    scaricoFallito: 'The download failed.',
    giaInDiscesa: (file) => `“${file}” is already among the downloads.`,
    inCoda: (file) => `“${file}” is queued: it downloads when the previous one finishes.`,
    sceltaTitolo: 'Choose a language model',
    sceltaTasto: 'Choose',
    filtroGguf: 'GGUF models',
    importato: (nome) => `“${nome}” is now among the models.`,
    nonLetto: 'The file could not be read.',
    nonTolto: 'The model could not be removed.',
    tolto: (nome) => `“${nome}” is no longer among the models.`,
    nonScaricato: (nome) => `“${nome}” is not among the downloaded models.`,
  },
})
