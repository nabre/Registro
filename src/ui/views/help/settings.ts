// La guida: impostazioni, impostazioni-programma, impostazioni-anno, posta,
// aggiornamenti.
//
// Solo struttura e schemi: le parole stanno in `settings.testi.ts`, il disegno
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
  tastino,
  tasto,
  telaio,
  testo,
  type Tono,
} from './drawing.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './settings.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()
/** L'italiano, che dà le misure: una parola più lunga sposta, una più corta no. */
const IT = testi.in('it')

/** Le scritte degli schemi dell'anno e degli aggiornamenti, e le loro misure italiane. */
const ANNO = T.impostazioniAnno.scritte
const ANNO_IT = IT.impostazioniAnno.scritte
const AGG = T.aggiornamenti.scritte
const AGG_IT = IT.aggiornamenti.scritte

/**
 * Di quanto un testo è più largo della sua versione italiana (zero se non lo
 * è): lo spazio da fare a una parola tradotta.
 */
function eccesso (ora: string, italiano: string, corpo: 'normale' | 'piccolo' = 'piccolo'): number {
  return Math.max(0, larghezzaTesto(ora, corpo) - larghezzaTesto(italiano, corpo))
}

/**
 * Un pulsante disegnato che finisce dove finiva in italiano: se il nome
 * tradotto è più lungo, cresce verso sinistra.
 */
function tastinoADestra (x: number, y: number, l: number, nome: string, italiano: string): string {
  const di = eccesso(nome, italiano)
  return tastino(x - di, y, l + di, nome)
}

/** Un pulsante disegnato attorno al suo centro: se il nome è più lungo, cresce dai due lati. */
function tastinoAlCentro (
  centro: number,
  y: number,
  l: number,
  nome: string,
  italiano: string,
): string {
  const largo = l + eccesso(nome, italiano)
  return tastino(centro - largo / 2, y, largo, nome)
}

/**
 * Una fila di pastiglie da sinistra a destra, a sei di distanza l'una
 * dall'altra. Quella in `scelta`, se c'è, si accende d'accento.
 */
function fila (
  x: number,
  y: number,
  parole: readonly string[],
  tono: Tono,
  scelta?: number,
): string {
  let cursore = x
  return disegno(
    ...parole.map((parola, indice) => {
      const pezzo = pastiglia(cursore, y, parola, indice === scelta ? 'accento' : tono)
      cursore += larghezzaTesto(parola, 'piccolo') + 14 + 6
      return pezzo
    }),
  )
}

/** Una scheda del tema: la finestra in piccolo, il nome, la frase sotto. */
function schedaTema (x: number, nome: string, frase: string, scelta = false): string {
  return disegno(
    riquadro(x, 10, 196, 112, { tono: scelta ? 'accento' : 'quieto' }),
    telaio(x + 16, 20, 164, 58, { titolo: '' }),
    testo(x + 16, 96, nome, { forte: true, tono: scelta ? 'accento' : 'neutro' }),
    testo(x + 16, 112, frase, { corpo: 'piccolo', tono: 'quieto' }),
  )
}

/**
 * La giornata dell'esempio della scheda «Inizio e fine della giornata»: UD da
 * 45 minuti dalle 08:00 alle 15:00, ricreazione alle 09:45 per un quarto
 * d'ora, pranzo di un'ora due UD dopo; inizio e fine fuori griglia, con un
 * avanzo per parte.
 */
const GIORNATA_ESEMPIO: ReadonlyArray<{ tipo: 'ud' | 'pausa' | 'avanzo', minuti: number, nome?: string }> = [
  { tipo: 'avanzo', minuti: 15 },
  { tipo: 'ud', minuti: 45, nome: '1' },
  { tipo: 'ud', minuti: 45, nome: '2' },
  { tipo: 'pausa', minuti: 15 },
  { tipo: 'ud', minuti: 45, nome: '3' },
  { tipo: 'ud', minuti: 45, nome: '4' },
  { tipo: 'pausa', minuti: 60, nome: ANNO.pranzo },
  { tipo: 'ud', minuti: 45, nome: '5' },
  { tipo: 'ud', minuti: 45, nome: '6' },
  { tipo: 'ud', minuti: 45, nome: '7' },
  { tipo: 'avanzo', minuti: 15 },
]

/** La giornata dell'esempio in una striscia larga `l`, un tratto per UD, pausa o avanzo. */
function giornataDisegnata (x: number, y: number, l: number): string {
  const totale = GIORNATA_ESEMPIO.reduce((somma, tratto) => somma + tratto.minuti, 0)
  let cursore = x
  return disegno(
    ...GIORNATA_ESEMPIO.map((tratto) => {
      const largo = (tratto.minuti / totale) * l
      const pezzo = riquadro(cursore + 1, y, largo - 2, 26, {
        tono: tratto.tipo === 'ud' ? 'neutro' : tratto.tipo === 'pausa' ? 'quieto' : 'attenzione',
        tratteggio: tratto.tipo !== 'ud',
        raggio: 3,
        ...(tratto.nome ? { etichetta: tratto.nome } : {}),
      })
      cursore += largo
      return pezzo
    }),
  )
}

/** La pagina delle impostazioni: la fascia dei gruppi, il filtro, una sezione aperta. */
function paginaImpostazioni (): string {
  const s = T.impostazioni.scritte
  const i = IT.impostazioni.scritte
  return disegno(
    // La pagina sola, senza la finestra intorno: i sei gruppi non ci starebbero.
    riquadro(10, 8, 620, 220, { tono: 'quieto', raggio: 8 }),
    testo(34, 32, s.titolo, { forte: true }),
    // La fascia: i gruppi, e sotto le sezioni di quello acceso.
    fila(
      34,
      42,
      [s.anno, s.didattica, s.liste, s.documenti, s.comunicazioni, s.programma],
      'neutro',
      5,
    ),
    fila(34, 66, [s.generale, s.aggiornamentiUno, s.modelli, s.condotto], 'quieto', 1),
    riquadro(34, 92, 586, 20, { tono: 'neutro', raggio: 4 }),
    simbolo('lente', 40, 95, 14, 'quieto'),
    testo(60, 106, s.filtro, {
      corpo: 'piccolo',
      tono: 'quieto',
    }),
    riquadro(34, 120, 586, 96, { tono: 'neutro' }),
    testo(46, 139, s.aggiornamenti, { forte: true }),
    tastinoADestra(518, 126, 90, s.ripristina, i.ripristina),
    testo(46, 163, s.scaricaSubito, { corpo: 'piccolo', forte: true }),
    pastiglia(46, 170, s.modificata, 'attenzione'),
    tastinoADestra(558, 169, 50, s.ritira, i.ritira),
    righe(46, 200, 250, 1),
    bollino(22, 51, 1),
    bollino(22, 75, 2),
    bollino(620, 92, 3),
    bollino(222, 179, 4),
    bollino(608 - eccesso(s.ripristina, i.ripristina), 126, 5),
  )
}

/** Dove finisce ogni valore: sul computer, o dentro il file dell'anno. */
function dueMondi (): string {
  const s = T.impostazioni.scritte
  const i = IT.impostazioni.scritte
  return disegno(
    riquadro(10, 10, 290, 150, { tono: 'quieto' }),
    simbolo('schermo', 22, 20, 18),
    testo(48, 34, s.questoComputer, { forte: true }),
    testo(22, 56, s.cartellaDati, { corpo: 'piccolo', tono: 'quieto' }),
    fila(22, 72, [s.tema, s.avvio, s.promemoria, s.posta], 'neutro'),
    fila(22, 98, [s.recapiti, s.modelliLinguistici, s.assistente], 'neutro'),
    fila(22, 124, [s.aggiornamentiVoce, s.condottoVoce, s.anniRecenti], 'neutro'),
    riquadro(340, 10, 290, 150, { tono: 'accento' }),
    simbolo('documento', 352, 20, 18, 'accento'),
    testo(378, 34, s.fileAnno, { forte: true, tono: 'accento' }),
    pastiglia(500 + eccesso(s.fileAnno, i.fileAnno, 'normale'), 21, s.file, 'accento'),
    testo(352, 56, '2026-2027.regi', { corpo: 'piccolo', macchina: true }),
    fila(352, 72, [s.annoESemestri, s.chiusure, s.tipiSettimana], 'accento'),
    fila(352, 98, [s.giornata, s.calendariIcs, s.scalaVoti], 'accento'),
    fila(352, 124, [s.materie, s.listeVoce, s.intestazione, s.firma], 'accento'),
    testo(155, 186, s.restaQui, {
      corpo: 'piccolo',
      tono: 'quieto',
      ancora: 'centro',
    }),
    freccia([[360, 182], [626, 182]], { tono: 'accento', etichetta: s.viaggia }),
  )
}

/** Le tre schede del tema, e sotto le frecce che le girano. */
function schedeDelTema (): string {
  const s = T.impostazioniProgramma.scritte
  // I tasti stanno dopo la frase: se la frase è più lunga, si spostano.
  const dopo = eccesso(s.daTastiera, IT.impostazioniProgramma.scritte.daTastiera)
  return disegno(
    schedaTema(10, s.sistema, s.sistemaAdesso, true),
    schedaTema(222, s.chiaro, s.chiaroSempre),
    schedaTema(434, s.scuro, s.scuroSempre),
    testo(10, 150, s.daTastiera, { corpo: 'piccolo', tono: 'quieto' }),
    tasto(166 + dopo, 136, '←'),
    tasto(192 + dopo, 136, '→'),
    bollino(206, 10, 1),
    bollino(206, 106, 2),
    bollino(230 + dopo, 145, 3),
  )
}

/**
 * Il filetto della versione nuova nella barra del titolo, la voce nella barra
 * in fondo e il piede del benvenuto. Il filetto finisce dove finiva in
 * italiano e cresce verso sinistra; il percorso si scosta.
 */
function doveSiVedeLaVersione (): string {
  const s = T.aggiornamenti.scritte
  const i = IT.aggiornamenti.scritte
  const piuScarica = eccesso(parole().scarica, parole().scarica)
  const piuNotizia = eccesso(s.ceLa, i.ceLa)
  const filetto = 376 - piuScarica - piuNotizia
  const percorso = Math.min(230, filetto - 10 - larghezzaTesto(s.percorso, 'piccolo') / 2)
  const piuVersione = eccesso(s.versione, i.versione)
  const piuUltima = eccesso(s.eLUltima, i.eLUltima)
  const piuControlla = eccesso(s.controllaAdesso, i.controllaAdesso)
  return disegno(
    // La barra del titolo: a sinistra il segno e File, a destra il
    // filetto, prima dei pulsanti della finestra.
    testo(10, 12, s.barraTitolo, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(10, 18, 620, 28, { tono: 'quieto', raggio: 4 }),
    simbolo('registro', 18, 25, 14, 'quieto'),
    testo(38, 36, s.file, { corpo: 'piccolo', forte: true }),
    testo(percorso, 36, s.percorso, {
      corpo: 'piccolo', forte: true, ancora: 'centro',
    }),
    riquadro(filetto, 22, 190 + piuScarica + piuNotizia, 20, { tono: 'informativo', raggio: 4 }),
    simbolo('ricarica', filetto + 6, 25, 14, 'informativo'),
    testo(filetto + 26, 36, s.ceLa, { corpo: 'piccolo', tono: 'informativo', forte: true }),
    tastinoADestra(474, 22, 60, parole().scarica, parole().scarica),
    testo(550, 36, '✕', { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    // La ricerca, contro i pulsanti della finestra: accanto al filetto resta solo
    // la lente (`title-bar.css`).
    simbolo('lente', 561, 26, 12, 'quieto'),
    simbolo('meno', 580, 25, 14, 'quieto'),
    simbolo('chiudi', 604, 25, 14, 'quieto'),
    // La barra in fondo, a destra.
    testo(10, 70, s.barraFondo, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(10, 76, 620, 26, { tono: 'quieto', raggio: 4 }),
    simbolo('ricarica', 400 - piuNotizia, 82, 14, 'informativo'),
    testo(418 - piuNotizia, 93, s.ceLa, { corpo: 'piccolo' }),
    simbolo('libro', 506, 82, 14),
    testo(524, 93, '2026-2027', { corpo: 'piccolo' }),
    // Il piede del benvenuto.
    testo(10, 126, s.benvenutoFondo, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(10, 132, 620, 30, { tono: 'quieto', raggio: 4 }),
    testo(20, 151, s.versione, { corpo: 'piccolo', tono: 'quieto' }),
    pastiglia(108 + piuVersione, 138, s.eLUltima, 'positivo'),
    tastino(188 + piuVersione + piuUltima, 137, 100 + piuControlla, s.controllaAdesso),
    tastinoADestra(574, 137, 46, parole().esci, parole().esci),
    bollino(filetto, 22, 1),
    bollino(400 - piuNotizia, 82, 2),
    bollino(108 + piuVersione, 138, 3),
  )
}

export const SEZIONI_IMPOSTAZIONI: SezioneGuida[] = [
  sezione({
    id: 'impostazioni',
    parte: 'programma',
    simbolo: 'impostazioni',
    vista: 'impostazioni',
    figure: [
      { vista: '0 0 640 236', disegno: paginaImpostazioni() },
      { vista: '0 0 640 200', disegno: dueMondi() },
    ],
    note: ['meccanismo', 'consiglio'],
    vedi: ['impostazioni-programma', 'impostazioni-anno', 'dati'],
  }, T.impostazioni),
  sezione({
    id: 'impostazioni-programma',
    parte: 'programma',
    simbolo: 'schermo',
    vista: 'impostazioni',
    figure: [
      {
        vista: '0 0 640 150',
        disegno: disegno(
          riquadro(10, 12, 176, 42, {
            etichetta: T.impostazioniProgramma.scritte.accensione,
            sotto: T.impostazioniProgramma.scritte.partiConWindows,
          }),
          riquadro(10, 92, 176, 42, {
            etichetta: T.impostazioniProgramma.scritte.lancio,
            sotto: T.impostazioniProgramma.scritte.partiSenza,
          }),
          riquadro(232, 52, 170, 42, {
            tono: 'accento', etichetta: T.impostazioniProgramma.scritte.senzaFinestra,
          }),
          freccia([[189, 36], [229, 64]]),
          freccia([[189, 110], [229, 82]]),
          riquadro(450, 12, 180, 42, {
            tono: 'positivo',
            etichetta: T.impostazioniProgramma.scritte.icona,
            sotto: T.impostazioniProgramma.scritte.quandoLaChiedi,
          }),
          riquadro(450, 92, 180, 42, {
            tono: 'attenzione',
            etichetta: T.impostazioniProgramma.scritte.finestraAperta,
            sotto: T.impostazioniProgramma.scritte.seNonCe,
          }),
          freccia([[405, 64], [447, 36]], { tono: 'positivo' }),
          freccia([[405, 82], [447, 110]], { tono: 'attenzione' }),
          bollino(186, 12, 1),
          bollino(186, 92, 2),
          bollino(630, 92, 3),
        ),
      },
      { vista: '0 0 640 160', disegno: schedeDelTema() },
    ],
    note: ['meccanismo', 'attenzione'],
    vedi: ['impostazioni', 'vassoio', 'modelli-linguistici', 'riga-di-comando'],
  }, T.impostazioniProgramma),
  sezione({
    id: 'impostazioni-anno',
    parte: 'programma',
    simbolo: 'libro',
    vista: 'impostazioni',
    figure: [
      {
        vista: '0 0 640 130',
        disegno: disegno(
          riquadro(30, 10, 286, 22, {
            tono: 'accento', etichetta: ANNO.primoSemestre, raggio: 4,
          }),
          riquadro(324, 10, 286, 22, {
            tono: 'accento', etichetta: ANNO.secondoSemestre, raggio: 4,
          }),
          lineaTempo(30, 46, 590, [
            { dove: 0, nome: ANNO.inizioPrimo },
            { dove: 0.5, nome: ANNO.finePrimo },
            { dove: 1, nome: ANNO.fineSecondo },
          ]),
          ...['A', 'B', 'A', 'B', 'A'].map((lettera, i) =>
            riquadro(30 + i * 48, 92, 44, 26, {
              etichetta: lettera,
              tono: i === 0 ? 'accento' : 'neutro',
              raggio: 4,
            }),
          ),
          riquadro(270, 92, 92, 26, {
            etichetta: ANNO.vacanza,
            tono: 'quieto',
            tratteggio: true,
            raggio: 4,
          }),
          ...['B', 'A', 'B', 'A', 'B'].map((lettera, i) =>
            riquadro(366 + i * 48, 92, 44, 26, { etichetta: lettera, raggio: 4 }),
          ),
          bollino(316, 10, 1),
          bollino(362, 92, 2),
          bollino(74, 92, 3),
        ),
      },
      {
        vista: '0 0 640 176',
        disegno: disegno(
          catena(10, 10, [
            {
              etichetta: ANNO.unitaDidattica,
              sotto: ANNO.unaUd,
              tono: 'accento',
            },
            {
              etichetta: ANNO.pause,
              sotto: ANNO.primaConOrario,
            },
            {
              etichetta: ANNO.inizioEFine,
              sotto: ANNO.sullaGriglia,
            },
            { etichetta: ANNO.giorni, sotto: ANNO.lunVen },
          ], { largo: 136, stacco: 25 }),
          tastinoAlCentro(400, 58, 116, ANNO.portaAlle, ANNO_IT.portaAlle),
          giornataDisegnata(30, 92, 580),
          testo(30, 134, '08:00', { corpo: 'piccolo' }),
          testo(320, 134, ANNO.udIntere, {
            corpo: 'piccolo', tono: 'quieto', ancora: 'centro',
          }),
          testo(610, 134, '15:00', { corpo: 'piccolo', ancora: 'fine' }),
          pastiglia(30, 146, ANNO.avanzi, 'attenzione'),
          testo(
            104 + eccesso(ANNO.avanzi, ANNO_IT.avanzi),
            159,
            ANNO.nonFannoUnUd,
            { corpo: 'piccolo', tono: 'quieto' },
          ),
          bollino(146, 10, 1),
          bollino(307, 10, 2),
          bollino(468, 10, 3),
          bollino(629, 10, 4),
          bollino(30, 92, 5),
        ),
      },
    ],
    note: ['attenzione', 'meccanismo'],
    vedi: ['impostazioni', 'calendario', 'ics', 'valutazioni', 'corsi', 'intestazione', 'dati'],
  }, T.impostazioniAnno),
  sezione({
    id: 'posta',
    parte: 'programma',
    simbolo: 'posta',
    vista: 'impostazioni',
    figure: [
      {
        vista: '0 0 640 190',
        disegno: disegno(
          catena(10, 14, [
            { etichetta: T.posta.scritte.collega, sotto: T.posta.scritte.chiedeIndirizzo },
            // testo-fisso: un marchio, non si traduce
            { etichetta: 'Microsoft', sotto: T.posta.scritte.accessoNelBrowser },
            { etichetta: T.posta.scritte.portachiavi, sotto: T.posta.scritte.gettone },
            { etichetta: 'smtp.office365.com', sotto: T.posta.scritte.porta, tono: 'quieto' },
          ], { largo: 136, stacco: 25 }),
          riquadro(10, 112, 160, 42, {
            etichetta: T.posta.scritte.comunicazione,
            sotto: T.posta.scritte.daMandare,
            simbolo: 'posta',
          }),
          riquadro(250, 88, 200, 40, {
            tono: 'positivo',
            etichetta: T.posta.scritte.parte,
            sotto: T.posta.scritte.parteQuando,
          }),
          riquadro(250, 142, 200, 40, {
            tono: 'quieto',
            etichetta: T.posta.scritte.fileEml,
            sotto: T.posta.scritte.fileEmlQuando,
          }),
          freccia([[173, 126], [246, 108]], { tono: 'positivo' }),
          freccia([[173, 140], [246, 160]]),
          freccia([[453, 108], [561, 108], [561, 58]], { tono: 'positivo' }),
          bollino(146, 14, 1),
          bollino(468, 14, 2),
          bollino(450, 88, 3),
          bollino(450, 142, 4),
        ),
      },
    ],
    note: ['meccanismo', 'attenzione'],
    vedi: ['impostazioni-programma', 'docente', 'persone', 'guai'],
  }, T.posta),
  sezione({
    id: 'aggiornamenti',
    parte: 'programma',
    simbolo: 'ricarica',
    vista: 'impostazioni',
    figure: [
      {
        vista: '0 0 640 112',
        disegno: disegno(
          catena(10, 24, [
            { etichetta: AGG.controllo, sotto: AGG.chiedeGithub },
            {
              etichetta: AGG.disponibile,
              sotto: AGG.ceLaNuova,
              tono: 'informativo',
            },
            {
              etichetta: AGG.scarico,
              sotto: AGG.barraDeiMb,
              tono: 'informativo',
            },
            {
              etichetta: AGG.pronta,
              sotto: AGG.aspettaUscita,
              tono: 'positivo',
            },
            {
              etichetta: AGG.installata,
              sotto: AGG.versioneNuova,
              tono: 'accento',
            },
          ], { largo: 108, stacco: 20 }),
          freccia([[64, 86], [64, 68]]),
          tastinoAlCentro(64, 86, 106, AGG.controllaAdesso, AGG_IT.controllaAdesso),
          freccia([[192, 86], [192, 68]]),
          tastinoAlCentro(192, 86, 106, parole().scarica, parole().scarica),
          freccia([[448, 86], [448, 68]]),
          tastinoAlCentro(448, 86, 106, AGG.riavvia, AGG_IT.riavvia),
          bollino(128, 12, 1),
          bollino(256, 12, 2),
          bollino(512, 12, 3),
        ),
      },
      { vista: '0 0 640 168', disegno: doveSiVedeLaVersione() },
    ],
    note: ['meccanismo', 'consiglio'],
    vedi: ['impostazioni-programma', 'finestra', 'vassoio', 'dati'],
  }, T.aggiornamenti),
]
