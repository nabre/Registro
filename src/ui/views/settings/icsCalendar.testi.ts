// I testi dei calendari ICS e delle loro regole (`settings/icsCalendar.ts`),
// nella scheda delle impostazioni e nella finestra di «Confronta con il calendario».

import { catalogo } from '../../../i18n/index.js'
import { plurale } from '../../../domain/text.js'

const it = {
  esempioOrigine: 'https://… oppure webcal://… oppure C:\\…\\orario.ics',
  regolaVuota: 'Una regola senza testo non abbina niente.',
  regolaIlleggibile:
    'Questa espressione regolare non si legge: controlla le parentesi e le barre.',
  nonLezione: '— non è una lezione —',
  corsoSparito: '(corso che non c’è più)',

  // I calendari.
  nessunaCopia: 'nessuna copia ancora: si legge dall’origine finché non si preme «Aggiorna»',
  copiaSconosciuta: 'copia di data sconosciuta',
  copiaDel: (quando: string) => `copia del ${quando}`,
  dalSito: (sito: string) => `dal sito ${sito}`,
  dalFile: (file: string) => `dal file ${file}`,
  togliere: (nome: string) => `Togliere «${nome}»?`,
  togliereTesto:
    'Il calendario e la sua copia escono dal documento: i suoi eventi spariscono dalla ' +
    'settimana. Le regole restano per gli altri calendari, e le lezioni già scritte non ' +
    'si toccano.',
  nonTolto: 'Calendario non tolto.',
  tolto: (nome: string) => `«${nome}» tolto dal documento.`,
  serveNome: 'Un calendario ha bisogno di un nome.',
  nomeNonCambiato: 'Nome non cambiato.',
  aggiornaAiuto: 'Rilegge l’origine e rifà la copia nel documento',
  nonAggiornato: 'Calendario non aggiornato.',
  confronta: 'Confronta',
  confrontaAiuto: 'Mette questo calendario a fronte delle lezioni',
  togliNome: (nome: string) => `Togli «${nome}»`,
  cambiaOrigine: 'Cambia indirizzo o file',
  cambiaOrigineAiuto:
    'Il nuovo si scarica subito, e prende il posto del vecchio solo se si legge.',
  restaQuello: 'Il calendario resta quello di prima.',
  aggiungiCalendario: 'Aggiungi un calendario',
  nonAggiunto: 'Calendario non aggiunto.',
  aggiungiAiuto: 'Scarica il calendario e ne tiene una copia nel documento',
  unFile: 'Un file…',
  unFileAiuto: 'Sceglie un file .ics dal disco e ne tiene una copia nel documento',
  calendari: (quanti: number) => `Calendari (${quanti})`,
  nessunCalendario:
    'Nessun calendario. Un indirizzo da abbonare si scarica subito, e la copia resta nel ' +
    'documento: il confronto funziona anche senza rete.',

  // Le regole.
  perToglierla: (rifiuto: string) => `${rifiuto} Per toglierla usa il cestino.`,
  giaUnaRegola: (testo: string) => `C’è già una regola «${testo}».`,
  corsoNonPiu: 'corso non più presente',
  nonSiLegge: 'non si legge: non abbina niente',
  togliRegola: (testo: string) => `Togli la regola «${testo}»`,
  regolaTolta: (testo: string) => `Regola «${testo}» tolta.`,
  regolaNuova: 'Regola nuova: il testo da riconoscere',
  regolaNuovaSegnaposto:
    'Il testo nel titolo o nel luogo dell’evento, per esempio «DIC4a CP»',
  lezioneDi: 'è una lezione di',
  scriviTesto: 'Scrivi il testo che la regola deve riconoscere.',
  giaUnaRegolaCorso: (testo: string) => `C’è già una regola «${testo}»: cambiale il corso lì.`,
  regoleConte: (quante: number) => `Regole di abbinamento (${quante})`,
  regole: 'Regole di abbinamento',
  regoleAiuto:
    'Un evento il cui titolo o luogo contiene tutte le parole, in qualsiasi ordine e senza ' +
    'badare a maiuscole e accenti, è una lezione di quel corso. «DIC1a | DIC1b» vale ' +
    'per l’una o l’altra, «DIC1*» per ogni parola che comincia così, e fra due barre — ' +
    '«/DIC1[ab]/» — si scrive un’espressione regolare. «Non è una lezione» lo fa ' +
    'ignorare: la riunione di sede, il ricevimento.',
  regoleAiutoConti:
    ' Accanto a ogni regola: quanti eventi di tutti i calendari decide lei (abbinati) ' +
    'e quanti ne riconosce (abbinabili). Quando più regole riconoscono lo stesso ' +
    'evento, lo decide quella che dice di più.',
  togliTutte: 'Togli tutte',
  togliereRegole: (quante: number) =>
    `Togliere ${quante === 1 ? 'la regola' : `tutte le ${quante} regole`}?`,
  togliereRegoleTesto:
    'Il confronto tornerà a indovinare il corso dal nome e dall’orario, e gli eventi ' +
    'ignorati torneranno a proporsi. Le lezioni già scritte non si toccano.',
  regoleTolte: 'Regole di abbinamento tolte.',
  orfane: (quante: number) =>
    `${plurale(quante, 'regola nomina', 'regole nominano')} un corso che non c’è più`,
  orfaneNota:
    ' Scegline un altro, o togli la regola: finché resta così i suoi eventi non si propongono.',
  nessunaRegola: 'Nessuna regola',
  nessunaRegolaTesto:
    'Nascono anche dal confronto, scegliendo il corso di un evento che il registro non ' +
    'sa abbinare da sé.',

  // La scheda e la finestra.
  rimuoviTutto: 'Rimuovi tutto',
  rimuoviTuttoAiuto: 'Toglie calendari, copie e regole: il documento torna senza calendario',
  rimuovere: 'Rimuovere i calendari ICS dal documento?',
  rimuovereTesto:
    'Si tolgono tutti i calendari con le loro copie, e tutte le regole di abbinamento. ' +
    'Le lezioni già scritte restano come sono: il calendario proponeva, non scriveva.',
  rimuovi: 'Rimuovi',
  rimossi: 'Calendari ICS rimossi dal documento.',
  calendariIcs: 'Calendari ICS',
  calendariIcsAiuto: 'i calendari esterni con cui si confrontano le lezioni, e come leggerli',
  finestraAiuto: 'Scegli quale confrontare con le lezioni, o aggiungine uno.',
  regoleComuni:
    'Le regole di abbinamento — quale evento è quale corso — sono comuni a tutti i ' +
    'calendari, e stanno nelle impostazioni del documento.',
  apriRegole: 'Apri le regole',
}

export const testi = catalogo(it, {
  de: {
    esempioOrigine: 'https://… oder webcal://… oder C:\\…\\stundenplan.ics',
    regolaVuota: 'Eine Regel ohne Text trifft nichts.',
    regolaIlleggibile:
      'Dieser reguläre Ausdruck lässt sich nicht lesen: Prüfe die Klammern und die Schrägstriche.',
    nonLezione: '— keine Stunde —',
    corsoSparito: '(Kurs, den es nicht mehr gibt)',
    nessunaCopia:
      'noch keine Kopie: Gelesen wird aus der Quelle, bis man «Aktualisieren» drückt',
    copiaSconosciuta: 'Kopie mit unbekanntem Datum',
    copiaDel: (quando) => `Kopie vom ${quando}`,
    dalSito: (sito) => `von der Website ${sito}`,
    dalFile: (file) => `aus der Datei ${file}`,
    togliere: (nome) => `«${nome}» entfernen?`,
    togliereTesto:
      'Der Kalender und seine Kopie verlassen das Dokument: Seine Termine verschwinden aus der ' +
      'Woche. Die Regeln bleiben für die anderen Kalender, und die schon geschriebenen ' +
      'Stunden bleiben unberührt.',
    nonTolto: 'Kalender nicht entfernt.',
    tolto: (nome) => `«${nome}» aus dem Dokument entfernt.`,
    serveNome: 'Ein Kalender braucht einen Namen.',
    nomeNonCambiato: 'Name nicht geändert.',
    aggiornaAiuto: 'Liest die Quelle neu und erstellt die Kopie im Dokument neu',
    nonAggiornato: 'Kalender nicht aktualisiert.',
    confronta: 'Abgleichen',
    confrontaAiuto: 'Gleicht diesen Kalender mit den Stunden ab',
    togliNome: (nome) => `«${nome}» entfernen`,
    cambiaOrigine: 'Adresse oder Datei ändern',
    cambiaOrigineAiuto:
      'Die neue wird sofort heruntergeladen und ersetzt die alte nur, wenn sie sich lesen lässt.',
    restaQuello: 'Der Kalender bleibt der bisherige.',
    aggiungiCalendario: 'Kalender hinzufügen',
    nonAggiunto: 'Kalender nicht hinzugefügt.',
    aggiungiAiuto: 'Lädt den Kalender herunter und behält eine Kopie im Dokument',
    unFile: 'Eine Datei…',
    unFileAiuto: 'Wählt eine .ics-Datei von der Festplatte und behält eine Kopie im Dokument',
    calendari: (quanti) => `Kalender (${quanti})`,
    nessunCalendario:
      'Kein Kalender. Eine abonnierbare Adresse wird sofort heruntergeladen, und die Kopie ' +
      'bleibt im Dokument: Der Abgleich funktioniert auch ohne Netz.',
    perToglierla: (rifiuto) => `${rifiuto} Zum Entfernen den Papierkorb verwenden.`,
    giaUnaRegola: (testo) => `Es gibt schon eine Regel «${testo}».`,
    corsoNonPiu: 'Kurs nicht mehr vorhanden',
    nonSiLegge: 'nicht lesbar: trifft nichts',
    togliRegola: (testo) => `Regel «${testo}» entfernen`,
    regolaTolta: (testo) => `Regel «${testo}» entfernt.`,
    regolaNuova: 'Neue Regel: der zu erkennende Text',
    regolaNuovaSegnaposto: 'Der Text im Titel oder im Ort des Termins, zum Beispiel «DIC4a CP»',
    lezioneDi: 'ist eine Stunde von',
    scriviTesto: 'Schreib den Text, den die Regel erkennen soll.',
    giaUnaRegolaCorso: (testo) => `Es gibt schon eine Regel «${testo}»: Ändere dort ihren Kurs.`,
    regoleConte: (quante) => `Zuordnungsregeln (${quante})`,
    regole: 'Zuordnungsregeln',
    regoleAiuto:
      'Ein Termin, dessen Titel oder Ort alle Wörter enthält, in beliebiger Reihenfolge und ' +
      'ohne Rücksicht auf Gross- und Kleinschreibung und Akzente, ist eine Stunde ' +
      'dieses Kurses. «DIC1a | DIC1b» gilt für den einen oder den anderen, «DIC1*» für jedes ' +
      'Wort, das so beginnt, und zwischen zwei Schrägstrichen — «/DIC1[ab]/» — schreibt man ' +
      'einen regulären Ausdruck. «Keine Stunde» lässt ihn übergehen: die ' +
      'Konferenz, die Sprechstunde.',
    regoleAiutoConti:
      ' Neben jeder Regel: wie viele Termine aller Kalender sie entscheidet (zugeordnet) und ' +
      'wie viele sie erkennt (zuordenbar). Erkennen mehrere Regeln denselben Termin, ' +
      'entscheidet die genaueste.',
    togliTutte: 'Alle entfernen',
    togliereRegole: (quante) =>
      `${quante === 1 ? 'Die Regel' : `Alle ${quante} Regeln`} entfernen?`,
    togliereRegoleTesto:
      'Der Abgleich errät den Kurs wieder aus Name und Uhrzeit, und die übergangenen Termine ' +
      'werden wieder vorgeschlagen. Die schon geschriebenen Stunden bleiben unberührt.',
    regoleTolte: 'Zuordnungsregeln entfernt.',
    orfane: (quante) =>
      `${plurale(quante, 'Regel nennt', 'Regeln nennen')} einen Kurs, den es nicht mehr gibt`,
    orfaneNota:
      ' Wähle einen anderen, oder entferne die Regel: Solange es so bleibt, werden ihre ' +
      'Termine nicht vorgeschlagen.',
    nessunaRegola: 'Keine Regel',
    nessunaRegolaTesto:
      'Sie entstehen auch beim Abgleich, wenn man den Kurs eines Termins wählt, den das ' +
      'Klassenbuch nicht selbst zuordnen kann.',
    rimuoviTutto: 'Alles entfernen',
    rimuoviTuttoAiuto:
      'Entfernt Kalender, Kopien und Regeln: Das Dokument ist wieder ohne Kalender',
    rimuovere: 'ICS-Kalender aus dem Dokument entfernen?',
    rimuovereTesto:
      'Alle Kalender mit ihren Kopien und alle Zuordnungsregeln werden entfernt. Die schon ' +
      'geschriebenen Stunden bleiben, wie sie sind: Der Kalender schlug vor, er ' +
      'schrieb nicht.',
    rimuovi: 'Entfernen',
    rimossi: 'ICS-Kalender aus dem Dokument entfernt.',
    calendariIcs: 'ICS-Kalender',
    calendariIcsAiuto:
      'die externen Kalender, mit denen die Stunden abgeglichen werden, und wie man ' +
      'sie liest',
    finestraAiuto:
      'Wähle, welchen du mit den Stunden abgleichen willst, oder füge einen hinzu.',
    regoleComuni:
      'Die Zuordnungsregeln — welcher Termin welcher Kurs ist — gelten für alle Kalender und ' +
      'stehen in den Einstellungen des Dokuments.',
    apriRegole: 'Regeln öffnen',
  },
  fr: {
    esempioOrigine: 'https://… ou webcal://… ou C:\\…\\horaire.ics',
    regolaVuota: 'Une règle sans texte ne correspond à rien.',
    regolaIlleggibile:
      'Cette expression régulière ne se lit pas : vérifie les parenthèses et les barres obliques.',
    nonLezione: '— ce n’est pas une leçon —',
    corsoSparito: '(cours qui n’existe plus)',
    nessunaCopia:
      'pas encore de copie : on lit depuis la source jusqu’à ce qu’on appuie sur « Mettre à jour »',
    copiaSconosciuta: 'copie de date inconnue',
    copiaDel: (quando) => `copie du ${quando}`,
    dalSito: (sito) => `depuis le site ${sito}`,
    dalFile: (file) => `depuis le fichier ${file}`,
    togliere: (nome) => `Retirer « ${nome} » ?`,
    togliereTesto:
      'Le calendrier et sa copie sortent du document : ses événements disparaissent de la ' +
      'semaine. Les règles restent pour les autres calendriers, et les leçons déjà écrites ne ' +
      'sont pas touchées.',
    nonTolto: 'Calendrier non retiré.',
    tolto: (nome) => `« ${nome} » retiré du document.`,
    serveNome: 'Un calendrier a besoin d’un nom.',
    nomeNonCambiato: 'Nom non modifié.',
    aggiornaAiuto: 'Relit la source et refait la copie dans le document',
    nonAggiornato: 'Calendrier non mis à jour.',
    confronta: 'Comparer',
    confrontaAiuto: 'Met ce calendrier en regard des leçons',
    togliNome: (nome) => `Retirer « ${nome} »`,
    cambiaOrigine: 'Changer d’adresse ou de fichier',
    cambiaOrigineAiuto:
      'La nouvelle se télécharge tout de suite, et ne remplace l’ancienne que si elle se lit.',
    restaQuello: 'Le calendrier reste celui d’avant.',
    aggiungiCalendario: 'Ajouter un calendrier',
    nonAggiunto: 'Calendrier non ajouté.',
    aggiungiAiuto: 'Télécharge le calendrier et en garde une copie dans le document',
    unFile: 'Un fichier…',
    unFileAiuto: 'Choisit un fichier .ics sur le disque et en garde une copie dans le document',
    calendari: (quanti) => `Calendriers (${quanti})`,
    nessunCalendario:
      'Aucun calendrier. Une adresse d’abonnement se télécharge tout de suite, et la copie ' +
      'reste dans le document : la comparaison fonctionne aussi sans réseau.',
    perToglierla: (rifiuto) => `${rifiuto} Pour la retirer, utilise la corbeille.`,
    giaUnaRegola: (testo) => `Il y a déjà une règle « ${testo} ».`,
    corsoNonPiu: 'cours plus présent',
    nonSiLegge: 'illisible : ne correspond à rien',
    togliRegola: (testo) => `Retirer la règle « ${testo} »`,
    regolaTolta: (testo) => `Règle « ${testo} » retirée.`,
    regolaNuova: 'Nouvelle règle : le texte à reconnaître',
    regolaNuovaSegnaposto:
      'Le texte dans le titre ou le lieu de l’événement, par exemple « DIC4a CP »',
    lezioneDi: 'est une leçon de',
    scriviTesto: 'Écris le texte que la règle doit reconnaître.',
    giaUnaRegolaCorso: (testo) =>
      `Il y a déjà une règle « ${testo} » : change son cours à cet endroit.`,
    regoleConte: (quante) => `Règles d’association (${quante})`,
    regole: 'Règles d’association',
    regoleAiuto:
      'Un événement dont le titre ou le lieu contient tous les mots, dans n’importe quel ordre ' +
      'et sans tenir compte des majuscules ni des accents, est une leçon de ce cours. ' +
      '« DIC1a | DIC1b » vaut pour l’un ou l’autre, « DIC1* » pour tout mot qui commence ainsi, ' +
      'et entre deux barres obliques — « /DIC1[ab]/ » — on écrit une expression régulière. ' +
      '« Ce n’est pas une leçon » le fait ignorer : la réunion de l’école, la réception des ' +
      'parents.',
    regoleAiutoConti:
      ' À côté de chaque règle : combien d’événements de tous les calendriers elle décide ' +
      '(attribués) et combien elle en reconnaît (attribuables). Quand plusieurs règles ' +
      'reconnaissent le même événement, c’est la plus précise qui décide.',
    togliTutte: 'Tout retirer',
    togliereRegole: (quante) =>
      `Retirer ${quante === 1 ? 'la règle' : `les ${quante} règles`} ?`,
    togliereRegoleTesto:
      'La comparaison recommencera à deviner le cours d’après le nom et l’horaire, et les ' +
      'événements ignorés seront de nouveau proposés. Les leçons déjà écrites ne sont pas ' +
      'touchées.',
    regoleTolte: 'Règles d’association retirées.',
    orfane: (quante) =>
      `${plurale(quante, 'règle nomme', 'règles nomment')} un cours qui n’existe plus`,
    orfaneNota:
      ' Choisis-en un autre, ou retire la règle : tant qu’elle reste ainsi, ses événements ne ' +
      'sont pas proposés.',
    nessunaRegola: 'Aucune règle',
    nessunaRegolaTesto:
      'Elles naissent aussi de la comparaison, en choisissant le cours d’un événement que le ' +
      'registre ne sait pas attribuer tout seul.',
    rimuoviTutto: 'Tout supprimer',
    rimuoviTuttoAiuto:
      'Retire calendriers, copies et règles : le document revient sans calendrier',
    rimuovere: 'Supprimer les calendriers ICS du document ?',
    rimuovereTesto:
      'On retire tous les calendriers avec leurs copies, et toutes les règles ' +
      'd’association. Les leçons déjà écrites restent telles quelles : le calendrier ' +
      'proposait, il n’écrivait pas.',
    rimuovi: 'Supprimer',
    rimossi: 'Calendriers ICS supprimés du document.',
    calendariIcs: 'Calendriers ICS',
    calendariIcsAiuto:
      'les calendriers externes avec lesquels on compare les leçons, et comment les lire',
    finestraAiuto: 'Choisis lequel comparer avec les leçons, ou ajoutes-en un.',
    regoleComuni:
      'Les règles d’association — quel événement est quel cours — sont communes à tous ' +
      'les calendriers, et se trouvent dans les paramètres du document.',
    apriRegole: 'Ouvrir les règles',
  },
  en: {
    esempioOrigine: 'https://… or webcal://… or C:\\…\\timetable.ics',
    regolaVuota: 'A rule without text matches nothing.',
    regolaIlleggibile:
      'This regular expression cannot be read: check the brackets and the slashes.',
    nonLezione: '— not a lesson —',
    corsoSparito: '(course that no longer exists)',
    nessunaCopia: 'no copy yet: it is read from the source until you press “Update”',
    copiaSconosciuta: 'copy of unknown date',
    copiaDel: (quando) => `copy of ${quando}`,
    dalSito: (sito) => `from the site ${sito}`,
    dalFile: (file) => `from the file ${file}`,
    togliere: (nome) => `Remove “${nome}”?`,
    togliereTesto:
      'The calendar and its copy leave the document: its events disappear from the week. The ' +
      'rules stay for the other calendars, and lessons already written are not touched.',
    nonTolto: 'Calendar not removed.',
    tolto: (nome) => `“${nome}” removed from the document.`,
    serveNome: 'A calendar needs a name.',
    nomeNonCambiato: 'Name not changed.',
    aggiornaAiuto: 'Reads the source again and remakes the copy in the document',
    nonAggiornato: 'Calendar not updated.',
    confronta: 'Compare',
    confrontaAiuto: 'Puts this calendar side by side with the lessons',
    togliNome: (nome) => `Remove “${nome}”`,
    cambiaOrigine: 'Change address or file',
    cambiaOrigineAiuto:
      'The new one is downloaded straight away, and replaces the old one only if it can be read.',
    restaQuello: 'The calendar stays as it was.',
    aggiungiCalendario: 'Add a calendar',
    nonAggiunto: 'Calendar not added.',
    aggiungiAiuto: 'Downloads the calendar and keeps a copy in the document',
    unFile: 'A file…',
    unFileAiuto: 'Chooses an .ics file from disk and keeps a copy in the document',
    calendari: (quanti) => `Calendars (${quanti})`,
    nessunCalendario:
      'No calendars. An address to subscribe to is downloaded straight away, and the copy stays ' +
      'in the document: comparing works even without a network.',
    perToglierla: (rifiuto) => `${rifiuto} To remove it, use the bin.`,
    giaUnaRegola: (testo) => `There is already a rule “${testo}”.`,
    corsoNonPiu: 'course no longer there',
    nonSiLegge: 'unreadable: matches nothing',
    togliRegola: (testo) => `Remove the rule “${testo}”`,
    regolaTolta: (testo) => `Rule “${testo}” removed.`,
    regolaNuova: 'New rule: the text to recognise',
    regolaNuovaSegnaposto: 'The text in the title or location of the event, for example “DIC4a CP”',
    lezioneDi: 'is a lesson of',
    scriviTesto: 'Write the text the rule should recognise.',
    giaUnaRegolaCorso: (testo) => `There is already a rule “${testo}”: change its course there.`,
    regoleConte: (quante) => `Matching rules (${quante})`,
    regole: 'Matching rules',
    regoleAiuto:
      'An event whose title or location contains all the words, in any order and regardless ' +
      'of capitals and accents, is a lesson of that course. “DIC1a | DIC1b” matches either ' +
      'one, “DIC1*” any word starting like that, and between two slashes — “/DIC1[ab]/” — you ' +
      'write a regular expression. “Not a lesson” makes it ignored: the staff meeting, the ' +
      'parents’ evening.',
    regoleAiutoConti:
      ' Next to each rule: how many events across all calendars it decides (matched) and how ' +
      'many it recognises (matchable). When several rules recognise the same event, the most ' +
      'specific one decides.',
    togliTutte: 'Remove all',
    togliereRegole: (quante) => `Remove ${quante === 1 ? 'the rule' : `all ${quante} rules`}?`,
    togliereRegoleTesto:
      'Comparing will go back to guessing the course from the name and the time, and ignored ' +
      'events will be proposed again. Lessons already written are not touched.',
    regoleTolte: 'Matching rules removed.',
    orfane: (quante) =>
      `${plurale(quante, 'rule names', 'rules name')} a course that no longer exists`,
    orfaneNota:
      ' Choose another one, or remove the rule: as long as it stays like this, its events are ' +
      'not proposed.',
    nessunaRegola: 'No rules',
    nessunaRegolaTesto:
      'They also come from comparing, when you choose the course of an event the register ' +
      'cannot match by itself.',
    rimuoviTutto: 'Remove everything',
    rimuoviTuttoAiuto:
      'Removes calendars, copies and rules: the document goes back to having no calendar',
    rimuovere: 'Remove the ICS calendars from the document?',
    rimuovereTesto:
      'All calendars with their copies, and all matching rules, are removed. Lessons already ' +
      'written stay as they are: the calendar proposed, it did not write.',
    rimuovi: 'Remove',
    rimossi: 'ICS calendars removed from the document.',
    calendariIcs: 'ICS calendars',
    calendariIcsAiuto:
      'the external calendars the lessons are compared with, and how to read them',
    finestraAiuto: 'Choose which one to compare with the lessons, or add one.',
    regoleComuni:
      'The matching rules — which event is which course — are shared by all calendars, and ' +
      'live in the document settings.',
    apriRegole: 'Open the rules',
  },
})
