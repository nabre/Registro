// La guida: primi-passi, inizio, finestra, ricerca, barra-stato, scorciatoie.
//
// Solo struttura e schemi: le parole stanno in `start.testi.ts`, il disegno
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
  tasti,
  telaio,
  testo,
} from './drawing.js'
import { Molti, quanti } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { parole } from '../../../domain/words.testi.js'
import { testi as testiPalette } from '../../components/palette.testi.js'
import type { NomeIcona } from '../../components/icons.js'
import { testi } from './start.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

/**
 * Una voce della barra laterale disegnata: `scelta` la accende. Accesa è una
 * pillola, col nome in testo pieno e non colorato, come nella barra vera
 * (`sidebar.css`).
 */
function paginaLaterale (y: number, nome: string, scelta = false): string {
  return disegno(
    scelta && riquadro(15, y, 120, 17, { tono: 'accento', raggio: 8.5 }),
    testo(24, y + 12.5, nome, { corpo: 'piccolo', tono: 'neutro', forte: scelta }),
  )
}

/**
 * Un testo accorciato coi puntini fino a stare in `largo`: il titolo lungo di
 * un gruppo, che nella barra vera si accorcia allo stesso modo.
 */
function accorciato (contenuto: string, largo: number): string {
  if (larghezzaTesto(contenuto, 'piccolo') <= largo) return contenuto
  let corto = contenuto
  while (corto.length > 1 && larghezzaTesto(`${corto}…`, 'piccolo') > largo) corto = corto.slice(0, -1)
  return `${corto.trimEnd()}…`
}

/** Il titolo di un gruppo della barra laterale disegnata: in minuscolo, su una riga. */
function gruppoLaterale (y: number, nome: string): string {
  return testo(18, y, accorciato(nome, 118), { corpo: 'piccolo', tono: 'quieto', forte: true })
}

/**
 * La pastiglia «Cerca…» della barra del titolo, che finisce in `destra`: la
 * lente, la parola e il tasto, come in `pastigliaCerca` di `titleBar.ts`.
 */
function pastigliaCerca (destra: number, y: number): string {
  const parola = `${parole().cerca}…`
  const tasto = 'Ctrl K' // testo-fisso: nomi dei tasti
  const largo = 30 + larghezzaTesto(parola, 'piccolo') + larghezzaTesto(tasto, 'piccolo', true) + 8
  const x = destra - largo
  return disegno(
    riquadro(x, y, largo, 16, { tono: 'quieto', raggio: 8 }),
    simbolo('lente', x + 6, y + 2.5, 11, 'quieto'),
    testo(x + 21, y + 11.5, parola, { corpo: 'piccolo', tono: 'quieto' }),
    testo(destra - 6, y + 11.5, tasto, { corpo: 'piccolo', tono: 'quieto', macchina: true, ancora: 'fine' }),
  )
}

/** Una riga della palette disegnata: il simbolo, il nome, e sotto la riga piccola. */
function rigaPalette (
  y: number,
  icona: NomeIcona,
  nome: string,
  sotto: string,
  scelta = false,
): string {
  const tono = scelta ? 'accento' : 'neutro'
  return disegno(
    scelta && riquadro(128, y, 384, 34, { tono: 'accento' }),
    simbolo(icona, 138, y + 9, 16, tono),
    testo(164, y + 15, nome, { forte: true, tono }),
    testo(164, y + 28, sotto, { corpo: 'piccolo', tono: 'quieto' }),
  )
}

/** Il titoletto di un gruppo della palette, e a destra il conto se è tagliato. */
function titolettoPalette (y: number, nome: string, conto?: string): string {
  return disegno(
    testo(136, y, nome, { corpo: 'piccolo', tono: 'quieto', forte: true }),
    conto && testo(492, y, conto, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
  )
}

/** Un filo orizzontale: separa due righe dello schema. */
function filo (x: number, y: number, l: number): string {
  return riquadro(x, y, l, 1, { tono: 'quieto', raggio: 0 })
}

/** Quanto è larga una pastiglia con quel testo: come la disegna `pastiglia`. */
function largaPastiglia (contenuto: string): number {
  return larghezzaTesto(contenuto, 'piccolo') + 14
}

/**
 * Un nome in piccolo e la sua tendina accanto: la tendina parte dove l'aveva
 * messa l'italiano, e si sposta a destra solo se il nome, in un'altra lingua,
 * è più lungo.
 */
function sceltaConNome (x: number, xTendina: number, nome: string, valore: string): string {
  const dove = Math.max(xTendina, x + larghezzaTesto(nome, 'piccolo') + 2)
  return disegno(
    testo(x, 49, nome, { corpo: 'piccolo', tono: 'quieto' }),
    pastiglia(dove, 36, valore, 'quieto'),
  )
}

/**
 * I pulsanti della riga delle azioni, di fila da `x`: ognuno largo quanto
 * l'italiano, o quanto il suo nome se in un'altra lingua è più lungo.
 */
function filaDiPulsanti (
  x: number,
  pulsanti: readonly { nome: string, largo: number, tono: 'neutro' | 'accento' | 'quieto' }[],
): string {
  let cursore = x
  return disegno(...pulsanti.map(({ nome, largo, tono }) => {
    const l = Math.max(largo, larghezzaTesto(nome) + 12)
    const pezzo = riquadro(cursore, 64, l, 18, { tono, etichetta: nome })
    cursore += l + 6
    return pezzo
  }))
}

/** La riga delle scelte disegnata: corso, periodo, e in fondo Modifica e Proietta. */
function rigaDelleScelte (): string {
  const s = T.finestra.scritte
  // Da destra: Proietta finisce dove finiva in italiano, Modifica gli sta accanto.
  const proietta = Math.min(562, 624 - largaPastiglia(s.proietta))
  const modifica = Math.min(496, proietta - 4 - largaPastiglia(parole().modifica))
  return disegno(
    sceltaConNome(152, 184, s.corso, s.tuttiICorsi),
    sceltaConNome(300, 344, parole().periodo, s.annoIntero),
    pastiglia(modifica, 36, parole().modifica, 'accento'),
    pastiglia(proietta, 36, s.proietta, 'quieto'),
  )
}

export const SEZIONI_INIZIO: SezioneGuida[] = [
  sezione({
    id: 'primi-passi',
    parte: 'inizio',
    simbolo: 'stella',
    passi: true,
    figure: [
      {
        vista: '0 0 640 92',
        disegno: disegno(
          catena(11, 12, [
            { etichetta: T.primiPassi.scritte.benvenuto, sotto: T.primiPassi.scritte.nuovoAnno },
            { etichetta: T.primiPassi.scritte.classi, sotto: T.primiPassi.scritte.eCorsi },
            { etichetta: parole().salva, sotto: 'Ctrl+S' },
            { etichetta: T.primiPassi.scritte.elenco, sotto: T.primiPassi.scritte.inClassi },
            {
              etichetta: T.primiPassi.scritte.ora,
              sotto: T.primiPassi.scritte.calendario,
              tono: 'accento',
            },
            {
              etichetta: T.primiPassi.scritte.svolta,
              sotto: T.primiPassi.scritte.aFineOra,
              tono: 'accento',
            },
            {
              etichetta: T.primiPassi.scritte.pendenze,
              sotto: T.primiPassi.scritte.agenda,
              tono: 'accento',
            },
          ], { largo: 78, stacco: 12 }),
          filo(11, 64, 348),
          testo(185, 80, T.primiPassi.scritte.unaVolta, {
            corpo: 'piccolo', tono: 'quieto', ancora: 'centro',
          }),
          riquadro(371, 64, 258, 1.5, { tono: 'accento', raggio: 0 }),
          testo(500, 80, T.primiPassi.scritte.ogniGiorno, {
            corpo: 'piccolo', tono: 'accento', ancora: 'centro',
          }),
        ),
      },
    ],
    note: ['meccanismo', 'consiglio'],
    vedi: ['inizio', 'corsi', 'classi', 'lezione', 'todo', 'dati'],
  }, T.primiPassi),
  sezione({
    id: 'inizio',
    parte: 'inizio',
    simbolo: 'piu',
    figure: [
      {
        vista: '0 0 640 170',
        disegno: disegno(
          catena(10, 20, [
            { etichetta: T.inizio.scritte.anno, sotto: '2026-2027.regi', simbolo: 'calendario' },
            { etichetta: T.inizio.scritte.classe, sotto: T.inizio.scritte.ilGruppo, simbolo: 'classi' },
            {
              etichetta: T.inizio.scritte.corso,
              sotto: T.inizio.scritte.materiaPerClasse,
              tono: 'accento',
              simbolo: 'piano',
            },
            { etichetta: T.inizio.scritte.orario, sotto: T.inizio.scritte.oreFisse, simbolo: 'settimana' },
          ], { largo: 130, stacco: 26 }),
          riquadro(10, 105, 130, 40, {
            tono: 'quieto', etichetta: T.inizio.scritte.materia, sotto: T.inizio.scritte.dalCatalogo,
          }),
          freccia([[140, 125], [387, 125], [387, 64]]),
          riquadro(478, 105, 130, 40, {
            tono: 'positivo', etichetta: T.inizio.scritte.lezioni, sotto: T.inizio.scritte.sulCalendario,
          }),
          freccia([[543, 64], [543, 101]]),
          testo(310, 160, T.inizio.scritte.agganciate, {
            corpo: 'piccolo', tono: 'quieto', ancora: 'centro',
          }),
          bollino(304, 20, 1),
          bollino(608, 105, 2),
        ),
      },
    ],
    note: ['attenzione'],
    vedi: ['primi-passi', 'corsi', 'classi', 'date', 'dati'],
  }, T.inizio),
  sezione({
    id: 'finestra',
    parte: 'inizio',
    simbolo: 'sidebar',
    figure: [
      {
        vista: '0 0 640 320',
        disegno: disegno(
          telaio(10, 10, 620, 300, { titolo: '', stato: T.finestra.scritte.stato }),
          // La barra del titolo: il segno del programma e File, il documento con il
          // percorso, e a destra la pastiglia della ricerca.
          simbolo('registro', 18, 14, 14, 'quieto'),
          testo(38, 25, T.finestra.scritte.file, { corpo: 'piccolo', forte: true }),
          testo(300, 25, T.finestra.scritte.percorso, {
            corpo: 'piccolo', forte: true, ancora: 'centro',
          }),
          pastigliaCerca(572, 13),
          // L'intestazione della barra laterale, ferma in cima, con
          // l'interruttore «Navigazione».
          simbolo('libro', 18, 37, 12, 'quieto'),
          testo(35, 47, T.finestra.scritte.registro, { corpo: 'piccolo', forte: true }),
          simbolo('sidebarRiduci', 120, 37, 12),
          filo(10, 55, 130),
          // La barra laterale nei suoi gruppi. «Docente di classe» qui non c'è (serve
          // una classe con la spunta); «Il programma» sta oltre il bordo dello schema.
          gruppoLaterale(66, T.finestra.scritte.gruppoAgenda),
          paginaLaterale(70, parole().oggi),
          paginaLaterale(87, T.finestra.scritte.calendario, true),
          paginaLaterale(104, T.finestra.scritte.pendenze),
          pastiglia(106, 104, '5', 'quieto'),
          paginaLaterale(121, T.finestra.scritte.daSmistare),
          pastiglia(106, 121, '3', 'quieto'),
          gruppoLaterale(151, T.finestra.scritte.gruppoRegistro),
          paginaLaterale(155, T.finestra.scritte.lezione),
          paginaLaterale(172, T.finestra.scritte.valutazioni),
          paginaLaterale(189, T.finestra.scritte.check),
          paginaLaterale(206, T.finestra.scritte.pianiLezione),
          paginaLaterale(223, T.finestra.scritte.documenti),
          gruppoLaterale(253, T.finestra.scritte.gruppoAnno),
          paginaLaterale(257, T.finestra.scritte.classi),
          // La riga delle scelte; l'anno aperto qui non ci sta.
          rigaDelleScelte(),
          filo(140, 58, 490),
          // La riga delle azioni: «Nuova ora» c'è perché «Modifica» è accesa.
          filaDiPulsanti(150, [
            { nome: parole().oggi, largo: 56, tono: 'neutro' },
            { nome: T.finestra.scritte.nuovaOra, largo: 82, tono: 'accento' },
            { nome: parole().settimana, largo: 76, tono: 'quieto' },
            { nome: parole().mese, largo: 50, tono: 'quieto' },
          ]),
          filo(140, 88, 490),
          // La pagina.
          ...[0, 1, 2, 3, 4].map((giorno) => disegno(
            riquadro(152 + giorno * 92, 100, 84, 180, { tono: 'quieto', raggio: 4 }),
            righe(160 + giorno * 92, 108, 50, 1),
            riquadro(158 + giorno * 92, 124 + (giorno % 3) * 26, 72, 30, {
              tono: 'neutro', raggio: 4,
            }),
          )),
          bollino(92, 21, 1),
          bollino(132, 64, 2),
          bollino(462, 45, 3),
          bollino(450, 73, 4),
          bollino(617, 110, 5),
          bollino(232, 301, 6),
        ),
      },
    ],
    note: ['meccanismo', 'consiglio'],
    vedi: ['barra-stato', 'ricerca', 'scorciatoie', 'proiezione', 'assistente', 'guai'],
  }, T.finestra),
  sezione({
    id: 'ricerca',
    parte: 'inizio',
    simbolo: 'lente',
    figure: [
      {
        vista: '0 0 640 200',
        disegno: disegno(
          riquadro(120, 8, 400, 186, { tono: 'neutro', raggio: 8 }),
          riquadro(132, 18, 376, 28, { tono: 'quieto' }),
          simbolo('lente', 142, 25, 14, 'quieto'),
          testo(164, 36, T.ricerca.scritte.cercato, { macchina: true }),
          titolettoPalette(62, testiPalette().comandi),
          riquadro(128, 68, 384, 38, { tono: 'accento' }),
          simbolo('piu', 138, 79, 16, 'accento'),
          testo(164, 84, T.ricerca.scritte.nuovaOra, { forte: true, tono: 'accento' }),
          testo(164, 98, T.ricerca.scritte.nuovaOraAiuto, {
            corpo: 'piccolo', tono: 'quieto',
          }),
          tasti(398, 76, 'Ctrl+Alt+N'),
          simbolo('calendario', 138, 117, 16),
          testo(164, 122, T.ricerca.scritte.nuovoAnno, { forte: true }),
          testo(164, 136, T.ricerca.scritte.nuovoAnnoAiuto, {
            corpo: 'piccolo', tono: 'quieto',
          }),
          riquadro(128, 146, 384, 38, { tono: 'quieto', tratteggio: true }),
          simbolo('piu', 138, 155, 16, 'quieto'),
          testo(164, 160, T.ricerca.scritte.nuovaConsegna, { forte: true, tono: 'quieto' }),
          testo(164, 174, T.ricerca.scritte.altrove, {
            corpo: 'piccolo', tono: 'attenzione',
          }),
          bollino(500, 32, 1),
          bollino(128, 68, 2),
          bollino(530, 87, 3),
          bollino(530, 165, 4),
        ),
      },
      {
        // Le cose dell'anno, ognuna sotto il suo titoletto; le persone, tagliate a
        // sei, dicono quante erano.
        vista: '0 0 640 262',
        disegno: disegno(
          riquadro(120, 8, 400, 248, { tono: 'neutro', raggio: 8 }),
          riquadro(132, 18, 376, 28, { tono: 'quieto' }),
          simbolo('lente', 142, 25, 14, 'quieto'),
          testo(164, 36, T.ricerca.scritte.cercatoNome, { macchina: true }),
          titolettoPalette(62, Molti(lessico().pif), testiPalette().diTanti(6, 21)),
          rigaPalette(68, 'utente', T.ricerca.scritte.persona1, T.ricerca.scritte.classe, true),
          rigaPalette(104, 'utente', T.ricerca.scritte.persona2, T.ricerca.scritte.classe),
          titolettoPalette(154, Molti(lessico().corso)),
          rigaPalette(160, 'libro', T.ricerca.scritte.corso, testiPalette().schedaDelCorso),
          titolettoPalette(210, Molti(lessico().classe)),
          rigaPalette(216, 'classi', T.ricerca.scritte.classe, quanti(21, lessico().pif)),
          bollino(508, 57, 1),
          bollino(128, 68, 2),
          bollino(530, 177, 3),
          bollino(530, 233, 4),
        ),
      },
    ],
    note: ['consiglio'],
    vedi: ['finestra', 'scorciatoie'],
  }, T.ricerca),
  sezione({
    id: 'barra-stato',
    parte: 'inizio',
    simbolo: 'informazione',
    figure: [
      {
        vista: '0 0 640 128',
        disegno: disegno(
          testo(10, 12, T.barraStato.scritte.aSinistra, { corpo: 'piccolo', tono: 'quieto' }),
          riquadro(10, 18, 620, 26, { tono: 'quieto', raggio: 4 }),
          simbolo('avviso', 18, 24, 14, 'attenzione'),
          testo(36, 35, T.barraStato.scritte.daCompilare, {
            corpo: 'piccolo', tono: 'attenzione',
          }),
          simbolo('spunta', 238, 24, 14),
          testo(256, 35, T.barraStato.scritte.pendenze, { corpo: 'piccolo' }),
          riquadro(326, 22, 1, 18, { tono: 'quieto', raggio: 0 }),
          simbolo('classi', 338, 24, 14),
          testo(356, 35, T.barraStato.scritte.tuttiICorsi, { corpo: 'piccolo' }),
          simbolo('calendario', 456, 24, 14),
          testo(474, 35, T.barraStato.scritte.semestre, { corpo: 'piccolo' }),
          testo(10, 76, T.barraStato.scritte.aDestra, { corpo: 'piccolo', tono: 'quieto' }),
          riquadro(10, 82, 620, 26, { tono: 'quieto', raggio: 4 }),
          simbolo('bot', 220, 88, 14, 'positivo'),
          testo(238, 99, T.barraStato.scritte.assistente, { corpo: 'piccolo', tono: 'positivo' }),
          simbolo('posta', 372, 88, 14, 'positivo'),
          testo(390, 99, T.barraStato.scritte.casella, { corpo: 'piccolo', tono: 'positivo' }),
          simbolo('libro', 506, 88, 14),
          testo(524, 99, '2026-2027', { corpo: 'piccolo' }),
          bollino(130, 54, 1),
          bollino(290, 54, 2),
          bollino(430, 54, 3),
          bollino(285, 118, 4),
          bollino(450, 118, 5),
          bollino(555, 118, 6),
        ),
      },
      {
        vista: '0 0 640 150',
        disegno: disegno(
          riquadro(10, 20, 150, 44, {
            tono: 'quieto', etichetta: T.barraStato.scritte.leOre,
            sotto: T.barraStato.scritte.diCorsoEPeriodo,
          }),
          freccia([[163, 42], [197, 42]]),
          riquadro(200, 20, 180, 44, {
            tono: 'attenzione', etichetta: T.barraStato.scritte.buco,
            sotto: T.barraStato.scritte.buco2,
          }),
          freccia([[383, 42], [427, 42]], { tono: 'attenzione' }),
          testo(405, 36, T.barraStato.scritte.si, {
            corpo: 'piccolo', tono: 'quieto', ancora: 'centro',
          }),
          riquadro(430, 20, 200, 44, {
            tono: 'attenzione', etichetta: T.barraStato.scritte.compilare,
            sotto: T.barraStato.scritte.piuVecchio,
          }),
          freccia([[290, 67], [290, 97]]),
          testo(298, 86, T.barraStato.scritte.no, { corpo: 'piccolo', tono: 'quieto' }),
          riquadro(200, 100, 180, 44, {
            tono: 'quieto', etichetta: T.barraStato.scritte.inArrivo,
            sotto: T.barraStato.scritte.nonAnnullata,
          }),
          freccia([[383, 122], [427, 122]]),
          testo(405, 116, T.barraStato.scritte.si, {
            corpo: 'piccolo', tono: 'quieto', ancora: 'centro',
          }),
          riquadro(430, 100, 200, 44, {
            tono: 'positivo', etichetta: T.barraStato.scritte.prossima,
            sotto: T.barraStato.scritte.classeGiornoOra,
          }),
        ),
      },
    ],
    note: ['meccanismo'],
    vedi: ['finestra', 'todo', 'lezione', 'smistare', 'promemoria', 'impostazioni'],
  }, T.barraStato),
  sezione({
    id: 'scorciatoie',
    parte: 'inizio',
    simbolo: 'stellaPiena',
    figure: [
      {
        vista: '0 0 640 210',
        disegno: disegno(
          riquadro(10, 10, 300, 190, { tono: 'quieto', raggio: 8 }),
          testo(22, 30, T.scorciatoie.scritte.dalMenu, { forte: true }),
          tasti(22, 42, 'Ctrl+O'),
          tasti(22, 70, 'Ctrl+Alt+T'),
          tasti(22, 98, 'Ctrl+Alt+N'),
          tasti(22, 126, 'Ctrl+Alt+R'),
          tasti(160, 42, 'Ctrl+,'),
          tasti(160, 70, 'Ctrl+0'),
          tasti(160, 98, 'F11'),
          riquadro(330, 10, 300, 190, { tono: 'quieto', raggio: 8 }),
          testo(342, 30, T.scorciatoie.scritte.dallaPagina, { forte: true }),
          tasti(342, 42, 'Ctrl+K'),
          tasti(342, 70, 'Ctrl+S'),
          tasti(342, 98, 'Ctrl+B'),
          tasti(342, 126, 'Ctrl+E'),
          // Anche il cammino e le pagine della barra laterale sono tasti della pagina,
          // zitti sotto un modulo.
          tasti(470, 42, 'Alt+←'),
          tasti(470, 70, 'Alt+→'),
          tasti(470, 98, 'Ctrl+1…9'),
          riquadro(342, 154, 274, 40, {
            tono: 'attenzione',
            tratteggio: true,
            etichetta: T.scorciatoie.scritte.moduloAperto,
            sotto: T.scorciatoie.scritte.tacciono,
          }),
          bollino(300, 20, 1),
          bollino(620, 20, 2),
        ),
      },
    ],
    note: ['consiglio'],
    vedi: ['finestra', 'ricerca', 'calendario', 'valutazioni', 'assistente'],
  }, T.scorciatoie),
]
