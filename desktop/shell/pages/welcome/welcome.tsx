// La pagina di benvenuto: l'elenco degli anni noti e le due strade per
// cominciare. Riceve l'elenco già fatto (`environment/documents.ts`) e rimanda
// gesti, che esegue `desktop/shell/windows/welcome.ts`. In React (ADR-56):
// `welcome.html` porta solo la fascia e il contenitore.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '#desktop/shell/pages/shared/titleBar.js'
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { DocumentoNoto } from '#desktop/apparato/documents.js'
import type { RaccontoAggiornamenti, StatoAggiornamenti } from '#contract/protocol.js'
import type { RichiestaBenvenuto } from '#desktop/shell/windows/welcome.js'
import { allEsc, ascolta, manda, perId } from '#desktop/shell/pages/shared/page.js'
import { Innesto } from '#core/controlli/dom.js'
import { parole } from '#core/dominio/words.testi.js'
import { LINGUE, NOMI_DELLE_LINGUE, SCELTA_SISTEMA, lingua, èLingua } from '#core/i18n/index.js'
import { bandiera } from '#core/i18n/flags.js'
import { testi } from './welcome.testi.js'

import './welcome.css'

// testo-fisso: il marchio non si traduce
const MARCHIO = 'Regiklass'

/** Quel che il main process ha detto finora: la pagina si disegna da qui. */
const detto: {
  invito: string
  versione: string
  /** `null` finché l'elenco non arriva. */
  voci: DocumentoNoto[] | null
  /** La lingua scritta nelle impostazioni, magari `sistema`. */
  sceltaScritta: string
  aggiornamenti: { stato: StatoAggiornamenti, nascosta: string | undefined } | null
} = {
  invito: '',
  versione: '',
  voci: null,
  sceltaScritta: SCELTA_SISTEMA,
  aggiornamenti: null,
}

function chiedi (richiesta: RichiestaBenvenuto): void {
  manda(richiesta)
}

// Esc chiude, come ovunque: qui vuol dire rinunciare. Col menu della lingua
// aperto chiude solo lui (il menu ferma il tasto prima).
allEsc(() => chiedi({ benvenuto: 'esci' }))

// ------------------------------------------------------------- l'elenco

/** Un gesto di contorno: la stella e la croce, che non aprono niente. */
function Gesto ({ etichetta, titolo, acceso, al }: {
  etichetta: string
  titolo: string
  acceso: boolean
  al: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className={acceso ? 'acceso' : undefined}
      title={titolo}
      aria-label={titolo}
      onClick={(evento) => {
        // O il clic arriverebbe anche alla riga e aprirebbe l'anno.
        evento.stopPropagation()
        al()
      }}
    >
      {etichetta}
    </button>
  )
}

function Riga ({ voce }: { voce: DocumentoNoto }): ReactElement {
  const t = testi()
  return (
    <li
      className={voce.mancante ? 'voce voce--mancante' : 'voce'}
      title={voce.percorso}
      // Un file che adesso manca non si apre, ma resta in elenco: può tornare.
      onClick={voce.mancante ? undefined : () => chiedi({ benvenuto: 'apriPercorso', percorso: voce.percorso })}
    >
      <div className="voce__dati">
        <span className="voce__etichetta">{voce.nome}</span>
        <span className="voce__sotto">{voce.mancante ? t.nonDisponibile(voce.cartella) : voce.cartella}</span>
      </div>
      <div className="gesti">
        <Gesto
          etichetta={voce.preferito ? '★' : '☆'}
          titolo={voce.preferito ? t.togliDaiPreferiti : t.tieniDaParte}
          acceso={voce.preferito}
          al={() => chiedi({ benvenuto: 'preferito', percorso: voce.percorso, valore: !voce.preferito })}
        />
        <Gesto
          etichetta="✕"
          titolo={t.dimentica}
          acceso={false}
          al={() => chiedi({ benvenuto: 'dimentica', percorso: voce.percorso })}
        />
      </div>
    </li>
  )
}

// ------------------------------------------------------------- la lingua
//
// Un bottone discreto con la bandiera della lingua di adesso, e un menu con le
// scelte di `registroDocenti.aspetto.lingua`: ognuna col suo nome, così la
// trova anche chi non legge la lingua in cui il registro parla adesso. La
// pagina la lingua risolta la sa già (`core/i18n/page.ts`); la scelta scritta
// — magari `sistema` — gliela manda il main process.

/** Una bandiera di `flags.ts`, dentro uno `<span>` che non fa scatola. */
function Bandiera ({ di }: { di: (typeof LINGUE)[number] }): ReactElement {
  return <Innesto chiave={di} nodi={() => [bandiera(di)]} style={{ display: 'contents' }} />
}

function Lingua ({ sceltaScritta }: { sceltaScritta: string }): ReactElement {
  const t = testi()
  const [aperto, impostaAperto] = useState(false)
  const bottone = useRef<HTMLButtonElement | null>(null)
  const menu = useRef<HTMLUListElement | null>(null)
  const appenaAperto = useRef(false)
  const adesso = lingua()
  const detta = t.linguaAdesso(NOMI_DELLE_LINGUE[adesso], sceltaScritta === SCELTA_SISTEMA)

  const voci = (): HTMLElement[] =>
    [...menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []]

  const apri = (): void => {
    appenaAperto.current = true
    impostaAperto(true)
  }

  const chiudi = (ridaiFuoco: boolean): void => {
    impostaAperto(false)
    if (ridaiFuoco) bottone.current?.focus()
  }

  const scegli = (valore: string): void => {
    chiudi(true)
    if (valore !== sceltaScritta) chiedi({ benvenuto: 'lingua', scelta: valore })
  }

  // Aperto: il fuoco sulla scelta di adesso, o sulla prima.
  useLayoutEffect(() => {
    if (!aperto || !appenaAperto.current) return
    appenaAperto.current = false
    const tutte = voci()
    ;(tutte.find((voce) => voce.getAttribute('aria-checked') === 'true') ?? tutte[0])?.focus()
  }, [aperto])

  // Un clic fuori chiude il menu senza scegliere.
  useEffect(() => {
    if (!aperto) return
    const fuori = (evento: MouseEvent): void => {
      const dove = evento.target
      if (dove instanceof Node && (menu.current?.contains(dove) || bottone.current?.contains(dove))) return
      impostaAperto(false)
    }
    document.addEventListener('click', fuori)
    return () => document.removeEventListener('click', fuori)
  }, [aperto])

  return (
    <div className="lingua">
      <button
        ref={bottone}
        type="button"
        className="minuto lingua__bottone"
        aria-haspopup="menu"
        aria-expanded={aperto ? 'true' : 'false'}
        aria-controls="lingua-menu"
        title={detta}
        aria-label={detta}
        onClick={() => (aperto ? chiudi(true) : apri())}
        onKeyDown={(evento) => {
          if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return
          evento.preventDefault()
          apri()
        }}
      >
        <Bandiera di={adesso} />
        <span className="lingua__sigla">{adesso.toUpperCase()}</span>
      </button>
      <ul
        ref={menu}
        className="lingua__menu"
        id="lingua-menu"
        role="menu"
        aria-label={t.lingua}
        hidden={!aperto}
        onKeyDown={(evento) => {
          const tutte = voci()
          const qui = tutte.indexOf(document.activeElement as HTMLElement)
          const vai = (indice: number): void => tutte[(indice + tutte.length) % tutte.length]?.focus()
          switch (evento.key) {
            case 'ArrowDown':
              vai(qui + 1)
              break
            case 'ArrowUp':
              vai(qui - 1)
              break
            case 'Home':
              vai(0)
              break
            case 'End':
              vai(tutte.length - 1)
              break
            case 'Enter':
            case ' ': {
              const valore = tutte[qui]?.dataset.valore
              if (valore) scegli(valore)
              break
            }
            case 'Escape':
              // Prima di `allEsc`, che chiuderebbe la finestra.
              evento.stopPropagation()
              chiudi(true)
              break
            case 'Tab':
              chiudi(false)
              return
            default:
              return
          }
          evento.preventDefault()
        }}
      >
        {aperto
          ? [SCELTA_SISTEMA, ...LINGUE].map((valore) => (
              <li
                key={valore}
                className="lingua__voce"
                role="menuitemradio"
                aria-checked={valore === sceltaScritta ? 'true' : 'false'}
                tabIndex={-1}
                data-valore={valore}
                // Il nome è scritto nella sua lingua: il lettore di schermo lo pronunci così.
                lang={èLingua(valore) ? valore : undefined}
                onClick={() => scegli(valore)}
              >
                {èLingua(valore)
                  ? <><Bandiera di={valore} /><span>{NOMI_DELLE_LINGUE[valore]}</span></>
                  : (
                      <>
                        {/* Le quattro bandiere in un riquadro: «come il sistema», che può essere ognuna. */}
                        <Innesto
                          className="lingua__mosaico"
                          aria-hidden="true"
                          chiave="mosaico"
                          nodi={() => LINGUE.map((una) => bandiera(una))}
                        />
                        <span>{t.linguaSistema}</span>
                      </>
                    )}
              </li>
            ))
          : null}
      </ul>
    </div>
  )
}

// -------------------------------------------------------- gli aggiornamenti
//
// Lo stato arriva già a parole (`RaccontoAggiornamenti`): la pagina le mette
// al posto e rimanda il gesto proposto. Come nel registro: il piede dice sempre
// a che punto si è, il filetto in cima c'è solo con una notizia.

function GestoAggiornamento ({ gesto, id }: {
  gesto: RaccontoAggiornamenti['gesto'] | undefined
  id: string
}): ReactElement {
  return (
    <button
      type="button"
      className="minuto"
      id={id}
      hidden={!gesto}
      disabled={gesto?.spento === true}
      onClick={gesto ? () => chiedi({ benvenuto: 'aggiornamento', gesto: gesto.tipo }) : undefined}
    >
      {gesto?.testo ?? ''}
    </button>
  )
}

/** Il filetto: c'è solo con una notizia che non si è nascosta. */
function Filetto ({ racconto, visibile }: { racconto: RaccontoAggiornamenti | null, visibile: boolean }): ReactElement {
  const t = testi()
  return (
    <div className="filetto" id="filetto" role="status" hidden={!visibile} data-tono={visibile ? racconto?.tono : undefined}>
      {/* `ricarica` di `ui/components/icons.tsx`: la pagina non può importarlo,
          e il segno degli aggiornamenti deve essere lo stesso. */}
      <svg className="icona" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 11a8 8 0 1 0-.7 4.3" />
        <path d="M20 5v6h-6" />
      </svg>
      <span className="filetto__testo" id="filetto-testo">{visibile ? racconto?.frase : ''}</span>
      <GestoAggiornamento id="filetto-gesto" gesto={visibile ? racconto?.gesto : undefined} />
      <button
        type="button"
        className="minuto filetto__chiudi"
        id="filetto-chiudi"
        title={t.nascondiNotizia}
        aria-label={t.nascondiNotizia}
        onClick={() => chiedi({ benvenuto: 'nascondiNotizia', notizia: racconto?.notizia ?? '' })}
      >
        ✕
      </button>
      {/* Lo scarico: un filo lungo il bordo di sotto, non una barra in più. */}
      <span className="filetto__quota" id="filetto-quota" hidden={racconto?.quota === undefined}>
        <span style={{ width: `${Math.round((racconto?.quota ?? 0) * 100)}%` }} />
      </span>
    </div>
  )
}

// ----------------------------------------------------------------- la pagina

function Benvenuto (): ReactElement {
  const t = testi()
  const r = detto.aggiornamenti?.stato.racconto ?? null
  const conFiletto = r !== null && r.notizia !== undefined && r.notizia !== detto.aggiornamenti?.nascosta
  return (
    <>
      {/* Il filetto: c'è solo quando è uscita una versione nuova — trovata, in
          arrivo o pronta — e se ne va con la ✕ fino alla notizia successiva. Le
          parole e il gesto li scrive `environment/updates.ts`, gli stessi del
          filetto nella barra del titolo del registro. */}
      <Filetto racconto={r} visibile={conFiletto} />

      <header className="testata">
        <h1>{MARCHIO}</h1>
        <p className="invito" id="invito">{detto.invito}</p>
      </header>

      <div className="scelte">
        <button type="button" id="apri" data-ruolo="conferma" onClick={() => chiedi({ benvenuto: 'apri' })}>
          <span className="titolo">{t.apriAnno}</span>
          <span className="sotto">{t.apriAnnoSotto}</span>
        </button>
        <button type="button" id="crea" onClick={() => chiedi({ benvenuto: 'crea' })}>
          <span className="titolo">{t.creaAnno}</span>
          <span className="sotto">{t.creaAnnoSotto}</span>
        </button>
      </div>

      <section className="recenti">
        <h2>{t.recenti}</h2>
        <ul className="voci" id="elenco">
          {detto.voci?.length === 0 ? <li className="vuoto">{t.nessunAnno}</li> : null}
          {detto.voci?.map((voce) => <Riga key={voce.percorso} voce={voce} />)}
        </ul>
      </section>

      <footer className="piede">
        {/* La versione e, accanto, a che punto sono gli aggiornamenti: il controllo
            rapido, con il gesto che ha senso adesso. */}
        <div className="aggiornamento">
          <span className="quieto versione" id="versione">{detto.versione}</span>
          <span
            // testo-fisso: classi CSS
            className={r ? `pastiglia pastiglia--${r.tono}` : 'pastiglia'}
            id="aggiornamento-stato"
            hidden={!r}
            title={r?.frase}
          >
            {r?.breve ?? ''}
          </span>
          {/* Il gesto sta in un posto solo: nel filetto quando c'è, qui altrimenti. */}
          <GestoAggiornamento id="aggiornamento-gesto" gesto={conFiletto ? undefined : r?.gesto} />
        </div>
        <div className="piede__destra">
          {/* La lingua, nell'angolo: la bandiera di quella di adesso apre il menu
              delle altre, ognuna col suo nome. */}
          <Lingua sceltaScritta={detto.sceltaScritta} />
          {/* «Esci» è la parola di tutti: il catalogo della pagina non la ripete. */}
          <button type="button" id="esci" onClick={() => chiedi({ benvenuto: 'esci' })}>{parole().esci}</button>
        </div>
      </footer>
    </>
  )
}

const radice = createRoot(perId('radice'))

function disegna (): void {
  flushSync(() => radice.render(<Benvenuto />))
}

disegna()

ascolta((messaggio) => {
  if (messaggio.benvenuto === 'lingua') {
    const { scelta } = messaggio as { scelta?: unknown }
    detto.sceltaScritta = typeof scelta === 'string' ? scelta : SCELTA_SISTEMA
    disegna()
    return
  }
  if (messaggio.benvenuto === 'aggiornamenti') {
    const { stato, nascosta } = messaggio as { stato?: StatoAggiornamenti, nascosta?: string }
    if (stato) {
      detto.aggiornamenti = { stato, nascosta }
      disegna()
    }
    return
  }
  if (messaggio.benvenuto !== 'elenco') return
  const { invito, versione, voci } = messaggio as {
    invito?: string
    versione?: string
    voci?: DocumentoNoto[]
  }
  detto.invito = invito ?? ''
  detto.versione = versione ?? ''
  detto.voci = voci ?? []
  disegna()
  chiedi({ benvenuto: 'pronto' })
})
