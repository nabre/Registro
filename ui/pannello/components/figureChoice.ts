// Una scelta fra poche risposte, ognuna con la sua figura (tema, lingua): un
// gruppo radio (`role="radiogroup"`, una sola fermata del Tab, le frecce che
// scelgono). Non sa che cosa disegna (le figure arrivano da
// `views/settings/figures.ts`) e non salva: chiama `al(valore)`.

import { h, type Figlio } from '../dom.js'

interface SceltaConFigura {
  valore: string
  /** Il nome breve, sotto la figura: «Chiaro». */
  nome: string
  /** La frase che dice che cosa vuol dire sceglierla; vuota, non si mostra. */
  aiuto: string
  figura: Figlio
  /** Una riga in più, sotto l'aiuto: quel che la scelta sta facendo adesso. */
  nota?: Figlio
}

interface OpzioniSceltaFigurata {
  /** Il nome del campo: fa da radice per `data-fuoco` e per gli id. */
  nome: string
  /** Il nome del gruppo, per chi legge lo schermo: l'etichetta della voce. */
  etichetta: string
  valore: string
  scelte: readonly SceltaConFigura[]
  disabilitato?: boolean
  al: (valore: string) => void
}

/** Un id che regge qualunque chiave: `registroDocenti.aspetto.tema` ha i punti. */
function idDi (nome: string, valore: string, parte: string): string {
  return `figura-${nome}-${valore}-${parte}`.replace(/[^\w-]/g, '-') // testo-fisso: id dell’elemento, non si legge
}

/**
 * I tasti di un gruppo radio secondo ARIA: le frecce spostano e scelgono, Home
 * e Fine vanno agli estremi, dall'ultima si gira alla prima.
 */
function dove (tasto: string, attuale: number, quante: number): number | null {
  if (tasto === 'ArrowRight' || tasto === 'ArrowDown') return (attuale + 1) % quante
  if (tasto === 'ArrowLeft' || tasto === 'ArrowUp') return (attuale - 1 + quante) % quante
  if (tasto === 'Home') return 0
  if (tasto === 'End') return quante - 1
  return null
}

export function sceltaFigurata (opzioni: OpzioniSceltaFigurata): HTMLElement {
  const { nome, etichetta, scelte, disabilitato = false, al } = opzioni
  // Nessuna scelta combacia (un valore rifiutato dalla dogana): il Tab entra
  // dalla prima, se no il gruppo non si raggiunge.
  const scelta = scelte.findIndex((candidata) => candidata.valore === opzioni.valore)
  const entrata = scelta >= 0 ? scelta : 0

  const schede: HTMLButtonElement[] = []
  // La scelta di adesso tenuta qui: il valore salvato torna dopo un giro fino al
  // main process, e due frecce di fila devono partire tutte e due.
  let scelto = opzioni.valore

  /**
   * Accende una scheda subito, prima che torni il valore salvato: intanto deve
   * dirsi scelta e tenere il fuoco, dove `data-fuoco` lo ritrova al ridisegno.
   */
  const scegli = (indice: number): void => {
    if (disabilitato) return
    schede.forEach((scheda, i) => {
      scheda.setAttribute('aria-checked', i === indice ? 'true' : 'false')
      scheda.tabIndex = i === indice ? 0 : -1
    })
    schede[indice]?.focus()
    const valore = scelte[indice]?.valore
    if (valore === undefined || valore === scelto) return
    scelto = valore
    al(valore)
  }

  scelte.forEach((voce, indice) => {
    const accesa = indice === scelta
    const idNome = idDi(nome, voce.valore, 'nome')
    const idAiuto = idDi(nome, voce.valore, 'aiuto')
    const idNota = idDi(nome, voce.valore, 'nota')
    schede.push(h(
      'button',
      {
        type: 'button',
        class: 'scelta-figurata__voce',
        dataset: { fuoco: `${nome}=${voce.valore}` },
        attr: {
          role: 'radio',
          'aria-checked': accesa ? 'true' : 'false',
          'aria-labelledby': idNome,
          'aria-describedby': [voce.aiuto && idAiuto, voce.nota && idNota].filter(Boolean).join(' ') || null,
          'aria-disabled': disabilitato ? 'true' : null,
        },
        tabIndex: indice === entrata && !disabilitato ? 0 : -1,
        onclick: () => scegli(indice),
        onkeydown: (evento: KeyboardEvent) => {
          const prossima = dove(evento.key, indice, scelte.length)
          if (prossima === null) return
          evento.preventDefault()
          scegli(prossima)
        },
      },
      h('span', { class: 'scelta-figurata__figura', attr: { 'aria-hidden': 'true' } }, voce.figura),
      h(
        'span',
        { class: 'scelta-figurata__nome' },
        h('span', { class: 'scelta-figurata__segno', attr: { 'aria-hidden': 'true' } }),
        h('span', { id: idNome }, voce.nome),
      ),
      voce.aiuto ? h('span', { class: 'scelta-figurata__aiuto', id: idAiuto }, voce.aiuto) : null,
      voce.nota ? h('span', { class: 'scelta-figurata__nota', id: idNota }, voce.nota) : null,
    ))
  })

  return h(
    'div',
    {
      class: ['scelta-figurata', disabilitato && 'scelta-figurata--spenta'],
      attr: {
        role: 'radiogroup',
        'aria-label': etichetta,
        'aria-disabled': disabilitato ? 'true' : null,
      },
    },
    ...schede,
  )
}
