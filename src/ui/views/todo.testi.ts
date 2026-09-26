// I testi della pagina delle pendenze (`todo.ts`).

import { catalogo } from '../../i18n/index.js'
import { CARTE, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { plurale } from '../../domain/text.js'

const it = {
  inRitardo: (quante: number) => `${quante} in ritardo`,
  nienteInSospeso: 'niente in sospeso',
  aperte: (pendenze: number, classi: number) =>
    `${quanti(pendenze, CARTE.pendenza)} in ${plurale(classi, 'classe', 'classi')}`,
  tutte: (quante: number) => `Tutte · ${quante}`,
  senzaAnno:
    'Le consegne appartengono a un corso: prima serve sapere che cosa si insegna e a chi.',

  // Quando non c'è niente.
  vuotoTitolo: 'Niente in sospeso',
  vuotoTesto:
    'Qui finisce quel che resta aperto, diviso per tipologia: le assenze da far ' +
    'firmare, i momenti di valutazione, e poi chi deve fare che cosa — i fogli che la ' +
    'classe deve portare, quelli che tocca dare, quel che è stato assegnato e quel che ' +
    'tocca fare a chi insegna. Compare da sé appena c’è, classe per classe.',
  assegnaPrima: 'Assegna la prima',

  // La scheda delle cose chiuse.
  fatto: 'Fatto',
  coseChiuse: (quante: number) => plurale(quante, 'cosa chiusa', 'cose chiuse'),
  fattoAiuto: 'quel che non chiede più niente',
  mostraChiuso: 'Mostra quel che è stato chiuso',
  assenzeFirmate: 'Assenze firmate',
  recuperiChiusi: 'Recuperi chiusi',
  proveRiconsegnate: 'Prove riconsegnate',
  consegneFatte: 'Consegne fatte',
}

export const testi = catalogo(it, {
  de: {
    inRitardo: (quante) => `${quante} überfällig`,
    nienteInSospeso: 'nichts offen',
    aperte: (pendenze, classi) =>
      `${quanti(pendenze, lessico().pendenza)} in ${quanti(classi, lessico().classe)}`,
    tutte: (quante) => `Alle · ${quante}`,
    senzaAnno: 'Aufträge gehören zu einem Kurs: Zuerst muss klar sein, was du unterrichtest ' +
      'und wem.',
    vuotoTitolo: 'Nichts offen',
    vuotoTesto:
      'Hier landet, was offen bleibt, nach Art geordnet: die Absenzen zum Unterschreiben, ' +
      'die Leistungsbeurteilungen, und dann, wer was tun muss — die Blätter, die die Klasse ' +
      'mitbringen muss, die, die du austeilen musst, was aufgegeben wurde und was die ' +
      'Lehrperson erledigen muss. Es erscheint von selbst, sobald es da ist, Klasse für Klasse.',
    assegnaPrima: 'Ersten Auftrag erteilen',
    fatto: 'Erledigt',
    coseChiuse: (quante) => plurale(quante, 'erledigte Sache', 'erledigte Sachen'),
    fattoAiuto: 'was nichts mehr verlangt',
    mostraChiuso: 'Erledigtes anzeigen',
    assenzeFirmate: 'Unterschriebene Absenzen',
    recuperiChiusi: 'Abgeschlossene Nachprüfungen',
    proveRiconsegnate: 'Zurückgegebene Prüfungen',
    consegneFatte: 'Erledigte Aufträge',
  },
  fr: {
    inRitardo: (quante) => `${quante} en retard`,
    nienteInSospeso: 'rien en suspens',
    aperte: (pendenze, classi) =>
      `${quanti(pendenze, lessico().pendenza)} dans ${quanti(classi, lessico().classe)}`,
    tutte: (quante) => `Toutes · ${quante}`,
    senzaAnno: 'Les devoirs appartiennent à un cours : il faut d’abord savoir ce qu’on ' +
      'enseigne, et à qui.',
    vuotoTitolo: 'Rien en suspens',
    vuotoTesto:
      'Ici arrive ce qui reste ouvert, classé par type : les absences à faire signer, les ' +
      'évaluations, puis qui doit faire quoi — les feuilles que la classe doit apporter, ' +
      'celles qu’il faut distribuer, ce qui a été donné et ce qui revient à qui enseigne. ' +
      'Cela apparaît tout seul dès qu’il y a quelque chose, classe par classe.',
    assegnaPrima: 'Donner le premier devoir',
    fatto: 'Terminé',
    coseChiuse: (quante) => plurale(quante, 'élément clos', 'éléments clos'),
    fattoAiuto: 'ce qui ne demande plus rien',
    mostraChiuso: 'Afficher ce qui a été clos',
    assenzeFirmate: 'Absences signées',
    recuperiChiusi: 'Rattrapages clos',
    proveRiconsegnate: 'Épreuves rendues',
    consegneFatte: 'Devoirs faits',
  },
  en: {
    inRitardo: (quante) => `${quante} overdue`,
    nienteInSospeso: 'nothing pending',
    aperte: (pendenze, classi) =>
      `${quanti(pendenze, lessico().pendenza)} in ${quanti(classi, lessico().classe)}`,
    tutte: (quante) => `All · ${quante}`,
    senzaAnno: 'Assignments belong to a course: first the register needs to know what you ' +
      'teach, and to whom.',
    vuotoTitolo: 'Nothing pending',
    vuotoTesto:
      'Whatever is still open ends up here, sorted by type: absences to get signed, ' +
      'assessments, and then who has to do what — the sheets the class has to bring, the ' +
      'ones you have to hand out, what has been set and what falls to the teacher. It ' +
      'appears by itself as soon as there is something, class by class.',
    assegnaPrima: 'Set the first assignment',
    fatto: 'Done',
    coseChiuse: (quante) => plurale(quante, 'closed item', 'closed items'),
    fattoAiuto: 'nothing more to do here',
    mostraChiuso: 'Show what has been closed',
    assenzeFirmate: 'Signed absences',
    recuperiChiusi: 'Closed resits',
    proveRiconsegnate: 'Tests handed back',
    consegneFatte: 'Completed assignments',
  },
})
