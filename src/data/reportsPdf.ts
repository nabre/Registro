// Da un modello e dai suoi dati a un PDF.
//
// Il PDF è il formato in cui un rapporto esce dal registro: un CSV lo apre chi
// ha Excel e lo vede diverso da come lo si è mandato, un markdown lo legge chi
// sa che cos'è. Un PDF si apre ovunque, si stampa com'è e non si modifica per
// sbaglio — che è quel che si vuole da un verbale.
//
// Qui non c'è niente che sappia di lezioni o di allievi: si ricevono blocchi
// già risolti e si disegnano. Tutto quel che decide *che cosa* stampare sta nel
// modello, dentro `templates/`, e nei dati, dentro `domain/reportData.ts`.
//
// Si impagina in una passata sola, dall'alto: si misura il blocco, si guarda se
// ci sta, e se non ci sta si volta pagina. Niente ricalcolo all'indietro —
// costerebbe complessità vera per guadagnare una vedova ogni tanto.

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
 * I corpi del testo di questo rapporto, già moltiplicati per la scala.
 *
 * Stavano in una costante qui dentro, e cambiarli voleva dire ricompilare.
 * Adesso arrivano dal modello — da `_stile.tpl` per tutti, o dalla riga
 * `corpo:` di quello singolo — e questa funzione fa la sola cosa che il
 * dominio non può fare da solo: applicare la scala una volta per tutte, così
 * nessuno se la dimentica in un punto e i rapporti fra le misure restano
 * quelli scelti.
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
 * Le quote della testata e del piede, tutte ricavate dal corpo con cui sono
 * scritti.
 *
 * In un posto solo perché servono due volte e devono dare lo stesso risultato:
 * `componiPdf` le usa per sapere quanto spazio riservare, `fissi` per disegnare
 * dentro quello spazio. Quando erano due conti separati, una testata di tre
 * righe si riservava lo spazio di una e le altre due finivano nel margine.
 */
function quoteBanda (corpo: number): {
  stacco: number
  filo: number
  interlinea: number
} {
  return { stacco: corpo * 1.75, filo: corpo, interlinea: corpo * 1.3 }
}

/**
 * Le righe di una banda che hanno davvero qualcosa da dire.
 *
 * Vale in testata la stessa regola del corpo: una riga fatta di soli segnaposto
 * che nessuno ha riempito sparisce, invece di lasciare una riga bianca in mezzo
 * alle altre. È quel che permette a `_base.tpl` di prevedere una riga per il
 * nome della sede senza obbligare chi non ce l'ha a cancellarla.
 *
 * Si guardano i valori del rapporto e non quelli della pagina: `{{pagina}}` c'è
 * sempre, e non è lui a decidere se una riga esiste.
 */
function righeVive (
  righe: RigaFissa[],
  valori: Record<string, string>,
  frasi: Record<string, string>,
): RigaFissa[] {
  return righe.filter((riga) =>
    [riga.sinistra, riga.centro, riga.destra].some((cella) => {
      // Il grassetto si toglie prima di guardare: una cella marcata e vuota è
      // vuota, e senza questo `**{{titolo}}**` senza titolo terrebbe in piedi
      // la riga con due asterischi dentro.
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
 * Il grigio: solo per i fili, mai per il testo.
 *
 * Un rapporto esce da una stampante che non si sceglie — quella della sede, in
 * bianco e nero, spesso con il toner agli sgoccioli — e un grigio al 45% su
 * carta è una riga che si legge peggio delle altre senza che nessuno abbia
 * deciso che contasse meno. Le gerarchie si fanno con il corpo e con il
 * grassetto, che sopravvivono a qualunque fotocopia.
 */
const QUIETO = rgb(0.42, 0.44, 0.48)
const FILO = rgb(0.78, 0.79, 0.82)
const FONDO_INTESTAZIONE = rgb(0.94, 0.95, 0.96)
// Il verde e il rosso delle pastiglie a schermo, portati sulla carta: chi
// guarda il foglio dopo aver guardato il registro deve riconoscere gli stessi
// due colori, non impararne altri due.
const BUONO = rgb(0.16, 0.51, 0.31)
const BRUTTO = rgb(0.71, 0.21, 0.21)
const NEUTRO = rgb(0.55, 0.57, 0.62)

/**
 * I caratteri che i font di serie del PDF non sanno scrivere.
 *
 * @cantoo/pdf-lib con Helvetica codifica in Latin-1: gli accenti italiani ci stanno, la
 * tipografia no. E la tipografia è dappertutto — il trattino lungo fra due
 * orari, l'apostrofo curvo, la spunta della scaletta — quindi senza questa
 * tabella un verbale usciva punteggiato di punti interrogativi.
 *
 * Si sostituisce con l'equivalente ASCII invece di lasciar cadere: un trattino
 * dritto al posto di uno lungo non lo nota nessuno, un «?» in mezzo a un orario
 * sì. Le frazioni — ¼ ½ ¾, con cui il registro scrive le unità didattiche — in
 * Latin-1 ci sono, e restano come sono.
 */
const SOSTITUZIONI: Array<[RegExp, string]> = [
  // I trattini tipografici: sono quelli che il registro usa negli orari e fra i
  // nomi, ed erano i primi a diventare un punto interrogativo.
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
  // Quel che resta fuori dal Latin-1 diventa un punto interrogativo: si vede
  // che manca qualcosa, invece di non uscire affatto.
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
   * Lo spazio che un'immagine affiancata si tiene sul fianco, finché non la si
   * è sorpassata.
   *
   * `fino` è la quota sotto la quale l'immagine è finita e la larghezza torna
   * quella di prima: è quel che permette a una foto di stare accanto ai
   * recapiti invece che sopra, senza che il testo dopo continui a scriversi in
   * una colonna stretta per il resto del foglio.
   */
  riserva: { larghezza: number, fino: number } | null
  /** Che cosa si è disegnato per ultimo: decide quanta aria lasciare prima del prossimo. */
  ultimo: TipoBlocco | null
  /** Dove cominciano i valori di ogni `campi:` del foglio: uno per tutti. */
  tabulatore: number
}

/**
 * Come si arriva ai byte di un'immagine chiesta da un modello.
 *
 * La passa chi compone, e non la si va a prendere da qui: questo file disegna
 * e non sa dove stiano i file: è la stessa ragione per cui non sa che cosa sia
 * una lezione.
 */
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
  // L'immagine affiancata è rimasta sulla pagina di prima: da qui la riga è
  // tutta libera.
  penna.riserva = null
  // In cima a una pagina non si stacca da niente: quel che c'era prima sta
  // sull'altro foglio.
  penna.ultimo = null
}

/** Fa spazio per `quanto`, voltando pagina se non ce n'è più. */
function spazio (penna: Penna, quanto: number): void {
  if (penna.y - quanto < penna.basso) nuovaPagina(penna)
  penna.y -= quanto
}

/**
 * Chiude la fascia che un'immagine affiancata si era tenuta, scendendo sotto di
 * lei se non la si è ancora passata.
 *
 * Lo fanno i due blocchi che dividono il foglio in parti — il filo e la
 * sezione: una riga orizzontale lunga mezza pagina non separa niente, e
 * un'intestazione di sezione dice che quel che c'era prima è finito. È anche il
 * modo che un modello ha di dire «da qui riga intera» senza una direttiva
 * apposta: si scrive un filo, che è quel che si voleva comunque.
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
  // Sopra il piede dell'immagine si scrive nella colonna stretta, sotto si
  // riprende tutta la riga: una riserva che non scade lascerebbe metà foglio
  // vuoto per tutte le pagine che seguono.
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

/**
 * Quanto respira il testo dentro una cella, ai due lati.
 *
 * Due punti erano il testo appoggiato al filo verticale: su carta le colonne si
 * leggevano attaccate, e una data accanto a un nome sembrava una parola sola.
 */
const RESPIRO = 3.5

/**
 * Quanto sotto la scrittura passa il filo che chiude una riga: è il piede
 * della riga, e lo condividono la linea orizzontale e i fili verticali —
 * disegnarli a quote diverse lascerebbe una griglia con gli angoli scuciti.
 */
function piedeRiga (corpo: number): number {
  return corpo * 0.5
}

/**
 * I fili verticali di una riga: i confini fra le colonne e i due bordi.
 *
 * Riga per riga e non per tutta la tabella: una tabella lunga si spezza fra le
 * pagine, e un filo tirato dalla prima riga all'ultima uscirebbe dal foglio.
 * Così ogni riga porta i suoi, e i tratti si incolonnano da sé.
 */
function filiVerticali (penna: Penna, misure: number[], base: number, altezzaRiga: number): void {
  const cima = base + altezzaRiga
  let x = penna.sinistra
  // Un filo in più delle colonne: il primo è il bordo sinistro, l'ultimo il
  // destro. Senza i due esterni la griglia resta aperta ai lati, e su carta si
  // legge come una tabella disegnata a metà.
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
 * Una tabella.
 *
 * L'intestazione si ripete a ogni pagina: una tabella che continua senza dire
 * più che cosa siano le colonne obbliga chi legge a tornare indietro, ed è il
 * genere di attrito che si nota solo su carta.
 *
 * La griglia è chiusa su tutti e quattro i lati, colonne comprese: con le sole
 * linee orizzontali una riga di date e di sigle corte si legge come una fila
 * di parole sparse, e per sapere sotto quale colonna cadesse una casella
 * bisognava risalire con il dito all'intestazione.
 */
function tabella (penna: Penna, dati: Tabella): void {
  const larghezza = larghezzaUtile(penna)
  // Le larghezze le decide il dominio, che sa misurare perché gli si presta il
  // font: qui si disegna quel che ne esce. Può tornare anche un corpo più
  // piccolo di quello chiesto — è il modo con cui una tabella larga entra nel
  // foglio senza che i nomi finiscano in «Ros...».
  const { misure, corpo } = misureTabella(dati, larghezza, penna.stile, (testo, misura, grassetto) =>
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
    // Il filo sopra l'intestazione: chiude la griglia in alto, che altrimenti
    // resterebbe appesa al solo fondo grigio.
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
    // Voltando pagina l'intestazione torna: senza, la tabella continua muta.
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

  // La riga che tira le somme: in grassetto e con il filo sopra più marcato,
  // perché un totale scritto come le altre righe si conta insieme a loro —
  // «12» in fondo alla colonna delle prove diventa una tredicesima prova.
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
 * Una distribuzione a punti sopra un asse.
 *
 * Un punto per voto, al suo valore esatto, impilato quando si ripete. È la
 * forma che una classe merita: dodici o venticinque voti stanno uno a uno, e
 * raggrupparli in fasce era una perdita che non comprava niente — un 3.75 e un
 * 3.00 finivano nella stessa colonna, e la differenza fra «quasi» e «lontano»
 * è proprio quella che si guarda decidendo chi recupera.
 *
 * Sopra ci passa il segno della media: è quel che trasforma una fila di
 * pallini in un giudizio — senza, si vede una nuvola e non si sa da che parte
 * stia. La sufficienza non ha una riga sua: la dice il colore dei punti.
 */
function grafico (penna: Penna, dati: Grafico): void {
  const larghezza = larghezzaUtile(penna)
  const RAGGIO = 3.1
  const PASSO = RAGGIO * 2 + 1.6
  const PIEDE = penna.corpi.piccolo * 2.4

  const alta = Math.max(...dati.punti.map((p) => p.quanti), 1)
  const segni = dati.segni ?? []
  // Le etichette dei segni stanno in righe sovrapposte sopra il disegno, una
  // per segno: la media può cadere esattamente sulla sufficienza — succede, e
  // non è un caso strano — e su una riga sola le due scritte si coprirebbero.
  const RIGA = penna.corpi.piccolo * 1.35
  // Un'altezza minima anche quando le pile sono basse: con due soli punti in
  // colonna i segni verticali diventavano trattini di mezzo centimetro, e una
  // riga della media che non si vede non serve a niente.
  const alto = Math.max(alta, 4) * PASSO + 6
  const altezza = alto + segni.length * RIGA

  const campo = dati.a - dati.da
  const dove = (valore: number) =>
    penna.sinistra + (campo > 0 ? ((valore - dati.da) / campo) * larghezza : larghezza / 2)

  // Tutto sulla stessa pagina: una distribuzione tagliata a metà fra due fogli
  // non è più una forma.
  spazio(penna, altezza + PIEDE + 6)
  const base = penna.y + PIEDE

  // I segni verticali per primi: passano dietro ai punti, non sopra.
  segni.forEach((segno, i) => {
    const x = dove(segno.valore)
    penna.pagina.drawLine({
      start: { x, y: base },
      end: { x, y: base + alto },
      thickness: 0.7,
      // Più scuro del filo delle tabelle: è la riga rispetto a cui si legge
      // tutto il resto del disegno, non una decorazione.
      color: QUIETO,
      dashArray: [2, 2],
    })
    const etichetta = sanifica(segno.etichetta)
    const quanto = penna.normale.widthOfTextAtSize(etichetta, penna.corpi.piccolo)
    // L'etichetta si tiene dentro il foglio: un segno vicino al bordo la
    // spingerebbe fuori, e fuori non si legge.
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

  // Le lineette del quarto: più corte e senza numero. Dividono il tratto fra
  // due mezzi punti, che è il passo con cui i voti si mettono davvero, e
  // scriverle tutte metterebbe sotto l'asse ventun cifre attaccate.
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
    // Anche le tacche agli estremi restano dentro il foglio: centrata sul
    // primo tratto, l'etichetta sporgerebbe metà fuori dal margine.
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
 * Dove cominciano i valori di tutti i `campi:` del foglio.
 *
 * Uno solo per rapporto e non uno per riga di modello: due gruppi di campi in
 * due punti della pagina, con due tabulatori diversi, si vedono disallineati —
 * è la prima cosa che si nota, e l'unica ragione per cui esisteva un
 * tabulatore era non doverla notare.
 *
 * Il tetto sta sul foglio intero e non sulla colonna in cui il gruppo capita:
 * una misura che dipende da dove si scrive tornerebbe a essere una misura per
 * gruppo. Un'etichetta più lunga del tetto si accorcia lei, che è meglio che
 * spostare tutti i valori a metà foglio.
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
 * Le coppie etichetta/valore.
 *
 * Le etichette cominciano tutte al margine della loro colonna, i valori tutti
 * allo stesso tabulatore — quello del foglio, non quello di questo gruppo — e
 * così si legge la colonna delle etichette come una lista e quella dei valori
 * diritta, senza rincorrerli a zig-zag.
 *
 * Quando il tabulatore non ci sta — due colonne strette, o un'immagine
 * affiancata che si è presa metà riga — si stringe a quel che c'è: meglio un
 * gruppo allineato per conto suo che un valore largo tre lettere.
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
 * Un avviso: una o più righe dentro un riquadro dal bordo marcato.
 *
 * Serve a quel che non si deve poter saltare leggendo in diagonale — «assenza
 * oltre il 20%» su una scheda che si consegna — e si distingue dal riquadro dei
 * numeri perché qui conta la frase, non la cifra: il testo resta del corpo di
 * sempre e va a capo da sé, è il bordo a fare il lavoro.
 *
 * Nero come tutto il resto: un rosso si vede sullo schermo di chi lo scrive e
 * su nessuna delle stampanti su cui il foglio finisce.
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
 * Un riquadro in evidenza: l'etichetta piccola, il valore grande, un bordo.
 *
 * Serve al numero che è il motivo per cui il foglio esiste — la nota di fine
 * semestre su una scheda d'allievo — e che in una riga di campi si legge come
 * uno dei tanti. Un dato importante non si distingue scrivendolo insieme agli
 * altri: si distingue dandogli uno spazio suo, e questo è quello spazio.
 *
 * Più coppie stanno una accanto all'altra nello stesso riquadro, a colonne
 * uguali: sono numeri che si guardano insieme, e un riquadro per ciascuno
 * sarebbe una fila di scatole invece che un quadro d'insieme.
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
 * Le immagini già incorporate nel PDF, per nome di file.
 *
 * Incorporate una volta sola e non a ogni disegno: il logo della testata
 * ricompare su ogni pagina, e ripeterne i byte trenta volte farebbe un file
 * trenta volte più pesante — che poi è quello che si allega a una mail.
 */
type Incorporate = Map<string, PDFImage>

/**
 * Carica e incorpora le immagini che il modello nomina.
 *
 * Quel che non si trova non c'è e basta: un logo mancante non è un motivo per
 * non stampare il verbale, e chi apre la cartella dei modelli vede subito che
 * il file non c'è. Un formato che @cantoo/pdf-lib non sa leggere finisce allo stesso
 * modo, invece di far cadere la composizione.
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
      // PNG e JPEG si riconoscono dai primi byte, non dall'estensione: un file
      // rinominato a mano è un caso che capita, e l'estensione sbagliata non
      // deve buttare via un'immagine buona.
      const png = byte[0] === 0x89 && byte[1] === 0x50
      esito.set(nome, png ? await pdf.embedPng(byte) : await pdf.embedJpg(byte))
    } catch {
      // Non è né PNG né JPEG, o è rotta.
    }
  }
  return esito
}

/**
 * Un'immagine nel corpo, con lo spazio suo sopra e sotto.
 *
 * Con `accanto` non si prende la sua fascia di foglio: si mette da parte il
 * fianco su cui sta e quel che segue si scrive nella colonna che resta, finché
 * non l'ha sorpassata. È la disposizione di una scheda anagrafica — il ritratto
 * da una parte, i recapiti dall'altra, alla stessa altezza — e senza, una foto
 * alta tre centimetri lascia tre centimetri di bianco sull'altro lato.
 */
function immagine (penna: Penna, valore: string): void {
  const chiesta = leggiImmagine(valore)
  const incorporata = chiesta ? penna.immagini.get(chiesta.file) : undefined
  if (!chiesta || !incorporata) return

  const alta = chiesta.altezza * MM
  const larga = incorporata.width * (alta / incorporata.height)
  const utile = larghezzaUtile(penna)
  // Più larga del foglio non ci va: si rimpicciolisce tenendo le proporzioni,
  // invece di uscire dal margine destro.
  const scala = larga > utile ? utile / larga : 1
  const altaVera = alta * scala
  const largaVera = larga * scala

  if (chiesta.accanto) {
    // Ci sta in questa pagina o si comincia dalla prossima: un ritratto tagliato
    // a metà dal fondo del foglio non somiglia più a nessuno, e i recapiti che
    // gli stanno accanto finirebbero staccati da lui.
    if (penna.y - altaVera - 6 < penna.basso) nuovaPagina(penna)
    // Non si scende: l'immagine occupa il fianco, non la fascia.
    const piede = penna.y - altaVera
    penna.pagina.drawImage(incorporata, {
      x: penna.sinistra + scarto(chiesta.allineamento, larghezzaUtile(penna), largaVera),
      y: piede,
      width: largaVera,
      height: altaVera,
    })
    // Solo di lato, e non al centro: quel che sta in mezzo non lascia una
    // colonna in cui scrivere, e stringere il testo da tutte e due le parti
    // sarebbe un modo elaborato di non far stare più niente.
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
 * La parete di ritratti: una casella per allievo, la foto e il nome sotto.
 *
 * Le caselle sono tutte della stessa altezza anche quando le foto non lo sono:
 * una griglia in cui ogni riga comincia a un'altezza diversa si legge come un
 * elenco disordinato, e il senso di questa pagina è poter scorrere le facce
 * come si scorre una colonna di nomi. La foto sta dentro la sua casella
 * mantenendo le proporzioni — un ritratto schiacciato non somiglia più a
 * nessuno — e quel che avanza resta bianco.
 *
 * Chi non ha una foto tiene la sua casella con il posto segnato: saltarlo
 * vorrebbe dire una griglia in cui i nomi si spostano, e chi manca è proprio
 * quello che si sta cercando.
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
    // Una riga di facce non si spezza fra due pagine: metà ritratto in fondo
    // al foglio e il nome in cima al successivo è peggio di un foglio corto.
    spazio(penna, altaRiga)
    const base = penna.y

    riga.forEach((cella, colonna) => {
      const sinistra = penna.sinistra + colonna * larghezzaCella
      const centro = sinistra + larghezzaCella / 2
      const larghezzaFoto = larghezzaCella - 8
      const incorporata = cella.immagine ? penna.immagini.get(cella.immagine) : undefined

      if (incorporata) {
        // Dentro la casella per il verso che sfora: un ritratto verticale si
        // misura sull'altezza, uno di gruppo ritagliato sulla larghezza.
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
        // Il posto della foto che non c'è: un riquadro vuoto e basta. Serve a
        // far vedere che manca — è il gesto da fare — senza fingere una faccia.
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
    // Le stesse quote con cui `componiPdf` ha riservato lo spazio: seguono il
    // corpo invece di essere punti fissi, o con un `corpo:` più grande la riga
    // di testata finirebbe sotto il suo filo e il numero di pagina sopra il
    // bordo del foglio.
    const corpo = penna.corpi.banda
    const { stacco, filo: altezzaFilo, interlinea } = quoteBanda(corpo)

    const banda = (righe: RigaFissa[], daSopra: boolean) => {
      const immagini = daSopra ? modello.intestazioneImmagini : modello.piedeImmagini
      if (righe.length === 0 && immagini.length === 0) return

      // Il filo che chiude la banda, e da cui si misura tutto il resto.
      const filo = daSopra
        ? penna.altezza - penna.alto + altezzaFilo
        : penna.basso - altezzaFilo * 0.75

      // Il logo della sede sta nella banda, non nel corpo: comparirebbe su una
      // pagina sola, e su carta la seconda pagina è quella che si ritrova
      // staccata dalle altre.
      //
      // Si disegna prima delle righe perché sono le righe a doversi spostare:
      // qui si misura quanto spazio l'immagine porta via ai due lati.
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
        // Il testo della testata si stringe per non finire sotto il logo. Senza
        // questo, «2026/2027 · 1° semestre» e il logo a destra si scrivono uno
        // sull'altro: due cose giuste, illeggibili insieme.
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
            // Scura come il testo del foglio, non spenta come una nota: è quel
            // che dice di che documento si tratta, ed è la prima cosa che si
            // legge su una pagina staccata dalle altre.
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

  // Il corpo si compone prima di disegnare: serve a sapere quali immagini
  // chiede davvero — dentro un `se:` falso non ce n'è nessuna — e incorporarle
  // tutte insieme, che è l'unico punto della composizione in cui si aspetta
  // qualcosa dal disco.
  const corpo = componiCorpo(modello, dati)
  const nomi = [
    ...modello.intestazioneImmagini.map((i) => i.file),
    ...modello.piedeImmagini.map((i) => i.file),
    ...corpo
      .filter((blocco) => blocco.tipo === 'immagine')
      .map((blocco) => leggiImmagine(blocco.valore)?.file ?? ''),
    // Le facce della parete: sono immagini come il logo, e si incorporano nello
    // stesso giro. Una classe sono venticinque file, e caricarli uno per volta
    // mentre si disegna vorrebbe dire venticinque attese in mezzo alla pagina.
    ...corpo.flatMap((blocco) => blocco.galleria?.celle.map((cella) => cella.immagine) ?? []),
  ].filter(Boolean)
  const immaginiCaricate = await incorpora(pdf, nomi, carica)

  const stile = modello.stile
  // Il foglio arriva dal modello, in millimetri: A4 quasi sempre, A3 per la
  // griglia dei voti che si appende, quel che si vuole scrivendo le due misure.
  // L'orientamento gira il foglio, non lo cambia.
  const verticale = modello.orientamento === 'verticale'
  const lato = { corto: stile.formato.larghezza * MM, lungo: stile.formato.altezza * MM }
  const larghezza = verticale ? lato.corto : lato.lungo
  const altezza = verticale ? lato.lungo : lato.corto
  const corpi = corpiDi(stile)
  // La banda per intestazione e piede cresce con il testo che ci va dentro:
  // fissa a 22 punti, un rapporto scritto in corpo grande se la vedeva
  // scavalcare dalla prima riga del corpo.
  // Una banda c'è se ha righe o un'immagine: un modello con il solo logo in
  // testata deve comunque tenersi lo spazio, o la prima riga del corpo ci
  // finisce sopra. E cresce con l'immagine più alta che ci va dentro: un logo
  // da un centimetro in una banda da ventidue punti uscirebbe di sopra, e il
  // margine del foglio non è un posto dove mettere le cose apposta.
  //
  // Contano le sole immagini che si sono davvero caricate: un modello che
  // nomina un logo che nella cartella non c'è — il caso di ogni registro
  // appena installato — avrebbe una banda alta un centimetro e mezzo con
  // dentro niente.
  const banda = (righe: RigaFissa[], immagini: ImmagineModello[]) => {
    const presenti = immagini.filter((i) => immaginiCaricate.has(i.file))
    const alta = presenti.reduce((piu, i) => Math.max(piu, i.altezza * MM), 0)
    return altezzaBanda(corpi.banda, righe.length, alta)
  }
  // Le righe si filtrano una volta e si passano a `fissi`: quel che si riserva
  // e quel che si disegna devono essere la stessa cosa.
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
    // Si misura sul corpo già composto: dentro un `se:` falso non c'è nessun
    // campo, e un'etichetta che non si stampa non deve spostare le altre.
    tabulatore: 0,
  }
  penna.tabulatore = tabulatore(penna, corpo)
  nuovaPagina(penna)

  pdf.setTitle(sanifica(riempi(modello.titolo, dati.valori)))
  pdf.setProducer('Registro docenti')
  pdf.setCreator('Registro docenti')

  corpo.forEach((blocco, i) => {
    // Prima di un capitolo si guarda se ci sta: un titolo in fondo alla pagina
    // con il suo contenuto di là è il modo peggiore di riempire un foglio.
    if (blocco.tipo === 'sezione') compatta(penna, corpo, i, dati)
    disegna(penna, blocco, dati)
  })

  // La banda si disegna sulla riga intera: quel che un'immagine del corpo si
  // era tenuto di lato riguarda il corpo, non la testata.
  penna.riserva = null
  fissi(penna, modello, { intestazione: testata, piede }, dati)
  return pdf.save()
}

/**
 * I blocchi che occupano un'area invece di una riga: hanno un bordo, un fondo o
 * una griglia, e vogliono aria intorno.
 */
const PIENI = new Set<TipoBlocco>(['tabella', 'grafico', 'galleria', 'riquadro', 'avviso', 'immagine'])

/** Quel che è già uno stacco per conto suo: non se ne aggiunge un secondo. */
const DA_SE = new Set<TipoBlocco>(['spazio', 'filo', 'pagina-nuova'])

/** I blocchi di sole righe di testo: la loro interlinea è già lo stacco. */
const SCRITTI = new Set<TipoBlocco>(['paragrafo', 'testo', 'campi', 'elenco'])

/**
 * L'aria fra un blocco e il precedente.
 *
 * L'interlinea di un paragrafo basta a separarlo dal paragrafo dopo, ma non da
 * una tabella: una griglia chiusa da un filo e una riga di testo a quattordici
 * punti di distanza si toccano, e il foglio si legge come un blocco unico. Le
 * misure stanno qui e non sparse nei disegnatori perché è un rapporto fra due
 * blocchi, non una proprietà di uno solo: cambiare il ritmo del foglio è
 * cambiare questi numeri.
 *
 * Chi si stacca da sé non passa di qui: `spazio:` e `filo:` sono già uno
 * stacco, e la sezione porta il suo — raddoppiarlo lascerebbe mezza pagina
 * bianca sopra ogni titolo.
 */
function stacco (penna: Penna, prossimo: TipoBlocco): void {
  const prima = penna.ultimo
  if (!prima) return
  if (DA_SE.has(prossimo) || prossimo === 'sezione') return
  if (DA_SE.has(prima)) return

  // Dopo il filo di una sezione il testo comincia vicino: il filo è già la
  // riga che separa, e allontanarlo staccherebbe il titolo da quel che
  // annuncia.
  if (prima === 'sezione') {
    if (PIENI.has(prossimo)) spazio(penna, 4)
    return
  }

  // Un'area contro qualcosa d'altro: aria da tutte e due le parti.
  if (PIENI.has(prossimo) || PIENI.has(prima)) {
    spazio(penna, 9)
    return
  }

  // Due blocchi di testo di seguito: un filo d'aria, che è la differenza fra
  // due paragrafi e un paragrafo solo andato a capo. Non fra due `campi:` —
  // sei righe di anagrafica sono una lista, e staccarle una dall'altra la
  // spezzerebbe in sei cose diverse.
  if (SCRITTI.has(prossimo) && SCRITTI.has(prima) && !(prima === 'campi' && prossimo === 'campi')) {
    spazio(penna, 5)
  }
}

/**
 * Quanto spazio si prenderà un blocco, prima di disegnarlo.
 *
 * Serve a una domanda sola: questo capitolo ci sta in quel che resta della
 * pagina? È una stima e non una misura — un paragrafo che va a capo si conta
 * riga per riga, una tabella riga per riga, ma di un carattere in più o in meno
 * non ci si accorge — ed è quel che basta per decidere se voltare pagina.
 */
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
          somma + aCapo(voce, penna.normale, testo, larghezzaUtile(penna) - 12).length * testo * 1.4,
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
      // Un'immagine affiancata non scende: il posto se lo prende di lato.
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
 * Un capitolo che comincia in fondo alla pagina si porta alla successiva.
 *
 * Un titolo di sezione con sotto due righe e il resto voltando pagina non è
 * una pagina piena: è un capitolo spezzato nel punto peggiore, e chi legge
 * gira il foglio per scoprire che cosa c'era sotto quel titolo. Si volta prima:
 * il capitolo comincia in cima e si legge tutto insieme.
 *
 * Solo se cambiando pagina ci starebbe davvero: una tabella di quaranta righe
 * non sta in nessuna pagina, e spostarla lascerebbe un foglio bianco senza
 * risolvere niente. In quel caso comincia qui e continua di là, che è quel che
 * deve fare.
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

  // Un capitolo corto si sposta intero: è quel che vuol dire tenerlo compatto,
  // e la mezza pagina che lascia dietro costa meno di un capitolo diviso in
  // due. Uno lungo no: spostare una tabella di trenta righe lascerebbe un
  // foglio quasi bianco e non la salverebbe comunque dallo spezzarsi.
  if (serve <= intera * 0.55) {
    nuovaPagina(penna)
    return
  }

  // Quel che si spezza si spezza, ma non subito sotto il suo titolo: sotto
  // un'intestazione ci vogliono almeno quattro righe, o quel titolo è rimasto
  // solo in fondo alla pagina e il capitolo comincia davvero di là.
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
      scrivi(penna, tronca(blocco.valore, penna.normale, penna.corpi.testo, larghezzaUtile(penna)), {
        corpo: penna.corpi.testo,
      })
      break

    case 'campi':
      campi(penna, blocco.valore)
      break

    case 'elenco':
      // Prima quel che la composizione ha già trovato: dentro un `ripeti:` il
      // nome da solo non ritrova più niente, perché il giro è finito.
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
      // Solo se sulla pagina c'è già qualcosa: un salto in cima a un rapporto,
      // o due di fila fra un allievo e l'altro, lascerebbero fogli bianchi.
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
