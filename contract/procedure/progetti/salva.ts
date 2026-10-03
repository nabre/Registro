import { progetti } from '#core/azioni/projects.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { ProgettoDaSalvare } from '#contract/protocol.js'
import { validaProgetto } from '#core/dominio/validation.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, entita, oggetto, opzionale } from '#contract/schemas.js'
import { testi } from './progetti.testi.js'

const t = () => testi().salva

/**
 * La testata e nient'altro. Un chiamante scritto per il progetto di un corso
 * manda ancora corso, stato e lavoro con la classe: sono dell'integrazione, e
 * hanno le loro procedure; lasciati passare finirebbero nella testata.
 */
function soloTestata (progetto: ProgettoDaSalvare): ProgettoDaSalvare {
  const {
    corsoId: _corso, stato: _stato, compiti: _compiti, giudizi: _giudizi, matrice: _matrice,
    integrazioni: _integrazioni, ...testata
  } = progetto as ProgettoDaSalvare & Record<string, unknown>
  return testata
}

export const procedura = scrittura({
  nome: 'progetti.salva',
  titolo: () => t().titolo,
  azione: 'progetto.salva',
  // Lo schema esige l'id: la seconda chiamata riscrive lo stesso progetto.
  idempotente: true,
  // `piani` quando una fase tolta sposta le tappe che vi cadevano.
  collezioni: ['progetti', 'piani'],
  ingresso: oggetto({
    // Il merito lo giudica `validaProgetto` (titolo, fasi, criteri, scala).
    progetto: entita<ProgettoDaSalvare>({
      cosa: () => Uno(lessico().progetto),
      valida: validaProgetto,
      aiuto: () => t().progetto,
    }),
    scartaCelle: opzionale(booleano({ aiuto: () => t().scartaCelle })),
  }),
  // Un id che non c'è vuol dire «crealo»: il progetto è dell'anno, nessun corso da guardare.
  esegui: (ambito, ingresso) =>
    inoltra(progetti, 'progetto.salva')(ambito, { ...ingresso, progetto: soloTestata(ingresso.progetto) }),
})
