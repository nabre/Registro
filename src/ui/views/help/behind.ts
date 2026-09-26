// La guida: date, dati, salvataggio, aprire e chiudere, copie, guai.
//
// Solo struttura e schemi: le parole stanno in `behind.testi.ts`, il disegno
// della pagina in `../help.ts`, il vocabolario delle figure in `drawing.ts`;
// la divisione fra i due file sta in testa a `types.ts`.
// Le cifre del catalogo (tempi del salvataggio, copie tenute, recenti) vengono
// da `data/archive.ts`, `data/package.ts` ed `environment/documents.ts`: se
// cambiano là, vanno cambiate nel catalogo in ogni lingua.

import { parole } from '../../../domain/words.testi.js'
import { testi } from './behind.testi.js'
import {
  bollino,
  catena,
  disegno,
  freccia,
  larghezzaTasto,
  larghezzaTesto,
  lineaTempo,
  pastiglia,
  riquadro,
  righe,
  simbolo,
  tasti,
  tasto,
  telaio,
  testo,
  zoneTelaio,
} from './drawing.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

/** Quanto è larga una pastiglia con quel testo: come la disegna `pastiglia`. */
function largaPastiglia (contenuto: string): number {
  return larghezzaTesto(contenuto, 'piccolo') + 14
}

// ------------------------------------------------------------------ le figure

/** Quel che si batte in un campo data, e quel che il registro ne legge. */
function figuraDate (): string {
  const s = T.date.scritte
  const esempi: Array<[string, string, string, boolean]> = [
    ['7.9.26', '07.09.2026', s.dueCifre, true],
    ['7.9', '07.09.2026', s.annoDalCampo, true],
    ['12', '12.09.2026', s.meseEAnno, true],
    ['070926', '07.09.2026', s.diFila, true],
    ['31.4.26', '31.4.26', s.nonEsiste, false],
  ]
  const passoSu = 160 + larghezzaTasto(s.pagSu) + 4
  return disegno(
    testo(20, 16, s.nelCampo, { corpo: 'piccolo', tono: 'quieto' }),
    ...esempi.map(([scritto, letto, nota, buono], indice) => {
      const y = 28 + indice * 30
      const tono = buono ? 'positivo' : 'negativo'
      return disegno(
        riquadro(20, y, 110, 24),
        testo(32, y + 16, scritto, { macchina: true }),
        freccia([[136, y + 12], [194, y + 12]]),
        riquadro(200, y, 120, 24, { tono }),
        testo(260, y + 16, letto, { macchina: true, ancora: 'centro', tono }),
        testo(336, y + 16, nota, { corpo: 'piccolo', tono: 'quieto' }),
      )
    }),
    bollino(600, 70, 1),
    bollino(600, 160, 2),
    tasto(20, 184, '↑'),
    tasto(48, 184, '↓'),
    testo(80, 199, s.unGiorno, { corpo: 'piccolo' }),
    tasto(160, 184, s.pagSu),
    tasto(passoSu, 184, s.pagGiu),
    testo(passoSu + larghezzaTasto(s.pagGiu) + 8, 199, s.unMese, { corpo: 'piccolo' }),
    bollino(345, 195, 3),
  )
}

/** Dove sta che cosa: il documento dell'anno, e quel che resta sul computer. */
function figuraDati (): string {
  const s = T.dati.scritte
  // I nomi dei file sono quelli sul disco: non cambiano con la lingua.
  const dentro: Array<[string, string, number | null]> = [
    ['manifesto.json', s.manifesto, null],
    ['registro.json', s.registro, 1],
    ['classi.json  lezioni.json …', s.collezioni, null],
    ['archivio/  esportazioni/', s.archivio, 2],
    ['.storico/', s.storico, 3],
  ]
  const accanto: Array<[string, string, number]> = [
    ['.2026-2027.regi.serratura', s.serratura, 4],
    ['2026-2027/', s.cartellaAccanto, 5],
  ]
  const computer: Array<[string, string]> = [
    ['impostazioni.json', s.impostazioni],
    ['documenti.json', s.documenti],
    ['anni-nuovi/', s.anniNuovi],
    ['materializzati/', s.materializzati],
  ]
  return disegno(
    riquadro(10, 10, 400, 260, { tono: 'quieto', tratteggio: true }),
    simbolo('cartella', 22, 20, 16),
    testo(44, 33, s.cartellaTua, { forte: true }),
    riquadro(24, 46, 372, 150, { tono: 'accento' }),
    simbolo('documento', 36, 56, 16, 'accento'),
    testo(58, 69, '2026-2027.regi', { forte: true, tono: 'accento', macchina: true }),
    testo(384, 69, s.zip, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
    ...dentro.map(([nome, cosa, numero], indice) => {
      const y = 96 + indice * 23
      return disegno(
        testo(50, y, nome, { corpo: 'piccolo', macchina: true }),
        testo(230, y, cosa, { corpo: 'piccolo', tono: 'quieto' }),
        numero !== null && bollino(36, y - 4, numero),
      )
    }),
    ...accanto.map(([nome, cosa, numero], indice) => {
      const y = 228 + indice * 28
      return disegno(
        testo(50, y, nome, { corpo: 'piccolo', macchina: true }),
        testo(262, y, cosa, { corpo: 'piccolo', tono: 'quieto' }),
        bollino(36, y - 4, numero),
      )
    }),
    riquadro(420, 10, 210, 260, { tono: 'quieto' }),
    simbolo('schermo', 432, 20, 16),
    testo(454, 33, s.questoComputer, { forte: true }),
    bollino(612, 28, 6),
    ...computer.map(([nome, cosa], indice) => {
      const y = 64 + indice * 44
      return disegno(
        testo(436, y, nome, { corpo: 'piccolo', macchina: true }),
        testo(436, y + 15, cosa, { corpo: 'piccolo', tono: 'quieto' }),
      )
    }),
    testo(436, 240, s.portachiavi, { corpo: 'piccolo', forte: true }),
    testo(436, 255, s.password, { corpo: 'piccolo', tono: 'quieto' }),
  )
}

/** Da una modifica al disco, con la strada di quando il disco non risponde. */
function figuraSalvataggio (): string {
  const s = T.salvataggio.scritte
  return disegno(
    catena(22, 20, [
      { etichetta: s.modifica, sotto: s.unClic },
      { etichetta: s.attesa, sotto: s.tempi },
      { etichetta: s.copia, sotto: s.inStorico },
      { etichetta: s.scrittura, sotto: s.inCoda },
      { etichetta: s.salvato, sotto: s.sulDisco, tono: 'positivo' },
    ], { largo: 100, alto: 44, stacco: 24 }),
    bollino(246, 20, 1),
    bollino(494, 20, 2),
    freccia([[432, 68], [432, 116]], { tono: 'negativo' }),
    freccia([[456, 116], [456, 68]], { tratteggio: true }),
    testo(464, 96, s.riprova, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(374, 120, 140, 44, {
      tono: 'negativo', etichetta: s.nonRiesce, sotto: s.discoCheManca,
    }),
    bollino(514, 120, 3),
    tasti(22, 118, 'Ctrl+S'),
    testo(102, 133, s.saltaAttesa, { corpo: 'piccolo' }),
    testo(22, 190, s.uscendo, {
      corpo: 'piccolo', tono: 'quieto',
    }),
  )
}

/** Lo stesso anno visto da due computer, attraverso una cartella sincronizzata. */
function figuraDueComputer (): string {
  const s = T.aprire.scritte
  // «Annulla» sta dove l'aveva messo l'italiano, o più a destra se «Apri lo
  // stesso», in un'altra lingua, è più lungo.
  const annulla = Math.max(516, 412 + largaPastiglia(s.apriLoStesso) + 4)
  return disegno(
    riquadro(225, 20, 190, 100, { tono: 'quieto', tratteggio: true }),
    testo(320, 38, s.cartellaSincronizzata, {
      corpo: 'piccolo', tono: 'quieto', ancora: 'centro',
    }),
    riquadro(245, 48, 150, 30, { tono: 'accento', etichetta: '2026-2027.regi' }),
    testo(320, 102, s.serratura, { corpo: 'piccolo', ancora: 'centro' }),
    bollino(415, 20, 1),
    riquadro(20, 45, 150, 50, {
      tono: 'positivo', etichetta: s.pcScuola, sotto: s.annoAperto, simbolo: 'schermo',
    }),
    freccia([[174, 70], [221, 70]], { doppia: true }),
    riquadro(470, 45, 150, 50, {
      etichetta: s.pcCasa, sotto: s.loVuoleAprire, simbolo: 'casa',
    }),
    freccia([[466, 70], [419, 70]]),
    freccia([[545, 99], [545, 136]]),
    riquadro(400, 140, 230, 60, { tono: 'attenzione' }),
    testo(412, 160, s.giaAperto, { corpo: 'piccolo' }),
    pastiglia(412, 172, s.apriLoStesso, 'attenzione'),
    pastiglia(annulla, 172, parole().annulla, 'quieto'),
    bollino(630, 140, 2),
    freccia([[290, 124], [290, 165], [224, 165]]),
    riquadro(20, 140, 200, 50, {
      tono: 'quieto',
      etichetta: s.rilegge,
      sotto: s.quelCheLAltro,
      simbolo: 'ricarica',
    }),
    bollino(220, 140, 3),
  )
}

/** Quali copie di una collezione restano in `.storico/`, andando indietro nel tempo. */
function figuraCopie (): string {
  const s = T.copie.scritte
  const x = 20
  const l = 600
  const tacca = (dove: number) => ({ dove, nome: '' })
  const settimane = [0.05, 0.15, 0.25, 0.35, 0.45].map(tacca)
  const giorni = Array.from({ length: 9 }, (_, i) => tacca(0.52 + i * 0.04))
  const ultime = Array.from({ length: 10 }, (_, i) => tacca(0.885 + i * 0.012))
  return disegno(
    riquadro(20, 30, 275, 30, { tono: 'quieto', tratteggio: true, etichetta: s.unaPerSettimana }),
    riquadro(305, 30, 220, 30, {
      tono: 'quieto', tratteggio: true, etichetta: s.unaAlGiorno,
    }),
    riquadro(535, 30, 95, 30, { tono: 'accento', tratteggio: true, etichetta: s.ultime }),
    lineaTempo(x, 90, l, [
      ...settimane,
      ...giorni,
      ...ultime,
      { dove: 0.02, nome: s.settembre, tono: 'quieto' },
      { dove: 0.5, nome: s.unMeseFa, tono: 'quieto' },
      { dove: 0.99, nome: s.adesso, tono: 'accento' },
    ]),
    bollino(620, 30, 1),
    bollino(515, 30, 2),
    bollino(285, 30, 3),
    // Il nome della copia è quello sul disco: non cambia con la lingua.
    testo(20, 140, '.storico/classi.2026-09-14-07-30.json', { corpo: 'piccolo', macchina: true }),
    bollino(262, 136, 4),
  )
}

/** La barra degli avvisi, in cima alla pagina. */
function figuraAvvisi (): string {
  const s = T.guai.scritte
  const z = zoneTelaio(10, 10, 620, 190).area
  const y = z.y + 12
  // Da destra: «Dettagli» sta dove l'aveva messo l'italiano, «Ripara» gli sta
  // accanto; un nome più lungo, in un'altra lingua, li sposta a sinistra.
  const dettagli = Math.min(553, 615 - largaPastiglia(parole().dettagli))
  const ripara = Math.min(498, dettagli - 5 - largaPastiglia(s.ripara))
  return disegno(
    telaio(10, 10, 620, 190, {
      laterali: [s.lezione, s.valutazioni, s.check, s.pianiLezione, s.documenti],
      scelta: 1,
    }),
    riquadro(z.x + 10, y, z.l - 20, 30, { tono: 'attenzione' }),
    testo(z.x + 22, y + 19, s.nonTornano, { corpo: 'piccolo' }),
    pastiglia(ripara, y + 6, s.ripara, 'attenzione'),
    pastiglia(dettagli, y + 6, parole().dettagli, 'quieto'),
    righe(z.x + 14, y + 52, 300, 6, 14),
    bollino(z.x + 10, y, 1),
    bollino(522, y + 42, 2),
    bollino(583, y + 42, 3),
  )
}

// ------------------------------------------------------------------ le sezioni

export const SEZIONI_QUINTE: SezioneGuida[] = [
  sezione({
    id: 'date',
    parte: 'quinte',
    simbolo: 'orologio',
    figure: [{ vista: '0 0 640 215', disegno: figuraDate() }],
    note: ['meccanismo', 'attenzione'],
    vedi: ['assenze', 'calendario', 'scorciatoie'],
  }, T.date),
  sezione({
    id: 'dati',
    parte: 'quinte',
    simbolo: 'cartella',
    figure: [{ vista: '0 0 640 280', disegno: figuraDati() }],
    note: ['attenzione', 'consiglio'],
    vedi: ['salvataggio', 'aprire', 'copie', 'impostazioni'],
  }, T.dati),
  sezione({
    id: 'salvataggio',
    parte: 'quinte',
    simbolo: 'spunta',
    figure: [{ vista: '0 0 640 200', disegno: figuraSalvataggio() }],
    note: ['meccanismo', 'attenzione'],
    vedi: ['dati', 'copie', 'guai'],
  }, T.salvataggio),
  sezione({
    id: 'aprire',
    parte: 'quinte',
    simbolo: 'ricarica',
    figure: [{ vista: '0 0 640 210', disegno: figuraDueComputer() }],
    note: ['consiglio', 'attenzione', 'meccanismo'],
    vedi: ['dati', 'salvataggio', 'guai', 'primi-passi'],
  }, T.aprire),
  sezione({
    id: 'copie',
    parte: 'quinte',
    simbolo: 'duplica',
    figure: [{ vista: '0 0 640 150', disegno: figuraCopie() }],
    note: ['attenzione'],
    vedi: ['dati', 'salvataggio', 'guai'],
  }, T.copie),
  sezione({
    id: 'guai',
    parte: 'quinte',
    simbolo: 'avviso',
    figure: [{ vista: '0 0 640 210', disegno: figuraAvvisi() }],
    note: ['consiglio', 'attenzione'],
    vedi: ['aprire', 'salvataggio', 'valutazioni', 'smistare', 'aggiornamenti'],
  }, T.guai),
]
