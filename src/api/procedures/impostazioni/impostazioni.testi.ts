// I testi di `impostazioni.salva`: titolo e aiuti dei campi delle impostazioni
// del documento. Si leggono al momento dell'uso (`aiuto: () => t().passo`), mai
// al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  salva: {
    titolo: 'Le impostazioni del documento d’anno, tutte insieme',
    impostazioni: 'Le impostazioni del documento d’anno, intere',
    liste:
      'Le voci delle tendine cambiate: nome della lista → voci. Quel che non è una lista ' +
      'riconosciuta si perde',
    passo: 'Il passo dei voti inseribili: 0.25 sono mezzi e quarti',
    passoFineSemestre: 'Il passo della nota di fine semestre. Zero vuol dire «non arrotondare»',
    sogliaAssenza: 'In cifra tonda: 20 è il venti per cento. Zero spegne la segnalazione',
    minutiUd:
      'Quanti minuti dura un’unità didattica: interi, da 20 a 120. Non cambia più quando ' +
      'un’ora ha già l’appello',
    giorniVisibili: '1 = lunedì … 7 = domenica. Quel che cade fuori lo scarta il dominio',
    inizioPrimaPausa: 'Quando comincia la prima pausa della giornata',
    durataPausa: 'Minuti interi, da 1 a 120',
    dopoUd:
      'Unità didattiche intere fra la fine della pausa precedente e l’inizio di questa, da 1 a 12',
    seguenti: 'Le pause dopo la prima, in ordine: al massimo sette',
    pause:
      'Le pause della giornata: le lezioni nuove finiscono le UD prima e le riprendono dopo. ' +
      'Assenti, nessuna',
    pdfAutomatici: 'Quando il registro rifà da sé i PDF di un corso',
    origine: 'Un indirizzo https:// o webcal://, o il percorso di un file .ics',
    copiatoIl: 'Quando si è fatta la copia nel documento, in ISO',
    regola:
      'Come si riconoscono gli eventi: parole in qualsiasi ordine, varianti con |, ' +
      'prefisso con * in fondo, espressione regolare fra /…/',
    corsoDellaRegola: 'Null vuol dire «non è una lezione»',
    calendario:
      'Il calendario ICS con cui si confrontano le lezioni. Assente, il documento non ne ha',
    idCarta: 'L’id della carta: lettere, cifre e trattini. Uno nuovo crea una carta',
    sede: 'Il nome della scuola, in cima ai fogli di quei corsi. Vuoto, la riga sparisce',
    altezzaLogo:
      'L’altezza del logo sul foglio, in millimetri: fra 6 e 40, il resto si riporta dentro',
    corsi:
      'I corsi che stampano su questa carta. Ogni corso sta su una carta sola; chi non è ' +
      'nominato va sulla prima',
    carte:
      'Le carte intestate, almeno una. Una carta che manca si toglie, e il suo logo esce dal ' +
      'documento dell’anno',
    docente: 'Chi firma, in fondo a ogni pagina, qualunque carta. Vuoto, resta il resto del piede',
    firma:
      'La firma delle e-mail, in HTML. Assente, quella di serie con il nome e la scuola della ' +
      'prima carta',
    intestazione:
      'Le carte intestate dei fogli e chi firma. I loghi non passano di qui: intestazione.logo',
  },
}

export const testi = catalogo(it, {
  de: {
    salva: {
      titolo: 'Die Einstellungen des Jahresdokuments, alle zusammen',
      impostazioni: 'Die Einstellungen des Jahresdokuments, vollständig',
      liste:
        'Die geänderten Einträge der Auswahllisten: Name der Liste → Einträge. Was keine ' +
        'bekannte Liste ist, geht verloren',
      passo: 'Die Schrittweite der erfassbaren Noten: 0.25 sind Halbe und Viertel',
      passoFineSemestre:
        'Die Schrittweite der Semesternote. 0 heisst «nicht runden»',
      sogliaAssenza:
        'Als ganze Zahl: 20 sind zwanzig Prozent. 0 schaltet den Hinweis aus',
      minutiUd:
        'Wie viele Minuten eine Lektion dauert: ganzzahlig, von 20 bis 120. Ändert sich nicht ' +
        'mehr, sobald eine Stunde schon eine Präsenzkontrolle hat',
      giorniVisibili:
        '1 = Montag … 7 = Sonntag. Was ausserhalb liegt, verwirft das Programm',
      inizioPrimaPausa: 'Wann die erste Pause des Tages beginnt',
      durataPausa: 'Ganze Minuten, von 1 bis 120',
      dopoUd:
        'Ganze Lektionen zwischen dem Ende der vorigen Pause und dem Beginn dieser, von 1 bis 12',
      seguenti: 'Die Pausen nach der ersten, der Reihe nach: höchstens sieben',
      pause:
        'Die Pausen des Tages: Neue Stunden beenden die Lektionen davor und nehmen ' +
        'sie danach wieder auf. Fehlen sie, gibt es keine',
      pdfAutomatici: 'Wann das Klassenbuch die PDFs eines Kurses selbst neu erstellt',
      origine: 'Eine Adresse https:// oder webcal:// oder der Pfad einer .ics-Datei',
      copiatoIl: 'Wann die Kopie ins Dokument gemacht wurde, im ISO-Format',
      regola:
        'Woran die Termine erkannt werden: Wörter in beliebiger Reihenfolge, Varianten mit |, ' +
        'Präfix mit * am Ende, regulärer Ausdruck zwischen /…/',
      corsoDellaRegola: 'Null heisst «ist keine Stunde»',
      calendario:
        'Der ICS-Kalender, mit dem die Stunden verglichen werden. Fehlt er, hat das ' +
        'Dokument keinen',
      idCarta:
        'Die ID des Briefpapiers: Buchstaben, Ziffern und Bindestriche. Eine neue legt ein ' +
        'Briefpapier an',
      sede:
        'Der Name der Schule, oben auf den Blättern dieser Kurse. Leer verschwindet die Zeile',
      altezzaLogo:
        'Die Höhe des Logos auf dem Blatt, in Millimetern: zwischen 6 und 40, der Rest wird ' +
        'hineingeholt',
      corsi:
        'Die Kurse, die auf diesem Briefpapier drucken. Jeder Kurs gehört zu einem einzigen ' +
        'Briefpapier; wer nicht genannt ist, kommt auf das erste',
      carte:
        'Die Briefpapiere, mindestens eines. Ein fehlendes wird entfernt, und sein Logo ' +
        'verlässt das Jahresdokument',
      docente:
        'Wer unterschreibt, unten auf jeder Seite, bei jedem Briefpapier. Leer bleibt der Rest ' +
        'der Fusszeile',
      firma:
        'Die Signatur der E-Mails, in HTML. Fehlt sie, gilt die Standardsignatur mit dem Namen ' +
        'und der Schule des ersten Briefpapiers',
      intestazione:
        'Die Briefpapiere der Blätter und wer unterschreibt. Die Logos laufen nicht hierüber: ' +
        'intestazione.logo',
    },
  },
  fr: {
    salva: {
      titolo: 'Les paramètres du document de l’année, tous ensemble',
      impostazioni: 'Les paramètres du document de l’année, en entier',
      liste:
        'Les entrées modifiées des listes déroulantes : nom de la liste → entrées. Ce qui n’est ' +
        'pas une liste reconnue se perd',
      passo: 'Le pas des notes saisissables : 0.25, ce sont les demis et les quarts',
      passoFineSemestre:
        'Le pas de la note de fin de semestre. Zéro veut dire « ne pas arrondir »',
      sogliaAssenza:
        'En chiffre rond : 20, c’est vingt pour cent. Zéro désactive le signalement',
      minutiUd:
        'Combien de minutes dure une période : entier, de 20 à 120. Ne change plus dès qu’une ' +
        'leçon a déjà l’appel',
      giorniVisibili:
        '1 = lundi … 7 = dimanche. Ce qui tombe en dehors est écarté par le programme',
      inizioPrimaPausa: 'Quand commence la première pause de la journée',
      durataPausa: 'Minutes entières, de 1 à 120',
      dopoUd:
        'Périodes entières entre la fin de la pause précédente et le début de celle-ci, de 1 à 12',
      seguenti: 'Les pauses après la première, dans l’ordre : sept au maximum',
      pause:
        'Les pauses de la journée : les nouvelles leçons terminent les périodes avant et les ' +
        'reprennent après. Absentes, aucune',
      pdfAutomatici: 'Quand le registre refait de lui-même les PDF d’un cours',
      origine: 'Une adresse https:// ou webcal://, ou le chemin d’un fichier .ics',
      copiatoIl: 'Quand la copie a été faite dans le document, en ISO',
      regola:
        'Comment on reconnaît les événements : mots dans n’importe quel ordre, variantes avec |, ' +
        'préfixe avec * à la fin, expression régulière entre /…/',
      corsoDellaRegola: 'Null veut dire « ce n’est pas une leçon »',
      calendario:
        'Le calendrier ICS avec lequel on compare les leçons. Absent, le document n’en a pas',
      idCarta:
        'L’id du papier à en-tête : lettres, chiffres et tirets. Un nouveau crée un papier',
      sede:
        'Le nom de l’école, en haut des feuilles de ces cours. Vide, la ligne disparaît',
      altezzaLogo:
        'La hauteur du logo sur la feuille, en millimètres : entre 6 et 40, le reste est ramené ' +
        'dans ces limites',
      corsi:
        'Les cours qui impriment sur ce papier. Chaque cours n’est que sur un seul papier ; ' +
        'ceux qui ne sont pas nommés vont sur le premier',
      carte:
        'Les papiers à en-tête, au moins un. Un papier qui manque est retiré, et son logo sort ' +
        'du document de l’année',
      docente:
        'Qui signe, au bas de chaque page, quel que soit le papier. Vide, le reste du pied ' +
        'demeure',
      firma:
        'La signature des e-mails, en HTML. Absente, celle par défaut avec le nom et l’école du ' +
        'premier papier',
      intestazione:
        'Les papiers à en-tête des feuilles et qui signe. Les logos ne passent pas par ici : ' +
        'intestazione.logo',
    },
  },
  en: {
    salva: {
      titolo: 'The year document’s settings, all together',
      impostazioni: 'The year document’s settings, in full',
      liste:
        'The changed entries of the drop-down lists: list name → entries. Anything that is not ' +
        'a recognised list is lost',
      passo: 'The step of the grades that can be entered: 0.25 means halves and quarters',
      passoFineSemestre: 'The step of the semester grade. Zero means “do not round”',
      sogliaAssenza: 'As a whole number: 20 is twenty per cent. Zero turns the warning off',
      minutiUd:
        'How many minutes a period lasts: whole numbers, from 20 to 120. It no longer changes ' +
        'once a lesson already has attendance',
      giorniVisibili:
        '1 = Monday … 7 = Sunday. Anything outside is discarded by the program',
      inizioPrimaPausa: 'When the first break of the day starts',
      durataPausa: 'Whole minutes, from 1 to 120',
      dopoUd:
        'Whole periods between the end of the previous break and the start of this one, ' +
        'from 1 to 12',
      seguenti: 'The breaks after the first, in order: seven at most',
      pause:
        'The breaks of the day: new lessons finish the periods before them and resume them ' +
        'after. If absent, there are none',
      pdfAutomatici: 'When the register redoes a course’s PDFs by itself',
      origine: 'An https:// or webcal:// address, or the path of an .ics file',
      copiatoIl: 'When the copy into the document was made, in ISO',
      regola:
        'How events are recognised: words in any order, variants with |, prefix with * at the ' +
        'end, regular expression between /…/',
      corsoDellaRegola: 'Null means “this is not a lesson”',
      calendario:
        'The ICS calendar the lessons are compared with. If absent, the document has none',
      idCarta:
        'The letterhead’s id: letters, digits and hyphens. A new one creates a letterhead',
      sede: 'The school’s name, at the top of those courses’ sheets. If empty, the line disappears',
      altezzaLogo:
        'The logo’s height on the sheet, in millimetres: between 6 and 40, anything else is ' +
        'brought back within range',
      corsi:
        'The courses that print on this letterhead. Each course is on one letterhead only; ' +
        'those not named go on the first',
      carte:
        'The letterheads, at least one. A letterhead that is missing is removed, and its logo ' +
        'leaves the year document',
      docente:
        'Who signs, at the bottom of every page, whatever the letterhead. If empty, the rest of ' +
        'the footer stays',
      firma:
        'The email signature, in HTML. If absent, the default one with the name and school of ' +
        'the first letterhead',
      intestazione:
        'The sheets’ letterheads and who signs. Logos do not go through here: intestazione.logo',
    },
  },
})
