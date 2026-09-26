// I testi dei recuperi (`views/retakes.ts`).

import { catalogo } from '../../i18n/index.js'
import type { StatoRecupero } from '../../domain/retakes.js'

const it = {
  /** Come si legge lo stato di un recupero, nella sua pastiglia. */
  stati: {
    'da-fissare': 'da fissare',
    scaduto: 'non rifatta',
    oggi: 'oggi',
    fissato: 'fissato',
    fatto: 'recuperata',
    dispensato: 'non si recupera',
  } satisfies Record<StatoRecupero, string>,
  resaIl: 'resa il',
  giornoRiavuta: (nome: string) =>
    `Il giorno in cui ${nome} ha riavuto la prova rifatta`,
  rifaIl: (giorno: string) =>
    `Rifà la prova il ${giorno}, prossima lezione del corso`,
  decidi: 'Fissa il giorno, scrivi una nota, o dichiara che non si recupera',
  riconsegnataIl: (giorno: string) => `Riconsegnata il ${giorno}`,
  nonEraTornata: 'Non era tornata: rimettila fra quelle da riconsegnare',
  tornaARecuperarla: 'Torna a recuperarla',
  nonSiRecupera: 'Non si recupera: la casella resta vuota',
  votoDelRecuperoDi: (nome: string) => `Voto del recupero di ${nome}`,
  votoAiuto:
    'Il voto preso rifacendo la prova: va nella colonna di questa verifica',
  /** Il segnaposto del campo data: come si scrive un giorno. */
  formatoData: 'gg.mm.aaaa',
  apri: (file: string) => `Apri ${file}`,
  allegaScansione: (nome: string) =>
    `Allega la scansione del recupero di ${nome}`,
  apriMomento: 'Apri il momento di valutazione',
  provaDel: (giorno: string) => `prova del ${giorno}`,
  siRifaIl: (giorno: string) => ` · si rifà il ${giorno}`,
  nessunaData: ' · nessuna data',
  dallAppello: ' · dall’appello',
  riconsegnataIlQuieto: (giorno: string) => ` · riconsegnata il ${giorno}`,
  scansione: 'Scansione',
  daFissareInSospeso: (daFissare: number, aperti: number) =>
    `${daFissare} da fissare · ${aperti} in sospeso`,
  inSospeso: (aperti: number) => `${aperti} in sospeso`,
  tuttiSistemati: 'tutti sistemati',
  aiuto:
    'Il voto scritto qui è il voto di questa prova: finisce nella sua colonna, nella ' +
    'griglia, e fa media come quello di chi l’ha fatta il primo giorno.',
  testoDelRecupero: 'Testo della prova di recupero',
  colonnaSiRifaIl: 'Si rifà il',
  colonnaRiconsegnataIl: 'Riconsegnata il',
  recuperiDiOggi: (quanti: number) => `Recuperi di oggi · ${quanti}`,
}

export const testi = catalogo(it, {
  de: {
    stati: {
      'da-fissare': 'anzusetzen',
      scaduto: 'nicht nachgeholt',
      oggi: 'heute',
      fissato: 'angesetzt',
      fatto: 'nachgeholt',
      dispensato: 'keine Nachprüfung',
    },
    resaIl: 'zurückgegeben am',
    giornoRiavuta: (nome) =>
      `Der Tag, an dem ${nome} die nachgeholte Prüfung zurückbekommen hat`,
    rifaIl: (giorno) =>
      `Holt die Prüfung am ${giorno} nach, in der nächsten Stunde des Kurses`,
    decidi:
      'Tag ansetzen, eine Notiz schreiben oder festhalten, dass es keine Nachprüfung gibt',
    riconsegnataIl: (giorno) => `Zurückgegeben am ${giorno}`,
    nonEraTornata:
      'Wurde nicht zurückgegeben: Leg sie wieder zu denen, die noch zurückzugeben sind',
    tornaARecuperarla: 'Doch nachholen',
    nonSiRecupera: 'Keine Nachprüfung: Das Feld bleibt leer',
    votoDelRecuperoDi: (nome) => `Note der Nachprüfung von ${nome}`,
    votoAiuto:
      'Die Note der nachgeholten Prüfung: Sie kommt in die Spalte dieser Prüfung',
    formatoData: 'TT.MM.JJJJ',
    apri: (file) => `${file} öffnen`,
    allegaScansione: (nome) => `Scan der Nachprüfung von ${nome} anhängen`,
    apriMomento: 'Leistungsbeurteilung öffnen',
    provaDel: (giorno) => `Prüfung vom ${giorno}`,
    siRifaIl: (giorno) => ` · Nachprüfung am ${giorno}`,
    nessunaData: ' · kein Datum',
    dallAppello: ' · aus der Präsenzkontrolle',
    riconsegnataIlQuieto: (giorno) => ` · zurückgegeben am ${giorno}`,
    scansione: 'Scan',
    daFissareInSospeso: (daFissare, aperti) =>
      `${daFissare} anzusetzen · ${aperti} offen`,
    inSospeso: (aperti) => `${aperti} offen`,
    tuttiSistemati: 'alle erledigt',
    aiuto:
      'Die hier eingetragene Note ist die Note dieser Prüfung: Sie kommt in ihre Spalte im ' +
      'Raster und zählt für den Durchschnitt wie die Note derer, die sie am ersten Tag ' +
      'geschrieben haben.',
    testoDelRecupero: 'Aufgabenblatt der Nachprüfung',
    colonnaSiRifaIl: 'Nachprüfung am',
    colonnaRiconsegnataIl: 'Zurückgegeben am',
    recuperiDiOggi: (quanti) => `Nachprüfungen heute · ${quanti}`,
  },
  fr: {
    stati: {
      'da-fissare': 'à fixer',
      scaduto: 'pas rattrapée',
      oggi: 'aujourd’hui',
      fissato: 'fixé',
      fatto: 'rattrapée',
      dispensato: 'pas de rattrapage',
    },
    resaIl: 'rendue le',
    giornoRiavuta: (nome) =>
      `Le jour où l’épreuve refaite a été rendue à ${nome}`,
    rifaIl: (giorno) =>
      `Refait l’épreuve le ${giorno}, à la prochaine leçon de ce cours`,
    decidi:
      'Fixer le jour, écrire une note, ou déclarer qu’il n’y aura pas de rattrapage',
    riconsegnataIl: (giorno) => `Rendue le ${giorno}`,
    nonEraTornata:
      'Elle n’avait pas été rendue : remets-la parmi celles à rendre',
    tornaARecuperarla: 'La rattraper quand même',
    nonSiRecupera: 'Pas de rattrapage : la case reste vide',
    votoDelRecuperoDi: (nome) => `Note du rattrapage de ${nome}`,
    votoAiuto:
      'La note obtenue en refaisant l’épreuve : elle va dans la colonne de cette épreuve',
    formatoData: 'jj.mm.aaaa',
    apri: (file) => `Ouvrir ${file}`,
    allegaScansione: (nome) => `Joindre le scan du rattrapage de ${nome}`,
    apriMomento: 'Ouvrir l’évaluation',
    provaDel: (giorno) => `épreuve du ${giorno}`,
    siRifaIl: (giorno) => ` · rattrapage le ${giorno}`,
    nessunaData: ' · pas de date',
    dallAppello: ' · d’après l’appel',
    riconsegnataIlQuieto: (giorno) => ` · rendue le ${giorno}`,
    scansione: 'Scan',
    daFissareInSospeso: (daFissare, aperti) =>
      `${daFissare} à fixer · ${aperti} en suspens`,
    inSospeso: (aperti) => `${aperti} en suspens`,
    tuttiSistemati: 'tout est réglé',
    aiuto:
      'La note saisie ici est la note de cette épreuve : elle va dans sa colonne, dans la ' +
      'grille, et compte dans la moyenne comme celle de ceux qui l’ont faite le premier jour.',
    testoDelRecupero: 'Énoncé du rattrapage',
    colonnaSiRifaIl: 'Refaite le',
    colonnaRiconsegnataIl: 'Rendue le',
    recuperiDiOggi: (quanti) => `Rattrapages du jour · ${quanti}`,
  },
  en: {
    stati: {
      'da-fissare': 'to schedule',
      scaduto: 'not resat',
      oggi: 'today',
      fissato: 'scheduled',
      fatto: 'resat',
      dispensato: 'no resit',
    },
    resaIl: 'handed back on',
    giornoRiavuta: (nome) => `The day ${nome} got the resat test back`,
    rifaIl: (giorno) =>
      `Resits the test on ${giorno}, the course’s next lesson`,
    decidi: 'Schedule the day, write a note, or declare there will be no resit',
    riconsegnataIl: (giorno) => `Handed back on ${giorno}`,
    nonEraTornata: 'It hadn’t gone back: put it back among those to hand back',
    tornaARecuperarla: 'Resit after all',
    nonSiRecupera: 'No resit: the box stays empty',
    votoDelRecuperoDi: (nome) => `Resit grade for ${nome}`,
    votoAiuto:
      'The grade from resitting the test: it goes in this test’s column',
    formatoData: 'dd.mm.yyyy',
    apri: (file) => `Open ${file}`,
    allegaScansione: (nome) => `Attach the scan of ${nome}’s resit`,
    apriMomento: 'Open the assessment',
    provaDel: (giorno) => `test on ${giorno}`,
    siRifaIl: (giorno) => ` · resit on ${giorno}`,
    nessunaData: ' · no date',
    dallAppello: ' · from attendance',
    riconsegnataIlQuieto: (giorno) => ` · handed back on ${giorno}`,
    scansione: 'Scan',
    daFissareInSospeso: (daFissare, aperti) =>
      `${daFissare} to schedule · ${aperti} pending`,
    inSospeso: (aperti) => `${aperti} pending`,
    tuttiSistemati: 'all sorted',
    aiuto:
      'The grade entered here is this test’s grade: it goes in its column in the grid, and ' +
      'counts towards the average just like the grades of those who sat it on the first day.',
    testoDelRecupero: 'Resit paper',
    colonnaSiRifaIl: 'Resit on',
    colonnaRiconsegnataIl: 'Handed back on',
    recuperiDiOggi: (quanti) => `Today’s resits · ${quanti}`,
  },
})
