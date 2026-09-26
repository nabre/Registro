import { riparazioni } from '../../../domain/repairs.js'
import { riferimentiRotti } from '../../../domain/integrity.js'
import { definisci } from '../../contract.js'
import { elenco, oggetto, testo, vuoto } from '../../schemas.js'
import { testi } from './registro.testi.js'

const t = () => testi().integrita
const p = () => t().presentazione

/**
 * Che cosa non torna nel registro, e che cosa si saprebbe aggiustare:
 * `riferimentiRotti` elenca le rotture, `riparazioni` quelle che il registro
 * corregge da solo senza perdere niente.
 *
 * Solo la diagnosi: la closure `applica` di ogni `Riparazione` qui non si
 * chiama (una lettura non tocca il registro); per applicare c'è
 * `manutenzione.ripara`.
 */
export const procedura = definisci({
  nome: 'registro.integrita',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Manutenzione: si guarda dalla pagina apposta, non in conversazione.
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    riferimentiRotti: elenco(testo(), { aiuto: () => t().riferimentiRotti }),
    riparazioni: elenco(oggetto({
      titolo: testo({ aiuto: () => t().titoloRiparazione }),
      dettaglio: testo({ aiuto: () => t().dettaglio }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      { tipo: 'elenco', da: 'riferimentiRotti', titolo: () => p().riferimentiRotti },
      {
        tipo: 'tabella',
        da: 'riparazioni',
        titolo: () => p().correzioni,
        colonne: [
          { campo: 'titolo', testo: () => p().correzione },
          { campo: 'dettaglio', testo: () => p().cheCosaTocca },
        ],
      },
    ],
  },
  esegui: (ambito) => {
    const r = ambito.contesto.registro
    return {
      riferimentiRotti: riferimentiRotti(r),
      riparazioni: riparazioni(r).map((riparazione) => ({
        titolo: riparazione.descrizione,
        dettaglio: riparazione.collezioni.join(', '),
      })),
    }
  },
})
