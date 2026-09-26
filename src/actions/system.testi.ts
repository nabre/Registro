// I testi di `system.ts`: impostazioni, esportazioni, riparazioni, chiamate, posta.
// `voceRecapiti` nomina la voce delle impostazioni a cui rimandano tre messaggi.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  voceRecapiti: 'nelle impostazioni, alla voce «Comunicazioni › Chiamate e mail dall’anagrafica»',
  udBloccata: (minuti: number, conAppello: number) =>
    `L’unità didattica resta di ${minuti} minuti: ` +
    `${plurale(conAppello, 'ora ha', 'ore hanno')} già l’appello, contato in UD di quella durata.`,
  primaOraNonValida: 'La prima ora della giornata non è un orario.',
  ultimaOraNonValida: 'L’ultima ora della giornata non è un orario.',
  giornataRovescia: 'La giornata deve cominciare prima di finire.',
  almenoUnGiorno: 'Almeno un giorno deve restare visibile.',
  giorniFuori: 'I giorni visibili vanno da 1 (lunedì) a 7 (domenica).',
  rimaste: (n: number) =>
    `${plurale(n, 'ora uscirebbe', 'ore uscirebbero')} dal giorno con le UD nuove: ` +
    `${n === 1 ? 'è rimasta' : 'sono rimaste'} com’erano, da sistemare a mano.`,
  ridisposte: (n: number) =>
    `${plurale(n, 'ora cadeva', 'ore cadevano')} su una pausa della giornata: ` +
    `${n === 1 ? 'spezzata e spostata' : 'spezzate e spostate'}, con le stesse UD.`,
  nonRiconosciuta: (chiave: string) => `Impostazione non riconosciuta: ${chiave}.`,
  senzaPercorso: (chiave: string) => `«${chiave}» non tiene un percorso.`,
  percorsoRifiutato: 'Percorso non accettato.',
  corsoSenzaClasse: 'Il corso non è di nessuna classe.',
  nessunMomento: 'Nessun momento di valutazione da esportare.',
  nonScritto: 'Non ho potuto scrivere il file esportato.',
  nienteDaRiparare: 'Non c’è niente da riparare.',
  nessunDocumento: 'Nessun documento aperto.',
  nonComponibile: (numero: string) => `«${numero}» non è un numero da comporre.`,
  chiamateSpente: (voce: string) => `Le chiamate dal registro sono spente: si accendono ${voce}.`,
  nessunoRisponde: (modo: string, voce: string) =>
    `Nessun programma ha risposto a «${modo}:». Si sceglie quale ${voce}.`,
  nonIndirizzo: (indirizzo: string) => `«${indirizzo}» non è un indirizzo di posta.`,
  postaSpenta: (voce: string) => `Scrivere dal registro è spento: si accende ${voce}.`,
  nessunaPosta: 'Nessun programma di posta ha risposto.',
  outlookNonAperto: (voce: string) =>
    'Outlook non si è aperto: ho scritto con il programma predefinito. Il percorso di ' +
    `OUTLOOK.EXE si indica ${voce}.`,
}

export const testi = catalogo(it, {
  de: {
    voceRecapiti: 'in den Einstellungen unter «Anrufe und Mails aus den Personalien»',
    udBloccata: (minuti, conAppello) =>
      `Die Lektion bleibt bei ${minuti} Minuten: ` +
      `${plurale(conAppello, 'Stunde hat', 'Stunden haben')} schon eine ` +
      'Präsenzkontrolle, gezählt in Lektionen dieser Dauer.',
    primaOraNonValida: 'Die erste Stunde des Tages ist keine gültige Uhrzeit.',
    ultimaOraNonValida: 'Die letzte Stunde des Tages ist keine gültige Uhrzeit.',
    giornataRovescia: 'Der Tag muss beginnen, bevor er endet.',
    almenoUnGiorno: 'Mindestens ein Tag muss sichtbar bleiben.',
    giorniFuori: 'Die sichtbaren Tage gehen von 1 (Montag) bis 7 (Sonntag).',
    rimaste: (n) =>
      `${plurale(n, 'Stunde würde', 'Stunden würden')} mit den neuen ` +
      `Lektionen über den Tag hinausgehen: ${n === 1 ? 'Sie ist' : 'Sie sind'} unverändert ` +
      `geblieben und ${n === 1 ? 'muss' : 'müssen'} von Hand angepasst werden.`,
    ridisposte: (n) =>
      `${plurale(n, 'Stunde fiel', 'Stunden fielen')} auf eine Pause im ` +
      'Tagesablauf: aufgeteilt und verschoben, mit denselben Lektionen.',
    nonRiconosciuta: (chiave) => `Einstellung nicht erkannt: ${chiave}.`,
    senzaPercorso: (chiave) => `«${chiave}» enthält keinen Pfad.`,
    percorsoRifiutato: 'Pfad nicht akzeptiert.',
    corsoSenzaClasse: 'Der Kurs gehört zu keiner Klasse.',
    nessunMomento: 'Keine Leistungsbeurteilung zum Exportieren.',
    nonScritto: 'Die exportierte Datei konnte nicht geschrieben werden.',
    nienteDaRiparare: 'Es gibt nichts zu reparieren.',
    nessunDocumento: 'Kein Dokument geöffnet.',
    nonComponibile: (numero) => `«${numero}» ist keine wählbare Nummer.`,
    chiamateSpente: (voce) =>
      `Anrufe aus dem Klassenbuch sind ausgeschaltet: Schalte sie ${voce} ein.`,
    nessunoRisponde: (modo, voce) =>
      `Kein Programm hat auf «${modo}:» reagiert. Wähle ${voce}, welches.`,
    nonIndirizzo: (indirizzo) => `«${indirizzo}» ist keine E-Mail-Adresse.`,
    postaSpenta: (voce) =>
      `Schreiben aus dem Klassenbuch ist ausgeschaltet: Schalte es ${voce} ein.`,
    nessunaPosta: 'Kein E-Mail-Programm hat reagiert.',
    outlookNonAperto: (voce) =>
      'Outlook hat sich nicht geöffnet: Ich habe mit dem Standardprogramm geschrieben. ' +
      `Den Pfad zu OUTLOOK.EXE gibst du ${voce} an.`,
  },
  fr: {
    voceRecapiti: 'dans les paramètres, sous « Appels et e-mails depuis les données personnelles »',
    udBloccata: (minuti, conAppello) =>
      `La période reste de ${minuti} minutes : ` +
      `${plurale(conAppello, 'leçon a', 'leçons ont')} déjà l’appel, ` +
      'compté en périodes de cette durée.',
    primaOraNonValida: 'La première heure de la journée n’est pas une heure valable.',
    ultimaOraNonValida: 'La dernière heure de la journée n’est pas une heure valable.',
    giornataRovescia: 'La journée doit commencer avant de finir.',
    almenoUnGiorno: 'Au moins un jour doit rester visible.',
    giorniFuori: 'Les jours visibles vont de 1 (lundi) à 7 (dimanche).',
    rimaste: (n) =>
      `${plurale(n, 'leçon sortirait', 'leçons sortiraient')} de la journée avec les nouvelles ` +
      'périodes : ' +
      `${n === 1 ? 'elle est restée telle quelle' : 'elles sont restées telles quelles'}, ` +
      'à corriger à la main.',
    ridisposte: (n) =>
      `${plurale(n, 'leçon tombait', 'leçons tombaient')} sur une pause de la journée : ` +
      `${n === 1 ? 'scindée et déplacée' : 'scindées et déplacées'}, avec les mêmes périodes.`,
    nonRiconosciuta: (chiave) => `Paramètre non reconnu : ${chiave}.`,
    senzaPercorso: (chiave) => `« ${chiave} » ne contient pas de chemin.`,
    percorsoRifiutato: 'Chemin non accepté.',
    corsoSenzaClasse: 'Le cours n’appartient à aucune classe.',
    nessunMomento: 'Aucune évaluation à exporter.',
    nonScritto: 'Je n’ai pas pu écrire le fichier exporté.',
    nienteDaRiparare: 'Il n’y a rien à réparer.',
    nessunDocumento: 'Aucun document ouvert.',
    nonComponibile: (numero) => `« ${numero} » n’est pas un numéro à composer.`,
    chiamateSpente: (voce) =>
      `Les appels depuis le registre sont désactivés : active-les ${voce}.`,
    nessunoRisponde: (modo, voce) =>
      `Aucun programme n’a répondu à « ${modo}: ». Choisis lequel ${voce}.`,
    nonIndirizzo: (indirizzo) => `« ${indirizzo} » n’est pas une adresse e-mail.`,
    postaSpenta: (voce) => `Écrire depuis le registre est désactivé : active-le ${voce}.`,
    nessunaPosta: 'Aucun programme de messagerie n’a répondu.',
    outlookNonAperto: (voce) =>
      'Outlook ne s’est pas ouvert : j’ai écrit avec le programme par défaut. Indique le chemin ' +
      `d’OUTLOOK.EXE ${voce}.`,
  },
  en: {
    voceRecapiti: 'in the settings, under “Calls and emails from the personal details”',
    udBloccata: (minuti, conAppello) =>
      `The period stays at ${minuti} minutes: ` +
      `${plurale(conAppello, 'lesson already has', 'lessons already have')} attendance, ` +
      'counted in periods of that length.',
    primaOraNonValida: 'The first hour of the day isn’t a valid time.',
    ultimaOraNonValida: 'The last hour of the day isn’t a valid time.',
    giornataRovescia: 'The day must start before it ends.',
    almenoUnGiorno: 'At least one day must stay visible.',
    giorniFuori: 'The visible days go from 1 (Monday) to 7 (Sunday).',
    rimaste: (n) =>
      `${plurale(n, 'lesson would', 'lessons would')} run past the day with the new periods: ` +
      `${n === 1 ? 'it has' : 'they have'} been left as ${n === 1 ? 'it was' : 'they were'}, ` +
      'to fix by hand.',
    ridisposte: (n) =>
      `${plurale(n, 'lesson fell', 'lessons fell')} on a break in the day: ` +
      'split and moved, with the same periods.',
    nonRiconosciuta: (chiave) => `Setting not recognised: ${chiave}.`,
    senzaPercorso: (chiave) => `“${chiave}” doesn’t hold a path.`,
    percorsoRifiutato: 'Path not accepted.',
    corsoSenzaClasse: 'The course doesn’t belong to any class.',
    nessunMomento: 'No assessments to export.',
    nonScritto: 'I couldn’t write the exported file.',
    nienteDaRiparare: 'There’s nothing to repair.',
    nessunDocumento: 'No document open.',
    nonComponibile: (numero) => `“${numero}” isn’t a number that can be dialled.`,
    chiamateSpente: (voce) => `Calls from the register are switched off: switch them on ${voce}.`,
    nessunoRisponde: (modo, voce) =>
      `No program responded to “${modo}:”. Choose which one ${voce}.`,
    nonIndirizzo: (indirizzo) => `“${indirizzo}” isn’t an email address.`,
    postaSpenta: (voce) => `Writing from the register is switched off: switch it on ${voce}.`,
    nessunaPosta: 'No email program responded.',
    outlookNonAperto: (voce) =>
      'Outlook didn’t open: I wrote with the default program. Set the path to ' +
      `OUTLOOK.EXE ${voce}.`,
  },
})
