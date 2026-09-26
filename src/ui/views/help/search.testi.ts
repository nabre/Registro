// Le parole della ricerca nella guida, lingua per lingua: desinenze, parole
// vuote, sinonimi. È il vocabolario di `search.ts`, non testo da leggere.
// Funzioni perché gli elenchi hanno lunghezze diverse; tutto scritto «piano»
// (minuscolo, senza accenti), come lo vede la ricerca.

import { catalogo } from '../../../i18n/index.js'

/** Come si arriva alla radice di una parola. */
interface Desinenze {
  /** Tolte solo a una parola di più di sei lettere: i verbi, i plurali lunghi. */
  readonly lunghe: readonly string[]
  /** Una lettera sola, tolta in fondo a una parola di più di quattro. */
  readonly finali: readonly string[]
}

const it = {
  desinenze: (): Desinenze => ({
    lunghe: ['are', 'ere', 'ire', 'ando', 'endo'],
    finali: ['a', 'e', 'i', 'o', 'u'],
  }),
  /** Le parole che non contano: articoli, preposizioni, «come si fa». */
  vuote: (): readonly string[] => [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'di', 'da', 'in', 'con', 'su', 'per', 'e',
    'o', 'a', 'come', 'si', 'che', 'del', 'della', 'dei', 'delle', 'al', 'alla', 'nel', 'nella',
    'mio', 'mia', 'cosa', 'dove', 'quando', 'faccio', 'fare', 'posso',
  ],
  /**
   * I sinonimi, a gruppi: ogni parola di un gruppo trova anche le altre; più
   * parole valgono come una sola. Corto apposta: un sinonimo sbagliato fa rumore.
   */
  sinonimi: (): readonly (readonly string[])[] => [
    ['voto', 'valutazione', 'media', 'prova', 'verifica', 'giudizio'],
    ['assenza', 'assente', 'presenza', 'appello', 'ritardo', 'uscita'],
    ['allievo', 'alunno', 'studente', 'apprendista', 'persona in formazione', 'ragazzo'],
    ['pdf', 'rapporto', 'stampa', 'stampare', 'documento', 'foglio'],
    ['scorciatoia', 'tasto', 'tastiera', 'ctrl'],
    ['backup', 'copia', 'salvataggio', 'salvare', 'ripristino'],
    ['orario', 'fascia', 'ore fisse'],
    ['ud', 'unita didattica', 'campanella'],
    ['pausa', 'ricreazione', 'intervallo', 'pranzo'],
    ['compito', 'consegna', 'consegne'],
    ['recupero', 'ripetizione', 'rimedio'],
    ['email', 'mail', 'posta', 'e-mail', 'messaggio', 'comunicazione'],
    ['impostazione', 'opzione', 'preferenza', 'configurazione'],
    ['proiettore', 'beamer', 'lim', 'proiezione', 'schermo della classe'],
    ['ia', 'ai', 'intelligenza artificiale', 'assistente', 'llm', 'modello linguistico', 'chat'],
    ['dettatura', 'microfono', 'voce', 'dettare', 'voicebox', 'whisper'],
    ['cancellare', 'eliminare', 'togliere', 'cestino', 'buttare'],
    ['annullare', 'disfare', 'indietro'],
    ['firma', 'firmare', 'giustificazione', 'giustificare'],
    ['scansione', 'scanner', 'scansionare', 'smistare'],
    ['vacanza', 'vacanze', 'festivo', 'ferie', 'sospensione'],
    ['azienda', 'datore', 'ditta', 'tirocinio', 'posto di lavoro'],
    ['programma', 'argomento', 'scaletta', 'piano'],
    ['aggiornamento', 'versione', 'aggiornare', 'release'],
    ['problema', 'errore', 'guasto', 'non funziona', 'non va'],
  ],
}

export const testi = catalogo(it, {
  de: {
    desinenze: () => ({
      lunghe: ['ern', 'en', 'er', 'es', 'em'],
      finali: ['e', 'n', 's'],
    }),
    vuote: () => [
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
      'und', 'oder', 'in', 'im', 'am', 'an', 'auf', 'mit', 'von', 'vom', 'zu', 'zum', 'zur',
      'fur', 'wie', 'was', 'wo', 'wann', 'ich', 'man', 'kann', 'ist', 'mein', 'meine', 'mache',
    ],
    sinonimi: () => [
      ['note', 'beurteilung', 'leistungsbeurteilung', 'durchschnitt', 'prufung', 'test'],
      ['absenz', 'abwesend', 'anwesenheit', 'prasenz', 'prasenzkontrolle', 'verspatung'],
      ['schuler', 'schulerin', 'lernende', 'lehrling', 'auszubildende', 'student'],
      ['pdf', 'bericht', 'drucken', 'druck', 'dokument', 'blatt'],
      ['tastenkurzel', 'kurzbefehl', 'taste', 'tastatur', 'ctrl', 'strg'],
      ['backup', 'sicherung', 'kopie', 'speichern', 'wiederherstellen'],
      ['stundenplan', 'zeitfenster', 'feste stunden'],
      ['lektion', 'schulstunde', 'unterrichtsstunde'],
      ['pause', 'znuni', 'mittagspause'],
      ['aufgabe', 'auftrag', 'hausaufgabe', 'hausaufgaben'],
      ['nachprufung', 'wiederholung'],
      ['email', 'mail', 'e-mail', 'post', 'nachricht', 'mitteilung'],
      ['einstellung', 'option', 'praferenz', 'konfiguration'],
      ['beamer', 'projektor', 'projektion', 'projizieren', 'bildschirm fur die klasse'],
      ['ki', 'ai', 'kunstliche intelligenz', 'assistent', 'llm', 'sprachmodell', 'chat'],
      ['diktat', 'diktieren', 'mikrofon', 'sprache', 'voicebox', 'whisper'],
      ['loschen', 'entfernen', 'papierkorb', 'wegwerfen'],
      ['ruckgangig', 'zuruck'],
      ['unterschrift', 'unterschreiben', 'entschuldigung', 'entschuldigen'],
      ['scan', 'scanner', 'scannen', 'zuordnen'],
      ['ferien', 'feiertag', 'unterbruch'],
      ['lehrbetrieb', 'betrieb', 'arbeitgeber', 'firma', 'lehrstelle'],
      ['programm', 'thema', 'ablauf', 'plan'],
      ['update', 'aktualisierung', 'version', 'aktualisieren'],
      ['problem', 'fehler', 'storung', 'funktioniert nicht', 'geht nicht'],
    ],
  },
  fr: {
    desinenze: () => ({
      lunghe: ['er', 'ez', 'ent', 'ant', 'ees', 'es'],
      finali: ['e', 's'],
    }),
    vuote: () => [
      'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'et', 'ou', 'en', 'dans', 'au',
      'aux', 'a', 'avec', 'pour', 'sur', 'par', 'comment', 'que', 'qu', 'qui', 'quoi', 'quand',
      'je', 'j', 'faire', 'fait', 'peut', 'peux', 'mon', 'ma', 'mes', 'est', 'se', 's', 'ce',
      'c', 'ne', 'n',
    ],
    sinonimi: () => [
      ['note', 'evaluation', 'moyenne', 'epreuve', 'controle', 'test'],
      ['absence', 'absent', 'presence', 'appel', 'retard'],
      ['eleve', 'etudiant', 'apprenti', 'apprentie', 'personne en formation'],
      ['pdf', 'rapport', 'imprimer', 'impression', 'document', 'feuille'],
      ['raccourci', 'touche', 'clavier', 'ctrl'],
      ['sauvegarde', 'copie', 'enregistrer', 'restaurer', 'backup'],
      ['horaire', 'plage', 'heures fixes'],
      ['periode', 'lecon'],
      ['pause', 'recreation', 'recre', 'midi'],
      ['devoir', 'devoirs', 'tache'],
      ['rattrapage', 'repetition'],
      ['email', 'mail', 'e-mail', 'courrier', 'message', 'communication'],
      ['parametre', 'option', 'preference', 'reglage', 'configuration'],
      ['projecteur', 'beamer', 'projection', 'projeter', 'ecran pour la classe'],
      ['ia', 'ai', 'intelligence artificielle', 'assistant', 'llm', 'modele de langage', 'chat'],
      ['dictee', 'micro', 'microphone', 'voix', 'dicter', 'voicebox', 'whisper'],
      ['supprimer', 'effacer', 'retirer', 'corbeille'],
      ['annuler', 'defaire', 'retour'],
      ['signature', 'signer', 'justificatif', 'justifier', 'excuse'],
      ['scan', 'scanner', 'numeriser', 'trier'],
      ['vacances', 'ferie', 'conge', 'interruption'],
      ['entreprise', 'employeur', 'patron', 'stage', 'entreprise formatrice'],
      ['programme', 'sujet', 'deroulement', 'plan'],
      ['mise a jour', 'version', 'actualiser', 'release'],
      ['probleme', 'erreur', 'panne', 'ne marche pas', 'ne fonctionne pas'],
    ],
  },
  en: {
    desinenze: () => ({
      lunghe: ['ing', 'ed', 'es'],
      finali: ['s'],
    }),
    vuote: () => [
      'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'how', 'what',
      'where', 'when', 'do', 'does', 'i', 'can', 'my', 'is', 'it', 'by', 'from',
    ],
    sinonimi: () => [
      ['grade', 'mark', 'assessment', 'average', 'test', 'exam'],
      ['absence', 'absent', 'attendance', 'late'],
      ['pupil', 'student', 'learner', 'apprentice', 'trainee'],
      ['pdf', 'report', 'print', 'printing', 'document', 'sheet'],
      ['shortcut', 'key', 'keyboard', 'ctrl'],
      ['backup', 'copy', 'save', 'restore'],
      ['timetable', 'slot', 'fixed lessons'],
      ['period', 'lesson'],
      ['break', 'lunch', 'recess', 'playtime'],
      ['assignment', 'homework', 'task'],
      ['resit', 'retake'],
      ['email', 'mail', 'e-mail', 'message'],
      ['setting', 'option', 'preference', 'configuration'],
      ['projector', 'beamer', 'projection', 'project', 'class screen'],
      ['ai', 'artificial intelligence', 'assistant', 'llm', 'language model', 'chat'],
      ['dictation', 'microphone', 'voice', 'dictate', 'voicebox', 'whisper'],
      ['delete', 'remove', 'bin', 'trash'],
      ['undo', 'back'],
      ['signature', 'sign', 'excuse'],
      ['scan', 'scanner', 'sort'],
      ['holiday', 'holidays', 'bank holiday', 'closure'],
      ['company', 'employer', 'firm', 'placement', 'training company'],
      ['programme', 'topic', 'outline', 'plan'],
      ['update', 'version', 'upgrade', 'release'],
      ['problem', 'error', 'fault', 'not working', 'broken'],
    ],
  },
})
