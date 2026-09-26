// Le classi di un altro anno, cioè di un altro documento `.regi`, letto e non
// aperto (`Archivio.leggiAltroAnno`): servono a «Importa classe dall'anno…».
//
// Non va al modello (`perAssistente: false`): legge un file scelto da chi
// chiama, come gli indirizzi di `llm.catalogo`.

import * as apparato from 'apparato'

import { corsiDellaClasse, materiaDelCorso } from '../../../domain/courses.js'
import { confrontaNomi } from '../../../domain/text.js'
import { definisci, errore } from '../../contract.js'
import { elenco, identificatore, numero, oggetto, testo } from '../../schemas.js'
import { testi } from './classi.testi.js'

const t = () => testi().altrove
const c = () => testi().comune

export const procedura = definisci({
  nome: 'classi.altrove',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  perAssistente: false,
  ingresso: oggetto({
    percorso: testo({ minimo: 1, aiuto: () => c().percorso }),
  }),
  uscita: oggetto({
    anno: testo({ aiuto: () => t().anno }),
    classi: elenco(oggetto({
      id: identificatore({ aiuto: () => t().id }),
      nome: testo(),
      persone: numero({ intero: true, aiuto: () => t().persone }),
      materie: elenco(testo(), { aiuto: () => t().materie }),
    })),
  }),
  presentazione: {
    titolo: () => t().presentazione.titolo,
    blocchi: [
      { tipo: 'valori', campi: [{ campo: 'anno', etichetta: () => c().annoScolastico }] },
      {
        tipo: 'tabella',
        da: 'classi',
        colonne: [
          { campo: 'nome', testo: () => c().classe },
          { campo: 'persone', testo: () => c().persone, formato: 'numero' },
          { campo: 'materie', testo: () => c().materie, formato: 'elenco' },
        ],
      },
    ],
  },
  esegui: async (ambito, ingresso) => {
    const file = apparato.Uri.file(ingresso.percorso)
    const letto = await ambito.contesto.archivio.leggiAltroAnno(file)
    if ('errore' in letto) throw errore.rifiuta(letto.errore)
    const r = letto.registro
    return {
      anno: r.anni[0]?.etichetta ?? '',
      // Anche le archiviate: la classe dell'anno scorso spesso lo è.
      classi: [...r.classi]
        .sort((a, b) => confrontaNomi(a.nome, b.nome))
        .map((classe) => ({
          id: classe.id,
          nome: classe.nome,
          persone: classe.allievi.length,
          materie: [...new Set(corsiDellaClasse(r, classe.id).map((c) => materiaDelCorso(r, c)?.nome ?? ''))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'it')),
        })),
    }
  },
})
