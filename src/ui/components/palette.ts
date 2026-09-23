// La palette: si scrive il nome di quel che si vuole, e si preme Invio.
//
// È l'altra faccia della barra. La barra risponde a «che cosa posso fare qui?»
// e si guarda; la palette risponde a «dov'era quella cosa?» e si scrive — due
// domande diverse sugli stessi elenchi, che è il motivo per cui legge
// `COMANDI_UI` e `PAGINE` e non ha un elenco suo.
//
// Dentro ci sono tutt'e due le specie, e si distinguono a vista: le pagine
// portano «Vai a» sotto il nome, le azioni il loro gruppo. È l'unico posto in
// cui le due cose stanno insieme, e ha senso che sia così: chi scrive «voti»
// non sa ancora se quel che cerca è una pagina o un'esportazione.
//
// Vive fuori dal ciclo di ridisegno, come le modali e il menu del tasto
// destro: nasce al gesto, sta sopra la pagina, e se ne va al primo Escape. Un
// aggiornamento dello stato che arriva mentre è aperta non la tocca — e la
// riga che si sta scrivendo resta dov'è.

import {
  COMANDI_UI,
  aiutoDi,
  eseguiComando,
  impedimentoDi,
  titoloDi,
  type ComandoUI,
} from '../commands.js'
import { corrispondeAlla, pezziDiRicerca } from '../../domain/text.js'
import { h } from '../dom.js'
import { PAGINE, vaiA, type Pagina } from '../pages.js'
import { icona, type NomeIcona } from './icons.js'

/**
 * Una riga della palette: una pagina o un'azione, ridotte a quel che serve per
 * cercarle, disegnarle e farle partire.
 */
interface Voce {
  titolo: string
  simbolo: NomeIcona
  /** La riga piccola sotto il nome: il gruppo dell'azione, o «Vai a». */
  sotto: string
  aiuto: string | null
  scorciatoia?: string
  impedito: string | null
  al: () => void
}

function voceDiPagina (pagina: Pagina): Voce {
  return {
    titolo: pagina.titolo,
    simbolo: pagina.simbolo,
    sotto: 'Vai a',
    aiuto: pagina.aiuto ?? null,
    impedito: pagina.impedimento?.() ?? null,
    al: () => vaiA(pagina),
  }
}

function voceDiComando (comando: ComandoUI): Voce {
  return {
    titolo: titoloDi(comando),
    simbolo: comando.simbolo,
    sotto: comando.gruppo,
    aiuto: aiutoDi(comando),
    scorciatoia: comando.scorciatoia,
    impedito: impedimentoDi(comando),
    al: () => void eseguiComando(comando),
  }
}

/** Tutto quel che la palette conosce: prima i posti, poi le cose da fare. */
function tutte (): Voce[] {
  return [...PAGINE.map(voceDiPagina), ...COMANDI_UI.map(voceDiComando)]
}

/** Quante righe si mostrano: oltre una decina non le legge più nessuno. */
const RIGHE = 10

let apertaOra: (() => void) | null = null

/**
 * Se la voce risponde a quel che si è scritto.
 *
 * Si cercano tutte le parole scritte, in qualunque ordine e in qualunque campo
 * — il nome, il gruppo, la spiegazione: chi scrive «csv voti» e chi scrive
 * «voti csv» vuole la stessa riga, e chi scrive «esporta» le vuole tutte.
 */
function corrisponde (voce: Voce, cercato: string): boolean {
  const pezzi = pezziDiRicerca(cercato)
  if (pezzi.length === 0) return true
  // `normalizzaTesto` e non `toLowerCase`: senza togliere accenti e
  // punteggiatura, «rifa» non trova «Chi li rifà» e «ed fisica» non trova
  // «ed. fisica». È la stessa regola con cui si cercano le persone e i piani —
  // due modi di cercare dentro lo stesso programma sono uno di troppo, e quello
  // che si porta dietro gli accenti è sempre il perdente: nessuno li batte
  // mentre cerca in fretta.
  return corrispondeAlla([voce.titolo, voce.sotto, voce.aiuto ?? ''].join(' '), pezzi)
}

/**
 * Quel che si può fare adesso viene prima.
 *
 * Non si nasconde il resto — «perché non posso esportare i voti?» è una
 * domanda che merita risposta anche qui, e la riga spenta la porta con sé — ma
 * si mette sotto: chi scrive tre lettere e preme Invio deve prendere una riga
 * che funziona.
 */
function trovati (cercato: string): Voce[] {
  const validi = tutte().filter((voce) => corrisponde(voce, cercato))
  const possibili = validi.filter((voce) => voce.impedito === null)
  const impediti = validi.filter((voce) => voce.impedito !== null)
  return [...possibili, ...impediti].slice(0, RIGHE)
}

export function apriPalette (): void {
  // Riaprirla mentre è aperta vuol dire chiuderla: è lo stesso tasto, ed è il
  // gesto con cui si esce da un ripensamento.
  if (apertaOra) {
    apertaOra()
    return
  }

  /*
   * Il campo e l'elenco sono una cosa sola, e adesso lo dichiarano.
   *
   * Era un `<input>` senza ruolo accanto a un `role="listbox"` pieno di
   * `<button role="option">`, e sono tre errori che si tengono. Un `option`
   * dentro un `button` non esiste — il ruolo nativo del bottone e quello
   * dichiarato litigano, e quel che arriva al lettore di schermo dipende da chi
   * lo legge. L'elenco non era legato a niente: si scriveva nel campo e le
   * righe cambiavano in silenzio. E la riga scelta con le frecce era scelta
   * solo per gli occhi, perché il fuoco non si muove mai da qui — `aria-selected`
   * dice *quale* ma non che il fuoco è suo.
   *
   * Il modello giusto è il `combobox` con il fuoco che resta nel campo:
   * `aria-controls` dice quale elenco, `aria-activedescendant` quale riga — ed
   * è l'unico modo di dirlo, visto che le frecce qui muovono la scelta e non il
   * fuoco. Le righe tornano `<div>`: un `option` non ha bisogno di essere un
   * bottone per rispondere al mouse, e smettendo di esserlo smette anche di
   * essere una fermata del Tab dentro una finestra che di fermate ne ha una.
   */
  const campo = h('input', {
    class: 'palette__campo',
    type: 'text',
    value: '',
    attr: {
      placeholder: 'Dove vuoi andare, o che cosa vuoi fare?',
      'aria-label': 'Cerca una pagina o un comando',
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-controls': 'palette-elenco',
      'aria-autocomplete': 'list',
      autocomplete: 'off',
      spellcheck: 'false',
    },
  })

  const elenco = h('div', {
    class: 'palette__elenco',
    attr: { role: 'listbox', id: 'palette-elenco', 'aria-label': 'Pagine e comandi' },
  })
  const riquadro = h(
    'div',
    { class: 'palette', attr: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Comandi' } },
    h('div', { class: 'palette__testa' }, icona('lente', 'icona--minuta'), campo),
    elenco,
  )
  const velo = h('div', { class: 'palette__velo' }, riquadro)

  let visibili: Voce[] = []
  let scelto = 0

  const chiudi = () => {
    if (apertaOra === null) return
    apertaOra = null
    velo.remove()
    document.removeEventListener('keydown', allaTastiera, true)
  }

  const disegna = () => {
    visibili = trovati(campo.value.trim())
    if (scelto >= visibili.length) scelto = Math.max(0, visibili.length - 1)
    elenco.replaceChildren(
      ...(visibili.length === 0
        ? [h('p', { class: 'palette__vuoto' }, 'Niente con questo nome.')]
        : visibili.map((voce, indice) => {
            const impedito = voce.impedito
            return h(
              'div',
              {
                class: [
                  'palette__voce',
                  indice === scelto && 'palette__voce--scelta',
                  impedito && 'palette__voce--impedita',
                ],
                attr: {
                  role: 'option',
                  id: `palette-voce-${indice}`,
                  'aria-selected': indice === scelto ? 'true' : 'false',
                },
                // `mousedown` e non `click`: il campo perde il fuoco prima del
                // clic, e con il fuoco se ne andrebbe la riga scelta.
                onmousedown: (evento: MouseEvent) => {
                  evento.preventDefault()
                  chiudi()
                  voce.al()
                },
              },
              icona(voce.simbolo),
              h(
                'span',
                { class: 'palette__testo' },
                h('span', { class: 'palette__titolo' }, voce.titolo),
                h('small', { class: 'palette__aiuto' }, impedito ?? voce.aiuto ?? voce.sotto),
              ),
              voce.scorciatoia ? h('kbd', null, voce.scorciatoia) : null,
            )
          })),
    )
    // Dopo aver ridisegnato, e non prima: l'id deve esistere nel documento nel
    // momento in cui il campo lo nomina, o il lettore di schermo non trova
    // niente e la riga scelta resta muta.
    const riga = visibili.length > 0 ? `palette-voce-${scelto}` : null
    if (riga) campo.setAttribute('aria-activedescendant', riga)
    else campo.removeAttribute('aria-activedescendant')

    // E dopo averlo detto, portarcela davvero.
    //
    // Il fuoco resta nel campo — è quel che permette di continuare a scrivere
    // mentre si scende con le frecce — quindi il browser non insegue la riga
    // scelta da sé: senza questa riga, su una finestra bassa l'evidenziatura
    // scende sotto la piega e si preme Invio alla cieca. `nearest` e non
    // `center`: muove il minimo indispensabile, e non fa saltare l'elenco a
    // ogni freccia. Lo stesso gesto di `shell/pages/dialog/`, che ha la stessa
    // forma — un campo che comanda un elenco che scorre.
    if (riga) elenco.children[scelto]?.scrollIntoView({ block: 'nearest' })
  }

  const allaTastiera = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      evento.stopPropagation()
      chiudi()
      return
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (visibili.length === 0) return
      const passo = evento.key === 'ArrowDown' ? 1 : -1
      // Gira: in fondo si ricomincia da capo, che è quel che fa ogni elenco di
      // dieci righe in cui si scende tenendo premuto.
      scelto = (scelto + passo + visibili.length) % visibili.length
      disegna()
      return
    }
    if (evento.key === 'Enter') {
      evento.preventDefault()
      const voce = visibili[scelto]
      if (!voce) return
      chiudi()
      voce.al()
    }
  }

  campo.addEventListener('input', () => {
    scelto = 0
    disegna()
  })
  velo.addEventListener('mousedown', (evento: MouseEvent) => {
    if (!riquadro.contains(evento.target as Node | null)) chiudi()
  })

  apertaOra = chiudi
  document.addEventListener('keydown', allaTastiera, true)
  document.body.appendChild(velo)
  disegna()
  campo.focus()
}
