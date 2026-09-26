// I testi dei modi in cui il registro rifà i PDF di un corso (`automation.ts`):
// il nome di ogni modo e che cosa promette.

import { catalogo } from '../i18n/index.js'
import { PIF, un } from './lexicon.js'

const it = {
  mai: {
    nome: 'Solo a mano',
    spiegazione:
      'I documenti si rifanno con i pulsanti di questa pagina. Quel che sta nella cartella ' +
      'resta com’era finché non lo si chiede.',
  },
  chiusura: {
    nome: 'Quando si chiude un’ora',
    spiegazione:
      'Segnando un’ora come svolta si rifanno il suo verbale e i documenti del corso: è il ' +
      'momento in cui i dati di quell’ora sono completi.',
  },
  sempre: {
    nome: 'A ogni modifica',
    spiegazione:
      'Come sopra, e in più a ogni cambiamento che tocca un corso — un voto, un appello, ' +
      `${un(PIF)} — poco dopo che si è smesso di scrivere.`,
  },
}

export const testi = catalogo(it, {
  de: {
    mai: {
      nome: 'Nur von Hand',
      spiegazione:
        'Die Dokumente werden mit den Schaltflächen dieser Seite neu erstellt. Was im Ordner ' +
        'liegt, bleibt, wie es war, bis du es verlangst.',
    },
    chiusura: {
      nome: 'Wenn eine Stunde abgeschlossen wird',
      spiegazione:
        'Wird eine Stunde als gehalten markiert, werden ihr Protokoll und die ' +
        'Dokumente des Kurses neu erstellt: Dann sind ihre Daten vollständig.',
    },
    sempre: {
      nome: 'Bei jeder Änderung',
      spiegazione:
        'Wie oben, und zusätzlich bei jeder Änderung, die einen Kurs betrifft — eine Note, ' +
        'eine Präsenzkontrolle, Angaben zu Lernenden —, kurz nachdem du mit Schreiben ' +
        'aufgehört hast.',
    },
  },
  fr: {
    mai: {
      nome: 'Seulement à la main',
      spiegazione:
        'Les documents se refont avec les boutons de cette page. Ce qui se trouve dans le ' +
        'dossier reste tel quel tant que tu ne le demandes pas.',
    },
    chiusura: {
      nome: 'Quand une leçon est clôturée',
      spiegazione:
        'Quand tu marques une leçon comme donnée, son procès-verbal et les documents du cours ' +
        'sont refaits : c’est le moment où les données de cette leçon sont complètes.',
    },
    sempre: {
      nome: 'À chaque modification',
      spiegazione:
        'Comme ci-dessus, et en plus à chaque changement qui touche un cours — une note, un ' +
        'appel, une personne en formation — peu après que tu as fini d’écrire.',
    },
  },
  en: {
    mai: {
      nome: 'By hand only',
      spiegazione:
        'Documents are remade with the buttons on this page. What’s in the folder stays as it ' +
        'was until you ask.',
    },
    chiusura: {
      nome: 'When a lesson is closed',
      spiegazione:
        'Marking a lesson as held remakes its lesson record and the course documents: that’s when the ' +
        'lesson’s data is complete.',
    },
    sempre: {
      nome: 'On every change',
      spiegazione:
        'As above, and also on every change that affects a course — a grade, the attendance, ' +
        'a learner — shortly after you stop typing.',
    },
  },
})
