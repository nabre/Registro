// I testi delle consegne dentro una lezione (`views/assignments.ts`).

import { catalogo } from '../../i18n/index.js'
import { PIF } from '../../domain/lexicon.js'
import type { TipoConsegna } from '../../domain/models.js'
import { plurale } from '../../domain/text.js'

const it = {
  /** Come si chiama ogni tipo nella pastiglia: minuscolo, dentro una riga. */
  tipi: {
    compito: 'compito',
    studio: 'studio',
    materiale: 'materiale',
    consegna: 'da consegnare',
    preparazione: 'preparazione',
    amministrativo: 'amministrativo',
    altro: 'altro',
  } satisfies Record<TipoConsegna, string>,
  /** Chi spunta quando la consegna tocca a chi insegna. */
  io: 'io',
  /** Il nome corto di chi non frequenta più. */
  uscito: 'uscito',
  pifUscita: `${PIF.singolare} uscita`,
  clicPerSpuntare: (conDocumento: boolean) =>
    `Clic per ${conDocumento ? 'raccogliere il documento' : 'spuntare'}`,
  clicPerTogliere: (conDocumento: boolean) =>
    `Clic per togliere ${conDocumento ? 'il documento' : 'la spunta'}`,
  spuntataIl: (giorno: string, conDocumento: boolean) =>
    `Spuntata il ${giorno}: ` +
    `il clic non la cambia — tasto destro per togliere ${conDocumento ? 'il documento' : 'la spunta'}`,
  togliDocumento: 'Togli il documento',
  togliSpunta: 'Togli la spunta',
  raccogliDocumento: 'Raccogli il documento…',
  spunta: 'Spunta',
  nonCePiu: 'La consegna non c’è più.',
  toccaAMe: 'tocca a me',
  soloAdAlcuni: 'solo ad alcuni',
  tuttaLaClasse: 'tutta la classe',
  fattaDaTutti: 'fatta da tutti',
  dataIl: (giorno: string) => `Data ${giorno}`,
  daFarePer: (giorno: string) => ` · da fare per ${giorno}`,
  senzaTermine: ' · senza termine',
  nessunaDelleScelte:
    `Nessuna delle ${PIF.plurale} scelte frequenta più: resta aperta finché non la si chiude.`,
  classeSenzaPif: `La classe non ha ancora ${PIF.plurale}: resta aperta finché non la si chiude.`,
  suTotale: (fatte: number, totale: number) => `${fatte} su ${totale}`,
  mancanoN: (quanti: number) => `mancano ${quanti}`,
  segnaTutti: 'Segna tutti',
  togliTutti: 'Togli tutti',
  spuntaTutti: 'Spunta tutti',
  spuntaTuttiAiuto: 'Segna come fatta da tutti quelli a cui era stata data',
  /** I primi nomi che mancano, e quanti altri dopo. */
  mancanoNomi: (nomi: string, altri: number) => `mancano ${nomi}${altri > 0 ? ` +${altri}` : ''}`,
  apriRitiro: 'Apri il ritiro e spunta i nomi',
  consegnoPerEmail: 'consegno per e-mail',
  consegnoAMano: 'consegno a mano',
  daConsegnareA: (quanti: number) => `da consegnare a ${quanti}`,
  senzaDocumento: (quanti: number) => `${quanti} senza documento`,
  senzaDestinatari: 'senza destinatari',
  togliSpunteAiuto: 'Toglie le spunte e torna a chiederla',
  spuntaIMancanti: (quanti: number) => `Spunta i ${quanti} che mancano`,
  togliereSpunte: (quanti: number) => `Togliere ${plurale(quanti, 'spunta', 'spunte')}?`,
  togliereSpunteTesto:
    'La consegna torna fra quelle da chiedere. I documenti raccolti restano: ' +
    'se ne vanno solo le spunte senza foglio.',
  modificaConsegna: 'Modifica la consegna',
  dataIlGiorno: (giorno: string) => `data il ${giorno}`,
  per: (giorno: string) => ` · per ${giorno}`,
  arretrateInTutto: (arretrate: number, quante: number) =>
    `${arretrate} rimaste indietro · ${quante} in tutto`,
  sottotitolo: 'quel che si è dato da fare, finché non è fatto',
  nuovaConsegna: 'Nuova consegna',
  nienteInSospeso:
    'Niente in sospeso per questo corso. Quel che si assegna qui torna a galla ' +
    'nelle lezioni successive finché non è spuntato.',
  rimasteIndietro: 'Rimaste indietro',
  scadonoOggi: 'Scadono oggi',
  dateInQuestaLezione: 'Date in questa lezione',
  ancoraAperte: 'Ancora aperte',
}

export const testi = catalogo(it, {
  de: {
    tipi: {
      compito: 'Aufgabe',
      studio: 'Lernen',
      materiale: 'Material',
      consegna: 'abzugeben',
      preparazione: 'Vorbereitung',
      amministrativo: 'Administratives',
      altro: 'Anderes',
    },
    io: 'ich',
    uscito: 'ausgetreten',
    pifUscita: 'ehemalige Lernende',
    clicPerSpuntare: (conDocumento) =>
      conDocumento ? 'Klicken, um das Dokument einzusammeln' : 'Klicken zum Abhaken',
    clicPerTogliere: (conDocumento) =>
      `Klicken, um ${conDocumento ? 'das Dokument' : 'das Häkchen'} zu entfernen`,
    spuntataIl: (giorno, conDocumento) =>
      `Abgehakt am ${giorno}: Ein Klick ändert daran nichts – Rechtsklick, um ` +
      `${conDocumento ? 'das Dokument' : 'das Häkchen'} zu entfernen`,
    togliDocumento: 'Dokument entfernen',
    togliSpunta: 'Häkchen entfernen',
    raccogliDocumento: 'Dokument einsammeln…',
    spunta: 'Abhaken',
    nonCePiu: 'Diesen Auftrag gibt es nicht mehr.',
    toccaAMe: 'für mich',
    soloAdAlcuni: 'nur für einige',
    tuttaLaClasse: 'ganze Klasse',
    fattaDaTutti: 'von allen erledigt',
    dataIl: (giorno) => `Erteilt am ${giorno}`,
    daFarePer: (giorno) => ` · zu erledigen bis ${giorno}`,
    senzaTermine: ' · ohne Frist',
    nessunaDelleScelte:
      'Keine der ausgewählten Lernenden besucht noch den Unterricht: Der Auftrag bleibt ' +
      'offen, bis man ihn schliesst.',
    classeSenzaPif:
      'Die Klasse hat noch keine Lernenden: Der Auftrag bleibt offen, bis man ihn schliesst.',
    suTotale: (fatte, totale) => `${fatte} von ${totale}`,
    mancanoN: (quanti) => `${quanti} fehlen`,
    segnaTutti: 'Alle markieren',
    togliTutti: 'Alle entfernen',
    spuntaTutti: 'Alle abhaken',
    spuntaTuttiAiuto: 'Für alle, denen der Auftrag erteilt wurde, als erledigt markieren',
    mancanoNomi: (nomi, altri) => `es fehlen ${nomi}${altri > 0 ? ` +${altri}` : ''}`,
    apriRitiro: 'Einsammeln öffnen und die Namen abhaken',
    consegnoPerEmail: 'ich verteile per E-Mail',
    consegnoAMano: 'ich verteile von Hand',
    daConsegnareA: (quanti) => `an ${quanti} zu verteilen`,
    senzaDocumento: (quanti) => `${quanti} ohne Dokument`,
    senzaDestinatari: 'ohne Empfänger',
    togliSpunteAiuto: 'Entfernt die Häkchen und fordert den Auftrag wieder ein',
    spuntaIMancanti: (quanti) => `Die Fehlenden abhaken (${quanti})`,
    togliereSpunte: (quanti) => `${plurale(quanti, 'Häkchen', 'Häkchen')} entfernen?`,
    togliereSpunteTesto:
      'Der Auftrag kommt wieder zu denen, die noch einzufordern sind. Eingesammelte ' +
      'Dokumente bleiben: Es verschwinden nur die Häkchen ohne Blatt.',
    modificaConsegna: 'Auftrag bearbeiten',
    dataIlGiorno: (giorno) => `erteilt am ${giorno}`,
    per: (giorno) => ` · bis ${giorno}`,
    arretrateInTutto: (arretrate, quante) => `${arretrate} überfällig · ${quante} insgesamt`,
    sottotitolo: 'was aufgegeben wurde, bis es erledigt ist',
    nuovaConsegna: 'Neuer Auftrag',
    nienteInSospeso:
      'In diesem Kurs ist nichts offen. Was hier aufgegeben wird, taucht in den folgenden ' +
      'Stunden wieder auf, bis es abgehakt ist.',
    rimasteIndietro: 'Überfällig',
    scadonoOggi: 'Heute fällig',
    dateInQuestaLezione: 'In dieser Stunde erteilt',
    ancoraAperte: 'Noch offen',
  },
  fr: {
    tipi: {
      compito: 'devoir',
      studio: 'étude',
      materiale: 'matériel',
      consegna: 'à rendre',
      preparazione: 'préparation',
      amministrativo: 'administratif',
      altro: 'autre',
    },
    io: 'moi',
    uscito: 'parti',
    pifUscita: 'ancienne personne en formation',
    clicPerSpuntare: (conDocumento) =>
      conDocumento ? 'Clic pour recueillir le document' : 'Clic pour cocher',
    clicPerTogliere: (conDocumento) =>
      `Clic pour retirer ${conDocumento ? 'le document' : 'la coche'}`,
    spuntataIl: (giorno, conDocumento) =>
      `Coché le ${giorno} : un clic ne le change pas – clic droit pour retirer ` +
      `${conDocumento ? 'le document' : 'la coche'}`,
    togliDocumento: 'Retirer le document',
    togliSpunta: 'Retirer la coche',
    raccogliDocumento: 'Recueillir le document…',
    spunta: 'Cocher',
    nonCePiu: 'Ce devoir n’existe plus.',
    toccaAMe: 'pour moi',
    soloAdAlcuni: 'seulement pour certains',
    tuttaLaClasse: 'toute la classe',
    fattaDaTutti: 'fait par tous',
    dataIl: (giorno) => `Donné le ${giorno}`,
    daFarePer: (giorno) => ` · à faire pour le ${giorno}`,
    senzaTermine: ' · sans échéance',
    nessunaDelleScelte:
      'Aucune des personnes en formation choisies ne suit plus les cours : le devoir reste ' +
      'ouvert jusqu’à ce qu’on le ferme.',
    classeSenzaPif:
      'La classe n’a pas encore de personnes en formation : le devoir reste ouvert jusqu’à ' +
      'ce qu’on le ferme.',
    suTotale: (fatte, totale) => `${fatte} sur ${totale}`,
    mancanoN: (quanti) => `il en manque ${quanti}`,
    segnaTutti: 'Marquer tout le monde',
    togliTutti: 'Retirer tout le monde',
    spuntaTutti: 'Cocher tout le monde',
    spuntaTuttiAiuto: 'Marquer comme fait par tous ceux à qui il a été donné',
    mancanoNomi: (nomi, altri) => `manquent : ${nomi}${altri > 0 ? ` +${altri}` : ''}`,
    apriRitiro: 'Ouvrir le ramassage et cocher les noms',
    consegnoPerEmail: 'je distribue par e-mail',
    consegnoAMano: 'je distribue en main propre',
    daConsegnareA: (quanti) => `à distribuer à ${quanti}`,
    senzaDocumento: (quanti) => `${quanti} sans document`,
    senzaDestinatari: 'sans destinataires',
    togliSpunteAiuto: 'Retire les coches et le redemande',
    spuntaIMancanti: (quanti) => `Cocher ceux qui manquent (${quanti})`,
    togliereSpunte: (quanti) => `Retirer ${plurale(quanti, 'coche', 'coches')} ?`,
    togliereSpunteTesto:
      'Le devoir revient parmi ceux à réclamer. Les documents recueillis restent : seules ' +
      'les coches sans feuille disparaissent.',
    modificaConsegna: 'Modifier le devoir',
    dataIlGiorno: (giorno) => `donné le ${giorno}`,
    per: (giorno) => ` · pour le ${giorno}`,
    arretrateInTutto: (arretrate, quante) => `${arretrate} en retard · ${quante} au total`,
    sottotitolo: 'ce qu’on a donné à faire, jusqu’à ce que ce soit fait',
    nuovaConsegna: 'Nouveau devoir',
    nienteInSospeso:
      'Rien en suspens pour ce cours. Ce qu’on donne ici revient dans les leçons suivantes ' +
      'jusqu’à ce que ce soit coché.',
    rimasteIndietro: 'En retard',
    scadonoOggi: 'À rendre aujourd’hui',
    dateInQuestaLezione: 'Donnés dans cette leçon',
    ancoraAperte: 'Encore ouverts',
  },
  en: {
    tipi: {
      compito: 'task',
      studio: 'study',
      materiale: 'materials',
      consegna: 'to hand in',
      preparazione: 'preparation',
      amministrativo: 'admin',
      altro: 'other',
    },
    io: 'me',
    uscito: 'left',
    pifUscita: 'former learner',
    clicPerSpuntare: (conDocumento) =>
      conDocumento ? 'Click to collect the document' : 'Click to tick',
    clicPerTogliere: (conDocumento) =>
      `Click to remove ${conDocumento ? 'the document' : 'the tick'}`,
    spuntataIl: (giorno, conDocumento) =>
      `Ticked on ${giorno}: clicking won’t change it – right-click to remove ` +
      `${conDocumento ? 'the document' : 'the tick'}`,
    togliDocumento: 'Remove the document',
    togliSpunta: 'Remove the tick',
    raccogliDocumento: 'Collect the document…',
    spunta: 'Tick',
    nonCePiu: 'This assignment no longer exists.',
    toccaAMe: 'for me',
    soloAdAlcuni: 'only some',
    tuttaLaClasse: 'whole class',
    fattaDaTutti: 'done by everyone',
    dataIl: (giorno) => `Set on ${giorno}`,
    daFarePer: (giorno) => ` · to do by ${giorno}`,
    senzaTermine: ' · no deadline',
    nessunaDelleScelte:
      'None of the chosen learners attends any more: it stays open until you close it.',
    classeSenzaPif: 'The class has no learners yet: it stays open until you close it.',
    suTotale: (fatte, totale) => `${fatte} of ${totale}`,
    mancanoN: (quanti) => `${quanti} missing`,
    segnaTutti: 'Mark all',
    togliTutti: 'Remove all',
    spuntaTutti: 'Tick all',
    spuntaTuttiAiuto: 'Mark as done by everyone it was set for',
    mancanoNomi: (nomi, altri) => `missing: ${nomi}${altri > 0 ? ` +${altri}` : ''}`,
    apriRitiro: 'Open the collection and tick off the names',
    consegnoPerEmail: 'I hand out by email',
    consegnoAMano: 'I hand out in person',
    daConsegnareA: (quanti) => `to hand out to ${quanti}`,
    senzaDocumento: (quanti) => `${quanti} without a document`,
    senzaDestinatari: 'no recipients',
    togliSpunteAiuto: 'Removes the ticks and asks for it again',
    spuntaIMancanti: (quanti) => `Tick off those missing (${quanti})`,
    togliereSpunte: (quanti) => `Remove ${plurale(quanti, 'tick', 'ticks')}?`,
    togliereSpunteTesto:
      'The assignment goes back among those still to ask for. Collected documents stay: ' +
      'only the ticks without a sheet go.',
    modificaConsegna: 'Edit the assignment',
    dataIlGiorno: (giorno) => `set on ${giorno}`,
    per: (giorno) => ` · due ${giorno}`,
    arretrateInTutto: (arretrate, quante) => `${arretrate} overdue · ${quante} in total`,
    sottotitolo: 'what was set, until it’s done',
    nuovaConsegna: 'New assignment',
    nienteInSospeso:
      'Nothing pending for this course. What you set here comes back in the following ' +
      'lessons until it’s ticked off.',
    rimasteIndietro: 'Overdue',
    scadonoOggi: 'Due today',
    dateInQuestaLezione: 'Set in this lesson',
    ancoraAperte: 'Still open',
  },
})
