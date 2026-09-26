// Da un modello e dai suoi dati a un PDF. Qui non si sa niente di lezioni o
// allievi: si disegnano blocchi già risolti (il *che cosa* sta nel modello e in
// `domain/reportData.ts`). Si impagina in una passata sola dall'alto: se un
// blocco non ci sta si volta pagina, senza ricalcoli all'indietro.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from '@cantoo/pdf-lib'

import {
  cellaFissa,
  componiCorpo,
  leggiCampi,
  leggiRichiestaCampi,
  leggiImmagine,
  leggiRichiestaGalleria,
  misureTabella,
  riempi,
  type Blocco,
  type Corpi,
  type DatiRapporto,
  type Galleria,
  type Modello,
  type TipoBlocco,
  type Grafico,
  type ImmagineModello,
  type RigaFissa,
  type Stile,
  type Tabella,
} from '../domain/reports.js'

/** Un millimetro in punti tipografici: i margini si misurano su un foglio vero. */
const MM = 2.834645

/**
 * I corpi del modello (`_stile.tpl` o `corpo:`), moltiplicati per la scala una
 * volta sola, così nessun punto se la dimentica.
 */
function corpiDi (stile: Stile): Corpi {
  const scala = stile.scala
  return {
    titolo: stile.corpi.titolo * scala,
    sottotitolo: stile.corpi.sottotitolo * scala,
    sezione: stile.corpi.sezione * scala,
    testo: stile.corpi.testo * scala,
    piccolo: stile.corpi.piccolo * scala,
    banda: stile.corpi.banda * scala,
  }
}

/**
 * Le quote di testata e piede, dal loro corpo. Un posto solo perché `componiPdf`
 * (spazio da riservare) e `fissi` (disegno) devono dare lo stesso conto.
 */
function quoteBanda (corpo: number): {
  stacco: number
  filo: number
  interlinea: number
} {
  return { stacco: corpo * 1.75, filo: corpo, interlinea: corpo * 1.3 }
}

/**
 * Le righe di una banda con qualcosa da dire: una di soli segnaposto vuoti
 * sparisce. Si guardano i valori del rapporto, non `{{pagina}}` che c'è sempre.
 */
function righeVive (
  righe: RigaFissa[],
  valori: Record<string, string>,
  frasi: Record<string, string>,
): RigaFissa[] {
  return righe.filter((riga) =>
    [riga.sinistra, riga.centro, riga.destra].some((cella) => {
      // Senza il grassetto: `**{{titolo}}**` vuoto è vuoto.
      const { testo: pezzo } = cellaFissa(cella)
      return riempi(pezzo, valori, frasi).trim() !== '' || (pezzo.trim() !== '' && !pezzo.includes('{{'))
    }),
  )
}

/** Quanto è alta una banda: le sue righe, la sua immagine, un minimo. */
function altezzaBanda (
  corpo: number,
  quante: number,
  altaImmagine: number,
): number {
  if (quante === 0 && altaImmagine === 0) return 0
  const { stacco, interlinea } = quoteBanda(corpo)
  const testo = quante === 0 ? 0 : stacco + (quante - 1) * interlinea + corpo * 0.9
  return Math.max(22, corpo * 2.75, testo, altaImmagine + corpo + 4)
}

const NERO = rgb(0.1, 0.1, 0.12)
/**
 * Il grigio: per i fili, non per il testo, che in stampa sbiadirebbe. Le
 * gerarchie si fanno con corpo e grassetto.
 */
const QUIETO = rgb(0.42, 0.44, 0.48)
const FILO = rgb(0.78, 0.79, 0.82)
const FONDO_INTESTAZIONE = rgb(0.94, 0.95, 0.96)
// Gli stessi verde e rosso delle pastiglie a schermo.
const BUONO = rgb(0.16, 0.51, 0.31)
const BRUTTO = rgb(0.71, 0.21, 0.21)
const NEUTRO = rgb(0.55, 0.57, 0.62)

/**
 * I caratteri fuori dal Latin-1 dei font di serie (Helvetica), con l'equivalente
 * ASCII: trattini lunghi, apostrofi curvi, spunte. ¼ ½ ¾ sono Latin-1 e restano.
 */
const SOSTITUZIONI: Array<[RegExp, string]> = [
  // I trattini tipografici, usati negli orari e fra i nomi.
  [/[\u2010-\u2015\u2212]/g, '-'],
  [/[\u2018\u2019\u201b]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
  [/\u2026/g, '...'],
  // La spunta della scaletta e il pallino degli elenchi: fuori da Latin-1.
  [/\u2713/g, 'x'],
  [/\u2022/g, '-'],
  // Gli spazi che non sono lo spazio: unificatore, sottile, a larghezza zero.
  [/[\u2000-\u200b\u202f\u205f\u3000]/g, ' '],
]

function sanifica (testo: string): string {
  let esito = testo
  for (const [cerca, con] of SOSTITUZIONI) esito = esito.replace(cerca, con)
  // Il resto fuori dal Latin-1 diventa «?»: si vede che manca qualcosa.
  return esito.replace(/[^\u0000-\u00ff]/g, '?')
}

interface Penna {
  pdf: PDFDocument
  normale: PDFFont
  grassetto: PDFFont
  pagine: PDFPage[]
  pagina: PDFPage
  y: number
  larghezza: number
  altezza: number
  sinistra: number
  destra: number
  alto: number
  basso: number
  /** Le misure del foglio, dal modello: corpi, interlinea, regola delle colonne. */
  stile: Stile
  /** I corpi già scalati: si leggono qui e non si ricalcolano a ogni scritta. */
  corpi: Corpi
  /** Le immagini già incorporate, per nome di file. */
  immagini: Map<string, PDFImage>
  /**
   * Lo spazio che un'immagine affiancata si tiene sul fianco; sotto `fino` la
   * larghezza torna intera.
   */
  riserva: { larghezza: number, fino: number } | null
  /** Che cosa si è disegnato per ultimo: decide quanta aria lasciare prima del prossimo. */
  ultimo: TipoBlocco | null
  /** Dove cominciano i valori di ogni `campi:` del foglio: uno per tutti. */
  tabulatore: number
}

/** I byte di un'immagine chiesta dal modello: li fornisce chi compone, qui non si sa dove stanno i file. */
type CaricaImmagine = (nome: string) => Promise<Uint8Array | null>

/** Le parole spezzate in righe che stanno nella larghezza data. */
function aCapo (
  testo: string,
  font: PDFFont,
  corpo: number,
  larghezza: number,
): string[] {
  const righe: string[] = []
  for (const paragrafo of sanifica(testo).split('\n')) {
    let corrente = ''
    for (const parola of paragrafo.split(/\s+/)) {
      if (parola === '') continue
      const tentativo = corrente ? `${corrente} ${parola}` : parola
      if (font.widthOfTextAtSize(tentativo, corpo) <= larghezza || corrente === '') {
        corrente = tentativo
        continue
      }
      righe.push(corrente)
      corrente = parola
    }
    righe.push(corrente)
  }
  return righe
}

/** Il testo accorciato con i puntini se non sta: nelle tabelle non si va a capo. */
function tronca (testo: string, font: PDFFont, corpo: number, larghezza: number): string {
  const pulito = sanifica(testo)
  if (font.widthOfTextAtSize(pulito, corpo) <= larghezza) return pulito
  let taglio = pulito
  while (taglio.length > 1 && font.widthOfTextAtSize(`${taglio}...`, corpo) > larghezza) {
    taglio = taglio.slice(0, -1)
  }
  return `${taglio}...`
}

function nuovaPagina (penna: Penna): void {
  const pagina = penna.pdf.addPage([penna.larghezza, penna.altezza])
  penna.pagine.push(pagina)
  penna.pagina = pagina
  penna.y = penna.altezza - penna.alto
  // Pagina nuova: niente immagine affiancata, niente stacco dal blocco prima.
  penna.riserva = null
  penna.ultimo = null
}

/** Fa spazio per `quanto`, voltando pagina se non ce n'è più. */
function spazio (penna: Penna, quanto: number): void {
  if (penna.y - quanto < penna.basso) nuovaPagina(penna)
  penna.y -= quanto
}

/**
 * Chiude la fascia di un'immagine affiancata, scendendo sotto di lei. La
 * chiamano filo e sezione: un modello scrive un filo per tornare a riga intera.
 */
function chiudiRiserva (penna: Penna): void {
  if (!penna.riserva) return
  if (penna.y > penna.riserva.fino) penna.y = penna.riserva.fino
  penna.riserva = null
}

function scrivi (
  penna: Penna,
  testo: string,
  opzioni: { corpo: number, font?: PDFFont, colore?: ReturnType<typeof rgb>, x?: number },
): void {
  penna.pagina.drawText(sanifica(testo), {
    x: opzioni.x ?? penna.sinistra,
    y: penna.y,
    size: opzioni.corpo,
    font: opzioni.font ?? penna.normale,
    color: opzioni.colore ?? NERO,
  })
}

function larghezzaUtile (penna: Penna): number {
  const tutta = penna.larghezza - penna.sinistra - penna.destra
  const riserva = penna.riserva
  // Colonna stretta solo accanto all'immagine, poi riga intera.
  return riserva && penna.y > riserva.fino ? tutta - riserva.larghezza : tutta
}

/** Un paragrafo che va a capo da sé, e volta pagina quando finisce il foglio. */
function paragrafo (penna: Penna, testo: string, corpo: number, colore = NERO): void {
  const righe = aCapo(testo, penna.normale, corpo, larghezzaUtile(penna))
  for (const riga of righe) {
    spazio(penna, corpo * 1.35)
    scrivi(penna, riga, { corpo, colore })
  }
}

/** Il margine del testo dentro una cella, ai due lati: meno e le colonne si leggono attaccate. */
const RESPIRO = 3.5

/** Quanto sotto la scrittura passa il filo di una riga: comune a fili orizzontali e verticali. */
function piedeRiga (corpo: number): number {
  return corpo * 0.5
}

/**
 * I fili verticali di una riga, bordi compresi. Riga per riga perché una
 * tabella si può spezzare fra le pagine.
 */
function filiVerticali (penna: Penna, misure: number[], base: number, altezzaRiga: number): void {
  const cima = base + altezzaRiga
  let x = penna.sinistra
  // Un filo in più delle colonne: i due bordi esterni.
  for (let i = 0; i <= misure.length; i += 1) {
    penna.pagina.drawLine({
      start: { x, y: base },
      end: { x, y: cima },
      thickness: 0.4,
      color: FILO,
    })
    x += misure[i] ?? 0
  }
}

/**
 * Una tabella a griglia chiusa, con l'intestazione ripetuta a ogni pagina.
 */
function tabella (penna: Penna, dati: Tabella): void {
  const larghezza = larghezzaUtile(penna)
  // Larghezze e corpo li decide il dominio misurando con il font; il corpo può
  // scendere perché una tabella larga ci stia senza troncare i nomi.
  const { misure, corpo } = misureTabella(
    dati,
    larghezza,
    penna.stile,
    (testo, misura, grassetto) =>
      (grassetto ? penna.grassetto : penna.normale).widthOfTextAtSize(sanifica(testo), misura),
  )
  const altezzaRiga = corpo * penna.stile.interlinea
  const piede = piedeRiga(corpo)

  const filoOrizzontale = (y: number) => {
    penna.pagina.drawLine({
      start: { x: penna.sinistra, y },
      end: { x: penna.sinistra + larghezza, y },
      thickness: 0.4,
      color: FILO,
    })
  }

  const intestazione = () => {
    spazio(penna, altezzaRiga)
    penna.pagina.drawRectangle({
      x: penna.sinistra,
      y: penna.y - corpo * 0.45,
      width: larghezza,
      height: altezzaRiga,
      color: FONDO_INTESTAZIONE,
    })
    // Il filo sopra l'intestazione chiude la griglia in alto.
    filoOrizzontale(penna.y - piede + altezzaRiga)
    filiVerticali(penna, misure, penna.y - piede, altezzaRiga)
    filoOrizzontale(penna.y - piede)
    let x = penna.sinistra
    dati.intestazione.forEach((cella, i) => {
      scrivi(penna, tronca(cella, penna.grassetto, corpo, misure[i] - RESPIRO * 2), {
        corpo,
        font: penna.grassetto,
        x: x + RESPIRO,
      })
      x += misure[i]
    })
  }

  intestazione()
  for (const riga of dati.righe) {
    // Voltando pagina l'intestazione si ripete.
    if (penna.y - altezzaRiga < penna.basso) {
      nuovaPagina(penna)
      intestazione()
    }
    spazio(penna, altezzaRiga)
    let x = penna.sinistra
    riga.forEach((cella, i) => {
      const quanto = misure[i] ?? misure[misure.length - 1]
      scrivi(penna, tronca(cella ?? '', penna.normale, corpo, quanto - RESPIRO * 2), {
        corpo,
        x: x + RESPIRO,
      })
      x += quanto
    })
    filiVerticali(penna, misure, penna.y - piede, altezzaRiga)
    filoOrizzontale(penna.y - piede)
  }

  if (!dati.totale) return

  // Il totale in grassetto con un filo marcato sopra, per non contarlo come una riga.
  if (penna.y - altezzaRiga < penna.basso) {
    nuovaPagina(penna)
    intestazione()
  }
  spazio(penna, altezzaRiga)
  penna.pagina.drawLine({
    start: { x: penna.sinistra, y: penna.y - piede + altezzaRiga },
    end: { x: penna.sinistra + larghezza, y: penna.y - piede + altezzaRiga },
    thickness: 0.9,
    color: NERO,
  })
  let x = penna.sinistra
  dati.totale.forEach((cella, i) => {
    const quanto = misure[i] ?? misure[misure.length - 1]
    scrivi(penna, tronca(cella ?? '', penna.grassetto, corpo, quanto - RESPIRO * 2), {
      corpo,
      font: penna.grassetto,
      x: x + RESPIRO,
    })
    x += quanto
  })
  filiVerticali(penna, misure, penna.y - piede, altezzaRiga)
  filoOrizzontale(penna.y - piede)
}

/**
 * Una distribuzione a punti sopra un asse: un punto per voto al suo valore
 * esatto, impilato se si ripete, con il segno della media. La sufficienza la
 * dice il colore dei punti.
 */
function grafico (penna: Penna, dati: Grafico): void {
  const larghezza = larghezzaUtile(penna)
  const RAGGIO = 3.1
  const PASSO = RAGGIO * 2 + 1.6
  const PIEDE = penna.corpi.piccolo * 2.4

  const alta = Math.max(...dati.punti.map((p) => p.quanti), 1)
  const segni = dati.segni ?? []
  // Una riga di etichetta per segno: due segni sullo stesso valore si coprirebbero.
  const RIGA = penna.corpi.piccolo * 1.35
  // Altezza minima: con pile basse la riga della media non si vedrebbe.
  const alto = Math.max(alta, 4) * PASSO + 6
  const altezza = alto + segni.length * RIGA

  const campo = dati.a - dati.da
  const dove = (valore: number) =>
    penna.sinistra + (campo > 0 ? ((valore - dati.da) / campo) * larghezza : larghezza / 2)

  // Tutto sulla stessa pagina.
  spazio(penna, altezza + PIEDE + 6)
  const base = penna.y + PIEDE

  // I segni verticali per primi: passano dietro ai punti, non sopra.
  segni.forEach((segno, i) => {
    const x = dove(segno.valore)
    penna.pagina.drawLine({
      start: { x, y: base },
      end: { x, y: base + alto },
      thickness: 0.7,
      // Più scuro del filo delle tabelle: è il riferimento del disegno.
      color: QUIETO,
      dashArray: [2, 2],
    })
    const etichetta = sanifica(segno.etichetta)
    const quanto = penna.normale.widthOfTextAtSize(etichetta, penna.corpi.piccolo)
    // L'etichetta resta dentro il foglio anche vicino al bordo.
    const sinistra = Math.min(
      Math.max(x - quanto / 2, penna.sinistra),
      penna.sinistra + larghezza - quanto,
    )
    penna.pagina.drawText(etichetta, {
      x: sinistra,
      y: base + alto + i * RIGA + 2,
      size: penna.corpi.piccolo,
      font: penna.normale,
      color: NERO,
    })
  })

  // L'asse.
  penna.pagina.drawLine({
    start: { x: penna.sinistra, y: base },
    end: { x: penna.sinistra + larghezza, y: base },
    thickness: 0.6,
    color: FILO,
  })

  // Le lineette del quarto: più corte e senza numero, per non affollare l'asse.
  for (const tacchetta of dati.tacchette ?? []) {
    const x = dove(tacchetta)
    penna.pagina.drawLine({
      start: { x, y: base },
      end: { x, y: base - 1.3 },
      thickness: 0.5,
      color: FILO,
    })
  }

  for (const tacca of dati.tacche) {
    const x = dove(tacca)
    penna.pagina.drawLine({
      start: { x, y: base },
      end: { x, y: base - 2.5 },
      thickness: 0.6,
      color: FILO,
    })
    const etichetta = sanifica(formattaNumero(tacca))
    // Anche agli estremi l'etichetta resta dentro il margine.
    const quanto = penna.normale.widthOfTextAtSize(etichetta, penna.corpi.piccolo)
    penna.pagina.drawText(etichetta, {
      x: Math.min(
        Math.max(x - quanto / 2, penna.sinistra),
        penna.sinistra + larghezza - quanto,
      ),
      y: base - penna.corpi.piccolo * 1.4,
      size: penna.corpi.piccolo,
      font: penna.normale,
      color: NERO,
    })
  }

  for (const punto of dati.punti) {
    const x = dove(punto.valore)
    const colore =
      dati.soglia === undefined ? NEUTRO : punto.valore >= dati.soglia ? BUONO : BRUTTO
    for (let i = 0; i < punto.quanti; i += 1) {
      penna.pagina.drawCircle({
        x,
        y: base + RAGGIO + 1.5 + i * PASSO,
        size: RAGGIO,
        color: colore,
      })
    }
  }

  if (dati.unita) {
    penna.pagina.drawText(sanifica(dati.unita), {
      x: penna.sinistra,
      y: base - penna.corpi.piccolo * 2.6,
      size: penna.corpi.piccolo,
      font: penna.normale,
      color: NERO,
    })
  }
}

/** Un numero come si scrive su un asse: senza zeri inutili in coda. */
function formattaNumero (valore: number): string {
  return String(Math.round(valore * 100) / 100)
}

/** Un'etichetta come si scrive davanti al suo valore, o niente se non c'è. */
function conDuePunti (etichetta: string): string {
  return etichetta ? `${etichetta}:` : ''
}

/**
 * Dove cominciano i valori di tutti i `campi:` del rapporto: uno solo, così i
 * gruppi restano allineati. Tetto al 30% del foglio: un'etichetta più lunga si
 * accorcia lei.
 */
function tabulatore (penna: Penna, corpo: Blocco[]): number {
  const misura = penna.corpi.testo
  const larghezza = penna.larghezza - penna.sinistra - penna.destra
  let piu = 0
  for (const blocco of corpo) {
    if (blocco.tipo !== 'campi') continue
    for (const voce of leggiRichiestaCampi(blocco.valore).voci) {
      piu = Math.max(
        piu,
        penna.normale.widthOfTextAtSize(sanifica(conDuePunti(voce.etichetta)), misura),
      )
    }
  }
  return Math.min(piu, larghezza * 0.3)
}

/**
 * Le coppie etichetta/valore, con i valori al tabulatore del foglio. Se la
 * colonna è stretta (più colonne, immagine accanto) il tabulatore si stringe.
 */
function campi (penna: Penna, valore: string): void {
  const { voci, colonne } = leggiRichiestaCampi(valore)
  if (voci.length === 0) return

  const larghezza = larghezzaUtile(penna)
  const corpo = penna.corpi.testo
  const colonna = larghezza / colonne
  const stacco = 6
  const etichette = Math.min(penna.tabulatore, colonna * 0.55)
  const perValore = colonna - etichette - stacco - 4

  for (let i = 0; i < voci.length; i += colonne) {
    spazio(penna, corpo * 1.5)
    for (let j = 0; j < colonne; j += 1) {
      const campo = voci[i + j]
      if (!campo) continue
      const x = penna.sinistra + j * colonna
      scrivi(penna, tronca(conDuePunti(campo.etichetta), penna.normale, corpo, etichette), {
        corpo,
        x,
      })
      scrivi(penna, tronca(campo.valore, penna.normale, corpo, perValore), {
        corpo,
        x: x + etichette + stacco,
      })
    }
  }
}

/**
 * Un avviso da non saltare: testo in grassetto a capo da sé, dentro un bordo
 * marcato. Nero, perché le stampanti spesso sono in bianco e nero.
 */
function avviso (penna: Penna, valore: string): void {
  const corpo = penna.corpi.testo
  const respiro = 7
  const larghezza = larghezzaUtile(penna)
  const righe = aCapo(valore, penna.grassetto, corpo, larghezza - respiro * 2 - 4)
  const alta = respiro * 2 + righe.length * corpo * 1.35

  spazio(penna, alta)
  penna.pagina.drawRectangle({
    x: penna.sinistra,
    y: penna.y,
    width: larghezza,
    height: alta,
    borderColor: NERO,
    borderWidth: 1.2,
  })
  righe.forEach((riga, i) => {
    penna.pagina.drawText(sanifica(riga), {
      x: penna.sinistra + respiro,
      y: penna.y + alta - respiro - corpo * (i + 1) + corpo * 0.25,
      size: corpo,
      font: penna.grassetto,
      color: NERO,
    })
  })
}

/**
 * Un riquadro in evidenza per il numero che conta (la nota di fine semestre):
 * etichetta piccola, valore grande. Più coppie stanno affiancate a colonne uguali.
 */
function riquadro (penna: Penna, valore: string): void {
  const voci = leggiCampi(valore)
  if (voci.length === 0) return

  const larghezza = larghezzaUtile(penna)
  const etichetta = penna.corpi.piccolo
  const grande = penna.corpi.titolo
  const respiro = 8
  const alta = respiro + etichetta * 1.5 + grande + respiro

  spazio(penna, alta + 6)
  penna.pagina.drawRectangle({
    x: penna.sinistra,
    y: penna.y,
    width: larghezza,
    height: alta,
    color: FONDO_INTESTAZIONE,
    borderColor: FILO,
    borderWidth: 0.6,
  })

  const colonna = larghezza / voci.length
  voci.forEach((voce, i) => {
    const x = penna.sinistra + i * colonna + respiro
    const largo = colonna - respiro * 2
    penna.pagina.drawText(tronca(voce.etichetta, penna.normale, etichetta, largo), {
      x,
      y: penna.y + alta - respiro - etichetta,
      size: etichetta,
      font: penna.normale,
      color: NERO,
    })
    penna.pagina.drawText(tronca(voce.valore, penna.grassetto, grande, largo), {
      x,
      y: penna.y + respiro,
      size: grande,
      font: penna.grassetto,
      color: NERO,
    })
  })
}

/**
 * Le immagini incorporate nel PDF, per nome di file: una volta sola, anche se
 * il logo ricompare su ogni pagina.
 */
type Incorporate = Map<string, PDFImage>

/**
 * Carica e incorpora le immagini che il modello nomina. Quelle mancanti o
 * illeggibili si saltano: il rapporto esce lo stesso.
 */
async function incorpora (
  pdf: PDFDocument,
  nomi: string[],
  carica: CaricaImmagine | undefined,
): Promise<Incorporate> {
  const esito: Incorporate = new Map()
  if (!carica) return esito

  for (const nome of [...new Set(nomi)]) {
    let byte: Uint8Array | null = null
    try {
      byte = await carica(nome)
    } catch {
      byte = null
    }
    if (!byte || byte.length === 0) continue
    try {
      // PNG o JPEG dai primi byte: l'estensione può mentire.
      const png = byte[0] === 0x89 && byte[1] === 0x50
      esito.set(nome, png ? await pdf.embedPng(byte) : await pdf.embedJpg(byte))
    } catch {
      // Non è né PNG né JPEG, o è rotta.
    }
  }
  return esito
}

/**
 * Un'immagine nel corpo. Con `accanto` occupa solo un fianco e quel che segue
 * si scrive nella colonna che resta (il ritratto accanto ai recapiti).
 */
function immagine (penna: Penna, valore: string): void {
  const chiesta = leggiImmagine(valore)
  const incorporata = chiesta ? penna.immagini.get(chiesta.file) : undefined
  if (!chiesta || !incorporata) return

  const alta = chiesta.altezza * MM
  const larga = incorporata.width * (alta / incorporata.height)
  const utile = larghezzaUtile(penna)
  // Più larga del foglio: si rimpicciolisce tenendo le proporzioni.
  const scala = larga > utile ? utile / larga : 1
  const altaVera = alta * scala
  const largaVera = larga * scala

  if (chiesta.accanto) {
    // Intera su questa pagina, o sulla prossima.
    if (penna.y - altaVera - 6 < penna.basso) nuovaPagina(penna)
    // Non si scende: l'immagine occupa il fianco, non la fascia.
    const piede = penna.y - altaVera
    penna.pagina.drawImage(incorporata, {
      x: penna.sinistra + scarto(chiesta.allineamento, larghezzaUtile(penna), largaVera),
      y: piede,
      width: largaVera,
      height: altaVera,
    })
    // Riserva solo di lato: al centro non resta una colonna in cui scrivere.
    if (chiesta.allineamento !== 'centro') {
      penna.riserva = { larghezza: largaVera + 8, fino: piede - 4 }
    }
    return
  }

  spazio(penna, altaVera + 6)
  penna.pagina.drawImage(incorporata, {
    x: penna.sinistra + scarto(chiesta.allineamento, utile, largaVera),
    y: penna.y,
    width: largaVera,
    height: altaVera,
  })
}

/**
 * La parete di ritratti: una casella per allievo, foto e nome sotto. Caselle
 * della stessa altezza, foto in proporzione; chi non ha foto tiene la casella
 * con il posto segnato, così i nomi non si spostano.
 */
function galleria (penna: Penna, chiesta: Galleria, valore: string): void {
  const { colonne, altezza } = leggiRichiestaGalleria(valore)
  const utile = larghezzaUtile(penna)
  const larghezzaCella = utile / colonne
  const altaFoto = altezza * MM
  const corpo = penna.corpi.piccolo
  const corpoSotto = corpo * 0.9
  // Sopra la foto uno stacco, sotto il nome e — quando c'è — la riga piccola.
  const altaRiga = altaFoto + corpo * 1.5 + corpoSotto * 1.4 + 6

  for (let i = 0; i < chiesta.celle.length; i += colonne) {
    const riga = chiesta.celle.slice(i, i + colonne)
    // Una riga di facce non si spezza fra due pagine.
    spazio(penna, altaRiga)
    const base = penna.y

    riga.forEach((cella, colonna) => {
      const sinistra = penna.sinistra + colonna * larghezzaCella
      const centro = sinistra + larghezzaCella / 2
      const larghezzaFoto = larghezzaCella - 8
      const incorporata = cella.immagine ? penna.immagini.get(cella.immagine) : undefined

      if (incorporata) {
        // Si scala sul lato che sfora.
        const scala = Math.min(altaFoto / incorporata.height, larghezzaFoto / incorporata.width)
        const larga = incorporata.width * scala
        const alta = incorporata.height * scala
        penna.pagina.drawImage(incorporata, {
          x: centro - larga / 2,
          y: base + altaRiga - alta - 4,
          width: larga,
          height: alta,
        })
      } else {
        // Foto mancante: un riquadro vuoto.
        penna.pagina.drawRectangle({
          x: centro - larghezzaFoto / 2,
          y: base + altaRiga - altaFoto - 4,
          width: larghezzaFoto,
          height: altaFoto,
          borderColor: FILO,
          borderWidth: 0.6,
        })
      }

      const nome = tronca(cella.titolo, penna.grassetto, corpo, larghezzaCella - 4)
      penna.pagina.drawText(nome, {
        x: centro - penna.grassetto.widthOfTextAtSize(nome, corpo) / 2,
        y: base + corpoSotto * 1.4,
        size: corpo,
        font: penna.grassetto,
        color: NERO,
      })

      if (cella.sotto) {
        const sotto = tronca(cella.sotto, penna.normale, corpoSotto, larghezzaCella - 4)
        penna.pagina.drawText(sotto, {
          x: centro - penna.normale.widthOfTextAtSize(sotto, corpoSotto) / 2,
          y: base,
          size: corpoSotto,
          font: penna.normale,
          color: NERO,
        })
      }
    })
  }
}

/** Da che ascissa comincia una cosa larga così, allineata così. */
function scarto (
  allineamento: 'sinistra' | 'centro' | 'destra',
  utile: number,
  larga: number,
): number {
  if (allineamento === 'centro') return (utile - larga) / 2
  if (allineamento === 'destra') return utile - larga
  return 0
}

/** Intestazione e piede su ogni pagina, col numero che si conta alla fine. */
function fissi (
  penna: Penna,
  modello: Modello,
  bande: { intestazione: RigaFissa[], piede: RigaFissa[] },
  dati: DatiRapporto,
): void {
  penna.pagine.forEach((pagina, indice) => {
    const valoriPagina = {
      ...dati.valori,
      pagina: String(indice + 1),
      pagine: String(penna.pagine.length),
    }
    const larghezza = larghezzaUtile(penna)
    // Le stesse quote con cui `componiPdf` ha riservato lo spazio.
    const corpo = penna.corpi.banda
    const { stacco, filo: altezzaFilo, interlinea } = quoteBanda(corpo)

    const banda = (righe: RigaFissa[], daSopra: boolean) => {
      const immagini = daSopra ? modello.intestazioneImmagini : modello.piedeImmagini
      if (righe.length === 0 && immagini.length === 0) return

      // Il filo che chiude la banda, e da cui si misura tutto il resto.
      const filo = daSopra
        ? penna.altezza - penna.alto + altezzaFilo
        : penna.basso - altezzaFilo * 0.75

      // Il logo nella banda, così è su ogni pagina. Prima delle righe: qui si
      // misura quanto spazio toglie ai due lati.
      let daSinistra = 0
      let daDestra = 0
      for (const chiesta of immagini) {
        const incorporata = penna.immagini.get(chiesta.file)
        if (!incorporata) continue
        const alta = chiesta.altezza * MM
        const larga = incorporata.width * (alta / incorporata.height)
        pagina.drawImage(incorporata, {
          x: penna.sinistra + scarto(chiesta.allineamento, larghezza, larga),
          y: daSopra ? filo + 2 : filo - 2 - alta,
          width: larga,
          height: alta,
        })
        // Il testo della testata si stringe per non finire sotto il logo.
        if (chiesta.allineamento === 'sinistra') daSinistra = Math.max(daSinistra, larga + 6)
        if (chiesta.allineamento === 'destra') daDestra = Math.max(daDestra, larga + 6)
      }

      const perTesto = Math.max(larghezza / 4, larghezza - daSinistra - daDestra)
      const partenza = penna.sinistra + daSinistra

      righe.forEach((riga, i) => {
        const y = daSopra
          ? penna.altezza - penna.alto + stacco + (righe.length - 1 - i) * interlinea
          : penna.basso - stacco - i * interlinea
        const pezzi: Array<['sinistra' | 'centro' | 'destra', string]> = [
          ['sinistra', riga.sinistra],
          ['centro', riga.centro],
          ['destra', riga.destra],
        ]
        for (const [dove, cella] of pezzi) {
          const marcata = cellaFissa(cella)
          const testo = riempi(marcata.testo, valoriPagina, dati.frasi)
          if (!testo.trim()) continue
          const font = marcata.grassetto ? penna.grassetto : penna.normale
          const pulito = tronca(testo, font, corpo, perTesto / 2)
          const quanto = font.widthOfTextAtSize(pulito, corpo)
          pagina.drawText(pulito, {
            x: partenza + scarto(dove, perTesto, quanto),
            y,
            size: corpo,
            font,
            // Nero, non grigio: dice che documento è.
            color: NERO,
          })
        }
      })

      pagina.drawLine({
        start: { x: penna.sinistra, y: filo },
        end: { x: penna.sinistra + larghezza, y: filo },
        thickness: 0.5,
        color: FILO,
      })
    }

    banda(bande.intestazione, true)
    banda(bande.piede, false)
  })
}

/** Compone il PDF di un rapporto: il modello dice come, i dati dicono che cosa. */
export async function componiPdf (
  modello: Modello,
  dati: DatiRapporto,
  carica?: CaricaImmagine,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const normale = await pdf.embedFont(StandardFonts.Helvetica)
  const grassetto = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Il corpo si compone prima: dice quali immagini servono davvero (non quelle
  // dentro un `se:` falso), da incorporare tutte insieme.
  const corpo = componiCorpo(modello, dati)
  const nomi = [
    ...modello.intestazioneImmagini.map((i) => i.file),
    ...modello.piedeImmagini.map((i) => i.file),
    ...corpo
      .filter((blocco) => blocco.tipo === 'immagine')
      .map((blocco) => leggiImmagine(blocco.valore)?.file ?? ''),
    // Anche le facce della parete, nello stesso giro.
    ...corpo.flatMap((blocco) => blocco.galleria?.celle.map((cella) => cella.immagine) ?? []),
  ].filter(Boolean)
  const immaginiCaricate = await incorpora(pdf, nomi, carica)

  const stile = modello.stile
  // Il foglio dal modello, in millimetri; l'orientamento lo gira.
  const verticale = modello.orientamento === 'verticale'
  const lato = { corto: stile.formato.larghezza * MM, lungo: stile.formato.altezza * MM }
  const larghezza = verticale ? lato.corto : lato.lungo
  const altezza = verticale ? lato.lungo : lato.corto
  const corpi = corpiDi(stile)
  // La banda c'è se ha righe o un'immagine, e cresce con il testo e con
  // l'immagine più alta. Contano solo le immagini caricate: un logo mancante
  // non deve lasciare una banda vuota.
  const banda = (righe: RigaFissa[], immagini: ImmagineModello[]) => {
    const presenti = immagini.filter((i) => immaginiCaricate.has(i.file))
    const alta = presenti.reduce((piu, i) => Math.max(piu, i.altezza * MM), 0)
    return altezzaBanda(corpi.banda, righe.length, alta)
  }
  // Filtrate una volta e passate a `fissi`: riservato e disegnato coincidono.
  const frasi = dati.frasi ?? {}
  const testata = righeVive(modello.intestazione, dati.valori, frasi)
  const piede = righeVive(modello.piede, dati.valori, frasi)
  const bandaAlta = banda(testata, modello.intestazioneImmagini)
  const bandaBassa = banda(piede, modello.piedeImmagini)

  const penna: Penna = {
    pdf,
    normale,
    grassetto,
    pagine: [],
    pagina: null as unknown as PDFPage,
    y: 0,
    larghezza,
    altezza,
    sinistra: modello.margini.sinistra * MM,
    destra: modello.margini.destra * MM,
    // Sopra e sotto si tiene una banda per intestazione e piede, quando ci sono.
    alto: modello.margini.alto * MM + bandaAlta,
    basso: modello.margini.basso * MM + bandaBassa,
    stile,
    corpi,
    immagini: immaginiCaricate,
    riserva: null,
    ultimo: null,
    // Si misura sul corpo composto: un'etichetta non stampata non sposta le altre.
    tabulatore: 0,
  }
  penna.tabulatore = tabulatore(penna, corpo)
  nuovaPagina(penna)

  pdf.setTitle(sanifica(riempi(modello.titolo, dati.valori)))
  // testo-fisso: il marchio, uguale in tutte le lingue
  pdf.setProducer('Regiclass')
  // testo-fisso: il marchio, uguale in tutte le lingue
  pdf.setCreator('Regiclass')

  corpo.forEach((blocco, i) => {
    // Prima di un capitolo si guarda se ci sta.
    if (blocco.tipo === 'sezione') compatta(penna, corpo, i, dati)
    disegna(penna, blocco, dati)
  })

  // Le bande usano la riga intera, senza la riserva di un'immagine del corpo.
  penna.riserva = null
  fissi(penna, modello, { intestazione: testata, piede }, dati)
  return pdf.save()
}

/** I blocchi che occupano un'area (bordo, fondo, griglia): vogliono aria intorno. */
const PIENI = new Set<TipoBlocco>(['tabella', 'grafico', 'galleria', 'riquadro', 'avviso', 'immagine'])

/** Quel che è già uno stacco per conto suo: non se ne aggiunge un secondo. */
const DA_SE = new Set<TipoBlocco>(['spazio', 'filo', 'pagina-nuova'])

/** I blocchi di sole righe di testo: la loro interlinea è già lo stacco. */
const SCRITTI = new Set<TipoBlocco>(['paragrafo', 'testo', 'campi', 'elenco'])

/**
 * L'aria fra un blocco e il precedente: dipende dalla coppia, quindi sta qui e
 * non nei disegnatori. `spazio:`, `filo:` e la sezione portano già il loro stacco.
 */
function stacco (penna: Penna, prossimo: TipoBlocco): void {
  const prima = penna.ultimo
  if (!prima) return
  if (DA_SE.has(prossimo) || prossimo === 'sezione') return
  if (DA_SE.has(prima)) return

  // Dopo una sezione si comincia vicino, per non staccare il titolo dal contenuto.
  if (prima === 'sezione') {
    if (PIENI.has(prossimo)) spazio(penna, 4)
    return
  }

  // Un'area contro qualcosa d'altro: aria da tutte e due le parti.
  if (PIENI.has(prossimo) || PIENI.has(prima)) {
    spazio(penna, 9)
    return
  }

  // Due blocchi di testo: un filo d'aria. Non fra due `campi:`, che fanno una lista.
  if (SCRITTI.has(prossimo) && SCRITTI.has(prima) && !(prima === 'campi' && prossimo === 'campi')) {
    spazio(penna, 5)
  }
}

/** Stima dello spazio di un blocco: basta a decidere se un capitolo ci sta. */
function altezzaStimata (penna: Penna, blocco: Blocco, dati: DatiRapporto): number {
  const testo = penna.corpi.testo
  switch (blocco.tipo) {
    case 'titolo':
      return penna.corpi.titolo * 1.5
    case 'sottotitolo':
      return penna.corpi.sottotitolo * 1.5
    case 'sezione':
      return penna.corpi.sezione * 2.2 + 4
    case 'paragrafo':
      return aCapo(blocco.valore, penna.normale, testo, larghezzaUtile(penna)).length * testo * 1.35
    case 'testo':
      return testo * 1.5
    case 'campi': {
      const { voci, colonne } = leggiRichiestaCampi(blocco.valore)
      return Math.ceil(voci.length / colonne) * testo * 1.5
    }
    case 'elenco': {
      const voci = blocco.elenco ?? dati.elenchi[blocco.valore] ?? []
      return voci.reduce(
        (somma, voce) =>
          somma +
          aCapo(voce, penna.normale, testo, larghezzaUtile(penna) - 12).length * testo * 1.4,
        0,
      )
    }
    case 'tabella': {
      const tavola = blocco.tabella ?? dati.tabelle[blocco.valore]
      if (!tavola) return 0
      const { corpo } = misureTabella(tavola, larghezzaUtile(penna), penna.stile, (t, m, g) =>
        (g ? penna.grassetto : penna.normale).widthOfTextAtSize(sanifica(t), m),
      )
      const righe = 1 + tavola.righe.length + (tavola.totale ? 1 : 0)
      return righe * corpo * penna.stile.interlinea
    }
    case 'grafico': {
      const disegno = blocco.grafico ?? dati.grafici[blocco.valore]
      if (!disegno) return 0
      const alta = Math.max(...disegno.punti.map((p) => p.quanti), 1)
      const alto = Math.max(alta, 4) * (3.1 * 2 + 1.6) + 6
      return alto + (disegno.segni?.length ?? 0) * penna.corpi.piccolo * 1.35 +
        penna.corpi.piccolo * 2.4 + 6
    }
    case 'avviso':
      return (
        14 +
        aCapo(blocco.valore, penna.grassetto, testo, larghezzaUtile(penna) - 18).length *
          testo *
          1.35
      )
    case 'riquadro':
      return leggiCampi(blocco.valore).length === 0
        ? 0
        : 8 + penna.corpi.piccolo * 1.5 + penna.corpi.titolo + 8 + 6
    case 'galleria': {
      const parete = blocco.galleria ?? dati.gallerie?.[leggiRichiestaGalleria(blocco.valore).nome]
      if (!parete) return 0
      const { colonne, altezza } = leggiRichiestaGalleria(blocco.valore)
      const corpo = penna.corpi.piccolo
      return (
        Math.ceil(parete.celle.length / colonne) *
        (altezza * MM + corpo * 1.5 + corpo * 0.9 * 1.4 + 6)
      )
    }
    case 'immagine': {
      const chiesta = leggiImmagine(blocco.valore)
      // Affiancata: occupa il fianco, non scende.
      return !chiesta || chiesta.accanto ? 0 : chiesta.altezza * MM + 6
    }
    case 'spazio':
      return Number(blocco.valore) > 0 ? Number(blocco.valore) : 8
    case 'filo':
      return 8
    default:
      return 0
  }
}

/**
 * Un capitolo che non ci sta si porta alla pagina dopo, se lì ci starebbe; uno
 * troppo lungo comincia qui, purché sotto il titolo restino un po' di righe.
 */
function compatta (penna: Penna, corpo: Blocco[], dove: number, dati: DatiRapporto): void {
  let serve = altezzaStimata(penna, corpo[dove], dati)
  for (let i = dove + 1; i < corpo.length; i += 1) {
    const tipo = corpo[i].tipo
    if (tipo === 'sezione' || tipo === 'titolo' || tipo === 'pagina-nuova') break
    serve += altezzaStimata(penna, corpo[i], dati) + 9
  }

  const restano = penna.y - penna.basso
  const intera = penna.altezza - penna.alto - penna.basso
  if (serve <= restano) return

  // Corto: si sposta intero. Lungo: si spezzerebbe comunque.
  if (serve <= intera * 0.55) {
    nuovaPagina(penna)
    return
  }

  // Ma non subito sotto il titolo: servono alcune righe, o si volta pagina.
  if (restano < penna.corpi.sezione * 2.2 + penna.corpi.testo * 6) nuovaPagina(penna)
}

function disegna (penna: Penna, blocco: Blocco, dati: DatiRapporto): void {
  stacco(penna, blocco.tipo)
  penna.ultimo = blocco.tipo

  switch (blocco.tipo) {
    case 'titolo':
      spazio(penna, penna.corpi.titolo * 1.5)
      scrivi(penna, blocco.valore, { corpo: penna.corpi.titolo, font: penna.grassetto })
      break

    case 'sottotitolo':
      spazio(penna, penna.corpi.sottotitolo * 1.5)
      scrivi(penna, blocco.valore, { corpo: penna.corpi.sottotitolo })
      break

    case 'sezione':
      chiudiRiserva(penna)
      spazio(penna, penna.corpi.sezione * 2.2)
      scrivi(penna, blocco.valore, { corpo: penna.corpi.sezione, font: penna.grassetto })
      spazio(penna, 4)
      penna.pagina.drawLine({
        start: { x: penna.sinistra, y: penna.y + 2 },
        end: { x: penna.larghezza - penna.destra, y: penna.y + 2 },
        thickness: 0.6,
        color: FILO,
      })
      break

    case 'paragrafo':
      paragrafo(penna, blocco.valore, penna.corpi.testo)
      break

    case 'testo':
      spazio(penna, penna.corpi.testo * 1.5)
      scrivi(
        penna,
        tronca(blocco.valore, penna.normale, penna.corpi.testo, larghezzaUtile(penna)),
        { corpo: penna.corpi.testo },
      )
      break

    case 'campi':
      campi(penna, blocco.valore)
      break

    case 'elenco':
      // Prima l'elenco già risolto: dentro un `ripeti:` il nome non basta più.
      for (const voce of blocco.elenco ?? dati.elenchi[blocco.valore] ?? []) {
        const righe = aCapo(voce, penna.normale, penna.corpi.testo, larghezzaUtile(penna) - 12)
        righe.forEach((riga, i) => {
          spazio(penna, penna.corpi.testo * 1.4)
          if (i === 0) scrivi(penna, '•', { corpo: penna.corpi.testo })
          scrivi(penna, riga, { corpo: penna.corpi.testo, x: penna.sinistra + 12 })
        })
      }
      break

    case 'tabella': {
      const tavola = blocco.tabella ?? dati.tabelle[blocco.valore]
      if (tavola) tabella(penna, tavola)
      break
    }

    case 'grafico': {
      const disegno = blocco.grafico ?? dati.grafici[blocco.valore]
      if (disegno) grafico(penna, disegno)
      break
    }

    case 'pagina-nuova':
      // Solo se la pagina ha già qualcosa: niente fogli bianchi.
      if (penna.y < penna.altezza - penna.alto) nuovaPagina(penna)
      break

    case 'riquadro':
      riquadro(penna, blocco.valore)
      break

    case 'avviso':
      avviso(penna, blocco.valore)
      break

    case 'immagine':
      immagine(penna, blocco.valore)
      break

    case 'galleria': {
      const parete = blocco.galleria ?? dati.gallerie?.[leggiRichiestaGalleria(blocco.valore).nome]
      if (parete) galleria(penna, parete, blocco.valore)
      break
    }

    // I comandi non arrivano fin qui: `componiCorpo` li esegue e li toglie.
    case 'se':
    case 'altrimenti':
    case 'fine':
    case 'ripeti':
      break

    case 'spazio':
      spazio(penna, Number(blocco.valore) > 0 ? Number(blocco.valore) : 8)
      break

    case 'filo':
      chiudiRiserva(penna)
      spazio(penna, 8)
      penna.pagina.drawLine({
        start: { x: penna.sinistra, y: penna.y },
        end: { x: penna.larghezza - penna.destra, y: penna.y },
        thickness: 0.6,
        color: FILO,
      })
      break
  }
}
