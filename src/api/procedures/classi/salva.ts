import { registro } from '../../../actions/register.js'
import { Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { Classe } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { esigiAnno } from '../common/register.js'
import { testi } from './classi.testi.js'

/** `validaClasse(classe, altre)` vuole le altre: due nomi uguali nello stesso anno. */
export const procedura = scrittura({
  nome: 'classi.salva',
  titolo: () => testi().salva.titolo,
  azione: 'classe.salva',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({ classe: entita<Classe>({ cosa: () => Uno(lessico().classe) }) }),
  esegui: (ambito, ingresso) => {
    // `registro.anni` tiene solo l'anno aperto: un altro `annoId` finirebbe nel
    // file senza comparire in nessuna schermata. Senza documento aperto l'elenco è
    // vuoto, e questa guardia impedisce di scrivere nel nulla.
    esigiAnno(ambito, ingresso.classe.annoId)
    return inoltra(registro, 'classe.salva')(ambito, ingresso)
  },
})
