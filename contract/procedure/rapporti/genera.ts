import { rapporti } from '#core/azioni/reports.js'
import type { GenereRapporto } from '#core/dominio/locations.js'
import { errore, type Ambito, type NomeTermine } from '#contract/contract.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, identificatore, nullabile, oggetto, opzionale, scelta } from '#contract/schemas.js'
import { GENERI } from '#contract/procedure/common/reports.js'
import { testi } from './rapporti.testi.js'

const t = () => testi().genera

/**
 * Quel che si sta per stampare esiste, e il «non trovato» nomina il genere
 * giusto (otto generi, otto raccolte), con il codice `non-trovato` invece del
 * rifiuto del gestore.
 */
function esigiSoggetto (
  ambito: Ambito,
  genere: GenereRapporto,
  id: string,
  allievoId: string | null,
): void {
  const r = ambito.contesto.registro
  const c = (esiste: boolean, cosa: NomeTermine) => {
    if (!esiste) throw errore.nonTrovato(cosa)
  }
  switch (genere) {
    case 'lezione':
      return c(r.lezioni.some((l) => l.id === id), 'lezione')
    case 'piano':
      return c(r.piani.some((p) => p.id === id), 'pianoLezione')
    case 'valutazioni':
    case 'presenze':
    case 'diario':
    case 'corso':
    case 'supplenze':
      return c(r.corsi.some((corso) => corso.id === id), 'corso')
    case 'momento':
      return c(r.valutazioni.some((v) => v.id === id), 'momento')
    case 'fascicolo':
      return c(r.classi.some((classe) => classe.id === id), 'classe')
    case 'foto-classe':
      // La parete di ritratti si chiede da un corso o dalla classe: il gestore
      // accetta tutti e due.
      return c(
        r.corsi.some((corso) => corso.id === id) || r.classi.some((classe) => classe.id === id),
        'classe',
      )
    case 'allievo':
      return c(r.classi.some((classe) => classe.allievi.some((a) => a.id === id)), 'pif')
    case 'progetto-classe':
      return c(r.progetti.some((p) => p.id === id), 'progetto')
    case 'progetto-allievo': {
      // Il progetto, e una persona della sua classe: il foglio è di lei.
      const progetto = r.progetti.find((p) => p.id === id)
      c(Boolean(progetto), 'progetto')
      const corso = r.corsi.find((k) => k.id === progetto?.corsoId)
      const classe = r.classi.find((k) => k.id === corso?.classeId)
      return c(Boolean(allievoId && classe?.allievi.some((a) => a.id === allievoId)), 'pif')
    }
  }
}

export const procedura = scrittura({
  nome: 'rapporti.genera',
  titolo: () => t().titolo,
  azione: 'rapporto.genera',
  // Lo stesso foglio rifatto sta allo stesso percorso con lo stesso contenuto.
  idempotente: true,
  // Scrive un PDF dentro il documento dell'anno, non una raccolta del registro.
  collezioni: [],
  ingresso: oggetto({
    genere: scelta(GENERI, { aiuto: () => t().genere }),
    id: identificatore({ aiuto: () => t().id }),
    corsoId: opzionale(nullabile(identificatore({
      aiuto: () => t().corsoId,
    }))),
    semestreId: opzionale(nullabile(identificatore({
      aiuto: () => t().semestreId,
    }))),
    docenteDiClasse: opzionale(booleano({
      aiuto: () => t().docenteDiClasse,
    })),
    allievoId: opzionale(nullabile(identificatore({
      aiuto: () => t().allievoId,
    }))),
  }),
  esegui: (ambito, ingresso) => {
    esigiSoggetto(ambito, ingresso.genere, ingresso.id, ingresso.allievoId ?? null)
    return inoltra(rapporti, 'rapporto.genera')(ambito, ingresso)
  },
})
