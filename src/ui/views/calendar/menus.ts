// Il calendario: i menu del tasto destro.
//
// Su un'ora — lo stato, il piano e, in modifica, l'orario — e sul vuoto di un
// giorno. Settimana, mese e agenda aprono gli stessi menu.

import { fineLezione, inizioLezione } from '../../../domain/calculations.js'
import { formattaData, oraDaMinuti, sommaGiorni } from '../../../domain/dates.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import type { NomeIcona } from '../../components/icons.js'
import { eseguiOAvvisa } from '../../components/filters.js'
import { ancorataAIcs } from '../../externalCalendar.js'
import { moduloAssegnaPiano, moduloLezione, sincronizzaDaIcs } from '../../forms.js'
import { conferma } from '../../components/modal.js'
import { menuContestuale, type ElementoMenu } from '../../components/menu.js'
import { notifica } from '../../components/notifications.js'
import { azione } from '../../bridge.js'
import { aggiorna, nomeClasseDiLezione, nomeCorso, pianoPerId, stato } from '../../state.js'
import { apriLezione } from './common.js'
import { posa } from './drag.js'
import {
  corsoDelleNuove,
  creaAlle,
  elimina,
  entraInModifica,
  esci,
  sposta,
  stiraDiUd,
  stirabile,
  inModifica,
  scegli,
} from './editor.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './menus.testi.js'

/**
 * Quel che si può fare a una lezione senza aprirla: stato e piano ci sono
 * sempre. Le voci che cambiano l'orario (modulo, durata, giorno, copia,
 * eliminazione) solo in modifica, ognuna con il suo tasto.
 */
export function menuLezione (evento: MouseEvent, lezione: Lezione): void {
  const inModificaOra = inModifica()
  // In modifica il tasto destro sceglie l'ora, come il clic: voci e tastiera
  // lavorano sulla stessa.
  if (inModificaOra) scegli(lezione.id)
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  const orario = inizio && fine ? ` · ${inizio}–${fine}` : ''
  const ancorata = ancorataAIcs(lezione.id)
  const t = testi()

  const modifica: ElementoMenu[] = inModificaOra
    ? [
        {
          testo: `${parole().modifica}…`,
          simbolo: 'matita',
          scorciatoia: 'F2',
          al: () => moduloLezione({ lezione }),
        },
        // Ancorata: orario e aula come negli eventi ICS, in un gesto solo.
        ...(ancorata
          ? [{
              testo: t.sincronizza,
              simbolo: 'ricarica',
              al: () => void sincronizzaDaIcs(lezione),
            } as const]
          : []),
      ]
    : []

  menuContestuale(evento, [
    { titolo: `${nomeClasseDiLezione(lezione)} · ${formattaData(lezione.data, 'giorno')}${orario}` },
    {
      testo: t.apriLezione,
      simbolo: 'destra',
      ...(inModificaOra ? { scorciatoia: t.tastoInvio } : {}),
      al: () => apriLezione(lezione),
    },
    ...modifica,
    'separatore',
    ...vociStato(lezione),
    'separatore',
    ...vociPiano(lezione),
    ...(inModificaOra ? vociOrario(lezione, ancorata) : []),
  ])
}

/** Svolta, pianificata, annullata: quel che si dice di un'ora guardandola. */
function vociStato (lezione: Lezione): ElementoMenu[] {
  const cambiaStato = async (nuovo: Lezione['stato'], messaggio: string) => {
    const risposta = await azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: nuovo })
    if (!risposta.ok) return
    notifica(messaggio, nuovo === 'annullata' ? 'avviso' : 'successo')
  }
  const t = testi()
  return [
    lezione.stato === 'svolta'
      ? {
          testo: t.riportaPianificata,
          simbolo: 'orologio',
          al: () => void cambiaStato('pianificata', t.riportataPianificata),
        }
      : {
          testo: t.segnaSvolta,
          simbolo: 'spunta',
          al: () => void cambiaStato('svolta', t.segnataSvolta),
        },
    lezione.stato === 'annullata'
      ? {
          testo: t.nonPiuAnnullata,
          simbolo: 'ricarica',
          al: () => void cambiaStato('pianificata', t.ripristinata),
        }
      : {
          testo: t.annulla,
          simbolo: 'chiudi',
          al: async () => {
            // Annullare non è eliminare: la lezione resta, segnata come non svolta. Lo si dice.
            const sicuro = await conferma({
              titolo: t.annullareTitolo,
              testo: t.annullareTesto,
              testoConferma: t.annulla,
            })
            if (sicuro) await cambiaStato('annullata', t.annullata)
          },
        },
  ]
}

/** Il piano dell'ora: segue la lezione quando si sposta o si copia, e si cambia da qui. */
function vociPiano (lezione: Lezione): ElementoMenu[] {
  const piano = pianoPerId(lezione.pianoId)
  const t = testi()
  if (!piano) {
    return [{ testo: t.assegnaPiano, simbolo: 'piano', al: () => moduloAssegnaPiano(lezione) }]
  }
  return [
    {
      testo: t.apriPiano,
      simbolo: 'piano',
      al: () => aggiorna({ vista: 'piani', pianoId: piano.id }),
    },
    { testo: t.cambiaPiano, simbolo: 'ricarica', al: () => moduloAssegnaPiano(lezione) },
    {
      testo: t.togliPiano,
      simbolo: 'chiudi',
      al: async () => {
        // Togliere il piano azzera le spunte, che si riferivano alle sue attività.
        const sicuro =
          lezione.avanzamento.length === 0 ||
          (await conferma({
            titolo: t.togliereTitolo,
            testo: t.togliereTesto,
            testoConferma: parole().togli,
          }))
        if (!sicuro) return
        await eseguiOAvvisa(
          { tipo: 'piano.assegna', lezioneId: lezione.id, pianoId: null },
          t.pianoTolto,
        )
      },
    },
  ]
}

/**
 * L'orario dell'ora, in modifica: durata, giorno, copia, eliminazione, con il
 * tasto di ciascuna. Un'ora ancorata all'ICS tiene solo «Allunga» e
 * «Accorcia», sulle fasce libere; giorno e ora si allineano con «Sincronizza
 * da ICS».
 */
function vociOrario (lezione: Lezione, ancorata: boolean): ElementoMenu[] {
  const t = testi()
  const nonSi = ancorata ? t.nonSiIcs : t.nonSi
  const stira = (testo: string, simbolo: NomeIcona, ud: number): ElementoMenu => {
    const si = stirabile(lezione, 'fine', ud)
    return { testo, simbolo, disabilitato: !si, titolo: si ? undefined : nonSi, al: () => stiraDiUd(lezione, 'fine', ud) }
  }
  // La durata solo nella settimana: nel mese non si vedrebbe cambiare.
  const durata = stato.modoCalendario === 'settimana'
    ? [stira(t.allunga, 'piu', 1), stira(t.accorcia, 'meno', -1)]
    : []
  if (ancorata) return durata.length > 0 ? ['separatore', ...durata] : []
  return [
    'separatore',
    ...durata,
    {
      testo: t.giornoPrima,
      simbolo: 'sinistra',
      scorciatoia: '←',
      al: () => sposta(lezione, sommaGiorni(lezione.data, -1)),
    },
    {
      testo: t.giornoDopo,
      simbolo: 'destra',
      scorciatoia: '→',
      al: () => sposta(lezione, sommaGiorni(lezione.data, 1)),
    },
    {
      // Una lezione si ripete ogni settimana: è la copia che si fa davvero.
      testo: t.copiaSettimana,
      simbolo: 'duplica',
      scorciatoia: 'Ctrl+D',
      al: () => posa(lezione, sommaGiorni(lezione.data, 7), undefined, true),
    },
    'separatore',
    {
      testo: parole().elimina,
      simbolo: 'cestino',
      pericolo: true,
      scorciatoia: t.tastoCanc,
      al: () => elimina(lezione),
    },
  ]
}

/**
 * Il tasto destro sul vuoto: un giorno, e nella settimana un'ora. Guardando
 * porta a quel giorno e offre la modifica; in modifica mette un'ora lì (subito
 * con il filtro del corso, altrimenti con il modulo compilato).
 */
export function menuGiorno (evento: MouseEvent, data: Iso, minuto?: number): void {
  const ora = minuto === undefined ? undefined : oraDaMinuti(minuto)
  const titolo = `${formattaData(data, 'lungo')}${ora ? ` · ${ora}` : ''}`
  const t = testi()
  const vai: ElementoMenu = {
    testo: t.vaiAlGiorno,
    simbolo: 'calendario',
    al: () => aggiorna({ data, modoCalendario: 'settimana' }),
  }
  if (!inModifica()) {
    menuContestuale(evento, [
      { titolo },
      vai,
      {
        testo: t.modificaCalendario,
        simbolo: 'matita',
        scorciatoia: 'Ctrl+E',
        al: () => entraInModifica(),
      },
    ])
    return
  }
  const corso = corsoDelleNuove()
  const quando = ora ? t.alle(ora) : t.inQuestoGiorno
  // Con il filtro l'ora nasce subito; il modulo resta per scegliere altro.
  const conModulo: ElementoMenu[] = corso
    ? [{
        testo: t.nuovaConModulo,
        simbolo: 'matita',
        al: () => moduloLezione({ data, corsoId: corso, ...(ora ? { oraProposta: ora } : {}) }),
      }]
    : []
  menuContestuale(evento, [
    { titolo },
    {
      testo: corso ? t.nuovaDi(quando, nomeCorso(corso)) : t.nuova(quando),
      simbolo: 'piu',
      al: () => creaAlle(data, minuto ?? null),
    },
    ...conModulo,
    'separatore',
    ...(stato.modoCalendario === 'mese' ? [vai] : []),
    { testo: t.esci, simbolo: 'spunta', scorciatoia: 'Esc', al: () => esci() },
  ])
}
