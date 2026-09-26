import { valutazioniOrfane } from '../../../core/dominio/orphans.js'
import { definisci } from '../../contract.js'
import { elenco, identificatore, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { esigiClasse, esigiCorso } from '../common/register.js'
import { parole } from '../../../core/dominio/words.testi.js'
import { testi } from './valutazioni.testi.js'

const t = () => testi().orfane
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'valutazioni.orfane',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
  }),
  uscita: oggetto({
    orfane: elenco(
      oggetto({
        id: identificatore(),
        titolo: testo(),
        corsoId: identificatore(),
        data: testo(),
        motivo: testo(),
        voti: numero(),
      }),
    ),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'tabella',
        da: 'orfane',
        colonne: [
          { campo: 'titolo', testo: () => p().prova },
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'motivo', testo: () => p().motivo },
          { campo: 'voti', testo: () => p().voti, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const registro = ambito.contesto.registro
    let corsiIds: string[] | undefined
    if (ingresso.corsoId) {
      esigiCorso(ambito, ingresso.corsoId)
      corsiIds = [ingresso.corsoId]
    } else if (ingresso.classeId) {
      const classe = esigiClasse(ambito, ingresso.classeId)
      corsiIds = registro.corsi.filter((c) => c.classeId === classe.id).map((c) => c.id)
    }
    const orfane = valutazioniOrfane(registro, corsiIds)
    return {
      orfane: orfane.map((o) => ({
        id: o.momento.id,
        titolo: o.momento.titolo,
        corsoId: o.momento.corsoId,
        data: o.momento.data,
        motivo: o.motivo,
        voti: o.voti,
      })),
    }
  },
})
