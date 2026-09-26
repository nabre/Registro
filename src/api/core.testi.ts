// I testi del nucleo dell'API: i rifiuti di una chiamata, l'aiuto dei campi
// della busta di scrittura e le parole dell'impaginazione (`presentation.ts`).
// Si leggono al momento dell'uso: letti al caricamento resterebbero nella
// lingua di prima.

import { catalogo } from '../i18n/index.js'
import { Uno, accorda, frase, type Parole, type Termine } from '../domain/lexicon.js'

const it = {
  /**
   * «Classe non trovata. Forse è già sparita.»: il termine arriva già nella
   * lingua corrente (`errore.nonTrovato` in `contract.ts`), con il suo genere.
   */
  nonTrovato: (cosa: Parole) => {
    const termine = cosa as Termine
    const sparito = accorda(termine, 'sparito')
    return `${frase(termine, 'trovato', { nega: true })} Forse è già ${sparito}.`
  },
  nonConosce: (nome: string) => `Il registro non conosce «${nome}».`,
  guastoInterno: (tracciato: string) => `Guasto interno del registro. Nel giornale: ${tracciato}.`,
  uscitaFuoriForma: 'La procedura ha risposto in una forma che non è quella dichiarata.',
  documentoCambiato:
    'Il documento aperto è cambiato mentre questa scrittura aspettava il proprio turno: non è ' +
    'stata eseguita.',
  rileggi: 'Si rilegge quel che c’è adesso e, se serve ancora, si richiede.',
  occupato: (secondi: number) =>
    `Il registro era occupato: questa scrittura ha aspettato il proprio turno ${secondi} secondi ` +
    'e ha rinunciato, senza scrivere niente.',
  occupatoPerche:
    'Davanti c’è una scrittura lunga — la ricerca degli indirizzi sulla mappa arriva a dieci ' +
    'minuti, e un dialogo di sistema resta aperto finché non gli si risponde. Si riprova ' +
    'quando quella ha finito.',
  nonPossibile: 'Non è stato possibile.',
  /** L'aiuto dei campi della busta di una scrittura (`SCRITTURA`). */
  scrittura: {
    revisione: 'Il contatore di modifiche dell’archivio dopo la scrittura',
    creato: 'Quel che è nato, se è nato qualcosa',
    messaggio: 'Una frase per chi ha premuto',
    documento: 'Il documento appena scritto, relativo alla cartella dei dati',
    invariato: 'Riuscita senza toccare il registro',
  },
  /** Le misure dei byte, dopo il numero già scritto: «4,1 GB». */
  gigabyte: (quanti: string) => `${quanti} GB`,
  megabyte: (quanti: string) => `${quanti} MB`,
  kilobyte: (quanti: string) => `${quanti} kB`,
  byte: (quanti: string) => `${quanti} B`,
}

export const testi = catalogo(it, {
  de: {
    nonTrovato: (cosa) =>
      `${Uno(cosa)} nicht gefunden. Vielleicht wurde der Eintrag schon entfernt.`,
    nonConosce: (nome) => `Das Klassenbuch kennt «${nome}» nicht.`,
    guastoInterno: (tracciato) => `Interner Fehler des Klassenbuchs. In der Logdatei: ${tracciato}.`,
    uscitaFuoriForma: 'Die Prozedur hat in einer anderen als der angegebenen Form geantwortet.',
    documentoCambiato:
      'Das geöffnete Dokument hat sich geändert, während dieser Schreibvorgang auf seinen Platz ' +
      'in der Warteschlange wartete: Er wurde nicht ausgeführt.',
    rileggi: 'Lies neu, was jetzt da ist, und stelle die Anfrage erneut, falls sie noch nötig ist.',
    occupato: (secondi) =>
      `Das Klassenbuch war beschäftigt: Dieser Schreibvorgang hat ${secondi} Sekunden auf seinen ` +
      'Platz gewartet und dann aufgegeben, ohne etwas zu schreiben.',
    occupatoPerche:
      'Vor ihm läuft ein langer Schreibvorgang – die Adresssuche für die Karte dauert bis zu ' +
      'zehn Minuten, und ein Systemdialog bleibt offen, bis jemand antwortet. Versuche es ' +
      'erneut, ' +
      'wenn er fertig ist.',
    nonPossibile: 'Das war nicht möglich.',
    scrittura: {
      revisione: 'Der Änderungszähler des Archivs nach dem Schreiben',
      creato: 'Was neu entstanden ist, falls etwas entstanden ist',
      messaggio: 'Ein Satz für die Person, die geklickt hat',
      documento: 'Das eben geschriebene Dokument, relativ zum Datenordner',
      invariato: 'Erfolgreich, ohne das Klassenbuch zu verändern',
    },
    gigabyte: (quanti) => `${quanti} GB`,
    megabyte: (quanti) => `${quanti} MB`,
    kilobyte: (quanti) => `${quanti} kB`,
    byte: (quanti) => `${quanti} B`,
  },
  fr: {
    nonTrovato: (cosa) => `${Uno(cosa)} introuvable. L’élément a peut-être déjà été supprimé.`,
    nonConosce: (nome) => `Le registre ne connaît pas « ${nome} ».`,
    guastoInterno: (tracciato) => `Erreur interne du registre. Dans le journal : ${tracciato}.`,
    uscitaFuoriForma: 'La procédure a répondu sous une autre forme que celle qui est déclarée.',
    documentoCambiato:
      'Le document ouvert a changé pendant que cette écriture attendait son tour : elle n’a pas ' +
      'été exécutée.',
    rileggi: 'Relis ce qu’il y a maintenant et, si c’est encore nécessaire, refais la demande.',
    occupato: (secondi) =>
      `Le registre était occupé : cette écriture a attendu son tour pendant ${secondi} secondes ` +
      'puis a renoncé, sans rien écrire.',
    occupatoPerche:
      'Une longue écriture est en cours – la recherche des adresses pour la carte peut durer dix ' +
      'minutes, et une boîte de dialogue du système reste ouverte tant qu’on n’y répond pas. ' +
      'Réessaie quand elle sera terminée.',
    nonPossibile: 'Cela n’a pas été possible.',
    scrittura: {
      revisione: 'Le compteur de modifications de l’archive après l’écriture',
      creato: 'Ce qui a été créé, si quelque chose a été créé',
      messaggio: 'Une phrase pour la personne qui a cliqué',
      documento: 'Le document qui vient d’être écrit, relatif au dossier des données',
      invariato: 'Réussie sans toucher au registre',
    },
    gigabyte: (quanti) => `${quanti} Go`,
    megabyte: (quanti) => `${quanti} Mo`,
    kilobyte: (quanti) => `${quanti} ko`,
    byte: (quanti) => `${quanti} o`,
  },
  en: {
    nonTrovato: (cosa) => `${Uno(cosa)} not found. It may already have been removed.`,
    nonConosce: (nome) => `The register doesn’t know “${nome}”.`,
    guastoInterno: (tracciato) => `Internal error in the register. In the log: ${tracciato}.`,
    uscitaFuoriForma: 'The procedure answered in a form other than the one it declares.',
    documentoCambiato:
      'The open document changed while this write was waiting its turn: it was not carried out.',
    rileggi: 'Read what is there now and, if it is still needed, ask again.',
    occupato: (secondi) =>
      `The register was busy: this write waited ${secondi} seconds for its turn and gave up ` +
      'without writing anything.',
    occupatoPerche:
      'A long write is in progress – looking up addresses for the map can take up to ten ' +
      'minutes, and a system dialog stays open until someone answers it. Try again once it has ' +
      'finished.',
    nonPossibile: 'That wasn’t possible.',
    scrittura: {
      revisione: 'The archive’s change counter after the write',
      creato: 'What was created, if anything was',
      messaggio: 'A sentence for the person who clicked',
      documento: 'The document just written, relative to the data folder',
      invariato: 'Succeeded without changing the register',
    },
    gigabyte: (quanti) => `${quanti} GB`,
    megabyte: (quanti) => `${quanti} MB`,
    kilobyte: (quanti) => `${quanti} kB`,
    byte: (quanti) => `${quanti} B`,
  },
})
