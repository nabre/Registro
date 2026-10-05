// Chiedere una cosa, farne scegliere una, dirne una: `showInputBox`,
// `showQuickPick` e i messaggi (`chiediMessaggio`), in React (ADR-56).
//
// Tipo e parametri arrivano nella query (`indirizzo` in
// `environment/dialogs.ts`). Le etichette sono dati del docente: React le
// scrive come testo.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '#desktop/shell/pages/shared/titleBar.js'
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { ParametriDialogo, RispostaDialogo } from '#desktop/apparato/dialogs.js'
import { allEsc, ascolta, manda, perId } from '#desktop/shell/pages/shared/page.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './dialog.testi.js'

import './dialog.css'

type ParametriInput = Extract<ParametriDialogo, { tipo: 'input' }>
type ParametriElenco = Extract<ParametriDialogo, { tipo: 'elenco' }>
type ParametriMessaggio = Extract<ParametriDialogo, { tipo: 'messaggio' }>

const radice = perId('radice')
const parametri = JSON.parse(
  decodeURIComponent(new URLSearchParams(location.search).get('p') ?? '%7B%7D'),
) as ParametriDialogo
// Il titolo della finestra e della sua barra: `title` della finestra lo
// sostituirebbe il `<title>` della pagina.
if (parametri.titolo) document.title = parametri.titolo

function rispondi (risposta: RispostaDialogo): void {
  manda(risposta)
}

function annulla (): void {
  rispondi({ dialogo: 'annulla' })
}

/** Quanto è alta la pagina: il main process ci adatta la finestra e la mostra. */
function dichiaraAltezza (): void {
  rispondi({ dialogo: 'altezza', valore: Math.ceil(document.body.scrollHeight) })
}

// Esc chiude, da qualunque campo.
allEsc(annulla)

// L'anello del fuoco sui pulsanti compare dal primo tasto (`da-tastiera` in `dialog.css`).
document.addEventListener('keydown', () => {
  document.documentElement.classList.add('da-tastiera')
}, { once: true, capture: true })

/** Annulla e conferma, in fondo; la conferma si accende e si spegne. */
function Tasti ({ conferma, etichetta, spento }: {
  conferma: () => void
  etichetta: string
  spento: boolean
}): ReactElement {
  return (
    <div className="tasti">
      <button onClick={annulla}>{parole().annulla}</button>
      <button data-ruolo="conferma" disabled={spento} onClick={conferma}>{etichetta}</button>
    </div>
  )
}

// ----------------------------------------------------------- showInputBox

function Input ({ parametri }: { parametri: ParametriInput }): ReactElement {
  const campo = useRef<HTMLInputElement | null>(null)
  const [errore, impostaErrore] = useState('')
  // La validazione la fa il main process (`validateInput` non attraversa
  // l'IPC). Finché non risponde il bottone resta spento, come in
  // `showInputBox`. Le risposte arrivano in ordine, una per tasto: si contano
  // quelle in attesa e il bottone si riaccende solo all'ultima.
  const inAttesa = useRef(0)
  const [spento, impostaSpento] = useState(true)

  const conferma = (): void => {
    if (spento) return
    rispondi({ dialogo: 'conferma', testo: campo.current?.value ?? '' })
  }

  const chiediValidazione = (): void => {
    impostaSpento(true)
    inAttesa.current += 1
    rispondi({ dialogo: 'valida', testo: campo.current?.value ?? '' })
  }

  useEffect(() => {
    ascolta((messaggio) => {
      if (messaggio.dialogo !== 'errore') return
      const testo = typeof messaggio.messaggio === 'string' ? messaggio.messaggio : ''
      // Un errore della conferma non risponde a nessuna domanda: il conto non scende sotto zero.
      inAttesa.current = Math.max(0, inAttesa.current - 1)
      impostaErrore(testo)
      impostaSpento(Boolean(testo) || inAttesa.current > 0)
    })
    campo.current?.focus()
    campo.current?.select()
    chiediValidazione()
    dichiaraAltezza()
    // Una volta sola, all'apertura: l'ascolto vive quanto la pagina.

  }, [])

  // Un errore su due righe allunga la pagina già misurata: si ridichiara l'altezza.
  const primo = useRef(true)
  useLayoutEffect(() => {
    if (primo.current) {
      primo.current = false
      return
    }
    dichiaraAltezza()
  }, [errore])

  return (
    <>
      <h1>{parametri.titolo}</h1>
      {parametri.invito ? <p className="invito">{parametri.invito}</p> : null}
      {/* Non controllato: il valore vive nel campo, ogni tasto chiede la validazione. */}
      <input
        ref={campo}
        type={parametri.password ? 'password' : 'text'}
        defaultValue={parametri.valore}
        placeholder={parametri.segnaposto}
        onInput={chiediValidazione}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') conferma()
        }}
      />
      <p className="errore">{errore}</p>
      <Tasti conferma={conferma} etichetta={testi().vaBene} spento={spento} />
    </>
  )
}

// ---------------------------------------------------------- showQuickPick

type Voce = ParametriElenco['voci'][number]

/** Tutte le parole, in qualunque ordine: si cerca «matematica 2b» senza ricordare l'etichetta. */
function combacia (voce: Voce, cercato: string): boolean {
  if (!cercato) return true
  const dove = `${voce.etichetta} ${voce.descrizione} ${voce.dettaglio}`.toLowerCase()
  return cercato.toLowerCase().split(/\s+/).every((pezzo) => dove.includes(pezzo))
}

function Elenco ({ parametri }: { parametri: ParametriElenco }): ReactElement {
  const filtro = useRef<HTMLInputElement | null>(null)
  const elenco = useRef<HTMLUListElement | null>(null)
  const [cercato, impostaCercato] = useState('')
  /** Quale delle voci che passano il filtro è sotto il dito. */
  const [voluto, impostaVoluto] = useState(0)

  /** Gli indici delle voci che passano il filtro. */
  const visibili = parametri.voci
    .map((voce, indice) => (combacia(voce, cercato) ? indice : -1))
    .filter((indice) => indice >= 0)
  const scelto = Math.max(0, Math.min(voluto, visibili.length - 1))

  const conferma = (posto = scelto): void => {
    const indice = visibili[posto]
    if (indice === undefined) return
    rispondi({ dialogo: 'conferma', indice })
  }

  // Le frecce e Invio da qualunque punto della pagina, come prima.
  const ultima = useRef({ conferma, quante: visibili.length, scelto })
  useLayoutEffect(() => { ultima.current = { conferma, quante: visibili.length, scelto } })
  useEffect(() => {
    const tasto = (evento: KeyboardEvent): void => {
      const { conferma: confermaOra, quante, scelto: oraScelto } = ultima.current
      if (evento.key === 'ArrowDown') impostaVoluto(Math.min(oraScelto + 1, quante - 1))
      else if (evento.key === 'ArrowUp') impostaVoluto(Math.max(oraScelto - 1, 0))
      else if (evento.key === 'Enter') return confermaOra()
      else return
      evento.preventDefault()
    }
    document.addEventListener('keydown', tasto)
    return () => document.removeEventListener('keydown', tasto)
  }, [])

  useEffect(() => {
    filtro.current?.focus()
    dichiaraAltezza()
  }, [])

  useLayoutEffect(() => {
    elenco.current?.children[scelto]?.scrollIntoView({ block: 'nearest' })
  }, [scelto, cercato])

  return (
    <>
      <h1>{parametri.titolo}</h1>
      <input
        ref={filtro}
        type="text"
        placeholder={parametri.segnaposto}
        onInput={(evento) => {
          impostaVoluto(0)
          impostaCercato(evento.currentTarget.value.trim())
        }}
      />
      <ul className="voci" ref={elenco}>
        {visibili.length === 0
          ? <li className="vuoto">{testi().nienteCorrisponde}</li>
          : visibili.map((indice, posto) => {
              const voce = parametri.voci[indice]
              if (!voce) return null
              // Sotto l'etichetta, descrizione e dettaglio.
              const sotto = [voce.descrizione, voce.dettaglio].filter(Boolean).join(' · ')
              return (
                <li
                  key={indice}
                  className="voce"
                  aria-selected={posto === scelto ? 'true' : 'false'}
                  onClick={() => {
                    impostaVoluto(posto)
                    conferma(posto)
                  }}
                >
                  <span className="voce__etichetta">{voce.etichetta}</span>
                  {sotto ? <span className="voce__sotto">{sotto}</span> : null}
                </li>
              )
            })}
      </ul>
      <Tasti conferma={() => conferma()} etichetta={parole().scegliConferma} spento={visibili.length === 0} />
    </>
  )
}

// -------------------------------------------------------------- i messaggi

/**
 * Le icone del tono, copiate da `ui/components/icons.tsx` (una pagina
 * nativa importa dal pannello solo tipi). Errore e domanda, che il pannello non
 * ha, usano il cerchio dell'informazione.
 */
const CERCHIO = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z'
const TRACCIATI: Record<ParametriMessaggio['livello'], string[]> = {
  info: [CERCHIO, 'M12 11v5M12 7.8v.1'],
  avviso: ['M12 3.5 2.5 20h19z', 'M12 10v4.5M12 17.2v.1'],
  errore: [CERCHIO, 'M9 9l6 6M15 9l-6 6'],
  domanda: [CERCHIO, 'M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.5M12 16.8v.1'],
}

function Messaggio ({ parametri }: { parametri: ParametriMessaggio }): ReactElement {
  const pulsanti = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    ;(pulsanti.current[parametri.predefinito] ?? pulsanti.current[0])?.focus()
    dichiaraAltezza()
  }, [parametri.predefinito])

  // Come le modali del pannello: a sinistra i gesti di contorno, a destra
  // «Annulla» e quello atteso.
  const tasto = (indice: number): ReactElement | null => {
    const bottone = parametri.bottoni[indice]
    if (!bottone) return null
    return (
      <button
        key={indice}
        ref={(nodo) => { pulsanti.current[indice] = nodo }}
        type="button"
        data-ruolo={bottone.ruolo === 'primario' ? 'conferma' : bottone.ruolo === 'pericolo' ? 'pericolo' : undefined}
        // Invio preme già il `<button>` col fuoco: ascoltarlo a parte premerebbe il
        // predefinito anche dopo un Tab.
        onClick={() => rispondi({ dialogo: 'conferma', indice })}
      >
        {bottone.etichetta}
      </button>
    )
  }
  const indici = parametri.bottoni.map((_, indice) => indice)

  return (
    <>
      {/* testo-fisso: classi CSS */}
      <div className={`messaggio messaggio--${parametri.livello}`}>
        <svg className="messaggio__icona" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {TRACCIATI[parametri.livello].map((d) => <path key={d} d={d} />)}
        </svg>
        <div className="messaggio__testi">
          <h1 id="messaggio-titolo">{parametri.messaggio}</h1>
          <div className="messaggio__corpo" id="messaggio-corpo">
            {parametri.dettaglio ? <p className="messaggio__dettaglio">{parametri.dettaglio}</p> : null}
            {parametri.fatti.length > 0
              ? (
                  <dl className="messaggio__fatti">
                    {parametri.fatti.map((fatto, indice) => [
                      <dt key={`n${indice}`}>{fatto.nome}</dt>,
                      <dd key={`v${indice}`}>{fatto.valore}</dd>,
                    ])}
                  </dl>
                )
              : null}
          </div>
        </div>
      </div>
      <div className="tasti">
        <div className="tasti__sinistra">{indici.filter((i) => parametri.bottoni[i]?.aSinistra).map(tasto)}</div>
        <div className="tasti__destra">{indici.filter((i) => !parametri.bottoni[i]?.aSinistra).map(tasto)}</div>
      </div>
    </>
  )
}

if (parametri.tipo === 'messaggio') {
  // `alertdialog`: il lettore di schermo legge titolo e spiegazione prima dei pulsanti.
  radice.setAttribute('role', 'alertdialog')
  radice.setAttribute('aria-labelledby', 'messaggio-titolo')
  radice.setAttribute('aria-describedby', 'messaggio-corpo')
}

createRoot(radice).render(
  parametri.tipo === 'elenco'
    ? <Elenco parametri={parametri} />
    : parametri.tipo === 'messaggio'
      ? <Messaggio parametri={parametri} />
      : <Input parametri={parametri} />,
)
