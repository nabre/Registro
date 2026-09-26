// I testi di `forms/course.ts`: la finestra del corso — una materia a una
// classe — con le sue ore fisse, e il campo «Corso» degli altri moduli.

import { catalogo } from '../../i18n/index.js'

const it = {
  // La classe e la materia
  classeSparita: 'classe sparita',
  classeFissa: 'Non si cambia: lezioni e voti sono di questa classe.',
  scegliClasse: '— scegli la classe —',
  nuovaClasse: 'Nuova classe',
  materiaSparita: 'materia sparita',
  materiaFissa: 'Non si cambia: i piani lezione seguono la materia.',
  scegliMateria: '— scegli la materia —',
  nuovaMateria: 'Nuova materia',

  // Il nome e il colore
  comeSiChiama: 'Come si chiama',
  segnapostoTitolo: 'Matematica — I MEC A',
  aiutoTitolo: 'Lasciandolo stare si scrive da solo con la materia e la classe.',
  coloreSuo: 'Un colore suo',
  aiutoColore: (colore: string) =>
    `Senza, la media fra il colore della classe e quello della materia (${colore}).`,

  // L'orario e le lezioni
  oreFisse: 'Ore fisse in settimana',
  lezioniSulCalendario: 'Lezioni sul calendario',
  aiutoLezioni:
    'Mette sul calendario le lezioni che mancano, saltando le sospensioni dell’anno. ' +
    'Quel che c’è già non viene toccato, quindi si può rilanciare a ogni cambio d’orario.',
  generaLezioni: 'Genera le lezioni',
  generaAppenaCreato: 'Genera le lezioni appena creato il corso',

  // La finestra
  titoloCorso: (titolo: string) => `Corso — ${titolo}`,
  nuovoCorso: 'Nuovo corso',
  sottotitolo: 'una materia a una classe: il perno a cui si agganciano lezioni e valutazioni',
  creaIlCorso: 'Crea il corso',

  // Gli esiti
  toltoAltrove: 'Non c’è più: è stato tolto altrove.',
  aggiornato: 'Corso aggiornato.',
  servonoClasseMateria: 'Servono una classe e una materia: il corso è la loro coppia.',
  nonCreato: 'Corso non creato.',
  creato: 'Corso creato.',
  orarioNonSalvato: 'Corso creato, ma l’orario non si è salvato: riprova dal corso.',
  creatoConOre: 'Corso creato, con le sue lezioni sul calendario.',
  creatoConOrario: (sezione: string) =>
    'Corso creato con il suo orario. Le lezioni si mettono sul calendario ' +
    `dal corso, con «${sezione}».`,
  tolto: 'Corso tolto.',

  // Il campo «Corso»
  scegliCorso: '— scegli il corso —',
  nuovoCorsoPerClasse: 'Nuovo corso: una materia a una classe',
}

export const testi = catalogo(it, {
  de: {
    classeSparita: 'Klasse verschwunden',
    classeFissa: 'Lässt sich nicht ändern: Stunden und Noten gehören zu dieser Klasse.',
    scegliClasse: '— Klasse wählen —',
    nuovaClasse: 'Neue Klasse',
    materiaSparita: 'Fach verschwunden',
    materiaFissa: 'Lässt sich nicht ändern: Die Unterrichtspläne hängen am Fach.',
    scegliMateria: '— Fach wählen —',
    nuovaMateria: 'Neues Fach',

    comeSiChiama: 'Name',
    segnapostoTitolo: 'Mathematik — INF 1A',
    aiutoTitolo:
      'Solange du ihn nicht anrührst, setzt er sich selbst aus Fach und Klasse zusammen.',
    coloreSuo: 'Eine eigene Farbe',
    aiutoColore: (colore) =>
      `Ohne: die Mischung aus der Farbe der Klasse und der des Fachs (${colore}).`,

    oreFisse: 'Feste Wochenstunden',
    lezioniSulCalendario: 'Stunden im Kalender',
    aiutoLezioni:
      'Trägt die fehlenden Stunden in den Kalender ein und überspringt die unterrichtsfreien ' +
      'Zeiten des Jahres. Was schon da ist, bleibt unberührt: Du kannst es also nach jeder ' +
      'Stundenplanänderung erneut starten.',
    generaLezioni: 'Stunden erzeugen',
    generaAppenaCreato: 'Stunden gleich beim Erstellen des Kurses erzeugen',

    titoloCorso: (titolo) => `Kurs — ${titolo}`,
    nuovoCorso: 'Neuer Kurs',
    sottotitolo:
      'ein Fach für eine Klasse: der Angelpunkt, an dem Stunden und Beurteilungen hängen',
    creaIlCorso: 'Kurs erstellen',

    toltoAltrove: 'Den gibt es nicht mehr: Er wurde anderswo entfernt.',
    aggiornato: 'Kurs aktualisiert.',
    servonoClasseMateria: 'Es braucht eine Klasse und ein Fach: Der Kurs verbindet die beiden.',
    nonCreato: 'Kurs nicht erstellt.',
    creato: 'Kurs erstellt.',
    orarioNonSalvato:
      'Kurs erstellt, aber der Stundenplan wurde nicht gespeichert: Versuche es im Kurs erneut.',
    creatoConOre: 'Kurs erstellt, mit seinen Stunden im Kalender.',
    creatoConOrario: (sezione) =>
      'Kurs mit seinem Stundenplan erstellt. Die Stunden kommen im Kurs über ' +
      `«${sezione}» in den Kalender.`,
    tolto: 'Kurs entfernt.',

    scegliCorso: '— Kurs wählen —',
    nuovoCorsoPerClasse: 'Neuer Kurs: ein Fach für eine Klasse',
  },
  fr: {
    classeSparita: 'classe disparue',
    classeFissa: 'Ne se change pas : les leçons et les notes sont celles de cette classe.',
    scegliClasse: '— choisis la classe —',
    nuovaClasse: 'Nouvelle classe',
    materiaSparita: 'branche disparue',
    materiaFissa: 'Ne se change pas : les plans de leçon suivent la branche.',
    scegliMateria: '— choisis la branche —',
    nuovaMateria: 'Nouvelle branche',

    comeSiChiama: 'Nom',
    segnapostoTitolo: 'Mathématiques — INF 1A',
    aiutoTitolo: 'Si tu n’y touches pas, il se compose tout seul avec la branche et la classe.',
    coloreSuo: 'Sa propre couleur',
    aiutoColore: (colore) =>
      `Sans, la moyenne entre la couleur de la classe et celle de la branche (${colore}).`,

    oreFisse: 'Leçons fixes de la semaine',
    lezioniSulCalendario: 'Leçons au calendrier',
    aiutoLezioni:
      'Place au calendrier les leçons qui manquent, en sautant les interruptions de l’année. ' +
      'Ce qui existe déjà n’est pas touché : tu peux donc relancer à chaque changement ' +
      'd’horaire.',
    generaLezioni: 'Générer les leçons',
    generaAppenaCreato: 'Générer les leçons dès la création du cours',

    titoloCorso: (titolo) => `Cours — ${titolo}`,
    nuovoCorso: 'Nouveau cours',
    sottotitolo:
      'une branche pour une classe : le pivot auquel se rattachent leçons et évaluations',
    creaIlCorso: 'Créer le cours',

    toltoAltrove: 'Il n’existe plus : il a été supprimé ailleurs.',
    aggiornato: 'Cours mis à jour.',
    servonoClasseMateria: 'Il faut une classe et une branche : le cours les réunit.',
    nonCreato: 'Cours non créé.',
    creato: 'Cours créé.',
    orarioNonSalvato:
      'Cours créé, mais l’horaire n’a pas été enregistré : réessaie depuis le cours.',
    creatoConOre: 'Cours créé, avec ses leçons au calendrier.',
    creatoConOrario: (sezione) =>
      'Cours créé avec son horaire. Les leçons se placent au calendrier depuis le cours, ' +
      `avec « ${sezione} ».`,
    tolto: 'Cours retiré.',

    scegliCorso: '— choisis le cours —',
    nuovoCorsoPerClasse: 'Nouveau cours : une branche pour une classe',
  },
  en: {
    classeSparita: 'class gone',
    classeFissa: 'Can’t be changed: the lessons and grades belong to this class.',
    scegliClasse: '— choose the class —',
    nuovaClasse: 'New class',
    materiaSparita: 'subject gone',
    materiaFissa: 'Can’t be changed: the lesson plans follow the subject.',
    scegliMateria: '— choose the subject —',
    nuovaMateria: 'New subject',

    comeSiChiama: 'Name',
    segnapostoTitolo: 'Maths — INF 1A',
    aiutoTitolo: 'Leave it alone and it fills itself in from the subject and the class.',
    coloreSuo: 'Its own colour',
    aiutoColore: (colore) =>
      `Without, the blend of the class colour and the subject colour (${colore}).`,

    oreFisse: 'Fixed weekly lessons',
    lezioniSulCalendario: 'Lessons on the calendar',
    aiutoLezioni:
      'Puts the missing lessons on the calendar, skipping the year’s breaks. What’s already ' +
      'there isn’t touched, so you can run it again after every timetable change.',
    generaLezioni: 'Generate lessons',
    generaAppenaCreato: 'Generate lessons as soon as the course is created',

    titoloCorso: (titolo) => `Course — ${titolo}`,
    nuovoCorso: 'New course',
    sottotitolo: 'one subject for one class: the hub that lessons and assessments hang on',
    creaIlCorso: 'Create course',

    toltoAltrove: 'It’s no longer there: it was removed elsewhere.',
    aggiornato: 'Course updated.',
    servonoClasseMateria: 'A class and a subject are needed: the course is the pair of them.',
    nonCreato: 'Course not created.',
    creato: 'Course created.',
    orarioNonSalvato: 'Course created, but the timetable wasn’t saved: try again from the course.',
    creatoConOre: 'Course created, with its lessons on the calendar.',
    creatoConOrario: (sezione) =>
      'Course created with its timetable. The lessons go on the calendar from the course, ' +
      `with “${sezione}”.`,
    tolto: 'Course removed.',

    scegliCorso: '— choose the course —',
    nuovoCorsoPerClasse: 'New course: one subject for one class',
  },
})
