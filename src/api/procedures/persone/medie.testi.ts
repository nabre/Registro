// I testi di `persone.medie`. I valori di `ordina` («media», «nome», «prove»)
// sono del contratto e restano uguali in ogni lingua. Si leggono al momento
// dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  titolo: 'Le medie per persona, con le soglie di profitto',
  classeId: 'Solo le persone di questa classe',
  corsoId: 'Solo i voti di questo corso: allora la media è quella vera del corso',
  allievoId: 'Una persona sola, per confrontarla con le altre',
  mediaAlmeno: 'Solo chi arriva almeno a questa media. Chi non ha voti resta fuori',
  mediaAlPiu: 'Solo chi non supera questa media: è l’elenco di chi sta sotto',
  soloSotto: 'Vero per avere solo chi è sotto la sufficienza della scala del registro',
  conVoti: 'Falso per avere anche chi non ha nessun voto. Senza, solo chi ne ha',
  ordina: 'Per «media» dal basso (senza, è questo), per «nome» o per «prove»',
  ritirati: 'Vero per contare anche chi non frequenta più',
  archiviate: 'Vero per guardare anche nelle classi archiviate',
  proveContate: 'le prove contate',
  dove: 'nome, classe o azienda',
  periodi: 'I semestri su cui si è contato, in ordine di tempo: le righe li richiamano per id',
  sufficienza: 'Da qui in su si è sufficienti: la scala del registro',
  guardate: 'Quante persone sono state guardate in tutto',
  conVotiUscita: 'Quante hanno almeno un voto nel periodo',
  sottoSufficienza: 'Quante stanno sotto la sufficienza',
  corsiGuardati:
    'In quanti corsi si è contato. ZERO vuol dire che i filtri non hanno ' +
    'lasciato guardare niente: non è «nessun voto»',
  allievoIdRiga: 'Da passare a «persone.scheda» per vedere prova per prova',
  attivo: 'Falso per chi si è ritirato: resta nel registro',
  corso: 'La materia, quando se n’è chiesta una sola. Vuoto altrimenti',
  corsi: 'In quanti corsi ha almeno una prova',
  prove: 'Quante prove hanno un voto suo, in tutto',
  media: 'Pesata sul peso di ogni prova, su tutti i corsi guardati insieme',
  sufficiente: 'Falso anche per chi non ha voti: non è un giudizio, è un fatto',
  periodoSemestreId: 'Quale periodo: si ritrova in «periodi», in cima alla busta',
  periodoProve: 'Quante prove sue cadono in questo periodo',
  periodoCorsi:
    'Corsi con almeno una prova QUI: la somma dei periodi non fa «corsi», ' +
    'che è l’unione',
  periodoMedia:
    'Pesata sulle sole prove di questo periodo. La media in alto NON è ' +
    'la media di queste: è la pesata su tutte le prove insieme',
  periodoSufficiente: 'Con la stessa sufficienza del registro',
  periodiRiga: 'Le stesse cifre spezzate per semestre: è qui che si vede chi è peggiorato',
  presentazione: {
    titolo: 'Le medie',
    sufficienza: 'Sufficienza',
    personeGuardate: 'Persone guardate',
    corsiGuardati: 'Corsi guardati',
    conAlmenoUnVoto: 'Con almeno un voto',
    sottoSufficienza: 'Sotto la sufficienza',
    ritirate: 'Ritirate, fuori dal filtro',
    archiviate: 'In classi archiviate, fuori',
    persona: 'Persona',
    classe: 'Classe',
    corsi: 'Corsi',
    prove: 'Prove',
    media: 'Media',
    perSemestre: 'Per semestre',
    sufficiente: 'Sufficiente',
  },
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Die Durchschnitte pro Person, mit den Leistungsschwellen',
    classeId: 'Nur die Personen dieser Klasse',
    corsoId: 'Nur die Noten dieses Kurses: Dann ist der Durchschnitt der echte des Kurses',
    allievoId: 'Eine einzelne Person, um sie mit den anderen zu vergleichen',
    mediaAlmeno:
      'Nur wer mindestens diesen Durchschnitt erreicht. Wer keine Noten hat, bleibt draussen',
    mediaAlPiu:
      'Nur wer diesen Durchschnitt nicht überschreitet: die Liste derer, die darunter liegen',
    soloSotto: 'Wahr, um nur die zu erhalten, die unter der Genügend-Grenze der Notenskala liegen',
    conVoti: 'Falsch, um auch Personen ohne Noten zu erhalten. Ohne: nur die mit Noten',
    ordina:
      'Nach «media» von unten (Standard), nach «nome» oder nach «prove»',
    ritirati: 'Wahr, um auch Personen mitzuzählen, die nicht mehr teilnehmen',
    archiviate: 'Wahr, um auch in archivierten Klassen zu suchen',
    proveContate: 'die gezählten Prüfungen',
    dove: 'Name, Klasse oder Lehrbetrieb',
    periodi:
      'Die Semester, auf die gezählt wurde, zeitlich geordnet: Die Zeilen verweisen per ID darauf',
    sufficienza: 'Ab hier ist man genügend: die Notenskala des Klassenbuchs',
    guardate: 'Wie viele Personen insgesamt angeschaut wurden',
    conVotiUscita: 'Wie viele im Zeitraum mindestens eine Note haben',
    sottoSufficienza: 'Wie viele unter der Genügend-Grenze liegen',
    corsiGuardati:
      'In wie vielen Kursen gezählt wurde. NULL heisst, dass die Filter nichts anschauen ' +
      'liessen: Das ist nicht «keine Note»',
    allievoIdRiga: 'An «persone.scheda» übergeben, um Prüfung für Prüfung zu sehen',
    attivo: 'Falsch für ausgetretene Personen: bleibt im Klassenbuch',
    corso: 'Das Fach, wenn nur eines verlangt wurde. Sonst leer',
    corsi: 'In wie vielen Kursen es mindestens eine Prüfung gibt',
    prove: 'Wie viele Prüfungen insgesamt eine eigene Note haben',
    media: 'Gewichtet nach dem Gewicht jeder Prüfung, über alle angeschauten Kurse zusammen',
    sufficiente: 'Falsch auch für Personen ohne Noten: Das ist kein Urteil, sondern eine Tatsache',
    periodoSemestreId: 'Welcher Zeitraum: Er steht in «periodi», oben in der Antwort',
    periodoProve: 'Wie viele eigene Prüfungen in diesen Zeitraum fallen',
    periodoCorsi:
      'Kurse mit mindestens einer Prüfung HIER: Die Summe der Zeiträume ergibt nicht «corsi», ' +
      'das die Vereinigung ist',
    periodoMedia:
      'Gewichtet nur über die Prüfungen dieses Zeitraums. Der Durchschnitt oben ist NICHT der ' +
      'Durchschnitt dieser Werte: Er ist über alle Prüfungen zusammen gewichtet',
    periodoSufficiente: 'Mit derselben Genügend-Grenze des Klassenbuchs',
    periodiRiga:
      'Dieselben Zahlen pro Semester aufgeteilt: Hier sieht man, wer sich verschlechtert hat',
    presentazione: {
      titolo: 'Die Durchschnitte',
      sufficienza: 'Genügend ab',
      personeGuardate: 'Angeschaute Personen',
      corsiGuardati: 'Angeschaute Kurse',
      conAlmenoUnVoto: 'Mit mindestens einer Note',
      sottoSufficienza: 'Ungenügend',
      ritirate: 'Ausgetreten, ausserhalb des Filters',
      archiviate: 'In archivierten Klassen, ausserhalb',
      persona: 'Person',
      classe: 'Klasse',
      corsi: 'Kurse',
      prove: 'Prüfungen',
      media: 'Durchschnitt',
      perSemestre: 'Pro Semester',
      sufficiente: 'Genügend',
    },
  },
  fr: {
    titolo: 'Les moyennes par personne, avec les seuils de réussite',
    classeId: 'Seulement les personnes de cette classe',
    corsoId: 'Seulement les notes de ce cours : la moyenne est alors celle du cours',
    allievoId: 'Une seule personne, pour la comparer aux autres',
    mediaAlmeno:
      'Seulement les personnes qui atteignent au moins cette moyenne. Celles sans notes restent ' +
      'de côté',
    mediaAlPiu:
      'Seulement les personnes qui ne dépassent pas cette moyenne : la liste de celles qui sont ' +
      'en dessous',
    soloSotto: 'Vrai pour n’avoir que les personnes sous le seuil de suffisance du barème',
    conVoti:
      'Faux pour avoir aussi les personnes sans aucune note. Sans : seulement celles qui en ont',
    ordina:
      'Par « media » depuis le bas (par défaut), par « nome » ou par « prove »',
    ritirati: 'Vrai pour compter aussi les personnes qui ne suivent plus les cours',
    archiviate: 'Vrai pour regarder aussi dans les classes archivées',
    proveContate: 'les épreuves comptées',
    dove: 'nom, classe ou entreprise',
    periodi:
      'Les semestres sur lesquels on a compté, dans l’ordre du temps : les lignes y renvoient ' +
      'par id',
    sufficienza: 'À partir d’ici, la note est suffisante : le barème du registre',
    guardate: 'Combien de personnes ont été regardées en tout',
    conVotiUscita: 'Combien ont au moins une note sur la période',
    sottoSufficienza: 'Combien sont sous le seuil de suffisance',
    corsiGuardati:
      'Dans combien de cours on a compté. ZÉRO veut dire que les filtres n’ont rien laissé ' +
      'regarder : ce n’est pas « aucune note »',
    allievoIdRiga: 'À passer à « persone.scheda » pour voir épreuve par épreuve',
    attivo: 'Faux pour qui a abandonné : reste dans le registre',
    corso: 'La branche, quand on n’en a demandé qu’une. Vide sinon',
    corsi: 'Dans combien de cours il y a au moins une épreuve',
    prove: 'Combien d’épreuves ont une note de cette personne, en tout',
    media: 'Pondérée par le poids de chaque épreuve, sur tous les cours regardés ensemble',
    sufficiente: 'Faux aussi pour qui n’a pas de notes : ce n’est pas un jugement, c’est un fait',
    periodoSemestreId: 'Quelle période : on la retrouve dans « periodi », en haut de la réponse',
    periodoProve: 'Combien de ses épreuves tombent dans cette période',
    periodoCorsi:
      'Cours avec au moins une épreuve ICI : la somme des périodes ne donne pas « corsi », ' +
      'qui est l’union',
    periodoMedia:
      'Pondérée sur les seules épreuves de cette période. La moyenne en haut N’EST PAS la ' +
      'moyenne de celles-ci : elle est pondérée sur toutes les épreuves ensemble',
    periodoSufficiente: 'Avec le même seuil de suffisance du registre',
    periodiRiga: 'Les mêmes chiffres découpés par semestre : c’est là qu’on voit qui s’est dégradé',
    presentazione: {
      titolo: 'Les moyennes',
      sufficienza: 'Seuil de suffisance',
      personeGuardate: 'Personnes regardées',
      corsiGuardati: 'Cours regardés',
      conAlmenoUnVoto: 'Avec au moins une note',
      sottoSufficienza: 'Sous le seuil de suffisance',
      ritirate: 'Ayant abandonné, hors filtre',
      archiviate: 'Dans des classes archivées, hors filtre',
      persona: 'Personne',
      classe: 'Classe',
      corsi: 'Cours',
      prove: 'Épreuves',
      media: 'Moyenne',
      perSemestre: 'Par semestre',
      sufficiente: 'Suffisant',
    },
  },
  en: {
    titolo: 'Averages per person, with the achievement thresholds',
    classeId: 'Only the people of this class',
    corsoId: 'Only the grades of this course: then the average is the course’s real one',
    allievoId: 'A single person, to compare them with the others',
    mediaAlmeno: 'Only those who reach at least this average. Those with no grades are left out',
    mediaAlPiu: 'Only those who do not go above this average: the list of those below',
    soloSotto: 'True to get only those below the pass mark of the register’s scale',
    conVoti: 'False to include those with no grades at all. Without it, only those with some',
    ordina: 'By “media” from the bottom (the default), by “nome” or by “prove”',
    ritirati: 'True to count those who no longer attend too',
    archiviate: 'True to look in archived classes too',
    proveContate: 'the tests counted',
    dove: 'name, class or company',
    periodi: 'The semesters counted, in time order: the rows refer to them by id',
    sufficienza: 'From here up is a pass: the register’s scale',
    guardate: 'How many people were looked at in total',
    conVotiUscita: 'How many have at least one grade in the period',
    sottoSufficienza: 'How many are below the pass mark',
    corsiGuardati:
      'In how many courses the count was made. ZERO means the filters let nothing be looked ' +
      'at: it is not “no grades”',
    allievoIdRiga: 'To pass to “persone.scheda” to see test by test',
    attivo: 'False for those who have withdrawn: stays in the register',
    corso: 'The subject, when only one was asked for. Empty otherwise',
    corsi: 'In how many courses they have at least one test',
    prove: 'How many tests have a grade of theirs, in total',
    media: 'Weighted by each test’s weight, across all the courses looked at together',
    sufficiente: 'False also for those with no grades: it is not a judgement, it is a fact',
    periodoSemestreId: 'Which period: found in “periodi”, at the top of the reply',
    periodoProve: 'How many of their tests fall in this period',
    periodoCorsi:
      'Courses with at least one test HERE: the sum over the periods does not give “corsi”, ' +
      'which is the union',
    periodoMedia:
      'Weighted over only the tests of this period. The average at the top is NOT the average ' +
      'of these: it is weighted over all the tests together',
    periodoSufficiente: 'With the register’s same pass mark',
    periodiRiga: 'The same figures split by semester: this is where you see who has got worse',
    presentazione: {
      titolo: 'Averages',
      sufficienza: 'Pass mark',
      personeGuardate: 'People looked at',
      corsiGuardati: 'Courses looked at',
      conAlmenoUnVoto: 'With at least one grade',
      sottoSufficienza: 'Below the pass mark',
      ritirate: 'Withdrawn, outside the filter',
      archiviate: 'In archived classes, left out',
      persona: 'Person',
      classe: 'Class',
      corsi: 'Courses',
      prove: 'Tests',
      media: 'Average',
      perSemestre: 'By semester',
      sufficiente: 'Pass',
    },
  },
})
