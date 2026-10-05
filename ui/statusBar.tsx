// La barra in fondo: che cosa manca e com'è messa la macchina. A sinistra quel
// che chiede qualcosa (l'ora da compilare, le pendenze), come pulsanti; a destra
// lo stato della macchina con le sole icone (assistente, lettura delle
// scansioni, rete, posta, anno), frase intera nel titolo, e per ultima la
// versione, scritta. Una
// voce che non ha niente da dire non compare: una barra sempre uguale smette
// di essere letta.

import type { MouseEvent as EventoMouse, ReactElement, ReactNode } from 'react'

import { numeroDellaLezione } from '#core/dominio/courses.js'
import { formattaData } from '#core/dominio/dates.js'
import { Icona, type NomeIcona } from './components/icons.js'
import { alternaMenuSotto, tendinaAperta } from './components/menu.js'
import { controllaDallaBarra, statoDegliAggiornamenti } from './views/settings/updates.js'
import { classi } from './classNames.js'
import { FUOCO_ANNO, menuDeiRegistri } from './commandBar.js'
import { Isola } from './island.js'
import { corsoDelContesto } from './context.js'
import { apriLezione, paginaAttiva } from './pages.js'
import {
  annoCorrente,
  nomeClasseDiLezione,
  nomeCorso,
  oreDaChiudereBarra,
  pendenzeDellaBarraDiStato,
  type PendenzeDellaVoce,
  prossimaOra,
  stato,
  vai,
} from './state.js'
import { testi } from './statusBar.testi.js'

/** Il tono di una voce: decide il colore del puntino e nient'altro. */
type Tono = 'quiete' | 'informativo' | 'positivo' | 'attenzione' | 'negativo'

interface Voce {
  /** La chiave fra le voci dello stesso blocco: dice che cosa la voce racconta. */
  chiave: string
  /** Senza, la voce è solo testo: la versione quando non ha niente da dire. */
  simbolo?: NomeIcona
  testo: string
  /** Quel che si legge fermandosi sopra: la riga lunga che nella barra non ci sta. */
  titolo: string
  tono?: Tono
  /** Se c'è, la voce è un pulsante. Se non c'è, è una scritta. */
  al?: (evento: EventoMouse<HTMLButtonElement>) => void
  /** Il nome con cui ritrovarla dopo un ridisegno: serve a chi ci appende un menu. */
  fuoco?: string
  /** Se c'è, la voce è un interruttore: acceso o spento. */
  acceso?: boolean
}

function voce (v: Voce): ReactElement {
  const dentro = (
    <>
      {v.simbolo ? <Icona nome={v.simbolo} classe="icona--minuta" /> : null}
      <span className="barra-stato__testo">{v.testo}</span>
      {v.fuoco ? <Icona nome="giu" classe="icona--minuta barra-stato__freccia" /> : null}
    </>
  )
  const classe = classi('barra-stato__voce', v.tono && `barra-stato__voce--${v.tono}`)

  if (!v.al) return <span key={v.chiave} className={classe} title={v.titolo}>{dentro}</span>

  return (
    <button
      key={v.chiave}
      className={classi(classe, 'barra-stato__voce--premibile')}
      type="button"
      data-fuoco={v.fuoco}
      title={v.titolo}
      aria-pressed={v.acceso}
      // Il menu sopravvive al ridisegno: la voce dice se pende ancora da lei (`tendinaAperta`).
      aria-haspopup={v.fuoco ? 'menu' : undefined}
      aria-expanded={v.fuoco ? tendinaAperta(v.fuoco) : undefined}
      onClick={v.al}
    >
      {dentro}
    </button>
  )
}

// --------------------------------------------------------------- il registro

/** «oggi», o il giorno scritto: quel che si direbbe a voce. */
function quando (data: string): string {
  if (data === stato.adessoData) return testi().oggi
  return formattaData(data, 'settimana')
}

/** Il nome di fuoco della tendina delle ore da chiudere: vedi `tendinaAperta`. */
const FUOCO_DA_CHIUDERE = 'stato-da-chiudere'

/**
 * Due voci, perché sono due domande: «che cosa viene adesso» (la prossima ora
 * secondo l'orologio, sempre) e «che cosa ho lasciato indietro» (le ore passate
 * da chiudere, con la tendina per andarci). Prima stavano in una voce sola, e
 * un buco di settimana scorsa nascondeva l'ora di fra dieci minuti.
 */
function vociDelRegistro (): ReactElement[] {
  const t = testi()
  const voci: ReactElement[] = []

  const lezione = prossimaOra()
  if (lezione) {
    const inizio = lezione.slot[0]?.inizio ?? ''
    voci.push(voce({
      chiave: 'prossima',
      simbolo: 'lezione',
      testo: t.prossima(nomeClasseDiLezione(lezione), quando(lezione.data), inizio),
      titolo: t.prossimaTitolo(formattaData(lezione.data, 'lungo'), inizio),
      tono: 'quiete',
      al: () => apriLezione(lezione.id),
    }))
  } else {
    voci.push(voce({
      chiave: 'prossima',
      simbolo: 'lezione',
      testo: t.nessunaOra,
      titolo: t.nessunaOraTitolo,
      tono: 'quiete',
    }))
  }

  const daChiudere = oreDaChiudereBarra()
  if (daChiudere.length > 0) {
    voci.push(voce({
      chiave: 'da-chiudere',
      simbolo: 'avviso',
      testo: t.daChiudere(daChiudere.length),
      titolo: t.daChiudereTitolo,
      tono: 'attenzione',
      fuoco: FUOCO_DA_CHIUDERE,
      al: (evento) => {
        alternaMenuSotto(evento.currentTarget, [
          { titolo: t.daChiudereMenu },
          ...daChiudere.map((ora) => {
            const numero = numeroDellaLezione(stato.registro, ora)
            return {
              testo: t.oraDaChiudere(numero, formattaData(ora.data, 'settimana'), nomeCorso(ora.corsoId)),
              simbolo: 'avviso' as const,
              chiave: ora.id,
              al: () => apriLezione(ora.id),
            }
          }),
        ])
      },
    }))
  }

  return voci
}

// ------------------------------------------------------------- quel che resta

function vociDelLavoro (): ReactElement[] {
  const voci: ReactElement[] = []

  // Le stesse della pagina a cui porta il clic: vedi `pendenzeDellaBarraDiStato`.
  const nelRegistro = paginaAttiva()?.gruppo === 'registro'
  for (const conto of pendenzeDellaBarraDiStato(nelRegistro ? corsoDelContesto() : null)) {
    if (conto.aperti > 0) voci.push(voceDellePendenze(conto))
  }

  // La lettura delle scansioni, in un'isola sua: avanza a ogni pagina letta e
  // `main.tsx` rifà solo lei, non la pagina. `display: contents` perché la voce
  // resti un figlio della riga, come le altre.
  voci.push(<Isola key="lettura" chiave="barra-stato" disegna={voceDellaLettura} style={{ display: 'contents' }} />)

  return voci
}

// testo-fisso: identificatore interno della scheda corso di `views/todo.tsx`
const schedaDelCorso = (id: string) => `corso:${id}`
// testo-fisso: identificatore interno della scheda classe di `views/todo.tsx`
const schedaDellaClasse = (id: string) => `classe:${id}`

/**
 * Un numero di pendenze: del corso, del fascicolo di classe o quello della
 * barra laterale. Il clic apre le pendenze sulla scheda dello stesso conto.
 */
function voceDellePendenze (conto: PendenzeDellaVoce): ReactElement {
  const t = testi()
  const { corso, classe } = conto
  const ritardo = conto.urgenti > 0
    ? t.pendenzeInRitardo(conto.urgenti, conto.aperti)
    : t.pendenzeTitolo
  const di = corso
    ? t.pendenzeDelCorso(nomeCorso(corso.id))
    : classe ? t.pendenzeDellaClasse(classe.nome) : ''
  return voce({
    // testo-fisso: chiave della voce, non si legge
    chiave: corso ? schedaDelCorso(corso.id) : classe ? schedaDellaClasse(classe.id) : 'pendenze',
    simbolo: classe ? 'classi' : 'spunta',
    testo: classe ? t.pendenzeDiClasse(conto.aperti) : t.pendenze(conto.aperti),
    titolo: di + ritardo,
    tono: conto.urgenti > 0 ? 'attenzione' : 'quiete',
    al: () => {
      if (corso) {
        vai({ pagina: 'pagina.pendenze' }, {
          contesto: { corsoId: corso.id },
          altro: { schedaTodo: schedaDelCorso(corso.id) },
        })
      } else if (classe) {
        vai({ pagina: 'pagina.pendenze' }, { altro: { schedaTodo: schedaDellaClasse(classe.id) } })
      } else {
        vai({ pagina: 'pagina.pendenze' })
      }
    },
  })
}

/** «legge 3/12»: solo mentre la lettura delle scansioni lavora. */
function voceDellaLettura (): ReactNode {
  const lavoro = stato.lavoro
  if (lavoro.totale <= 0) return null
  const t = testi()
  return voce({
    chiave: 'lettura',
    simbolo: 'orologio',
    testo: t.legge(lavoro.fatte + 1, lavoro.totale),
    // `.etichetta`: `corrente` è un oggetto (smistamento, numero, etichetta).
    titolo: lavoro.corrente ? t.staLeggendo(lavoro.corrente.etichetta) : t.staLeggendoTutto,
    tono: 'quiete',
  })
}

// ------------------------------------------------------------- la connettività

/**
 * Da dove escono le comunicazioni: casella collegata o bozze `.eml` da aprire
 * a mano. Non è la stessa domanda di «c'è rete».
 */
function vociDellaPosta (): ReactElement[] {
  const posta = stato.posta
  const t = testi()

  if (!stato.rete) {
    return [
      voce({
        chiave: 'rete',
        simbolo: 'avviso',
        testo: t.senzaRete,
        titolo: t.senzaReteTitolo,
        tono: 'negativo',
      }),
    ]
  }

  if (posta.exchange) {
    return [
      voce({
        chiave: 'posta',
        simbolo: 'posta',
        testo: posta.invioDiretto ? t.spedisceDaSe : t.casellaCollegata,
        titolo:
          t.collegataA(posta.server, posta.mittente) +
          (posta.invioDiretto ? t.invioAcceso : t.invioSpento) +
          t.apriPosta,
        tono: 'positivo',
        al: () => { vai({ pagina: 'pagina.impostazioni' }) },
      }),
    ]
  }

  return [
    voce({
      chiave: 'posta',
      simbolo: 'posta',
      testo: t.bozzeEml,
      titolo: t.bozzeEmlTitolo,
      tono: 'quiete',
      al: () => { vai({ pagina: 'pagina.impostazioni' }) },
    }),
  ]
}

/**
 * La versione che gira, ultima a destra e sempre scritta. Premuta, controlla
 * se ce n'è una nuova; quando c'è (disponibile, in arrivo, pronta) prende
 * l'icona del tono e porta alla sezione. Le parole sono quelle del racconto
 * (`environment/updates.ts`).
 */
function vociDellaVersione (): ReactElement[] {
  const s = statoDegliAggiornamenti()
  if (!s) return []
  const t = testi()
  const scritta = t.numeroVersione(s.versione)

  // Senza notizia il clic controlla subito; mentre controlla, l'icona lo dice.
  if (!s.racconto.notizia) {
    const inCorso = s.fase === 'controllo'
    return [
      voce({
        chiave: 'versione',
        ...(inCorso ? { simbolo: 'ricarica' as const } : {}),
        testo: scritta,
        titolo: inCorso ? s.racconto.frase : t.versioneInUso(s.racconto.frase, s.versione),
        tono: inCorso ? 'informativo' : 'quiete',
        al: () => { void controllaDallaBarra() },
      }),
    ]
  }
  const { frase, tono } = s.racconto

  return [
    voce({
      chiave: 'versione',
      simbolo: 'ricarica',
      testo: scritta,
      titolo: t.versione(frase, s.versione),
      // Il tono è quello del racconto: una versione nuova non è un guasto.
      tono,
      al: () => { vai({ pagina: 'pagina.impostazioni', scheda: 'programma#aggiornamenti' }) },
    }),
  ]
}

// -------------------------------------------------------------- i modelli

/** Il nome di un file .gguf senza cartella né estensione: quel che se ne dice. */
function nomeDelModello (percorso: string): string {
  return (percorso.split(/[\\/]/).pop() ?? percorso).replace(/\.gguf$/i, '')
}

/**
 * Lo stato di un modello locale (assistente o lettura delle scansioni), da
 * leggere: non è un interruttore, si accende e si spegne nelle impostazioni.
 * Il clic porta sempre a «Assistente e modelli».
 *
 *   acceso         — verde.
 *   spento         — sbiadito.
 *   senza modello  — sbiadito, «non si accende» (`VoceProgramma.bloccata`, da
 *                    `richiede` nel manifesto). Con `soloConModello`
 *                    (l'assistente) la voce invece non c'è.
 *   non pronto     — acceso ma non può lavorare (programma o file che mancano,
 *                    `VoceProgramma.nonPronta`): arancione, il motivo nel titolo.
 */
function statoDelModello (opzioni: {
  simbolo: NomeIcona
  nome: string
  chiaveAttivo: string
  chiaveModello: string
  soloConModello?: boolean
}): ReactElement | null {
  const interruttore = stato.programma.find((v) => v.chiave === opzioni.chiaveAttivo)
  // Prima che arrivino le impostazioni, niente: uno «spento» non ancora vero no.
  if (!interruttore) return null

  const acceso = interruttore.valore === true
  const bloccata = interruttore.bloccata
  const file = stato.programma.find((v) => v.chiave === opzioni.chiaveModello)?.valore
  const modello = typeof file === 'string' && file.trim() !== '' ? nomeDelModello(file) : null
  if (opzioni.soloConModello && !modello) return null

  const t = testi()
  const nonPronta = acceso && bloccata === null ? interruttore.nonPronta : null
  const apri = () => { vai({ pagina: 'pagina.impostazioni', scheda: 'programma#modelli' }) }
  if (nonPronta) {
    return voce({
      chiave: opzioni.chiaveAttivo,
      simbolo: opzioni.simbolo,
      testo: t.voceNonPronta(opzioni.nome),
      titolo: t.nonPronto(opzioni.nome, nonPronta),
      tono: 'attenzione',
      al: apri,
    })
  }
  const titolo = bloccata !== null
    ? t.spentoBloccato(opzioni.nome, bloccata)
    : t.statoModello(opzioni.nome, acceso) + (modello ? t.modello(modello) : '') + t.apriModelli

  return voce({
    chiave: opzioni.chiaveAttivo,
    simbolo: opzioni.simbolo,
    // «Non si accende» e non «senza modello»: alla lettura può mancare solo il
    // proiettore; il perché lo dice il titolo.
    testo: t.voceModello(opzioni.nome, bloccata !== null, acceso),
    titolo,
    tono: acceso ? 'positivo' : 'quiete',
    al: apri,
  })
}

function vociDeiModelli (): Array<ReactElement | null> {
  const t = testi()
  return [
    statoDelModello({
      simbolo: 'bot',
      nome: t.assistente,
      chiaveAttivo: 'registroDocenti.assistente.attivo',
      chiaveModello: 'registroDocenti.assistente.modello',
      soloConModello: true,
    }),
    statoDelModello({
      simbolo: 'documento',
      nome: t.letturaScansioni,
      chiaveAttivo: 'registroDocenti.ocr.attivo',
      chiaveModello: 'registroDocenti.ocr.modello',
    }),
  ]
}

function vociDellAnno (): ReactElement[] {
  const anno = annoCorrente()
  if (!anno) return []
  return [
    voce({
      chiave: 'anno',
      simbolo: 'libro',
      // Solo l'anno: il periodo lo dice la tendina a sinistra.
      testo: anno.etichetta,
      // Il clic apre i registri preferiti e recenti; il tasto destro mette la stella.
      titolo: testi().annoTitolo(anno.etichetta),
      tono: 'quiete',
      fuoco: FUOCO_ANNO,
      al: (evento) => menuDeiRegistri(evento.currentTarget),
    }),
  ]
}

// ------------------------------------------------------------------- la barra

export function barraStato (): ReactElement {
  return (
    <footer
      className="barra-stato"
      role="contentinfo"
      aria-label={testi().statoDelRegistro}
      data-telaio="barra-stato"
    >
      {/* Blocchi separati da un filo, uno per domanda: che cosa mi tocca, che cosa
          è acceso, com'è messa la macchina, quale versione gira. Un blocco vuoto
          sparisce con il suo filo. */}
      <div className="barra-stato__gruppo">
        <div className="barra-stato__blocco">{vociDelRegistro()}{vociDelLavoro()}</div>
      </div>
      <div className="barra-stato__gruppo barra-stato__gruppo--coda">
        <div className="barra-stato__blocco">{vociDeiModelli()}</div>
        <div className="barra-stato__blocco">{vociDellaPosta()}{vociDellAnno()}</div>
        <div className="barra-stato__blocco barra-stato__blocco--versione">{vociDellaVersione()}</div>
      </div>
    </footer>
  )
}
