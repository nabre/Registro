// Le parole dei file esportati: CSV di valutazioni e presenze, riassunto di una
// lezione in markdown. Le caselle comuni ai rapporti («Media», «Data», «ass.»)
// vengono da `domain/reportData.testi.ts`, così PDF e CSV dicono lo stesso.

import { catalogo, minuscolo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'
import { PIF, corto } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'
import type { StatoPresenza } from '../domain/models.js'

const it = {
  /** Le colonne del quadro delle presenze, nell'ordine in cui escono. */
  colonnePresenze: [
    corto(PIF), 'Lezioni', 'UD previste', 'UD con appello', 'UD di presenza', 'UD di assenza',
    'UD di esonero', 'Assenze intere', 'Assenze parziali', 'Ritardi', 'Minuti di ritardo',
    'Assenze % su previste', 'Assenze % su appello',
  ],
  titoloPresenze: (classe: string, periodo: string) => `Classe ${classe} — presenze — ${periodo}`,
  lezioneDel: (giorno: string) => `# Lezione del ${giorno}`,
  classe: 'Classe',
  orario: 'Orario',
  pausa: 'pausa',
  durataEffettiva: 'Durata effettiva',
  stato: 'Stato',
  presenze: 'Presenze',
  riepilogo: (
    presenti: number,
    conAppello: number,
    assenti: number,
    parziali: number,
    ritardi: number,
    udAssenza: number,
    udTotali: number,
  ) =>
    `Presenti ${presenti}/${conAppello} · ` +
    `assenti ${assenti} · parziali ${parziali} · ` +
    `ritardi ${ritardi} · ` +
    `${udAssenza} UD di assenza su ${udTotali}`,
  appelloIncompleto: (caselle: number) => `> Appello incompleto: ${caselle} caselle non impostate.`,
  minuti: (minuti: number) => ` (${minuti} min)`,
  /** Una UD nel dettaglio di chi non c'era tutta l'ora: «UD2 08:45 assente». */
  ud: (numero: number) => `UD${numero}`,
  /** Lo stato di una UD, come lo scrive il documento. */
  statoPresenza: (stato: StatoPresenza): string => stato,
  pianoLezione: 'Piano lezione',
  obiettivi: 'Obiettivi:',
  risorse: 'Risorse:',
  argomentiSvolti: 'Argomenti svolti',
  consegneDate: 'Consegne date',
  /** A chi è data una consegna che è di chi insegna. */
  io: 'io',
  osservazioni: 'Osservazioni',
  consuntivo: 'Consuntivo',
}

export const testi = catalogo(it, {
  de: {
    colonnePresenze: [
      'LP', 'Stunden', 'Lektionen vorgesehen', 'Lektionen kontrolliert', 'Lektionen anwesend',
      'Lektionen abwesend', 'Lektionen dispensiert', 'Ganze Absenzen', 'Teilweise Absenzen', 'Verspätungen',
      'Minuten Verspätung', 'Absenzen % der vorgesehenen', 'Absenzen % der kontrollierten',
    ],
    titoloPresenze: (classe, periodo) => `Klasse ${classe} — Anwesenheit — ${periodo}`,
    lezioneDel: (giorno) => `# Stunde vom ${giorno}`,
    classe: 'Klasse',
    orario: 'Zeit',
    pausa: 'Pause',
    durataEffettiva: 'Effektive Dauer',
    stato: 'Status',
    presenze: 'Anwesenheit',
    riepilogo: (presenti, conAppello, assenti, parziali, ritardi, udAssenza, udTotali) =>
      `Anwesend ${presenti}/${conAppello} · ` +
      `abwesend ${assenti} · teilweise ${parziali} · ` +
      `verspätet ${ritardi} · ` +
      `${udAssenza} von ${udTotali} Lektionen abwesend`,
    appelloIncompleto: (caselle) =>
      `> Präsenzkontrolle unvollständig: ${plurale(caselle, 'Feld', 'Felder')} nicht erfasst.`,
    minuti: (minuti) => ` (${minuti} Min.)`,
    ud: (numero) => `L${numero}`,
    statoPresenza: (stato) => minuscolo(lessico.in('de').presenze[stato] ?? stato),
    pianoLezione: 'Unterrichtsplan',
    obiettivi: 'Lernziele:',
    risorse: 'Ressourcen:',
    argomentiSvolti: 'Behandelte Themen',
    consegneDate: 'Erteilte Aufträge',
    io: 'ich',
    osservazioni: 'Beobachtungen',
    consuntivo: 'Rückblick',
  },
  fr: {
    colonnePresenze: [
      'PeF', 'Leçons', 'Périodes prévues', 'Périodes avec appel', 'Périodes de présence',
      'Périodes d’absence', 'Périodes de dispense', 'Absences entières', 'Absences partielles', 'Retards',
      'Minutes de retard', 'Absences % des prévues', 'Absences % avec appel',
    ],
    titoloPresenze: (classe, periodo) => `Classe ${classe} — présences — ${periodo}`,
    lezioneDel: (giorno) => `# Leçon du ${giorno}`,
    classe: 'Classe',
    orario: 'Horaire',
    pausa: 'pause',
    durataEffettiva: 'Durée effective',
    stato: 'Statut',
    presenze: 'Présences',
    riepilogo: (presenti, conAppello, assenti, parziali, ritardi, udAssenza, udTotali) =>
      `Présents ${presenti}/${conAppello} · ` +
      `absents ${assenti} · partiels ${parziali} · ` +
      `retards ${ritardi} · ` +
      `${plurale(udAssenza, 'période', 'périodes')} d’absence sur ${udTotali}`,
    appelloIncompleto: (caselle) =>
      `> Appel incomplet : ${plurale(caselle, 'case non saisie', 'cases non saisies')}.`,
    minuti: (minuti) => ` (${minuti} min)`,
    ud: (numero) => `P${numero}`,
    statoPresenza: (stato) => minuscolo(lessico.in('fr').presenze[stato] ?? stato),
    pianoLezione: 'Plan de leçon',
    obiettivi: 'Objectifs :',
    risorse: 'Ressources :',
    argomentiSvolti: 'Sujets traités',
    consegneDate: 'Devoirs donnés',
    io: 'moi',
    osservazioni: 'Observations',
    consuntivo: 'Bilan',
  },
  en: {
    colonnePresenze: [
      'Learner', 'Lessons', 'Planned periods', 'Periods recorded', 'Periods present',
      'Periods absent', 'Periods excused', 'Full absences', 'Partial absences', 'Late arrivals',
      'Minutes late', 'Absence % of planned', 'Absence % of recorded',
    ],
    titoloPresenze: (classe, periodo) => `Class ${classe} — attendance — ${periodo}`,
    lezioneDel: (giorno) => `# Lesson on ${giorno}`,
    classe: 'Class',
    orario: 'Time',
    pausa: 'break',
    durataEffettiva: 'Actual duration',
    stato: 'Status',
    presenze: 'Attendance',
    riepilogo: (presenti, conAppello, assenti, parziali, ritardi, udAssenza, udTotali) =>
      `Present ${presenti}/${conAppello} · ` +
      `absent ${assenti} · partial ${parziali} · ` +
      `late ${ritardi} · ` +
      `${udAssenza} of ${udTotali} periods missed`,
    appelloIncompleto: (caselle) => `> Attendance incomplete: ${plurale(caselle, 'box', 'boxes')} not set.`,
    minuti: (minuti) => ` (${minuti} min)`,
    ud: (numero) => `P${numero}`,
    statoPresenza: (stato) => minuscolo(lessico.in('en').presenze[stato] ?? stato),
    pianoLezione: 'Lesson plan',
    obiettivi: 'Objectives:',
    risorse: 'Resources:',
    argomentiSvolti: 'Topics covered',
    consegneDate: 'Assignments set',
    io: 'me',
    osservazioni: 'Observations',
    consuntivo: 'Review',
  },
})
