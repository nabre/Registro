// La scheda Progetto dell'ora: i progetti a cui lavorano le attività del piano
// di quest'ora (senza, la linguetta non c'è: `tabs.ts`). Con più progetti, una
// linguetta per progetto. A sinistra i compiti a linguette (l'inizio si lega
// all'ora), a destra la matrice di quest'ora e i giudizi rapidi. Le scritture
// di un'ora conclusa le ferma `lesson.tsx` (`AOraSvolta`).

import type { ReactNode } from 'react'

import type { Lezione, ProgettoNelCorso } from '#core/dominio/models.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { faseDellAttivita } from '#core/dominio/projects.js'
import { Collegamento, Pulsante, Scheda, Selettore, StatoVuoto } from '#ui/components/base.js'
import { moduloGiudizio } from '#ui/forms/project.js'
import { aggiorna, pianoPerId, ridisegna, vai } from '#ui/state.js'
import { progettiDellOra } from '#ui/tabs.js'
import { apriIntegrazione, pastigliaStato } from '#ui/views/projects/links.js'
import { giudiziDelProgetto } from '#ui/views/projects/judgements.js'
import { matriceProgetto } from '#ui/views/projects/matrix.js'
import { compitiDelProgetto } from '#ui/views/projects/tasks.js'
import { testi } from './project.testi.js'

/** Il progetto scelto nella scheda, per ora: resta fra un disegno e l'altro, e cambiando pagina. */
const scelti = new Map<string, string>()

/** Apre la scheda Progetto dell'ora su questo progetto: lo usa il pulsante della tappa. */
export function apriProgettoDellOra (lezione: Lezione, progettoId: string): void {
  scelti.set(lezione.id, progettoId)
  aggiorna({ schedaLezione: 'progetto' })
}

/** Le fasi del progetto in cui cadono le attività del piano di quest'ora. */
function fasiDellOra (lezione: Lezione, progetto: ProgettoNelCorso): string {
  const nomi = new Set<string>()
  for (const attivita of pianoPerId(lezione.pianoId)?.attivita ?? []) {
    const fase = faseDellAttivita(progetto, attivita)
    if (fase) nomi.add(fase.titolo)
  }
  return [...nomi].join(', ')
}

/**
 * Le linguette dei progetti (con più di uno) e le due colonne della scheda: chi
 * la disegna mette le colonne in `AOraSvolta`, le linguette fuori, perché
 * scegliere che cosa guardare non scrive e vale anche a ora conclusa.
 */
export function schedaProgettoDellOra (
  lezione: Lezione,
): { scelta: ReactNode, sinistra: ReactNode, destra: ReactNode } {
  const t = testi()
  const progetti = progettiDellOra(lezione)
  if (progetti.length === 0) {
    return {
      scelta: null,
      sinistra: (
        <StatoVuoto
          simbolo="progetto"
          titolo={t.nessunProgetto}
          testo={t.nessunProgettoTesto}
          azione={(
            <Pulsante
              testo={Molti(lessico().progetto)}
              simbolo="progetto"
              variante="sottile"
              al={() => { vai({ pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'corso', id: lezione.corsoId } }) }}
            />
          )}
        />
      ),
      destra: null,
    }
  }
  const progetto = progetti.find((p) => p.id === scelti.get(lezione.id)) ?? progetti[0]
  const fasi = fasiDellOra(lezione, progetto)

  // Una linguetta per progetto, con la fase dell'ora; con un progetto solo, niente.
  const scelta = progetti.length > 1
    ? (
        <Selettore
          valore={progetto.id}
          voci={progetti.map((p) => {
            const fase = fasiDellOra(lezione, p)
            return { valore: p.id, testo: fase ? `${p.titolo} › ${fase}` : p.titolo, simbolo: 'progetto' as const }
          })}
          al={(id) => {
            scelti.set(lezione.id, id)
            ridisegna()
          }}
          etichetta={Molti(lessico().progetto)}
        />
      )
    : null

  // La chiave è il progetto: cambiando linguetta le schede sono altre, con il
  // loro stato e il loro scorrimento.
  return {
    scelta,
    sinistra: (
      <Scheda
        key={`ora-progetto:${progetto.id}`} // testo-fisso: una chiave, non un testo
        telaio={`ora-progetto:${progetto.id}`} // testo-fisso: una chiave, non un testo
        titolo={progetto.titolo}
        sottotitolo={fasi ? t.faseDellOra(fasi) : undefined}
        aiuto={t.compitiAiuto}
        azioni={pastigliaStato(progetto)}
      >
        {compitiDelProgetto(progetto, lezione)}
        <Collegamento
          testo={t.apriPagina}
          al={() => apriIntegrazione(progetto.id, progetto.corsoId)}
        />
      </Scheda>
    ),
    destra: (
      <>
        <Scheda
          key={`ora-matrice:${progetto.id}`} // testo-fisso: una chiave, non un testo
          telaio={`ora-matrice:${progetto.id}`} // testo-fisso: una chiave, non un testo
          titolo={t.matriceDellOra}
          aiuto={t.matriceAiuto}
        >
          {matriceProgetto(progetto, { lezione })}
        </Scheda>
        <Scheda
          titolo={Molti(lessico().giudizioProgetto)}
          azioni={(
            <Pulsante
              testo={Uno(lessico().giudizioProgetto)}
              simbolo="piu"
              variante="sottile"
              al={() => moduloGiudizio({ progetto, lezione })}
            />
          )}
        >
          {giudiziDelProgetto(progetto, lezione)}
        </Scheda>
      </>
    ),
  }
}
