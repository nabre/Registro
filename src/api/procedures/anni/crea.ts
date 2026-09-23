import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { elenco, identificatore, iso, oggetto, opzionale, testo, type Schema } from '../../schemas.js'

/** Un periodo di chiusura, come lo manda il modulo delle pause. */
const sospensione = oggetto({
  id: identificatore(),
  etichetta: testo({ aiuto: 'Come si chiama la pausa: «Vacanze di Natale»' }),
  dal: iso(),
  al: iso(),
})

/**
 * I nomi dei due semestri: il protocollo ne vuole esattamente due.
 *
 * L'elenco lungo due è quel che `elenco` sa controllare quando il programma
 * gira; la coppia è quel che il tipo dichiara. Il travaso da uno all'altro si
 * fa qui, una volta sola, invece di lasciarlo alla chiamata di `daGestore` —
 * che è il punto in cui un travaso scritto a mano si sbaglia.
 */
const coppiaDiEtichette = elenco(testo(), {
  minimo: 2,
  massimo: 2,
  aiuto: 'I nomi dei due semestri, nell’ordine',
}) as unknown as Schema<[string, string]>

/**
 * Un anno nuovo è un documento nuovo.
 *
 * Non idempotente, per due motivi che varrebbero uno per volta: apre il
 * dialogo di sistema in cui si sceglie dove metterlo, e quel che nasce è un
 * file. Due chiamate uguali fanno due documenti — o una e un annullamento.
 */
export const procedura = definisci({
  nome: 'anni.crea',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Crea il documento di un anno scolastico nuovo',
  azione: 'anno.crea',
  idempotente: false,
  collezioni: ['registro'],
  ingresso: oggetto({
    inizio: iso({ aiuto: 'Il primo giorno dell’anno' }),
    fine: iso({ aiuto: 'L’ultimo' }),
    etichetta: opzionale(testo({ aiuto: 'Come lo si chiama parlando: «2025/2026»' })),
    confine: opzionale(iso({ aiuto: 'L’ultimo giorno del primo semestre' })),
    sospensioni: opzionale(elenco(sospensione, {
      aiuto: 'Le pause dichiarate nel modulo: nascono con l’anno, non dopo',
    })),
    etichetteSemestri: opzionale(coppiaDiEtichette),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(registro['anno.crea'], (i: typeof ingresso) => ({
      tipo: 'anno.crea' as const, ...i,
    }))(ambito, ingresso),
})
