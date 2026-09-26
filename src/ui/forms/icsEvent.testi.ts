// I testi di `forms/icsEvent.ts`: la finestra che prende un evento del
// calendario ICS e lo abbina a un corso, o ne fa una lezione.

import { catalogo } from '../../i18n/index.js'

const it = {
  lezioneEAbbinamento: 'Lezione generata e abbinamento salvato.',
  lezioneDallEvento: 'Lezione generata dall’evento.',
  abbinamentoSalvato: (corso: string) => `Abbinamento a ${corso} salvato.`,
  nonPiuProposti: 'Eventi come questo non saranno più proposti.',
  regolaIgnora: 'Una regola dice che eventi come questo non sono lezioni.',
  riconosciutoDaRegola: (corso: string) => `Già riconosciuto come ${corso} da una regola.`,
  riconosciutoPerIndizio: (corso: string) =>
    `Già riconosciuto come ${corso}, ma solo per indizio: una regola lo fissa.`,
  nessunaRegola: 'Nessuna regola lo riconosce ancora.',
  titoloGenera: 'Genera la lezione dall’evento',
  titoloAbbina: 'Abbina l’evento a un corso',
  salvaGenera: 'Genera la lezione',
  salvaAbbina: 'Salva l’abbinamento',
  citato: (titolo: string) => `«${titolo}»`,
  senzaTitolo: '(senza titolo)',
  unOraSola: (n: number) => `${n} eventi fanno un’ora sola: fra l’uno e l’altro, la pausa.`,
  nonUnaLezione: 'Non è una lezione',
  segnapostoAula: 'aula 12, laboratorio CAD…',
  riconosci: 'Riconosci gli eventi che dicono',
  aiutoRegola:
    'Si cerca nel titolo e nel luogo, parole in qualsiasi ordine. Accorciato — «DIC4a» invece ' +
    'del titolo intero — vale per tutti gli eventi che lo contengono. Varianti con «|», ' +
    'prefisso con «*».',
  ricorda: 'Ricorda l’abbinamento per gli eventi simili',
  scegliCorso: 'Scegli il corso.',
  scriviOTogli: 'Scrivi il testo da riconoscere, o togli la spunta.',
  scrivi: 'Scrivi il testo da riconoscere.',
  nonRiconosce:
    'Il testo non riconosce questo evento, o un’altra regola più precisa lo porta altrove: ' +
    'usa parole che stanno nel titolo o nel luogo.',
  troppoCorto: 'Dall’evento non esce un’ora di lezione: è troppo corto.',
  sovrapposta: (corso: string) => `${corso} ha già un’ora che si sovrappone a questa.`,
  cEraGia: 'L’abbinamento c’era già: nessuna regola da aggiungere.',
  inPari: 'La lezione è già in pari con il calendario ICS.',
  sincronizzata: 'Lezione sincronizzata dal calendario ICS.',
}

export const testi = catalogo(it, {
  de: {
    lezioneEAbbinamento: 'Stunde erstellt und Zuordnung gespeichert.',
    lezioneDallEvento: 'Stunde aus dem Termin erstellt.',
    abbinamentoSalvato: (corso) => `Zuordnung zu ${corso} gespeichert.`,
    nonPiuProposti: 'Termine wie dieser werden nicht mehr vorgeschlagen.',
    regolaIgnora: 'Eine Regel besagt, dass Termine wie dieser keine Stunden sind.',
    riconosciutoDaRegola: (corso) => `Bereits durch eine Regel als ${corso} erkannt.`,
    riconosciutoPerIndizio: (corso) =>
      `Bereits als ${corso} erkannt, aber nur aufgrund von Hinweisen: Eine Regel legt es fest.`,
    nessunaRegola: 'Noch keine Regel erkennt ihn.',
    titoloGenera: 'Stunde aus dem Termin erstellen',
    titoloAbbina: 'Termin einem Kurs zuordnen',
    salvaGenera: 'Stunde erstellen',
    salvaAbbina: 'Zuordnung speichern',
    citato: (titolo) => `«${titolo}»`,
    senzaTitolo: '(ohne Titel)',
    unOraSola: (n) =>
      `${n} Termine ergeben eine einzige Stunde: Dazwischen liegt die Pause.`,
    nonUnaLezione: 'Keine Stunde',
    segnapostoAula: 'Zimmer 12, CAD-Labor…',
    riconosci: 'Termine erkennen, in denen steht',
    aiutoRegola:
      'Gesucht wird in Titel und Ort, die Wörter in beliebiger Reihenfolge. Gekürzt – «DIC4a» ' +
      'statt des ganzen Titels – gilt es für alle Termine, die es enthalten. Varianten mit «|», ' +
      'Präfix mit «*».',
    ricorda: 'Zuordnung für ähnliche Termine merken',
    scegliCorso: 'Wähle den Kurs.',
    scriviOTogli: 'Schreib den Text, der erkannt werden soll, oder entferne das Häkchen.',
    scrivi: 'Schreib den Text, der erkannt werden soll.',
    nonRiconosce:
      'Der Text erkennt diesen Termin nicht, oder eine genauere Regel ordnet ihn anderswo zu: ' +
      'Verwende Wörter, die im Titel oder im Ort stehen.',
    troppoCorto: 'Aus dem Termin ergibt sich keine Stunde: Er ist zu kurz.',
    sovrapposta: (corso) =>
      `${corso} hat bereits eine Stunde, die sich mit dieser überschneidet.`,
    cEraGia: 'Die Zuordnung gab es schon: Es ist keine Regel hinzuzufügen.',
    inPari: 'Die Stunde ist bereits auf dem Stand des ICS-Kalenders.',
    sincronizzata: 'Stunde aus dem ICS-Kalender synchronisiert.',
  },
  fr: {
    lezioneEAbbinamento: 'Leçon générée et association enregistrée.',
    lezioneDallEvento: 'Leçon générée à partir de l’événement.',
    abbinamentoSalvato: (corso) => `Association à ${corso} enregistrée.`,
    nonPiuProposti: 'Les événements de ce type ne seront plus proposés.',
    regolaIgnora: 'Une règle indique que les événements de ce type ne sont pas des leçons.',
    riconosciutoDaRegola: (corso) => `Déjà reconnu comme ${corso} par une règle.`,
    riconosciutoPerIndizio: (corso) =>
      `Déjà reconnu comme ${corso}, mais seulement par indices : une règle le fixe.`,
    nessunaRegola: 'Aucune règle ne le reconnaît encore.',
    titoloGenera: 'Générer la leçon à partir de l’événement',
    titoloAbbina: 'Associer l’événement à un cours',
    salvaGenera: 'Générer la leçon',
    salvaAbbina: 'Enregistrer l’association',
    citato: (titolo) => `« ${titolo} »`,
    senzaTitolo: '(sans titre)',
    unOraSola: (n) =>
      `${n} événements forment une seule leçon : entre l’un et l’autre, la pause.`,
    nonUnaLezione: 'Pas une leçon',
    segnapostoAula: 'salle 12, laboratoire CAO…',
    riconosci: 'Reconnaître les événements qui contiennent',
    aiutoRegola:
      'La recherche porte sur le titre et le lieu, mots dans n’importe quel ordre. Raccourci — ' +
      '« DIC4a » au lieu du titre entier — il vaut pour tous les événements qui le contiennent. ' +
      'Variantes avec « | », préfixe avec « * ».',
    ricorda: 'Retenir l’association pour les événements similaires',
    scegliCorso: 'Choisis le cours.',
    scriviOTogli: 'Écris le texte à reconnaître, ou décoche la case.',
    scrivi: 'Écris le texte à reconnaître.',
    nonRiconosce:
      'Le texte ne reconnaît pas cet événement, ou une autre règle plus précise l’envoie ' +
      'ailleurs : utilise des mots qui figurent dans le titre ou le lieu.',
    troppoCorto: 'L’événement ne donne pas de leçon : il est trop court.',
    sovrapposta: (corso) => `${corso} a déjà une leçon qui chevauche celle-ci.`,
    cEraGia: 'L’association existait déjà : aucune règle à ajouter.',
    inPari: 'La leçon est déjà à jour avec le calendrier ICS.',
    sincronizzata: 'Leçon synchronisée depuis le calendrier ICS.',
  },
  en: {
    lezioneEAbbinamento: 'Lesson created and match saved.',
    lezioneDallEvento: 'Lesson created from the event.',
    abbinamentoSalvato: (corso) => `Match to ${corso} saved.`,
    nonPiuProposti: 'Events like this one won’t be suggested any more.',
    regolaIgnora: 'A rule says that events like this one aren’t lessons.',
    riconosciutoDaRegola: (corso) => `Already recognised as ${corso} by a rule.`,
    riconosciutoPerIndizio: (corso) =>
      `Already recognised as ${corso}, but only from clues: a rule makes it stick.`,
    nessunaRegola: 'No rule recognises it yet.',
    titoloGenera: 'Create the lesson from the event',
    titoloAbbina: 'Match the event to a course',
    salvaGenera: 'Create the lesson',
    salvaAbbina: 'Save the match',
    citato: (titolo) => `“${titolo}”`,
    senzaTitolo: '(untitled)',
    unOraSola: (n) => `${n} events make a single lesson: the break falls in between.`,
    nonUnaLezione: 'Not a lesson',
    segnapostoAula: 'room 12, CAD lab…',
    riconosci: 'Recognise events that say',
    aiutoRegola:
      'It looks in the title and the location, words in any order. Shortened — “DIC4a” instead ' +
      'of the whole title — it applies to every event that contains it. Alternatives with “|”, ' +
      'prefix with “*”.',
    ricorda: 'Remember the match for similar events',
    scegliCorso: 'Choose the course.',
    scriviOTogli: 'Write the text to recognise, or untick the box.',
    scrivi: 'Write the text to recognise.',
    nonRiconosce:
      'The text doesn’t recognise this event, or another, more specific rule sends it ' +
      'elsewhere: use words that appear in the title or the location.',
    troppoCorto: 'The event doesn’t make a lesson: it’s too short.',
    sovrapposta: (corso) => `${corso} already has a lesson that overlaps this one.`,
    cEraGia: 'The match was already there: no rule to add.',
    inPari: 'The lesson is already in step with the ICS calendar.',
    sincronizzata: 'Lesson synced from the ICS calendar.',
  },
})
