import { rapporti } from '../../../actions/reports.js'
import type { GenereRapporto } from '../../../domain/locations.js'
import { LEZIONE, PIF, SCUOLA, VALUTAZIONE, type Termine } from '../../../domain/lexicon.js'
import { definisci, errore, type Ambito } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto, opzionale, scelta } from '../../schemas.js'
import { GENERI } from '../common/reports.js'

/**
 * Quel che si sta per stampare esiste, e lo si dice con la parola giusta.
 *
 * Otto generi, otto raccolte diverse: è l'unico posto in cui «non trovato» può
 * distinguere una lezione da un momento di valutazione, e il gestore lo dice
 * già — ma come rifiuto, cioè con un codice che chi chiama da fuori non sa
 * distinguere da «il voto è fuori scala».
 */
function esigiSoggetto (ambito: Ambito, genere: GenereRapporto, id: string): void {
  const r = ambito.contesto.registro
  const c = (esiste: boolean, cosa: Termine) => {
    if (!esiste) throw errore.nonTrovato(cosa)
  }
  switch (genere) {
    case 'lezione':
      return c(r.lezioni.some((l) => l.id === id), LEZIONE.lezione)
    case 'piano':
      return c(r.piani.some((p) => p.id === id), LEZIONE.pianoLezione)
    case 'valutazioni':
    case 'presenze':
      return c(r.corsi.some((corso) => corso.id === id), SCUOLA.corso)
    case 'momento':
      return c(r.valutazioni.some((v) => v.id === id), VALUTAZIONE.momento)
    case 'fascicolo':
      return c(r.classi.some((classe) => classe.id === id), SCUOLA.classe)
    case 'foto-classe':
      // La parete di ritratti si chiede da un corso oppure dalla classe: il
      // gestore accetta tutti e due, e una guardia più stretta di lui
      // romperebbe il gesto che oggi funziona.
      return c(
        r.corsi.some((corso) => corso.id === id) || r.classi.some((classe) => classe.id === id),
        SCUOLA.classe,
      )
    case 'allievo':
      return c(r.classi.some((classe) => classe.allievi.some((a) => a.id === id)), PIF)
  }
}

export const procedura = definisci({
  nome: 'rapporti.genera',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Compone un rapporto in PDF e dice dove lo ha messo',
  azione: 'rapporto.genera',
  // Lo stesso foglio rifatto due volte sta allo stesso percorso e ha dentro le
  // stesse cose: il documento d'anno conta una revisione in più, il registro no.
  idempotente: true,
  // Scrive un PDF dentro il documento dell'anno, non una raccolta del registro.
  collezioni: [],
  ingresso: oggetto({
    genere: scelta(GENERI, { aiuto: 'Quale degli otto fogli' }),
    id: identificatore({ aiuto: 'Di che cosa: la lezione, il piano, il corso, la classe, la persona' }),
    corsoId: opzionale(nullabile(identificatore({
      aiuto: 'Solo per la scheda della persona: di quale corso parla',
    }))),
    semestreId: opzionale(nullabile(identificatore({
      aiuto: 'Solo per valutazioni e scheda: il periodo da guardare',
    }))),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSoggetto(ambito, ingresso.genere, ingresso.id)
    return daGestore(rapporti['rapporto.genera'], (i: typeof ingresso) => ({
      tipo: 'rapporto.genera' as const, ...i,
    }))(ambito, ingresso)
  },
})
