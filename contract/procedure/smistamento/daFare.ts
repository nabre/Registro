// I file da smistare e dividere nelle consegne della classe.

import { definisci } from '#contract/contract.js'
import {
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  opzionale,
  testo,
} from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { testi } from './smistamento.testi.js'

const t = () => testi().daFare
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'smistamento.daFare',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
  }),
  uscita: oggetto({
    totaleFile: numero({ intero: true, aiuto: () => p().totaleFile }),
    totalePagine: numero({ intero: true, aiuto: () => p().totalePagine }),
    file: elenco(oggetto({
      id: testo(),
      nome: testo({ aiuto: () => p().file }),
      file: testo(),
      classeId: nullabile(testo()),
      classe: nullabile(testo()),
      consegnaId: nullabile(testo()),
      pagine: numero({ intero: true }),
      pagineRimanenti: numero({ intero: true }),
      arrivatoIl: testo({ aiuto: () => p().arrivato }),
      errore: nullabile(testo()),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'totaleFile', etichetta: () => p().totaleFile, formato: 'numero' },
          { campo: 'totalePagine', etichetta: () => p().totalePagine, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'file',
        colonne: [
          { campo: 'nome', testo: () => p().file },
          { campo: 'classe', testo: () => p().classe },
          { campo: 'pagineRimanenti', testo: () => p().pagine, formato: 'numero' },
          { campo: 'arrivatoIl', testo: () => p().arrivato, formato: 'data' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)

    const classi = new Map(r.classi.map((c) => [c.id, c.nome]))
    let elencoSmistamenti = r.smistamenti
    if (ingresso.classeId) {
      elencoSmistamenti = elencoSmistamenti.filter((s) => s.classeId === ingresso.classeId)
    }

    const file = elencoSmistamenti.map((s) => {
      const restanti = s.blocchi.reduce((tot, b) => tot + (b.a - b.da + 1), 0)
      return {
        id: s.id,
        nome: s.nome,
        file: s.file,
        classeId: s.classeId,
        classe: s.classeId ? (classi.get(s.classeId) ?? null) : null,
        consegnaId: s.consegnaId,
        pagine: s.pagine,
        pagineRimanenti: restanti || s.pagine,
        arrivatoIl: s.arrivatoIl,
        errore: s.errore ?? null,
      }
    })

    const totalePagine = file.reduce((somma, f) => somma + f.pagineRimanenti, 0)

    return {
      totaleFile: file.length,
      totalePagine,
      file,
    }
  },
})
