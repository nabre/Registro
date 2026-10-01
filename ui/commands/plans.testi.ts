// I testi dei comandi del piano aperto (`plans.ts`). La guida cita i nomi dei
// pulsanti fra virgolette: cambiandone uno va cambiato anche là, in tutte le
// lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nessunPianoAperto: 'Nessun piano aperto.',
  // Il piano aperto.
  vaiAlRegistro: 'Vai al registro',
  vaiAlRegistroAiuto: 'Apre il registro della lezione che usa questa scaletta',
  pianoSenzaOra:
    'Questa scaletta non sta ancora su nessuna lezione: assegnala dal calendario.',
  duplicaAiuto:
    'Una copia da adattare: è così che lo stesso piano serve un altro corso',
  eliminaAiuto: 'Toglie la scaletta e il materiale che ci sta attaccato',
  oraInQuestoCorso: 'Lezione in questo corso',
}

export const testi = catalogo(it, {
  de: {
    nessunPianoAperto: 'Kein Plan geöffnet.',
    vaiAlRegistro: 'Zum Klassenbuch',
    vaiAlRegistroAiuto:
      'Öffnet das Klassenbuch der Stunde, die diesen Ablauf verwendet',
    pianoSenzaOra:
      'Dieser Ablauf gehört noch zu keiner Stunde: Weise ihn von einer Stunde im Kalender aus zu.',
    duplicaAiuto:
      'Eine Kopie zum Anpassen: So dient derselbe Plan einem anderen Kurs',
    eliminaAiuto: 'Entfernt den Ablauf und das daran hängende Material',
    oraInQuestoCorso: 'Stunde in diesem Kurs',
  },
  fr: {
    nessunPianoAperto: 'Aucun plan ouvert.',
    vaiAlRegistro: 'Aller au registre',
    vaiAlRegistroAiuto:
      'Ouvre le registre de la leçon qui utilise ce déroulement',
    pianoSenzaOra:
      'Ce déroulement n’est encore sur aucune leçon : attribue-le depuis une leçon du calendrier.',
    duplicaAiuto:
      'Une copie à adapter : c’est ainsi que le même plan sert à un autre cours',
    eliminaAiuto: 'Retire le déroulement et le matériel qui y est attaché',
    oraInQuestoCorso: 'Leçon dans ce cours',
  },
  en: {
    nessunPianoAperto: 'No plan open.',
    vaiAlRegistro: 'Go to the register',
    vaiAlRegistroAiuto:
      'Opens the register of the lesson that uses this outline',
    pianoSenzaOra:
      'This outline is not on any lesson yet: assign it from a lesson in the calendar.',
    duplicaAiuto:
      'A copy to adapt: that is how the same plan serves another course',
    eliminaAiuto: 'Removes the outline and the materials attached to it',
    oraInQuestoCorso: 'Lesson in this course',
  },
})
