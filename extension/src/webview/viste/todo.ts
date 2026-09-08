// Il todo: tutto quel che è rimasto in giro, classe per classe.
//
// Dentro una lezione si vede quel che riguarda quell'ora, ed è giusto così — è
// lì che si assegna e si ritira. Ma la domanda della domenica sera è un'altra:
// che cosa ho lasciato in giro? A quella nessuna lezione può rispondere, perché
// ognuna guarda un corso solo. Questa pagina risponde a quella.
//
// È fatta a due strati. In cima le quattro famiglie di lavoro con i loro conti
// — assenze da far firmare, prove e recuperi, documenti, attività — che dicono
// in una riga sola dove si è indietro. Sotto, una scheda per classe con dentro
// le stesse quattro famiglie, ma solo quelle che hanno qualcosa da dire.
//
// Per classe e non per corso, ed è il punto: un docente entra in un'aula, non
// in un corso, e ci porta dentro tutti e quattro i mestieri insieme. Un elenco
// ordinato per scadenza faceva scorrere avanti e indietro fra tre classi per
// mettere insieme quel che riguardava la stessa gente.
//
// Le cose chiuse stanno in fondo, in una scheda che si apre se la si cerca:
// servono a ricordarsi che cosa si era dato, non a occupare la schermata.

import type { RichiestaFirma } from '../../dominio/assenze.js'
import type { Consegna } from '../../dominio/modelli.js'
import type { Recupero } from '../../dominio/recuperi.js'
import type { Riconsegna } from '../../dominio/riconsegne.js'
import {
  classiConLavoro,
  descriviFamiglia,
  FAMIGLIE_TODO,
  nomeFamiglia,
  riepilogoTodo,
  type FamigliaTodo,
  type RiepilogoTodo,
} from '../../dominio/todo.js'
import {
  pastiglia,
  pulsante,
  scheda,
  selettore,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { statoVuotoAnno } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { h, type Figlio } from '../dom.js'
import { moduloAvvio, moduloConsegna } from '../moduli.js'
import {
  aggiorna,
  annoCorrente,
  classiVisibili,
  corsiDellAnnoAperto,
  stato,
} from '../stato.js'
import { gruppoRichiesteFirma } from './assenze.js'
import { gruppoConsegne } from './consegne.js'
import { gruppoRecuperi } from './recuperi.js'
import { gruppoRiconsegne } from './riconsegne.js'
import { schedaTodoClasse } from './todoClasse.js'

/** Di chi si stanno guardando le consegne. */
export type FiltroTodo = 'tutte' | 'mie' | 'classi'

const FILTRI: Array<{ valore: FiltroTodo, testo: string }> = [
  { valore: 'tutte', testo: 'Tutte' },
  { valore: 'mie', testo: 'Le mie' },
  { valore: 'classi', testo: 'Delle classi' },
]

/**
 * Il filtro non è un capriccio: «portare le fotocopie» e «esercizi 4–7» sono
 * due liste diverse con due momenti diversi. La prima si guarda la sera prima,
 * la seconda entrando in classe.
 */
function tieni (consegna: Consegna, filtro: FiltroTodo): boolean {
  if (filtro === 'mie') return consegna.a === 'docente'
  if (filtro === 'classi') return consegna.a !== 'docente'
  return true
}

/**
 * Quel che è stato chiuso: una scheda sola, in fondo, che si apre se la si
 * cerca.
 *
 * Delle quattro famiglie del todo solo le consegne avevano un «fatte»: i
 * recuperi chiusi e le prove riconsegnate sparivano e basta. Sparire è quel
 * che devono fare — una pagina che cresce e non si svuota smette di essere un
 * todo — ma non lasciare traccia è un'altra cosa: «l'ho già ridata a Rossi?»,
 * «quella verifica di ottobre l'avevo dispensata?» sono domande che si fanno
 * davvero, e senza questa scheda la risposta stava solo dentro la singola
 * prova, una per una.
 *
 * Chiusa di suo, e non aperta con un conto in alto: è materiale d'archivio, e
 * un archivio che si apre da sé sopra il lavoro di oggi è rumore.
 */
function schedaFatto (
  consegne: Consegna[],
  recuperiChiusi: Recupero[],
  proveRese: Riconsegna[],
  firmate: RichiestaFirma[],
): Figlio {
  const quanti = consegne.length + recuperiChiusi.length + proveRese.length + firmate.length
  if (quanti === 0) return null

  return scheda({
    titolo: 'Fatto',
    sottotitolo: `${quanti} ${quanti === 1 ? 'cosa chiusa' : 'cose chiuse'} · quel che non chiede più niente`,
    classe: 'todo-fatto',
    contenuto: h(
      'details',
      { class: 'todo-fatto__corpo' },
      h('summary', null, 'Mostra quel che è stato chiuso'),
      // Nello stesso ordine dei mucchi aperti qui sopra: chi cerca una cosa
      // chiusa la cerca dove stava quando era aperta.
      gruppoRichiesteFirma('Assenze firmate', firmate),
      gruppoRecuperi('Recuperi chiusi', recuperiChiusi, { mostraCorso: true }),
      gruppoRiconsegne('Prove riconsegnate', proveRese, { mostraCorso: true }),
      gruppoConsegne('Consegne fatte', consegne, 'fatta', { mostraCorso: true }),
    ),
  })
}

/**
 * Una scheda di riepilogo per famiglia: quante cose aperte, e quante premono.
 *
 * Sono le prime quattro cose che si vedono aprendo la pagina, e servono a una
 * domanda sola: da dove comincio? Il numero grande è quel che resta da fare, la
 * pastiglia sotto dice quanto di quello è in ritardo — che è la parte che
 * decide l'ordine con cui ci si mette al lavoro.
 *
 * Non filtrano e non aprono niente: chi le legge scende alla classe che gli
 * interessa. Un filtro per famiglia nasconderebbe proprio il confronto per cui
 * queste quattro schede stanno una accanto all'altra.
 */
function schedaFamiglia (riepilogo: RiepilogoTodo, famiglia: FamigliaTodo): Figlio {
  const conto = riepilogo.conti[famiglia]
  const simbolo =
    famiglia === 'assenze'
      ? 'firma'
      : famiglia === 'valutazioni'
        ? 'valutazioni'
        : famiglia === 'documenti'
          ? 'documento'
          : 'spunta'

  return h(
    'article',
    {
      class: [
        'todo-sintesi__scheda',
        conto.urgenti > 0 && 'todo-sintesi__scheda--preme',
        conto.aperti === 0 && 'todo-sintesi__scheda--vuota',
      ],
    },
    h(
      'header',
      { class: 'todo-sintesi__testata' },
      icona(simbolo, 'icona--minuta'),
      h('h3', { class: 'todo-sintesi__titolo' }, nomeFamiglia(famiglia)),
    ),
    h('p', { class: 'todo-sintesi__numero' }, String(conto.aperti)),
    conto.urgenti > 0
      ? pastiglia(`${conto.urgenti} in ritardo`, 'negativo')
      : h('span', { class: 'todo-sintesi__quiete testo-quieto' }, conto.aperti === 0 ? 'niente' : 'nessun ritardo'),
    h('p', { class: 'todo-sintesi__spiega testo-quieto' }, descriviFamiglia(famiglia)),
  )
}

/** Le quattro schede in cima, sempre tutte: una che manca è una famiglia dimenticata. */
function sintesiFamiglie (riepilogo: RiepilogoTodo): Figlio {
  return h(
    'div',
    { class: 'todo-sintesi' },
    ...FAMIGLIE_TODO.map((famiglia) => schedaFamiglia(riepilogo, famiglia)),
  )
}

export function vistaTodo (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--todo' },
      statoVuotoAnno({
        simbolo: 'spunta',
        testo: 'Le consegne appartengono a un corso: prima serve sapere che cosa si insegna e a chi.',
        avvia: () => moduloAvvio(),
      }),
    )
  }

  // Tutti i corsi dell'anno, senza il filtro per classe dell'agenda: la pagina
  // raggruppa già per classe, e una scheda che sparisce per una scelta fatta in
  // un'altra vista è lavoro che si crede finito.
  const corsi = corsiDellAnnoAperto()
  const classi = classiVisibili()
  const filtro = stato.filtroTodo
  // Il filtro «mie / delle classi» vale per le consegne, che sono le sole cose
  // di cui si possa dire a chi tocca fare il gesto. Le prove ferme, i recuperi
  // e le richieste di firma restano sempre in vista: sono lavoro di chi tiene
  // il registro, e non c'è un mucchio in cui nasconderli.
  const riepilogo = riepilogoTodo(stato.registro, classi, corsi, stato.adessoData, (consegna) =>
    tieni(consegna, filtro),
  )
  const conLavoro = classiConLavoro(riepilogo)

  // Le cose chiuse di tutte le classi, in un posto solo: si cercano per sapere
  // se una cosa era già stata fatta, non per classe.
  const chiuse = {
    consegne: riepilogo.classi.flatMap((c) => [...c.documenti.completate, ...c.attivita.completate]),
    recuperi: riepilogo.classi.flatMap((c) => c.recuperi.chiusi),
    prove: riepilogo.classi.flatMap((c) => c.riconsegne.fatte),
    firmate: riepilogo.classi.flatMap((c) => c.assenze.firmate),
  }

  return h(
    'div',
    { class: 'vista vista--todo' },
    testataVista({
      titolo: 'Todo',
      sottotitolo:
        riepilogo.aperti === 0
          ? 'niente in sospeso'
          : `${riepilogo.aperti} cose aperte in ${conLavoro.length} ${conLavoro.length === 1 ? 'classe' : 'classi'}` +
            (riepilogo.urgenti > 0 ? ` · ${riepilogo.urgenti} in ritardo` : ''),
      azioni: [
        selettore(filtro, FILTRI, (scelto) => aggiorna({ filtroTodo: scelto })),
        pulsante({
          testo: 'Nuova consegna',
          variante: 'primario',
          simbolo: 'piu',
          al: () => moduloConsegna({ corsoId: corsi[0]?.id }),
        }),
      ],
    }),
    sintesiFamiglie(riepilogo),
    conLavoro.length === 0
      ? statoVuoto({
          simbolo: 'spunta',
          titolo: 'Niente in sospeso',
          testo:
            'Qui finisce quel che resta aperto: i rapporti delle assenze da mandare, le prove ' +
            'da correggere e da ridare, i documenti da raccogliere o da consegnare, le attività ' +
            'assegnate. Compare da sé appena c’è, classe per classe.',
          azione: pulsante({
            testo: 'Assegna la prima',
            variante: 'primario',
            simbolo: 'piu',
            al: () => moduloConsegna({ corsoId: corsi[0]?.id }),
          }),
        })
      : h(
          'div',
          { class: 'todo-classi' },
          ...conLavoro.map((todo) => schedaTodoClasse(todo)),
        ),
    // Tutto quel che è chiuso in una scheda sola, in fondo.
    schedaFatto(chiuse.consegne, chiuse.recuperi, chiuse.prove, chiuse.firmate),
  )
}
