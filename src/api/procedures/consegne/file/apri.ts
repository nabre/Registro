import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { chiRiguarda, esigiConsegna } from '../common.js'
import { testi } from '../consegne.testi.js'

const t = () => testi().file.apri

export const procedura = scrittura({
  nome: 'consegne.file.apri',
  // Apre un documento con il programma del sistema: non cambia il registro
  // (`collezioni` vuoto), ma è un effetto sul mondo. Il canale delle domande
  // salta la coda delle scritture, e ciò che ci passa deve essere innocuo.
  titolo: () => t().titolo,
  azione: 'consegna.file.apri',
  idempotente: true,
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiRiguarda(() => t().chi),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    // Che il documento esista lo dice il gestore, con `documentoPer` (che conosce
    // anche il file unico per tutti).
    return inoltra(docenteClasse, 'consegna.file.apri')(ambito, ingresso)
  },
})
