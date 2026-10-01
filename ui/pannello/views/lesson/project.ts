// La scheda Progetto dell'ora: i progetti a cui lavorano le attività del piano
// di quest'ora (senza, la linguetta non c'è: `tabs.ts`). Con più progetti, una
// linguetta per progetto. A sinistra i compiti a linguette (l'inizio si lega
// all'ora), a destra la matrice di quest'ora e i giudizi rapidi. Le scritture
// di un'ora conclusa le ferma `lesson.ts` (`aOraSvolta`).

import type { Lezione, Progetto } from '#core/dominio/models.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { faseDellAttivita } from '#core/dominio/projects.js'
import { collegamento, pulsante, scheda, selettore, statoVuoto } from '#ui/pannello/components/base.js'
import { inTelaio } from '#ui/pannello/components/table.js'
import { type Figlio } from '#ui/pannello/dom.js'
import { moduloGiudizio } from '#ui/pannello/forms/project.js'
import { aggiorna, pianoPerId, ridisegna, vai } from '#ui/pannello/state.js'
import { progettiDellOra } from '#ui/pannello/tabs.js'
import { apriProgetto, pastigliaStato } from '#ui/pannello/views/projects.js'
import { giudiziDelProgetto } from '#ui/pannello/views/projects/judgements.js'
import { matriceProgetto } from '#ui/pannello/views/projects/matrix.js'
import { compitiDelProgetto } from '#ui/pannello/views/projects/tasks.js'
import { testi } from './project.testi.js'

/** Il progetto scelto nella scheda, per ora: resta fra un ridisegno e l'altro. */
const scelti = new Map<string, string>()

/** Apre la scheda Progetto dell'ora su questo progetto: lo usa il pulsante della tappa. */
export function apriProgettoDellOra (lezione: Lezione, progettoId: string): void {
  scelti.set(lezione.id, progettoId)
  aggiorna({ schedaLezione: 'progetto' })
}

/** Le fasi del progetto in cui cadono le attività del piano di quest'ora. */
function fasiDellOra (lezione: Lezione, progetto: Progetto): string {
  const nomi = new Set<string>()
  for (const attivita of pianoPerId(lezione.pianoId)?.attivita ?? []) {
    const fase = faseDellAttivita(progetto, attivita)
    if (fase) nomi.add(fase.titolo)
  }
  return [...nomi].join(', ')
}

/**
 * Le linguette dei progetti (con più di uno) e le due colonne della scheda: chi
 * la disegna mette le colonne in `aOraSvolta`, le linguette fuori, perché
 * scegliere che cosa guardare non scrive e vale anche a ora conclusa.
 */
export function schedaProgettoDellOra (
  lezione: Lezione,
): { scelta: Figlio, sinistra: Figlio[], destra: Figlio[] } {
  const t = testi()
  const progetti = progettiDellOra(lezione)
  if (progetti.length === 0) {
    return {
      scelta: null,
      sinistra: [statoVuoto({
        simbolo: 'progetto',
        titolo: t.nessunProgetto,
        testo: t.nessunProgettoTesto,
        azione: pulsante({
          testo: Molti(lessico().progetto),
          simbolo: 'progetto',
          variante: 'sottile',
          al: () => { vai({ pagina: 'pagina.corso.progetti', soggetto: { tipo: 'corso', id: lezione.corsoId } }) },
        }),
      })],
      destra: [],
    }
  }
  const progetto = progetti.find((p) => p.id === scelti.get(lezione.id)) ?? progetti[0]
  const fasi = fasiDellOra(lezione, progetto)

  // Una linguetta per progetto, con la fase dell'ora; con un progetto solo, niente.
  const scelta = progetti.length > 1
    ? selettore(
        progetto.id,
        progetti.map((p) => {
          const fase = fasiDellOra(lezione, p)
          return { valore: p.id, testo: fase ? `${p.titolo} › ${fase}` : p.titolo, simbolo: 'progetto' as const }
        }),
        (id) => {
          scelti.set(lezione.id, id)
          ridisegna()
        },
        Molti(lessico().progetto),
      )
    : null

  return {
    scelta,
    sinistra: [
      inTelaio(scheda({
        titolo: progetto.titolo,
        sottotitolo: fasi ? t.faseDellOra(fasi) : undefined,
        aiuto: t.compitiAiuto,
        azioni: pastigliaStato(progetto),
        contenuto: [
          compitiDelProgetto(progetto, lezione),
          collegamento({ testo: t.apriPagina, al: () => apriProgetto(progetto.id) }),
        ],
      }), `ora-progetto:${progetto.id}`), // testo-fisso: una chiave, non un testo
    ],
    destra: [
      inTelaio(scheda({
        titolo: t.matriceDellOra,
        aiuto: t.matriceAiuto,
        contenuto: matriceProgetto(progetto, { lezione }),
      }), `ora-matrice:${progetto.id}`), // testo-fisso: una chiave, non un testo
      scheda({
        titolo: Molti(lessico().giudizioProgetto),
        azioni: pulsante({
          testo: Uno(lessico().giudizioProgetto),
          simbolo: 'piu',
          variante: 'sottile',
          al: () => moduloGiudizio({ progetto, lezione }),
        }),
        contenuto: giudiziDelProgetto(progetto, lezione),
      }),
    ],
  }
}
