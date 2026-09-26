// Il dispositivo multilingua: la porta d'ingresso. Niente import da fuori
// della cartella.
//
//   languages.ts   quali lingue ci sono, come si chiamano, come si riconoscono
//   state.ts       qual è quella di adesso, una per processo
//   catalog.ts     i cataloghi dei testi, con la garanzia che ogni lingua ci sia
//   formats.ts     numeri, plurali, elenchi e istanti nella lingua di adesso

export {
  LINGUA_PREDEFINITA,
  LINGUE,
  LOCALI,
  NOMI_DELLE_LINGUE,
  SCELTA_SISTEMA,
  linguaDaEtichetta,
  risolviLingua,
  èLingua,
  type Lingua,
} from './languages.js'
export { alCambioLingua, impostaLingua, lingua, locale } from './state.js'
export { catalogo, detto, type Catalogo, type Forma, type TestoPigro, type Traduzioni } from './catalog.js'
export {
  conMaiuscola,
  elenco,
  istante,
  maiuscolo,
  minuscolo,
  numero,
  perNumero,
  èSingolare,
} from './formats.js'
