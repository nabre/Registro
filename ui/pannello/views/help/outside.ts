// La guida: vassoio, promemoria, proiezione, riga-di-comando.
//
// Solo struttura e schemi: le parole stanno in `outside.testi.ts`, il disegno
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
  zoneTelaio,
} from './drawing.js'
import { testi } from './outside.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()
/** L'italiano, che dà le misure: una parola più lunga sposta, una più corta no. */
const IT = testi.in('it')

/**
 * Di quanto un testo in piccolo è più largo della sua versione italiana: zero
 * se non lo è. È lo spazio da fare a una parola tradotta senza toccare il
 * disegno italiano.
 */
function eccesso (ora: string, italiano: string): number {
  return Math.max(0, larghezzaTesto(ora, 'piccolo') - larghezzaTesto(italiano, 'piccolo'))
}

/**
 * Dove comincia ogni parola di una fila che in italiano stava ai posti
 * `posti`: una parola tradotta più lunga spinge a destra quelle che vengono
 * dopo, una più corta non tira indietro niente.
 */
function posti (
  partenze: readonly number[],
  parole: readonly string[],
  italiane: readonly string[],
): number[] {
  let spinta = 0
  return partenze.map((partenza, indice) => {
    const dove = partenza + spinta
    spinta += eccesso(parole[indice], italiane[indice])
    return dove
  })
}

// ------------------------------------------------------------ un menu finto

/** Una riga di menu: il testo, se è spenta, se apre un sottomenu, se è evidenziata. */
interface VoceMenu {
  t: string
  spenta?: boolean
  sotto?: boolean
  scelta?: boolean
  /** Spostata a destra: le ore dentro un mucchio. */
  rientro?: boolean
  /** Righe finte al posto del testo: le voci che nello schema non conta leggere. */
  finta?: boolean
}

const RIGA_MENU = 17
const STACCO_MENU = 7

/** Dove cade il centro della riga `indice`, contando anche i separatori (`null`). */
function centroRiga (y: number, voci: readonly (VoceMenu | null)[], indice: number): number {
  let cy = y + 6
  for (let i = 0; i < indice; i += 1) cy += voci[i] === null ? STACCO_MENU : RIGA_MENU
  return cy + RIGA_MENU / 2
}

/** Un menu di sistema visto dall'alto: righe piccole, separatori, la freccia dei sottomenu. */
function menu (x: number, y: number, l: number, voci: readonly (VoceMenu | null)[]): string {
  let cy = y + 6
  const pezzi: string[] = []
  for (const voce of voci) {
    if (voce === null) {
      pezzi.push(riquadro(x + 8, cy + 3, l - 16, 0.6, { tono: 'quieto', raggio: 0 }))
      cy += STACCO_MENU
      continue
    }
    if (voce.scelta) {
      pezzi.push(riquadro(x + 3, cy, l - 6, RIGA_MENU, { tono: 'accento', raggio: 3 }))
    }
    if (voce.finta) pezzi.push(righe(x + 26, cy + 7, l * 0.45, 1))
    else {
      pezzi.push(testo(x + (voce.rientro ? 22 : 10), cy + 12.5, voce.t, {
        corpo: 'piccolo',
        tono: voce.spenta ? 'quieto' : voce.scelta ? 'accento' : 'neutro',
        forte: voce.scelta === true,
      }))
    }
    if (voce.sotto) {
      pezzi.push(testo(x + l - 10, cy + 12.5, '›', { corpo: 'piccolo', ancora: 'fine' }))
    }
    cy += RIGA_MENU
  }
  return disegno(riquadro(x, y, l, cy - y + 6, { raggio: 4 }), ...pezzi)
}

// ------------------------------------------------------------- le figure

const V = T.vassoio.scritte

const MENU_VASSOIO: readonly (VoceMenu | null)[] = [
  { t: V.titoloMenu, spenta: true },
  null,
  { t: V.adesso },
  { t: V.daCompilare },
  null,
  { t: V.corsoUno, sotto: true, scelta: true },
  { t: V.corsoDue, sotto: true },
  { t: V.corsoTre, sotto: true },
  null,
  { t: V.apri },
  { t: V.vaiAOggi },
  null,
  { t: V.esci },
]

const SOTTOMENU_CORSO: readonly (VoceMenu | null)[] = [
  { t: V.riepilogo, spenta: true },
  null,
  { t: V.daChiudere, spenta: true },
  { rientro: true, t: V.ieri },
  { rientro: true, t: V.lunedi },
  null,
  { t: V.svolte, spenta: true },
  { rientro: true, t: V.venerdi },
  { t: '', finta: true },
  { rientro: true, t: V.altre, spenta: true },
  null,
  { t: V.apriCorso },
]

const Y_MENU = 10
const Y_SOTTO = 20

const FIGURA_VASSOIO = disegno(
  // La barra delle applicazioni, con l'orologio e l'icona del registro.
  riquadro(0, 236, 640, 28, { tono: 'quieto', raggio: 0 }),
  simbolo('registro', 548, 242, 16, 'accento'),
  testo(628, 254, '10:22', { corpo: 'piccolo', ancora: 'fine' }),
  menu(20, Y_SOTTO, 336, SOTTOMENU_CORSO),
  menu(368, Y_MENU, 262, MENU_VASSOIO),
  bollino(530, 250, 1),
  bollino(616, centroRiga(Y_MENU, MENU_VASSOIO, 0), 2),
  bollino(616, (centroRiga(Y_MENU, MENU_VASSOIO, 2) + centroRiga(Y_MENU, MENU_VASSOIO, 3)) / 2, 3),
  bollino(20, Y_SOTTO, 4),
  bollino(342, centroRiga(Y_SOTTO, SOTTOMENU_CORSO, 2), 5),
  bollino(616, centroRiga(Y_MENU, MENU_VASSOIO, 12), 6),
)

// La linea del tempo del promemoria: 5 minuti prima, l'inizio, un quarto d'ora dopo.
const X_TEMPO = 20
const L_TEMPO = 600
const tacca = (dove: number): number => X_TEMPO + dove * (L_TEMPO - 10)

const P = T.promemoria.scritte

const FIGURA_PROMEMORIA = disegno(
  riquadro(20, 12, 300, 78, { raggio: 6 }),
  simbolo('informazione', 30, 22, 14, 'accento'),
  testo(50, 33, P.titolo, { forte: true }),
  testo(30, 54, P.orario, { corpo: 'piccolo', tono: 'quieto' }),
  testo(30, 72, P.consegne, {
    corpo: 'piccolo',
    tono: 'quieto',
  }),
  freccia([[320, 51], [410, 51]], { etichetta: P.unClic }),
  riquadro(414, 30, 206, 42, {
    tono: 'accento',
    etichetta: P.lezione,
    sotto: P.paginaDellOra,
    simbolo: 'agenda',
  }),
  freccia([[tacca(0.1), 92], [tacca(0.1), 138]], { tono: 'accento' }),
  riquadro(tacca(0.1), 118, tacca(0.9) - tacca(0.1), 14, {
    tono: 'accento',
    tratteggio: true,
    raggio: 3,
  }),
  testo((tacca(0.3) + tacca(0.9)) / 2, 112, P.unaVoltaSola, {
    corpo: 'piccolo',
    tono: 'quieto',
    ancora: 'centro',
  }),
  lineaTempo(X_TEMPO, 150, L_TEMPO, [
    { dove: 0.1, nome: P.avviso, tono: 'accento' },
    { dove: 0.3, nome: P.inizio },
    { dove: 0.9, nome: P.ultimoAvviso },
  ]),
  bollino(tacca(0.2), 150, 1),
  bollino(310, 22, 2),
  bollino(310, 66, 3),
  bollino(tacca(0.6), 150, 4),
)

// La proiezione: lo schermo di chi insegna, e quello della classe.
const TELAIO_PR = { x: 10, y: 20, l: 350, a: 200 }
const AREA_PR = zoneTelaio(TELAIO_PR.x, TELAIO_PR.y, TELAIO_PR.l, TELAIO_PR.a).area

/** Lo schermo di chi insegna con la proiezione accesa, e quello della classe accanto. */
function figuraProiezione (): string {
  const s = T.proiezione.scritte
  const i = IT.proiezione.scritte
  // «Spegni lo schermo» finisce dove finiva in italiano, e cresce verso sinistra.
  const piuSpegni = eccesso(s.spegni, i.spegni)
  const spegni = AREA_PR.x + AREA_PR.l - 112 - piuSpegni
  const [scaletta, argomenti, consegne] = posti(
    [AREA_PR.x + 8, AREA_PR.x + 74, AREA_PR.x + 146],
    [s.scaletta, s.argomenti, s.consegne],
    [i.scaletta, i.argomenti, i.consegne],
  )
  const [valutazioni, appello, ancora] = posti(
    [AREA_PR.x + 8, AREA_PR.x + 92, AREA_PR.x + 152],
    [s.valutazioni, s.appello, '…'],
    [i.valutazioni, i.appello, '…'],
  )
  const [linguettaScaletta, linguettaArgomenti, linguettaConsegne] = posti(
    [430, 484, 546],
    [s.scaletta, s.argomenti, s.consegne],
    [i.scaletta, i.argomenti, i.consegne],
  )
  return disegno(
    telaio(TELAIO_PR.x, TELAIO_PR.y, TELAIO_PR.l, TELAIO_PR.a, {
      laterali: [s.lezione, s.valutazioni, s.check, s.pianiLezione, s.documenti],
      scelta: 0,
    }),
    pastiglia(AREA_PR.x + 8, AREA_PR.y + 8, s.proiezione, 'positivo'),
    riquadro(spegni, AREA_PR.y + 6, 106 + piuSpegni, 22, { tono: 'positivo' }),
    testo(AREA_PR.x + AREA_PR.l - 59 - piuSpegni / 2, AREA_PR.y + 21, s.spegni, {
      corpo: 'piccolo',
      ancora: 'centro',
      tono: 'positivo',
      forte: true,
    }),
    testo(AREA_PR.x + 8, AREA_PR.y + 48, s.inProiezione, { corpo: 'piccolo', forte: true }),
    pastiglia(scaletta, AREA_PR.y + 56, s.scaletta, 'accento'),
    pastiglia(argomenti, AREA_PR.y + 56, s.argomenti, 'neutro'),
    pastiglia(consegne, AREA_PR.y + 56, s.consegne, 'neutro'),
    pastiglia(valutazioni, AREA_PR.y + 78, s.valutazioni, 'quieto'),
    pastiglia(appello, AREA_PR.y + 78, s.appello, 'quieto'),
    testo(ancora, AREA_PR.y + 91, '…', { corpo: 'piccolo', tono: 'quieto' }),
    righe(AREA_PR.x + 8, AREA_PR.y + 112, AREA_PR.l - 24, 4, 11),
    testo(185, 238, s.schermoDiChiInsegna, {
      corpo: 'piccolo',
      tono: 'quieto',
      ancora: 'centro',
    }),
    freccia([[366, 110], [414, 110]], { tono: 'accento', etichetta: s.unaScheda }),
    riquadro(420, 20, 210, 150, { raggio: 4 }),
    testo(430, 38, s.testata, { corpo: 'piccolo', tono: 'quieto' }),
    testo(linguettaScaletta, 58, s.scaletta, { corpo: 'piccolo', tono: 'accento', forte: true }),
    testo(linguettaArgomenti, 58, s.argomenti, { corpo: 'piccolo', tono: 'quieto' }),
    testo(linguettaConsegne, 58, s.consegne, { corpo: 'piccolo', tono: 'quieto' }),
    testo(430, 86, s.scaletta, { corpo: 'titolo', forte: true }),
    righe(430, 100, 186, 5, 12),
    testo(525, 188, s.schermoDellaClasse, {
      corpo: 'piccolo',
      tono: 'quieto',
      ancora: 'centro',
    }),
    bollino(spegni, AREA_PR.y + 6, 1),
    bollino(AREA_PR.x + 4, AREA_PR.y + 8, 2),
    bollino(AREA_PR.x + AREA_PR.l - 14, AREA_PR.y + 66, 3),
    bollino(390, 128, 4),
    bollino(616, 54, 5),
  )
}

/** Una riga della tabella dei blocchi riservati: il nome, senza nomi, con i nomi. */
function rigaRiservata (y: number, nome: string, senza: string, con: string | null): string {
  return disegno(
    riquadro(10, y, 140, 28, { tono: 'attenzione', tratteggio: true, etichetta: nome }),
    con === null
      ? riquadro(160, y, 470, 28, { tono: 'quieto', etichetta: senza })
      : disegno(
          riquadro(160, y, 230, 28, { tono: 'quieto', etichetta: senza }),
          riquadro(400, y, 230, 28, { etichetta: con }),
        ),
  )
}

const R = T.proiezione.scritte

const FIGURA_RISERVATI = disegno(
  testo(275, 18, R.senzaNomi, { corpo: 'piccolo', forte: true, ancora: 'centro' }),
  testo(515, 18, R.nomiVisibili, { corpo: 'piccolo', forte: true, ancora: 'centro' }),
  rigaRiservata(28, R.valutazioni, R.mediaSufficientiGrafico, R.votoDiCiascuno),
  rigaRiservata(64, R.documenti, R.arrivati, R.chiNonLHaPortato),
  rigaRiservata(100, R.appello, R.nomiSempre, null),
  riquadro(10, 136, 140, 28, { tono: 'quieto', etichetta: R.consegne }),
  riquadro(160, 136, 230, 28, { tono: 'quieto', etichetta: R.aDuePersone }),
  riquadro(400, 136, 230, 28, { etichetta: R.iLoroNomi }),
)

const C = T.rigaDiComando.scritte

const FIGURA_CONDOTTO = disegno(
  catena(20, 30, [
    // testo-fisso: il nome del comando, che si batte così in ogni lingua
    { etichetta: C.terminale, sotto: 'regi …', simbolo: 'lente' },
    { etichetta: C.condotto, sotto: C.maiLaRete, simbolo: 'presa', tono: 'accento' },
    {
      etichetta: C.registro,
      sotto: C.conLeProcedure,
      simbolo: 'registro',
      tono: 'positivo',
    },
  ], { largo: 170, alto: 44, stacco: 45 }),
  // testo-fisso: i comandi di `regi` si battono così in ogni lingua
  testo(24, 98, 'regi stato', { corpo: 'piccolo', macchina: true }),
  // testo-fisso: i comandi di `regi` si battono così in ogni lingua
  testo(24, 116, 'regi elenco', { corpo: 'piccolo', macchina: true }),
  // testo-fisso: i comandi di `regi` si battono così in ogni lingua
  testo(24, 134, 'regi chiama ore.prossima', { corpo: 'piccolo', macchina: true }),
  pastiglia(242, 88, C.condottoAcceso, 'positivo'),
  pastiglia(242, 110, C.letturaSi, 'positivo'),
  pastiglia(242, 132, C.scritturaNo, 'quieto'),
  testo(535, 100, C.stesseDelPannello, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
  testo(535, 116, C.eDellAssistente, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
  freccia([[535, 132], [535, 178], [105, 178], [105, 146]], {
    tratteggio: true,
    etichetta: C.rispostaInJson,
  }),
  bollino(20, 30, 1),
  bollino(235, 30, 2),
  bollino(378, 119, 3),
  bollino(450, 30, 4),
  bollino(535, 158, 5),
)

// ------------------------------------------------------------- le sezioni

export const SEZIONI_FUORI: SezioneGuida[] = [
  sezione({
    id: 'vassoio',
    parte: 'fuori',
    simbolo: 'orologio',
    figure: [{ vista: '0 0 640 264', disegno: FIGURA_VASSOIO }],
    note: ['meccanismo', 'attenzione'],
    vedi: ['promemoria', 'calendario', 'impostazioni', 'lezione'],
  }, T.vassoio),
  sezione({
    id: 'promemoria',
    parte: 'fuori',
    simbolo: 'informazione',
    figure: [{ vista: '0 0 640 186', disegno: FIGURA_PROMEMORIA }],
    note: ['meccanismo', 'consiglio'],
    vedi: ['vassoio', 'barra-stato', 'lezione', 'impostazioni'],
  }, T.promemoria),
  sezione({
    id: 'proiezione',
    parte: 'fuori',
    simbolo: 'schermo',
    figure: [
      { vista: '0 0 640 248', disegno: figuraProiezione() },
      { vista: '0 0 640 172', disegno: FIGURA_RISERVATI },
    ],
    note: ['meccanismo', 'attenzione', 'consiglio'],
    vedi: ['lezione', 'piani', 'valutazioni', 'calendario'],
  }, T.proiezione),
  sezione({
    id: 'riga-di-comando',
    parte: 'fuori',
    simbolo: 'presa',
    figure: [{ vista: '0 0 640 196', disegno: FIGURA_CONDOTTO }],
    note: ['attenzione', 'meccanismo', 'meccanismo', 'attenzione'],
    vedi: ['assistente', 'impostazioni', 'dati'],
  }, T.rigaDiComando),
]
