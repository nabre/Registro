// I mattoni dell'interfaccia in React (ADR-56): pulsanti, campi, pastiglie,
// schede, stati vuoti. Stessi nomi, stesse classi e stesso comportamento di
// prima di React: le opzioni di prima sono le proprietà di adesso. I moduli
// restano moduli HTML: ogni campo ha un `name`, il valore vive nel campo
// e `valoriModulo` lo legge al salvataggio.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent as EventoMouse,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'

import { dataDaTesto, formattaData, spostaData } from '#core/dominio/dates.js'
import { classi } from '#ui/classNames.js'
import { Input, Select, TextArea } from '#ui/fields.js'
import { testi } from '#ui/components/base.testi.js'
import { Suggerimento, useIdSuggerimento } from './hint.js'
import { Icona, type NomeIcona } from './icons.js'
import { useSuffissoModale } from './scope.js'


// ------------------------------------------------------------------ pulsanti

type VariantePulsante = 'primario' | 'normale' | 'sottile' | 'pericolo' | 'fantasma'

/**
 * Che cosa torna da un clic: niente, o il lavoro avviato. Una promessa fa
 * mostrare l'attesa sul pulsante finché l'host risponde.
 */
type EsitoClic = void | Promise<unknown>

/** Il clic di un pulsante: `currentTarget` è il pulsante. */
export type ClicPulsante = EventoMouse<HTMLButtonElement>

/** Quanto aspettare prima della rotella: le azioni istantanee non lampeggiano. */
const RITARDO_ROTELLA = 150

/**
 * Segna un pulsante come occupato finché il lavoro finisce: serve ai
 * `<button>` fatti a mano delle matrici. `disabled` blocca il secondo clic; se
 * il pulsante sparisce nel frattempo si tocca un nodo staccato, senza danno.
 */
export function conAttesa<T> (bottone: HTMLButtonElement, lavoro: Promise<T>): Promise<T> {
  const eraDisabilitato = bottone.disabled
  // Spento subito, perché il secondo clic non parta; la rotella solo dopo
  // `RITARDO_ROTELLA`, per non lampeggiare sulle azioni istantanee.
  bottone.disabled = true
  const rotella = setTimeout(() => {
    bottone.classList.add('in-corso')
    bottone.setAttribute('aria-busy', 'true')
  }, RITARDO_ROTELLA)

  const libera = () => {
    clearTimeout(rotella)
    bottone.classList.remove('in-corso')
    bottone.removeAttribute('aria-busy')
    bottone.disabled = eraDisabilitato
  }
  return lavoro.then(
    (esito) => {
      libera()
      return esito
    },
    (errore) => {
      libera()
      throw errore
    },
  )
}

/**
 * L'attesa di un pulsante: spento subito perché il secondo clic non parta, la
 * rotella solo dopo `RITARDO_ROTELLA`. Se il pulsante sparisce nel frattempo
 * non si tocca più niente.
 */
function useAttesa (): { occupato: boolean, rotella: boolean, aspetta: (lavoro: Promise<unknown>) => void } {
  const [occupato, impostaOccupato] = useState(false)
  const [rotella, impostaRotella] = useState(false)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => { vivo.current = false }
  }, [])
  const aspetta = (lavoro: Promise<unknown>) => {
    impostaOccupato(true)
    const tempo = setTimeout(() => { if (vivo.current) impostaRotella(true) }, RITARDO_ROTELLA)
    const libera = () => {
      clearTimeout(tempo)
      if (!vivo.current) return
      impostaOccupato(false)
      impostaRotella(false)
    }
    lavoro.then(libera, libera)
  }
  return { occupato, rotella, aspetta }
}

type AttributiPulsante = Omit<ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'type' | 'title' | 'disabled' | 'className' | 'children'>

export interface OpzioniPulsante extends AttributiPulsante {
  testo?: string
  simbolo?: NomeIcona
  variante?: VariantePulsante
  al?: (evento: ClicPulsante) => EsitoClic
  titolo?: string
  disabilitato?: boolean
  tipo?: 'button' | 'submit'
  classe?: string
  /**
   * Un pulsante che sta acceso o spento, e lo dice con `aria-pressed`: il colore
   * da solo non arriva al lettore di schermo. Omesso per i pulsanti che fanno
   * una cosa sola.
   */
  premuto?: boolean
  /** Chiave per ritrovare il fuoco dopo un ridisegno (`data-fuoco`). */
  fuoco?: string
  /** Figli dopo il testo (una pastiglia, un conto). */
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Pulsante (opzioni: OpzioniPulsante): ReactElement {
  const {
    testo, simbolo, variante = 'normale', al, titolo, disabilitato, tipo = 'button', classe,
    premuto, fuoco, children, ...resto
  } = opzioni
  const { occupato, rotella, aspetta } = useAttesa()
  // Un titolo vuoto darebbe `title=""` e `aria-label=""`: un pulsante senza nome
  // per il lettore di schermo.
  const nome = titolo || testo || undefined
  return (
    <button
      {...resto}
      className={classi(
        'pulsante', `pulsante--${variante}`, !testo && 'pulsante--solo-icona', classe, // testo-fisso: classe CSS
        rotella && 'in-corso',
      )}
      type={tipo}
      disabled={Boolean(disabilitato) || occupato}
      title={nome}
      aria-label={nome}
      aria-pressed={premuto === undefined ? undefined : premuto}
      aria-busy={rotella ? true : undefined}
      data-fuoco={fuoco}
      onClick={al
        ? (evento) => {
            const esito = al(evento)
            if (esito instanceof Promise) aspetta(esito)
          }
        : undefined}
    >
      {simbolo ? <Icona nome={simbolo} /> : null}
      {testo ? <span>{testo}</span> : null}
      {children}
    </button>
  )
}

/**
 * Un pulsante che si legge come un collegamento (un nome, una data, un titolo
 * che portano altrove), con l'attesa di `Pulsante`. `testo` può portare due righe.
 */
export function Collegamento ({ testo, al, titolo, classe, fuoco }: {
  testo: ReactNode
  al: (evento: ClicPulsante) => EsitoClic
  titolo?: string
  classe?: string
  fuoco?: string
}): ReactElement {
  const { occupato, rotella, aspetta } = useAttesa()
  return (
    <button
      className={classi('collegamento', classe, rotella && 'in-corso')}
      type="button"
      title={titolo}
      disabled={occupato || undefined}
      aria-busy={rotella ? true : undefined}
      data-fuoco={fuoco}
      onClick={(evento) => {
        const esito = al(evento)
        if (esito instanceof Promise) aspetta(esito)
      }}
    >
      {testo}
    </button>
  )
}

/**
 * Un gruppo di scelte alternative (settimana/mese/agenda): `role="radiogroup"`
 * con `role="radio"`, perché sotto non c'è un `tabpanel`. È una sola fermata
 * del Tab (`tabindex` mobile) e da dentro ci si muove con le frecce, che girano.
 */
export function Selettore<T extends string> ({ valore, voci, al, etichetta = testi().scheda }: {
  valore: T
  voci: ReadonlyArray<{ valore: T, testo: string, simbolo?: NomeIcona }>
  al: (scelto: T) => void
  etichetta?: string
}): ReactElement {
  // Un radiogroup non espone mai zero scelte: se il valore sta assestandosi, la
  // prima voce resta la scelta accessibile temporanea.
  const indiceAttivo = Math.max(0, voci.findIndex((voce) => voce.valore === valore))
  return (
    <div
      className="selettore"
      role="radiogroup"
      aria-label={etichetta}
      onKeyDown={(evento) => {
        const passo = evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
          ? 1
          : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp' ? -1 : 0
        if (passo === 0) return
        evento.preventDefault()
        const vive = Array.from(evento.currentTarget.children)
        const dove = vive.indexOf(document.activeElement as Element)
        // Gira: dall'ultima si torna alla prima.
        const voce = voci[(Math.max(0, dove) + passo + voci.length) % voci.length]
        if (voce) al(voce.valore)
      }}
    >
      {voci.map((voce, indice) => {
        const attiva = indice === indiceAttivo
        return (
          <button
            key={voce.valore}
            className={classi('selettore__voce', attiva && 'selettore__voce--attiva')}
            type="button"
            role="radio"
            aria-checked={attiva ? 'true' : 'false'}
            tabIndex={attiva ? 0 : -1}
            // La chiave di fuoco solo sulla voce accesa: la freccia sceglie, la pagina si
            // ridisegna, e il fuoco ritrova la voce accesa nel gruppo nuovo.
            data-fuoco={attiva ? `selettore:${etichetta}` : undefined} // testo-fisso: chiave di fuoco, non si legge
            onClick={() => al(voce.valore)}
          >
            {voce.simbolo ? <Icona nome={voce.simbolo} /> : null}
            <span>{voce.testo}</span>
          </button>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------ campi

export interface OpzioneSelezione {
  valore: string
  testo: string
}

export interface OpzioniCampo {
  nome: string
  etichetta?: string
  tipo?: 'text' | 'date' | 'time' | 'number' | 'email' | 'tel' | 'color' | 'textarea' | 'select' | 'checkbox'
  valore?: string | number | boolean | null
  segnaposto?: string
  /**
   * La spiegazione del campo, dietro la «i» accanto all'etichetta: solo
   * spiegazione fissa, non quel che cambia con i dati. Senza etichetta resta
   * scritta sotto.
   */
  aiuto?: string
  richiesto?: boolean
  disabilitato?: boolean
  /**
   * Con `tipo: 'date'`: il calendario del sistema invece del campo scritto, per
   * le date che si cercano guardando il mese più che battendole.
   */
  calendario?: boolean
  min?: number | string
  max?: number | string
  passo?: number | string
  righe?: number
  opzioni?: readonly OpzioneSelezione[]
  /** Quanto spazio occupa nella griglia del modulo. */
  larghezza?: 'piena' | 'meta' | 'terzo' | 'quarto'
  /** Il valore deciso (`change` del browser): per le caselle `'true'`/`'false'`. */
  al?: (valore: string, evento: Event) => void
  /** Chiave per ritrovare il fuoco dopo un ridisegno. */
  fuoco?: string
  classe?: string
  /** Prefisso per `id` e chiave di fuoco, se lo stesso nome compare più volte nella pagina. */
  scope?: string
  /** Un comando accanto al controllo, di solito il «+» che crea al volo quel che manca. */
  azione?: ReactNode
  /** Il nome per il lettore di schermo quando l'etichetta è dentro il segno «i». */
  descrittoDa?: string
  /** Una riga dentro il riquadro, sotto il controllo: un conto, un avviso che cambia coi dati. */
  sotto?: ReactNode
}

/** L'id del campo: con la modale intorno, unico per modale. */
function useIdCampo (opzioni: Pick<OpzioniCampo, 'scope' | 'nome'>): string {
  const suffisso = useSuffissoModale()
  const base = opzioni.scope ? `campo-${opzioni.scope}-${opzioni.nome}` : `campo-${opzioni.nome}` // testo-fisso: id del campo, non si legge
  return `${base}${suffisso}`
}

/** La chiave di fuoco del campo, unica per modale come l'id. */
function useFuocoCampo (opzioni: Pick<OpzioniCampo, 'scope' | 'nome' | 'fuoco'>): string {
  const suffisso = useSuffissoModale()
  const chiave = opzioni.fuoco ?? opzioni.nome
  return `${opzioni.scope ? `${opzioni.scope}-${chiave}` : chiave}${suffisso}`
}

/**
 * Un campo data dentro una riga, con l'etichetta accanto: in un elenco
 * `Campo` non ci sta, e un campo nudo non si capisce.
 */
export function DataInLinea (opzioni: {
  etichetta: string
  nome: string
  valore: string
  titolo?: string
  al: (valore: string) => void
}): ReactElement {
  return (
    <label className="data-linea" title={opzioni.titolo}>
      <span className="data-linea__etichetta">{opzioni.etichetta}</span>
      <ControlloData
        nome={opzioni.nome}
        valore={opzioni.valore}
        segnaposto={testi().formatoData}
        al={(valore) => opzioni.al(String(valore))}
      />
    </label>
  )
}

/** Il passo da tastiera avvisa quando ci si ferma, non a ogni tasto. */
const RESPIRO_PASSO = 250

/**
 * Il campo data senza etichetta né contorno (serve anche in tabella). Si
 * scrive come su un foglio: `7.9`, `7/9/26`, `070926` (`dataDaTesto`); ↑ e ↓
 * spostano di un giorno, PagSu e PagGiù di un mese. Il valore ISO sta in un
 * campo nascosto, che è quel che `valoriModulo` legge e `al` riceve. Quel che
 * non si legge resta scritto, segnato in rosso.
 */
export function ControlloData (opzioni: OpzioniCampo): ReactElement {
  const id = useIdCampo(opzioni)
  const fuoco = useFuocoCampo(opzioni)
  const iniziale = String(opzioni.valore ?? '')
  const visibile = useRef<HTMLInputElement | null>(null)
  const nascosto = useRef<HTMLInputElement | null>(null)
  const attesaPasso = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [errata, impostaErrata] = useState(false)

  // Il valore nascosto segue lo stato come quello visibile (`Input`): solo quando
  // cambia e il campo non ha il fuoco.
  const applicato = useRef(iniziale)
  // A ogni disegno, non solo quando cambia il valore: col fuoco si aspetta il
  // disegno dopo. Lo stato cambia solo se il valore è nuovo, quindi niente giri.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const campo = nascosto.current
    if (!campo || applicato.current === iniziale || visibile.current === document.activeElement) return
    applicato.current = iniziale
    campo.value = iniziale
    impostaErrata(false)
    visibile.current?.setCustomValidity('')
  })

  const mostra = (nuova: string) => {
    if (nascosto.current) nascosto.current.value = nuova
    if (visibile.current) {
      visibile.current.value = nuova ? formattaData(nuova) : ''
      visibile.current.setCustomValidity('')
    }
    impostaErrata(false)
  }

  /** Che cosa c'è scritto adesso: la data, stringa vuota, o null se illeggibile. */
  const letta = (): string | null => {
    const scritto = visibile.current?.value.trim() ?? ''
    if (!scritto) return ''
    return dataDaTesto(scritto, nascosto.current?.value || undefined)
  }

  useEffect(() => () => {
    if (attesaPasso.current) clearTimeout(attesaPasso.current)
  }, [])

  // Il valore del campo nascosto entra una volta, al montaggio (vedi sotto).
  useLayoutEffect(() => {
    if (nascosto.current) nascosto.current.value = applicato.current
  }, [])

  return (
    <div className="campo__data">
      <Input
        ref={visibile}
        className={classi('campo__controllo', 'campo__controllo--data', errata && 'campo__controllo--errata')}
        id={id}
        type="text"
        valore={iniziale ? formattaData(iniziale) : ''}
        placeholder={opzioni.segnaposto ?? testi().formatoData}
        disabled={Boolean(opzioni.disabilitato)}
        required={Boolean(opzioni.richiesto)}
        data-fuoco={fuoco}
        inputMode="numeric"
        autoComplete="off"
        spellCheck="false"
        aria-describedby={opzioni.descrittoDa}
        aria-label={opzioni.descrittoDa ? opzioni.etichetta : undefined}
        onCambio={(evento) => {
          const nuova = letta()
          if (nuova === null) {
            impostaErrata(true)
            // Il valore salvato è nel campo nascosto: lo si svuota e si rende il campo
            // invalido, così il `<form>` ferma il salvataggio invece di tenere la data
            // vecchia in silenzio. Impostata e non mostrata: `reportValidity()`
            // ruberebbe il fuoco a un clic su «Annulla».
            if (nascosto.current) nascosto.current.value = ''
            visibile.current?.setCustomValidity(testi().dataIlleggibile)
            return
          }
          mostra(nuova)
          opzioni.al?.(nuova, evento)
        }}
        onKeyDown={(evento) => {
          const passi: Record<string, [number, number]> = {
            ArrowUp: [1, 0],
            ArrowDown: [-1, 0],
            PageUp: [0, 1],
            PageDown: [0, -1],
          }
          const passo = passi[evento.key]
          if (!passo) return
          const base = letta() || nascosto.current?.value
          if (!base) return
          evento.preventDefault()
          mostra(spostaData(base, passo[0], passo[1]))
          if (attesaPasso.current) clearTimeout(attesaPasso.current)
          const nativo = evento.nativeEvent
          attesaPasso.current = setTimeout(() => {
            attesaPasso.current = null
            opzioni.al?.(nascosto.current?.value ?? '', nativo)
          }, RESPIRO_PASSO)
        }}
        // Uscendo dal campo non si aspetta: la data parte prima che il fuoco se ne vada.
        onBlur={(evento) => {
          if (!attesaPasso.current) return
          clearTimeout(attesaPasso.current)
          attesaPasso.current = null
          opzioni.al?.(nascosto.current?.value ?? '', evento.nativeEvent)
        }}
      />
      {/* Senza `defaultValue`: React lo riscrive a ogni disegno, e in un campo
          nascosto `defaultValue` è il valore, quindi una data scritta da fuori
          (`scriviData`) tornerebbe quella dell'apertura. */}
      <input ref={nascosto} type="hidden" name={opzioni.nome} />
    </div>
  )
}

/**
 * Una tendina fuori da un modulo (in una riga, una tappa, una barra).
 * `etichetta` è il nome per il lettore di schermo; si omette solo se una
 * `<label>` intorno lo dà già.
 */
export function Tendina<T extends string> (opzioni: {
  voci: ReadonlyArray<{ valore: T, testo: string }>
  valore: T | '' | null | undefined
  etichetta?: string
  al: (valore: T, evento: Event) => void
  classe?: string
  fuoco?: string
  disabilitato?: boolean
  titolo?: string
}): ReactElement {
  return (
    <Select
      className={classi('campo__controllo', 'campo__controllo--selezione', opzioni.classe)}
      aria-label={opzioni.etichetta}
      title={opzioni.titolo}
      data-fuoco={opzioni.fuoco}
      disabled={opzioni.disabilitato}
      valore={opzioni.valore ?? ''}
      onCambio={(evento) => opzioni.al((evento.target as HTMLSelectElement).value as T, evento)}
    >
      {opzioni.voci.map((voce) => <option key={voce.valore} value={voce.valore}>{voce.testo}</option>)}
    </Select>
  )
}

/** Un testo di contorno, in grigio: «nessuna lezione», «da decidere». */
export function Quieto ({ children }: { children?: ReactNode }): ReactElement {
  return <p className="testo-quieto">{children}</p>
}

/** Il controllo di `Campo`, secondo il tipo. */
function Controllo ({ opzioni, id, chiaveFuoco }: {
  opzioni: OpzioniCampo
  id: string
  chiaveFuoco: string
}): ReactElement {
  // Il campo scritto è la regola; il calendario di sistema solo se chiesto.
  if (opzioni.tipo === 'date' && !opzioni.calendario) return <ControlloData {...opzioni} />

  const comune = {
    name: opzioni.nome,
    id,
    disabled: Boolean(opzioni.disabilitato),
    'data-fuoco': chiaveFuoco,
    'aria-describedby': opzioni.descrittoDa,
    'aria-label': opzioni.descrittoDa ? opzioni.etichetta : undefined,
    onCambio: opzioni.al
      ? (evento: Event) => opzioni.al?.((evento.target as HTMLInputElement).value, evento)
      : undefined,
  }

  if (opzioni.tipo === 'textarea') {
    return (
      <TextArea
        {...comune}
        className="campo__controllo campo__controllo--area"
        rows={opzioni.righe ?? 4}
        placeholder={opzioni.segnaposto ?? ''}
        valore={opzioni.valore === null || opzioni.valore === undefined ? '' : String(opzioni.valore)}
        required={Boolean(opzioni.richiesto)}
      />
    )
  }

  if (opzioni.tipo === 'select') {
    return (
      <Select
        {...comune}
        className="campo__controllo campo__controllo--selezione"
        valore={opzioni.valore === null || opzioni.valore === undefined ? '' : String(opzioni.valore)}
      >
        {(opzioni.opzioni ?? []).map((voce) => <option key={voce.valore} value={voce.valore}>{voce.testo}</option>)}
      </Select>
    )
  }

  if (opzioni.tipo === 'checkbox') {
    return (
      <Input
        {...comune}
        className="campo__interruttore"
        type="checkbox"
        spuntato={Boolean(opzioni.valore)}
        // Una spunta ha sempre `value` `'on'`: `al` riceve lo stato come
        // `'true'`/`'false'`, per chi salva al volo (`valoriModulo` guarda `checked`).
        onCambio={opzioni.al
          ? (evento) => opzioni.al?.(String((evento.target as HTMLInputElement).checked), evento)
          : undefined}
      />
    )
  }

  return (
    <Input
      {...comune}
      className="campo__controllo"
      type={opzioni.tipo ?? 'text'}
      valore={opzioni.valore === null || opzioni.valore === undefined ? '' : String(opzioni.valore)}
      placeholder={opzioni.segnaposto ?? ''}
      required={Boolean(opzioni.richiesto)}
      min={opzioni.min}
      max={opzioni.max}
      step={opzioni.passo}
      autoComplete="off"
    />
  )
}

export function Campo (opzioni: OpzioniCampo): ReactElement {
  const larghezza = opzioni.larghezza ?? 'piena'
  const id = useIdCampo(opzioni)
  const fuoco = useFuocoCampo(opzioni)
  const idSpiegazione = useIdSuggerimento()
  const conSegno = Boolean(opzioni.aiuto && opzioni.etichetta)
  // Il controllo descritto dalla spiegazione nascosta e col nome rimesso: il
  // pulsante «i» dentro la `<label>` farebbe «Peso Spiegazione: Peso».
  const controllo = (
    <Controllo
      opzioni={{ ...opzioni, descrittoDa: conSegno ? idSpiegazione : undefined }}
      id={id}
      chiaveFuoco={fuoco}
    />
  )
  const segno = conSegno
    ? <Suggerimento testo={opzioni.aiuto} etichetta={opzioni.etichetta} id={idSpiegazione} />
    : null
  const sotto = opzioni.aiuto && !conSegno ? <small className="campo__aiuto">{opzioni.aiuto}</small> : null

  if (opzioni.tipo === 'checkbox') {
    // Il segno sta dentro la `<label>`: `Suggerimento` ferma il suo clic.
    return (
      // testo-fisso: classe CSS
      <label className={classi('campo', 'campo--interruttore', `campo--${larghezza}`, opzioni.classe)}>
        {controllo}
        <span className="campo__etichetta-in-linea">{opzioni.etichetta ?? ''}{segno}</span>
        {sotto}
      </label>
    )
  }

  return (
    // testo-fisso: classe CSS
    <div className={classi('campo', `campo--${larghezza}`, opzioni.classe)}>
      {opzioni.etichetta
        ? (
            <label className="campo__etichetta" htmlFor={id}>
              {opzioni.etichetta}
              {opzioni.richiesto ? <span className="campo__obbligo">*</span> : null}
              {segno}
            </label>
          )
        : null}
      {opzioni.azione
        ? <div className="campo__gruppo">{controllo}{opzioni.azione}</div>
        : controllo}
      {sotto}
      {opzioni.sotto}
    </div>
  )
}

/** Riga di campi: la griglia dei moduli sta tutta qui dentro. */
export function Riga ({ children }: { children?: ReactNode }): ReactElement {
  return <div className="modulo__riga">{children}</div>
}

/**
 * Una sezione di modulo col suo titolo; `{ testo, aiuto }` mette la spiegazione
 * dietro la «i».
 */
export function SezioneModulo ({ titolo, children }: {
  titolo: string | { testo: string, aiuto: ReactNode }
  children?: ReactNode
}): ReactElement {
  const testo = typeof titolo === 'string' ? titolo : titolo.testo
  return (
    <section className="modulo__sezione">
      <h4 className="modulo__titolo-sezione">
        {testo}
        {typeof titolo === 'string' ? null : <Suggerimento testo={titolo.aiuto} etichetta={testo} />}
      </h4>
      {children}
    </section>
  )
}

/**
 * Legge tutti i campi con `name` dentro un contenitore. I numeri escono numeri e
 * le caselle escono booleane, così chi salva non deve convertire niente.
 */
export function valoriModulo (contenitore: HTMLElement): Record<string, string | number | boolean> {
  const valori: Record<string, string | number | boolean> = {}
  const campi = contenitore.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(
    '[name]',
  )
  for (const elemento of campi) {
    const nome = elemento.name
    if (!nome) continue
    if (elemento instanceof HTMLInputElement && elemento.type === 'checkbox') {
      valori[nome] = elemento.checked
    } else if (elemento instanceof HTMLInputElement && elemento.type === 'number') {
      valori[nome] = elemento.value === '' ? '' : Number(elemento.value)
    } else {
      valori[nome] = elemento.value
    }
  }
  return valori
}

// ------------------------------------------------------------------ decorazioni

export type TonoPastiglia = 'neutro' | 'positivo' | 'attenzione' | 'negativo' | 'informativo' | 'quiete'

/** Quanto misura un file, in una forma sola per tutte le pagine che mostrano file. */
export function quantoMisura (byte: number): string {
  const t = testi()
  if (byte < 1024) return t.byte(byte)
  const kb = byte / 1024
  return kb < 1024 ? t.kilobyte(kb) : t.megabyte(kb / 1024)
}

/**
 * Di che colore si legge una percentuale di presenza: soglie in un posto solo.
 * `null` (nessun appello) non si colora.
 */
export function tonoPresenza (presenza: number | null): TonoPastiglia | undefined {
  if (presenza === null) return undefined
  if (presenza >= 0.9) return 'positivo'
  return presenza >= 0.8 ? 'attenzione' : 'negativo'
}

export function Pastiglia ({ testo, tono = 'neutro', simbolo, titolo }: {
  testo: ReactNode
  tono?: TonoPastiglia
  simbolo?: NomeIcona
  titolo?: string
}): ReactElement {
  return (
    // testo-fisso: classe CSS
    <span className={classi('pastiglia', `pastiglia--${tono}`)} title={titolo}>
      {simbolo ? <Icona nome={simbolo} /> : null}
      {testo}
    </span>
  )
}

/**
 * Il titolo di un mucchio con quanti ce n'è dentro: il nome in una pastiglia
 * tenue a sinistra, il conto a destra incolonnato con gli altri.
 */
export function TitoloGruppo ({ titolo, quante, livello = 'h4' }: {
  titolo: string
  quante: number
  livello?: 'h4' | 'h5'
}): ReactElement {
  const Livello = livello
  return (
    <Livello className="gruppo-titolo">
      <span className="gruppo-titolo__nome">{titolo}</span>
      <span className="gruppo-titolo__conto">{String(quante)}</span>
    </Livello>
  )
}

/** Puntino colorato della classe: nel calendario è quello che la fa riconoscere. */
export function PuntoColore ({ colore }: { colore: string }): ReactElement {
  return <span className="punto-colore" style={{ backgroundColor: colore }} />
}

export function Scheda (opzioni: {
  titolo?: string
  sottotitolo?: string
  /** La spiegazione della scheda, dietro la «i» accanto al titolo. */
  aiuto?: ReactNode
  azioni?: ReactNode
  classe?: string
  contenuto?: ReactNode
  children?: ReactNode
  /**
   * La chiave di telaio (`data-telaio`): la scheda e il suo corpo restano gli
   * stessi nodi fra due disegni, e le prove li ritrovano (`<chiave>:corpo`).
   */
  telaio?: string
}): ReactElement {
  return (
    <section className={classi('scheda', opzioni.classe)} data-telaio={opzioni.telaio}>
      {opzioni.titolo || opzioni.azioni
        ? (
            <header className="scheda__testata">
              <div className="scheda__titoli">
                {opzioni.titolo
                  ? (
                      <h3 className="scheda__titolo">
                        {opzioni.titolo}
                        {opzioni.aiuto ? <Suggerimento testo={opzioni.aiuto} etichetta={opzioni.titolo} /> : null}
                      </h3>
                    )
                  : null}
                {opzioni.sottotitolo ? <p className="scheda__sottotitolo">{opzioni.sottotitolo}</p> : null}
              </div>
              {opzioni.azioni ? <div className="scheda__azioni">{opzioni.azioni}</div> : null}
            </header>
          )
        : null}
      <div className="scheda__corpo" data-telaio={opzioni.telaio ? `${opzioni.telaio}:corpo` : undefined}>
        {opzioni.contenuto}{opzioni.children}
      </div>
    </section>
  )
}

/** Stato vuoto: dice che cosa manca e offre il gesto per rimediare. */
export function StatoVuoto (opzioni: {
  simbolo?: NomeIcona
  titolo: string
  testo?: string
  azione?: ReactNode
  /** La chiave di telaio, quando lo stato vuoto è la radice di una vista (`telaioVista()`). */
  telaio?: string
}): ReactElement {
  return (
    <div className="stato-vuoto" data-telaio={opzioni.telaio}>
      {opzioni.simbolo ? <Icona nome={opzioni.simbolo} classe="icona--grande" /> : null}
      <p className="stato-vuoto__titolo">{opzioni.titolo}</p>
      {opzioni.testo ? <p className="stato-vuoto__testo">{opzioni.testo}</p> : null}
      {opzioni.azione ? <div className="stato-vuoto__azione">{opzioni.azione}</div> : null}
    </div>
  )
}

const SIMBOLI_AVVISO = { informativo: 'informazione', attenzione: 'avviso', negativo: 'avviso' } as const

export function Avviso ({ tono = 'informativo', ruolo = 'status', children }: {
  tono?: 'informativo' | 'attenzione' | 'negativo'
  /** `null` dentro una regione viva che lo annuncia già (gli errori della modale). */
  ruolo?: 'status' | null
  children?: ReactNode
}): ReactElement {
  return (
    // testo-fisso: classe CSS
    <div className={classi('avviso', `avviso--${tono}`)} role={ruolo ?? undefined}>
      <Icona nome={SIMBOLI_AVVISO[tono]} />
      <div className="avviso__testo">{children}</div>
    </div>
  )
}

/** Numero grande con la sua didascalia: le sintesi in cima alle viste. */
export function DatoSintetico ({ etichetta, valore, tono }: {
  etichetta: string
  valore: string
  tono?: TonoPastiglia
}): ReactElement {
  return (
    // testo-fisso: classe CSS
    <div className={classi('dato', tono && `dato--${tono}`)}>
      <span className="dato__valore">{valore}</span>
      <span className="dato__etichetta">{etichetta}</span>
    </div>
  )
}

/**
 * Barra di avanzamento, `quota` fra 0 e 1. L'etichetta dà il nome al
 * `role="progressbar"`: senza, «60 per cento» non dice di che cosa.
 */
export function Barra ({ quota, tono = 'informativo', etichetta = testi().avanzamento }: {
  quota: number
  tono?: TonoPastiglia
  etichetta?: string
}): ReactElement {
  const percentuale = Math.round(Math.min(1, Math.max(0, quota)) * 100)
  return (
    <div
      className="barra"
      role="progressbar"
      aria-label={etichetta}
      aria-valuenow={percentuale}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={classi('barra__riempimento', `barra__riempimento--${tono}`)} style={{ width: `${percentuale}%` }} />
    </div>
  )
}

/**
 * Testata di una vista: titolo, contorno e comandi. `compatta` la riduce a una
 * riga (titolo piccolo, numeri in coda) dove la testata non è la prima cosa da
 * leggere, come nel calendario.
 */
export function TestataVista (opzioni: {
  titolo: string
  /** Un nodo dove serve uno stile dentro la riga: la data di una lezione. */
  sottotitolo?: ReactNode
  /** Che cosa è questa pagina, dietro la «i» accanto al titolo. */
  aiuto?: ReactNode
  azioni?: ReactNode
  contorno?: ReactNode
  compatta?: boolean
}): ReactElement {
  const segno = opzioni.aiuto ? <Suggerimento testo={opzioni.aiuto} etichetta={opzioni.titolo} /> : null
  if (opzioni.compatta) {
    return (
      <header className="testata testata--compatta">
        <h2 className="testata__titolo">{opzioni.titolo}{segno}</h2>
        {opzioni.sottotitolo ? <p className="testata__sottotitolo">{opzioni.sottotitolo}</p> : null}
        <span className="testata__spazio" />
        {opzioni.contorno ? <div className="testata__contorno">{opzioni.contorno}</div> : null}
        {opzioni.azioni ? <div className="testata__azioni">{opzioni.azioni}</div> : null}
      </header>
    )
  }
  return (
    <header className="testata">
      <div className="testata__principale">
        <div>
          <h2 className="testata__titolo">{opzioni.titolo}{segno}</h2>
          {opzioni.sottotitolo ? <p className="testata__sottotitolo">{opzioni.sottotitolo}</p> : null}
        </div>
        {opzioni.azioni ? <div className="testata__azioni">{opzioni.azioni}</div> : null}
      </div>
      {opzioni.contorno ? <div className="testata__contorno">{opzioni.contorno}</div> : null}
    </header>
  )
}
