// I comandi dell'ora aperta: i suoi tre stati.

import { lezioneFinita } from '#core/dominio/calculations.js'
import { lezioneCompilata } from '#core/dominio/courses.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Lezione, StatoLezione } from '#core/dominio/models.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import type { NomeIcona } from '#ui/components/icons.js'
import { conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione } from '#ui/bridge.js'
import { lezioneDelContesto, senzaLezione } from '#ui/context.js'
import { stato } from '#ui/state.js'
import { testi } from './lesson.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi

/**
 * Nome e spiegazione dei tre stati di un'ora. Un `Record` perché uno stato
 * nuovo nel dominio non compili senza pulsante; l'ordine sta a parte.
 */
const STATI_ORA: Record<StatoLezione, { testo: string, simbolo: NomeIcona, aiuto: string }> = {
  pianificata: {
    testo: lessico().statiLezione.pianificata,
    simbolo: 'calendario',
    aiuto: t.statiOra.pianificata,
  },
  svolta: {
    testo: lessico().statiLezione.svolta,
    simbolo: 'spunta',
    aiuto: t.statiOra.svolta,
  },
  annullata: {
    testo: lessico().statiLezione.annullata,
    simbolo: 'chiudi',
    aiuto: t.statiOra.annullata,
  },
}

/** Nell'ordine in cui un'ora li attraversa: prima, fatta, saltata. */
const ORDINE_STATI: readonly StatoLezione[] = ['pianificata', 'svolta', 'annullata']

/** Segna l'ora svolta, annullata o di nuovo pianificata. */
async function segnaLezione (lezione: Lezione, nuovo: Lezione['stato']): Promise<void> {
  const risposta = await azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: nuovo })
  if (!risposta.ok) return
  notifica(t.segnata[nuovo], nuovo === 'annullata' ? 'avviso' : 'successo')
}

/** Com'è messa l'ora aperta, o `null` se non ce n'è una. */
function statoLezione (): Lezione['stato'] | null {
  return lezioneDelContesto()?.stato ?? null
}

export const COMANDI_LEZIONE: readonly ComandoUI[] = [
  // -------------------------------------------------------------- L'ora aperta
  //
  // I tre stati dell'ora, un pulsante ciascuno con acceso quello in vigore: lo
  // stato si legge guardandoli, e si preme dove si vuole andare.
  ...ORDINE_STATI.map((valore): ComandoUI => ({
    id: `lezione.stato.${valore}`,
    titolo: STATI_ORA[valore].testo,
    simbolo: STATI_ORA[valore].simbolo,
    dove: ['lezione'],
    gruppo: G.statoDellOra,
    aiuto: STATI_ORA[valore].aiuto,
    // «Svolta» chiude l'ora: finché non è fatto si vede più degli altri.
    primario: () => {
      const lezione = lezioneDelContesto()
      return valore === 'svolta' && lezione !== null && lezione.stato !== 'svolta' &&
        lezioneFinita(lezione, stato.adessoData, stato.adessoOra)
    },
    acceso: () => statoLezione() === valore,
    impedimento: () => {
      const lezione = lezioneDelContesto()
      if (!lezione) return senzaLezione()
      // Si conclude solo un'ora il cui tempo è passato.
      if (valore === 'svolta' && lezione.stato !== 'svolta' && !lezioneFinita(lezione, stato.adessoData, stato.adessoOra)) {
        return t.nonFinita
      }
      // Si annulla solo un'ora vuota: quella compilata è successa.
      if (valore === 'annullata' && lezione.stato !== 'annullata' &&
        lezioneCompilata(stato.registro, lezione)) {
        return t.nonAnnullabile
      }
      return null
    },
    al: async () => {
      const lezione = lezioneDelContesto()
      // Premere lo stato in cui l'ora è già non fa niente.
      if (!lezione || lezione.stato === valore) return
      if (valore === 'annullata') {
        const sicuro = await conferma({
          titolo: t.annullareTitolo,
          // Il piano da solo non impedisce di annullare, ma si stacca: lo si dice.
          testo: lezione.pianoId ? t.annullareConPiano : t.annullareTesto,
          testoConferma: t.annullareConferma,
        })
        if (!sicuro) return
      }
      await segnaLezione(lezione, valore)
    },
  })),
]
