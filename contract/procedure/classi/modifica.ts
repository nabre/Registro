import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, identificatore, oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { testi } from './classi.testi.js'

const t = () => testi().modifica

export const procedura = scrittura({
  nome: 'classi.modifica',
  titolo: () => t().titolo,
  azione: 'classe.modifica',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore({ aiuto: () => t().classeId }),
    nome: opzionale(testo({ massimo: 120, aiuto: () => t().nome })),
    colore: opzionale(testo({ aiuto: () => t().colore })),
    note: opzionale(testo({ aiuto: () => t().note })),
    docenteDiClasse: opzionale(booleano({ aiuto: () => t().docenteDiClasse })),
    archiviata: opzionale(booleano({ aiuto: () => t().archiviata })),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    return inoltra(registro, 'classe.modifica')(ambito, ingresso)
  },
})
