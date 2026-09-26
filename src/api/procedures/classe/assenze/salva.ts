import { docenteClasse } from '../../../../actions/classTeacher.js'
import type { BloccoAssenze } from '../../../../domain/models.js'
import { validaBloccoAssenze } from '../../../../domain/validation.js'
import { inoltra, scrittura } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../../common/register.js'
import { testi } from '../classe.testi.js'

const t = () => testi().assenze.salva

export const procedura = scrittura({
  nome: 'classe.assenze.salva',
  titolo: () => t().titolo,
  azione: 'assenze.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    /**
     * Il periodo intero, convalidato da `validaBloccoAssenze` senza l'anno, come fa
     * il gestore: date coerenti, e-mail con oggetto e corpo. Il controllo «dentro
     * l'anno» resta fuori apposta, per non rifiutare quel che il gestore accetta.
     */
    blocco: entita<BloccoAssenze>({ cosa: () => t().blocco, valida: validaBloccoAssenze }),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId, null)
    // Se il periodo esiste già, il gestore ignora le `righe` del client e tiene
    // quelle del server (fogli caricati, mail partite nel frattempo). La procedura
    // manda il blocco com'è.
    return inoltra(docenteClasse, 'assenze.salva')(ambito, ingresso)
  },
})
