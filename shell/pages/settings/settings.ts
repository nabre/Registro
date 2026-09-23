// Le impostazioni del programma, nella finestra nativa.
//
// La pagina riceve le voci — `vociImpostazioni()`, cioè il manifesto più lo
// stato di adesso — e le disegna raggruppate per chiave. Scrive e ritira
// mandando un messaggio: la dogana (`valoreAccettabile`) sta dall'altra parte,
// in `shell/windows/menu.ts`, e un rifiuto torna qui con il suo motivo.
//
// Descrizioni, etichette e valori finiscono in `textContent`.

import type { VoceProgramma } from '../../../src/protocol.js'
import type { RichiestaImpostazioni } from '../../windows/menu.js'
import { ascolta, elemento, manda, perId } from '../shared/page.js'

import './settings.css'

/** Quel che il main process manda a questa pagina. */
type Annuncio =
  | { impostazioni: 'schema', titolo: string, voci: VoceProgramma[], filtro?: string }
  | { impostazioni: 'valori', voci: VoceProgramma[] }
  | { impostazioni: 'rifiuto', chiave: string, motivo: string }
  | { impostazioni: 'filtro', testo?: string }

type Valore = VoceProgramma['valore']

/** Il campo di una voce, e il modo di rimetterlo d'accordo con il registro. */
interface Campo {
  elemento: HTMLInputElement | HTMLSelectElement
  /** Solo per le spunte: «Acceso» o «Spento», accanto alla casella. */
  etichetta?: HTMLSpanElement
  mostra (voce: VoceProgramma): void
}

/** I pezzi di pagina di una voce disegnata: quel che `vestiVoce` aggiorna. */
interface Pezzo {
  blocco: HTMLDivElement
  campo: Campo
  ritira: HTMLButtonElement
  errore: HTMLParagraphElement
  sospesa: HTMLSpanElement
  provenienza: HTMLSpanElement
}

const radice = perId('radice')
const cerca = perId<HTMLInputElement>('cerca')

/** Le voci ricevute, e i pezzi di pagina che le mostrano, per chiave. */
let voci: VoceProgramma[] = []
const disegnate = new Map<string, Pezzo>()

function chiedi (richiesta: RichiestaImpostazioni): void {
  manda(richiesta)
}

perId('apri-pannello').addEventListener('click', () => chiedi({ impostazioni: 'apriPannello' }))

// ------------------------------------------------------------------ i nomi

/**
 * Il gruppo di una voce: il pezzo di chiave fra il prefisso e il nome finale.
 * `registroDocenti.posta.mittente` sta sotto «Posta»,
 * `registroDocenti.aspetto.tema` sotto «Aspetto».
 */
function gruppoDi (chiave: string): string {
  const pezzi = chiave.split('.')
  return pezzi.length > 2 ? pezzi.slice(1, -1).join(' ') : ''
}

function titoloGruppo (gruppo: string): string {
  if (!gruppo) return 'Generale'
  // Le sigle si scrivono in maiuscolo: «OCR», non «Ocr».
  if (gruppo.length <= 3) return gruppo.toUpperCase()
  return gruppo.charAt(0).toUpperCase() + gruppo.slice(1)
}

/** Il nome del campo, ricavato dall'ultimo pezzo: `attesaMassimaSecondi`. */
function nomeDi (chiave: string): string {
  const ultimo = chiave.split('.').pop() ?? ''
  const parole = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return parole.charAt(0).toUpperCase() + parole.slice(1)
}

/**
 * Come si scrive un valore fuori dal campo. Le stesse parole della pagina del
 * registro: le due finestre mostrano le stesse impostazioni, e leggerle in due
 * lingue diverse era il modo più rapido per dubitare di averle capite.
 */
function comeSiLegge (voce: VoceProgramma, valore: Valore): string {
  if (voce.tipo === 'boolean') return valore ? 'acceso' : 'spento'
  if (String(valore) === '') return 'vuoto'
  return String(valore)
}

// ---------------------------------------------------------------- i campi

/**
 * Il ritardo con cui un campo di **testo** si salva mentre si scrive.
 *
 * Il salvataggio vero è su `change` — quando il campo perde il fuoco o si
 * preme Invio — e questo è la rete per chi chiude la finestra senza uscire
 * dal campo.
 *
 * Solo il testo: un campo numerico lo aveva anche lui, e battere «180» voleva
 * dire salvare 1, poi 18, poi 180. Tre scritture, tre eventi, tre ridisegni
 * del pannello — e su `api.condotto` tre riaccensioni del condotto. In un
 * campo numerico non c’è niente da salvare a metà: o il numero è finito, o non
 * è un numero.
 */
const RITARDO = 700

function ritardato (cosa: () => void): () => void {
  let attesa = 0
  return () => {
    clearTimeout(attesa)
    attesa = window.setTimeout(cosa, RITARDO)
  }
}

/**
 * Il campo giusto per il tipo dichiarato nello schema.
 *
 * `mostra(voce)` rimette il campo d'accordo con quel che il registro dice
 * adesso — il valore, e se la voce è sospesa. Sospesa vuol dire spenta e
 * bloccata, qualunque cosa dica il file: una casella accesa sotto un
 * interruttore spento direbbe che qualcosa è concesso quando non lo è, e queste
 * tre caselle governano un accesso.
 */
function campoDi (voce: VoceProgramma, quandoCambia: (valore: Valore) => void): Campo {
  if (voce.tipo === 'boolean') {
    const campo = elemento('input')
    const etichetta = elemento('span')
    campo.type = 'checkbox'
    campo.addEventListener('change', () => quandoCambia(campo.checked))
    const mostra = (stato: VoceProgramma): void => {
      const acceso = Boolean(stato.valore) && !stato.sospesa
      campo.checked = acceso
      campo.disabled = stato.sospesa
      etichetta.textContent = acceso ? 'Acceso' : 'Spento'
    }
    mostra(voce)
    return { elemento: campo, etichetta, mostra }
  }

  const scelte = voce.scelte
  if (scelte) {
    const campo = elemento('select')
    for (const scelta of scelte) {
      const opzione = elemento('option')
      opzione.value = String(scelta.valore)
      // L'aiuto di una scelta è l'etichetta della scelta: sta nell'option
      // perché è lì che serve, cioè mentre si sceglie.
      opzione.textContent = scelta.aiuto || String(scelta.valore)
      campo.append(opzione)
    }
    campo.addEventListener('change', () => {
      const scelta = scelte.find((candidata) => String(candidata.valore) === campo.value)
      if (scelta) quandoCambia(scelta.valore)
    })
    const mostra = (stato: VoceProgramma): void => {
      campo.value = String(stato.valore)
      campo.disabled = stato.sospesa
    }
    mostra(voce)
    return { elemento: campo, mostra }
  }

  if (voce.tipo === 'number') {
    const campo = elemento('input')
    campo.type = 'number'
    // Gli estremi del manifesto: le frecce si fermano da sole e il browser
    // dice di no prima che parta qualcosa. La dogana vera sta dall'altra
    // parte — questo è il cartello sulla porta.
    if (voce.minimo !== null) campo.min = String(voce.minimo)
    if (voce.massimo !== null) campo.max = String(voce.massimo)
    campo.addEventListener('change', () => {
      const numero = Number(campo.value)
      if (campo.value.trim() === '' || !Number.isFinite(numero)) return
      quandoCambia(numero)
    })
    const mostra = (stato: VoceProgramma): void => {
      campo.value = String(stato.valore)
      campo.disabled = stato.sospesa
    }
    mostra(voce)
    return { elemento: campo, mostra }
  }

  const campo = elemento('input')
  // `formato: 'email'` nello schema: il campo si valida da sé, e vuoto resta
  // lecito perché vuoto è il predefinito e vuol dire «lo stesso dell'altro».
  // Non è però lui la dogana: la stessa regola la fa rispettare
  // `valoreAccettabile`, e vale anche per chi scrive da riga di comando.
  campo.type = voce.formato === 'email' ? 'email' : 'text'
  const invia = (): void => {
    if (!campo.checkValidity()) return
    quandoCambia(campo.value)
  }
  campo.addEventListener('change', invia)
  campo.addEventListener('input', ritardato(invia))
  const mostra = (stato: VoceProgramma): void => {
    campo.value = String(stato.valore)
    campo.disabled = stato.sospesa
  }
  mostra(voce)
  return { elemento: campo, mostra }
}

// ---------------------------------------------------------------- la voce

/** Una voce intera: nome, da dove viene il valore, chiave, «Ritira», campo, aiuto. */
function disegnaVoce (voce: VoceProgramma): HTMLDivElement {
  const blocco = elemento('div', 'voce')

  const testata = elemento('div', 'voce__testata')
  testata.append(elemento('span', 'voce__nome', nomeDi(voce.chiave)))
  const sospesa = elemento('span', 'voce__pastiglia')
  testata.append(sospesa)
  const provenienza = elemento('span', 'voce__pastiglia')
  testata.append(provenienza)
  testata.append(elemento('span', 'voce__chiave', voce.chiave))

  // «Ritira» e non «Torna al predefinito»: è il verbo della pagina del
  // registro, e le due finestre non devono chiamare in due modi lo stesso
  // gesto sulla stessa impostazione.
  const ritira = elemento('button', 'voce__ritira', 'Ritira')
  ritira.addEventListener('click', () => chiedi({ impostazioni: 'azzera', chiave: voce.chiave }))
  testata.append(ritira)
  blocco.append(testata)

  const errore = elemento('p', 'voce__errore')
  const contenitore = elemento('div', 'voce__campo')
  const campo = campoDi(voce, (valore) => {
    errore.textContent = ''
    chiedi({ impostazioni: 'scrivi', chiave: voce.chiave, valore })
  })

  // Il nome dell'impostazione al controllo, sempre. La `<label>` qui sotto
  // avvolge il campo ma il nome sta **fuori** da lei, nella testata: per chi
  // legge lo schermo il campo restava senza nome, e nel ramo booleano si
  // chiamava «Attivo» — cioè tutte le spunte della pagina avevano lo stesso
  // nome, e sentirne una non diceva quale si stava accendendo.
  campo.elemento.setAttribute('aria-label', nomeDi(voce.chiave))

  const riga = elemento('label', campo.etichetta ? 'spunta' : null)
  riga.append(campo.elemento)
  if (campo.etichetta) riga.append(campo.etichetta)
  contenitore.append(riga)
  blocco.append(contenitore)

  if (voce.descrizione) blocco.append(elemento('p', 'voce__aiuto', voce.descrizione))
  blocco.append(errore)

  disegnate.set(voce.chiave, { blocco, campo, ritira, errore, sospesa, provenienza })
  vestiVoce(voce)
  return blocco
}

/**
 * Rimette una voce già disegnata d'accordo con quel che il registro dice
 * adesso: valore, provenienza, sospensione.
 *
 * Non ridisegna: il campo in cui si sta scrivendo resta dov'è e com'è. Un
 * ridisegno qui vorrebbe dire il cursore che salta via mentre si batte un
 * indirizzo, e questa funzione la chiama anche un cambio arrivato dall'altra
 * finestra — cioè in un momento qualsiasi.
 */
function vestiVoce (voce: VoceProgramma): void {
  const pezzo = disegnate.get(voce.chiave)
  if (!pezzo) return

  pezzo.blocco.classList.toggle('voce--sospesa', voce.sospesa)

  // Perché non si può toccare, detto dov'è il gesto che non funziona: chi
  // clicca su una casella morta cerca la spiegazione lì, non nel testo sotto.
  pezzo.sospesa.textContent = voce.sospesa
    ? 'sospesa · ' + nomeDi(voce.dipendeDa ?? '') + ' è spento'
    : ''
  pezzo.sospesa.hidden = !voce.sospesa

  pezzo.provenienza.textContent = voce.scritta
    ? 'modificata · prima: ' + comeSiLegge(voce, voce.predefinito)
    : 'predefinito: ' + comeSiLegge(voce, voce.valore)
  pezzo.provenienza.classList.toggle('voce__pastiglia--scritta', voce.scritta)

  pezzo.ritira.hidden = !voce.scritta
  pezzo.ritira.title = 'Torna al predefinito: ' + comeSiLegge(voce, voce.predefinito)

  // Il campo si aggiorna solo se non lo si sta usando, o si vedrebbe il
  // cursore saltare mentre si scrive; il resto della riga si aggiorna sempre.
  if (document.activeElement !== pezzo.campo.elemento) pezzo.campo.mostra(voce)
}

// ----------------------------------------------------------------- la pagina

function disegna (): void {
  radice.replaceChildren()
  disegnate.clear()

  let gruppo: string | null = null
  for (const voce of voci) {
    const suo = gruppoDi(voce.chiave)
    if (suo !== gruppo) {
      gruppo = suo
      radice.append(elemento('h2', null, titoloGruppo(suo)))
    }
    radice.append(disegnaVoce(voce))
  }

  filtra()
  chiedi({ impostazioni: 'pronto' })
}

/**
 * Il filtro, che cerca in tutto: nome, chiave e descrizione. È anche la via da
 * cui arriva `registroDocenti.impostazioniFinestra`, che il registro invoca con
 * `registroDocenti.ocr` per portare davanti le impostazioni della lettura
 * automatica.
 */
function filtra (): void {
  const cercato = cerca.value.trim().toLowerCase()
  const parole = cercato ? cercato.split(/\s+/) : []
  let visibili = 0

  for (const voce of voci) {
    const pezzo = disegnate.get(voce.chiave)
    if (!pezzo) continue
    const dove = `${voce.chiave} ${nomeDi(voce.chiave)} ${voce.descrizione}`.toLowerCase()
    const passa = parole.every((parola) => dove.includes(parola))
    pezzo.blocco.hidden = !passa
    if (passa) visibili += 1
  }

  // L'avviso del giro precedente si toglie prima di contare: lasciato lì,
  // conterebbe come contenuto e terrebbe visibile il titolo dell'ultimo gruppo.
  radice.querySelector('.vuoto')?.remove()

  // I titoli dei gruppi rimasti senza voci: si nascondono, o resterebbero
  // intestazioni sospese sopra il nulla.
  for (const titolo of radice.querySelectorAll('h2')) {
    let vuoto = true
    let seguente = titolo.nextElementSibling
    while (seguente && seguente.tagName !== 'H2') {
      if (!(seguente as HTMLElement).hidden) vuoto = false
      seguente = seguente.nextElementSibling
    }
    titolo.hidden = vuoto
  }

  if (visibili === 0) radice.append(elemento('p', 'vuoto', 'Nessuna impostazione corrisponde.'))
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
      // L'elenco intero, com'è adesso. Arriva dopo ogni scrittura — la propria
      // e quella dell'altra finestra — perché una sola chiave non basterebbe:
      // spegnere `api.condotto` sospende due voci che nessuno ha toccato, e
      // prima quelle due restavano spuntate e modificabili.
      for (const arrivata of messaggio.voci) {
        const gia = voci.find((candidata) => candidata.chiave === arrivata.chiave)
        if (!gia) continue
        Object.assign(gia, arrivata)
        vestiVoce(gia)
      }
      break

    case 'rifiuto': {
      // Il valore non è stato scritto, e si dice perché. Il campo torna al vero
      // con il `valori` che arriva subito dopo: lasciarlo com'era battuto
      // vorrebbe dire una finestra che mostra un valore che nel file non c'è.
      const pezzo = disegnate.get(messaggio.chiave)
      if (pezzo) {
        pezzo.errore.textContent = messaggio.motivo
        pezzo.campo.elemento.focus()
      }
      break
    }

    case 'filtro':
      cerca.value = messaggio.testo ?? ''
      filtra()
      break
  }
})
