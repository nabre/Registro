// I riquadri della pagina Documenti: che cosa un corso sa stampare.
// Uno per famiglia di fogli (corso, docente di classe, allievi, docente),
// tutti con `schedaDiFogli` e `rigaFoglio`; cambia solo da dove si prendono
// gli oggetti.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { classeDelCorsoId, registroDelCorso } from '#core/dominio/courses.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { progettiDelCorso } from '#core/dominio/projects.js'
import type { Allievo, Classe, Corso, Progetto } from '#core/dominio/models.js'
import { pulsante, quieto, selettore } from '#ui/components/base.js'
import { h, type Figlio } from '#ui/dom.js'
import {
  aggiorna,
  nelSemestreScelto,
  nomeSemestreScelto,
  stato,
} from '#ui/state.js'

import {
  conto,
  foglio,
  nome,
  rigaFoglio,
  schedaDiFogli,
} from './sheets.js'
import { testi } from './cards.testi.js'

/**
 * I documenti che riguardano il corso intero: quelli che si consegnano. Con
 * dei progetti nel corso stanno in linguette, come quelli delle persone e con
 * la stessa scelta: «Corso» con i fogli del corso, poi una per progetto con il
 * suo rapporto di classe.
 */
export function delCorso (corso: Corso): HTMLElement {
  const progetti = progettiDelCorso(stato.registro, corso.id)
  const aperta = linguettaAperta(corso, progetti)
  const progetto = progetti.find((p) => p.id === aperta) ?? null
  const t = testi()

  return schedaDiFogli({
    titolo: t.delCorso,
    sottotitolo: conto(progetto ? t.tuttoIlProgetto : t.tuttaLaClasse(nomeSemestreScelto())),
    contenuto: () => [
      linguette(corso, progetti, aperta),
      progetto ? fogliDelProgetto(corso, progetto) : fogliDelCorso(corso),
    ],
  })
}

/** I fogli del corso come gruppo: la scheda in PDF e, accanto, lo stesso dato in CSV. */
function fogliDelCorso (corso: Corso): HTMLElement {
  const semestreId = stato.semestreId
  const contesto = { corsoId: corso.id, semestreId }
  const t = testi()
  return h(
    'ul',
    { class: 'documenti__elenco documenti__elenco--corto', attr: { 'data-scorrimento': `documenti-del-corso-${corso.id}` } },
    rigaFoglio({
      etichetta: nome(t.schedaCorso),
      foglio: foglio('corso', corso.id, contesto),
      nome: t.nomeSchedaCorso,
      rifai: { tipo: 'rapporto.genera', genere: 'corso', id: corso.id, semestreId },
    }),
    rigaFoglio({
      etichetta: nome(t.presenzeCsv),
      foglio: foglio('presenze', corso.id, contesto, 'csv'),
      nome: t.nomePresenzeCsv,
      rifai: { tipo: 'esporta.presenze', corsoId: corso.id, semestreId },
    }),
    rigaFoglio({
      etichetta: nome(t.valutazioniCsv),
      foglio: foglio('valutazioni', corso.id, contesto, 'csv'),
      nome: t.nomeValutazioniCsv,
      rifai: { tipo: 'esporta.valutazioni', corsoId: corso.id, semestreId },
    }),
  )
}

/**
 * Il rapporto di classe di un progetto, senza periodo: vale per tutto il
 * progetto. Sotto, quanti rapporti individuali sono già fatti, con il rimando
 * alla scheda delle persone, che li elenca: qui non sono righe, così il conto
 * in testa e le frecce dell'anteprima restano su quel che si vede.
 */
function fogliDelProgetto (corso: Corso, progetto: Progetto): Figlio[] {
  const t = testi()
  const classe = classeDelCorsoId(stato.registro, corso.id)
  const allievi = classe ? allieviAttivi(classe) : []
  const pronti = allievi
    .filter((a) => foglio('progetto-allievo', progetto.id, { allievoId: a.id }).trovato)
    .length
  return [
    h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto', attr: { 'data-scorrimento': `documenti-del-corso-${corso.id}-${progetto.id}` } },
      rigaFoglio({
        etichetta: nome(t.rapportoDiClasse),
        foglio: foglio('progetto-classe', progetto.id),
        nome: t.nomeProgetto(progetto.titolo),
        rifai: { tipo: 'rapporto.genera', genere: 'progetto-classe', id: progetto.id },
      }),
    ),
    allievi.length === 0
      ? null
      : h(
          'p',
          { class: 'documenti__rimando' },
          h('span', { class: 'testo-quieto' }, t.individualiPronti(pronti, allievi.length)),
          pulsante({
            testo: t.vediIndividuali,
            variante: 'sottile',
            al: () => aggiorna({ schedaDocumenti: 'allievi' }),
          }),
        ),
  ]
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

/**
 * La linguetta aperta fra i documenti di un corso, la stessa in «Del corso» e
 * fra quelli delle persone: quella ricordata, se il suo progetto c'è ancora;
 * altrimenti «Corso».
 */
function linguettaAperta (corso: Corso, progetti: readonly Progetto[]): string {
  const ricordata = stato.linguetteDocumenti[corso.id]
  return ricordata && progetti.some((p) => p.id === ricordata) ? ricordata : 'corso'
}

/** «Corso» e una linguetta per progetto; senza progetti niente. */
function linguette (corso: Corso, progetti: readonly Progetto[], aperta: string): Figlio {
  if (progetti.length === 0) return null
  const t = testi()
  return h(
    'div',
    { class: 'documenti__linguette' },
    selettore(
      aperta,
      [
        { valore: 'corso', testo: t.dettaglioCorso },
        ...progetti.map((p) => ({ valore: p.id, testo: p.titolo, simbolo: 'progetto' as const })),
      ],
      (scelta) =>
        aggiorna({ linguetteDocumenti: { ...stato.linguetteDocumenti, [corso.id]: scelta } }),
      t.linguette,
    ),
  )
}

/**
 * I documenti delle persone in formazione. Con dei progetti nel corso stanno
 * in linguette: «Corso» con le schede di ognuno, poi una per progetto con il
 * rapporto individuale di ognuno in quel progetto. Senza progetti, solo le
 * schede del corso.
 */
export function schedeAllievo (corso: Corso): HTMLElement {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []
  const progetti = progettiDelCorso(stato.registro, corso.id)
  const aperta = linguettaAperta(corso, progetti)
  const progetto = progetti.find((p) => p.id === aperta) ?? null
  const t = testi()

  return schedaDiFogli({
    titolo: lessico().documentoSchede,
    sottotitolo: conto(progetto
      ? t.progettoConto(allievi.length)
      : t.schedeConto(allievi.length, nomeSemestreScelto())),
    contenuto: () => [
      linguette(corso, progetti, aperta),
      allievi.length === 0
        ? quieto(t.nessunaPersona)
        : h(
            'ul',
            {
              class: 'documenti__elenco documenti__elenco--lungo',
              // Una chiave per linguetta: tornandoci lo scorrimento ritrova il suo punto.
              attr: { 'data-scorrimento': `documenti-schede-allievo-${corso.id}-${aperta}` },
            },
            progetto
              ? allievi.map((allievo) => rigaProgettoAllievo(progetto, allievo))
              : allievi.flatMap((allievo) => righeCorsoAllievo(corso, classe, allievo)),
          ),
    ],
  })
}

/** Le schede di una persona nel corso: quella del corso e, al docente di classe, la sua. */
function righeCorsoAllievo (corso: Corso, classe: Classe | null, allievo: Allievo): HTMLElement[] {
  const t = testi()
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
}

/**
 * Il rapporto di una persona in un progetto. Il nome basta: il progetto lo
 * dice la linguetta, e il rapporto vale per tutto il progetto, senza periodo.
 */
function rigaProgettoAllievo (progetto: Progetto, allievo: Allievo): HTMLElement {
  return rigaFoglio({
    etichetta: nome(nomeCompleto(allievo)),
    foglio: foglio('progetto-allievo', progetto.id, { allievoId: allievo.id }),
    nome: testi().progettoDi(nomeCompleto(allievo), progetto.titolo),
    rifai: {
      tipo: 'rapporto.genera',
      genere: 'progetto-allievo',
      id: progetto.id,
      allievoId: allievo.id,
    },
  })
}
