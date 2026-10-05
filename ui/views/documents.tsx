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
//   documents/sheets.tsx   un foglio, la sua riga, i suoi gesti
//   documents/cards.tsx    i riquadri: che cosa un corso sa stampare
//   documents/preview.tsx  la cornice e i gesti del foglio aperto
//
// Riquadri e anteprima dipendono dai mattoni (`sheets.tsx`), non viceversa;
// solo questo file li conosce tutti.

import type { ReactElement, ReactNode } from 'react'

import type { Corso } from '#core/dominio/models.js'
import { StatoVuoto, TestataVista } from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { corsoDelContesto } from '#ui/context.js'
import { moduloAnno } from '#ui/forms.js'
import { annoCorrente, corsiDellAnnoAperto, nomeSemestreScelto, stato } from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
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
function schedeDelCorso (corso: Corso): ReactNode {
  // Le schede: corso, docente di classe, persona in formazione, docente.
  if (stato.schedaDocumenti === 'classe') return dellaClasse(corso)
  if (stato.schedaDocumenti === 'allievi') return schedeAllievo(corso)
  if (stato.schedaDocumenti === 'docente') return delDocente(corso)
  return delCorso(corso)
}

export function vistaDocumenti (): ReactElement {
  return <VistaDocumenti />
}

function VistaDocumenti (): ReactElement {
  const anno = annoCorrente()
  const t = testi()
  if (!anno) {
    return (
      <div className="vista vista--documenti" data-telaio={telaioVista()}>
        <StatoVuotoAnno simbolo="esporta" testo={t.vuotoAnno} crea={() => moduloAnno()} />
      </div>
    )
  }

  const corsi = corsiDellAnnoAperto()
  // Il corso della tendina in cima, come in tutto il registro.
  const scelto = corsoDelContesto()
  // I riquadri prima dell'anteprima: disegnandoli le righe si annunciano in
  // `disegnate`, da cui vengono il conto delle schede e l'elenco dell'anteprima,
  // che l'isola legge disegnandosi dopo.
  azzeraRighe()
  const riquadri = scelto ? schedeDelCorso(scelto) : null

  return (
    // Telaio fino alla barra e al corpo: le prove li ritrovano per chiave, e un
    // ridisegno non ricrea le scatole che scorrono.
    <div className="vista vista--documenti" data-telaio={telaioVista()}>
      {/* Nella testata solo pagina e corso: schede e «Aggiorna tutto» stanno nella
          riga delle azioni. */}
      <TestataVista
        titolo={Molti(lessico().documento)}
        sottotitolo={scelto ? `${scelto.titolo} · ${nomeSemestreScelto()}` : nomeSemestreScelto()}
        aiuto={t.aiuto}
      />
      {corsi.length === 0
        ? (
            <StatoVuoto
              simbolo="libro"
              titolo={t.nessunCorso}
              // Nessun pulsante verso i corsi: il testo dice dove andare.
              testo={t.nessunCorsoTesto}
            />
          )
        : scelto
          ? (
              <div className="documenti__lavoro" data-telaio="documenti:lavoro">
                {/* A sinistra la barra dei riquadri, a destra il foglio che si sta guardando. */}
                <aside className="documenti__barra" data-telaio="documenti:barra" data-scorrimento="documenti:barra">
                  <div className={`documenti documenti--${stato.schedaDocumenti}`}>{riquadri}</div>
                </aside>
                <main className="documenti__corpo" data-telaio="documenti:corpo">
                  {anteprima()}
                </main>
              </div>
            )
          : null}
    </div>
  )
}
