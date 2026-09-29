// I riquadri della pagina Documenti: che cosa un corso sa stampare.
// Uno per famiglia di fogli (corso, docente di classe, allievi, composizioni),
// tutti con `schedaDiFogli` e `rigaFoglio`; cambia solo da dove si prendono
// gli oggetti.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../../../core/dominio/calculations.js'
import { fraIFascicoli, pdfDi } from '../../../../core/dominio/compositions.js'
import { classeDelCorsoId, registroDelCorso } from '../../../../core/dominio/courses.js'
import { lessico } from '../../../../core/dominio/lexicon.testi.js'
import { parole } from '../../../../core/dominio/words.testi.js'
import type { Corso } from '../../../../core/dominio/models.js'
import { pastiglia, quieto } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import {
  aggiorna,
  nelSemestreScelto,
  nomeSemestreScelto,
  stato,
} from '../../state.js'

import {
  conto,
  fileEsportato,
  foglio,
  nome,
  rigaFoglio,
  schedaDiFogli,
} from './sheets.js'
import { testi } from './cards.testi.js'

/** I documenti che riguardano il corso intero: quelli che si consegnano. */
export function delCorso (corso: Corso): HTMLElement {
  const semestreId = stato.semestreId
  const contesto = { corsoId: corso.id, semestreId }
  const schedaCorso = foglio('corso', corso.id, contesto)
  // Il CSV accanto al PDF: lo stesso dato in due forme.
  const presenzeCsv = foglio('presenze', corso.id, contesto, 'csv')
  const valutazioniCsv = foglio('valutazioni', corso.id, contesto, 'csv')
  const t = testi()

  return schedaDiFogli({
    titolo: t.delCorso,
    sottotitolo: conto(t.tuttaLaClasse(nomeSemestreScelto())),
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto', attr: { 'data-scorrimento': `documenti-del-corso-${corso.id}` } },
      rigaFoglio({
        etichetta: nome(t.schedaCorso),
        foglio: schedaCorso,
        nome: t.nomeSchedaCorso,
        rifai: { tipo: 'rapporto.genera', genere: 'corso', id: corso.id, semestreId },
      }),
      rigaFoglio({
        etichetta: nome(t.presenzeCsv),
        foglio: presenzeCsv,
        nome: t.nomePresenzeCsv,
        rifai: { tipo: 'esporta.presenze', corsoId: corso.id, semestreId },
      }),
      rigaFoglio({
        etichetta: nome(t.valutazioniCsv),
        foglio: valutazioniCsv,
        nome: t.nomeValutazioniCsv,
        rifai: { tipo: 'esporta.valutazioni', corsoId: corso.id, semestreId },
      }),
    ),
  })
}

/**
 * I fogli del docente come persona, non del corso: per ora le ore tenute al
 * posto di un collega, raccolte nella scheda del corso ristretta a loro.
 * Contano le sole svolte, come nella scheda.
 */
export function delDocente (corso: Corso): HTMLElement {
  const semestreId = stato.semestreId
  const supplenze = nelSemestreScelto(registroDelCorso(stato.registro, corso.id))
    .filter((l) => l.supplenza === true && l.stato === 'svolta')
  const suo = foglio('supplenze', corso.id, { corsoId: corso.id, semestreId })
  const t = testi()

  return schedaDiFogli({
    titolo: t.supplenze,
    sottotitolo: conto(t.oreDiSupplenza(supplenze.length, nomeSemestreScelto())),
    aiuto: t.supplenzeAiuto,
    contenuto: () =>
      // Un foglio rimasto senza supplenze resta in vista: si rifà o si butta da qui.
      supplenze.length === 0 && !suo.trovato
        ? quieto(t.nessunaSupplenza)
        : h(
            'ul',
            { class: 'documenti__elenco documenti__elenco--corto', attr: { 'data-scorrimento': `documenti-del-docente-${corso.id}` } },
            rigaFoglio({
              etichetta: nome(t.schedaSupplenze),
              foglio: suo,
              nome: t.nomeSchedaSupplenze,
              rifai: { tipo: 'rapporto.genera', genere: 'supplenze', id: corso.id, semestreId },
            }),
          ),
  })
}

/**
 * Il fascicolo della classe (recapiti, documenti raccolti, periodi di assenza, pendenze, controlli):
 * documento unico del docente di classe.
 */
export function dellaClasse (corso: Corso): Figlio {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  if (!classe) return null
  const suo = foglio('fascicolo', classe.id)
  const t = testi()

  return schedaDiFogli({
    titolo: t.schedaDocenteClasse,
    sottotitolo: conto(classe.nome),
    aiuto: t.dellaClasseAiuto,
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto', attr: { 'data-scorrimento': `documenti-della-classe-${classe.id}` } },
      rigaFoglio({
        etichetta: h(
          'span',
          { class: 'documenti__nome', title: t.fascicoloContiene },
          t.schedaDocenteClasse,
        ),
        foglio: suo,
        nome: t.nomeFascicolo,
        rifai: { tipo: 'rapporto.genera', genere: 'fascicolo', id: classe.id },
      }),
    ),
  })
}

/**
 * Le composizioni: PDF messi insieme spuntando i fogli e premendo «Combina».
 * Il registro ricorda di che cosa sono fatte, e «aggiorna» le ricompone con i
 * fogli di adesso. Si chiamano così per non confondersi con il fascicolo della
 * classe. Il riquadro compare solo se ce n'è almeno una, in tutte e tre le schede.
 */
export function composizioni (): Figlio {
  const suoi = stato.composizioni
  const orfani = pdfSenzaElenco()
  if (suoi.length === 0 && orfani.length === 0) return null

  const t = testi()
  const quante = t.quanteComposizioni(suoi.length)
  return schedaDiFogli({
    titolo: t.composizioni,
    sottotitolo: conto(orfani.length > 0 ? t.conOrfani(quante, orfani.length) : t.inUnPdf(quante)),
    contenuto: () =>
      h(
        'ul',
        { class: 'documenti__elenco documenti__elenco--corto', attr: { 'data-scorrimento': 'documenti-composizioni' } },
        orfani.map(rigaSenzaElenco),
        suoi.map((composizione) => {
          const percorso = pdfDi(composizione)
          // Quanti dei suoi fogli stanno ancora nella cartella (le schede si rifanno con
          // nomi nuovi): il conto lo dice prima di consegnare o aggiornare.
          const dentro = composizione.percorsi.filter(
            (p) => stato.esportati.some((e) => e.percorso === p),
          ).length
          const tutti = composizione.percorsi.length
          return rigaFoglio({
            etichetta: nome(composizione.nome),
            segni: h(
              'span',
              {
                class: ['testo-quieto', dentro < tutti && 'documenti__manchevole'],
                attr: {
                  title:
                    dentro < tutti ? t.mancanti(dentro, tutti) : t.tuttiDentro(tutti),
                },
              },
              dentro < tutti ? `${dentro}/${tutti}` : `${tutti}`,
            ),
            foglio: fileEsportato(percorso),
            nome: t.nomeComposizione(composizione.nome),
            rifai: { tipo: 'composizione.aggiorna', id: composizione.id },
            butta: async () => {
              const sicuro = await conferma({
                titolo: t.buttareTitolo(composizione.nome),
                testo: t.buttareComposizione,
                testoConferma: parole().buttaVia,
                pericolo: true,
              })
              if (!sicuro) return
              const risposta = await azione({ tipo: 'composizione.elimina', id: composizione.id })
              if (!risposta.ok) return
              // La riga se ne va subito, senza aspettare lo stato dall'host: altrimenti
              // sembrerebbe non aver funzionato.
              aggiorna({
                composizioni: stato.composizioni.filter((c) => c.id !== composizione.id),
                // Anche il PDF, o per un ridisegno ricomparirebbe come «senza elenco».
                esportati: stato.esportati.filter((e) => e.percorso !== percorso),
                documentiScelti: stato.documentiScelti.filter((p) => p !== percorso),
                anteprima: stato.anteprima === percorso ? null : stato.anteprima,
              })
            },
          })
        }),
      ),
  })
}

/**
 * I PDF sotto `esportazioni/composizioni/` senza la loro ricetta (eliminazione
 * a metà, versioni vecchie): qui sono l'unico posto da cui buttarli.
 */
function pdfSenzaElenco (): string[] {
  const nominati = new Set(stato.composizioni.map((c) => pdfDi(c)))
  return stato.esportati
    .map((e) => e.percorso)
    .filter((percorso) => fraIFascicoli(percorso) && !nominati.has(percorso))
    .sort()
}

/**
 * La riga di un PDF senza elenco: si guarda e si butta via, non si rifà; la
 * pastiglia lo dice.
 */
function rigaSenzaElenco (percorso: string): Figlio {
  const etichetta = (percorso.split('/').pop() ?? percorso).replace(/\.pdf$/i, '')
  const t = testi()
  return rigaFoglio({
    etichetta: nome(etichetta),
    segni: pastiglia(t.senzaElenco, 'quiete'),
    foglio: fileEsportato(percorso),
    nome: t.nomePdf(etichetta),
    bloccato: t.orfanoBloccato,
    // Una domanda sua: qui non vale «si rifà quando serve».
    butta: async () => {
      const sicuro = await conferma({
        titolo: t.buttareTitolo(etichetta),
        testo: t.buttareOrfano,
        testoConferma: parole().buttaVia,
        pericolo: true,
      })
      if (!sicuro) return
      const risposta = await azione({ tipo: 'esportazione.elimina', percorso })
      if (!risposta.ok) return
      aggiorna({
        esportati: stato.esportati.filter((e) => e.percorso !== percorso),
        documentiScelti: stato.documentiScelti.filter((p) => p !== percorso),
        anteprima: stato.anteprima === percorso ? null : stato.anteprima,
      })
    },
  })
}

// ----------------------------------------------------------- degli allievi

export function schedeAllievo (corso: Corso): HTMLElement {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []
  const t = testi()

  return schedaDiFogli({
    titolo: lessico().documentoSchede,
    sottotitolo: conto(t.schedeConto(allievi.length, nomeSemestreScelto())),
    contenuto: () =>
      allievi.length === 0
        ? quieto(t.nessunaPersona)
        : h(
            'ul',
            { class: 'documenti__elenco documenti__elenco--lungo', attr: { 'data-scorrimento': `documenti-schede-allievo-${corso.id}` } },
            allievi.flatMap((allievo) => {
              const righe = [
                rigaFoglio({
                  etichetta: nome(`${nomeCompleto(allievo)} · ${t.dettaglioCorso}`),
                  foglio: foglio('allievo', allievo.id, {
                    corsoId: corso.id,
                    semestreId: stato.semestreId,
                    docenteDiClasse: false,
                  }),
                  nome: t.schedaDiPersonaCorso(nomeCompleto(allievo)),
                  rifai: {
                    tipo: 'rapporto.genera',
                    genere: 'allievo',
                    id: allievo.id,
                    corsoId: corso.id,
                    semestreId: stato.semestreId,
                    docenteDiClasse: false,
                  },
                }),
              ]
              if (classe?.docenteDiClasse) {
                righe.push(
                  rigaFoglio({
                    etichetta: nome(`${nomeCompleto(allievo)} · ${t.dettaglioDocenteClasse}`),
                    foglio: foglio('allievo', allievo.id, {
                      corsoId: null,
                      semestreId: stato.semestreId,
                      docenteDiClasse: true,
                    }),
                    nome: t.schedaDiPersonaClasse(nomeCompleto(allievo)),
                    rifai: {
                      tipo: 'rapporto.genera',
                      genere: 'allievo',
                      id: allievo.id,
                      corsoId: null,
                      semestreId: stato.semestreId,
                      docenteDiClasse: true,
                    },
                  }),
                )
              }
              return righe
            }),
          ),
  })
}
