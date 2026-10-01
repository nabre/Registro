// Tutto quel che il registro sa stampare, in una pagina sola, per chi deve
// consegnare.
// Le schede: Corso (i fogli della classe come gruppo), Lezioni (matrice data ×
// documento: piano prima dell'ora, verbale dopo), Allievi (una scheda a testa),
// Docente (le supplenze tenute nel corso). Con dei progetti, «Del corso» e
// Allievi stanno a linguette, «Corso» e una per progetto, con una scelta sola
// per tutte e due. Ogni riga dice se il foglio c'è, si rifà, si butta e si
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

import type { Corso } from '../../../core/dominio/models.js'
import { statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { moduloAnno } from '../forms.js'
import { annoCorrente, corsiDellAnnoAperto, nomeSemestreScelto, stato } from '../state.js'
import { Molti } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import { testi } from './documents.testi.js'

import { anteprima } from './documents/preview.js'
import { azzeraRighe } from './documents/sheets.js'
import {
  dellaClasse,
  delCorso,
  delDocente,
  schedeAllievo,
} from './documents/cards.js'

/** I riquadri della scheda aperta, in una griglia sola: una colonna nella barra, due se c'è spazio. */
function schedeDelCorso (corso: Corso): Figlio {
  // Le schede: corso, docente di classe, persona in formazione, docente.
  if (stato.schedaDocumenti === 'classe') return dellaClasse(corso)
  if (stato.schedaDocumenti === 'allievi') return schedeAllievo(corso)
  if (stato.schedaDocumenti === 'docente') return delDocente(corso)
  return delCorso(corso)
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

  return h(
    'div',
    // Telaio fino alla barra e al corpo: un ridisegno (una spunta, «Aggiorna
    // tutto») non ricrea le scatole che scorrono, e il gesto in corsa resta.
    { class: 'vista vista--documenti', dataset: { telaio: 'documenti' } },
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
            { class: 'documenti__lavoro', dataset: { telaio: 'documenti:lavoro' } },
            // A sinistra la barra dei riquadri, a destra il foglio che si sta guardando.
            h(
              'aside',
              { class: 'documenti__barra', dataset: { telaio: 'documenti:barra', scorrimento: 'documenti:barra' } },
              h(
                'div',
                // testo-fisso: classi CSS
                { class: ['documenti', `documenti--${stato.schedaDocumenti}`] },
                riquadri,
              ),
            ),
            h(
              'main',
              { class: 'documenti__corpo', dataset: { telaio: 'documenti:corpo' } },
              anteprima(),
            ),
          )
        : null,
  )
}
