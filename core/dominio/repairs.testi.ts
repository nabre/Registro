// I testi di `repairs.ts`: le riparazioni proposte, spiegate prima di accettarle.

import { catalogo } from '#core/i18n/index.js'
import { plurale } from './text.js'

const it = {
  /** Il nome di una materia ricreata quando il titolo del corso non dice niente. */
  materiaRecuperata: 'Materia recuperata',
  numeriStorti: (n: number) =>
    `Rinomina ${plurale(n, 'numero', 'numeri')} secondo quel che ` +
    'sono davvero: un 079 è un cellulare, un 091 no.',
  materiaSparita: (materia: string, corsi: number) =>
    `Rimette la materia «${materia}», che non c’è più nel registro ma è ancora usata da ` +
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
  integrazioniOrfane: (n: number) =>
    `Toglie ${plurale(n, 'integrazione', 'integrazioni')} di progetti in un corso che non ` +
    'esiste più; i progetti restano.',
  progettiDaRipulire: (n: number) =>
    `Ripulisce ${plurale(n, 'progetto', 'progetti')}: le voci di ore sparite tengono la loro ` +
    'data, quelle di persone non iscritte e le celle di criteri tolti se ne vanno.',
  rimandiAiProgetti: (n: number) =>
    `Stacca ${plurale(n, 'tappa o valutazione', 'tappe o valutazioni')} dal progetto che ` +
    'citano, sparito o non integrato nel loro corso.',
  fasiDelleTappe: (n: number) =>
    `Porta ${plurale(n, 'tappa', 'tappe')} nella prima fase del suo progetto: la fase ` +
    'citata non c’è più.',
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
    integrazioniOrfane: (n) =>
      `Entfernt ${plurale(n, 'Einbindung', 'Einbindungen')} von Projekten in einen Kurs, den ` +
      'es nicht mehr gibt; die Projekte bleiben.',
    progettiDaRipulire: (n) =>
      `Bereinigt ${plurale(n, 'Projekt', 'Projekte')}: Einträge gelöschter Stunden behalten ` +
      'ihr Datum, solche von nicht eingeschriebenen Personen und Zellen entfernter Kriterien ' +
      'werden entfernt.',
    rimandiAiProgetti: (n) =>
      `Löst ${plurale(n, 'Etappe oder Beurteilung', 'Etappen oder Beurteilungen')} vom Projekt, ` +
      'das gelöscht ist oder nicht in ihren Kurs eingebunden ist.',
    fasiDelleTappe: (n) =>
      `Verschiebt ${plurale(n, 'Etappe', 'Etappen')} in die erste Phase ihres Projekts: ` +
      'die genannte Phase gibt es nicht mehr.',
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
    integrazioniOrfane: (n) =>
      `Supprime ${plurale(n, 'intégration', 'intégrations')} de projets dans un cours qui ` +
      'n’existe plus ; les projets restent.',
    progettiDaRipulire: (n) =>
      `Nettoie ${plurale(n, 'projet', 'projets')} : les entrées de leçons disparues gardent ` +
      'leur date, celles de personnes non inscrites et les cases de critères retirés partent.',
    rimandiAiProgetti: (n) =>
      `Détache ${plurale(n, 'étape ou évaluation', 'étapes ou évaluations')} du projet ` +
      'qu’elles citent, disparu ou non intégré dans leur cours.',
    fasiDelleTappe: (n) =>
      `Place ${plurale(n, 'étape', 'étapes')} dans la première phase de son projet : ` +
      'la phase citée n’existe plus.',
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
    integrazioniOrfane: (n) =>
      `Removes ${plurale(n, 'project integration', 'project integrations')} in a course that ` +
      'no longer exists; the projects stay.',
    progettiDaRipulire: (n) =>
      `Tidies ${plurale(n, 'project', 'projects')}: entries of deleted lessons keep their ` +
      'date, those of people not enrolled and cells of removed criteria go.',
    rimandiAiProgetti: (n) =>
      `Unlinks ${plurale(n, 'step or assessment', 'steps or assessments')} from the project ` +
      'they cite, which is gone or not integrated in their course.',
    fasiDelleTappe: (n) =>
      `Moves ${plurale(n, 'step', 'steps')} into the first phase of its project: ` +
      'the phase it cites is gone.',
    titoliVecchi: (n) =>
      `Puts the title of ${plurale(n, 'course', 'courses')} back into today’s order — ` +
      'class, then subject. Titles typed by hand stay as they are.',
  },
})
