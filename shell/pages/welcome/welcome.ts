// La pagina di benvenuto: l'elenco degli anni noti e le due strade per
// cominciare. Riceve l'elenco già fatto (`environment/documents.ts`) e rimanda
// gesti, che esegue `shell/windows/welcome.ts`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../../../src/i18n/page.js'
import type { DocumentoNoto } from '../../../src/environment/documents.js'
import type { RaccontoAggiornamenti, StatoAggiornamenti } from '../../../src/protocol.js'
import type { RichiestaBenvenuto } from '../../windows/welcome.js'
import { allEsc, ascolta, elemento, manda, perId, riempi } from '../shared/page.js'
import { parole } from '../../../src/domain/words.testi.js'
import { testi } from './welcome.testi.js'

import './welcome.css'

const t = testi()
// «Esci» è la parola di tutti: il catalogo della pagina non la ripete.
riempi({ ...t, esci: parole().esci })

const elenco = perId('elenco')

function chiedi (richiesta: RichiestaBenvenuto): void {
  manda(richiesta)
}

perId('apri').addEventListener('click', () => chiedi({ benvenuto: 'apri' }))
perId('crea').addEventListener('click', () => chiedi({ benvenuto: 'crea' }))
perId('esci').addEventListener('click', () => chiedi({ benvenuto: 'esci' }))

// Esc chiude, come ovunque: qui vuol dire rinunciare.
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
    // O il clic arriverebbe anche alla riga e aprirebbe l'anno.
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
    voce.mancante ? t.nonDisponibile(voce.cartella) : voce.cartella,
  ))
  li.append(dati)

  const gesti = elemento('div', 'gesti')
  gesti.append(gesto(
    voce.preferito ? '★' : '☆',
    voce.preferito ? t.togliDaiPreferiti : t.tieniDaParte,
    voce.preferito,
    () => chiedi({ benvenuto: 'preferito', percorso: voce.percorso, valore: !voce.preferito }),
  ))
  gesti.append(gesto(
    '✕',
    t.dimentica,
    false,
    () => chiedi({ benvenuto: 'dimentica', percorso: voce.percorso }),
  ))
  li.append(gesti)

  // Un file che adesso manca non si apre, ma resta in elenco: può tornare.
  if (!voce.mancante) {
    li.addEventListener('click', () => chiedi({ benvenuto: 'apriPercorso', percorso: voce.percorso }))
  }
  return li
}

function disegna (voci: DocumentoNoto[]): void {
  elenco.replaceChildren()
  if (voci.length === 0) {
    elenco.append(elemento('li', 'vuoto', t.nessunAnno))
    return
  }
  for (const voce of voci) elenco.append(riga(voce))
}

// -------------------------------------------------------- gli aggiornamenti
//
// Lo stato arriva già a parole (`RaccontoAggiornamenti`): la pagina le mette
// al posto e rimanda il gesto proposto. Come nel registro: il piede dice sempre
// a che punto si è, il filetto in cima c'è solo con una notizia.

function gestoIn (
  bottone: HTMLButtonElement,
  gesto: RaccontoAggiornamenti['gesto'] | undefined,
): void {
  bottone.hidden = !gesto
  if (!gesto) return
  bottone.textContent = gesto.testo
  bottone.disabled = gesto.spento === true
  bottone.onclick = () => chiedi({ benvenuto: 'aggiornamento', gesto: gesto.tipo })
}

function disegnaAggiornamenti (s: StatoAggiornamenti, nascosta: string | undefined): void {
  const r = s.racconto
  const filetto = perId('filetto')
  const conFiletto = r.notizia !== undefined && r.notizia !== nascosta

  filetto.hidden = !conFiletto
  if (conFiletto) {
    filetto.dataset.tono = r.tono
    perId('filetto-testo').textContent = r.frase
    gestoIn(perId<HTMLButtonElement>('filetto-gesto'), r.gesto)
    perId('filetto-chiudi').onclick = () => chiedi({ benvenuto: 'nascondiNotizia', notizia: r.notizia ?? '' })
    // Lo scarico: un filo lungo il bordo di sotto, non una barra in più.
    const quota = perId('filetto-quota')
    quota.hidden = r.quota === undefined
    const pieno = quota.firstElementChild as HTMLElement | null
    if (pieno) pieno.style.width = `${Math.round((r.quota ?? 0) * 100)}%`
  }

  const pastiglia = perId('aggiornamento-stato')
  pastiglia.hidden = false
  pastiglia.textContent = r.breve
  // testo-fisso: classi CSS
  pastiglia.className = `pastiglia pastiglia--${r.tono}`
  pastiglia.title = r.frase
  // Il gesto sta in un posto solo: nel filetto quando c'è, qui altrimenti.
  gestoIn(perId<HTMLButtonElement>('aggiornamento-gesto'), conFiletto ? undefined : r.gesto)
}

ascolta((messaggio) => {
  if (messaggio.benvenuto === 'aggiornamenti') {
    const { stato, nascosta } = messaggio as { stato?: StatoAggiornamenti, nascosta?: string }
    if (stato) disegnaAggiornamenti(stato, nascosta)
    return
  }
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
