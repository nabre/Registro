// I testi di `projection.ts`: quel che lo schermo della classe scrive da sé —
// le schede, le viste del calendario, a chi tocca una consegna, i titoli.

import { catalogo, perNumero } from '../i18n/index.js'

const it = {
  /** Le schede in cima allo schermo. */
  blocchi: {
    scaletta: 'Scaletta',
    argomenti: 'Argomenti',
    consegne: 'Consegne',
    calendario: 'Calendario',
    valutazioni: 'Valutazioni',
    documenti: 'Documenti',
    appello: 'Appello',
  },
  /** Le viste del calendario proiettato. */
  viste: {
    anno: 'Anno',
    agenda: 'Agenda',
  },
  /** Una persona che la classe non ha più. */
  sconosciuto: 'sconosciuto',
  /** Una risorsa senza titolo né nome. */
  materiale: 'materiale',
  tuttaLaClasse: 'tutta la classe',
  chiInsegna: 'chi insegna',
  /** A chi tocca una consegna, detto senza nomi. */
  aPersone: (quanti: number) => (quanti === 1 ? 'a una persona' : `a ${quanti} persone`),
  /** Il voto di chi mancava alla prova. */
  assente: 'assente',
  /** Il confine di semestre in un giorno: `cifra` è «1», «2». */
  fineSemestre: (cifra: string) => `fine ${cifra}°`,
  inizioSemestre: (cifra: string) => `inizio ${cifra}°`,
  /** Il titolo dell'agenda. */
  prossimamente: 'Prossimamente',
  titoloSettimana: (numero: number, dal: string, al: string) =>
    `Settimana ${numero} · ${dal} – ${al}`,
  titoloAnno: (etichetta: string) => `Anno ${etichetta}`,
}

export const testi = catalogo(it, {
  de: {
    blocchi: {
      scaletta: 'Ablauf',
      argomenti: 'Themen',
      consegne: 'Aufträge',
      calendario: 'Kalender',
      valutazioni: 'Beurteilungen',
      documenti: 'Dokumente',
      appello: 'Präsenzkontrolle',
    },
    viste: {
      anno: 'Jahr',
      agenda: 'Agenda',
    },
    sconosciuto: 'unbekannt',
    materiale: 'Material',
    tuttaLaClasse: 'ganze Klasse',
    chiInsegna: 'Lehrperson',
    aPersone: (quanti) => (quanti === 1 ? 'für eine Person' : `für ${quanti} Personen`),
    assente: 'abwesend',
    fineSemestre: (cifra) => `Ende ${cifra}. Sem.`,
    inizioSemestre: (cifra) => `Beginn ${cifra}. Sem.`,
    prossimamente: 'Demnächst',
    titoloSettimana: (numero, dal, al) => `Woche ${numero} · ${dal} – ${al}`,
    titoloAnno: (etichetta) => `Schuljahr ${etichetta}`,
  },
  fr: {
    blocchi: {
      scaletta: 'Déroulement',
      argomenti: 'Sujets',
      consegne: 'Devoirs',
      calendario: 'Calendrier',
      valutazioni: 'Évaluations',
      documenti: 'Documents',
      appello: 'Appel',
    },
    viste: {
      anno: 'Année',
      agenda: 'Agenda',
    },
    sconosciuto: 'inconnu',
    materiale: 'matériel',
    tuttaLaClasse: 'toute la classe',
    chiInsegna: 'enseignant',
    aPersone: (quanti) => (quanti === 1 ? 'pour une personne' : `pour ${quanti} personnes`),
    assente: 'absent',
    fineSemestre: (cifra) => `fin ${cifra === '1' ? '1er' : `${cifra}e`} sem.`,
    inizioSemestre: (cifra) => `début ${cifra === '1' ? '1er' : `${cifra}e`} sem.`,
    prossimamente: 'Prochainement',
    titoloSettimana: (numero, dal, al) => `Semaine ${numero} · ${dal} – ${al}`,
    titoloAnno: (etichetta) => `Année ${etichetta}`,
  },
  en: {
    blocchi: {
      scaletta: 'Outline',
      argomenti: 'Topics',
      consegne: 'Assignments',
      calendario: 'Calendar',
      valutazioni: 'Assessments',
      documenti: 'Documents',
      appello: 'Attendance',
    },
    viste: {
      anno: 'Year',
      agenda: 'Agenda',
    },
    sconosciuto: 'unknown',
    materiale: 'material',
    tuttaLaClasse: 'whole class',
    chiInsegna: 'teacher',
    aPersone: (quanti) => `for ${quanti} ${perNumero(quanti, 'person', 'people')}`,
    assente: 'absent',
    fineSemestre: (cifra) => `end of sem. ${cifra}`,
    inizioSemestre: (cifra) => `start of sem. ${cifra}`,
    prossimamente: 'Coming up',
    titoloSettimana: (numero, dal, al) => `Week ${numero} · ${dal} – ${al}`,
    titoloAnno: (etichetta) => `Year ${etichetta}`,
  },
})
