// Il controllo di un'impostazione del programma, disegnato una volta sola per
// il pannello e per la finestra nativa (ADR-52), in React (ADR-56). Dalla
// `VoceProgramma` sceglie il disegno con la regola del tipo di input (§ 3.5 di
// `docs/PIANO-IMPOSTAZIONI.md`): figura, segmentato, tendina, interruttore,
// numero con unità, cursore, percorso, testo.
//
// Non sa di ponti né di messaggi: il valore esce da `quandoCambia`, e ogni
// superficie lo manda per la sua strada. Se `quandoCambia` torna una promessa
// con l'esito, il controllo lo dice sotto il campo: «Salvato», discreto, o il
// motivo del rifiuto della dogana (`valoreConMotivo`), che resta finché non si
// cambia di nuovo. Il controllo non rifiuta niente da sé.
//
// Quel che si è scelto si vede subito (stato del componente), prima che il
// valore salvato torni con la voce: una voce nuova lo rimette d'accordo, un
// rifiuto rifà il controllo con la voce di adesso.

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import type { VoceProgramma } from '#contract/protocol.js'
import { parole } from '#core/dominio/words.testi.js'
import { numero } from '#core/i18n/index.js'
import { descritto, idDi, Innesto } from './dom.js'
import { Input, Select } from './fields.js'
import { diNodi, raffigurazioneDi } from './figure.js'
import { testi } from './controls.testi.js'

export type Valore = VoceProgramma['valore']

/**
 * Com'è andato un salvataggio: `null` salvato, un testo il motivo del rifiuto,
 * `undefined` niente da dire (nessuna risposta, o nessun cambio).
 */
export type Esito = string | null | undefined

type QuandoCambia = (valore: Valore) => Promise<Esito> | void

/**
 * Quel che un controllo manda: un valore solo, o le scelte accese di un
 * segmentato multiplo. `Controllo` manda sempre un valore solo.
 */
export type ValoreCampo = Valore | Array<string | number>

/** Come `QuandoCambia`, per chi disegna anche il segmentato multiplo (`field.tsx`). */
export type Cambia = (valore: ValoreCampo) => Promise<Esito> | void

export interface Opzioni {
  /** Per un percorso: apre il dialogo del sistema. Senza, niente «Sfoglia…». */
  sfoglia?: () => void
  /** Per un percorso scritto: torna a lasciarlo al registro. Senza, niente «Svuota». */
  svuota?: () => void
  /** Per un modello: porta dove il file si sceglie. Senza, lo si dice a parole. */
  aiModelli?: () => void
  /** Le scelte di una voce con `scelteDinamiche`, se chi disegna le conosce. */
  scelte?: VoceProgramma['scelte']
  /** Gli id di quel che descrive la voce (la spiegazione della «i»), per `aria-describedby`. */
  descrittoDa?: string
}

/**
 * Un esito che non passa da `quandoCambia` (il percorso scelto con
 * «Sfoglia…» e rifiutato dalla dogana): chi disegna ne fa uno nuovo, un
 * oggetto nuovo, ogni volta che va detto.
 */
export interface Annuncio {
  motivo: Esito
}

/**
 * I disegni possibili: finiscono in `data-controllo`, per i fogli e per le
 * prove. `altro` (una tendina con «Altro…» che apre un numero) e `multipli`
 * (un segmentato che ne accende più d'uno) li chiede solo `Campo`: il
 * manifesto non ha voci così.
 */
export type Disegno =
  | 'figura' | 'segmenti' | 'tendina' | 'interruttore' | 'numero' | 'cursore'
  | 'percorso' | 'modello' | 'collegamento' | 'testo' | 'altro' | 'multipli'

/** Una scelta con il nome corto e la frase che la spiega. */
export interface Scelta {
  valore: string | number
  nome: string
  aiuto: string
}

/** Quanto può essere lungo il nome di una scelta perché stia in un segmento. */
const NOME_BREVE = 20

/** Quante scelte stanno in un segmentato quando il manifesto non dice il disegno. */
const SEGMENTI_AL_PIU = 4

/** Per quanto resta «Salvato» sotto il campo. */
const DURATA_SALVATO = 2500

// ------------------------------------------------------------------ le scelte

/**
 * Il nome e la frase di una scelta, dal suo aiuto: il manifesto scrive «Nome:
 * frase» (o «nome — frase»), e il nome va nel segmento, nell'opzione della
 * tendina, sotto la figura. Senza separatore l'aiuto intero fa da nome, e un
 * nome lungo non sta in un segmento (`NOME_BREVE`).
 */
export function nomeEAiuto (aiuto: string): { nome: string, aiuto: string } {
  // Lo spazio prima dei due punti (il francese lo mette) non fa parte del nome.
  const due = /^([^:—]{1,32}?)\s*(?::|\s—)\s+(.+)$/s.exec(aiuto.trim())
  if (!due) return { nome: aiuto.trim(), aiuto: '' }
  const resto = due[2]
  return { nome: due[1].trim(), aiuto: resto.charAt(0).toUpperCase() + resto.slice(1) }
}

function scelteDi (voce: VoceProgramma, opzioni: Opzioni): Scelta[] | null {
  const elenco = voce.scelte ?? (voce.scelteDinamiche ? opzioni.scelte ?? null : null)
  if (!elenco) return null
  return elenco.map((scelta) => ({
    valore: scelta.valore,
    ...nomeEAiuto(scelta.aiuto || String(scelta.valore)),
  }))
}

/** Il disegno di una voce: quel che dice il manifesto, se si può, se no quel che dice il tipo. */
/**
 * Il disegno di una voce del manifesto, senza disegnarla: lo stesso conto di
 * `Controllo`. Lo leggono le prove, che non hanno un DOM.
 */
export function disegnoDellaVoce (voce: VoceProgramma, opzioni: Opzioni = {}): Disegno {
  return disegnoDi(voce, scelteDi(voce, opzioni))
}

function disegnoDi (voce: VoceProgramma, scelte: Scelta[] | null): Disegno {
  if (voce.delCollegamento) return 'collegamento'
  if (voce.tipo === 'boolean') return 'interruttore'
  if (scelte && !voce.sceltaLibera) {
    if (raffigurazioneDi(voce.chiave)) return 'figura'
    // Un segmento con una frase intera dentro non si legge: allora tendina.
    const brevi = scelte.every((scelta) => scelta.nome.length <= NOME_BREVE)
    if (voce.controllo === 'segmenti') return brevi ? 'segmenti' : 'tendina'
    if (voce.controllo === 'tendina') return 'tendina'
    return brevi && scelte.length <= SEGMENTI_AL_PIU ? 'segmenti' : 'tendina'
  }
  if (voce.tipo === 'number') {
    // Il cursore vuole i due estremi: senza, è un numero.
    const conEstremi = voce.minimo !== null && voce.massimo !== null
    return voce.controllo === 'cursore' && conEstremi ? 'cursore' : 'numero'
  }
  if (voce.formato === 'cartella' || voce.formato === 'eseguibile' || voce.formato === 'file') {
    return 'percorso'
  }
  if (voce.formato === 'modello') return 'modello'
  return 'testo'
}

// ------------------------------------------------------------------- il telaio

/** Quel che serve a disegnare un pezzo. */
interface Contesto {
  voce: VoceProgramma
  opzioni: Opzioni
  /** Spento: sospeso sotto un padre spento, o un interruttore a cui manca quel che richiede. */
  spento: boolean
  /** Manda il valore nuovo e dice l'esito sotto il controllo. */
  cambia (valore: ValoreCampo): void
  /** Dice un motivo sotto il controllo senza mandare niente (un `multipli` che non si spegne). */
  di (motivo: Esito): void
  /** Quel che solo `Campo` porta: vedi `Aggiunte`. */
  aggiunte: Aggiunte
}

/** Quel che serve ai disegni che il manifesto non chiede (`altro`, `multipli`). */
interface Aggiunte {
  /** Il nome della scelta che apre il numero libero, per `altro`. */
  altro?: string
  /** Le scelte accese di un `multipli`. */
  accese?: ReadonlyArray<string | number>
  /**
   * Quante scelte di un `multipli` restano accese al minimo, e che cosa si
   * dice sotto se se ne spegne una di troppo.
   */
  almeno?: { quante: number, motivo: string }
}

/**
 * Uno stato del componente che segue un valore di fuori: parte da `iniziale()`
 * e ci torna ogni volta che `da` cambia (la voce arrivata dopo il salvataggio).
 */
function useSegue<T> (da: string, iniziale: () => T): [T, (valore: T) => void] {
  const [stato, imposta] = useState(() => ({ da, valore: iniziale() }))
  let attuale = stato
  if (stato.da !== da) {
    attuale = { da, valore: iniziale() }
    imposta(attuale)
  }
  return [attuale.valore, (valore) => imposta({ da, valore })]
}

/** Rimette il fuoco nel controllo: sul pezzo che l'aveva, o sul primo che lo prende. */
function fuocoDentro (controllo: Element, chiave?: string): void {
  const stesso = chiave === undefined
    ? null
    : [...controllo.querySelectorAll<HTMLElement>('[data-fuoco]')].find((nodo) => nodo.dataset.fuoco === chiave)
  const primo = controllo.querySelector<HTMLElement>(
    '[role="radio"][tabindex="0"], select, input, button:not([disabled])',
  )
  ;(stesso ?? primo)?.focus()
}

// ------------------------------------------------------------ figura e segmenti

/** I tasti di un gruppo radio (APG): frecce che spostano e scelgono, Home e Fine agli estremi. */
function dove (tasto: string, attuale: number, quante: number): number | null {
  if (tasto === 'ArrowRight' || tasto === 'ArrowDown') return (attuale + 1) % quante
  if (tasto === 'ArrowLeft' || tasto === 'ArrowUp') return (attuale - 1 + quante) % quante
  if (tasto === 'Home') return 0
  if (tasto === 'End') return quante - 1
  return null
}

/** Il riquadro della figura: JSX, o i nodi già fatti innestati dentro. */
function Quadro ({ figura, chiave }: { figura: ReactNode | { nodi: () => Node[] }, chiave: string }): ReactElement {
  if (diNodi(figura)) {
    return <Innesto className="scelta-figurata__figura" aria-hidden="true" chiave={chiave} nodi={figura.nodi} />
  }
  return <span className="scelta-figurata__figura" aria-hidden="true">{figura}</span>
}

/**
 * Un gruppo radio: una sola fermata del Tab, le frecce che scelgono. Con la
 * figura a schede (`scelta-figurata`, il foglio del tema), senza a segmenti
 * con la frase della scelta sotto.
 */
function GruppoRadio ({ cx, scelte, conFigura }: {
  cx: Contesto
  scelte: Scelta[]
  conFigura: boolean
}): ReactElement {
  const { voce } = cx
  const raffigura = conFigura ? raffigurazioneDi(voce.chiave) : null
  // La scelta di adesso: si ricorda subito, senza aspettare il valore salvato,
  // così due frecce di fila partono tutte e due, anche tornando a quella di partenza.
  const [valore, impostaValore] = useSegue(String(voce.valore), () => String(voce.valore))
  const bottoni = useRef<Array<HTMLButtonElement | null>>([])
  const trovata = scelte.findIndex((scelta) => String(scelta.valore) === valore)
  const classe = raffigura ? 'scelta-figurata' : 'controllo-segmenti'

  const scegli = (indice: number): void => {
    if (cx.spento) return
    bottoni.current[indice]?.focus()
    const scelta = scelte[indice]
    if (!scelta || String(scelta.valore) === valore) return
    impostaValore(String(scelta.valore))
    cx.cambia(scelta.valore)
  }

  const gruppo = (
    <div
      className={cx.spento ? `${classe} ${classe}--spenta` : classe}
      role="radiogroup"
      aria-label={voce.etichetta}
      aria-disabled={cx.spento ? 'true' : undefined}
      aria-describedby={descritto(cx.opzioni.descrittoDa)}
      data-valore={valore}
    >
      {scelte.map((scelta, indice) => {
        const suo = String(scelta.valore)
        const accesa = indice === trovata
        const idNome = idDi(voce.chiave, suo, 'nome')
        const idAiuto = idDi(voce.chiave, suo, 'aiuto')
        const idNota = idDi(voce.chiave, suo, 'nota')
        const figura = raffigura ? raffigura(suo, accesa) : null
        return (
          <button
            key={suo}
            ref={(nodo) => { bottoni.current[indice] = nodo }}
            className={raffigura ? 'scelta-figurata__voce' : 'controllo-segmenti__voce'}
            type="button"
            role="radio"
            aria-checked={accesa ? 'true' : 'false'}
            // Senza una scelta che combaci (un valore scritto a mano) il Tab entra dalla prima.
            tabIndex={!cx.spento && (accesa || (trovata < 0 && indice === 0)) ? 0 : -1}
            data-fuoco={`${voce.chiave}=${suo}`}
            aria-disabled={cx.spento ? 'true' : undefined}
            aria-labelledby={figura ? idNome : undefined}
            aria-describedby={descritto(scelta.aiuto && idAiuto, Boolean(figura?.nota) && idNota)}
            onClick={() => scegli(indice)}
            onKeyDown={(evento) => {
              const prossima = dove(evento.key, indice, scelte.length)
              if (prossima === null) return
              evento.preventDefault()
              scegli(prossima)
            }}
          >
            {figura
              ? (
                  <>
                    <Quadro figura={figura.figura} chiave={suo} />
                    <span className="scelta-figurata__nome">
                      <span className="scelta-figurata__segno" aria-hidden="true" />
                      <span id={idNome}>{scelta.nome}</span>
                    </span>
                    {scelta.aiuto ? <span className="scelta-figurata__aiuto" id={idAiuto}>{scelta.aiuto}</span> : null}
                    {figura.nota ? <span className="scelta-figurata__nota" id={idNota}>{figura.nota}</span> : null}
                  </>
                )
              : (
                  <>
                    {scelta.nome}
                    {/* La frase di ogni scelta, per chi legge lo schermo: nascosta, ma nominata. */}
                    {scelta.aiuto ? <span id={idAiuto} hidden>{scelta.aiuto}</span> : null}
                  </>
                )}
          </button>
        )
      })}
    </div>
  )

  // La frase della scelta di adesso, sotto i segmenti: sotto la figura sta già.
  if (raffigura) return gruppo
  const frase = scelte[trovata]?.aiuto ?? ''
  return (
    <>
      {gruppo}
      <p className="controllo__descrizione" hidden={!frase}>{frase}</p>
    </>
  )
}

// ---------------------------------------------------------------- la tendina

// testo-fisso: classi CSS
const CLASSE_TENDINA = 'campo__controllo campo__controllo--selezione controllo-tendina'

/** Una tendina a nomi corti; la frase della scelta di adesso sta sotto, e la si legge. */
function Tendina ({ cx, scelte }: { cx: Contesto, scelte: Scelta[] }): ReactElement {
  const { voce } = cx
  const [valore, impostaValore] = useSegue(String(voce.valore), () => String(voce.valore))
  const scelta = scelte.find((una) => String(una.valore) === valore)
  const idFrase = idDi(voce.chiave, 'frase')
  return (
    <>
      {/* I vestiti dei campi del pannello (`controls.css`); la finestra nativa veste i suoi per tag. */}
      <Select
        className={CLASSE_TENDINA}
        name={voce.chiave}
        aria-label={voce.etichetta}
        data-fuoco={voce.chiave}
        aria-describedby={descritto(cx.opzioni.descrittoDa, idFrase)}
        disabled={cx.spento}
        // Un valore che nessuna scelta porta lascia la tendina in bianco: è la verità.
        valore={String(voce.valore)}
        onCambio={(evento) => {
          const presa = scelte[(evento.currentTarget as HTMLSelectElement).selectedIndex]
          if (!presa) return
          impostaValore(String(presa.valore))
          cx.cambia(presa.valore)
        }}
      >
        {scelte.map((una) => <option key={String(una.valore)} value={String(una.valore)}>{una.nome}</option>)}
      </Select>
      <p className="controllo__descrizione" id={idFrase} hidden={!scelta?.aiuto}>{scelta?.aiuto ?? ''}</p>
    </>
  )
}

/** Il valore dell'opzione «Altro…»: nessuna scelta vera lo porta. */
const ALTRO = '\u0000altro'

/**
 * Una tendina con i valori che si usano, e in fondo «Altro…», che apre accanto
 * un numero con la sua unità. Un valore fuori elenco arriva con «Altro…» già
 * scelto e il numero in vista: è la verità, come la tendina in bianco.
 */
function TendinaConAltro ({ cx, scelte }: { cx: Contesto, scelte: Scelta[] }): ReactElement {
  const { voce } = cx
  const valore = String(voce.valore)
  const trovata = scelte.findIndex((scelta) => String(scelta.valore) === valore)
  const [aperto, impostaAperto] = useSegue(valore, () => trovata < 0)
  const libero = useRef<HTMLInputElement | null>(null)
  const daAprire = useRef(false)
  // «Altro…» appena scelto: il numero prende il fuoco quando è visibile, cioè
  // dopo il disegno che lo mostra.
  useLayoutEffect(() => {
    if (!aperto || !daAprire.current) return
    daAprire.current = false
    libero.current?.focus()
  }, [aperto])

  return (
    <span className="controllo-altro__riga">
      <Select
        className={CLASSE_TENDINA}
        name={voce.chiave}
        aria-label={voce.etichetta}
        data-fuoco={voce.chiave}
        aria-describedby={descritto(cx.opzioni.descrittoDa)}
        disabled={cx.spento}
        valore={trovata < 0 ? ALTRO : valore}
        onCambio={(evento) => {
          const presa = scelte[(evento.currentTarget as HTMLSelectElement).selectedIndex]
          if (!presa) {
            // «Altro…»: si apre il numero, e si salva quando lo si cambia.
            daAprire.current = true
            impostaAperto(true)
            return
          }
          impostaAperto(false)
          cx.cambia(presa.valore)
        }}
      >
        {scelte.map((una) => <option key={String(una.valore)} value={String(una.valore)}>{una.nome}</option>)}
        <option value={ALTRO}>{cx.aggiunte.altro ?? '…'}</option>
      </Select>
      <span className="controllo-altro" hidden={!aperto}>
        {/* Il numero libero: quello di sempre, con un nome e un fuoco suoi. */}
        <CampoNumero cx={cx} nome={`${voce.chiave}-altro`} campo={libero} />
      </span>
    </span>
  )
}

/**
 * Un segmentato che ne accende più d'uno (i giorni mostrati): pulsanti a due
 * stati (`aria-pressed`), una sola fermata del Tab, le frecce che spostano il
 * fuoco, Spazio che accende o spegne. Quel che si manda si legge dallo stato
 * del componente, non dal disegno: due clic di fila partono tutti e due.
 */
function SegmentiMultipli ({ cx, scelte }: { cx: Contesto, scelte: Scelta[] }): ReactElement {
  const { voce } = cx
  const date = (cx.aggiunte.accese ?? []).map(String)
  const [stato, imposta] = useSegue(JSON.stringify(date), () => ({
    accese: new Set(date),
    fermata: Math.max(0, scelte.findIndex((scelta) => date.includes(String(scelta.valore)))),
  }))
  const bottoni = useRef<Array<HTMLButtonElement | null>>([])
  // Le scelte dell'ultimo gesto, anche se React non ha ancora ridisegnato: due
  // clic nello stesso giro (lo stato si applica in un microtask) partono
  // ognuno da quel che ha lasciato l'altro.
  const ultime = useRef(stato.accese)
  const visto = useRef(stato)
  if (visto.current !== stato) {
    visto.current = stato
    ultime.current = stato.accese
  }

  return (
    <div
      className={`controllo-segmenti controllo-segmenti--multipli${cx.spento ? ' controllo-segmenti--spenta' : ''}`}
      role="group"
      aria-label={voce.etichetta}
      aria-disabled={cx.spento ? 'true' : undefined}
      aria-describedby={descritto(cx.opzioni.descrittoDa)}
    >
      {scelte.map((scelta, indice) => {
        const suo = String(scelta.valore)
        return (
          <button
            key={suo}
            ref={(nodo) => { bottoni.current[indice] = nodo }}
            className="controllo-segmenti__voce"
            type="button"
            aria-pressed={stato.accese.has(suo) ? 'true' : 'false'}
            tabIndex={!cx.spento && indice === stato.fermata ? 0 : -1}
            data-fuoco={`${voce.chiave}=${suo}`}
            aria-disabled={cx.spento ? 'true' : undefined}
            title={scelta.aiuto || undefined}
            onClick={() => {
              if (cx.spento) return
              const accese = new Set(ultime.current)
              if (accese.has(suo)) accese.delete(suo)
              else accese.add(suo)
              const almeno = cx.aggiunte.almeno
              if (almeno && accese.size < almeno.quante) {
                // Non si spegne: lo si dice sotto, come un rifiuto, e il pulsante resta com'era.
                cx.di(almeno.motivo)
                return
              }
              ultime.current = accese
              imposta({ accese, fermata: indice })
              cx.cambia(scelte.filter((una) => accese.has(String(una.valore))).map((una) => una.valore))
            }}
            onKeyDown={(evento) => {
              const prossima = dove(evento.key, indice, scelte.length)
              if (prossima === null) return
              evento.preventDefault()
              imposta({ accese: stato.accese, fermata: prossima })
              bottoni.current[prossima]?.focus()
            }}
          >
            {scelta.nome}
          </button>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------ l'interruttore

/** Un interruttore vero (`role="switch"`), che si chiama come la voce: mai «Acceso». */
function Interruttore ({ cx }: { cx: Contesto }): ReactElement {
  const { voce } = cx
  // Una voce sospesa si mostra spenta qualunque cosa dica il file: il valore
  // scritto resta e torna quando il padre si riaccende.
  const scritto = Boolean(voce.valore) && !voce.sospesa
  const [acceso, impostaAcceso] = useSegue(String(scritto), () => scritto)
  return (
    <button
      className="controllo-interruttore"
      type="button"
      role="switch"
      aria-checked={acceso ? 'true' : 'false'}
      aria-label={voce.etichetta}
      data-fuoco={voce.chiave}
      aria-describedby={descritto(cx.opzioni.descrittoDa)}
      disabled={cx.spento}
      onClick={() => {
        if (cx.spento) return
        impostaAcceso(!acceso)
        cx.cambia(!acceso)
      }}
    >
      <span className="controllo-interruttore__traccia" aria-hidden="true">
        <span className="controllo-interruttore__pomello" />
      </span>
    </button>
  )
}

// ------------------------------------------------------------ numero e cursore

/** Il numero di adesso detto con la sua unità, per `aria-valuetext` e per l'occhio. */
function conUnita (quanto: number, unita: string | null): string {
  return unita ? `${numero(quanto)} ${unita}` : numero(quanto)
}

/**
 * Gli estremi e il passo del manifesto, sul campo. Il passo è 1 se non detto:
 * un numero è intero. La dogana vera resta dall'altra parte (`valoreConMotivo`).
 */
function estremi (voce: VoceProgramma): { min?: number, max?: number, step: number } {
  return {
    min: voce.minimo ?? undefined,
    max: voce.massimo ?? undefined,
    step: voce.passo ?? 1,
  }
}

/** Un numero con l'unità scritta accanto, sempre visibile. */
function CampoNumero ({ cx, nome, campo }: {
  cx: Contesto
  /** Nome e fuoco, se non sono la chiave (il numero libero di «Altro…»). */
  nome?: string
  campo?: { current: HTMLInputElement | null }
}): ReactElement {
  const { voce } = cx
  const idUnita = idDi(voce.chiave, 'unita')
  return (
    <span className="controllo-numero">
      <Input
        ref={campo ? (nodo) => { campo.current = nodo } : undefined}
        // testo-fisso: classi CSS
        className="campo__controllo controllo-numero__campo"
        type="number"
        name={nome ?? voce.chiave}
        {...estremi(voce)}
        valore={String(voce.valore)}
        disabled={cx.spento}
        aria-label={voce.etichetta}
        data-fuoco={nome ?? voce.chiave}
        aria-describedby={descritto(cx.opzioni.descrittoDa, voce.unita && idUnita)}
        // Al cambio, non a ogni tasto: «180» salverebbe 1, poi 18, poi 180.
        onCambio={(evento) => {
          const scritto = (evento.currentTarget as HTMLInputElement).value.trim()
          const quanto = Number(scritto)
          if (scritto === '' || !Number.isFinite(quanto)) return
          cx.cambia(quanto)
        }}
      />
      {voce.unita ? <span className="controllo-numero__unita" id={idUnita}>{voce.unita}</span> : null}
    </span>
  )
}

/** Un cursore per un intervallo piccolo: il valore si legge accanto e si dice con l'unità. */
function Cursore ({ cx }: { cx: Contesto }): ReactElement {
  const { voce } = cx
  const quanto = Number(voce.valore)
  // Mentre si trascina si dice il numero; si salva quando lo si lascia.
  const [mostrato, impostaMostrato] = useSegue(String(quanto), () => quanto)
  const detto = conUnita(mostrato, voce.unita)
  return (
    <span className="controllo-cursore">
      <Input
        className="controllo-cursore__campo"
        type="range"
        name={voce.chiave}
        {...estremi(voce)}
        valore={String(quanto)}
        disabled={cx.spento}
        aria-valuetext={detto}
        aria-label={voce.etichetta}
        data-fuoco={voce.chiave}
        aria-describedby={descritto(cx.opzioni.descrittoDa)}
        onInput={(evento) => impostaMostrato(Number(evento.currentTarget.value))}
        onCambio={(evento) => cx.cambia(Number((evento.currentTarget as HTMLInputElement).value))}
      />
      <output className="controllo-cursore__valore" aria-hidden="true">{detto}</output>
    </span>
  )
}

// ------------------------------------------------------------------ il testo

/** Testo libero: nomi propri, indirizzi. Si salva al cambio, se il campo lo accetta. */
function CampoTesto ({ cx, scelte }: { cx: Contesto, scelte: Scelta[] | null }): ReactElement {
  const { voce } = cx
  const idProposte = idDi(voce.chiave, 'proposte')
  return (
    <>
      <Input
        // testo-fisso: classi CSS
        className="campo__controllo controllo-testo"
        // `formato: 'email'`: il campo si valida da sé, vuoto compreso (è il predefinito).
        type={voce.formato === 'email' ? 'email' : 'text'}
        name={voce.chiave}
        valore={String(voce.valore ?? '')}
        disabled={cx.spento}
        autoComplete="off"
        aria-label={voce.etichetta}
        data-fuoco={voce.chiave}
        aria-describedby={descritto(cx.opzioni.descrittoDa)}
        list={scelte ? idProposte : undefined}
        onCambio={(evento) => {
          const campo = evento.currentTarget as HTMLInputElement
          if (!campo.checkValidity()) return
          cx.cambia(campo.value)
        }}
      />
      {/* Una scelta libera fra quelle che si sanno: le proposte, e si può scrivere altro. */}
      {scelte
        ? (
            <datalist id={idProposte}>
              {scelte.map((scelta) => (
                <option key={String(scelta.valore)} value={String(scelta.valore)} label={scelta.nome} />
              ))}
            </datalist>
          )
        : null}
    </>
  )
}

// ------------------------------------------------- percorso, modello, collegamento

/** Un pulsante con il vestito di tutte e due le pagine. */
function Pulsante ({ testo, titolo, gesto, spento, fuoco }: {
  testo: string
  titolo: string
  gesto: () => void
  spento?: boolean
  fuoco?: string
}): ReactElement {
  return (
    <button
      // testo-fisso: classi CSS
      className="pulsante pulsante--sottile controllo__pulsante"
      type="button"
      title={titolo}
      disabled={spento}
      data-fuoco={fuoco}
      onClick={() => gesto()}
    >
      {testo}
    </button>
  )
}

/** Il valore di un campo che si legge soltanto, o quel che vale quando è vuoto. */
function ValoreLetto ({ cx, vuoto }: { cx: Contesto, vuoto: string }): ReactElement {
  const scritto = String(cx.voce.valore ?? '').trim()
  return (
    <span
      className={`controllo-percorso__valore${scritto === '' ? ' controllo-percorso__valore--vuoto' : ''}`}
      title={scritto || undefined}
    >
      {scritto || vuoto}
    </span>
  )
}

/**
 * Un percorso: si mostra e si sceglie con il dialogo del sistema, non si
 * batte. Vuoto vuol dire «ci pensa il registro», e lo si dice.
 */
function Percorso ({ cx }: { cx: Contesto }): ReactElement {
  const t = testi()
  const { sfoglia, svuota } = cx.opzioni
  return (
    <div className="controllo-percorso">
      <ValoreLetto cx={cx} vuoto={t.ciPensaIlRegistro} />
      {sfoglia
        ? (
            <Pulsante
              testo={parole().sfoglia}
              titolo={t.sceglieConDialogo(cx.voce.formato === 'cartella')}
              gesto={sfoglia}
              spento={cx.spento}
              fuoco={cx.voce.chiave}
            />
          )
        : null}
      {svuota && String(cx.voce.valore ?? '') !== ''
        ? <Pulsante testo={t.svuota} titolo={t.svuotaAiuto} gesto={svuota} spento={cx.spento} />
        : null}
    </div>
  )
}

/**
 * Un modello: il nome del file si legge e basta. Si sceglie fra quelli
 * scaricati: battuto a mano sarebbe un nome che la cartella forse non ha.
 */
function Modello ({ cx }: { cx: Contesto }): ReactElement {
  const t = testi()
  const { aiModelli } = cx.opzioni
  return (
    <>
      <div className="controllo-percorso">
        <ValoreLetto cx={cx} vuoto={t.nessunModello} />
        {aiModelli ? <Pulsante testo={t.scegliModello} titolo={t.scegliModelloAiuto} gesto={aiModelli} /> : null}
      </div>
      {aiModelli ? null : <p className="controllo__nota">{t.modelloNelRegistro}</p>}
    </>
  )
}

/**
 * Casella e mittente li scrive «Collega la casella», e il mittente si sceglie
 * fra gli indirizzi dell'account: qui si leggono soltanto.
 */
function DelCollegamento ({ cx }: { cx: Contesto }): ReactElement {
  const t = testi()
  return (
    <>
      <div className="controllo-percorso"><ValoreLetto cx={cx} vuoto={t.nessunaCasella} /></div>
      <p className="controllo__nota">{t.delCollegamento}</p>
    </>
  )
}

// ---------------------------------------------------------------- il controllo

/** I pezzi di un disegno già scelto. */
function Pezzi ({ cx, scelte, disegno }: {
  cx: Contesto
  scelte: Scelta[] | null
  disegno: Disegno
}): ReactElement {
  switch (disegno) {
    case 'figura': return <GruppoRadio cx={cx} scelte={scelte ?? []} conFigura />
    case 'segmenti': return <GruppoRadio cx={cx} scelte={scelte ?? []} conFigura={false} />
    case 'tendina': return <Tendina cx={cx} scelte={scelte ?? []} />
    case 'altro': return <TendinaConAltro cx={cx} scelte={scelte ?? []} />
    case 'multipli': return <SegmentiMultipli cx={cx} scelte={scelte ?? []} />
    case 'interruttore': return <Interruttore cx={cx} />
    case 'numero': return <CampoNumero cx={cx} />
    case 'cursore': return <Cursore cx={cx} />
    case 'percorso': return <Percorso cx={cx} />
    case 'modello': return <Modello cx={cx} />
    case 'collegamento': return <DelCollegamento cx={cx} />
    case 'testo': return <CampoTesto cx={cx} scelte={scelte} />
  }
}

/** Quel che serve a `Disegna`: la voce, già con le sue scelte e il suo disegno. */
interface DaDisegnare {
  voce: VoceProgramma
  scelte: Scelta[] | null
  disegno: Disegno
  quandoCambia: Cambia
  opzioni: Opzioni
  aggiunte?: Aggiunte
  annuncio?: Annuncio
}

/** La riga sotto il campo: il testo, e se è un rifiuto. */
interface RigaEsito {
  testo: string
  rifiuto: boolean
}

/**
 * Il `div.controllo` di un disegno già scelto, con la riga dell'esito sotto. È
 * il corpo di `Controllo`; `Campo` ci arriva con un disegno suo, per i valori
 * che non sono chiavi del manifesto.
 */
export function Disegna (da: DaDisegnare): ReactElement {
  const { voce, scelte, disegno, quandoCambia, opzioni, annuncio } = da
  const [esito, impostaEsito] = useState<RigaEsito>({ testo: '', rifiuto: false })
  // Un rifiuto rifà i pezzi da capo con la voce di adesso: il valore che si
  // vedeva non è stato scritto. La riga dell'esito resta, col motivo dentro.
  const [giro, impostaGiro] = useState(0)
  const radice = useRef<HTMLDivElement | null>(null)
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null)
  const vivo = useRef(true)
  /** Il fuoco da rimettere dopo un rifiuto: la chiave del pezzo, '' il primo, null niente. */
  const fuocoDopo = useRef<string | null>(null)

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
      if (attesa.current) clearTimeout(attesa.current)
    }
  }, [])

  /** Scrive l'esito sotto il campo: «Salvato» sparisce da sé, il motivo resta. */
  const mostra = (motivo: Esito): void => {
    if (motivo === undefined || !vivo.current) return
    if (attesa.current) clearTimeout(attesa.current)
    attesa.current = null
    impostaEsito({ testo: motivo ?? testi().salvato, rifiuto: motivo !== null })
    if (motivo === null) {
      attesa.current = setTimeout(() => {
        attesa.current = null
        if (vivo.current) impostaEsito((prima) => ({ ...prima, testo: '' }))
      }, DURATA_SALVATO)
    }
  }

  // Un esito detto da fuori (un percorso scelto con «Sfoglia…» e rifiutato).
  useEffect(() => {
    if (annuncio) mostra(annuncio.motivo)
    // `mostra` è nuova a ogni disegno, ma legge solo riferimenti: conta l'annuncio.

  }, [annuncio])

  useLayoutEffect(() => {
    const chiave = fuocoDopo.current
    fuocoDopo.current = null
    if (chiave !== null && radice.current) fuocoDentro(radice.current, chiave || undefined)
  }, [giro])

  const cx: Contesto = {
    voce,
    opzioni,
    spento: voce.sospesa || (voce.tipo === 'boolean' && voce.bloccata !== null),
    cambia: (valore) => {
      const esito = quandoCambia(valore)
      if (!esito) return
      void esito.then((motivo) => {
        if (!vivo.current) return
        mostra(motivo)
        if (typeof motivo !== 'string') return
        const attivo = radice.current?.ownerDocument.activeElement as HTMLElement | null | undefined
        fuocoDopo.current = attivo && radice.current?.contains(attivo) ? attivo.dataset.fuoco ?? '' : null
        impostaGiro((prima) => prima + 1)
      })
    },
    di: mostra,
    aggiunte: da.aggiunte ?? {},
  }

  return (
    <div
      ref={radice}
      // testo-fisso: classi CSS
      className={`controllo controllo--${disegno}`}
      data-controllo={disegno}
      data-chiave={voce.chiave}
    >
      <Fragment key={giro}>
        <Pezzi cx={cx} scelte={scelte} disegno={disegno} />
      </Fragment>
      {/* La riga dell'esito: vuota finché non si salva. */}
      <p className={esito.rifiuto ? 'controllo__esito controllo__esito--rifiuto' : 'controllo__esito'} role="status">
        {esito.testo}
      </p>
    </div>
  )
}

/**
 * Il controllo di una voce: un `div.controllo` con il campo giusto e, sotto, la
 * riga dell'esito. Il nome della voce lo scrive chi disegna la riga; il campo
 * lo porta come nome accessibile. `annuncio` dice un esito arrivato senza
 * passare da `quandoCambia`.
 */
export function Controllo ({ voce, quandoCambia, annuncio, ...opzioni }: Opzioni & {
  voce: VoceProgramma
  quandoCambia: QuandoCambia
  annuncio?: Annuncio
}): ReactElement {
  const scelte = scelteDi(voce, opzioni)
  return (
    <Disegna
      voce={voce}
      scelte={scelte}
      disegno={disegnoDi(voce, scelte)}
      // I disegni a più valori li chiede solo `Campo`: qui arriva sempre un valore solo.
      quandoCambia={(valore) => quandoCambia(valore as Valore)}
      opzioni={opzioni}
      annuncio={annuncio}
    />
  )
}
