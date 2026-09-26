// I testi dei menu del tasto destro del calendario (`menus.ts`).

import { catalogo } from '../../../i18n/index.js'

const it = {
  sincronizza: 'Sincronizza da ICS',
  apriLezione: 'Apri la lezione',
  /** I nomi dei tasti, come sono stampati sulla tastiera della lingua. */
  tastoInvio: 'Invio',
  tastoCanc: 'Canc',

  // Lo stato dell'ora
  riportaPianificata: 'Riporta a pianificata',
  riportataPianificata: 'Lezione riportata a pianificata.',
  segnaSvolta: 'Segna come svolta',
  segnataSvolta: 'Lezione segnata come svolta.',
  nonPiuAnnullata: 'Non è più annullata',
  ripristinata: 'Lezione ripristinata.',
  annulla: 'Annulla la lezione',
  annullareTitolo: 'Annullare la lezione?',
  annullareTesto:
    'Resta nel registro, segnata come non svolta. I dati già inseriti non si perdono.',
  annullata: 'Lezione annullata.',

  // Il piano
  assegnaPiano: 'Assegna un piano lezione',
  apriPiano: 'Apri il piano della lezione',
  cambiaPiano: 'Cambia piano',
  togliPiano: 'Togli il piano',
  togliereTitolo: 'Togliere il piano?',
  togliereTesto: 'Le spunte già messe sulle attività se ne vanno con lui.',
  pianoTolto: 'Piano tolto dalla lezione.',

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

    riportaPianificata: 'Auf geplant zurücksetzen',
    riportataPianificata: 'Stunde wieder auf geplant gesetzt.',
    segnaSvolta: 'Als gehalten markieren',
    segnataSvolta: 'Stunde als gehalten markiert.',
    nonPiuAnnullata: 'Nicht mehr ausgefallen',
    ripristinata: 'Stunde wiederhergestellt.',
    annulla: 'Als ausgefallen markieren',
    annullareTitolo: 'Stunde als ausgefallen markieren?',
    annullareTesto:
      'Sie bleibt im Klassenbuch, als nicht gehalten markiert. Bereits erfasste Daten gehen nicht ' +
      'verloren.',
    annullata: 'Stunde als ausgefallen markiert.',

    assegnaPiano: 'Unterrichtsplan zuweisen',
    apriPiano: 'Unterrichtsplan öffnen',
    cambiaPiano: 'Plan wechseln',
    togliPiano: 'Plan entfernen',
    togliereTitolo: 'Plan entfernen?',
    togliereTesto:
      'Die Häkchen, die schon bei den Aktivitäten gesetzt sind, verschwinden mit ihm.',
    pianoTolto: 'Plan von der Stunde entfernt.',

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

    riportaPianificata: 'Remettre en prévue',
    riportataPianificata: 'Leçon remise en prévue.',
    segnaSvolta: 'Marquer comme donnée',
    segnataSvolta: 'Leçon marquée comme donnée.',
    nonPiuAnnullata: 'N’est plus annulée',
    ripristinata: 'Leçon rétablie.',
    annulla: 'Annuler la leçon',
    annullareTitolo: 'Annuler la leçon ?',
    annullareTesto:
      'Elle reste dans le registre, marquée comme non donnée. Les données déjà saisies ne sont ' +
      'pas perdues.',
    annullata: 'Leçon annulée.',

    assegnaPiano: 'Attribuer un plan de leçon',
    apriPiano: 'Ouvrir le plan de la leçon',
    cambiaPiano: 'Changer de plan',
    togliPiano: 'Retirer le plan',
    togliereTitolo: 'Retirer le plan ?',
    togliereTesto: 'Les coches déjà mises sur les activités partent avec lui.',
    pianoTolto: 'Plan retiré de la leçon.',

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

    riportaPianificata: 'Set back to planned',
    riportataPianificata: 'Lesson set back to planned.',
    segnaSvolta: 'Mark as held',
    segnataSvolta: 'Lesson marked as held.',
    nonPiuAnnullata: 'No longer cancelled',
    ripristinata: 'Lesson restored.',
    annulla: 'Cancel the lesson',
    annullareTitolo: 'Cancel the lesson?',
    annullareTesto:
      'It stays in the register, marked as not held. Data already entered isn’t lost.',
    annullata: 'Lesson cancelled.',

    assegnaPiano: 'Assign a lesson plan',
    apriPiano: 'Open the lesson plan',
    cambiaPiano: 'Change plan',
    togliPiano: 'Remove the plan',
    togliereTitolo: 'Remove the plan?',
    togliereTesto: 'The ticks already placed on the activities go with it.',
    pianoTolto: 'Plan removed from the lesson.',

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
