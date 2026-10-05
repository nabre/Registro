// La barra del titolo, disegnata dal registro: `environment/windows.ts`
// nasconde quella di sistema. Porta quel che vale per il registro intero — menu
// «File», storia, documento aperto e percorso — e a destra la ricerca (la
// palette di Ctrl+K); il contesto della pagina sta sotto, in `commandBar.tsx`.
//
// Tutta la barra è area di trascinamento (`-webkit-app-region: drag`) e ogni
// pulsante se ne toglie nel CSS; il doppio clic per ingrandire viene da sé.
// I pulsanti della finestra li mette il sistema (`titleBarOverlay` su Windows e
// Linux, i semafori su macOS); il loro spazio è in `env(titlebar-area-*)`, e su
// macOS il CSS legge `data-sistema`.

import type { ReactElement, ReactNode } from 'react'

import { percorso as percorsoDellaPagina } from './breadcrumb.js'
import { tendinaDelProgramma } from './commandBar.js'
import { comandoPerId, eseguiComando, titoloDi } from './commands.js'
import { Icona } from './components/icons.js'
import { Logo } from './components/logo.js'
import { apriPalette } from './components/palette.js'
import { testi as testiPalette } from './components/palette.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from './classNames.js'
import { azione } from './bridge.js'
import { alternaMenuSotto, tendinaAperta, type ElementoMenu } from './components/menu.js'
import { nomeDelPosto } from './pages.js'
import { ridisegna, stato, vai } from './state.js'
import { pulsanteDelGesto, statoDegliAggiornamenti } from './views/settings/updates.js'
import {
  PRINCIPALE,
  etichettaDellaFinestra,
  finestreAperte,
  numeroDellaFinestra,
  èFiglia,
} from './windows.js'
import { testi } from './titleBar.testi.js'
import { testi as testiFinestre } from './windows.testi.js'

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
function marchio (): ReactElement {
  // L'host segna la pagina quando gira da sorgenti (`npm run dev` o `npm run
  // start`): così non si scambia la finestra di prova con il registro installato.
  const modo = document.documentElement.dataset.sviluppo
  return (
    <span className="barra-titolo__marchio" aria-hidden="true">
      <Logo classe="barra-titolo__marchio-segno" />
      {modo === 'dev' || modo === 'start'
        // testo-fisso: segno di sviluppo, uguale in ogni lingua
        ? <span className={classi('barra-titolo__sviluppo', `barra-titolo__sviluppo--${modo}`)}>{modo.toUpperCase()}</span>
        : null}
    </span>
  )
}

/**
 * Il centro: il documento e il percorso. Centrato davvero (`position:
 * absolute`), così non si sposta quando a sinistra compare un pulsante. Non si
 * preme: è il punto largo da cui si prende la finestra.
 */
function nomeAlCentro (): ReactElement {
  const percorso = percorsoDelDocumento()
  const documento = percorso ? nomeDelDocumento(percorso) : null
  const t = testi()

  return (
    <div
      className="barra-titolo__nome"
      title={percorso
        ? stato.documenti.provvisorio
          ? t.nonSalvatoTitolo(percorso)
          : percorso
        : t.nessunAnnoTitolo}
    >
      <Icona nome="libro" classe="icona--minuta" />
      {documento
        ? <strong className="barra-titolo__documento">{documento}</strong>
        : <span className="barra-titolo__documento barra-titolo__documento--vuoto">{t.nessunAnno}</span>}
      {/* Un anno nuovo sta in una cartella provvisoria finché non lo si salva con nome. */}
      {documento && stato.documenti.provvisorio
        ? <span className="barra-titolo__pagina">{t.nonSalvato}</span>
        : null}
      {/* Il percorso in coda al documento, smorzato. */}
      {percorsoDellaPagina()}
    </div>
  )
}

/**
 * ↶ e ↷: annulla e ripristina, con i passi nel suggerimento. Qui perché valgono
 * per il registro intero; spenti quando non c'è niente. Passano dagli stessi
 * comandi di Ctrl+Z e Ctrl+Y.
 */
function pulsanteStoria (verso: 'annulla' | 'ripristina'): ReactNode {
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
  return (
    <button
      className="barra-titolo__storia"
      type="button"
      disabled={quanti === 0}
      title={`${titolo} — ${passi}`}
      aria-label={nome}
      onClick={() => void eseguiComando(comando)}
    >
      <Icona nome={verso} classe="icona--minuta" />
    </button>
  )
}

/**
 * La ricerca: una pastiglia con la lente, «Cerca…» e il tasto (Ctrl K, ⌘ K su
 * Mac), perché una scorciatoia invisibile la conosce solo chi l'ha imparata.
 * Stretta e quieta: il nome al centro si stringe per lasciarle posto
 * (`title-bar.css`, `--barra-titolo-riserva`); su finestra stretta resta la
 * lente; solo il pulsante esce dall'area di trascinamento.
 */
function pastigliaCerca (): ReactElement {
  const mac = document.documentElement.dataset.sistema === 'darwin'
  const tasti = mac ? ['⌘', 'K'] : ['Ctrl', 'K'] // testo-fisso: nomi dei tasti
  const scorciatoia = mac ? '⌘K' : 'Ctrl+K' // testo-fisso: nomi dei tasti
  const spiegazione = testiPalette().cerca
  return (
    <button
      className="barra-titolo__cerca"
      type="button"
      // Il fuoco torna qui quando la palette si chiude, anche dopo un ridisegno (`rifocalizza`).
      data-fuoco="barra-cerca"
      title={`${spiegazione} (${scorciatoia})`}
      aria-label={spiegazione}
      aria-haspopup="dialog"
      aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'} // testo-fisso: nomi dei tasti per i lettori di schermo
      onClick={() => apriPalette()}
    >
      <Icona nome="lente" classe="icona--minuta" />
      <span className="barra-titolo__cerca-testo">{`${parole().cerca}…`}</span>
      <span className="barra-titolo__cerca-tasti" aria-hidden="true">
        {tasti.map((tasto) => <kbd key={tasto}>{tasto}</kbd>)}
      </span>
    </button>
  )
}

/**
 * Il filetto degli aggiornamenti, solo quando c'è una versione nuova: a destra,
 * senza spingere né coprire. La notizia in due parole (porta alla sezione), il
 * gesto del momento, la ✕; lo scarico è un filo sul bordo di sotto.
 */
function filettoAggiornamenti (): ReactNode {
  const s = statoDegliAggiornamenti()
  const notizia = s?.racconto.notizia
  if (!s || !notizia || notizia === s.notiziaNascosta) return null
  const { breve, frase, tono, quota } = s.racconto

  return (
    // testo-fisso: classe CSS
    <div className={classi('filetto', `filetto--${tono}`)} role="status">
      <Icona nome="ricarica" classe="icona--minuta" />
      <button
        className="filetto__testo"
        type="button"
        title={testi().apriAggiornamenti(frase)}
        onClick={() => { vai({ pagina: 'pagina.impostazioni', scheda: 'programma#aggiornamenti' }) }}
      >
        {breve}
      </button>
      {pulsanteDelGesto(s)}
      <button
        className="filetto__chiudi"
        type="button"
        title={testi().nascondi}
        aria-label={testi().nascondi}
        onClick={() => {
          s.notiziaNascosta = notizia
          void azione({ tipo: 'aggiornamenti.nascondiNotizia', notizia })
          ridisegna()
        }}
      >
        <Icona nome="chiudi" classe="icona--minuta" />
      </button>
      {quota === undefined
        ? null
        : <span className="filetto__quota"><span style={{ width: `${Math.round(quota * 100)}%` }} /></span>}
    </div>
  )
}

/**
 * Le voci del menu delle finestre: la principale, poi ogni figlia col suo
 * numero e la sua pagina, da portare davanti o da chiudere. La principale si
 * chiude dalla sua ✕, e con lei le altre.
 */
function vociDelleFinestre (): ElementoMenu[] {
  const t = testiFinestre()
  const numero = numeroDellaFinestra()
  const voci: ElementoMenu[] = []
  for (const finestra of finestreAperte()) {
    const nome = t.vociDellaFinestra(finestra.n, finestra.titolo)
    if (finestra.n === PRINCIPALE) {
      voci.push({
        testo: nome,
        simbolo: 'schermo',
        accesa: numero === PRINCIPALE,
        al: () => { void azione({ tipo: 'finestra.principale' }) },
      })
      continue
    }
    voci.push(
      'separatore',
      { titolo: nome, simbolo: 'duplica' },
      { testo: t.portaDavanti, rientro: true, al: () => { void azione({ tipo: 'finestra.porta', n: finestra.n }) } },
      { testo: t.chiudi, rientro: true, al: () => { void azione({ tipo: 'finestra.chiudi', n: finestra.n }) } },
    )
  }
  return voci
}

/**
 * Le finestre del registro, nella barra. La principale lo dice solo quando
 * ce ne sono altre («Principale · 3»), e premendo apre il loro menu; una
 * figlia sempre, col suo numero e la pagina («Finestra 2 · Calendario»).
 */
function finestreDelRegistro (): ReactNode {
  const t = testiFinestre()
  const numero = numeroDellaFinestra()
  const aperte = finestreAperte()
  const etichetta = etichettaDellaFinestra(numero, aperte, nomeDelPosto())
  if (!etichetta) return null
  // Il ritorno alla principale sta nella riga dei comandi, dove la principale
  // ha «Nuova finestra» (`windowButton.tsx`).
  if (èFiglia()) return <span className="barra-titolo__finestra" title={t.figliaTitolo}>{etichetta}</span>
  return (
    <button
      className="barra-titolo__finestra barra-titolo__finestra--menu"
      type="button"
      // testo-fisso: chiave di fuoco
      data-fuoco="barra-finestre"
      title={t.principaleTitolo(aperte.length)}
      aria-haspopup="menu"
      aria-expanded={tendinaAperta('barra-finestre')}
      onClick={(evento) => alternaMenuSotto(evento.currentTarget, vociDelleFinestre())}
    >
      <Icona nome="schermo" classe="icona--minuta" />
      <span>{etichetta}</span>
    </button>
  )
}

/**
 * La barra del titolo del registro. `role="banner"`: per chi naviga a voce è
 * la testata dell'applicazione. In una finestra figlia è snella: niente menu
 * «File» né aggiornamenti, che sono del programma e stanno nella principale.
 */
export function barraTitolo (): ReactElement {
  const figlia = èFiglia()
  return (
    <header className="barra-titolo" role="banner" data-telaio="barra-titolo">
      {/* A sinistra il segno (largo quanto la colonna delle icone, non si sposta),
          il menu «File» e subito dopo le frecce della storia, dove ogni programma
          tiene «Modifica»; poi le finestre del registro, se ce n'è più di una. */}
      <div className="barra-titolo__lato">
        {marchio()}
        {figlia ? null : tendinaDelProgramma()}
        {pulsanteStoria('annulla')}
        {pulsanteStoria('ripristina')}
        {finestreDelRegistro()}
      </div>
      {nomeAlCentro()}
      {/* A destra il filetto degli aggiornamenti, se c'è, e per ultima la ricerca,
          sempre nello stesso punto contro i pulsanti della finestra. L'uscita sta nel
          menu «File». */}
      <div className="barra-titolo__lato barra-titolo__lato--destra">
        {figlia ? null : filettoAggiornamenti()}
        {pastigliaCerca()}
      </div>
    </header>
  )
}
