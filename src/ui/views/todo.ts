// Il todo: tutto quel che è rimasto in giro, classe per classe.
//
// Dentro una lezione si vede quel che riguarda quell'ora, ed è giusto così — è
// lì che si assegna e si ritira. Ma la domanda della domenica sera è un'altra:
// che cosa ho lasciato in giro? A quella nessuna lezione può rispondere, perché
// ognuna guarda un corso solo. Questa pagina risponde a quella.
//
// È fatta a due strati. In cima le tipologie di lavoro con i loro conti — le
// assenze da far firmare, i momenti di valutazione, e poi chi deve fare che
// cosa: consegna la classe, svolge la classe, consegna il docente, svolge il
// docente — che dicono in una riga sola dove si è indietro. Sotto, una scheda
// per classe con dentro le stesse tipologie, ma solo quelle che hanno qualcosa
// da dire.
//
// Per classe e non per corso, ed è il punto: un docente entra in un'aula, non
// in un corso, e ci porta dentro tutti i mestieri insieme. Un elenco ordinato
// per scadenza faceva scorrere avanti e indietro fra tre classi per mettere
// insieme quel che riguardava la stessa gente.
//
// Le cose chiuse stanno in fondo, in una scheda che si apre se la si cerca:
// servono a ricordarsi che cosa si era dato, non a occupare la schermata.

import { CARTE, Molti, quanti } from '../../domain/lexicon.js'
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
import { moduloAvvio, moduloConsegna } from '../forms.js'
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
 * Delle tipologie delle pendenze solo le consegne avevano un «fatte»: i
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
 * Una riga di riepilogo per famiglia: quante pendenze, e quante premono.
 *
 * Sono le prime cose che si vedono aprendo la pagina, e servono a una domanda
 * sola: da dove comincio? Il numero è quel che resta da fare, la riga rossa
 * sotto dice quanto di quello è in ritardo — che è la parte che decide
 * l'ordine con cui ci si mette al lavoro.
 *
 * Una riga e non una scheda in quattro piani: centotrenta pixel a testa per
 * dire due numeri, e sotto cominciava il lavoro vero — le classi — che è il
 * motivo per cui si apre la pagina. La spiegazione della famiglia resta nel
 * titolo che compare fermandosi sopra: si legge la prima volta e poi non serve
 * più, ed è esattamente quel che un `title` è fatto per fare.
 *
 * Sparisce anche il «nessun ritardo» quando non ce n'è: l'assenza della riga
 * rossa lo dice già, e una riga che scrive di non avere niente da dire è
 * rumore. Il numero a zero resta — è il confronto fra tutte che conta — e la
 * riga si spegne.
 *
 * Non filtrano e non aprono niente: chi le legge scende alla classe che gli
 * interessa. Un filtro per famiglia nasconderebbe proprio il confronto per cui
 * queste quattro righe stanno una accanto all'altra.
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
    // Il ritardo su una riga sua, sotto il numero che qualifica: era una
    // pastiglia dentro una riga che ha già un filo rosso a sinistra, e lo
    // stesso fatto detto due volte con due segni diversi si legge come due.
    conto.urgenti > 0
      ? h('span', { class: 'todo-sintesi__ritardo' }, `${conto.urgenti} in ritardo`)
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
 * Le linguette delle classi: una per classe che ha qualcosa in sospeso.
 *
 * Le classi stavano una sotto l'altra, e con sei classi la pagina era lunga
 * un metro: per arrivare alla terza bisognava scorrere le prime due, che non
 * si stavano guardando. Una alla volta, e la si sceglie.
 *
 * «Tutte» resta la prima ed è quel che si trova aprendo: è la risposta alla
 * domanda della domenica sera — che cosa ho lasciato in giro, dappertutto — e
 * le linguette servono a scendere in una classe dopo averla vista in elenco.
 * Ogni linguetta porta il suo conto: si sceglie sapendo quanto c'è dietro.
 *
 * Con una classe sola non compaiono: una linguetta che non si può cambiare è
 * una riga da imparare a ignorare.
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
        { valore: '', testo: `Tutte · ${totale}` },
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
  // La classe scelta, se ha ancora qualcosa in sospeso: una scheda che si
  // svuota mentre la si guarda non deve lasciare la pagina bianca, e «tutte» è
  // sempre una risposta buona.
  const scelta = conLavoro.some((todo) => todo.classeId === stato.classeTodoId)
    ? stato.classeTodoId
    : null
  const mostrate = scelta ? conLavoro.filter((todo) => todo.classeId === scelta) : conLavoro

  // Le cose chiuse di tutte le classi, in un posto solo: si cercano per sapere
  // se una cosa era già stata fatta, non per classe.
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
      titolo: Molti(CARTE.pendenza),
      sottotitolo:
        riepilogo.aperti === 0
          ? 'niente in sospeso'
          : `${quanti(riepilogo.aperti, CARTE.pendenza)} in ${conLavoro.length} ${conLavoro.length === 1 ? 'classe' : 'classi'}` +
            (riepilogo.urgenti > 0 ? ` · ${riepilogo.urgenti} in ritardo` : ''),
      // Compatta, e senza il selettore: «Tutte / Le mie / Delle classi» sono
      // tre comandi di questa pagina, e stanno nella riga delle azioni. Sotto
      // la testata ci sono le schede di riepilogo, che sono la prima cosa da
      // leggere: l'intestazione deve togliere loro meno spazio possibile.
      compatta: true,
    }),
    // Il riepilogo resta di tutte le classi anche con una scheda aperta: è il
    // confronto fra le tipologie che dice da dove cominciare, e restringerlo a
    // una classe lo toglierebbe proprio a chi sta scegliendo in quale entrare.
    sintesiFamiglie(riepilogo),
    schedeDiClasse(conLavoro, scelta),
    conLavoro.length === 0
      ? statoVuoto({
          simbolo: 'spunta',
          titolo: 'Niente in sospeso',
          testo:
            'Qui finisce quel che resta aperto, diviso per tipologia: le assenze da far ' +
            'firmare, i momenti di valutazione, e poi chi deve fare che cosa — i fogli che la ' +
            'classe deve portare, quelli che tocca dare, quel che è stato assegnato e quel che ' +
            'tocca fare a chi insegna. Compare da sé appena c’è, classe per classe.',
          azione: pulsante({
            testo: 'Assegna la prima',
            variante: 'primario',
            simbolo: 'piu',
            al: () => moduloConsegna({ corsoId: corsi[0]?.id }),
          }),
        })
      : scelta
        ? // Con una linguetta aperta il riquadro con il nome della classe non
          // serve più: quel nome è scritto nella linguetta, due centimetri più
          // sopra e in grande, e ripeterlo in testata a un box che contiene
          // l'unica cosa della pagina è un giro di cornice attorno al vuoto.
          // Restano le tipologie, nude, come nel registro di classe.
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
