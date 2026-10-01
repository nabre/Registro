// I testi dei comandi dell’ora aperta (`lesson.ts`). La guida cita i nomi dei
// pulsanti fra virgolette: cambiandone uno va cambiato anche là, in tutte le
// lingue.

import { catalogo } from '#core/i18n/index.js'
import type { StatoLezione } from '#core/dominio/models.js'

const it = {
  /** Che cosa vuol dire mettere un'ora in uno dei suoi tre stati. */
  statiOra: {
    pianificata:
      'La lezione torna fra quelle da fare: quel che è già scritto resta',
    svolta:
      'La lezione è conclusa: esce dalle pendenze, conta nel monte ore e il suo contenuto ' +
      'è in sola lettura. Solo a lezione finita',
    annullata:
      'Solo per una lezione ancora vuota: resta nel registro, fuori dai conti',
  } satisfies Record<StatoLezione, string>,
  /** La notifica dopo il cambio di stato. */
  segnata: {
    pianificata: 'Lezione di nuovo modificabile.',
    svolta: 'Lezione conclusa.',
    annullata: 'Lezione annullata.',
  } satisfies Record<StatoLezione, string>,
  annullareTitolo: 'Annullare la lezione?',
  annullareTesto: 'Resta nel registro, senza numero e fuori dai conti.',
  annullareConPiano:
    'Resta nel registro, senza numero e fuori dai conti. Il piano assegnato viene tolto ' +
    'dalla lezione; resta fra i piani del corso.',
  annullareConferma: 'Annulla la lezione',
  nonAnnullabile: 'La lezione è già compilata: non si può annullare.',
  nonFinita: 'La lezione non è ancora finita: si conclude quando il suo orario è passato.',
}

export const testi = catalogo(it, {
  de: {
    statiOra: {
      pianificata:
        'Die Stunde kommt zurück zu den offenen: Was schon eingetragen ist, bleibt',
      svolta:
        'Die Stunde ist abgeschlossen: Sie verlässt die Pendenzen, zählt zum Stundentotal und ihr ' +
        'Inhalt ist nur noch lesbar. Erst wenn die Stunde vorbei ist',
      annullata:
        'Nur für eine noch leere Stunde: Sie bleibt im Klassenbuch, ausserhalb der Zählungen',
    },
    segnata: {
      pianificata: 'Stunde wieder bearbeitbar.',
      svolta: 'Stunde abgeschlossen.',
      annullata: 'Stunde ausgefallen.',
    },
    annullareTitolo: 'Stunde ausfallen lassen?',
    annullareTesto: 'Sie bleibt im Klassenbuch, ohne Nummer und ausserhalb der Zählungen.',
    annullareConPiano:
      'Sie bleibt im Klassenbuch, ohne Nummer und ausserhalb der Zählungen. Der zugewiesene ' +
      'Unterrichtsplan wird von der Stunde entfernt; er bleibt bei den Plänen des Kurses.',
    annullareConferma: 'Stunde ausfallen lassen',
    nonAnnullabile: 'Die Stunde ist schon ausgefüllt: Sie kann nicht ausfallen.',
    nonFinita: 'Die Stunde ist noch nicht vorbei: Man schliesst sie ab, wenn ihre Zeit vorüber ist.',
  },
  fr: {
    statiOra: {
      pianificata:
        'La leçon revient parmi celles à faire : ce qui est déjà écrit reste',
      svolta:
        'La leçon est terminée : elle sort des tâches en suspens, compte dans le total des heures ' +
        'et son contenu est en lecture seule. Seulement une fois la leçon finie',
      annullata:
        'Seulement pour une leçon encore vide : elle reste dans le registre, hors des comptes',
    },
    segnata: {
      pianificata: 'Leçon de nouveau modifiable.',
      svolta: 'Leçon terminée.',
      annullata: 'Leçon annulée.',
    },
    annullareTitolo: 'Annuler la leçon ?',
    annullareTesto: 'Elle reste dans le registre, sans numéro et hors des comptes.',
    annullareConPiano:
      'Elle reste dans le registre, sans numéro et hors des comptes. Le plan de leçon ' +
      'attribué est retiré de la leçon ; il reste parmi les plans du cours.',
    annullareConferma: 'Annuler la leçon',
    nonAnnullabile: 'La leçon est déjà remplie : elle ne peut pas être annulée.',
    nonFinita: 'La leçon n’est pas encore finie : on la termine quand son horaire est passé.',
  },
  en: {
    statiOra: {
      pianificata:
        'The lesson goes back among those to do: what is already written stays',
      svolta:
        'The lesson is completed: it leaves the pending items, counts towards the hours taught ' +
        'and its content becomes read-only. Only once the lesson is over',
      annullata:
        'Only for a lesson still empty: it stays in the register, out of the counts',
    },
    segnata: {
      pianificata: 'Lesson editable again.',
      svolta: 'Lesson completed.',
      annullata: 'Lesson cancelled.',
    },
    annullareTitolo: 'Cancel the lesson?',
    annullareTesto: 'It stays in the register, without a number and out of the counts.',
    annullareConPiano:
      'It stays in the register, without a number and out of the counts. The assigned ' +
      'lesson plan is removed from the lesson; it stays among the course’s plans.',
    annullareConferma: 'Cancel the lesson',
    nonAnnullabile: 'The lesson has already been filled in: it can’t be cancelled.',
    nonFinita: 'The lesson isn’t over yet: it can be completed once its time has passed.',
  },
})
