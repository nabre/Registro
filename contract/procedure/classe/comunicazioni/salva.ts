import { docenteClasse } from '#core/azioni/classTeacher.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Comunicazione } from '#core/dominio/models.js'
import { validaComunicazione } from '#core/dominio/validation.js'
import { inoltra, scrittura } from '#contract/core.js'
import { entita, identificatore, oggetto } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { testi } from '#contract/procedure/classe/classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.comunicazioni.salva',
  titolo: () => testi().comunicazioni.salva.titolo,
  azione: 'comunicazione.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazione: entita<Comunicazione>({
      cosa: () => Uno(lessico().comunicazione),
      valida: validaComunicazione,
    }),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return inoltra(docenteClasse, 'comunicazione.salva')(ambito, ingresso)
  },
})
