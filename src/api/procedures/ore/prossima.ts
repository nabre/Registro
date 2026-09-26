// «Qual è la prossima lezione?»: `prossimaLezione()` di `domain/calculations.ts`
// (la stessa della vista dei corsi), esposta come lettura. `ore.elenco` vuole
// un periodo e parte dall'inizio dell'anno.
//
// È l'unica lettura che guarda l'orologio: «prossima» vuol dire «dopo adesso»,
// e far scegliere il momento al modello vorrebbe dire farglielo inventare.
// `da` e `dalleOre` si possono passare (le prove lo fanno) e quel che si è
// usato torna nella busta.
//
// Una di suo, ma `quante` risponde a «e quella dopo?» senza ricalcolare `da`.

import {
  contaUd,
  fineLezione,
  inizioLezione,
  minutiEffettivi,
  momentoLezione,
  prossimaLezione,
} from '../../../domain/calculations.js'
import {
  classeDellaLezione,
  corsoDellaLezione,
  materiaDellaLezione,
  numeroDellaLezione,
} from '../../../domain/courses.js'
import { adesso, differenzaGiorni, oggi } from '../../../domain/dates.js'
import type { Lezione } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import {
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  testo,
} from '../../schemas.js'
import { esigiClasse, esigiCorso } from '../common/register.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './ore.testi.js'

const t = () => testi().prossima
const p = () => t().presentazione

/**
 * Quante se ne possono chiedere in un colpo: oltre una ventina è un elenco, e
 * c'è `ore.elenco`.
 */
const QUANTE_MASSIME = 20

export const procedura = definisci({
  nome: 'ore.prossima',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: () => testi().comune.soloDelCorso })),
    classeId: opzionale(identificatore({ aiuto: () => testi().comune.soloDellaClasse })),
    da: opzionale(iso({ aiuto: () => t().da })),
    dalleOre: opzionale(testo({
      modello: /^([01]\d|2[0-3]):[0-5]\d$/,
      aiuto: () => t().dalleOre,
      esempio: '08:15',
    })),
    quante: opzionale(numero({
      intero: true,
      minimo: 1,
      massimo: QUANTE_MASSIME,
      aiuto: () => t().quante(QUANTE_MASSIME),
    })),
  }),
  uscita: oggetto({
    da: testo({ aiuto: () => t().daUscita }),
    dalleOre: testo({ aiuto: () => t().dalleOreUscita }),
    // Distingue «non ne hai più» da «non ho guardato» quando `prossime` è vuoto.
    aCalendario: numero({
      intero: true,
      aiuto: () => t().aCalendario,
    }),
    prossime: elenco(oggetto({
      id: testo({ aiuto: () => t().id }),
      data: testo(),
      inizio: nullabile(testo({ aiuto: () => t().inizio })),
      fine: nullabile(testo()),
      fraGiorni: numero({ intero: true, aiuto: () => t().fraGiorni }),
      momento: nullabile(testo({
        aiuto: () => t().momento,
      })),
      corsoId: testo(),
      corso: testo({ aiuto: () => testi().comune.corsoComeSiLegge }),
      classeId: testo(),
      classe: testo(),
      // Nulla quando quell'ora non è nel calendario del corso: non si inventa una
      // posizione.
      numero: nullabile(numero({ intero: true, aiuto: () => t().numero })),
      stato: testo(),
      ud: numero({ intero: true, aiuto: () => t().ud }),
      minuti: numero({ intero: true }),
      aula: testo(),
      argomenti: testo({ aiuto: () => t().argomenti }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'da', etichetta: () => p().da, formato: 'data' },
          { campo: 'dalleOre', etichetta: () => p().dalleOre, formato: 'ora' },
          { campo: 'aCalendario', etichetta: () => p().aCalendario, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'prossime',
        colonne: [
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', testo: () => p().dalle, formato: 'ora' },
          { campo: 'corso', testo: () => p().corso },
          { campo: 'aula', testo: () => parole().aula },
          { campo: 'argomenti', testo: () => p().argomento },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)
    if (ingresso.corsoId) esigiCorso(ambito, ingresso.corsoId)

    const da = ingresso.da ?? oggi()
    const dalleOre = ingresso.dalleOre ?? adesso()
    const quante = ingresso.quante ?? 1

    // I filtri prima di cercare: altrimenti la prossima di un altro corso darebbe
    // «nessuna».
    const suoi = r.lezioni
      .filter((lezione) => lezione.stato !== 'annullata')
      .filter((lezione) => !ingresso.corsoId || lezione.corsoId === ingresso.corsoId)
      .filter((lezione) =>
        !ingresso.classeId || classeDellaLezione(r, lezione)?.id === ingresso.classeId,
      )

    // Una per volta, ripartendo dalla precedente con `prossimaLezione`, che sa già
    // ordinare e quando un'ora è passata.
    const trovate: Lezione[] = []
    let restano = suoi
    let giorno = da
    let ora: string | undefined = dalleOre
    while (trovate.length < quante) {
      const prossima = prossimaLezione(restano, giorno, ora)
      if (!prossima) break
      trovate.push(prossima)
      restano = restano.filter((lezione) => lezione.id !== prossima.id)
      // Dalla seconda in poi si riparte dal giorno di quella trovata; le altre dello
      // stesso giorno le ha già tolte `restano`.
      giorno = prossima.data
      ora = undefined
    }

    return {
      da,
      dalleOre,
      aCalendario: suoi.length,
      prossime: trovate.map((lezione, indice) => {
        const classe = classeDellaLezione(r, lezione)
        const materia = materiaDellaLezione(r, lezione)
        return {
          id: lezione.id,
          data: lezione.data,
          inizio: inizioLezione(lezione),
          fine: fineLezione(lezione),
          fraGiorni: differenzaGiorni(da, lezione.data),
          // Solo sulla prima: per le altre «in corso» non vuol dire niente.
          momento: indice === 0 ? momentoLezione(lezione, da, dalleOre) : null,
          corsoId: lezione.corsoId,
          corso: [classe?.nome, materia?.nome].filter(Boolean).join(' — ') ||
            corsoDellaLezione(r, lezione)?.titolo || '—',
          classeId: classe?.id ?? '',
          classe: classe?.nome ?? '—',
          numero: numeroDellaLezione(r, lezione),
          stato: lezione.stato,
          ud: contaUd(lezione, r.impostazioni.minutiUd),
          minuti: minutiEffettivi(lezione),
          aula: lezione.aula ?? '',
          argomenti: lezione.argomenti ?? '',
        }
      }),
    }
  },
})
