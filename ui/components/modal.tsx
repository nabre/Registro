// Le finestre modali in React (ADR-56), dove si crea e si modifica ogni cosa
// del registro: si apre con una chiamata (`apriModale`), vive fuori dal
// ridisegno del pannello in una radice sua, ed è un vero `<form>`: Invio salva,
// Escape annulla, gli errori tornano in cima al corpo. Una pila sola manda
// Escape e Tab alla modale in cima.
//
// Il corpo si disegna una volta sola, come prima: quel che cambia dentro sta
// nei suoi componenti, e i campi tengono quel che si scrive finché
// `valoriModulo` lo legge al salvataggio.

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { parole } from '#core/dominio/words.testi.js'
import { fuocoIniziale, rifocalizza } from '#ui/focus.js'
import { classi } from '#ui/classNames.js'
import { testi } from '#ui/components/modal.testi.js'
import { Avviso, Pulsante, valoriModulo } from './base.js'
import { Suggerimento } from './hint.js'
import { Icona } from './icons.js'
import { ScopeModale } from './scope.js'

/**
 * L'evento lanciato sul `document` prima di aprire una modale: la palette lo
 * ascolta e si chiude. È un evento e non una chiamata perché la palette importa
 * i comandi, che importano questo file.
 */
export const EVENTO_MODALE_APERTA = 'registro:modale-aperta'

/**
 * Le modali aperte, dalla prima all'ultima: un solo ascoltatore globale manda
 * Escape e Tab a quella in cima.
 */
interface VoceDellaPila { modulo: HTMLFormElement, chiudi: () => void, rinuncia: () => void }
const pila: VoceDellaPila[] = []

function entraNellaPila (voce: VoceDellaPila): void {
  pila.push(voce)
  document.body.classList.add('con-modale')
}

/** La toglie dalla pila; senza più modali il corpo della pagina torna libero. */
function esceDallaPila (chiudi: () => void): void {
  const indice = pila.findIndex((voce) => voce.chiudi === chiudi)
  if (indice >= 0) pila.splice(indice, 1)
  if (pila.length === 0) document.body.classList.remove('con-modale')
}

/**
 * Chiude tutte le modali aperte, dall'ultima, senza domande: serve quando
 * cambia il documento, perché un modulo dell'anno di prima non scriva nel nuovo.
 */
export function chiudiTutte (): void {
  for (const voce of [...pila].reverse()) voce.chiudi()
}

function elementoAttivabile (radice: HTMLElement): HTMLElement[] {
  return [...radice.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.offsetParent !== null || el === document.activeElement)
}

document.addEventListener('keydown', (evento) => {
  const cima = pila[pila.length - 1]
  if (!cima) return

  if (evento.key === 'Escape') {
    evento.stopPropagation()
    evento.preventDefault()
    cima.rinuncia()
    return
  }

  if (evento.key === 'Tab') {
    // Il fuoco resta dentro la modale in cima.
    const attivabili = elementoAttivabile(cima.modulo)
    if (attivabili.length === 0) return
    const primo = attivabili[0]
    const ultimo = attivabili[attivabili.length - 1]
    const dentro = cima.modulo.contains(document.activeElement)
    if (evento.shiftKey && (!dentro || document.activeElement === primo)) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && (!dentro || document.activeElement === ultimo)) {
      evento.preventDefault()
      primo.focus()
    }
  }
})

export interface ContestoModale {
  /** Il contenitore del modulo: da qui si leggono i valori. C'è dal primo disegno in poi. */
  readonly corpo: HTMLElement
  chiudi: () => void
  mostraErrori: (errori: string[]) => void
  /** Blocca i pulsanti mentre un salvataggio è in corso. */
  occupato: (attivo: boolean) => void
  /** Falso dopo la chiusura: chi aspettava una risposta la scarta. */
  aperta: () => boolean
  /** Un numero diverso per ogni modale aperta, per rendere unici gli id dei campi. */
  scope: string
}

export interface OpzioniModale {
  titolo: string
  sottotitolo?: string
  /** Che cosa si fa in questa finestra, dietro la «i» accanto al titolo. */
  aiuto?: ReactNode
  /** `stretta` per una domanda sola, `media` per i moduli, `larga` con un elenco accanto. */
  larghezza?: 'stretta' | 'media' | 'larga'
  /** Il contenuto, chiamato una volta sola all'apertura. */
  corpo: (contesto: ContestoModale) => ReactNode
  /** Se c'è, compaiono Annulla e Salva e Invio salva. */
  alSalva?: (
    valori: Record<string, string | number | boolean>,
    contesto: ContestoModale,
  ) => void | Promise<void>
  testoSalva?: string
  /** Comandi aggiuntivi in basso a sinistra: eliminazioni, duplicazioni. Chiamato una volta. */
  azioniSecondarie?: (contesto: ContestoModale) => ReactNode
  /** Il nome del tasto che non fa niente: senza `alSalva` è «Chiudi». */
  testoRinuncia?: string
  allaChiusura?: () => void
}

let contatoreModali = 0

/** Quel che la finestra disegnata cambia di sé: errori e occupazione. */
interface Leve {
  errori: (errori: string[]) => void
  occupata: (attiva: boolean) => void
}

function Modale ({ opzioni, contesto, leve, modulo, corpo, rinuncia, alSalvare, scope }: {
  opzioni: OpzioniModale
  contesto: ContestoModale
  leve: { current: Leve | null }
  modulo: { current: HTMLFormElement | null }
  corpo: { current: HTMLDivElement | null }
  rinuncia: (daFuori?: boolean) => void
  alSalvare: () => void
  scope: string
}): ReactElement {
  const [errori, impostaErrori] = useState<string[]>([])
  const [occupata, impostaOccupata] = useState(false)
  const zonaErrori = useRef<HTMLDivElement | null>(null)
  const titoloId = `modale-titolo-${scope}` // testo-fisso: id dell’elemento, non si legge
  const erroriId = `modale-errori-${scope}` // testo-fisso: id dell'elemento, non si legge

  useLayoutEffect(() => {
    leve.current = { errori: impostaErrori, occupata: impostaOccupata }
    return () => { leve.current = null }
  }, [leve])

  useEffect(() => {
    if (errori.length === 0 || !zonaErrori.current) return
    zonaErrori.current.scrollIntoView({ block: 'nearest' })
    zonaErrori.current.focus()
  }, [errori])

  // Corpo e azioni si disegnano una volta: chi cambia dentro ha il suo stato.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contenuto = useMemo(() => opzioni.corpo(contesto), [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const secondarie = useMemo(() => opzioni.azioniSecondarie?.(contesto) ?? null, [])

  return (
    <form
      ref={modulo}
      className={classi('modale', `modale--${opzioni.larghezza ?? 'media'}`, occupata && 'modale--occupata')} // testo-fisso: classe CSS
      role="dialog"
      aria-modal="true"
      aria-labelledby={titoloId}
      aria-describedby={erroriId}
      onSubmit={(evento) => {
        evento.preventDefault()
        alSalvare()
      }}
      onKeyDown={(evento) => {
        // Ctrl+Invio (Cmd su Mac) salva anche da una textarea, dove Invio va a capo.
        if (
          evento.key === 'Enter' &&
          (evento.ctrlKey || evento.metaKey) &&
          (evento.target as HTMLElement).tagName === 'TEXTAREA'
        ) {
          evento.preventDefault()
          modulo.current?.requestSubmit()
        }
      }}
      onClick={(evento) => evento.stopPropagation()}
    >
      <header className="modale__testata">
        <div>
          <div className="modale__titoli">
            <h3 className="modale__titolo" id={titoloId}>{opzioni.titolo}</h3>
            {opzioni.aiuto ? <Suggerimento testo={opzioni.aiuto} etichetta={opzioni.titolo} /> : null}
          </div>
          {opzioni.sottotitolo ? <p className="modale__sottotitolo">{opzioni.sottotitolo}</p> : null}
        </div>
        <button
          className="modale__chiudi"
          type="button"
          aria-label={parole().chiudi}
          // Cliccabile anche da occupata, che spegne il resto (`windows.css`).
          style={{ pointerEvents: 'auto' }}
          onClick={() => rinuncia()}
        >
          <Icona nome="chiudi" />
        </button>
      </header>
      <div
        ref={zonaErrori}
        className="modale__errori"
        id={erroriId}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabIndex={-1}
      >
        {errori.length > 0
          ? (
            // La zona è l'unica regione viva: niente `status` annidato nell'`alert`.
              <Avviso tono="negativo" ruolo={null}>
                <ul className="elenco-errori">{errori.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </Avviso>
            )
          : null}
      </div>
      <div ref={corpo} className="modale__corpo">
        <div>
          <ScopeModale.Provider value={scope}>{contenuto}</ScopeModale.Provider>
        </div>
      </div>
      <footer className="modale__piede">
        <div className="modale__piede-sinistra">
          <ScopeModale.Provider value={scope}>{secondarie}</ScopeModale.Provider>
        </div>
        <div className="modale__piede-destra">
          {/* Come la «×»: da occupata si smette di aspettare. */}
          <Pulsante
            testo={opzioni.testoRinuncia ?? (opzioni.alSalva ? parole().annulla : parole().chiudi)}
            style={{ pointerEvents: 'auto' }}
            al={() => contesto.chiudi()}
          />
          {opzioni.alSalva
            ? (
                <Pulsante
                  testo={opzioni.testoSalva ?? parole().salva}
                  variante="primario"
                  tipo="submit"
                  disabilitato={occupata}
                />
              )
            : null}
        </div>
      </footer>
    </form>
  )
}

export function apriModale (opzioni: OpzioniModale): ContestoModale {
  contatoreModali += 1
  const scope = `r${contatoreModali}`

  // Prima di segnarsi chi ha il fuoco: la palette, chiudendosi, lo ridà a chi
  // l'aveva prima, ed è a quello che la modale lo restituirà.
  document.dispatchEvent(new Event(EVENTO_MODALE_APERTA))
  // Chi aveva il fuoco lo riavrà alla chiusura; `rifocalizza` ritrova il
  // sostituto se la vista si è ridisegnata.
  const apertaDa = document.activeElement as HTMLElement | null

  const strato = document.createElement('div')
  strato.className = 'strato-modale'
  const radice = createRoot(strato)
  const leve: { current: Leve | null } = { current: null }
  const modulo: { current: HTMLFormElement | null } = { current: null }
  const corpo: { current: HTMLDivElement | null } = { current: null }

  let chiusa = false
  /** Se nel modulo si è scritto qualcosa: Esc, «×» e clic fuori chiedono prima di buttarlo. */
  let sporco = false
  let chiedendo = false
  /** Un salvataggio partito e non tornato: finché è in volo il modulo non rispedisce. */
  let inVolo = false
  let occupataOra = false
  const impegnata = () => inVolo || occupataOra

  const chiudi = () => {
    if (chiusa) return
    chiusa = true
    esceDallaPila(chiudi)
    // Dopo il giro in corso: si può chiudere da dentro un gestore di React.
    queueMicrotask(() => radice.unmount())
    strato.remove()
    opzioni.allaChiusura?.()
    rifocalizza(apertaDa)
  }

  /**
   * Esc e «×» chiudono anche da impegnata, senza domande: quel che si era
   * scritto è già partito. Il clic fuori no, che parte anche per sbaglio.
   */
  const rinuncia = (daFuori = false) => {
    if (chiusa || chiedendo) return
    if (impegnata()) {
      if (!daFuori) chiudi()
      return
    }
    if (!sporco || !opzioni.alSalva) {
      chiudi()
      return
    }
    chiedendo = true
    void conferma({
      titolo: testi().lasciareTitolo,
      testo: testi().lasciareTesto,
      testoConferma: testi().lascia,
      pericolo: true,
    }).then((lascia) => {
      chiedendo = false
      if (lascia) chiudi()
    })
  }

  const contesto: ContestoModale = {
    get corpo (): HTMLElement {
      if (!corpo.current) throw new Error('modale: il corpo non è ancora disegnato') // testo-fisso: errore interno, non si mostra
      return corpo.current
    },
    chiudi,
    mostraErrori: (errori) => leve.current?.errori(errori),
    occupato: (attivo) => {
      occupataOra = attivo
      leve.current?.occupata(attivo)
    },
    aperta: () => !chiusa,
    scope,
  }

  const alSalvare = () => {
    if (!opzioni.alSalva || impegnata() || !corpo.current) return
    // Chiamato subito: chi salva e chiude nello stesso gesto non aspetta la coda.
    inVolo = true
    let esito: void | Promise<void>
    try {
      esito = opzioni.alSalva(valoriModulo(corpo.current), contesto)
    } catch (errore) {
      inVolo = false
      throw errore
    }
    void Promise.resolve(esito).finally(() => { inVolo = false })
  }

  strato.addEventListener('input', () => { sporco = true })
  strato.addEventListener('change', () => { sporco = true })
  // Il clic fuori chiude, ma solo se pressione e rilascio sono sullo strato: chi
  // seleziona testo e rilascia fuori non vuole chiudere.
  let giuSulloStrato = false
  strato.addEventListener('pointerdown', (evento) => {
    giuSulloStrato = evento.target === strato
  })
  strato.addEventListener('click', (evento) => {
    if (giuSulloStrato && evento.target === strato) rinuncia(true)
  })

  document.body.appendChild(strato)
  flushSync(() => radice.render(
    <Modale
      opzioni={opzioni}
      contesto={contesto}
      leve={leve}
      modulo={modulo}
      corpo={corpo}
      rinuncia={rinuncia}
      alSalvare={alSalvare}
      scope={scope}
    />,
  ))
  if (modulo.current) {
    entraNellaPila({ modulo: modulo.current, chiudi, rinuncia: () => rinuncia() })
    // Un corpo senza campi: il fuoco va sul modulo, che risponde a Escape e Tab.
    // Non se un pulsante l'ha già preso da sé (`autoFocus`, la conferma).
    const giaDentro = modulo.current.contains(document.activeElement)
    if (!giaDentro && (!corpo.current || !fuocoIniziale(corpo.current))) {
      modulo.current.tabIndex = -1
      modulo.current.focus()
    }
  }

  return contesto
}

/** Domanda a due risposte, da scrivere come `if (await conferma(...))`. */
export function conferma (opzioni: {
  titolo: string
  testo: string
  testoConferma?: string
  pericolo?: boolean
}): Promise<boolean> {
  return new Promise((risolvi) => {
    let risposto = false
    apriModale({
      titolo: opzioni.titolo,
      larghezza: 'stretta',
      corpo: () => <p className="modale__domanda">{opzioni.testo}</p>,
      allaChiusura: () => {
        if (!risposto) risolvi(false)
      },
      testoRinuncia: parole().annulla,
      azioniSecondarie: (contesto) => (
        // Il fuoco sul pulsante di conferma: senza `alSalva` il `submit` non fa
        // niente e Invio sarebbe morto.
        <Pulsante
          testo={opzioni.testoConferma ?? parole().conferma}
          variante={opzioni.pericolo ? 'pericolo' : 'primario'}
          autoFocus
          al={() => {
            risposto = true
            contesto.chiudi()
            risolvi(true)
          }}
        />
      ),
    })
  })
}
