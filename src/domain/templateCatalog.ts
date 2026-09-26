// Che cos'è ogni modello dei rapporti (`templates/`, tradotta da
// `npm run templates` in `data/defaultTemplates.ts`): titolo, ruolo, rapporto
// su cui si guarda l'anteprima.
//
// Sta nel dominio perché serve anche all'host (anteprima, inventario) e perché
// si prova: un modello aggiunto a `templates/` e non qui resterebbe senza
// titolo né anteprima.

import { LINGUA_PREDEFINITA, type Lingua } from '../i18n/index.js'
import type { GenereRapporto } from './locations.js'
import { testi } from './templateCatalog.testi.js'

/**
 * A che cosa serve un file della cartella; l'elenco si raggruppa così, perché
 * dice quanto è largo l'effetto di una modifica.
 *
 *   `comune`   sta sotto tutti i rapporti
 *   `rapporto` disegna il foglio che porta il suo nome
 *   `posta`    la firma in fondo alle e-mail
 *   `immagine` un'immagine dei modelli. Nessuna voce la usa (il logo sta in
 *              `Intestazione.logo`), ma `nomiDelModello` in
 *              `actions/templates.ts` la nomina ancora
 */
export type RuoloModello = 'comune' | 'rapporto' | 'posta' | 'immagine'

interface VoceCatalogo {
  /** Come si chiama il modello: `_base`, `verbale-lezione`, `_firma.html`. */
  readonly nome: string
  /** Come si legge nell'elenco, nella lingua di adesso. */
  readonly titolo: string
  readonly ruolo: RuoloModello
  /** La riga sotto il titolo: di che cosa quel modello decide. */
  readonly aiuto: string
  /**
   * Il rapporto su cui si guarda l'anteprima. Gli strati comuni ne prendono in
   * prestito uno (`_base` su un verbale).
   */
  readonly genere: GenereRapporto | null
}

/**
 * I modelli del programma, nell'ordine dell'elenco: strati comuni, rapporti,
 * firma delle e-mail.
 */
export const CATALOGO_MODELLI: readonly VoceCatalogo[] = [
  voce('_base', 'comune', 'lezione'),
  voce('_stile', 'comune', 'valutazioni'),
  voce('_testi', 'comune', 'presenze'),
  // Le stesse parole nelle altre lingue, guardate sullo stesso foglio.
  voce('_testi-de', 'comune', 'presenze'),
  voce('_testi-fr', 'comune', 'presenze'),
  voce('_testi-en', 'comune', 'presenze'),
  voce('_blocchi', 'comune', 'lezione'),
  voce('verbale-lezione', 'rapporto', 'lezione'),
  voce('piano-lezione', 'rapporto', 'piano'),
  voce('valutazioni-classe', 'rapporto', 'valutazioni'),
  voce('presenze-classe', 'rapporto', 'presenze'),
  voce('scheda-allievo', 'rapporto', 'allievo'),
  voce('momento-valutazione', 'rapporto', 'momento'),
  voce('fascicolo-classe', 'rapporto', 'fascicolo'),
  voce('foto-classe', 'rapporto', 'foto-classe'),
  voce('_firma.html', 'posta', null),
]

/**
 * Una voce del catalogo: titolo e aiuto si leggono al momento, così seguono la
 * lingua anche nel main process, dove si sceglie dopo il caricamento.
 */
function voce (
  nome: keyof ReturnType<typeof testi>['modelli'],
  ruolo: RuoloModello,
  genere: GenereRapporto | null,
): VoceCatalogo {
  return {
    nome,
    ruolo,
    genere,
    get titolo () { return testi().modelli[nome].titolo },
    get aiuto () { return testi().modelli[nome].aiuto },
  }
}

/** La voce del catalogo con quel nome, o niente se il file non è dei nostri. */
export function voceModello (nome: string): VoceCatalogo | null {
  return CATALOGO_MODELLI.find((voce) => voce.nome === nome) ?? null
}

/**
 * Come si legge un modello: il titolo del catalogo, o il nome così com'è per
 * uno che il catalogo non conosce — non sparisce e non è un errore.
 */
export function titoloModello (nome: string): string {
  return voceModello(nome)?.titolo ?? nome
}

/**
 * Su quale rapporto si guarda l'anteprima di un modello: il suo, o quello
 * prestato a uno strato comune. `null` se non c'è niente da guardare (la
 * firma non è un PDF).
 */
export function genereDiProva (nome: string): GenereRapporto | null {
  return voceModello(nome)?.genere ?? null
}

/**
 * Il nome del file: `_base` è `_base.tpl`, `_firma.html` è già un file. Serve
 * al controllo del nome in `sorgenteModello` e alla lettura della cartella
 * `templates/` accanto a un documento, da cui si importa l'intestazione.
 */
export function fileDelModello (nome: string): string {
  return nome.includes('.') ? nome : `${nome}.tpl`
}

/**
 * I nomi di file ammessi per un modello (modelli, firma, immagini della
 * cartella `templates/`). Solo nomi semplici: un nome che arriva da fuori non
 * deve uscire dalla cartella.
 */
export function nomeFileAmmesso (file: string): boolean {
  return /^[A-Za-z0-9_ -]+\.(tpl|html|png|jpe?g)$/i.test(file)
}

/** Se quel file è un modello di testo, e non un'immagine. */
export function fileDiTesto (file: string): boolean {
  return /\.(tpl|html)$/i.test(file)
}

/**
 * Il file con le parole dei rapporti in una lingua: `_testi`, `_testi-de`…
 * I modelli chiamano le parole per nome e la lingua di stampa sceglie il file.
 * Trattino e non punto: il punto distingue la firma (`_firma.html`).
 */
export function fileDeiTesti (lingua: Lingua): string {
  return lingua === LINGUA_PREDEFINITA ? '_testi' : `_testi-${lingua}`
}
