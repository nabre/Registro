import { registro } from '../../../core/azioni/register.js'
import { Uno } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import { annoAllineato } from '../../../core/dominio/years.js'
import type { AnnoScolastico } from '../../../core/dominio/models.js'
import { validaAnno } from '../../../core/dominio/validation.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto, type EsitoDominio } from '../../schemas.js'
import { esigiAnno } from '../common/register.js'
import { testi } from './anni.testi.js'

/**
 * L'anno si convalida allineato, come fa il gestore: `validaAnno` vuole
 * `inizio` e `fine` uguali a quelli dei semestri, che il pannello non manda e
 * il gestore ricava con `annoAllineato`.
 */
function annoValido (anno: AnnoScolastico): EsitoDominio {
  // Senza semestri non c'è niente da allineare: `validaAnno` lo dice con la sua
  // frase.
  if (!Array.isArray(anno.semestri) || anno.semestri.length === 0) return validaAnno(anno)
  return validaAnno(annoAllineato(anno))
}

export const procedura = scrittura({
  nome: 'anni.salva',
  titolo: () => testi().salva.titolo,
  azione: 'anno.salva',
  idempotente: true,
  collezioni: ['registro', 'lezioni'],
  ingresso: oggetto({
    anno: entita<AnnoScolastico>({ cosa: () => Uno(lessico().annoScolastico), valida: annoValido }),
  }),
  esegui: (ambito, ingresso) => {
    // `anno.salva` riscrive, non crea: un anno sconosciuto è «non trovato», e si
    // rilegge.
    esigiAnno(ambito, ingresso.anno.id)
    return inoltra(registro, 'anno.salva')(ambito, ingresso)
  },
})
