// La pagina di benvenuto: l'elenco degli anni noti, e le due strade per
// cominciare.
//
// Non sa niente del registro. Riceve un elenco già fatto —
// `environment/documents.ts` lo tiene in `userData`, apposta perché parla di
// documenti sparsi in cartelle diverse — e rimanda indietro gesti: apri questo,
// mettilo da parte, dimenticalo, creane uno nuovo, esci. Chi li esegue è
// `shell/windows/welcome.ts`.

import type { DocumentoNoto } from '../../../src/environment/documents.js'
import type { RichiestaBenvenuto } from '../../windows/welcome.js'
import { allEsc, ascolta, elemento, manda, perId } from '../shared/page.js'

import './welcome.css'

const elenco = perId('elenco')

function chiedi (richiesta: RichiestaBenvenuto): void {
  manda(richiesta)
}

perId('apri').addEventListener('click', () => chiedi({ benvenuto: 'apri' }))
perId('crea').addEventListener('click', () => chiedi({ benvenuto: 'crea' }))
perId('esci').addEventListener('click', () => chiedi({ benvenuto: 'esci' }))

// Esc chiude, come in ogni altra finestra del registro: qui vuol dire
// rinunciare, e chi rinuncia all'avvio non ha niente da aprire.
allEsc(() => chiedi({ benvenuto: 'esci' }))

/** Un gesto di contorno: la stella e la croce, che non aprono niente. */
function gesto (
  etichetta: string,
  titolo: string,
  acceso: boolean,
  al: () => void,
): HTMLButtonElement {
  const bottone = elemento('button', acceso ? 'acceso' : null, etichetta)
  bottone.type = 'button'
  bottone.title = titolo
  bottone.setAttribute('aria-label', titolo)
  bottone.addEventListener('click', (evento) => {
    // O il clic arriverebbe anche alla riga, e mettere da parte un anno lo
    // aprirebbe: due cose diverse dallo stesso dito.
    evento.stopPropagation()
    al()
  })
  return bottone
}

function riga (voce: DocumentoNoto): HTMLLIElement {
  const li = elemento('li', voce.mancante ? 'voce voce--mancante' : 'voce')
  li.title = voce.percorso

  const dati = elemento('div', 'voce__dati')
  dati.append(elemento('span', 'voce__etichetta', voce.nome))
  dati.append(elemento(
    'span',
    'voce__sotto',
    voce.mancante ? 'non disponibile — ' + voce.cartella : voce.cartella,
  ))
  li.append(dati)

  const gesti = elemento('div', 'gesti')
  gesti.append(gesto(
    voce.preferito ? '★' : '☆',
    voce.preferito ? 'Togli dai preferiti' : 'Tieni da parte: i preferiti non scadono',
    voce.preferito,
    () => chiedi({ benvenuto: 'preferito', percorso: voce.percorso, valore: !voce.preferito }),
  ))
  gesti.append(gesto(
    '✕',
    'Togli dall’elenco. Il file sul disco non si tocca',
    false,
    () => chiedi({ benvenuto: 'dimentica', percorso: voce.percorso }),
  ))
  li.append(gesti)

  // Un file che adesso non c'è non si apre: si lascia lì, perché una chiavetta
  // si riattacca e una cartella sincronizzata scende.
  if (!voce.mancante) {
    li.addEventListener('click', () => chiedi({ benvenuto: 'apriPercorso', percorso: voce.percorso }))
  }
  return li
}

function disegna (voci: DocumentoNoto[]): void {
  elenco.replaceChildren()
  if (voci.length === 0) {
    elenco.append(elemento('li', 'vuoto', 'Nessun anno aperto finora: comincia creandone uno.'))
    return
  }
  for (const voce of voci) elenco.append(riga(voce))
}

ascolta((messaggio) => {
  if (messaggio.benvenuto !== 'elenco') return
  const { invito, versione, voci } = messaggio as {
    invito?: string
    versione?: string
    voci?: DocumentoNoto[]
  }
  perId('invito').textContent = invito ?? ''
  perId('versione').textContent = versione ?? ''
  disegna(voci ?? [])
  chiedi({ benvenuto: 'pronto' })
})
