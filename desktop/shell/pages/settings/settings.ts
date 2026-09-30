// Le impostazioni del programma nella finestra nativa: la scialuppa per quando
// nessun documento è aperto e il pannello non c'è. Riceve le voci
// (`vociImpostazioni()`: manifesto più stato attuale) e le mostra con i nomi di
// aree e sezioni del pannello (`core/controlli/areas.ts`): Utente › Posta e
// Programma; Calendario e Didattica stanno nel file dell'anno e lo dicono.
//
// I controlli sono gli stessi del pannello (`core/controlli/control.ts`,
// ADR-52). Scrive per messaggio: la dogana sta in
// `desktop/shell/windows/menu.ts`, e un rifiuto torna qui con il motivo, che il
// controllo dice sotto il campo. I testi finiscono in `textContent`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../../../../core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '../shared/titleBar.js'
import {
  AREE,
  AREE_DELL_ANNO,
  senzaAnno,
  sezioniDellArea,
  titoloArea,
  type Sezione,
} from '../../../../core/controlli/areas.js'
import {
  controllo,
  diciEsito,
  fuocoDentro,
  type Esito,
  type Valore,
} from '../../../../core/controlli/control.js'
import type { VoceProgramma } from '../../../../contract/protocollo.js'
import type { RichiestaImpostazioni } from '../../windows/menu.js'
import { ascolta, elemento, manda, perId, riempi } from '../shared/page.js'
import { testi } from './settings.testi.js'

import './settings.css'

/** Quel che il main process manda a questa pagina. */
type Annuncio =
  | { impostazioni: 'schema', titolo: string, voci: VoceProgramma[], filtro?: string }
  | { impostazioni: 'valori', voci: VoceProgramma[] }
  | { impostazioni: 'rifiuto', chiave: string, motivo: string }
  | { impostazioni: 'filtro', testo?: string }

/** I pezzi di pagina di una voce disegnata: quel che `vestiVoce` aggiorna. */
interface Pezzo {
  blocco: HTMLDivElement
  /** Il controllo di adesso: un valore nuovo lo rifà. */
  controllo: HTMLElement
  /** L'id della spiegazione della «i», che il controllo nomina. */
  descrittoDa: string | undefined
  sospesa: HTMLSpanElement
  /** Perché un interruttore non si accende: vedi `VoceProgramma.bloccata`. */
  bloccata: HTMLParagraphElement
}

const t = testi()
riempi(t)

const radice = perId('radice')
const cerca = perId<HTMLInputElement>('cerca')

/** Le voci ricevute, e i pezzi di pagina che le mostrano, per chiave. */
let voci: VoceProgramma[] = []
const disegnate = new Map<string, Pezzo>()

function chiedi (richiesta: RichiestaImpostazioni): void {
  manda(richiesta)
}

perId('apri-pannello').addEventListener('click', () => chiedi({ impostazioni: 'apriPannello' }))

// ------------------------------------------------------------ lo scrivere

/**
 * Quanto si aspetta la risposta a una scrittura. Scrivere il valore che c'è già
 * non fa arrivare niente: allora non si dice niente.
 */
const ATTESA_MASSIMA = 4000

/** Le scritture in volo, per chiave: le chiude il `rifiuto` o i `valori` che seguono. */
const inAttesa = new Map<string, (esito: Esito) => void>()

/** Manda un valore e aspetta com'è andata: `null` scritto, un testo il motivo del rifiuto. */
function scrivi (chiave: string, valore: Valore): Promise<Esito> {
  inAttesa.get(chiave)?.(undefined)
  return new Promise<Esito>((risolvi) => {
    const chiudi = (esito: Esito): void => {
      window.clearTimeout(timer)
      if (inAttesa.get(chiave) === chiudi) inAttesa.delete(chiave)
      risolvi(esito)
    }
    const timer = window.setTimeout(() => chiudi(undefined), ATTESA_MASSIMA)
    inAttesa.set(chiave, chiudi)
    chiedi({ impostazioni: 'scrivi', chiave, valore })
  })
}

/** Il controllo di una voce, lo stesso del pannello. */
function controlloDi (voce: VoceProgramma, descrittoDa: string | undefined): HTMLElement {
  return controllo(voce, (valore) => scrivi(voce.chiave, valore), document, {
    sfoglia: () => chiedi({ impostazioni: 'sfoglia', chiave: voce.chiave }),
    svuota: () => chiedi({ impostazioni: 'azzera', chiave: voce.chiave }),
    ...(descrittoDa ? { descrittoDa } : {}),
  })
}

// ------------------------------------------------------------------ i nomi

/** Il nome di una voce (`etichetta`); per una chiave sconosciuta, l'ultimo pezzo a parole. */
function nomeDi (chiave: string): string {
  const voce = voci.find((candidata) => candidata.chiave === chiave)
  if (voce) return voce.etichetta
  const ultimo = chiave.split('.').pop() ?? ''
  const staccate = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return staccate.charAt(0).toUpperCase() + staccate.slice(1)
}

// ------------------------------------------------------------ la spiegazione

/**
 * Il tracciato della «i», copiato da `ui/pannello/components/icons.ts`: da `ui`
 * questa pagina importa solo tipi (`npm run layers`).
 */
const TRACCIATO_INFORMAZIONE = [
  { nome: 'circle', attributi: { cx: '12', cy: '12', r: '9' } },
  { nome: 'path', attributi: { d: 'M12 11v5M12 7.8v.1' } },
] as const

function segnoInformazione (): SVGSVGElement {
  const spazio = 'http://www.w3.org/2000/svg'
  const disegno = document.createElementNS(spazio, 'svg')
  disegno.setAttribute('viewBox', '0 0 24 24')
  disegno.setAttribute('aria-hidden', 'true')
  disegno.setAttribute('focusable', 'false')
  disegno.setAttribute('class', 'voce__icona')
  for (const { nome, attributi } of TRACCIATO_INFORMAZIONE) {
    const pezzo = document.createElementNS(spazio, nome)
    for (const [chiave, valore] of Object.entries(attributi)) pezzo.setAttribute(chiave, valore)
    disegno.append(pezzo)
  }
  return disegno
}

/**
 * La «i» accanto al nome, che apre e chiude la descrizione sotto il campo (nel
 * pannello è un fumetto, `ui/pannello/components/hint.ts`, che qui non si può
 * importare). Chiusa resta nel DOM (`hidden`): il filtro la trova e il campo la
 * nomina con `aria-describedby`.
 */
let contaDescrizioni = 0
interface Spiegazione {
  segno: HTMLButtonElement
  testo: HTMLParagraphElement
}

function spiegazione (voce: VoceProgramma): Spiegazione {
  // testo-fisso: un identificatore, non testo
  const id = `descrizione-${++contaDescrizioni}`
  const testo = elemento('p', 'voce__aiuto', voce.descrizione)
  testo.id = id
  testo.hidden = true

  const segno = elemento('button', 'voce__segno')
  segno.type = 'button'
  segno.setAttribute('aria-label', t.spiegazione(voce.etichetta))
  segno.setAttribute('aria-controls', id)
  segno.setAttribute('aria-expanded', 'false')
  segno.append(segnoInformazione())
  segno.addEventListener('click', () => {
    const aperta = testo.hidden
    testo.hidden = !aperta
    segno.setAttribute('aria-expanded', aperta ? 'true' : 'false')
  })
  return { segno, testo }
}

// ---------------------------------------------------------------- la voce

/** Una voce intera: nome con la sua «i», perché non si tocca, da quando vale, controllo, aiuto. */
function disegnaVoce (voce: VoceProgramma): HTMLDivElement {
  // Una figlia (`dipendeDa`) rientra sotto il padre, come nel pannello.
  const blocco = elemento('div', voce.dipendeDa ? 'voce voce--figlia' : 'voce')

  const testata = elemento('div', 'voce__testata')
  const nome = elemento('span', 'voce__nome', voce.etichetta)
  const descrizione = voce.descrizione ? spiegazione(voce) : null
  if (descrizione) nome.append(descrizione.segno)
  testata.append(nome)
  const sospesa = elemento('span', 'voce__pastiglia')
  testata.append(sospesa)
  // Il registro la legge solo partendo: detto accanto al nome, come nel pannello.
  if (voce.alProssimoAvvio) {
    const avvio = elemento('span', 'voce__pastiglia', t.alProssimoAvvio)
    avvio.title = t.alProssimoAvvioAiuto
    testata.append(avvio)
  }
  blocco.append(testata)

  const descrittoDa = descrizione?.testo.id
  const campo = controlloDi(voce, descrittoDa)
  blocco.append(campo)
  if (descrizione) blocco.append(descrizione.testo)
  const bloccata = elemento('p', 'voce__aiuto')
  blocco.append(bloccata)

  disegnate.set(voce.chiave, {
    blocco, controllo: campo, descrittoDa, sospesa, bloccata,
  })
  vestiVoce(voce)
  return blocco
}

/** Un campo in cui si sta scrivendo: rifarlo sotto le dita farebbe saltare il cursore. */
function siScrive (nodo: Element | null): boolean {
  return nodo instanceof HTMLInputElement && nodo.type !== 'range'
}

/**
 * Allinea una voce già disegnata al registro (valore, sospensione): arriva in qualunque momento, anche mentre si scrive. Il
 * controllo si rifà, con la sua riga dell'esito e il fuoco dov'era.
 */
function vestiVoce (voce: VoceProgramma): void {
  const pezzo = disegnate.get(voce.chiave)
  if (!pezzo) return

  pezzo.blocco.classList.toggle('voce--sospesa', voce.sospesa)

  // Perché non si può toccare, detto accanto al nome, dove lo si cerca.
  const bloccata = voce.sospesa ? null : voce.bloccata
  pezzo.sospesa.textContent = voce.sospesa
    ? t.sospesa(nomeDi(voce.dipendeDa ?? ''))
    : bloccata !== null ? t.nonSiAccende : ''
  pezzo.sospesa.hidden = !voce.sospesa && bloccata === null
  pezzo.bloccata.textContent = bloccata ?? ''
  pezzo.bloccata.hidden = bloccata === null

  const vecchio = pezzo.controllo
  if (!vecchio.isConnected) return
  const attivo = document.activeElement
  const aveva = vecchio.contains(attivo)
  if (aveva && siScrive(attivo)) return
  const nuovo = controlloDi(voce, pezzo.descrittoDa)
  const riga = vecchio.querySelector('.controllo__esito')
  if (riga) nuovo.querySelector('.controllo__esito')?.replaceWith(riga)
  vecchio.replaceWith(nuovo)
  pezzo.controllo = nuovo
  if (aveva) fuocoDentro(nuovo, (attivo as HTMLElement | null)?.dataset?.fuoco)
}

// ----------------------------------------------------------------- la pagina

/** Una sezione: il titolo, il riassunto, l'avvertenza, i gruppi, le avanzate chiuse. */
function disegnaSezione (sezione: Sezione): HTMLElement {
  const blocco = elemento('section', 'sezione')
  blocco.append(elemento('h3', 'sezione__titolo', sezione.titolo))
  blocco.append(elemento('p', 'sezione__sottotitolo', sezione.sottotitolo))
  // L'avvertenza prima delle caselle: qui si concede qualcosa ad altri programmi.
  if (sezione.avvertenza) {
    blocco.append(elemento('p', 'sezione__avvertenza', sezione.avvertenza.replace(/\*\*/g, '')))
  }
  for (const gruppo of sezione.gruppi) {
    const riquadro = elemento('div', 'gruppo')
    if (gruppo.titolo) riquadro.append(elemento('h4', 'gruppo__titolo', gruppo.titolo))
    for (const voce of gruppo.voci) riquadro.append(disegnaVoce(voce))
    blocco.append(riquadro)
  }
  if (sezione.avanzate.length > 0) {
    // Chiuso: si apre a mano, o cercando quel che c'è dentro (`filtra`).
    const riquadro = elemento('details', 'avanzate')
    riquadro.append(elemento('summary', 'avanzate__titolo', t.avanzate(sezione.avanzate.length)))
    for (const voce of sezione.avanzate) riquadro.append(disegnaVoce(voce))
    blocco.append(riquadro)
  }
  return blocco
}

function disegna (): void {
  radice.replaceChildren()
  disegnate.clear()

  // Le aree nell'ordine delle schede del pannello. Quelle dell'anno non hanno
  // niente da regolare qui: una riga lo dice, e dice come arrivarci.
  for (const area of AREE) {
    const blocco = elemento('section', 'area')
    blocco.dataset.area = area
    blocco.append(elemento('h2', 'area__titolo', titoloArea(area)))
    if (AREE_DELL_ANNO.includes(area)) {
      blocco.classList.add('area--dell-anno')
      blocco.append(elemento('p', 'area__senza-anno', senzaAnno()))
    } else {
      for (const sezione of sezioniDellArea(area, voci)) blocco.append(disegnaSezione(sezione))
    }
    radice.append(blocco)
  }

  filtra()
  chiedi({ impostazioni: 'pronto' })
}

/** Nasconde un contenitore quando tutte le voci che ha dentro sono nascoste. */
function nascondiSeVuoto (contenitore: HTMLElement): void {
  const dentro = [...contenitore.querySelectorAll<HTMLElement>('.voce')]
  contenitore.hidden = dentro.length > 0 && dentro.every((blocco) => blocco.hidden)
}

/**
 * Il filtro su nome, chiave e descrizione. Lo usa anche
 * `registroDocenti.impostazioniFinestra` (per esempio con `registroDocenti.ocr`).
 */
function filtra (): void {
  const cercato = cerca.value.trim().toLowerCase()
  const cercate = cercato ? cercato.split(/\s+/) : []
  let visibili = 0

  for (const voce of voci) {
    const pezzo = disegnate.get(voce.chiave)
    if (!pezzo) continue
    const dove = `${voce.chiave} ${voce.etichetta} ${voce.descrizione}`.toLowerCase()
    const passa = cercate.every((parola) => dove.includes(parola))
    pezzo.blocco.hidden = !passa
    if (passa) visibili += 1
  }

  // L'avviso precedente si toglie prima di contare.
  radice.querySelector('.vuoto')?.remove()

  // Le avanzate con quel che si cerca si aprono, o resterebbe chiuso dentro.
  for (const riquadro of radice.querySelectorAll<HTMLDetailsElement>('details.avanzate')) {
    nascondiSeVuoto(riquadro)
    if (cercate.length > 0 && !riquadro.hidden) riquadro.open = true
  }
  for (const gruppo of radice.querySelectorAll<HTMLElement>('.gruppo, .sezione')) nascondiSeVuoto(gruppo)
  // Cercando, le aree senza niente che passa (quelle dell'anno comprese) si tolgono.
  for (const area of radice.querySelectorAll<HTMLElement>('.area')) {
    const passano = [...area.querySelectorAll<HTMLElement>('.voce')].some((blocco) => !blocco.hidden)
    area.hidden = cercate.length > 0 && !passano
  }

  if (visibili === 0) radice.append(elemento('p', 'vuoto', t.nessunaCorrisponde))
}

cerca.addEventListener('input', filtra)

ascolta((ricevuto) => {
  const messaggio = ricevuto as Annuncio
  switch (messaggio.impostazioni) {
    case 'schema':
      document.title = messaggio.titolo
      perId('titolo').textContent = messaggio.titolo
      voci = messaggio.voci
      cerca.value = messaggio.filtro ?? ''
      disegna()
      break

    case 'valori':
      // Le scritture in volo sono andate: se una fosse stata rifiutata, il
      // `rifiuto` sarebbe arrivato prima.
      for (const chiudi of [...inAttesa.values()]) chiudi(null)
      // L'elenco intero dopo ogni scrittura, anche dell'altra finestra: un cambio
      // può toccare altre voci (spegnere `vassoio.attivo` ne sospende due).
      for (const arrivata of messaggio.voci) {
        const gia = voci.find((candidata) => candidata.chiave === arrivata.chiave)
        if (!gia) continue
        Object.assign(gia, arrivata)
        vestiVoce(gia)
      }
      break

    case 'rifiuto': {
      // Il valore non è stato scritto: lo dice il controllo, sotto il campo, e
      // si rimette com'era. Il `valori` che segue lo allinea al file. Un
      // percorso scelto con «Sfoglia…» non ha una scrittura in volo.
      const chiudi = inAttesa.get(messaggio.chiave)
      const pezzo = disegnate.get(messaggio.chiave)
      if (chiudi) chiudi(messaggio.motivo)
      else if (pezzo) diciEsito(pezzo.controllo, messaggio.motivo)
      break
    }

    case 'filtro':
      cerca.value = messaggio.testo ?? ''
      filtra()
      break
  }
})
