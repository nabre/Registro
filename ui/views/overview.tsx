import { Fragment, type ReactElement, type ReactNode } from 'react'

import { attivitaConPendenza, colonneCheckDi } from '#core/dominio/activities.js'
import { confrontaLezioni } from '#core/dominio/calculations.js'
import { checkDelCorso } from '#core/dominio/check.js'
import { formattaData } from '#core/dominio/dates.js'
import { progettiDelCorso } from '#core/dominio/projects.js'
import type {
  Attivita, Lezione, MomentoValutazione, PianoLezione, Risorsa,
} from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { azione } from '#ui/bridge.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import { Collegamento, Quieto, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { corsoDelContesto, nomeDelCorso } from '#ui/context.js'
import { moduloConsegna } from '#ui/forms.js'
import { lezioneDiPiano, stato, vai } from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { apriIntegrazione, risorsaDelProgetto } from './projects/links.js'
import { testi } from './overview.testi.js'
import {
  SchemaOverview,
  type CollegamentoOverview,
  type RisorsaOverview,
} from './overviewLinks.js'

type TipoNodo = 'progetto' | 'file' | 'pendenza' | 'check' | 'valutazione'

/**
 * Le voci di un elenco con una chiave ciascuna: la stessa porta può comparire
 * due volte (lo stesso file citato due volte nella tappa).
 */
function inFila (voci: Array<[string, ReactNode]>): ReactNode[] {
  const viste = new Map<string, number>()
  return voci.map(([chiave, nodo]) => {
    const volte = viste.get(chiave) ?? 0
    viste.set(chiave, volte + 1)
    // testo-fisso: chiave di React
    return <Fragment key={volte ? `${chiave}~${volte}` : chiave}>{nodo}</Fragment>
  })
}

/** Ogni risorsa condivisa ha un solo riquadro; le porte conservano tutti i rimandi. */
export function vistaOverview (): ReactElement {
  return <VistaOverview />
}

function VistaOverview (): ReactElement {
  const t = testi()
  const corso = corsoDelContesto()
  if (!corso) {
    return <StatoVuoto telaio={telaioVista()} titolo={t.scegli} />
  }
  const corsoId = corso.id
  const r = stato.registro
  const lezioni = r.lezioni.filter((l) => l.corsoId === corsoId).sort(confrontaLezioni)
  const assegnati = new Set(lezioni.map((l) => l.pianoId))
  const piani = r.piani.filter((p) => p.corsoId === corsoId && !assegnati.has(p.id))
  const progetti = progettiDelCorso(r, corsoId)
  const check = checkDelCorso(r, corsoId)
  const nodi = new Map<string, RisorsaOverview>()
  const legami: CollegamentoOverview[] = []

  function apriPiano (piano: PianoLezione, lezione: Lezione | null): void {
    vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } },
      { contesto: { corsoId, lezioneId: lezione?.id ?? null } })
  }

  function risorsa (voce: Risorsa, piano: PianoLezione, attivitaId: string | null): ReactNode {
    return (
      <Collegamento
        testo={voce.titolo || voce.nome || parole().senzaTitolo}
        al={() => azione({ tipo: 'risorsa.apri', pianoId: piano.id, attivitaId, risorsaId: voce.id })}
      />
    )
  }

  function porta (
    da: string, id: string, tipo: TipoNodo, titolo: string, contenuto: ReactNode,
  ): [string, ReactNode] {
    if (!nodi.has(id)) nodi.set(id, { id, tipo, etichetta: t[tipo], contenuto })
    legami.push({ da, a: id, tipo })
    return [id, (
      <Collegamento
        testo={titolo}
        titolo={titolo}
        classe={`panoramica__porta panoramica__nodo--${tipo}`}
        al={() => {
          const destinazione = [...document.querySelectorAll<HTMLElement>('[data-nodo]')]
            .find((n) => n.dataset.nodo === id)
          destinazione?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
          destinazione?.querySelector<HTMLElement>('button, a')?.focus()
        }}
      />
    )]
  }

  function materiali (
    da: string, piano: PianoLezione, voci: Risorsa[], attivitaId: string | null,
  ): Array<[string, ReactNode]> {
    return voci.map((voce) => porta(da,
      // Il percorso o l'URL identifica il materiale anche quando è citato in più piani.
      // testo-fisso: identificatore del nodo
      `file:${voce.file || voce.url || `${piano.id}:${attivitaId}:${voce.id}`}`,
      'file', voce.titolo || voce.nome || parole().senzaTitolo, risorsa(voce, piano, attivitaId)))
  }

  function momento (da: string, m: MomentoValutazione): [string, ReactNode] {
    // testo-fisso: identificatore del nodo
    const id = `valutazione:${m.id}`
    const allegati = m.allegati.map((f) => porta(id,
      // testo-fisso: identificatore del nodo
      `file:${f.file}`, 'file', f.nome, (
        <Collegamento
          testo={f.nome}
          al={() => azione({ tipo: 'allegato.apri', valutazioneId: m.id, allegatoId: f.id })}
        />
      )))
    return porta(da, id, 'valutazione', m.titolo, (
      <div>
        <Collegamento testo={m.titolo} al={() => apriMomento(m)} />
        {inFila(allegati)}
      </div>
    ))
  }

  function tappa (
    a: Attivita, piano: PianoLezione, lezione: Lezione | null, prefisso: string,
  ): ReactNode {
    const id = `${prefisso}:tappa:${a.id}`
    const porte = materiali(id, piano, a.risorse, a.id)
    const progetto = progetti.find((p) => p.id === a.progettoId)
    if (progetto) {
      const fase = progetto.fasi.find((f) => f.id === a.faseProgettoId) ?? progetto.fasi[0]
      // testo-fisso: identificatore del nodo
      legami.push({ da: id, a: fase ? `fase:${progetto.id}:${fase.id}` : `progetto:${progetto.id}`,
        tipo: 'progetto' })
      // testo-fisso: chiave di React
      porte.push([`progetto:${progetto.id}`, (
        <Collegamento
          testo={`${progetto.titolo}${fase ? ` · ${fase.titolo}` : ''}`}
          classe="panoramica__porta panoramica__nodo--progetto"
          al={() => apriIntegrazione(progetto.id, corsoId)}
        />
      )])
    }
    const consegnaId = attivitaConPendenza(a)
    const consegna = r.consegne.find((c) => c.id === consegnaId && c.corsoId === corsoId)
    // testo-fisso: identificatore del nodo
    if (consegna) porte.push(porta(id, `pendenza:${consegna.id}`, 'pendenza', consegna.testo,
      <Collegamento testo={consegna.testo} al={() => moduloConsegna({ consegna })} />))
    for (const colonnaId of colonneCheckDi(a)) {
      const colonna = check?.colonne.find((c) => c.id === colonnaId)
      if (!check || (!colonna && colonnaId !== 'tutte')) continue
      const titolo = colonna?.titolo ?? t.check
      // testo-fisso: identificatore del nodo
      porte.push(porta(id, `check:${check.id}:${colonnaId}`, 'check', titolo, (
        <Collegamento
          testo={titolo}
          al={() => { vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corsoId } }) }}
        />
      )))
    }
    const momenti = r.valutazioni.filter((m) => m.corsoId === corsoId && m.pianoId === piano.id &&
      m.attivitaId === a.id && (lezione ? m.lezioneId === lezione.id : true))
    for (const m of momenti) porte.push(momento(id, m))
    if (a.valutazione && momenti.length === 0) porte.push(porta(id,
      // testo-fisso: identificatore del nodo
      `prevista:${piano.id}:${a.id}`, 'valutazione', `${t.prevista}: ${a.valutazione.titolo}`, (
        <Collegamento testo={`${t.prevista}: ${a.valutazione.titolo}`} al={() => apriPiano(piano, lezione)} />
      )))
    return (
      <section key={a.id} className="panoramica__tappa" data-nodo={id}>
        <h5>
          <Collegamento testo={a.titolo || parole().senzaTitolo} al={() => apriPiano(piano, lezione)} />
        </h5>
        <div className="panoramica__porte">{inFila(porte)}</div>
      </section>
    )
  }

  function colonna (lezione: Lezione | null, piano: PianoLezione | null): ReactNode {
    // testo-fisso: identificatore del nodo
    const id = lezione ? `lezione:${lezione.id}` : `piano:${piano!.id}`
    const valutazioni = lezione ? r.valutazioni.filter((m) => m.corsoId === corsoId &&
      m.lezioneId === lezione.id && (!piano || m.pianoId !== piano.id ||
        !piano.attivita.some((a) => a.id === m.attivitaId))) : []
    const titolo = lezione ? formattaData(lezione.data) : t.senzaOra
    return (
      <article key={id} className="panoramica__colonna" data-nodo={id}>
        {/* Sotto il titolo della sezione (h3): la colonna h4, le sue tappe h5. */}
        <header>
          <h4>
            <Collegamento
              testo={titolo}
              al={() => {
                if (piano) apriPiano(piano, lezione)
                else if (lezione) vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: lezione.id } })
              }}
            />
          </h4>
          {/* Il corso è già in testata: del piano basta dire di quale lezione è. */}
          {piano ? <p title={lezioneDiPiano(piano)}>{lezioneDiPiano(piano)}</p> : <Quieto>{t.senzaPiano}</Quieto>}
        </header>
        {piano
          ? (
              <>
                <div className="panoramica__porte">{inFila(materiali(id, piano, piano.risorse, null))}</div>
                {piano.attivita.map((a) => tappa(a, piano, lezione, id))}
                {piano.attivita.length === 0 ? <Quieto>{t.senzaTappe}</Quieto> : null}
              </>
            )
          : null}
        <div className="panoramica__porte">{inFila(valutazioni.map((m) => momento(id, m)))}</div>
      </article>
    )
  }

  const colonne = [
    ...lezioni.map((l) => colonna(l, r.piani.find((p) => p.id === l.pianoId) ?? null)),
    ...piani.map((p) => colonna(null, p)),
  ]
  const schedeProgetti = progetti.map((p) => (
    <article
      key={p.id}
      className="panoramica__progetto panoramica__nodo--progetto"
      // testo-fisso: identificatore del nodo
      data-nodo={`progetto:${p.id}`}
    >
      <h4><Collegamento testo={p.titolo} al={() => apriIntegrazione(p.id, corsoId)} /></h4>
      {p.risorse.map((voce) => <div key={voce.id}>{risorsaDelProgetto(voce, 'panoramica__materiale')}</div>)}
      {p.fasi.map((fase) => (
        <section
          key={fase.id}
          className="panoramica__fase-progetto"
          // testo-fisso: identificatore del nodo
          data-nodo={`fase:${p.id}:${fase.id}`}
        >
          <strong>{fase.titolo}</strong>
          {fase.descrizione ? <p>{fase.descrizione}</p> : null}
          <ul>
            {(p.attivita ?? []).filter((a) => a.faseId === fase.id)
              .map((a) => <li key={a.id}>{a.titolo}</li>)}
            {r.piani.filter((piano) => piano.corsoId === corsoId)
              .flatMap((piano) => piano.attivita.map((a) => ({ piano, a })))
              .filter(({ a }) => a.progettoId === p.id && !a.attivitaProgettoId &&
                (a.faseProgettoId === fase.id || (!a.faseProgettoId && fase.id === p.fasi[0]?.id)))
              // testo-fisso: chiave di React
              .map(({ piano, a }) => <li key={`${piano.id}:${a.id}`}>{a.titolo}</li>)}
          </ul>
        </section>
      ))}
      {inFila(r.valutazioni.filter((m) => m.corsoId === corsoId && m.progettoId === p.id)
        // testo-fisso: identificatore del nodo
        .map((m) => momento(`progetto:${p.id}`, m)))}
    </article>
  ))
  // Le sezioni prima delle risorse: chi le disegna riempie `nodi` e `legami`.
  const sezioni = (
    <>
      <section className="panoramica__progetti">
        <h3>{t.progetti}</h3>
        {progetti.length > 0
          ? <div className="panoramica__griglia">{schedeProgetti}</div>
          : (
              // Una colonna vuota non dice niente: si dice che manca e dove si rimedia.
              <Quieto>
                {`${t.nessunProgetto} `}
                <Collegamento
                  testo={t.vaiAllIntegrazione}
                  al={() => { vai({ pagina: 'pagina.corso.integrazione' }, { contesto: { corsoId } }) }}
                />
              </Quieto>
            )}
      </section>
      <section>
        <h3>{t.lezioni}</h3>
        <div className="panoramica__colonne">{colonne}</div>
      </section>
    </>
  )

  return (
    <div className="panoramica" data-telaio={telaioVista()}>
      <TestataVista titolo={t.titolo} sottotitolo={nomeDelCorso(corso)} aiuto={t.aiuto} />
      <p className="panoramica__legenda">
        {(['progetto', 'file', 'pendenza', 'check', 'valutazione'] as const).map((tipo) => (
          <span key={tipo} className={`panoramica__nodo--${tipo}`}>{t[tipo]}</span>
        ))}
      </p>
      {colonne.length || progetti.length
        ? (
            <div
              className="panoramica__tavolo"
              // testo-fisso: chiave di scorrimento
              data-scorrimento={`overview:${corsoId}`}
            >
              <SchemaOverview
                corsoId={corsoId}
                collegamenti={legami}
                risorse={[...nodi.values()]}
                titoloRisorse={t.risorse}
              >
                {sezioni}
              </SchemaOverview>
            </div>
          )
        : <StatoVuoto titolo={t.vuoto} />}
    </div>
  )
}
