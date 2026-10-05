// L'assistente dentro il registro: il riquadro a destra e il suo interruttore.
// Non è una pagina: si chiede mentre si lavora, senza lasciare quel che si
// guarda. Il riquadro è una colonna della griglia, non un velo: il contenuto si
// stringe invece di essere coperto.
//
// «Stacca» porta la conversazione in una finestra sua; da staccato il riquadro
// non la disegna (due fili sulla stessa chat sarebbero due cronologie), mostra
// solo dov'è. Turni, campo e attrezzi stanno in `assistant/chat.tsx`, che vive
// in tutte e due.

import {
  abbandona,
  collegaRidisegno,
  conversazioneInCorso,
  corpoAssistente,
  metti,
  prendi,
  rimetti,
  svuota,
} from './assistant/chat.js'
import {
  conGruppo,
  contestoSpento,
  conTendina,
  PARTI,
  parteSpente,
  riassunti,
  scorciatoiaDi,
  SCORCIATOIE,
  secondoLeParti,
  statoGruppo,
  tendinaAccesa,
  tendineDi,
  type PartiContesto,
} from './assistant/parts.js'
import { testi as testiParti } from './assistant/parts.testi.js'
import { testi } from './assistant.testi.js'
import { Component, type ReactElement, type ReactNode } from 'react'

import { classi } from './classNames.js'
import { Pulsante, StatoVuoto } from './components/base.js'
import { Icona } from './components/icons.js'
import { menuSotto, type ElementoMenu } from './components/menu.js'
import {
  ricordaFuoco,
  ricordaScorrimenti,
  ripristinaFuoco,
  ripristinaScorrimenti,
} from './focus.js'
import { ascolta, azione } from './bridge.js'
import { Isola } from './island.js'
import { isolaPresente, ridisegnaIsola } from './islands.js'
import { veduta } from './viewpoint.js'
import { aggiorna, ridisegna, stato, vai } from './state.js'

/**
 * Se la conversazione è in una finestra a parte. Lo dice l'host e non si
 * ricorda: la finestra esiste adesso o no.
 */
let staccato = false

/**
 * Il riquadro è un'isola (ADR-48): un attrezzo, una tabella, una voce dettata
 * rifanno lui solo, non la pagina che si sta guardando. Chiuso non c'è, e non
 * c'è niente da rifare: aprendolo il disegno legge la conversazione com'è.
 */
const ISOLA = 'assistente'

collegaRidisegno(() => {
  if (isolaPresente(ISOLA)) ridisegnaIsola(ISOLA)
})

ascolta((messaggio) => {
  if (messaggio.tipo !== 'assistente.stato') return
  const prima = staccato
  staccato = messaggio.staccato

  // Rientrata: la conversazione torna col messaggio e il riquadro si riapre su
  // di lei. Si guarda `rientro` e non `storia`: anche una conversazione vuota
  // deve riaprire il riquadro.
  if (messaggio.rientro) {
    // `giro` c'è quando si riattacca a metà risposta: il riquadro riprende il filo.
    metti(messaggio.storia ?? [], messaggio.bozza ?? '', messaggio.giro)
    aggiorna({ assistenteAperto: true })
    return
  }
  // Cambiano anche l'interruttore nella barra e la colonna del guscio: tutto.
  if (prima !== staccato) ridisegna()
})

/** Se l'assistente è acceso nelle impostazioni del programma. */
function acceso (): boolean {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.assistente.attivo')
  return voce?.valore === true
}

/**
 * Se la dettatura è accesa (il microfono nello scrittoio). Interruttore suo:
 * vuole voicebox aperto, non il modello dell'assistente.
 */
function dettaturaAccesa (): boolean {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.dettatura.attivo')
  return voce?.valore === true
}

/** Il modello scelto, per la testata; senza scelta la testata lo dice. */
function modelloScelto (): string {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.assistente.modello')
  return typeof voce?.valore === 'string' && voce.valore !== ''
    ? voce.valore
    : testi().nessunModello
}

// --------------------------------------------------- l'apertura e il riquadro

/**
 * Se il riquadro c'è, adesso: mai se l'assistente è spento nelle impostazioni.
 * Lo legge anche il guscio, così colonna e pulsante spariscono insieme. Lo
 * stato non si azzera: riaccendendo, il riquadro torna com'era.
 */
export function assistenteAperto (): boolean {
  return stato.assistenteAperto && acceso()
}

function imposta (aperto: boolean, restituisciFuoco = false): void {
  aggiorna({ assistenteAperto: aperto })
  if (aperto) {
    // Il fuoco nel campo, dopo il ridisegno: si apre il riquadro per scrivere.
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('.assistente__campo')?.focus()
    })
    return
  }
  if (restituisciFuoco) requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[data-fuoco="apri-assistente"]')?.focus()
  })
}

/**
 * Stacca: la conversazione va all'host e da lì nella finestra nuova. `prendi()`
 * la lascia qui vuota, per non avere due cronologie in contraddizione.
 */
async function stacca (): Promise<void> {
  const bagaglio = prendi()
  imposta(false)
  const esito = await azione({
    tipo: 'assistente.stacca',
    storia: bagaglio.storia,
    ...(bagaglio.bozza !== '' ? { bozza: bagaglio.bozza } : {}),
    // La domanda ancora senza risposta: l'host tiene il filo e la finestra nuova
    // lo riprende.
    ...(bagaglio.giro ? { giro: bagaglio.giro } : {}),
  })
  if (esito.ok) {
    // Presa in carico di là: il filo lasciato aperto da `prendi()` non serve più.
    abbandona()
    return
  }
  // Rifiutata: la conversazione torna nel riquadro, che si riapre. Il giro in
  // volo resta nostro (`rimetti` non lo tocca); il perché l'ha notificato `azione`.
  rimetti(bagaglio)
  imposta(true)
}

/**
 * L'interruttore del riquadro, accanto a quello dello schermo: non è di
 * nessuna pagina. Non è un `ComandoUI`: apre un pezzo della finestra, non fa
 * niente al registro. Da staccato porta davanti la finestra.
 */
export function interruttoreAssistente (): ReactNode {
  // Spento, il pulsante non c'è: si accende dalla sezione «Assistente e modelli» delle impostazioni.
  if (!acceso()) return null
  return <InterruttoreAssistente />
}

function InterruttoreAssistente (): ReactElement {
  const aperto = assistenteAperto() && !staccato
  const t = testi()
  const nome = staccato ? t.portaDavanti : aperto ? t.chiudi : t.assistente

  return (
    <button
      className={classi(
        'barra-comandi__assistente',
        (aperto || staccato) && 'barra-comandi__assistente--aperto',
      )}
      type="button"
      data-fuoco="apri-assistente"
      title={staccato ? t.titoloStaccato : aperto ? t.titoloAperto : t.titoloChiuso}
      aria-label={nome}
      aria-pressed={aperto || staccato}
      aria-expanded={aperto}
      aria-controls="riquadro-assistente"
      onClick={() => {
        // Staccato, `assistente.stacca` con una storia vuota riporta davanti la
        // finestra (vedi `PannelloAssistente.apri`).
        if (staccato) void azione({ tipo: 'assistente.stacca', storia: [] })
        else imposta(!aperto)
      }}
    >
      <Icona nome="bot" />
    </button>
  )
}

/** Quel che il riquadro mostra mentre la conversazione è in un'altra finestra. */
function altrove (): ReactElement {
  return (
    <div className="assistente">
      <StatoVuoto
        simbolo="bot"
        titolo={testi().staccato}
        // Il gesto per riprenderla sta nella finestra, che ha la conversazione: di qua
        // solo «portala davanti».
        testo={testi().staccatoTesto}
        azione={(
          <Pulsante
            testo={testi().portaDavantiFinestra}
            simbolo="duplica"
            al={() => void azione({ tipo: 'assistente.stacca', storia: [] })}
          />
        )}
      />
    </div>
  )
}

/**
 * Che cosa il modello sta per sapere, nella riga sotto il nome: si legge senza
 * passare il mouse. Tutto acceso non si dice.
 */
function notaContesto (): string {
  const parti = stato.contestoAssistente
  if (contestoSpento(parti)) return testi().senzaContesto
  const spente = parteSpente(parti)
  return spente === 0 ? '' : testi().contestoRidotto(spente)
}

// -------------------------------------------- l'interruttore del contesto
//
// Acceso, all'assistente arriva dove si sta guardando: pagina, scheda, tendine
// con le alternative, id risolti, elenco a schermo. Spento del tutto non arriva
// niente, e l'host butta la veduta che teneva. Si spegne per una domanda
// generale o per non nominare la classe al modello. Otto interruttori
// indipendenti e tre scorciatoie sopra (`assistant/parts.ts`).
/**
 * Il pulsante del contesto, ritrovato dopo un ridisegno: ogni spunta rifà la
 * testata, e un nodo staccato non ha rettangolo per appendere il menu.
 */
function bottoneDelContesto (): HTMLElement | null {
  return document.querySelector('.riquadro-assistente__contesto')
}

function vociDelContesto (): ElementoMenu[] {
  const parti = stato.contestoAssistente
  // Il valore di adesso sotto ogni voce, dalla veduta intera: si legge che cosa
  // si sta togliendo.
  const adesso = veduta()
  const dentro = riassunti(adesso)
  const tendine = tendineDi(adesso)
  const scorciatoia = scorciatoiaDi(parti)

  // Il menu resta aperto a ogni spunta, per vedere l'effetto delle parti insieme.
  const scrivi = (nuove: PartiContesto) => {
    aggiorna({ contestoAssistente: nuove })
    queueMicrotask(() => {
      const vivo = bottoneDelContesto()
      if (vivo) menuSotto(vivo, vociDelContesto())
    })
  }

  /** Le tendine di un gruppo, per nome: quelle che la barra mostra adesso. */
  const campiDi = (quale: 'scelte' | 'filtri') =>
    tendine.filter((t) => t.gruppo === quale).map((t) => t.campo)

  /**
   * Un gruppo di tendine col segno a tre stati (tutto, parte col trattino,
   * niente) e le sue righe dentro.
   */
  const gruppo = (quale: 'scelte' | 'filtri'): ElementoMenu[] => {
    const parte = PARTI.find((p) => p.chiave === quale)
    if (!parte) return []
    const campi = campiDi(quale)
    const quanto = statoGruppo(parti, quale, campi)
    const quante = campi.filter((campo) => !parti.tendineSpente.includes(campo)).length
    const vuoto = campi.length === 0
    return [
      {
        testo: parte.testo,
        // A metà, il conto «2 su 3» accanto al valore.
        descrizione: vuoto || quanto === 'tutto'
          ? dentro[quale]
          : testi().suQuante(dentro[quale], quante, campi.length),
        titolo: parte.aiuto,
        simbolo: quanto === 'tutto'
          ? ('spunta' as const)
          : quanto === 'parte' ? ('meno' as const) : undefined,
        accesa: quanto !== 'niente',
        smorzato: vuoto,
        // A metà accende tutte; da tutte spegne il gruppo, da spento lo riaccende intero.
        al: () => scrivi(conGruppo(parti, quale, campi, quanto !== 'tutto')),
      },
      // Le tendine stanno dentro il loro gruppo: si vede che spegnerlo le porta via.
      ...tendine.filter((t) => t.gruppo === quale).map((tendina): ElementoMenu => {
        const accesa = !parti.tendineSpente.includes(tendina.campo)
        return {
          testo: tendina.campo,
          descrizione: tendina.valore,
          titolo: accesa
            ? testi().tendinaDetta(tendina.campo, tendina.valore)
            : testi().tendinaTaciuta(tendina.campo),
          simbolo: accesa ? ('spunta' as const) : undefined,
          accesa: tendinaAccesa(parti, tendina),
          rientro: true,
          // Smorzata a gruppo spento: la spunta resta per quando lo si riaccende.
          smorzato: !parti[quale],
          al: () => {
            // Accendere una tendina di un gruppo spento accende il gruppo.
            const con = conTendina(parti, tendina.campo, !accesa)
            scrivi(!accesa && !parti[quale] ? { ...con, [quale]: true } : con)
          },
        }
      }),
    ]
  }

  /** Una parte semplice: c'è o non c'è, e sotto si legge che cosa porta via. */
  const semplice = (
    chiave: 'pagina' | 'opzioni' | 'periodo' | 'riferimenti' | 'ricerca' | 'visibili',
  ): ElementoMenu => {
    const parte = PARTI.find((p) => p.chiave === chiave)
    return {
      testo: parte?.testo ?? chiave,
      descrizione: dentro[chiave],
      ...(parte ? { titolo: parte.aiuto } : {}),
      // Il visto dice solo questa parte: le parti non si comandano fra loro.
      simbolo: parti[chiave] ? ('spunta' as const) : undefined,
      accesa: parti[chiave],
      smorzato: dentro[chiave] === testiParti().nienteQui,
      al: () => scrivi({ ...parti, [chiave]: !parti[chiave] }),
    }
  }

  return [
    // In cima i tre modi di tutti i giorni: tutto, solo dove sono, niente.
    { titolo: testi().inUnGesto },
    ...SCORCIATOIE.map((corta): ElementoMenu => ({
      testo: corta.testo,
      titolo: corta.aiuto,
      simbolo: scorciatoia === corta.chiave ? ('spunta' as const) : undefined,
      accesa: scorciatoia === corta.chiave,
      al: () => scrivi({ ...corta.parti }),
    })),
    'separatore' as const,
    { titolo: testi().cheCosaSa },
    semplice('pagina'),
    ...gruppo('scelte'),
    ...gruppo('filtri'),
    semplice('opzioni'),
    semplice('periodo'),
    semplice('riferimenti'),
    semplice('ricerca'),
    semplice('visibili'),
  ]
}

/**
 * Il pulsante del contesto, con tre stati distinguibili senza aprire il menu:
 * tutto, in parte, niente.
 */
function contesto (): ReactNode {
  if (staccato) return null
  const parti = stato.contestoAssistente
  const spento = contestoSpento(parti)
  const spente = parteSpente(parti)
  return (
    <Pulsante
      titolo={spento
        ? testi().contestoSpento
        : spente === 0
          ? testi().contestoIntero
          : testi().contestoMeno(spente)}
      simbolo="filtro"
      variante={spento ? 'fantasma' : 'sottile'}
      premuto={!spento}
      classe={classi(
        'riquadro-assistente__contesto',
        !spento && spente === 0 && 'riquadro-assistente__contesto--acceso',
        !spento && spente > 0 && 'riquadro-assistente__contesto--parziale',
      )}
      al={(evento) => menuSotto(evento.currentTarget, vociDelContesto())}
    />
  )
}

/** Fuoco e scorrimenti dentro l'isola, quando si rifà lei sola. */
interface FotoDelRiquadro {
  contenitore: HTMLElement
  fuoco: ReturnType<typeof ricordaFuoco>
  scorrimenti: ReturnType<typeof ricordaScorrimenti>
}

/**
 * Quando l'isola si rifà da sola (un attrezzo, una tabella, una voce dettata)
 * il fotografo del pannello non scatta: fuoco e scorrimento si rimettono qui,
 * solo dentro l'isola, perché la conversazione resti in fondo mentre cresce.
 * La foto si prende prima che il disegno tocchi il documento, come in `main.tsx`.
 */
class FotografoDelRiquadro extends Component<{ children: ReactNode }> {
  override getSnapshotBeforeUpdate (): FotoDelRiquadro | null {
    const contenitore = document.querySelector<HTMLElement>(`[data-isola="${ISOLA}"]`)
    if (!contenitore) return null
    const attivo = document.activeElement
    return {
      contenitore,
      fuoco: attivo && contenitore.contains(attivo) ? ricordaFuoco() : null,
      scorrimenti: ricordaScorrimenti(contenitore),
    }
  }

  override componentDidUpdate (
    _prima: unknown,
    _statoPrima: unknown,
    foto: FotoDelRiquadro | null,
  ): void {
    if (!foto) return
    ripristinaFuoco(foto.fuoco)
    ripristinaScorrimenti(foto.scorrimenti, foto.contenitore)
  }

  override render (): ReactNode {
    return this.props.children
  }
}

/**
 * Il riquadro a destra. Chiuso non disegna niente: è una colonna che non c'è,
 * e il contenuto riprende il posto.
 */
export function pannelloAssistente (): ReactNode {
  if (!assistenteAperto()) return null

  // La conversazione che scorre resta lo stesso nodo da un disegno all'altro, e
  // la rotella in corsa non si perde. I due involucri non contano per
  // l'impaginazione (`display: contents`).
  return (
    <aside
      id="riquadro-assistente"
      className="riquadro-assistente"
      data-telaio="assistente"
      aria-label={testi().assistente}
      onKeyDown={(evento) => {
        if (evento.key !== 'Escape') return
        evento.preventDefault()
        imposta(false, true)
      }}
    >
      <Isola
        chiave={ISOLA}
        disegna={() => <FotografoDelRiquadro>{dentroAlRiquadro()}</FotografoDelRiquadro>}
        className="riquadro-assistente__isola"
        data-telaio="assistente-isola"
      />
    </aside>
  )
}

/** Testata e conversazione: quel che l'isola rifà. */
function dentroAlRiquadro (): ReactElement {
  return (
    <div className="riquadro-assistente__dentro" data-telaio="assistente-dentro">
      <header className="riquadro-assistente__testa">
        <div className="riquadro-assistente__nome">
          <Icona nome="bot" classe="icona--minuta" />
          <strong>{testi().assistente}</strong>
        </div>
        <span className="riquadro-assistente__nota">
          {/* «Non scrive» e non «sola lettura»: l'assistente apre le pagine, ma non
              tocca i dati. */}
          {staccato
            ? testi().inFinestraAParte
            : acceso()
              // Lo stato del contesto, da leggere senza passare il mouse.
              ? `${testi().nonScrive(modelloScelto())}${notaContesto()}`
              : testi().spento}
        </span>
        {/* L'interruttore del contesto accanto alla conversazione: si cambia per una
            domanda, e qui se ne vede l'effetto. */}
        {contesto()}
        {!staccato && conversazioneInCorso()
          ? <Pulsante titolo={testi().dimentica} simbolo="cestino" variante="fantasma" al={() => svuota()} />
          : null}
        {!staccato
          ? <Pulsante titolo={testi().stacca} simbolo="duplica" variante="fantasma" al={() => void stacca()} />
          : null}
        <Pulsante titolo={testi().chiudi} simbolo="chiudi" variante="fantasma" al={() => imposta(false, true)} />
      </header>
      {staccato
        ? altrove()
        : corpoAssistente({
            acceso: acceso(),
            modello: modelloScelto(),
            dettatura: dettaturaAccesa(),
            // Il contesto si compone quando si preme Invio e parte nella busta della
            // domanda: `assistente.contesto` è una scrittura in coda e arriverebbe dopo.
            // Quel canale resta per la finestra staccata.
            contesto: () => secondoLeParti(veduta(), stato.contestoAssistente),
            alleImpostazioni: () => {
              vai({ pagina: 'pagina.impostazioni', scheda: 'programma#modelli' })
            },
          })}
    </div>
  )
}
