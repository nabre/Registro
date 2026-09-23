// Tutto quel che il registro sa stampare, in una pagina sola.
//
// I pulsanti c'erano già, ma sparsi: le presenze e le valutazioni nella scheda
// del corso, il verbale dentro l'ora, la scheda personale dentro la sua
// pagina. Ognuno al posto giusto per chi sta facendo quella cosa lì — e nessun
// posto per chi invece deve *consegnare*, che è un lavoro suo: succede a fine
// semestre, riguarda venti fogli insieme, e per farlo bisognava ricordarsi
// dove stava ogni pulsante e passare da cinque pagine diverse.
//
// Tre schede, perché sono tre consegne. **Corso**: i fogli della classe come
// gruppo — presenze, griglia dei voti, prove, piani, fascicolo — che si
// guardano tutti insieme e vanno in segreteria. **Lezioni**: una matrice, una
// riga per data e una colonna per documento — il verbale e il piano di ogni ora,
// ognuno con il suo stato e i suoi gesti, perché sono due fogli con due tempi
// diversi: il piano si stampa prima dell'ora, il verbale dopo. **Allievi**: la
// parete delle facce e una scheda a testa, venticinque righe di cui quasi
// sempre serve una, quella della persona che è nella stanza. Impilate sulla
// stessa pagina, per arrivare ai verbali bisognava scorrere la classe intera.
//
// E ogni riga dice se quel foglio c'è. Prima la pagina sapeva fare una cosa
// sola — rifare tutto — e chi doveva consegnare una cartella ristampava
// venticinque schede per sicurezza, perché non c'era modo di sapere quali
// mancassero. Adesso ogni documento si rifà, si butta via quando non ha più
// motivo di stare lì, e soprattutto **si guarda**: a lato della pagina c'è
// l'elenco dei PDF che stanno in cartella e la cornice che li mostra, che è il
// lettore di Chromium dentro la pagina. Quel che si vede è il file vero, non
// quel che il registro direbbe adesso, ed è proprio la differenza che si
// controlla un minuto prima di consegnare.
//
// Fare un foglio e guardarlo sono lo stesso gesto, e per questo il pulsante che
// lo rifà lo porta nella cornice: si rifà un documento perché il registro è
// cambiato, e la domanda subito dopo è «com'è venuto». Prima partiva il
// programma di sistema — una finestra per foglio da ritrovare nella barra delle
// applicazioni, e la cornice della pagina ferma su quello di prima proprio
// mentre lo si stava rifacendo.
//
// Il documento aperto si governa da dove lo si sta guardando: in testa alla
// cornice stanno il posto che occupa nell'elenco — «3 di 12» — le due frecce
// per scorrere i fogli della scheda, e i gesti di quel foglio. Controllarne
// venticinque prima di consegnarli è scorrerli uno dietro l'altro, non tornare
// ogni volta alla riga per premere la lente.
//
// Dalla pagina non si va da nessun'altra parte, ed è voluto: qui si gestiscono
// le esportazioni. I nomi — una data, un piano, una persona — non portano alle
// pagine dell'oggetto, perché quel clic portava via chi stava mettendo insieme
// venti fogli, che è il lavoro più facile da perdere a metà: premendo una riga
// si apre il suo documento nella cornice, e nient'altro.
//
// La pagina è quattro file, perché sono quattro mestieri:
//
//   documents.ts            questo: il telaio e quale scheda si guarda
//   documents/sheets.ts      un foglio, la sua riga, i suoi gesti
//   documents/cards.ts     i riquadri: che cosa un corso sa stampare
//   documents/preview.ts  la cornice e i gesti del foglio aperto
//
// Il taglio segue le dipendenze e non la lunghezza: i riquadri e l'anteprima
// sanno dei mattoni, i mattoni non sanno di loro, e questo file è l'unico che
// li conosce tutti e tre.

import type { Corso } from '../../domain/models.js'
import { statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { moduloAvvio } from '../forms.js'
import { annoCorrente, corsiDellAnnoAperto, nomeSemestreScelto, stato } from '../state.js'

import { cornice, documentoAperto, senzaAnteprima } from './documents/preview.js'
import { azzeraRighe } from './documents/sheets.js'
import {
  composizioni,
  dellaClasse,
  delCorso,
  fotoDellaClasse,
  matriceLezioni,
  piani,
  prove,
  schedeAllievo,
} from './documents/cards.js'

/**
 * I riquadri della scheda aperta: del corso, delle lezioni, delle persone.
 *
 * Una griglia sola per tutti: nella barra viene una colonna, in una finestra
 * larga se ne fanno due. Prima le coppie erano dichiarate a mano — questo con
 * quello — e una scheda vuota lasciava mezza riga di bianco accanto a una
 * piena.
 */
function schedeDelCorso (corso: Corso): Figlio {
  // Le composizioni in fondo a tutte e tre: sono fatte con fogli presi da
  // elenchi diversi, e non appartengono a nessuno dei tre.
  if (stato.schedaDocumenti === 'lezioni') return [matriceLezioni(corso), composizioni()]
  if (stato.schedaDocumenti === 'allievi') {
    return [fotoDellaClasse(corso), schedeAllievo(corso), composizioni()]
  }
  return h(
    'div',
    { class: 'documenti__griglia' },
    delCorso(corso),
    dellaClasse(corso),
    prove(corso),
    piani(corso),
    composizioni(),
  )
}

export function vistaDocumenti (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--documenti' },
      statoVuotoAnno({
        simbolo: 'esporta',
        testo:
          'I documenti escono da un corso: prima serve un anno, una classe e una materia. ' +
          'L’avvio guidato li mette insieme in una finestra sola.',
        avvia: () => moduloAvvio(),
      }),
    )
  }

  const corsi = corsiDellAnnoAperto()
  // Lo stesso corso della vista Corsi, perché è lo stesso di tutto il
  // registro: quello della tendina in cima. Si passa di qua per stampare quel
  // che si stava guardando, e ritrovarne un altro sarebbe una trappola.
  const scelto = corsoDelContesto()
  // I riquadri prima dell'anteprima, e non è un dettaglio d'ordine: è
  // disegnandoli che ogni riga si annuncia in `disegnate`, ed è da lì che
  // vengono il conto in testa alle schede e l'elenco che l'anteprima scorre —
  // «3 di 12», e qual è il foglio dopo. Letto prima, sarebbe sempre quello del
  // ridisegno di prima.
  azzeraRighe()
  const riquadri = scelto ? schedeDelCorso(scelto) : null
  const aperto = documentoAperto()

  return h(
    'div',
    { class: 'vista vista--documenti' },
    // Nella testata solo il nome della pagina e di che corso si parla: le tre
    // schede e «Aggiorna tutto» stanno nella riga delle azioni, con gli altri
    // comandi della pagina. Sono cose che si premono, e si cercano là — non in
    // mezzo ai fogli da consegnare; e ripetute nei due posti sarebbero due
    // pulsanti uguali a un centimetro l'uno dall'altro.
    testataVista({
      compatta: true,
      titolo: 'Documenti',
      sottotitolo: scelto
        ? `${scelto.titolo} · ${nomeSemestreScelto()}`
        : `quel che esce dal registro e va in mano ad altri · ${nomeSemestreScelto()}`,
    }),
    corsi.length === 0
      ? statoVuoto({
          simbolo: 'libro',
          titolo: 'Nessun corso',
          // Niente pulsante che porti ai corsi: questa pagina gestisce le
          // esportazioni e nient'altro, e alle pagine si va dalla barra
          // laterale. Il testo dice dove, che è quel che serve sapere.
          testo:
            'I documenti sono di un corso: le ore che si contano e la media in fondo alla ' +
            'griglia sono le sue. Senza corsi non c’è niente da stampare — i corsi si fanno ' +
            'nella pagina Corsi.',
        })
      : scelto
        ? h(
            'div',
            { class: 'documenti__lavoro' },
            // A sinistra la barra dei riquadri: che cosa c'è nella cartella e i
            // gesti per governarlo. A destra il foglio che si sta guardando.
            // Sono le due metà dello stesso lavoro, e stando insieme si passa
            // dall'una all'altra senza che nessuna delle due se ne vada.
            h(
              'aside',
              { class: 'documenti__barra', dataset: { scorrimento: 'documenti:barra' } },
              h(
                'div',
                { class: ['documenti', `documenti--${stato.schedaDocumenti}`] },
                riquadri,
              ),
            ),
            h(
              'main',
              { class: 'documenti__corpo' },
              aperto ? cornice(aperto) : senzaAnteprima(),
            ),
          )
        : null,
  )
}
