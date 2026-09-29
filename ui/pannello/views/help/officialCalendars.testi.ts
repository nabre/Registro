// I testi della guida sui calendari ufficiali (`officialCalendars.ts`), con la
// forma di `TestiSezione` (testa di `types.ts`).

import { catalogo } from '../../../../core/i18n/index.js'
import type { TestiSezione } from './types.js'

const it = {
  calendariUfficiali: {
    titolo: 'Calendari ufficiali',
    sommario:
      'Che cosa porta con sé il registro dal calendario scolastico del cantone, e da quale PDF.',
    voci: [
      {
        termine: 'Dove si guardano',
        testo:
          'Impostazioni › Anno e orario › **Calendari ufficiali**: una scheda per cantone, un ' +
          'anno per riga. Si apre un anno con un clic; quello in corso è già aperto e porta la ' +
          'pastiglia **Anno in corso**. Qui non si cambia niente: né il documento né il calendario.',
      },
      {
        termine: 'Che cosa si importa',
        testo:
          'Per ogni anno l’inizio e la fine delle lezioni, poi le chiusure — vacanze, festivi, ' +
          'giorni di vacanza — con il nome e le date **Dal** e **Al**. Sono esattamente le voci ' +
          'che un anno nuovo scelto dal calendario prende, o che **Importa le voci scelte** ' +
          'propone. Le vacanze estive stanno sotto la tabella: cadono dopo l’ultimo giorno di ' +
          'scuola e non si importano.',
      },
      {
        termine: 'Il PDF di riferimento',
        testo:
          'Sotto ogni anno, il nome del PDF ufficiale da cui le date sono state lette: un clic lo ' +
          'apre nel browser. In testa alla scheda, chi pubblica il calendario e il giorno in cui ' +
          'il registro lo ha letto; una versione nuova del registro può portare date più fresche.',
      },
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    calendariUfficiali: {
      titolo: 'Offizielle Kalender',
      sommario:
        'Was das Klassenbuch aus dem Schulkalender des Kantons mitbringt, und aus welchem PDF.',
      voci: [
        {
          termine: 'Wo man sie ansieht',
          testo:
            'Einstellungen › Schuljahr und Stundenplan › **Offizielle Kalender**: eine Karte pro ' +
            'Kanton, ein Schuljahr pro Zeile. Ein Klick öffnet ein Schuljahr; das laufende ist ' +
            'schon offen und trägt das Etikett **Laufendes Schuljahr**. Hier ändert sich nichts: ' +
            'weder das Dokument noch der Kalender.',
        },
        {
          termine: 'Was übernommen wird',
          testo:
            'Für jedes Schuljahr Unterrichtsbeginn und -ende, dann die Schliessungen — Ferien, ' +
            'Feiertage, freie Tage — mit Namen und den Daten **Von** und **Bis**. Es sind genau ' +
            'die Einträge, die ein neues Schuljahr aus dem Kalender übernimmt oder die ' +
            '**Gewählte Einträge importieren** vorschlägt. Die Sommerferien stehen unter der ' +
            'Tabelle: Sie liegen nach dem letzten Schultag und werden nicht übernommen.',
        },
        {
          termine: 'Das Referenz-PDF',
          testo:
            'Unter jedem Schuljahr der Name des offiziellen PDFs, aus dem die Daten gelesen ' +
            'wurden: Ein Klick öffnet es im Browser. Oben auf der Karte, wer den Kalender ' +
            'veröffentlicht und an welchem Tag das Klassenbuch ihn gelesen hat; eine neue Version ' +
            'des Klassenbuchs kann neuere Daten mitbringen.',
        },
      ],
    },
  },
  fr: {
    calendariUfficiali: {
      titolo: 'Calendriers officiels',
      sommario:
        'Ce que le registre emporte du calendrier scolaire du canton, et de quel PDF.',
      voci: [
        {
          termine: 'Où les regarder',
          testo:
            'Paramètres › Année et horaire › **Calendriers officiels** : une fiche par canton, ' +
            'une année par ligne. Un clic ouvre une année ; celle en cours est déjà ouverte et ' +
            'porte la pastille **Année en cours**. Ici rien ne change : ni le document ni le ' +
            'calendrier.',
        },
        {
          termine: 'Ce qui est importé',
          testo:
            'Pour chaque année le début et la fin des cours, puis les fermetures — vacances, ' +
            'jours fériés, jours de congé — avec le nom et les dates **Du** et **Au**. Ce sont ' +
            'exactement les entrées qu’une nouvelle année choisie dans le calendrier reprend, ou ' +
            'que **Importer les entrées choisies** propose. Les vacances d’été sont sous le ' +
            'tableau : elles tombent après le dernier jour d’école et ne sont pas importées.',
        },
        {
          termine: 'Le PDF de référence',
          testo:
            'Sous chaque année, le nom du PDF officiel d’où les dates ont été lues : un clic ' +
            'l’ouvre dans le navigateur. En tête de la fiche, qui publie le calendrier et le jour ' +
            'où le registre l’a lu ; une nouvelle version du registre peut apporter des dates ' +
            'plus récentes.',
        },
      ],
    },
  },
  en: {
    calendariUfficiali: {
      titolo: 'Official calendars',
      sommario:
        'What the register carries from the canton’s school calendar, and from which PDF.',
      voci: [
        {
          termine: 'Where to look',
          testo:
            'Settings › Year and timetable › **Official calendars**: one card per canton, one ' +
            'year per row. A click opens a year; the current one is already open and carries ' +
            'the **Current year** badge. Nothing changes here: neither the document nor the ' +
            'calendar.',
        },
        {
          termine: 'What gets imported',
          testo:
            'For each year the start and end of lessons, then the closures — holidays, public ' +
            'holidays, days off — with the name and the **From** and **To** dates. They are ' +
            'exactly the entries a new year chosen from the calendar takes, or that **Import the ' +
            'chosen entries** offers. The summer holidays sit below the table: they fall after ' +
            'the last school day and are not imported.',
        },
        {
          termine: 'The reference PDF',
          testo:
            'Below each year, the name of the official PDF the dates were read from: a click ' +
            'opens it in the browser. At the top of the card, who publishes the calendar and the ' +
            'day the register read it; a new version of the register may bring fresher dates.',
        },
      ],
    },
  },
})
