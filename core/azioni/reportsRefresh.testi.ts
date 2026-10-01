// I testi di `reportsRefresh.ts`: gli avvisi della rigenerazione automatica.
// `dove` («di CP — DIC2») lo compone `diCorso` di `reports.testi.ts`, e ogni
// lingua lo inserisce nella sua frase con lo spazio davanti.

import { catalogo, perNumero } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  aggiornatiConErrori: (scritti: number, dove: string, falliti: number, primo: string) =>
    `Regiklass: ${plurale(scritti, 'documento', 'documenti')}${dove} ` +
    `${perNumero(scritti, 'aggiornato', 'aggiornati')}, ${falliti} no. ${primo}`,
  aggiornatiDopo: (scritti: number, dove: string, giorno: string) =>
    `Regiklass: ${plurale(scritti, 'documento', 'documenti')}${dove} ` +
    `${perNumero(scritti, 'aggiornato', 'aggiornati')} dopo la lezione del ${giorno}.`,
  nonRifattiDellaLezione: (giorno: string, motivo: string) =>
    `Regiklass: i documenti della lezione del ${giorno} non si sono potuti rifare: ${motivo}`,
  nonRifatti: (falliti: number, primo: string) =>
    `Regiklass: ${plurale(falliti, 'documento non si è potuto', 'documenti non si sono potuti')} rifare. ${primo}`,
  nonRifattiPerche: (motivo: string) => `Regiklass: i documenti non si sono potuti rifare: ${motivo}`,
}

export const testi = catalogo(it, {
  de: {
    aggiornatiConErrori: (scritti, dove, falliti, primo) =>
      `Regiklass: ${plurale(scritti, 'Dokument', 'Dokumente')}${dove} aktualisiert, ${falliti} nicht. ${primo}`,
    aggiornatiDopo: (scritti, dove, giorno) =>
      `Regiklass: ${plurale(scritti, 'Dokument', 'Dokumente')}${dove} nach der Stunde vom ${giorno} aktualisiert.`,
    nonRifattiDellaLezione: (giorno, motivo) =>
      `Regiklass: Die Dokumente der Stunde vom ${giorno} konnten nicht neu erstellt werden: ${motivo}`,
    nonRifatti: (falliti, primo) =>
      `Regiklass: ${plurale(falliti, 'Dokument konnte', 'Dokumente konnten')} nicht neu erstellt werden. ${primo}`,
    nonRifattiPerche: (motivo) => `Regiklass: Die Dokumente konnten nicht neu erstellt werden: ${motivo}`,
  },
  fr: {
    aggiornatiConErrori: (scritti, dove, falliti, primo) =>
      `Regiklass : ${plurale(scritti, 'document', 'documents')}${dove} mis à jour, ${falliti} non. ${primo}`,
    aggiornatiDopo: (scritti, dove, giorno) =>
      `Regiklass : ${plurale(scritti, 'document', 'documents')}${dove} mis à jour après la leçon du ${giorno}.`,
    nonRifattiDellaLezione: (giorno, motivo) =>
      `Regiklass : les documents de la leçon du ${giorno} n’ont pas pu être refaits : ${motivo}`,
    nonRifatti: (falliti, primo) =>
      `Regiklass : ${plurale(falliti, 'document n’a pas pu être refait', 'documents n’ont pas pu être refaits')}. ${primo}`,
    nonRifattiPerche: (motivo) => `Regiklass : les documents n’ont pas pu être refaits : ${motivo}`,
  },
  en: {
    aggiornatiConErrori: (scritti, dove, falliti, primo) =>
      `Regiklass: ${plurale(scritti, 'document', 'documents')}${dove} updated, ${falliti} not. ${primo}`,
    aggiornatiDopo: (scritti, dove, giorno) =>
      `Regiklass: ${plurale(scritti, 'document', 'documents')}${dove} updated after the lesson on ${giorno}.`,
    nonRifattiDellaLezione: (giorno, motivo) =>
      `Regiklass: the documents for the lesson on ${giorno} could not be redone: ${motivo}`,
    nonRifatti: (falliti, primo) =>
      `Regiklass: ${plurale(falliti, 'document', 'documents')} could not be redone. ${primo}`,
    nonRifattiPerche: (motivo) => `Regiklass: the documents could not be redone: ${motivo}`,
  },
})
