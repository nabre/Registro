// I testi di `zip.ts`: perché un archivio non si scrive o non si apre.
// Seguono i due punti di «X non si apre: …», quindi iniziano in minuscolo.

import { catalogo } from '../i18n/index.js'

const it = {
  troppeVoci: (quante: number) => `troppe voci per un archivio semplice: ${quante}`,
  troppoGrande: 'archivio troppo grande per il formato semplice (4 GB)',
  troppoCorto: 'non è un archivio: troppo corto',
  senzaCoda: 'non è un archivio: manca la coda',
  indiceRovinato: (voce: number) => `indice dell’archivio rovinato alla voce ${voce}`,
  fuoriPosto: (nome: string) => `la voce «${nome}» non si trova dove l’indice dice`,
  compressioneIgnota: (nome: string, metodo: number) =>
    `la voce «${nome}» usa una compressione che non conosco (${metodo})`,
  oltreLaFine: (nome: string) => `la voce «${nome}» finisce oltre la fine dell’archivio`,
  nonSiDecomprime: (nome: string, detto: string) => `la voce «${nome}» non si decomprime: ${detto}`,
  rovinata: (nome: string) => `la voce «${nome}» è rovinata: il controllo non torna`,
}

export const testi = catalogo(it, {
  de: {
    troppeVoci: (quante) => `zu viele Einträge für ein einfaches Archiv: ${quante}`,
    troppoGrande: 'Archiv zu gross für das einfache Format (4 GB)',
    troppoCorto: 'kein Archiv: zu kurz',
    senzaCoda: 'kein Archiv: das Ende fehlt',
    indiceRovinato: (voce) => `Inhaltsverzeichnis des Archivs beim Eintrag ${voce} beschädigt`,
    fuoriPosto: (nome) => `der Eintrag «${nome}» steht nicht dort, wo das Verzeichnis sagt`,
    compressioneIgnota: (nome, metodo) =>
      `der Eintrag «${nome}» verwendet eine unbekannte Komprimierung (${metodo})`,
    oltreLaFine: (nome) => `der Eintrag «${nome}» reicht über das Ende des Archivs hinaus`,
    nonSiDecomprime: (nome, detto) => `der Eintrag «${nome}» lässt sich nicht entpacken: ${detto}`,
    rovinata: (nome) => `der Eintrag «${nome}» ist beschädigt: die Prüfsumme stimmt nicht`,
  },
  fr: {
    troppeVoci: (quante) => `trop d’entrées pour une archive simple : ${quante}`,
    troppoGrande: 'archive trop grande pour le format simple (4 Go)',
    troppoCorto: 'ce n’est pas une archive : trop courte',
    senzaCoda: 'ce n’est pas une archive : la fin manque',
    indiceRovinato: (voce) => `index de l’archive abîmé à l’entrée ${voce}`,
    fuoriPosto: (nome) => `l’entrée « ${nome} » ne se trouve pas là où l’index l’indique`,
    compressioneIgnota: (nome, metodo) =>
      `l’entrée « ${nome} » utilise une compression inconnue (${metodo})`,
    oltreLaFine: (nome) => `l’entrée « ${nome} » dépasse la fin de l’archive`,
    nonSiDecomprime: (nome, detto) => `l’entrée « ${nome} » ne se décompresse pas : ${detto}`,
    rovinata: (nome) => `l’entrée « ${nome} » est abîmée : la somme de contrôle ne correspond pas`,
  },
  en: {
    troppeVoci: (quante) => `too many entries for a simple archive: ${quante}`,
    troppoGrande: 'archive too large for the simple format (4 GB)',
    troppoCorto: 'not an archive: too short',
    senzaCoda: 'not an archive: the end record is missing',
    indiceRovinato: (voce) => `archive index damaged at entry ${voce}`,
    fuoriPosto: (nome) => `the entry “${nome}” isn’t where the index says`,
    compressioneIgnota: (nome, metodo) =>
      `the entry “${nome}” uses a compression method I don’t know (${metodo})`,
    oltreLaFine: (nome) => `the entry “${nome}” runs past the end of the archive`,
    nonSiDecomprime: (nome, detto) => `the entry “${nome}” won’t decompress: ${detto}`,
    rovinata: (nome) => `the entry “${nome}” is damaged: the checksum doesn’t match`,
  },
})
