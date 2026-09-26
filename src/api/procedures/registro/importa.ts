import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, elenco, identificatore, oggetto, testo } from '../../schemas.js'
import { testi } from './registro.testi.js'

const t = () => testi().importa

/**
 * Da un altro registro, i blocchi scelti: impostazioni del documento, materie,
 * classi con persone e corsi, piani dei corsi portati, calendari ICS con le
 * regole.
 *
 * Non idempotente, come `classi.importa`: ritentata, salta le classi già
 * arrivate (stesso nome) ma rifà materie e piani. L'altro documento si legge
 * soltanto. Il lavoro sta nel gestore di `src/actions/register.ts` e in
 * `importaRegistro` del dominio.
 */
export const procedura = scrittura({
  nome: 'registro.importa',
  titolo: () => t().titolo,
  azione: 'registro.importa',
  idempotente: false,
  collezioni: ['registro', 'classi', 'corsi', 'piani'],
  ingresso: oggetto({
    percorso: testo({
      minimo: 1,
      aiuto: () => t().percorso,
    }),
    impostazioni: booleano({
      aiuto: () => t().impostazioni,
    }),
    materie: booleano({
      aiuto: () => t().materie,
    }),
    classi: elenco(oggetto({
      classeId: identificatore({ aiuto: () => t().classeId }),
      anagrafica: booleano({ aiuto: () => t().anagrafica }),
      corsi: booleano({ aiuto: () => t().corsi }),
    }), {
      aiuto: () => t().classi,
    }),
    piani: booleano({
      aiuto: () => t().piani,
    }),
    calendari: booleano({
      aiuto: () => t().calendari,
    }),
  }),
  esegui: inoltra(registro, 'registro.importa'),
})
