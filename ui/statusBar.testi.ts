// I testi della barra in fondo (`statusBar.ts`). La guida cita fra virgolette
// le voci corte («da compilare», «senza rete», «casella collegata»): cambiandone
// una va cambiata anche là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'
import { CARTE, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'

const it = {
  /** «oggi», detto a voce: sta dentro la voce dell'ora. */
  oggi: 'oggi',
  nessunaOra: 'nessuna lezione in programma',
  nessunaOraTitolo:
    'Non ci sono lezioni da fare né da compilare, fra quelle che i filtri qui accanto lasciano ' +
    'vedere',
  prossima: (classe: string, quando: string, inizio: string) =>
    `prossima: ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
  daChiudere: (quante: number) => `${quante} da chiudere`,
  daChiudereTitolo:
    'Lezioni passate con il registro non a posto (appello, argomenti, consuntivo).\nScegli quale aprire',
  daChiudereMenu: 'Da chiudere',
  /** Una riga della tendina: numero dell'ora nel corso, giorno, corso. */
  oraDaChiudere: (numero: number | null, giorno: string, corso: string) =>
    `${numero ? `#${numero}` : '–'} · ${giorno} · ${corso}`,
  prossimaTitolo: (giorno: string, inizio: string) =>
    `Prossima lezione: ${giorno}${inizio ? `, alle ${inizio}` : ''}.\nApri il registro della lezione`,

  pendenze: (aperte: number) => quanti(aperte, CARTE.pendenza),
  pendenzeInRitardo: (urgenti: number, aperte: number) =>
    `${urgenti} in ritardo su ${aperte}.\nApri le ${CARTE.pendenza.plurale}`,
  pendenzeTitolo: `Quel che resta da chiudere.\nApri le ${CARTE.pendenza.plurale}`,
  /** Il numero del fascicolo di classe, accanto a quello del corso. */
  pendenzeDiClasse: (aperte: number) => `${aperte} di classe`,
  /** La prima riga del titolo, sopra «in ritardo» o «quel che resta». */
  pendenzeDelCorso: (corso: string) => `Corso ${corso}.\n`,
  pendenzeDellaClasse: (classe: string) => `Docente di classe, ${classe}.\n`,

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
  invioSpento:
    'L’invio diretto è spento: il registro prepara le bozze e le mandi tu.',
  apriPosta: '\nApri le impostazioni della posta',
  bozzeEml: 'bozze in file .eml',
  bozzeEmlTitolo:
    'La casella non è collegata: le comunicazioni non partono da qui.\n' +
    'Le bozze escono come file .eml da aprire con il programma di posta.\n' +
    'Apri le impostazioni della posta',

  versione: (frase: string, versione: string) =>
    `${frase} (Questa è la ${versione}.)\nApri gli aggiornamenti`,
  numeroVersione: (versione: string) => `v${versione}`,
  versioneInUso: (frase: string, versione: string) =>
    `Regiklass ${versione}. ${frase}\nPremi per controllare se c’è una versione nuova`,

  // Gli interruttori dei modelli.
  assistente: 'Assistente',
  letturaScansioni: 'Lettura delle scansioni',
  spentoBloccato: (nome: string, perche: string) =>
    `${nome}: spento.\n${perche}\nApri i modelli linguistici`,
  statoModello: (nome: string, acceso: boolean) =>
    `${nome}: ${acceso ? 'acceso' : 'spento'}.\n`,
  modello: (nome: string) => `Modello: ${nome}.\n`,
  apriModelli: 'Premi per aprire i modelli linguistici',
  nonPronto: (nome: string, perche: string) =>
    `${nome}: acceso, ma adesso non può lavorare.
${perche}
Apri i modelli linguistici`,
  voceNonPronta: (nome: string) => `${nome} non pronta`,
  voceModello: (nome: string, bloccato: boolean, acceso: boolean) =>
    `${nome} ${bloccato ? 'non si accende' : acceso ? 'acceso' : 'spento'}`,

  annoTitolo: (anno: string) =>
    `Anno scolastico ${anno}: il registro aperto.\n` +
    'Premi per i registri preferiti e recenti, o per aprirne un altro',
  statoDelRegistro: 'Stato del registro',
}

export const testi = catalogo(it, {
  de: {
    oggi: 'heute',
    nessunaOra: 'keine Stunde geplant',
    nessunaOraTitolo:
      'Unter denen, die die Filter daneben zeigen, gibt es keine Stunden zu halten oder ' +
      'auszufüllen',
    prossima: (classe, quando, inizio) =>
      `nächste: ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
    daChiudere: (quante) => `${quante} abzuschliessen`,
    daChiudereTitolo:
      'Vergangene Stunden mit unvollständigem Eintrag (Präsenzkontrolle, Themen, Rückblick).\n' +
      'Wähle, welche du öffnest',
    daChiudereMenu: 'Abzuschliessen',
    oraDaChiudere: (numero, giorno, corso) => `${numero ? `#${numero}` : '–'} · ${giorno} · ${corso}`,
    prossimaTitolo: (giorno, inizio) =>
      `Nächste Stunde: ${giorno}${inizio ? `, um ${inizio}` : ''}.\n` +
      'Öffne das Klassenbuch der Stunde',
    pendenze: (aperte) => quanti(aperte, lessico().pendenza),
    pendenzeInRitardo: (urgenti, aperte) =>
      `${urgenti} von ${aperte} überfällig.\nÖffne die ${lessico().pendenza.plurale}`,
    pendenzeTitolo: 'Was noch abzuschliessen ist.\nÖffne die Pendenzen',
    pendenzeDiClasse: (aperte) => `${aperte} der Klasse`,
    pendenzeDelCorso: (corso) => `Kurs ${corso}.\n`,
    pendenzeDellaClasse: (classe) => `Klassenlehrperson, ${classe}.\n`,
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
    invioAcceso:
      'Das direkte Senden ist eingeschaltet: Die Mitteilungen gehen von hier aus.',
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
    numeroVersione: (versione) => `v${versione}`,
    versioneInUso: (frase, versione) =>
      `Regiklass ${versione}. ${frase}\nKlicken, um nach einer neuen Version zu suchen`,
    assistente: 'Assistent',
    letturaScansioni: 'Scans lesen',
    spentoBloccato: (nome, perche) =>
      `${nome}: aus.\n${perche}\nÖffne die Sprachmodelle`,
    statoModello: (nome, acceso) => `${nome}: ${acceso ? 'an' : 'aus'}.\n`,
    modello: (nome) => `Modell: ${nome}.\n`,
    apriModelli: 'Klicken, um die Sprachmodelle zu öffnen',
    nonPronto: (nome, perche) =>
      `${nome}: an, kann aber gerade nicht arbeiten.
${perche}
Öffne die Sprachmodelle`,
    voceNonPronta: (nome) => `${nome} nicht bereit`,
    voceModello: (nome, bloccato, acceso) =>
      `${nome} ${bloccato ? 'startet nicht' : acceso ? 'an' : 'aus'}`,
    annoTitolo: (anno) =>
      `Schuljahr ${anno}: das offene Klassenbuch.\n` +
      'Klicken für die bevorzugten und zuletzt geöffneten Klassenbücher, oder um ein anderes ' +
      'zu öffnen',
    statoDelRegistro: 'Status des Klassenbuchs',
  },
  fr: {
    oggi: 'aujourd’hui',
    nessunaOra: 'aucune leçon prévue',
    nessunaOraTitolo:
      'Il n’y a pas de leçons à donner ni à remplir, parmi celles que les filtres ci-contre ' +
      'laissent voir',
    prossima: (classe, quando, inizio) =>
      `prochaine : ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
    daChiudere: (quante) => `${quante} à clôturer`,
    daChiudereTitolo:
      'Leçons passées dont le registre n’est pas en ordre (appel, sujets, bilan).\n' +
      'Choisis laquelle ouvrir',
    daChiudereMenu: 'À clôturer',
    oraDaChiudere: (numero, giorno, corso) => `${numero ? `#${numero}` : '–'} · ${giorno} · ${corso}`,
    prossimaTitolo: (giorno, inizio) =>
      `Prochaine leçon : ${giorno}${inizio ? `, à ${inizio}` : ''}.\nOuvre le registre de la leçon`,
    pendenze: (aperte) => quanti(aperte, lessico().pendenza),
    pendenzeInRitardo: (urgenti, aperte) =>
      `${urgenti} en retard sur ${aperte}.\nOuvre les ${lessico().pendenza.plurale}`,
    pendenzeTitolo: 'Ce qui reste à fermer.\nOuvre les tâches en suspens',
    pendenzeDiClasse: (aperte) => `${aperte} de classe`,
    pendenzeDelCorso: (corso) => `Cours ${corso}.\n`,
    pendenzeDellaClasse: (classe) => `Maître de classe, ${classe}.\n`,
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
    invioAcceso:
      'L’envoi direct est activé : les communications partent d’ici.',
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
    numeroVersione: (versione) => `v${versione}`,
    versioneInUso: (frase, versione) =>
      `Regiklass ${versione}. ${frase}\nClique pour chercher une nouvelle version`,
    assistente: 'Assistant',
    letturaScansioni: 'Lecture des scans',
    spentoBloccato: (nome, perche) =>
      `${nome} : désactivé.\n${perche}\nOuvre les modèles de langage`,
    statoModello: (nome, acceso) =>
      `${nome} : ${acceso ? 'activé' : 'désactivé'}.\n`,
    modello: (nome) => `Modèle : ${nome}.\n`,
    apriModelli: 'Clique pour ouvrir les modèles de langage',
    nonPronto: (nome, perche) =>
      `${nome} : activé, mais ne peut pas travailler maintenant.
${perche}
Ouvre les modèles de langage`,
    voceNonPronta: (nome) => `${nome} pas prête`,
    voceModello: (nome, bloccato, acceso) =>
      `${nome} ${bloccato ? 'ne démarre pas' : acceso ? 'activé' : 'désactivé'}`,
    annoTitolo: (anno) =>
      `Année scolaire ${anno} : le registre ouvert.\n` +
      'Clique pour les registres favoris et récents, ou pour en ouvrir un autre',
    statoDelRegistro: 'État du registre',
  },
  en: {
    oggi: 'today',
    nessunaOra: 'no lessons scheduled',
    nessunaOraTitolo:
      'There are no lessons to teach or to fill in, among those the filters alongside let you see',
    prossima: (classe, quando, inizio) =>
      `next: ${classe} · ${quando}${inizio ? ` ${inizio}` : ''}`,
    daChiudere: (quante) => `${quante} to close`,
    daChiudereTitolo:
      'Past lessons whose register is not complete (roll call, topics, review).\n' +
      'Choose which one to open',
    daChiudereMenu: 'To close',
    oraDaChiudere: (numero, giorno, corso) => `${numero ? `#${numero}` : '–'} · ${giorno} · ${corso}`,
    prossimaTitolo: (giorno, inizio) =>
      `Next lesson: ${giorno}${inizio ? `, at ${inizio}` : ''}.\nOpen the lesson’s register`,
    pendenze: (aperte) => quanti(aperte, lessico().pendenza),
    pendenzeInRitardo: (urgenti, aperte) =>
      `${urgenti} of ${aperte} overdue.\nOpen the ${lessico().pendenza.plurale}`,
    pendenzeTitolo: 'What is still to be closed.\nOpen the pending items',
    pendenzeDiClasse: (aperte) => `${aperte} for the class`,
    pendenzeDelCorso: (corso) => `Course ${corso}.\n`,
    pendenzeDellaClasse: (classe) => `Class teacher, ${classe}.\n`,
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
    invioSpento:
      'Direct sending is off: the register prepares the drafts and you send them.',
    apriPosta: '\nOpen the mail settings',
    bozzeEml: 'drafts as .eml files',
    bozzeEmlTitolo:
      'The mailbox is not connected: messages do not go out from here.\n' +
      'Drafts come out as .eml files to open with the mail program.\n' +
      'Open the mail settings',
    versione: (frase, versione) =>
      `${frase} (This is ${versione}.)\nOpen the updates`,
    numeroVersione: (versione) => `v${versione}`,
    versioneInUso: (frase, versione) =>
      `Regiklass ${versione}. ${frase}\nClick to check for a new version`,
    assistente: 'Assistant',
    letturaScansioni: 'Reading scans',
    spentoBloccato: (nome, perche) =>
      `${nome}: off.\n${perche}\nOpen the language models`,
    statoModello: (nome, acceso) => `${nome}: ${acceso ? 'on' : 'off'}.\n`,
    modello: (nome) => `Model: ${nome}.\n`,
    apriModelli: 'Click to open the language models',
    nonPronto: (nome, perche) =>
      `${nome}: on, but it can’t work right now.
${perche}
Open the language models`,
    voceNonPronta: (nome) => `${nome} not ready`,
    voceModello: (nome, bloccato, acceso) =>
      `${nome} ${bloccato ? 'won’t start' : acceso ? 'on' : 'off'}`,
    annoTitolo: (anno) =>
      `School year ${anno}: the open register.\n` +
      'Click for favourite and recent registers, or to open another one',
    statoDelRegistro: 'Register status',
  },
})
