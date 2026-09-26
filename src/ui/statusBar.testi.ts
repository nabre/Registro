// I testi della barra in fondo (`statusBar.ts`). La guida cita fra virgolette
// le voci corte («da compilare», «senza rete», «casella collegata»): cambiandone
// una va cambiata anche là, in tutte le lingue.

import { catalogo } from '../i18n/index.js'
import { CARTE, quanti } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'

const it = {
  corso: 'Corso',
  corsoTitolo:
    'Restringe a un corso l’ora qui accanto e il calendario. Non cambia il corso del registro.',
  tuttiICorsi: 'Tutti i corsi',
  periodoTitolo:
    'Il periodo su cui sono fatti i conti — medie, assenze, ore — e in cui si cerca l’ora qui ' +
    'accanto',
  annoIntero: 'Anno intero',

  /** «oggi», detto a voce: sta dentro la voce dell'ora. */
  oggi: 'oggi',
  nessunaOra: 'nessuna ora in programma',
  nessunaOraTitolo:
    'Non ci sono lezioni da fare né da compilare, fra quelle che i filtri qui accanto lasciano ' +
    'vedere',
  daCompilare: (classe: string, quando: string) => `da compilare: ${classe} · ${quando}`,
  prossima: (classe: string, quando: string, inizio: string) =>
    `prossima: ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
  daCompilareTitolo: (giorno: string) =>
    `L'ora di ${giorno} è passata e il suo registro non è a posto.\nApri il registro della lezione`,
  prossimaTitolo: (giorno: string, inizio: string) =>
    `Prossima ora: ${giorno}${inizio ? `, alle ${inizio}` : ''}.\nApri il registro della lezione`,

  pendenze: (aperte: number) => quanti(aperte, CARTE.pendenza),
  pendenzeInRitardo: (urgenti: number, aperte: number) =>
    `${urgenti} in ritardo su ${aperte}.\nApri le ${CARTE.pendenza.plurale}`,
  pendenzeTitolo: `Quel che resta da chiudere.\nApri le ${CARTE.pendenza.plurale}`,

  legge: (numero: number, totale: number) => `legge ${numero} di ${totale}`,
  staLeggendo: (che: string) => `Sta leggendo ${che}`,
  staLeggendoTutto: 'Sta leggendo le scansioni dei PDF in attesa',

  senzaRete: 'senza rete',
  senzaReteTitolo:
    'Il computer non è in rete: le comunicazioni non partono e le scansioni non si leggono.\n' +
    'Quel che si scrive nel registro si salva lo stesso, sul disco.',
  spedisceDaSe: 'spedisce da sé',
  casellaCollegata: 'casella collegata',
  collegataA: (server: string, mittente: string | null) =>
    `Collegata a ${server}${mittente ? ` come ${mittente}` : ''}.\n`,
  invioAcceso: 'L’invio diretto è acceso: le comunicazioni partono da qui.',
  invioSpento: 'L’invio diretto è spento: il registro prepara le bozze e le mandi tu.',
  apriPosta: '\nApri le impostazioni della posta',
  bozzeEml: 'bozze in file .eml',
  bozzeEmlTitolo:
    'La casella non è collegata: le comunicazioni non partono da qui.\n' +
    'Le bozze escono come file .eml da aprire con il programma di posta.\n' +
    'Apri le impostazioni della posta',

  versione: (frase: string, versione: string) =>
    `${frase} (Questa è la ${versione}.)\nApri gli aggiornamenti`,

  // Gli interruttori dei modelli.
  assistente: 'Assistente',
  letturaScansioni: 'Lettura delle scansioni',
  spentoBloccato: (nome: string, perche: string) =>
    `${nome}: spento.\n${perche}\nApri i modelli linguistici`,
  statoModello: (nome: string, acceso: boolean) => `${nome}: ${acceso ? 'acceso' : 'spento'}.\n`,
  modello: (nome: string) => `Modello: ${nome}.\n`,
  premiPerSpegnere: 'Premi per spegnere',
  premiPerAccendere: 'Premi per accendere',
  voceModello: (nome: string, bloccato: boolean, acceso: boolean) =>
    `${nome} ${bloccato ? 'non si accende' : acceso ? 'acceso' : 'spento'}`,

  annoTitolo: (anno: string) =>
    `Anno scolastico ${anno}: il registro aperto.\n` +
    'Premi per i registri preferiti e recenti, o per aprirne un altro',
  statoDelRegistro: 'Stato del registro',
}

export const testi = catalogo(it, {
  de: {
    corso: 'Kurs',
    corsoTitolo:
      'Beschränkt die Stunde daneben und den Kalender auf einen Kurs. Ändert nicht den Kurs des ' +
      'Klassenbuchs.',
    tuttiICorsi: 'Alle Kurse',
    periodoTitolo:
      'Der Zeitraum, über den gerechnet wird — Durchschnitte, Absenzen, Stunden — und in dem die ' +
      'Stunde daneben gesucht wird',
    annoIntero: 'Ganzes Jahr',
    oggi: 'heute',
    nessunaOra: 'keine Stunde geplant',
    nessunaOraTitolo:
      'Unter denen, die die Filter daneben zeigen, gibt es keine Stunden zu halten oder ' +
      'auszufüllen',
    daCompilare: (classe, quando) => `auszufüllen: ${classe} · ${quando}`,
    prossima: (classe, quando, inizio) =>
      `nächste: ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
    daCompilareTitolo: (giorno) =>
      `Die Stunde vom ${giorno} ist vorbei und ihr Eintrag ist nicht vollständig.\n` +
      'Öffne das Klassenbuch der Stunde',
    prossimaTitolo: (giorno, inizio) =>
      `Nächste Stunde: ${giorno}${inizio ? `, um ${inizio}` : ''}.\n` +
      'Öffne das Klassenbuch der Stunde',
    pendenze: (aperte) => quanti(aperte, lessico().pendenza),
    pendenzeInRitardo: (urgenti, aperte) =>
      `${urgenti} von ${aperte} überfällig.\nÖffne die ${lessico().pendenza.plurale}`,
    pendenzeTitolo: 'Was noch abzuschliessen ist.\nÖffne die Pendenzen',
    legge: (numero, totale) => `liest ${numero} von ${totale}`,
    staLeggendo: (che) => `Liest ${che}`,
    staLeggendoTutto: 'Liest die Scans der wartenden PDFs',
    senzaRete: 'kein Netz',
    senzaReteTitolo:
      'Der Computer ist nicht im Netz: Die Mitteilungen gehen nicht hinaus und die Scans werden ' +
      'nicht gelesen.\nWas man im Klassenbuch schreibt, wird trotzdem gespeichert, auf der ' +
      'Festplatte.',
    spedisceDaSe: 'sendet selbst',
    casellaCollegata: 'Postfach verbunden',
    collegataA: (server, mittente) =>
      `Verbunden mit ${server}${mittente ? ` als ${mittente}` : ''}.\n`,
    invioAcceso: 'Das direkte Senden ist eingeschaltet: Die Mitteilungen gehen von hier aus.',
    invioSpento:
      'Das direkte Senden ist ausgeschaltet: Das Klassenbuch bereitet Entwürfe vor, und du ' +
      'sendest sie.',
    apriPosta: '\nÖffne die E-Mail-Einstellungen',
    bozzeEml: 'Entwürfe als .eml-Dateien',
    bozzeEmlTitolo:
      'Das Postfach ist nicht verbunden: Die Mitteilungen gehen nicht von hier aus.\n' +
      'Die Entwürfe entstehen als .eml-Dateien, die man mit dem E-Mail-Programm öffnet.\n' +
      'Öffne die E-Mail-Einstellungen',
    versione: (frase, versione) =>
      `${frase} (Dies ist die ${versione}.)\nÖffne die Aktualisierungen`,
    assistente: 'Assistent',
    letturaScansioni: 'Scans lesen',
    spentoBloccato: (nome, perche) => `${nome}: aus.\n${perche}\nÖffne die Sprachmodelle`,
    statoModello: (nome, acceso) => `${nome}: ${acceso ? 'an' : 'aus'}.\n`,
    modello: (nome) => `Modell: ${nome}.\n`,
    premiPerSpegnere: 'Klicken zum Ausschalten',
    premiPerAccendere: 'Klicken zum Einschalten',
    voceModello: (nome, bloccato, acceso) =>
      `${nome} ${bloccato ? 'startet nicht' : acceso ? 'an' : 'aus'}`,
    annoTitolo: (anno) =>
      `Schuljahr ${anno}: das offene Klassenbuch.\n` +
      'Klicken für die bevorzugten und zuletzt geöffneten Klassenbücher, oder um ein anderes ' +
      'zu öffnen',
    statoDelRegistro: 'Status des Klassenbuchs',
  },
  fr: {
    corso: 'Cours',
    corsoTitolo:
      'Limite à un cours la leçon ci-contre et le calendrier. Ne change pas le cours du registre.',
    tuttiICorsi: 'Tous les cours',
    periodoTitolo:
      'La période sur laquelle portent les calculs — moyennes, absences, heures — et où l’on ' +
      'cherche la leçon ci-contre',
    annoIntero: 'Année entière',
    oggi: 'aujourd’hui',
    nessunaOra: 'aucune leçon prévue',
    nessunaOraTitolo:
      'Il n’y a pas de leçons à donner ni à remplir, parmi celles que les filtres ci-contre ' +
      'laissent voir',
    daCompilare: (classe, quando) => `à remplir : ${classe} · ${quando}`,
    prossima: (classe, quando, inizio) =>
      `prochaine : ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
    daCompilareTitolo: (giorno) =>
      `La leçon du ${giorno} est passée et son registre n’est pas en ordre.\n` +
      'Ouvre le registre de la leçon',
    prossimaTitolo: (giorno, inizio) =>
      `Prochaine leçon : ${giorno}${inizio ? `, à ${inizio}` : ''}.\nOuvre le registre de la leçon`,
    pendenze: (aperte) => quanti(aperte, lessico().pendenza),
    pendenzeInRitardo: (urgenti, aperte) =>
      `${urgenti} en retard sur ${aperte}.\nOuvre les ${lessico().pendenza.plurale}`,
    pendenzeTitolo: 'Ce qui reste à fermer.\nOuvre les tâches en suspens',
    legge: (numero, totale) => `lit ${numero} sur ${totale}`,
    staLeggendo: (che) => `Lecture de ${che}`,
    staLeggendoTutto: 'Lecture des scans des PDF en attente',
    senzaRete: 'hors ligne',
    senzaReteTitolo:
      'L’ordinateur n’est pas en réseau : les communications ne partent pas et les scans ne sont ' +
      'pas lus.\nCe qu’on écrit dans le registre s’enregistre quand même, sur le disque.',
    spedisceDaSe: 'envoie tout seul',
    casellaCollegata: 'boîte connectée',
    collegataA: (server, mittente) =>
      `Connectée à ${server}${mittente ? ` en tant que ${mittente}` : ''}.\n`,
    invioAcceso: 'L’envoi direct est activé : les communications partent d’ici.',
    invioSpento:
      'L’envoi direct est désactivé : le registre prépare les brouillons et c’est toi qui les ' +
      'envoies.',
    apriPosta: '\nOuvre les paramètres du courrier',
    bozzeEml: 'brouillons en fichiers .eml',
    bozzeEmlTitolo:
      'La boîte n’est pas connectée : les communications ne partent pas d’ici.\n' +
      'Les brouillons sortent en fichiers .eml à ouvrir avec le programme de courrier.\n' +
      'Ouvre les paramètres du courrier',
    versione: (frase, versione) =>
      `${frase} (Tu as la ${versione}.)\nOuvre les mises à jour`,
    assistente: 'Assistant',
    letturaScansioni: 'Lecture des scans',
    spentoBloccato: (nome, perche) =>
      `${nome} : désactivé.\n${perche}\nOuvre les modèles de langage`,
    statoModello: (nome, acceso) => `${nome} : ${acceso ? 'activé' : 'désactivé'}.\n`,
    modello: (nome) => `Modèle : ${nome}.\n`,
    premiPerSpegnere: 'Clique pour désactiver',
    premiPerAccendere: 'Clique pour activer',
    voceModello: (nome, bloccato, acceso) =>
      `${nome} ${bloccato ? 'ne démarre pas' : acceso ? 'activé' : 'désactivé'}`,
    annoTitolo: (anno) =>
      `Année scolaire ${anno} : le registre ouvert.\n` +
      'Clique pour les registres favoris et récents, ou pour en ouvrir un autre',
    statoDelRegistro: 'État du registre',
  },
  en: {
    corso: 'Course',
    corsoTitolo:
      'Narrows the lesson alongside and the calendar to one course. It does not change the ' +
      'register’s course.',
    tuttiICorsi: 'All courses',
    periodoTitolo:
      'The period the counts are made over — averages, absences, lessons — and in which the ' +
      'lesson alongside is looked for',
    annoIntero: 'Whole year',
    oggi: 'today',
    nessunaOra: 'no lessons scheduled',
    nessunaOraTitolo:
      'There are no lessons to teach or to fill in, among those the filters alongside let you see',
    daCompilare: (classe, quando) => `to fill in: ${classe} · ${quando}`,
    prossima: (classe, quando, inizio) =>
      `next: ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
    daCompilareTitolo: (giorno) =>
      `The lesson on ${giorno} is over and its register is not complete.\n` +
      'Open the lesson’s register',
    prossimaTitolo: (giorno, inizio) =>
      `Next lesson: ${giorno}${inizio ? `, at ${inizio}` : ''}.\nOpen the lesson’s register`,
    pendenze: (aperte) => quanti(aperte, lessico().pendenza),
    pendenzeInRitardo: (urgenti, aperte) =>
      `${urgenti} of ${aperte} overdue.\nOpen the ${lessico().pendenza.plurale}`,
    pendenzeTitolo: 'What is still to be closed.\nOpen the pending items',
    legge: (numero, totale) => `reading ${numero} of ${totale}`,
    staLeggendo: (che) => `Reading ${che}`,
    staLeggendoTutto: 'Reading the scans of the waiting PDFs',
    senzaRete: 'offline',
    senzaReteTitolo:
      'The computer is not online: messages do not go out and scans are not read.\n' +
      'Whatever you write in the register is still saved, on the disk.',
    spedisceDaSe: 'sends by itself',
    casellaCollegata: 'mailbox connected',
    collegataA: (server, mittente) =>
      `Connected to ${server}${mittente ? ` as ${mittente}` : ''}.\n`,
    invioAcceso: 'Direct sending is on: messages go out from here.',
    invioSpento: 'Direct sending is off: the register prepares the drafts and you send them.',
    apriPosta: '\nOpen the mail settings',
    bozzeEml: 'drafts as .eml files',
    bozzeEmlTitolo:
      'The mailbox is not connected: messages do not go out from here.\n' +
      'Drafts come out as .eml files to open with the mail program.\n' +
      'Open the mail settings',
    versione: (frase, versione) => `${frase} (This is ${versione}.)\nOpen the updates`,
    assistente: 'Assistant',
    letturaScansioni: 'Reading scans',
    spentoBloccato: (nome, perche) => `${nome}: off.\n${perche}\nOpen the language models`,
    statoModello: (nome, acceso) => `${nome}: ${acceso ? 'on' : 'off'}.\n`,
    modello: (nome) => `Model: ${nome}.\n`,
    premiPerSpegnere: 'Click to turn off',
    premiPerAccendere: 'Click to turn on',
    voceModello: (nome, bloccato, acceso) =>
      `${nome} ${bloccato ? 'won’t start' : acceso ? 'on' : 'off'}`,
    annoTitolo: (anno) =>
      `School year ${anno}: the open register.\n` +
      'Click for favourite and recent registers, or to open another one',
    statoDelRegistro: 'Register status',
  },
})
