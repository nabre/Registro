// L'integrazione dei progetti nel corso (estensione di ADR-54 del 2026-10-03):
// un elemento della progettazione. A sinistra i progetti della biblioteca
// integrati nel corso, a destra quello aperto visto dal corso: lo stato con la
// classe, i compiti, e a linguette le fasi nei piani (le attività della
// scaletta già programmate nei piani del corso e quelle ancora da programmare,
// con le lezioni e il loro consuntivo), la matrice a livelli e gli esiti
// (giudizi, valutazioni, presenze). Testata, scaletta, criteri e livelli si
// scrivono nella pagina Progetti, che è la biblioteca dell'anno.

import type { ReactElement } from 'react'

import { confrontaLezioni, inizioLezione, minutiDiAttivita, nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData, formattaDurata } from '#core/dominio/dates.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type {
  Corso,
  Iso,
  Lezione,
  MomentoValutazione,
  ProgettoNelCorso,
  StatoAttivita,
} from '#core/dominio/models.js'
import {
  avanzamentoDelProgetto,
  lezioniDelProgetto,
  momentiDelProgetto,
  progettiDelCorso,
  progettiPerTitolo,
  quadroDelProgetto,
  STATI_PROGETTO,
  type AttivitaNellOra,
  type Periodo,
  type QuadroDelProgetto,
  type QuadroDellaFase,
} from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import {
  Barra,
  Collegamento,
  DataInLinea,
  Pastiglia,
  Pulsante,
  Quieto,
  Scheda,
  Selettore,
  StatoVuoto,
  Tendina,
  TestataVista,
  type TonoPastiglia,
} from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona } from '#ui/components/icons.js'
import { DataDiLezione } from '#ui/components/lessonDate.js'
import { conferma } from '#ui/components/modal.js'
import { menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, nomeDelCorso } from '#ui/context.js'
import { moduloAnno } from '#ui/forms.js'
import { moduloPiano } from '#ui/forms/plan.js'
import {
  allieviDelProgetto,
  etichettaOra,
  moduloGiudizio,
  moduloProgetto,
  nomeStatoProgetto,
  periodoDetto,
} from '#ui/forms/project.js'
import { moduloScalettaProgetto } from '#ui/forms/projectPlan.js'
import { testi as testiScaletta } from '#ui/forms/projectPlan.testi.js'
import { apriLezione } from '#ui/pages.js'
import {
  aggiorna,
  annoCorrente,
  lezioniDiCorso,
  nomeDiPiano,
  progettoNelCorso,
  ridisegna,
  stato,
  vai,
  type LinguettaProgetto,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { oreDelCorso, pianiSciolti } from './plansNavigator.js'
import { giudiziDelProgetto } from './projects/judgements.js'
import { legendaLivelli, matriceProgetto, progressioneAllievo, type QuandoMatrice } from './projects/matrix.js'
import { compitiDelProgetto } from './projects/tasks.js'
import { apriIntegrazione, apriProgetto } from './projects/links.js'
import { testi as testiProgetti } from './projects.testi.js'
import { testi } from './projectIntegration.testi.js'

/**
 * Il progetto che la pagina ha davanti, visto dal corso: quello scelto se è
 * integrato nel corso, se no il primo. Esportato perché i comandi della barra
 * agiscono su questo.
 */
export function progettoIntegratoMostrato (): ProgettoNelCorso | null {
  const corso = corsoDelContesto()
  if (!corso) return null
  return progettoNelCorso(stato.progettoId, corso.id) ??
    progettiDelCorso(stato.registro, corso.id)[0] ?? null
}

/** Un periodo ricavato dalle ore, in una riga. */
function periodoScritto (periodo: Periodo): string {
  return periodo.inizio === periodo.fine
    ? formattaData(periodo.inizio)
    : `${formattaData(periodo.inizio)}–${formattaData(periodo.fine)}`
}

/**
 * L'ora come la si mostra: il giorno con lo stile delle date di lezione e
 * l'inizio, come `etichettaOra` (`forms/project`) ma da vedere.
 */
function OraMostrata ({ lezione }: { lezione: Lezione }): ReactElement {
  const inizio = inizioLezione(lezione)
  return <><DataDiLezione iso={lezione.data} />{inizio ? ` · ${inizio}` : null}</>
}

// ------------------------------------------------------------------ integrare e togliere

/** Integra un progetto della biblioteca nel corso e lo apre. */
async function integra (progettoId: string, corso: Corso): Promise<void> {
  const risposta = await azione({ tipo: 'progetto.integra', progettoId, corsoId: corso.id })
  if (risposta.ok) apriIntegrazione(progettoId, corso.id)
}

/**
 * Le voci del menu «Integra un progetto…»: i progetti dell'anno non ancora
 * nel corso, poi uno nuovo, che nasce nella biblioteca e si integra subito.
 */
function vociIntegra (corso: Corso): ElementoMenu[] {
  const t = testi()
  const fuori = progettiPerTitolo(stato.registro)
    .filter((p) => !p.integrazioni.some((i) => i.corsoId === corso.id))
  return [
    { titolo: t.daBiblioteca },
    ...(fuori.length === 0
      ? [{ titolo: t.tuttiIntegrati }]
      : fuori.map((p) => ({
          testo: p.titolo,
          descrizione: testiProgetti().inCorsi(p.integrazioni.length),
          simbolo: 'progetto' as const,
          al: () => { void integra(p.id, corso) },
        }))),
    'separatore',
    {
      testo: t.nuovoProgetto,
      simbolo: 'piu',
      al: () => moduloProgetto({ corsoId: corso.id, dopo: (id) => apriIntegrazione(id, corso.id) }),
    },
  ]
}

/** Il pulsante che apre il menu per integrare: in testa all'elenco e nello stato vuoto. */
function pulsanteIntegra (corso: Corso, variante: 'fantasma' | 'primario'): ReactElement {
  const t = testi()
  return (
    <Pulsante
      simbolo="piu"
      variante={variante}
      {...(variante === 'primario' ? { testo: t.integra } : { titolo: t.integra })}
      al={(evento) => menuSotto(evento.currentTarget, vociIntegra(corso))}
    />
  )
}

/** Le tappe dei piani del corso che lavorano per il progetto: togliendolo, restano sganciate. */
function tappeNelCorso (progetto: ProgettoNelCorso): number {
  return stato.registro.piani
    .filter((p) => p.corsoId === progetto.corsoId)
    .reduce((n, p) => n + p.attivita.filter((a) => a.progettoId === progetto.id).length, 0)
}

/** Toglie il progetto dal corso, dopo aver detto che cosa se ne va e che cosa resta. */
async function togliDalCorso (progetto: ProgettoNelCorso): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.togliereDalCorso(progetto.titolo),
    testo: t.togliTesto({
      compiti: progetto.compiti.length,
      giudizi: progetto.giudizi.length,
      caselle: progetto.matrice.length,
      tappe: tappeNelCorso(progetto),
    }),
    testoConferma: t.togliConferma,
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({
    tipo: 'progetto.integrazione.togli',
    progettoId: progetto.id,
    corsoId: progetto.corsoId,
  })
  if (risposta.ok) {
    vai({ pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'corso', id: progetto.corsoId } },
      { contesto: { progettoId: null } })
  }
}

// ------------------------------------------------------------------ l'elenco

function elencoIntegrati (
  progetti: ProgettoNelCorso[],
  attivo: ProgettoNelCorso | null,
  corso: Corso,
): ReactElement {
  const t = testi()
  return (
    <aside
      className="elenco-laterale"
      data-telaio="integrazione:elenco"
      data-scorrimento={`integrazione:${corso.id}`} // testo-fisso: chiave di scorrimento
    >
      <header className="elenco-laterale__testata">
        <h3>{Molti(lessico().progetto)}</h3>
        {pulsanteIntegra(corso, 'fantasma')}
      </header>
      {progetti.length === 0
        ? <Quieto>{t.nessunoNelCorso}</Quieto>
        : (
            <ul className="elenco-laterale__voci">
              {progetti.map((progetto) => {
                const { attivita, quota } = avanzamentoDelProgetto(stato.registro, progetto)
                return (
                  <li key={progetto.id}>
                    <button
                      className={classi('voce-laterale', progetto.id === attivo?.id && 'voce-laterale--attiva')}
                      type="button"
                      aria-current={progetto.id === attivo?.id ? 'true' : undefined}
                      // testo-fisso: chiave di fuoco
                      data-fuoco={`integrato-${progetto.id}`}
                      onClick={() => apriIntegrazione(progetto.id, corso.id)}
                    >
                      <Icona nome="progetto" />
                      <span className="voce-laterale__testo">
                        <strong>{progetto.titolo}</strong>
                        <small>{`${nomeStatoProgetto(progetto.stato)} · ${periodoDetto(progetto)}`}</small>
                        {attivita.length === 0
                          ? null
                          : (
                              <Barra
                                quota={quota}
                                tono={quota >= 1 ? 'positivo' : 'informativo'}
                                etichetta={testiProgetti().avanzamentoDi(progetto.titolo)}
                              />
                            )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
    </aside>
  )
}

// ------------------------------------------------------------------ le schede

/** Il progetto nel corso: lo stato con la classe, il periodo, e i rimandi. */
function schedaTestata (progetto: ProgettoNelCorso): ReactElement {
  const t = testi()
  const tp = testiProgetti()
  return (
    <Scheda
      titolo={progetto.titolo}
      sottotitolo={periodoDetto(progetto)}
      azioni={(
        <>
          <Pulsante
            testo={t.apriBiblioteca}
            simbolo="progetto"
            variante="sottile"
            al={() => apriProgetto(progetto.id)}
          />
          <Pulsante
            testo={t.togli}
            simbolo="cestino"
            variante="sottile"
            al={() => { void togliDalCorso(progetto) }}
          />
        </>
      )}
    >
      <div className="testata-progetto">
        <div className="filtri">
          <Selettore
            valore={progetto.stato}
            voci={STATI_PROGETTO.map((s) => ({ valore: s, testo: nomeStatoProgetto(s) }))}
            al={(scelto) => {
              if (scelto === progetto.stato) return
              void azione({
                tipo: 'progetto.integrazione.stato',
                progettoId: progetto.id,
                corsoId: progetto.corsoId,
                stato: scelto,
              })
            }}
            etichetta={t.statoNelCorso}
          />
        </div>
        {progetto.descrizione ? <p>{progetto.descrizione}</p> : null}
        {progetto.obiettivi.length > 0
          ? (
              <>
                <h4>{tp.obiettivi}</h4>
                {/* Un elenco scritto a mano: l'indice è la sua chiave. */}
                <ul>{progetto.obiettivi.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </>
            )
          : null}
        {/* I PDF del progetto stanno con gli altri fogli del corso, nella pagina Documenti. */}
        <p className="testo-quieto">
          <Collegamento
            testo={tp.documentiDelProgetto}
            al={() => { vai({ pagina: 'pagina.corso.documenti' }) }}
          />
        </p>
      </div>
    </Scheda>
  )
}

function schedaCompiti (progetto: ProgettoNelCorso): ReactElement {
  const t = testiProgetti()
  return (
    <Scheda
      telaio={`progetto-compiti:${progetto.id}`} // testo-fisso: una chiave, non un testo
      titolo={Molti(lessico().compitoProgetto)}
      aiuto={t.compitiAiuto}
    >
      {compitiDelProgetto(progetto, null)}
    </Scheda>
  )
}

/**
 * Il giorno della matrice scelto nella pagina, per progetto: un'ora o una
 * data. Di modulo, come prima: resta tornando sulla pagina.
 */
const giorniScelti = new Map<string, { data: Iso, lezioneId: string | null }>()
/** La persona di cui si guarda la progressione, per progetto; vuoto è la matrice del giorno. */
const progressioni = new Map<string, string>()

/** L'ora di oggi del corso, se c'è: la matrice parte da lì. */
function lezioneDiOggi (corsoId: string): Lezione | null {
  return lezioniDiCorso(corsoId).find((l) => l.data === stato.adessoData) ?? null
}

function quandoDellaMatrice (progetto: ProgettoNelCorso): QuandoMatrice {
  const scelto = giorniScelti.get(progetto.id)
  const lezione = scelto?.lezioneId
    ? stato.registro.lezioni.find((l) => l.id === scelto.lezioneId) ?? null
    : scelto ? null : lezioneDiOggi(progetto.corsoId)
  if (lezione && lezione.corsoId === progetto.corsoId) return { lezione }
  return { data: scelto?.data ?? stato.adessoData }
}

function schedaMatrice (progetto: ProgettoNelCorso): ReactElement {
  const t = testiProgetti()
  const quando = quandoDellaMatrice(progetto)
  const allievi = allieviDelProgetto(progetto)
  const chi = progressioni.get(progetto.id) ?? ''
  const allievo = allievi.find((a) => a.id === chi) ?? null
  // Le ore che si offrono: quelle del progetto, più quella scelta se non lo è.
  const ore = lezioniDelProgetto(stato.registro, progetto).map((x) => x.lezione)
  if ('lezione' in quando && !ore.some((l) => l.id === quando.lezione.id)) ore.push(quando.lezione)
  ore.sort(confrontaLezioni)

  const scelte = (
    <div className="filtri">
      <Selettore
        valore={allievo ? 'progressione' : 'giorno'}
        voci={[
          { valore: 'giorno', testo: t.delGiorno, simbolo: 'calendario' },
          { valore: 'progressione', testo: t.progressione, simbolo: 'utente' },
        ]}
        al={(scelta) => {
          if (scelta === 'giorno') progressioni.delete(progetto.id)
          else progressioni.set(progetto.id, allievo?.id ?? allievi[0]?.id ?? '')
          ridisegna()
        }}
        etichetta={t.comeGuardare}
      />
      {allievo
        ? (
            <Tendina
              voci={allievi.map((a) => ({ valore: a.id, testo: nomeCompleto(a) }))}
              valore={allievo.id}
              etichetta={Uno(lessico().pif)}
              al={(scelto) => {
                progressioni.set(progetto.id, scelto)
                ridisegna()
              }}
            />
          )
        : (
            <>
              <DataInLinea
                etichetta={parole().giorno}
                nome="giornoMatrice"
                valore={'lezione' in quando ? quando.lezione.data : quando.data}
                al={(valore) => {
                  if (!valore) return
                  giorniScelti.set(progetto.id, { data: valore, lezioneId: null })
                  ridisegna()
                }}
              />
              <Tendina
                voci={[
                  { valore: '', testo: t.nessunaOra },
                  ...ore.map((l) => ({ valore: l.id, testo: etichettaOra(l) })),
                ]}
                valore={'lezione' in quando ? quando.lezione.id : ''}
                etichetta={t.inUnOra}
                al={(scelto) => {
                  const lezione = ore.find((l) => l.id === scelto)
                  giorniScelti.set(progetto.id, lezione
                    ? { data: lezione.data, lezioneId: lezione.id }
                    : { data: 'lezione' in quando ? quando.lezione.data : quando.data, lezioneId: null })
                  ridisegna()
                }}
              />
            </>
          )}
    </div>
  )

  // Un'ora conclusa si guarda e non si scrive: l'host rifiuterebbe.
  const chiusa = 'lezione' in quando && quando.lezione.stato === 'svolta'
  const matrice = allievo
    ? progressioneAllievo(progetto, allievo)
    : matriceProgetto(progetto, quando)
  return (
    <Scheda
      telaio={`progetto-matrice:${progetto.id}`} // testo-fisso: una chiave, non un testo
      titolo={t.matrice}
      aiuto={t.matriceAiuto}
    >
      <div
        className="colonna"
        data-telaio={`progetto-matrice:${progetto.id}`} // testo-fisso: una chiave, non un testo
      >
        {/* Criteri e scala sono del progetto: qui si leggono, si scrivono nella biblioteca. */}
        {legendaLivelli(progetto)}
        {progetto.criteri.length === 0
          ? (
              <p className="testo-quieto">
                <Collegamento testo={testi().criteriNellaBiblioteca} al={() => apriProgetto(progetto.id)} />
              </p>
            )
          : null}
        {scelte}
        {chiusa ? <Quieto>{t.oraChiusa}</Quieto> : null}
        {chiusa
          ? <fieldset className="lezione-chiusa" disabled>{matrice}</fieldset>
          : matrice}
      </div>
    </Scheda>
  )
}

function schedaGiudizi (progetto: ProgettoNelCorso): ReactElement {
  const t = testiProgetti()
  return (
    <Scheda
      titolo={Molti(lessico().giudizioProgetto)}
      aiuto={t.giudiziAiuto}
      azioni={(
        <Pulsante
          testo={parole().aggiungi}
          simbolo="piu"
          variante="sottile"
          al={() => moduloGiudizio({ progetto })}
        />
      )}
    >
      {giudiziDelProgetto(progetto, null)}
    </Scheda>
  )
}

const TONI_AVANZAMENTO: Record<StatoAttivita, TonoPastiglia> = {
  'da-fare': 'quiete',
  svolta: 'positivo',
  parziale: 'attenzione',
  saltata: 'negativo',
}

/**
 * Le fasi aperte, per progetto: fuori dallo stato, durano quanto il pannello.
 * Un progetto mai toccato apre la fase in cui cade oggi.
 */
const fasiAperte = new Map<string, Set<string>>()

function faseAperta (progetto: ProgettoNelCorso, voce: QuadroDellaFase): boolean {
  const aperte = fasiAperte.get(`${progetto.corsoId}:${progetto.id}`)
  if (aperte) return aperte.has(voce.fase.id)
  const periodo = voce.periodo
  return periodo !== null && periodo.inizio <= stato.adessoData && stato.adessoData <= periodo.fine
}

function invertiFase (progetto: ProgettoNelCorso, quadro: QuadroDelProgetto, voce: QuadroDellaFase): void {
  const chiave = `${progetto.corsoId}:${progetto.id}`
  const aperte = fasiAperte.get(chiave) ??
    new Set(quadro.fasi.filter((v) => faseAperta(progetto, v)).map((v) => v.fase.id))
  if (aperte.has(voce.fase.id)) aperte.delete(voce.fase.id)
  else aperte.add(voce.fase.id)
  fasiAperte.set(chiave, aperte)
  ridisegna()
}

/**
 * Dove si può programmare una fase: le prossime ore del corso (col loro piano,
 * o uno nuovo che le si assegna) e i piani del corso non ancora in un'ora. Il
 * piano si apre con l'importazione dalla scaletta già sulla fase.
 */
function vociProgramma (progetto: ProgettoNelCorso, corso: Corso, faseId: string): ElementoMenu[] {
  const t = testi()
  const importa = { progettoId: progetto.id, faseId }
  // Restando qui: senza `dopo`, salvare il piano porterebbe alla pagina dei piani.
  const resta = (): void => {}
  const ore = oreDelCorso(corso)
    .filter((l) => l.data >= stato.adessoData && l.stato !== 'annullata' && l.stato !== 'svolta')
    .slice(0, 8)
  const sciolti = pianiSciolti(corso)
  if (ore.length === 0 && sciolti.length === 0) return [{ titolo: t.nienteDaProgrammare }]
  const voci: ElementoMenu[] = ore.map((lezione) => {
    const piano = stato.registro.piani.find((p) => p.id === lezione.pianoId)
    return {
      testo: etichettaOra(lezione),
      descrizione: piano ? nomeDiPiano(piano) : t.oraSenzaPiano,
      simbolo: 'lezione' as const,
      al: () => piano
        ? moduloPiano(piano, resta, corso.id, lezione, importa)
        : moduloPiano(undefined, async (pianoId) => {
            await azione({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId })
          }, corso.id, lezione, importa),
    }
  })
  if (sciolti.length > 0 && voci.length > 0) voci.push('separatore')
  for (const piano of sciolti) {
    voci.push({
      testo: nomeDiPiano(piano),
      descrizione: t.pianoSciolto,
      simbolo: 'piano',
      al: () => moduloPiano(piano, resta, corso.id, null, importa),
    })
  }
  return voci
}

/**
 * Le fasi del progetto nei piani del corso, una sotto l'altra e ripiegate:
 * chiuse dicono numero, titolo, periodo e quanto se n'è fatto; aperte le
 * attività della scaletta, con le lezioni del corso in cui sono già
 * programmate o «da programmare», e sotto le attività dei piani nelle ore
 * (col loro stato) e le prove nate lì. Tutto si ricava dal quadro del
 * progetto e dai piani: qui si scrivono solo scaletta e piani.
 */
function schedaFasi (progetto: ProgettoNelCorso, corso: Corso, quadro: QuadroDelProgetto): ReactElement {
  const t = testiProgetti()
  const ti = testi()
  const ts = testiScaletta()
  const lezioni = new Map(stato.registro.lezioni.map((l) => [l.id, l]))
  const pianiDelCorso = stato.registro.piani.filter((p) => p.corsoId === corso.id)
  /** Le ore del corso in cui un'attività della scaletta è già programmata (o il piano, se non è in un'ora). */
  const dove = (attivitaId: string): string[] => pianiDelCorso
    .filter((p) => p.attivita.some((a) => a.progettoId === progetto.id && a.attivitaProgettoId === attivitaId))
    .flatMap((p) => {
      const ore = stato.registro.lezioni.filter((l) => l.pianoId === p.id).sort(confrontaLezioni)
      return ore.length > 0 ? ore.map((l) => formattaData(l.data)) : [nomeDiPiano(p)]
    })
  const fase = (voce: QuadroDellaFase): ReactElement => {
    const canoniche = (progetto.attivita ?? []).filter((a) => a.faseId === voce.fase.id)
    const aperta = faseAperta(progetto, voce)
    // testo-fisso: id del DOM, non si legge
    const idCorpo = `fase-corpo-${progetto.id}-${voce.fase.id}`
    // Le attività di un'ora insieme: l'ora una volta, con le sue tappe accanto.
    const perOra = new Map<string, AttivitaNellOra[]>()
    for (const a of voce.attivita) perOra.set(a.lezioneId, [...(perOra.get(a.lezioneId) ?? []), a])
    const corpo = voce.attivita.length === 0
      ? <Quieto>{t.faseVuota}</Quieto>
      : (
          <ul className="lezioni-progetto">
            {[...perOra].map(([lezioneId, attivita]) => {
              const lezione = lezioni.get(lezioneId)
              return (
                <li key={lezioneId} className="lezioni-progetto__voce">
                  {lezione
                    ? (
                        <Collegamento
                          testo={<OraMostrata lezione={lezione} />}
                          al={() => apriLezione(lezione.id)}
                        />
                      )
                    : <span>{formattaData(attivita[0].data)}</span>}
                  {attivita.map((a, indice) => (
                    <Pastiglia
                      // Le tappe di un'ora restano nell'ordine del piano: il posto basta.
                      key={indice}
                      testo={`${a.titolo || parole().senzaTitolo} · ${t.statiAttivita[a.stato]}`}
                      tono={TONI_AVANZAMENTO[a.stato]}
                      simbolo="piano"
                    />
                  ))}
                </li>
              )
            })}
          </ul>
        )
    return (
      <section key={voce.fase.id} className={classi('fase-progetto', aperta && 'fase-progetto--aperta')}>
        <h4 className="fase-progetto__titolo">
          <button
            className="fase-progetto__interruttore"
            type="button"
            aria-expanded={aperta}
            aria-controls={aperta ? idCorpo : undefined}
            // testo-fisso: chiave di fuoco, non si legge
            data-fuoco={`fase:${progetto.id}:${voce.fase.id}`}
            onClick={() => invertiFase(progetto, quadro, voce)}
          >
            <Icona nome={aperta ? 'giu' : 'destra'} classe="fase-progetto__freccia" />
            <span className="fase-progetto__nome">{`${voce.numero}. ${voce.fase.titolo}`}</span>
            <span className="testo-quieto">{voce.periodo ? periodoScritto(voce.periodo) : t.faseSenzaOre}</span>
          </button>
        </h4>
        {voce.attivita.length > 0
          ? (
              <Barra
                quota={voce.quota}
                tono={voce.quota >= 1 ? 'positivo' : 'informativo'}
                etichetta={t.avanzamentoDi(voce.fase.titolo)}
              />
            )
          : null}
        {aperta
          ? (
              <div className="fase-progetto__corpo" id={idCorpo}>
                {voce.fase.descrizione ? <p className="testo-quieto">{voce.fase.descrizione}</p> : null}
                <div className="fase-progetto__azioni">
                  <Pulsante
                    testo={ti.programma}
                    simbolo="piano"
                    variante="sottile"
                    al={(evento) => menuSotto(
                      evento.currentTarget,
                      vociProgramma(progetto, corso, voce.fase.id),
                    )}
                  />
                  <Pulsante
                    testo={ts.modificaScaletta}
                    simbolo="matita"
                    variante="sottile"
                    al={() => moduloScalettaProgetto(progetto.id, voce.fase.id)}
                  />
                </div>
                {canoniche.length > 0
                  ? (
                      <ol className="lezioni-progetto">
                        {canoniche.map((a) => {
                          const quando = dove(a.id)
                          return (
                            <li key={a.id} className="lezioni-progetto__voce" data-attivita-progetto-id={a.id}>
                              <span>{a.titolo || parole().senzaTitolo}</span>
                              <Pastiglia
                                testo={formattaDurata(minutiDiAttivita(a.durataUd, stato.registro.impostazioni.minutiUd))}
                                tono="quiete"
                              />
                              <Pastiglia
                                testo={quando.length > 0 ? [ts.pianificata, ...quando].join(' · ') : ts.daPianificare}
                                tono={quando.length > 0 ? 'informativo' : 'quiete'}
                              />
                            </li>
                          )
                        })}
                      </ol>
                    )
                  : null}
                {corpo}
                {voce.momenti.length > 0
                  ? (
                      <p className="testo-quieto">
                        <Icona nome="valutazioni" classe="icona--minuta" />
                        {` ${voce.momenti.map((m) => m.titolo).join(', ')}`}
                      </p>
                    )
                  : null}
              </div>
            )
          : null}
      </section>
    )
  }
  return (
    <Scheda
      titolo={ti.neiPiani}
      sottotitolo={quadro.periodo
        ? `${periodoScritto(quadro.periodo)} · ${t.svolto(Math.round(quadro.quota * 100))}`
        : t.nessunaLezione}
      aiuto={ti.neiPianiAiuto}
    >
      <div className="fasi-progetto">{quadro.fasi.map(fase)}</div>
    </Scheda>
  )
}

/** Le presenze di chi frequenta nelle ore del progetto: UD perse e ritardi. */
function schedaPresenze (progetto: ProgettoNelCorso, quadro: QuadroDelProgetto): ReactElement | null {
  const t = testiProgetti()
  if (quadro.presenze.every((r) => r.ore.length === 0)) return null
  const nomi = new Map(allieviDelProgetto(progetto).map((a) => [a.id, nomeCompleto(a)]))
  return (
    <Scheda titolo={t.presenze} aiuto={t.presenzeAiuto}>
      <table className="tabella tabella--compatta">
        <thead>
          <tr>
            <th scope="col">{Uno(lessico().pif)}</th>
            <th scope="col">{t.udPerse}</th>
            <th scope="col">{t.ritardi}</th>
          </tr>
        </thead>
        <tbody>
          {quadro.presenze.map((r) => (
            <tr key={r.allievoId}>
              <th scope="row">{nomi.get(r.allievoId) ?? '?'}</th>
              <td>{`${r.udAssenza}/${r.udTotali}`}</td>
              <td>{String(r.ritardi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scheda>
  )
}

/** Lega un momento del corso al progetto, o lo stacca (`null`). */
function legaMomento (momento: MomentoValutazione, progettoId: string | null): void {
  void azione({ tipo: 'valutazione.salva', valutazione: { ...momento, progettoId } })
}

function schedaValutazioni (progetto: ProgettoNelCorso): ReactElement {
  const t = testiProgetti()
  const momenti = momentiDelProgetto(stato.registro, progetto)
  const liberi = stato.registro.valutazioni
    .filter((v) => v.corsoId === progetto.corsoId && !v.progettoId)
    .sort((a, b) => b.data.localeCompare(a.data))
  const voci = (): ElementoMenu[] => liberi.length === 0
    ? [{ titolo: t.nessunMomentoLibero }]
    : liberi.map((m) => ({
        testo: m.titolo,
        descrizione: formattaData(m.data),
        simbolo: 'valutazioni' as const,
        al: () => legaMomento(m, progetto.id),
      }))
  return (
    <Scheda
      titolo={t.valutazioniDelProgetto}
      aiuto={t.valutazioniAiuto}
      azioni={(
        <Pulsante
          testo={t.collegaValutazione}
          simbolo="collegamento"
          variante="sottile"
          al={(evento) => menuSotto(evento.currentTarget, voci())}
        />
      )}
    >
      {momenti.length === 0
        ? <Quieto>{t.nessunaValutazione}</Quieto>
        : (
            <ul className="lezioni-progetto">
              {momenti.map((m) => (
                <li key={m.id} className="lezioni-progetto__voce">
                  <Icona nome="valutazioni" classe="icona--minuta" />
                  <Collegamento
                    testo={m.titolo}
                    al={() => { vai({ pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'valutazione', id: m.id } }) }}
                  />
                  <span className="testo-quieto">{formattaData(m.data)}</span>
                  <Pulsante
                    simbolo="chiudi"
                    variante="fantasma"
                    titolo={t.staccaValutazione(m.titolo)}
                    al={() => legaMomento(m, null)}
                  />
                </li>
              ))}
            </ul>
          )}
    </Scheda>
  )
}

// testo-fisso: prefisso di id del DOM, non si legge
const idLinguettaProgetto = (linguetta: LinguettaProgetto): string => `progetto-linguetta-${linguetta}`
// testo-fisso: id del DOM, non si legge
const ID_PANNELLO_PROGETTO = 'progetto-pannello'

/** La linguetta ricordata del progetto; mai scelta, le fasi nei piani. */
function linguettaAperta (progetto: ProgettoNelCorso): LinguettaProgetto {
  return stato.linguetteProgetti[progetto.id] ?? 'fasi'
}

/** Le scelte con questa in fondo: la memoria tiene le ultime. */
function conLinguetta (
  progettoId: string,
  linguetta: LinguettaProgetto,
): Record<string, LinguettaProgetto> {
  const scelte = { ...stato.linguetteProgetti }
  delete scelte[progettoId]
  scelte[progettoId] = linguetta
  return scelte
}

/**
 * Sotto testata e compiti, sempre in vista, il resto a linguette: fasi nei
 * piani, matrice ed esiti (giudizi, valutazioni, presenze). Come quelle dei
 * compiti: le frecce, Inizio e Fine scelgono e il fuoco segue.
 */
function linguetteDelProgetto (progetto: ProgettoNelCorso, corso: Corso, quadro: QuadroDelProgetto): ReactElement {
  const t = testiProgetti()
  const aperta = linguettaAperta(progetto)
  const voci: Array<{ valore: LinguettaProgetto, testo: string, titolo?: string }> = [
    { valore: 'fasi', testo: testi().neiPiani },
    { valore: 'matrice', testo: t.matrice },
    { valore: 'esiti', testo: t.esiti, titolo: t.esitiAiuto },
  ]
  const scegli = (linguetta: LinguettaProgetto): void => {
    if (linguetta !== aperta) aggiorna({ linguetteProgetti: conLinguetta(progetto.id, linguetta) })
  }
  return (
    <div className="progetto-linguette">
      <div
        className="selettore progetto-linguette__gruppo"
        role="tablist"
        aria-label={t.parti}
        onKeyDown={(evento) => {
          const linguette = Array.from(evento.currentTarget.children)
          // Da dove sta il fuoco e non dal disegno: due tasti nello stesso giro
          // partono uno dopo l'altro.
          const qui = linguette.indexOf(document.activeElement as Element)
          const dove = qui >= 0 ? qui : voci.findIndex((v) => v.valore === aperta)
          const tasto = evento.key
          const indice = tasto === 'ArrowRight' || tasto === 'ArrowDown'
            ? (dove + 1) % voci.length
            : tasto === 'ArrowLeft' || tasto === 'ArrowUp'
              ? (dove - 1 + voci.length) % voci.length
              : tasto === 'Home' ? 0 : tasto === 'End' ? voci.length - 1 : -1
          if (indice < 0) return
          evento.preventDefault()
          // Il fuoco passa prima alla linguetta nuova, così il ridisegno lo ritrova lì.
          ;(linguette[indice] as HTMLElement | undefined)?.focus()
          scegli(voci[indice].valore)
        }}
      >
        {voci.map((voce) => {
          const accesa = voce.valore === aperta
          return (
            <button
              key={voce.valore}
              className={classi('selettore__voce', accesa && 'selettore__voce--attiva')}
              type="button"
              id={idLinguettaProgetto(voce.valore)}
              role="tab"
              aria-selected={accesa}
              aria-controls={accesa ? ID_PANNELLO_PROGETTO : undefined}
              tabIndex={accesa ? 0 : -1}
              title={voce.titolo}
              // testo-fisso: chiave di fuoco, non si legge
              data-fuoco={`progetto-linguetta:${voce.valore}`}
              onClick={() => scegli(voce.valore)}
            >
              {voce.testo}
            </button>
          )
        })}
      </div>
      <div
        // Una linguetta nuova è un pannello nuovo: le schede di un'altra non si riusano.
        key={aperta}
        className="colonna"
        id={ID_PANNELLO_PROGETTO}
        role="tabpanel"
        aria-labelledby={idLinguettaProgetto(aperta)}
      >
        {aperta === 'fasi'
          ? schedaFasi(progetto, corso, quadro)
          : aperta === 'matrice'
            ? schedaMatrice(progetto)
            : (
                <>
                  {schedaGiudizi(progetto)}
                  {schedaValutazioni(progetto)}
                  {schedaPresenze(progetto, quadro)}
                </>
              )}
      </div>
    </div>
  )
}

function dettaglio (progetto: ProgettoNelCorso, corso: Corso): ReactElement {
  const quadro = quadroDelProgetto(stato.registro, progetto)
  return (
    // Un progetto nuovo è un dettaglio nuovo: le attese dei pulsanti non passano all'altro.
    <div key={progetto.id} className="colonna" data-telaio="integrazione:dettaglio">
      {schedaTestata(progetto)}
      {schedaCompiti(progetto)}
      {linguetteDelProgetto(progetto, corso, quadro)}
    </div>
  )
}

// ------------------------------------------------------------------ la pagina

function VistaIntegrazioneProgetti (): ReactElement {
  const t = testi()
  const tp = testiProgetti()
  if (!annoCorrente()) {
    return <StatoVuotoAnno telaio={telaioVista()} simbolo="progetto" crea={() => moduloAnno()} />
  }
  const corso = corsoDelContesto()
  if (!corso) {
    return (
      <StatoVuoto
        telaio={telaioVista()}
        simbolo="progetto"
        titolo={tp.nessunCorso}
        testo={tp.progettiInUnCorso}
        azione={(
          <Pulsante
            testo={tp.vaiAiCorsi}
            variante="primario"
            al={() => { vai({ pagina: 'pagina.corsi' }) }}
          />
        )}
      />
    )
  }
  const progetti = progettiDelCorso(stato.registro, corso.id)
  const progetto = progettoIntegratoMostrato()

  return (
    <div className="vista vista--progetti vista--integrazione" data-telaio={telaioVista()}>
      <TestataVista
        titolo={t.titolo}
        sottotitolo={nomeDelCorso(corso)}
        aiuto={t.aiuto}
      />
      <div className="colonne colonne--elenco" data-telaio="integrazione:colonne">
        {elencoIntegrati(progetti, progetto, corso)}
        {progetto
          ? dettaglio(progetto, corso)
          : (
              <div className="colonna">
                <StatoVuoto
                  simbolo="progetto"
                  titolo={t.nessunIntegrato}
                  testo={t.nessunIntegratoTesto}
                  azione={pulsanteIntegra(corso, 'primario')}
                />
              </div>
            )}
      </div>
    </div>
  )
}

export function vistaIntegrazioneProgetti (): ReactElement {
  return <VistaIntegrazioneProgetti />
}
