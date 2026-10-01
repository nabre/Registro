import { progetti } from '#core/azioni/projects.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { ProgettoDaSalvare } from '#contract/protocol.js'
import { validaProgetto } from '#core/dominio/validation.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, entita, oggetto, opzionale } from '#contract/schemas.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
import { testi } from './progetti.testi.js'

const t = () => testi().salva

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
  // Un id che non c'è vuol dire «crealo»: si guarda solo il corso.
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.progetto.corsoId)
    return inoltra(progetti, 'progetto.salva')(ambito, ingresso)
  },
})
