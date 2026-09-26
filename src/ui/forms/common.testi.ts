// I testi di `forms/common.ts`: quel che ogni modulo dice allo stesso modo —
// la guardia dell'anno, gli errori di ripiego, la domanda prima di eliminare.

import { catalogo } from '../../i18n/index.js'

const it = {
  primaLAnno: 'Prima l’anno scolastico: si apre il modulo per crearlo.',
  toltaAltrove: 'Non c’è più: è stata tolta altrove.',
  nonRiuscito: 'Non riuscito.',
  salvataggioNonRiuscito: 'Salvataggio non riuscito.',
  nienteDaEliminare: 'Non c’è più niente da eliminare: forse è già sparito.',
  seNeVaAnche: (elenco: string) => `Se ne va anche:\n${elenco}`,
  nienteAltro: 'Non si porta via nient’altro.',
  restaStaccato: (elenco: string) => `Resta, ma staccato:\n${elenco}`,
  eliminare: (nome: string) => `Eliminare ${nome}?`,
  presaDiRiga: 'Trascina per cambiare l’ordine, o usa le frecce su e giù',
}

export const testi = catalogo(it, {
  de: {
    primaLAnno: 'Zuerst das Schuljahr: Das Formular dafür wird geöffnet.',
    toltaAltrove: 'Das gibt es nicht mehr: Es wurde anderswo entfernt.',
    nonRiuscito: 'Hat nicht geklappt.',
    salvataggioNonRiuscito: 'Speichern hat nicht geklappt.',
    nienteDaEliminare: 'Hier gibt es nichts mehr zu löschen: Vielleicht ist es schon weg.',
    seNeVaAnche: (elenco) => `Ebenfalls gelöscht wird:\n${elenco}`,
    nienteAltro: 'Sonst wird nichts mitgelöscht.',
    restaStaccato: (elenco) => `Bleibt, aber ohne Verknüpfung:\n${elenco}`,
    eliminare: (nome) => `${nome} löschen?`,
    presaDiRiga: 'Ziehen, um die Reihenfolge zu ändern, oder mit den Pfeiltasten nach oben und unten',
  },
  fr: {
    primaLAnno: 'D’abord l’année scolaire : le formulaire pour la créer s’ouvre.',
    toltaAltrove: 'Cet élément n’existe plus : il a été supprimé ailleurs.',
    nonRiuscito: 'Échec.',
    salvataggioNonRiuscito: 'L’enregistrement a échoué.',
    nienteDaEliminare: 'Il n’y a plus rien à supprimer : c’est peut-être déjà fait.',
    seNeVaAnche: (elenco) => `Disparaît aussi :\n${elenco}`,
    nienteAltro: 'Rien d’autre n’est supprimé.',
    restaStaccato: (elenco) => `Reste, mais détaché :\n${elenco}`,
    eliminare: (nome) => `Supprimer ${nome} ?`,
    presaDiRiga: 'Fais glisser pour changer l’ordre, ou utilise les flèches haut et bas',
  },
  en: {
    primaLAnno: 'School year first: the form to create it is opening.',
    toltaAltrove: 'It’s no longer there: it was removed elsewhere.',
    nonRiuscito: 'That didn’t work.',
    salvataggioNonRiuscito: 'Saving didn’t work.',
    nienteDaEliminare: 'There’s nothing left to delete: it may already be gone.',
    seNeVaAnche: (elenco) => `This also goes:\n${elenco}`,
    nienteAltro: 'Nothing else goes with it.',
    restaStaccato: (elenco) => `Stays, but detached:\n${elenco}`,
    eliminare: (nome) => `Delete ${nome}?`,
    presaDiRiga: 'Drag to change the order, or use the up and down arrow keys',
  },
})
