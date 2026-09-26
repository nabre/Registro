// I testi di `calendar.ts`: i calendari del documento, e quel che si scrive
// dopo averli confrontati con il registro.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  nonCePiu: 'Quel calendario non c’è più nel documento.',
  nonSiLegge: 'Il calendario non si legge.',
  titoloDialogo: 'Un calendario con cui confrontare le lezioni',
  filtroIcs: 'Calendario ICS',
  filtroTutti: 'Tutti i file',
  origineNonValida: 'Serve un indirizzo https:// o webcal://, o il percorso di un file .ics.',
  giaNelDocumento: 'Questo calendario c’è già nel documento: per rileggerlo si preme «Aggiorna».',
  aggiunto: (nome: string) => `Calendario «${nome}» aggiunto, con la sua copia nel documento.`,
  copiaDiPrima: (motivo: string) => `${motivo} La copia di prima resta com’era.`,
  aggiornato: (nome: string) => `Calendario «${nome}» aggiornato.`,
  senzaNome: 'Un calendario ha bisogno di un nome.',
  quelloDiPrima: (motivo: string) => `${motivo} Il calendario resta quello di prima.`,
  corsoSparito: 'Una delle lezioni da creare è di un corso che non c’è più.',
  daAllineareSparita: 'Una delle lezioni da allineare non c’è più.',
  daConfermare: (data: string) =>
    `${data}: la lezione è cambiata, e l’allineamento resta da confermare nel confronto.`,
  daAnnullareSparita: 'Una delle lezioni da annullare non c’è più.',
  create: (n: number) => plurale(n, 'lezione creata', 'lezioni create'),
  allineate: (n: number) => plurale(n, 'allineata', 'allineate'),
  annullate: (n: number) => plurale(n, 'segnata annullata', 'segnate annullate'),
  dalCalendario: (detto: readonly string[]) => `Dal calendario: ${detto.join(', ')}.`,
  nienteDaCambiare: 'Nessuna lezione da cambiare.',
  regoleSalvate: 'Calendario e regole salvati: nessuna lezione da cambiare.',
}

export const testi = catalogo(it, {
  de: {
    nonCePiu: 'Dieser Kalender ist nicht mehr im Dokument.',
    nonSiLegge: 'Der Kalender lässt sich nicht lesen.',
    titoloDialogo: 'Ein Kalender, mit dem die Stunden verglichen werden',
    filtroIcs: 'ICS-Kalender',
    filtroTutti: 'Alle Dateien',
    origineNonValida:
      'Es braucht eine Adresse https:// oder webcal:// oder den Pfad einer .ics-Datei.',
    giaNelDocumento:
      'Dieser Kalender ist schon im Dokument: Um ihn neu einzulesen, drücke «Aktualisieren».',
    aggiunto: (nome) => `Kalender «${nome}» hinzugefügt, mit seiner Kopie im Dokument.`,
    copiaDiPrima: (motivo) => `${motivo} Die bisherige Kopie bleibt, wie sie war.`,
    aggiornato: (nome) => `Kalender «${nome}» aktualisiert.`,
    senzaNome: 'Ein Kalender braucht einen Namen.',
    quelloDiPrima: (motivo) => `${motivo} Der Kalender bleibt der bisherige.`,
    corsoSparito:
      'Eine der zu erstellenden Stunden gehört zu einem Kurs, den es nicht mehr gibt.',
    daAllineareSparita: 'Eine der anzugleichenden Stunden ist nicht mehr da.',
    daConfermare: (data) =>
      `${data}: Die Stunde hat sich geändert, ` +
      'die Angleichung ist im Vergleich noch zu bestätigen.',
    daAnnullareSparita: 'Eine der abzusagenden Stunden ist nicht mehr da.',
    create: (n) => plurale(n, 'Stunde erstellt', 'Stunden erstellt'),
    allineate: (n) => `${n} angeglichen`,
    annullate: (n) => `${n} als ausgefallen markiert`,
    dalCalendario: (detto) => `Aus dem Kalender: ${detto.join(', ')}.`,
    nienteDaCambiare: 'Keine Stunde zu ändern.',
    regoleSalvate: 'Kalender und Regeln gespeichert: keine Stunde zu ändern.',
  },
  fr: {
    nonCePiu: 'Ce calendrier n’est plus dans le document.',
    nonSiLegge: 'Le calendrier ne peut pas être lu.',
    titoloDialogo: 'Un calendrier avec lequel comparer les leçons',
    filtroIcs: 'Calendrier ICS',
    filtroTutti: 'Tous les fichiers',
    origineNonValida:
      'Il faut une adresse https:// ou webcal://, ou le chemin d’un fichier .ics.',
    giaNelDocumento:
      'Ce calendrier est déjà dans le document : pour le relire, appuie sur « Mettre à jour ».',
    aggiunto: (nome) => `Calendrier « ${nome} » ajouté, avec sa copie dans le document.`,
    copiaDiPrima: (motivo) => `${motivo} La copie précédente reste telle quelle.`,
    aggiornato: (nome) => `Calendrier « ${nome} » mis à jour.`,
    senzaNome: 'Un calendrier a besoin d’un nom.',
    quelloDiPrima: (motivo) => `${motivo} Le calendrier reste celui d’avant.`,
    corsoSparito: 'L’une des leçons à créer appartient à un cours qui n’existe plus.',
    daAllineareSparita: 'L’une des leçons à aligner n’existe plus.',
    daConfermare: (data) =>
      `${data} : la leçon a changé, et l’alignement reste à confirmer dans la comparaison.`,
    daAnnullareSparita: 'L’une des leçons à annuler n’existe plus.',
    create: (n) => plurale(n, 'leçon créée', 'leçons créées'),
    allineate: (n) => plurale(n, 'alignée', 'alignées'),
    annullate: (n) => plurale(n, 'marquée annulée', 'marquées annulées'),
    dalCalendario: (detto) => `Depuis le calendrier : ${detto.join(', ')}.`,
    nienteDaCambiare: 'Aucune leçon à modifier.',
    regoleSalvate: 'Calendrier et règles enregistrés : aucune leçon à modifier.',
  },
  en: {
    nonCePiu: 'That calendar is no longer in the document.',
    nonSiLegge: 'The calendar can’t be read.',
    titoloDialogo: 'A calendar to compare the lessons with',
    filtroIcs: 'ICS calendar',
    filtroTutti: 'All files',
    origineNonValida: 'An https:// or webcal:// address, or the path of an .ics file, is needed.',
    giaNelDocumento:
      'This calendar is already in the document: press “Update” to read it again.',
    aggiunto: (nome) => `Calendar “${nome}” added, with its copy in the document.`,
    copiaDiPrima: (motivo) => `${motivo} The previous copy stays as it was.`,
    aggiornato: (nome) => `Calendar “${nome}” updated.`,
    senzaNome: 'A calendar needs a name.',
    quelloDiPrima: (motivo) => `${motivo} The calendar stays as it was.`,
    corsoSparito: 'One of the lessons to create belongs to a course that no longer exists.',
    daAllineareSparita: 'One of the lessons to align is no longer there.',
    daConfermare: (data) =>
      `${data}: the lesson has changed, ` +
      'and the alignment still needs confirming in the comparison.',
    daAnnullareSparita: 'One of the lessons to cancel is no longer there.',
    create: (n) => plurale(n, 'lesson created', 'lessons created'),
    allineate: (n) => `${n} aligned`,
    annullate: (n) => `${n} marked as cancelled`,
    dalCalendario: (detto) => `From the calendar: ${detto.join(', ')}.`,
    nienteDaCambiare: 'No lessons to change.',
    regoleSalvate: 'Calendar and rules saved: no lessons to change.',
  },
})
