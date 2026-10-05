// I testi della pagina delle impostazioni del programma (`settings/program.tsx`).
// Nomi e descrizioni delle voci li scrive il manifesto.

import { catalogo } from '#core/i18n/index.js'

const it = {
  tornaAlPredefinito: (nome: string) => `${nome}: torna al predefinito.`,
  sospesa: (padre: string) => `sospesa · ${padre} è spento`,
  nonSiAccende: 'non si accende',
  alProssimoAvvio: 'al prossimo avvio',
  alProssimoAvvioAiuto: 'Il registro la legge quando parte: il cambio vale dal prossimo avvio',
  nienteDaRaccogliere: 'Niente da raccogliere',
  nienteDaRaccogliereTesto:
    'Questa sezione non ha impostazioni sue: tiene quel che nessuna delle altre ha nominato, '
    + 'e resta vuota finché non ce n’è nessuna da raccogliere.',
  nonArrivate: 'Impostazioni non ancora arrivate',
  nonArrivateTesto:
    'Questa sezione ha delle impostazioni, ma non sono ancora state lette. Succede per un '
    + 'istante all’apertura; se resta così, il registro non sta rispondendo.',
  avanzate: (quante: number) => `Avanzate (${quante})`,
  ripristinaQuante: (quante: number) => `Ripristina (${quante})`,
  ripristinaAiuto: 'Ritira i valori decisi a mano negli elenchi di quest’area',
  ripristinare: (area: string) => `Ripristinare le impostazioni di «${area}»?`,
  tornano: (quante: number) =>
    `${quante} impostazion${quante === 1 ? 'e torna' : 'i tornano'} al valore ` +
    'predefinito. Quel che si sceglie nelle schede — i modelli, la loro cartella, la casella ' +
    'collegata — e quel che sta nel documento d’anno non si tocca.',
  ripristina: 'Ripristina',
  ripristinata: (area: string) => `«${area}»: tornata ai predefiniti.`,
}

export const testi = catalogo(it, {
  de: {
    tornaAlPredefinito: (nome) => `${nome}: zurück zum Standardwert.`,
    sospesa: (padre) => `ausgesetzt · ${padre} ist aus`,
    nonSiAccende: 'lässt sich nicht einschalten',
    alProssimoAvvio: 'beim nächsten Start',
    alProssimoAvvioAiuto:
      'Das Klassenbuch liest sie beim Starten: die Änderung gilt ab dem nächsten Start',
    nienteDaRaccogliere: 'Nichts aufzunehmen',
    nienteDaRaccogliereTesto:
      'Dieser Abschnitt hat keine eigenen Einstellungen: Er nimmt auf, was keiner der anderen '
      + 'nennt, und bleibt leer, solange es nichts aufzunehmen gibt.',
    nonArrivate: 'Einstellungen noch nicht angekommen',
    nonArrivateTesto:
      'Dieser Abschnitt hat Einstellungen, aber sie sind noch nicht gelesen. Das passiert beim '
      + 'Öffnen für einen Augenblick; bleibt es so, antwortet das Klassenbuch nicht.',
    avanzate: (quante) => `Erweitert (${quante})`,
    ripristinaQuante: (quante) => `Zurücksetzen (${quante})`,
    ripristinaAiuto: 'Nimmt die von Hand festgelegten Werte in den Listen dieses Bereichs zurück',
    ripristinare: (area) => `Die Einstellungen von «${area}» zurücksetzen?`,
    tornano: (quante) =>
      `${quante} ${quante === 1 ? 'Einstellung kehrt' : 'Einstellungen kehren'} zum ` +
      'Standardwert zurück. Was man in den Karten wählt — die Modelle, ihr Ordner, das ' +
      'verbundene Postfach — und was im Jahresdokument steht, bleibt unberührt.',
    ripristina: 'Zurücksetzen',
    ripristinata: (area) => `«${area}»: auf die Standardwerte zurückgesetzt.`,
  },
  fr: {
    tornaAlPredefinito: (nome) => `${nome} : retour à la valeur par défaut.`,
    sospesa: (padre) => `suspendu · ${padre} est désactivé`,
    nonSiAccende: 'ne peut pas être activé',
    alProssimoAvvio: 'au prochain démarrage',
    alProssimoAvvioAiuto:
      'Le registre le lit au démarrage : le changement vaut dès le prochain démarrage',
    nienteDaRaccogliere: 'Rien à recueillir',
    nienteDaRaccogliereTesto:
      'Cette section n’a pas de paramètres à elle : elle recueille ce qu’aucune autre n’a '
      + 'nommé, et reste vide tant qu’il n’y a rien à recueillir.',
    nonArrivate: 'Paramètres pas encore arrivés',
    nonArrivateTesto:
      'Cette section a des paramètres, mais ils n’ont pas encore été lus. Cela arrive un instant '
      + 'à l’ouverture ; si cela dure, le registre ne répond pas.',
    avanzate: (quante) => `Avancé (${quante})`,
    ripristinaQuante: (quante) => `Réinitialiser (${quante})`,
    ripristinaAiuto: 'Retire les valeurs choisies à la main dans les listes de cette zone',
    ripristinare: (area) => `Réinitialiser les paramètres de « ${area} » ?`,
    tornano: (quante) =>
      `${quante} ${quante === 1 ? 'paramètre revient' : 'paramètres reviennent'} à la valeur ` +
      'par défaut. Ce qu’on choisit dans les fiches — les modèles, leur dossier, la boîte ' +
      'connectée — et ce qui est dans le document de l’année n’est pas touché.',
    ripristina: 'Réinitialiser',
    ripristinata: (area) => `« ${area} » : valeurs par défaut réinitialisées.`,
  },
  en: {
    tornaAlPredefinito: (nome) => `${nome}: back to the default.`,
    sospesa: (padre) => `suspended · ${padre} is off`,
    nonSiAccende: 'cannot be turned on',
    alProssimoAvvio: 'at next start',
    alProssimoAvvioAiuto: 'The register reads it when it starts: the change applies from the next start',
    nienteDaRaccogliere: 'Nothing to collect',
    nienteDaRaccogliereTesto:
      'This section has no settings of its own: it holds whatever none of the others names, '
      + 'and stays empty until there is something to collect.',
    nonArrivate: 'Settings not arrived yet',
    nonArrivateTesto:
      'This section has settings, but they have not been read yet. It happens for a moment on '
      + 'opening; if it stays like this, the register is not responding.',
    avanzate: (quante) => `Advanced (${quante})`,
    ripristinaQuante: (quante) => `Reset (${quante})`,
    ripristinaAiuto: 'Withdraws the values set by hand in the lists of this area',
    ripristinare: (area) => `Reset the settings of “${area}”?`,
    tornano: (quante) =>
      `${quante} ${quante === 1 ? 'setting returns' : 'settings return'} to the default ` +
      'value. What you choose in the cards — the models, their folder, the connected ' +
      'mailbox — and what is in the year’s document is not touched.',
    ripristina: 'Reset',
    ripristinata: (area) => `“${area}”: back to the defaults.`,
  },
})
