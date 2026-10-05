// La pagina Progetti (estensione di ADR-54 del 2026-10-03): la biblioteca
// dell'anno, di nessun corso. L'elenco a sinistra, il progetto aperto a
// destra: testata con obiettivi e risorse, le fasi con le attività della
// scaletta (quel che si importa nei piani lezione), criteri e livelli, e i
// corsi in cui è integrato, con il rimando alla loro pagina Integrazione
// progetti. Il lavoro con una classe (compiti, matrice, giudizi) sta lì.

import type { ReactElement, ReactNode } from 'react'

import { minutiDiAttivita } from '#core/dominio/calculations.js'
import { formattaDurata } from '#core/dominio/dates.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Corso, Progetto } from '#core/dominio/models.js'
import { nelCorso, progettiPerTitolo } from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import {
  Collegamento,
  Pastiglia,
  Pulsante,
  Quieto,
  Scheda,
  StatoVuoto,
  TestataVista,
} from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona } from '#ui/components/icons.js'
import { menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { azione } from '#ui/bridge.js'
import { nomeDelCorso } from '#ui/context.js'
import { moduloAnno } from '#ui/forms.js'
import {
  moduloCriteri,
  moduloFasi,
  moduloLivelli,
  moduloProgetto,
  periodoDetto,
} from '#ui/forms/project.js'
import { moduloScalettaProgetto } from '#ui/forms/projectPlan.js'
import { testi as testiScaletta } from '#ui/forms/projectPlan.testi.js'
import { annoCorrente, corsiDellAnnoAperto, progettoPerId, stato } from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { apriIntegrazione, apriProgetto, pastigliaStato } from './projects/links.js'
import { legendaLivelli } from './projects/matrix.js'
import { testi } from './projects.testi.js'

/**
 * Il progetto che la pagina ha davanti: quello scelto, se no il primo per
 * titolo. Esportato perché i comandi della barra agiscono su questo.
 */
export function progettoMostrato (): Progetto | null {
  return progettoPerId(stato.progettoId) ?? progettiPerTitolo(stato.registro)[0] ?? null
}

/** Quante attività ha la scaletta del progetto, in tutte le fasi. */
function attivitaDi (progetto: Progetto): number {
  return progetto.attivita?.length ?? 0
}

// ------------------------------------------------------------------ l'elenco

function elencoProgetti (progetti: Progetto[], attivo: Progetto | null): ReactElement {
  const t = testi()
  return (
    <aside
      className="elenco-laterale"
      data-telaio="progetti:elenco"
      data-scorrimento="progetti:anno" // testo-fisso: chiave di scorrimento
    >
      <header className="elenco-laterale__testata">
        <h3>{Molti(lessico().progetto)}</h3>
        <Pulsante
          simbolo="piu"
          variante="fantasma"
          titolo={t.nuovo}
          al={() => moduloProgetto({ dopo: apriProgetto })}
        />
      </header>
      {progetti.length === 0
        ? <Quieto>{t.nessunoNellAnno}</Quieto>
        : (
            <ul className="elenco-laterale__voci">
              {progetti.map((progetto) => (
                <li key={progetto.id}>
                  <button
                    className={classi('voce-laterale', progetto.id === attivo?.id && 'voce-laterale--attiva')}
                    type="button"
                    aria-current={progetto.id === attivo?.id ? 'true' : undefined}
                    // testo-fisso: chiave di fuoco
                    data-fuoco={`progetto-${progetto.id}`}
                    onClick={() => apriProgetto(progetto.id)}
                  >
                    <Icona nome="progetto" />
                    <span className="voce-laterale__testo">
                      <strong>{progetto.titolo}</strong>
                      <small>{`${t.fasiEAttivita(progetto.fasi.length, attivitaDi(progetto))} · ${t.inCorsi(progetto.integrazioni.length)}`}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
    </aside>
  )
}

// ------------------------------------------------------------------ le schede

/** Una risorsa del progetto: il collegamento si apre, il file si nomina. */
function risorsaDetta (risorsa: Progetto['risorse'][number]): ReactNode {
  const titolo = risorsa.titolo || risorsa.nome || risorsa.url || parole().senzaTitolo
  return risorsa.url
    ? <a href={risorsa.url} target="_blank" rel="noopener">{titolo}</a>
    : <span><Icona nome="documento" classe="icona--minuta" />{` ${titolo}`}</span>
}

function schedaTestata (progetto: Progetto): ReactElement {
  const t = testi()
  return (
    <Scheda
      titolo={progetto.titolo}
      sottotitolo={t.fasiEAttivita(progetto.fasi.length, attivitaDi(progetto))}
      azioni={(
        <Pulsante
          testo={parole().modifica}
          simbolo="matita"
          variante="sottile"
          al={() => moduloProgetto({ progetto })}
        />
      )}
    >
      <div className="testata-progetto">
        {progetto.descrizione ? <p>{progetto.descrizione}</p> : null}
        {progetto.obiettivi.length > 0
          ? (
              <>
                <h4>{t.obiettivi}</h4>
                {/* Un elenco scritto a mano: l'indice è la sua chiave. */}
                <ul>{progetto.obiettivi.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </>
            )
          : null}
        {progetto.risorse.length > 0
          ? (
              <>
                <h4>{t.risorse}</h4>
                <ul>{progetto.risorse.map((r, i) => <li key={i}>{risorsaDetta(r)}</li>)}</ul>
              </>
            )
          : null}
        {!progetto.descrizione && progetto.obiettivi.length === 0 && progetto.risorse.length === 0
          ? <Quieto>{t.testataVuota}</Quieto>
          : null}
      </div>
    </Scheda>
  )
}

/**
 * Le fasi con le attività della scaletta: quel che si porta nei piani
 * lezione. Si scrive qui, fase per fase; dove sta nei piani lo dice la pagina
 * Integrazione progetti di ogni corso.
 */
function schedaScaletta (progetto: Progetto): ReactElement {
  const t = testi()
  const ts = testiScaletta()
  const minuti = stato.registro.impostazioni.minutiUd
  return (
    <Scheda
      titolo={t.scaletta}
      aiuto={t.scalettaAiuto}
      azioni={(
        <Pulsante
          testo={t.fasi}
          simbolo="presa"
          variante="sottile"
          al={() => moduloFasi(progetto.id)}
        />
      )}
    >
      <div className="fasi-progetto">
        {progetto.fasi.map((fase, indice) => {
          const attivita = (progetto.attivita ?? []).filter((a) => a.faseId === fase.id)
          return (
            <section key={fase.id} className="fase-progetto fase-progetto--aperta" data-fase-id={fase.id}>
              <h4 className="fase-progetto__titolo">
                <span className="fase-progetto__nome">{`${indice + 1}. ${fase.titolo}`}</span>
                <Pulsante
                  testo={ts.modificaScaletta}
                  simbolo="matita"
                  variante="fantasma"
                  al={() => moduloScalettaProgetto(progetto.id, fase.id)}
                />
              </h4>
              <div className="fase-progetto__corpo">
                {fase.descrizione ? <p className="testo-quieto">{fase.descrizione}</p> : null}
                {attivita.length === 0
                  ? <Quieto>{t.faseSenzaAttivita}</Quieto>
                  : (
                      <ol className="lezioni-progetto">
                        {attivita.map((a) => (
                          <li key={a.id} className="lezioni-progetto__voce" data-attivita-progetto-id={a.id}>
                            <span>{a.titolo || parole().senzaTitolo}</span>
                            <Pastiglia testo={formattaDurata(minutiDiAttivita(a.durataUd, minuti))} tono="quiete" />
                          </li>
                        ))}
                      </ol>
                    )}
              </div>
            </section>
          )
        })}
      </div>
    </Scheda>
  )
}

function schedaCriteri (progetto: Progetto): ReactElement {
  const t = testi()
  return (
    <Scheda
      titolo={t.criteriELivelli}
      aiuto={t.criteriAiuto}
      azioni={(
        <>
          <Pulsante
            testo={Molti(lessico().criterioProgetto)}
            simbolo="presa"
            variante="sottile"
            al={() => moduloCriteri(progetto.id)}
          />
          <Pulsante
            testo={t.livelli}
            simbolo="presa"
            variante="sottile"
            al={() => moduloLivelli(progetto.id)}
          />
        </>
      )}
    >
      <div className="colonna">
        {progetto.criteri.length === 0
          ? <Quieto>{t.nessunCriterio}</Quieto>
          : <ol className="criteri-progetto">{progetto.criteri.map((c) => <li key={c.id}>{c.titolo}</li>)}</ol>}
        {legendaLivelli(progetto)}
      </div>
    </Scheda>
  )
}

/** Integra il progetto in un corso e porta alla sua pagina di integrazione. */
async function integraIn (progetto: Progetto, corso: Corso): Promise<void> {
  const risposta = await azione({ tipo: 'progetto.integra', progettoId: progetto.id, corsoId: corso.id })
  if (risposta.ok) apriIntegrazione(progetto.id, corso.id)
}

/**
 * I corsi dell'anno in cui il progetto è integrato, ognuno con lo stato, il
 * periodo e il rimando alla sua pagina; e il gesto per integrarlo in un altro.
 */
function schedaIntegrazioni (progetto: Progetto): ReactElement {
  const t = testi()
  const corsi = corsiDellAnnoAperto()
  const dentro = corsi.filter((c) => progetto.integrazioni.some((i) => i.corsoId === c.id))
  const voci = (): ElementoMenu[] => {
    const fuori = corsi.filter((c) => !dentro.includes(c))
    return fuori.length === 0
      ? [{ titolo: t.giaInTutti }]
      : fuori.map((corso) => ({
          testo: nomeDelCorso(corso),
          simbolo: 'libro' as const,
          al: () => { void integraIn(progetto, corso) },
        }))
  }
  return (
    <Scheda
      titolo={t.integratoIn}
      aiuto={t.integratoInAiuto}
      azioni={(
        <Pulsante
          testo={t.integraInCorso}
          simbolo="piu"
          variante="sottile"
          al={(evento) => menuSotto(evento.currentTarget, voci())}
        />
      )}
    >
      {dentro.length === 0
        ? <Quieto>{t.nessunaIntegrazione}</Quieto>
        : (
            <ul className="lezioni-progetto integrazioni-progetto">
              {dentro.map((corso) => {
                const visto = nelCorso(progetto, corso.id)
                return (
                  <li key={corso.id} className="lezioni-progetto__voce" data-corso-id={corso.id}>
                    <Icona nome="libro" classe="icona--minuta" />
                    <Collegamento
                      testo={nomeDelCorso(corso)}
                      titolo={t.apriIntegrazione(nomeDelCorso(corso))}
                      al={() => apriIntegrazione(progetto.id, corso.id)}
                    />
                    {visto ? pastigliaStato(visto) : null}
                    {visto ? <span className="testo-quieto">{periodoDetto(visto)}</span> : null}
                  </li>
                )
              })}
            </ul>
          )}
    </Scheda>
  )
}

function dettaglio (progetto: Progetto): ReactElement {
  // Un progetto nuovo è un dettaglio nuovo: le attese dei pulsanti non passano all'altro.
  return (
    <div key={progetto.id} className="colonna" data-telaio="progetti:dettaglio">
      {schedaTestata(progetto)}
      {schedaScaletta(progetto)}
      {schedaCriteri(progetto)}
      {schedaIntegrazioni(progetto)}
    </div>
  )
}

// ------------------------------------------------------------------ la pagina

function VistaProgetti (): ReactElement {
  const t = testi()
  if (!annoCorrente()) {
    return <StatoVuotoAnno telaio={telaioVista()} simbolo="progetto" crea={() => moduloAnno()} />
  }
  const progetti = progettiPerTitolo(stato.registro)
  const progetto = progettoMostrato()
  const nuovo = (): void => moduloProgetto({ dopo: apriProgetto })

  return (
    <div className="vista vista--progetti" data-telaio={telaioVista()}>
      <TestataVista
        titolo={Molti(lessico().progetto)}
        sottotitolo={t.biblioteca}
        aiuto={t.aiuto}
      />
      <div className="colonne colonne--elenco" data-telaio="progetti:colonne">
        {elencoProgetti(progetti, progetto)}
        {progetto
          ? dettaglio(progetto)
          : (
              <div className="colonna">
                <StatoVuoto
                  simbolo="progetto"
                  titolo={t.nessunProgetto}
                  testo={t.nessunProgettoTesto}
                  azione={<Pulsante testo={t.nuovo} simbolo="piu" variante="primario" al={nuovo} />}
                />
              </div>
            )}
      </div>
    </div>
  )
}

export function vistaProgetti (): ReactElement {
  return <VistaProgetti />
}
