// La palette: si scrive il nome di quel che si vuole e si preme Invio. Legge
// gli stessi elenchi della barra (`COMANDI_UI`, `PAGINE`) e dello stato:
// pagine, azioni, persone in formazione, corsi, classi («dov'è Rossi?» in un
// passo). L'ordine dei gruppi è fisso, perché si impari; Invio prende la prima
// riga che si può fare. Vive fuori dal ridisegno, come modali e menu.

import {
  COMANDI_UI,
  aiutoDi,
  eseguiComando,
  impedimentoDi,
  titoloDi,
  type ComandoUI,
} from '../commands.js'
import { allieviAttivi, nomeCompleto } from '../../domain/calculations.js'
import { Molti, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Classe } from '../../domain/models.js'
import { confrontaNomi, corrispondeAlla, pezziDiRicerca } from '../../domain/text.js'
import { nomeDelCorso } from '../context.js'
import { h, rifocalizza } from '../dom.js'
import { EVENTO_MODALE_APERTA } from './modal.js'
import { PAGINE, vaiA, type Pagina } from '../pages.js'
import { aggiorna, classiDellAnno, corsiDellAnnoAperto } from '../state.js'
import { icona, type NomeIcona } from './icons.js'
import { testi } from './palette.testi.js'

/** Le specie di riga, nell'ordine in cui compaiono. */
type Specie = 'pagine' | 'comandi' | 'persone' | 'corsi' | 'classi'

const ORDINE: readonly Specie[] = ['pagine', 'comandi', 'persone', 'corsi', 'classi']

/**
 * Una riga della palette: una pagina, un'azione, una persona, un corso, una
 * classe — ridotte a quel che serve per cercarle, disegnarle e farle partire.
 */
interface Voce {
  specie: Specie
  titolo: string
  simbolo: NomeIcona
  /** La riga piccola sotto il nome: il gruppo dell'azione, «Vai a», la classe della persona. */
  sotto: string
  aiuto: string | null
  /**
   * Parole in più su cui cercare, che non si mostrano: il titolo scritto a
   * mano di un corso, quando il nome che si legge è «classe · materia».
   */
  anche?: string
  scorciatoia?: string
  impedito: string | null
  al: () => void
}

function voceDiPagina (pagina: Pagina): Voce {
  return {
    specie: 'pagine',
    titolo: pagina.titolo,
    simbolo: pagina.simbolo,
    sotto: testi().vaiA,
    aiuto: pagina.aiuto ?? null,
    impedito: pagina.impedimento?.() ?? null,
    al: () => vaiA(pagina),
  }
}

function voceDiComando (comando: ComandoUI): Voce {
  return {
    specie: 'comandi',
    titolo: titoloDi(comando),
    simbolo: comando.simbolo,
    sotto: comando.gruppo,
    aiuto: aiutoDi(comando),
    scorciatoia: comando.scorciatoia,
    impedito: impedimentoDi(comando),
    al: () => void eseguiComando(comando),
  }
}

/**
 * Le persone in formazione dell'anno, in ordine di nome, con la classe sotto:
 * distingue gli omonimi e restringe la ricerca («rossi dic4a»). Chi si è
 * ritirato resta, in coda: le sue lezioni lo citano ancora.
 */
function vociDellePersone (classi: readonly Classe[]): Voce[] {
  return classi
    .flatMap((classe) => classe.allievi.map((allievo) => ({ classe, allievo })))
    .sort((a, b) =>
      Number(!a.allievo.attivo) - Number(!b.allievo.attivo) ||
      confrontaNomi(nomeCompleto(a.allievo), nomeCompleto(b.allievo)))
    .map(({ classe, allievo }): Voce => ({
      specie: 'persone',
      titolo: nomeCompleto(allievo),
      simbolo: 'utente',
      sotto: classe.nome,
      aiuto: null,
      impedito: null,
      al: () => aggiorna({ vista: 'allievo', classeId: classe.id, allievoId: allievo.id }),
    }))
}

/**
 * I corsi dell'anno: portano alla loro scheda, che c'è sempre (il registro
 * vuole un'ora). Corso e classe insieme, come `vaiAlCorso` in `pages.ts`.
 */
function vociDeiCorsi (): Voce[] {
  return corsiDellAnnoAperto().map((corso): Voce => {
    const nome = nomeDelCorso(corso)
    return {
      specie: 'corsi',
      titolo: nome,
      simbolo: 'libro',
      sotto: testi().schedaDelCorso,
      aiuto: null,
      anche: corso.titolo === nome ? undefined : corso.titolo,
      impedito: null,
      al: () => aggiorna({ vista: 'corsi', corsoId: corso.id, filtroClasseId: corso.classeId }),
    }
  })
}

/** Le classi dell'anno aperto, con quante persone ci sono dentro adesso. */
function vociDelleClassi (classi: readonly Classe[]): Voce[] {
  return classi.map((classe): Voce => ({
    specie: 'classi',
    titolo: classe.nome,
    simbolo: 'classi',
    sotto: quanti(allieviAttivi(classe).length, lessico().pif),
    aiuto: null,
    impedito: null,
    al: () => aggiorna({ vista: 'classi', classeId: classe.id }),
  }))
}

/** Il titoletto di un gruppo: quelli dell'anno sono termini del registro, in ogni lingua. */
function titoloDellaSpecie (specie: Specie): string {
  const L = lessico()
  switch (specie) {
    case 'pagine': return testi().pagine
    case 'comandi': return testi().comandi
    case 'persone': return Molti(L.pif)
    case 'corsi': return Molti(L.corso)
    case 'classi': return Molti(L.classe)
  }
}

/**
 * Quante righe per gruppo. A campo vuoto sei pagine e quattro comandi;
 * scrivendo ogni gruppo ha il suo tetto, così nessuno ruba il posto agli altri.
 * Oltre il tetto il titoletto dice «6 di 12».
 */
const TETTO_A_VUOTO: Record<Specie, number> = {
  pagine: 6, comandi: 4, persone: 0, corsi: 0, classi: 0,
}
const TETTO: Record<Specie, number> = { pagine: 4, comandi: 5, persone: 6, corsi: 3, classi: 3 }

let apertaOra: (() => void) | null = null

/** Chiude la palette se è aperta, e ridà il fuoco a chi lo aveva prima. */
function chiudiPalette (): void {
  apertaOra?.()
}

/**
 * Se la voce risponde a quel che si è scritto: tutte le parole, in qualunque
 * ordine e campo (nome, gruppo, spiegazione).
 */
function corrisponde (voce: Voce, pezzi: readonly string[]): boolean {
  if (pezzi.length === 0) return true
  // `corrispondeAlla` toglie accenti e punteggiatura, come la ricerca di persone
  // e piani: «rifa» trova «Chi li rifà», «nicolo» trova Nicolò.
  return corrispondeAlla([voce.titolo, voce.sotto, voce.aiuto ?? '', voce.anche ?? ''].join(' '), pezzi)
}

/** Un gruppo trovato: le righe che si mostrano, e quante erano in tutto. */
interface GruppoTrovato {
  specie: Specie
  voci: Voce[]
  tutte: number
}

/**
 * I gruppi trovati: dentro ognuno quel che si può fare adesso viene prima, e le
 * righe spente restano sotto con il loro perché. Le cose dell'anno si cercano
 * solo quando c'è qualcosa di scritto.
 */
function trovati (cercato: string): GruppoTrovato[] {
  const pezzi = pezziDiRicerca(cercato)
  const tetto = pezzi.length === 0 ? TETTO_A_VUOTO : TETTO
  const classi = pezzi.length === 0 ? [] : classiDellAnno()
  const candidate: Record<Specie, () => Voce[]> = {
    pagine: () => PAGINE.map(voceDiPagina),
    comandi: () => COMANDI_UI.map(voceDiComando),
    persone: () => vociDellePersone(classi),
    corsi: () => vociDeiCorsi(),
    classi: () => vociDelleClassi(classi),
  }
  return ORDINE.flatMap((specie): GruppoTrovato[] => {
    if (tetto[specie] === 0) return []
    const valide = candidate[specie]().filter((voce) => corrisponde(voce, pezzi))
    const possibili = valide.filter((voce) => voce.impedito === null)
    const impedite = valide.filter((voce) => voce.impedito !== null)
    const voci = [...possibili, ...impedite].slice(0, tetto[specie])
    // A campo vuoto il conto non si dice.
    const tutte = pezzi.length === 0 ? voci.length : valide.length
    return voci.length === 0 ? [] : [{ specie, voci, tutte }]
  })
}

/** La prima riga che si può eseguire: è lì che parte la scelta, e dove va Invio. */
function primaPossibile (voci: readonly Voce[]): number {
  return Math.max(0, voci.findIndex((voce) => voce.impedito === null))
}

/** Un tasto nel piede: il tasto, e quel che fa. */
function tastoNelPiede (tasti: readonly string[], che: string): HTMLElement {
  return h(
    'span',
    { class: 'palette__tasto' },
    ...tasti.map((tasto) => h('kbd', null, tasto)),
    h('span', null, che),
  )
}

export function apriPalette (): void {
  // Riaprirla mentre è aperta la chiude: stesso tasto.
  if (apertaOra) {
    chiudiPalette()
    return
  }
  const t = testi()

  /*
   * Campo ed elenco sono un `combobox`: il fuoco resta nel campo, `aria-controls`
   * dice quale elenco e `aria-activedescendant` quale riga, perché le frecce
   * muovono la scelta e non il fuoco. Le righe sono `<div role="option">`, non
   * bottoni: niente ruoli in conflitto e nessuna fermata di Tab in più.
   */
  const campo = h('input', {
    class: 'palette__campo',
    type: 'text',
    value: '',
    attr: {
      placeholder: t.segnaposto,
      'aria-label': t.cerca,
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-controls': 'palette-elenco',
      'aria-autocomplete': 'list',
      autocomplete: 'off',
      spellcheck: 'false',
    },
  })

  const elenco = h('div', {
    class: 'palette__elenco',
    attr: { role: 'listbox', id: 'palette-elenco', 'aria-label': t.risultati },
  })
  const riquadro = h(
    'div',
    {
      class: 'palette',
      attr: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t.cerca },
    },
    h('div', { class: 'palette__testa' }, icona('lente'), campo),
    elenco,
    // Il piede dice i tasti a chi apre la palette col mouse; muto per il lettore
    // di schermo, a cui il `combobox` dice già tutto.
    h(
      'div',
      { class: 'palette__piede', attr: { 'aria-hidden': 'true' } },
      tastoNelPiede(['↑', '↓'], t.perScegliere),
      tastoNelPiede([t.tastoInvio], t.perAprire),
      tastoNelPiede(['Esc'], t.perChiudere), // testo-fisso: nome del tasto
    ),
  )
  const velo = h('div', { class: 'palette__velo' }, riquadro)

  let visibili: Voce[] = []
  let scelto = 0

  // Chi aveva il fuoco prima lo riavrà alla chiusura.
  const fuocoPrima = document.activeElement as HTMLElement | null
  // Tutti gli ascoltatori su un filo solo: chiudendo si taglia quello.
  const ascolto = new AbortController()

  const chiudi = () => {
    if (apertaOra === null) return
    apertaOra = null
    ascolto.abort()
    velo.remove()
    rifocalizza(fuocoPrima)
  }

  const riga = (voce: Voce, indice: number): HTMLElement => {
    const impedito = voce.impedito
    return h(
      'div',
      {
        class: [
          'palette__voce',
          indice === scelto && 'palette__voce--scelta',
          impedito && 'palette__voce--impedita',
        ],
        attr: {
          role: 'option',
          id: `palette-voce-${indice}`,
          'aria-selected': indice === scelto ? 'true' : 'false',
        },
        // `mousedown` e non `click`: il campo perderebbe il fuoco prima del clic.
        onmousedown: (evento: MouseEvent) => {
          // Solo il tasto sinistro.
          if (evento.button !== 0) return
          evento.preventDefault()
          chiudi()
          voce.al()
        },
      },
      h('span', { class: 'palette__segno' }, icona(voce.simbolo, 'icona--minuta')),
      h(
        'span',
        { class: 'palette__testo' },
        h('span', { class: 'palette__titolo' }, voce.titolo),
        h('small', { class: 'palette__aiuto' }, impedito ?? voce.aiuto ?? voce.sotto),
      ),
      voce.scorciatoia ? h('kbd', null, voce.scorciatoia) : null,
    )
  }

  /**
   * `daCapo` quando l'elenco è nuovo (aperto, o cambiato scrivendo): si parte
   * dalla prima riga che funziona, perché una pagina spenta in cima non prenda
   * l'Invio.
   */
  const disegna = (daCapo = false) => {
    const gruppi = trovati(campo.value.trim())
    visibili = gruppi.flatMap((gruppo) => gruppo.voci)
    if (daCapo) scelto = primaPossibile(visibili)
    else if (scelto >= visibili.length) scelto = Math.max(0, visibili.length - 1)
    let indice = 0
    elenco.replaceChildren(
      ...(visibili.length === 0
        ? [h('p', { class: 'palette__vuoto' }, t.niente)]
        : gruppi.map((gruppo) => {
            // Il titoletto nomina il gruppo (`aria-labelledby`) ed è muto da solo: in un
            // `listbox` parlano solo righe e gruppi.
            const id = `palette-gruppo-${gruppo.specie}` // testo-fisso: id dell’elemento, non si legge
            return h(
              'div',
              { class: 'palette__gruppo', attr: { role: 'group', 'aria-labelledby': id } },
              h(
                'div',
                { class: 'palette__gruppo-titolo', attr: { id, 'aria-hidden': 'true' } },
                h('span', null, titoloDellaSpecie(gruppo.specie)),
                gruppo.tutte > gruppo.voci.length
                  ? h('span', { class: 'palette__gruppo-conto' }, t.diTanti(gruppo.voci.length, gruppo.tutte))
                  : null,
              ),
              ...gruppo.voci.map((voce) => riga(voce, indice++)),
            )
          })),
    )
    // Dopo aver ridisegnato: l'id deve esistere quando il campo lo nomina.
    const quale = visibili.length > 0 ? `palette-voce-${scelto}` : null // testo-fisso: id dell’elemento, non si legge
    if (quale) campo.setAttribute('aria-activedescendant', quale)
    else campo.removeAttribute('aria-activedescendant')

    // Poi la riga scelta si porta in vista: il fuoco resta nel campo e il browser
    // non la insegue. `nearest` muove il minimo (come `shell/pages/dialog/`); la
    // prima riga di un gruppo si porta dietro il suo titoletto.
    const scelta = quale ? elenco.querySelector<HTMLElement>(`#${quale}`) : null
    if (scelta) {
      const titoletto = scelta.previousElementSibling
      if (titoletto?.classList.contains('palette__gruppo-titolo')) titoletto.scrollIntoView({ block: 'nearest' })
      scelta.scrollIntoView({ block: 'nearest' })
    }
  }

  const allaTastiera = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      // `Immediate`: fumetti e modali in ascolto sul `document` non devono sentire
      // lo stesso Esc.
      evento.stopImmediatePropagation()
      chiudi()
      return
    }
    if (evento.key === 'Tab') {
      // Una fermata sola, il campo: Tab non esce verso la pagina sotto il velo.
      evento.preventDefault()
      campo.focus()
      return
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (visibili.length === 0) return
      const passo = evento.key === 'ArrowDown' ? 1 : -1
      // Gira: in fondo si ricomincia da capo.
      scelto = (scelto + passo + visibili.length) % visibili.length
      disegna()
      return
    }
    if (evento.key === 'Enter') {
      evento.preventDefault()
      const voce = visibili[scelto]
      if (!voce) return
      chiudi()
      voce.al()
    }
  }

  campo.addEventListener('input', () => disegna(true))
  velo.addEventListener('mousedown', (evento: MouseEvent) => {
    if (!riquadro.contains(evento.target as Node | null)) chiudi()
  })

  apertaOra = chiudi
  document.addEventListener('keydown', allaTastiera, { capture: true, signal: ascolto.signal })
  // Quando si apre una modale (da un acceleratore) la palette si toglie di mezzo:
  // altrimenti il velo la coprirebbe e prenderebbe Esc.
  document.addEventListener(EVENTO_MODALE_APERTA, chiudi, { signal: ascolto.signal })
  document.body.appendChild(velo)
  disegna(true)
  campo.focus()
}
