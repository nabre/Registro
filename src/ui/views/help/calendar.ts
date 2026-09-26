// La guida: oggi, calendario, calendario-ore, ics, ics-regole, todo, smistare.
//
// Solo struttura e schemi: le parole stanno in `calendar.testi.ts`, il disegno
// della pagina in `../help.ts`, il vocabolario delle figure in `drawing.ts`.
// Come si divide una pagina fra i due file sta in testa a `types.ts`.

import {
  bollino,
  catena,
  disegno,
  freccia,
  larghezzaTasto,
  larghezzaTesto,
  pastiglia,
  riquadro,
  righe,
  simbolo,
  tasto,
  telaio,
  testo,
  type Tono,
} from './drawing.js'
import { formattaData } from '../../../domain/dates.js'
import { parole } from '../../../domain/words.testi.js'
import { testi as testiPagine } from '../../pages.testi.js'
import { testi as testiOggi } from '../today.testi.js'
import { testi } from './calendar.testi.js'
import { sezione, type FiguraGuida, type SezioneGuida } from './types.js'

const T = testi()

/** Uno schema senza parole attorno: didascalia e legenda stanno nel catalogo. */
type Schema = Pick<FiguraGuida, 'vista' | 'disegno'>

/** Le voci della barra laterale nei telai di questa parte: l'agenda, da «Oggi». */
const LATERALI = [
  parole().oggi,
  T.calendario.scritte.calendario,
  T.calendario.scritte.pendenze,
  T.calendario.scritte.daSmistare,
]

// ------------------------------------------------------------------ le figure

/**
 * Una tessera della pagina «Oggi»: il numero grande e sotto il nome, con le
 * parole della pagina vera (`today.testi.ts`, `pages.testi.ts`).
 */
function tesseraOggi (x: number, numero: string, nome: string, tono: Tono): string {
  return disegno(
    riquadro(x, 72, 116, 44, { tono: 'quieto', raggio: 6 }),
    testo(x + 10, 93, numero, { corpo: 'titolo', forte: true, tono }),
    testo(x + 10, 108, nome, { corpo: 'piccolo', tono: 'quieto' }),
  )
}

/**
 * Un'ora della pagina «Oggi»: inizio, classe e materia, e a destra la fase.
 * L'ora accesa porta prima della fase il segnale «Adesso» o «Prossima».
 */
function oraDiOggi (
  y: number,
  ora: string,
  cosa: string,
  fase: string,
  tono: Tono,
  segnale?: string,
): string {
  const dove = 620 - largaPastiglia(fase)
  return disegno(
    segnale && riquadro(150, y, 476, 22, { tono: 'accento', raggio: 4 }),
    testo(158, y + 15, ora, { corpo: 'piccolo', macchina: true, tono: 'quieto' }),
    testo(200, y + 15, cosa, { corpo: 'piccolo', forte: true }),
    segnale && testo(dove - 8, y + 15, segnale, { corpo: 'piccolo', forte: true, tono: 'accento', ancora: 'fine' }),
    pastiglia(dove, y + 2, fase, tono),
  )
}

/** La pagina «Oggi» vista dall'alto: le tessere, le ore, le prove, i compleanni. */
function figuraOggi (): Schema {
  const o = testiOggi()
  const p = testiPagine()
  const s = T.oggi.scritte
  const sottotitolo = o.sottotitolo(o.saluto('09:30'), formattaData('2026-09-14', 'lungo'))
  const prova = (y: number, nome: string, fra: string, tono: Tono): string => disegno(
    testo(154, y + 13, nome, { corpo: 'piccolo', forte: true }),
    pastiglia(434 - largaPastiglia(fra), y, fra, tono),
  )
  return {
    vista: '0 0 640 346',
    disegno: disegno(
      telaio(0, 0, 640, 346, {
        laterali: LATERALI,
        scelta: LATERALI.indexOf(parole().oggi),
        stato: T.calendario.scritte.stato,
      }),
      // La testata: il nome della pagina e il saluto con la data.
      testo(144, 46, parole().oggi, { corpo: 'titolo', forte: true }),
      testo(144, 62, sottotitolo, { corpo: 'piccolo', tono: 'quieto' }),
      // Le quattro tessere, ognuna una porta.
      tesseraOggi(144, '4', o.oreDiOggi, 'informativo'),
      tesseraOggi(268, '2', o.daCompilare, 'attenzione'),
      tesseraOggi(392, '5', p.pendenze, 'attenzione'),
      tesseraOggi(516, '3', p.daSmistare, 'attenzione'),
      // Le ore di oggi, con la fase: la seconda è in corso, ed è accesa.
      riquadro(144, 126, 488, 110, { tono: 'quieto', raggio: 6 }),
      testo(154, 142, o.leOreDiOggi, { corpo: 'piccolo', forte: true }),
      oraDiOggi(148, '08:20', s.ora1, o.fasi.svolta, 'positivo'),
      oraDiOggi(170, '09:10', s.ora2, o.fasi['in-corso'], 'informativo', o.adesso),
      oraDiOggi(192, '10:15', s.ora1, o.fasi.futura, 'quieto'),
      oraDiOggi(214, '13:30', s.ora2, o.fasi.annullata, 'quieto'),
      // Sotto, a sinistra le prossime prove, a destra i compleanni.
      riquadro(144, 244, 300, 72, { tono: 'quieto', raggio: 6 }),
      testo(154, 260, o.prossimeValutazioni, { corpo: 'piccolo', forte: true }),
      prova(268, s.prova1, o.fra(3), 'quieto'),
      prova(290, s.prova2, o.fra(1), 'attenzione'),
      riquadro(452, 244, 180, 72, { tono: 'quieto', raggio: 6 }),
      testo(462, 260, o.compleanni, { corpo: 'piccolo', forte: true }),
      simbolo('torta', 462, 270, 14, 'accento'),
      testo(482, 281, s.festeggiato, { corpo: 'piccolo', forte: true }),
      testo(482, 295, 'DIC4a', { corpo: 'piccolo', tono: 'quieto' }),
      bollino(632, 72, 1),
      bollino(144, 170, 2),
      bollino(144, 244, 3),
      bollino(632, 244, 4),
    ),
  }
}

/** Quanto è larga una pastiglia con quel testo: come la disegna `pastiglia`. */
function largaPastiglia (contenuto: string): number {
  return larghezzaTesto(contenuto, 'piccolo') + 14
}

/** Una pastiglia di una fila: dove la metteva l'italiano, e almeno `stacco` dopo la precedente. */
interface PastigliaInFila {
  x: number
  contenuto: string
  tono: Tono
  stacco?: number
}

/**
 * Una fila di pastiglie: ognuna parte dove l'aveva messa l'italiano, e si
 * sposta a destra solo se quella prima, in un'altra lingua, è più lunga.
 * Restituisce anche dove finisce l'ultima.
 */
function pastiglieInFila (
  y: number,
  voci: readonly PastigliaInFila[],
): { disegno: string, fine: number } {
  let fine = -Infinity
  const pezzi = voci.map(({ x, contenuto, tono, stacco = 3 }) => {
    const dove = Math.max(x, fine + stacco)
    fine = dove + largaPastiglia(contenuto)
    return pastiglia(dove, y, contenuto, tono)
  })
  return { disegno: disegno(...pezzi), fine }
}

/** Le cinque colonne della settimana disegnata: da dove partono. */
const COLONNE = [172, 260, 348, 436, 524]

/** La riga delle azioni del calendario: Oggi, le frecce, le quattro viste e Nuova ora. */
const AZIONI_CALENDARIO = pastiglieInFila(30, [
  { x: 142, contenuto: parole().oggi, tono: 'neutro' },
  { x: 183, contenuto: '‹', tono: 'neutro' },
  { x: 206, contenuto: '›', tono: 'neutro' },
  { x: 238, contenuto: parole().settimana, tono: 'accento', stacco: 12 },
  { x: 309, contenuto: parole().mese, tono: 'neutro' },
  { x: 350, contenuto: T.calendario.scritte.anno, tono: 'neutro' },
  { x: 391, contenuto: T.calendario.scritte.agenda, tono: 'neutro' },
  // «Modifica» non sta qui: è in alto, accanto a «Proietta», e accesa fa
  // comparire «Nuova ora».
  { x: 446, contenuto: T.calendario.scritte.nuovaOra, tono: 'accento' },
])

const FIGURA_SETTIMANA: Schema = {
  vista: '0 0 640 300',
  disegno: disegno(
    telaio(0, 0, 640, 300, {
      laterali: LATERALI,
      scelta: LATERALI.indexOf(T.calendario.scritte.calendario),
      stato: T.calendario.scritte.stato,
    }),
    // La riga delle azioni.
    AZIONI_CALENDARIO.disegno,
    // La striscia delle settimane dell'anno, con la sua testata e il pulsante
    // che la ripiega.
    testo(142, 59, T.calendario.scritte.striscia, {
      corpo: 'piccolo',
      tono: 'quieto',
    }),
    simbolo('su', 596, 50, 12, 'quieto'),
    ...Array.from({ length: 16 }, (_, i) => {
      const x = 142 + i * 29
      const tono = i === 5 ? 'accento' : i === 9 || i === 10 ? 'quieto' : 'neutro'
      return disegno(
        riquadro(x, 64, 26, 18, { tono, tratteggio: i === 9 || i === 10 }),
        testo(x + 13, 77, String(36 + i), { corpo: 'piccolo', ancora: 'centro', tono }),
      )
    }),
    // I giorni.
    ...[
      T.calendario.scritte.lun,
      T.calendario.scritte.mar,
      T.calendario.scritte.mer,
      T.calendario.scritte.gio,
      T.calendario.scritte.ven,
    ].map((giorno, i) =>
      testo(COLONNE[i] + 43, 98, giorno, { corpo: 'piccolo', ancora: 'centro', forte: true })),
    simbolo('torta', COLONNE[3] + 70, 87, 13, 'accento'),
    // Le ore.
    ...['08', '09', '10', '11'].map((ora, i) =>
      testo(144, 120 + i * 40, ora, { corpo: 'piccolo', tono: 'quieto' })),
    riquadro(COLONNE[0] + 3, 116, 80, 76, {
      tono: 'positivo',
      etichetta: 'DIC4a',
      sotto: T.calendario.scritte.svolta,
    }),
    riquadro(COLONNE[1] + 3, 156, 80, 56, {
      etichetta: 'DIC2b',
      sotto: T.calendario.scritte.pianificata,
      tratteggio: true,
    }),
    riquadro(COLONNE[2] + 3, 136, 80, 60, {
      tono: 'accento',
      etichetta: 'DIC4a',
      sotto: T.calendario.scritte.inCorso,
    }),
    riquadro(COLONNE[2] + 1, 170, 84, 2, { tono: 'negativo', raggio: 1 }),
    riquadro(COLONNE[3] + 3, 196, 80, 40, {
      tono: 'quieto',
      etichetta: 'DIC2b',
      sotto: T.calendario.scritte.annullata,
    }),
    bollino(Math.max(524, AZIONI_CALENDARIO.fine + 11), 39, 1),
    bollino(622, 56, 2),
    bollino(622, 94, 3),
    bollino(COLONNE[0] + 83, 116, 4),
    bollino(COLONNE[2] + 90, 170, 5),
    bollino(152, 102, 6),
  ),
}

/**
 * La riga sotto il trascinamento: «Trascinare sposta;», `Ctrl` o `Alt`, e che
 * cosa fanno. Ogni pezzo parte dove l'aveva messo l'italiano, o subito dopo
 * quello prima se in un'altra lingua è più lungo.
 */
function rigaDelTrascinamento (): string {
  const s = T.calendarioOre.scritte
  const ctrl = Math.max(146, 36 + larghezzaTesto(s.trascinare, 'piccolo') + 4)
  // testo-fisso: nome di tasto, uguale in ogni lingua
  const o = Math.max(190, ctrl + larghezzaTasto('Ctrl') + 3.9)
  const alt = Math.max(199, o + larghezzaTesto(s.o, 'piccolo') + 3)
  const copia = Math.max(238, alt + larghezzaTasto('Alt') + 5)
  return disegno(
    testo(36, 200, s.trascinare, { corpo: 'piccolo' }),
    // testo-fisso: nome di tasto, uguale in ogni lingua
    tasto(ctrl, 185, 'Ctrl'),
    testo(o, 200, s.o, { corpo: 'piccolo', tono: 'quieto' }),
    tasto(alt, 185, 'Alt'),
    testo(copia, 200, s.copia, { corpo: 'piccolo' }),
  )
}

/** Il trascinamento: dove cade l'ora presa, e il tasto che ne fa una copia. */
const FIGURA_TRASCINA: Schema = {
  vista: '0 0 640 220',
  disegno: disegno(
    testo(80, 22, T.calendarioOre.scritte.mar, { corpo: 'piccolo', ancora: 'centro', forte: true }),
    testo(230, 22, T.calendarioOre.scritte.mer, { corpo: 'piccolo', ancora: 'centro', forte: true }),
    riquadro(20, 30, 120, 140, { tono: 'quieto' }),
    riquadro(170, 30, 120, 140, { tono: 'quieto' }),
    riquadro(28, 50, 104, 50, {
      tono: 'quieto',
      etichetta: 'DIC4a',
      sotto: T.calendarioOre.scritte.presa,
      tratteggio: true,
    }),
    freccia([[134, 76], [176, 136]], { tono: 'accento' }),
    pastiglia(234, 94, '10:05', 'accento'),
    riquadro(172, 114, 116, 2, { tono: 'accento', raggio: 1 }),
    riquadro(178, 117, 104, 48, { tono: 'accento', etichetta: 'DIC4a' }),
    rigaDelTrascinamento(),
    // Il menu del tasto destro.
    riquadro(400, 22, 222, 178, { tono: 'neutro' }),
    ...[
      T.calendarioOre.scritte.apriLezione,
      T.calendarioOre.scritte.modifica,
      T.calendarioOre.scritte.segnaSvolta,
      T.calendarioOre.scritte.annullaLezione,
      T.calendarioOre.scritte.assegnaPiano,
      T.calendarioOre.scritte.copiaSettimana,
    ].map((voce, i) => testo(414, 44 + i * 23, voce, { corpo: 'piccolo' })),
    testo(414, 182, parole().elimina, { corpo: 'piccolo', tono: 'negativo' }),
    bollino(132, 50, 1),
    bollino(290, 115, 2),
    bollino(22, 196, 3),
    bollino(622, 22, 4),
  ),
}

/** La settimana con il calendario della scuola accanto. */
const FIGURA_ICS: Schema = {
  vista: '0 0 640 240',
  disegno: disegno(
    // La striscia delle settimane, con i segni.
    ...['38', '39', '40', '41', '42', '43', '44', '45'].map((numero, i) => {
      const x = 20 + i * 48
      return disegno(
        riquadro(x, 12, 44, 22, { tono: i === 2 ? 'accento' : 'neutro' }),
        testo(x + 8, 27, numero, { corpo: 'piccolo', tono: i === 2 ? 'accento' : 'neutro' }),
      )
    }),
    testo(20 + 48 + 32, 27, '+', { corpo: 'piccolo', tono: 'attenzione', forte: true }),
    testo(20 + 3 * 48 + 32, 27, '−', { corpo: 'piccolo', tono: 'negativo', forte: true }),
    testo(20 + 4 * 48 + 32, 27, '?', { corpo: 'piccolo', tono: 'informativo', forte: true }),
    // Il giorno: le ore a sinistra, la corsia ICS a destra.
    riquadro(20, 48, 380, 180, { tono: 'quieto' }),
    testo(30, 64, T.ics.scritte.mer, { corpo: 'piccolo', forte: true }),
    riquadro(28, 76, 236, 76, {
      etichetta: T.ics.scritte.corso,
      sotto: '08:20–09:50',
      simbolo: 'collegamento',
      aSinistra: true,
    }),
    riquadro(274, 76, 118, 36, { tono: 'quieto', etichetta: 'DIC4a CP', tratteggio: true }),
    riquadro(274, 116, 118, 36, { tono: 'quieto', etichetta: 'DIC4a CP', tratteggio: true }),
    riquadro(28, 172, 236, 44, {
      tono: 'negativo',
      etichetta: 'DIC2b',
      sotto: T.ics.scritte.nessunEvento,
      tratteggio: true,
    }),
    riquadro(274, 172, 118, 44, {
      tono: 'attenzione',
      etichetta: T.ics.scritte.riunione,
      sotto: T.ics.scritte.libero,
      simbolo: 'avviso',
      tratteggio: true,
    }),
    // L'interruttore.
    pastiglia(430, 60, T.ics.scritte.calendarioIcs, 'accento'),
    testo(430, 124, T.ics.scritte.inModifica, { corpo: 'piccolo', tono: 'quieto' }),
    testo(430, 156, T.ics.scritte.senzaLezione, { corpo: 'piccolo', tono: 'attenzione' }),
    testo(430, 176, T.ics.scritte.senzaEvento, { corpo: 'piccolo', tono: 'negativo' }),
    testo(430, 196, T.ics.scritte.senzaRegola, { corpo: 'piccolo', tono: 'informativo' }),
    bollino(408, 12, 1),
    bollino(264, 76, 2),
    bollino(392, 76, 3),
    bollino(392, 172, 4),
    bollino(546, 78, 5),
  ),
}

/** Dall'evento alla proposta: le quattro stazioni del confronto. */
const FIGURA_CONFRONTO: Schema = {
  vista: '0 0 640 190',
  disegno: disegno(
    catena(12, 24, [
      {
        etichetta: T.icsRegole.scritte.evento,
        sotto: T.icsRegole.scritte.titoloELuogo,
        simbolo: 'calendario',
      },
      {
        etichetta: T.icsRegole.scritte.corso,
        sotto: T.icsRegole.scritte.quattroProve,
        tono: 'accento',
        simbolo: 'libro',
      },
      {
        etichetta: T.icsRegole.scritte.lezione,
        sotto: T.icsRegole.scritte.piuSovrapposta,
        simbolo: 'orologio',
      },
      {
        etichetta: T.icsRegole.scritte.proposta,
        sotto: T.icsRegole.scritte.daSpuntare,
        tono: 'positivo',
        simbolo: 'spunta',
      },
    ], { largo: 132, stacco: 24, alto: 46 }),
    testo(20, 94, T.icsRegole.scritte.giornoIntero, { corpo: 'piccolo', tono: 'quieto' }),
    testo(20, 110, T.icsRegole.scritte.mezzanotte, { corpo: 'piccolo', tono: 'quieto' }),
    testo(20, 126, T.icsRegole.scritte.lasciatoFuori, { corpo: 'piccolo', tono: 'quieto' }),
    ...[
      T.icsRegole.scritte.prova1,
      T.icsRegole.scritte.prova2,
      T.icsRegole.scritte.prova3,
      T.icsRegole.scritte.prova4,
    ].map((prova, i) => testo(176, 94 + i * 18, prova, { corpo: 'piccolo' })),
    testo(332, 94, T.icsRegole.scritte.nessunaSotto, { corpo: 'piccolo', tono: 'quieto' }),
    testo(332, 110, T.icsRegole.scritte.oraDaCreare, { corpo: 'piccolo', tono: 'quieto' }),
    pastiglia(488, 84, T.icsRegole.scritte.daCreare, 'positivo'),
    pastiglia(488, 108, T.icsRegole.scritte.daAllineare, 'informativo'),
    pastiglia(488, 132, T.icsRegole.scritte.daAnnullare, 'attenzione'),
    testo(488, 170, T.icsRegole.scritte.maiDaCancellare, { corpo: 'piccolo', tono: 'negativo' }),
    bollino(300, 24, 1),
    bollino(612, 24, 2),
  ),
}

/**
 * Un mucchio dentro la scheda di una classe: la pastiglia della fretta e le
 * righe finte, che partono dove le metteva l'italiano o subito dopo il nome.
 */
function mucchio (
  y: number,
  nome: string,
  tono: Tono,
  xRighe: number,
  lRighe: number,
  stacco: number,
): string {
  const dove = Math.max(xRighe, 150 + largaPastiglia(nome) + stacco)
  return disegno(pastiglia(150, y, nome, tono), righe(dove, y + 7, lRighe, 1))
}

/** In cima alla pagina delle pendenze: di chi è il gesto. */
const FILTRI_PENDENZE = pastiglieInFila(28, [
  { x: 142, contenuto: parole().tutte, tono: 'accento' },
  { x: 186, contenuto: T.todo.scritte.leMie, tono: 'neutro', stacco: 0.5 },
  { x: 242, contenuto: T.todo.scritte.delleClassi, tono: 'neutro', stacco: 0.5 },
])

/** Le linguette delle classi, ognuna con il suo conto. */
const LINGUETTE_PENDENZE = pastiglieInFila(98, [
  { x: 138, contenuto: T.todo.scritte.tutte17, tono: 'accento' },
  { x: 216, contenuto: 'DIC4a · 11', tono: 'neutro', stacco: 5 },
  { x: 294, contenuto: 'DIC2b · 6', tono: 'neutro', stacco: 5 },
])

/** La pagina delle pendenze vista dall'alto. */
const FIGURA_PENDENZE: Schema = {
  vista: '0 0 640 260',
  disegno: disegno(
    telaio(0, 0, 640, 260, {
      laterali: LATERALI,
      scelta: LATERALI.indexOf(T.calendario.scritte.pendenze),
    }),
    FILTRI_PENDENZE.disegno,
    pastiglia(
      Math.min(516, 626 - largaPastiglia(T.todo.scritte.nuovaConsegna)),
      28,
      T.todo.scritte.nuovaConsegna,
      'accento',
    ),
    ...(['firma', 'avviso', 'valutazioni', 'documento', 'spunta', 'documento', 'spunta'] as const)
      .map((icona, i) => riquadro(138 + i * 70, 54, 64, 34, {
        tono: i === 2 ? 'negativo' : 'neutro',
        etichetta: String([2, 0, 5, 3, 4, 1, 2][i]),
        simbolo: icona,
      })),
    LINGUETTE_PENDENZE.disegno,
    riquadro(138, 124, 490, 88, { tono: 'neutro' }),
    testo(148, 141, 'DIC4a', { forte: true }),
    testo(196, 141, T.todo.scritte.coseAperte, { corpo: 'piccolo', tono: 'quieto' }),
    testo(148, 160, T.todo.scritte.consegnaLaClasse, { corpo: 'piccolo', forte: true }),
    mucchio(166, T.todo.scritte.rimasteIndietro, 'negativo', 262, 220, 3.9),
    mucchio(188, T.todo.scritte.entroLaSettimana, 'neutro', 270, 200, 0.1),
    riquadro(138, 222, 490, 16, { tono: 'quieto' }),
    testo(148, 234, T.todo.scritte.fatto, { corpo: 'piccolo', tono: 'quieto' }),
    bollino(Math.max(356, FILTRI_PENDENZE.fine + 29.4), 37, 1),
    bollino(628, 54, 2),
    bollino(Math.max(372, LINGUETTE_PENDENZE.fine + 11), 107, 3),
    bollino(628, 124, 4),
    bollino(628, 222, 5),
  ),
}

/** Le sette tipologie: tre senza un «chi», quattro dall'incrocio. */
const FIGURA_TIPOLOGIE: Schema = {
  vista: '0 0 640 200',
  disegno: disegno(
    riquadro(20, 12, 196, 38, {
      tono: 'quieto',
      etichetta: T.todo.scritte.assenzeDaFirmare,
      simbolo: 'firma',
    }),
    riquadro(222, 12, 196, 38, {
      tono: 'quieto',
      etichetta: T.todo.scritte.assenzeOltreSoglia,
      simbolo: 'avviso',
    }),
    riquadro(424, 12, 196, 38, {
      tono: 'quieto',
      etichetta: T.todo.scritte.momenti,
      simbolo: 'valutazioni',
    }),
    testo(325, 80, T.todo.scritte.consegnaUnFoglio, {
      corpo: 'piccolo', ancora: 'centro', tono: 'quieto',
    }),
    testo(525, 80, T.todo.scritte.svolgeQualcosa, {
      corpo: 'piccolo', ancora: 'centro', tono: 'quieto',
    }),
    testo(28, 111, T.todo.scritte.toccaAllaClasse, { forte: true }),
    testo(28, 157, T.todo.scritte.toccaAlDocente, { forte: true }),
    riquadro(230, 88, 190, 38, { etichetta: T.todo.scritte.consegnaLaClasse }),
    riquadro(430, 88, 190, 38, { etichetta: T.todo.scritte.svolgeLaClasse }),
    riquadro(230, 134, 190, 38, { tono: 'accento', etichetta: T.todo.scritte.consegnaIlDocente }),
    riquadro(430, 134, 190, 38, { tono: 'accento', etichetta: T.todo.scritte.svolgeIlDocente }),
    testo(320, 192, T.todo.scritte.inCimaInFondo, {
      corpo: 'piccolo',
      ancora: 'centro',
      tono: 'quieto',
    }),
  ),
}

/** Il giro di un PDF di classe, dall'arrivo al fascicolo. */
const FIGURA_SMISTARE: Schema = {
  vista: '0 0 640 210',
  disegno: disegno(
    catena(12, 24, [
      { etichetta: 'PDF', sotto: T.smistare.scritte.trascinato, simbolo: 'documento' },
      { etichetta: T.smistare.scritte.lettura, sotto: T.smistare.scritte.ocr, simbolo: 'lente' },
      {
        etichetta: T.smistare.scritte.proposte,
        sotto: T.smistare.scritte.unNome,
        tono: 'accento',
        simbolo: 'utente',
      },
      {
        etichetta: T.smistare.scritte.fascicolo,
        sotto: T.smistare.scritte.archiviato,
        tono: 'positivo',
        simbolo: 'cartella',
      },
    ], { largo: 132, stacco: 24, alto: 46 }),
    riquadro(330, 104, 282, 44, {
      tono: 'quieto',
      etichetta: T.smistare.scritte.conferma,
      sotto: T.smistare.scritte.senzaGesto,
    }),
    freccia([[468, 102], [468, 52]], { tono: 'accento' }),
    freccia([[78, 72], [78, 146]], { tratteggio: true }),
    riquadro(12, 150, 200, 44, {
      tono: 'attenzione',
      etichetta: T.smistare.scritte.nonAttribuiti,
      sotto: T.smistare.scritte.qualeClasse,
      tratteggio: true,
    }),
    bollino(300, 24, 1),
    bollino(456, 24, 2),
    bollino(612, 104, 3),
    bollino(212, 150, 4),
  ),
}

// ------------------------------------------------------------------ le sezioni

export const SEZIONI_CALENDARIO: SezioneGuida[] = [
  sezione({
    id: 'oggi',
    parte: 'agenda',
    simbolo: 'sole',
    vista: 'oggi',
    figure: [figuraOggi()],
    note: ['meccanismo'],
    vedi: ['calendario', 'todo', 'smistare', 'barra-stato', 'finestra'],
  }, T.oggi),
  sezione({
    id: 'calendario',
    parte: 'agenda',
    simbolo: 'calendario',
    vista: 'calendario',
    figure: [FIGURA_SETTIMANA],
    note: ['meccanismo', 'consiglio'],
    vedi: ['calendario-ore', 'ics', 'barra-stato', 'date', 'impostazioni'],
  }, T.calendario),
  sezione({
    id: 'calendario-ore',
    parte: 'agenda',
    simbolo: 'orologio',
    vista: 'calendario',
    figure: [FIGURA_TRASCINA],
    note: ['meccanismo', 'attenzione'],
    vedi: ['calendario', 'lezione', 'corsi', 'piani', 'ics'],
  }, T.calendarioOre),
  sezione({
    id: 'ics',
    parte: 'agenda',
    simbolo: 'collegamento',
    vista: 'calendario',
    figure: [FIGURA_ICS],
    note: ['attenzione', 'meccanismo', 'consiglio'],
    vedi: ['ics-regole', 'calendario', 'calendario-ore', 'impostazioni'],
  }, T.ics),
  sezione({
    id: 'ics-regole',
    parte: 'agenda',
    simbolo: 'filtro',
    vista: 'calendario',
    figure: [FIGURA_CONFRONTO],
    note: ['meccanismo', 'consiglio'],
    vedi: ['ics', 'calendario-ore', 'corsi'],
  }, T.icsRegole),
  sezione({
    id: 'todo',
    parte: 'agenda',
    simbolo: 'spunta',
    vista: 'todo',
    figure: [FIGURA_PENDENZE, FIGURA_TIPOLOGIE],
    note: ['meccanismo', 'attenzione'],
    vedi: ['valutazioni', 'assenze', 'lezione', 'barra-stato', 'date'],
  }, T.todo),
  sezione({
    id: 'smistare',
    parte: 'agenda',
    simbolo: 'documento',
    vista: 'daSmistare',
    figure: [FIGURA_SMISTARE],
    note: ['meccanismo', 'attenzione', 'consiglio'],
    vedi: ['archivio', 'docente', 'modelli-linguistici', 'finestra'],
  }, T.smistare),
]
