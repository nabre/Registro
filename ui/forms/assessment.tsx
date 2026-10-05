// Il momento di valutazione: che cosa si è valutato, quanto pesa, con che
// scala. Qui non se ne crea nessuno: un momento nasce solo dalla tappa del
// piano che dichiara una prova, nella lezione in cui la si è fatta. Qui si
// corregge quel che ne è uscito.

import { formattaData } from '#core/dominio/dates.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { vociConValore } from '#core/dominio/lists.js'
import { MOTIVI_ORFANO, motivoOrfano } from '#core/dominio/orphans.js'
import type { MomentoValutazione } from '#core/dominio/models.js'
import { progettiDelCorso } from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import type { ReactElement } from 'react'

import { classi } from '#ui/classNames.js'
import { Campo, Riga } from '#ui/components/base.js'
import { Suggerimento } from '#ui/components/hint.js'
import { Icona } from '#ui/components/icons.js'
import { apriModale } from '#ui/components/modal.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import {
  lezionePerId,
  nomeCorso,
  pianoPerId,
  postoCorrente,
  stato,
  vai,
  valutazionePerId,
} from '#ui/state.js'

import {
  baseViva,
  numero,
  salva,
  TastoElimina,
  testo,
} from './common.js'
import { testi } from './assessment.testi.js'

/**
 * Da dove viene il momento, detto e non chiesto: il legame con ora e tappa lo
 * fa la scaletta, e una tendina permetterebbe di spostare la prova senza che
 * la scaletta lo sappia.
 */
function Provenienza ({ momento }: { momento: MomentoValutazione }): ReactElement {
  const t = testi()
  const lezione = lezionePerId(momento.lezioneId)
  const piano = pianoPerId(momento.pianoId)
  const tappa = momento.attivitaId
    ? piano?.attivita.find((a) => a.id === momento.attivitaId) ?? null
    : null

  const motivo = motivoOrfano(stato.registro, momento)
  const pezzi = [
    nomeCorso(momento.corsoId),
    lezione ? t.lezioneDel(formattaData(lezione.data, 'settimana')) : null,
    tappa ? t.tappa(tappa.titolo || parole().senzaTitolo) : null,
  ].filter(Boolean)

  return (
    <div className={classi('riquadro-collegamenti', motivo && 'riquadro-collegamenti--avviso')}>
      <Icona nome={motivo ? 'avviso' : 'piano'} />
      <div>
        {/* Il legame sano si spiega dietro la «i»; quello rotto resta scritto, perché
            dice che cosa fare. */}
        <div>
          {pezzi.join(' · ')}
          {motivo === null
            ? <Suggerimento testo={t.aiutoProvenienza} etichetta={t.provenienza} />
            : null}
        </div>
        {motivo === null
          ? null
          : (
              // Il motivo preciso: «la tappa non c'è più» e «non viene da nessun piano» si
              // risolvono in modo diverso.
              <small className="testo-quieto">{t.orfano(MOTIVI_ORFANO[motivo])}</small>
            )}
      </div>
    </div>
  )
}

/**
 * Corregge un momento già nato: titolo, data, tipo, peso, scala, descrizione.
 * Il corso, l'ora e la tappa non si toccano — vengono dalla scaletta.
 */
export function moduloValutazione (momento: MomentoValutazione): void {
  const t = testi()
  const p = parole()
  apriModale({
    titolo: Uno(lessico().momento),
    sottotitolo: momento.titolo,
    larghezza: 'media',
    corpo: () => (
      <div className="modulo">
        <Provenienza momento={momento} />
        <Riga>
          <Campo
            nome="titolo"
            etichetta={p.titolo}
            valore={momento.titolo}
            segnaposto={t.segnapostoTitolo}
            richiesto
            larghezza="meta"
          />
          <Campo
            nome="data"
            etichetta={p.data}
            tipo="date"
            valore={momento.data}
            richiesto
            aiuto={t.aiutoData}
            larghezza="quarto"
          />
          <Campo
            nome="tipo"
            etichetta={parole().tipo}
            tipo="select"
            valore={momento.tipo}
            opzioni={vociConValore(stato.registro.impostazioni, 'tipoValutazione', momento.tipo)}
            larghezza="quarto"
          />
        </Riga>
        <Riga>
          {/* `passo: 'any'`: con un passo di 0,1 il browser rifiuterebbe 1,25. */}
          <Campo
            nome="peso"
            etichetta={t.peso}
            tipo="number"
            valore={momento.peso}
            min={0}
            max={10}
            passo="any"
            aiuto={t.aiutoPeso}
            larghezza="quarto"
          />
          {/* Senza passo: gli estremi di una scala non hanno una grana. */}
          <Campo
            nome="scalaMin"
            etichetta={t.votoMinimo}
            tipo="number"
            valore={momento.scala.min}
            passo="any"
            larghezza="quarto"
          />
          <Campo
            nome="scalaMax"
            etichetta={t.votoMassimo}
            tipo="number"
            valore={momento.scala.max}
            passo="any"
            larghezza="quarto"
          />
          <Campo
            nome="scalaSufficienza"
            etichetta={t.sufficienza}
            tipo="number"
            valore={momento.scala.sufficienza}
            passo="any"
            larghezza="quarto"
          />
        </Riga>
        {/* Solo i progetti integrati nel corso: la prova è lavoro con la sua classe. */}
        {progettiDelCorso(stato.registro, momento.corsoId).length > 0 || momento.progettoId
          ? (
              <Campo
                nome="progetto"
                etichetta={Uno(lessico().progetto)}
                tipo="select"
                valore={momento.progettoId ?? ''}
                opzioni={[
                  { valore: '', testo: t.nessunProgetto },
                  ...progettiDelCorso(stato.registro, momento.corsoId)
                    .map((p) => ({ valore: p.id, testo: p.titolo })),
                ]}
                aiuto={t.aiutoProgetto}
              />
            )
          : null}
        <Campo
          nome="descrizione"
          etichetta={p.descrizione}
          tipo="textarea"
          righe={3}
          valore={momento.descrizione ?? ''}
          segnaposto={t.segnapostoDescrizione}
        />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      // Il momento com'è adesso: voti, recuperi e allegati non stanno qui e possono
      // essere cambiati altrove.
      const vivo = baseViva(contesto, true, momento, valutazionePerId(momento.id))
      if (!vivo) return
      const aggiornato: MomentoValutazione = {
        ...vivo,
        titolo: testo(valori.titolo),
        data: testo(valori.data),
        tipo: testo(valori.tipo) as MomentoValutazione['tipo'],
        peso: numero(valori.peso, 1),
        descrizione: testo(valori.descrizione),
        // Il campo c'è solo se l'anno ha progetti: senza, il legame resta quello che era.
        progettoId: valori.progetto === undefined
          ? vivo.progettoId ?? null
          : testo(valori.progetto) || null,
        scala: {
          ...vivo.scala,
          min: numero(valori.scalaMin, vivo.scala.min),
          max: numero(valori.scalaMax, vivo.scala.max),
          sufficienza: numero(valori.scalaSufficienza, vivo.scala.sufficienza),
        },
      }
      await salva(
        contesto,
        { tipo: 'valutazione.salva', valutazione: aggiornato },
        t.aggiornato,
        () => apriMomento(aggiornato),
      )
    },
    azioniSecondarie: (contesto) => (
      <TastoElimina
        contesto={contesto}
        chiedi={{ genere: 'valutazione', id: momento.id }}
        azione={{ tipo: 'valutazione.elimina', valutazioneId: momento.id }}
        fatto={t.eliminato}
        poi={() => {
          // Il momento tolto non resta scelto; nella sua pagina si torna al corso.
          const qui = postoCorrente()
          const corsoId = stato.contesto.corsoId
          vai(
            qui.soggetto?.tipo !== 'valutazione'
              ? qui
              : corsoId
                ? { pagina: qui.pagina, soggetto: { tipo: 'corso', id: corsoId } }
                : { pagina: qui.pagina },
            { contesto: { valutazioneId: null }, elementoChiesto: false },
          )
        }}
      />
    ),
  })
}
