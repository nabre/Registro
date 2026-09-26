// Il todo: tutto quel che è rimasto in giro, classe per classe.
// In cima le tipologie di lavoro con i loro conti (assenze da firmare, momenti
// di valutazione, consegne e svolgimenti di classe e docente); sotto una
// scheda per classe con le tipologie che hanno qualcosa. Per classe e non per
// corso: in aula si entra con tutti i corsi. Le cose chiuse in fondo, chiuse.

import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { RichiestaFirma } from '../../domain/absences.js'
import type { Consegna } from '../../domain/models.js'
import type { Recupero } from '../../domain/retakes.js'
import type { Riconsegna } from '../../domain/returns.js'
import {
  classiConLavoro,
  descriviFamiglia,
  FAMIGLIE_CONSEGNA,
  FAMIGLIE_TODO,
  nomeFamiglia,
  riepilogoTodo,
  type FamigliaTodo,
  type RiepilogoTodo,
  type TodoClasse,
} from '../../domain/todo.js'
import {
  pulsante,
  scheda,
  selettore,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { moduloAnno, moduloConsegna } from '../forms.js'
import {
  aggiorna,
  annoCorrente,
  classiVisibili,
  corsiDellAnnoAperto,
  stato,
  type FiltroTodo,
} from '../state.js'
import { gruppoRichiesteFirma } from './absences.js'
import { gruppoConsegne } from './assignments.js'
import { gruppoRecuperi } from './retakes.js'
import { gruppoRiconsegne } from './returns.js'
import { schedaTodoClasse, sezioniTodoClasse, simboloFamiglia } from './classTodo.js'
import { testi } from './todo.testi.js'

/** Il filtro «mie / delle classi»: le consegne del docente e quelle degli allievi si guardano in momenti diversi. */
function tieni (consegna: Consegna, filtro: FiltroTodo): boolean {
  if (filtro === 'mie') return consegna.a === 'docente'
  if (filtro === 'classi') return consegna.a !== 'docente'
  return true
}

/**
 * Quel che è stato chiuso (consegne, recuperi, prove riconsegnate, firme): una
 * scheda sola in fondo, chiusa di suo, per rispondere a «l'avevo già fatto?».
 */
function schedaFatto (
  consegne: Consegna[],
  recuperiChiusi: Recupero[],
  proveRese: Riconsegna[],
  firmate: RichiestaFirma[],
): Figlio {
  const quanti = consegne.length + recuperiChiusi.length + proveRese.length + firmate.length
  if (quanti === 0) return null

  const t = testi()
  return scheda({
    titolo: t.fatto,
    sottotitolo: t.coseChiuse(quanti),
    aiuto: t.fattoAiuto,
    classe: 'todo-fatto',
    contenuto: h(
      'details',
      { class: 'todo-fatto__corpo' },
      h('summary', null, t.mostraChiuso),
      // Nello stesso ordine dei mucchi aperti.
      gruppoRichiesteFirma(t.assenzeFirmate, firmate),
      gruppoRecuperi(t.recuperiChiusi, recuperiChiusi, { mostraCorso: true }),
      gruppoRiconsegne(t.proveRiconsegnate, proveRese, { mostraCorso: true }),
      gruppoConsegne(t.consegneFatte, consegne, 'fatta', { mostraCorso: true }),
    ),
  })
}

/**
 * Una riga di riepilogo per famiglia: quante pendenze e, in rosso sotto,
 * quante in ritardo. La spiegazione della famiglia sta nel `title`. Il numero
 * a zero resta per il confronto; le righe non filtrano né aprono niente.
 */
function schedaFamiglia (riepilogo: RiepilogoTodo, famiglia: FamigliaTodo): Figlio {
  const conto = riepilogo.conti[famiglia]

  return h(
    'article',
    {
      class: [
        'todo-sintesi__scheda',
        conto.urgenti > 0 && 'todo-sintesi__scheda--preme',
        conto.aperti === 0 && 'todo-sintesi__scheda--vuota',
      ],
      attr: { title: `${nomeFamiglia(famiglia)}: ${descriviFamiglia(famiglia)}` },
    },
    icona(simboloFamiglia(famiglia), 'icona--minuta'),
    h('h3', { class: 'todo-sintesi__titolo' }, nomeFamiglia(famiglia)),
    h('span', { class: 'todo-sintesi__numero' }, String(conto.aperti)),
    // Il ritardo su una riga sua, sotto il numero.
    conto.urgenti > 0
      ? h('span', { class: 'todo-sintesi__ritardo' }, testi().inRitardo(conto.urgenti))
      : null,
  )
}

/** Le schede in cima, sempre tutte: una che manca è una tipologia dimenticata. */
function sintesiFamiglie (riepilogo: RiepilogoTodo): Figlio {
  return h(
    'div',
    { class: 'todo-sintesi' },
    ...FAMIGLIE_TODO.map((famiglia) => schedaFamiglia(riepilogo, famiglia)),
  )
}

/**
 * Le linguette delle classi con qualcosa in sospeso, ognuna col suo conto. «Tutte»
 * è la prima e quella di partenza. Con una classe sola non compaiono.
 */
function schedeDiClasse (conLavoro: TodoClasse[], scelta: string | null): Figlio {
  if (conLavoro.length < 2) return null
  const totale = conLavoro.reduce((somma, todo) => somma + todo.aperti, 0)

  return h(
    'div',
    { class: 'todo-schede' },
    selettore<string>(
      scelta ?? '',
      [
        { valore: '', testo: testi().tutte(totale) },
        ...conLavoro.map((todo) => ({
          valore: todo.classeId,
          testo: `${todo.classe} · ${todo.aperti}`,
        })),
      ],
      (scelto) => aggiorna({ classeTodoId: scelto || null }),
    ),
  )
}

export function vistaTodo (): Figlio {
  const t = testi()
  const anno = annoCorrente()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--todo' },
      statoVuotoAnno({
        simbolo: 'spunta',
        testo: t.senzaAnno,
        crea: () => moduloAnno(),
      }),
    )
  }

  // Tutti i corsi dell'anno, senza il filtro per classe dell'agenda: la pagina
  // raggruppa già per classe.
  const corsi = corsiDellAnnoAperto()
  const classi = classiVisibili()
  const filtro = stato.filtroTodo
  // Il filtro «mie / delle classi» vale solo per le consegne; prove ferme,
  // recuperi e richieste di firma restano sempre in vista.
  const riepilogo = riepilogoTodo(stato.registro, classi, corsi, stato.adessoData, (consegna) =>
    tieni(consegna, filtro),
  )
  const conLavoro = classiConLavoro(riepilogo)
  // La classe scelta, se ha ancora qualcosa in sospeso; altrimenti «tutte».
  const scelta = conLavoro.some((todo) => todo.classeId === stato.classeTodoId)
    ? stato.classeTodoId
    : null
  const mostrate = scelta ? conLavoro.filter((todo) => todo.classeId === scelta) : conLavoro

  // Le cose chiuse di tutte le classi, in un posto solo.
  const chiuse = {
    consegne: riepilogo.classi.flatMap((c) =>
      FAMIGLIE_CONSEGNA.flatMap((famiglia) => c.consegne[famiglia].completate),
    ),
    recuperi: riepilogo.classi.flatMap((c) => c.recuperi.chiusi),
    prove: riepilogo.classi.flatMap((c) => c.riconsegne.fatte),
    firmate: riepilogo.classi.flatMap((c) => c.assenze.firmate),
  }

  return h(
    'div',
    { class: 'vista vista--todo' },
    testataVista({
      titolo: Molti(lessico().pendenza),
      sottotitolo:
        riepilogo.aperti === 0
          ? t.nienteInSospeso
          : t.aperte(riepilogo.aperti, conLavoro.length) +
            (riepilogo.urgenti > 0 ? ` · ${t.inRitardo(riepilogo.urgenti)}` : ''),
      // Compatta e senza selettore: i filtri sono comandi nella riga delle azioni.
      compatta: true,
    }),
    // Il riepilogo resta di tutte le classi anche con una scheda aperta: serve a
    // scegliere dove entrare.
    sintesiFamiglie(riepilogo),
    schedeDiClasse(conLavoro, scelta),
    conLavoro.length === 0
      ? statoVuoto({
          simbolo: 'spunta',
          titolo: t.vuotoTitolo,
          testo: t.vuotoTesto,
          azione: pulsante({
            testo: t.assegnaPrima,
            variante: 'primario',
            simbolo: 'piu',
            al: () => moduloConsegna({ corsoId: corsi[0]?.id }),
          }),
        })
      : scelta
        ? // Con una linguetta aperta niente riquadro col nome della classe (sta nella
          // linguetta): restano le tipologie, nude.
          h(
            'div',
            { class: 'todo-classe__corpo' },
            ...mostrate.flatMap((todo) => sezioniTodoClasse(todo)),
          )
        : h(
            'div',
            { class: 'todo-classi' },
            ...mostrate.map((todo) => schedaTodoClasse(todo)),
          ),
    // Tutto quel che è chiuso in una scheda sola, in fondo.
    schedaFatto(chiuse.consegne, chiuse.recuperi, chiuse.prove, chiuse.firmate),
  )
}
