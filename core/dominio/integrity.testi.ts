// I testi di `integrity.ts`: i riferimenti rimasti appesi, una frase per rottura.

import { catalogo } from '../i18n/index.js'
import { PIF, quanti } from './lexicon.js'
import { plurale } from './text.js'

const it = {
  classeSenzaAnno: (classe: string) => `La classe «${classe}» punta a un anno inesistente.`,
  corsoSenzaClasse: (corso: string) =>
    `Il corso «${corso}» punta a una classe o a una materia che non c’è più.`,
  corsiDoppi: (corso: string) => `Due corsi per la stessa materia nella stessa classe: «${corso}».`,
  pianoSenzaCorso: (piano: string) => `Il piano «${piano}»: il corso collegato non esiste più.`,
  risorseVuote: (piano: string, n: number) =>
    `Il piano «${piano}»: ${plurale(n, 'risorsa', 'risorse')} senza indirizzo né file.`,
  lezioneSenzaCorso: (data: string, corsoId: string) =>
    `Lezione del ${data} senza corso (${corsoId}).`,
  lezioneFuoriAnno: (data: string, anno: string, corso: string) =>
    `Lezione del ${data} fuori dall’anno ${anno} («${corso}»).`,
  lezionePianoSparito: (data: string) =>
    `Lezione del ${data}: il piano assegnato non esiste più.`,
  lezionePianoAltroCorso: (data: string) =>
    `Lezione del ${data}: il piano assegnato è di un altro corso.`,
  lezioneEstranei: (data: string, n: number, classe: string) =>
    `Lezione del ${data}: appello, osservazioni o matrice di ${quanti(n, PIF)} ` +
    `non iscritte a ${classe}.`,
  valutazioneSenzaCorso: (titolo: string) => `Valutazione «${titolo}» senza corso.`,
  valutazioneFuoriSemestre: (titolo: string, data: string) =>
    `Valutazione «${titolo}» del ${data}: nessun semestre la contiene.`,
  votiEstranei: (titolo: string, n: number, classe: string) =>
    `Valutazione «${titolo}»: ${plurale(n, 'voto', 'voti')} di ${PIF.plurale} ` +
    `non iscritte a ${classe}.`,
  proveEstranee: (titolo: string, n: number, classe: string) =>
    `Valutazione «${titolo}»: recuperi o prove di ${quanti(n, PIF)} non iscritte a ${classe}.`,
  valutazionePianoSparito: (titolo: string) =>
    `Valutazione «${titolo}»: il piano collegato non esiste più.`,
  valutazioneLezioneSparita: (titolo: string) =>
    `Valutazione «${titolo}»: la lezione collegata non esiste più.`,
  valutazioneLezioneAltroCorso: (titolo: string) =>
    `Valutazione «${titolo}»: la lezione collegata è di un altro corso.`,
  valutazionePianoDiverso: (titolo: string) =>
    `Valutazione «${titolo}»: cita un piano diverso da quello della sua lezione.`,
  fascicoloSenzaClasse: 'Un fascicolo punta a una classe che non esiste più.',
  fascicoloEstranei: (n: number, classe: string) =>
    `Il fascicolo di ${classe} cita ${quanti(n, PIF)} non iscritte alla classe.`,
  smistamentoEstranei: (nome: string, n: number, classe: string) =>
    classe
      ? `Lo smistamento «${nome}» cita ${quanti(n, PIF)} non iscritte a ${classe}.`
      : `Lo smistamento «${nome}» cita ${quanti(n, PIF)} non iscritte.`,
  consegnaSenzaCorso: (testo: string) =>
    `La consegna «${testo}» non appartiene più a nessun corso.`,
  consegnaLezioneSparita: (testo: string) =>
    `La consegna «${testo}»: la lezione a cui è legata non esiste più.`,
  consegnaLezioneAltroCorso: (testo: string) =>
    `La consegna «${testo}»: la lezione a cui è legata è di un altro corso.`,
  consegnaEstranei: (testo: string, n: number, classe: string) =>
    `La consegna «${testo}» cita ${quanti(n, PIF)} non iscritte a ${classe}.`,
  checkSenzaCorso: 'Un check non appartiene più a nessun corso.',
  spunteAppese: (corso: string, n: number) =>
    `Il check di «${corso}»: ${plurale(n, 'spunta cita', 'spunte citano')} ` +
    'una lezione che non esiste più.',
  spunteAltroCorso: (corso: string, n: number) =>
    `Il check di «${corso}»: ${plurale(n, 'spunta cita', 'spunte citano')} ` +
    'una lezione di un altro corso.',
  progettoSenzaCorso: (titolo: string) =>
    `Il progetto «${titolo}» non appartiene più a nessun corso.`,
  progettoLezioniSparite: (titolo: string, n: number) =>
    `Il progetto «${titolo}»: ${plurale(n, 'voce cita', 'voci citano')} ` +
    'una lezione che non esiste più.',
  progettoEstranei: (titolo: string, n: number, classe: string) =>
    `Il progetto «${titolo}» cita ${quanti(n, PIF)} non iscritte a ${classe}.`,
  tappeProgettoRotto: (piano: string, n: number) =>
    `Il piano «${piano}»: ${plurale(n, 'tappa cita', 'tappe citano')} ` +
    'un progetto sparito o di un altro corso.',
  tappeFaseSparita: (piano: string, n: number) =>
    `Il piano «${piano}»: ${plurale(n, 'tappa cita', 'tappe citano')} ` +
    'una fase che il suo progetto non ha più.',
  momentoProgettoRotto: (titolo: string) =>
    `Valutazione «${titolo}»: il progetto collegato non esiste più o è di un altro corso.`,
  spunteEstranee: (corso: string, n: number, classe: string) =>
    `Il check di «${corso}» ha spunte di ${quanti(n, PIF)} non iscritte a ${classe}.`,
}

/** In francese l'accordo sta nella parola: «1 personne … inscrite», «2 personnes … inscrites». */
const nonInscrites = (n: number) =>
  plurale(n, 'personne en formation non inscrite', 'personnes en formation non inscrites')

export const testi = catalogo(it, {
  de: {
    classeSenzaAnno: (classe) =>
      `Die Klasse «${classe}» verweist auf ein Schuljahr, das es nicht gibt.`,
    corsoSenzaClasse: (corso) =>
      `Der Kurs «${corso}» verweist auf eine Klasse oder ein Fach, die es nicht mehr gibt.`,
    corsiDoppi: (corso) => `Zwei Kurse für dasselbe Fach in derselben Klasse: «${corso}».`,
    pianoSenzaCorso: (piano) =>
      `Der Unterrichtsplan «${piano}»: Der verknüpfte Kurs existiert nicht mehr.`,
    risorseVuote: (piano, n) =>
      `Der Unterrichtsplan «${piano}»: ${plurale(n, 'Ressource', 'Ressourcen')} ` +
      'ohne Adresse und ohne Datei.',
    lezioneSenzaCorso: (data, corsoId) => `Stunde vom ${data} ohne Kurs (${corsoId}).`,
    lezioneFuoriAnno: (data, anno, corso) =>
      `Stunde vom ${data} ausserhalb des Schuljahrs ${anno} («${corso}»).`,
    lezionePianoSparito: (data) =>
      `Stunde vom ${data}: Der zugewiesene Unterrichtsplan existiert nicht mehr.`,
    lezionePianoAltroCorso: (data) =>
      `Stunde vom ${data}: Der zugewiesene Unterrichtsplan gehört zu einem ` +
      'anderen Kurs.',
    lezioneEstranei: (data, n, classe) =>
      `Stunde vom ${data}: Präsenzkontrolle, Beobachtungen oder Matrix von ` +
      `${plurale(n, 'Lernenden', 'Lernenden')}, die nicht in ${classe} eingeschrieben sind.`,
    valutazioneSenzaCorso: (titolo) => `Leistungsbeurteilung «${titolo}» ohne Kurs.`,
    valutazioneFuoriSemestre: (titolo, data) =>
      `Leistungsbeurteilung «${titolo}» vom ${data}: Sie liegt in keinem Semester.`,
    votiEstranei: (titolo, n, classe) =>
      `Leistungsbeurteilung «${titolo}»: ${plurale(n, 'Note', 'Noten')} von Lernenden, ` +
      `die nicht in ${classe} eingeschrieben sind.`,
    proveEstranee: (titolo, n, classe) =>
      `Leistungsbeurteilung «${titolo}»: Nachprüfungen oder Prüfungen von ` +
      `${plurale(n, 'Lernenden', 'Lernenden')}, die nicht in ${classe} eingeschrieben sind.`,
    valutazionePianoSparito: (titolo) =>
      `Leistungsbeurteilung «${titolo}»: Der verknüpfte Unterrichtsplan existiert nicht mehr.`,
    valutazioneLezioneSparita: (titolo) =>
      `Leistungsbeurteilung «${titolo}»: Die verknüpfte Stunde existiert nicht mehr.`,
    valutazioneLezioneAltroCorso: (titolo) =>
      `Leistungsbeurteilung «${titolo}»: Die verknüpfte Stunde gehört zu einem ` +
      'anderen Kurs.',
    valutazionePianoDiverso: (titolo) =>
      `Leistungsbeurteilung «${titolo}»: Sie verweist auf einen anderen Unterrichtsplan ` +
      'als ihre Stunde.',
    fascicoloSenzaClasse: 'Ein Klassendossier verweist auf eine Klasse, die es nicht mehr gibt.',
    fascicoloEstranei: (n, classe) =>
      `Das Klassendossier von ${classe} nennt ${plurale(n, 'Lernende', 'Lernende')}, die nicht in der Klasse eingeschrieben sind.`,
    smistamentoEstranei: (nome, n, classe) =>
      classe
        ? `Die Zuordnung «${nome}» nennt ${plurale(n, 'Lernende', 'Lernende')}, die nicht in ${classe} eingeschrieben sind.`
        : `Die Zuordnung «${nome}» nennt ${plurale(n, 'Lernende', 'Lernende')}, die nicht eingeschrieben sind.`,
    consegnaSenzaCorso: (testo) => `Der Auftrag «${testo}» gehört zu keinem Kurs mehr.`,
    consegnaLezioneSparita: (testo) =>
      `Der Auftrag «${testo}»: Die Stunde, mit der er verknüpft ist, ` +
      'existiert nicht mehr.',
    consegnaLezioneAltroCorso: (testo) =>
      `Der Auftrag «${testo}»: Die Stunde, mit der er verknüpft ist, ` +
      'gehört zu einem anderen Kurs.',
    consegnaEstranei: (testo, n, classe) =>
      `Der Auftrag «${testo}» nennt ${plurale(n, 'Lernende', 'Lernende')}, ` +
      `die nicht in ${classe} eingeschrieben sind.`,
    checkSenzaCorso: 'Ein Check gehört zu keinem Kurs mehr.',
    spunteAppese: (corso, n) =>
      `Der Check von «${corso}»: ${plurale(n, 'Häkchen verweist', 'Häkchen verweisen')} ` +
      'auf eine Stunde, die es nicht mehr gibt.',
    spunteAltroCorso: (corso, n) =>
      `Der Check von «${corso}»: ${plurale(n, 'Häkchen verweist', 'Häkchen verweisen')} ` +
      'auf eine Stunde eines anderen Kurses.',
    progettoSenzaCorso: (titolo) => `Das Projekt «${titolo}» gehört zu keinem Kurs mehr.`,
    progettoLezioniSparite: (titolo, n) =>
      `Das Projekt «${titolo}»: ${plurale(n, 'Eintrag verweist', 'Einträge verweisen')} ` +
      'auf eine Stunde, die es nicht mehr gibt.',
    progettoEstranei: (titolo, n, classe) =>
      `Das Projekt «${titolo}» nennt ${plurale(n, 'Lernende', 'Lernende')}, ` +
      `die nicht in ${classe} eingeschrieben sind.`,
    tappeProgettoRotto: (piano, n) =>
      `Der Unterrichtsplan «${piano}»: ${plurale(n, 'Etappe verweist', 'Etappen verweisen')} ` +
      'auf ein gelöschtes Projekt oder auf eines eines anderen Kurses.',
    tappeFaseSparita: (piano, n) =>
      `Der Unterrichtsplan «${piano}»: ${plurale(n, 'Etappe verweist', 'Etappen verweisen')} ` +
      'auf eine Phase, die ihr Projekt nicht mehr hat.',
    momentoProgettoRotto: (titolo) =>
      `Leistungsbeurteilung «${titolo}»: Das verknüpfte Projekt gibt es nicht mehr ` +
      'oder es gehört zu einem anderen Kurs.',
    spunteEstranee: (corso, n, classe) =>
      `Der Check von «${corso}» hat Häkchen von ${plurale(n, 'Lernenden', 'Lernenden')}, ` +
      `die nicht in ${classe} eingeschrieben sind.`,
  },
  fr: {
    classeSenzaAnno: (classe) => `La classe « ${classe} » renvoie à une année inexistante.`,
    corsoSenzaClasse: (corso) =>
      `Le cours « ${corso} » renvoie à une classe ou à une branche qui n’existe plus.`,
    corsiDoppi: (corso) => `Deux cours pour la même branche dans la même classe : « ${corso} ».`,
    pianoSenzaCorso: (piano) =>
      `Le plan de leçon « ${piano} » : le cours associé n’existe plus.`,
    risorseVuote: (piano, n) =>
      `Le plan de leçon « ${piano} » : ${plurale(n, 'ressource', 'ressources')} ` +
      'sans adresse ni fichier.',
    lezioneSenzaCorso: (data, corsoId) => `Leçon du ${data} sans cours (${corsoId}).`,
    lezioneFuoriAnno: (data, anno, corso) =>
      `Leçon du ${data} en dehors de l’année ${anno} (« ${corso} »).`,
    lezionePianoSparito: (data) =>
      `Leçon du ${data} : le plan de leçon attribué n’existe plus.`,
    lezionePianoAltroCorso: (data) =>
      `Leçon du ${data} : le plan de leçon attribué appartient à un autre cours.`,
    lezioneEstranei: (data, n, classe) =>
      `Leçon du ${data} : appel, observations ou matrice de ${nonInscrites(n)} en ${classe}.`,
    valutazioneSenzaCorso: (titolo) => `Évaluation « ${titolo} » sans cours.`,
    valutazioneFuoriSemestre: (titolo, data) =>
      `Évaluation « ${titolo} » du ${data} : aucun semestre ne la contient.`,
    votiEstranei: (titolo, n, classe) =>
      `Évaluation « ${titolo} » : ${plurale(n, 'note', 'notes')} de personnes en formation ` +
      `non inscrites en ${classe}.`,
    proveEstranee: (titolo, n, classe) =>
      `Évaluation « ${titolo} » : rattrapages ou épreuves de ${nonInscrites(n)} en ${classe}.`,
    valutazionePianoSparito: (titolo) =>
      `Évaluation « ${titolo} » : le plan de leçon associé n’existe plus.`,
    valutazioneLezioneSparita: (titolo) =>
      `Évaluation « ${titolo} » : la leçon associée n’existe plus.`,
    valutazioneLezioneAltroCorso: (titolo) =>
      `Évaluation « ${titolo} » : la leçon associée appartient à un autre cours.`,
    valutazionePianoDiverso: (titolo) =>
      `Évaluation « ${titolo} » : elle renvoie à un autre plan de leçon que celui de sa leçon.`,
    fascicoloSenzaClasse: 'Un dossier de classe renvoie à une classe qui n’existe plus.',
    fascicoloEstranei: (n, classe) =>
      `Le dossier de classe de ${classe} mentionne ${nonInscrites(n)} en ${classe}.`,
    smistamentoEstranei: (nome, n, classe) =>
      classe
        ? `Le tri « ${nome} » mentionne ${nonInscrites(n)} en ${classe}.`
        : `Le tri « ${nome} » mentionne ${nonInscrites(n)}.`,
    consegnaSenzaCorso: (testo) => `Le devoir « ${testo} » n’appartient plus à aucun cours.`,
    consegnaLezioneSparita: (testo) =>
      `Le devoir « ${testo} » : la leçon à laquelle il est lié n’existe plus.`,
    consegnaLezioneAltroCorso: (testo) =>
      `Le devoir « ${testo} » : la leçon à laquelle il est lié appartient à un autre cours.`,
    consegnaEstranei: (testo, n, classe) =>
      `Le devoir « ${testo} » mentionne ` +
      `${nonInscrites(n)} ` +
      `en ${classe}.`,
    checkSenzaCorso: 'Un check n’appartient plus à aucun cours.',
    spunteAppese: (corso, n) =>
      `Le check de « ${corso} » : ${plurale(n, 'coche renvoie', 'coches renvoient')} ` +
      'à une leçon qui n’existe plus.',
    spunteAltroCorso: (corso, n) =>
      `Le check de « ${corso} » : ${plurale(n, 'coche renvoie', 'coches renvoient')} ` +
      'à une leçon d’un autre cours.',
    progettoSenzaCorso: (titolo) => `Le projet « ${titolo} » n’appartient plus à aucun cours.`,
    progettoLezioniSparite: (titolo, n) =>
      `Le projet « ${titolo} » : ${plurale(n, 'entrée renvoie', 'entrées renvoient')} ` +
      'à une leçon qui n’existe plus.',
    progettoEstranei: (titolo, n, classe) =>
      `Le projet « ${titolo} » cite ${nonInscrites(n)} en ${classe}.`,
    tappeProgettoRotto: (piano, n) =>
      `Le plan « ${piano} » : ${plurale(n, 'étape renvoie', 'étapes renvoient')} ` +
      'à un projet disparu ou d’un autre cours.',
    tappeFaseSparita: (piano, n) =>
      `Le plan « ${piano} » : ${plurale(n, 'étape renvoie', 'étapes renvoient')} ` +
      'à une phase que son projet n’a plus.',
    momentoProgettoRotto: (titolo) =>
      `Évaluation « ${titolo} » : le projet lié n’existe plus ou appartient à un autre cours.`,
    spunteEstranee: (corso, n, classe) =>
      `Le check de « ${corso} » a des coches de ` +
      `${nonInscrites(n)} ` +
      `en ${classe}.`,
  },
  en: {
    classeSenzaAnno: (classe) => `The class “${classe}” points to a year that doesn’t exist.`,
    corsoSenzaClasse: (corso) =>
      `The course “${corso}” points to a class or subject that no longer exists.`,
    corsiDoppi: (corso) => `Two courses for the same subject in the same class: “${corso}”.`,
    pianoSenzaCorso: (piano) => `The lesson plan “${piano}”: the linked course no longer exists.`,
    risorseVuote: (piano, n) =>
      `The lesson plan “${piano}”: ${plurale(n, 'resource', 'resources')} ` +
      'with neither a link nor a file.',
    lezioneSenzaCorso: (data, corsoId) => `Lesson on ${data} with no course (${corsoId}).`,
    lezioneFuoriAnno: (data, anno, corso) =>
      `Lesson on ${data} outside the year ${anno} (“${corso}”).`,
    lezionePianoSparito: (data) =>
      `Lesson on ${data}: the assigned lesson plan no longer exists.`,
    lezionePianoAltroCorso: (data) =>
      `Lesson on ${data}: the assigned lesson plan belongs to another course.`,
    lezioneEstranei: (data, n, classe) =>
      `Lesson on ${data}: attendance, observations or matrix for ` +
      `${plurale(n, 'learner', 'learners')} not enrolled in ${classe}.`,
    valutazioneSenzaCorso: (titolo) => `Assessment “${titolo}” with no course.`,
    valutazioneFuoriSemestre: (titolo, data) =>
      `Assessment “${titolo}” on ${data}: no semester contains it.`,
    votiEstranei: (titolo, n, classe) =>
      `Assessment “${titolo}”: ${plurale(n, 'grade', 'grades')} for learners ` +
      `not enrolled in ${classe}.`,
    proveEstranee: (titolo, n, classe) =>
      `Assessment “${titolo}”: make-ups or tests for ${plurale(n, 'learner', 'learners')} ` +
      `not enrolled in ${classe}.`,
    valutazionePianoSparito: (titolo) =>
      `Assessment “${titolo}”: the linked lesson plan no longer exists.`,
    valutazioneLezioneSparita: (titolo) =>
      `Assessment “${titolo}”: the linked lesson no longer exists.`,
    valutazioneLezioneAltroCorso: (titolo) =>
      `Assessment “${titolo}”: the linked lesson belongs to another course.`,
    valutazionePianoDiverso: (titolo) =>
      `Assessment “${titolo}”: it refers to a different lesson plan from its lesson’s.`,
    fascicoloSenzaClasse: 'A class file points to a class that no longer exists.',
    fascicoloEstranei: (n, classe) =>
      `The class file for ${classe} mentions ${plurale(n, 'learner', 'learners')} not enrolled in the class.`,
    smistamentoEstranei: (nome, n, classe) =>
      classe
        ? `The sorting batch “${nome}” mentions ${plurale(n, 'learner', 'learners')} not enrolled in ${classe}.`
        : `The sorting batch “${nome}” mentions ${plurale(n, 'learner', 'learners')} not enrolled.`,
    consegnaSenzaCorso: (testo) => `The assignment “${testo}” no longer belongs to any course.`,
    consegnaLezioneSparita: (testo) =>
      `The assignment “${testo}”: the lesson it’s linked to no longer exists.`,
    consegnaLezioneAltroCorso: (testo) =>
      `The assignment “${testo}”: the lesson it’s linked to belongs to another course.`,
    consegnaEstranei: (testo, n, classe) =>
      `The assignment “${testo}” mentions ${plurale(n, 'learner', 'learners')} ` +
      `not enrolled in ${classe}.`,
    checkSenzaCorso: 'A check no longer belongs to any course.',
    spunteAppese: (corso, n) =>
      `The check for “${corso}”: ${plurale(n, 'tick refers', 'ticks refer')} ` +
      'to a lesson that no longer exists.',
    spunteAltroCorso: (corso, n) =>
      `The check for “${corso}”: ${plurale(n, 'tick refers', 'ticks refer')} ` +
      'to a lesson of another course.',
    progettoSenzaCorso: (titolo) => `The project “${titolo}” no longer belongs to any course.`,
    progettoLezioniSparite: (titolo, n) =>
      `The project “${titolo}”: ${plurale(n, 'entry refers', 'entries refer')} ` +
      'to a lesson that no longer exists.',
    progettoEstranei: (titolo, n, classe) =>
      `The project “${titolo}” names ${plurale(n, 'learner', 'learners')} not enrolled in ${classe}.`,
    tappeProgettoRotto: (piano, n) =>
      `The lesson plan “${piano}”: ${plurale(n, 'step refers', 'steps refer')} ` +
      'to a project that is gone or belongs to another course.',
    tappeFaseSparita: (piano, n) =>
      `The lesson plan “${piano}”: ${plurale(n, 'step refers', 'steps refer')} ` +
      'to a phase its project no longer has.',
    momentoProgettoRotto: (titolo) =>
      `Assessment “${titolo}”: the linked project no longer exists or belongs to another course.`,
    spunteEstranee: (corso, n, classe) =>
      `The check for “${corso}” has ticks from ${plurale(n, 'learner', 'learners')} ` +
      `not enrolled in ${classe}.`,
  },
})
