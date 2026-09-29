// I riquadri della pagina Documenti: che cosa un corso sa stampare.
// Uno per famiglia di fogli (corso, docente di classe, allievi, docente),
// tutti con `schedaDiFogli` e `rigaFoglio`; cambia solo da dove si prendono
// gli oggetti.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../../../core/dominio/calculations.js'
import { classeDelCorsoId, registroDelCorso } from '../../../../core/dominio/courses.js'
import { lessico } from '../../../../core/dominio/lexicon.testi.js'
import type { Corso } from '../../../../core/dominio/models.js'
import { quieto } from '../../components/base.js'
import { h, type Figlio } from '../../dom.js'
import {
  nelSemestreScelto,
  nomeSemestreScelto,
  stato,
} from '../../state.js'

import {
  conto,
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
