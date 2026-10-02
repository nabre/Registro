// La scaletta indicativa vive nel progetto; le durate delle sue occorrenze nei
// piani restano locali. La modale modifica una sola fase e rilegge il resto.
import type { Attivita, AttivitaProgetto } from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { apriModale } from '#ui/components/modal.js'
import { h } from '#ui/dom.js'
import { classeDelCorsoId, progettoPerId } from '#ui/state.js'
import { baseViva, salva } from './common.js'
import { editorAttivita } from './planActivity.js'
import { testi } from './projectPlan.testi.js'

export function moduloScalettaProgetto (progettoId: string, faseId: string): void {
  const iniziale = progettoPerId(progettoId)
  const fase = iniziale?.fasi.find((f) => f.id === faseId)
  if (!iniziale || !fase) return
  const t = testi()
  let attivita: Attivita[] = (iniziale.attivita ?? [])
    .filter((a) => a.faseId === faseId)
    .map((a) => ({
      ...a,
      parametri: a.parametri ? structuredClone(a.parametri) : undefined,
      valutazione: a.valutazione ? { ...a.valutazione } : undefined,
      risorse: [],
    }))
  apriModale({
    titolo: t.scaletta,
    sottotitolo: `${iniziale.titolo} › ${fase.titolo}`,
    aiuto: t.aiuto,
    larghezza: 'larga',
    corpo: () => h('div', { class: 'modulo' },
      h('p', { class: 'testo-quieto' }, t.indicativa),
      editorAttivita(
        attivita,
        (nuove) => { attivita = nuove },
        null,
        undefined,
        () => classeDelCorsoId(iniziale.corsoId)?.docenteDiClasse ?? false,
        iniziale.corsoId,
        { nascondiProgetto: true },
      ),
    ),
    alSalva: async (_valori, contesto) => {
      const vivo = baseViva(contesto, true, iniziale, progettoPerId(progettoId))
      if (!vivo) return
      if (!vivo.fasi.some((f) => f.id === faseId)) {
        contesto.mostraErrori([t.faseSparita])
        return
      }
      const scritte: AttivitaProgetto[] = attivita.map((a) => {
        const { risorse, progettoId, faseProgettoId, attivitaProgettoId, ...contenuto } = a
        void risorse
        void progettoId
        void faseProgettoId
        void attivitaProgettoId
        return { ...contenuto, titolo: a.titolo.trim() || parole().senzaTitolo, faseId }
      })
      await salva(contesto, {
        tipo: 'progetto.salva',
        progetto: {
          ...vivo,
          attivita: [...(vivo.attivita ?? []).filter((a) => a.faseId !== faseId), ...scritte],
        },
      }, t.salvata)
    },
  })
}
