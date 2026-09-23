import { docenteClasse } from '../../../../actions/classTeacher.js'
import type { BloccoAssenze } from '../../../../domain/models.js'
import { validaBloccoAssenze } from '../../../../domain/validation.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Crea o aggiorna un periodo di assenze da far firmare',
  azione: 'assenze.salva',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    /**
     * Il periodo intero, convalidato dal dominio.
     *
     * `validaBloccoAssenze` prende un secondo argomento facoltativo — l'anno —
     * e qui si passa senza, come fa il gestore: senza anno controlla comunque
     * le due date, che il periodo non finisca prima di cominciare, e che
     * l'e-mail abbia oggetto e corpo. Il controllo in più — che il periodo non
     * esca dall'anno — è l'unico che si perde, e perderlo è voluto: aggiungerlo
     * qui farebbe rifiutare alla procedura un periodo che il gestore accetta.
     */
    blocco: entita<BloccoAssenze>({ cosa: 'Periodo di assenze', valida: validaBloccoAssenze }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Il gestore ha qui la difesa di concorrenza più esplicita del registro, e
    // chi legge questa procedura deve saperlo: se il periodo esiste già, le
    // `righe` che arrivano dal client vengono **ignorate** e restano quelle del
    // server. Sono i fogli caricati e le mail già partite, e riscriverle con la
    // copia che il webview aveva in mano perderebbe quel che è arrivato nel
    // frattempo. La procedura non la tocca e non la aggira: manda il blocco
    // com'è e lascia che sia il gestore a tenere le righe buone.
    return daGestore(docenteClasse['assenze.salva'], (i: typeof ingresso) => ({
      tipo: 'assenze.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})
