// La barra del titolo, disegnata dal registro: `environment/windows.ts`
// nasconde quella di sistema. Porta quel che vale per il registro intero — menu
// «File», storia, documento aperto e percorso — e a destra la ricerca (la
// palette di Ctrl+K); il contesto della pagina sta sotto, in `commandBar.ts`.
//
// Tutta la barra è area di trascinamento (`-webkit-app-region: drag`) e ogni
// pulsante se ne toglie nel CSS; il doppio clic per ingrandire viene da sé.
// I pulsanti della finestra li mette il sistema (`titleBarOverlay` su Windows e
// Linux, i semafori su macOS); il loro spazio è in `env(titlebar-area-*)`, e su
// macOS il CSS legge `data-sistema`.

import { percorso as percorsoDellaPagina } from './breadcrumb.js'
import { tendinaDelProgramma } from './commandBar.js'
import { comandoPerId, eseguiComando, titoloDi } from './commands.js'
import { icona } from './components/icons.js'
import { logo } from './components/logo.js'
import { apriPalette } from './components/palette.js'
import { testi as testiPalette } from './components/palette.testi.js'
import { parole } from '../domain/words.testi.js'
import { h, type Figlio } from './dom.js'
import { aggiorna, stato } from './state.js'
import { pulsanteDelGesto, statoDegliAggiornamenti } from './views/settings/updates.js'
import { testi } from './titleBar.testi.js'

/**
 * Il percorso intero del file aperto, per il suggerimento. Lo dà l'elenco dei
 * documenti, dove l'host ha già segnato quello aperto (confrontare percorsi è
 * affare del sistema, vedi `DocumentoRecente.aperto`); se l'elenco non lo ha,
 * quello corrente.
 */
function percorsoDelDocumento (): string | null {
  const corrente = stato.documenti.corrente
  if (!corrente) return null
  return stato.documenti.elenco.find((file) => file.aperto)?.percorso ?? corrente
}

/** Il nome del file aperto senza `.regi` (`2026-2027`); intero nel suggerimento. */
function nomeDelDocumento (percorso: string): string {
  const file = percorso.split(/[\\/]/).filter(Boolean).pop() ?? percorso
  return file.replace(/\.regi$/i, '') || file
}

/**
 * Il segno del programma in cima a sinistra (`resources/registro.svg`). Non si
 * preme: su Windows l'icona della barra apre il menu di sistema, e un gesto
 * diverso confonderebbe; così resta area di trascinamento. Nascosto ai lettori
 * di schermo, perché il nome lo dice il titolo della finestra.
 */
function marchio (): Figlio {
  return h('span', { class: 'barra-titolo__marchio', attr: { 'aria-hidden': 'true' } },
    logo('barra-titolo__marchio-segno'))
}

/**
 * Il centro: il documento e il percorso. Centrato davvero (`position:
 * absolute`), così non si sposta quando a sinistra compare un pulsante. Non si
 * preme: è il punto largo da cui si prende la finestra.
 */
function nomeAlCentro (): Figlio {
  const percorso = percorsoDelDocumento()
  const documento = percorso ? nomeDelDocumento(percorso) : null
  const t = testi()

  return h(
    'div',
    {
      class: 'barra-titolo__nome',
      attr: {
        title: percorso
          ? stato.documenti.provvisorio
            ? t.nonSalvatoTitolo(percorso)
            : percorso
          : t.nessunAnnoTitolo,
      },
    },
    icona('libro', 'icona--minuta'),
    documento
      ? h('strong', { class: 'barra-titolo__documento' }, documento)
      : h(
          'span',
          { class: 'barra-titolo__documento barra-titolo__documento--vuoto' },
          t.nessunAnno,
        ),
    // Un anno nuovo sta in una cartella provvisoria finché non lo si salva con nome.
    documento && stato.documenti.provvisorio
      ? h('span', { class: 'barra-titolo__pagina' }, t.nonSalvato)
      : null,
    // Il percorso in coda al documento, smorzato.
    percorsoDellaPagina(),
  )
}

/**
 * ↶ e ↷: annulla e ripristina, con i passi nel suggerimento. Qui perché valgono
 * per il registro intero; spenti quando non c'è niente. Passano dagli stessi
 * comandi di Ctrl+Z e Ctrl+Y.
 */
function pulsanteStoria (verso: 'annulla' | 'ripristina'): Figlio {
  const comando = comandoPerId(verso === 'annulla' ? 'modifica.annulla' : 'modifica.ripristina')
  if (!comando) return null
  const quanti = stato.storia[verso]
  const t = testi()
  // Il nome e il tasto del comando, come nella palette e nel menu.
  const nome = titoloDi(comando)
  const titolo = `${nome} (${comando.scorciatoia})`
  const passi = quanti === 0
    ? verso === 'annulla' ? t.nienteDaAnnullare : t.nienteDaRipristinare
    : t.passi(quanti)
  return h(
    'button',
    {
      class: 'barra-titolo__storia',
      type: 'button',
      disabled: quanti === 0,
      attr: {
        title: `${titolo} — ${passi}`,
        'aria-label': nome,
      },
      onclick: () => void eseguiComando(comando),
    },
    icona(verso, 'icona--minuta'),
  )
}

/**
 * La ricerca: una pastiglia con la lente, «Cerca…» e il tasto (Ctrl K, ⌘ K su
 * Mac), perché una scorciatoia invisibile la conosce solo chi l'ha imparata.
 * Stretta e quieta: il nome al centro si stringe per lasciarle posto
 * (`title-bar.css`, `--barra-titolo-riserva`); su finestra stretta resta la
 * lente; solo il pulsante esce dall'area di trascinamento.
 */
function pastigliaCerca (): Figlio {
  const mac = document.documentElement.dataset.sistema === 'darwin'
  const tasti = mac ? ['⌘', 'K'] : ['Ctrl', 'K'] // testo-fisso: nomi dei tasti
  const scorciatoia = mac ? '⌘K' : 'Ctrl+K' // testo-fisso: nomi dei tasti
  const spiegazione = testiPalette().cerca
  return h(
    'button',
    {
      class: 'barra-titolo__cerca',
      type: 'button',
      // Il fuoco torna qui quando la palette si chiude, anche dopo un ridisegno (`rifocalizza`).
      dataset: { fuoco: 'barra-cerca' },
      attr: {
        title: `${spiegazione} (${scorciatoia})`,
        'aria-label': spiegazione,
        'aria-haspopup': 'dialog',
        'aria-keyshortcuts': mac ? 'Meta+K' : 'Control+K', // testo-fisso: nomi dei tasti per i lettori di schermo
      },
      onclick: () => apriPalette(),
    },
    icona('lente', 'icona--minuta'),
    h('span', { class: 'barra-titolo__cerca-testo' }, `${parole().cerca}…`),
    h('span', { class: 'barra-titolo__cerca-tasti', attr: { 'aria-hidden': 'true' } },
      ...tasti.map((tasto) => h('kbd', null, tasto))),
  )
}

/**
 * La notizia chiusa con la ✕ del filetto (`RaccontoAggiornamenti.notizia`),
 * finché il pannello resta aperto: la notizia dopo ha un'altra chiave.
 */
let notiziaNascosta: string | undefined

/**
 * Il filetto degli aggiornamenti, solo quando c'è una versione nuova: a destra,
 * senza spingere né coprire. La notizia in due parole (porta alla sezione), il
 * gesto del momento, la ✕; lo scarico è un filo sul bordo di sotto.
 */
function filettoAggiornamenti (): Figlio {
  const s = statoDegliAggiornamenti()
  const notizia = s?.racconto.notizia
  if (!s || !notizia || notizia === notiziaNascosta) return null
  const { breve, frase, tono, quota } = s.racconto

  return h(
    'div',
    // testo-fisso: classe CSS
    { class: ['filetto', `filetto--${tono}`], attr: { role: 'status' } },
    icona('ricarica', 'icona--minuta'),
    h(
      'button',
      {
        class: 'filetto__testo',
        type: 'button',
        attr: { title: testi().apriAggiornamenti(frase) },
        onclick: () => aggiorna({
          vista: 'impostazioni',
          ambitoImpostazioni: 'programma',
          schedaProgramma: 'aggiornamenti',
        }),
      },
      breve,
    ),
    pulsanteDelGesto(s),
    h(
      'button',
      {
        class: 'filetto__chiudi',
        type: 'button',
        attr: {
          title: testi().nascondi,
          'aria-label': testi().nascondi,
        },
        onclick: () => {
          notiziaNascosta = notizia
          aggiorna({})
        },
      },
      icona('chiudi', 'icona--minuta'),
    ),
    quota === undefined
      ? null
      : h('span', { class: 'filetto__quota' }, h('span', { style: { width: `${Math.round(quota * 100)}%` } })),
  )
}

/**
 * La barra del titolo del registro. `role="banner"`: per chi naviga a voce è
 * la testata dell'applicazione.
 */
export function barraTitolo (): Figlio {
  return h(
    'header',
    { class: 'barra-titolo', attr: { role: 'banner' } },
    // A sinistra il segno (largo quanto la colonna delle icone, non si sposta),
    // il menu «File» e subito dopo le frecce della storia, dove ogni programma
    // tiene «Modifica».
    h(
      'div',
      { class: 'barra-titolo__lato' },
      marchio(),
      tendinaDelProgramma(),
      pulsanteStoria('annulla'),
      pulsanteStoria('ripristina'),
    ),
    nomeAlCentro(),
    // A destra il filetto degli aggiornamenti, se c'è, e per ultima la ricerca,
    // sempre nello stesso punto contro i pulsanti della finestra. L'uscita sta nel
    // menu «File».
    h(
      'div',
      { class: 'barra-titolo__lato barra-titolo__lato--destra' },
      filettoAggiornamenti(),
      pastigliaCerca(),
    ),
  )
}
