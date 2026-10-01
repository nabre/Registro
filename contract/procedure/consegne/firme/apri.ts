import { docenteClasse } from '#core/azioni/classTeacher.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiConsegna } from '#contract/procedure/consegne/common.js'
import { testi } from '#contract/procedure/consegne/consegne.testi.js'

export const procedura = scrittura({
  nome: 'consegne.firme.apri',
  // Apre un documento con il programma del sistema: non cambia il registro
  // (`collezioni` vuoto), ma è un effetto sul mondo. Il canale delle domande
  // salta la coda delle scritture, e ciò che ci passa deve essere innocuo.
  titolo: () => testi().firme.apri.titolo,
  azione: 'consegna.firme.apri',
  idempotente: true,
  ingresso: oggetto({
    consegnaId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(docenteClasse, 'consegna.firme.apri')(ambito, ingresso)
  },
})
