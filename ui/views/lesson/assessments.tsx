// Le valutazioni dell'ora: il pulsante con cui una tappa valutata apre o
// crea il suo momento, e il foglio dei voti delle prove nate qui.

import type { ReactElement } from 'react'

import {
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  siglaPresenza,
} from '#core/dominio/calculations.js'
import type { Attivita, Lezione, MomentoValutazione } from '#core/dominio/models.js'
import { Pulsante, Scheda } from '#ui/components/base.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { GraficoNote } from '#ui/components/notes.js'
import { bloccoRecuperiDellOra } from '#ui/views/assessments/retakes.js'
import { grigliaVoti } from '#ui/views/assessments/grades.js'
import { classeDiLezione, stato } from '#ui/state.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { testi } from './assessments.testi.js'

/**
 * Il pulsante con cui una tappa valutata apre il suo momento; se non c'è lo
 * crea con titolo, tipo e peso della scaletta e la data della lezione.
 */
export function pulsanteValutazione (lezione: Lezione, attivita: Attivita): ReactElement {
  const momento = stato.registro.valutazioni.find(
    (v) => v.lezioneId === lezione.id && v.attivitaId === attivita.id,
  )

  const t = testi()
  return (
    <Pulsante
      testo={momento ? Molti(lessico().voto) : t.creaProva}
      simbolo="valutazioni"
      variante={momento ? 'sottile' : 'fantasma'}
      titolo={momento ? t.apri(momento.titolo) : t.creaMomento}
      al={async () => {
        if (momento) {
          // Porta alla pagina dei voti sulla prova (`apriMomento`, che imposta anche il
          // corso): la vista lezione non mostra `valutazioneId`.
          apriMomento(momento)
          return
        }
        const risposta = await eseguiOAvvisa({
          tipo: 'valutazione.daAttivita',
          lezioneId: lezione.id,
          attivitaId: attivita.id,
        })
        if (!risposta.ok) return
        if (risposta.creato) {
          apriMomento({ id: risposta.creato.id, corsoId: lezione.corsoId })
        }
      }}
    />
  )
}

/**
 * Il grafico delle note appena messe: il disegno è di `components/notes.tsx`,
 * lo stesso dello schermo per la classe; qui si preparano le cifre.
 */
function graficoNoteDi (momento: MomentoValutazione): ReactElement {
  const conti = distribuzione(momento)

  return (
    <GraficoNote
      grafico={distribuzioneAPunti(momento)}
      media={formattaVoto(conti.media)}
      sufficienti={conti.sufficienti}
      conteggio={conti.conteggio}
      estremi={
        conti.minimo !== null && conti.massimo !== null
          ? testi().estremi(formattaVoto(conti.minimo), formattaVoto(conti.massimo))
          : null
      }
    />
  )
}

export function pannelloValutazioni (lezione: Lezione): ReactElement {
  const classe = classeDiLezione(lezione)
  const momenti = stato.registro.valutazioni.filter((v) => v.lezioneId === lezione.id)
  // I recuperi fissati per oggi: anche loro valutazioni di quest'ora.
  const recuperi = bloccoRecuperiDellOra(lezione)
  const conRecuperi = recuperi !== null && recuperi !== undefined && recuperi !== false
  const t = testi()

  // Anello della catena di telaio dell'ora (`lesson.tsx`): la griglia dei voti
  // resta lo stesso nodo e un voto scritto non la riporta a sinistra.
  return (
    <Scheda
      telaio="valutazioni-ora"
      titolo={t.valutazioni}
      sottotitolo={
        momenti.length === 0
          ? conRecuperi
            ? t.soloRecuperi
            : t.valutatoQui
          : t.momenti(momenti.length)
      }
      // Come si scrive nella griglia, dietro la «i»; solo se la griglia c'è.
      aiuto={
        classe && momenti.length > 0
          ? t.aiuto(siglaPresenza('assente'))
          : undefined
      }
      // Nessun «nuovo momento»: il momento nasce dal pulsante della tappa, che ne
      // sa titolo, tipo e peso.
    >
      {!classe || momenti.length === 0
        ? (
            <div>
              {/* Il richiamo alla scaletta solo se non c'è niente, nemmeno un recupero. */}
              {conRecuperi ? null : <p className="testo-quieto">{t.niente}</p>}
              {recuperi}
            </div>
          )
        : (
            <div data-telaio="valutazioni-ora:griglie">
              {/* Senza media e nota: qui si guarda una prova sola. */}
              {grigliaVoti(classe, momenti, { medie: false })}
              {/* Un grafico per prova, sotto la griglia. */}
              {momenti.map((momento) => (
                <div key={momento.id} className="note-prova">
                  {momenti.length > 1
                    ? <h5 className="note-prova__titolo">{momento.titolo}</h5>
                    : null}
                  {graficoNoteDi(momento)}
                </div>
              ))}
              {/* In fondo i recuperi di prove di un altro giorno. */}
              {recuperi}
            </div>
          )}
    </Scheda>
  )
}
