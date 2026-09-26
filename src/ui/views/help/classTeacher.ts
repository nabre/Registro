// La guida: docente, archivio, archivio-pdf, assenze, assenze-soglia,
// messaggistica.
//
// Solo struttura e schemi: le parole stanno in `classTeacher.testi.ts`, il
// disegno della pagina in `../help.ts`, il vocabolario delle figure in
// `drawing.ts`. Come si divide una pagina fra i due file sta in testa a
// `types.ts`.

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
  type Tono,
} from './drawing.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './classTeacher.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

// ---------------------------------------------------------------- gli attrezzi

/** Quanto è larga una pastiglia con quel testo: come la disegna `pastiglia`. */
function largaPastiglia (contenuto: string): number {
  return larghezzaTesto(contenuto, 'piccolo') + 14
}

/**
 * Pastiglie in fila, ognuna dove l'aveva messa l'italiano o, se quella prima
 * in un'altra lingua è più lunga, subito dopo: `stacco` è lo spazio minimo.
 * Ne dà anche dove comincia ognuna, e dove finisce l'ultima.
 */
function pastiglieInFila (
  y: number,
  voci: ReadonlyArray<readonly [number, string, Tono]>,
  stacco: number,
): { disegno: string, x: number[], fine: number } {
  let fine = -Infinity
  const x: number[] = []
  const pezzi = voci.map(([dove, contenuto, tono]) => {
    const inizio = Math.max(dove, fine + stacco)
    x.push(inizio)
    fine = inizio + largaPastiglia(contenuto)
    return pastiglia(inizio, y, contenuto, tono)
  })
  return { disegno: disegno(...pezzi), x, fine }
}

// ------------------------------------------------------------------ le figure

/** Il gruppo nella barra laterale e la pagina delle pendenze della classe. */
function figuraDocente (): string {
  const s = T.docente.scritte
  const interruttori = pastiglieInFila(72, [
    [152, s.tutteLeConsegne, 'accento'],
    [272, s.consegnePersonali, 'neutro'],
    [398, s.nuovaPendenza, 'neutro'],
  ], 6)
  return disegno(
    telaio(10, 10, 620, 232, {
      laterali: [s.pendenzeClasse, s.archivio, s.assenze, s.messaggistica],
      scelta: 0,
    }),
    riquadro(152, 42, 110, 22, { etichetta: s.classe, aSinistra: true, raggio: 4 }),
    riquadro(270, 42, 130, 22, { etichetta: s.periodo, aSinistra: true, raggio: 4 }),
    interruttori.disegno,
    ...[
      [s.daFirmare, '5'],
      [s.oltreSoglia, '1'],
      [s.momenti, '3'],
      [s.consegnaClasse, '4'],
    ].map(([nome, conto], indice) => {
      const y = 102 + indice * 26
      return disegno(
        riquadro(152, y, 450, 22, { etichetta: nome, aSinistra: true, raggio: 4 }),
        testo(592, y + 15, conto, { forte: true, ancora: 'fine' }),
      )
    }),
    pastiglia(470, 104, s.inRitardo, 'negativo'),
    testo(152, 218, s.altre, {
      corpo: 'piccolo',
      tono: 'quieto',
    }),
    bollino(140, 72, 1),
    bollino(412, 53, 2),
    bollino(Math.max(508, interruttori.fine + 13), 81, 3),
    bollino(618, 141, 4),
    bollino(459, 113, 5),
  )
}

/** Una casella della matrice dei documenti: gesto, file, cestino. */
type Gesto = 'fatto' | 'atteso' | 'tardi'

function casellaDocumento (x: number, y: number, gesto: Gesto, file: boolean) {
  const tono = gesto === 'fatto' ? 'positivo' : gesto === 'tardi' ? 'negativo' : 'quieto'
  return disegno(
    riquadro(x, y, 16, 16, { tono, raggio: 3 }),
    riquadro(x + 20, y, 16, 16, {
      tono: file ? 'informativo' : 'quieto',
      raggio: 3,
      tratteggio: !file,
    }),
    file && simbolo('cestino', x + 41, y + 2, 12, 'neutro'),
  )
}

/** La pagina dell'archivio documentale: la matrice a sinistra, il foglio a destra. */
function figuraArchivio (): string {
  const s = T.archivio.scritte
  const conti = pastiglieInFila(8, [
    [10, s.richieste, 'neutro'],
    [95, s.fogliRaccolti, 'positivo'],
    [215, s.inAttesa, 'attenzione'],
    [300, s.scadute, 'negativo'],
  ], 6)
  // Il PDF da dividere sta dove stava in italiano, o subito dopo il suo titolo.
  const xPdf = Math.max(90, 10 + larghezzaTesto(s.daDividere) + 6)
  return disegno(
    conti.disegno,
    testo(10, 48, s.daDividere, { forte: true }),
    pastiglia(xPdf, 35, s.pdf, 'attenzione'),
    // La testata: il nome, le colonne delle richieste, «Suoi».
    riquadro(10, 64, 96, 34, { etichetta: s.persona, tono: 'quieto', raggio: 4 }),
    riquadro(110, 64, 66, 34, { etichetta: s.pagella, sotto: '12/18', raggio: 4 }),
    riquadro(180, 64, 66, 34, { etichetta: s.certificato, sotto: '9/18', raggio: 4 }),
    riquadro(250, 64, 66, 34, { etichetta: s.circolare, sotto: '4/18', raggio: 4 }),
    riquadro(320, 64, 50, 34, { etichetta: s.suoi, tono: 'quieto', raggio: 4 }),
    // La riga delle firme di consegna: una casella sola, sotto la colonna che le chiede.
    testo(14, 117, s.firme, { corpo: 'piccolo', tono: 'quieto' }),
    riquadro(254, 104, 16, 16, { tono: 'quieto', raggio: 3, tratteggio: true }),
    ...[
      ['Rossi M.', 'fatto', 'fatto', 'atteso', '2/3'],
      ['Bianchi L.', 'fatto', 'tardi', 'fatto', '2/3'],
      ['Verdi A.', 'atteso', 'fatto', 'fatto', '2/3'],
      ['Neri S.', 'fatto', 'fatto', 'fatto', '3/3'],
    ].map(([nome, a, b, c, suoi], indice) => {
      const y = 128 + indice * 26
      const stato = (valore: string) => valore as Gesto
      return disegno(
        testo(14, y + 12, nome, { corpo: 'piccolo' }),
        casellaDocumento(114, y, stato(a), a === 'fatto'),
        casellaDocumento(184, y, stato(b), b === 'fatto'),
        casellaDocumento(254, y, stato(c), c === 'fatto'),
        pastiglia(326, y - 1, suoi, suoi === '3/3' ? 'positivo' : 'attenzione'),
      )
    }),
    // La cornice con il foglio aperto.
    riquadro(392, 64, 238, 178, { tono: 'quieto', raggio: 6 }),
    testo(402, 82, s.nome, { forte: true }),
    pastiglia(486, 70, s.pagella, 'neutro'),
    testo(620, 82, s.conto, { corpo: 'piccolo', tono: 'quieto', ancora: 'fine' }),
    simbolo('su', 548, 88, 14, 'quieto'),
    simbolo('giu', 566, 88, 14, 'quieto'),
    simbolo('esporta', 584, 88, 14, 'quieto'),
    simbolo('cestino', 602, 88, 14, 'quieto'),
    riquadro(422, 110, 178, 124, { raggio: 2 }),
    righe(436, 124, 150, 9, 12),
    bollino(Math.max(375, conti.fine + 8), 17, 1),
    bollino(Math.max(262, xPdf + largaPastiglia(s.pdf) + 13), 44, 2),
    bollino(108, 64, 3),
    bollino(292, 112, 4),
    bollino(100, 136, 5),
    bollino(345, 64, 6),
    bollino(392, 64, 7),
  )
}

/** Il giro di un PDF di classe, dal file alla casella. */
function figuraPdf (): string {
  const s = T.archivioPdf.scritte
  const esiti = pastiglieInFila(150, [
    [10, s.nome, 'informativo'],
    [100, s.daLeggere, 'attenzione'],
    [184, s.nessunNome, 'quieto'],
    [274, s.inCoda, 'neutro'],
    [338, s.archiviata, 'positivo'],
  ], 8)
  return disegno(
    catena(10, 16, [
      { etichetta: s.pdf, sotto: s.trascinato, simbolo: 'documento' },
      { etichetta: s.pagine, sotto: s.testoOScansione, simbolo: 'immagine' },
      { etichetta: s.proposta, sotto: s.nomeLetto, tono: 'accento', simbolo: 'lente' },
      { etichetta: s.casella, sotto: s.personaDocumento, tono: 'positivo', simbolo: 'spunta' },
    ], { largo: 130, alto: 46, stacco: 26 }),
    freccia([[231, 62], [231, 104], [553, 104], [553, 66]], {
      tono: 'accento',
      etichetta: s.aMano,
    }),
    freccia([[387, 62], [387, 82], [533, 82], [533, 66]], { tono: 'quieto' }),
    testo(460, 77, s.conferma, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    testo(10, 140, s.sottoOgni, { corpo: 'piccolo', tono: 'quieto' }),
    esiti.disegno,
    bollino(10, 16, 1),
    bollino(296, 16, 2),
    bollino(452, 16, 3),
    bollino(608, 16, 4),
    bollino(56 + esiti.x[0] - 10, 180, 5),
    bollino(140 + esiti.x[1] - 100, 180, 6),
    bollino(390 + esiti.x[4] - 338, 180, 7),
  )
}

/** Le cinque caselle di una riga e le tre fasi di una richiesta di firma. */
function figuraAssenze (): string {
  const s = T.assenze.scritte
  // «da spedire» finisce dove finiva in italiano, o prima del bordo se è più lunga.
  const xDaSpedire = Math.min(552, 630 - largaPastiglia(s.daSpedire))
  return disegno(
    testo(158, 18, s.partono, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    testo(287, 18, s.richiesta, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    testo(416, 18, s.tornano, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    riquadro(10, 26, 100, 28, { etichetta: s.persona, tono: 'quieto', raggio: 4 }),
    riquadro(116, 26, 80, 28, { etichetta: s.assenze, raggio: 4 }),
    riquadro(202, 26, 80, 28, { etichetta: s.ritardi, raggio: 4 }),
    riquadro(288, 26, 80, 28, { etichetta: s.mail, tono: 'accento', raggio: 4 }),
    riquadro(374, 26, 80, 28, { etichetta: s.assenzeFirmate, raggio: 4 }),
    riquadro(460, 26, 80, 28, { etichetta: s.ritardiFirmati, raggio: 4 }),
    riquadro(546, 26, 84, 28, { etichetta: parole().stato, tono: 'quieto', raggio: 4 }),
    // Una riga: i due fogli caricati, la mail da mandare, le firme attese.
    testo(14, 79, 'Rossi M.', { corpo: 'piccolo' }),
    riquadro(146, 64, 20, 22, { tono: 'positivo', raggio: 3 }),
    simbolo('documento', 149, 68, 14, 'positivo'),
    riquadro(232, 64, 20, 22, { tono: 'positivo', raggio: 3 }),
    simbolo('documento', 235, 68, 14, 'positivo'),
    riquadro(308, 64, 20, 22, { tono: 'attenzione', raggio: 3 }),
    simbolo('posta', 311, 68, 14, 'attenzione'),
    simbolo('spunta', 334, 68, 14, 'quieto'),
    riquadro(404, 64, 20, 22, { tono: 'quieto', raggio: 3, tratteggio: true }),
    riquadro(490, 64, 20, 22, { tono: 'quieto', raggio: 3, tratteggio: true }),
    pastiglia(xDaSpedire, 66, s.daSpedire, 'attenzione'),
    testo(14, 111, 'Bianchi L.', { corpo: 'piccolo' }),
    testo(14, 124, s.senzaDatore, { corpo: 'piccolo', tono: 'negativo' }),
    riquadro(146, 98, 20, 22, { tono: 'positivo', raggio: 3 }),
    simbolo('documento', 149, 102, 14, 'positivo'),
    riquadro(232, 98, 20, 22, { tono: 'quieto', raggio: 3 }),
    simbolo('piu', 235, 102, 14, 'quieto'),
    riquadro(404, 98, 20, 22, { tono: 'quieto', raggio: 3, tratteggio: true }),
    pastiglia(xDaSpedire, 100, s.daSpedire, 'attenzione'),
    // Le tre fasi.
    catena(116, 150, [
      { etichetta: s.faseDaSpedire, sotto: s.fogliCaricati, tono: 'attenzione' },
      { etichetta: s.faseInAttesa, sotto: s.emailPartita, tono: 'informativo' },
      { etichetta: s.faseFirmato, sotto: s.firmeTornate, tono: 'positivo' },
    ], { largo: 140, alto: 44, stacco: 30 }),
    bollino(116, 54, 1),
    bollino(288, 54, 2),
    bollino(374, 54, 3),
    bollino(546, 54, 4),
    bollino(98, 118, 5),
  )
}

/** Da dove viene una segnalazione, e dove va a finire. */
function figuraSoglia (): string {
  const s = T.assenzeSoglia.scritte
  return disegno(
    riquadro(10, 68, 180, 50, { etichetta: s.assenza, sotto: s.conto }),
    freccia([[194, 93], [226, 93]]),
    riquadro(230, 68, 150, 50, {
      etichetta: s.oltre,
      sotto: s.impostazioni,
      tono: 'accento',
    }),
    freccia([[384, 84], [410, 84], [410, 42], [426, 42]], { tono: 'negativo' }),
    freccia([[384, 102], [410, 102], [410, 144], [426, 144]], { tono: 'attenzione' }),
    riquadro(430, 20, 200, 44, {
      etichetta: s.daSegnalare,
      sotto: s.completi,
      tono: 'negativo',
    }),
    riquadro(430, 122, 200, 44, {
      etichetta: s.daGuardare,
      sotto: s.incompleti,
      tono: 'attenzione',
    }),
    testo(305, 150, s.sotto, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    testo(305, 164, s.sparisce, { corpo: 'piccolo', tono: 'quieto', ancora: 'centro' }),
    freccia([[305, 122], [305, 138]], { tono: 'quieto', tratteggio: true }),
    bollino(10, 68, 1),
    bollino(380, 68, 2),
    bollino(630, 20, 3),
  )
}

/** La strada di una comunicazione, dalla bozza alla spunta. */
function figuraPosta (): string {
  const s = T.messaggistica.scritte
  return disegno(
    riquadro(10, 84, 110, 46, { etichetta: s.bozza, sotto: s.salvaBozza, simbolo: 'matita' }),
    freccia([[124, 107], [146, 107]]),
    riquadro(150, 84, 124, 46, {
      etichetta: s.preparaInvio,
      sotto: s.salvaEApri,
      tono: 'accento',
    }),
    freccia([[278, 98], [296, 98], [296, 42], [314, 42]], { tono: 'positivo' }),
    freccia([[278, 116], [296, 116], [296, 172], [314, 172]], { tono: 'quieto' }),
    riquadro(318, 20, 166, 46, {
      etichetta: s.dalRegistro,
      sotto: s.casella,
      tono: 'positivo',
    }),
    riquadro(318, 150, 166, 46, { etichetta: s.eml, sotto: s.spedisciTu }),
    freccia([[488, 42], [556, 42], [556, 80]], { tono: 'positivo' }),
    freccia([[488, 172], [556, 172], [556, 134]], { tono: 'quieto', etichetta: s.visto }),
    riquadro(504, 84, 126, 46, {
      etichetta: s.inviata,
      sotto: s.dataDestinatari,
      tono: 'positivo',
    }),
    bollino(10, 84, 1),
    bollino(484, 20, 2),
    bollino(484, 150, 3),
    bollino(630, 84, 4),
  )
}

// ------------------------------------------------------------------ le sezioni

export const SEZIONI_DOCENTE: SezioneGuida[] = [
  sezione({
    id: 'docente',
    parte: 'docenteClasse',
    simbolo: 'posta',
    vista: 'docenteClasse',
    figure: [{ vista: '0 0 640 252', disegno: figuraDocente() }],
    note: ['meccanismo'],
    vedi: ['archivio', 'assenze', 'messaggistica', 'todo', 'classi', 'scheda'],
  }, T.docente),
  sezione({
    id: 'archivio',
    parte: 'docenteClasse',
    simbolo: 'documento',
    vista: 'docenteClasse',
    figure: [{ vista: '0 0 640 246', disegno: figuraArchivio() }],
    note: ['meccanismo', 'attenzione'],
    vedi: ['archivio-pdf', 'docente', 'messaggistica', 'smistare'],
  }, T.archivio),
  sezione({
    id: 'archivio-pdf',
    parte: 'docenteClasse',
    simbolo: 'cartella',
    vista: 'docenteClasse',
    figure: [{ vista: '0 0 640 194', disegno: figuraPdf() }],
    note: ['meccanismo', 'attenzione', 'consiglio'],
    vedi: ['archivio', 'smistare', 'modelli-linguistici', 'assenze'],
  }, T.archivioPdf),
  sezione({
    id: 'assenze',
    parte: 'docenteClasse',
    simbolo: 'firma',
    vista: 'docenteClasse',
    figure: [{ vista: '0 0 640 204', disegno: figuraAssenze() }],
    note: ['meccanismo', 'consiglio', 'attenzione'],
    vedi: ['assenze-soglia', 'archivio-pdf', 'messaggistica', 'scheda'],
  }, T.assenze),
  sezione({
    id: 'assenze-soglia',
    parte: 'docenteClasse',
    simbolo: 'avviso',
    vista: 'docenteClasse',
    figure: [{ vista: '0 0 640 180', disegno: figuraSoglia() }],
    note: ['meccanismo', 'attenzione'],
    vedi: ['assenze', 'lezione', 'scheda', 'impostazioni'],
  }, T.assenzeSoglia),
  sezione({
    id: 'messaggistica',
    parte: 'docenteClasse',
    simbolo: 'posta',
    vista: 'docenteClasse',
    figure: [{ vista: '0 0 640 206', disegno: figuraPosta() }],
    note: ['meccanismo', 'meccanismo', 'attenzione'],
    vedi: ['impostazioni', 'assenze', 'archivio', 'persone'],
  }, T.messaggistica),
]
