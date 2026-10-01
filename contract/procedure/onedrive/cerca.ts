// Tutti i documenti `.regi` di un account, dal più recente: nelle cartelle
// sincronizzate sul computer, o altrimenti quelli che Microsoft trova, suoi e
// condivisi con lui.

import { definisci } from '#contract/contract.js'
import { cercaRegi } from '#core/dati/onedrive.js'
import { booleano, elenco, nullabile, oggetto, scelta, testo } from '#contract/schemas.js'
import { daOneDrive, VOCE } from './common.js'
import { testi } from './onedrive.testi.js'

const t = () => testi().cerca
const p = () => testi().elenco.presentazione

export const procedura = definisci({
  nome: 'onedrive.cerca',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Come `onedrive.elenco`: richieste a Microsoft a nome di chi è entrato.
  perAssistente: false,
  ingresso: oggetto({
    account: testo({ aiuto: () => testi().elenco.account, esempio: 'nome.cognome@scuola.ch' }),
  }),
  uscita: oggetto({
    voci: elenco(VOCE),
    troncato: booleano({ aiuto: () => t().troncato }),
    motivo: nullabile(scelta(['troppi', 'tempo'], { aiuto: () => t().motivo })),
    locale: booleano({ aiuto: () => testi().voce.locale }),
  }),
  presentazione: {
    titolo: () => t().presentazione,
    blocchi: [
      {
        tipo: 'tabella',
        da: 'voci',
        colonne: [
          { campo: 'nome', testo: () => p().nome },
          { campo: 'percorso', testo: () => p().percorso, formato: 'elenco' },
          { campo: 'dimensione', testo: () => p().dimensione, formato: 'byte' },
          { campo: 'modificato', testo: () => p().modificato },
        ],
      },
    ],
  },
  esegui: async (_ambito, ingresso) => await daOneDrive(() => cercaRegi(ingresso.account)),
})
