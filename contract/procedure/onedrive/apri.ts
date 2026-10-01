import { microsoft } from '#core/azioni/microsoft.js'
import { inoltra, scrittura } from '#contract/core.js'
import { oggetto, testo } from '#contract/schemas.js'
import { testi } from './onedrive.testi.js'

const t = () => testi().apri

export const procedura = scrittura({
  nome: 'onedrive.apri',
  titolo: () => t().titolo,
  azione: 'onedrive.apri',
  // Senza copia sincronizzata chiede dove scaricare: ripeterla richiede di nuovo.
  idempotente: false,
  // Cambia il documento aperto, come `documento.apri`; il registro in sé no.
  collezioni: [],
  documento: 'cambia',
  ingresso: oggetto({
    account: testo({ aiuto: () => testi().elenco.account, esempio: 'nome.cognome@scuola.ch' }),
    drive: testo({ aiuto: () => t().drive }),
    id: testo({ aiuto: () => t().id }),
  }),
  esegui: inoltra(microsoft, 'onedrive.apri'),
})
