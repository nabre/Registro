// I testi della matrice del comportamento (`lesson/behaviour.ts`).

import { catalogo } from '../../../i18n/index.js'
import { PIF } from '../../../domain/lexicon.js'

const it = {
  /** Il seguito del suggerimento: il segno che il clic mette, già minuscolo. */
  premiPer: (segno: string) => `Premi per ${segno}; tasto destro per l’elenco.`,
  nienteDaSegnare: 'Niente da segnare',
  modificaAnnotazione: 'Modifica l’annotazione',
  annota: 'Annota',
  aspetti: 'Aspetti osservati in classe',
  pifNonInElenco: `${PIF.singolare} non più in elenco`,
  cheCosaESuccesso: 'che cosa è successo',
  annotazioneSu: (nome: string, aspetto: string) => `Annotazione su ${nome} — ${aspetto}`,
}

export const testi = catalogo(it, {
  de: {
    premiPer: (segno) => `Klick für «${segno}»; Rechtsklick für die Liste.`,
    nienteDaSegnare: 'Nichts zu vermerken',
    modificaAnnotazione: 'Anmerkung bearbeiten',
    annota: 'Anmerken',
    aspetti: 'In der Klasse beobachtete Aspekte',
    pifNonInElenco: 'Lernende nicht mehr in der Liste',
    cheCosaESuccesso: 'was ist passiert',
    annotazioneSu: (nome, aspetto) => `Anmerkung zu ${nome} — ${aspetto}`,
  },
  fr: {
    premiPer: (segno) => `Clic pour « ${segno} » ; clic droit pour la liste.`,
    nienteDaSegnare: 'Rien à signaler',
    modificaAnnotazione: 'Modifier l’annotation',
    annota: 'Annoter',
    aspetti: 'Aspects observés en classe',
    pifNonInElenco: 'personne en formation qui n’est plus dans la liste',
    cheCosaESuccesso: 'ce qui s’est passé',
    annotazioneSu: (nome, aspetto) => `Annotation sur ${nome} — ${aspetto}`,
  },
  en: {
    premiPer: (segno) => `Click for “${segno}”; right-click for the list.`,
    nienteDaSegnare: 'Nothing to mark',
    modificaAnnotazione: 'Edit the note',
    annota: 'Add a note',
    aspetti: 'Aspects observed in class',
    pifNonInElenco: 'learner no longer on the list',
    cheCosaESuccesso: 'what happened',
    annotazioneSu: (nome, aspetto) => `Note on ${nome} — ${aspetto}`,
  },
})
