// Le valutazioni dell'ora: il pulsante con cui una tappa valutata apre o
// crea il suo momento, e il foglio dei voti delle prove nate qui.

import {
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  siglaPresenza,
} from '../../../domain/calculations.js'
import type { Attivita, Lezione, MomentoValutazione } from '../../../domain/models.js'
import { pulsante, scheda } from '../../components/base.js'
import { eseguiOAvvisa } from '../../components/filters.js'
import { h, type Figlio } from '../../dom.js'
import { bloccoRecuperiDellOra } from '../retakes.js'
import { graficoNote } from '../../components/notes.js'
import { grigliaVoti } from '../grades.js'
import { classeDiLezione, stato } from '../../state.js'
import { apriMomento } from '../../calendarNavigation.js'
import { Molti } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { testi } from './assessments.testi.js'

/**
 * Il pulsante con cui una tappa valutata apre il suo momento; se non c'è lo
 * crea con titolo, tipo e peso della scaletta e la data della lezione.
 */
export function pulsanteValutazione (lezione: Lezione, attivita: Attivita) {
  const momento = stato.registro.valutazioni.find(
    (v) => v.lezioneId === lezione.id && v.attivitaId === attivita.id,
  )

  const t = testi()
  return pulsante({
    testo: momento ? Molti(lessico().voto) : t.creaProva,
    simbolo: 'valutazioni',
    variante: momento ? 'sottile' : 'fantasma',
    titolo: momento ? t.apri(momento.titolo) : t.creaMomento,
    al: async () => {
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
    },
  })
}

/**
 * Il grafico delle note appena messe: il disegno è di `components/notes.ts`,
 * lo stesso dello schermo per la classe; qui si preparano le cifre.
 */
function graficoNoteDi (momento: MomentoValutazione): Figlio {
  const conti = distribuzione(momento)

  return graficoNote({
    grafico: distribuzioneAPunti(momento),
    media: formattaVoto(conti.media),
    sufficienti: conti.sufficienti,
    conteggio: conti.conteggio,
    estremi:
      conti.minimo !== null && conti.massimo !== null
        ? testi().estremi(formattaVoto(conti.minimo), formattaVoto(conti.massimo))
        : null,
  })
}

export function pannelloValutazioni (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const momenti = stato.registro.valutazioni.filter((v) => v.lezioneId === lezione.id)
  // I recuperi fissati per oggi: anche loro valutazioni di quest'ora.
  const recuperi = bloccoRecuperiDellOra(lezione)
  const t = testi()

  return scheda({
    titolo: t.valutazioni,
    sottotitolo:
      momenti.length === 0
        ? recuperi
          ? t.soloRecuperi
          : t.valutatoQui
        : t.momenti(momenti.length),
    // Come si scrive nella griglia, dietro la «i»; solo se la griglia c'è.
    aiuto:
      classe && momenti.length > 0
        ? t.aiuto(siglaPresenza('assente'))
        : undefined,
    // Nessun «nuovo momento»: il momento nasce dal pulsante della tappa, che ne
    // sa titolo, tipo e peso.
    contenuto:
      !classe || momenti.length === 0
        ? h(
            'div',
            null,
            // Il richiamo alla scaletta solo se non c'è niente, nemmeno un recupero.
            recuperi
              ? null
              : h(
                  'p',
                  { class: 'testo-quieto' },
                  t.niente,
                ),
            recuperi,
          )
        : h(
            'div',
            null,
            // Senza media e nota: qui si guarda una prova sola.
            grigliaVoti(classe, momenti, { medie: false }),
            // Un grafico per prova, sotto la griglia.
            ...momenti.map((momento) =>
              h(
                'div',
                { class: 'note-prova' },
                momenti.length > 1
                  ? h('h5', { class: 'note-prova__titolo' }, momento.titolo)
                  : null,
                graficoNoteDi(momento),
              ),
            ),
            // In fondo i recuperi di prove di un altro giorno.
            recuperi,
          ),
  })
}
