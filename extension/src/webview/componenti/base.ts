// I mattoni dell'interfaccia: pulsanti, campi, pastiglie, schede, stati vuoti.
//
// I moduli funzionano come i moduli HTML di sempre: ogni campo ha un `name`, il
// valore vive nel DOM, e al momento di salvare `valoriModulo` legge tutto in un
// colpo. Nessuno stato duplicato da tenere allineato, nessun ridisegno mentre si
// scrive — e i campi si comportano come chiunque si aspetta, autocompletamento
// e tabulazione compresi.

import { dataDaTesto, formattaData, spostaData } from '../../dominio/date.js'
import { h, type Attributi, type Figlio } from '../dom.js'
import { icona, type NomeIcona } from './icone.js'

// ------------------------------------------------------------------ pulsanti

export type VariantePulsante = 'primario' | 'normale' | 'sottile' | 'pericolo' | 'fantasma'

/**
 * Che cosa torna da un clic: niente, oppure il lavoro che ha avviato.
 *
 * Chi restituisce la promessa ottiene gratis l'attesa mostrata sul pulsante —
 * disabilitato, con la sua rotella — finché l'host non ha risposto. Chi non ha
 * niente da aspettare non restituisce niente, e il pulsante si comporta come
 * prima.
 */
export type EsitoClic = void | Promise<unknown>

export interface OpzioniPulsante {
  testo?: string
  simbolo?: NomeIcona | string
  variante?: VariantePulsante
  al?: (evento: MouseEvent) => EsitoClic
  titolo?: string
  disabilitato?: boolean
  tipo?: 'button' | 'submit'
  classe?: string
}

/**
 * Segna un pulsante come occupato finché il lavoro non finisce.
 *
 * Serve anche fuori da `pulsante()`: le caselle delle matrici — l'appello, i
 * documenti del docente di classe — sono `<button>` costruiti a mano, e anche
 * lì un clic che apre un file o spedisce una mail deve smettere di sembrare un
 * clic andato a vuoto. Un secondo clic non parte: `disabled` toglie il pulsante
 * dal giro finché la prima richiesta non è tornata.
 *
 * Il pulsante può sparire nel frattempo — la risposta porta con sé lo stato
 * nuovo, e la vista si rifà — e non è un problema: si tocca un nodo staccato,
 * che nessuno guarda più.
 */
const RITARDO_ROTELLA = 150

export function conAttesa<T> (bottone: HTMLButtonElement, lavoro: Promise<T>): Promise<T> {
  const eraDisabilitato = bottone.disabled
  // Spento subito, ma senza dirlo: il secondo clic non deve partire nemmeno
  // sulla scrittura piu' veloce, mentre la rotella su un'azione che dura tre
  // millisecondi sarebbe un lampo e basta. Dopo un sesto di secondo chi ha
  // premuto sta gia' aspettando, e allora la rotella serve.
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

export function pulsante (opzioni: OpzioniPulsante): HTMLButtonElement {
  const {
    testo, simbolo, variante = 'normale', al, titolo, disabilitato, tipo = 'button', classe,
  } = opzioni
  // Un titolo vuoto non è «niente titolo»: `title=""` e `aria-label=""` sono
  // comunque presenti, e un lettore di schermo li legge come un pulsante senza
  // nome invece di leggere il testo visibile che gli sta accanto.
  const nome = titolo || testo || undefined
  const bottone = h(
    'button',
    {
      class: ['pulsante', `pulsante--${variante}`, !testo && 'pulsante--solo-icona', classe],
      type: tipo,
      disabled: Boolean(disabilitato),
      attr: { title: nome ?? null, 'aria-label': nome ?? null },
    },
    simbolo ? icona(simbolo) : null,
    testo ? h('span', null, testo) : null,
  )

  if (al) {
    bottone.addEventListener('click', (evento) => {
      const esito = al(evento as MouseEvent)
      if (esito instanceof Promise) void conAttesa(bottone, esito)
    })
  }

  return bottone
}

/** Gruppo di pulsanti che si comporta come una scelta unica (settimana/mese/agenda). */
export function selettore<T extends string> (
  valore: T,
  voci: Array<{ valore: T; testo: string; simbolo?: NomeIcona }>,
  al: (scelto: T) => void,
): HTMLElement {
  return h(
    'div',
    { class: 'selettore', attr: { role: 'tablist' } },
    voci.map((voce) =>
      h(
        'button',
        {
          class: ['selettore__voce', voce.valore === valore && 'selettore__voce--attiva'],
          type: 'button',
          attr: { role: 'tab', 'aria-selected': voce.valore === valore },
          onclick: () => al(voce.valore),
        },
        voce.simbolo ? icona(voce.simbolo) : null,
        h('span', null, voce.testo),
      ),
    ),
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
  aiuto?: string
  richiesto?: boolean
  disabilitato?: boolean
  min?: number | string
  max?: number | string
  passo?: number | string
  righe?: number
  opzioni?: OpzioneSelezione[]
  /** Quanto spazio occupa nella griglia del modulo. */
  larghezza?: 'piena' | 'meta' | 'terzo' | 'quarto'
  al?: (valore: string, evento: Event) => void
  /** Chiave per ritrovare il fuoco dopo un ridisegno. */
  fuoco?: string
  classe?: string
  /**
   * Prefisso per `id` e chiave di fuoco, quando lo stesso nome di campo compare
   * più volte nella pagina — di norma non serve: `apriModale` rende già unico
   * quel che genera dentro una modale.
   */
  scope?: string
  /**
   * Un comando accanto al controllo: di norma il «+» che crea al volo quel che
   * la tendina non elenca ancora. Sta qui perché una scelta e il gesto che ne
   * aggiunge una sono la stessa domanda, e mandare il docente altrove a metà
   * di un modulo è il modo migliore per fargli perdere quel che stava
   * scrivendo.
   */
  azione?: Figlio
}

function idCampo (opzioni: OpzioniCampo): string {
  return opzioni.scope ? `campo-${opzioni.scope}-${opzioni.nome}` : `campo-${opzioni.nome}`
}

/**
 * Il campo data: si scrive come si scriverebbe su un foglio.
 *
 * Era `<input type="date">`, cioè tre caselle in un ordine deciso dalla lingua
 * dell'editor, da riempire una per una battendo gli zeri: per mettere il 7
 * settembre bisognava azzeccare la casella e scrivere `07`, e sbagliando
 * casella si otteneva un anno 0007 senza capire perché. Qui è un campo di
 * testo, e legge `7.9`, `7/9/26`, `070926`, `12` — vedi `dataDaTesto`.
 *
 * Il valore vero resta in ISO dentro un campo nascosto: `valoriModulo` legge
 * quello, e chi salva non deve sapere niente di come lo si è scritto. Le
 * frecce su e giù spostano di un giorno, PagSu e PagGiù di un mese: correggere
 * di uno è la cosa che si fa più spesso, e riscrivere tutta la data per farlo
 * era il resto della fatica.
 *
 * Quel che non si riesce a leggere non si cancella: si segna in rosso e si
 * lascia lì. Rimettere la data di prima sotto le dita di chi sta scrivendo è
 * il modo più sicuro di fargli perdere la correzione.
 */
/**
 * Un campo data dentro una riga, con l'etichetta accanto invece che sopra.
 *
 * In un elenco `campo()` non ci sta — etichetta sopra, aiuto sotto, larghezza
 * a frazioni di riga — ma un campo nudo in mezzo a tre pulsanti non si capisce
 * che cos'\u00e8: sembra una casella qualsiasi, e chi guarda non sa che cosa ci
 * andrebbe scritto. Due parole davanti bastano, e restano sulla stessa riga.
 */
export function dataInLinea (opzioni: {
  etichetta: string
  nome: string
  valore: string
  titolo?: string
  al: (valore: string) => void
}): HTMLElement {
  return h(
    'label',
    { class: 'data-linea', attr: opzioni.titolo ? { title: opzioni.titolo } : {} },
    h('span', { class: 'data-linea__etichetta' }, opzioni.etichetta),
    controlloData({
      nome: opzioni.nome,
      valore: opzioni.valore,
      segnaposto: 'gg.mm.aaaa',
      al: (valore) => opzioni.al(String(valore)),
    }),
  )
}

/**
 * Il campo di una data, senza l'etichetta e il contorno di `campo()`.
 *
 * Esportato perché serve anche dentro una tabella, dove una riga di quattro
 * date con quattro etichette sarebbe illeggibile: lì la colonna è l'etichetta.
 * Si scrive come sempre — 7.9, 070926, ↑ e ↓ per un giorno — e quel che ne esce
 * arriva su `al` già in ISO.
 */
export function controlloData (opzioni: OpzioniCampo): HTMLElement {
  const iniziale = String(opzioni.valore ?? '')
  const nascosto = h('input', { type: 'hidden', name: opzioni.nome, value: iniziale })

  const visibile = h('input', {
    class: 'campo__controllo campo__controllo--data',
    id: idCampo(opzioni),
    type: 'text',
    value: iniziale ? formattaData(iniziale) : '',
    placeholder: opzioni.segnaposto ?? 'gg.mm.aaaa',
    disabled: Boolean(opzioni.disabilitato),
    required: Boolean(opzioni.richiesto),
    dataset: {
      fuoco: opzioni.scope
        ? `${opzioni.scope}-${opzioni.fuoco ?? opzioni.nome}`
        : opzioni.fuoco ?? opzioni.nome,
    },
    attr: { inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false' },
  })

  const mostra = (nuova: string) => {
    nascosto.value = nuova
    visibile.value = nuova ? formattaData(nuova) : ''
    visibile.classList.remove('campo__controllo--errata')
  }

  /** Che cosa c'è scritto adesso: la data, stringa vuota, o null se illeggibile. */
  const letta = (): string | null => {
    const scritto = visibile.value.trim()
    if (!scritto) return ''
    return dataDaTesto(scritto, nascosto.value || undefined)
  }

  visibile.addEventListener('change', (evento) => {
    const nuova = letta()
    if (nuova === null) {
      visibile.classList.add('campo__controllo--errata')
      return
    }
    mostra(nuova)
    opzioni.al?.(nuova, evento)
  })

  visibile.addEventListener('keydown', (evento: KeyboardEvent) => {
    const passi: Record<string, [number, number]> = {
      ArrowUp: [1, 0],
      ArrowDown: [-1, 0],
      PageUp: [0, 1],
      PageDown: [0, -1],
    }
    const passo = passi[evento.key]
    if (!passo) return
    const base = letta() || nascosto.value
    if (!base) return
    evento.preventDefault()
    mostra(spostaData(base, passo[0], passo[1]))
    opzioni.al?.(nascosto.value, evento)
  })

  return h('div', { class: 'campo__data' }, visibile, nascosto)
}

function controllo (opzioni: OpzioniCampo): HTMLElement {
  if (opzioni.tipo === 'date') return controlloData(opzioni)

  const comune: Attributi = {
    name: opzioni.nome,
    id: idCampo(opzioni),
    disabled: Boolean(opzioni.disabilitato),
    dataset: { fuoco: opzioni.scope ? `${opzioni.scope}-${opzioni.fuoco ?? opzioni.nome}` : opzioni.fuoco ?? opzioni.nome },
    onchange: opzioni.al
      ? (evento: Event) => opzioni.al?.((evento.target as HTMLInputElement).value, evento)
      : undefined,
  }

  if (opzioni.tipo === 'textarea') {
    return h('textarea', {
      ...comune,
      class: 'campo__controllo campo__controllo--area',
      rows: opzioni.righe ?? 4,
      placeholder: opzioni.segnaposto ?? '',
      value: String(opzioni.valore ?? ''),
      required: Boolean(opzioni.richiesto),
    })
  }

  if (opzioni.tipo === 'select') {
    const selezione = h(
      'select',
      { ...comune, class: 'campo__controllo campo__controllo--selezione' },
      (opzioni.opzioni ?? []).map((voce) =>
        h('option', { value: voce.valore, selected: String(opzioni.valore ?? '') === voce.valore }, voce.testo),
      ),
    )
    selezione.value = String(opzioni.valore ?? '')
    return selezione
  }

  if (opzioni.tipo === 'checkbox') {
    return h('input', {
      ...comune,
      class: 'campo__interruttore',
      type: 'checkbox',
      checked: Boolean(opzioni.valore),
    })
  }

  return h('input', {
    ...comune,
    class: 'campo__controllo',
    type: opzioni.tipo ?? 'text',
    value: opzioni.valore === null || opzioni.valore === undefined ? '' : String(opzioni.valore),
    placeholder: opzioni.segnaposto ?? '',
    required: Boolean(opzioni.richiesto),
    attr: {
      min: opzioni.min ?? null,
      max: opzioni.max ?? null,
      step: opzioni.passo ?? null,
      autocomplete: 'off',
    },
  })
}

export function campo (opzioni: OpzioniCampo): HTMLElement {
  const larghezza = opzioni.larghezza ?? 'piena'

  if (opzioni.tipo === 'checkbox') {
    return h(
      'label',
      { class: ['campo', 'campo--interruttore', `campo--${larghezza}`, opzioni.classe] },
      controllo(opzioni),
      h('span', { class: 'campo__etichetta-in-linea' }, opzioni.etichetta ?? ''),
      opzioni.aiuto ? h('small', { class: 'campo__aiuto' }, opzioni.aiuto) : null,
    )
  }

  return h(
    'div',
    { class: ['campo', `campo--${larghezza}`, opzioni.classe] },
    opzioni.etichetta
      ? h(
          'label',
          { class: 'campo__etichetta', attr: { for: idCampo(opzioni) } },
          opzioni.etichetta,
          opzioni.richiesto ? h('span', { class: 'campo__obbligo' }, '*') : null,
        )
      : null,
    opzioni.azione
      ? h('div', { class: 'campo__gruppo' }, controllo(opzioni), opzioni.azione)
      : controllo(opzioni),
    opzioni.aiuto ? h('small', { class: 'campo__aiuto' }, opzioni.aiuto) : null,
  )
}

/** Riga di campi: la griglia dei moduli sta tutta qui dentro. */
export function riga (...figli: Figlio[]): HTMLElement {
  return h('div', { class: 'modulo__riga' }, ...figli)
}

export function sezioneModulo (titolo: string, ...figli: Figlio[]): HTMLElement {
  return h(
    'section',
    { class: 'modulo__sezione' },
    h('h4', { class: 'modulo__titolo-sezione' }, titolo),
    ...figli,
  )
}

/**
 * Legge tutti i campi con `name` dentro un contenitore. I numeri escono numeri e
 * le caselle escono booleane, così chi salva non deve convertire niente.
 */
export function valoriModulo (contenitore: HTMLElement): Record<string, string | number | boolean> {
  const valori: Record<string, string | number | boolean> = {}
  const campi = contenitore.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
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

export function pastiglia (testo: string, tono: TonoPastiglia = 'neutro', simbolo?: NomeIcona): HTMLElement {
  return h(
    'span',
    { class: ['pastiglia', `pastiglia--${tono}`] },
    simbolo ? icona(simbolo) : null,
    testo,
  )
}

/** Puntino colorato della classe: nel calendario è quello che la fa riconoscere. */
export function puntoColore (colore: string): HTMLElement {
  return h('span', { class: 'punto-colore', style: { backgroundColor: colore } })
}

export function scheda (opzioni: {
  titolo?: string
  sottotitolo?: string
  azioni?: Figlio
  classe?: string
  contenuto: Figlio
}): HTMLElement {
  return h(
    'section',
    { class: ['scheda', opzioni.classe] },
    opzioni.titolo || opzioni.azioni
      ? h(
          'header',
          { class: 'scheda__testata' },
          h(
            'div',
            { class: 'scheda__titoli' },
            opzioni.titolo ? h('h3', { class: 'scheda__titolo' }, opzioni.titolo) : null,
            opzioni.sottotitolo ? h('p', { class: 'scheda__sottotitolo' }, opzioni.sottotitolo) : null,
          ),
          opzioni.azioni ? h('div', { class: 'scheda__azioni' }, opzioni.azioni) : null,
        )
      : null,
    h('div', { class: 'scheda__corpo' }, opzioni.contenuto),
  )
}

/** Stato vuoto: dice che cosa manca e offre il gesto per rimediare. */
export function statoVuoto (opzioni: {
  simbolo?: NomeIcona
  titolo: string
  testo?: string
  azione?: Figlio
}): HTMLElement {
  return h(
    'div',
    { class: 'stato-vuoto' },
    opzioni.simbolo ? icona(opzioni.simbolo, 'icona--grande') : null,
    h('p', { class: 'stato-vuoto__titolo' }, opzioni.titolo),
    opzioni.testo ? h('p', { class: 'stato-vuoto__testo' }, opzioni.testo) : null,
    opzioni.azione ? h('div', { class: 'stato-vuoto__azione' }, opzioni.azione) : null,
  )
}

export function avviso (testo: Figlio, tono: 'informativo' | 'attenzione' | 'negativo' = 'informativo'): HTMLElement {
  const simboli = { informativo: 'informazione', attenzione: 'avviso', negativo: 'avviso' } as const
  return h(
    'div',
    { class: ['avviso', `avviso--${tono}`], attr: { role: 'status' } },
    icona(simboli[tono]),
    h('div', { class: 'avviso__testo' }, testo),
  )
}

/** Numero grande con la sua didascalia: le sintesi in cima alle viste. */
export function datoSintetico (etichetta: string, valore: string, tono?: TonoPastiglia): HTMLElement {
  return h(
    'div',
    { class: ['dato', tono && `dato--${tono}`] },
    h('span', { class: 'dato__valore' }, valore),
    h('span', { class: 'dato__etichetta' }, etichetta),
  )
}

/** Barra di avanzamento, con `quota` fra 0 e 1. */
export function barra (quota: number, tono: TonoPastiglia = 'informativo'): HTMLElement {
  const percentuale = Math.round(Math.min(1, Math.max(0, quota)) * 100)
  return h(
    'div',
    {
      class: 'barra',
      attr: { role: 'progressbar', 'aria-valuenow': percentuale, 'aria-valuemin': 0, 'aria-valuemax': 100 },
    },
    h('div', { class: ['barra__riempimento', `barra__riempimento--${tono}`], style: { width: `${percentuale}%` } }),
  )
}

/** Testata di una vista: titolo, contorno e comandi. */
export function testataVista (opzioni: {
  titolo: string
  sottotitolo?: string
  azioni?: Figlio
  contorno?: Figlio
}): HTMLElement {
  return h(
    'header',
    { class: 'testata' },
    h(
      'div',
      { class: 'testata__principale' },
      h(
        'div',
        null,
        h('h2', { class: 'testata__titolo' }, opzioni.titolo),
        opzioni.sottotitolo ? h('p', { class: 'testata__sottotitolo' }, opzioni.sottotitolo) : null,
      ),
      opzioni.azioni ? h('div', { class: 'testata__azioni' }, opzioni.azioni) : null,
    ),
    opzioni.contorno ? h('div', { class: 'testata__contorno' }, opzioni.contorno) : null,
  )
}
