// La pagina di benvenuto: l'elenco degli anni noti e le due strade per
// cominciare. Riceve l'elenco già fatto (`environment/documents.ts`) e rimanda
// gesti, che esegue `desktop/shell/windows/welcome.ts`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '#desktop/shell/pages/shared/titleBar.js'
import type { DocumentoNoto } from '#desktop/apparato/documents.js'
import type { RaccontoAggiornamenti, StatoAggiornamenti } from '#contract/protocol.js'
import type { RichiestaBenvenuto } from '#desktop/shell/windows/welcome.js'
import { allEsc, ascolta, elemento, manda, perId, riempi } from '#desktop/shell/pages/shared/page.js'
import { parole } from '#core/dominio/words.testi.js'
import { LINGUE, NOMI_DELLE_LINGUE, SCELTA_SISTEMA, lingua, èLingua } from '#core/i18n/index.js'
import { bandiera } from '#core/i18n/flags.js'
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

// Esc chiude, come ovunque: qui vuol dire rinunciare. Col menu della lingua
// aperto chiude solo lui (`chiudiMenuLingua` ferma il tasto prima).
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

// ------------------------------------------------------------- la lingua
//
// Un bottone discreto con la bandiera della lingua di adesso, e un menu con le
// scelte di `registroDocenti.aspetto.lingua`: ognuna col suo nome, così la
// trova anche chi non legge la lingua in cui il registro parla adesso. La
// pagina la lingua risolta la sa già (`core/i18n/page.ts`); la scelta scritta
// — magari `sistema` — gliela manda il main process.

const bottoneLingua = perId<HTMLButtonElement>('lingua-bottone')
const menuLingua = perId<HTMLUListElement>('lingua-menu')
let sceltaScritta: string = SCELTA_SISTEMA

/** Le quattro bandiere in un riquadro: «come il sistema», che può essere ognuna. */
function mosaico (): HTMLSpanElement {
  const quadro = elemento('span', 'lingua__mosaico')
  quadro.setAttribute('aria-hidden', 'true')
  quadro.append(...LINGUE.map((una) => bandiera(una)))
  return quadro
}

function disegnaBottoneLingua (): void {
  const adesso = lingua()
  const delSistema = sceltaScritta === SCELTA_SISTEMA
  const detto = t.linguaAdesso(NOMI_DELLE_LINGUE[adesso], delSistema)
  bottoneLingua.replaceChildren(bandiera(adesso), elemento('span', 'lingua__sigla', adesso.toUpperCase()))
  bottoneLingua.title = detto
  bottoneLingua.setAttribute('aria-label', detto)
}

function vociLingua (): HTMLElement[] {
  return [...menuLingua.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
}

function disegnaMenuLingua (): void {
  menuLingua.replaceChildren()
  for (const valore of [SCELTA_SISTEMA, ...LINGUE]) {
    const voce = elemento('li', 'lingua__voce')
    voce.setAttribute('role', 'menuitemradio')
    voce.setAttribute('aria-checked', String(valore === sceltaScritta))
    voce.tabIndex = -1
    voce.dataset.valore = valore
    if (èLingua(valore)) {
      // Il nome è scritto nella sua lingua: il lettore di schermo lo pronunci così.
      voce.lang = valore
      voce.append(bandiera(valore), elemento('span', null, NOMI_DELLE_LINGUE[valore]))
    } else {
      voce.append(mosaico(), elemento('span', null, t.linguaSistema))
    }
    voce.addEventListener('click', () => scegli(valore))
    menuLingua.append(voce)
  }
}

function apriMenuLingua (): void {
  disegnaMenuLingua()
  menuLingua.hidden = false
  bottoneLingua.setAttribute('aria-expanded', 'true')
  const voci = vociLingua()
  const scelta = voci.find((voce) => voce.getAttribute('aria-checked') === 'true') ?? voci[0]
  scelta?.focus()
}

function chiudiMenuLingua (ridaiFuoco: boolean): void {
  if (menuLingua.hidden) return
  menuLingua.hidden = true
  bottoneLingua.setAttribute('aria-expanded', 'false')
  if (ridaiFuoco) bottoneLingua.focus()
}

function scegli (valore: string): void {
  chiudiMenuLingua(true)
  if (valore !== sceltaScritta) chiedi({ benvenuto: 'lingua', scelta: valore })
}

bottoneLingua.addEventListener('click', () => {
  if (menuLingua.hidden) apriMenuLingua()
  else chiudiMenuLingua(true)
})

bottoneLingua.addEventListener('keydown', (evento) => {
  if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return
  evento.preventDefault()
  apriMenuLingua()
})

menuLingua.addEventListener('keydown', (evento) => {
  const voci = vociLingua()
  const qui = voci.indexOf(document.activeElement as HTMLElement)
  const vai = (indice: number): void => voci[(indice + voci.length) % voci.length]?.focus()
  switch (evento.key) {
    case 'ArrowDown':
      vai(qui + 1)
      break
    case 'ArrowUp':
      vai(qui - 1)
      break
    case 'Home':
      vai(0)
      break
    case 'End':
      vai(voci.length - 1)
      break
    case 'Enter':
    case ' ': {
      const valore = voci[qui]?.dataset.valore
      if (valore) scegli(valore)
      break
    }
    case 'Escape':
      // Prima di `allEsc`, che chiuderebbe la finestra.
      evento.stopPropagation()
      chiudiMenuLingua(true)
      break
    case 'Tab':
      chiudiMenuLingua(false)
      return
    default:
      return
  }
  evento.preventDefault()
})

// Un clic fuori chiude il menu senza scegliere.
document.addEventListener('click', (evento) => {
  const dove = evento.target
  if (dove instanceof Node && (menuLingua.contains(dove) || bottoneLingua.contains(dove))) return
  chiudiMenuLingua(false)
})

disegnaBottoneLingua()

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
  if (messaggio.benvenuto === 'lingua') {
    const { scelta } = messaggio as { scelta?: unknown }
    sceltaScritta = typeof scelta === 'string' ? scelta : SCELTA_SISTEMA
    disegnaBottoneLingua()
    if (!menuLingua.hidden) disegnaMenuLingua()
    return
  }
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
