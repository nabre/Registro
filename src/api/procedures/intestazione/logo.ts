import { modelli } from '../../../actions/templates.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { testi } from './intestazione.testi.js'

/**
 * Non idempotente: il file lo sceglie un dialogo, e ogni volta può essere un
 * altro (o nessuno). Il logo si copia nel documento e il JSON ne tiene il
 * percorso: è l'immagine che i modelli dei rapporti chiedono per nome.
 */
export const procedura = scrittura({
  nome: 'intestazione.logo',
  titolo: () => testi().logo.titolo,
  azione: 'intestazione.logo',
  idempotente: false,
  collezioni: ['registro'],
  ingresso: oggetto({ cartaId: identificatore({ aiuto: () => testi().cartaId }) }),
  esegui: inoltra(modelli, 'intestazione.logo'),
})
