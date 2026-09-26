import { ore } from '../../../actions/hours.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiLezione } from './common.js'
import { testi } from './ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'lezione.elimina',
  // La seconda chiamata non trova più niente e lo dice con «non trovato».
  idempotente: true,
  // Valutazioni, consegne e spunte del check restano senza rimando, e i loro file
  // vanno riscritti.
  collezioni: ['lezioni', 'valutazioni', 'consegne', 'check'],
  ingresso: oggetto({ lezioneId: identificatore() }),
  esegui: (ambito, ingresso) => {
    // «non-trovato» e non il rifiuto del gestore: è il codice su cui chi chiama
    // decide di rileggere invece di ritentare.
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'lezione.elimina')(ambito, ingresso)
  },
})
