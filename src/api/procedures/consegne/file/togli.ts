import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { chiRiguarda, esigiConsegna } from '../common.js'
import { testi } from '../consegne.testi.js'

const t = () => testi().file.togli

export const procedura = scrittura({
  nome: 'consegne.file.togli',
  titolo: () => t().titolo,
  azione: 'consegna.file.togli',
  // Al secondo colpo non resta niente, ed è quel che si chiedeva: riuscita
  // `invariato`, senza passare dal gestore che rifiuterebbe.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiRiguarda(() => t().chi),
  }),
  esegui: (ambito, ingresso) => {
    const consegna = esigiConsegna(ambito, ingresso.consegnaId)
    const resta = (consegna.documenti ?? []).some((d) => d.allievoId === ingresso.chi) ||
      consegna.fatte.some((f) => f.chi === ingresso.chi)
    if (!resta) {
      return {
        revisione: ambito.contesto.archivio.revisione,
        invariato: true,
        messaggio: { livello: 'info' as const, testo: t().giaAtteso },
      }
    }
    return inoltra(docenteClasse, 'consegna.file.togli')(ambito, ingresso)
  },
})
