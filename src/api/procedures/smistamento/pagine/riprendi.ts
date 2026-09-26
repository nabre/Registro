import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pagine.riprendi

/**
 * Le pagine archiviate per sbaglio, riprese. Idempotente: pagine già in
 * quarantena danno riuscita `invariato`; pagine né archiviate né in
 * quarantena sono un no.
 *
 * Torna indietro tutto il documento, non solo la pagina chiesta: con
 * `pagine: [4]` tornano anche la 3 e la 5 se erano nello stesso fascicolo.
 */
export const procedura = scrittura({
  nome: 'smistamento.pagine.riprendi',
  titolo: () => t().titolo,
  azione: 'smistamento.riprendiPagine',
  idempotente: true,
  collezioni: ['consegne', 'fascicoli', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(() => t().pagine),
  }),
  esegui: (ambito, ingresso) => {
    const voce = esigiSmistamento(ambito, ingresso.smistamentoId)
    const dentro = (n: number, f: { da: number, a: number }): boolean => f.da <= n && n <= f.a
    const archiviate = ingresso.pagine.some((n) => voce.assegnate.some((f) => dentro(n, f)))
    const inQuarantena = ingresso.pagine.length > 0 &&
      ingresso.pagine.every((n) => voce.blocchi.some((b) => dentro(n, b)))
    if (!archiviate && inQuarantena) {
      return {
        revisione: ambito.contesto.archivio.revisione,
        invariato: true,
        messaggio: { livello: 'info' as const, testo: t().giaInQuarantena },
      }
    }
    return inoltra(smistamento, 'smistamento.riprendiPagine')(ambito, ingresso)
  },
})
