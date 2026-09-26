// La guida: valutazioni, medie, recuperi, riconsegne, rapporti, fogli.
//
// Solo struttura e schemi: le parole stanno in `grades.testi.ts`, il disegno
// della pagina in `../help.ts`, il vocabolario delle figure in `drawing.ts`.
// Come si divide una pagina fra i due file sta in testa a `types.ts`.

import {
  bollino,
  catena,
  disegno,
  freccia,
  larghezzaTesto,
  lineaTempo,
  pastiglia,
  riquadro,
  righe,
  simbolo,
  telaio,
  testo,
  type Tono,
} from './drawing.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './grades.testi.js'
import { sezione, type FiguraGuida, type SezioneGuida } from './types.js'

const T = testi()

/** Uno schema senza parole: quel che resta di una figura nel file della pagina. */
type Schema = Pick<FiguraGuida, 'vista' | 'disegno'>

// ------------------------------------------------------------ gli attrezzi

/** Le pagine del gruppo Registro nella barra laterale, nel loro ordine. */
const REGISTRO = [
  T.valutazioni.scritte.lezione,
  T.valutazioni.scritte.valutazioni,
  T.valutazioni.scritte.check,
  T.valutazioni.scritte.pianiLezione,
  T.valutazioni.scritte.documenti,
]

/** Una casella di tabella: un rettangolo, e il suo contenuto al centro. */
function casella (
  x: number,
  y: number,
  l: number,
  a: number,
  contenuto: string,
  tono: Tono = 'neutro',
): string {
  return disegno(
    riquadro(x, y, l, a, { tono, raggio: 3 }),
    contenuto !== '' &&
      testo(x + l / 2, y + a / 2 + 3.6, contenuto, {
        corpo: 'piccolo',
        ancora: 'centro',
        tono: tono === 'quieto' ? 'neutro' : tono,
      }),
  )
}

/**
 * Un pallino: un voto sul grafico, o il punto che dice se un foglio c'è. Pieno
 * usa il colore delle punte delle frecce; vuoto è un anello.
 */
function pallino (cx: number, cy: number, tono: Tono, lato = 7, pieno = true): string {
  if (!pieno) return riquadro(cx - lato / 2, cy - lato / 2, lato, lato, { tono, raggio: lato / 2 })
  // testo-fisso: un pezzo di SVG, non parole da leggere
  return `<circle cx="${cx}" cy="${cy}" r="${lato / 2}" class="gd-punta gd-punta--${tono}"/>`
}

/** Pastiglie in fila da `x`, a `stacco` l'una dall'altra; ne dà anche i centri. */
function filaDiPastiglie (
  x: number,
  y: number,
  voci: ReadonlyArray<readonly [string, Tono]>,
): { disegno: string, centri: number[] } {
  const stacco = 5
  let cursore = x
  const centri: number[] = []
  const pezzi = voci.map(([nome, tono]) => {
    const largo = larghezzaTesto(nome, 'piccolo') + 14
    centri.push(cursore + largo / 2)
    const pezzo = pastiglia(cursore, y, nome, tono)
    cursore += largo + stacco
    return pezzo
  })
  return { disegno: disegno(...pezzi), centri }
}

// ------------------------------------------------------------- le figure

/** La pagina Valutazioni: la griglia a sinistra, la prova aperta a destra. */
function figuraPagina (): Schema {
  const s = T.valutazioni.scritte
  const x0 = 150
  const nome = 120
  const colonna = 30
  const media = 32
  const fineProve = x0 + nome + 4 * colonna
  const date = ['12.09', '03.10', '24.10', '14.11']
  // Voti, media e nota di ogni riga: i conti sono veri, pesi tutti a 1.
  const voti: Array<[string[], string, string, Tono]> = [
    [['5', '4.5', '4', '5'], '4.63', '4.5', 'positivo'],
    [['4', '4.5', '3.5', 'X'], '4', '4', 'positivo'],
    [['3.5', '3', '3.5', '3.5'], '3.38', '3.5', 'negativo'],
    [['5.5', '5', '5.5', '6'], '5.5', '5.5', 'positivo'],
    [['4.5', '4', '4.5', '5'], '4.5', '4.5', 'positivo'],
  ]
  const piede = ['4.5', '4.2', '4.2', '4.88']
  // I voti dell'ultima prova sul grafico a punti: 5, 3.5, 6, 5.
  const punto = (voto: number): number => 472 + (voto - 1) * 28

  return {
    vista: '0 0 640 292',
    disegno: disegno(
      telaio(10, 10, 620, 272, {
        laterali: REGISTRO,
        scelta: 1,
        stato: s.stato,
      }),
      riquadro(x0, 40, 472, 20, {
        tono: 'attenzione',
        etichetta: s.sganciati,
        aSinistra: true,
      }),
      // La testata della griglia: il titolo di ogni prova e sotto la data,
      // l'ultima scelta. I pesi sono tutti 1, e il peso 1 non si scrive.
      riquadro(x0, 63, 304, 25, { tono: 'quieto', raggio: 3 }),
      riquadro(x0 + nome + 3 * colonna + 1, 64, colonna - 2, 23, { tono: 'accento', raggio: 3 }),
      ...date.map((data, i) =>
        disegno(
          righe(x0 + nome + i * colonna + 6, 70, colonna - 12, 1),
          testo(x0 + nome + i * colonna + colonna / 2, 84, data, {
            corpo: 'piccolo',
            ancora: 'centro',
            tono: i === 3 ? 'accento' : 'quieto',
          }),
        )),
      testo(fineProve + media / 2, 82.5, s.media, { corpo: 'piccolo', ancora: 'centro' }),
      testo(fineProve + media * 1.5, 82.5, s.nota, { corpo: 'piccolo', ancora: 'centro' }),
      ...voti.map(([suoi, mediaRiga, nota, tono], r) => {
        const y = 90 + r * 16
        return disegno(
          righe(x0 + 8, y + 6, 80, 1),
          ...suoi.map((voto, i) => {
            const cx = x0 + nome + i * colonna
            return casella(cx + 3, y + 1, 22, 14, voto, voto === 'X' ? 'quieto' : 'neutro')
          }),
          // La «R» dell'ultima riga: quel voto viene da un recupero.
          r === 4 &&
            testo(x0 + nome + 3 * colonna + 28, y + 11.5, s.sigla, {
              corpo: 'piccolo',
              ancora: 'centro',
              tono: 'informativo',
              forte: true,
            }),
          testo(fineProve + media / 2, y + 11.5, mediaRiga, {
            corpo: 'piccolo',
            ancora: 'centro',
            tono: 'quieto',
          }),
          casella(fineProve + media + 3, y + 1.5, media - 6, 13, nota, tono),
        )
      }),
      riquadro(x0, 170, 304, 18, { tono: 'quieto', raggio: 3 }),
      testo(x0 + 12, 182.5, s.mediaClasse, { corpo: 'piccolo' }),
      ...piede.map((valore, i) =>
        testo(x0 + nome + i * colonna + colonna / 2, 182.5, valore, {
          corpo: 'piccolo',
          ancora: 'centro',
          forte: true,
        })),
      // I recuperi della prova aperta, sotto la griglia.
      riquadro(x0, 196, 304, 62),
      testo(x0 + 10, 211, s.recuperi, { forte: true }),
      righe(x0 + 10, 222, 80, 1),
      testo(x0 + 130, 226, '—', { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
      pastiglia(x0 + 190, 215, s.daFissare, 'attenzione'),
      righe(x0 + 10, 241, 80, 1),
      testo(x0 + 130, 245, '5', { corpo: 'piccolo', ancora: 'centro' }),
      pastiglia(x0 + 190, 234, s.recuperata, 'positivo'),
      // La colonna di destra: la prova aperta, la riconsegna, i documenti.
      riquadro(462, 70, 160, 86),
      testo(472, 88, s.prova, { forte: true }),
      righe(472, 95, 100, 1),
      testo(472, 114, s.numeri, { corpo: 'piccolo', tono: 'quieto' }),
      righe(472, 142, 140, 1),
      pallino(punto(3.5), 137, 'negativo'),
      pallino(punto(5), 137, 'positivo'),
      pallino(punto(5), 129, 'positivo'),
      pallino(punto(6), 137, 'positivo'),
      riquadro(462, 164, 160, 40, { etichetta: s.riconsegna, sotto: s.resaATutti }),
      riquadro(462, 212, 160, 44, { etichetta: s.documenti, sotto: s.proveCorrette }),
      bollino(622, 40, 1),
      bollino(x0, 63, 2),
      bollino(x0 + 304, 63, 3),
      bollino(x0, 179, 4),
      bollino(x0 + 304, 196, 5),
      bollino(622, 70, 6),
      bollino(622, 164, 7),
      bollino(622, 212, 8),
    ),
  }
}

/** Dal voto alla nota: pesi, media al centesimo, passo della nota. */
function figuraMedia (): Schema {
  const s = T.medie.scritte
  return {
    vista: '0 0 640 170',
    disegno: disegno(
      testo(70, 13, s.votoPeso, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
      riquadro(10, 20, 120, 30, { etichetta: '5 × 1' }),
      riquadro(10, 58, 120, 30, { etichetta: '4.5 × 2' }),
      riquadro(10, 96, 120, 30, { etichetta: '3.75 × 1' }),
      riquadro(10, 134, 120, 28, { tono: 'quieto', tratteggio: true, etichetta: s.fuori }),
      freccia([[133, 35], [197, 68]]),
      freccia([[133, 73], [197, 76]]),
      freccia([[133, 111], [197, 84]]),
      riquadro(200, 51, 190, 50, {
        tono: 'accento',
        etichetta: s.media,
        sotto: s.conto,
      }),
      freccia([[393, 76], [437, 76]], { etichetta: s.passo }),
      riquadro(440, 51, 190, 50, { tono: 'positivo', etichetta: s.nota, sotto: s.pagella }),
      testo(295, 122, s.pesoZero, {
        corpo: 'piccolo',
        tono: 'quieto',
        ancora: 'centro',
      }),
      testo(535, 122, s.passoZero, {
        corpo: 'piccolo',
        tono: 'quieto',
        ancora: 'centro',
      }),
      bollino(130, 20, 1),
      bollino(390, 51, 2),
      bollino(630, 51, 3),
    ),
  }
}

/** Gli stati di un recupero, da quando nasce a quando il foglio torna. */
function figuraRecuperi (): Schema {
  const s = T.recuperi.scritte
  return {
    vista: '0 0 640 180',
    disegno: disegno(
      catena(10, 24, [
        { etichetta: s.assente, sotto: s.xOAppello },
        { etichetta: s.daFissare, sotto: s.nessunaData, tono: 'attenzione' },
        { etichetta: s.fissato, sotto: s.giornoCe, tono: 'informativo' },
        { etichetta: s.recuperata, sotto: s.votoMesso, tono: 'positivo' },
        { etichetta: s.resa, sotto: s.riconsegnataIl, tono: 'positivo' },
      ], { largo: 100, stacco: 30, alto: 44 }),
      freccia([[190, 71], [190, 117]], { etichetta: s.dichiarato }),
      riquadro(128, 120, 124, 44, {
        tono: 'quieto',
        etichetta: s.nonSiRecupera,
        sotto: s.senzaVoto,
      }),
      freccia([[320, 71], [320, 117]]),
      riquadro(270, 120, 100, 44, {
        tono: 'negativo',
        etichetta: s.nonRifatta,
        sotto: s.dataPassata,
      }),
      freccia([[373, 142], [450, 142], [450, 71]], { tratteggio: true, etichetta: s.ilVoto }),
      bollino(110, 24, 1),
      bollino(240, 24, 2),
      bollino(500, 24, 3),
      bollino(630, 24, 4),
      bollino(252, 120, 5),
    ),
  }
}

/** La vita di una prova dopo il giorno in cui si fa. */
function figuraRiconsegne (): Schema {
  const s = T.riconsegne.scritte
  return {
    vista: '0 0 640 170',
    disegno: disegno(
      riquadro(50, 26, 190, 24, { tono: 'attenzione', etichetta: s.daCorreggere }),
      riquadro(245, 26, 243, 24, { tono: 'informativo', etichetta: s.daRiconsegnare }),
      riquadro(492, 26, 118, 24, { tono: 'positivo', etichetta: s.riconsegnata }),
      lineaTempo(50, 68, 560, [
        { dove: 0, nome: s.provaSvolta },
        { dove: 0.35, nome: s.ultimoVoto },
        { dove: 0.6, nome: s.oltre, tono: 'negativo' },
        { dove: 0.8, nome: s.resaATutti, tono: 'positivo' },
      ]),
      riquadro(50, 110, 270, 46, {
        etichetta: s.chiMancava,
        sotto: s.senzaData,
      }),
      riquadro(340, 110, 270, 46, {
        tono: 'quieto',
        etichetta: s.chiHaRecuperato,
        sotto: s.nellaRiga,
      }),
      bollino(240, 26, 1),
      bollino(490, 26, 2),
      bollino(432, 84, 3),
      bollino(320, 110, 4),
      bollino(610, 110, 5),
    ),
  }
}

/** La pagina Documenti: le schede, i riquadri con le righe, l'anteprima. */
function figuraDocumenti (): Schema {
  const s = T.rapporti.scritte
  const azioni = filaDiPastiglie(146, 39, [
    [s.corso, 'accento'],
    [s.lezioni, 'quieto'],
    [s.persone, 'quieto'],
    [s.aggiornaTutto, 'neutro'],
    [s.combina, 'neutro'],
  ])
  /** Una riga di foglio: casella, nome, punto, lente, frecce, cestino. */
  const riga = (y: number, spuntata: boolean, pronto: boolean): string =>
    disegno(
      riquadro(154, y, 9, 9, { tono: spuntata ? 'accento' : 'neutro', raggio: 2 }),
      righe(170, y + 3, 76, 1),
      pallino(266, y + 4.5, pronto ? 'positivo' : 'neutro', 8, pronto),
      simbolo('lente', 280, y - 2, 13, pronto ? 'neutro' : 'quieto'),
      simbolo(pronto ? 'ricarica' : 'esporta', 299, y - 2, 13),
      simbolo('cestino', 318, y - 2, 13, 'quieto'),
    )

  return {
    vista: '0 0 640 302',
    disegno: disegno(
      telaio(10, 10, 620, 282, {
        laterali: REGISTRO,
        scelta: 4,
      }),
      azioni.disegno,
      // A sinistra i riquadri, stretti quanto una riga.
      riquadro(146, 78, 202, 100),
      testo(154, 94, s.delCorso, { forte: true }),
      testo(340, 94, s.dueDiQuattro, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
      riga(124, true, true),
      riga(142, false, true),
      riga(160, false, false),
      riquadro(146, 186, 202, 80),
      testo(154, 202, s.prove, { forte: true }),
      testo(340, 202, s.treDiTre, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
      riga(214, true, true),
      riga(232, true, true),
      riga(250, false, true),
      // A destra il foglio aperto, con i suoi gesti in testa.
      testo(366, 90, s.foglio, { forte: true }),
      // Il conto finisce prima delle frecce: più lungo, si sposta a sinistra.
      testo(Math.min(528, 570 - larghezzaTesto(s.treDiDodici, 'piccolo')), 90, s.treDiDodici, {
        corpo: 'piccolo', tono: 'quieto',
      }),
      simbolo('su', 572, 78, 14),
      simbolo('giu', 590, 78, 14),
      simbolo('ricarica', 366, 99, 13),
      simbolo('cestino', 386, 99, 13),
      simbolo('schermo', 406, 99, 13),
      pastiglia(428, 97, parole().chiudi, 'neutro'),
      riquadro(440, 124, 106, 142),
      righe(450, 136, 70, 2),
      righe(450, 162, 86, 7),
      bollino(azioni.centri[1], 66, 1),
      bollino(azioni.centri[3], 66, 2),
      bollino(158, 108, 3),
      bollino(266, 108, 4),
      bollino(305, 108, 5),
      bollino(620, 100, 6),
    ),
  }
}

/** Chi rifà i documenti, e quando. */
function figuraChiLiRifa (): Schema {
  const s = T.rapporti.scritte
  return {
    vista: '0 0 640 140',
    disegno: disegno(
      testo(10, 12, s.aOgniModifica, { corpo: 'piccolo', forte: true, tono: 'accento' }),
      catena(10, 18, [
        { etichetta: s.votoAppello },
        { etichetta: s.quiete, sotto: s.alMassimo, simbolo: 'orologio' },
        { etichetta: s.rifatti, sotto: s.quali, tono: 'positivo' },
      ], { largo: 190, stacco: 25 }),
      testo(10, 84, s.quandoSiChiude, { corpo: 'piccolo', forte: true, tono: 'accento' }),
      catena(10, 90, [
        { etichetta: s.svolta, sotto: s.siChiude },
        { etichetta: s.rifatti, sotto: s.suoVerbale, tono: 'positivo' },
      ], { largo: 190, stacco: 25 }),
      riquadro(440, 90, 190, 40, {
        tono: 'quieto',
        tratteggio: true,
        etichetta: s.soloAMano,
        sotto: s.nessuno,
      }),
    ),
  }
}

/** Un pezzo della griglia Valutazioni in PDF, con le sigle dei recuperi. */
function figuraFoglio (): Schema {
  const s = T.fogli.scritte
  const colonne = [
    { x: 25, l: 150, titolo: '' },
    { x: 175, l: 130, titolo: s.verifica },
    { x: 305, l: 130, titolo: s.orale },
    { x: 435, l: 90, titolo: s.media },
    { x: 525, l: 90, titolo: s.nota },
  ]
  const valori = [
    ['5', '4.5', '4.75', '5'],
    [s.votoRecuperato, '5', '4.50', '4.5'],
    [s.recuperoFissato, '4', '4.00', '4'],
    [s.dispensato, '3.5', '3.50', '3.5'],
    [s.assente, '5', '5.00', '5'],
  ]

  return {
    vista: '0 0 640 166',
    disegno: disegno(
      riquadro(25, 16, 590, 22, { tono: 'quieto', raggio: 3 }),
      ...colonne.map((c) =>
        testo(c.x + c.l / 2, 31, c.titolo, { corpo: 'piccolo', forte: true, ancora: 'centro' })),
      ...valori.map((suoi, r) => {
        const y = 40 + r * 24
        return disegno(
          r % 2 === 1 && riquadro(25, y, 590, 24, { tono: 'quieto', raggio: 0 }),
          righe(35, y + 10, 90, 1),
          ...suoi.map((valore, i) => {
            const c = colonne[i + 1]
            const sigla = i === 0 && r > 0
            return testo(c.x + c.l / 2, y + 16, valore, {
              corpo: 'piccolo',
              ancora: 'centro',
              tono: sigla ? 'informativo' : 'neutro',
              forte: sigla,
            })
          }),
        )
      }),
      bollino(292, 76, 1),
      bollino(292, 100, 2),
      bollino(292, 124, 3),
      bollino(292, 148, 4),
      bollino(605, 16, 5),
    ),
  }
}

// ------------------------------------------------------------ le sezioni

export const SEZIONI_VALUTAZIONI: SezioneGuida[] = [
  sezione({
    id: 'valutazioni',
    parte: 'registro',
    simbolo: 'valutazioni',
    vista: 'valutazioni',
    figure: [figuraPagina()],
    note: ['meccanismo', 'attenzione'],
    vedi: ['medie', 'recuperi', 'riconsegne', 'lezione', 'piani', 'rapporti'],
  }, T.valutazioni),
  sezione({
    id: 'medie',
    parte: 'registro',
    simbolo: 'torta',
    vista: 'valutazioni',
    figure: [figuraMedia()],
    note: ['meccanismo', 'attenzione'],
    vedi: ['valutazioni', 'impostazioni', 'fogli'],
  }, T.medie),
  sezione({
    id: 'recuperi',
    parte: 'registro',
    simbolo: 'ricarica',
    vista: 'valutazioni',
    figure: [figuraRecuperi()],
    note: ['meccanismo', 'consiglio', 'attenzione'],
    vedi: ['valutazioni', 'riconsegne', 'todo', 'lezione', 'fogli'],
  }, T.recuperi),
  sezione({
    id: 'riconsegne',
    parte: 'registro',
    simbolo: 'spunta',
    vista: 'valutazioni',
    figure: [figuraRiconsegne()],
    note: ['meccanismo'],
    vedi: ['valutazioni', 'recuperi', 'todo', 'lezione', 'fogli'],
  }, T.riconsegne),
  sezione({
    id: 'rapporti',
    parte: 'registro',
    simbolo: 'esporta',
    vista: 'documenti',
    figure: [figuraDocumenti(), figuraChiLiRifa()],
    note: ['meccanismo', 'consiglio', 'attenzione'],
    vedi: ['fogli', 'intestazione', 'valutazioni', 'assenze', 'archivio'],
  }, T.rapporti),
  sezione({
    id: 'fogli',
    parte: 'registro',
    simbolo: 'documento',
    vista: 'documenti',
    figure: [figuraFoglio()],
    note: ['meccanismo'],
    vedi: ['rapporti', 'medie', 'recuperi', 'riconsegne', 'intestazione', 'assenze'],
  }, T.fogli),
]
