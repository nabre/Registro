// Costruzione dell'interfaccia senza framework: `h('div', {class: 'x'}, ...)`
// crea subito un elemento vero, senza DOM virtuale. La vista si ridisegna solo
// quando lo stato cambia; fuoco e scorrimento si rimettono con `data-fuoco` e
// `data-scorrimento`.

// Il pacchetto è solo ESM e `tsc` legge il progetto come CommonJS (TS1479);
// esbuild lo impacchetta come ESM, e i tipi restano quelli del pacchetto.
// @ts-expect-error -- TS1479, vedi sopra
import { Idiomorph } from 'idiomorph'

export type Figlio = Node | string | number | null | undefined | false | Figlio[]

export interface Attributi {
  class?: string | Array<string | false | null | undefined>
  /** Le variabili CSS (`--nome`) passano da `setProperty`: `Object.assign` le perderebbe. */
  style?: (Partial<CSSStyleDeclaration> & { [variabile: `--${string}`]: string }) | string
  dataset?: Record<string, string | number | boolean | undefined>
  /** Attributi da mettere così come sono: aria-*, role, colspan… */
  attr?: Record<string, string | number | boolean | null | undefined>
  [chiave: string]: unknown
}

function applicaClasse (elemento: HTMLElement, valore: Attributi['class']): void {
  const nomi = Array.isArray(valore) ? valore.filter(Boolean) : [valore]
  const pulite = nomi.filter((n): n is string => typeof n === 'string' && n.length > 0)
  if (pulite.length > 0) elemento.className = pulite.join(' ')
}

function aggiungi (genitore: Node, figlio: Figlio): void {
  if (figlio === null || figlio === undefined || figlio === false) return
  if (Array.isArray(figlio)) {
    for (const voce of figlio) aggiungi(genitore, voce)
    return
  }
  genitore.appendChild(
    figlio instanceof Node ? figlio : document.createTextNode(String(figlio)),
  )
}

export function h<K extends keyof HTMLElementTagNameMap> (
  tag: K,
  attributi?: Attributi | null,
  ...figli: Figlio[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag)

  /**
   * Il `value` di un `<select>`, assegnato dopo i figli: un `<select>` vuoto non
   * accetta un valore che nessuna `<option>` porta. Così un valore assente lascia
   * la tendina in bianco (la verità) e la prima scelta fa partire `change`,
   * invece di mostrare la prima voce mentre il filtro ne tiene un'altra.
   */
  let valoreDellaTendina: unknown

  for (const [chiave, valore] of Object.entries(attributi ?? {})) {
    if (valore === undefined || valore === null) continue

    if (chiave === 'value' && elemento instanceof HTMLSelectElement) {
      valoreDellaTendina = valore
    } else if (chiave === 'class') {
      applicaClasse(elemento, valore as Attributi['class'])
    } else if (chiave === 'style') {
      if (typeof valore === 'string') elemento.setAttribute('style', valore)
      else {
        for (const [proprieta, dato] of Object.entries(valore as Record<string, unknown>)) {
          if (proprieta.startsWith('--')) elemento.style.setProperty(proprieta, String(dato))
          else Object.assign(elemento.style, { [proprieta]: dato })
        }
      }
    } else if (chiave === 'dataset') {
      for (const [nome, dato] of Object.entries(valore as Record<string, unknown>)) {
        if (dato !== undefined) elemento.dataset[nome] = String(dato)
      }
    } else if (chiave === 'attr') {
      for (const [nome, dato] of Object.entries(valore as Record<string, unknown>)) {
        if (dato !== null && dato !== undefined && dato !== false) {
          elemento.setAttribute(nome, String(dato))
        }
      }
    } else if (chiave.startsWith('on') && typeof valore === 'function') {
      gestisci(elemento, chiave.slice(2).toLowerCase(), valore as (evento: Event) => void)
    } else if (riflessa(elemento, chiave, valore)) {
      // Proprietà e attributo insieme: vedi `riflessa`.
    } else if (chiave in elemento) {
      // Proprietà invece di attributo: `value` e `checked` come attributi non
      // cambiano un campo già toccato.
      ;(elemento as unknown as Record<string, unknown>)[chiave] = valore
    } else {
      elemento.setAttribute(chiave, String(valore))
    }
  }

  for (const figlio of figli) aggiungi(elemento, figlio)
  if (valoreDellaTendina !== undefined) {
    const scelto = String(valoreDellaTendina)
    // Prima gli attributi, poi il valore: un `selected` scritto dopo sposterebbe
    // di nuovo la scelta di una tendina non ancora toccata.
    for (const opzione of Array.from((elemento as unknown as HTMLSelectElement).options ?? [])) {
      if (opzione.value === scelto) opzione.setAttribute('selected', '')
      else opzione.removeAttribute('selected')
    }
    (elemento as unknown as Record<string, unknown>).value = valoreDellaTendina
  }
  return elemento
}

/**
 * `value`, `checked` e `selected` dei campi anche come attributi (ADR-50, 3a).
 * La proprietà sola cambia il campo ma non l'albero: un confronto per
 * attributi (`idiomorph`) non vedrebbe la differenza fra due disegni, e un
 * campo senza l'attributo `value` verrebbe svuotato. L'attributo va scritto
 * prima della proprietà, che resta quella che conta per un campo già toccato.
 * Torna falso per tutto il resto, che segue la strada di sempre.
 */
function riflessa (elemento: HTMLElement, chiave: string, valore: unknown): boolean {
  const tag = elemento.tagName
  const campo = elemento as unknown as Record<string, unknown>
  if (chiave === 'value' && tag === 'INPUT') {
    elemento.setAttribute('value', String(valore))
    campo.value = valore
    return true
  }
  if (chiave === 'value' && tag === 'TEXTAREA') {
    campo.defaultValue = String(valore)
    campo.value = valore
    return true
  }
  if ((chiave === 'checked' && tag === 'INPUT') || (chiave === 'selected' && tag === 'OPTION')) {
    if (valore) elemento.setAttribute(chiave, '')
    else elemento.removeAttribute(chiave)
    campo[chiave] = Boolean(valore)
    return true
  }
  return false
}

// ------------------------------------------------------------ eventi per delega

/**
 * Gli ascoltatori dei nodi disegnati non stanno sui nodi ma qui, e li chiama un
 * ascoltatore solo per tipo su `document` (ADR-50, 3b). Un nodo tenuto da un
 * ridisegno (telaio, `data-tieni`, o uno che `idiomorph` riusa) può così
 * ricevere i gestori del disegno nuovo senza che nessuno li tolga e rimetta:
 * basta passargli la voce (`passaGestori`). Con `addEventListener` sul nodo,
 * un nodo riusato terrebbe per sempre le closure del primo disegno.
 *
 * Restano sui nodi, con `addEventListener`, gli ascoltatori di `window`, di
 * `document`, dei nodi che il disegno non rifà (modali, menu, palette) e quelli
 * messi per la durata di un gesto (un trascinamento con il puntatore catturato).
 */
type Gestore = (evento: never) => void
const gestori = new WeakMap<EventTarget, Map<string, Gestore[]>>()

/** I tipi per cui `document` ha già i suoi due ascoltatori. */
const delegati = new Set<string>()

/**
 * I tipi che salgono, messi subito al caricamento: prima di qualunque altro
 * ascoltatore su `document` (le scorciatoie, la modale), così che, come quando
 * stavano sui nodi, i gestori dei nodi vengano prima e il loro
 * `stopPropagation` fermi anche quelli. I tipi rari si aggiungono al primo uso.
 */
const TIPI_DI_SEMPRE = [
  'click', 'dblclick', 'auxclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseover',
  'pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'keydown', 'keyup',
  'input', 'change', 'submit', 'paste', 'dragstart', 'dragend', 'dragenter', 'dragover',
  'dragleave', 'drop',
]

function delega (tipo: string): void {
  if (delegati.has(tipo)) return
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return
  delegati.add(tipo)
  // Due ascoltatori: in salita per chi sale, in discesa per chi non sale
  // (`focus`, `scroll`, `pointerenter`, un `change` finto senza `bubbles`), che
  // su `document` si vede solo mentre scende verso il bersaglio.
  document.addEventListener(tipo, allaSalita)
  document.addEventListener(tipo, allaDiscesa, true)
}

for (const tipo of TIPI_DI_SEMPRE) delega(tipo)

/**
 * Dà a `elemento` un gestore per `tipo`, come `addEventListener` ma per delega.
 * Il gestore riceve l'evento con `currentTarget` uguale all'elemento: una
 * closure che vuole il nodo lo prenda da lì, non dalla variabile del disegno,
 * che dopo un ridisegno può essere il nodo scartato (ADR-50, 3d).
 */
export function gestisci<K extends keyof HTMLElementEventMap> (
  elemento: Element,
  tipo: K,
  gestore: (evento: HTMLElementEventMap[K]) => void,
): void
export function gestisci (elemento: Element, tipo: string, gestore: (evento: Event) => void): void
export function gestisci (elemento: Element, tipo: string, gestore: Gestore): void {
  delega(tipo)
  let suoi = gestori.get(elemento)
  if (!suoi) {
    suoi = new Map()
    gestori.set(elemento, suoi)
  }
  suoi.set(tipo, [...(suoi.get(tipo) ?? []), gestore])
}

/**
 * Il nodo `vecchio`, che resta nel documento, prende i gestori di `nuovo`, che
 * lo sostituisce solo nel disegno. Quelli di prima si lasciano.
 */
function passaGestori (vecchio: Node, nuovo: Node): void {
  const suoi = gestori.get(nuovo)
  if (suoi) gestori.set(vecchio, suoi)
  else gestori.delete(vecchio)
}

/** Il cammino dell'evento, dal bersaglio in su; un evento finto senza `composedPath` si risale a mano. */
function cammino (evento: Event): EventTarget[] {
  if (typeof evento.composedPath === 'function') {
    const percorso = evento.composedPath()
    if (percorso.length > 0) return percorso
  }
  const nodi: EventTarget[] = []
  for (let n = evento.target as Node | null; n; n = n.parentNode) nodi.push(n)
  return nodi
}

/**
 * Chiama i gestori di `nodo` con `currentTarget` rimesso al nodo (quello vero
 * sarebbe `document`). Torna falso se uno di loro ha fermato la salita.
 */
function chiama (nodo: EventTarget, evento: Event): boolean {
  const elenco = gestori.get(nodo)?.get(evento.type)
  if (!elenco || elenco.length === 0) return true
  Object.defineProperty(evento, 'currentTarget', { configurable: true, get: () => nodo })
  try {
    for (const gestore of [...elenco]) (gestore as (e: Event) => void).call(nodo, evento)
  } finally {
    delete (evento as { currentTarget?: unknown }).currentTarget
  }
  return !evento.cancelBubble
}

function allaSalita (evento: Event): void {
  if (!evento.bubbles) return
  for (const nodo of cammino(evento)) {
    if (nodo === document || nodo === window) return
    if (!chiama(nodo, evento)) {
      // Un gestore sul nodo fermava anche gli ascoltatori di `document`: si fa lo stesso.
      evento.stopImmediatePropagation()
      return
    }
  }
}

function allaDiscesa (evento: Event): void {
  if (evento.bubbles) return
  const bersaglio = cammino(evento)[0]
  if (bersaglio && bersaglio !== document && bersaglio !== window) chiama(bersaglio, evento)
}

/** Un contenitore trasparente, per restituire più nodi da una funzione sola. */
export function gruppo (...figli: Figlio[]): DocumentFragment {
  const frammento = document.createDocumentFragment()
  for (const figlio of figli) aggiungi(frammento, figlio)
  return frammento
}

export function svuota (elemento: Element): void {
  while (elemento.firstChild) elemento.removeChild(elemento.firstChild)
}

/** Sostituisce il contenuto di un elemento in un colpo solo, senza sfarfallio. */
export function rimpiazza (elemento: Element, ...figli: Figlio[]): void {
  const frammento = gruppo(...figli)
  svuota(elemento)
  elemento.appendChild(frammento)
}

/**
 * Rifà il contenuto di un contenitore, ma tiene al loro posto i nodi di telaio
 * (`data-telaio`) che ci sono già: la scatola che scorre ricreata a ogni disegno
 * perderebbe gli scatti della rotella in corsa (Chromium li lega al nodo) e
 * tornerebbe su. Il resto si ricostruisce da capo come sempre (ADR-06).
 *
 * Un nodo di telaio si tiene se la sua chiave, il tag e `data-scorrimento` sono
 * gli stessi: cambiando pagina cambia la chiave di scorrimento, il nodo è nuovo
 * e si riparte dall'alto. Del nodo tenuto si copiano gli attributi e si
 * sostituiscono i figli; gli ascoltatori restano quelli del primo disegno,
 * quindi su un nodo di telaio non se ne mettono che dipendano dallo stato.
 *
 * I nodi pesanti (`data-tieni`) si tengono ovunque stiano: vedi `parcheggia`.
 *
 * Questo è il percorso classico. Con `MORFOSI` acceso, un contenitore nel
 * documento passa da `trasforma`; qui resta chi non c'è ancora (il primo disegno
 * di un'isola staccata), che non ha niente da conservare.
 */
export function aggiornaElemento (contenitore: HTMLElement, nuovo: Figlio): void {
  const albero = nuovo instanceof Node ? nuovo : gruppo(nuovo)
  if (MORFOSI && contenitore.isConnected) {
    trasforma(contenitore, albero)
    return
  }
  const tenuti = parcheggia(contenitore, albero)
  const vecchio = contenitore.firstElementChild
  if (
    albero instanceof HTMLElement &&
    vecchio instanceof HTMLElement &&
    contenitore.childNodes.length === 1 &&
    innesta(vecchio, albero)
  ) {
    rimetti(tenuti)
    return
  }
  rimpiazza(contenitore, albero)
  rimetti(tenuti)
}

// ------------------------------------------------------------ nodi pesanti

/**
 * Un nodo pesante tenuto fra due disegni: il vecchio, già nel documento, il
 * segnaposto che il disegno nuovo ha messo al suo posto, e il `<template>` inerte
 * che occupa quel posto al posto del segnaposto.
 */
interface Tenuto {
  vecchio: HTMLElement
  segnaposto: HTMLElement
  posto: Node
  parcheggio: HTMLElement
}

/** I `data-tieni` più esterni sotto `radice`: quelli dentro un altro viaggiano con lui. */
function pesanti (radice: ParentNode): HTMLElement[] {
  const tutti = Array.from(radice.querySelectorAll<HTMLElement>('[data-tieni]'))
  if (radice instanceof HTMLElement && radice.dataset.tieni !== undefined) tutti.unshift(radice)
  return tutti.filter((nodo) => {
    for (let su = nodo.parentElement; su && su !== radice; su = su.parentElement) {
      if (su.dataset.tieni !== undefined) return false
    }
    return true
  })
}

/**
 * Sposta senza staccare, dove si può: `moveBefore` (Chromium 133+) porta un
 * `<iframe>` altrove senza ricaricarlo, `insertBefore` lo ricarica. Vale solo
 * fra due posti entrambi nel documento; altrimenti si ripiega su `insertBefore`.
 */
function sposta (nodo: Node, genitore: Node, prima: Node | null): void {
  const muovi = (genitore as { moveBefore?: (n: Node, p: Node | null) => void }).moveBefore
  if (typeof muovi === 'function' && nodo.isConnected && genitore.isConnected) {
    try {
      muovi.call(genitore, nodo, prima)
      return
    } catch {
      // Radici diverse: si sposta alla vecchia maniera.
    }
  }
  genitore.insertBefore(nodo, prima)
}

/**
 * Un nodo con `data-tieni="<sorgente>"` (un `<iframe>`, un visore PDF, un
 * `<canvas>`, un `<video>`, un'immagine grande) non si ricrea finché il disegno
 * nuovo ne porta uno con lo stesso tag e la stessa sorgente: il vecchio va in un
 * parcheggio nascosto nel documento prima che il disegno stacchi i suoi
 * antenati, e torna al posto del nuovo dopo. Non si stacca mai, quindi non
 * ricarica. Del vecchio restano figli e ascoltatori; gli attributi sono quelli
 * del nuovo, e se la sorgente cambia la chiave cambia e il nodo è nuovo.
 */
function parcheggia (contenitore: HTMLElement, albero: Node): Tenuto[] {
  if (!contenitore.isConnected) return []
  if (!(albero instanceof Element || albero instanceof DocumentFragment)) return []
  const vecchi = pesanti(contenitore)
  if (vecchi.length === 0) return []
  const liberi = new Map<string, HTMLElement[]>()
  for (const nodo of vecchi) {
    const chiave = `${nodo.tagName}|${nodo.dataset.tieni ?? ''}`
    liberi.set(chiave, [...(liberi.get(chiave) ?? []), nodo])
  }
  const coppie: Array<{ vecchio: HTMLElement, segnaposto: HTMLElement, posto: Node }> = []
  for (const segnaposto of pesanti(albero)) {
    const vecchio = liberi.get(`${segnaposto.tagName}|${segnaposto.dataset.tieni ?? ''}`)?.shift()
    if (!vecchio) continue
    // Il segnaposto non entra mai nel documento: un `<iframe>` entrato comincerebbe
    // a caricare la sua sorgente, una richiesta in più a ogni disegno. Al suo
    // posto va un `<template>`, inerte. La radice dell'albero non ha genitore e
    // resta com'è.
    const genitore = segnaposto.parentNode
    const posto = genitore ? document.createElement('template') : segnaposto
    genitore?.replaceChild(posto, segnaposto)
    coppie.push({ vecchio, segnaposto, posto })
  }
  if (coppie.length === 0) return []
  const parcheggio = document.createElement('div')
  parcheggio.hidden = true
  document.body.appendChild(parcheggio)
  for (const { vecchio } of coppie) sposta(vecchio, parcheggio, null)
  return coppie.map((coppia) => ({ ...coppia, parcheggio }))
}

/** Ogni nodo parcheggiato torna al posto del suo segnaposto; il parcheggio sparisce. */
function rimetti (tenuti: Tenuto[]): void {
  for (const { vecchio, segnaposto, posto } of tenuti) {
    const genitore = posto.parentNode
    // Un posto finito fuori dal documento non ha dove ricevere il vecchio.
    if (!genitore || !posto.isConnected) continue
    copiaAttributi(vecchio, segnaposto)
    sposta(vecchio, genitore, posto)
    genitore.removeChild(posto)
  }
  tenuti[0]?.parcheggio.remove()
}

/** La chiave di telaio o di scorrimento con cui un elemento resta nel documento. */
function chiaveDiTelaio (elemento: HTMLElement): string | undefined {
  if (elemento.dataset.telaio !== undefined) return elemento.dataset.telaio
  // testo-fisso: chiave interna di telaio
  if (elemento.dataset.scorrimento !== undefined) return `scorrimento:${elemento.dataset.scorrimento}`
  return undefined
}

/** Se `vecchio` può restare al posto di `nuovo`: stesso nodo di telaio, stessa cosa guardata. */
function stessoTelaio (vecchio: Element, nuovo: Element): boolean {
  if (!(vecchio instanceof HTMLElement) || !(nuovo instanceof HTMLElement)) return false
  const chiaveVecchio = chiaveDiTelaio(vecchio)
  const chiaveNuovo = chiaveDiTelaio(nuovo)
  return chiaveNuovo !== undefined &&
    chiaveVecchio === chiaveNuovo &&
    vecchio.tagName === nuovo.tagName &&
    vecchio.dataset.scorrimento === nuovo.dataset.scorrimento
}

/**
 * Porta `vecchio` a essere `nuovo` senza staccarlo dal documento: staccato,
 * perderebbe lo scorrimento. Scende nei figli di telaio; gli altri figli sono
 * quelli nuovi.
 */
function innesta (vecchio: HTMLElement, nuovo: HTMLElement): boolean {
  if (!stessoTelaio(vecchio, nuovo)) return false
  copiaAttributi(vecchio, nuovo)

  const telaiVecchi = new Map<string, HTMLElement>()
  for (const figlio of vecchio.children) {
    if (figlio instanceof HTMLElement) {
      const chiave = chiaveDiTelaio(figlio)
      if (chiave !== undefined) telaiVecchi.set(chiave, figlio)
    }
  }
  const figli: Node[] = []
  for (const figlio of Array.from(nuovo.childNodes)) {
    const chiave = figlio instanceof HTMLElement ? chiaveDiTelaio(figlio) : undefined
    const tenuto = chiave !== undefined ? telaiVecchi.get(chiave) : undefined
    if (tenuto && innesta(tenuto, figlio as HTMLElement)) {
      telaiVecchi.delete(chiave as string)
      figli.push(tenuto)
    } else {
      figli.push(figlio)
    }
  }

  // Prima via quel che non resta, poi i nuovi davanti ai tenuti: i tenuti non
  // si spostano mai, perché l'ordine del telaio non cambia fra due disegni.
  const restano = new Set(figli)
  for (const figlio of Array.from(vecchio.childNodes)) {
    if (!restano.has(figlio)) vecchio.removeChild(figlio)
  }
  let dopo: ChildNode | null = vecchio.firstChild
  for (const figlio of figli) {
    if (figlio === dopo) {
      dopo = dopo.nextSibling
      continue
    }
    vecchio.insertBefore(figlio, dopo)
  }
  return true
}

/** Gli attributi di `nuovo` su `vecchio`: quelli in più si tolgono, i diversi si riscrivono. */
function copiaAttributi (vecchio: HTMLElement, nuovo: HTMLElement): void {
  for (const nome of vecchio.getAttributeNames()) {
    if (!nuovo.hasAttribute(nome)) vecchio.removeAttribute(nome)
  }
  for (const nome of nuovo.getAttributeNames()) {
    const valore = nuovo.getAttribute(nome) as string
    if (vecchio.getAttribute(nome) !== valore) vecchio.setAttribute(nome, valore)
  }
}

// ------------------------------------------------------------ idiomorph

/**
 * L'interruttore di `idiomorph` (ADR-50, passo 3). Acceso, ogni nodo che il
 * disegno nuovo porta uguale resta, e con lui selezione, fuoco, transizioni e
 * scorrimento. Spento, `aggiornaElemento` è quello di ADR-48: telaio innestato,
 * `data-tieni` parcheggiati, il resto rifatto.
 *
 * Il percorso classico resta, per ora, come ripiego: un guasto di `idiomorph`
 * nell'app vera si spegne qui con una riga, e le prove col DOM finto
 * (`tests/ui/isole`, `riquadriLocali`) provano lui, a interruttore spento. Si
 * toglie quando il morph ha girato nell'uso senza guasti (D6: dopo una prova);
 * il percorso con `idiomorph` lo prova `tests/interfaccia/morfosi.spec.ts`.
 */
const MORFOSI = true

/** Il prefisso degli `id` di passaggio: nessun `id` vero comincia così. */
const PREFISSO_ID = 'regi-morfosi:'

/**
 * La chiave con cui un nodo resta: `data-tieni` (con il tag), telaio,
 * scorrimento, isola, e `data-chiave`: la voce di un elenco disegnato a
 * finestra (`components/virtuale.ts`), che scorrendo cambia posto fra i
 * fratelli e, presa per posizione, diventerebbe la voce accanto. Per `idiomorph` diventa un `id` di passaggio: due nodi
 * con chiavi diverse non si confondono mai, due con la stessa si ritrovano
 * anche se si sono spostati.
 */
function chiaveDiMorfosi (elemento: HTMLElement): string | undefined {
  const { tieni, telaio, scorrimento, isola, chiave } = elemento.dataset
  const parti: string[] = []
  // testo-fisso: prefissi interni per chiavi idiomorph
  if (tieni !== undefined) parti.push(`tieni:${elemento.tagName}|${tieni}`)
  // testo-fisso: prefissi interni per chiavi idiomorph
  if (telaio !== undefined) parti.push(`telaio:${telaio}`)
  // testo-fisso: prefissi interni per chiavi idiomorph
  if (scorrimento !== undefined) parti.push(`scorrimento:${scorrimento}`)
  // testo-fisso: prefissi interni per chiavi idiomorph
  if (isola !== undefined) parti.push(`isola:${isola}`)
  // testo-fisso: prefissi interni per chiavi idiomorph
  if (chiave !== undefined) parti.push(`chiave:${chiave}`)
  return parti.length > 0 ? parti.join('|') : undefined
}

/**
 * Mette gli `id` di passaggio ai nodi con chiave sotto `radice`. Due nodi con
 * la stessa chiave si contano (`#1`, `#2`): si accoppiano nell'ordine del
 * documento, come faceva `parcheggia`. Un nodo che ha già un `id` tiene il suo.
 */
function segnaChiavi (radice: ParentNode, conLaRadice: boolean): void {
  const visti = new Map<string, number>()
  const nodi = Array.from(radice.querySelectorAll<HTMLElement>(
    '[data-tieni], [data-telaio], [data-scorrimento], [data-isola], [data-chiave]',
  ))
  // La radice dell'albero nuovo non è fra i risultati del suo `querySelectorAll`.
  if (conLaRadice && radice instanceof HTMLElement) nodi.unshift(radice)
  for (const elemento of nodi) {
    if (!(elemento instanceof HTMLElement) || elemento.hasAttribute('id')) continue
    const chiave = chiaveDiMorfosi(elemento)
    if (chiave === undefined) continue
    const volta = (visti.get(chiave) ?? 0) + 1
    visti.set(chiave, volta)
    elemento.setAttribute('id', `${PREFISSO_ID}${chiave}#${volta}`)
  }
}

/** Toglie gli `id` di passaggio rimasti nel documento. */
function scordaChiavi (radice: ParentNode): void {
  for (const elemento of Array.from(radice.querySelectorAll(`[id^="${PREFISSO_ID}"]`))) {
    elemento.removeAttribute('id')
  }
}

/**
 * `idiomorph` inserisce una copia dei nodi nuovi (`importNode`): la copia
 * perderebbe i gestori (`gestori` è per nodo) e ogni closure del disegno che
 * tiene il nodo guarderebbe l'originale, fuori dal documento. Mentre lavora gli
 * si presta il nodo vero; al suo posto, nell'albero che sta ancora leggendo,
 * resta un commento, così che il suo giro sui figli non salti nessuno.
 */
function conNodiVeri<T> (fai: () => T): T {
  const copia = document.importNode.bind(document)
  const presta = <N extends Node>(nodo: N, profondo?: boolean): N => {
    const genitore = nodo.parentNode
    if (!genitore) return copia(nodo, profondo)
    genitore.replaceChild(document.createComment(''), nodo)
    return nodo
  }
  Object.defineProperty(document, 'importNode', { configurable: true, value: presta })
  try {
    return fai()
  } finally {
    // Tolta la proprietà propria, torna quella del prototipo.
    Reflect.deleteProperty(document, 'importNode')
  }
}

/**
 * `aggiornaElemento` con `idiomorph`: il contenuto di `contenitore` diventa
 * `albero` toccando solo quel che cambia. Le regole di ADR-48 restano:
 * - un nodo con chiave (`chiaveDiMorfosi`) si ritrova solo con uno della
 *   stessa chiave, e un `data-tieni` ritrovato non si tocca dentro: prende gli
 *   attributi nuovi e basta. Il nodo nuovo non entra mai nel documento, quindi
 *   un `<iframe>` non carica di nuovo, e `idiomorph` sposta con `moveBefore`;
 * - un nodo riusato prende i gestori del disegno nuovo (`passaGestori`);
 * - il campo che ha il fuoco tiene quel che c'è scritto.
 */
function trasforma (contenitore: HTMLElement, albero: Node): void {
  // Il contenitore non si segna: resta com'è, cambia solo dentro.
  segnaChiavi(contenitore, false)
  if (albero instanceof Element || albero instanceof DocumentFragment) segnaChiavi(albero, true)
  /** I nodi vecchi rimpiazzati da un nodo con chiave: si tolgono a lavoro finito. */
  const daTogliere: ChildNode[] = []
  try {
    // Senza `head` da aspettare, `morph` finisce qui: la promessa del tipo non c'è.
    void conNodiVeri(() => Idiomorph.morph(contenitore, albero, {
      morphStyle: 'innerHTML',
      ignoreActiveValue: true,
      callbacks: {
        beforeNodeMorphed (vecchio, nuovo) {
          if (rimpiazzaSenzaChiave(vecchio, nuovo)) {
            daTogliere.push(vecchio)
            return false
          }
          if (vecchio instanceof HTMLElement && nuovo instanceof HTMLElement &&
            vecchio.dataset.tieni !== undefined) {
            // Del nodo tenuto restano figli e gestori: il nuovo è un segnaposto.
            copiaAttributi(vecchio, nuovo)
            return false
          }
          passaGestori(vecchio, nuovo)
          // Proprietà senza attributo: `idiomorph` non la vede.
          if (vecchio instanceof HTMLInputElement && nuovo instanceof HTMLInputElement) {
            vecchio.indeterminate = nuovo.indeterminate
          }
          return true
        },
        afterNodeMorphed (vecchio, nuovo) {
          // Una tendina senza nessuna voce scelta: togliere `selected` a tutte le
          // voci non basta, il browser riaccenderebbe la prima (vedi `h`).
          if (vecchio instanceof HTMLSelectElement && nuovo instanceof HTMLSelectElement &&
            vecchio !== document.activeElement && vecchio.selectedIndex !== nuovo.selectedIndex) {
            vecchio.selectedIndex = nuovo.selectedIndex
          }
        },
      },
    }))
  } finally {
    for (const nodo of daTogliere) nodo.remove()
    scordaChiavi(contenitore)
  }
}

/**
 * `idiomorph` riusa per posizione un nodo vecchio senza `id` anche per un nodo
 * nuovo che ne ha uno: una scatola che scorre nuova partirebbe dallo
 * scorrimento di un'altra, un `data-tieni` nuovo diventerebbe un `<div>`
 * qualunque rimodellato, e le closure che tengono il nodo nuovo guarderebbero
 * fuori dal documento. Allora il nodo nuovo entra lui, davanti al vecchio, e il
 * vecchio resta lì fino alla fine, perché `idiomorph` prosegue dal suo fratello.
 * Non se il vecchio contiene nodi da ritrovare: toglierlo li perderebbe.
 */
function rimpiazzaSenzaChiave (vecchio: Node, nuovo: Node): boolean {
  if (!(vecchio instanceof Element) || !(nuovo instanceof Element)) return false
  const suo = nuovo.getAttribute('id')
  if (!suo?.startsWith(PREFISSO_ID) || vecchio.getAttribute('id') === suo) return false
  if (vecchio.querySelector('[id]')) return false
  const genitore = vecchio.parentNode
  if (!genitore) return false
  // Nell'albero nuovo, che `idiomorph` sta ancora leggendo, resta un segno.
  nuovo.parentNode?.replaceChild(document.createComment(''), nuovo)
  genitore.insertBefore(nuovo, vecchio)
  return true
}

/** SVG inline: `h` non va bene, gli elementi SVG vogliono il loro namespace. */
export function svg (
  vista: string,
  contenuto: string,
  classe?: string,
): SVGSVGElement {
  const elemento = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  elemento.setAttribute('viewBox', vista)
  elemento.setAttribute('aria-hidden', 'true')
  elemento.setAttribute('focusable', 'false')
  if (classe) elemento.setAttribute('class', classe)
  elemento.innerHTML = contenuto
  return elemento
}

// ------------------------------------------------------------------ fuoco

interface FuocoRicordato {
  chiave: string
  inizio: number | null
  fine: number | null
  /**
   * Quel che c'era scritto: un ridisegno durante la battitura rimetterebbe il
   * cursore nel valore vecchio, perdendo la lettera appena premuta.
   */
  valore: string | null
}

/** Se il tasto è stato premuto dentro qualcosa in cui si sta scrivendo. */
export function dentroUnCampo (bersaglio: EventTarget | null): boolean {
  if (!(bersaglio instanceof HTMLElement)) return false
  return bersaglio.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(bersaglio.tagName)
}

/** Un campo il cui contenuto vale la pena riscrivere dopo un ridisegno: testo libero, non una scelta. */
function contenutoTestuale (
  elemento: HTMLElement,
): elemento is HTMLInputElement | HTMLTextAreaElement {
  if (elemento instanceof HTMLTextAreaElement) return true
  if (!(elemento instanceof HTMLInputElement)) return false
  return ['text', 'number', 'email', 'tel', 'search', 'url', 'password'].includes(elemento.type)
}

/** Prende nota di dove sta il cursore prima di rifare la vista. */
export function ricordaFuoco (): FuocoRicordato | null {
  const attivo = document.activeElement as HTMLElement | null
  const chiave = attivo?.dataset?.fuoco
  if (!attivo || !chiave) return null
  const campo = attivo as HTMLInputElement
  const testuale = typeof campo.selectionStart === 'number'
  return {
    chiave,
    inizio: testuale ? campo.selectionStart : null,
    fine: testuale ? campo.selectionEnd : null,
    valore: contenutoTestuale(attivo) ? attivo.value : null,
  }
}

/**
 * Dove cercare il campo da rifocalizzare: nell'ultima modale aperta, se c'è,
 * perché due strati con la stessa chiave non si rubino il fuoco.
 */
function radiceFuoco (): ParentNode {
  const modali = document.querySelectorAll<HTMLElement>('.strato-modale')
  return modali.length > 0 ? modali[modali.length - 1] : document
}

export function ripristinaFuoco (ricordo: FuocoRicordato | null): void {
  if (!ricordo) return
  const elemento = radiceFuoco().querySelector<HTMLElement>(
    `[data-fuoco="${CSS.escape(ricordo.chiave)}"]`,
  )
  if (!elemento) return
  // Senza scorrere: lo scorrimento lo rimette `ripristinaScorrimenti`, e un campo
  // in cima alla pagina riporterebbe su chi intanto è sceso.
  elemento.focus({ preventScroll: true })
  const campo = elemento as HTMLInputElement | HTMLTextAreaElement
  if (ricordo.valore !== null && contenutoTestuale(elemento) && campo.value !== ricordo.valore) {
    campo.value = ricordo.valore
  }
  if (ricordo.inizio !== null && typeof (campo as HTMLInputElement).setSelectionRange === 'function') {
    try {
      ;(campo as HTMLInputElement).setSelectionRange(ricordo.inizio, ricordo.fine ?? ricordo.inizio)
    } catch {
      // I campi date e number non accettano una selezione.
    }
  }
}

/**
 * Ridà il fuoco a chi lo aveva prima di una modale, un menu o la palette. Se un
 * ridisegno ha staccato l'elemento, si cerca il sostituto con la stessa chiave
 * di fuoco; senza chiave non si tira a indovinare.
 */
export function rifocalizza (elemento: HTMLElement | null | undefined): void {
  if (!elemento) return
  if (elemento.isConnected) {
    elemento.focus?.()
    return
  }
  const chiave = elemento.dataset?.fuoco
  if (!chiave) return
  radiceFuoco().querySelector<HTMLElement>(`[data-fuoco="${CSS.escape(chiave)}"]`)?.focus()
}

// ------------------------------------------------------------------ scorciatoie

/**
 * Mette il fuoco sul primo campo utile. Torna vero se l'ha trovato, così chi
 * chiama sa se deve rimediare altrimenti.
 */
export function fuocoIniziale (contenitore: HTMLElement): boolean {
  const primo = contenitore.querySelector<HTMLElement>(
    'input:not([type=hidden]):not([disabled]), textarea, select',
  )
  if (!primo) return false
  primo.focus()
  if (primo instanceof HTMLInputElement && primo.type === 'text') primo.select()
  return true
}

// ---------------------------------------------------------------- scorrimento

/**
 * Dov'era arrivato lo scorrimento, gemello di `ricordaFuoco`: `rimpiazza`
 * ricostruisce e ogni scatola ripartirebbe da capo. Si conserva solo quel che
 * porta `data-scorrimento`; la chiave dice che cosa si guarda
 * (`sfoglio:<id del PDF>`), così cambiando oggetto si riparte dall'alto. Anche
 * in orizzontale, per le matrici larghe.
 */
interface ScorrimentoRicordato {
  alto: number
  sinistra: number
  inFondo: boolean
}

/** Quanti pixel dal fondo contano ancora come «in fondo»: un confronto esatto sbaglia per un bordo. */
const SOGLIA_FONDO = 24

/** Se la scatola è arrivata in fondo, o abbastanza vicino da valere lo stesso. */
function inFondo (elemento: HTMLElement): boolean {
  return elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight <= SOGLIA_FONDO
}

/**
 * Come scorre il programma: di colpo o accompagnando. Uno `smooth` passato da
 * JavaScript sfugge alla guardia `prefers-reduced-motion` dei fogli di stile,
 * quindi la si rispetta qui.
 */
export function andaturaScorrimento (): ScrollBehavior {
  // testo-fisso: una media query CSS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** Le scatole con `data-scorrimento` sotto `dentro`, lui compreso. */
function scatole (dentro: ParentNode): HTMLElement[] {
  const tutte = Array.from(dentro.querySelectorAll<HTMLElement>('[data-scorrimento]'))
  const proprio = dentro instanceof HTMLElement && dentro.dataset.scorrimento !== undefined
  if (proprio) tutte.unshift(dentro)
  return tutte
}

/** `dentro` restringe la foto a un pezzo della pagina: un'isola che si ridisegna da sola. */
export function ricordaScorrimenti (
  dentro: ParentNode = document,
): Map<string, ScorrimentoRicordato> {
  const ricordo = new Map<string, ScorrimentoRicordato>()
  for (const elemento of scatole(dentro)) {
    const chiave = elemento.dataset.scorrimento
    if (!chiave) continue
    // Chi segue il fondo si ricorda anche in cima: la conversazione appena aperta
    // sta per crescere.
    const segue = elemento.dataset.segueFondo !== undefined
    if (!segue && elemento.scrollTop === 0 && elemento.scrollLeft === 0) continue
    ricordo.set(chiave, {
      alto: elemento.scrollTop,
      sinistra: elemento.scrollLeft,
      inFondo: inFondo(elemento),
    })
  }
  return ricordo
}

/**
 * Rimette ogni scatola dov'era; quelle che non ci sono più si ignorano.
 * `data-segue-fondo` vuole lo stesso posto, non lo stesso pixel: chi era in
 * fondo alla conversazione resta in fondo mentre cresce, chi era risalito resta lì.
 */
export function ripristinaScorrimenti (
  ricordo: Map<string, ScorrimentoRicordato>,
  dentro: ParentNode = document,
): void {
  if (ricordo.size === 0) return
  for (const elemento of scatole(dentro)) {
    const chiave = elemento.dataset.scorrimento
    const dove = chiave ? ricordo.get(chiave) : undefined
    if (!dove) continue
    if (dove.inFondo && elemento.dataset.segueFondo !== undefined) {
      elemento.scrollTop = elemento.scrollHeight
      elemento.scrollLeft = dove.sinistra
      continue
    }
    // Una scatola di telaio tenuta dal disegno (`aggiornaElemento`) è già lì:
    // riscriverle lo stesso valore fermerebbe lo scorrimento dolce in corso.
    if (elemento.scrollTop !== dove.alto) elemento.scrollTop = dove.alto
    if (elemento.scrollLeft !== dove.sinistra) elemento.scrollLeft = dove.sinistra
  }
}
