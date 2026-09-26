// I testi dei mattoni dell'interfaccia (`base.ts`): le etichette di ripiego
// per chi legge con la voce e il campo della data.

import { catalogo, numero } from '../../i18n/index.js'

/** Un numero con un decimale solo, nella grafia della lingua. */
const unDecimale = (valore: number): string =>
  numero(valore, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const it = {
  /** Il nome di ripiego di un gruppo di scelte alternative. */
  scheda: 'Scheda',
  /** Come si scrive una data nel campo vuoto. */
  formatoData: 'gg.mm.aaaa',
  dataIlleggibile: 'Data non leggibile. Si scrive gg.mm.aaaa — per esempio 7.9.26.',
  /** Il nome di ripiego di una barra di avanzamento. */
  avanzamento: 'Avanzamento',
  /** Quanto misura un file: byte, kilobyte, megabyte. */
  byte: (quanti: number) => `${quanti} B`,
  kilobyte: (quanti: number) => `${Math.round(quanti)} kB`,
  megabyte: (quanti: number) => `${quanti.toFixed(1)} MB`,
}

export const testi = catalogo(it, {
  de: {
    scheda: 'Reiter',
    formatoData: 'TT.MM.JJJJ',
    dataIlleggibile: 'Datum nicht lesbar. Man schreibt TT.MM.JJJJ — zum Beispiel 7.9.26.',
    avanzamento: 'Fortschritt',
    byte: (quanti) => `${quanti} B`,
    kilobyte: (quanti) => `${Math.round(quanti)} kB`,
    megabyte: (quanti) => `${unDecimale(quanti)} MB`,
  },
  fr: {
    scheda: 'Onglet',
    formatoData: 'jj.mm.aaaa',
    dataIlleggibile: 'Date illisible. On écrit jj.mm.aaaa — par exemple 7.9.26.',
    avanzamento: 'Progression',
    byte: (quanti) => `${quanti} o`,
    kilobyte: (quanti) => `${Math.round(quanti)} Ko`,
    megabyte: (quanti) => `${unDecimale(quanti)} Mo`,
  },
  en: {
    scheda: 'Tab',
    formatoData: 'dd.mm.yyyy',
    dataIlleggibile: 'Date not readable. Write it as dd.mm.yyyy — for example 7.9.26.',
    avanzamento: 'Progress',
    byte: (quanti) => `${quanti} B`,
    kilobyte: (quanti) => `${Math.round(quanti)} KB`,
    megabyte: (quanti) => `${unDecimale(quanti)} MB`,
  },
})
