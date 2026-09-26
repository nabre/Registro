// I testi della pagina di una lezione (`lesson.ts`).

import { catalogo } from '../../i18n/index.js'
import { PIF } from '../../domain/lexicon.js'
import { plurale } from '../../domain/text.js'

const it = {
  // Le osservazioni
  osservazioniAiuto: 'com’è andata a ciascuno, e quel che va detto per esteso',
  nessunaOsservazione: 'Nessuna osservazione scritta per esteso.',
  pifNonInElenco: `${PIF.singolare} non più in elenco`,
  tuttaLaClasse: 'tutta la classe',

  // Lo svolgimento
  svolgimento: 'Svolgimento',
  siSalva: 'si salva da sé quando si esce dal campo',
  argomenti: 'Argomenti svolti',
  argomentiSegnaposto: 'che cosa si è fatto davvero in classe',
  materiali: 'Materiali',
  materialiSegnaposto: 'schede, link, capitoli del libro',
  consuntivo: 'Consuntivo',
  consuntivoSegnaposto: 'com’è andata, che cosa riprendere la prossima volta',

  // Il navigatore
  precedente: 'Ora precedente di questo corso',
  lezioneDelCorso: 'Lezione del corso',
  successiva: 'Ora successiva di questo corso',
  posizione: (quale: number, quante: number) => `${quale} di ${quante}`,
  lezioni: (quante: number) => `${quante} lezioni`,

  // Nessuna lezione
  vuotoTitolo: 'Nessuna lezione aperta',
  vuotoTesto: 'Il registro si scrive dentro un’ora: scegline una dal calendario.',
  apriUltima: 'Apri l’ultima lezione',
  vaiAlCalendario: 'Vai al calendario',

  // La testata
  classeEliminata: 'Classe eliminata',
  aula: (aula: string) => ` · aula ${aula}`,
  presenti: 'presenti',
  assenti: 'assenti',
  daFare: 'da fare',
  ritardi: 'ritardi',
  durata: 'durata',
  conPause: 'con pause',
}

export const testi = catalogo(it, {
  de: {
    osservazioniAiuto:
      'wie es für alle einzeln gelaufen ist, und was ausführlich gesagt werden muss',
    nessunaOsservazione: 'Keine ausführlich geschriebene Beobachtung.',
    pifNonInElenco: 'Lernende nicht mehr in der Liste',
    tuttaLaClasse: 'die ganze Klasse',

    svolgimento: 'Durchführung',
    siSalva: 'speichert sich selbst, wenn man das Feld verlässt',
    argomenti: 'Behandelte Themen',
    argomentiSegnaposto: 'was in der Klasse wirklich gemacht wurde',
    materiali: 'Materialien',
    materialiSegnaposto: 'Arbeitsblätter, Links, Buchkapitel',
    consuntivo: 'Rückblick',
    consuntivoSegnaposto: 'wie es gelaufen ist, was man nächstes Mal wieder aufnimmt',

    precedente: 'Vorherige Stunde dieses Kurses',
    lezioneDelCorso: 'Stunde des Kurses',
    successiva: 'Nächste Stunde dieses Kurses',
    posizione: (quale, quante) => `${quale} von ${quante}`,
    lezioni: (quante) => plurale(quante, 'Stunde', 'Stunden'),

    vuotoTitolo: 'Keine Stunde geöffnet',
    vuotoTesto: 'Das Klassenbuch schreibt man in einer Stunde: Wähle eine im Kalender.',
    apriUltima: 'Letzte Stunde öffnen',
    vaiAlCalendario: 'Zum Kalender',

    classeEliminata: 'Gelöschte Klasse',
    aula: (aula) => ` · Zimmer ${aula}`,
    presenti: 'anwesend',
    assenti: 'abwesend',
    daFare: 'offen',
    ritardi: 'Verspätungen',
    durata: 'Dauer',
    conPause: 'mit Pausen',
  },
  fr: {
    osservazioniAiuto: 'comment ça s’est passé pour chacun, et ce qui mérite d’être dit en détail',
    nessunaOsservazione: 'Aucune observation rédigée en détail.',
    pifNonInElenco: 'personne en formation qui n’est plus dans la liste',
    tuttaLaClasse: 'toute la classe',

    svolgimento: 'Mise en œuvre',
    siSalva: 's’enregistre tout seul quand on quitte le champ',
    argomenti: 'Sujets traités',
    argomentiSegnaposto: 'ce qu’on a vraiment fait en classe',
    materiali: 'Matériel',
    materialiSegnaposto: 'fiches, liens, chapitres du livre',
    consuntivo: 'Bilan',
    consuntivoSegnaposto: 'comment ça s’est passé, ce qu’il faut reprendre la prochaine fois',

    precedente: 'Leçon précédente de ce cours',
    lezioneDelCorso: 'Leçon du cours',
    successiva: 'Leçon suivante de ce cours',
    posizione: (quale, quante) => `${quale} sur ${quante}`,
    lezioni: (quante) => plurale(quante, 'leçon', 'leçons'),

    vuotoTitolo: 'Aucune leçon ouverte',
    vuotoTesto: 'Le registre s’écrit dans une leçon : choisis-en une dans le calendrier.',
    apriUltima: 'Ouvrir la dernière leçon',
    vaiAlCalendario: 'Aller au calendrier',

    classeEliminata: 'Classe supprimée',
    aula: (aula) => ` · salle ${aula}`,
    presenti: 'présents',
    assenti: 'absents',
    daFare: 'à faire',
    ritardi: 'retards',
    durata: 'durée',
    conPause: 'avec pauses',
  },
  en: {
    osservazioniAiuto: 'how it went for each learner, and what needs saying in full',
    nessunaOsservazione: 'No observations written out in full.',
    pifNonInElenco: 'learner no longer on the list',
    tuttaLaClasse: 'the whole class',

    svolgimento: 'Delivery',
    siSalva: 'saves itself when you leave the field',
    argomenti: 'Topics covered',
    argomentiSegnaposto: 'what was actually done in class',
    materiali: 'Materials',
    materialiSegnaposto: 'worksheets, links, book chapters',
    consuntivo: 'Review',
    consuntivoSegnaposto: 'how it went, what to pick up next time',

    precedente: 'Previous lesson of this course',
    lezioneDelCorso: 'Course lesson',
    successiva: 'Next lesson of this course',
    posizione: (quale, quante) => `${quale} of ${quante}`,
    lezioni: (quante) => plurale(quante, 'lesson', 'lessons'),

    vuotoTitolo: 'No lesson open',
    vuotoTesto: 'The register is written inside a lesson: pick one from the calendar.',
    apriUltima: 'Open the last lesson',
    vaiAlCalendario: 'Go to the calendar',

    classeEliminata: 'Deleted class',
    aula: (aula) => ` · room ${aula}`,
    presenti: 'present',
    assenti: 'absent',
    daFare: 'to do',
    ritardi: 'late',
    durata: 'duration',
    conPause: 'with breaks',
  },
})
