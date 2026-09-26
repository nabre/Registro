// La guida: corsi, orario, classi, intestazione.
//
// Solo struttura e schemi: le parole stanno in `setup.testi.ts`, il disegno
// della pagina in `../help.ts`, il vocabolario delle figure in `drawing.ts`.
// Come si divide una pagina fra i due file sta in testa a `types.ts`.

import { Molti } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import {
  bollino,
  disegno,
  freccia,
  larghezzaTesto,
  pastiglia,
  riquadro,
  righe,
  simbolo,
  tastino,
  telaio,
  testo,
} from './drawing.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './setup.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

// ------------------------------------------------------------------ le figure

/** Le pagine del gruppo «L’anno» nella barra laterale, nel loro ordine. */
const ANNO = [T.classi.titolo, Molti(lessico().pif), T.classi.scritte.mappa, T.corsi.titolo]

/** Quanto è larga una pastiglia con quel testo: come la disegna `pastiglia`. */
function largaPastiglia (contenuto: string): number {
  return larghezzaTesto(contenuto, 'piccolo') + 14
}

/** La pagina Corsi: la scheda del corso e la tabella per persona. */
function figuraCorsi (): string {
  const s = T.corsi.scritte
  // Il sottotitolo, le due fasce dell'orario e il totale stanno dove li
  // metteva l'italiano, o più a destra se in un'altra lingua sono più lunghi.
  const sottotitolo = Math.max(200, 152 + larghezzaTesto(s.titolo, 'titolo') + 8)
  const giovedi = Math.max(312, 162 + largaPastiglia(s.martedi) + 6)
  const totale = Math.max(465, giovedi + largaPastiglia(s.giovedi) + 9)
  const colonne = [
    [s.pif, 162], [s.colAssenza, 290], [s.colPresenza, 350], [s.colUd, 420],
    [s.colProve, 460], [s.colMedia, 510], [s.colNota, 565],
  ] as const
  return disegno(
    telaio(10, 10, 620, 250, {
      laterali: ANNO,
      scelta: 3,
    }),
    testo(152, 52, s.titolo, { corpo: 'titolo', forte: true }),
    testo(sottotitolo, 52, s.periodo, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(150, 60, 470, 94),
    testo(162, 80, s.corso, { forte: true }),
    simbolo('matita', 508, 67, 14),
    simbolo('calendario', 530, 67, 14),
    simbolo('check', 552, 67, 14),
    simbolo('piano', 574, 67, 14),
    simbolo('cestino', 596, 67, 14),
    ...[
      ['18', s.pif],
      ['12/30', s.oreSvolte],
      ['96', s.udPreviste],
      ['94%', s.presenza],
      [s.mediaValore, s.media],
      ['7', s.piani],
    ].map(([valore, nome], i) => disegno(
      testo(162 + i * 76, 106, valore, { forte: true }),
      testo(162 + i * 76, 118, nome, { corpo: 'piccolo', tono: 'quieto' }),
    )),
    pastiglia(162, 128, s.martedi, 'informativo'),
    pastiglia(giovedi, 128, s.giovedi, 'informativo'),
    testo(totale, 141, s.settimana, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(150, 162, 470, 72, { tono: 'quieto' }),
    ...colonne.map(([nome, x]) => testo(x, 178, nome, { corpo: 'piccolo', forte: true })),
    righe(162, 188, 100, 4, 12),
    ...[290, 350, 420, 460, 510, 565].map((x) => righe(x, 188, 30, 4, 12)),
    bollino(495, 73, 1),
    bollino(150, 108, 2),
    bollino(150, 137, 3),
    bollino(150, 198, 4),
  )
}

/** L'orario: le fasce incatenate, e le lezioni che ne nascono. */
function figuraOrario (): string {
  const s = T.orario.scritte
  // La fine della fascia sta dopo le sue UD: dove l'aveva messa l'italiano, o
  // più a destra se «2 UD» in un'altra lingua è più lungo.
  const fine = Math.max(172, 126 + larghezzaTesto(s.dueUd) + 6)
  return disegno(
    testo(10, 16, s.oreFisse, { corpo: 'piccolo', tono: 'quieto', forte: true }),
    riquadro(10, 24, 250, 30),
    testo(22, 44, s.giorno),
    riquadro(56, 29, 58, 20, { tono: 'accento', raggio: 4 }),
    testo(85, 43, '08:20', { macchina: true, corpo: 'piccolo', ancora: 'centro' }),
    testo(126, 44, s.dueUd),
    testo(fine, 44, '→ 09:50', { tono: 'quieto' }),
    riquadro(10, 62, 250, 30),
    testo(22, 82, s.giorno),
    riquadro(56, 67, 58, 20, { tono: 'quieto', tratteggio: true, raggio: 4 }),
    testo(85, 81, '09:50', { macchina: true, corpo: 'piccolo', ancora: 'centro', tono: 'quieto' }),
    testo(126, 82, s.dueUd),
    testo(fine, 82, '→ 11:20', { tono: 'quieto' }),
    freccia([[196, 50], [196, 58], [85, 58], [85, 65]], { tono: 'accento' }),
    pastiglia(10, 100, s.settimana, 'informativo'),
    freccia([[272, 42], [296, 42]]),
    riquadro(300, 24, 150, 36, {
      tono: 'accento', etichetta: s.genera, simbolo: 'calendario',
    }),
    riquadro(470, 24, 160, 36, { tono: 'quieto', etichetta: s.senzaLezione }),
    freccia([[375, 62], [375, 138]], { tono: 'accento' }),
    freccia([[550, 62], [550, 112], [494, 112], [494, 138]], { tratteggio: true }),
    testo(20, 134, parole().dal, { corpo: 'piccolo', tono: 'quieto' }),
    testo(608, 134, parole().al, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
    ...['2.9', '9.9', '16.9', '23.9', '30.9', '7.10', '14.10', '21.10', '28.10', '4.11']
      .map((data, i) => riquadro(20 + i * 60, 142, 48, 34, {
        etichetta: data,
        raggio: 4,
        tono: i === 3 ? 'neutro' : i === 7 || i === 8 ? 'quieto' : 'positivo',
        tratteggio: i === 7 || i === 8,
      })),
    testo(224, 194, s.ceGia, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    testo(494, 194, s.vacanze, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    bollino(260, 39, 1),
    bollino(260, 77, 2),
    bollino(450, 24, 3),
    bollino(248, 142, 4),
    bollino(548, 142, 5),
  )
}

/**
 * La pagina Classi: la classe si sceglie dalla tendina in alto, e la pagina ha
 * i suoi dettagli in cima e il gruppo sotto.
 */
function figuraClassi (): string {
  const s = T.classi.scritte
  // La casella «Archiviata» sta dopo «Sono docente di classe»: dove l'aveva
  // messa l'italiano, o più a destra se la scritta è più lunga.
  const archiviata = Math.max(424, 278 + larghezzaTesto(s.docenteClasse, 'piccolo') + 4)
  const p = parole()
  const colonne = [
    [s.pif, 162], [s.nascita, 262], [p.indirizzo, 336], [p.email, 426], [s.datore, 520],
  ] as const
  return disegno(
    telaio(10, 10, 620, 240, {
      laterali: ANNO,
      scelta: 0,
    }),
    testo(152, 52, s.titolo, { corpo: 'titolo', forte: true }),
    // I dettagli della classe, modificabili sul posto.
    riquadro(150, 62, 470, 56, { tono: 'quieto' }),
    testo(162, 80, parole().dettagli, { forte: true }),
    tastino(500, 68, 108, s.elimina),
    riquadro(162, 91, 12, 12, { tono: 'accento', raggio: 3 }),
    testo(182, 101, 'I MEC A', { corpo: 'piccolo', forte: true }),
    riquadro(262, 92, 10, 10, { raggio: 2 }),
    testo(278, 101, s.docenteClasse, { corpo: 'piccolo' }),
    riquadro(archiviata, 92, 10, 10, { raggio: 2 }),
    testo(archiviata + 16, 101, s.archiviata, { corpo: 'piccolo' }),
    testo(520, 101, parole().note, { corpo: 'piccolo', tono: 'quieto' }),
    // La classe e il suo gruppo.
    riquadro(150, 126, 470, 106),
    testo(162, 146, 'I MEC A', { forte: true }),
    testo(222, 146, s.gruppo, { corpo: 'piccolo', tono: 'quieto' }),
    ...colonne.map(([nome, x]) => testo(x, 168, nome, { corpo: 'piccolo', forte: true })),
    righe(162, 178, 80, 4, 12),
    righe(262, 178, 50, 4, 12),
    righe(336, 178, 70, 4, 12),
    righe(426, 178, 70, 4, 12),
    righe(520, 178, 60, 4, 12),
    bollino(150, 136, 1),
    bollino(150, 72, 2),
    bollino(150, 190, 3),
  )
}

/**
 * La sezione «Intestazione» delle impostazioni: chi firma, due carte con i
 * loro corsi, un corso che passa dall'una all'altra, e il foglio che ne esce.
 */
function figuraIntestazione (): string {
  const s = T.intestazione.scritte
  // Il campo del nome sta dopo «Chi firma»: dove l'aveva messo l'italiano, o
  // più a destra se la scritta è più lunga.
  const campo = Math.max(214, 160 + larghezzaTesto(s.chiFirma, 'piccolo') + 1)
  return disegno(
    telaio(10, 10, 620, 250, { laterali: [s.impostazioni, s.guida], scelta: 0 }),
    testo(160, 44, s.chiFirma, { corpo: 'piccolo', forte: true, tono: 'quieto' }),
    riquadro(campo, 32, 120, 18, { raggio: 4 }),
    testo(campo + 8, 45, s.nome, { corpo: 'piccolo' }),
    // La prima carta, la predefinita.
    riquadro(160, 60, 116, 186, { raggio: 6 }),
    testo(168, 76, s.scuolaA, { corpo: 'piccolo', forte: true }),
    pastiglia(168, 82, s.predefinita, 'accento'),
    riquadro(168, 106, 40, 22, { tono: 'accento', raggio: 4 }),
    simbolo('immagine', 180, 109, 16, 'accento'),
    riquadro(166, 138, 104, 100, { tratteggio: true, raggio: 4 }),
    testo(172, 154, '1A', { corpo: 'piccolo', forte: true }),
    pastiglia(172, 160, s.matematica, 'quieto'),
    pastiglia(172, 184, s.fisica, 'quieto'),
    // La seconda, per l'altra scuola.
    riquadro(284, 60, 116, 186, { raggio: 6 }),
    testo(292, 76, s.scuolaB, { corpo: 'piccolo', forte: true }),
    riquadro(292, 106, 40, 22, { tono: 'accento', raggio: 4 }),
    simbolo('immagine', 304, 109, 16, 'accento'),
    riquadro(290, 138, 104, 100, { tono: 'accento', tratteggio: true, raggio: 4 }),
    testo(296, 154, '3C', { corpo: 'piccolo', forte: true }),
    pastiglia(296, 160, s.storia, 'quieto'),
    freccia([[222, 193], [300, 193]], { tono: 'accento', tratteggio: true }),
    // Il foglio di un corso della seconda scuola.
    riquadro(420, 40, 170, 206, { raggio: 2 }),
    riquadro(552, 50, 28, 18, { tono: 'accento', raggio: 2 }),
    testo(432, 62, s.scuolaB, { corpo: 'piccolo', forte: true }),
    righe(432, 86, 146, 10, 12),
    testo(432, 236, s.nome, { corpo: 'piccolo', tono: 'quieto' }),
    bollino(150, 40, 1),
    bollino(160, 60, 2),
    bollino(166, 138, 3),
    bollino(410, 40, 4),
  )
}

// ------------------------------------------------------------------ le sezioni

export const SEZIONI_IMPIANTO: SezioneGuida[] = [
  sezione({
    id: 'corsi',
    parte: 'anno',
    simbolo: 'libro',
    vista: 'corsi',
    figure: [{ vista: '0 0 640 270', disegno: figuraCorsi() }],
    note: ['meccanismo', 'attenzione'],
    vedi: ['orario', 'classi', 'valutazioni', 'piani', 'rapporti'],
  }, T.corsi),
  sezione({
    id: 'orario',
    parte: 'anno',
    simbolo: 'orologio',
    figure: [{ vista: '0 0 640 205', disegno: figuraOrario() }],
    note: ['attenzione', 'meccanismo', 'meccanismo'],
    vedi: ['corsi', 'calendario', 'impostazioni', 'lezione'],
  }, T.orario),
  sezione({
    id: 'classi',
    parte: 'anno',
    simbolo: 'classi',
    vista: 'classi',
    figure: [{ vista: '0 0 640 260', disegno: figuraClassi() }],
    note: ['attenzione', 'meccanismo'],
    vedi: ['corsi', 'scheda', 'persone', 'docente', 'mappa'],
  }, T.classi),
  sezione({
    id: 'intestazione',
    parte: 'programma',
    simbolo: 'documento',
    // Anche la vista `modelli` porta a questa sezione.
    vista: 'modelli',
    figure: [{ vista: '0 0 640 270', disegno: figuraIntestazione() }],
    note: ['meccanismo', 'consiglio', 'meccanismo'],
    vedi: ['rapporti', 'posta', 'impostazioni'],
  }, T.intestazione),
]
