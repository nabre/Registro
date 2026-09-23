import { mappa } from '../../../actions/map.js'
import { SCUOLA } from '../../../domain/lexicon.js'
import { definisci, errore } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { booleano, elenco, identificatore, oggetto, opzionale } from '../../schemas.js'

/**
 * Cerca le coordinate degli indirizzi che non le hanno.
 *
 * **Non è idempotente, e non per prudenza.** Esce sulla rete — il
 * geocodificatore di OpenStreetMap, una domanda al secondo — e dentro il
 * gestore l'attesa è sincrona e bloccante: non c'è una coda che ricompone il
 * lavoro, come per la lettura delle scansioni. E soprattutto un giro ne fa al
 * massimo sessanta: con duecento indirizzi da risolvere, chiamarla due volte
 * non lascia il registro come chiamarla una volta — la seconda riparte da dove
 * la prima si era fermata, ed è proprio il modo in cui è pensata. Con
 * `rifaiTutto` rimette in fila anche quelli già risolti.
 */
export const procedura = definisci({
  nome: 'mappa.geocodifica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Cerca in rete le coordinate degli indirizzi dell’anagrafica',
  azione: 'mappa.geocodifica',
  idempotente: false,
  collezioni: ['coordinate'],
  ingresso: oggetto({
    classeIds: opzionale(elenco(identificatore(), {
      aiuto: 'Senza, tutte le classi non archiviate',
    })),
    allievoId: opzionale(identificatore({ aiuto: 'Solo gli indirizzi di questa persona' })),
    rifaiTutto: opzionale(booleano({ aiuto: 'Rimette in fila anche quelli già trovati' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Solo che la classe esista: che sia archiviata o senza indirizzi da
    // cercare lo dice il gestore, con la frase giusta.
    for (const id of ingresso.classeIds ?? []) {
      if (!r.classi.some((classe) => classe.id === id)) throw errore.nonTrovato(SCUOLA.classe)
    }
    return daGestore(mappa['mappa.geocodifica'], (i: typeof ingresso) => ({
      tipo: 'mappa.geocodifica' as const, ...i,
    }))(ambito, ingresso)
  },
})
