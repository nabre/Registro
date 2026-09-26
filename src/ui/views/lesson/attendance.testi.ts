// I testi dell'appello dell'ora (`lesson/attendance.ts`).

import { catalogo } from '../../../i18n/index.js'
import { PIF } from '../../../domain/lexicon.js'
import { plurale } from '../../../domain/text.js'

const it = {
  appello: 'Appello',
  classeSparita: 'La classe di questa lezione non esiste più',
  /** Il suggerimento del pulsante: che cosa c'è adesso, che cosa dà il clic. */
  suggerimento: (titolo: string, adesso: string, prossimo: string) =>
    `${titolo} — ora ${adesso}, clic per ${prossimo}, premi a lungo per scegliere`,
  misto: 'misto',
  daFare: (quante: number) => `${quante} caselle da fare · `,
  presenti: (presenti: number, su: number, ud: number) =>
    `${presenti} presenti su ${su} · ${ud} UD`,
  udAssenza: (ud: number) => ` · ${ud} UD di assenza`,
  tuttaLOra: (nome: string) => `Tutta la lezione di ${nome}`,
  cella: (nome: string, ud: number, inizio: string, fine: string) =>
    `${nome}, UD ${ud} (${inizio}–${fine})`,
  colonna: (ud: number, inizio: string, fine: string) =>
    `Tutta la classe, UD ${ud} (${inizio}–${fine})`,
  minutiRitardo: (nome: string) => `Minuti di ritardo di ${nome}`,
  nota: 'nota',
  notaSu: (nome: string) => `Nota su ${nome}`,
  minuti: 'min',
  tuttiPresenti: 'Tutti presenti',
  fatto: 'Appello fatto: tutti presenti su tutte le UD.',
  azzera: 'Azzera',
  /** «non impostato», con la parola dell'appello di questa lingua. */
  azzeraTitolo: (nonImpostato: string) => `Rimette ogni casella a «${nonImpostato}»`,
  azzerareTitolo: 'Azzerare l’appello?',
  azzerareTesto: (nonImpostato: string) =>
    `Ogni casella della lezione torna a «${nonImpostato}»: non si può disfare.`,
  azzerato: 'Appello azzerato: nessuna casella impostata.',
  nessuno: `Nessuna ${PIF.singolare} nella classe`,
  vaiAllaClasse: 'Vai alla classe',
}

export const testi = catalogo(it, {
  de: {
    appello: 'Präsenzkontrolle',
    classeSparita: 'Die Klasse dieser Stunde gibt es nicht mehr',
    suggerimento: (titolo, adesso, prossimo) =>
      `${titolo} — jetzt ${adesso}, Klick für ${prossimo}, lange drücken zum Auswählen`,
    misto: 'gemischt',
    daFare: (quante) => `${plurale(quante, 'Feld offen', 'Felder offen')} · `,
    presenti: (presenti, su, ud) => `${presenti} anwesend von ${su} · ${ud} Lekt.`,
    udAssenza: (ud) => ` · ${ud} Lekt. Absenz`,
    tuttaLOra: (nome) => `Die ganze Stunde von ${nome}`,
    cella: (nome, ud, inizio, fine) => `${nome}, Lekt. ${ud} (${inizio}–${fine})`,
    colonna: (ud, inizio, fine) => `Die ganze Klasse, Lekt. ${ud} (${inizio}–${fine})`,
    minutiRitardo: (nome) => `Minuten Verspätung von ${nome}`,
    nota: 'Notiz',
    notaSu: (nome) => `Notiz zu ${nome}`,
    minuti: 'Min.',
    tuttiPresenti: 'Alle anwesend',
    fatto: 'Präsenzkontrolle erledigt: alle in allen Lektionen anwesend.',
    azzera: 'Zurücksetzen',
    azzeraTitolo: (nonImpostato) => `Setzt jedes Feld auf «${nonImpostato}» zurück`,
    azzerareTitolo: 'Präsenzkontrolle zurücksetzen?',
    azzerareTesto: (nonImpostato) =>
      `Jedes Feld der Stunde wird wieder «${nonImpostato}»: ` +
      'Das lässt sich nicht rückgängig machen.',
    azzerato: 'Präsenzkontrolle zurückgesetzt: kein Feld erfasst.',
    nessuno: 'Keine Lernenden in der Klasse',
    vaiAllaClasse: 'Zur Klasse',
  },
  fr: {
    appello: 'Appel',
    classeSparita: 'La classe de cette leçon n’existe plus',
    suggerimento: (titolo, adesso, prossimo) =>
      `${titolo} — actuellement ${adesso}, clic pour ${prossimo}, appui long pour choisir`,
    misto: 'mixte',
    daFare: (quante) => `${plurale(quante, 'case à remplir', 'cases à remplir')} · `,
    presenti: (presenti, su, ud) => `${presenti} présents sur ${su} · ${ud} pér.`,
    udAssenza: (ud) => ` · ${ud} pér. d’absence`,
    tuttaLOra: (nome) => `Toute la leçon de ${nome}`,
    cella: (nome, ud, inizio, fine) => `${nome}, pér. ${ud} (${inizio}–${fine})`,
    colonna: (ud, inizio, fine) => `Toute la classe, pér. ${ud} (${inizio}–${fine})`,
    minutiRitardo: (nome) => `Minutes de retard de ${nome}`,
    nota: 'note',
    notaSu: (nome) => `Note sur ${nome}`,
    minuti: 'min',
    tuttiPresenti: 'Tous présents',
    fatto: 'Appel fait : tous présents sur toutes les périodes.',
    azzera: 'Réinitialiser',
    azzeraTitolo: (nonImpostato) => `Remet chaque case à « ${nonImpostato} »`,
    azzerareTitolo: 'Réinitialiser l’appel ?',
    azzerareTesto: (nonImpostato) =>
      `Chaque case de la leçon revient à « ${nonImpostato} » : on ne peut pas annuler.`,
    azzerato: 'Appel réinitialisé : aucune case saisie.',
    nessuno: 'Aucune personne en formation dans la classe',
    vaiAllaClasse: 'Aller à la classe',
  },
  en: {
    appello: 'Attendance',
    classeSparita: 'This lesson’s class no longer exists',
    suggerimento: (titolo, adesso, prossimo) =>
      `${titolo} — now ${adesso}, click for ${prossimo}, press and hold to choose`,
    misto: 'mixed',
    daFare: (quante) => `${plurale(quante, 'box to fill', 'boxes to fill')} · `,
    presenti: (presenti, su, ud) => `${presenti} present out of ${su} · ${ud} per.`,
    udAssenza: (ud) => ` · ${ud} per. absent`,
    tuttaLOra: (nome) => `The whole lesson for ${nome}`,
    cella: (nome, ud, inizio, fine) => `${nome}, per. ${ud} (${inizio}–${fine})`,
    colonna: (ud, inizio, fine) => `The whole class, per. ${ud} (${inizio}–${fine})`,
    minutiRitardo: (nome) => `Minutes late for ${nome}`,
    nota: 'note',
    notaSu: (nome) => `Note on ${nome}`,
    minuti: 'min',
    tuttiPresenti: 'All present',
    fatto: 'Attendance done: everyone present for every period.',
    azzera: 'Reset',
    azzeraTitolo: (nonImpostato) => `Sets every box back to “${nonImpostato}”`,
    azzerareTitolo: 'Reset attendance?',
    azzerareTesto: (nonImpostato) =>
      `Every box for the lesson goes back to “${nonImpostato}”: this can’t be undone.`,
    azzerato: 'Attendance reset: no box set.',
    nessuno: 'No learners in the class',
    vaiAllaClasse: 'Go to the class',
  },
})
