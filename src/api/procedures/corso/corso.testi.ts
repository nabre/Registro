// I testi di `corso.presenze`. Gli aiuti dei denominatori dicono quale quota
// si legge su quale base, con le maiuscole (PREVISTE, CON APPELLO) che un
// modello piccolo guarda: tradurli con la stessa precisione. Si leggono al
// momento dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  presenze: {
    titolo:
      'Presenze, assenze e medie di UN corso, per semestre: vuole il corsoId ' +
      '(da «corsi.elenco»). Per gli allievi di una classe intera, «persone.assenze»',
    corsoId: 'Il corso: l’id lo dà «corsi.elenco»',
    oreDelCorso: 'le ore del corso',
    ritirati: 'Vero per contare anche chi non frequenta più: di norma restano fuori',
    classe: 'Il nome della classe: «I MEC A»',
    udPreviste: 'Le unità didattiche (UD) che l’orario del corso prevede nel periodo',
    udACalendario: 'Le unità didattiche delle ore effettivamente messe a calendario',
    oreGuardate:
      'Quante ore del corso cadono nel periodo. ZERO vuol dire che non si è guardato niente',
    periodoUdPreviste:
      'Le UD che l’orario prevedeva in QUESTO periodo: il denominatore di «assenza»',
    periodoUdACalendario: 'Le UD delle ore messe a calendario in questo periodo',
    periodoOreGuardate:
      'Quante ore del corso cadono in questo periodo. ZERO vuol dire che non si è guardato niente',
    periodi: 'I semestri su cui si è contato a parte: la somma dei loro conti fa il totale',
    udConAppello: 'Denominatore di «presenza»: le unità didattiche su cui l’appello è stato fatto',
    assenza:
      'Quota di assenza sulle unità didattiche PREVISTE, da 0 a 1. ' +
      'È la cifra dei rapporti da controfirmare',
    presenza:
      'Quota di presenza sulle unità didattiche CON APPELLO, da 0 a 1. ' +
      'Dice quanto è affidabile la prima',
    frequenza: 'Il complemento di «assenza», sullo stesso denominatore',
    media: 'Media pesata dei voti; nulla se non ne ha',
    nota: 'La media portata sul passo di fine semestre',
    rigaSemestreId: 'Quale periodo: lo stesso id dell’elenco «periodi» in cima',
    rigaAssenza: 'Quota di assenza di QUESTO periodo, sulle UD previste in questo periodo',
    rigaPresenza: 'Quota di presenza di questo periodo, sulle sue UD con appello',
    rigaFrequenza: 'Il complemento di «assenza» di questo periodo',
    rigaMedia:
      'Media pesata sulle prove di QUESTO periodo. La media d’anno NON è la media di queste',
    rigaNota: 'La media del periodo portata sul passo di fine semestre',
    rigaPeriodi: 'Una voce per periodo, nello stesso ordine dell’elenco «periodi» in cima',
    senzaClasse: 'Il corso non ha più una classe.',
    presentazione: {
      titolo: 'Presenze del corso',
      classe: 'Classe',
      materia: 'Materia',
      udPreviste: 'UD previste',
      udACalendario: 'UD a calendario',
      oreNelPeriodo: 'Ore nel periodo',
      ritirate: 'Ritirate, fuori dal filtro',
      udPerse: 'UD perse',
      assenza: 'Assenza (su previste)',
      perSemestre: 'Per semestre',
      presenza: 'Presenza (su appello)',
      ritardi: 'Ritardi',
      prove: 'Prove',
      media: 'Media',
      nota: 'Nota',
      ore: 'Ore',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    presenze: {
      titolo:
        'Anwesenheiten, Abwesenheiten und Durchschnitte EINES Kurses, pro Semester: verlangt die ' +
        'corsoId (aus «corsi.elenco»). Für die Lernenden einer ganzen Klasse: «persone.assenze»',
      corsoId: 'Der Kurs: Die ID liefert «corsi.elenco»',
      oreDelCorso: 'die Stunden des Kurses',
      ritirati:
        'Wahr, um auch Personen mitzuzählen, die nicht mehr teilnehmen: Normalerweise bleiben ' +
        'sie draussen',
      classe: 'Der Name der Klasse: «I MEC A»',
      udPreviste: 'Die Lektionen, die der Stundenplan des Kurses im Zeitraum vorsieht',
      udACalendario: 'Die Lektionen der Stunden, die tatsächlich im Kalender stehen',
      oreGuardate:
        'Wie viele Stunden des Kurses in den Zeitraum fallen. NULL heisst, dass ' +
        'nichts ' +
        'angeschaut wurde',
      periodoUdPreviste:
        'Die Lektionen, die der Stundenplan in DIESEM Zeitraum vorsah: der Nenner von «assenza»',
      periodoUdACalendario: 'Die Lektionen der Stunden im Kalender in diesem Zeitraum',
      periodoOreGuardate:
        'Wie viele Stunden des Kurses in diesen Zeitraum fallen. NULL heisst, dass ' +
        'nichts angeschaut wurde',
      periodi:
        'Die Semester, die einzeln gezählt wurden: Die Summe ihrer Zählungen ergibt das Total',
      udConAppello:
        'Nenner von «presenza»: die Lektionen, in denen die Präsenzkontrolle gemacht wurde',
      assenza:
        'Abwesenheitsquote auf die VORGESEHENEN Lektionen, von 0 bis 1. ' +
        'Das ist die Zahl der Berichte, die gegenzuzeichnen sind',
      presenza:
        'Anwesenheitsquote auf die Lektionen MIT PRÄSENZKONTROLLE, von 0 bis 1. ' +
        'Sie sagt, wie verlässlich die erste ist',
      frequenza: 'Das Komplement von «assenza», auf demselben Nenner',
      media: 'Gewichteter Notendurchschnitt; null, wenn es keine Noten gibt',
      nota: 'Der Durchschnitt, gerundet auf die Stufe der Semesternote',
      rigaSemestreId: 'Welcher Zeitraum: dieselbe ID wie in der Liste «periodi» oben',
      rigaAssenza:
        'Abwesenheitsquote DIESES Zeitraums, auf die in diesem Zeitraum vorgesehenen Lektionen',
      rigaPresenza:
        'Anwesenheitsquote dieses Zeitraums, auf seine Lektionen mit Präsenzkontrolle',
      rigaFrequenza: 'Das Komplement von «assenza» dieses Zeitraums',
      rigaMedia:
        'Gewichteter Durchschnitt über die Prüfungen DIESES Zeitraums. Der Jahresdurchschnitt ' +
        'ist ' +
        'NICHT der Durchschnitt dieser Werte',
      rigaNota: 'Der Durchschnitt des Zeitraums, gerundet auf die Stufe der Semesternote',
      rigaPeriodi:
        'Ein Eintrag pro Zeitraum, in derselben Reihenfolge wie die Liste «periodi» oben',
      senzaClasse: 'Der Kurs hat keine Klasse mehr.',
      presentazione: {
        titolo: 'Anwesenheiten des Kurses',
        classe: 'Klasse',
        materia: 'Fach',
        udPreviste: 'Vorgesehene Lekt.',
        udACalendario: 'Lekt. im Kalender',
        oreNelPeriodo: 'Stunden im Zeitraum',
        ritirate: 'Ausgetreten, ausserhalb des Filters',
        udPerse: 'Verpasste Lekt.',
        assenza: 'Abwesenheit (auf vorgesehene)',
        perSemestre: 'Pro Semester',
        presenza: 'Anwesenheit (auf kontrollierte)',
        ritardi: 'Verspätungen',
        prove: 'Prüfungen',
        media: 'Durchschnitt',
        nota: 'Note',
        ore: 'Stunden',
      },
    },
  },
  fr: {
    presenze: {
      titolo:
        'Présences, absences et moyennes d’UN cours, par semestre : demande le corsoId ' +
        '(depuis « corsi.elenco »). Pour les personnes en formation d’une classe entière, « ' +
        'persone.assenze »',
      corsoId: 'Le cours : l’id est fourni par « corsi.elenco »',
      oreDelCorso: 'les leçons du cours',
      ritirati:
        'Vrai pour compter aussi les personnes qui ne suivent plus les cours : ' +
        'en principe elles restent de côté',
      classe: 'Le nom de la classe : « I MEC A »',
      udPreviste: 'Les périodes que l’horaire du cours prévoit sur l’intervalle',
      udACalendario: 'Les périodes des leçons réellement inscrites au calendrier',
      oreGuardate:
        'Combien de leçons du cours tombent dans la période. ZÉRO veut dire que rien ' +
        'n’a été regardé',
      periodoUdPreviste:
        'Les périodes que l’horaire prévoyait sur CET intervalle : le dénominateur de « assenza »',
      periodoUdACalendario: 'Les périodes des leçons inscrites au calendrier sur cet intervalle',
      periodoOreGuardate:
        'Combien de leçons du cours tombent dans cette période. ZÉRO veut dire que rien ' +
        'n’a été regardé',
      periodi:
        'Les semestres comptés séparément : la somme de leurs décomptes donne le total',
      udConAppello:
        'Dénominateur de « presenza » : les périodes pour lesquelles l’appel a été fait',
      assenza:
        'Taux d’absence sur les périodes PRÉVUES, de 0 à 1. ' +
        'C’est le chiffre des rapports à contresigner',
      presenza:
        'Taux de présence sur les périodes AVEC APPEL, de 0 à 1. ' +
        'Il dit à quel point le premier est fiable',
      frequenza: 'Le complément de « assenza », sur le même dénominateur',
      media: 'Moyenne pondérée des notes ; null s’il n’y en a pas',
      nota: 'La moyenne arrondie au pas de la note semestrielle',
      rigaSemestreId: 'Quelle période : le même id que dans la liste « periodi » en haut',
      rigaAssenza: 'Taux d’absence de CET intervalle, sur les périodes prévues dans cet intervalle',
      rigaPresenza: 'Taux de présence de cet intervalle, sur ses périodes avec appel',
      rigaFrequenza: 'Le complément de « assenza » de cette période',
      rigaMedia:
        'Moyenne pondérée sur les épreuves de CETTE période. La moyenne annuelle N’EST PAS la ' +
        'moyenne de celles-ci',
      rigaNota: 'La moyenne de la période arrondie au pas de la note semestrielle',
      rigaPeriodi: 'Une entrée par période, dans le même ordre que la liste « periodi » en haut',
      senzaClasse: 'Le cours n’a plus de classe.',
      presentazione: {
        titolo: 'Présences du cours',
        classe: 'Classe',
        materia: 'Branche',
        udPreviste: 'Pér. prévues',
        udACalendario: 'Pér. au calendrier',
        oreNelPeriodo: 'Leçons sur la période',
        ritirate: 'Ayant abandonné, hors filtre',
        udPerse: 'Pér. manquées',
        assenza: 'Absence (sur prévues)',
        perSemestre: 'Par semestre',
        presenza: 'Présence (sur appel)',
        ritardi: 'Retards',
        prove: 'Épreuves',
        media: 'Moyenne',
        nota: 'Note',
        ore: 'Leçons',
      },
    },
  },
  en: {
    presenze: {
      titolo:
        'Attendance, absences and averages of ONE course, by semester: needs the corsoId ' +
        '(from “corsi.elenco”). For the learners of a whole class, “persone.assenze”',
      corsoId: 'The course: the id comes from “corsi.elenco”',
      oreDelCorso: 'the lessons of the course',
      ritirati: 'True to count also those who no longer attend: normally they are left out',
      classe: 'The name of the class: “I MEC A”',
      udPreviste: 'The periods that the course timetable plans for the date range',
      udACalendario: 'The periods of the lessons actually put on the calendar',
      oreGuardate:
        'How many lessons of the course fall in the period. ZERO means nothing was looked ' +
        'at',
      periodoUdPreviste:
        'The periods the timetable planned in THIS date range: the denominator of “assenza”',
      periodoUdACalendario: 'The periods of the lessons on the calendar in this date range',
      periodoOreGuardate:
        'How many lessons of the course fall in this period. ZERO means nothing was ' +
        'looked at',
      periodi: 'The semesters counted separately: the sum of their counts gives the total',
      udConAppello:
        'Denominator of “presenza”: the periods for which attendance was taken',
      assenza:
        'Absence rate on the PLANNED periods, from 0 to 1. ' +
        'It is the figure on the reports to be countersigned',
      presenza:
        'Attendance rate on the periods WITH ATTENDANCE TAKEN, from 0 to 1. ' +
        'It says how reliable the first one is',
      frequenza: 'The complement of “assenza”, on the same denominator',
      media: 'Weighted average of the grades; null if there are none',
      nota: 'The average rounded to the step of the semester grade',
      rigaSemestreId: 'Which period: the same id as in the “periodi” list at the top',
      rigaAssenza: 'Absence rate for THIS date range, on the periods planned in it',
      rigaPresenza: 'Attendance rate for this date range, on its periods with attendance taken',
      rigaFrequenza: 'The complement of “assenza” for this period',
      rigaMedia:
        'Weighted average over the tests of THIS period. The year average is NOT the average ' +
        'of these',
      rigaNota: 'The average for the period rounded to the step of the semester grade',
      rigaPeriodi: 'One entry per period, in the same order as the “periodi” list at the top',
      senzaClasse: 'The course no longer has a class.',
      presentazione: {
        titolo: 'Course attendance',
        classe: 'Class',
        materia: 'Subject',
        udPreviste: 'Planned per.',
        udACalendario: 'Per. on calendar',
        oreNelPeriodo: 'Lessons in period',
        ritirate: 'Withdrawn, outside the filter',
        udPerse: 'Per. missed',
        assenza: 'Absence (of planned)',
        perSemestre: 'By semester',
        presenza: 'Attendance (of recorded)',
        ritardi: 'Late arrivals',
        prove: 'Tests',
        media: 'Average',
        nota: 'Grade',
        ore: 'Lessons',
      },
    },
  },
})
