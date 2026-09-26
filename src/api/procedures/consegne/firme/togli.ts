import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna } from '../common.js'
import { testi } from '../consegne.testi.js'

const t = () => testi().firme.togli

export const procedura = scrittura({
  nome: 'consegne.firme.togli',
  titolo: () => t().titolo,
  azione: 'consegna.firme.togli',
  // Al secondo colpo il foglio non c'è più: riuscita `invariato`, senza passare
  // dal gestore che rifiuterebbe.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    const consegna = esigiConsegna(ambito, ingresso.consegnaId)
    if (!consegna.fileFirme) {
      return {
        revisione: ambito.contesto.archivio.revisione,
        invariato: true,
        messaggio: { livello: 'info' as const, testo: t().giaTolto },
      }
    }
    return inoltra(docenteClasse, 'consegna.firme.togli')(ambito, ingresso)
  },
})
