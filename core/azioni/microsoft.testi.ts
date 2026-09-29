// I testi di `microsoft.ts`: l'avviso della copia scaricata da OneDrive.

import { catalogo } from '../i18n/index.js'

const it = {
  copiaScaricata: (percorso: string) =>
    'Il documento non è sincronizzato su questo computer: si apre la copia scaricata in ' +
    `${percorso}. Quel che scrivi resta lì e non torna su OneDrive. Per lavorare sull’originale, ` +
    'sincronizza la sua cartella con il client di OneDrive e aprilo da lì.',
}

export const testi = catalogo(it, {
  de: {
    copiaScaricata: (percorso) =>
      'Das Dokument wird auf diesem Computer nicht synchronisiert: Geöffnet wird die ' +
      `heruntergeladene Kopie in ${percorso}. Was du schreibst, bleibt dort und geht nicht ` +
      'zurück auf OneDrive. Um am Original zu arbeiten, synchronisiere seinen Ordner mit dem ' +
      'OneDrive-Client und öffne es von dort.',
  },
  fr: {
    copiaScaricata: (percorso) =>
      'Le document n’est pas synchronisé sur cet ordinateur : c’est la copie téléchargée dans ' +
      `${percorso} qui s’ouvre. Ce que tu écris reste là et ne retourne pas sur OneDrive. Pour ` +
      'travailler sur l’original, synchronise son dossier avec le client OneDrive et ouvre-le ' +
      'depuis là.',
  },
  en: {
    copiaScaricata: (percorso) =>
      'The document is not synced on this computer: the copy downloaded to ' +
      `${percorso} opens instead. What you write stays there and does not go back to OneDrive. ` +
      'To work on the original, sync its folder with the OneDrive client and open it from there.',
  },
})
