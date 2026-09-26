// I testi degli eventi ICS nel calendario (`ics.ts`).

import { catalogo } from '../../../i18n/index.js'
import { plurale } from '../../../domain/text.js'

const it = {
  dalCalendario: (inizio: string, fine: string) => `${inizio}–${fine} · dal calendario ICS`,
  annullato: 'annullato',
  libero: 'libero',
  senzaTitolo: '(senza titolo)',
  senzaCorso: 'nessun abbinamento a un corso',
  senzaCorsoPerche: 'Nessun abbinamento: nessuna regola né indizio dice di che corso sia',
  collegatoA: (lezione: string) => `collegato a: ${lezione}`,
  nonCollegato: 'non collegato a nessuna lezione',
  collegataA: (quanti: number) =>
    quanti === 1 ? 'Collegata a un evento ICS:' : `Collegata a ${quanti} eventi ICS:`,

  // Il menu di un evento
  scelti: (quanti: number) => `${quanti} eventi ICS scelti`,
  evento: 'Evento del calendario ICS',
  apriLezione: 'Apri la lezione',
  modificaLezione: 'Modifica la lezione…',
  /** Il nome del pulsante che accende la modifica, fra le virgolette. */
  accendiModifica: (pulsante: string) =>
    `Accendi «${pulsante}» (Ctrl+E) per cambiare la lezione.`,
  generaDai: (quanti: number) => `Genera la lezione dai ${quanti} eventi…`,
  generaDa: 'Genera la lezione dall’evento…',
  cambiaAbbinamento: 'Cambia l’abbinamento al corso…',
  abbina: 'Abbina a un corso…',
  togliScelta: 'Togli la scelta',

  // I tre modi in cui una settimana non torna
  segni: {
    evento: {
      breve: 'ICS senza lezione',
      spiegazione: 'un evento del calendario ICS senza una lezione nel registro',
    },
    lezione: {
      breve: 'lezione senza ICS',
      spiegazione: 'una lezione del registro che il calendario ICS non ha',
    },
    regola: {
      breve: 'senza regola',
      spiegazione: 'lezione ed evento ICS insieme, ma nessuna regola li abbina',
    },
  },
  eventiSenzaLezione: (quanti: number) =>
    plurale(quanti, 'evento ICS senza lezione', 'eventi ICS senza lezione'),
  lezioniSenzaEvento: (quanti: number) =>
    plurale(quanti, 'lezione senza evento ICS', 'lezioni senza evento ICS'),
  lezioniSenzaRegola: (quanti: number) =>
    quanti === 1 ? '1 lezione abbinata senza regola' : `${quanti} lezioni abbinate senza regola`,
}

export const testi = catalogo(it, {
  de: {
    dalCalendario: (inizio, fine) => `${inizio}–${fine} · aus dem ICS-Kalender`,
    annullato: 'abgesagt',
    libero: 'frei',
    senzaTitolo: '(ohne Titel)',
    senzaCorso: 'keinem Kurs zugeordnet',
    senzaCorsoPerche:
      'Keine Zuordnung: Weder eine Regel noch ein Hinweis sagt, zu welchem Kurs er gehört',
    collegatoA: (lezione) => `verknüpft mit: ${lezione}`,
    nonCollegato: 'mit keiner Stunde verknüpft',
    collegataA: (quanti) =>
      quanti === 1 ? 'Mit einem ICS-Termin verknüpft:' : `Mit ${quanti} ICS-Terminen verknüpft:`,

    scelti: (quanti) => `${quanti} ICS-Termine ausgewählt`,
    evento: 'Termin des ICS-Kalenders',
    apriLezione: 'Stunde öffnen',
    modificaLezione: 'Stunde bearbeiten…',
    accendiModifica: (pulsante) =>
      `Schalte «${pulsante}» ein (Ctrl+E), um die Zeit zu ändern.`,
    generaDai: (quanti) => `Stunde aus den ${quanti} Terminen erstellen…`,
    generaDa: 'Stunde aus dem Termin erstellen…',
    cambiaAbbinamento: 'Kurszuordnung ändern…',
    abbina: 'Einem Kurs zuordnen…',
    togliScelta: 'Auswahl aufheben',

    segni: {
      evento: {
        breve: 'ICS ohne Stunde',
        spiegazione: 'ein Termin des ICS-Kalenders ohne Stunde im Klassenbuch',
      },
      lezione: {
        breve: 'Stunde ohne ICS',
        spiegazione: 'eine Stunde im Klassenbuch, die der ICS-Kalender nicht hat',
      },
      regola: {
        breve: 'ohne Regel',
        spiegazione: 'Stunde und ICS-Termin zusammen, aber keine Regel ordnet sie zu',
      },
    },
    eventiSenzaLezione: (quanti) =>
      plurale(quanti, 'ICS-Termin ohne Stunde', 'ICS-Termine ohne Stunde'),
    lezioniSenzaEvento: (quanti) =>
      plurale(quanti, 'Stunde ohne ICS-Termin', 'Stunden ohne ICS-Termin'),
    lezioniSenzaRegola: (quanti) =>
      plurale(
        quanti,
        'Stunde ohne Regel zugeordnet',
        'Stunden ohne Regel zugeordnet',
      ),
  },
  fr: {
    dalCalendario: (inizio, fine) => `${inizio}–${fine} · du calendrier ICS`,
    annullato: 'annulé',
    libero: 'libre',
    senzaTitolo: '(sans titre)',
    senzaCorso: 'associé à aucun cours',
    senzaCorsoPerche: 'Aucune association : ni règle ni indice ne dit de quel cours il s’agit',
    collegatoA: (lezione) => `lié à : ${lezione}`,
    nonCollegato: 'lié à aucune leçon',
    collegataA: (quanti) =>
      quanti === 1 ? 'Liée à un événement ICS :' : `Liée à ${quanti} événements ICS :`,

    scelti: (quanti) => `${quanti} événements ICS choisis`,
    evento: 'Événement du calendrier ICS',
    apriLezione: 'Ouvrir la leçon',
    modificaLezione: 'Modifier la leçon…',
    accendiModifica: (pulsante) => `Active « ${pulsante} » (Ctrl+E) pour changer l’heure.`,
    generaDai: (quanti) => `Générer la leçon à partir des ${quanti} événements…`,
    generaDa: 'Générer la leçon à partir de l’événement…',
    cambiaAbbinamento: 'Changer l’association au cours…',
    abbina: 'Associer à un cours…',
    togliScelta: 'Annuler la sélection',

    segni: {
      evento: {
        breve: 'ICS sans leçon',
        spiegazione: 'un événement du calendrier ICS sans leçon dans le registre',
      },
      lezione: {
        breve: 'leçon sans ICS',
        spiegazione: 'une leçon du registre que le calendrier ICS n’a pas',
      },
      regola: {
        breve: 'sans règle',
        spiegazione: 'leçon et événement ICS ensemble, mais aucune règle ne les associe',
      },
    },
    eventiSenzaLezione: (quanti) =>
      plurale(quanti, 'événement ICS sans leçon', 'événements ICS sans leçon'),
    lezioniSenzaEvento: (quanti) =>
      plurale(quanti, 'leçon sans événement ICS', 'leçons sans événement ICS'),
    lezioniSenzaRegola: (quanti) =>
      plurale(quanti, 'leçon associée sans règle', 'leçons associées sans règle'),
  },
  en: {
    dalCalendario: (inizio, fine) => `${inizio}–${fine} · from the ICS calendar`,
    annullato: 'cancelled',
    libero: 'free',
    senzaTitolo: '(untitled)',
    senzaCorso: 'not matched to a course',
    senzaCorsoPerche: 'No match: no rule or clue says which course it belongs to',
    collegatoA: (lezione) => `linked to: ${lezione}`,
    nonCollegato: 'not linked to any lesson',
    collegataA: (quanti) =>
      quanti === 1 ? 'Linked to one ICS event:' : `Linked to ${quanti} ICS events:`,

    scelti: (quanti) => `${quanti} ICS events selected`,
    evento: 'ICS calendar event',
    apriLezione: 'Open the lesson',
    modificaLezione: 'Edit the lesson…',
    accendiModifica: (pulsante) => `Turn on “${pulsante}” (Ctrl+E) to change the time.`,
    generaDai: (quanti) => `Create the lesson from the ${quanti} events…`,
    generaDa: 'Create the lesson from the event…',
    cambiaAbbinamento: 'Change the course match…',
    abbina: 'Match to a course…',
    togliScelta: 'Clear the selection',

    segni: {
      evento: {
        breve: 'ICS without lesson',
        spiegazione: 'an ICS calendar event with no lesson in the register',
      },
      lezione: {
        breve: 'lesson without ICS',
        spiegazione: 'a lesson in the register that the ICS calendar doesn’t have',
      },
      regola: {
        breve: 'no rule',
        spiegazione: 'lesson and ICS event together, but no rule matches them',
      },
    },
    eventiSenzaLezione: (quanti) =>
      plurale(quanti, 'ICS event without a lesson', 'ICS events without a lesson'),
    lezioniSenzaEvento: (quanti) =>
      plurale(quanti, 'lesson without an ICS event', 'lessons without an ICS event'),
    lezioniSenzaRegola: (quanti) =>
      plurale(quanti, 'lesson matched without a rule', 'lessons matched without a rule'),
  },
})
