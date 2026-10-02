// La scaletta del progetto condivide il contenuto, non i tempi né gli allegati d'aula.
import { unitaDidattiche } from './calculations.js'
import { durataMinuti } from './dates.js'
import { nuovoIdAttivita } from './identifiers.js'
import type { Attivita, AttivitaProgetto, Lezione, PianoLezione, Progetto, Registro } from './models.js'

/** I soli campi che una modifica deve portare alle altre occorrenze. */
export function contenutoAttivita (attivita: Attivita | AttivitaProgetto) {
  const { titolo, tipo, descrizione, materiali, raggruppamento, parametri, valutazione } = attivita
  return { titolo, tipo, descrizione, materiali, raggruppamento, parametri, valutazione }
}

export function stessoContenutoAttivita (
  prima: Attivita | AttivitaProgetto, dopo: Attivita | AttivitaProgetto,
): boolean {
  return JSON.stringify(contenutoAttivita(prima)) === JSON.stringify(contenutoAttivita(dopo))
}

/** Le istanze restano riconoscibili dal consuntivo, anche quando cambia la preparazione. */
export function sincronizzaPianiDelProgetto (piani: PianoLezione[], progetto: Progetto): boolean {
  let cambiati = false
  for (const piano of piani) {
    for (const attivita of piano.attivita) {
      if (attivita.progettoId !== progetto.id || !attivita.attivitaProgettoId) continue
      const origine = progetto.attivita?.find((a) => a.id === attivita.attivitaProgettoId)
      if (!origine) {
        attivita.attivitaProgettoId = null
        cambiati = true
        continue
      }
      if (!stessoContenutoAttivita(attivita, origine) ||
        attivita.faseProgettoId !== origine.faseId) {
        Object.assign(attivita, structuredClone(contenutoAttivita(origine)), {
          faseProgettoId: origine.faseId,
        })
        cambiati = true
      }
    }
  }
  return cambiati
}

function tempoLocale (
  registro: Registro, lezione?: Lezione | null,
): { capacita: number | null, cambio: number } {
  if (!lezione) return { capacita: null, cambio: 1 }
  const unita = unitaDidattiche(lezione, registro.impostazioni.minutiUd)
  const minuti = unita.reduce((somma, u) => somma + durataMinuti(u.inizio, u.fine), 0)
  return {
    capacita: unita.length,
    cambio: minuti > 0 ? registro.impostazioni.minutiUd * unita.length / minuti : 1,
  }
}

export function propostaImportazione (
  registro: Registro, piano: PianoLezione, progetto: Progetto,
  faseId: string | null, ids: readonly string[], lezione?: Lezione | null,
): { candidati: AttivitaProgetto[], importabili: AttivitaProgetto[], restanti: AttivitaProgetto[],
  disponibiliUd: number | null, residuoUd: number | null } {
  const tempo = tempoLocale(registro, lezione)
  const presenti = new Set(piano.attivita.filter((a) => a.progettoId === progetto.id)
    .map((a) => a.attivitaProgettoId))
  const altroCorso = piano.corsoId !== progetto.corsoId ||
    (lezione && lezione.corsoId !== progetto.corsoId)
  const candidati = altroCorso ? [] : (progetto.attivita ?? []).filter((a) =>
    (!faseId || a.faseId === faseId) && ids.includes(a.id) && !presenti.has(a.id))
  const disponibiliUd = tempo.capacita === null ? null
    : Math.max(0, tempo.capacita - piano.attivita.reduce((somma, a) => somma + a.durataUd, 0))
  let residuoUd = disponibiliUd
  const importabili: AttivitaProgetto[] = []
  for (const candidato of candidati) {
    const durata = candidato.durataUd * tempo.cambio
    if (residuoUd !== null && durata - residuoUd > 1e-9) break
    importabili.push(candidato)
    if (residuoUd !== null) residuoUd = Math.max(0, residuoUd - durata)
  }
  return {
    candidati, importabili, restanti: candidati.slice(importabili.length), disponibiliUd, residuoUd,
  }
}

export function importaAttivitaDelProgetto (
  registro: Registro, piano: PianoLezione, progetto: Progetto,
  faseId: string | null, ids: readonly string[], lezione?: Lezione | null,
): PianoLezione {
  const proposta = propostaImportazione(registro, piano, progetto, faseId, ids, lezione)
  const { cambio } = tempoLocale(registro, lezione)
  return { ...structuredClone(piano), attivita: [
    ...structuredClone(piano.attivita),
    ...proposta.importabili.map((a) => ({
      ...structuredClone(contenutoAttivita(a)), id: nuovoIdAttivita(),
      durataUd: a.durataUd * cambio, risorse: [],
      progettoId: progetto.id, faseProgettoId: a.faseId, attivitaProgettoId: a.id,
    })),
  ] }
}
