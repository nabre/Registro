// I testi delle procedure di `classi`. Si leggono al momento dell'uso
// (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  /** Quel che più procedure dicono uguale. */
  comune: {
    percorso: 'Il file .regi dell’altro anno, percorso completo. Non quello aperto',
    annoScolastico: 'Anno scolastico',
    classe: 'Classe',
    persone: 'Persone',
    materie: 'Materie',
  },
  altrove: {
    titolo: 'Le classi di un altro anno, lette da un altro documento .regi',
    anno: 'Come si chiama quell’anno: «2025/2026»',
    id: 'La classe, da passare a classi.importa',
    persone: 'Quante persone porterebbe con sé, ritirate comprese',
    materie: 'Che cosa ci si insegnava',
    presentazione: { titolo: 'Le classi di un altro anno' },
  },
  duplica: {
    titolo: 'La stessa classe in un altro anno, con i suoi corsi',
    classeId: 'La classe da copiare',
    annoId: 'L’anno in cui mettere la copia',
    nome: 'Come si chiamerà: di norma la stessa sigla',
  },
  elenco: {
    titolo: 'Le classi dell’anno: quante persone, chi ne è docente di classe, quanti corsi',
    annoId: 'Senza, l’anno in uso',
    archiviate: 'Vero per vedere anche le classi archiviate: di norma restano fuori',
    dove: 'nome, sede o materia',
    annoIdUscita: 'L’anno di cui sono le classi',
    anno: 'Come si chiama: «2026/2027»',
    escluse: 'Quante classi archiviate restano fuori: con «archiviate» a vero rientrano',
    nome: 'La sigla con cui la classe si chiama ovunque: «I MEC A»',
    allievi: 'Quante persone la frequentano adesso',
    ritirati: 'Quante ci sono ma non frequentano più',
    materie: 'Che cosa si insegna in questa classe',
    docenteDiClasse: 'Se chi tiene il registro ne è docente di classe',
    presentazione: {
      titolo: 'Le classi dell’anno',
      escluse: 'Archiviate, fuori dall’elenco',
      ritirate: 'Ritirate',
      docenteDiClasse: 'Docente di classe',
    },
  },
  elimina: {
    titolo: 'Toglie una classe con i suoi corsi, le sue ore e il suo fascicolo',
  },
  importa: {
    titolo:
      'Porta nell’anno aperto una classe di un altro anno, con le persone e se si vuole i corsi',
    classeId: 'La classe di quel documento: la dà classi.altrove',
    nome: 'Come si chiamerà qui: di norma la stessa sigla',
    anagrafica:
      'Vero per portare le persone, con identificativi nuovi, e le loro foto. Falso: classe vuota',
    corsi:
      'Vero per portare i corsi con il loro orario; le materie si abbinano per nome a quelle di ' +
      'qui',
  },
  salva: {
    titolo: 'Scrive una classe intera con il suo elenco di iscritti',
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      percorso: 'Die .regi-Datei des anderen Jahres, vollständiger Pfad. Nicht die geöffnete',
      annoScolastico: 'Schuljahr',
      classe: 'Klasse',
      persone: 'Personen',
      materie: 'Fächer',
    },
    altrove: {
      titolo: 'Die Klassen eines anderen Jahres, aus einem anderen .regi-Dokument gelesen',
      anno: 'Wie dieses Jahr heisst: «2025/2026»',
      id: 'Die Klasse, die an classi.importa übergeben wird',
      persone: 'Wie viele Personen sie mitbringen würde, ausgetretene eingeschlossen',
      materie: 'Was dort unterrichtet wurde',
      presentazione: { titolo: 'Die Klassen eines anderen Jahres' },
    },
    duplica: {
      titolo: 'Dieselbe Klasse in einem anderen Jahr, mit ihren Kursen',
      classeId: 'Die Klasse, die kopiert wird',
      annoId: 'Das Jahr, in das die Kopie kommt',
      nome: 'Wie sie heissen wird: meist dieselbe Bezeichnung',
    },
    elenco: {
      titolo:
        'Die Klassen des Jahres: wie viele Personen, wer Klassenlehrperson ist, wie viele Kurse',
      annoId: 'Ohne: das laufende Jahr',
      archiviate:
        'Wahr, um auch die archivierten Klassen zu sehen: Normalerweise bleiben sie draussen',
      dove: 'Name, Standort oder Fach',
      annoIdUscita: 'Das Jahr, zu dem die Klassen gehören',
      anno: 'Wie es heisst: «2026/2027»',
      escluse:
        'Wie viele archivierte Klassen draussen bleiben: mit «archiviate» auf wahr kommen sie ' +
        'wieder dazu',
      nome: 'Die Bezeichnung, unter der die Klasse überall heisst: «I MEC A»',
      allievi: 'Wie viele Personen sie jetzt besuchen',
      ritirati: 'Wie viele dabei sind, aber nicht mehr teilnehmen',
      materie: 'Was in dieser Klasse unterrichtet wird',
      docenteDiClasse: 'Ob die Person, die das Klassenbuch führt, ihre Klassenlehrperson ist',
      presentazione: {
        titolo: 'Die Klassen des Jahres',
        escluse: 'Archiviert, ausserhalb der Liste',
        ritirate: 'Ausgetreten',
        docenteDiClasse: 'Klassenlehrperson',
      },
    },
    elimina: {
      titolo:
        'Entfernt eine Klasse mit ihren Kursen, ihren Stunden und ihrem Klassendossier',
    },
    importa: {
      titolo:
        'Holt eine Klasse eines anderen Jahres ins geöffnete Jahr, mit den Personen und auf ' +
        'Wunsch mit den Kursen',
      classeId: 'Die Klasse aus diesem Dokument: Sie liefert classi.altrove',
      nome: 'Wie sie hier heissen wird: meist dieselbe Bezeichnung',
      anagrafica:
        'Wahr, um die Personen mit neuen Kennungen und ihre Fotos mitzunehmen. Falsch: leere ' +
        'Klasse',
      corsi:
        'Wahr, um die Kurse mit ihrem Stundenplan mitzunehmen; die Fächer werden nach Namen ' +
        'denen von hier zugeordnet',
    },
    salva: {
      titolo: 'Schreibt eine ganze Klasse mit ihrer Liste der Eingeschriebenen',
    },
  },
  fr: {
    comune: {
      percorso: 'Le fichier .regi de l’autre année, chemin complet. Pas celui qui est ouvert',
      annoScolastico: 'Année scolaire',
      classe: 'Classe',
      persone: 'Personnes',
      materie: 'Branches',
    },
    altrove: {
      titolo: 'Les classes d’une autre année, lues dans un autre document .regi',
      anno: 'Comment s’appelle cette année : « 2025/2026 »',
      id: 'La classe, à passer à classi.importa',
      persone: 'Combien de personnes elle emporterait, y compris celles qui ont abandonné',
      materie: 'Ce qu’on y enseignait',
      presentazione: { titolo: 'Les classes d’une autre année' },
    },
    duplica: {
      titolo: 'La même classe dans une autre année, avec ses cours',
      classeId: 'La classe à copier',
      annoId: 'L’année où mettre la copie',
      nome: 'Comment elle s’appellera : en général le même sigle',
    },
    elenco: {
      titolo:
        'Les classes de l’année : combien de personnes, qui en est maître de classe, combien de ' +
        'cours',
      annoId: 'Sans : l’année en cours',
      archiviate: 'Vrai pour voir aussi les classes archivées : en principe elles restent de côté',
      dove: 'nom, site ou branche',
      annoIdUscita: 'L’année à laquelle appartiennent les classes',
      anno: 'Comment elle s’appelle : « 2026/2027 »',
      escluse:
        'Combien de classes archivées restent de côté : avec « archiviate » à vrai, elles ' +
        'reviennent',
      nome: 'Le sigle sous lequel la classe s’appelle partout : « I MEC A »',
      allievi: 'Combien de personnes la suivent maintenant',
      ritirati: 'Combien y figurent mais ne suivent plus les cours',
      materie: 'Ce qu’on enseigne dans cette classe',
      docenteDiClasse: 'Si la personne qui tient le registre en est maître de classe',
      presentazione: {
        titolo: 'Les classes de l’année',
        escluse: 'Archivées, hors de la liste',
        ritirate: 'Ayant abandonné',
        docenteDiClasse: 'Maître de classe',
      },
    },
    elimina: {
      titolo: 'Supprime une classe avec ses cours, ses leçons et son dossier de classe',
    },
    importa: {
      titolo:
        'Amène dans l’année ouverte une classe d’une autre année, avec les personnes et, si on ' +
        'le souhaite, les cours',
      classeId: 'La classe de ce document : classi.altrove la fournit',
      nome: 'Comment elle s’appellera ici : en général le même sigle',
      anagrafica:
        'Vrai pour amener les personnes, avec de nouveaux identifiants, et leurs photos. Faux : ' +
        'classe vide',
      corsi:
        'Vrai pour amener les cours avec leur horaire ; les branches sont associées par leur nom ' +
        'à celles d’ici',
    },
    salva: {
      titolo: 'Écrit une classe entière avec sa liste d’inscrits',
    },
  },
  en: {
    comune: {
      percorso: 'The .regi file of the other year, full path. Not the one that is open',
      annoScolastico: 'School year',
      classe: 'Class',
      persone: 'People',
      materie: 'Subjects',
    },
    altrove: {
      titolo: 'The classes of another year, read from another .regi document',
      anno: 'What that year is called: “2025/2026”',
      id: 'The class, to pass to classi.importa',
      persone: 'How many people it would bring along, withdrawn ones included',
      materie: 'What was taught there',
      presentazione: { titolo: 'The classes of another year' },
    },
    duplica: {
      titolo: 'The same class in another year, with its courses',
      classeId: 'The class to copy',
      annoId: 'The year to put the copy in',
      nome: 'What it will be called: usually the same code',
    },
    elenco: {
      titolo: 'The classes of the year: how many people, who is class teacher, how many courses',
      annoId: 'Without it, the current year',
      archiviate: 'True to see archived classes too: normally they are left out',
      dove: 'name, site or subject',
      annoIdUscita: 'The year the classes belong to',
      anno: 'What it is called: “2026/2027”',
      escluse:
        'How many archived classes are left out: with “archiviate” set to true they come back in',
      nome: 'The code the class goes by everywhere: “I MEC A”',
      allievi: 'How many people attend it now',
      ritirati: 'How many are in it but no longer attend',
      materie: 'What is taught in this class',
      docenteDiClasse: 'Whether the person keeping the register is its class teacher',
      presentazione: {
        titolo: 'The classes of the year',
        escluse: 'Archived, left off the list',
        ritirate: 'Withdrawn',
        docenteDiClasse: 'Class teacher',
      },
    },
    elimina: {
      titolo: 'Removes a class with its courses, its lessons and its class file',
    },
    importa: {
      titolo:
        'Brings a class from another year into the open year, with its people and, if wanted, ' +
        'its courses',
      classeId: 'The class in that document: classi.altrove provides it',
      nome: 'What it will be called here: usually the same code',
      anagrafica:
        'True to bring the people, with new identifiers, and their photos. False: empty class',
      corsi:
        'True to bring the courses with their timetable; subjects are matched by name to those ' +
        'here',
    },
    salva: {
      titolo: 'Writes a whole class with its list of enrolled people',
    },
  },
})
