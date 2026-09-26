// I testi di `repairs.ts`: le riparazioni proposte, spiegate prima di accettarle.

import { catalogo } from '../i18n/index.js'
import { plurale } from './text.js'

const it = {
  /** Il nome di una materia ricreata quando il titolo del corso non dice niente. */
  materiaRecuperata: 'Materia recuperata',
  numeriStorti: (n: number) =>
    `Rinomina ${plurale(n, 'numero', 'numeri')} secondo quel che ` +
    'sono davvero: un 079 è un cellulare, un 091 no.',
  materiaSparita: (materia: string, corsi: number) =>
    `Rimette la materia «${materia}», che non c'è più nel registro ma è ancora usata da ` +
    `${plurale(corsi, 'corso', 'corsi')}.`,
  pianoStaccato: (n: number) =>
    `Stacca il piano da ${plurale(n, 'lezione', 'lezioni')}: ` +
    'quello a cui puntano non esiste più.',
  momentiRotti: (n: number) =>
    `Toglie il collegamento rotto a ${plurale(n, 'momento', 'momenti')} ` +
    'di valutazione: la lezione o il piano citati non ci sono più, o sono di un altro corso. ' +
    'I voti restano.',
  pianiOrfani: (n: number) =>
    `Stacca ${plurale(n, 'piano lezione', 'piani lezione')} dal corso che citano: ` +
    'non esiste più. Restano fra le bozze, pronti da riagganciare.',
  consegneAppese: (n: number) =>
    `Stacca ${plurale(n, 'consegna', 'consegne')} dalla lezione che citano: ` +
    'non esiste più. Tengono la data che avevano.',
  spunteAppese: (n: number) =>
    `Stacca ${plurale(n, 'spunta', 'spunte')} del check dalla lezione che citano: ` +
    'non esiste più. Restano spuntate, con la data che avevano.',
  checkOrfani: (n: number) =>
    `Toglie ${plurale(n, 'lista di controllo', 'liste di controllo')} ` +
    'di un corso che non esiste più, con le loro spunte.',
  spunteEstranee: (n: number) =>
    `Toglie ${plurale(n, 'spunta', 'spunte')} del check di persone che non ` +
    'sono più iscritte alla classe del corso: nessuna griglia le può mostrare.',
  titoliVecchi: (n: number) =>
    'Rimette nell\'ordine di adesso — classe, poi materia — il titolo di ' +
    `${plurale(n, 'corso', 'corsi')}. I titoli scritti a mano ` +
    'restano come sono.',
}

export const testi = catalogo(it, {
  de: {
    materiaRecuperata: 'Wiederhergestelltes Fach',
    numeriStorti: (n) =>
      `Benennt ${plurale(n, 'Nummer', 'Nummern')} nach dem, was sie wirklich sind: ` +
      'Eine 079 ist eine Handynummer, eine 091 nicht.',
    materiaSparita: (materia, corsi) =>
      `Stellt das Fach «${materia}» wieder her, das im Klassenbuch fehlt, aber noch von ` +
      `${plurale(corsi, 'Kurs', 'Kursen')} verwendet wird.`,
    pianoStaccato: (n) =>
      `Löst den Unterrichtsplan von ${plurale(n, 'Stunde', 'Stunden')}: ` +
      'Der Plan, auf den sie verweisen, existiert nicht mehr.',
    momentiRotti: (n) =>
      'Entfernt die defekte Verknüpfung bei ' +
      `${plurale(n, 'Leistungsbeurteilung', 'Leistungsbeurteilungen')}: Die genannte ` +
      'Stunde oder der genannte Unterrichtsplan existiert nicht mehr oder gehört zu einem ' +
      'anderen Kurs. Die Noten bleiben.',
    pianiOrfani: (n) =>
      `Löst ${plurale(n, 'Unterrichtsplan', 'Unterrichtspläne')} von dem Kurs, den sie nennen: ` +
      'Er existiert nicht mehr. Sie bleiben bei den Entwürfen, bereit zum erneuten Verknüpfen.',
    consegneAppese: (n) =>
      `Löst ${plurale(n, 'Auftrag', 'Aufträge')} von der Stunde, die sie nennen: ` +
      'Sie existiert nicht mehr. Das Datum bleibt, wie es war.',
    spunteAppese: (n) =>
      `Löst ${plurale(n, 'Check-Häkchen', 'Check-Häkchen')} von der Stunde, ` +
      'die sie nennen: Sie existiert nicht mehr. Die Häkchen bleiben gesetzt, mit ihrem bisherigen Datum.',
    checkOrfani: (n) =>
      `Entfernt ${plurale(n, 'Checkliste', 'Checklisten')} eines Kurses, den es nicht mehr ` +
      'gibt, samt ihren Häkchen.',
    spunteEstranee: (n) =>
      `Entfernt ${plurale(n, 'Check-Häkchen', 'Check-Häkchen')} von Personen, die nicht mehr ` +
      'in der Klasse des Kurses eingeschrieben sind: Kein Raster kann sie anzeigen.',
    titoliVecchi: (n) =>
      `Bringt den Titel von ${plurale(n, 'Kurs', 'Kursen')} in die heutige Reihenfolge — ` +
      'Klasse, dann Fach. Von Hand geschriebene Titel bleiben, wie sie sind.',
  },
  fr: {
    materiaRecuperata: 'Branche récupérée',
    numeriStorti: (n) =>
      `Renomme ${plurale(n, 'numéro', 'numéros')} selon ce qu’ils sont vraiment : ` +
      'un 079 est un portable, un 091 non.',
    materiaSparita: (materia, corsi) =>
      `Rétablit la branche « ${materia} », qui n’est plus dans le registre mais sert encore à ` +
      `${plurale(corsi, 'cours', 'cours')}.`,
    pianoStaccato: (n) =>
      `Détache le plan de leçon de ${plurale(n, 'leçon', 'leçons')} : ` +
      'celui auquel elles renvoient n’existe plus.',
    momentiRotti: (n) =>
      `Supprime le lien rompu de ${plurale(n, 'évaluation', 'évaluations')} : la leçon ou ` +
      'le plan de leçon cités n’existent plus, ou appartiennent à un autre cours. ' +
      'Les notes restent.',
    pianiOrfani: (n) =>
      `Détache ${plurale(n, 'plan de leçon', 'plans de leçon')} du cours qu’ils citent : ` +
      'il n’existe plus. Ils restent parmi les brouillons, prêts à être rattachés.',
    consegneAppese: (n) =>
      `Détache ${plurale(n, 'devoir', 'devoirs')} de la leçon qu’ils citent : ` +
      'elle n’existe plus. Ils gardent la date qu’ils avaient.',
    spunteAppese: (n) =>
      `Détache ${plurale(n, 'coche', 'coches')} du check de la leçon qu’elles citent : ` +
      'elle n’existe plus. Elles restent cochées, avec la date qu’elles avaient.',
    checkOrfani: (n) =>
      `Supprime ${plurale(n, 'liste de contrôle', 'listes de contrôle')} ` +
      'd’un cours qui n’existe plus, avec leurs coches.',
    spunteEstranee: (n) =>
      `Supprime ${plurale(n, 'coche', 'coches')} du check de personnes qui ne sont plus ` +
      'inscrites dans la classe du cours : aucune grille ne peut les afficher.',
    titoliVecchi: (n) =>
      'Remet dans l’ordre actuel — classe, puis branche — le titre de ' +
      `${plurale(n, 'cours', 'cours')}. Les titres écrits à la main ` +
      'restent tels quels.',
  },
  en: {
    materiaRecuperata: 'Recovered subject',
    numeriStorti: (n) =>
      `Relabels ${plurale(n, 'number', 'numbers')} according to what they really are: ` +
      'a 079 is a mobile, a 091 isn’t.',
    materiaSparita: (materia, corsi) =>
      `Restores the subject “${materia}”, which is no longer in the register but is still ` +
      `used by ${plurale(corsi, 'course', 'courses')}.`,
    pianoStaccato: (n) =>
      `Detaches the lesson plan from ${plurale(n, 'lesson', 'lessons')}: ` +
      'the one they point to no longer exists.',
    momentiRotti: (n) =>
      `Removes the broken link from ${plurale(n, 'assessment', 'assessments')}: the lesson ` +
      'or lesson plan they cite is gone, or belongs to another course. The grades stay.',
    pianiOrfani: (n) =>
      `Detaches ${plurale(n, 'lesson plan', 'lesson plans')} from the course they cite: ` +
      'it no longer exists. They stay among the drafts, ready to be linked again.',
    consegneAppese: (n) =>
      `Detaches ${plurale(n, 'assignment', 'assignments')} from the lesson they cite: ` +
      'it no longer exists. They keep the date they had.',
    spunteAppese: (n) =>
      `Detaches ${plurale(n, 'check tick', 'check ticks')} from the lesson they cite: ` +
      'it no longer exists. They stay ticked, with the date they had.',
    checkOrfani: (n) =>
      `Removes ${plurale(n, 'checklist', 'checklists')} belonging to a course that no longer ` +
      'exists, along with their ticks.',
    spunteEstranee: (n) =>
      `Removes ${plurale(n, 'check tick', 'check ticks')} for people no longer enrolled in ` +
      'the course’s class: no grid can show them.',
    titoliVecchi: (n) =>
      `Puts the title of ${plurale(n, 'course', 'courses')} back into today’s order — ` +
      'class, then subject. Titles typed by hand stay as they are.',
  },
})
