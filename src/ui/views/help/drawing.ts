// Il vocabolario delle figure della guida: poche funzioni con stessi raggi,
// frecce e bollini. Restituiscono testo SVG, non elementi (una prova in Node lo
// legge senza DOM). Nessun colore qui: ogni pezzo porta una classe `gd-…`, e i
// colori li mette `styles/help.css` con le variabili del tema.
// Misure in unità del `viewBox`, con larghezza di riferimento 640: a 640 la
// figura è a grandezza naturale e il corpo 12 si legge come la pagina.

import { tracciatoIcona, type NomeIcona } from '../../components/icons.js'

/** I toni: gli stessi nomi dei colori del tema, più `neutro`. */
export type Tono = 'neutro' | 'accento' | 'quieto' | 'positivo' | 'attenzione' | 'negativo' | 'informativo'

type Punto = readonly [number, number]
type Pezzo = string | false | null | undefined

/** I pezzi di una figura, in ordine: quel che viene dopo sta sopra. */
export function disegno (...pezzi: Pezzo[]): string {
  return pezzi.filter(Boolean).join('')
}

function esc (testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const n = (valore: number): string => String(Math.round(valore * 10) / 10)

// ------------------------------------------------------------------ il testo

type Corpo = 'titolo' | 'normale' | 'piccolo'

const ALTEZZA: Record<Corpo, number> = { titolo: 14, normale: 12, piccolo: 10.5 }

/**
 * Quanto è largo un testo, a occhio: 0,56 del corpo per lettera. Stima senza
 * DOM, per eccesso.
 */
export function larghezzaTesto (testo: string, corpo: Corpo = 'normale', macchina = false): number {
  // A macchina ogni lettera è più larga.
  return testo.length * ALTEZZA[corpo] * (macchina ? 0.62 : 0.56)
}

interface OpzioniTesto {
  tono?: Tono
  /** Dove sta `x`: all'inizio del testo (predefinito), al centro o alla fine. */
  ancora?: 'inizio' | 'centro' | 'fine'
  corpo?: Corpo
  forte?: boolean
  /** In carattere a macchina: per quel che si batte o si legge scritto così. */
  macchina?: boolean
}

/** Una riga di testo. `y` è la linea di base, come in SVG. */
export function testo (
  x: number,
  y: number,
  contenuto: string,
  opzioni: OpzioniTesto = {},
): string {
  const { tono = 'neutro', ancora = 'inizio', corpo = 'normale', forte = false, macchina = false } = opzioni
  const classi = [
    'gd-t',
    // testo-fisso: markup SVG e classi CSS, non si legge
    `gd-t--${tono}`,
    // testo-fisso: markup SVG e classi CSS, non si legge
    `gd-t--${corpo}`,
    forte && 'gd-t--forte',
    macchina && 'gd-t--macchina',
  ].filter(Boolean).join(' ')
  const anchor = ancora === 'centro' ? 'middle' : ancora === 'fine' ? 'end' : 'start'
  return `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" class="${classi}">${esc(contenuto)}</text>`
}

// ------------------------------------------------------------------ le forme

interface OpzioniRiquadro {
  tono?: Tono
  /** Il nome della cosa, al centro — o in alto, se c'è anche `sotto`. */
  etichetta?: string
  /** Una seconda riga, più piccola e quieta. */
  sotto?: string
  /** Bordo tratteggiato: una cosa che non c'è ancora, o che si può togliere. */
  tratteggio?: boolean
  /** Un'icona a sinistra dell'etichetta. */
  simbolo?: NomeIcona
  raggio?: number
  /** Allinea l'etichetta a sinistra, a 10 dal bordo, invece che al centro. */
  aSinistra?: boolean
}

/** Un riquadro: una pagina, una scheda, un campo, una cosa del registro. */
export function riquadro (
  x: number,
  y: number,
  l: number,
  a: number,
  opzioni: OpzioniRiquadro = {},
): string {
  const { tono = 'neutro', etichetta, sotto, tratteggio = false, simbolo: nome, raggio = 6, aSinistra = false } = opzioni
  // testo-fisso: markup SVG e classi CSS, non si legge
  const classi = ['gd-r', `gd-r--${tono}`, tratteggio && 'gd-r--tratteggio'].filter(Boolean).join(' ')
  const forma = `<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}" rx="${n(raggio)}" class="${classi}"/>`
  if (!etichetta) return forma
  const conIcona = nome !== undefined
  const larga = larghezzaTesto(etichetta, 'normale') + (conIcona ? 20 : 0)
  const inizio = aSinistra ? x + 10 : x + (l - larga) / 2
  const centro = y + a / 2
  const base = sotto ? centro - 2 : centro + 4
  const tonoTesto: Tono = tono === 'neutro' || tono === 'quieto' ? 'neutro' : tono
  return disegno(
    forma,
    conIcona && simbolo(nome, inizio, base - 12, 15, tonoTesto),
    testo(inizio + (conIcona ? 20 : 0), base, etichetta, { forte: true, tono: tonoTesto }),
    sotto && testo(aSinistra ? x + 10 : x + l / 2, centro + 13, sotto, {
      corpo: 'piccolo',
      tono: 'quieto',
      ancora: aSinistra ? 'inizio' : 'centro',
    }),
  )
}

/** Righe finte: il testo di una pagina che nello schema non conta leggere. */
export function righe (x: number, y: number, l: number, quante: number, passo = 10): string {
  let uscita = ''
  for (let i = 0; i < quante; i += 1) {
    // L'ultima riga è più corta, come l'ultima riga di un paragrafo.
    const lunga = i === quante - 1 && quante > 1 ? l * 0.6 : l
    uscita += `<rect x="${n(x)}" y="${n(y + i * passo)}" width="${n(lunga)}" height="4" rx="2" class="gd-riga"/>`
  }
  return uscita
}

/** Un'icona del registro, la stessa della barra laterale, a `dim` di lato. */
export function simbolo (nome: NomeIcona, x: number, y: number, dim = 16, tono: Tono = 'neutro'): string {
  const scala = dim / 24
  // testo-fisso: markup SVG e classi CSS, non si legge
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${Math.round(scala * 1000) / 1000})" class="gd-icona gd-icona--${tono}">${tracciatoIcona(nome)}</g>`
}

/**
 * Una freccia lungo una spezzata: dal primo punto all'ultimo, con la punta
 * sull'ultimo. Due punti fanno una freccia dritta; tre o più girano l'angolo.
 */
export function freccia (
  punti: readonly Punto[],
  opzioni: { tono?: Tono, tratteggio?: boolean, etichetta?: string, doppia?: boolean } = {},
): string {
  const { tono = 'quieto', tratteggio = false, etichetta, doppia = false } = opzioni
  if (punti.length < 2) return ''
  // testo-fisso: markup SVG e classi CSS, non si legge
  const classi = ['gd-f', `gd-f--${tono}`, tratteggio && 'gd-f--tratteggio'].filter(Boolean).join(' ')
  const linea = `<polyline points="${punti.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" class="${classi}"/>`
  const punta = (da: Punto, a: Punto): string => {
    const angolo = Math.atan2(a[1] - da[1], a[0] - da[0])
    const lato = 7
    const p1: Punto = [a[0] - lato * Math.cos(angolo - 0.45), a[1] - lato * Math.sin(angolo - 0.45)]
    const p2: Punto = [a[0] - lato * Math.cos(angolo + 0.45), a[1] - lato * Math.sin(angolo + 0.45)]
    // testo-fisso: markup SVG e classi CSS, non si legge
    return `<polygon points="${n(a[0])},${n(a[1])} ${n(p1[0])},${n(p1[1])} ${n(p2[0])},${n(p2[1])}" class="gd-punta gd-punta--${tono}"/>`
  }
  const ultimo = punti[punti.length - 1]
  const penultimo = punti[punti.length - 2]
  let scritta = ''
  if (etichetta) {
    // L'etichetta sta a metà del segmento più lungo, appena sopra.
    let migliore = 0
    let lunghezza = -1
    for (let i = 0; i < punti.length - 1; i += 1) {
      const d = Math.hypot(punti[i + 1][0] - punti[i][0], punti[i + 1][1] - punti[i][1])
      if (d > lunghezza) { lunghezza = d; migliore = i }
    }
    const mx = (punti[migliore][0] + punti[migliore + 1][0]) / 2
    const my = (punti[migliore][1] + punti[migliore + 1][1]) / 2
    scritta = testo(mx, my - 5, etichetta, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' })
  }
  return disegno(linea, punta(penultimo, ultimo), doppia && punta(punti[1], punti[0]), scritta)
}

/**
 * Un bollino numerato: indica un punto dello schema, e la `legenda` della
 * figura dice che cos'è. Il centro è in `x`, `y`.
 */
export function bollino (x: number, y: number, numero: number): string {
  // Il gruppo porta il numero: bollino e riga della legenda si accendono a vicenda.
  return disegno(
    `<g class="gd-bollino-gruppo" data-bollino="${numero}">`,
    `<circle cx="${n(x)}" cy="${n(y)}" r="9" class="gd-bollino"/>`,
    `<text x="${n(x)}" y="${n(y + 3.8)}" text-anchor="middle" class="gd-bollino-numero">${numero}</text>`,
    '</g>',
  )
}

/**
 * Il colore di una sigla dell'appello, uguale in tutte le figure; quel che
 * manca prende il ripiego della figura.
 */
export const TONI_SIGLA: Readonly<Record<string, Tono>> = {
  P: 'positivo',
  X: 'negativo',
  R: 'attenzione',
  E: 'informativo',
}

/** Un pulsante disegnato: un riquadro basso con il nome in piccolo al centro. */
export function tastino (x: number, y: number, l: number, nome: string, tono: Tono = 'neutro'): string {
  return disegno(
    riquadro(x, y, l, 20, { tono, raggio: 4 }),
    testo(x + l / 2, y + 13.5, nome, { corpo: 'piccolo', ancora: 'centro', tono }),
  )
}

/** Una pastiglia: uno stato, un conto, un'etichetta colorata. `x`, `y` è l'angolo in alto a sinistra. */
export function pastiglia (x: number, y: number, contenuto: string, tono: Tono = 'accento'): string {
  const l = larghezzaTesto(contenuto, 'piccolo') + 14
  return disegno(
    // testo-fisso: markup SVG e classi CSS, non si legge
    `<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="18" rx="9" class="gd-pastiglia gd-pastiglia--${tono}"/>`,
    testo(x + l / 2, y + 12.5, contenuto, { corpo: 'piccolo', ancora: 'centro', tono, forte: true }),
  )
}

/** Un tasto della tastiera. `x`, `y` è l'angolo in alto a sinistra; restituisce anche quanto è largo. */
export function tasto (x: number, y: number, nome: string): string {
  const l = larghezzaTasto(nome)
  return disegno(
    `<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="22" rx="4" class="gd-tasto"/>`,
    testo(x + l / 2, y + 15, nome, { corpo: 'piccolo', ancora: 'centro', macchina: true }),
  )
}

/** Quanto è largo `tasto(…, nome)`: per metterne due di fila. */
export function larghezzaTasto (nome: string): number {
  return Math.max(24, larghezzaTesto(nome, 'piccolo', true) + 14)
}

/**
 * Una combinazione di tasti di fila — `Ctrl`, `+`, `K` — a partire da `x`.
 * `combinazione` si scrive come nelle voci: `Ctrl+Shift+P`.
 */
export function tasti (x: number, y: number, combinazione: string): string {
  let cursore = x
  let uscita = ''
  combinazione.split(/\+(?=.)/).forEach((nome, indice) => {
    if (indice > 0) {
      uscita += testo(cursore + 5, y + 15, '+', { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' })
      cursore += 10
    }
    uscita += tasto(cursore, y, nome)
    cursore += larghezzaTasto(nome)
  })
  return uscita
}

// ------------------------------------------------------------ le composizioni

/** Un passo di `catena`: una parola sola, o un riquadro con tutto. */
interface PassoCatena {
  etichetta: string
  sotto?: string
  tono?: Tono
  simbolo?: NomeIcona
}

/**
 * Una catena di passi da sinistra a destra, uniti da frecce: il modo più
 * corto di disegnare «prima questo, poi quello».
 */
export function catena (
  x: number,
  y: number,
  passi: readonly (string | PassoCatena)[],
  opzioni: { largo?: number, alto?: number, stacco?: number, tono?: Tono } = {},
): string {
  const { largo = 110, alto = 40, stacco = 28, tono = 'neutro' } = opzioni
  return disegno(
    ...passi.map((passo, indice) => {
      const voce = typeof passo === 'string' ? { etichetta: passo } : passo
      const sx = x + indice * (largo + stacco)
      return disegno(
        riquadro(sx, y, largo, alto, { ...voce, tono: voce.tono ?? tono }),
        indice < passi.length - 1 &&
          freccia([[sx + largo + 3, y + alto / 2], [sx + largo + stacco - 3, y + alto / 2]]),
      )
    }),
  )
}

/** Le quattro zone della finestra del registro. */
type ZonaTelaio = 'titolo' | 'laterale' | 'area' | 'stato'

/** Un rettangolo: angolo in alto a sinistra, larghezza, altezza. */
interface Zona { x: number, y: number, l: number, a: number }

/** Dove sta ogni zona del telaio disegnato da `telaio(x, y, l, a)`. */
export function zoneTelaio (x: number, y: number, l: number, a: number): Record<ZonaTelaio, Zona> {
  const titolo = 22
  const stato = 18
  const laterale = Math.min(130, l * 0.24)
  return {
    titolo: { x, y, l, a: titolo },
    laterale: { x, y: y + titolo, l: laterale, a: a - titolo - stato },
    area: { x: x + laterale, y: y + titolo, l: l - laterale, a: a - titolo - stato },
    stato: { x, y: y + a - stato, l, a: stato },
  }
}

/**
 * La finestra del registro vista dall'alto: barra del titolo, barra laterale,
 * area della pagina, barra di stato; le zone in `evidenzia` si colorano
 * d'accento. Il contenuto dell'area si disegna a parte con `zoneTelaio(…).area`.
 */
export function telaio (
  x: number,
  y: number,
  l: number,
  a: number,
  opzioni: {
    evidenzia?: readonly ZonaTelaio[]
    /** Il testo nella barra del titolo: il nome dell'anno aperto. */
    titolo?: string
    /** Le voci della barra laterale, dall'alto. */
    laterali?: readonly string[]
    /** Quale voce laterale è scelta, contando da 0. */
    scelta?: number
    /** Il testo nella barra di stato. */
    stato?: string
  } = {},
): string {
  const { evidenzia = [], titolo = '2026-2027.regi', laterali = [], scelta, stato } = opzioni
  const z = zoneTelaio(x, y, l, a)
  const tono = (zona: ZonaTelaio): Tono => (evidenzia.includes(zona) ? 'accento' : 'quieto')
  return disegno(
    `<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}" rx="8" class="gd-telaio"/>`,
    // testo-fisso: markup SVG e classi CSS, non si legge
    `<rect x="${n(z.titolo.x)}" y="${n(z.titolo.y)}" width="${n(z.titolo.l)}" height="${n(z.titolo.a)}" rx="8" class="gd-zona gd-zona--${tono('titolo')}"/>`,
    testo(x + 12, y + 15, titolo, { corpo: 'piccolo', tono: tono('titolo') === 'accento' ? 'accento' : 'quieto' }),
    // I tre pulsanti della finestra, in alto a destra.
    `<path d="M${n(x + l - 50)} ${n(y + 11)}h8M${n(x + l - 32)} ${n(y + 7)}h7v7h-7zM${n(x + l - 16)} ${n(y + 7)}l7 7M${n(x + l - 9)} ${n(y + 7)}l-7 7" class="gd-f gd-f--quieto"/>`,
    // testo-fisso: markup SVG e classi CSS, non si legge
    `<rect x="${n(z.laterale.x)}" y="${n(z.laterale.y)}" width="${n(z.laterale.l)}" height="${n(z.laterale.a)}" class="gd-zona gd-zona--${tono('laterale')}"/>`,
    ...laterali.map((voce, indice) => {
      const vy = z.laterale.y + 10 + indice * 20
      if (vy + 16 > z.laterale.y + z.laterale.a) return ''
      // La voce scelta è una pillola, col nome in testo pieno: come la barra vera.
      return disegno(
        indice === scelta &&
          `<rect x="${n(z.laterale.x + 5)}" y="${n(vy)}" width="${n(z.laterale.l - 10)}" height="17" rx="8.5" class="gd-r gd-r--accento"/>`,
        testo(z.laterale.x + 12, vy + 12.5, voce, { corpo: 'piccolo', tono: 'neutro', forte: indice === scelta }),
      )
    }),
    evidenzia.includes('area') &&
      // testo-fisso: markup SVG e classi CSS, non si legge
      `<rect x="${n(z.area.x + 2)}" y="${n(z.area.y + 2)}" width="${n(z.area.l - 4)}" height="${n(z.area.a - 4)}" rx="4" class="gd-r gd-r--accento gd-r--tratteggio"/>`,
    // testo-fisso: markup SVG e classi CSS, non si legge
    `<rect x="${n(z.stato.x)}" y="${n(z.stato.y)}" width="${n(z.stato.l)}" height="${n(z.stato.a)}" rx="8" class="gd-zona gd-zona--${tono('stato')}"/>`,
    stato && testo(x + 12, z.stato.y + 12.5, stato, { corpo: 'piccolo', tono: tono('stato') === 'accento' ? 'accento' : 'quieto' }),
  )
}

/**
 * Una linea del tempo orizzontale, con tacche e nomi: per le cose che
 * succedono in un ordine — un anno scolastico, un periodo, una giornata.
 */
export function lineaTempo (
  x: number,
  y: number,
  l: number,
  tacche: readonly { dove: number, nome: string, tono?: Tono }[],
): string {
  return disegno(
    freccia([[x, y], [x + l, y]], { tono: 'quieto' }),
    ...tacche.map(({ dove, nome, tono = 'neutro' }) => {
      const tx = x + dove * (l - 10)
      return disegno(
        // testo-fisso: markup SVG e classi CSS, non si legge
        `<line x1="${n(tx)}" y1="${n(y - 5)}" x2="${n(tx)}" y2="${n(y + 5)}" class="gd-f gd-f--${tono === 'neutro' ? 'quieto' : tono}"/>`,
        testo(tx, y + 20, nome, { corpo: 'piccolo', ancora: 'centro', tono }),
      )
    }),
  )
}
