// I testi di `upgrades.ts`: che cosa cambia a ogni passo del formato e il
// rifiuto di un anno scritto da un registro più recente. `versionePiuRecente`
// riconosce quella frase in ogni lingua: nome del file, `cosa` e i due numeri
// devono comparire tutti, una volta sola.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Che cosa cambia, per numero di versione a cui porta il passo. */
  passi: {},
  /** Il passaggio fra due versioni, con i cambiamenti in ordine. */
  racconto: (da: number, a: number, cambi: readonly string[]) =>
    `dal formato ${da} al ${a}: ${cambi.join('; ')}`,
  /** Quale numero non torna: il contenitore o i dati dentro. */
  cosa: { formato: 'formato', dati: 'dati' },
  scrittoDaRecente: (file: string, cosa: string, delFile: number, quiFinoA: number) =>
    `${file} è stato scritto da una versione più recente del registro ` +
    `(${cosa} ${delFile}, qui si arriva a ${quiFinoA})`,
  aggiornaInvece:
    'Aggiorna il registro invece di aprirlo: scriverci sopra adesso perderebbe quel che non si ' +
    'sa leggere.',
}

export const testi = catalogo(it, {
  de: {
    passi: {},
    racconto: (da, a, cambi) => `vom Format ${da} zu ${a}: ${cambi.join('; ')}`,
    cosa: { formato: 'Format', dati: 'Daten' },
    scrittoDaRecente: (file, cosa, delFile, quiFinoA) =>
      `${file} wurde mit einer neueren Version des Klassenbuchs geschrieben ` +
      `(${cosa} ${delFile}, dieses hier kennt nur bis ${quiFinoA})`,
    aggiornaInvece:
      'Aktualisiere das Klassenbuch, statt die Datei zu öffnen: Wenn jetzt darin gespeichert ' +
      'würde, ginge verloren, was es nicht lesen kann.',
  },
  fr: {
    passi: {},
    racconto: (da, a, cambi) => `du format ${da} au ${a} : ${cambi.join(' ; ')}`,
    cosa: { formato: 'format', dati: 'données' },
    scrittoDaRecente: (file, cosa, delFile, quiFinoA) =>
      `${file} a été écrit par une version plus récente du registre ` +
      `(${cosa} ${delFile}, celui-ci va jusqu’à ${quiFinoA})`,
    aggiornaInvece:
      'Mets à jour le registre au lieu d’ouvrir le fichier : écrire dedans maintenant ferait ' +
      'perdre ce qu’il ne sait pas lire.',
  },
  en: {
    passi: {},
    racconto: (da, a, cambi) => `from format ${da} to ${a}: ${cambi.join('; ')}`,
    cosa: { formato: 'format', dati: 'data' },
    scrittoDaRecente: (file, cosa, delFile, quiFinoA) =>
      `${file} was written by a newer version of the register ` +
      `(${cosa} ${delFile}, this one goes up to ${quiFinoA})`,
    aggiornaInvece:
      'Update the register instead of opening the file: writing to it now would lose what ' +
      'this version can’t read.',
  },
})
