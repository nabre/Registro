import { attivitaConPendenza, colonneCheckDi } from '#core/dominio/activities.js'
import { confrontaLezioni } from '#core/dominio/calculations.js'
import { checkDelCorso } from '#core/dominio/check.js'
import { formattaData } from '#core/dominio/dates.js'
import type {
  Attivita, Lezione, MomentoValutazione, PianoLezione, Risorsa,
} from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { azione } from '#ui/bridge.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import { collegamento, pulsante, quieto, statoVuoto, testataVista } from '#ui/components/base.js'
import { icona } from '#ui/components/icons.js'
import { corsoDelContesto, nomeDelCorso } from '#ui/context.js'
import { h, type Figlio } from '#ui/dom.js'
import { moduloConsegna } from '#ui/forms.js'
import { nomeDiPiano, stato, vai } from '#ui/state.js'
import { testi } from './overview.testi.js'
import {
  impostaScalaOverview, posaCollegamentiOverview, scordaCollegamentiOverview,
  type CollegamentoOverview,
} from './overviewLinks.js'

type TipoNodo = 'progetto' | 'file' | 'pendenza' | 'check' | 'valutazione'

/** Ogni risorsa condivisa ha un solo riquadro; le porte conservano tutti i rimandi. */
export function vistaOverview (): Figlio {
  scordaCollegamentiOverview()
  const t = testi()
  const corso = corsoDelContesto()
  if (!corso) return statoVuoto({ titolo: t.scegli })
  const r = stato.registro
  const lezioni = r.lezioni.filter((l) => l.corsoId === corso.id).sort(confrontaLezioni)
  const assegnati = new Set(lezioni.map((l) => l.pianoId))
  const piani = r.piani.filter((p) => p.corsoId === corso.id && !assegnati.has(p.id))
  const progetti = r.progetti.filter((p) => p.corsoId === corso.id)
  const check = checkDelCorso(r, corso.id)
  const nodi = new Map<string, HTMLElement>()
  const legami: CollegamentoOverview[] = []

  function apriPiano (piano: PianoLezione, lezione: Lezione | null): void {
    vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } },
      { contesto: { corsoId: corso!.id, lezioneId: lezione?.id ?? null } })
  }

  function risorsa (voce: Risorsa, piano?: PianoLezione, attivitaId: string | null = null): Figlio {
    const titolo = voce.titolo || voce.nome || parole().senzaTitolo
    if (piano) return collegamento({ testo: titolo,
      al: () => azione({ tipo: 'risorsa.apri', pianoId: piano.id, attivitaId, risorsaId: voce.id }) })
    if (voce.url) return h('a', {
      attr: { href: voce.url, target: '_blank', rel: 'noopener noreferrer' },
    }, titolo)
    return quieto(titolo)
  }

  function porta (
    da: string, id: string, tipo: TipoNodo, titolo: string, contenuto: Figlio,
  ): Figlio {
    if (!nodi.has(id)) nodi.set(id, h('article', {
      class: ['panoramica__risorsa', `panoramica__nodo--${tipo}`], dataset: { nodo: id },
    }, h('small', null, t[tipo]), contenuto))
    legami.push({ da, a: id, tipo })
    return collegamento({ testo: titolo,
      titolo,
      classe: `panoramica__porta panoramica__nodo--${tipo}`,
      al: () => {
        const destinazione = [...document.querySelectorAll<HTMLElement>('[data-nodo]')]
          .find((n) => n.dataset.nodo === id)
        destinazione?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        destinazione?.querySelector<HTMLElement>('button, a')?.focus()
      } })
  }

  function materiali (
    da: string, piano: PianoLezione, voci: Risorsa[], attivitaId: string | null,
  ): Figlio[] {
    return voci.map((voce) => porta(da,
      // Il percorso o l'URL identifica il materiale anche quando è citato in più piani.
      // testo-fisso: identificatore del nodo
      `file:${voce.file || voce.url || `${piano.id}:${attivitaId}:${voce.id}`}`,
      'file', voce.titolo || voce.nome || parole().senzaTitolo, risorsa(voce, piano, attivitaId)))
  }

  function momento (da: string, m: MomentoValutazione): Figlio {
    // testo-fisso: identificatore del nodo
    const id = `valutazione:${m.id}`
    const allegati = m.allegati.map((f) => porta(id,
      // testo-fisso: identificatore del nodo
      `file:${f.file}`, 'file', f.nome, collegamento({ testo: f.nome,
        al: () => azione({ tipo: 'allegato.apri', valutazioneId: m.id, allegatoId: f.id }) })))
    return porta(da, id, 'valutazione', m.titolo,
      h('div', null, collegamento({ testo: m.titolo, al: () => apriMomento(m) }), ...allegati))
  }

  function tappa (
    a: Attivita, piano: PianoLezione, lezione: Lezione | null, prefisso: string,
  ): Figlio {
    const id = `${prefisso}:tappa:${a.id}`
    const porte = materiali(id, piano, a.risorse, a.id)
    const progetto = progetti.find((p) => p.id === a.progettoId)
    if (progetto) {
      const fase = progetto.fasi.find((f) => f.id === a.faseProgettoId) ?? progetto.fasi[0]
      // testo-fisso: identificatore del nodo
      legami.push({ da: id, a: fase ? `fase:${progetto.id}:${fase.id}` : `progetto:${progetto.id}`,
        tipo: 'progetto' })
      porte.push(collegamento({ testo: `${progetto.titolo}${fase ? ` · ${fase.titolo}` : ''}`,
        classe: 'panoramica__porta panoramica__nodo--progetto',
        al: () => { vai({ pagina: 'pagina.corso.progetti',
          soggetto: { tipo: 'progetto', id: progetto.id } }) } }))
    }
    const consegnaId = attivitaConPendenza(a)
    const consegna = r.consegne.find((c) => c.id === consegnaId && c.corsoId === corso!.id)
    // testo-fisso: identificatore del nodo
    if (consegna) porte.push(porta(id, `pendenza:${consegna.id}`, 'pendenza', consegna.testo,
      collegamento({ testo: consegna.testo, al: () => moduloConsegna({ consegna }) })))
    for (const colonnaId of colonneCheckDi(a)) {
      const colonna = check?.colonne.find((c) => c.id === colonnaId)
      if (!check || (!colonna && colonnaId !== 'tutte')) continue
      const titolo = colonna?.titolo ?? t.check
      // testo-fisso: identificatore del nodo
      porte.push(porta(id, `check:${check.id}:${colonnaId}`, 'check', titolo,
        collegamento({ testo: titolo, al: () => { vai({ pagina: 'pagina.corso.check',
          soggetto: { tipo: 'corso', id: corso!.id } }) } })))
    }
    const momenti = r.valutazioni.filter((m) => m.corsoId === corso!.id && m.pianoId === piano.id &&
      m.attivitaId === a.id && (lezione ? m.lezioneId === lezione.id : true))
    for (const m of momenti) porte.push(momento(id, m))
    if (a.valutazione && momenti.length === 0) porte.push(porta(id,
      // testo-fisso: identificatore del nodo
      `prevista:${piano.id}:${a.id}`, 'valutazione', `${t.prevista}: ${a.valutazione.titolo}`,
      collegamento({ testo: `${t.prevista}: ${a.valutazione.titolo}`, al: () => apriPiano(piano, lezione) })))
    return h('section', { class: 'panoramica__tappa', dataset: { nodo: id } },
      h('h4', null, collegamento({ testo: a.titolo || parole().senzaTitolo,
        al: () => apriPiano(piano, lezione) })),
      h('div', { class: 'panoramica__porte' }, ...porte))
  }

  function colonna (lezione: Lezione | null, piano: PianoLezione | null): Figlio {
    // testo-fisso: identificatore del nodo
    const id = lezione ? `lezione:${lezione.id}` : `piano:${piano!.id}`
    const valutazioni = lezione ? r.valutazioni.filter((m) => m.corsoId === corso!.id &&
      m.lezioneId === lezione.id && (!piano || m.pianoId !== piano.id ||
        !piano.attivita.some((a) => a.id === m.attivitaId))) : []
    const titolo = lezione ? formattaData(lezione.data) : t.senzaOra
    return h('article', { class: 'panoramica__colonna', dataset: { nodo: id } },
      h('header', null, h('h3', null, collegamento({ testo: titolo,
        al: () => {
          if (piano) apriPiano(piano, lezione)
          else if (lezione) vai({ pagina: 'pagina.corso.registro',
            soggetto: { tipo: 'lezione', id: lezione.id } })
        } })),
      piano ? h('p', { attr: { title: nomeDiPiano(piano) } }, nomeDiPiano(piano))
        : quieto(t.senzaPiano)),
      piano ? [
        h('div', { class: 'panoramica__porte' }, ...materiali(id, piano, piano.risorse, null)),
        ...piano.attivita.map((a) => tappa(a, piano, lezione, id)),
        piano.attivita.length === 0 ? quieto(t.senzaTappe) : null,
      ] : null,
      h('div', { class: 'panoramica__porte' }, ...valutazioni.map((m) => momento(id, m))))
  }

  const colonne = [
    ...lezioni.map((l) => colonna(l, r.piani.find((p) => p.id === l.pianoId) ?? null)),
    ...piani.map((p) => colonna(null, p)),
  ]
  const schema = h('div', { class: 'panoramica__schema', dataset: { schemaProgettazione: corso.id },
    onmouseover: (e: MouseEvent) => evidenzia(e.target),
    onfocusin: (e: FocusEvent) => evidenzia(e.target),
    onmouseleave: () => evidenzia(null),
    onfocusout: (e: FocusEvent) => evidenzia(e.relatedTarget),
  },
  h('section', { class: 'panoramica__progetti' }, h('h3', null, t.progetti),
    h('div', { class: 'panoramica__griglia' }, ...progetti.map((p) => h('article', {
      class: 'panoramica__progetto panoramica__nodo--progetto',
      // testo-fisso: identificatore del nodo
      dataset: { nodo: `progetto:${p.id}` },
    }, h('h4', null, collegamento({ testo: p.titolo, al: () => { vai({ pagina: 'pagina.corso.progetti',
      soggetto: { tipo: 'progetto', id: p.id } }) } })),
    ...p.risorse.map((voce) => h('div', { class: 'panoramica__materiale' },
      icona('documento'), risorsa(voce))),
    ...p.fasi.map((fase) => h('section', {
      class: 'panoramica__fase-progetto',
      // testo-fisso: identificatore del nodo
      dataset: { nodo: `fase:${p.id}:${fase.id}` },
    }, h('strong', null, fase.titolo), fase.descrizione ? h('p', null, fase.descrizione) : null,
    h('ul', null, ...(p.attivita ?? []).filter((a) => a.faseId === fase.id)
      .map((a) => h('li', null, a.titolo)),
    ...r.piani.filter((piano) => piano.corsoId === corso.id)
      .flatMap((piano) => piano.attivita)
      .filter((a) => a.progettoId === p.id && !a.attivitaProgettoId &&
        (a.faseProgettoId === fase.id || (!a.faseProgettoId && fase.id === p.fasi[0]?.id)))
      .map((a) => h('li', null, a.titolo))))),
    ...r.valutazioni.filter((m) => m.corsoId === corso.id && m.progettoId === p.id)
      // testo-fisso: identificatore del nodo
      .map((m) => momento(`progetto:${p.id}`, m)))))),
  h('section', null, h('h3', null, t.lezioni),
    h('div', { class: 'panoramica__colonne' }, ...colonne)),
  nodi.size ? h('section', { class: 'panoramica__risorse' }, h('h3', null, t.risorse),
    h('div', { class: 'panoramica__griglia' }, ...nodi.values())) : null)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'panoramica__collegamenti')
  svg.setAttribute('aria-hidden', 'true')
  schema.prepend(svg)
  const zoom = h('input', { type: 'range', min: 15, max: 150, value: 100,
    attr: { 'aria-label': t.zoom },
    oninput: (e: Event) => impostaScalaOverview(Number((e.target as HTMLInputElement).value) / 100),
  })
  const percentuale = h('output', { class: 'panoramica__zoom-valore' }, '100%')
  posaCollegamentiOverview(legami, true)
  return h('div', { class: 'panoramica' }, testataVista({ titolo: t.titolo,
    sottotitolo: nomeDelCorso(corso), aiuto: t.aiuto,
    azioni: h('div', { class: 'panoramica__zoom' }, zoom, percentuale,
      pulsante({ testo: t.adatta, variante: 'sottile', al: () =>
        posaCollegamentiOverview(legami, true) })),
  }),
  h('p', { class: 'panoramica__legenda' },
    ...(['progetto', 'file', 'pendenza', 'check', 'valutazione'] as const).map((tipo) =>
      h('span', { class: `panoramica__nodo--${tipo}` }, t[tipo]))),
  colonne.length || progetti.length ? h('div', {
    class: 'panoramica__tavolo',
    // testo-fisso: chiave di scorrimento
    dataset: { scorrimento: `overview:${corso.id}` },
  }, schema) : statoVuoto({ titolo: t.vuoto }))
}

function evidenzia (bersaglio: EventTarget | null): void {
  const id = bersaglio instanceof Element
    ? bersaglio.closest<HTMLElement>('[data-nodo]')?.dataset.nodo : undefined
  document.querySelector('.panoramica__schema')?.classList.toggle('panoramica__schema--selezione',
    Boolean(id))
  for (const filo of document.querySelectorAll<SVGElement>('.panoramica__filo')) {
    filo.classList.toggle('panoramica__filo--acceso', Boolean(id &&
      (filo.dataset.da === id || filo.dataset.a === id)))
  }
}

