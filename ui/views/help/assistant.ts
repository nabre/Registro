// La guida: modelli-linguistici, assistente, contesto-assistente, dettatura,
// privacy-assistente.
//
// Solo struttura e schemi: le parole stanno in `assistant.testi.ts`, il disegno
// della pagina in `../help.ts`, il vocabolario delle figure in `drawing.ts`.
// Come si divide una pagina fra i due file sta in testa a `types.ts`.

import { parole } from '#core/dominio/words.testi.js'
import { testi } from './assistant.testi.js'
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
  zoneTelaio,
} from './drawing.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

/** Un pulsante dello schema: un riquadro basso con il suo nome, in piccolo. */
function bottone (x: number, y: number, l: number, nome: string, primario = false): string {
  return disegno(
    riquadro(x, y, l, 20, { tono: primario ? 'accento' : 'neutro', raggio: 4 }),
    testo(x + l / 2, y + 14, nome, {
      corpo: 'piccolo',
      ancora: 'centro',
      tono: primario ? 'accento' : 'neutro',
    }),
  )
}

/**
 * Quanto è largo il pulsante di un nome: quanto lo voleva l'italiano, o quanto
 * il nome, se in un'altra lingua è più lungo. Il margine è stretto perché la
 * stima di `larghezzaTesto` sbaglia già per eccesso.
 */
function largoBottone (largo: number, nome: string): number {
  return Math.max(largo, larghezzaTesto(nome, 'piccolo') + 4)
}

/** Un interruttore dello schema, acceso o spento, con il pomello dalla sua parte. */
function interruttore (x: number, y: number, acceso: boolean): string {
  const tono = acceso ? 'accento' : 'quieto'
  return disegno(
    riquadro(x, y, 24, 14, { tono, raggio: 7 }),
    riquadro(acceso ? x + 12 : x + 2, y + 2, 10, 10, { tono, raggio: 5 }),
  )
}

// ------------------------- la sezione «Assistente e modelli» delle impostazioni

const PAGINA_MODELLI = zoneTelaio(10, 10, 620, 320).area

/**
 * La figura della sezione dei modelli: chi risponde, con un interruttore e
 * una tendina per uso; la cartella e i file; i due gruppi chiusi in fondo.
 */
function figuraModelli (): string {
  const s = T.modelliLinguistici.scritte
  const x = PAGINA_MODELLI.x
  /** Una riga d'uso: l'interruttore, il nome, la tendina del modello, lo stato. */
  const uso = (y: number, nome: string, modello: string, stato: string, acceso: boolean): string =>
    disegno(
      interruttore(x + 22, y - 11, acceso),
      testo(x + 54, y, nome, { corpo: 'piccolo' }),
      riquadro(x + 150, y - 13, 180, 18, { tono: 'quieto', raggio: 4 }),
      testo(x + 158, y, modello, {
        corpo: 'piccolo',
        macchina: modello !== s.nessuno,
        tono: modello === s.nessuno ? 'quieto' : 'neutro',
      }),
      pastiglia(x + 342, y - 13, stato, acceso ? 'positivo' : 'neutro'),
    )
  /** Un gruppo chiuso: si apre con un clic sul nome. */
  const chiuso = (y: number, nome: string): string =>
    disegno(
      riquadro(x + 10, y, 470, 24, { tono: 'quieto' }),
      // testo-fisso: il triangolo del gruppo chiuso, non si legge
      testo(x + 22, y + 16, '▸', { corpo: 'piccolo', tono: 'quieto' }),
      testo(x + 36, y + 16, nome, { corpo: 'piccolo', forte: true }),
    )
  return disegno(
    telaio(10, 10, 620, 320, {
      laterali: [s.impostazioni, s.guida],
      scelta: 0,
    }),
    // Chi risponde: un uso per riga, ognuno acceso e scelto qui.
    riquadro(x + 10, 40, 470, 88),
    testo(x + 22, 58, s.chiRisponde, { forte: true }),
    uso(80, s.assistente, 'qwen2.5-7b…gguf', s.pronto, true),
    uso(100, s.scansioni, s.nessuno, s.spento, false),
    // testo-fisso: il nome di un modello di voicebox, non si traduce
    uso(120, s.dettatura, 'turbo', s.spento, false),
    // Sul computer: la cartella, i file, e dove trascinarne uno.
    riquadro(x + 10, 136, 470, 110),
    testo(x + 22, 154, s.sulComputer, { forte: true }),
    testo(x + 22, 176, s.cartella, { corpo: 'piccolo' }),
    riquadro(x + 170, 164, 290, 18, { tono: 'quieto', raggio: 4 }),
    testo(x + 22, 202, 'qwen2.5-7b-q4_k_m.gguf', { corpo: 'piccolo', macchina: true }),
    testo(x + 200, 202, s.peso, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(x + 436, 188, 24, 20, { tono: 'negativo', raggio: 4 }),
    simbolo('cestino', x + 441, 191, 14, 'negativo'),
    riquadro(x + 22, 214, 446, 24, { tratteggio: true, tono: 'quieto', raggio: 4 }),
    testo(x + 34, 230, s.trascina, {
      corpo: 'piccolo', tono: 'quieto',
    }),
    bottone(x + 200, 216, largoBottone(96, s.caricaFile), s.caricaFile),
    // In fondo, chiusi: gli scarichi e le avanzate.
    chiuso(254, s.scaricaModelli),
    chiuso(286, s.avanzate),
    bollino(x + 10, 40, 1),
    bollino(x + 10, 136, 2),
    bollino(x + 10, 254, 3),
    bollino(x + 10, 286, 4),
  )
}

// ------------------------------------------------ il riquadro dell'assistente

const AREA = zoneTelaio(10, 10, 620, 250).area
/** Dove comincia il riquadro, a destra della pagina. */
const RX = 420

/** La finestra con il riquadro dell'assistente aperto a destra. */
function figuraRiquadro (): string {
  const s = T.assistente.scritte
  // «Chiedi» finisce dove finiva in italiano; un nome più lungo cresce a
  // sinistra, senza margine: a sinistra c'è il microfono.
  const chiedi = Math.max(46, larghezzaTesto(s.chiedi, 'piccolo'))
  return disegno(
    telaio(10, 10, 620, 250, {
      laterali: [s.lezione, s.valutazioni, s.check, s.pianiLezione, s.documenti],
      scelta: 1,
    }),
    // La riga delle tendine, con in fondo i due interruttori.
    riquadro(AREA.x + 8, AREA.y + 6, 70, 20, { tono: 'quieto', raggio: 4 }),
    testo(AREA.x + 16, AREA.y + 20, s.corso, { corpo: 'piccolo' }),
    riquadro(AREA.x + 84, AREA.y + 6, 70, 20, { tono: 'quieto', raggio: 4 }),
    testo(AREA.x + 92, AREA.y + 20, parole().periodo, { corpo: 'piccolo' }),
    bottone(470, AREA.y + 6, largoBottone(60, s.proietta), s.proietta),
    riquadro(594, AREA.y + 5, 26, 22, { tono: 'accento', raggio: 4 }),
    simbolo('bot', 599, AREA.y + 8, 16, 'accento'),
    // La pagina, che si stringe e resta visibile.
    righe(AREA.x + 10, AREA.y + 42, 250, 7, 14),
    riquadro(AREA.x + 10, AREA.y + 144, 250, 42, { tono: 'quieto' }),
    // Il riquadro: testata, filo, casella.
    riquadro(RX, AREA.y + 34, 206, 170),
    simbolo('bot', RX + 8, AREA.y + 41, 14, 'accento'),
    testo(RX + 26, AREA.y + 52, s.assistente, { corpo: 'piccolo', forte: true }),
    simbolo('filtro', RX + 124, AREA.y + 40, 14, 'accento'),
    simbolo('cestino', RX + 144, AREA.y + 40, 14),
    simbolo('duplica', RX + 164, AREA.y + 40, 14),
    simbolo('chiudi', RX + 184, AREA.y + 40, 14),
    testo(RX + 8, AREA.y + 68, s.nonScrive, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(RX + 96, AREA.y + 76, 102, 18, { tono: 'accento', raggio: 8 }),
    righe(RX + 104, AREA.y + 83, 84, 1),
    // Il nome della procedura è quello che il modello chiama: non si traduce.
    pastiglia(RX + 8, AREA.y + 100, 'corso.presenze', 'positivo'),
    righe(RX + 8, AREA.y + 126, 180, 2, 9),
    riquadro(RX + 8, AREA.y + 142, 190, 22, { tono: 'quieto', raggio: 3 }),
    righe(RX + 14, AREA.y + 147, 170, 2, 8),
    riquadro(RX + 8, AREA.y + 172, 120, 24, { tono: 'quieto', raggio: 4 }),
    simbolo('microfono', RX + 134, AREA.y + 177, 14),
    bottone(RX + 198 - chiedi, AREA.y + 174, chiedi, s.chiedi, true),
    bollino(579, AREA.y + 16, 1),
    bollino(RX + 131, AREA.y + 28, 2),
    bollino(RX + 206, AREA.y + 62, 3),
    bollino(RX, AREA.y + 109, 4),
    bollino(RX, AREA.y + 153, 5),
    bollino(RX, AREA.y + 184, 6),
  )
}

// ------------------------------------------------------------- il contesto

/** Dalla pagina alla risposta, passando per il filtro e le letture. */
function figuraContesto (): string {
  const s = T.contestoAssistente.scritte
  return disegno(
    catena(10, 20, [
      { etichetta: s.pagina, sotto: s.tendineFiltri, simbolo: 'schermo' },
      { etichetta: s.filtro, sotto: s.partiAccese, tono: 'accento', simbolo: 'filtro' },
      { etichetta: s.modello, sotto: s.sulComputer, simbolo: 'bot' },
      { etichetta: s.risposta, sotto: s.testoETabelle, tono: 'positivo', simbolo: 'spunta' },
    ], { largo: 128, stacco: 34 }),
    riquadro(10, 112, 128, 40, { etichetta: s.domanda, sotto: s.quelCheScrivi, simbolo: 'matita' }),
    freccia([[138, 132], [345, 132], [345, 64]]),
    riquadro(380, 112, 150, 40, {
      tono: 'quieto', etichetta: s.letture, sotto: s.soloLettura, simbolo: 'libro',
    }),
    freccia([[405, 64], [405, 108]], { doppia: true }),
    testo(420, 92, s.finoA10, { corpo: 'piccolo', tono: 'quieto' }),
    bollino(172, 20, 1),
    bollino(530, 112, 2),
    bollino(172 + 162 * 2, 20, 3),
  )
}

// ------------------------------------------------------------- la dettatura

/** Dal microfono alla casella, tutto sul computer. */
function figuraDettatura (): string {
  const s = T.dettatura.scritte
  return disegno(
    catena(10, 20, [
      { etichetta: s.microfono, simbolo: 'microfono', tono: 'accento' },
      { etichetta: s.pezzi, sotto: s.tagliati },
      // Il nome del programma: non si traduce.
      { etichetta: 'voicebox', sotto: s.sulComputer },
      { etichetta: s.casella, sotto: s.siRilegge },
      { etichetta: s.chiedi, tono: 'positivo' },
    ], { largo: 104, stacco: 26 }),
    riquadro(270, 110, 104, 40, {
      tratteggio: true, tono: 'quieto', etichetta: '127.0.0.1', sotto: s.soloQuestoPc,
    }),
    freccia([[300, 64], [300, 106]], { tono: 'quieto', tratteggio: true }),
    riquadro(400, 110, 170, 40, {
      tono: 'quieto', etichetta: s.primaVolta, sotto: s.scaricaModello,
    }),
    freccia([[470, 110], [470, 88], [355, 88], [355, 64]], { tono: 'quieto', tratteggio: true }),
    bollino(244, 20, 1),
    bollino(374, 20, 2),
    bollino(504, 20, 3),
  )
}

// ---------------------------------------------------- che cosa esce, e che cosa no

/** Il confine del computer: che cosa sta dentro, e che cosa passa. */
function figuraConfine (): string {
  const s = T.privacyAssistente.scritte
  return disegno(
    riquadro(10, 20, 420, 190, { tratteggio: true, tono: 'quieto' }),
    testo(24, 40, s.ilTuoComputer, { forte: true, tono: 'quieto' }),
    riquadro(30, 56, 180, 60, {
      tono: 'accento', etichetta: s.registro, sotto: s.conDentro, simbolo: 'bot',
    }),
    riquadro(230, 56, 180, 60, {
      etichetta: s.cartellaModelli, sotto: s.fileGguf, simbolo: 'cartella',
    }),
    riquadro(30, 136, 180, 56, {
      etichetta: s.dettatura, sotto: 'voicebox', simbolo: 'microfono',
    }),
    riquadro(230, 136, 180, 56, {
      tratteggio: true,
      tono: 'quieto',
      etichetta: s.condotto,
      sotto: s.spentoDiSerie,
      simbolo: 'presa',
    }),
    freccia([[210, 86], [226, 86]], { doppia: true }),
    // testo-fisso: il nome del servizio, uguale in ogni lingua
    riquadro(480, 40, 150, 56, { etichetta: 'Hugging Face', sotto: s.modelliPubblici }),
    riquadro(480, 146, 150, 52, {
      tono: 'quieto', etichetta: s.altriProgrammi, sotto: s.fuoriDalRegistro,
    }),
    freccia([[410, 66], [476, 66]], { tono: 'attenzione', etichetta: s.richieste }),
    freccia([[480, 92], [414, 92]], { tono: 'positivo', etichetta: s.pesi }),
    freccia([[410, 172], [476, 172]], { tono: 'negativo', tratteggio: true }),
    bollino(210, 56, 1),
    bollino(630, 40, 2),
    bollino(410, 136, 3),
  )
}

export const SEZIONI_ASSISTENTE: SezioneGuida[] = [
  sezione({
    id: 'modelli-linguistici',
    parte: 'programma',
    simbolo: 'bot',
    vista: 'modelliLinguistici',
    figure: [{ vista: '0 0 640 340', disegno: figuraModelli() }],
    note: ['consiglio', 'meccanismo'],
    vedi: ['assistente', 'privacy-assistente', 'smistare', 'impostazioni'],
  }, T.modelliLinguistici),
  sezione({
    id: 'assistente',
    parte: 'programma',
    simbolo: 'bot',
    figure: [{ vista: '0 0 640 260', disegno: figuraRiquadro() }],
    note: ['attenzione', 'meccanismo'],
    vedi: [
      'contesto-assistente', 'dettatura', 'privacy-assistente', 'modelli-linguistici', 'proiezione',
    ],
  }, T.assistente),
  sezione({
    id: 'contesto-assistente',
    parte: 'programma',
    simbolo: 'filtro',
    figure: [{ vista: '0 0 640 165', disegno: figuraContesto() }],
    note: ['meccanismo', 'consiglio'],
    vedi: ['assistente', 'privacy-assistente', 'finestra'],
  }, T.contestoAssistente),
  sezione({
    id: 'dettatura',
    parte: 'programma',
    simbolo: 'microfono',
    figure: [{ vista: '0 0 640 165', disegno: figuraDettatura() }],
    note: ['meccanismo'],
    vedi: ['assistente', 'privacy-assistente', 'impostazioni'],
  }, T.dettatura),
  sezione({
    id: 'privacy-assistente',
    parte: 'programma',
    simbolo: 'presa',
    figure: [{ vista: '0 0 640 220', disegno: figuraConfine() }],
    note: ['attenzione'],
    vedi: [
      'assistente', 'contesto-assistente', 'modelli-linguistici', 'riga-di-comando', 'mappa',
      'posta', 'aggiornamenti',
    ],
  }, T.privacyAssistente),
]
