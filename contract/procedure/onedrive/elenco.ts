// Una cartella di OneDrive: le sottocartelle e i documenti `.regi`. Gli altri
// file si contano soltanto: al registro non servono.

import { definisci } from '#contract/contract.js'
import { elencaCartella } from '#core/dati/onedrive.js'
import { booleano, elenco, nullabile, numero, oggetto, opzionale, testo } from '#contract/schemas.js'
import { daOneDrive, VOCE } from './common.js'
import { testi } from './onedrive.testi.js'

const t = () => testi().elenco
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'onedrive.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Fuori dalla mano del modello: ogni chiamata è una richiesta a Microsoft a
  // nome di chi è entrato, e i nomi dei file non gli servono.
  perAssistente: false,
  ingresso: oggetto({
    account: testo({ aiuto: () => t().account, esempio: 'nome.cognome@scuola.ch' }),
    drive: opzionale(testo({ aiuto: () => t().drive })),
    cartella: opzionale(testo({ aiuto: () => t().cartella })),
  }),
  uscita: oggetto({
    account: testo(),
    drive: testo({ aiuto: () => t().driveUscita }),
    cartella: nullabile(testo({ aiuto: () => t().cartellaUscita })),
    nome: testo({ aiuto: () => t().nome }),
    percorso: elenco(testo(), { aiuto: () => t().percorso }),
    superiore: nullabile(testo({ aiuto: () => t().superiore })),
    voci: elenco(VOCE),
    altri: numero({ aiuto: () => t().altri }),
    troncato: booleano({ aiuto: () => t().troncato }),
    locale: booleano({ aiuto: () => testi().voce.locale }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'account', etichetta: () => p().account },
          { campo: 'nome', etichetta: () => p().cartella },
          { campo: 'percorso', etichetta: () => p().percorso, formato: 'elenco' },
          { campo: 'altri', etichetta: () => p().altri, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'voci',
        colonne: [
          { campo: 'nome', testo: () => p().nome },
          { campo: 'genere', testo: () => p().genere },
          { campo: 'dimensione', testo: () => p().dimensione, formato: 'byte' },
          { campo: 'modificato', testo: () => p().modificato },
        ],
      },
    ],
  },
  esegui: async (_ambito, ingresso) =>
    await daOneDrive(() => elencaCartella(ingresso.account, ingresso.drive, ingresso.cartella)),
})
