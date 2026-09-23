// I mattoni dell'interfaccia: pulsanti, campi, pastiglie, schede, stati vuoti.
//
// I moduli funzionano come i moduli HTML di sempre: ogni campo ha un `name`, il
// valore vive nel DOM, e al momento di salvare `valoriModulo` legge tutto in un
// colpo. Nessuno stato duplicato da tenere allineato, nessun ridisegno mentre si
// scrive — e i campi si comportano come chiunque si aspetta, autocompletamento
// e tabulazione compresi.

import { dataDaTesto, formattaData, spostaData } from '../../domain/dates.js'
import { h, type Attributi, type Figlio } from '../dom.js'
import { icona, type NomeIcona } from './icons.js'

// ------------------------------------------------------------------ pulsanti

type VariantePulsante = 'primario' | 'normale' | 'sottile' | 'pericolo' | 'fantasma'

/**
 * Che cosa torna da un clic: niente, oppure il lavoro che ha avviato.
 *
 * Chi restituisce la promessa ottiene gratis l'attesa mostrata sul pulsante —
 * disabilitato, con la sua rotella — finché l'host non ha risposto. Chi non ha
 * niente da aspettare non restituisce niente, e il pulsante si comporta come
 * prima.
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
   * Un pulsante che sta acceso o spento, e lo dice: `aria-pressed`.
   *
   * Non è lo stesso di una classe che lo colora. Chi guarda vede il colore; chi
   * legge con lo schermo che parla sente «pulsante» e basta, e un interruttore
   * che non dice in che posizione si trova è un interruttore che si preme per
   * scoprirlo. Omesso dove il pulsante fa una cosa invece di tenerne una accesa.
   */
  premuto?: boolean
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
    premuto,
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
 * Gruppo di pulsanti che si comporta come una scelta unica (settimana/mese/agenda).
 *
 * Erano `role="tablist"` e `role="tab"`, e non lo erano: una linguetta esiste
 * in quanto punta a un pannello — `aria-controls` verso un `role="tabpanel"`
 * che si chiama per nome con `aria-labelledby` — e qui il pannello non c'è.
 * Quel che sta sotto lo ridisegna ogni vista per conto suo, come fratello e non
 * come contenuto della linguetta: chi legge con la voce sentiva «scheda 1 di 3»
 * e poi non trovava nessuna scheda. Mancavano anche le frecce, che di un
 * `tablist` sono metà del contratto.
 *
 * Adesso è quel che è sempre stato: un gruppo di scelte alternative, cioè
 * `role="radiogroup"` con dentro dei `role="radio"`. Il contratto si chiude
 * tutto qui dentro — `aria-checked`, un `tabindex` solo nel gruppo, le frecce
 * che girano — senza chiedere niente a chi disegna quel che c'è sotto. Ed è la
 * verità: queste tre voci scelgono *che cosa mostrare*, non aprono un cassetto.
 *
 * Il `tabindex` mobile è il pezzo che non si vede e che conta: un gruppo di
 * scelte alternative è *una* fermata nel giro del Tab, non tre, e da dentro ci
 * si muove con le frecce. Con tre fermate, una pagina con quattro selettori
 * chiedeva dodici colpi di Tab per attraversarla.
 */
export function selettore<T extends string> (
  valore: T,
  voci: Array<{ valore: T; testo: string; simbolo?: NomeIcona }>,
  al: (scelto: T) => void,
  etichetta = 'Scheda',
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
        onclick: () => al(voce.valore),
      },
      voce.simbolo ? icona(voce.simbolo) : null,
      h('span', null, voce.testo),
    ),
  )

  // Nessuna voce corrisponde al valore in corso — succede mentre lo stato si
  // assesta: senza questa riga il gruppo resterebbe fuori dal giro del Tab.
  if (!voci.some((voce) => voce.valore === valore)) bottoni[0]?.setAttribute('tabindex', '0')

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
    // Gira, come in ogni gruppo di scelte alternative: dall'ultima si torna
    // alla prima senza doversi rifare tutto il giro all'indietro.
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
  aiuto?: string
  richiesto?: boolean
  disabilitato?: boolean
  /**
   * Con `tipo: 'date'`: il calendario del sistema invece del campo scritto.
   *
   * Di norma una data si scrive — vedi `controlloData`, che legge `7.9` e
   * `070926` e sposta di un giorno con le frecce — ed è la via più rapida per
   * chi ha in mente la data e la batte. Ma dove la data non si sa a memoria e
   * la si cerca guardando — «il venerdì prima delle vacanze», gli estremi di
   * un periodo — il mese disegnato è l’unica cosa che risponde, e il campo
   * scritto obbliga a cercarlo altrove. Con `min` e `max` il calendario si
   * apre già chiuso dentro i limiti, e le date fuori non si possono nemmeno
   * prendere.
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
      // Il rosso da solo non bastava, ed era il difetto: il valore che si
      // salva sta nel campo nascosto, che restava alla data di prima. Chi
      // scriveva «31.02.2026» e premeva Salva vedeva la finestra chiudersi,
      // leggeva «salvato», e nel registro restava la data vecchia — senza che
      // niente lo dicesse. Il `required` non se ne accorgeva nemmeno: il testo
      // sbagliato lo soddisfa, perché è scritto nel campo visibile.
      //
      // Adesso il salvataggio si ferma qui, e il browser dice perché. Lo
      // svuotamento del nascosto è la rete sotto: dove un campo data non sta
      // dentro un `<form>`, quel che parte è «niente», non «quella di prima».
      nascosto.value = ''
      // Impostata e non mostrata: `reportValidity()` qui riporterebbe il fuoco
      // sul campo, e un clic su «Annulla» partito nello stesso momento
      // andrebbe perso. La bolla la mostra il `<form>` quando si prova a
      // salvare, che è il momento in cui serve.
      visibile.setCustomValidity('Data non leggibile. Si scrive gg.mm.aaaa — per esempio 7.9.26.')
      return
    }
    mostra(nuova)
    opzioni.al?.(nuova, evento)
  })

  /**
   * Il passo da tastiera avvisa quando ci si ferma, non a ogni tasto.
   *
   * Le frecce spostano di un giorno: portare una data avanti di due settimane
   * sono quattordici pressioni, e con un avviso per ciascuna erano quattordici
   * comandi, quattordici scritture e quattordici ridisegni — con il campo
   * rifatto sotto le dita mentre lo si stava ancora usando. Quel che si vede
   * cambia subito; quel che si salva aspetta che il dito si alzi.
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

  // Uscendo dal campo non si aspetta il respiro: chi va via ha finito, e la
  // data dev'essere già partita prima che il fuoco se ne vada.
  visibile.addEventListener('blur', (evento: Event) => {
    if (!attesaPasso) return
    clearTimeout(attesaPasso)
    attesaPasso = null
    opzioni.al?.(nascosto.value, evento)
  })

  return h('div', { class: 'campo__data' }, visibile, nascosto)
}

function controllo (opzioni: OpzioniCampo): HTMLElement {
  // Il campo scritto è la regola; il calendario del sistema si chiede a parte,
  // dove la data si cerca guardando invece di saperla. Il valore che ne esce è
  // già in ISO, come quello del campo scritto: chi salva non vede differenza.
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
      // Una spunta non ha un `value` che dica qualcosa — è sempre `'on'` —
      // quindi `al` riceve lo stato vero come `'true'`/`'false'`. Chi la legge
      // dentro un modulo passa da `valoriModulo`, che guarda `checked`: questo
      // serve a chi salva al volo, senza modulo intorno.
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

/**
 * Quanto misura un file, in una forma che si legge a colpo d'occhio.
 *
 * Sta fra i mattoni perché di pagine che mostrano file ce ne sono due — le
 * esportazioni di un corso e l'archivio di una classe — e la stessa misura
 * scritta in due modi diversi si legge come due cose diverse.
 */
export function quantoMisura (byte: number): string {
  if (byte < 1024) return `${byte} B`
  const kb = byte / 1024
  return kb < 1024 ? `${Math.round(kb)} kB` : `${(kb / 1024).toFixed(1)} MB`
}

/**
 * Di che colore si legge una percentuale di presenza.
 *
 * Le soglie stanno qui e non dentro le pagine che le mostrano — il corso, la
 * persona — perché lo stesso ottantacinque per cento colorato in due modi
 * diversi si legge come due fatti diversi. `null` è «l'appello non c'è mai
 * stato»: non è un buon voto né un cattivo voto, e non si colora.
 */
export function tonoPresenza (presenza: number | null): TonoPastiglia | undefined {
  if (presenza === null) return undefined
  if (presenza >= 0.9) return 'positivo'
  return presenza >= 0.8 ? 'attenzione' : 'negativo'
}

export function pastiglia (testo: string, tono: TonoPastiglia = 'neutro', simbolo?: NomeIcona): HTMLElement {
  return h(
    'span',
    { class: ['pastiglia', `pastiglia--${tono}`] },
    simbolo ? icona(simbolo) : null,
    testo,
  )
}

/**
 * Il titolo di un mucchio, con quanti ce n'è dentro.
 *
 * È il terzo livello delle pendenze — sotto la classe e sotto la tipologia di
 * lavoro — e lo scrivono in nove posti: le consegne, i recuperi, le prove da
 * correggere, le firme da chiedere, le segnalazioni. Nove volte «nome, punto
 * mediano, numero» scritte a mano vogliono dire nove modi di scriverlo il
 * giorno in cui uno lo cambia, e soprattutto un numero incollato al nome:
 * «Scadono oggi · 3» si legge come una frase sola, e il numero — che è quel
 * che si cerca — non si trova senza leggerla tutta.
 *
 * Qui il nome sta a sinistra in una pastiglia di fondo tenue e il conto a
 * destra, dove si incolonna con quelli degli altri mucchi: un testo grigio fra
 * due pendenze — che sono riquadri con un filetto colorato — si leggeva come
 * una riga dell'elenco anziché come quel che lo intesta. Pastiglia e non
 * fascia da bordo a bordo: sopra c'è il titolo della tipologia, e una fascia
 * intera pesa più di lui.
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

/**
 * Barra di avanzamento, con `quota` fra 0 e 1.
 *
 * L'etichetta non è un ornamento: un `role="progressbar"` senza nome si legge
 * «barra di avanzamento, 60 per cento» e basta — sessanta per cento *di che
 * cosa*, in una pagina che ne porta una per riga, non lo dice nessuno. Qui è
 * un argomento con un ripiego, così nessuna chiamata di prima si rompe, ma chi
 * ne disegna una nuova vede il posto in cui dire di che cosa parla.
 */
export function barra (
  quota: number,
  tono: TonoPastiglia = 'informativo',
  etichetta = 'Avanzamento',
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

/**
 * Testata di una vista: titolo, contorno e comandi.
 *
 * `compatta` la riduce a una riga sola: titolo piccolo, sottotitolo di fianco e
 * i numeri in coda, incolonnati come una frase invece che come un cruscotto.
 * Serve alle pagine in cui la testata non è la prima cosa da leggere — il
 * calendario ha la griglia, e sopra di lei il nome della pagina sta già nella
 * barra — e settanta pixel di intestazione sono settanta pixel tolti alla
 * settimana.
 */
export function testataVista (opzioni: {
  titolo: string
  sottotitolo?: string
  azioni?: Figlio
  contorno?: Figlio
  compatta?: boolean
}): HTMLElement {
  if (opzioni.compatta) {
    return h(
      'header',
      { class: 'testata testata--compatta' },
      h('h2', { class: 'testata__titolo' }, opzioni.titolo),
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
        h('h2', { class: 'testata__titolo' }, opzioni.titolo),
        opzioni.sottotitolo ? h('p', { class: 'testata__sottotitolo' }, opzioni.sottotitolo) : null,
      ),
      opzioni.azioni ? h('div', { class: 'testata__azioni' }, opzioni.azioni) : null,
    ),
    opzioni.contorno ? h('div', { class: 'testata__contorno' }, opzioni.contorno) : null,
  )
}
