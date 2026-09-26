// I riquadri della pagina Documenti: che cosa un corso sa stampare.
// Uno per famiglia di fogli (corso, prove, piani, ore, persone, composizioni),
// tutti con `schedaDiFogli` e `rigaFoglio`; cambia solo da dove si prendono
// gli oggetti.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import { fraIFascicoli, pdfDi } from '../../../domain/compositions.js'
import { classeDelCorsoId, numeriDelleLezioni, registroDelCorso } from '../../../domain/courses.js'
import { formattaData } from '../../../domain/dates.js'
import { Molti, Uno, corto, quanti } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { parole } from '../../../domain/words.testi.js'
import { minuscolo } from '../../../i18n/index.js'
import type { Corso, Lezione } from '../../../domain/models.js'
import { pastiglia, pulsante, quieto } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { tabella } from '../../components/table.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import {
  aggiorna,
  nelSemestreScelto,
  nomeDiPiano,
  nomeSemestreScelto,
  pianiPerCorso,
  pianoPerId,
  stato,
} from '../../state.js'

import {
  cellaFoglio,
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
  const presenze = foglio('presenze', corso.id, contesto)
  const valutazioni = foglio('valutazioni', corso.id, contesto)
  // Il CSV accanto al PDF: lo stesso dato in due forme.
  const presenzeCsv = foglio('presenze', corso.id, contesto, 'csv')
  const valutazioniCsv = foglio('valutazioni', corso.id, contesto, 'csv')
  const t = testi()

  return schedaDiFogli({
    titolo: t.delCorso,
    sottotitolo: conto(t.tuttaLaClasse(nomeSemestreScelto())),
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto' },
      rigaFoglio({
        etichetta: nome(t.presenze),
        foglio: presenze,
        nome: t.nomePresenze,
        rifai: { tipo: 'rapporto.genera', genere: 'presenze', id: corso.id, semestreId },
      }),
      rigaFoglio({
        etichetta: nome(t.valutazioni),
        foglio: valutazioni,
        nome: t.nomeValutazioni,
        rifai: { tipo: 'rapporto.genera', genere: 'valutazioni', id: corso.id, semestreId },
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

/** Una scheda per prova, con il grafico della distribuzione. */
export function prove (corso: Corso): HTMLElement {
  // Dalla più recente, come i verbali.
  const momenti = nelSemestreScelto(
    stato.registro.valutazioni.filter((momento) => momento.corsoId === corso.id),
  )
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
  const t = testi()
  const L = lessico()
  return schedaDiFogli({
    titolo: Molti(L.prova),
    sottotitolo: conto(`${quanti(momenti.length, L.prova)} · ${nomeSemestreScelto()}`),
    contenuto: () =>
      momenti.length === 0
        ? quieto(t.nessunaProva)
        : h(
            'ul',
            { class: 'documenti__elenco' },
            momenti.map((momento) => {
              const votati = momento.voti.filter((v) => v.valore !== null).length
              return rigaFoglio({
                etichetta: nome(`${formattaData(momento.data, 'corto')} · ${momento.titolo}`),
                // Quanti voti ci sono: una prova senza voti stampa un grafico vuoto.
                segni:
                  votati === 0
                    ? pastiglia(t.nessunVoto, 'quiete')
                    : h('span', { class: 'testo-quieto' }, String(votati)),
                foglio: foglio('momento', momento.id, { corsoId: corso.id }),
                nome: t.schedaDiProva(momento.titolo),
                rifai: { tipo: 'rapporto.genera', genere: 'momento', id: momento.id },
              })
            }),
          ),
  })
}

/** Un piano per foglio: la scaletta che si porta in aula stampata. */
export function piani (corso: Corso): HTMLElement {
  const suoi = pianiPerCorso(corso.id)
  const t = testi()

  return schedaDiFogli({
    titolo: Molti(lessico().pianoLezione),
    sottotitolo: conto(t.pianiConto(suoi.length)),
    contenuto: () =>
      suoi.length === 0
        ? quieto(t.nessunPiano)
        : h(
            'ul',
            { class: 'documenti__elenco' },
            suoi.map((piano) =>
              rigaFoglio({
                etichetta: nome(nomeDiPiano(piano)),
                foglio: foglio('piano', piano.id, { corsoId: corso.id }),
                nome: nomeDiPiano(piano),
                rifai: { tipo: 'rapporto.genera', genere: 'piano', id: piano.id },
              }),
            ),
          ),
  })
}

/**
 * Il fascicolo della classe (recapiti, documenti raccolti, periodi di assenza):
 * scheda a sé perché non è di una materia, e il periodo scelto lo taglierebbe.
 */
export function dellaClasse (corso: Corso): Figlio {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  if (!classe) return null
  const suo = foglio('fascicolo', classe.id)
  const t = testi()

  return schedaDiFogli({
    titolo: t.dellaClasse,
    sottotitolo: conto(classe.nome),
    aiuto: t.dellaClasseAiuto,
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto' },
      rigaFoglio({
        etichetta: h(
          'span',
          { class: 'documenti__nome', title: t.fascicoloContiene },
          corto(lessico().fascicolo),
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
        { class: 'documenti__elenco documenti__elenco--corto' },
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

// ----------------------------------------------------------- delle lezioni

/**
 * Le lezioni come matrice: una riga per data, una colonna per documento (piano
 * prima dell'ora, verbale dopo), ognuna con i suoi gesti. Dalla più recente.
 * Le ore non svolte restano, in grigio e con i pulsanti spenti.
 */
export function matriceLezioni (corso: Corso): Figlio {
  // Il numero è quello di registro, calendario e piani: riparte a ogni semestre
  // e le annullate non ne hanno. Si conta su tutte le ore del corso prima di
  // scegliere il periodo, poi si rovescia l'elenco.
  const tutte = registroDelCorso(stato.registro, corso.id)
  const numeri = numeriDelleLezioni(stato.registro, tutte)
  const ore = nelSemestreScelto(tutte)
    .map((lezione) => ({ lezione, numero: numeri.get(lezione.id) ?? null }))
    .reverse()
  const t = testi()
  const L = lessico()

  return schedaDiFogli({
    titolo: Molti(L.lezione),
    sottotitolo: conto(`${t.ore(ore.length)} · ${nomeSemestreScelto()}`),
    contenuto: () =>
      ore.length === 0
        ? quieto(t.nessunaOra)
        : tabella({
            variante: 'lezioni',
            intestazione: [
              h('th', null, t.numero),
              h('th', null, parole().data),
              h('th', null, t.verbale),
              h('th', null, Uno(L.pianoLezione)),
            ],
            righe: ore.map(({ lezione, numero }) => rigaOra(corso, lezione, numero)),
          }),
  })
}

/** Un numero, una data e i due documenti di quell'ora. */
function rigaOra (corso: Corso, lezione: Lezione, numero: number | null): HTMLElement {
  const conclusa = lezione.stato === 'svolta'
  const t = testi()
  // Il motivo per cui il verbale adesso non si fa; il piano si stampa prima dell'ora.
  const bloccato = conclusa
    ? null
    : lezione.stato === 'annullata'
      ? t.annullata
      : t.nonConclusa
  const piano = lezione.pianoId ? pianoPerId(lezione.pianoId) : null

  return h(
    'tr',
    { class: conclusa ? undefined : 'tabella__riga--spenta' },
    h('td', { class: 'documenti__numero' }, numero === null ? '—' : String(numero)),
    h(
      'td',
      { class: 'documenti__quando' },
      nome(formattaData(lezione.data)),
      conclusa
        ? null
        : pastiglia(
            minuscolo(lessico().statiLezione[lezione.stato]),
            lezione.stato === 'annullata' ? 'negativo' : 'quiete',
          ),
    ),
    cellaFoglio({
      foglio: foglio('lezione', lezione.id, { corsoId: corso.id }),
      nome: t.nomeVerbale(formattaData(lezione.data)),
      rifai: { tipo: 'rapporto.genera', genere: 'lezione', id: lezione.id },
      bloccato,
      // Lo stesso verbale in Markdown: il PDF si consegna, il testo si corregge.
      altro: pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        titolo: bloccato ?? t.verbaleInTesto,
        disabilitato: Boolean(bloccato),
        al: () => azione({ tipo: 'esporta.lezione', lezioneId: lezione.id }),
      }),
    }),
    piano
      ? cellaFoglio({
          foglio: foglio('piano', piano.id, { corsoId: corso.id }),
          nome: nomeDiPiano(piano),
          rifai: { tipo: 'rapporto.genera', genere: 'piano', id: piano.id },
        })
      : h(
          'td',
          { class: 'documenti__cella' },
          h('span', { class: 'testo-quieto' }, t.nessunPianoCella),
        ),
  )
}

// ----------------------------------------------------------- degli allievi

/**
 * La parete di ritratti: una faccia e un nome per ogni persona. Sta con le
 * persone in pagina, ma il file resta sotto la materia. Porta nel nome il giorno
 * in cui è stata fatta, perché la classe cambia.
 */
export function fotoDellaClasse (corso: Corso): HTMLElement {
  const suo = foglio('foto-classe', corso.id, { corsoId: corso.id })
  const t = testi()

  return schedaDiFogli({
    titolo: t.foto,
    sottotitolo: conto(''),
    aiuto: t.fotoAiuto,
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto' },
      rigaFoglio({
        etichetta: nome(Molti(lessico().pif)),
        foglio: suo,
        nome: t.nomeFoto,
        rifai: { tipo: 'rapporto.genera', genere: 'foto-classe', id: corso.id },
      }),
    ),
  })
}

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
            { class: 'documenti__elenco documenti__elenco--lungo' },
            allievi.map((allievo) =>
              rigaFoglio({
                etichetta: nome(nomeCompleto(allievo)),
                foglio: foglio('allievo', allievo.id, {
                  corsoId: corso.id,
                  semestreId: stato.semestreId,
                }),
                nome: t.schedaDiPersona(nomeCompleto(allievo)),
                rifai: {
                  tipo: 'rapporto.genera',
                  genere: 'allievo',
                  id: allievo.id,
                  corsoId: corso.id,
                  semestreId: stato.semestreId,
                },
              }),
            ),
          ),
  })
}
