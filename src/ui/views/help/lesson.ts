// La guida: lezione, appello, consegne, annotazioni, piani.
//
// Solo struttura e schemi: le parole stanno in `lesson.testi.ts`, il disegno
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
  testo,
  TONI_SIGLA,
  type Tono,
} from './drawing.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './lesson.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

// ------------------------------------------------------------------ figure

/**
 * La barra laterale nello schema, dall'alto: l'Agenda e il Registro, i primi
 * due gruppi di `ui/pages.ts`. Gli altri tre stanno sotto, oltre il bordo.
 */
const LATERALI = [
  T.lezione.scritte.calendario, T.lezione.scritte.pendenze, T.lezione.scritte.daSmistare,
  T.lezione.scritte.lezione, T.lezione.scritte.valutazioni, T.lezione.scritte.check,
  T.lezione.scritte.pianiLezione, T.lezione.scritte.documenti,
]

/**
 * I tre stati dell'ora e «Modifica l'ora», di fila: ogni pulsante parte dove
 * l'aveva messo l'italiano, o subito dopo quello prima se in un'altra lingua
 * è più lungo.
 */
function statiDellOra (): string {
  const s = T.lezione.scritte
  let fine = -Infinity
  return disegno(...([
    [150, s.pianificata, 'informativo'],
    [236, s.svolta, 'positivo'],
    [292, s.annullata, 'quieto'],
    [366, s.modificaOra, 'neutro'],
  ] as const).map(([x, nome, tono]) => {
    const dove = Math.max(x, fine + 6.5)
    fine = dove + larghezzaTesto(nome, 'piccolo') + 14
    return pastiglia(dove, 32, nome, tono)
  }))
}

/** La pagina Lezione vista dall'alto. */
const PAGINA_LEZIONE = disegno(
  telaio(0, 0, 640, 250, {
    laterali: LATERALI,
    scelta: LATERALI.indexOf(T.lezione.scritte.lezione),
  }),
  // La riga delle azioni.
  riquadro(142, 30, 450, 22, { tono: 'quieto' }),
  statiDellOra(),
  // La testata compatta.
  testo(142, 74, 'I MEC A', { corpo: 'titolo', forte: true }),
  testo(142, 88, T.lezione.scritte.testata, { corpo: 'piccolo', tono: 'quieto' }),
  pastiglia(356, 62, T.lezione.scritte.statoPianificata, 'informativo'),
  testo(452, 74, T.lezione.scritte.presenti, { corpo: 'piccolo' }),
  testo(452, 88, T.lezione.scritte.ritardi, { corpo: 'piccolo', tono: 'quieto' }),
  // Il navigatore delle ore del corso.
  riquadro(142, 96, 450, 22, { tono: 'neutro' }),
  simbolo('sinistra', 148, 99, 16),
  riquadro(168, 99, 250, 16, { tono: 'quieto', raggio: 4 }),
  testo(176, 111, T.lezione.scritte.navigatore, { corpo: 'piccolo' }),
  simbolo('destra', 422, 99, 16),
  testo(448, 111, T.lezione.scritte.posizione, { corpo: 'piccolo', tono: 'quieto' }),
  // Le tre schede.
  riquadro(142, 126, 120, 20, { tono: 'accento', etichetta: T.lezione.scritte.amministrazione }),
  riquadro(266, 126, 80, 20, { etichetta: T.lezione.scritte.schedaLezione }),
  riquadro(350, 126, 100, 20, { etichetta: T.lezione.scritte.annotazioni }),
  // Le due colonne della scheda scelta: l'appello; consegne, check e prove.
  riquadro(142, 154, 236, 70, { tono: 'neutro' }),
  testo(152, 170, T.lezione.scritte.appello, { forte: true }),
  righe(152, 182, 210, 4, 10),
  riquadro(390, 154, 202, 20, { etichetta: T.lezione.scritte.consegne, aSinistra: true }),
  riquadro(390, 179, 202, 20, { etichetta: T.lezione.scritte.check, aSinistra: true }),
  riquadro(390, 204, 202, 20, {
    etichetta: T.lezione.scritte.proveDaRiconsegnare,
    aSinistra: true,
  }),
  bollino(612, 41, 1),
  bollino(612, 80, 2),
  bollino(612, 107, 3),
  bollino(612, 136, 4),
  bollino(612, 189, 5),
)

/** Il ciclo di vita di un'ora. */
const CICLO_ORA = disegno(
  riquadro(10, 38, 150, 44, {
    tono: 'informativo',
    etichetta: T.lezione.scritte.pianificata,
    sotto: T.lezione.scritte.oraDaFare,
  }),
  riquadro(245, 38, 150, 44, {
    tono: 'attenzione',
    etichetta: T.lezione.scritte.daCompilare,
    sotto: T.lezione.scritte.passataNonChiusa,
  }),
  riquadro(480, 38, 150, 44, {
    tono: 'positivo',
    etichetta: T.lezione.scritte.svolta,
    sotto: T.lezione.scritte.chiusa,
  }),
  freccia([[163, 60], [242, 60]], { etichetta: T.lezione.scritte.oraPassa }),
  freccia([[398, 60], [477, 60]], { tono: 'positivo', etichetta: T.lezione.scritte.svolta }),
  freccia([[85, 34], [85, 18], [555, 18], [555, 34]], {
    tratteggio: true,
    etichetta: T.lezione.scritte.svoltaPrima,
  }),
  riquadro(10, 128, 150, 44, {
    tono: 'negativo',
    etichetta: T.lezione.scritte.annullata,
    sotto: T.lezione.scritte.restaNonConta,
  }),
  freccia([[85, 86], [85, 124]], { tono: 'negativo' }),
  testo(95, 110, T.lezione.scritte.conConferma, { corpo: 'piccolo', tono: 'quieto' }),
  testo(320, 110, T.lezione.scritte.nellaBarra, {
    corpo: 'piccolo',
    tono: 'quieto',
    ancora: 'centro',
  }),
  riquadro(480, 128, 150, 44, {
    tono: 'quieto',
    tratteggio: true,
    etichetta: T.lezione.scritte.verbale,
    sotto: T.lezione.scritte.inDocumenti,
  }),
  freccia([[555, 86], [555, 124]]),
  bollino(160, 38, 1),
  bollino(395, 38, 2),
  bollino(630, 38, 3),
  bollino(160, 128, 4),
)

/** Una casella dell'appello, con la sigla e il colore del suo stato. */
function casella (x: number, y: number, sigla: string): string {
  return riquadro(x, y, 36, 22, {
    tono: TONI_SIGLA[sigla] ?? 'neutro',
    etichetta: sigla,
    tratteggio: sigla === '-',
    raggio: 4,
  })
}

/** Le colonne delle UD: la pausa stacca la seconda dalla terza. */
const COLONNE_UD = [160, 204, 262, 306]

function rigaAppello (y: number, nome: string, riga: string, sigle: string[]): string {
  return disegno(
    riquadro(10, y, 24, 22, {
      tono: TONI_SIGLA[riga] ?? 'neutro',
      etichetta: riga,
      tratteggio: riga === '-',
      raggio: 4,
    }),
    testo(42, y + 15, nome),
    ...sigle.map((sigla, i) => casella(COLONNE_UD[i], y, sigla)),
    riquadro(400, y, 150, 22, { tono: 'quieto', raggio: 4 }),
  )
}

/** L'appello: persone in riga, unità didattiche in colonna. */
const MATRICE_APPELLO = disegno(
  ...COLONNE_UD.map((x, i) =>
    disegno(
      testo(x + 18, 18, `${T.appello.scritte.ud} ${i + 1}`, { corpo: 'piccolo', ancora: 'centro' }),
      testo(x + 18, 30, ['08:20', '09:05', '10:05', '10:50'][i], {
        corpo: 'piccolo',
        tono: 'quieto',
        ancora: 'centro',
      }),
      casella(x, 36, '·'),
    ),
  ),
  riquadro(245, 36, 12, 116, { tono: 'quieto', tratteggio: true, raggio: 3 }),
  testo(374, 52, T.appello.scritte.min, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
  testo(408, 52, T.appello.scritte.nota, { corpo: 'piccolo', tono: 'quieto' }),
  // testo-fisso: nomi di persona d'esempio, uguali in ogni lingua
  rigaAppello(66, 'Bianchi Luca', 'P', ['P', 'P', 'P', 'P']),
  // testo-fisso: nomi di persona d'esempio, uguali in ogni lingua
  rigaAppello(98, 'Rossi Anna', '·', ['X', 'X', 'R', 'P']),
  riquadro(356, 98, 36, 22, { etichetta: '10', raggio: 4 }),
  testo(408, 113, T.appello.scritte.trenoInRitardo, { corpo: 'piccolo', tono: 'quieto' }),
  // testo-fisso: nomi di persona d'esempio, uguali in ogni lingua
  rigaAppello(130, 'Verdi Marco', '-', ['-', '-', '-', '-']),
  bollino(22, 170, 1),
  bollino(150, 20, 2),
  bollino(178, 170, 3),
  bollino(251, 170, 4),
  bollino(374, 170, 5),
  bollino(475, 170, 6),
  // Il giro del clic.
  catena(10, 192, [
    { etichetta: '-' },
    { etichetta: 'P', tono: 'positivo' },
    { etichetta: 'X', tono: 'negativo' },
    { etichetta: 'R', tono: 'attenzione' },
    { etichetta: 'E', tono: 'informativo' },
  ], { largo: 44, alto: 26, stacco: 22 }),
  freccia([[296, 218], [296, 240], [32, 240], [32, 222]], { etichetta: T.appello.scritte.daCapo }),
  testo(340, 204, T.appello.scritte.unClic, { corpo: 'piccolo' }),
  testo(340, 220, T.appello.scritte.premuto, { corpo: 'piccolo', tono: 'quieto' }),
  testo(340, 234, T.appello.scritte.ilMenu, { corpo: 'piccolo', tono: 'quieto' }),
)

/** Le quattro domande del modulo di una consegna, con le risposte possibili. */
const MODULO_CONSEGNA = disegno(
  catena(4, 12, [
    { etichetta: T.consegne.scritte.aChiTocca, simbolo: 'classi' },
    { etichetta: T.consegne.scritte.conUnFoglio, simbolo: 'documento' },
    { etichetta: T.consegne.scritte.chiLoPorta, simbolo: 'allegato' },
    { etichetta: T.consegne.scritte.entroQuando, simbolo: 'orologio' },
  ], { largo: 138, alto: 36, stacco: 22 }),
  ...[
    [T.consegne.scritte.tuttaLaClasse, T.consegne.scritte.soloAlcune, T.consegne.scritte.aMe],
    [T.consegne.scritte.noSpunta, T.consegne.scritte.siAllega],
    [T.consegne.scritte.meLoConsegnano, T.consegne.scritte.loConsegnoIo, T.consegne.scritte.aMano],
    [T.consegne.scritte.unaLezione, T.consegne.scritte.unGiorno, T.consegne.scritte.nessunTermine],
  ].flatMap((scelte, colonna) =>
    scelte.map((scelta, riga) =>
      testo(12 + colonna * 160, 68 + riga * 16, scelta, {
        corpo: 'piccolo',
        tono: riga === 0 ? 'neutro' : 'quieto',
      }),
    ),
  ),
  riquadro(164, 108, 138, 26, {
    tono: 'quieto',
    tratteggio: true,
    etichetta: T.consegne.scritte.foglioFirme,
  }),
  bollino(142, 12, 1),
  bollino(302, 12, 2),
  bollino(462, 12, 3),
  bollino(622, 12, 4),
)

/**
 * Il pulsante «Aggiungi» delle osservazioni, fermo sul bordo destro: largo
 * quanto l'italiano, o quanto il suo nome se in un'altra lingua è più lungo.
 */
function pulsanteAggiungi (): string {
  const nome = parole().aggiungi
  const l = Math.max(68, larghezzaTesto(nome) + 8)
  return riquadro(618 - l, 16, l, 20, { tono: 'quieto', etichetta: nome, raggio: 4 })
}

/** La scheda Annotazioni: lo svolgimento a sinistra, le osservazioni a destra. */
const SCHEDA_ANNOTAZIONI = disegno(
  riquadro(10, 10, 250, 200),
  testo(22, 30, T.annotazioni.scritte.svolgimento, { forte: true }),
  riquadro(22, 42, 226, 44, {
    tono: 'quieto',
    etichetta: T.annotazioni.scritte.argomentiSvolti,
    aSinistra: true,
  }),
  riquadro(22, 94, 226, 30, {
    tono: 'quieto',
    etichetta: T.annotazioni.scritte.materiali,
    aSinistra: true,
  }),
  riquadro(22, 132, 226, 44, {
    tono: 'quieto',
    etichetta: T.annotazioni.scritte.consuntivo,
    aSinistra: true,
  }),
  testo(22, 196, T.annotazioni.scritte.siSalva, { corpo: 'piccolo', tono: 'quieto' }),
  riquadro(280, 10, 350, 200),
  testo(292, 30, T.annotazioni.scritte.osservazioni, { forte: true }),
  pulsanteAggiungi(),
  ...[
    T.annotazioni.scritte.partecipazione,
    T.annotazioni.scritte.impegno,
    T.annotazioni.scritte.autonomia,
  ].map((nome, i) =>
    testo(420 + i * 60, 52, nome, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
  ),
  testo(292, 72, 'Bianchi L.', { corpo: 'piccolo' }),
  testo(292, 96, 'Rossi A.', { corpo: 'piccolo' }),
  ...[0, 1, 2].flatMap((i) => [
    riquadro(395 + i * 60, 58, 50, 20, { tono: i === 0 ? 'positivo' : 'quieto', raggio: 4 }),
    riquadro(395 + i * 60, 82, 50, 20, { tono: i === 1 ? 'negativo' : 'quieto', raggio: 4 }),
  ]),
  simbolo('piu', 412, 60, 16, 'positivo'),
  simbolo('meno', 472, 84, 16, 'negativo'),
  riquadro(292, 112, 326, 22, { tono: 'quieto', raggio: 4 }),
  simbolo('meno', 298, 115, 16, 'negativo'),
  testo(320, 127, T.annotazioni.scritte.successo, { corpo: 'piccolo', tono: 'quieto' }),
  pastiglia(292, 146, T.annotazioni.scritte.disciplina, 'negativo'),
  testo(374, 159, 'Rossi A. · 09:40', { corpo: 'piccolo' }),
  pastiglia(292, 176, T.annotazioni.scritte.merito, 'positivo'),
  testo(356, 189, T.annotazioni.scritte.tuttaLaClasse, { corpo: 'piccolo' }),
  bollino(260, 10, 1),
  bollino(630, 70, 2),
  bollino(630, 123, 3),
  bollino(630, 170, 4),
)

/** Una tappa della scaletta nell'editor del piano, con il suo filo del tempo. */
function tappa (
  y: number,
  numero: number,
  titolo: string,
  tipo: string,
  tono: Tono,
  minuti: string,
  quota: number,
): string {
  return disegno(
    riquadro(244, y, 374, 26, { raggio: 4 }),
    testo(254, y + 17, String(numero), { corpo: 'piccolo', tono: 'quieto' }),
    testo(270, y + 17, titolo, { corpo: 'piccolo', forte: true }),
    pastiglia(440, y + 4, tipo, tono),
    testo(608, y + 17, minuti, { corpo: 'piccolo', ancora: 'fine' }),
    riquadro(246, y + 22, 370 * quota, 3, { tono: 'accento', raggio: 1 }),
  )
}

/** La pagina Piani lezione: l'elenco delle ore a sinistra, l'editor a destra. */
const PAGINA_PIANI = disegno(
  riquadro(10, 10, 210, 280),
  testo(22, 30, T.piani.scritte.materia, { forte: true }),
  testo(208, 30, T.piani.scritte.ore, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
  riquadro(22, 40, 186, 20, { tono: 'quieto', raggio: 4 }),
  testo(30, 54, T.piani.scritte.cerca, { corpo: 'piccolo', tono: 'quieto' }),
  testo(22, 80, T.piani.scritte.semestre, { corpo: 'piccolo', forte: true }),
  testo(208, 80, T.piani.scritte.preparate, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
  riquadro(22, 88, 186, 34, {
    tono: 'accento',
    etichetta: T.piani.scritte.lezione1,
    sotto: T.piani.scritte.data1,
    aSinistra: true,
  }),
  riquadro(22, 126, 186, 34, {
    etichetta: T.piani.scritte.lezione2,
    sotto: T.piani.scritte.data2,
    aSinistra: true,
  }),
  riquadro(22, 164, 186, 34, {
    etichetta: T.piani.scritte.lezione3,
    sotto: T.piani.scritte.senzaPiano,
    tratteggio: true,
  }),
  testo(22, 218, T.piani.scritte.nonAssegnati, { corpo: 'piccolo', tono: 'quieto' }),
  riquadro(22, 226, 186, 34, {
    etichetta: T.piani.scritte.bozza,
    sotto: T.piani.scritte.ripasso,
    aSinistra: true,
  }),
  riquadro(232, 10, 398, 280),
  testo(244, 30, T.piani.scritte.titoloEditor, { forte: true }),
  riquadro(244, 40, 374, 36, {
    tono: 'quieto',
    etichetta: T.piani.scritte.diCheCosaParla,
    sotto: T.piani.scritte.campi,
  }),
  testo(244, 94, T.piani.scritte.scaletta, { corpo: 'piccolo', forte: true }),
  riquadro(244, 100, 374, 20, { tono: 'quieto', raggio: 4 }),
  testo(252, 114, T.piani.scritte.gruppo1, { corpo: 'piccolo' }),
  pastiglia(520, 101, T.piani.scritte.liberi, 'quieto'),
  tappa(124, 1, T.piani.scritte.correzione, T.piani.scritte.esercizio, 'quieto', '20 min', 0.22),
  tappa(154, 2, T.piani.scritte.frazioni, T.piani.scritte.spiegazione, 'quieto', '40 min', 0.44),
  tappa(184, 3, T.piani.scritte.coppie, T.piani.scritte.esercizio, 'quieto', '20 min', 0.22),
  simbolo('pausa', 250, 212, 14, 'quieto'),
  testo(270, 223, T.piani.scritte.intervallo, { corpo: 'piccolo', tono: 'quieto' }),
  riquadro(244, 230, 374, 20, { tono: 'quieto', raggio: 4 }),
  testo(252, 244, T.piani.scritte.gruppo2, { corpo: 'piccolo' }),
  pastiglia(560, 231, T.piani.scritte.pieno, 'positivo'),
  tappa(254, 4, T.piani.scritte.verificaBreve, T.piani.scritte.verifica, 'attenzione', '45 min', 1),
  bollino(220, 10, 1),
  bollino(208, 143, 2),
  bollino(208, 181, 3),
  bollino(618, 40, 4),
  bollino(236, 110, 5),
  bollino(236, 146, 6),
  bollino(236, 219, 7),
)

/** Dal piano ai voti: come una scaletta arriva in aula. */
const PIANO_IN_AULA = disegno(
  catena(10, 30, [
    {
      etichetta: T.piani.scritte.piano,
      sotto: T.piani.scritte.scalettaProva,
      simbolo: 'piano',
    },
    { etichetta: T.piani.scritte.ora, sotto: T.piani.scritte.assegnaUnPiano, simbolo: 'agenda' },
    {
      etichetta: T.piani.scritte.inAula,
      sotto: '·  ✓  ~  ×',
      tono: 'accento',
      simbolo: 'spunta',
    },
    {
      etichetta: T.piani.scritte.momento,
      sotto: T.piani.scritte.creaLaProva,
      tono: 'positivo',
      simbolo: 'valutazioni',
    },
  ], { largo: 130, alto: 44, stacco: 30 }),
  riquadro(10, 112, 130, 40, {
    tono: 'quieto',
    tratteggio: true,
    etichetta: T.piani.scritte.copia,
    sotto: parole().duplica,
  }),
  freccia([[75, 78], [75, 108]]),
  bollino(140, 30, 1),
  bollino(300, 30, 2),
  bollino(460, 30, 3),
  bollino(620, 30, 4),
  bollino(140, 112, 5),
)

// ------------------------------------------------------------------ sezioni

export const SEZIONI_LEZIONE: SezioneGuida[] = [
  sezione({
    id: 'lezione',
    parte: 'registro',
    simbolo: 'agenda',
    vista: 'lezione',
    figure: [
      { vista: '0 0 640 250', disegno: PAGINA_LEZIONE },
      { vista: '0 0 640 180', disegno: CICLO_ORA },
    ],
    note: ['meccanismo', 'attenzione'],
    vedi: ['appello', 'consegne', 'annotazioni', 'piani', 'valutazioni', 'rapporti', 'proiezione'],
  }, T.lezione),
  sezione({
    id: 'appello',
    parte: 'registro',
    simbolo: 'classi',
    vista: 'lezione',
    figure: [{ vista: '0 0 640 250', disegno: MATRICE_APPELLO }],
    note: ['meccanismo', 'consiglio'],
    vedi: ['lezione', 'assenze', 'corsi', 'scheda'],
  }, T.appello),
  sezione({
    id: 'consegne',
    parte: 'registro',
    simbolo: 'allegato',
    vista: 'lezione',
    figure: [{ vista: '0 0 640 145', disegno: MODULO_CONSEGNA }],
    note: ['attenzione', 'meccanismo'],
    vedi: ['lezione', 'todo', 'docente'],
  }, T.consegne),
  sezione({
    id: 'check',
    parte: 'registro',
    simbolo: 'check',
    vista: 'check',
    note: ['meccanismo', 'attenzione', 'consiglio'],
    vedi: ['consegne', 'lezione'],
  }, T.check),
  sezione({
    id: 'annotazioni',
    parte: 'registro',
    simbolo: 'matita',
    vista: 'lezione',
    figure: [{ vista: '0 0 640 220', disegno: SCHEDA_ANNOTAZIONI }],
    note: ['meccanismo'],
    vedi: ['lezione', 'scheda', 'corsi', 'impostazioni'],
  }, T.annotazioni),
  sezione({
    id: 'piani',
    parte: 'registro',
    simbolo: 'piano',
    vista: 'piani',
    figure: [
      { vista: '0 0 640 300', disegno: PAGINA_PIANI },
      { vista: '0 0 640 165', disegno: PIANO_IN_AULA },
    ],
    note: ['meccanismo', 'attenzione'],
    vedi: ['lezione', 'valutazioni', 'corsi', 'calendario'],
  }, T.piani),
]
