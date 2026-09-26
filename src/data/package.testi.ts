// I testi di `package.ts`: perché un documento `.regi` non si apre.
// Il nome del file, già con l'estensione, sta in testa alla frase.

import { catalogo } from '../i18n/index.js'

const it = {
  nonDocumento: (file: string) =>
    `${file} non è un documento del registro: il file non comincia come un archivio.`,
  nonSiApre: (file: string, detto: string) => `${file} non si apre: ${detto}`,
  altroProgramma: (file: string, formato: string) =>
    `${file} è un archivio di un altro programma (${formato}).`,
}

export const testi = catalogo(it, {
  de: {
    nonDocumento: (file) =>
      `${file} ist kein Dokument des Klassenbuchs: Die Datei beginnt nicht wie ein Archiv.`,
    nonSiApre: (file, detto) => `${file} lässt sich nicht öffnen: ${detto}`,
    altroProgramma: (file, formato) =>
      `${file} ist ein Archiv eines anderen Programms (${formato}).`,
  },
  fr: {
    nonDocumento: (file) =>
      `${file} n’est pas un document du registre : le fichier ne commence pas comme une archive.`,
    nonSiApre: (file, detto) => `${file} ne s’ouvre pas : ${detto}`,
    altroProgramma: (file, formato) => `${file} est une archive d’un autre programme (${formato}).`,
  },
  en: {
    nonDocumento: (file) =>
      `${file} isn’t a register document: the file doesn’t start like an archive.`,
    nonSiApre: (file, detto) => `${file} won’t open: ${detto}`,
    altroProgramma: (file, formato) => `${file} is an archive from another program (${formato}).`,
  },
})
