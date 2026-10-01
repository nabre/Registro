// La matrice a livelli di un progetto: criteri in colonna, persone in riga, in
// un giorno. Un clic sale di un livello (dal vuoto al primo, dall'ultimo al
// vuoto), il tasto destro sceglie il livello o scrive una nota. Ogni giorno ha
// le sue caselle: la progressione di una persona le mette in fila.

import { nomeCompleto } from '../../../../core/dominio/calculations.js'
import { formattaData } from '../../../../core/dominio/dates.js'
import type {
  Allievo,
  CellaProgetto,
  CriterioProgetto,
  Iso,
  Lezione,
  Progetto,
} from '../../../../core/dominio/models.js'
import { celleDi, giornoDellaVoce, progressione } from '../../../../core/dominio/projects.js'
import { minuscolo } from '../../../../core/i18n/index.js'
import { quieto } from '../../components/base.js'
import { frecceNellaGriglia } from '../../components/gridArrows.js'
import { statoInVolo } from '../../components/inFlight.js'
import { menuContestuale, menuSotto, type ElementoMenu } from '../../components/menu.js'
import { tabella } from '../../components/table.js'
import { azione } from '../../bridge.js'
import { h, type Figlio } from '../../dom.js'
import { allieviDelProgetto, coloreLivello, moduloCella } from '../../forms/project.js'
import { stato } from '../../state.js'
import { testi } from './matrix.testi.js'

/** Il giorno della matrice: quello di un'ora (e le caselle si legano a lei) o una data. */
export type QuandoMatrice = { lezione: Lezione } | { data: Iso }

/** Il livello mandato e non ancora tornato, per casella (vedi `inFlight.ts`). */
const inVolo = statoInVolo<string | null>()

function giornoDi (quando: QuandoMatrice): Iso {
  return 'lezione' in quando ? quando.lezione.data : quando.data
}

/**
 * La casella di quella coppia nel giorno: dentro un'ora quella dell'ora, se
 * c'è; dalla pagina quella senza ora. Altrimenti la prima del giorno.
 */
function cellaDelGiorno (
  progetto: Progetto,
  allievoId: string,
  criterioId: string,
  quando: QuandoMatrice,
): CellaProgetto | null {
  const celle = celleDi(stato.registro, progetto, allievoId, criterioId, giornoDi(quando))
  const lezioneId = 'lezione' in quando ? quando.lezione.id : null
  return celle.find((c) => c.lezioneId === lezioneId) ?? celle[0] ?? null
}

/**
 * Dove scrivere: nell'ora della matrice; dalla pagina, nell'ora della casella
 * che c'è già (così non ne nasce una seconda nello stesso giorno), o nel giorno.
 */
function doveScrivere (
  quando: QuandoMatrice,
  cella: CellaProgetto | null,
): { lezioneId: string } | { data: Iso } {
  if ('lezione' in quando) return { lezioneId: quando.lezione.id }
  return cella?.lezioneId ? { lezioneId: cella.lezioneId } : { data: quando.data }
}

function scrivi (
  progetto: Progetto,
  allievoId: string,
  criterioId: string,
  dove: { lezioneId: string } | { data: Iso },
  livello: string | null,
  nota?: string,
) {
  return azione({
    tipo: 'progetto.cella',
    progettoId: progetto.id,
    allievoId,
    criterioId,
    ...dove,
    livello,
    ...(nota !== undefined ? { nota } : {}),
  })
}

/** Il quadretto colorato di un livello, col suo numero dal basso. */
function segnoLivello (progetto: Progetto, livello: string | null): Figlio {
  if (livello === null) return null
  const indice = progetto.livelli.findIndex((l) => l.valore === livello)
  return h(
    'span',
    {
      class: 'livello-progetto',
      style: { backgroundColor: coloreLivello(progetto, livello) },
      attr: { 'aria-hidden': 'true' },
    },
    indice < 0 ? '?' : String(indice + 1),
  )
}

/** Il testo di un livello, o la parola che dice che non ce n'è. */
function testoLivello (progetto: Progetto, livello: string | null): string {
  if (livello === null) return testi().senzaLivello
  return progetto.livelli.find((l) => l.valore === livello)?.testo ?? livello
}

/** Che cosa vuol dire un livello, se chi l'ha scritto l'ha detto. */
function descrizioneLivello (progetto: Progetto, livello: string | null): string | undefined {
  return progetto.livelli.find((l) => l.valore === livello)?.descrizione || undefined
}

function casella (
  progetto: Progetto,
  allievo: Allievo,
  criterio: CriterioProgetto,
  quando: QuandoMatrice,
): HTMLElement {
  const t = testi()
  const cella = cellaDelGiorno(progetto, allievo.id, criterio.id, quando)
  const livello = cella?.livello ?? null
  const chi = `${nomeCompleto(allievo)} · ${criterio.titolo}`
  const dove = doveScrivere(quando, cella)
  const volo = `${progetto.id}|${allievo.id}|${criterio.id}|${giornoDi(quando)}`
  const valori = progetto.livelli.map((l) => l.valore)
  const dopo = (da: string | null): string | null => {
    const i = da === null ? -1 : valori.indexOf(da)
    return i + 1 < valori.length ? valori[i + 1] : null
  }

  const voci = (): ElementoMenu[] => [
    { titolo: chi },
    ...progetto.livelli.map((l) => ({
      testo: l.testo,
      accesa: livello === l.valore,
      al: () => { void scrivi(progetto, allievo.id, criterio.id, dove, l.valore) },
    })),
    {
      testo: t.senzaLivello,
      simbolo: 'chiudi' as const,
      accesa: livello === null,
      al: () => { void scrivi(progetto, allievo.id, criterio.id, dove, null) },
    },
    'separatore',
    {
      testo: cella?.nota ? t.modificaNota : t.annota,
      simbolo: 'matita',
      al: () => moduloCella({
        progetto,
        allievo,
        criterio,
        livello,
        nota: cella?.nota ?? '',
        quando: dove,
      }),
    },
    {
      testo: t.svuota,
      simbolo: 'cestino',
      pericolo: true,
      disabilitato: !cella,
      al: () => { void scrivi(progetto, allievo.id, criterio.id, dove, null, '') },
    },
  ]

  return h(
    'button',
    {
      class: ['cella-livello', cella?.nota && 'cella-livello--annotata'],
      type: 'button',
      // testo-fisso: chiave di fuoco
      dataset: { fuoco: `livello-${allievo.id}-${criterio.id}` },
      attr: {
        title: [
          `${chi}: ${minuscolo(testoLivello(progetto, livello))}`,
          descrizioneLivello(progetto, livello),
          cella?.nota,
          t.premiPer(minuscolo(testoLivello(progetto, dopo(livello)))),
        ].filter(Boolean).join('\n'),
        'aria-label': `${chi}: ${testoLivello(progetto, livello)}`,
        'aria-haspopup': 'menu',
      },
      onclick: () => {
        const prossimo = dopo(inVolo.da(volo, livello))
        void inVolo.manda(volo, prossimo, () =>
          scrivi(progetto, allievo.id, criterio.id, dove, prossimo))
      },
      oncontextmenu: (evento: MouseEvent) => {
        if (evento.clientX === 0 && evento.clientY === 0) {
          evento.preventDefault()
          menuSotto(evento.currentTarget as HTMLElement, voci())
          return
        }
        menuContestuale(evento, voci(), evento.currentTarget as HTMLElement)
      },
    },
    segnoLivello(progetto, livello),
  )
}

/** La legenda: ogni livello col suo colore e il suo numero. */
export function legendaLivelli (progetto: Progetto): HTMLElement {
  return h(
    'ul',
    { class: 'legenda-livelli' },
    ...progetto.livelli.map((l) =>
      h(
        'li',
        { attr: { title: l.descrizione || null } },
        segnoLivello(progetto, l.valore),
        h('span', null, l.testo),
        l.descrizione ? h('small', { class: 'legenda-livelli__descrizione' }, l.descrizione) : null,
      )),
  )
}

/**
 * La matrice del giorno: le caselle di quel giorno (o di quell'ora), una per
 * persona e criterio. Le note stanno sotto, una riga per casella annotata.
 */
export function matriceProgetto (progetto: Progetto, quando: QuandoMatrice): Figlio {
  const t = testi()
  const allievi = allieviDelProgetto(progetto)
  if (progetto.criteri.length === 0) return quieto(t.nessunCriterio)
  if (allievi.length === 0) return quieto(t.classeVuota)

  const griglia = tabella({
    classi: { telaio: 'matrice__telaio', tabella: 'matrice matrice--progetto' },
    telaio: `matrice-progetto:${progetto.id}`, // testo-fisso: una chiave, non un testo
    // testo-fisso: una chiave, non un testo
    scorrimento: `matrice-progetto:${progetto.id}:${'lezione' in quando ? quando.lezione.id : quando.data}`,
    etichetta: t.matriceDel(formattaData(giornoDi(quando), 'lungo')),
    intestazione: [
      h('th', { attr: { scope: 'col' } }, ''),
      ...progetto.criteri.map((c) =>
        h('th', { class: 'matrice__aspetto', attr: { scope: 'col', title: c.descrizione ?? c.titolo } }, c.titolo)),
    ],
    righe: allievi.map((allievo) =>
      h(
        'tr',
        { dataset: { chiave: allievo.id } },
        h('th', { class: 'matrice__chi', attr: { scope: 'row' } }, nomeCompleto(allievo)),
        ...progetto.criteri.map((criterio) =>
          h('td', null, casella(progetto, allievo, criterio, quando))),
      )),
  })
  frecceNellaGriglia(griglia, '.cella-livello')

  const nomi = new Map(allievi.map((a) => [a.id, nomeCompleto(a)]))
  const annotate = progetto.matrice.filter((c) =>
    c.nota && giornoDellaVoce(stato.registro, c) === giornoDi(quando))
  return h(
    'div',
    { class: 'colonna', dataset: { telaio: `matrice-progetto:${progetto.id}:colonna` } }, // testo-fisso: una chiave, non un testo
    griglia,
    legendaLivelli(progetto),
    annotate.length === 0
      ? null
      : h(
          'ul',
          { class: 'matrice-note' },
          ...annotate.map((c) =>
            h(
              'li',
              { class: 'matrice-note__riga' },
              segnoLivello(progetto, c.livello),
              h(
                'span',
                { class: 'matrice-note__chi' },
                `${nomi.get(c.allievoId) ?? '?'} · ${progetto.criteri.find((k) => k.id === c.criterioId)?.titolo ?? '?'}`,
              ),
              h('span', null, c.nota),
            )),
        ),
  )
}

/**
 * La progressione di una persona: per ogni criterio i livelli dati, giorno
 * dopo giorno. Le colonne sono i giorni in cui c'è almeno una casella.
 */
export function progressioneAllievo (progetto: Progetto, allievo: Allievo): Figlio {
  const t = testi()
  const righe = progressione(stato.registro, progetto, allievo.id)
  const date = righe.flatMap((r) => r.celle.map((c) => giornoDellaVoce(stato.registro, c)))
  const giorni = [...new Set(date)].sort()
  if (giorni.length === 0) return quieto(t.nienteAncora(nomeCompleto(allievo)))
  return tabella({
    classi: { telaio: 'matrice__telaio', tabella: 'matrice matrice--progetto' },
    telaio: `progressione:${progetto.id}`, // testo-fisso: una chiave, non un testo
    // testo-fisso: una chiave, non un testo
    scorrimento: `progressione:${progetto.id}:${allievo.id}`,
    etichetta: t.progressioneDi(nomeCompleto(allievo)),
    intestazione: [
      h('th', { attr: { scope: 'col' } }, ''),
      ...giorni.map((g) => h('th', { attr: { scope: 'col', title: formattaData(g, 'lungo') } }, formattaData(g, 'corto'))),
    ],
    righe: righe.map(({ criterio, celle }) =>
      h(
        'tr',
        null,
        h('th', { class: 'matrice__chi', attr: { scope: 'row' } }, criterio.titolo),
        ...giorni.map((g) => {
          const cella = celle.filter((c) => giornoDellaVoce(stato.registro, c) === g).pop()
          return h(
            'td',
            {
              attr: {
                title: cella
                  ? [
                      testoLivello(progetto, cella.livello),
                      descrizioneLivello(progetto, cella.livello),
                      cella.nota,
                    ].filter(Boolean).join('\n')
                  : '',
              },
            },
            cella ? segnoLivello(progetto, cella.livello) ?? '•' : '',
          )
        }),
      )),
  })
}
