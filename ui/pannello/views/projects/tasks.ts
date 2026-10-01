// I compiti di un progetto, allievo per allievo: quando ha cominciato, fino a
// quando ha tempo (la fine comune o la sua proroga), a che punto è e la spunta
// di fatto. I compiti stanno a linguette sopra una griglia sola, quella del
// compito aperto: uno sotto l'altro allungavano la pagina di una classe intera
// per compito. La griglia è la stessa nella pagina Progetti e nella scheda
// Progetto dell'ora; dentro un'ora l'inizio si lega alla lezione.

import { nomeCompleto } from '../../../../core/dominio/calculations.js'
import { formattaData } from '../../../../core/dominio/dates.js'
import type { Allievo, CompitoProgetto, Iso, Lezione, Progetto } from '../../../../core/dominio/models.js'
import {
  fineDelCompito,
  fineEffettiva,
  giornoDellaVoce,
  statoCompitoPerAllievo,
} from '../../../../core/dominio/projects.js'
import { Molti } from '../../../../core/dominio/lexicon.js'
import { lessico } from '../../../../core/dominio/lexicon.testi.js'
import { parole } from '../../../../core/dominio/words.testi.js'
import type { Risposta } from '../../../../contract/protocol.js'
import { pastiglia, pulsante, quieto, type TonoPastiglia } from '../../components/base.js'
import { frecceNellaGriglia } from '../../components/gridArrows.js'
import { icona } from '../../components/icons.js'
import { statoInVolo } from '../../components/inFlight.js'
import { menuContestuale, menuSotto, type ElementoMenu } from '../../components/menu.js'
import { conferma } from '../../components/modal.js'
import { tabella } from '../../components/table.js'
import { azione } from '../../bridge.js'
import { gestisci, h, type Figlio } from '../../dom.js'
import {
  allieviDelProgetto,
  attiviDelProgetto,
  moduloCompito,
  moduloInizio,
  moduloProroga,
} from '../../forms/project.js'
import { aggiorna, ridisegna, stato } from '../../state.js'
import { testi } from './tasks.testi.js'

type StatoCompito = ReturnType<typeof statoCompitoPerAllievo>

const TONI: Record<StatoCompito, TonoPastiglia> = {
  'non-iniziato': 'quiete',
  'in-corso': 'informativo',
  fatto: 'positivo',
  scaduto: 'negativo',
}

/**
 * Le persone spuntate per un gesto di gruppo, per compito: fuori dal disegno,
 * perché ogni risposta dell'host ridisegna la griglia.
 */
const selezionati = new Map<string, Set<string>>()

function selezione (compitoId: string): Set<string> {
  let scelti = selezionati.get(compitoId)
  if (!scelti) {
    scelti = new Set()
    selezionati.set(compitoId, scelti)
  }
  return scelti
}

/** Le spunte di fatto partite e non ancora tornate (vedi `inFlight.ts`). */
const inVolo = statoInVolo<boolean>()

function spuntaFatto (
  progettoId: string,
  compitoId: string,
  allievoId: string,
  fatto: boolean,
): Promise<Risposta> {
  return inVolo.manda(`${progettoId}|${compitoId}|${allievoId}`, fatto, () =>
    azione({ tipo: 'progetto.compito.fatto', progettoId, compitoId, allievoId, fatto }))
}

/**
 * Comincia il compito per queste persone. Dentro un'ora si lega a lei (e
 * sposta chi aveva già cominciato); dalla pagina, senza data, vale oggi e solo
 * per chi non aveva cominciato. Con `spostaAOggi` la pagina sposta anche loro.
 */
function inizia (
  progetto: Progetto,
  compito: CompitoProgetto,
  allieviIds: string[],
  lezione: Lezione | null,
  spostaAOggi = false,
): Promise<Risposta> | null {
  if (allieviIds.length === 0) return null
  return azione({
    tipo: 'progetto.compito.inizia',
    progettoId: progetto.id,
    compitoId: compito.id,
    allieviIds,
    ...(lezione ? { lezioneId: lezione.id } : spostaAOggi ? { data: stato.adessoData } : {}),
  })
}

/** La fine di un compito detta in una riga: il giorno, e l'ora se è in un'ora. */
function fineDetta (compito: CompitoProgetto): string {
  const fine = fineDelCompito(stato.registro, compito)
  const t = testi()
  return fine ? t.finePerTutti(formattaData(fine, 'lungo')) : t.senzaFine
}

/** Il menu sulla casella dell'inizio di una persona. */
function vociInizio (
  progetto: Progetto,
  compito: CompitoProgetto,
  allievo: Allievo,
  lezione: Lezione | null,
  data: Iso | null,
): ElementoMenu[] {
  const t = testi()
  const voci: ElementoMenu[] = [{ titolo: `${nomeCompleto(allievo)} · ${compito.titolo}` }]
  const inizio = compito.inizi.find((i) => i.allievoId === allievo.id)
  if (lezione && inizio?.lezioneId !== lezione.id) {
    voci.push({
      testo: t.iniziaInLezione,
      simbolo: 'lezione',
      al: () => { void inizia(progetto, compito, [allievo.id], lezione) },
    })
  }
  if (!lezione && (!inizio || data !== stato.adessoData)) {
    voci.push({
      testo: t.iniziaOggi,
      simbolo: 'orologio',
      al: () => { void inizia(progetto, compito, [allievo.id], null, true) },
    })
  }
  voci.push({
    testo: t.scegliGiorno,
    simbolo: 'calendario',
    al: () => moduloInizio({ progettoId: progetto.id, compito, allievi: [allievo], data }),
  })
  if (inizio) {
    voci.push('separatore', {
      testo: t.togliInizio,
      simbolo: 'chiudi',
      pericolo: true,
      al: () => {
        void azione({
          tipo: 'progetto.compito.togliInizio',
          progettoId: progetto.id,
          compitoId: compito.id,
          allieviIds: [allievo.id],
        })
      },
    })
  }
  return voci
}

/** Apre un menu dove l'ha chiesto il gesto; dal tasto Menu, sotto la casella. */
function apriMenu (evento: MouseEvent, voci: ElementoMenu[]): void {
  const origine = evento.currentTarget as HTMLElement
  if (evento.clientX === 0 && evento.clientY === 0) {
    evento.preventDefault()
    menuSotto(origine, voci)
    return
  }
  menuContestuale(evento, voci, origine)
}

/** Una riga della griglia: scelta, nome, inizio, fine, stato, fatto. */
function rigaAllievo (
  progetto: Progetto,
  compito: CompitoProgetto,
  allievo: Allievo,
  lezione: Lezione | null,
): HTMLElement {
  const t = testi()
  const scelti = selezione(compito.id)
  const inizio = compito.inizi.find((i) => i.allievoId === allievo.id) ?? null
  const dataInizio = inizio ? giornoDellaVoce(stato.registro, inizio) : null
  const proroga = compito.proroghe.find((p) => p.allievoId === allievo.id) ?? null
  const fine = fineEffettiva(stato.registro, compito, allievo.id)
  const fatto = compito.fatti.find((f) => f.allievoId === allievo.id) ?? null
  const giorno = lezione?.data ?? stato.adessoData
  const situazione = statoCompitoPerAllievo(stato.registro, compito, allievo.id, giorno)
  const chi = nomeCompleto(allievo)
  const volo = `${progetto.id}|${compito.id}|${allievo.id}`

  const casellaInizio = h(
    'button',
    {
      class: ['casella-check', inizio && 'casella-check--fatta', inizio && lezione && inizio.lezioneId !== lezione.id && 'casella-check--altrove'],
      type: 'button',
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `inizio-${compito.id}-${allievo.id}` },
      attr: {
        title: dataInizio ? t.cominciatoIl(chi, formattaData(dataInizio, 'lungo')) : t.clicPerIniziare(chi, Boolean(lezione)),
        'aria-haspopup': 'menu',
      },
      onclick: (evento: MouseEvent) => {
        if (!inizio) {
          void inizia(progetto, compito, [allievo.id], lezione)
          return
        }
        apriMenu(evento, vociInizio(progetto, compito, allievo, lezione, dataInizio))
      },
      oncontextmenu: (evento: MouseEvent) =>
        apriMenu(evento, vociInizio(progetto, compito, allievo, lezione, dataInizio)),
    },
    dataInizio
      ? lezione && inizio?.lezioneId === lezione.id
        ? icona('spunta')
        : h('span', { class: 'casella-check__data' }, formattaData(dataInizio, 'corto'))
      : null,
  )

  const casellaFine = h(
    'button',
    {
      class: ['casella-check', 'compito-progetto__fine', proroga && 'compito-progetto__fine--proroga'],
      type: 'button',
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `fine-${compito.id}-${allievo.id}` },
      attr: {
        title: [
          proroga ? t.prorogaFino(formattaData(proroga.fine, 'lungo')) : t.fineComune,
          proroga?.nota,
          t.clicPerProroga,
        ].filter(Boolean).join('\n'),
      },
      onclick: () => moduloProroga({
        progettoId: progetto.id,
        compito,
        allievo,
        fineComune: fineDelCompito(stato.registro, compito),
      }),
    },
    fine ? formattaData(fine, 'corto') : '—',
  )

  const casellaFatto = h(
    'button',
    {
      class: ['casella-check', fatto && 'casella-check--fatta'],
      type: 'button',
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `fatto-${compito.id}-${allievo.id}` },
      attr: {
        title: fatto ? t.fattoIl(chi, formattaData(fatto.fattoIl.slice(0, 10), 'lungo')) : t.daFare(chi),
        'aria-pressed': String(Boolean(fatto)),
        'aria-label': t.fattoDi(chi),
      },
      onclick: () => {
        void spuntaFatto(progetto.id, compito.id, allievo.id, !inVolo.da(volo, Boolean(fatto)))
      },
    },
    fatto ? icona('spunta') : null,
  )

  return h(
    'tr',
    { class: [!allievo.attivo && 'check__riga--ritirata'], dataset: { chiave: allievo.id } },
    h(
      'td',
      null,
      h('input', {
        type: 'checkbox',
        checked: scelti.has(allievo.id),
        attr: { 'aria-label': t.scegli(chi) },
        onchange: (evento: Event) => {
          if ((evento.target as HTMLInputElement).checked) scelti.add(allievo.id)
          else scelti.delete(allievo.id)
          ridisegna()
        },
      }),
    ),
    h(
      'th',
      { class: 'check__chi', attr: { scope: 'row' } },
      chi,
      allievo.attivo ? null : h('small', { class: 'check__nota' }, t.nonFrequentaPiu),
    ),
    h('td', null, casellaInizio),
    h('td', null, casellaFine),
    h('td', null, pastiglia(t.stati[situazione], TONI[situazione])),
    h('td', null, casellaFatto),
  )
}

/** Un compito aperto: la riga dei dettagli, i gesti di gruppo e la griglia. */
function bloccoCompito (
  progetto: Progetto,
  compito: CompitoProgetto,
  lezione: Lezione | null,
): HTMLElement {
  const t = testi()
  const allievi = allieviDelProgetto(progetto)
  const attivi = attiviDelProgetto(progetto)
  const scelti = selezione(compito.id)
  // Chi non c'è più nella griglia non resta scelto.
  for (const id of [...scelti]) if (!allievi.some((a) => a.id === id)) scelti.delete(id)
  const fatti = attivi.filter((a) => compito.fatti.some((f) => f.allievoId === a.id)).length
  const senzaInizio = attivi.filter((a) => !compito.inizi.some((i) => i.allievoId === a.id))

  const tuttiScelti = allievi.length > 0 && allievi.every((a) => scelti.has(a.id))
  const griglia = tabella({
    classi: { telaio: 'check__telaio', tabella: 'check compito-progetto__griglia' },
    telaio: `compito:${compito.id}`, // testo-fisso: una chiave, non un testo
    // testo-fisso: una chiave, non un testo
    scorrimento: `compito:${compito.id}:${lezione?.id ?? ''}`,
    etichetta: compito.titolo,
    intestazione: [
      h('th', { attr: { scope: 'col' } }, h('input', {
        type: 'checkbox',
        checked: tuttiScelti,
        attr: { 'aria-label': t.scegliTutti },
        onchange: (evento: Event) => {
          scelti.clear()
          if ((evento.target as HTMLInputElement).checked) for (const a of allievi) scelti.add(a.id)
          ridisegna()
        },
      })),
      h('th', { class: 'check__angolo', attr: { scope: 'col' } }, parole().chi),
      h('th', { attr: { scope: 'col' } }, t.inizio),
      h('th', { attr: { scope: 'col' } }, t.fine),
      h('th', { attr: { scope: 'col' } }, parole().stato),
      h('th', { attr: { scope: 'col' } }, parole().fatto),
    ],
    righe: allievi.map((allievo) => rigaAllievo(progetto, compito, allievo, lezione)),
  })
  frecceNellaGriglia(griglia, '.casella-check')

  const gesti: Figlio[] = [
    pulsante({
      testo: lezione ? t.iniziaSceltiInLezione(scelti.size) : t.iniziaSceltiOggi(scelti.size),
      simbolo: 'orologio',
      variante: 'sottile',
      disabilitato: scelti.size === 0,
      al: async () => {
        const ids = [...scelti]
        if (await inizia(progetto, compito, ids, lezione, true)) scelti.clear()
      },
    }),
    pulsante({
      testo: t.iniziaATutti(senzaInizio.length),
      simbolo: 'utente',
      variante: 'sottile',
      disabilitato: senzaInizio.length === 0,
      titolo: t.iniziaATuttiAiuto,
      al: () => { void inizia(progetto, compito, senzaInizio.map((a) => a.id), lezione) },
    }),
    pulsante({
      testo: t.fattoATutti,
      simbolo: 'spunta',
      variante: 'sottile',
      disabilitato: fatti === attivi.length,
      al: () => {
        void azione({ tipo: 'progetto.compito.fattoTutti', progettoId: progetto.id, compitoId: compito.id, fatto: true })
      },
    }),
    pulsante({
      testo: t.togliSpunte,
      simbolo: 'chiudi',
      variante: 'fantasma',
      disabilitato: compito.fatti.length === 0,
      al: async () => {
        const sicuro = await conferma({
          titolo: t.togliereSpunte,
          testo: t.togliereSpunteTesto(compito.fatti.length),
          testoConferma: t.togliSpunte,
          pericolo: true,
        })
        if (!sicuro) return
        void azione({ tipo: 'progetto.compito.fattoTutti', progettoId: progetto.id, compitoId: compito.id, fatto: false })
      },
    }),
  ]

  return h(
    'section',
    {
      class: 'compito-progetto',
      id: idPannello(progetto),
      attr: { role: 'tabpanel', 'aria-labelledby': idLinguetta(compito) },
      dataset: { telaio: `compito:${compito.id}` }, // testo-fisso: una chiave, non un testo
    },
    // I dettagli in una riga: la fine comune, la descrizione accorciata, «Modifica».
    h(
      'div',
      { class: 'compito-progetto__testata' },
      h('span', { class: 'testo-quieto' }, fineDetta(compito)),
      compito.descrizione
        ? h('p', { class: 'compito-progetto__descrizione', attr: { title: compito.descrizione } }, compito.descrizione)
        : null,
      pulsante({
        testo: parole().modifica,
        simbolo: 'matita',
        variante: 'fantasma',
        al: () => moduloCompito({ progetto, compito }),
      }),
    ),
    h('div', { class: 'compito-progetto__gesti' }, ...gesti),
    allievi.length > 0 ? griglia : quieto(t.classeVuota),
  )
}

// testo-fisso: prefisso di id del DOM, non si legge
const idLinguetta = (compito: CompitoProgetto): string => `compito-linguetta-${compito.id}`
// testo-fisso: prefisso di id del DOM, non si legge
const idPannello = (progetto: Progetto): string => `compiti-pannello-${progetto.id}`

/**
 * Chi ha chiesto un compito nuovo da questo progetto, con i compiti che
 * c'erano: quando l'host lo rimanda, la linguetta si apre su di lui.
 */
const nuoviAttesi = new Map<string, Set<string>>()

/** Il compito aperto: quello scelto, se c'è ancora; altrimenti il primo. */
function compitoAperto (progetto: Progetto): CompitoProgetto | null {
  const attesi = nuoviAttesi.get(progetto.id)
  const nuovo = attesi ? progetto.compiti.find((c) => !attesi.has(c.id)) : undefined
  if (nuovo) {
    nuoviAttesi.delete(progetto.id)
    // Dentro il disegno non si ridisegna: lo stato si allinea e basta.
    stato.compitiScelti = conScelta(progetto.id, nuovo.id)
    return nuovo
  }
  const scelto = stato.compitiScelti[progetto.id]
  return progetto.compiti.find((c) => c.id === scelto) ?? progetto.compiti[0] ?? null
}

/** Le scelte con questa in fondo: la memoria tiene le ultime. */
function conScelta (progettoId: string, compitoId: string): Record<string, string> {
  const scelte = { ...stato.compitiScelti }
  delete scelte[progettoId]
  scelte[progettoId] = compitoId
  return scelte
}

/**
 * Il modulo di un compito nuovo; salvato, la sua linguetta si apre. Lo usa
 * anche il comando della barra.
 */
export function nuovoCompito (progetto: Progetto): void {
  nuoviAttesi.set(progetto.id, new Set(progetto.compiti.map((c) => c.id)))
  moduloCompito({ progetto })
}

/** Quanti hanno finito e quanti sono oltre la fine, fra chi frequenta. */
function contoDelCompito (
  progetto: Progetto,
  compito: CompitoProgetto,
  giorno: Iso,
): { fatti: number, tutti: number, scaduti: number } {
  const attivi = attiviDelProgetto(progetto)
  return {
    fatti: attivi.filter((a) => compito.fatti.some((f) => f.allievoId === a.id)).length,
    tutti: attivi.length,
    scaduti: attivi.filter((a) =>
      statoCompitoPerAllievo(stato.registro, compito, a.id, giorno) === 'scaduto').length,
  }
}

/**
 * Le linguette dei compiti, una per compito con il conto di chi ha finito e un
 * pallino se qualcuno è oltre la fine, e il «+» per uno nuovo. Si comportano
 * come il `selettore`: le frecce, Inizio e Fine scelgono e il fuoco segue.
 */
function linguette (progetto: Progetto, aperto: CompitoProgetto, giorno: Iso): HTMLElement {
  const t = testi()
  const compiti = progetto.compiti
  const scegli = (compito: CompitoProgetto): void => {
    if (compito.id !== aperto.id) aggiorna({ compitiScelti: conScelta(progetto.id, compito.id) })
  }
  const gruppo = h(
    'div',
    {
      class: ['selettore', 'compiti-progetto__linguette'],
      attr: { role: 'tablist', 'aria-label': Molti(lessico().compitoProgetto) },
    },
    ...compiti.map((compito) => {
      const acceso = compito.id === aperto.id
      const conto = contoDelCompito(progetto, compito, giorno)
      const finiti = conto.tutti > 0 && conto.fatti === conto.tutti
      return h(
        'button',
        {
          class: ['selettore__voce', 'linguetta-compito', acceso && 'selettore__voce--attiva'],
          type: 'button',
          id: idLinguetta(compito),
          attr: {
            role: 'tab',
            'aria-selected': String(acceso),
            'aria-controls': acceso ? idPannello(progetto) : undefined,
            tabindex: acceso ? 0 : -1,
            title: [
              compito.titolo,
              t.contoFatti(conto.fatti, conto.tutti),
              conto.scaduti > 0 ? t.scadutoPer(conto.scaduti) : null,
            ].filter(Boolean).join(' · '),
          },
          // Una chiave per linguetta: il fuoco la ritrova dopo il ridisegno che la accende.
          // testo-fisso: chiave di fuoco, non si legge
          dataset: { fuoco: `compito-linguetta:${compito.id}` },
          onclick: () => scegli(compito),
        },
        h('span', { class: 'linguetta-compito__titolo' }, compito.titolo),
        h(
          'span',
          { class: ['linguetta-compito__conto', finiti && 'linguetta-compito__conto--finito'] },
          `${conto.fatti}/${conto.tutti}`,
        ),
        conto.scaduti > 0
          ? h('span', { class: 'linguetta-compito__allarme', attr: { 'aria-hidden': 'true' } })
          : null,
      )
    }),
  )
  gestisci(gruppo, 'keydown', (evento) => {
    const dove = compiti.findIndex((c) => c.id === aperto.id)
    const tasto = evento.key
    const indice = tasto === 'ArrowRight' || tasto === 'ArrowDown'
      ? (dove + 1) % compiti.length
      : tasto === 'ArrowLeft' || tasto === 'ArrowUp'
        ? (dove - 1 + compiti.length) % compiti.length
        : tasto === 'Home' ? 0 : tasto === 'End' ? compiti.length - 1 : -1
    if (indice < 0) return
    evento.preventDefault()
    // Il fuoco passa prima alla linguetta nuova, così il ridisegno lo ritrova lì.
    const voci = (evento.currentTarget as HTMLElement).children
    ;(voci[indice] as HTMLElement | undefined)?.focus()
    scegli(compiti[indice])
  })
  return h(
    'div',
    { class: 'compiti-progetto__schede' },
    gruppo,
    pulsante({
      simbolo: 'piu',
      variante: 'fantasma',
      titolo: t.nuovoCompito,
      al: () => nuovoCompito(progetto),
    }),
  )
}

/**
 * I compiti del progetto a linguette, con la griglia di quello aperto. Dentro
 * un'ora l'inizio si lega all'ora e lo stato si legge nel suo giorno.
 */
export function compitiDelProgetto (progetto: Progetto, lezione: Lezione | null): HTMLElement {
  const t = testi()
  const aperto = compitoAperto(progetto)
  return h(
    'div',
    { class: 'compiti-progetto', dataset: { telaio: `compiti:${progetto.id}` } }, // testo-fisso: una chiave, non un testo
    aperto
      ? [
          linguette(progetto, aperto, lezione?.data ?? stato.adessoData),
          bloccoCompito(progetto, aperto, lezione),
        ]
      : [
          quieto(t.nessunCompito),
          h('div', null, pulsante({
            testo: t.nuovoCompito,
            simbolo: 'piu',
            variante: 'sottile',
            al: () => nuovoCompito(progetto),
          })),
        ],
  )
}
