// I testi di `persone.assenze`. Il titolo contiene le parole con cui arriva la
// domanda («allievi», «studenti», «elenco», «classe»): è l'unica riga che il
// modello legge prima di scegliere, e va tradotto con la stessa cura. Si
// leggono al momento dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  titolo:
    'Elenco degli allievi (studenti) con assenze: quante ne ha ciascuno e chi supera la soglia. ' +
    'Di una classe, o di tutte le classi dell’anno se non si passa niente',
  classeId: 'Solo le persone di questa classe',
  corsoId: 'Solo le assenze fatte in questo corso',
  allievoId: 'Una persona sola, per confrontarla con le altre',
  ilConto: 'il conto',
  soglia:
    'La percentuale oltre cui si è «oltre soglia». In cifra tonda: 20 è il venti ' +
    'per cento. Senza, quella del registro',
  conAssenze: 'Falso per avere anche chi non ne ha nessuna. Senza, solo chi ne ha',
  soloOltreSoglia: 'Vero per avere solo chi supera la soglia: è l’elenco di chi va seguito',
  ritirati: 'Vero per contare anche chi non frequenta più',
  archiviate: 'Vero per guardare anche nelle classi archiviate',
  ordina: 'Per «quota» (senza, è questo), per «ud» (unità didattiche contate) o per «nome»',
  oreContate: 'le ore contate',
  dove: 'nome, classe o azienda',
  periodi: 'I pezzi di tempo su cui si è contato a parte: uno per semestre, nell’ordine',
  stati: 'Le caselle che sono state contate',
  sogliaUsata: 'La percentuale oltre cui una riga è «oltre soglia»: 20 è il venti per cento',
  sogliaDelRegistro: 'Quella delle impostazioni, in cifra tonda: si vede se è stata scavalcata',
  conSegnalazioni: 'Quante persone ne hanno almeno una',
  oltreSoglia: 'Quante superano la soglia',
  guardate: 'Quante persone sono state guardate in tutto',
  corsiGuardati:
    'In quanti corsi si è contato. ZERO vuol dire che i filtri non hanno ' +
    'lasciato guardare niente: non è «nessuna assenza»',
  escluseSenzaAssenze:
    'Quante persone restano fuori perché non ne hanno nessuna: con «conAssenze» a falso rientrano',
  allievoIdRiga: 'Da passare a «persone.argomenti» per sapere che cosa ha perso',
  attivo: 'Falso per chi si è ritirato: resta nel registro',
  ud: 'Unità didattiche (UD) nelle caselle contate',
  ore: 'Quante ore sono state toccate: non è lo stesso numero',
  udConAppello: 'Su quante unità didattiche qualcuno ha segnato qualcosa',
  udPreviste: 'Quante ne prevedeva il calendario nel periodo',
  quota: 'Sulle unità didattiche previste, da 0 a 1. Nulla se non ce n’erano',
  quotaSuAppello: 'Sulle sole unità didattiche con l’appello fatto, da 0 a 1',
  corsi: 'In quanti corsi diversi ha caselle contate',
  periodoSemestreId: 'Quale periodo: l’id che sta in «periodi», in cima',
  periodoUdPreviste: 'Quante ne prevedeva il calendario in QUESTO periodo: non il totale diviso',
  periodoQuota: 'Sulle previste di questo periodo, da 0 a 1',
  periodoOltreSoglia: 'Se la quota di questo periodo supera la soglia, la stessa',
  periodoCorsi:
    'Corsi con caselle in questo periodo: la somma NON fa quello della riga, ' +
    'che è l’unione',
  periodiRiga: 'Il conto spezzato per periodo: è qui che si vede chi è peggiorato',
  presentazione: {
    titolo: 'Chi ha assenze',
    caselleContate: 'Caselle contate',
    soglia: 'Soglia (%)',
    personeGuardate: 'Persone guardate',
    corsiGuardati: 'Corsi guardati',
    conAlmenoUna: 'Con almeno una',
    oltreSoglia: 'Oltre soglia',
    senzaAssenze: 'Senza assenze, fuori dal filtro',
    ritirate: 'Ritirate, fuori dal filtro',
    archiviate: 'In classi archiviate, fuori',
    periodiContati: 'I periodi contati',
    persona: 'Persona',
    classe: 'Classe',
    ud: 'UD',
    ore: 'Ore',
    quota: 'Quota',
    perSemestre: 'Per semestre',
  },
}

export const testi = catalogo(it, {
  de: {
    titolo:
      'Liste der Lernenden (Schülerinnen und Schüler) mit Absenzen: wie viele jede Person hat ' +
      'und wer die Schwelle überschreitet. Einer Klasse, oder aller Klassen des Jahres, wenn ' +
      'nichts übergeben wird',
    classeId: 'Nur die Personen dieser Klasse',
    corsoId: 'Nur die Absenzen in diesem Kurs',
    allievoId: 'Eine einzelne Person, um sie mit den anderen zu vergleichen',
    ilConto: 'die Zählung',
    soglia:
      'Der Prozentsatz, ab dem man «über der Schwelle» ist. Als ganze Zahl: 20 sind zwanzig ' +
      'Prozent. Ohne: die des Klassenbuchs',
    conAssenze: 'Falsch, um auch Personen ohne Absenzen zu erhalten. Ohne: nur die mit Absenzen',
    soloOltreSoglia:
      'Wahr, um nur die zu erhalten, die die Schwelle überschreiten: die Liste derer, die man ' +
      'begleiten muss',
    ritirati: 'Wahr, um auch Personen mitzuzählen, die nicht mehr teilnehmen',
    archiviate: 'Wahr, um auch in archivierten Klassen zu suchen',
    ordina: 'Nach «quota» (Standard), nach «ud» (gezählte Lektionen) oder nach «nome»',
    oreContate: 'die gezählten Stunden',
    dove: 'Name, Klasse oder Lehrbetrieb',
    periodi: 'Die Zeitabschnitte, die einzeln gezählt wurden: einer pro Semester, der Reihe nach',
    stati: 'Die Felder, die gezählt wurden',
    sogliaUsata:
      'Der Prozentsatz, ab dem eine Zeile «über der Schwelle» ist: 20 sind zwanzig Prozent',
    sogliaDelRegistro:
      'Die aus den Einstellungen, als ganze Zahl: So sieht man, ob sie übersteuert wurde',
    conSegnalazioni: 'Wie viele Personen mindestens eine haben',
    oltreSoglia: 'Wie viele die Schwelle überschreiten',
    guardate: 'Wie viele Personen insgesamt angeschaut wurden',
    corsiGuardati:
      'In wie vielen Kursen gezählt wurde. NULL heisst, dass die Filter nichts anschauen ' +
      'liessen: Das ist nicht «keine Absenzen»',
    escluseSenzaAssenze:
      'Wie viele Personen draussen bleiben, weil sie keine haben: mit «conAssenze» auf falsch ' +
      'kommen sie wieder dazu',
    allievoIdRiga: 'An «persone.argomenti» übergeben, um zu erfahren, was verpasst wurde',
    attivo: 'Falsch für ausgetretene Personen: bleibt im Klassenbuch',
    ud: 'Lektionen in den gezählten Feldern',
    ore: 'Wie viele Stunden betroffen sind: nicht dieselbe Zahl',
    udConAppello: 'In wie vielen Lektionen jemand etwas eingetragen hat',
    udPreviste: 'Wie viele der Kalender im Zeitraum vorsah',
    quota: 'Auf die vorgesehenen Lektionen, von 0 bis 1. Null, wenn es keine gab',
    quotaSuAppello: 'Nur auf die Lektionen mit gemachter Präsenzkontrolle, von 0 bis 1',
    corsi: 'In wie vielen verschiedenen Kursen gezählte Felder vorkommen',
    periodoSemestreId: 'Welcher Zeitraum: die ID, die oben in «periodi» steht',
    periodoUdPreviste:
      'Wie viele der Kalender in DIESEM Zeitraum vorsah: nicht das geteilte Total',
    periodoQuota: 'Auf die vorgesehenen Lektionen dieses Zeitraums, von 0 bis 1',
    periodoOltreSoglia: 'Ob die Quote dieses Zeitraums die Schwelle überschreitet, dieselbe',
    periodoCorsi:
      'Kurse mit Feldern in diesem Zeitraum: Die Summe ergibt NICHT den Wert der Zeile, ' +
      'der die Vereinigung ist',
    periodiRiga: 'Die Zählung pro Zeitraum aufgeteilt: Hier sieht man, wer sich verschlechtert hat',
    presentazione: {
      titolo: 'Wer Absenzen hat',
      caselleContate: 'Gezählte Felder',
      soglia: 'Schwelle (%)',
      personeGuardate: 'Angeschaute Personen',
      corsiGuardati: 'Angeschaute Kurse',
      conAlmenoUna: 'Mit mindestens einer',
      oltreSoglia: 'Über der Schwelle',
      senzaAssenze: 'Ohne Absenzen, ausserhalb des Filters',
      ritirate: 'Ausgetreten, ausserhalb des Filters',
      archiviate: 'In archivierten Klassen, ausserhalb',
      periodiContati: 'Die gezählten Zeiträume',
      persona: 'Person',
      classe: 'Klasse',
      ud: 'Lekt.',
      ore: 'Stunden',
      quota: 'Quote',
      perSemestre: 'Pro Semester',
    },
  },
  fr: {
    titolo:
      'Liste des personnes en formation (élèves) avec des absences : combien chacune en a et ' +
      'qui dépasse le seuil. D’une classe, ou de toutes les classes de l’année si on ne ' +
      'passe rien',
    classeId: 'Seulement les personnes de cette classe',
    corsoId: 'Seulement les absences faites dans ce cours',
    allievoId: 'Une seule personne, pour la comparer aux autres',
    ilConto: 'le décompte',
    soglia:
      'Le pourcentage au-delà duquel on est « au-dessus du seuil ». En nombre entier : 20, ' +
      'c’est vingt pour cent. Sans : celui du registre',
    conAssenze:
      'Faux pour avoir aussi les personnes qui n’en ont aucune. Sans : seulement celles qui en ont',
    soloOltreSoglia:
      'Vrai pour n’avoir que les personnes qui dépassent le seuil : c’est la liste de celles ' +
      'à suivre',
    ritirati: 'Vrai pour compter aussi les personnes qui ne suivent plus les cours',
    archiviate: 'Vrai pour regarder aussi dans les classes archivées',
    ordina:
      'Par « quota » (par défaut), par « ud » (périodes comptées) ou par « nome »',
    oreContate: 'les leçons comptées',
    dove: 'nom, classe ou entreprise',
    periodi: 'Les tranches de temps comptées séparément : une par semestre, dans l’ordre',
    stati: 'Les cases qui ont été comptées',
    sogliaUsata:
      'Le pourcentage au-delà duquel une ligne est « au-dessus du seuil » : 20, c’est vingt ' +
      'pour cent',
    sogliaDelRegistro:
      'Celui des paramètres, en nombre entier : on voit s’il a été remplacé',
    conSegnalazioni: 'Combien de personnes en ont au moins une',
    oltreSoglia: 'Combien dépassent le seuil',
    guardate: 'Combien de personnes ont été regardées en tout',
    corsiGuardati:
      'Dans combien de cours on a compté. ZÉRO veut dire que les filtres n’ont rien laissé ' +
      'regarder : ce n’est pas « aucune absence »',
    escluseSenzaAssenze:
      'Combien de personnes restent de côté parce qu’elles n’en ont aucune : avec ' +
      '« conAssenze » à faux, elles reviennent',
    allievoIdRiga: 'À passer à « persone.argomenti » pour savoir ce qui a été manqué',
    attivo: 'Faux pour qui a abandonné : reste dans le registre',
    ud: 'Périodes dans les cases comptées',
    ore: 'Combien de leçons sont concernées : ce n’est pas le même nombre',
    udConAppello: 'Pour combien de périodes quelqu’un a noté quelque chose',
    udPreviste: 'Combien le calendrier en prévoyait sur l’intervalle',
    quota: 'Sur les périodes prévues, de 0 à 1. Null s’il n’y en avait pas',
    quotaSuAppello: 'Sur les seules périodes où l’appel a été fait, de 0 à 1',
    corsi: 'Dans combien de cours différents il y a des cases comptées',
    periodoSemestreId: 'Quelle période : l’id qui se trouve dans « periodi », en haut',
    periodoUdPreviste:
      'Combien le calendrier en prévoyait sur CET intervalle : pas le total divisé',
    periodoQuota: 'Sur les périodes prévues de cet intervalle, de 0 à 1',
    periodoOltreSoglia: 'Si le taux de cette période dépasse le seuil, le même',
    periodoCorsi:
      'Cours avec des cases sur cette période : la somme NE donne PAS celui de la ligne, ' +
      'qui est l’union',
    periodiRiga: 'Le décompte découpé par période : c’est là qu’on voit qui s’est dégradé',
    presentazione: {
      titolo: 'Qui a des absences',
      caselleContate: 'Cases comptées',
      soglia: 'Seuil (%)',
      personeGuardate: 'Personnes regardées',
      corsiGuardati: 'Cours regardés',
      conAlmenoUna: 'Avec au moins une',
      oltreSoglia: 'Au-dessus du seuil',
      senzaAssenze: 'Sans absences, hors filtre',
      ritirate: 'Ayant abandonné, hors filtre',
      archiviate: 'Dans des classes archivées, hors filtre',
      periodiContati: 'Les périodes comptées',
      persona: 'Personne',
      classe: 'Classe',
      ud: 'Pér.',
      ore: 'Leçons',
      quota: 'Taux',
      perSemestre: 'Par semestre',
    },
  },
  en: {
    titolo:
      'List of learners (students) with absences: how many each one has and who is over the ' +
      'threshold. For one class, or for all the classes of the year if nothing is passed',
    classeId: 'Only the people of this class',
    corsoId: 'Only the absences in this course',
    allievoId: 'A single person, to compare them with the others',
    ilConto: 'the count',
    soglia:
      'The percentage above which one is “over the threshold”. As a whole number: 20 is ' +
      'twenty per cent. Without it, the register’s own',
    conAssenze: 'False to include those with none at all. Without it, only those with some',
    soloOltreSoglia:
      'True to get only those over the threshold: the list of who needs following up',
    ritirati: 'True to count those who no longer attend too',
    archiviate: 'True to look in archived classes too',
    ordina: 'By “quota” (the default), by “ud” (periods counted) or by “nome”',
    oreContate: 'the lessons counted',
    dove: 'name, class or company',
    periodi: 'The stretches of time counted separately: one per semester, in order',
    stati: 'The boxes that were counted',
    sogliaUsata: 'The percentage above which a row is “over the threshold”: 20 is twenty per cent',
    sogliaDelRegistro:
      'The one in the settings, as a whole number: shows whether it was overridden',
    conSegnalazioni: 'How many people have at least one',
    oltreSoglia: 'How many are over the threshold',
    guardate: 'How many people were looked at in total',
    corsiGuardati:
      'In how many courses the count was made. ZERO means the filters let nothing be looked ' +
      'at: it is not “no absences”',
    escluseSenzaAssenze:
      'How many people are left out because they have none: with “conAssenze” set to false ' +
      'they come back in',
    allievoIdRiga: 'To pass to “persone.argomenti” to find out what was missed',
    attivo: 'False for those who have withdrawn: stays in the register',
    ud: 'Periods in the boxes counted',
    ore: 'How many lessons were affected: not the same number',
    udConAppello: 'On how many periods someone recorded something',
    udPreviste: 'How many the calendar planned in the date range',
    quota: 'Of the planned periods, from 0 to 1. Null if there were none',
    quotaSuAppello: 'Of only the periods with attendance taken, from 0 to 1',
    corsi: 'In how many different courses there are counted boxes',
    periodoSemestreId: 'Which period: the id found in “periodi”, at the top',
    periodoUdPreviste: 'How many the calendar planned in THIS date range: not the total divided',
    periodoQuota: 'Of the planned periods in this date range, from 0 to 1',
    periodoOltreSoglia: 'Whether this period’s rate is over the threshold, the same one',
    periodoCorsi:
      'Courses with boxes in this period: the sum does NOT give the row’s figure, ' +
      'which is the union',
    periodiRiga: 'The count split by period: this is where you see who has got worse',
    presentazione: {
      titolo: 'Who has absences',
      caselleContate: 'Boxes counted',
      soglia: 'Threshold (%)',
      personeGuardate: 'People looked at',
      corsiGuardati: 'Courses looked at',
      conAlmenoUna: 'With at least one',
      oltreSoglia: 'Over threshold',
      senzaAssenze: 'No absences, outside the filter',
      ritirate: 'Withdrawn, outside the filter',
      archiviate: 'In archived classes, left out',
      periodiContati: 'The periods counted',
      persona: 'Person',
      classe: 'Class',
      ud: 'Per.',
      ore: 'Lessons',
      quota: 'Rate',
      perSemestre: 'By semester',
    },
  },
})
