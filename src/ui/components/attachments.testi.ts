// I testi dei posti per i PDF di un momento di valutazione (`attachments.ts`).

import { catalogo } from '../../i18n/index.js'

const it = {
  allegato: 'PDF allegato.',
  apri: (nome: string) => `Apri ${nome}`,
  nessunPdf: 'nessun PDF',
  sostituisci: 'Sostituisci',
  allega: 'Allega PDF',
  togliPdf: 'Togli il PDF',
  togliereTitolo: 'Togliere il PDF?',
  togliereTesto: (nome: string) =>
    `${nome} esce dal documento dell’anno, e non va nel cestino del sistema.`,
  tolto: 'PDF tolto.',
}

export const testi = catalogo(it, {
  de: {
    allegato: 'PDF angehängt.',
    apri: (nome) => `${nome} öffnen`,
    nessunPdf: 'kein PDF',
    sostituisci: 'Ersetzen',
    allega: 'PDF anhängen',
    togliPdf: 'PDF entfernen',
    togliereTitolo: 'PDF entfernen?',
    togliereTesto: (nome) =>
      `${nome} verlässt das Dokument des Schuljahrs und kommt nicht in den Papierkorb des Systems.`,
    tolto: 'PDF entfernt.',
  },
  fr: {
    allegato: 'PDF joint.',
    apri: (nome) => `Ouvrir ${nome}`,
    nessunPdf: 'aucun PDF',
    sostituisci: 'Remplacer',
    allega: 'Joindre un PDF',
    togliPdf: 'Retirer le PDF',
    togliereTitolo: 'Retirer le PDF ?',
    togliereTesto: (nome) =>
      `${nome} sort du document de l’année, et ne va pas dans la corbeille du système.`,
    tolto: 'PDF retiré.',
  },
  en: {
    allegato: 'PDF attached.',
    apri: (nome) => `Open ${nome}`,
    nessunPdf: 'no PDF',
    sostituisci: 'Replace',
    allega: 'Attach PDF',
    togliPdf: 'Remove the PDF',
    togliereTitolo: 'Remove the PDF?',
    togliereTesto: (nome) =>
      `${nome} leaves the year’s document, and does not go into the system recycle bin.`,
    tolto: 'PDF removed.',
  },
})
