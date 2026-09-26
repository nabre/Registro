// Il percorso nella barra del titolo, dopo il nome del documento: dove si è,
// dal largo allo stretto («2026-2027 › DIC4a · Matematica › Lezione › lun 14 set»).
// Discreto: niente cornici né icone; solo l'ultimo anello in testo pieno. Due
// anelli si dicono solo a voce (`ANELLI_SOLO_A_VOCE`).

import { formattaData } from '../domain/dates.js'
import { nomeCompleto } from '../domain/calculations.js'
import { classeDelFascicolo, corsoDelContesto, nomeDelCorso } from './context.js'
import { nomeDelGruppo, nomeDelPosto, paginaAttiva } from './pages.js'
import { porzioneAttiva } from './tabs.js'
import { sezioneAperta } from './views/settings/sections.js'
import { h, type Figlio } from './dom.js'
import { lezionePerId, nomeDiPiano, pianoPerId, stato } from './state.js'
import { testi } from './breadcrumb.testi.js'

/** Che cosa dice un passo del percorso: serve a disegnarlo e a spiegarlo. */
type Ruolo = 'mestiere' | 'contesto' | 'pagina' | 'elemento' | 'porzione' | 'sezione'

interface Passo {
  ruolo: Ruolo
  testo: string
}

/** Come si chiama un anello del percorso, per chi lo sente leggere a voce. */
const NOMI_RUOLO: Record<Ruolo, string> = testi().ruoli

/**
 * Gli anelli che si leggono a voce e non si disegnano: l'area (già titolo del
 * gruppo nella barra laterale) e la scheda (già linguetta accesa). Il lettore di
 * schermo non vede né l'una né l'altra, quindi l'etichetta li dice.
 */
const ANELLI_SOLO_A_VOCE: ReadonlySet<Ruolo> = new Set<Ruolo>(['mestiere', 'porzione'])

/**
 * Il percorso della pagina aperta, dal largo allo stretto:
 *
 *     Registro › DIC4a · Matematica › Lezione › lun 14 set 08:20 › Annotazioni
 *      area         su che cosa       pagina       aperto            scheda
 *
 * Nelle impostazioni la scheda è il gruppo e la sezione l'anello dopo:
 *
 *     Il programma › Impostazioni › Documenti e stampa › Intestazione
 *
 * Non si preme (sta nell'area da cui si trascina la finestra). Gli anelli
 * vuoti si saltano.
 */
function passiDelPercorso (): Passo[] {
  const pagina = paginaAttiva()
  const porzione = porzioneAttiva()

  const passi: Array<Passo | null> = [
    pagina ? { ruolo: 'mestiere', testo: nomeDelGruppo(pagina.gruppo) } : null,
    suCheCosa(),
    { ruolo: 'pagina', testo: nomeDelPosto() },
    elementoAperto(),
    porzione ? { ruolo: 'porzione', testo: porzione.testo } : null,
    sezioneDelleImpostazioni(),
  ]
  return passi.filter((passo): passo is Passo => passo !== null)
}

/**
 * Di chi è quel che si guarda: il corso nelle pagine del registro, la classe
 * nel fascicolo del docente di classe.
 */
function suCheCosa (): Passo | null {
  const gruppo = paginaAttiva()?.gruppo
  if (gruppo === 'registro') {
    const corso = corsoDelContesto()
    return corso ? { ruolo: 'contesto', testo: nomeDelCorso(corso) } : null
  }
  if (gruppo === 'classe') {
    const classe = classeDelFascicolo()
    return classe ? { ruolo: 'contesto', testo: classe.nome } : null
  }
  return null
}

/**
 * La sezione aperta nelle impostazioni, salvo quando si chiama come il gruppo
 * (Comunicazioni › Comunicazioni non dice niente).
 */
function sezioneDelleImpostazioni (): Passo | null {
  if (stato.vista !== 'impostazioni') return null
  const { titolo, gruppo } = sezioneAperta(
    stato.ambitoImpostazioni,
    stato.schedaDocumento,
    stato.schedaProgramma,
  )
  if (titolo === gruppo.titolo) return null
  return { ruolo: 'sezione', testo: titolo }
}

/** Che cosa si è aperto dentro la pagina: l'ora, la persona, la scaletta, la prova. */
function elementoAperto (): Passo | null {
  const passo = (testo: string | null | undefined): Passo | null =>
    testo ? { ruolo: 'elemento', testo } : null

  switch (stato.vista) {
    case 'lezione': {
      const lezione = lezionePerId(stato.lezioneId)
      if (!lezione) return null
      const inizio = lezione.slot[0]?.inizio
      return passo(`${formattaData(lezione.data, 'giorno')}${inizio ? ` ${inizio}` : ''}`)
    }
    case 'calendario':
      return passo(formattaData(stato.data, 'giorno'))
    case 'allievo': {
      const allievo = stato.registro.classi
        .flatMap((classe) => classe.allievi)
        .find((a) => a.id === stato.allievoId)
      return passo(allievo ? nomeCompleto(allievo) : null)
    }
    case 'piani': {
      const piano = pianoPerId(stato.pianoId)
      return passo(piano ? nomeDiPiano(piano) : null)
    }
    case 'valutazioni': {
      const momento = stato.registro.valutazioni.find((v) => v.id === stato.valutazioneId)
      return passo(momento?.titolo)
    }
    default:
      return null
  }
}

/**
 * Il percorso da mettere dopo il nome del documento. Il separatore sta dentro
 * l'anello che segue, così sparisce con lui quando la finestra si stringe.
 */
export function percorso (): Figlio {
  const passi = passiDelPercorso()
  const visti = passi.filter((passo) => !ANELLI_SOLO_A_VOCE.has(passo.ruolo))
  const ultimo = visti.length - 1

  return h(
    'nav',
    {
      class: 'percorso',
      attr: {
        'aria-label': testi().percorso(
          passi.map((p) => `${NOMI_RUOLO[p.ruolo]} ${p.testo}`).join(', '),
        ),
      },
    },
    ...visti.map((passo, i) =>
      h(
        'span',
        {
          class: ['percorso__passo', `percorso__passo--${passo.ruolo}`, i === ultimo && 'percorso__passo--qui'],
        },
        // Decorazione: chi legge a voce ha già il percorso intero nell'etichetta.
        h('span', { class: 'percorso__freccia', attr: { 'aria-hidden': 'true' } }, '›'),
        h('span', { class: 'percorso__testo' }, passo.testo),
      ),
    ),
  )
}
