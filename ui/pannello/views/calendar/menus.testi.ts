// I testi dei menu del tasto destro del calendario (`menus.ts`).

import { catalogo } from '#core/i18n/index.js'

const it = {
  sincronizza: 'Sincronizza da ICS',
  apriLezione: 'Apri la lezione',
  /** I nomi dei tasti, come sono stampati sulla tastiera della lingua. */
  tastoInvio: 'Invio',
  tastoCanc: 'Canc',

  // Lo stato dell'ora
  riportaPianificata: 'Riporta a modificabile',
  riportataPianificata: 'Lezione di nuovo modificabile.',
  segnaSvolta: 'Concludi la lezione',
  segnataSvolta: 'Lezione conclusa.',
  nonPiuAnnullata: 'Non è più annullata',
  ripristinata: 'Lezione ripristinata.',
  annulla: 'Annulla la lezione',
  annullareTitolo: 'Annullare la lezione?',
  annullareTesto: 'Resta nel registro, senza numero e fuori dai conti.',
  annullareConPiano:
    'Resta nel registro, senza numero e fuori dai conti. Il piano assegnato viene tolto ' +
    'dalla lezione; resta fra i piani del corso.',
  nonAnnullabile: 'La lezione è già compilata: non si può annullare.',
  nonFinita: 'La lezione non è ancora finita: si conclude quando il suo orario è passato.',
  annullata: 'Lezione annullata.',

  // Il piano
  apriPiano: 'Apri il piano della lezione',

  // La supplenza
  supplenza: 'Supplenza',
  segnataSupplenza: 'Lezione segnata come supplenza.',
  nonPiuSupplenza: 'La lezione non è più una supplenza.',

  // L'orario, in modifica
  nonSiIcs:
    'Non si può: la lezione del calendario ICS non si accorcia, né si esce dal giorno.',
  nonSi:
    'Non si può: resterebbe senza unità didattiche o uscirebbe dal giorno.',
  allunga: 'Allunga di un’unità didattica',
  accorcia: 'Accorcia di un’unità didattica',
  giornoPrima: 'Al giorno prima',
  giornoDopo: 'Al giorno dopo',
  copiaSettimana: 'Copia alla settimana prossima',

  // Il vuoto di un giorno
  vaiAlGiorno: 'Vai a questo giorno',
  modificaCalendario: 'Modifica il calendario',
  alle: (ora: string) => `alle ${ora}`,
  inQuestoGiorno: 'in questo giorno',
  nuovaConModulo: 'Nuova lezione con il modulo…',
  nuovaDi: (quando: string, corso: string) =>
    `Nuova lezione ${quando} di ${corso}`,
  nuova: (quando: string) => `Nuova lezione ${quando}…`,
  esci: 'Esci dalla modifica',
}

export const testi = catalogo(it, {
  de: {
    sincronizza: 'Aus ICS synchronisieren',
    apriLezione: 'Stunde öffnen',
    tastoInvio: 'Enter',
    tastoCanc: 'Entf',

    riportaPianificata: 'Wieder bearbeitbar machen',
    riportataPianificata: 'Stunde wieder bearbeitbar.',
    segnaSvolta: 'Stunde abschliessen',
    segnataSvolta: 'Stunde abgeschlossen.',
    nonPiuAnnullata: 'Nicht mehr ausgefallen',
    ripristinata: 'Stunde wiederhergestellt.',
    annulla: 'Als ausgefallen markieren',
    annullareTitolo: 'Stunde als ausgefallen markieren?',
    annullareTesto: 'Sie bleibt im Klassenbuch, ohne Nummer und ausserhalb der Zählungen.',
    annullareConPiano:
      'Sie bleibt im Klassenbuch, ohne Nummer und ausserhalb der Zählungen. Der zugewiesene ' +
      'Unterrichtsplan wird von der Stunde entfernt; er bleibt bei den Plänen des Kurses.',
    nonAnnullabile: 'Die Stunde ist schon ausgefüllt: Sie kann nicht ausfallen.',
    nonFinita: 'Die Stunde ist noch nicht vorbei: Man schliesst sie ab, wenn ihre Zeit vorüber ist.',
    annullata: 'Stunde als ausgefallen markiert.',

    apriPiano: 'Unterrichtsplan öffnen',
    supplenza: 'Stellvertretung',
    segnataSupplenza: 'Stunde als Stellvertretung markiert.',
    nonPiuSupplenza: 'Die Stunde ist keine Stellvertretung mehr.',

    nonSiIcs:
      'Geht nicht: Die Zeit aus dem ICS-Kalender lässt sich nicht kürzen, und der Tag lässt sich ' +
      'nicht verlassen.',
    nonSi:
      'Geht nicht: Es bliebe keine Lektion übrig, oder es ginge über den Tag hinaus.',
    allunga: 'Um eine Lektion verlängern',
    accorcia: 'Um eine Lektion kürzen',
    giornoPrima: 'Auf den Vortag',
    giornoDopo: 'Auf den Folgetag',
    copiaSettimana: 'In die nächste Woche kopieren',

    vaiAlGiorno: 'Zu diesem Tag',
    modificaCalendario: 'Kalender bearbeiten',
    alle: (ora) => `um ${ora}`,
    inQuestoGiorno: 'an diesem Tag',
    nuovaConModulo: 'Neue Stunde mit dem Formular…',
    nuovaDi: (quando, corso) => `Neue Stunde ${quando} für ${corso}`,
    nuova: (quando) => `Neue Stunde ${quando}…`,
    esci: 'Bearbeiten beenden',
  },
  fr: {
    sincronizza: 'Synchroniser depuis l’ICS',
    apriLezione: 'Ouvrir la leçon',
    tastoInvio: 'Entrée',
    tastoCanc: 'Suppr',

    riportaPianificata: 'Remettre en modifiable',
    riportataPianificata: 'Leçon de nouveau modifiable.',
    segnaSvolta: 'Terminer la leçon',
    segnataSvolta: 'Leçon terminée.',
    nonPiuAnnullata: 'N’est plus annulée',
    ripristinata: 'Leçon rétablie.',
    annulla: 'Annuler la leçon',
    annullareTitolo: 'Annuler la leçon ?',
    annullareTesto: 'Elle reste dans le registre, sans numéro et hors des comptes.',
    annullareConPiano:
      'Elle reste dans le registre, sans numéro et hors des comptes. Le plan de leçon ' +
      'attribué est retiré de la leçon ; il reste parmi les plans du cours.',
    nonAnnullabile: 'La leçon est déjà remplie : elle ne peut pas être annulée.',
    nonFinita: 'La leçon n’est pas encore finie : on la termine quand son horaire est passé.',
    annullata: 'Leçon annulée.',

    apriPiano: 'Ouvrir le plan de la leçon',
    supplenza: 'Remplacement',
    segnataSupplenza: 'Leçon marquée comme remplacement.',
    nonPiuSupplenza: 'La leçon n’est plus un remplacement.',

    nonSiIcs:
      'Impossible : l’heure du calendrier ICS ne se raccourcit pas, et on ne sort pas du jour.',
    nonSi: 'Impossible : elle resterait sans périodes ou sortirait du jour.',
    allunga: 'Allonger d’une période',
    accorcia: 'Raccourcir d’une période',
    giornoPrima: 'Au jour précédent',
    giornoDopo: 'Au jour suivant',
    copiaSettimana: 'Copier à la semaine suivante',

    vaiAlGiorno: 'Aller à ce jour',
    modificaCalendario: 'Modifier le calendrier',
    alle: (ora) => `à ${ora}`,
    inQuestoGiorno: 'ce jour-là',
    nuovaConModulo: 'Nouvelle leçon avec le formulaire…',
    nuovaDi: (quando, corso) => `Nouvelle leçon ${quando} pour ${corso}`,
    nuova: (quando) => `Nouvelle leçon ${quando}…`,
    esci: 'Quitter la modification',
  },
  en: {
    sincronizza: 'Sync from ICS',
    apriLezione: 'Open the lesson',
    tastoInvio: 'Enter',
    tastoCanc: 'Del',

    riportaPianificata: 'Make editable again',
    riportataPianificata: 'Lesson editable again.',
    segnaSvolta: 'Complete the lesson',
    segnataSvolta: 'Lesson completed.',
    nonPiuAnnullata: 'No longer cancelled',
    ripristinata: 'Lesson restored.',
    annulla: 'Cancel the lesson',
    annullareTitolo: 'Cancel the lesson?',
    annullareTesto: 'It stays in the register, without a number and out of the counts.',
    annullareConPiano:
      'It stays in the register, without a number and out of the counts. The assigned ' +
      'lesson plan is removed from the lesson; it stays among the course’s plans.',
    nonAnnullabile: 'The lesson has already been filled in: it can’t be cancelled.',
    nonFinita: 'The lesson isn’t over yet: it can be completed once its time has passed.',
    annullata: 'Lesson cancelled.',

    apriPiano: 'Open the lesson plan',
    supplenza: 'Substitution',
    segnataSupplenza: 'Lesson marked as a substitution.',
    nonPiuSupplenza: 'The lesson is no longer a substitution.',

    nonSiIcs:
      'Not possible: the ICS calendar time can’t be shortened or moved off the day.',
    nonSi:
      'Not possible: it would be left with no periods or spill out of the day.',
    allunga: 'Lengthen by one period',
    accorcia: 'Shorten by one period',
    giornoPrima: 'To the day before',
    giornoDopo: 'To the day after',
    copiaSettimana: 'Copy to next week',

    vaiAlGiorno: 'Go to this day',
    modificaCalendario: 'Edit the calendar',
    alle: (ora) => `at ${ora}`,
    inQuestoGiorno: 'on this day',
    nuovaConModulo: 'New lesson using the form…',
    nuovaDi: (quando, corso) => `New ${corso} lesson ${quando}`,
    nuova: (quando) => `New lesson ${quando}…`,
    esci: 'Exit editing',
  },
})
