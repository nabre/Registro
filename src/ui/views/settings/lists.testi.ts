// I testi delle liste dei menu a tendina (`settings/lists.ts`). Nomi delle
// liste e dove compaiono stanno in `domain/lists.testi.ts`.

import { catalogo } from '../../../i18n/index.js'

const it = {
  rimettereTitolo: (lista: string) => `Rimettere le voci di fabbrica in «${lista}»?`,
  rimettereTesto:
    'Le voci aggiunte o rinominate spariscono e torna l’elenco di partenza. ' +
    'Quel che è già stato segnato con le voci di adesso non cambia.',
  rimetti: 'Rimetti',
  su: 'Su',
  giu: 'Giù',
  comeSiLegge: 'Come si legge questa voce',
  coloreDi: (voce: string) => `Colore di «${voce}»`,
  valoreSalvato: 'Il valore salvato nel file',
  usata: (volte: number) => volte === 1 ? 'usata una volta' : `usata ${volte} volte`,
  maiUsata: 'mai usata',
  togliUsata: 'Togli la voce: quel che l’ha già scelta resta com’è',
  togli: 'Togli la voce',
  nuovaSegnaposto: 'una voce nuova',
  nuovaEtichetta: 'Come si legge la voce nuova',
  valoreCheSiSalvera: 'Il valore che si salverà',
  coloreNuova: 'Colore della voce nuova',
  colonnaVoce: 'Voce',
  colonnaColoreAiuto:
    'Il colore del filetto della tappa nella scaletta, nel registro dell’ora e ' +
    'sullo schermo in aula.',
  colonnaValore: 'Valore nel file',
  colonnaUsi: 'Usi',
  vociLibere: 'voci libere',
  vociFisse: 'voci fisse',
  rimettiFabbrica: 'Rimetti le voci di fabbrica',
  doveCompare: 'Dove compare: ',
  vincolo: (colori: boolean) =>
    'Queste voci le usa il programma — decidono quali campi compaiono e come si ' +
    'conta — e non se ne possono aggiungere. Si cambiano la parola che si legge' +
    (colori ? ', il colore' : '') +
    ' e l’ordine in cui si offrono.',
  listaDaModificare: 'Lista da modificare',
  titolo: 'Liste dei menu a tendina',
  aiuto: 'Le voci fra cui si sceglie preparando un piano lezione. ',
  aiutoDentro:
    'Stanno dentro il documento: chi apre questo anno da un’altra macchina trova le ' +
    'stesse voci. Togliendone una, le tappe che l’avevano scelta restano come sono — ' +
    'la tendina se la ritrova in coda finché qualcuno non ne sceglie un’altra. ' +
    'L’asterisco sulla linguetta segna le liste cambiate rispetto a quelle di fabbrica.',
}

export const testi = catalogo(it, {
  de: {
    rimettereTitolo: (lista) => `Werkseinträge in «${lista}» wiederherstellen?`,
    rimettereTesto:
      'Hinzugefügte oder umbenannte Einträge verschwinden, und die ursprüngliche Liste kehrt ' +
      'zurück. Was schon mit den jetzigen Einträgen erfasst wurde, ändert sich nicht.',
    rimetti: 'Wiederherstellen',
    su: 'Nach oben',
    giu: 'Nach unten',
    comeSiLegge: 'Wie dieser Eintrag heisst',
    coloreDi: (voce) => `Farbe von «${voce}»`,
    valoreSalvato: 'Der in der Datei gespeicherte Wert',
    usata: (volte) => volte === 1 ? 'einmal verwendet' : `${volte}-mal verwendet`,
    maiUsata: 'nie verwendet',
    togliUsata: 'Eintrag entfernen: Was ihn schon gewählt hat, bleibt, wie es ist',
    togli: 'Eintrag entfernen',
    nuovaSegnaposto: 'ein neuer Eintrag',
    nuovaEtichetta: 'Wie der neue Eintrag heisst',
    valoreCheSiSalvera: 'Der Wert, der gespeichert wird',
    coloreNuova: 'Farbe des neuen Eintrags',
    colonnaVoce: 'Eintrag',
    colonnaColoreAiuto:
      'Die Farbe des Streifens der Etappe im Ablauf, im Klassenbuch der Stunde und auf dem ' +
      'Bildschirm im Schulzimmer.',
    colonnaValore: 'Wert in der Datei',
    colonnaUsi: 'Verwendungen',
    vociLibere: 'freie Einträge',
    vociFisse: 'feste Einträge',
    rimettiFabbrica: 'Werkseinträge wiederherstellen',
    doveCompare: 'Wo sie erscheint: ',
    vincolo: (colori) =>
      'Diese Einträge verwendet das Programm — sie bestimmen, welche Felder erscheinen und ' +
      'wie gezählt wird —, und es lassen sich keine hinzufügen. Ändern lassen sich das Wort, ' +
      'das man liest' +
      (colori ? ', die Farbe' : '') +
      ' und die Reihenfolge, in der sie angeboten werden.',
    listaDaModificare: 'Zu bearbeitende Liste',
    titolo: 'Listen der Auswahlmenüs',
    aiuto: 'Die Einträge, aus denen man beim Vorbereiten eines Unterrichtsplans wählt. ',
    aiutoDentro:
      'Sie stehen im Dokument: Wer dieses Jahr auf einem anderen Computer öffnet, findet ' +
      'dieselben Einträge. Entfernt man einen, bleiben die Etappen, die ihn gewählt hatten, ' +
      'wie sie sind — das Auswahlmenü führt ihn am Ende weiter, bis jemand einen anderen ' +
      'wählt. Das Sternchen auf dem Reiter markiert die Listen, die gegenüber den ' +
      'Werkslisten geändert wurden.',
  },
  fr: {
    rimettereTitolo: (lista) => `Remettre les entrées d’origine dans « ${lista} » ?`,
    rimettereTesto:
      'Les entrées ajoutées ou renommées disparaissent et la liste de départ revient. Ce qui ' +
      'a déjà été noté avec les entrées actuelles ne change pas.',
    rimetti: 'Remettre',
    su: 'Monter',
    giu: 'Descendre',
    comeSiLegge: 'Comment se lit cette entrée',
    coloreDi: (voce) => `Couleur de « ${voce} »`,
    valoreSalvato: 'La valeur enregistrée dans le fichier',
    usata: (volte) => volte === 1 ? 'utilisée une fois' : `utilisée ${volte} fois`,
    maiUsata: 'jamais utilisée',
    togliUsata: 'Retirer l’entrée : ce qui l’a déjà choisie reste tel quel',
    togli: 'Retirer l’entrée',
    nuovaSegnaposto: 'une nouvelle entrée',
    nuovaEtichetta: 'Comment se lit la nouvelle entrée',
    valoreCheSiSalvera: 'La valeur qui sera enregistrée',
    coloreNuova: 'Couleur de la nouvelle entrée',
    colonnaVoce: 'Entrée',
    colonnaColoreAiuto:
      'La couleur du filet de l’étape dans le déroulement, dans le registre de la leçon et sur ' +
      'l’écran en classe.',
    colonnaValore: 'Valeur dans le fichier',
    colonnaUsi: 'Utilisations',
    vociLibere: 'entrées libres',
    vociFisse: 'entrées fixes',
    rimettiFabbrica: 'Remettre les entrées d’origine',
    doveCompare: 'Où elle apparaît : ',
    vincolo: (colori) =>
      'Ces entrées sont utilisées par le programme — elles décident quels champs apparaissent ' +
      'et comment on compte — et on ne peut pas en ajouter. On change le mot qu’on lit' +
      (colori ? ', la couleur' : '') +
      ' et l’ordre dans lequel elles sont proposées.',
    listaDaModificare: 'Liste à modifier',
    titolo: 'Listes des menus déroulants',
    aiuto: 'Les entrées parmi lesquelles on choisit en préparant un plan de leçon. ',
    aiutoDentro:
      'Elles sont dans le document : qui ouvre cette année sur une autre machine retrouve les ' +
      'mêmes entrées. Si on en retire une, les étapes qui l’avaient choisie restent telles ' +
      'quelles — le menu la garde en fin de liste jusqu’à ce que quelqu’un en choisisse une ' +
      'autre. L’astérisque sur l’onglet signale les listes modifiées par rapport à celles ' +
      'd’origine.',
  },
  en: {
    rimettereTitolo: (lista) => `Restore the factory entries in “${lista}”?`,
    rimettereTesto:
      'Added or renamed entries disappear and the original list comes back. What has already ' +
      'been recorded with the current entries does not change.',
    rimetti: 'Restore',
    su: 'Up',
    giu: 'Down',
    comeSiLegge: 'How this entry reads',
    coloreDi: (voce) => `Colour of “${voce}”`,
    valoreSalvato: 'The value saved in the file',
    usata: (volte) => volte === 1 ? 'used once' : `used ${volte} times`,
    maiUsata: 'never used',
    togliUsata: 'Remove the entry: whatever already chose it stays as it is',
    togli: 'Remove the entry',
    nuovaSegnaposto: 'a new entry',
    nuovaEtichetta: 'How the new entry reads',
    valoreCheSiSalvera: 'The value that will be saved',
    coloreNuova: 'Colour of the new entry',
    colonnaVoce: 'Entry',
    colonnaColoreAiuto:
      'The colour of the step’s stripe in the outline, in the lesson register and on the ' +
      'classroom screen.',
    colonnaValore: 'Value in the file',
    colonnaUsi: 'Uses',
    vociLibere: 'free entries',
    vociFisse: 'fixed entries',
    rimettiFabbrica: 'Restore the factory entries',
    doveCompare: 'Where it appears: ',
    vincolo: (colori) =>
      'The program uses these entries — they decide which fields appear and how things are ' +
      'counted — and none can be added. You can change the word that is shown' +
      (colori ? ', the colour' : '') +
      ' and the order in which they are offered.',
    listaDaModificare: 'List to edit',
    titolo: 'Drop-down menu lists',
    aiuto: 'The entries you choose from when preparing a lesson plan. ',
    aiutoDentro:
      'They live inside the document: anyone opening this year on another machine finds the ' +
      'same entries. If you remove one, the steps that had chosen it stay as they are — the ' +
      'drop-down keeps it at the end until someone chooses another. The asterisk on the tab ' +
      'marks the lists changed from the factory ones.',
  },
})
