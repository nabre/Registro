// I campi dei controlli in React (ADR-52, ADR-56), copiati da `ui/fields.tsx`
// perché da qui il pannello non si importa: la stessa finestra nativa li usa.
// La regola è quella: il valore che arriva dallo stato entra nel campo solo
// quando cambia e il campo non ha il fuoco. Chi scrive non si vede il testo
// riscritto sotto le dita, e un ridisegno che non porta niente di nuovo non
// tocca quel che si è battuto.
//
// `onCambio` è l'evento `change` del browser, che parte quando il valore è
// deciso (uscendo dal campo, scegliendo una voce): l'`onChange` di React parte
// a ogni tasto, e chi salva a ogni `change` salverebbe a ogni lettera.


import {
  useCallback,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactElement,
  type Ref,
  type SelectHTMLAttributes,
} from 'react'

type Valore = string | number | null | undefined

/** I due riferimenti al campo: il nostro e quello di chi lo usa. */
function unisci<T> (nostro: { current: T | null }, suo: Ref<T> | undefined): (nodo: T | null) => void {
  return (nodo) => {
    nostro.current = nodo
    if (typeof suo === 'function') suo(nodo)
    else if (suo) (suo as { current: T | null }).current = nodo
  }
}

/**
 * L'ascoltatore del `change` del browser sul campo, con la funzione dell'ultimo
 * disegno: si mette una volta sola, e chiama sempre quella nuova.
 */
function useCambioNativo (
  campo: { current: HTMLElement | null },
  onCambio: ((evento: Event) => void) | undefined,
): void {
  const ultimo = useRef(onCambio)
  useLayoutEffect(() => { ultimo.current = onCambio })
  useLayoutEffect(() => {
    const nodo = campo.current
    if (!nodo) return
    const ascolta = (evento: Event) => ultimo.current?.(evento)
    nodo.addEventListener('change', ascolta)
    return () => nodo.removeEventListener('change', ascolta)
  }, [campo])
}

/**
 * Riporta nel campo il valore dello stato quando cambia, se il campo non ha il
 * fuoco; col fuoco aspetta il prossimo disegno in cui non ce l'ha più.
 */
function useValoreVivo (
  campo: { current: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null },
  valore: Valore,
  scrivi: (nodo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, valore: string) => void,
): void {
  const applicato = useRef<string | null>(null)
  const testo = valore === null || valore === undefined ? '' : String(valore)
  useLayoutEffect(() => {
    const nodo = campo.current
    if (!nodo) return
    if (applicato.current === null) {
      applicato.current = testo
      return
    }
    if (applicato.current === testo || nodo === nodo.ownerDocument.activeElement) return
    applicato.current = testo
    scrivi(nodo, testo)
  })
}

const scriviValore = (nodo: { value: string }, valore: string) => { nodo.value = valore }

/**
 * Il valore con cui il campo nasce, fermo per tutta la sua vita: un
 * `defaultValue` che cambia React lo riscrive nel nodo, anche col fuoco in un
 * campo mai toccato. Dopo il montaggio il valore entra solo da `useValoreVivo`.
 */
function useValoreIniziale (valore: Valore): string {
  const iniziale = useRef<string | null>(null)
  iniziale.current ??= valore === null || valore === undefined ? '' : String(valore)
  return iniziale.current
}

type AttributiInput = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'checked' | 'defaultChecked' | 'onChange'>

/**
 * Un `<input>`. `valore` per i campi di testo, `spuntato` per caselle e
 * pulsanti di scelta; `onCambio` col `change` del browser.
 */
export function Input ({ valore, spuntato, onCambio, ref, ...resto }: AttributiInput & {
  valore?: Valore
  spuntato?: boolean
  onCambio?: (evento: Event) => void
  ref?: Ref<HTMLInputElement>
}): ReactElement {
  const campo = useRef<HTMLInputElement | null>(null)
  const unito = useCallback((nodo: HTMLInputElement | null) => unisci(campo, ref)(nodo), [ref])
  useCambioNativo(campo, onCambio)
  const casella = resto.type === 'checkbox' || resto.type === 'radio'
  const iniziale = useValoreIniziale(casella ? (spuntato ? '1' : '') : valore)
  useValoreVivo(
    campo,
    casella ? (spuntato ? '1' : '') : valore,
    casella ? (nodo, v) => { (nodo as HTMLInputElement).checked = v === '1' } : scriviValore,
  )
  return casella
    ? <input ref={unito} defaultChecked={iniziale === '1'} {...resto} />
    : <input ref={unito} defaultValue={iniziale} {...resto} />
}

type AttributiSelect = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue' | 'onChange'>

/**
 * Una `<select>`. Un valore che nessuna voce porta la lascia in bianco (la
 * verità), invece di mostrare la prima voce mentre lo stato ne tiene un'altra.
 */
export function Select ({ valore, onCambio, ref, children, ...resto }: AttributiSelect & {
  valore?: Valore
  onCambio?: (evento: Event) => void
  ref?: Ref<HTMLSelectElement>
}): ReactElement {
  const campo = useRef<HTMLSelectElement | null>(null)
  const unito = useCallback((nodo: HTMLSelectElement | null) => unisci(campo, ref)(nodo), [ref])
  const testo = valore === null || valore === undefined ? '' : String(valore)
  /** Il valore dello stato già portato nel campo, e la scelta che il campo deve mostrare. */
  const applicato = useRef<string | null>(null)
  const scelta = useRef(testo)
  useCambioNativo(campo, (evento) => {
    // La scelta di chi usa il campo resta finché lo stato non porta un valore nuovo.
    if (campo.current) scelta.current = campo.current.value
    onCambio?.(evento)
  })
  useLayoutEffect(() => {
    const nodo = campo.current
    if (!nodo) return
    if (applicato.current !== testo && nodo !== nodo.ownerDocument.activeElement) {
      applicato.current = testo
      scelta.current = testo
    }
    // Le voci possono essere cambiate sotto la scelta: si rimette, o si lascia in
    // bianco se la voce non c'è più (`selectedIndex` -1, non la prima voce).
    if (nodo.value === scelta.current) return
    const c = Array.from(nodo.options).findIndex((voce) => voce.value === scelta.current)
    if (nodo !== nodo.ownerDocument.activeElement || c >= 0) nodo.selectedIndex = c
  })
  return <select ref={unito} defaultValue={testo} {...resto}>{children}</select>
}
