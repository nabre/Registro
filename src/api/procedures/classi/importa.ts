import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, identificatore, oggetto, testo } from '../../schemas.js'
import { testi } from './classi.testi.js'

const t = () => testi().importa

/**
 * Una classe da un altro documento `.regi`. Non idempotente, come
 * `classi.duplica`: ritentata trova il nome già preso (`validaClasse`) o, con
 * un altro nome, fa due classi. Il documento d'origine si legge soltanto; il
 * lavoro sta nel gestore di `src/actions/register.ts`.
 */
export const procedura = scrittura({
  nome: 'classi.importa',
  titolo: () => t().titolo,
  azione: 'classe.importa',
  idempotente: false,
  collezioni: ['classi', 'corsi', 'registro'],
  ingresso: oggetto({
    percorso: testo({ minimo: 1, aiuto: () => testi().comune.percorso }),
    classeId: identificatore({ aiuto: () => t().classeId }),
    nome: testo({ minimo: 1, aiuto: () => t().nome }),
    anagrafica: booleano({ aiuto: () => t().anagrafica }),
    corsi: booleano({ aiuto: () => t().corsi }),
  }),
  esegui: inoltra(registro, 'classe.importa'),
})
