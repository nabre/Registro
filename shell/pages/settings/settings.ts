// Le impostazioni del programma, nella finestra nativa. Riceve le voci
// (`vociImpostazioni()`: manifesto più stato attuale) e le disegna per gruppo.
// Scrive e ritira per messaggio: la dogana sta in `shell/windows/menu.ts`, e un
// rifiuto torna qui con il motivo. I testi finiscono in `textContent`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../../../src/i18n/page.js'
import { parole } from '../../../src/domain/words.testi.js'
import { LINGUE, NOMI_DELLE_LINGUE, lingua } from '../../../src/i18n/index.js'
import { figuraLingua } from '../../../src/i18n/flags.js'
import type { VoceProgramma } from '../../../src/protocol.js'
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

type Valore = VoceProgramma['valore']

/** Il campo di una voce, e il modo di rimetterlo d'accordo con il registro. */
interface Campo {
  /** Il campo, o il gruppo di schede quando la voce ha una figura. */
  elemento: HTMLInputElement | HTMLSelectElement | HTMLDivElement
  /** Solo per le schede: un gruppo non va in una `<label>`, o il clic finirebbe sulla prima scheda. */
  gruppo?: boolean
  /** Dove va il fuoco quando la voce è rifiutata, se non è `elemento`. */
  fuoco?: () => void
  /** Solo per le spunte: «Acceso» o «Spento», accanto alla casella. */
  etichetta?: HTMLSpanElement
  /** Solo per i percorsi: «Sfoglia…», accanto al campo. */
  accanto?: HTMLButtonElement
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

// ------------------------------------------------------------------ i nomi

/** Il gruppo di una voce: la chiave fra prefisso e nome (`registroDocenti.posta.mittente` → «posta»). */
function gruppoDi (chiave: string): string {
  const pezzi = chiave.split('.')
  return pezzi.length > 2 ? pezzi.slice(1, -1).join(' ') : ''
}

function titoloGruppo (gruppo: string): string {
  const scritto = t.gruppi[gruppo]
  if (scritto) return scritto
  // Un gruppo che il catalogo non nomina si chiama come la chiave; le sigle in maiuscolo.
  if (gruppo.length <= 3) return gruppo.toUpperCase()
  return gruppo.charAt(0).toUpperCase() + gruppo.slice(1)
}

/** Il nome di una voce (`etichetta`); per una chiave sconosciuta, l'ultimo pezzo a parole. */
function nomeDi (chiave: string): string {
  const voce = voci.find((candidata) => candidata.chiave === chiave)
  if (voce) return voce.etichetta
  const ultimo = chiave.split('.').pop() ?? ''
  const staccate = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return staccate.charAt(0).toUpperCase() + staccate.slice(1)
}

/** Come si scrive un valore fuori dal campo, con le stesse parole della pagina del registro. */
function comeSiLegge (voce: VoceProgramma, valore: Valore): string {
  if (voce.tipo === 'boolean') return valore ? t.acceso : t.spento
  if (String(valore) === '') return parole().vuoto
  return String(valore)
}

// ------------------------------------------------------------ le figure

/**
 * Le voci che si scelgono guardandole, e che cosa disegnare per ognuna. Copia
 * dello scheletro di `src/ui/views/settings/figures.ts`, perché da `ui` questa
 * pagina importa solo tipi (`npm run layers`); il foglio è lo stesso
 * (`src/ui/styles/figure-choice.css`). Va tenuta allineata a mano.
 */
interface Raffigurazione {
  figura (valore: string): HTMLElement
  /** Una riga sotto l'aiuto, o `null`: quel che la scelta sta facendo adesso. */
  nota? (valore: string, attivo: boolean): string | null
}

// testo-fisso: una media query
const SCURO = window.matchMedia('(prefers-color-scheme: dark)')

/** Uno `span` della miniatura, con i suoi pezzi dentro. */
function pezzo (classe: string, ...dentro: HTMLElement[]): HTMLElement {
  const nato = elemento('span', classe)
  nato.append(...dentro)
  return nato
}

function miniatura (tema: 'chiaro' | 'scuro'): HTMLElement {
  const parte = (nome: string, ...dentro: HTMLElement[]): HTMLElement =>
    pezzo(`figura-tema__${nome}`, ...dentro)
  const tutta = pezzo(
    'figura-tema',
    parte('barra', parte('marchio'), parte('titolo')),
    parte(
      'corpo',
      parte(
        'lato',
        pezzo('figura-tema__voce figura-tema__voce--scelta'),
        parte('voce'),
        parte('voce'),
        parte('voce'),
      ),
      parte(
        'pagina',
        parte('titoletto'),
        parte('scheda', parte('riga'), parte('riga'), parte('riga')),
        parte('pulsante'),
      ),
    ),
  )
  // I colori del tema raffigurato, non di quello attivo (`data-tema-figura` in `theme.css`).
  tutta.setAttribute('data-tema-figura', tema)
  return tutta
}

const RAFFIGURAZIONI: Readonly<Record<string, Raffigurazione>> = {
  'registroDocenti.aspetto.tema': {
    figura (valore) {
      if (valore === 'chiaro' || valore === 'scuro') return miniatura(valore)
      return pezzo('figura-tema-divisa', miniatura('chiaro'), miniatura('scuro'))
    },
    // Solo con «Sistema» `prefers-color-scheme` riflette Windows; altrimenti è il tema forzato.
    nota (valore, attivo) {
      if (valore !== 'sistema' || !attivo) return null
      return t.temaAdesso(SCURO.matches)
    },
  },
  // La figura è condivisa, in `src/i18n/flags.ts`.
  'registroDocenti.aspetto.lingua': {
    figura: (valore) => figuraLingua(valore, LINGUE),
    // Con «Sistema» scelto la pagina parla la lingua di Windows.
    nota (valore, attivo) {
      if (valore !== 'sistema' || !attivo) return null
      return t.linguaAdesso(NOMI_DELLE_LINGUE[lingua()])
    },
  },
}

/** Il nome e la frase di una scelta, dal suo aiuto: vedi `nomeEAiuto` nel pannello. */
function nomeEAiuto (valore: string, aiuto: string): { nome: string, aiuto: string } {
  // Lo spazio prima dei due punti è del francese («Système : …»): non fa parte del nome.
  const due = /^([^:]{1,24}?)\s*:\s+(.+)$/s.exec(aiuto)
  // Un aiuto di una parola sola è già il nome: «Italiano», a chi legge in italiano.
  if (!due && /^\S{1,24}$/.test(aiuto)) return { nome: aiuto, aiuto: '' }
  if (!due) return { nome: valore.charAt(0).toUpperCase() + valore.slice(1), aiuto }
  const resto = due[2]
  return { nome: due[1], aiuto: resto.charAt(0).toUpperCase() + resto.slice(1) }
}

/** Le frecce di un gruppo radio: spostano e scelgono, e dall'ultima si gira alla prima. */
function dove (tasto: string, attuale: number, quante: number): number | null {
  if (tasto === 'ArrowRight' || tasto === 'ArrowDown') return (attuale + 1) % quante
  if (tasto === 'ArrowLeft' || tasto === 'ArrowUp') return (attuale - 1 + quante) % quante
  if (tasto === 'Home') return 0
  if (tasto === 'End') return quante - 1
  return null
}

/**
 * Le schede con la figura: lo stesso gruppo radio del pannello
 * (`components/figureChoice.ts`). Niente ridisegno: `mostra` aggiorna le schede che ci sono.
 */
function schedeConFigura (
  voce: VoceProgramma,
  scelte: NonNullable<VoceProgramma['scelte']>,
  raffigura: Raffigurazione,
  quandoCambia: (valore: Valore) => void,
): Campo {
  const gruppo = elemento('div', 'scelta-figurata')
  gruppo.setAttribute('role', 'radiogroup')
  let attuale = voce
  const radice = voce.chiave.replace(/[^\w-]/g, '-')

  const schede = scelte.map((scelta, indice) => {
    const valore = String(scelta.valore)
    const detto = nomeEAiuto(valore, scelta.aiuto)
    const scheda = elemento('button', 'scelta-figurata__voce')
    scheda.type = 'button'
    scheda.setAttribute('role', 'radio')

    const figura = pezzo('scelta-figurata__figura', raffigura.figura(valore))
    figura.setAttribute('aria-hidden', 'true')

    const segno = elemento('span', 'scelta-figurata__segno')
    segno.setAttribute('aria-hidden', 'true')
    const testoNome = elemento('span', null, detto.nome)
    // testo-fisso: identificatori, non testo
    testoNome.id = `figura-${radice}-${valore}-nome`
    const nome = pezzo('scelta-figurata__nome', segno, testoNome)

    const aiuto = elemento('span', 'scelta-figurata__aiuto', detto.aiuto)
    aiuto.hidden = detto.aiuto === ''
    // testo-fisso: identificatori, non testo
    aiuto.id = `figura-${radice}-${valore}-aiuto`
    const nota = elemento('span', 'scelta-figurata__nota')
    // testo-fisso: identificatori, non testo
    nota.id = `figura-${radice}-${valore}-nota`

    scheda.setAttribute('aria-labelledby', testoNome.id)
    scheda.append(figura, nome, aiuto, nota)
    scheda.addEventListener('click', () => scegli(indice))
    scheda.addEventListener('keydown', (evento) => {
      const prossima = dove(evento.key, indice, scelte.length)
      if (prossima === null) return
      evento.preventDefault()
      scegli(prossima)
    })
    gruppo.append(scheda)
    return { scheda, valore, aiuto, nota }
  })

  /** Accende la scheda del valore dato, e scrive le note di adesso. */
  const accendi = (valore: string, spenta: boolean): void => {
    const trovata = schede.some((candidata) => candidata.valore === valore)
    schede.forEach(({ scheda, valore: suo, aiuto, nota }, indice) => {
      const accesa = suo === valore
      scheda.setAttribute('aria-checked', accesa ? 'true' : 'false')
      // Una sola scheda raggiungibile col tabulatore: la scelta, o la prima se
      // il valore non corrisponde a nessuna.
      scheda.tabIndex = !spenta && (accesa || (!trovata && indice === 0)) ? 0 : -1
      if (spenta) scheda.setAttribute('aria-disabled', 'true')
      else scheda.removeAttribute('aria-disabled')
      const detta = raffigura.nota?.(suo, accesa) ?? null
      nota.textContent = detta ?? ''
      nota.hidden = detta === null
      const descritta = [aiuto.hidden ? '' : aiuto.id, detta === null ? '' : nota.id].filter(Boolean).join(' ')
      if (descritta) scheda.setAttribute('aria-describedby', descritta)
      else scheda.removeAttribute('aria-describedby')
    })
    gruppo.classList.toggle('scelta-figurata--spenta', spenta)
  }

  const scegli = (indice: number): void => {
    if (attuale.sospesa) return
    const scelta = scelte[indice]
    if (!scelta) return
    accendi(String(scelta.valore), false)
    schede[indice]?.scheda.focus()
    if (String(scelta.valore) === String(attuale.valore)) return
    // Si ricorda subito, senza aspettare il `valori` di conferma: due frecce di
    // fila devono partire tutte e due, anche tornando alla scelta di partenza.
    attuale = { ...attuale, valore: scelta.valore }
    quandoCambia(scelta.valore)
  }

  const mostra = (stato: VoceProgramma): void => {
    attuale = stato
    accendi(String(stato.valore), stato.sospesa)
  }
  // La nota di «Sistema» segue il cambio automatico di Windows. Se le schede
  // escono dalla pagina (schema nuovo), l'ascoltatore si stacca.
  const rifai = (): void => {
    if (gruppo.isConnected) mostra(attuale)
    else SCURO.removeEventListener('change', rifai)
  }
  SCURO.addEventListener('change', rifai)
  mostra(voce)

  const fuoco = (): void => {
    const raggiungibile = schede.find(({ scheda }) => scheda.tabIndex === 0) ?? schede[0]
    raggiungibile?.scheda.focus()
  }
  return { elemento: gruppo, gruppo: true, fuoco, mostra }
}

// ---------------------------------------------------------------- i campi

/**
 * Il ritardo con cui un campo di testo si salva mentre si scrive: la rete per
 * chi chiude la finestra senza lasciare il campo (il salvataggio vero è su
 * `change`). Non i numeri: «180» salverebbe 1, poi 18, poi 180.
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
 * Il campo giusto per il tipo dichiarato. `mostra(voce)` lo allinea al
 * registro; una voce sospesa è spenta e bloccata qualunque cosa dica il file,
 * perché non sembri concesso un accesso che non lo è.
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
      // Bloccata: manca quel che richiede. Spenta, invece di spuntarsi e tornare indietro.
      campo.disabled = stato.sospesa || stato.bloccata !== null
      etichetta.textContent = acceso ? t.spuntaAccesa : t.spuntaSpenta
    }
    mostra(voce)
    return { elemento: campo, etichetta, mostra }
  }

  const scelte = voce.scelte
  // Tema e lingua a schede con la figura, come nel pannello; le altre scelte a tendina.
  const raffigura = RAFFIGURAZIONI[voce.chiave]
  if (scelte && raffigura) return schedeConFigura(voce, scelte, raffigura, quandoCambia)
  if (scelte) {
    const campo = elemento('select')
    for (const scelta of scelte) {
      const opzione = elemento('option')
      opzione.value = String(scelta.valore)
      // L'aiuto della scelta fa da etichetta.
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
    // Gli estremi del manifesto, per le frecce e il browser; la dogana vera sta nel main process.
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

  // Un percorso si sceglie con «Sfoglia…» (dialogo del main process). Vuoto: ci pensa il registro.
  if (voce.formato === 'cartella' || voce.formato === 'eseguibile' || voce.formato === 'file') {
    const campo = elemento('input')
    campo.type = 'text'
    campo.readOnly = true
    const sfoglia = elemento('button', 'voce__sfoglia', parole().sfoglia)
    sfoglia.type = 'button'
    sfoglia.addEventListener('click', () => chiedi({ impostazioni: 'sfoglia', chiave: voce.chiave }))
    const mostra = (stato: VoceProgramma): void => {
      campo.value = String(stato.valore)
      campo.placeholder = t.ciPensaIlRegistro
      sfoglia.disabled = stato.sospesa
    }
    mostra(voce)
    return { elemento: campo, accanto: sfoglia, mostra }
  }

  // Il modello si sceglie nel registro («Modelli linguistici»): qui si legge soltanto.
  if (voce.formato === 'modello') {
    const campo = elemento('input')
    campo.type = 'text'
    campo.readOnly = true
    const mostra = (stato: VoceProgramma): void => {
      campo.value = String(stato.valore)
      campo.placeholder = t.nessunModello
    }
    mostra(voce)
    return { elemento: campo, mostra }
  }

  const campo = elemento('input')
  // `formato: 'email'`: il campo si valida da sé, vuoto compreso (è il
  // predefinito). La dogana vera è `valoreAccettabile`.
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

// ------------------------------------------------------------ la spiegazione

/**
 * Il tracciato della «i», copiato da `src/ui/components/icons.ts`: da `ui`
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
 * pannello è un fumetto, `src/ui/components/hint.ts`, che qui non si può
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

/** Una voce intera: nome con la sua «i», provenienza, chiave, «Ritira», campo, aiuto. */
function disegnaVoce (voce: VoceProgramma): HTMLDivElement {
  const blocco = elemento('div', 'voce')

  const testata = elemento('div', 'voce__testata')
  const nome = elemento('span', 'voce__nome', voce.etichetta)
  const descrizione = voce.descrizione ? spiegazione(voce) : null
  if (descrizione) nome.append(descrizione.segno)
  testata.append(nome)
  const sospesa = elemento('span', 'voce__pastiglia')
  testata.append(sospesa)
  const provenienza = elemento('span', 'voce__pastiglia')
  testata.append(provenienza)
  testata.append(elemento('span', 'voce__chiave', voce.chiave))

  // «Ritira», lo stesso verbo della pagina del registro.
  const ritira = elemento('button', 'voce__ritira', t.ritira)
  ritira.addEventListener('click', () => chiedi({ impostazioni: 'azzera', chiave: voce.chiave }))
  testata.append(ritira)
  blocco.append(testata)

  const errore = elemento('p', 'voce__errore')
  const contenitore = elemento('div', 'voce__campo')
  const campo = campoDi(voce, (valore) => {
    errore.textContent = ''
    chiedi({ impostazioni: 'scrivi', chiave: voce.chiave, valore })
  })

  // Il nome sta nella testata, fuori dalla `<label>`: senza `aria-label` il
  // campo non avrebbe nome per chi legge lo schermo.
  campo.elemento.setAttribute('aria-label', voce.etichetta)

  if (campo.gruppo) {
    contenitore.append(campo.elemento)
  } else {
    const riga = elemento('label', campo.etichetta ? 'spunta' : null)
    riga.append(campo.elemento)
    if (campo.etichetta) riga.append(campo.etichetta)
    contenitore.append(riga)
  }
  if (campo.accanto) contenitore.append(campo.accanto)
  blocco.append(contenitore)

  if (descrizione) {
    blocco.append(descrizione.testo)
    campo.elemento.setAttribute('aria-describedby', descrizione.testo.id)
  }
  const bloccata = elemento('p', 'voce__aiuto')
  blocco.append(bloccata)
  blocco.append(errore)

  disegnate.set(voce.chiave, { blocco, campo, ritira, errore, sospesa, provenienza, bloccata })
  vestiVoce(voce)
  return blocco
}

/**
 * Allinea una voce già disegnata al registro (valore, provenienza,
 * sospensione) senza ridisegnare: arriva in qualunque momento, anche mentre si scrive.
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

  pezzo.provenienza.textContent = voce.scritta
    ? t.modificata(comeSiLegge(voce, voce.predefinito))
    : t.predefinito(comeSiLegge(voce, voce.valore))
  pezzo.provenienza.classList.toggle('voce__pastiglia--scritta', voce.scritta)

  pezzo.ritira.hidden = !voce.scritta
  pezzo.ritira.title = t.tornaAlPredefinito(comeSiLegge(voce, voce.predefinito))

  // Il campo col fuoco non si aggiorna, o il cursore salterebbe. Le spunte sì:
  // non hanno cursore, e un'accensione rifiutata deve tornare indietro subito.
  const spunta = pezzo.campo.etichetta !== undefined
  if (spunta || document.activeElement !== pezzo.campo.elemento) pezzo.campo.mostra(voce)
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

  // L'avviso precedente si toglie prima di contare, o terrebbe visibile l'ultimo titolo.
  radice.querySelector('.vuoto')?.remove()

  // I titoli dei gruppi rimasti senza voci si nascondono.
  for (const titolo of radice.querySelectorAll('h2')) {
    let vuoto = true
    let seguente = titolo.nextElementSibling
    while (seguente && seguente.tagName !== 'H2') {
      if (!(seguente as HTMLElement).hidden) vuoto = false
      seguente = seguente.nextElementSibling
    }
    titolo.hidden = vuoto
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
      // L'elenco intero dopo ogni scrittura, anche dell'altra finestra: un cambio
      // può toccare altre voci (spegnere `api.condotto` ne sospende due).
      for (const arrivata of messaggio.voci) {
        const gia = voci.find((candidata) => candidata.chiave === arrivata.chiave)
        if (!gia) continue
        Object.assign(gia, arrivata)
        vestiVoce(gia)
      }
      break

    case 'rifiuto': {
      // Il valore non è stato scritto: si dice perché. Il campo torna al valore
      // del file con il `valori` che segue.
      const pezzo = disegnate.get(messaggio.chiave)
      if (pezzo) {
        pezzo.errore.textContent = messaggio.motivo
        if (pezzo.campo.fuoco) pezzo.campo.fuoco()
        else pezzo.campo.elemento.focus()
      }
      break
    }

    case 'filtro':
      cerca.value = messaggio.testo ?? ''
      filtra()
      break
  }
})
