// I testi di `compositions.ts`: le composizioni di PDF, com'è andato farle,
// rifarle e buttarle via.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  nessunoNellaCartella: 'Nessuno di quei documenti è più nella cartella: prima si rifanno.',
  nessunoLeggibile: 'Nessuno di quei PDF si è lasciato leggere.',
  nonScritto: 'Il fascicolo non si è potuto scrivere.',
  mancanti: (n: number) => `${n} non erano più nella cartella`,
  protetti: (n: number) => `${n} protetti da password`,
  illeggibili: (n: number) => `${n} non si sono lasciati leggere`,
  tuttiDentro: (nome: string, scritti: number) => `«${nome}»: ${scritti} documenti in un PDF solo.`,
  qualcunoFuori: (nome: string, scritti: number, fuori: number, motivi: readonly string[]) =>
    `«${nome}»: ${scritti} documenti; ${fuori} rimasti fuori — ${motivi.join(', ')}.`,
  senzaNome: 'Dai un nome alla composizione: è il nome del file che ne esce.',
  almenoDue: 'Servono almeno due documenti da combinare.',
  alMassimo: (massimo: number) => `Una composizione tiene al massimo ${massimo} fogli.`,
  giaCe: (nome: string) => `C’è già una composizione che si chiama «${nome}».`,
  nonCePiu: 'Quella composizione non c’è più.',
  nonTolta: (nome: string) => `«${nome}» non si è potuto togliere dall’anno.`,
  buttata: (nome: string) => `Composizione «${nome}» buttata via.`,
  senzaPdf: (nome: string) =>
    `Composizione «${nome}» tolta dall’elenco: il suo PDF non era più nella cartella.`,
  elencoRimasto: (nome: string) =>
    `Il PDF di «${nome}» è andato via, ma il suo elenco è rimasto nell’anno.`,
}

export const testi = catalogo(it, {
  de: {
    nessunoNellaCartella:
      'Keines dieser Dokumente ist mehr im Ordner: Erstelle sie zuerst neu.',
    nessunoLeggibile: 'Keines dieser PDFs liess sich lesen.',
    nonScritto: 'Die Zusammenstellung konnte nicht geschrieben werden.',
    mancanti: (n) => `${n} waren nicht mehr im Ordner`,
    protetti: (n) => `${n} passwortgeschützt`,
    illeggibili: (n) => `${n} liessen sich nicht lesen`,
    tuttiDentro: (nome, scritti) =>
      `«${nome}»: ${plurale(scritti, 'Dokument', 'Dokumente')} in einem einzigen PDF.`,
    qualcunoFuori: (nome, scritti, fuori, motivi) =>
      `«${nome}»: ${plurale(scritti, 'Dokument', 'Dokumente')}; ${fuori} nicht aufgenommen — ` +
      `${motivi.join(', ')}.`,
    senzaNome: 'Gib der Zusammenstellung einen Namen: Es ist der Name der Datei, die entsteht.',
    almenoDue: 'Es braucht mindestens zwei Dokumente zum Zusammenfügen.',
    alMassimo: (massimo) => `Eine Zusammenstellung fasst höchstens ${massimo} Blätter.`,
    giaCe: (nome) => `Es gibt schon eine Zusammenstellung mit dem Namen «${nome}».`,
    nonCePiu: 'Diese Zusammenstellung gibt es nicht mehr.',
    nonTolta: (nome) => `«${nome}» liess sich nicht aus dem Schuljahr entfernen.`,
    buttata: (nome) => `Zusammenstellung «${nome}» gelöscht.`,
    senzaPdf: (nome) =>
      `Zusammenstellung «${nome}» aus der Liste entfernt: Das PDF dazu war nicht mehr im Ordner.`,
    elencoRimasto: (nome) =>
      `Das PDF von «${nome}» ist weg, aber seine Liste ist im Schuljahr geblieben.`,
  },
  fr: {
    nessunoNellaCartella:
      'Aucun de ces documents n’est plus dans le dossier : il faut d’abord les refaire.',
    nessunoLeggibile: 'Aucun de ces PDF n’a pu être lu.',
    nonScritto: 'La compilation n’a pas pu être écrite.',
    mancanti: (n) => `${n} n’étaient plus dans le dossier`,
    protetti: (n) => `${n} protégés par mot de passe`,
    illeggibili: (n) => `${n} n’ont pas pu être lus`,
    tuttiDentro: (nome, scritti) =>
      `« ${nome} » : ${plurale(scritti, 'document', 'documents')} dans un seul PDF.`,
    qualcunoFuori: (nome, scritti, fuori, motivi) =>
      `« ${nome} » : ${plurale(scritti, 'document', 'documents')} ; ${fuori} laissés de côté — ` +
      `${motivi.join(', ')}.`,
    senzaNome: 'Donne un nom à la compilation : c’est le nom du fichier qui en sort.',
    almenoDue: 'Il faut au moins deux documents à combiner.',
    alMassimo: (massimo) => `Une compilation contient au maximum ${massimo} feuilles.`,
    giaCe: (nome) => `Il existe déjà une compilation qui s’appelle « ${nome} ».`,
    nonCePiu: 'Cette compilation n’existe plus.',
    nonTolta: (nome) => `« ${nome} » n’a pas pu être retiré de l’année.`,
    buttata: (nome) => `Compilation « ${nome} » supprimée.`,
    senzaPdf: (nome) =>
      `Compilation « ${nome} » retirée de la liste : son PDF n’était plus dans le dossier.`,
    elencoRimasto: (nome) =>
      `Le PDF de « ${nome} » a été supprimé, mais sa liste est restée dans l’année.`,
  },
  en: {
    nessunoNellaCartella: 'None of those documents is in the folder any more: remake them first.',
    nessunoLeggibile: 'None of those PDFs could be read.',
    nonScritto: 'The compilation couldn’t be written.',
    mancanti: (n) => `${n} were no longer in the folder`,
    protetti: (n) => `${n} password-protected`,
    illeggibili: (n) => `${n} couldn’t be read`,
    tuttiDentro: (nome, scritti) =>
      `“${nome}”: ${plurale(scritti, 'document', 'documents')} in a single PDF.`,
    qualcunoFuori: (nome, scritti, fuori, motivi) =>
      `“${nome}”: ${plurale(scritti, 'document', 'documents')}; ${fuori} left out — ` +
      `${motivi.join(', ')}.`,
    senzaNome: 'Give the compilation a name: it’s the name of the file it produces.',
    almenoDue: 'At least two documents are needed to combine.',
    alMassimo: (massimo) => `A compilation holds at most ${massimo} sheets.`,
    giaCe: (nome) => `There’s already a compilation called “${nome}”.`,
    nonCePiu: 'That compilation is no longer there.',
    nonTolta: (nome) => `“${nome}” couldn’t be removed from the year.`,
    buttata: (nome) => `Compilation “${nome}” deleted.`,
    senzaPdf: (nome) =>
      `Compilation “${nome}” removed from the list: its PDF was no longer in the folder.`,
    elencoRimasto: (nome) => `The PDF of “${nome}” has gone, but its list is still in the year.`,
  },
})
