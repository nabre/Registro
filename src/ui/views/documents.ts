// Tutto quel che il registro sa stampare, in una pagina sola, per chi deve
// consegnare.
// Tre schede: Corso (i fogli della classe come gruppo), Lezioni (matrice data ×
// documento: piano prima dell'ora, verbale dopo), Allievi (parete di ritratti e
// una scheda a testa). Ogni riga dice se il foglio c'è, si rifà, si butta e si
// guarda nella cornice accanto, che mostra il file vero. Rifare un foglio lo
// apre nella cornice. In testa alla cornice posizione, frecce e gesti del foglio.
// La pagina non porta altrove: premere una riga apre il suo documento.
//
//   documents.ts          il telaio e quale scheda si guarda
//   documents/sheets.ts   un foglio, la sua riga, i suoi gesti
//   documents/cards.ts    i riquadri: che cosa un corso sa stampare
//   documents/preview.ts  la cornice e i gesti del foglio aperto
//
// Riquadri e anteprima dipendono dai mattoni (`sheets.ts`), non viceversa;
// solo questo file li conosce tutti.

import type { Corso } from '../../domain/models.js'
import { statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { moduloAnno } from '../forms.js'
import { annoCorrente, corsiDellAnnoAperto, nomeSemestreScelto, stato } from '../state.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { testi } from './documents.testi.js'

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

/** I riquadri della scheda aperta, in una griglia sola: una colonna nella barra, due se c'è spazio. */
function schedeDelCorso (corso: Corso): Figlio {
  // Le composizioni in fondo a tutte e tre: non appartengono a nessuna.
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
  const t = testi()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--documenti' },
      statoVuotoAnno({
        simbolo: 'esporta',
        testo: t.vuotoAnno,
        crea: () => moduloAnno(),
      }),
    )
  }

  const corsi = corsiDellAnnoAperto()
  // Il corso della tendina in cima, come in tutto il registro.
  const scelto = corsoDelContesto()
  // I riquadri prima dell'anteprima: disegnandoli le righe si annunciano in
  // `disegnate`, da cui vengono il conto delle schede e l'elenco dell'anteprima.
  azzeraRighe()
  const riquadri = scelto ? schedeDelCorso(scelto) : null
  const aperto = documentoAperto()

  return h(
    'div',
    { class: 'vista vista--documenti' },
    // Nella testata solo pagina e corso: schede e «Aggiorna tutto» stanno nella
    // riga delle azioni.
    testataVista({
      compatta: true,
      titolo: Molti(lessico().documento),
      sottotitolo: scelto ? `${scelto.titolo} · ${nomeSemestreScelto()}` : nomeSemestreScelto(),
      aiuto: t.aiuto,
    }),
    corsi.length === 0
      ? statoVuoto({
          simbolo: 'libro',
          titolo: t.nessunCorso,
          // Nessun pulsante verso i corsi: il testo dice dove andare.
          testo: t.nessunCorsoTesto,
        })
      : scelto
        ? h(
            'div',
            { class: 'documenti__lavoro' },
            // A sinistra la barra dei riquadri, a destra il foglio che si sta guardando.
            h(
              'aside',
              { class: 'documenti__barra', dataset: { scorrimento: 'documenti:barra' } },
              h(
                'div',
                // testo-fisso: classi CSS
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
