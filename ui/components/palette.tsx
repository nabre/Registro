// La palette: si scrive il nome di quel che si vuole e si preme Invio. Legge
// gli stessi elenchi della barra (`COMANDI_UI`, `PAGINE`) e dello stato:
// pagine, azioni, impostazioni, persone in formazione, corsi, classi («dov'è
// Rossi?» in un passo). Le impostazioni vengono dalla stessa ricerca del
// filtro della pagina (`cercaImpostazioni`). L'ordine dei gruppi è fisso, perché si impari; Invio prende la prima
// riga che si può fare. Vive fuori dal ridisegno, come modali e menu, in una
// radice di React sua (ADR-56).

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import {
  COMANDI_UI,
  aiutoDi,
  eseguiComando,
  impedimentoDi,
  titoloDi,
  type ComandoUI,
} from '#ui/commands.js'
import { allieviAttivi, nomeCompleto } from '#core/dominio/calculations.js'
import { Molti, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Classe } from '#core/dominio/models.js'
import { confrontaNomi, corrispondeAlla, pezziDiRicerca } from '#core/dominio/text.js'
import { nomeDelCorso } from '#ui/context.js'
import { classi as classiCss } from '#ui/classNames.js'
import { rifocalizza } from '#ui/focus.js'
import { Input } from '#ui/fields.js'
import { EVENTO_MODALE_APERTA } from './modal.js'
import { pagineVisibili, vaiA, type Pagina } from '#ui/pages.js'
import { classiDellAnno, corsiDellAnnoAperto, stato, vai } from '#ui/state.js'
import { vaiAllImpostazione } from '#ui/views/settings.js'
import {
  AREE,
  cercaImpostazioni,
  nomeAmbito,
  sezioneDi,
  type Trovata,
} from '#ui/views/settings/sections.js'
import { Icona, type NomeIcona } from './icons.js'
import { testi } from './palette.testi.js'

/** Le specie di riga, nell'ordine in cui compaiono. */
type Specie = 'pagine' | 'comandi' | 'impostazioni' | 'persone' | 'corsi' | 'classi'

const ORDINE: readonly Specie[] = ['pagine', 'comandi', 'impostazioni', 'persone', 'corsi', 'classi']

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
 * Un'impostazione trovata: una voce del programma o una sezione, con area,
 * sezione e ambito sotto il nome. Porta lì e la accende.
 */
function voceDiImpostazione (trovata: Trovata): Voce {
  const area = AREE.find((candidata) => candidata.id === trovata.area) ?? AREE[0]
  const sezione = sezioneDi(trovata.sezione)
  const dove = sezione.titolo === trovata.titolo ? area.titolo : `${area.titolo} › ${sezione.titolo}`
  return {
    specie: 'impostazioni',
    titolo: trovata.titolo,
    simbolo: area.simbolo,
    sotto: trovata.ambito ? `${dove} · ${nomeAmbito(trovata.ambito).nome}` : dove,
    aiuto: null,
    impedito: null,
    al: () => vaiAllImpostazione(trovata.scheda),
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
      al: () => vai(
        { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: allievo.id } },
        { contesto: { classeId: classe.id } },
      ),
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
      // Il corso porta con sé la sua classe come filtro (`completa`).
      al: () => vai({ pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: corso.id } }),
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
    al: () => vai({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: classe.id } }),
  }))
}

/** Il titoletto di un gruppo: quelli dell'anno sono termini del registro, in ogni lingua. */
function titoloDellaSpecie (specie: Specie): string {
  const L = lessico()
  switch (specie) {
    case 'pagine': return testi().pagine
    case 'comandi': return testi().comandi
    case 'impostazioni': return testi().impostazioni
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
  pagine: 6, comandi: 4, impostazioni: 0, persone: 0, corsi: 0, classi: 0,
}
const TETTO: Record<Specie, number> = {
  pagine: 4, comandi: 5, impostazioni: 4, persone: 6, corsi: 3, classi: 3,
}

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
    pagine: () => pagineVisibili().map(voceDiPagina),
    comandi: () => COMANDI_UI.map(voceDiComando),
    // Già scelte dalla ricerca delle impostazioni, che guarda anche chiave e descrizione.
    impostazioni: () => cercaImpostazioni(stato.programma, cercato).map(voceDiImpostazione),
    persone: () => vociDellePersone(classi),
    corsi: () => vociDeiCorsi(),
    classi: () => vociDelleClassi(classi),
  }
  return ORDINE.flatMap((specie): GruppoTrovato[] => {
    if (tetto[specie] === 0) return []
    const valide = specie === 'impostazioni'
      ? candidate[specie]()
      : candidate[specie]().filter((voce) => corrisponde(voce, pezzi))
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
function TastoNelPiede ({ tasti, che }: { tasti: readonly string[], che: string }): ReactElement {
  return (
    <span className="palette__tasto">
      {tasti.map((tasto) => <kbd key={tasto}>{tasto}</kbd>)}
      <span>{che}</span>
    </span>
  )
}

/** Quel che `apriPalette` e la palette disegnata si passano. */
interface Leve {
  chiudi: () => void
  /** Il campo, per rimettergli il fuoco. */
  campo: { current: HTMLInputElement | null }
  /** Il riquadro, per sapere se una pressione sul velo è dentro. */
  riquadro: { current: HTMLDivElement | null }
  segnale: AbortSignal
}

function Palette ({ leve }: { leve: Leve }): ReactElement {
  const t = testi()
  const [cercato, impostaCercato] = useState('')
  // Si parte dalla prima riga che funziona, perché una pagina spenta in cima non
  // prenda l'Invio.
  const [scelto, impostaScelto] = useState(() => primaPossibile(trovati('').flatMap((gruppo) => gruppo.voci)))
  const elenco = useRef<HTMLDivElement | null>(null)

  const gruppi = trovati(cercato.trim())
  const visibili = gruppi.flatMap((gruppo) => gruppo.voci)
  const sceltoOra = scelto >= visibili.length ? Math.max(0, visibili.length - 1) : scelto
  const quale = visibili.length > 0 ? `palette-voce-${sceltoOra}` : undefined // testo-fisso: id dell’elemento, non si legge

  // Le letture della tastiera, sempre quelle dell'ultimo disegno.
  const ultimo = useRef({ visibili, scelto: sceltoOra })
  useLayoutEffect(() => {
    ultimo.current = { visibili, scelto: sceltoOra }
  })

  // La riga scelta si porta in vista: il fuoco resta nel campo e il browser non
  // la insegue. `nearest` muove il minimo (come `desktop/shell/pages/dialog/`);
  // la prima riga di un gruppo si porta dietro il suo titoletto.
  useLayoutEffect(() => {
    const scelta = quale ? elenco.current?.querySelector<HTMLElement>(`#${quale}`) : null
    if (!scelta) return
    const titoletto = scelta.previousElementSibling
    if (titoletto?.classList.contains('palette__gruppo-titolo')) titoletto.scrollIntoView({ block: 'nearest' })
    scelta.scrollIntoView({ block: 'nearest' })
  }, [quale, cercato])

  useLayoutEffect(() => {
    const allaTastiera = (evento: KeyboardEvent) => {
      const { visibili, scelto } = ultimo.current
      if (evento.key === 'Escape') {
        evento.preventDefault()
        // `Immediate`: fumetti e modali in ascolto sul `document` non devono sentire
        // lo stesso Esc.
        evento.stopImmediatePropagation()
        leve.chiudi()
        return
      }
      if (evento.key === 'Tab') {
        // Una fermata sola, il campo: Tab non esce verso la pagina sotto il velo.
        evento.preventDefault()
        leve.campo.current?.focus()
        return
      }
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault()
        if (visibili.length === 0) return
        const passo = evento.key === 'ArrowDown' ? 1 : -1
        // Gira: in fondo si ricomincia da capo.
        impostaScelto((scelto + passo + visibili.length) % visibili.length)
        return
      }
      if (evento.key === 'Enter') {
        evento.preventDefault()
        const voce = visibili[scelto]
        if (!voce) return
        leve.chiudi()
        voce.al()
      }
    }
    document.addEventListener('keydown', allaTastiera, { capture: true, signal: leve.segnale })
    return () => document.removeEventListener('keydown', allaTastiera, { capture: true })
  }, [leve])

  let indice = 0
  return (
    <div ref={leve.riquadro} className="palette" role="dialog" aria-modal="true" aria-label={t.cerca}>
      <div className="palette__testa">
        <Icona nome="lente" />
        {/*
          Campo ed elenco sono un `combobox`: il fuoco resta nel campo, `aria-controls`
          dice quale elenco e `aria-activedescendant` quale riga, perché le frecce
          muovono la scelta e non il fuoco. Le righe sono `<div role="option">`, non
          bottoni: niente ruoli in conflitto e nessuna fermata di Tab in più.
        */}
        <Input
          ref={leve.campo}
          className="palette__campo"
          type="text"
          valore=""
          placeholder={t.segnaposto}
          aria-label={t.cerca}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-elenco"
          aria-autocomplete="list"
          aria-activedescendant={quale}
          autoComplete="off"
          spellCheck="false"
          onInput={(evento) => {
            // L'elenco è nuovo: si riparte dalla prima riga che funziona.
            const scritto = evento.currentTarget.value
            impostaCercato(scritto)
            impostaScelto(primaPossibile(trovati(scritto.trim()).flatMap((gruppo) => gruppo.voci)))
          }}
        />
      </div>
      <div ref={elenco} className="palette__elenco" role="listbox" id="palette-elenco" aria-label={t.risultati}>
        {visibili.length === 0
          ? <p className="palette__vuoto">{t.niente}</p>
          : gruppi.map((gruppo) => {
            // Il titoletto nomina il gruppo (`aria-labelledby`) ed è muto da solo: in un
            // `listbox` parlano solo righe e gruppi.
              const id = `palette-gruppo-${gruppo.specie}` // testo-fisso: id dell’elemento, non si legge
              return (
                <div key={gruppo.specie} className="palette__gruppo" role="group" aria-labelledby={id}>
                  <div className="palette__gruppo-titolo" id={id} aria-hidden="true">
                    <span>{titoloDellaSpecie(gruppo.specie)}</span>
                    {gruppo.tutte > gruppo.voci.length
                      ? <span className="palette__gruppo-conto">{t.diTanti(gruppo.voci.length, gruppo.tutte)}</span>
                      : null}
                  </div>
                  {gruppo.voci.map((voce) => {
                    const mio = indice++
                    // La chiave è il posto: le righe sono rifatte a ogni lettera, e
                    // l'id che il campo nomina è quello del posto.
                    return (
                      <RigaPalette
                        key={mio}
                        voce={voce}
                        indice={mio}
                        scelta={mio === sceltoOra}
                        chiudi={leve.chiudi}
                      />
                    )
                  })}
                </div>
              )
            })}
      </div>
      {/*
        Il piede dice i tasti a chi apre la palette col mouse; muto per il lettore
        di schermo, a cui il `combobox` dice già tutto.
      */}
      <div className="palette__piede" aria-hidden="true">
        <TastoNelPiede tasti={['↑', '↓']} che={t.perScegliere} />
        <TastoNelPiede tasti={[t.tastoInvio]} che={t.perAprire} />
        <TastoNelPiede
          tasti={['Esc']} // testo-fisso: nome del tasto
          che={t.perChiudere}
        />
      </div>
    </div>
  )
}

function RigaPalette ({ voce, indice, scelta, chiudi }: {
  voce: Voce
  indice: number
  scelta: boolean
  chiudi: () => void
}): ReactElement {
  const impedito = voce.impedito
  return (
    <div
      className={classiCss('palette__voce', scelta && 'palette__voce--scelta', impedito && 'palette__voce--impedita')}
      role="option"
      id={`palette-voce-${indice}`}
      aria-selected={scelta ? 'true' : 'false'}
      // `mousedown` e non `click`: il campo perderebbe il fuoco prima del clic.
      onMouseDown={(evento) => {
        // Solo il tasto sinistro.
        if (evento.button !== 0) return
        evento.preventDefault()
        chiudi()
        voce.al()
      }}
    >
      <span className="palette__segno"><Icona nome={voce.simbolo} classe="icona--minuta" /></span>
      <span className="palette__testo">
        <span className="palette__titolo">{voce.titolo}</span>
        <small className="palette__aiuto">{impedito ?? voce.aiuto ?? voce.sotto}</small>
      </span>
      {voce.scorciatoia ? <kbd>{voce.scorciatoia}</kbd> : null}
    </div>
  )
}

export function apriPalette (): void {
  // Riaprirla mentre è aperta la chiude: stesso tasto.
  if (apertaOra) {
    chiudiPalette()
    return
  }

  const velo = document.createElement('div')
  velo.className = 'palette__velo'
  const radice = createRoot(velo)

  // Chi aveva il fuoco prima lo riavrà alla chiusura.
  const fuocoPrima = document.activeElement as HTMLElement | null
  // Tutti gli ascoltatori su un filo solo: chiudendo si taglia quello.
  const ascolto = new AbortController()

  const chiudi = () => {
    if (apertaOra !== chiudi) return
    apertaOra = null
    ascolto.abort()
    // Dopo il giro in corso: si chiude anche da dentro un gestore di React.
    queueMicrotask(() => radice.unmount())
    velo.remove()
    rifocalizza(fuocoPrima)
  }

  const leve: Leve = {
    chiudi,
    campo: { current: null },
    riquadro: { current: null },
    segnale: ascolto.signal,
  }

  velo.addEventListener('mousedown', (evento: MouseEvent) => {
    if (!leve.riquadro.current?.contains(evento.target as Node | null)) chiudi()
  })

  apertaOra = chiudi
  // Quando si apre una modale (da un acceleratore) la palette si toglie di mezzo:
  // altrimenti il velo la coprirebbe e prenderebbe Esc.
  document.addEventListener(EVENTO_MODALE_APERTA, chiudi, { signal: ascolto.signal })
  document.body.appendChild(velo)
  flushSync(() => radice.render(<Palette leve={leve} />))
  leve.campo.current?.focus()
}
