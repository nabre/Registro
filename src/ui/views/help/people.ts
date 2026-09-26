// La guida: persone, scheda, anagrafica-persona, mappa.
//
// Solo struttura e schemi: le parole stanno in `people.testi.ts`, il disegno
// della pagina in `../help.ts`, il vocabolario delle figure in `drawing.ts`.
// Come si divide una pagina fra i due file sta in testa a `types.ts`.

import {
  bollino,
  catena,
  disegno,
  freccia,
  larghezzaTesto,
  pastiglia,
  riquadro,
  righe,
  simbolo,
  telaio,
  tastino,
  testo,
  TONI_SIGLA,
  type Tono,
} from './drawing.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './people.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

/** Un nome che nella barra laterale disegnata non ci sta, accorciato: «Persone in form.». */
function accorcia (nome: string): string {
  return nome.length <= 16 ? nome : `${nome.slice(0, 15).trimEnd()}.`
}

/**
 * La barra laterale nello schema, nei gruppi di `ui/pages.ts`: il Registro,
 * L'anno e Il programma. L'Agenda è già scorsa via sopra, altrimenti le pagine
 * dell'anno uscirebbero dal telaio; «Docente di classe» qui non c'è.
 */
const BARRA_LATERALE = [
  T.persone.scritte.lezione,
  T.persone.scritte.valutazioni,
  T.persone.scritte.check,
  T.persone.scritte.pianiLezione,
  T.persone.scritte.documenti,
  T.persone.scritte.classi,
  accorcia(T.persone.scritte.laterale),
  T.persone.scritte.mappa,
  T.persone.scritte.corsi,
  T.persone.scritte.impostazioni,
  T.persone.scritte.guida,
]
const SCELTA_PERSONE = 6
const SCELTA_MAPPA = 7

const piccolo = { corpo: 'piccolo' } as const
const quieto = { corpo: 'piccolo', tono: 'quieto' } as const
const forte = { corpo: 'piccolo', forte: true } as const

/** Una casella della matrice delle presenze: la sigla, nel colore del suo stato. */
function casella (x: number, y: number, sigla: string): string {
  const tono = TONI_SIGLA[sigla] ?? 'quieto'
  return disegno(
    riquadro(x, y, 34, 18, { tono, raggio: 3 }),
    testo(x + 17, y + 13, sigla, { ...forte, ancora: 'centro', tono }),
  )
}

/** Quanto è larga una pastiglia con quel testo: come la disegna `pastiglia`. */
function largaPastiglia (contenuto: string): number {
  return larghezzaTesto(contenuto, 'piccolo') + 14
}

/**
 * Pastiglie in fila, ognuna dove l'aveva messa l'italiano o, se quella prima
 * in un'altra lingua è più lunga, subito dopo: `stacco` è lo spazio minimo.
 */
function pastiglieInFila (
  y: number,
  voci: ReadonlyArray<readonly [number, string, Tono]>,
  stacco: number,
): string {
  let fine = -Infinity
  return disegno(...voci.map(([dove, contenuto, tono]) => {
    const inizio = Math.max(dove, fine + stacco)
    fine = inizio + largaPastiglia(contenuto)
    return pastiglia(inizio, y, contenuto, tono)
  }))
}

/**
 * Pulsanti disegnati in fila che finiscono a `fine`: ognuno largo quanto in
 * italiano, o quanto il suo nome se in un'altra lingua è più lungo. Più largo,
 * la fila cresce verso sinistra. Ne dà anche dove comincia il primo.
 */
function tastiniADestra (
  fine: number,
  y: number,
  voci: ReadonlyArray<readonly [string, number]>,
  stacco: number,
): { disegno: string, inizio: number } {
  let cursore = fine + stacco
  const pezzi: string[] = []
  for (const [nome, largo] of [...voci].reverse()) {
    const l = Math.max(largo, larghezzaTesto(nome, 'piccolo') + 3)
    cursore -= stacco + l
    pezzi.unshift(tastino(cursore, y, l, nome))
  }
  return { disegno: disegno(...pezzi), inizio: cursore }
}

/** Le linguette della scheda, in fila da `x`. */
function linguette (x: number, y: number, dopo: readonly [number, number]): string {
  const s = T.persone.scritte
  return pastiglieInFila(y, [
    [x, s.anagrafica, 'accento'],
    [dopo[0], s.docente, 'quieto'],
    [dopo[1], s.materie, 'quieto'],
  ], 4)
}

/**
 * Una pastiglia che finisce entro `limite`: dove stava in italiano, o più a
 * sinistra se in un'altra lingua è più lunga.
 */
function pastigliaEntro (x: number, limite: number, y: number, contenuto: string, tono: Tono) {
  return pastiglia(Math.min(x, limite - largaPastiglia(contenuto)), y, contenuto, tono)
}

// ------------------------------------------------------------------ le figure

function figuraPersone (): string {
  const s = T.persone.scritte
  return disegno(
    telaio(10, 10, 620, 250, { laterali: BARRA_LATERALE, scelta: SCELTA_PERSONE }),
    // la testata
    testo(152, 54, s.titolo, { corpo: 'titolo', forte: true }),
    testo(152, 68, s.conti, quieto),
    tastiniADestra(622, 40, [[s.aTuttaPagina, 88], [parole().modifica, 58]], 6).disegno,
    // l'elenco
    riquadro(150, 78, 150, 20, { raggio: 4 }),
    simbolo('lente', 155, 81, 14, 'quieto'),
    testo(174, 92, 'rossi', { ...piccolo, macchina: true }),
    simbolo('giu', 150, 101, 12),
    testo(166, 111, 'DIC4a', forte),
    testo(296, 111, '3', { ...quieto, ancora: 'fine' }),
    riquadro(156, 118, 144, 26, { tono: 'accento', raggio: 4 }),
    testo(164, 129, s.anna, { ...forte, tono: 'accento' }),
    testo(164, 140, `DIC4a · ${s.officina}`, quieto),
    testo(164, 159, s.luca, forte),
    testo(164, 170, `DIC4a · ${s.ditta}`, quieto),
    testo(164, 189, s.marco, { ...forte, tono: 'quieto' }),
    testo(164, 200, 'DIC4a', quieto),
    simbolo('destra', 150, 207, 12),
    testo(166, 217, 'MEC2b', forte),
    testo(296, 217, '18', { ...quieto, ancora: 'fine' }),
    // la scheda accanto
    testo(328, 92, s.anna, { forte: true }),
    testo(402, 92, 'DIC4a', quieto),
    linguette(328, 98, [405, 524]),
    riquadro(328, 122, 294, 114, { tono: 'quieto' }),
    riquadro(338, 132, 50, 60, { raggio: 4 }),
    simbolo('utente', 351, 150, 24, 'quieto'),
    righe(400, 136, 110, 3),
    righe(400, 172, 110, 2),
    righe(400, 202, 90, 2),
    riquadro(524, 132, 88, 94, { etichetta: s.doveSta, simbolo: 'mappa' }),
    bollino(309, 88, 1),
    bollino(309, 217, 2),
    bollino(309, 131, 3),
    bollino(326, 64, 4),
    bollino(462, 50, 5),
    bollino(622, 122, 6),
  )
}

function figuraScheda (): string {
  const s = T.scheda.scritte
  const p = T.persone.scritte
  const tastini = tastiniADestra(618, 42, [[s.tornaAllElenco, 98], [parole().modifica, 62]], 4)
  // Le frecce stanno subito a sinistra dei pulsanti, e con loro il loro bollino.
  const sposta = tastini.inizio - 454
  return disegno(
    telaio(10, 10, 620, 230, { laterali: BARRA_LATERALE, scelta: SCELTA_PERSONE }),
    testo(152, 54, p.anna, { corpo: 'titolo', forte: true }),
    testo(152, 70, s.sottotitolo, quieto),
    riquadro(400 + sposta, 42, 22, 20, { raggio: 4 }),
    simbolo('su', 404 + sposta, 45, 14),
    riquadro(426 + sposta, 42, 22, 20, { raggio: 4 }),
    simbolo('giu', 430 + sposta, 45, 14),
    tastini.disegno,
    linguette(152, 84, [230, 349]),
    // l'anagrafica
    riquadro(152, 110, 300, 104, { tono: 'quieto' }),
    riquadro(162, 120, 46, 56, { raggio: 4 }),
    simbolo('utente', 173, 136, 24, 'quieto'),
    testo(220, 126, s.pif, forte),
    righe(220, 131, 170, 2),
    simbolo('duplica', 404, 127, 12, 'quieto'),
    testo(220, 157, s.rappresentante, forte),
    righe(220, 162, 170, 2),
    simbolo('duplica', 404, 158, 12, 'quieto'),
    testo(220, 188, s.azienda, forte),
    righe(220, 193, 170, 1),
    testo(162, 208, s.manca, quieto),
    // dove sta
    riquadro(462, 110, 160, 104, { tono: 'quieto' }),
    testo(472, 126, s.doveSta, forte),
    simbolo('casa', 480, 146, 18, 'accento'),
    simbolo('azienda', 586, 136, 18),
    simbolo('classi', 536, 170, 18, 'quieto'),
    freccia([[500, 154], [582, 146]], { tratteggio: true, tono: 'accento' }),
    testo(472, 206, s.distanze, quieto),
    bollino(424 + sposta, 74, 1),
    bollino(416, 93, 2),
    bollino(432, 135, 3),
    bollino(622, 110, 4),
  )
}

function figuraMatrice (): string {
  const s = T.scheda.scritte
  const dueMaterie = `${s.disegno} · ${s.calcolo}`
  return disegno(
    testo(20, 30, s.giorno, quieto),
    ...['08:20', '09:10', '10:15', '11:05'].map((ora, i) =>
      testo(127 + i * 44, 30, ora, { ...quieto, ancora: 'centro' }),
    ),
    testo(300, 30, s.materie, quieto),
    // lunedì
    testo(20, 53, `${s.lun} 15.09`, piccolo),
    casella(110, 40, 'X'), casella(154, 40, 'X'), casella(198, 40, 'P'), casella(242, 40, 'P'),
    testo(300, 53, dueMaterie, quieto),
    // giovedì
    testo(20, 77, `${s.gio} 18.09`, piccolo),
    casella(154, 64, 'P'), casella(198, 64, 'P'),
    testo(300, 77, s.calcolo, quieto),
    // la settimana dopo
    riquadro(20, 92, 350, 0.5, { tono: 'quieto', raggio: 0 }),
    testo(20, 113, `${s.lun} 22.09`, piccolo),
    casella(110, 100, 'X'), casella(154, 100, 'P'), casella(198, 100, 'P'), casella(242, 100, 'P'),
    testo(300, 113, dueMaterie, quieto),
    testo(20, 137, `${s.gio} 25.09`, piccolo),
    casella(154, 124, 'R'), casella(198, 124, 'E'),
    testo(300, 137, s.calcolo, quieto),
    testo(20, 172, s.sigle, quieto),
    // il box di una materia
    riquadro(392, 14, 238, 156, { tono: 'quieto' }),
    testo(404, 34, s.disegno, { forte: true }),
    testo(404, 50, s.numeri, quieto),
    riquadro(404, 62, 104, 44, { etichetta: s.presenze, sotto: s.giornateStorte }),
    riquadro(516, 62, 104, 44, { etichetta: s.valutazioni, sotto: s.notaEProve }),
    riquadro(404, 114, 104, 44, { etichetta: s.comEAndata, sotto: s.laMatrice }),
    riquadro(516, 114, 104, 44, { etichetta: s.osservazioni, sotto: s.annotate }),
    bollino(127, 14, 1),
    bollino(127, 82, 2),
    bollino(282, 49, 3),
    bollino(378, 92, 4),
    bollino(20, 188, 5),
    bollino(630, 14, 6),
  )
}

/** Una casella del modulo, a sinistra, e dove finisce quel che ci si scrive, a destra. */
function figuraAnagrafica (): string {
  const s = T.anagraficaPersona.scritte
  const destini: ReadonlyArray<readonly [string, string, string]> = [
    [s.nascita, s.nascitaDove, s.nascitaCome],
    [s.frequenta, s.frequentaDove, s.frequentaCome],
    [s.indirizzi, s.indirizziDove, s.indirizziCome],
    [parole().email, s.emailDove, s.emailCome],
    [s.emailDatore, s.emailDatoreDove, s.emailDatoreCome],
    [s.telefoni, s.telefoniDove, s.telefoniCome],
    [s.foto, s.fotoDove, s.fotoCome],
  ]
  return disegno(
    ...destini.map(([voce, dove, come], i) => {
      const y = 8 + i * 38
      return disegno(
        riquadro(10, y, 200, 30, { etichetta: voce, aSinistra: true }),
        freccia([[214, y + 15], [296, y + 15]]),
        riquadro(300, y, 330, 30, { tono: 'accento', etichetta: dove, aSinistra: true }),
        testo(622, y + 19, come, { ...quieto, ancora: 'fine' }),
      )
    }),
  )
}

function figuraMappa (): string {
  const s = T.mappa.scritte
  const p = T.persone.scritte
  return disegno(
    telaio(10, 10, 620, 260, { laterali: BARRA_LATERALE, scelta: SCELTA_MAPPA }),
    testo(152, 52, p.mappa, { corpo: 'titolo', forte: true }),
    testo(200, 52, s.conti, quieto),
    // la colonna
    pastiglieInFila(64, [
      [150, parole().tutti, 'accento'],
      [197, s.lavoro, 'quieto'],
      [303, s.domicilio, 'quieto'],
    ], 3.5),
    riquadro(150, 90, 222, 34, { tratteggio: true, raggio: 4 }),
    testo(158, 104, s.via1, forte),
    testo(158, 117, s.chi1, quieto),
    tastino(322, 97, 44, s.trova),
    riquadro(150, 128, 222, 34, { raggio: 4 }),
    testo(158, 142, p.officina, forte),
    testo(158, 155, s.via2, quieto),
    pastigliaEntro(276, 368, 136, s.soloPaese, 'attenzione'),
    riquadro(150, 166, 222, 34, { raggio: 4 }),
    testo(158, 180, p.ditta, forte),
    testo(158, 193, s.via3, quieto),
    pastigliaEntro(270, 368, 174, s.inTirocinio, 'informativo'),
    riquadro(150, 204, 222, 34, { raggio: 4 }),
    testo(158, 218, s.via4, forte),
    testo(158, 231, s.chi4, quieto),
    pastigliaEntro(316, 368, 212, s.distanza, 'quieto'),
    // la carta
    riquadro(390, 62, 232, 182, { tono: 'quieto' }),
    freccia([[424, 92], [556, 88]], { tratteggio: true, tono: 'accento' }),
    simbolo('casa', 404, 80, 20, 'accento'),
    simbolo('azienda', 560, 76, 20),
    riquadro(470, 104, 146, 58),
    testo(478, 120, p.ditta, forte),
    testo(478, 134, s.inTirocinioQui, quieto),
    // testo-fisso: nomi di persone d'esempio, uguali in ogni lingua
    testo(478, 150, 'Anna R. · Luca B. · …', { ...piccolo, tono: 'accento' }),
    simbolo('casa', 420, 176, 20, 'accento'),
    simbolo('classi', 548, 196, 20, 'quieto'),
    testo(572, 212, s.sede, quieto),
    testo(398, 238, '2 km', quieto),
    testo(616, 238, '© OpenStreetMap', { ...quieto, ancora: 'fine' }),
    bollino(380, 73, 1),
    bollino(380, 107, 2),
    bollino(380, 145, 3),
    bollino(380, 183, 4),
    bollino(616, 104, 5),
    bollino(490, 76, 6),
    bollino(536, 206, 7),
  )
}

function figuraGeocodifica (): string {
  const s = T.mappa.scritte
  return disegno(
    catena(10, 14, [
      { etichetta: s.rigaScritta, sotto: s.dallAnagrafica },
      { etichetta: s.spezzata, sotto: s.parti },
      { etichetta: s.quattro, sotto: s.laPrima },
      { etichetta: s.punto, sotto: s.nelDocumento, tono: 'positivo', simbolo: 'segnaposto' },
    ], { largo: 136, stacco: 25, alto: 44 }),
    testo(16, 80, s.esempio1, quieto),
    testo(16, 94, s.esempio2, quieto),
    testo(177, 80, s.messi, quieto),
    testo(177, 94, s.quali, quieto),
    testo(177, 128, s.parte1, { ...quieto, tono: 'attenzione' }),
    testo(177, 142, s.parte2, { ...quieto, tono: 'attenzione' }),
    freccia([[292, 140], [328, 147]], { tono: 'attenzione' }),
    ...[s.domanda1, s.domanda2, s.domanda3, s.domanda4].map((domanda, i) =>
      disegno(
        riquadro(332, 72 + i * 32, 136, 22, {
          etichetta: domanda,
          tono: i >= 2 ? 'attenzione' : 'neutro',
          raggio: 4,
        }),
        i < 3 && freccia([[400, 95 + i * 32], [400, 103 + i * 32]]),
      ),
    ),
    freccia([[400, 59], [400, 70]]),
    testo(489, 80, s.una1, quieto),
    testo(489, 94, s.una2, quieto),
    testo(489, 108, s.una3, quieto),
  )
}

// ----------------------------------------------------------------- le sezioni

export const SEZIONI_PERSONE: SezioneGuida[] = [
  sezione({
    id: 'persone',
    parte: 'anno',
    simbolo: 'utente',
    vista: 'persone',
    figure: [{ vista: '0 0 640 270', disegno: figuraPersone() }],
    note: ['meccanismo', 'consiglio'],
    vedi: ['scheda', 'anagrafica-persona', 'classi', 'mappa'],
  }, T.persone),
  sezione({
    id: 'scheda',
    parte: 'anno',
    simbolo: 'utente',
    figure: [
      { vista: '0 0 640 250', disegno: figuraScheda() },
      { vista: '0 0 640 200', disegno: figuraMatrice() },
    ],
    note: ['meccanismo', 'attenzione'],
    vedi: ['persone', 'anagrafica-persona', 'mappa', 'assenze', 'docente', 'rapporti'],
  }, T.scheda),
  sezione({
    id: 'anagrafica-persona',
    parte: 'anno',
    simbolo: 'matita',
    figure: [{ vista: '0 0 640 276', disegno: figuraAnagrafica() }],
    note: ['attenzione', 'meccanismo'],
    vedi: ['scheda', 'mappa', 'classi', 'assenze', 'impostazioni'],
  }, T.anagraficaPersona),
  sezione({
    id: 'mappa',
    parte: 'anno',
    simbolo: 'mappa',
    vista: 'mappa',
    figure: [
      { vista: '0 0 640 280', disegno: figuraMappa() },
      { vista: '0 0 640 200', disegno: figuraGeocodifica() },
    ],
    note: ['attenzione', 'meccanismo'],
    vedi: ['scheda', 'anagrafica-persona', 'persone'],
  }, T.mappa),
]
