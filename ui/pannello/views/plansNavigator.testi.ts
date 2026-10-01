// I testi del navigatore dei piani (`plansNavigator.ts`): le frecce, l'ora di
// adesso e l'elenco di tutte le ore del corso con il loro stato.

import { catalogo } from '#core/i18n/index.js'

const it = {
  etichetta: 'Lezioni del corso',
  precedente: 'Lezione precedente',
  successiva: 'Lezione successiva',
  scegli: (adesso: string) => `Scegli la lezione — adesso: ${adesso}`,
  nessunaOra: 'Nessuna lezione',
  cerca: 'Cerca per data, numero, obiettivo o tappa',
  niente: 'Niente corrisponde.',
  preparate: (pronte: number, tutte: number) => `${pronte} su ${tutte} preparate`,
  daCalibrare: (quante: number) => `${quante} da calibrare`,
  preparata: 'preparata',
  senzaPiano: 'senza piano',
  scoperti: (durata: string) => `${durata} scoperti`,
  oltre: (durata: string) => `${durata} oltre l’ora`,
  scalettaVuota: 'scaletta ancora vuota',
  fuoriSemestri: 'Fuori dai semestri',
  nonAssegnati: 'Piani non assegnati',
  corsoSparito: (argomento: string) =>
    `${argomento} · il corso non c’è più: riaprilo e scegline uno`,
}

export const testi = catalogo(it, {
  de: {
    etichetta: 'Stunden des Kurses',
    precedente: 'Vorherige Stunde',
    successiva: 'Nächste Stunde',
    scegli: (adesso) => `Stunde wählen — jetzt: ${adesso}`,
    nessunaOra: 'Keine Stunde',
    cerca: 'Nach Datum, Nummer, Ziel oder Etappe suchen',
    niente: 'Nichts passt.',
    preparate: (pronte, tutte) => `${pronte} von ${tutte} vorbereitet`,
    daCalibrare: (quante) => `${quante} anzupassen`,
    preparata: 'vorbereitet',
    senzaPiano: 'ohne Plan',
    scoperti: (durata) => `${durata} nicht abgedeckt`,
    oltre: (durata) => `${durata} über die Stunde hinaus`,
    scalettaVuota: 'Ablauf noch leer',
    fuoriSemestri: 'Ausserhalb der Semester',
    nonAssegnati: 'Nicht zugewiesene Pläne',
    corsoSparito: (argomento) =>
      `${argomento} · den Kurs gibt es nicht mehr: öffne den Plan und wähle einen`,
  },
  fr: {
    etichetta: 'Leçons du cours',
    precedente: 'Leçon précédente',
    successiva: 'Leçon suivante',
    scegli: (adesso) => `Choisir la leçon — maintenant : ${adesso}`,
    nessunaOra: 'Aucune leçon',
    cerca: 'Chercher par date, numéro, objectif ou étape',
    niente: 'Rien ne correspond.',
    preparate: (pronte, tutte) => `${pronte} sur ${tutte} préparées`,
    daCalibrare: (quante) => `${quante} à ajuster`,
    preparata: 'préparée',
    senzaPiano: 'sans plan',
    scoperti: (durata) => `${durata} non couverts`,
    oltre: (durata) => `${durata} au-delà de la leçon`,
    scalettaVuota: 'déroulement encore vide',
    fuoriSemestri: 'Hors des semestres',
    nonAssegnati: 'Plans non attribués',
    corsoSparito: (argomento) =>
      `${argomento} · le cours n’existe plus : rouvre le plan et choisis-en un`,
  },
  en: {
    etichetta: 'Lessons of the course',
    precedente: 'Previous lesson',
    successiva: 'Next lesson',
    scegli: (adesso) => `Choose the lesson — now: ${adesso}`,
    nessunaOra: 'No lesson',
    cerca: 'Search by date, number, objective or step',
    niente: 'Nothing matches.',
    preparate: (pronte, tutte) => `${pronte} of ${tutte} prepared`,
    daCalibrare: (quante) => `${quante} to adjust`,
    preparata: 'prepared',
    senzaPiano: 'no plan',
    scoperti: (durata) => `${durata} uncovered`,
    oltre: (durata) => `${durata} over the lesson`,
    scalettaVuota: 'outline still empty',
    fuoriSemestri: 'Outside the semesters',
    nonAssegnati: 'Unassigned plans',
    corsoSparito: (argomento) =>
      `${argomento} · the course no longer exists: reopen the plan and pick one`,
  },
})
