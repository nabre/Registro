// I testi della pagina delle pendenze (`todo.ts`).

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  inRitardo: (quante: number) => `${quante} in ritardo`,
  senzaAnno:
    'Le consegne appartengono a un corso: prima serve sapere che cosa si insegna e a chi.',

  // Quando non c'è niente.
  vuotoTitolo: 'Niente in sospeso',
  vuotoTesto:
    'Qui compare quel che resta aperto nel corso scelto: valutazioni, documenti da ' +
    'consegnare e attività assegnate alla classe o al docente.',
  assegnaPrima: 'Assegna la prima',

  // La scheda delle cose chiuse.
  fatto: 'Fatto',
  coseChiuse: (quante: number) => plurale(quante, 'cosa chiusa', 'cose chiuse'),
  fattoAiuto: 'quel che non chiede più niente',
  mostraChiuso: 'Mostra quel che è stato chiuso',
  recuperiChiusi: 'Recuperi chiusi',
  proveRiconsegnate: 'Prove riconsegnate',
  consegneFatte: 'Consegne fatte',
}

export const testi = catalogo(it, {
  de: {
    inRitardo: (quante) => `${quante} überfällig`,
    senzaAnno: 'Aufträge gehören zu einem Kurs: Zuerst muss klar sein, was du unterrichtest ' +
      'und wem.',
    vuotoTitolo: 'Nichts offen',
    vuotoTesto:
      'Hier erscheint, was im gewählten Kurs offen ist: Beurteilungen, auszuhändigende ' +
      'Dokumente und Aufgaben für die Klasse oder die Lehrperson.',
    assegnaPrima: 'Ersten Auftrag erteilen',
    fatto: 'Erledigt',
    coseChiuse: (quante) => plurale(quante, 'erledigte Sache', 'erledigte Sachen'),
    fattoAiuto: 'was nichts mehr verlangt',
    mostraChiuso: 'Erledigtes anzeigen',
    recuperiChiusi: 'Abgeschlossene Nachprüfungen',
    proveRiconsegnate: 'Zurückgegebene Prüfungen',
    consegneFatte: 'Erledigte Aufträge',
  },
  fr: {
    inRitardo: (quante) => `${quante} en retard`,
    senzaAnno: 'Les devoirs appartiennent à un cours : il faut d’abord savoir ce qu’on ' +
      'enseigne, et à qui.',
    vuotoTitolo: 'Rien en suspens',
    vuotoTesto:
      'Ici apparaît ce qui reste ouvert dans le cours choisi : évaluations, documents à ' +
      'remettre et activités attribuées à la classe ou à l’enseignant.',
    assegnaPrima: 'Donner le premier devoir',
    fatto: 'Terminé',
    coseChiuse: (quante) => plurale(quante, 'élément clos', 'éléments clos'),
    fattoAiuto: 'ce qui ne demande plus rien',
    mostraChiuso: 'Afficher ce qui a été clos',
    recuperiChiusi: 'Rattrapages clos',
    proveRiconsegnate: 'Épreuves rendues',
    consegneFatte: 'Devoirs faits',
  },
  en: {
    inRitardo: (quante) => `${quante} overdue`,
    senzaAnno: 'Assignments belong to a course: first the register needs to know what you ' +
      'teach, and to whom.',
    vuotoTitolo: 'Nothing pending',
    vuotoTesto:
      'This page shows what remains open in the selected course: assessments, documents ' +
      'to hand over, and activities assigned to the class or the teacher.',
    assegnaPrima: 'Set the first assignment',
    fatto: 'Done',
    coseChiuse: (quante) => plurale(quante, 'closed item', 'closed items'),
    fattoAiuto: 'nothing more to do here',
    mostraChiuso: 'Show what has been closed',
    recuperiChiusi: 'Closed resits',
    proveRiconsegnate: 'Tests handed back',
    consegneFatte: 'Completed assignments',
  },
})
