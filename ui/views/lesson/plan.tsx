// La scaletta dell'ora: il piano assegnato alla lezione, le sue tappe con lo
// stato di avanzamento e le risorse che si portano in aula.

import { Fragment, type ReactElement, type ReactNode } from 'react'

import {
  avanzamentoPiano,
  confrontaPianoConLezione,
  minutiAttivita,
  minutiDiAttivita,
  scalettaSulleUd,
} from '#core/dominio/calculations.js'
import {
  attivitaConPendenza,
  attivitaValutata,
  colonneCheckDi,
  nomeTipoAttivita,
  riassuntoParametri,
} from '#core/dominio/activities.js'
import { avanzamentoConsegna } from '#core/dominio/assignments.js'
import { checkDelCorso, riepilogoDelCheck } from '#core/dominio/check.js'
import { formattaDurata } from '#core/dominio/dates.js'
import type { Attivita, ColonnaCheck, Lezione, Risorsa, StatoAttivita } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import {
  Barra,
  Collegamento,
  Pastiglia,
  Pulsante,
  Scheda,
  StatoVuoto,
} from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { moduloAssegnaPiano } from '#ui/forms.js'
import { OrarioTappa } from '#ui/forms/planActivity.js'
import { azione } from '#ui/bridge.js'
import { aggiorna, classeDelCorsoId, pianoPerId, stato, uriDato, vai } from '#ui/state.js'
import { moduloSpunta } from '#ui/views/assignments.js'
import { pulsanteValutazione } from './assessments.js'
import { Molti, Uno, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { apriProgettoDellOra } from './project.js'
import { testi } from './plan.testi.js'

/** Gli stati di una tappa, con il segno del pulsante; il nome sta nel catalogo. */
const STATI_ATTIVITA: Array<{ valore: StatoAttivita; sigla: string }> = [
  { valore: 'da-fare', sigla: '·' },
  { valore: 'svolta', sigla: '✓' },
  { valore: 'parziale', sigla: '~' },
  { valore: 'saltata', sigla: '×' },
]

/**
 * Le risorse di un piano viste dall'aula: si aprono e basta; si modificano
 * nella vista Piani.
 */
function risorseDaAula (
  pianoId: string,
  attivitaId: string | null,
  risorse: Risorsa[],
): ReactElement | null {
  if (risorse.length === 0) return null

  return (
    <ul className="risorse__elenco risorse__elenco--aula">
      {risorse.map((risorsa) => {
        const apri = () =>
          void azione({ tipo: 'risorsa.apri', pianoId, attivitaId, risorsaId: risorsa.id })
        const indirizzo = risorsa.tipo === 'immagine' ? uriDato(risorsa.file) : null

        return (
          // testo-fisso: classi CSS
          <li key={risorsa.id} className={`risorsa risorsa--${risorsa.tipo}`}>
            {indirizzo
              ? (
                  // La chiave è l'indirizzo: fra due disegni resta lo stesso nodo,
                  // e l'immagine non lampeggia a ogni clic.
                  <img
                    key={indirizzo}
                    className="risorsa__miniatura"
                    src={indirizzo}
                    alt={risorsa.titolo}
                    loading="lazy"
                    onClick={apri}
                  />
                )
              : <Icona nome={risorsa.tipo === 'collegamento' ? 'collegamento' : 'documento'} classe="risorsa__simbolo" />}
            <div className="risorsa__corpo">
              <Collegamento testo={risorsa.titolo || parole().senzaTitolo} al={apri} />
              {risorsa.note ? <p className="risorsa__note">{risorsa.note}</p> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function pulsantePendenza (lezione: Lezione, attivita: Attivita): ReactNode {
  const consegnaId = attivitaConPendenza(attivita)
  if (!consegnaId) return null
  const t = testi()

  if (consegnaId === 'tutte') {
    return (
      <Pulsante
        testo={t.pendenze}
        simbolo="allegato"
        variante="sottile"
        titolo={t.pendenze}
        al={() => aggiorna({ schedaLezione: 'amministrazione' })}
      />
    )
  }

  const consegna = stato.registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) return null

  const classe = classeDelCorsoId(consegna.corsoId)
  const avanzamento = avanzamentoConsegna(consegna, classe)
  const completata = avanzamento.completa

  return (
    <Pulsante
      testo={`${avanzamento.fatte}/${avanzamento.destinatari.length}`}
      simbolo="allegato"
      variante={completata ? 'fantasma' : 'sottile'}
      titolo={t.apriPendenza(consegna.testo)}
      al={() => {
        moduloSpunta(consegna.id, { lezione })
        aggiorna({ schedaLezione: 'amministrazione' })
      }}
    />
  )
}

/** Le colonne del check del corso che la tappa verifica e che ci sono ancora. */
function colonneDelCheck (lezione: Lezione, attivita: Attivita): ColonnaCheck[] {
  const ids = colonneCheckDi(attivita)
  const colonne = checkDelCorso(stato.registro, lezione.corsoId)?.colonne ?? []
  return colonne.filter((c) => ids.includes(c.id))
}

function pulsanteCheck (lezione: Lezione, attivita: Attivita): ReactNode {
  const colonneIds = colonneCheckDi(attivita)
  if (colonneIds.length === 0) return null
  const t = testi()

  if (colonneIds.includes('tutte')) {
    return (
      <Pulsante
        testo={t.check}
        simbolo="check"
        variante="sottile"
        titolo={t.check}
        al={() => aggiorna({ schedaLezione: 'amministrazione' })}
      />
    )
  }

  const colonne = colonneDelCheck(lezione, attivita)
  if (colonne.length === 0) return null

  // Più colonne nella stessa tappa: si contano le spunte di tutte insieme, come
  // la testata della griglia, solo di chi frequenta (un ritirato non la
  // lascerebbe mai completa).
  const riepilogo = riepilogoDelCheck(stato.registro, lezione.corsoId)
    .filter((r) => colonne.some((c) => c.id === r.colonna.id))
  const attese = riepilogo.reduce((somma, r) => somma + r.totale, 0)
  const fatte = riepilogo.reduce((somma, r) => somma + r.fatte, 0)
  const completato = fatte >= attese && attese > 0

  return (
    <Pulsante
      testo={`${fatte}/${attese}`}
      simbolo="check"
      variante={completato ? 'fantasma' : 'sottile'}
      titolo={t.apriCheck(colonne.map((c) => c.titolo).join(', '))}
      al={() => {
        aggiorna({ schedaLezione: 'amministrazione' })
      }}
    />
  )
}

/** Il progetto per cui lavora la tappa: porta alla scheda Progetto dell'ora, su di lui. */
function pulsanteProgetto (lezione: Lezione, attivita: Attivita): ReactNode {
  if (!attivita.progettoId) return null
  const progetto = stato.registro.progetti.find((p) => p.id === attivita.progettoId)
  if (!progetto) return null
  return (
    <Pulsante
      testo={progetto.titolo}
      simbolo="progetto"
      variante="sottile"
      titolo={testi().apriProgetto(progetto.titolo)}
      al={() => apriProgettoDellOra(lezione, progetto.id)}
    />
  )
}

/**
 * Una tappa della scaletta: titolo, tipo, durata, orario vero, collegamenti e
 * stato. Ogni pezzo ha la sua area nella griglia, così una colonna vuota (una
 * tappa senza collegamenti) non sposta le altre.
 */
function vocePiano (
  lezione: Lezione,
  pianoId: string,
  attivita: Attivita,
  indice: number,
  corrente: StatoAttivita,
  posata: ReturnType<typeof scalettaSulleUd>,
): ReactElement {
  const t = testi()
  const orario = posata.posti[indice]
  const titolo = attivita.titolo || parole().senzaTitolo
  const parametri = riassuntoParametri(attivita, stato.registro.impostazioni)
  const pendenza = attivitaConPendenza(attivita)
  const colonne = colonneDelCheck(lezione, attivita)
  const consegna = pendenza && pendenza !== 'tutte'
    ? stato.registro.consegne.find((x) => x.id === pendenza)
    : undefined

  // Strumenti collegati: prova, pendenze, check, progetto.
  const valutazione = attivitaValutata(attivita) ? pulsanteValutazione(lezione, attivita) : null
  const conPendenza = pendenza ? pulsantePendenza(lezione, attivita) : null
  const conCheck = pulsanteCheck(lezione, attivita)
  const conProgetto = pulsanteProgetto(lezione, attivita)

  return (
    <li className={classi('scaletta__voce', `scaletta__voce--${corrente}`)}>
      {/* Il numero lo dice già l'elenco a chi legge lo schermo. */}
      <span className="scaletta__numero" aria-hidden="true">{String(indice + 1)}</span>
      <div className="scaletta__titolo">
        <strong>{titolo}</strong>
        {orario?.oltreLaPausa ? <Pastiglia testo={t.aCavallo} tono="attenzione" /> : null}
      </div>
      <span className="scaletta__tipo">
        <Pastiglia testo={nomeTipoAttivita(attivita.tipo, stato.registro.impostazioni)} tono="quiete" />
      </span>
      <span className="scaletta__durata">{formattaDurata(minutiAttivita(attivita, posata.minutiPerUd))}</span>
      {/* Quando cade davvero, pause comprese; oltre la fine dell'ora come nell'editor del piano. */}
      <OrarioTappa sulleUd={posata} indice={indice} classe="scaletta__orario" />
      {valutazione || conPendenza || conCheck || conProgetto
        ? (
            <span className="scaletta__prova">
              {valutazione}
              {conPendenza}
              {conCheck}
              {conProgetto}
            </span>
          )
        : null}
      <div className="scaletta__stati" role="group" aria-label={t.avanzamentoDi(titolo)}>
        {STATI_ATTIVITA.map((voce) => (
          <button
            key={voce.valore}
            className={classi('stato-attivita', corrente === voce.valore && 'stato-attivita--attivo')}
            type="button"
            title={t.stati[voce.valore]}
            aria-label={t.stati[voce.valore]}
            aria-pressed={corrente === voce.valore}
            onClick={() =>
              void azione({
                tipo: 'avanzamento.imposta',
                lezioneId: lezione.id,
                attivitaId: attivita.id,
                stato: voce.valore,
              })}
          >
            {voce.sigla}
          </button>
        ))}
      </div>
      {/* Descrizione e parametri scendono sotto, allineati al titolo. */}
      {attivita.descrizione || parametri || attivita.risorse.length > 0 || pendenza ||
        colonneCheckDi(attivita).length > 0
        ? (
            <div className="scaletta__estesa">
              {attivita.descrizione
                ? <p className="scaletta__descrizione">{attivita.descrizione}</p>
                : null}
              {/* I parametri del tipo in una riga («gruppi da 3 · a sorteggio»). */}
              {parametri
                ? <p className="scaletta__parametri testo-quieto">{parametri}</p>
                : null}
              {consegna
                ? (
                    <p className="scaletta__parametri testo-quieto">
                      <Icona nome="allegato" classe="icona--minuta" />
                      {` ${consegna.testo}`}
                    </p>
                  )
                : null}
              {colonne.length > 0
                ? (
                    <p className="scaletta__parametri testo-quieto">
                      <Icona nome="check" classe="icona--minuta" />
                      {` ${colonne.map((k) => k.titolo).join(', ')}`}
                    </p>
                  )
                : null}
              {risorseDaAula(pianoId, attivita.id, attivita.risorse)}
            </div>
          )
        : null}
    </li>
  )
}

export function pannelloPiano (lezione: Lezione): ReactElement {
  const piano = pianoPerId(lezione.pianoId)
  const t = testi()
  const L = lessico()

  if (!piano) {
    return (
      <Scheda titolo={Uno(L.pianoLezione)}>
        <StatoVuoto
          simbolo="piano"
          titolo={t.nessunPiano}
          testo={t.nessunPianoTesto}
          azione={(
            <Pulsante
              testo={t.assegna}
              variante="primario"
              simbolo="piano"
              al={() => moduloAssegnaPiano(lezione)}
            />
          )}
        />
      </Scheda>
    )
  }

  const { minutiUd } = stato.registro.impostazioni
  const confronto = confrontaPianoConLezione(piano, lezione, minutiUd)
  // La scaletta posata sull'ora vera: quando cade ogni tappa e dove sta l'intervallo.
  const posata = scalettaSulleUd(piano.attivita, lezione, minutiUd)
  const avanzamento = avanzamentoPiano(lezione, piano)
  const perAttivita = new Map(lezione.avanzamento.map((a) => [a.attivitaId, a]))
  const durata = formattaDurata(minutiDiAttivita(confronto.durataPiano, posata.minutiPerUd))

  /** L'intervallo si vede dov'è, fra le tappe, con i minuti che dura. */
  const bloccoDi = (ud: number | null | undefined): number | null =>
    ud === null || ud === undefined ? null : posata.ud[ud]?.blocco ?? null

  return (
    <Scheda
      titolo={Uno(L.pianoLezione)}
      // Il sottotitolo dice quanto pesa la scaletta, non il nome del piano.
      sottotitolo={`${quanti(piano.attivita.length, L.attivita)} · ${durata}`}
      azioni={(
        <Pulsante
          simbolo="matita"
          variante="fantasma"
          // Si modifica nella pagina del piano, con quest'ora accanto: lì c'è
          // tutto l'editor, e una modale ne ripeteva solo una parte.
          titolo={t.modificaScaletta}
          al={() => {
            vai(
              { pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } },
              { contesto: { lezioneId: lezione.id } },
            )
          }}
        />
      )}
    >
      <div className="piano-lezione">
        <div className="piano-lezione__sintesi">
          <Barra quota={avanzamento} tono="positivo" />
          <div className="piano-lezione__conti">
            <Pastiglia testo={t.svolto(Math.round(avanzamento * 100))} tono="informativo" />
            <Pastiglia testo={t.piano(durata)} tono="quiete" simbolo="orologio" />
            {Math.abs(confronto.scostamento) >= 0.05
              ? (
                  <Pastiglia
                    testo={confronto.scostamento > 0
                      ? t.diTroppo(minutiDiAttivita(confronto.scostamento, posata.minutiPerUd))
                      : t.liberi(minutiDiAttivita(-confronto.scostamento, posata.minutiPerUd))}
                    tono={confronto.scostamento > 0 ? 'attenzione' : 'positivo'}
                  />
                )
              : <Pastiglia testo={t.inOrario} tono="positivo" />}
            {/* Si avvisa solo quando si sfora l'intervallo. */}
            {confronto.oltreLaPausa > 0
              ? <Pastiglia testo={t.oltreLaPausa(confronto.oltreLaPausa)} tono="attenzione" />
              : null}
          </div>
        </div>
        {piano.obiettivi.length > 0
          ? (
              <div className="piano-lezione__obiettivi">
                <h5>{t.obiettivi}</h5>
                {/* Gli obiettivi sono testi liberi, anche ripetuti: la chiave è il posto. */}
                <ul>{piano.obiettivi.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
            )
          : null}
        {/* Il materiale per tutta l'ora, in cima. */}
        {piano.risorse.length > 0
          ? (
              <div className="piano-lezione__risorse">
                <h5>{Molti(L.risorsa)}</h5>
                {risorseDaAula(piano.id, null, piano.risorse)}
              </div>
            )
          : null}
        {/* La griglia delle righe si ricompone sullo spazio della scaletta, non
            della finestra: la colonna della lezione è mezza pagina. */}
        <div className="scaletta-ora">
          {/* I nomi delle colonne sono per l'occhio: ogni riga si legge da sé. */}
          <div className="scaletta__voce scaletta__voce--intestazione" aria-hidden="true">
            {/* testo-fisso: il segno del numero d'ordine */}
            <span className="scaletta__numero">#</span>
            <span className="scaletta__titolo">{Uno(L.attivita)}</span>
            <span className="scaletta__tipo">{parole().tipo}</span>
            <span className="scaletta__durata">{t.durata}</span>
            <span className="scaletta__orario">{t.quando}</span>
            <span className="scaletta__prova">{t.collegamenti}</span>
            <span className="scaletta__stati">{parole().stato}</span>
          </div>
          <ol className="scaletta scaletta--aula" aria-label={Uno(L.pianoLezione)}>
            {piano.attivita.map((attivita, indice) => {
              const corrente = perAttivita.get(attivita.id)?.stato ?? 'da-fare'
              const dove = posata.posti[indice]
              const apre = bloccoDi(dove?.ud)
              const chiudeLaPrima = indice > 0 ? bloccoDi(posata.posti[indice - 1]?.udFine) : null
              const stacco =
                apre !== null && chiudeLaPrima !== null && apre !== chiudeLaPrima
                  ? posata.blocchi[apre]
                  : null
              return (
                <Fragment key={attivita.id}>
                  {stacco
                    ? (
                        <li className="scaletta__pausa">
                          <Icona nome="pausa" classe="icona--minuta" />
                          <span>{t.intervallo(stacco.pausaPrima)}</span>
                        </li>
                      )
                    : null}
                  {vocePiano(lezione, piano.id, attivita, indice, corrente, posata)}
                </Fragment>
              )
            })}
          </ol>
        </div>
      </div>
    </Scheda>
  )
}
