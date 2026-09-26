// I mattoni dell'interfaccia: pulsanti, campi, pastiglie, schede, stati vuoti.
// I moduli sono moduli HTML: ogni campo ha un `name`, il valore vive nel DOM e
// `valoriModulo` lo legge al salvataggio. Nessuno stato duplicato, nessun
// ridisegno mentre si scrive.

import { dataDaTesto, formattaData, spostaData } from '../../domain/dates.js'
import { h, type Attributi, type Figlio } from '../dom.js'
import { legaAlSegno, suggerimento } from './hint.js'
import { icona, type NomeIcona } from './icons.js'
import { testi } from './base.testi.js'

// ------------------------------------------------------------------ pulsanti

type VariantePulsante = 'primario' | 'normale' | 'sottile' | 'pericolo' | 'fantasma'

/**
 * Che cosa torna da un clic: niente, o il lavoro avviato. Una promessa fa
 * mostrare l'attesa sul pulsante finché l'host risponde.
 */
type EsitoClic = void | Promise<unknown>

interface OpzioniPulsante {
  testo?: string
  simbolo?: NomeIcona
  variante?: VariantePulsante
  al?: (evento: MouseEvent) => EsitoClic
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
}

/**
 * Segna un pulsante come occupato finché il lavoro finisce: serve anche ai
 * `<button>` fatti a mano delle matrici. `disabled` blocca il secondo clic; se
 * il pulsante sparisce nel frattempo si tocca un nodo staccato, senza danno.
 */
const RITARDO_ROTELLA = 150

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

export function pulsante (opzioni: OpzioniPulsante): HTMLButtonElement {
  const {
    testo, simbolo, variante = 'normale', al, titolo, disabilitato, tipo = 'button', classe,
    premuto,
  } = opzioni
  // Un titolo vuoto darebbe `title=""` e `aria-label=""`: un pulsante senza nome
  // per il lettore di schermo.
  const nome = titolo || testo || undefined
  const bottone = h(
    'button',
    {
      class: ['pulsante', `pulsante--${variante}`, !testo && 'pulsante--solo-icona', classe], // testo-fisso: classe CSS
      type: tipo,
      disabled: Boolean(disabilitato),
      attr: {
        title: nome ?? null,
        'aria-label': nome ?? null,
        'aria-pressed': premuto === undefined ? null : String(premuto),
      },
    },
    simbolo ? icona(simbolo) : null,
    testo ? h('span', null, testo) : null,
  )

  if (al) {
    bottone.addEventListener('click', (evento) => {
      const esito = al(evento)
      if (esito instanceof Promise) void conAttesa(bottone, esito)
    })
  }

  return bottone
}

/**
 * Un pulsante che si legge come un collegamento (un nome, una data, un titolo
 * che portano altrove), con l'attesa di `pulsante`. `testo` è un figlio perché
 * può portare due righe.
 */
export function collegamento (opzioni: {
  testo: Figlio
  al: (evento: MouseEvent) => EsitoClic
  titolo?: string
  classe?: string
}): HTMLButtonElement {
  const bottone = h(
    'button',
    {
      class: ['collegamento', opzioni.classe],
      type: 'button',
      attr: { title: opzioni.titolo ?? null },
    },
    opzioni.testo,
  )
  bottone.addEventListener('click', (evento) => {
    const esito = opzioni.al(evento)
    if (esito instanceof Promise) void conAttesa(bottone, esito)
  })
  return bottone
}

/**
 * Un gruppo di scelte alternative (settimana/mese/agenda): `role="radiogroup"`
 * con `role="radio"`, perché sotto non c'è un `tabpanel`. È una sola fermata
 * del Tab (`tabindex` mobile) e da dentro ci si muove con le frecce, che girano.
 */
export function selettore<T extends string> (
  valore: T,
  voci: Array<{ valore: T; testo: string; simbolo?: NomeIcona }>,
  al: (scelto: T) => void,
  etichetta = testi().scheda,
): HTMLElement {
  const bottoni = voci.map((voce) =>
    h(
      'button',
      {
        class: ['selettore__voce', voce.valore === valore && 'selettore__voce--attiva'],
        type: 'button',
        attr: {
          role: 'radio',
          'aria-checked': voce.valore === valore,
          tabindex: voce.valore === valore ? 0 : -1,
        },
        // La chiave di fuoco solo sulla voce accesa: la freccia sceglie, la pagina si
        // ridisegna, e il fuoco ritrova la voce accesa nel gruppo nuovo.
        dataset: { fuoco: voce.valore === valore ? `selettore:${etichetta}` : undefined }, // testo-fisso: chiave di fuoco, non si legge
        onclick: () => al(voce.valore),
      },
      voce.simbolo ? icona(voce.simbolo) : null,
      h('span', null, voce.testo),
    ),
  )

  // Nessuna voce corrisponde al valore (lo stato si sta assestando): la prima
  // resta nel giro del Tab.
  if (!voci.some((voce) => voce.valore === valore) && bottoni[0]) {
    bottoni[0].setAttribute('tabindex', '0')
    bottoni[0].dataset.fuoco = `selettore:${etichetta}` // testo-fisso: chiave di fuoco, non si legge
  }

  const gruppo = h(
    'div',
    { class: 'selettore', attr: { role: 'radiogroup', 'aria-label': etichetta } },
    bottoni,
  )

  gruppo.addEventListener('keydown', (evento: KeyboardEvent) => {
    const passo = evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
      ? 1
      : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp' ? -1 : 0
    if (passo === 0) return
    evento.preventDefault()
    const dove = bottoni.indexOf(document.activeElement as HTMLButtonElement)
    // Gira: dall'ultima si torna alla prima.
    const voce = voci[(Math.max(0, dove) + passo + voci.length) % voci.length]
    if (voce) al(voce.valore)
  })

  return gruppo
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
   * le date che si cercano guardando il mese più che battendole. Con `min` e
   * `max` le date fuori non si prendono.
   */
  calendario?: boolean
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
   * Prefisso per `id` e chiave di fuoco, se lo stesso nome compare più volte
   * nella pagina (dentro una modale ci pensa già `apriModale`).
   */
  scope?: string
  /**
   * Un comando accanto al controllo, di solito il «+» che crea al volo quel che
   * la tendina non elenca: senza lasciare il modulo a metà.
   */
  azione?: Figlio
}

function idCampo (opzioni: OpzioniCampo): string {
  return opzioni.scope ? `campo-${opzioni.scope}-${opzioni.nome}` : `campo-${opzioni.nome}` // testo-fisso: id del campo, non si legge
}

/**
 * Un campo data dentro una riga, con l'etichetta accanto: in un elenco
 * `campo()` non ci sta, e un campo nudo non si capisce.
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
      segnaposto: testi().formatoData,
      al: (valore) => opzioni.al(String(valore)),
    }),
  )
}

/**
 * Il campo data senza etichetta né contorno (serve anche in tabella). Si
 * scrive come su un foglio: `7.9`, `7/9/26`, `070926` (`dataDaTesto`); ↑ e ↓
 * spostano di un giorno, PagSu e PagGiù di un mese. Il valore ISO sta in un
 * campo nascosto, che è quel che `valoriModulo` legge e `al` riceve. Quel che
 * non si legge resta scritto, segnato in rosso.
 */
export function controlloData (opzioni: OpzioniCampo): HTMLElement {
  const iniziale = String(opzioni.valore ?? '')
  const nascosto = h('input', { type: 'hidden', name: opzioni.nome, value: iniziale })

  const visibile = h('input', {
    class: 'campo__controllo campo__controllo--data',
    id: idCampo(opzioni),
    type: 'text',
    value: iniziale ? formattaData(iniziale) : '',
    placeholder: opzioni.segnaposto ?? testi().formatoData,
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
    visibile.setCustomValidity('')
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
      // Il valore salvato è nel campo nascosto: lo si svuota e si rende il campo
      // invalido, così il `<form>` ferma il salvataggio invece di tenere la data
      // vecchia in silenzio (`required` non se ne accorge).
      nascosto.value = ''
      // Impostata e non mostrata: `reportValidity()` ruberebbe il fuoco a un clic su
      // «Annulla». La bolla la mostra il `<form>` al salvataggio.
      visibile.setCustomValidity(testi().dataIlleggibile)
      return
    }
    mostra(nuova)
    opzioni.al?.(nuova, evento)
  })

  /**
   * Il passo da tastiera avvisa quando ci si ferma, non a ogni tasto: si vede
   * subito, si salva quando il dito si alza.
   */
  let attesaPasso: ReturnType<typeof setTimeout> | null = null
  const RESPIRO_PASSO = 250

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
    if (attesaPasso) clearTimeout(attesaPasso)
    attesaPasso = setTimeout(() => {
      attesaPasso = null
      opzioni.al?.(nascosto.value, evento)
    }, RESPIRO_PASSO)
  })

  // Uscendo dal campo non si aspetta: la data parte prima che il fuoco se ne vada.
  visibile.addEventListener('blur', (evento: Event) => {
    if (!attesaPasso) return
    clearTimeout(attesaPasso)
    attesaPasso = null
    opzioni.al?.(nascosto.value, evento)
  })

  return h('div', { class: 'campo__data' }, visibile, nascosto)
}

/**
 * La tendina dei moduli (per `campo()` e `tendina()`). Il valore si assegna
 * dopo le voci: uno che non c'è lascia la tendina in bianco (vedi `h()`).
 */
function selezione (
  attributi: Attributi,
  voci: readonly OpzioneSelezione[],
  valore: string,
): HTMLSelectElement {
  const elemento = h(
    'select',
    { ...attributi, class: ['campo__controllo', 'campo__controllo--selezione', attributi.class as string] },
    voci.map((voce) => h('option', { value: voce.valore, selected: valore === voce.valore }, voce.testo)),
  )
  elemento.value = valore
  return elemento
}

/**
 * Una tendina fuori da un modulo (in una riga, una tappa, una barra).
 * `etichetta` è il nome per il lettore di schermo; si omette solo se una
 * `<label>` intorno lo dà già.
 */
export function tendina<T extends string> (opzioni: {
  voci: ReadonlyArray<{ valore: T, testo: string }>
  valore: T | '' | null | undefined
  etichetta?: string
  al: (valore: T, evento: Event) => void
  classe?: string
}): HTMLSelectElement {
  return selezione(
    {
      class: opzioni.classe,
      attr: { 'aria-label': opzioni.etichetta },
      onchange: (evento: Event) =>
        opzioni.al((evento.target as HTMLSelectElement).value as T, evento),
    },
    opzioni.voci,
    String(opzioni.valore ?? ''),
  )
}

/** Un testo di contorno, in grigio: «nessuna lezione», «da decidere». */
export function quieto (...figli: Figlio[]): HTMLElement {
  return h('p', { class: 'testo-quieto' }, ...figli)
}

function controllo (opzioni: OpzioniCampo): HTMLElement {
  // Il campo scritto è la regola; il calendario di sistema solo se chiesto. Tutti
  // e due danno ISO.
  if (opzioni.tipo === 'date' && !opzioni.calendario) return controlloData(opzioni)

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
    return selezione(comune, opzioni.opzioni ?? [], String(opzioni.valore ?? ''))
  }

  if (opzioni.tipo === 'checkbox') {
    return h('input', {
      ...comune,
      class: 'campo__interruttore',
      type: 'checkbox',
      checked: Boolean(opzioni.valore),
      // Una spunta ha sempre `value` `'on'`: `al` riceve lo stato come
      // `'true'`/`'false'`, per chi salva al volo (`valoriModulo` guarda `checked`).
      onchange: opzioni.al
        ? (evento: Event) =>
            opzioni.al?.(String((evento.target as HTMLInputElement).checked), evento)
        : undefined,
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
  const segno = opzioni.aiuto && opzioni.etichetta
    ? suggerimento(opzioni.aiuto, { etichetta: opzioni.etichetta })
    : null
  const sotto = opzioni.aiuto && !segno ? h('small', { class: 'campo__aiuto' }, opzioni.aiuto) : null
  const comando = controllo(opzioni)
  if (opzioni.etichetta) legaAlSegno(comando, segno, opzioni.etichetta)

  if (opzioni.tipo === 'checkbox') {
    // Il segno sta dentro la `<label>`: `suggerimento` ferma il suo clic.
    return h(
      'label',
      { class: ['campo', 'campo--interruttore', `campo--${larghezza}`, opzioni.classe] }, // testo-fisso: classe CSS
      comando,
      h('span', { class: 'campo__etichetta-in-linea' }, opzioni.etichetta ?? '', segno),
      sotto,
    )
  }

  return h(
    'div',
    { class: ['campo', `campo--${larghezza}`, opzioni.classe] }, // testo-fisso: classe CSS
    opzioni.etichetta
      ? h(
          'label',
          { class: 'campo__etichetta', attr: { for: idCampo(opzioni) } },
          opzioni.etichetta,
          opzioni.richiesto ? h('span', { class: 'campo__obbligo' }, '*') : null,
          segno,
        )
      : null,
    opzioni.azione
      ? h('div', { class: 'campo__gruppo' }, comando, opzioni.azione)
      : comando,
    sotto,
  )
}

/** Riga di campi: la griglia dei moduli sta tutta qui dentro. */
export function riga (...figli: Figlio[]): HTMLElement {
  return h('div', { class: 'modulo__riga' }, ...figli)
}

/**
 * Una sezione di modulo col suo titolo; `{ testo, aiuto }` mette la spiegazione
 * dietro la «i».
 */
export function sezioneModulo (
  titolo: string | { testo: string, aiuto: Figlio },
  ...figli: Figlio[]
): HTMLElement {
  const testo = typeof titolo === 'string' ? titolo : titolo.testo
  return h(
    'section',
    { class: 'modulo__sezione' },
    h(
      'h4',
      { class: 'modulo__titolo-sezione' },
      testo,
      typeof titolo === 'string' ? null : suggerimento(titolo.aiuto, { etichetta: testo }),
    ),
    ...figli,
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

export function pastiglia (testo: string, tono: TonoPastiglia = 'neutro', simbolo?: NomeIcona): HTMLElement {
  return h(
    'span',
    { class: ['pastiglia', `pastiglia--${tono}`] }, // testo-fisso: classe CSS
    simbolo ? icona(simbolo) : null,
    testo,
  )
}

/**
 * Il titolo di un mucchio con quanti ce n'è dentro (terzo livello delle
 * pendenze): il nome in una pastiglia tenue a sinistra, il conto a destra
 * incolonnato con gli altri, così il numero si trova senza leggere la frase.
 */
export function titoloGruppo (
  titolo: string,
  quante: number,
  livello: 'h4' | 'h5' = 'h4',
): HTMLElement {
  return h(
    livello,
    { class: 'gruppo-titolo' },
    h('span', { class: 'gruppo-titolo__nome' }, titolo),
    h('span', { class: 'gruppo-titolo__conto' }, String(quante)),
  )
}

/** Puntino colorato della classe: nel calendario è quello che la fa riconoscere. */
export function puntoColore (colore: string): HTMLElement {
  return h('span', { class: 'punto-colore', style: { backgroundColor: colore } })
}

export function scheda (opzioni: {
  titolo?: string
  sottotitolo?: string
  /**
   * La spiegazione della scheda, dietro la «i» accanto al titolo; il
   * sottotitolo resta per quel che si legge ogni volta.
   */
  aiuto?: Figlio
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
            opzioni.titolo
              ? h(
                  'h3',
                  { class: 'scheda__titolo' },
                  opzioni.titolo,
                  opzioni.aiuto ? suggerimento(opzioni.aiuto, { etichetta: opzioni.titolo }) : null,
                )
              : null,
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
    { class: ['avviso', `avviso--${tono}`], attr: { role: 'status' } }, // testo-fisso: classe CSS
    icona(simboli[tono]),
    h('div', { class: 'avviso__testo' }, testo),
  )
}

/** Numero grande con la sua didascalia: le sintesi in cima alle viste. */
export function datoSintetico (
  etichetta: string,
  valore: string,
  tono?: TonoPastiglia,
): HTMLElement {
  return h(
    'div',
    { class: ['dato', tono && `dato--${tono}`] }, // testo-fisso: classe CSS
    h('span', { class: 'dato__valore' }, valore),
    h('span', { class: 'dato__etichetta' }, etichetta),
  )
}

/**
 * Barra di avanzamento, `quota` fra 0 e 1. L'etichetta dà il nome al
 * `role="progressbar"`: senza, «60 per cento» non dice di che cosa.
 */
export function barra (
  quota: number,
  tono: TonoPastiglia = 'informativo',
  etichetta = testi().avanzamento,
): HTMLElement {
  const percentuale = Math.round(Math.min(1, Math.max(0, quota)) * 100)
  return h(
    'div',
    {
      class: 'barra',
      attr: {
        role: 'progressbar',
        'aria-label': etichetta,
        'aria-valuenow': percentuale,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
      },
    },
    h('div', { class: ['barra__riempimento', `barra__riempimento--${tono}`], style: { width: `${percentuale}%` } }),
  )
}

function segnoTestata (opzioni: { titolo: string, aiuto?: Figlio }): HTMLElement | null {
  return opzioni.aiuto ? suggerimento(opzioni.aiuto, { etichetta: opzioni.titolo }) : null
}

/**
 * Testata di una vista: titolo, contorno e comandi. `compatta` la riduce a una
 * riga (titolo piccolo, numeri in coda) dove la testata non è la prima cosa da
 * leggere, come nel calendario.
 */
export function testataVista (opzioni: {
  titolo: string
  sottotitolo?: string
  /** Che cosa è questa pagina, dietro la «i» accanto al titolo: vedi `scheda`. */
  aiuto?: Figlio
  azioni?: Figlio
  contorno?: Figlio
  compatta?: boolean
}): HTMLElement {
  if (opzioni.compatta) {
    return h(
      'header',
      { class: 'testata testata--compatta' },
      h('h2', { class: 'testata__titolo' }, opzioni.titolo, segnoTestata(opzioni)),
      opzioni.sottotitolo ? h('p', { class: 'testata__sottotitolo' }, opzioni.sottotitolo) : null,
      h('span', { class: 'testata__spazio' }),
      opzioni.contorno ? h('div', { class: 'testata__contorno' }, opzioni.contorno) : null,
      opzioni.azioni ? h('div', { class: 'testata__azioni' }, opzioni.azioni) : null,
    )
  }

  return h(
    'header',
    { class: 'testata' },
    h(
      'div',
      { class: 'testata__principale' },
      h(
        'div',
        null,
        h('h2', { class: 'testata__titolo' }, opzioni.titolo, segnoTestata(opzioni)),
        opzioni.sottotitolo ? h('p', { class: 'testata__sottotitolo' }, opzioni.sottotitolo) : null,
      ),
      opzioni.azioni ? h('div', { class: 'testata__azioni' }, opzioni.azioni) : null,
    ),
    opzioni.contorno ? h('div', { class: 'testata__contorno' }, opzioni.contorno) : null,
  )
}
