// I testi delle procedure di `programma`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  comune: {
    chiave: 'Una chiave del manifesto. Che esista davvero lo dice «valoreConMotivo»',
  },
  azzera: {
    titolo: 'Ritira il valore scritto: da lì in poi vale il predefinito del manifesto',
  },
  esci: {
    titolo: 'Chiude il registro',
  },
  salva: {
    titolo: 'Un’impostazione del programma, quelle che restano su questa macchina',
    valore: 'Testo, numero o vero/falso: quale dei tre lo dice la voce del manifesto',
  },
  sfoglia: {
    titolo: 'Sceglie con il dialogo del sistema la cartella o il file di un’impostazione',
  },
  giornale: {
    titolo: 'Restituisce le ultime chiamate annotate nel giornale di sessione',
    limite: 'Quante voci restituire al massimo (predefinito 100, massimo 500)',
    soloErrori: 'Se vero, restituisce solo le chiamate fallite o rifiutate',
    presentazione: {
      titolo: 'Giornale delle chiamate',
      procedura: 'Procedura',
      origine: 'Origine',
      durataMs: 'Durata (ms)',
      ok: 'Esito',
      codice: 'Codice',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      chiave: 'Ein Schlüssel des Manifests. Ob es ihn wirklich gibt, sagt «valoreConMotivo»',
    },
    azzera: {
      titolo: 'Nimmt den geschriebenen Wert zurück: Ab dann gilt der Standard des Manifests',
    },
    esci: {
      titolo: 'Schliesst das Klassenbuch',
    },
    salva: {
      titolo: 'Eine Einstellung des Programms, die auf diesem Computer bleibt',
      valore: 'Text, Zahl oder wahr/falsch: Welches der drei, sagt der Eintrag im Manifest',
    },
    sfoglia: {
      titolo: 'Wählt mit dem Dialog des Systems den Ordner oder die Datei einer Einstellung',
    },
    giornale: {
      titolo: 'Gibt die letzten im Sitzungsjournal protokollierten Aufrufe zurück',
      limite: 'Maximale Anzahl zurückzugebender Einträge (Standard 100, maximal 500)',
      soloErrori: 'Wenn wahr, werden nur fehlgeschlagene oder abgelehnte Aufrufe zurückgegeben',
      presentazione: {
        titolo: 'Aufrufjournal',
        procedura: 'Prozedur',
        origine: 'Herkunft',
        durataMs: 'Dauer (ms)',
        ok: 'Ergebnis',
        codice: 'Code',
      },
    },
  },
  fr: {
    comune: {
      chiave: 'Une clé du manifeste. C’est « valoreConMotivo » qui dit si elle existe vraiment',
    },
    azzera: {
      titolo:
        'Retire la valeur écrite : dès lors, c’est la valeur par défaut du manifeste qui vaut',
    },
    esci: {
      titolo: 'Ferme le registre',
    },
    salva: {
      titolo: 'Un paramètre du programme, de ceux qui restent sur cet ordinateur',
      valore:
        'Texte, nombre ou vrai/faux : lequel des trois, c’est l’entrée du manifeste qui le dit',
    },
    sfoglia: {
      titolo:
        'Choisit avec la boîte de dialogue du système le dossier ou le fichier d’un paramètre',
    },
    giornale: {
      titolo: 'Renvoie les derniers appels enregistrés dans le journal de session',
      limite: 'Nombre maximal d’entrées à renvoyer (par défaut 100, maximum 500)',
      soloErrori: 'Si vrai, renvoie uniquement les appels échoués ou rejetés',
      presentazione: {
        titolo: 'Journal des appels',
        procedura: 'Procédure',
        origine: 'Origine',
        durataMs: 'Durée (ms)',
        ok: 'Résultat',
        codice: 'Code',
      },
    },
  },
  en: {
    comune: {
      chiave: 'A manifest key. Whether it really exists is up to “valoreConMotivo”',
    },
    azzera: {
      titolo: 'Withdraws the written value: from then on the manifest’s default applies',
    },
    esci: {
      titolo: 'Closes the register',
    },
    salva: {
      titolo: 'A program setting, one of those that stay on this computer',
      valore: 'Text, number or true/false: which of the three is up to the manifest entry',
    },
    sfoglia: {
      titolo: 'Picks the folder or file of a setting with the system dialog',
    },
    giornale: {
      titolo: 'Returns the last calls recorded in the session journal',
      limite: 'Maximum number of entries to return (default 100, maximum 500)',
      soloErrori: 'If true, returns only failed or rejected calls',
      presentazione: {
        titolo: 'Call log',
        procedura: 'Procedure',
        origine: 'Origin',
        durataMs: 'Duration (ms)',
        ok: 'Result',
        codice: 'Code',
      },
    },
  },
})
