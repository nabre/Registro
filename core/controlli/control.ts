// Il controllo di un'impostazione del programma, disegnato una volta sola per
// il pannello e per la finestra nativa (ADR-52). Dalla `VoceProgramma` sceglie
// il disegno con la regola del tipo di input (§ 3.5 di
// `docs/PIANO-IMPOSTAZIONI.md`): figura, segmentato, tendina, interruttore,
// numero con unità, cursore, percorso, testo.
//
// Non sa di ponti né di messaggi: il valore esce da `quandoCambia`, e ogni
// superficie lo manda per la sua strada. Se `quandoCambia` torna una promessa
// con l'esito, il controllo lo dice sotto il campo: «Salvato», discreto, o il
// motivo del rifiuto della dogana (`valoreConMotivo`), che resta finché non si
// cambia di nuovo. Il controllo non rifiuta niente da sé.
//
// Ogni gestore prende il suo nodo da `evento.currentTarget`, mai da una
// variabile del disegno: nel pannello un nodo riusato da un ridisegno riceve i
// gestori del disegno nuovo (`gestisci`, ADR-50), e il nodo del disegno vecchio
// può essere fuori dal documento.

import type { VoceProgramma } from '#contract/protocol.js'
import { parole } from '#core/dominio/words.testi.js'
import { numero } from '#core/i18n/index.js'
import { attributo, elemento, idDi } from './dom.js'
import { raffigurazioneDi } from './figure.js'
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
 * segmentato multiplo. `controllo()` manda sempre un valore solo.
 */
export type ValoreCampo = Valore | Array<string | number>

/** Come `QuandoCambia`, per chi disegna anche il segmentato multiplo (`field.ts`). */
export type Cambia = (valore: ValoreCampo) => Promise<Esito> | void

/** Come si attacca un gestore: `addEventListener`, o la delega del pannello (`gestisci`). */
export type Ascolta = (bersaglio: Element, tipo: string, gestore: (evento: Event) => void) => void

export interface Opzioni {
  /** Di serie `addEventListener`; il pannello passa `gestisci`, che regge i ridisegni. */
  ascolta?: Ascolta
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
 * I disegni possibili: finiscono in `data-controllo`, per i fogli e per le
 * prove. `altro` (una tendina con «Altro…» che apre un numero) e `multipli`
 * (un segmentato che ne accende più d'uno) li chiede solo `campo()`: il
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
  documento: Document
  opzioni: Opzioni
  ascolta: Ascolta
  /** Spento: sospeso sotto un padre spento, o un interruttore a cui manca quel che richiede. */
  spento: boolean
  /** Manda il valore nuovo e dice l'esito sotto il campo che l'ha cambiato. */
  cambia (da: Element, valore: ValoreCampo): void
  /** Quel che solo `campo()` porta: vedi `Aggiunte`. */
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

const DI_SERIE: Ascolta = (bersaglio, tipo, gestore) => bersaglio.addEventListener(tipo, gestore)

/** Il nodo di un evento: quello vivo, non quello del disegno (vedi in testa). */
function vivo<T extends Element> (evento: Event): T {
  return evento.currentTarget as T
}

/** Aggiunge `aria-describedby` a quel che c'è già. */
function descrivi (bersaglio: Element, ...id: Array<string | undefined>): void {
  const tutti = [bersaglio.getAttribute('aria-describedby'), ...id].filter(Boolean).join(' ')
  attributo(bersaglio, 'aria-describedby', tutti || null)
}

/** Nome, campo e fuoco di un elemento che riceve il valore: gli attributi comuni. */
function nomina (campo: HTMLElement, cx: Contesto, fuoco = cx.voce.chiave): void {
  campo.setAttribute('aria-label', cx.voce.etichetta)
  campo.dataset.fuoco = fuoco
  if (cx.opzioni.descrittoDa) descrivi(campo, cx.opzioni.descrittoDa)
}

/** Il timer che toglie «Salvato», per riga: un esito nuovo ferma quello di prima. */
const attese = new WeakMap<Element, number>()

/** Scrive l'esito nella riga sotto il campo: «Salvato» sparisce da sé, il motivo resta. */
function mostraEsito (riga: HTMLElement, motivo: Esito, documento: Document): void {
  if (motivo === undefined) return
  const finestra = documento.defaultView
  const prima = attese.get(riga)
  if (prima !== undefined) finestra?.clearTimeout(prima)
  riga.textContent = motivo ?? testi().salvato
  riga.classList.toggle('controllo__esito--rifiuto', motivo !== null)
  if (motivo === null && finestra) {
    attese.set(riga, finestra.setTimeout(() => { riga.textContent = '' }, DURATA_SALVATO))
  }
}

/**
 * Dice un esito sotto un controllo già disegnato, per quel che non passa da
 * `quandoCambia`: il percorso scelto con «Sfoglia…» e rifiutato dalla dogana.
 */
export function diciEsito (
  controllo: Element,
  motivo: Esito,
  documento: Document = document,
): void {
  const riga = controllo.querySelector<HTMLElement>('.controllo__esito')
  if (riga) mostraEsito(riga, motivo, documento)
}

/**
 * La promessa dell'esito, detta sotto il campo. Un rifiuto rimette anche il
 * controllo com'era (`rifai`): il valore che si vede non è stato scritto.
 */
function riferisci (
  da: Element,
  esito: Promise<Esito> | void,
  documento: Document,
  rifai: () => HTMLElement,
): void {
  if (!esito) return
  const vecchio = da.closest<HTMLElement>('.controllo')
  const riga = vecchio?.querySelector<HTMLElement>('.controllo__esito')
  if (!vecchio || !riga) return
  void esito.then((motivo) => {
    mostraEsito(riga, motivo, documento)
    if (typeof motivo !== 'string' || !vecchio.isConnected) return
    const aveva = vecchio.contains(documento.activeElement)
    const fuoco = (documento.activeElement as HTMLElement | null)?.dataset?.fuoco
    const nuovo = rifai()
    // La riga resta la stessa, col motivo dentro.
    nuovo.querySelector('.controllo__esito')?.replaceWith(riga)
    vecchio.replaceWith(nuovo)
    if (aveva) fuocoDentro(nuovo, fuoco)
  })
}

/** Rimette il fuoco nel controllo: sul pezzo che l'aveva, o sul primo che lo prende. */
export function fuocoDentro (controllo: Element, chiave?: string): void {
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

/**
 * Un gruppo radio: una sola fermata del Tab, le frecce che scelgono. Con la
 * figura a schede (`scelta-figurata`, il foglio del tema), senza a segmenti
 * con la frase della scelta sotto.
 */
function gruppoRadio (cx: Contesto, scelte: Scelta[], conFigura: boolean): HTMLElement[] {
  const { voce, documento } = cx
  const raffigura = conFigura ? raffigurazioneDi(voce.chiave) : null
  const valore = String(voce.valore)
  const trovata = scelte.findIndex((scelta) => String(scelta.valore) === valore)
  const classe = raffigura ? 'scelta-figurata' : 'controllo-segmenti'

  const gruppo = elemento(documento, 'div', `${classe}${cx.spento ? ` ${classe}--spenta` : ''}`)
  gruppo.setAttribute('role', 'radiogroup')
  gruppo.setAttribute('aria-label', voce.etichetta)
  gruppo.dataset.valore = valore
  attributo(gruppo, 'aria-disabled', cx.spento ? 'true' : null)
  if (cx.opzioni.descrittoDa) descrivi(gruppo, cx.opzioni.descrittoDa)

  // La frase della scelta di adesso, sotto i segmenti: sotto la figura sta già.
  const frase = raffigura ? null : elemento(documento, 'p', 'controllo__descrizione', scelte[trovata]?.aiuto ?? '')
  if (frase) frase.hidden = !scelte[trovata]?.aiuto

  const scegli = (da: Element, indice: number): void => {
    const gruppoVivo = da.closest<HTMLElement>('[role="radiogroup"]')
    if (!gruppoVivo || gruppoVivo.getAttribute('aria-disabled') === 'true') return
    const radio = [...gruppoVivo.querySelectorAll<HTMLElement>('[role="radio"]')]
    radio.forEach((uno, i) => {
      uno.setAttribute('aria-checked', i === indice ? 'true' : 'false')
      uno.setAttribute('tabindex', i === indice ? '0' : '-1')
    })
    radio[indice]?.focus()
    const scelta = scelte[indice]
    if (!scelta) return
    const suaFrase = gruppoVivo.parentElement?.querySelector<HTMLElement>(':scope > .controllo__descrizione')
    if (suaFrase) {
      suaFrase.textContent = scelta.aiuto
      suaFrase.hidden = !scelta.aiuto
    }
    // Si ricorda subito, senza aspettare il valore salvato: due frecce di fila
    // devono partire tutte e due, anche tornando alla scelta di partenza.
    if (gruppoVivo.dataset.valore === String(scelta.valore)) return
    gruppoVivo.dataset.valore = String(scelta.valore)
    cx.cambia(radio[indice] ?? gruppoVivo, scelta.valore)
  }

  scelte.forEach((scelta, indice) => {
    const suo = String(scelta.valore)
    const accesa = indice === trovata
    const idNome = idDi(voce.chiave, suo, 'nome')
    const idAiuto = idDi(voce.chiave, suo, 'aiuto')
    const bottone = elemento(documento, 'button', raffigura ? 'scelta-figurata__voce' : 'controllo-segmenti__voce')
    bottone.type = 'button'
    bottone.setAttribute('role', 'radio')
    bottone.setAttribute('aria-checked', accesa ? 'true' : 'false')
    // Senza una scelta che combaci (un valore scritto a mano) il Tab entra dalla prima.
    bottone.setAttribute('tabindex', !cx.spento && (accesa || (trovata < 0 && indice === 0)) ? '0' : '-1')
    bottone.dataset.fuoco = `${voce.chiave}=${suo}`
    attributo(bottone, 'aria-disabled', cx.spento ? 'true' : null)

    if (raffigura) {
      const { figura, nota } = raffigura(suo, accesa, documento)
      const quadro = elemento(documento, 'span', 'scelta-figurata__figura', figura)
      quadro.setAttribute('aria-hidden', 'true')
      const segno = elemento(documento, 'span', 'scelta-figurata__segno')
      segno.setAttribute('aria-hidden', 'true')
      const nome = elemento(documento, 'span', null, scelta.nome)
      nome.id = idNome
      bottone.append(quadro, elemento(documento, 'span', 'scelta-figurata__nome', segno, nome))
      bottone.setAttribute('aria-labelledby', idNome)
      if (scelta.aiuto) {
        const aiuto = elemento(documento, 'span', 'scelta-figurata__aiuto', scelta.aiuto)
        aiuto.id = idAiuto
        bottone.append(aiuto)
        descrivi(bottone, idAiuto)
      }
      if (nota) {
        const idNota = idDi(voce.chiave, suo, 'nota')
        const sotto = elemento(documento, 'span', 'scelta-figurata__nota', nota)
        sotto.id = idNota
        bottone.append(sotto)
        descrivi(bottone, idNota)
      }
    } else {
      bottone.append(scelta.nome)
      if (scelta.aiuto) {
        // La frase di ogni scelta, per chi legge lo schermo: nascosta, ma nominata.
        const aiuto = elemento(documento, 'span', null, scelta.aiuto)
        aiuto.id = idAiuto
        aiuto.hidden = true
        bottone.append(aiuto)
        descrivi(bottone, idAiuto)
      }
    }

    cx.ascolta(bottone, 'click', (evento) => scegli(vivo(evento), indice))
    cx.ascolta(bottone, 'keydown', (evento) => {
      const prossima = dove((evento as KeyboardEvent).key, indice, scelte.length)
      if (prossima === null) return
      evento.preventDefault()
      scegli(vivo(evento), prossima)
    })
    gruppo.append(bottone)
  })

  return frase ? [gruppo, frase] : [gruppo]
}

// ---------------------------------------------------------------- la tendina

/** Una tendina a nomi corti; la frase della scelta di adesso sta sotto, e la si legge. */
function tendina (cx: Contesto, scelte: Scelta[]): HTMLElement[] {
  const { voce, documento } = cx
  const valore = String(voce.valore)
  // I vestiti dei campi del pannello (`controls.css`); la finestra nativa veste i suoi per tag.
  // testo-fisso: classi CSS
  const campo = elemento(documento, 'select', 'campo__controllo campo__controllo--selezione controllo-tendina')
  campo.name = voce.chiave
  nomina(campo, cx)
  let scelta = -1
  scelte.forEach((una, indice) => {
    const opzione = elemento(documento, 'option', null, una.nome)
    opzione.value = String(una.valore)
    // Anche come attributo: il pannello confronta i disegni per attributi.
    if (String(una.valore) === valore) {
      opzione.setAttribute('selected', '')
      scelta = indice
    }
    campo.append(opzione)
  })
  // Un valore che nessuna scelta porta lascia la tendina in bianco: è la verità.
  campo.selectedIndex = scelta
  campo.disabled = cx.spento

  const idFrase = idDi(voce.chiave, 'frase')
  const frase = elemento(documento, 'p', 'controllo__descrizione', scelte[scelta]?.aiuto ?? '')
  frase.id = idFrase
  frase.hidden = !scelte[scelta]?.aiuto
  descrivi(campo, idFrase)

  cx.ascolta(campo, 'change', (evento) => {
    const tenda = vivo<HTMLSelectElement>(evento)
    const presa = scelte[tenda.selectedIndex]
    if (!presa) return
    const suaFrase = tenda.parentElement?.querySelector<HTMLElement>(':scope > .controllo__descrizione')
    if (suaFrase) {
      suaFrase.textContent = presa.aiuto
      suaFrase.hidden = !presa.aiuto
    }
    cx.cambia(tenda, presa.valore)
  })
  return [campo, frase]
}

/** Il valore dell'opzione «Altro…»: nessuna scelta vera lo porta. */
const ALTRO = '\u0000altro'

/**
 * Una tendina con i valori che si usano, e in fondo «Altro…», che apre accanto
 * un numero con la sua unità. Un valore fuori elenco arriva con «Altro…» già
 * scelto e il numero in vista: è la verità, come la tendina in bianco.
 */
function tendinaConAltro (cx: Contesto, scelte: Scelta[]): HTMLElement[] {
  const { voce, documento } = cx
  const valore = String(voce.valore)
  const trovata = scelte.findIndex((scelta) => String(scelta.valore) === valore)
  const scelta = trovata < 0 ? scelte.length : trovata
  // testo-fisso: classi CSS
  const tenda = elemento(documento, 'select', 'campo__controllo campo__controllo--selezione controllo-tendina')
  tenda.name = voce.chiave
  nomina(tenda, cx)
  const voci = [
    ...scelte.map((una) => ({ valore: String(una.valore), nome: una.nome })),
    { valore: ALTRO, nome: cx.aggiunte.altro ?? '…' },
  ]
  voci.forEach((una, indice) => {
    const opzione = elemento(documento, 'option', null, una.nome)
    opzione.value = una.valore
    if (indice === scelta) opzione.setAttribute('selected', '')
    tenda.append(opzione)
  })
  tenda.selectedIndex = scelta
  tenda.disabled = cx.spento

  // Il numero libero: quello di sempre, con un nome e un fuoco suoi.
  const numeroLibero = campoNumero(cx)
  const campoLibero = numeroLibero.querySelector<HTMLInputElement>('input')
  if (campoLibero) {
    campoLibero.name = `${voce.chiave}-altro`
    campoLibero.dataset.fuoco = `${voce.chiave}-altro`
  }
  const accanto = elemento(documento, 'span', 'controllo-altro', numeroLibero)
  accanto.hidden = trovata >= 0

  cx.ascolta(tenda, 'change', (evento) => {
    const viva = vivo<HTMLSelectElement>(evento)
    const suoAccanto = viva.parentElement?.querySelector<HTMLElement>('.controllo-altro')
    const presa = scelte[viva.selectedIndex]
    if (!presa) {
      // «Altro…»: si apre il numero, e si salva quando lo si cambia.
      if (suoAccanto) suoAccanto.hidden = false
      suoAccanto?.querySelector<HTMLInputElement>('input')?.focus()
      return
    }
    if (suoAccanto) suoAccanto.hidden = true
    cx.cambia(viva, presa.valore)
  })
  return [elemento(documento, 'span', 'controllo-altro__riga', tenda, accanto)]
}

/**
 * Un segmentato che ne accende più d'uno (i giorni mostrati): pulsanti a due
 * stati (`aria-pressed`), una sola fermata del Tab, le frecce che spostano il
 * fuoco, Spazio che accende o spegne. Quel che si manda si legge dai pulsanti
 * vivi, non dal disegno: due clic di fila partono tutti e due.
 */
function segmentiMultipli (cx: Contesto, scelte: Scelta[]): HTMLElement {
  const { voce, documento } = cx
  const accese = new Set((cx.aggiunte.accese ?? []).map(String))
  const gruppo = elemento(
    documento,
    'div',
    `controllo-segmenti controllo-segmenti--multipli${cx.spento ? ' controllo-segmenti--spenta' : ''}`,
  )
  gruppo.setAttribute('role', 'group')
  gruppo.setAttribute('aria-label', voce.etichetta)
  attributo(gruppo, 'aria-disabled', cx.spento ? 'true' : null)
  if (cx.opzioni.descrittoDa) descrivi(gruppo, cx.opzioni.descrittoDa)
  const prima = Math.max(0, scelte.findIndex((scelta) => accese.has(String(scelta.valore))))
  const pulsanti = (nodo: Element): HTMLElement[] => [
    ...(nodo.closest('[role="group"]')?.querySelectorAll<HTMLElement>('.controllo-segmenti__voce') ?? []),
  ]

  scelte.forEach((scelta, indice) => {
    const suo = String(scelta.valore)
    const bottone = elemento(documento, 'button', 'controllo-segmenti__voce', scelta.nome)
    bottone.type = 'button'
    bottone.setAttribute('aria-pressed', accese.has(suo) ? 'true' : 'false')
    bottone.setAttribute('tabindex', !cx.spento && indice === prima ? '0' : '-1')
    bottone.dataset.fuoco = `${voce.chiave}=${suo}`
    attributo(bottone, 'aria-disabled', cx.spento ? 'true' : null)
    if (scelta.aiuto) bottone.title = scelta.aiuto

    cx.ascolta(bottone, 'click', (evento) => {
      const premuto = vivo<HTMLElement>(evento)
      const gruppoVivo = premuto.closest<HTMLElement>('[role="group"]')
      if (!gruppoVivo || gruppoVivo.getAttribute('aria-disabled') === 'true') return
      const tutti = pulsanti(premuto)
      const nuovo = premuto.getAttribute('aria-pressed') !== 'true'
      const accesiDopo = tutti.filter((uno) =>
        uno === premuto ? nuovo : uno.getAttribute('aria-pressed') === 'true').length
      const almeno = cx.aggiunte.almeno
      if (almeno && accesiDopo < almeno.quante) {
        // Non si spegne: lo si dice sotto, come un rifiuto, e il pulsante resta com'era.
        const riga = gruppoVivo.closest('.controllo')?.querySelector<HTMLElement>('.controllo__esito')
        if (riga) mostraEsito(riga, almeno.motivo, documento)
        return
      }
      premuto.setAttribute('aria-pressed', nuovo ? 'true' : 'false')
      tutti.forEach((uno) => uno.setAttribute('tabindex', uno === premuto ? '0' : '-1'))
      const valori = scelte
        .filter((_, i) => tutti[i]?.getAttribute('aria-pressed') === 'true')
        .map((una) => una.valore)
      cx.cambia(premuto, valori)
    })
    cx.ascolta(bottone, 'keydown', (evento) => {
      const prossima = dove((evento as KeyboardEvent).key, indice, scelte.length)
      if (prossima === null) return
      evento.preventDefault()
      const tutti = pulsanti(vivo(evento))
      tutti.forEach((uno, i) => uno.setAttribute('tabindex', i === prossima ? '0' : '-1'))
      tutti[prossima]?.focus()
    })
    gruppo.append(bottone)
  })
  return gruppo
}

// ------------------------------------------------------------ l'interruttore

/** Un interruttore vero (`role="switch"`), che si chiama come la voce: mai «Acceso». */
function interruttore (cx: Contesto): HTMLElement {
  const { voce, documento } = cx
  // Una voce sospesa si mostra spenta qualunque cosa dica il file: il valore
  // scritto resta e torna quando il padre si riaccende.
  const acceso = Boolean(voce.valore) && !voce.sospesa
  const bottone = elemento(documento, 'button', 'controllo-interruttore')
  bottone.type = 'button'
  bottone.setAttribute('role', 'switch')
  bottone.setAttribute('aria-checked', acceso ? 'true' : 'false')
  nomina(bottone, cx)
  bottone.disabled = cx.spento
  attributo(bottone, 'disabled', cx.spento)
  const traccia = elemento(documento, 'span', 'controllo-interruttore__traccia',
    elemento(documento, 'span', 'controllo-interruttore__pomello'))
  traccia.setAttribute('aria-hidden', 'true')
  bottone.append(traccia)
  cx.ascolta(bottone, 'click', (evento) => {
    const premuto = vivo<HTMLButtonElement>(evento)
    if (premuto.disabled) return
    const nuovo = premuto.getAttribute('aria-checked') !== 'true'
    premuto.setAttribute('aria-checked', nuovo ? 'true' : 'false')
    cx.cambia(premuto, nuovo)
  })
  return bottone
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
function estremi (campo: HTMLInputElement, voce: VoceProgramma): void {
  if (voce.minimo !== null) campo.min = String(voce.minimo)
  if (voce.massimo !== null) campo.max = String(voce.massimo)
  campo.step = String(voce.passo ?? 1)
}

/** Un numero con l'unità scritta accanto, sempre visibile. */
function campoNumero (cx: Contesto): HTMLElement {
  const { voce, documento } = cx
  // testo-fisso: classi CSS
  const campo = elemento(documento, 'input', 'campo__controllo controllo-numero__campo')
  campo.type = 'number'
  campo.name = voce.chiave
  estremi(campo, voce)
  campo.setAttribute('value', String(voce.valore))
  campo.value = String(voce.valore)
  campo.disabled = cx.spento
  nomina(campo, cx)
  const tutto = elemento(documento, 'span', 'controllo-numero', campo)
  if (voce.unita) {
    const unita = elemento(documento, 'span', 'controllo-numero__unita', voce.unita)
    unita.id = idDi(voce.chiave, 'unita')
    descrivi(campo, unita.id)
    tutto.append(unita)
  }
  // Al cambio, non a ogni tasto: «180» salverebbe 1, poi 18, poi 180.
  cx.ascolta(campo, 'change', (evento) => {
    const campoVivo = vivo<HTMLInputElement>(evento)
    const scritto = campoVivo.value.trim()
    const quanto = Number(scritto)
    if (scritto === '' || !Number.isFinite(quanto)) return
    cx.cambia(campoVivo, quanto)
  })
  return tutto
}

/** Un cursore per un intervallo piccolo: il valore si legge accanto e si dice con l'unità. */
function cursore (cx: Contesto): HTMLElement {
  const { voce, documento } = cx
  const quanto = Number(voce.valore)
  const campo = elemento(documento, 'input', 'controllo-cursore__campo')
  campo.type = 'range'
  campo.name = voce.chiave
  estremi(campo, voce)
  campo.setAttribute('value', String(quanto))
  campo.value = String(quanto)
  campo.disabled = cx.spento
  campo.setAttribute('aria-valuetext', conUnita(quanto, voce.unita))
  nomina(campo, cx)
  const letto = elemento(documento, 'output', 'controllo-cursore__valore', conUnita(quanto, voce.unita))
  letto.setAttribute('aria-hidden', 'true')
  // Mentre si trascina si dice il numero; si salva quando lo si lascia.
  cx.ascolta(campo, 'input', (evento) => {
    const campoVivo = vivo<HTMLInputElement>(evento)
    const detto = conUnita(Number(campoVivo.value), voce.unita)
    campoVivo.setAttribute('aria-valuetext', detto)
    const accanto = campoVivo.parentElement?.querySelector('.controllo-cursore__valore')
    if (accanto) accanto.textContent = detto
  })
  cx.ascolta(campo, 'change', (evento) => {
    const campoVivo = vivo<HTMLInputElement>(evento)
    cx.cambia(campoVivo, Number(campoVivo.value))
  })
  return elemento(documento, 'span', 'controllo-cursore', campo, letto)
}

// ------------------------------------------------------------------ il testo

/** Testo libero: nomi propri, indirizzi. Si salva al cambio, se il campo lo accetta. */
function campoTesto (cx: Contesto, scelte: Scelta[] | null): HTMLElement[] {
  const { voce, documento } = cx
  // testo-fisso: classi CSS
  const campo = elemento(documento, 'input', 'campo__controllo controllo-testo')
  // `formato: 'email'`: il campo si valida da sé, vuoto compreso (è il predefinito).
  campo.type = voce.formato === 'email' ? 'email' : 'text'
  campo.name = voce.chiave
  campo.setAttribute('value', String(voce.valore ?? ''))
  campo.value = String(voce.valore ?? '')
  campo.disabled = cx.spento
  campo.autocomplete = 'off'
  nomina(campo, cx)
  const pezzi: HTMLElement[] = [campo]
  // Una scelta libera fra quelle che si sanno: le proposte, e si può scrivere altro.
  if (scelte) {
    const elenco = elemento(documento, 'datalist', null)
    elenco.id = idDi(voce.chiave, 'proposte')
    for (const scelta of scelte) {
      const proposta = elemento(documento, 'option', null)
      proposta.value = String(scelta.valore)
      proposta.label = scelta.nome
      elenco.append(proposta)
    }
    campo.setAttribute('list', elenco.id)
    pezzi.push(elenco)
  }
  cx.ascolta(campo, 'change', (evento) => {
    const campoVivo = vivo<HTMLInputElement>(evento)
    if (!campoVivo.checkValidity()) return
    cx.cambia(campoVivo, campoVivo.value)
  })
  return pezzi
}

// ------------------------------------------------- percorso, modello, collegamento

/** Un pulsante con il vestito di tutte e due le pagine. */
function pulsante (
  cx: Contesto,
  testo: string,
  titolo: string,
  gesto: () => void,
): HTMLButtonElement {
  // testo-fisso: classi CSS
  const bottone = elemento(cx.documento, 'button', 'pulsante pulsante--sottile controllo__pulsante', testo)
  bottone.type = 'button'
  bottone.title = titolo
  cx.ascolta(bottone, 'click', () => gesto())
  return bottone
}

/** Il valore di un campo che si legge soltanto, o quel che vale quando è vuoto. */
function valoreLetto (cx: Contesto, vuoto: string): HTMLElement {
  const scritto = String(cx.voce.valore ?? '').trim()
  const valore = elemento(
    cx.documento,
    'span',
    `controllo-percorso__valore${scritto === '' ? ' controllo-percorso__valore--vuoto' : ''}`,
    scritto || vuoto,
  )
  attributo(valore, 'title', scritto || null)
  return valore
}

/**
 * Un percorso: si mostra e si sceglie con il dialogo del sistema, non si
 * batte. Vuoto vuol dire «ci pensa il registro», e lo si dice.
 */
function percorso (cx: Contesto): HTMLElement {
  const t = testi()
  const tutto = elemento(cx.documento, 'div', 'controllo-percorso', valoreLetto(cx, t.ciPensaIlRegistro))
  const { sfoglia, svuota } = cx.opzioni
  if (sfoglia) {
    const bottone = pulsante(cx, parole().sfoglia, t.sceglieConDialogo(cx.voce.formato === 'cartella'), sfoglia)
    bottone.disabled = cx.spento
    bottone.dataset.fuoco = cx.voce.chiave
    tutto.append(bottone)
  }
  if (svuota && String(cx.voce.valore ?? '') !== '') {
    const bottone = pulsante(cx, t.svuota, t.svuotaAiuto, svuota)
    bottone.disabled = cx.spento
    tutto.append(bottone)
  }
  return tutto
}

/**
 * Un modello: il nome del file si legge e basta. Si sceglie fra quelli
 * scaricati: battuto a mano sarebbe un nome che la cartella forse non ha.
 */
function modello (cx: Contesto): HTMLElement[] {
  const t = testi()
  const tutto = elemento(cx.documento, 'div', 'controllo-percorso', valoreLetto(cx, t.nessunModello))
  if (cx.opzioni.aiModelli) {
    tutto.append(pulsante(cx, t.scegliModello, t.scegliModelloAiuto, cx.opzioni.aiModelli))
    return [tutto]
  }
  return [tutto, elemento(cx.documento, 'p', 'controllo__nota', t.modelloNelRegistro)]
}

/**
 * Casella e mittente li scrive «Collega la casella», e il mittente si sceglie
 * fra gli indirizzi dell'account: qui si leggono soltanto.
 */
function collegamento (cx: Contesto): HTMLElement[] {
  const t = testi()
  return [
    elemento(cx.documento, 'div', 'controllo-percorso', valoreLetto(cx, t.nessunaCasella)),
    elemento(cx.documento, 'p', 'controllo__nota', t.delCollegamento),
  ]
}

// ---------------------------------------------------------------- il controllo

/**
 * Il controllo di una voce: un `div.controllo` con il campo giusto e, sotto, la
 * riga dell'esito. Il nome della voce lo scrive chi disegna la riga; il campo
 * lo porta come nome accessibile.
 */
export function controllo (
  voce: VoceProgramma,
  quandoCambia: QuandoCambia,
  documento: Document = document,
  opzioni: Opzioni = {},
): HTMLElement {
  const scelte = scelteDi(voce, opzioni)
  return disegna({
    voce,
    scelte,
    disegno: disegnoDi(voce, scelte),
    // I disegni a più valori li chiede solo `campo()`: qui arriva sempre un valore solo.
    quandoCambia: (valore) => quandoCambia(valore as Valore),
    documento,
    opzioni,
    rifai: () => controllo(voce, quandoCambia, documento, opzioni),
  })
}

/** Quel che serve a `disegna`: la voce, già con le sue scelte e il suo disegno. */
interface DaDisegnare {
  voce: VoceProgramma
  scelte: Scelta[] | null
  disegno: Disegno
  quandoCambia: Cambia
  documento: Document
  opzioni: Opzioni
  /** Rifà il controllo dopo un rifiuto: chi disegna sa da dove ripartire. */
  rifai: () => HTMLElement
  aggiunte?: Aggiunte
}

/**
 * Il `div.controllo` di un disegno già scelto, con la riga dell'esito sotto. È
 * il corpo di `controllo()`; `campo()` ci arriva con un disegno suo, per i
 * valori che non sono chiavi del manifesto.
 */
export function disegna (da: DaDisegnare): HTMLElement {
  const { voce, scelte, disegno, quandoCambia, documento, opzioni, rifai } = da
  const cx: Contesto = {
    voce,
    documento,
    opzioni,
    ascolta: opzioni.ascolta ?? DI_SERIE,
    spento: voce.sospesa || (voce.tipo === 'boolean' && voce.bloccata !== null),
    cambia: (nodo, valore) => riferisci(nodo, quandoCambia(valore), documento, rifai),
    aggiunte: da.aggiunte ?? {},
  }

  const pezzi: HTMLElement[] = (() => {
    switch (disegno) {
      case 'figura': return gruppoRadio(cx, scelte ?? [], true)
      case 'segmenti': return gruppoRadio(cx, scelte ?? [], false)
      case 'tendina': return tendina(cx, scelte ?? [])
      case 'altro': return tendinaConAltro(cx, scelte ?? [])
      case 'multipli': return [segmentiMultipli(cx, scelte ?? [])]
      case 'interruttore': return [interruttore(cx)]
      case 'numero': return [campoNumero(cx)]
      case 'cursore': return [cursore(cx)]
      case 'percorso': return [percorso(cx)]
      case 'modello': return modello(cx)
      case 'collegamento': return collegamento(cx)
      case 'testo': return campoTesto(cx, scelte)
    }
  })()

  // testo-fisso: classi CSS
  const tutto = elemento(documento, 'div', `controllo controllo--${disegno}`, ...pezzi)
  tutto.dataset.controllo = disegno
  tutto.dataset.chiave = voce.chiave

  // La riga dell'esito: vuota finché non si salva. Nel pannello un ridisegno la
  // ritrova e non la tocca dentro (`data-tieni`, ADR-48), così «Salvato» resta
  // anche se lo stato nuovo arriva prima della risposta.
  const esito = elemento(documento, 'p', 'controllo__esito')
  esito.setAttribute('role', 'status')
  // testo-fisso: la chiave con cui il pannello ritrova la riga
  esito.dataset.tieni = `esito:${voce.chiave}`
  tutto.append(esito)
  return tutto
}
