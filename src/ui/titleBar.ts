// La barra del titolo, disegnata dal registro invece che dal sistema.
//
// Sotto una cornice di sistema il cappello del registro era alto quattro
// strisce: la barra del titolo, la barra dei menu di Windows, la riga della
// navigazione e quella delle azioni. Tre di quelle dicevano la stessa cosa in
// tre modi — il nome del programma, i suoi comandi, i suoi comandi di nuovo —
// e la sola che diceva su *che cosa* si stava lavorando non c'era: il titolo
// della finestra era la parola «Registro», uguale per ogni anno aperto.
//
// Questa barra è quella di sistema: `environment/windows.ts` la nasconde e la
// pagina la rifà, così la prima striscia porta il documento aperto invece del
// nome del programma. Quel che c'è dentro è quel che riguarda il registro
// intero — dove si va, che documento è, come si cerca — mentre il contesto
// della pagina resta nella riga sotto, in `commandBar.ts`.
//
// ## Che cosa si trascina
//
// Tutta la barra è area di trascinamento — `-webkit-app-region: drag` — e ogni
// pulsante dentro se ne toglie: senza, premerlo sposterebbe la finestra invece
// di eseguirlo. La regola sta nel CSS una volta sola, sui figli interattivi.
// Il doppio clic per ingrandire arriva in regalo dall'area di trascinamento.
//
// ## I tre pulsanti di sistema
//
// Non li disegna questa barra, e non è una rinuncia: su Windows e Linux li
// mette il sistema sopra la fascia (`titleBarOverlay`), e con loro arrivano il
// passaggio del mouse sui riquadri di Windows 11 e i suggerimenti tradotti; su
// macOS restano i tre semafori, che non si tolgono e che nessuno vorrebbe
// altrove. Lo spazio che occupano lo dichiara Chromium in
// `env(titlebar-area-*)`, e su macOS lo fa il CSS leggendo `data-sistema`.

import { tendinaDelProgramma, pulsanteCerca } from './commandBar.js'
import { icona } from './components/icons.js'
import { h, type Figlio } from './dom.js'
import { nomeDelPosto } from './pages.js'
import { interruttoreSidebar } from './sidebar.js'
import { stato } from './state.js'

/**
 * Il nome dell'anno aperto: `2026-2027`.
 *
 * Lo dice l'elenco dei documenti, dove l'ospite ha già segnato quale è aperto
 * — il confronto fra due percorsi è una regola del sistema operativo, e qui
 * dentro non si può rifare bene (vedi `DocumentoRecente.aperto`). Il percorso
 * si guarda solo se quell'elenco non lo contiene: capita a un documento aperto
 * da riga di comando e mai entrato fra i recenti.
 */
function nomeDelDocumento (): string | null {
  const corrente = stato.documenti.corrente
  if (!corrente) return null
  const noto = stato.documenti.elenco.find((file) => file.aperto)
  if (noto) return noto.nome
  const ultimo = corrente.split(/[\\/]/).pop() ?? corrente
  return ultimo.replace(/\.registro$/i, '')
}

/** La cartella dell'anno aperto, per il suggerimento: due anni omonimi si distinguono così. */
function cartellaDelDocumento (): string | null {
  return stato.documenti.elenco.find((file) => file.aperto)?.cartella
    ?? stato.documenti.corrente
}

/**
 * Il centro: il documento e la pagina.
 *
 * In mezzo davvero — `position: absolute` e non un elemento della riga — così
 * non si sposta di lato quando a sinistra compare un pulsante in più. È la
 * differenza fra un titolo e un'etichetta che galleggia.
 *
 * Non si preme: è l'unico punto largo da cui prendere la finestra per
 * spostarla, e un elemento premibile lì dentro dovrebbe togliersi dall'area di
 * trascinamento. I recenti si aprono dal menu «File», a due centimetri.
 */
function nomeAlCentro (): Figlio {
  const documento = nomeDelDocumento()
  const cartella = cartellaDelDocumento()

  return h(
    'div',
    {
      class: 'barra-titolo__nome',
      attr: {
        title: documento
          ? `${documento}${cartella ? ` — ${cartella}` : ''}`
          : 'Nessun anno aperto: si apre da «File»',
      },
    },
    icona('libro', 'icona--minuta'),
    documento
      ? h('strong', { class: 'barra-titolo__documento' }, documento)
      : h('span', { class: 'barra-titolo__documento barra-titolo__documento--vuoto' }, 'Nessun anno aperto'),
    // La pagina in coda al documento, smorzata: è la seconda domanda — prima
    // «di che anno è quel che vedo», poi «dove sono dentro».
    h('span', { class: 'barra-titolo__separatore', attr: { 'aria-hidden': 'true' } }, '·'),
    h('span', { class: 'barra-titolo__pagina' }, nomeDelPosto()),
  )
}

/**
 * La barra del titolo del registro.
 *
 * `role="banner"` e non `header` nudo: per chi naviga a voce è la testata
 * dell'applicazione, ed è il punto da cui si raggiungono navigazione, menu e
 * ricerca senza attraversare la pagina.
 */
export function barraTitolo (): Figlio {
  return h(
    'header',
    { class: 'barra-titolo', attr: { role: 'banner' } },
    // A sinistra le due cose che valgono per tutto il registro: la
    // navigazione che si apre e si chiude, e il menu del documento. Stavano
    // nella riga sotto, in mezzo al contesto della pagina — che è il posto in
    // cui si cerca il corso, non il posto in cui si cerca «apri un anno».
    h('div', { class: 'barra-titolo__lato' }, interruttoreSidebar(), tendinaDelProgramma()),
    nomeAlCentro(),
    h('div', { class: 'barra-titolo__lato barra-titolo__lato--destra' }, pulsanteCerca()),
  )
}
