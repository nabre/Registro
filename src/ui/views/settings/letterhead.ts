// Le carte intestate del documento: le scuole, i loghi, chi firma, e quale
// corso stampa su quale carta. Stanno nel `.regi` con le altre impostazioni.
// Più carte per chi insegna in più sedi; ogni corso sta su una carta sola (lo
// garantisce `completaCarte` in `domain/letterhead.ts`, riapplicato dall'host);
// qui si sposta con `spostaCorsi` e `togliCarta`. Chi firma è uno solo. La
// firma delle e-mail si scrive in Comunicazioni (`mail.ts`).
// I campi si salvano all'uscita mandando la matrice intera; il logo ha azioni
// sue. Le regole senza DOM stanno in `letterheadCourses.ts`, dove si provano.

import { cartaVuota, spostaCorsi, togliCarta } from '../../../domain/letterhead.js'
import { Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { ALTEZZA_LOGO, type CartaIntestata } from '../../../domain/models.js'
import { campo, pulsante, scheda } from '../../components/base.js'
import { menuSotto, type ElementoMenu } from '../../components/menu.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import { aggiorna, corsiDellAnnoAperto, stato, uriDato } from '../../state.js'
import { salvaImpostazioni } from './document.js'
import {
  codificaCorsi,
  daTrascinare,
  decodificaCorsi,
  gruppiDellaCarta,
  ordineAVista,
  selezionaCon,
  TIPO_CORSI,
  type GruppoDiClasse,
  type ModoClic,
  type Selezione,
} from './letterheadCourses.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './letterhead.testi.js'

/**
 * Una variazione per l'indirizzo del logo di ogni carta: il logo nuovo ha
 * spesso lo stesso nome e il webview mostrerebbe il vecchio dalla memoria. Il
 * protocollo dei file ignora il numero in coda.
 */
const versioniLogo = new Map<string, number>()

/**
 * Le pastiglie scelte e da dove parte il prossimo intervallo; fuori dallo
 * stato, perché è il gesto di un momento.
 */
let selezione: Selezione = { scelti: new Set(), ancora: null }

/**
 * Quel che si sta trascinando, e da quale carta: durante il `dragover` il
 * `dataTransfer` non si legge, e serve per escludere la carta di partenza.
 */
let inViaggio: { ids: string[], da: string } | null = null

/** Le carte di adesso, non quelle del disegno: due gesti di fila partono prima del ridisegno. */
function carteVive (): CartaIntestata[] {
  return stato.registro.impostazioni.intestazione.carte
}

/** Come si chiama una carta a schermo: la sua scuola, o il suo posto. */
function nomeCarta (carta: CartaIntestata, indice: number): string {
  return carta.sede.trim() || testi().cartaN(indice + 1)
}

/** Salva la matrice intera: l'host la completa e tiene i loghi per id. */
function salvaCarte (carte: CartaIntestata[]): Promise<void> {
  return salvaImpostazioni({ intestazione: { carte } })
}

/** Cambia un campo di una carta, lasciando le altre com'erano. */
function cambiaCarta (
  cartaId: string,
  modifica: Partial<Pick<CartaIntestata, 'sede' | 'altezzaLogo'>>,
): void {
  const carte = carteVive().map((carta) =>
    carta.id === cartaId ? { ...carta, ...modifica } : carta)
  void salvaCarte(carte)
}

/** Sposta dei corsi su una carta e salva; se sono già tutti lì non parte niente. */
function sposta (ids: readonly string[], cartaId: string): void {
  const carte = carteVive()
  const meta = carte.find((carta) => carta.id === cartaId)
  if (!meta || ids.length === 0 || ids.every((id) => meta.corsi.includes(id))) return
  selezione = { scelti: new Set(), ancora: null }
  void salvaCarte(spostaCorsi(carte, ids, cartaId))
}

// ------------------------------------------------------------- la selezione

/** Accende e spegne le pastiglie scelte senza ridisegnare la pagina. */
function mostraSelezione (): void {
  for (const pastiglia of document.querySelectorAll<HTMLElement>('.corso-carta__nome')) {
    const scelto = selezione.scelti.has(pastiglia.dataset.corso ?? '')
    pastiglia.closest('.corso-carta')?.classList.toggle('corso-carta--scelto', scelto)
    pastiglia.setAttribute('aria-pressed', String(scelto))
  }
}

/** Il modo di un clic, dai tasti tenuti premuti. */
function modoDelClic (evento: MouseEvent | KeyboardEvent): ModoClic {
  if (evento.shiftKey) return 'intervallo'
  if (evento.ctrlKey || evento.metaKey) return 'aggiungi'
  return 'solo'
}

// --------------------------------------------------------- il trascinamento

/** Parte un trascinamento: i corsi viaggiano per id, e le altre carte si accendono. */
function comincia (evento: DragEvent, ids: string[], da: string): void {
  const partono = daTrascinare(ids, selezione.scelti)
  if (!evento.dataTransfer || partono.length === 0) return
  inViaggio = { ids: partono, da }
  evento.dataTransfer.effectAllowed = 'move'
  evento.dataTransfer.setData(TIPO_CORSI, codificaCorsi(partono))
  // Anche in chiaro: il fantasma si disegna meglio, e in un campo di testo
  // cadono nomi e non id.
  evento.dataTransfer.setData('text/plain', testi().corsi(partono.length))
  for (const zona of document.querySelectorAll<HTMLElement>('.carta-intestata__corsi')) {
    zona.classList.toggle('carta-intestata__corsi--pronta', zona.dataset.carta !== da)
  }
  for (const pastiglia of document.querySelectorAll<HTMLElement>('.corso-carta__nome')) {
    if (partono.includes(pastiglia.dataset.corso ?? '')) {
      pastiglia.closest('.corso-carta')?.classList.add('corso-carta--in-viaggio')
    }
  }
}

/** Finito il trascinamento, andato a segno o no: si spegne tutto. */
function finisce (): void {
  inViaggio = null
  for (const acceso of document.querySelectorAll<HTMLElement>(
    '.carta-intestata__corsi--pronta, .carta-intestata__corsi--sopra, .corso-carta--in-viaggio',
  )) {
    acceso.classList.remove(
      'carta-intestata__corsi--pronta',
      'carta-intestata__corsi--sopra',
      'corso-carta--in-viaggio',
    )
  }
}

/**
 * Fa della zona dei corsi di una carta un bersaglio, solo per i corsi di questa
 * sezione e non per la carta di partenza. Si contano entrate e uscite perché
 * `dragleave` scatta anche sulle pastiglie figlie.
 */
function rendiBersaglio (zona: HTMLElement, cartaId: string): void {
  let dentro = 0
  const valido = (evento: DragEvent): boolean =>
    inViaggio !== null && inViaggio.da !== cartaId &&
    Boolean(evento.dataTransfer?.types.includes(TIPO_CORSI))

  zona.addEventListener('dragenter', (evento: DragEvent) => {
    if (!valido(evento)) return
    evento.preventDefault()
    dentro += 1
    zona.classList.add('carta-intestata__corsi--sopra')
  })
  zona.addEventListener('dragover', (evento: DragEvent) => {
    if (!valido(evento)) return
    evento.preventDefault()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move'
    zona.classList.add('carta-intestata__corsi--sopra')
  })
  zona.addEventListener('dragleave', () => {
    dentro = Math.max(0, dentro - 1)
    if (dentro === 0) zona.classList.remove('carta-intestata__corsi--sopra')
  })
  zona.addEventListener('drop', (evento: DragEvent) => {
    if (!valido(evento)) return
    evento.preventDefault()
    dentro = 0
    const ids = decodificaCorsi(evento.dataTransfer?.getData(TIPO_CORSI) ?? '')
    finisce()
    sposta(ids, cartaId)
  })
}

// ------------------------------------------------------------------ i corsi

/**
 * Il menu «Sposta in…», per tastiera o senza mirare: porta quel che
 * porterebbe il trascinamento (la selezione, se ne fa parte).
 */
function menuSposta (bottone: HTMLElement, ids: string[], da: string): void {
  const partono = daTrascinare(ids, selezione.scelti)
  const carte = carteVive()
  const voci: ElementoMenu[] = [
    { titolo: testi().spostaIn(partono.length) },
    ...carte
      .map((carta, indice) => ({ carta, indice }))
      .filter(({ carta }) => carta.id !== da)
      .map(({ carta, indice }) => ({
        testo: nomeCarta(carta, indice),
        simbolo: 'documento' as const,
        al: () => sposta(partono, carta.id),
      })),
  ]
  menuSotto(bottone, voci)
}

/** Il pulsante «Sposta in…» accanto a un corso o a una classe, se c'è dove spostare. */
function tastoSposta (ids: string[], da: string, di: string): Figlio {
  if (carteVive().length < 2) return null
  return pulsante({
    simbolo: 'giu',
    variante: 'fantasma',
    classe: 'corso-carta__sposta',
    titolo: testi().spostaDi(di),
    al: (evento) => menuSposta(evento.currentTarget as HTMLElement, ids, da),
  })
}

/** Una pastiglia: il corso, che si sceglie col clic e si trascina. */
function pastigliaCorso (
  corso: GruppoDiClasse['corsi'][number],
  cartaId: string,
  ordine: string[],
): HTMLElement {
  const scelto = selezione.scelti.has(corso.id)
  const nome = h(
    'button',
    {
      class: 'corso-carta__nome',
      type: 'button',
      draggable: true,
      dataset: { corso: corso.id },
      attr: {
        title: testi().corsoAiuto(corso.nome),
        'aria-label': corso.nome,
        'aria-pressed': String(scelto),
      },
      onclick: (evento: MouseEvent) => {
        selezione = selezionaCon(selezione, corso.id, modoDelClic(evento), ordine)
        mostraSelezione()
      },
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key !== 'Escape' || selezione.scelti.size === 0) return
        evento.stopPropagation()
        selezione = { scelti: new Set(), ancora: null }
        mostraSelezione()
      },
      ondragstart: (evento: DragEvent) => comincia(evento, [corso.id], cartaId),
      ondragend: () => finisce(),
    },
    corso.etichetta,
  )
  return h(
    'li',
    { class: ['corso-carta', scelto && 'corso-carta--scelto'] },
    nome,
    tastoSposta([corso.id], cartaId, testi().virgolettato(corso.nome)),
  )
}

/** Una classe dentro una carta: il suo nome si trascina e porta tutti i suoi corsi di qui. */
function gruppoClasse (gruppo: GruppoDiClasse, cartaId: string, ordine: string[]): HTMLElement {
  const ids = gruppo.corsi.map((corso) => corso.id)
  return h(
    'div',
    { class: 'carta-classe', attr: { role: 'group', 'aria-label': gruppo.nome } },
    h(
      'div',
      { class: 'carta-classe__testata' },
      h(
        'button',
        {
          class: 'carta-classe__nome',
          type: 'button',
          draggable: true,
          attr: {
            title: testi().classeAiuto(gruppo.nome),
          },
          onclick: (evento: MouseEvent) => {
            const modo = modoDelClic(evento)
            const base: Selezione = modo === 'solo' ? { scelti: new Set(), ancora: null } : selezione
            selezione = { scelti: new Set([...base.scelti, ...ids]), ancora: ids.at(-1) ?? null }
            mostraSelezione()
          },
          ondragstart: (evento: DragEvent) => comincia(evento, ids, cartaId),
          ondragend: () => finisce(),
        },
        gruppo.nome,
        h('span', { class: 'carta-classe__conto' }, String(ids.length)),
      ),
      tastoSposta(ids, cartaId, testi().corsiDi(gruppo.nome)),
    ),
    h('ul', { class: 'carta-classe__corsi' }, ...gruppo.corsi.map((corso) => pastigliaCorso(corso, cartaId, ordine))),
  )
}

/** La zona dei corsi di una carta: dove si lascia cadere. */
function zonaCorsi (
  carta: CartaIntestata,
  indice: number,
  visibili: ReadonlySet<string>,
): HTMLElement {
  const { gruppi, altri } = gruppiDellaCarta(carta.corsi, stato.registro, visibili)
  const ordine = ordineAVista(gruppi)
  const t = testi()
  const zona = h(
    'div',
    {
      class: 'carta-intestata__corsi',
      dataset: { carta: carta.id },
      attr: { role: 'group', 'aria-label': t.corsiSu(nomeCarta(carta, indice)) },
    },
    gruppi.length === 0
      ? h(
          'p',
          { class: 'carta-intestata__vuota' },
          indice === 0 ? t.vuotaPrima : t.vuotaAltra,
        )
      : gruppi.map((gruppo) => gruppoClasse(gruppo, carta.id, ordine)),
    altri > 0
      ? h('small', { class: 'carta-intestata__altri' }, t.altriAnni(altri))
      : null,
  )
  rendiBersaglio(zona, carta.id)
  return zona
}

// ------------------------------------------------------------------- il logo

/** Il dialogo del sistema per il logo di una carta: il file scelto entra nel documento. */
async function scegliLogo (cartaId: string): Promise<void> {
  const risposta = await azione({ tipo: 'intestazione.logo', cartaId })
  if (!risposta.ok) return
  versioniLogo.set(cartaId, (versioniLogo.get(cartaId) ?? 0) + 1)
  aggiorna({})
}

/** Toglie il logo di una carta: i suoi fogli escono con la sola scritta in cima. */
async function togliLogo (cartaId: string): Promise<void> {
  const risposta = await azione({ tipo: 'intestazione.togliLogo', cartaId })
  if (risposta.ok) aggiorna({})
}

/** Il logo com'è adesso, con i gesti per cambiarlo accanto. */
function riquadroLogo (carta: CartaIntestata): Figlio {
  const indirizzo = uriDato(carta.logo)
  const versione = versioniLogo.get(carta.id) ?? 0
  const t = testi()
  return h(
    'div',
    { class: 'campo campo--piena' },
    h('span', { class: 'campo__etichetta' }, t.logo),
    h(
      'div',
      { class: 'intestazione__logo' },
      carta.logo && indirizzo
        ? h('img', {
            class: 'intestazione__miniatura',
            attr: {
              src: versione > 0 ? `${indirizzo}?v=${versione}` : indirizzo,
              alt: t.logoAlt,
            },
          })
        : null,
      ...(carta.logo
        ? [
            pulsante({
              testo: t.sostituisci,
              simbolo: 'immagine',
              variante: 'sottile',
              titolo: t.sostituisciAiuto,
              al: () => scegliLogo(carta.id),
            }),
            pulsante({
              testo: parole().togli,
              simbolo: 'cestino',
              variante: 'fantasma',
              titolo: t.togliLogoAiuto,
              al: () => togliLogo(carta.id),
            }),
          ]
        : [
            pulsante({
              testo: t.caricaLogo,
              simbolo: 'immagine',
              variante: 'sottile',
              titolo: t.caricaLogoAiuto,
              al: () => scegliLogo(carta.id),
            }),
          ]),
    ),
  )
}

// ------------------------------------------------------------------ le carte

/** Toglie una carta, dicendo prima dove vanno i suoi corsi. */
async function eliminaCarta (cartaId: string): Promise<void> {
  const carte = carteVive()
  const indice = carte.findIndex((carta) => carta.id === cartaId)
  const via = carte[indice]
  if (!via || carte.length <= 1) return
  const resta = carte.findIndex((carta) => carta.id !== cartaId)
  const nomeVia = nomeCarta(via, indice)
  const n = via.corsi.length
  if (n > 0) {
    const t = testi()
    const va = await conferma({
      titolo: t.eliminare,
      testo: t.eliminareTesto(nomeVia, n, nomeCarta(carte[resta], resta)),
      testoConferma: t.eliminaCarta,
      pericolo: true,
    })
    if (!va) return
  }
  await salvaCarte(togliCarta(carteVive(), cartaId))
}

/** Una carta intestata: la scuola, il logo, e i corsi che la usano. */
function schedaCarta (
  carta: CartaIntestata,
  indice: number,
  quante: number,
  visibili: ReadonlySet<string>,
): HTMLElement {
  const nome = nomeCarta(carta, indice)
  const t = testi()
  return h(
    'article',
    {
      class: ['carta-intestata', indice === 0 && 'carta-intestata--prima'],
      attr: { 'aria-label': nome },
    },
    h(
      'header',
      { class: 'carta-intestata__testata' },
      h('h4', { class: 'carta-intestata__titolo' }, nome),
      indice === 0
        ? h(
            'span',
            {
              class: 'carta-intestata__predefinita',
              attr: { title: t.predefinitaAiuto },
            },
            t.predefinita,
          )
        : null,
      quante > 1
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            classe: 'carta-intestata__elimina',
            titolo: t.eliminaCartaAiuto(nome),
            al: () => eliminaCarta(carta.id),
          })
        : null,
    ),
    h(
      'div',
      { class: 'modulo' },
      campo({
        // testo-fisso: il nome del campo, non si legge
        nome: `intestazioneSede-${carta.id}`,
        etichetta: t.nomeScuola,
        valore: carta.sede,
        segnaposto: t.nomeScuolaSegnaposto,
        aiuto: t.nomeScuolaAiuto,
        al: (valore) => cambiaCarta(carta.id, { sede: valore.trim() }),
      }),
      riquadroLogo(carta),
      campo({
        // testo-fisso: il nome del campo, non si legge
        nome: `intestazioneAltezzaLogo-${carta.id}`,
        etichetta: t.altezzaLogo,
        tipo: 'number',
        valore: carta.altezzaLogo,
        min: ALTEZZA_LOGO.minimo,
        max: ALTEZZA_LOGO.massimo,
        passo: 1,
        aiuto: t.altezzaLogoAiuto(
          ALTEZZA_LOGO.minimo,
          ALTEZZA_LOGO.massimo,
          ALTEZZA_LOGO.predefinita,
        ),
        larghezza: 'meta',
        al: (valore) => {
          const numero = Number(valore.trim().replace(',', '.'))
          if (valore.trim() === '' || !Number.isFinite(numero)) {
            notifica(t.altezzaNonNumero, 'errore')
            return
          }
          cambiaCarta(carta.id, { altezzaLogo: numero })
        },
      }),
    ),
    h('span', { class: 'campo__etichetta' }, t.corsiSuQuesta),
    zonaCorsi(carta, indice, visibili),
  )
}

/** La sezione «Intestazione» delle impostazioni dell'anno. */
export function vistaIntestazione (): Figlio[] {
  const intestazione = stato.registro.impostazioni.intestazione
  const carte = intestazione.carte
  const visibili = new Set(corsiDellAnnoAperto().map((corso) => corso.id))
  const t = testi()

  return [
    scheda({
      titolo: t.chiFirma,
      aiuto: t.chiFirmaAiuto,
      contenuto: h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'intestazioneDocente',
          etichetta: Uno(lessico().docente),
          valore: intestazione.docente,
          segnaposto: t.docenteSegnaposto,
          aiuto: t.docenteAiuto,
          larghezza: 'meta',
          al: (valore) => void salvaImpostazioni({ intestazione: { docente: valore.trim() } }),
        }),
      ),
    }),
    scheda({
      titolo: t.carte,
      aiuto: t.carteAiuto,
      azioni: pulsante({
        testo: t.nuovaCarta,
        simbolo: 'piu',
        variante: 'sottile',
        titolo: t.nuovaCartaAiuto,
        al: () => salvaCarte([...carteVive(), cartaVuota()]),
      }),
      contenuto: h(
        'div',
        { class: 'carte-intestate' },
        ...carte.map((carta, indice) => schedaCarta(carta, indice, carte.length, visibili)),
      ),
    }),
  ]
}
