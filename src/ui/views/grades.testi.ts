// I testi della griglia dei voti (`views/grades.ts`); l'avviso «non è un voto»
// lo usa anche la casella del recupero (`views/retakes.ts`).

import { catalogo, numero } from '../../i18n/index.js'

const it = {
  /** Il suggerimento sul titolo di una colonna: il momento, il giorno, il peso. */
  titoloMomento: (titolo: string, data: string, peso: number) =>
    `${titolo} — ${data} · peso ${peso}`,
  assenteAllAppello: 'Assente all’appello di questa lezione: premi X per segnarlo anche qui',
  nonEUnVoto: (battuto: string) =>
    `«${battuto}» non è un voto: si scrive un numero, ` +
    'oppure «-» per nessun voto e «X» per assente.',
  /** La lettera accanto a un voto che viene da un recupero. */
  siglaRecupero: 'R',
  nonSiRecupera: 'Non si recupera: dichiarato da chi insegna',
  recuperoDel: (giorno: string) => `Recupero del ${giorno}`,
  recuperoDaFissare: 'Recupero da fissare',
  scaleDiverse:
    'In questo periodo ci sono prove con scale diverse: la media non ' +
    'sta su nessuna delle due, e una nota di fine semestre da qui ' +
    'direbbe un numero senza significato.',
  mediaDellaClasse: 'Media della classe',
}

export const testi = catalogo(it, {
  de: {
    titoloMomento: (titolo, data, peso) => `${titolo} — ${data} · Gewichtung ${numero(peso)}`,
    assenteAllAppello:
      'Bei der Präsenzkontrolle dieser Stunde abwesend: Drück X, um es auch hier einzutragen',
    nonEUnVoto: (battuto) =>
      `«${battuto}» ist keine Note: Man schreibt eine Zahl, ` +
      'oder «-» für keine Note und «X» für abwesend.',
    siglaRecupero: 'N',
    nonSiRecupera: 'Keine Nachprüfung: von der Lehrperson so entschieden',
    recuperoDel: (giorno) => `Nachprüfung vom ${giorno}`,
    recuperoDaFissare: 'Nachprüfung noch anzusetzen',
    scaleDiverse:
      'In diesem Zeitraum gibt es Prüfungen mit verschiedenen Notenskalen: Der Durchschnitt ' +
      'liegt auf keiner der beiden, und eine Semesternote daraus wäre eine Zahl ohne ' +
      'Bedeutung.',
    mediaDellaClasse: 'Klassendurchschnitt',
  },
  fr: {
    titoloMomento: (titolo, data, peso) => `${titolo} — ${data} · pondération ${numero(peso)}`,
    assenteAllAppello: 'Absent à l’appel de cette leçon : appuie sur X pour le noter ici aussi',
    nonEUnVoto: (battuto) =>
      `« ${battuto} » n’est pas une note : on écrit un nombre, ` +
      'ou « - » pour pas de note et « X » pour absent.',
    siglaRecupero: 'R',
    nonSiRecupera: 'Pas de rattrapage : décidé par l’enseignant',
    recuperoDel: (giorno) => `Rattrapage du ${giorno}`,
    recuperoDaFissare: 'Rattrapage à fixer',
    scaleDiverse:
      'Dans cette période, il y a des épreuves avec des barèmes différents : la moyenne ne ' +
      'correspond à aucun des deux, et une note semestrielle tirée de là donnerait un ' +
      'nombre sans signification.',
    mediaDellaClasse: 'Moyenne de la classe',
  },
  en: {
    titoloMomento: (titolo, data, peso) => `${titolo} — ${data} · weight ${numero(peso)}`,
    assenteAllAppello: 'Absent at this lesson’s attendance: press X to mark it here too',
    nonEUnVoto: (battuto) =>
      `“${battuto}” isn’t a grade: type a number, ` +
      'or “-” for no grade and “X” for absent.',
    siglaRecupero: 'R',
    nonSiRecupera: 'No resit: decided by the teacher',
    recuperoDel: (giorno) => `Resit on ${giorno}`,
    recuperoDaFissare: 'Resit to be scheduled',
    scaleDiverse:
      'This period has tests on different grading scales: the average sits on neither of ' +
      'them, and a semester grade worked out from it would be a meaningless number.',
    mediaDellaClasse: 'Class average',
  },
})
