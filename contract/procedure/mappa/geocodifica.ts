import { mappa } from '#core/azioni/map.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, elenco, identificatore, oggetto, opzionale } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { testi } from './mappa.testi.js'

const t = () => testi().geocodifica

/**
 * Cerca le coordinate degli indirizzi che non le hanno, sul geocodificatore di
 * OpenStreetMap, una domanda al secondo, con attesa sincrona nel gestore.
 *
 * Non idempotente: un giro ne risolve al massimo sessanta, e la chiamata dopo
 * riparte da dove la prima si è fermata. `rifaiTutto` rimette in fila anche
 * quelli già risolti.
 */
export const procedura = scrittura({
  nome: 'mappa.geocodifica',
  titolo: () => t().titolo,
  azione: 'mappa.geocodifica',
  idempotente: false,
  collezioni: ['coordinate'],
  ingresso: oggetto({
    classeIds: opzionale(elenco(identificatore(), {
      aiuto: () => t().classeIds,
    })),
    allievoId: opzionale(identificatore({ aiuto: () => t().allievoId })),
    rifaiTutto: opzionale(booleano({ aiuto: () => t().rifaiTutto })),
  }),
  esegui: (ambito, ingresso) => {
    // Solo che la classe esista: archiviata o senza indirizzi lo dice il gestore.
    for (const id of ingresso.classeIds ?? []) esigiClasse(ambito, id)
    return inoltra(mappa, 'mappa.geocodifica')(ambito, ingresso)
  },
})
