// Il PDF di classe che entra, e le pagine che ne escono.
// Un PDF trascinato nell'archivio documentale (o caricato con «Carica dei PDF»)
// diventa un foglio dell'archivio: si guarda nella cornice e le sue pagine si
// trascinano sulla casella giusta. Qui stanno i gesti sul file intero (entrare,
// leggere le scansioni, confermare in blocco), in testa alla cornice. La
// lettura delle scansioni è lenta e va in una coda visibile.

import {
  Fragment,
  type DragEvent as EventoTrascina,
  type ReactElement,
  type ReactNode,
} from 'react'

import { avanzamentoConsegna, consegneDocumento } from '#core/dominio/assignments.js'
import type { Classe, Consegna, Divisione, Smistamento } from '#core/dominio/models.js'
import { smistamentiDellaClasse } from '#core/dominio/sorting.js'
import { classi } from '#ui/classNames.js'
import { Pastiglia, Pulsante } from '#ui/components/base.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { Isola } from '#ui/island.js'
import { classiDiCuiSonoDocente, corsiDi, stato } from '#ui/state.js'

import { guardaNellArchivio } from './archive.js'
import { ISOLA_LETTURA } from './sorting/pageBrowser.js'
import { portaPagine, type GestoriBersaglio } from './sorting/pageDrop.js'
import { testi } from './sorting.testi.js'

const esegui = eseguiOAvvisa

/**
 * Le richieste di documenti ancora aperte (manca il foglio di qualcuno): quelle
 * a cui lo smistatore prova ad assegnare le pagine.
 */
function richiesteAperte (classe: Classe): Consegna[] {
  return consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => !avanzamentoConsegna(c, classe).completa,
  )
}

/**
 * Dove si guarda un PDF che entra: l'archivio documentale o la matrice delle
 * assenze. Il resto del giro (trascinare, depositare, aprire le pagine) è comune.
 */
export interface Vetrina {
  /** Il percorso aperto adesso in quella cornice: si legge a ogni disegno. */
  aperto: () => string | null
  /** Ci porta davanti un foglio, o chiude la cornice con `null`. */
  apri: (percorso: string | null) => void
}

/** La cornice dell'archivio documentale: la vetrina di sempre. */
const VETRINA_ARCHIVIO: Vetrina = {
  aperto: () => stato.anteprimaArchivio,
  apri: guardaNellArchivio,
}

/** I PDF di questa classe che aspettano ancora di essere divisi. */
export function pdfInAttesa (classe: Classe): Smistamento[] {
  return smistamentiDellaClasse(
    stato.registro.smistamenti,
    classe.id,
    richiesteAperte(classe).map((c) => c.id),
  )
}

/**
 * Quante pagine di questi PDF sono ancora attive (le archiviate escono dalle
 * letture): il numero sul pulsante e la misura della coda.
 */
function pagineAttive (smistamenti: Smistamento[]): number {
  return smistamenti.reduce((quante, smistamento) => quante + smistamento.letture.length, 0)
}

// ------------------------------------------------------- quel che si vede

/**
 * I PDF in attesa in una riga di pastiglie: nome, pagine rimaste, un clic per
 * aprirli. Senza PDF la riga non c'è.
 */
export function pdfDaDividere (classe: Classe, vetrina: Vetrina = VETRINA_ARCHIVIO): ReactNode {
  const suoi = pdfInAttesa(classe)
  if (suoi.length === 0) return null
  const t = testi()

  return (
    <div className="da-dividere">
      <span className="da-dividere__titolo">
        {suoi.length === 1 ? t.daDividere : t.daDividereN(suoi.length)}
      </span>
      {suoi.map((smistamento) => {
        const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
        return (
          <button
            key={smistamento.id}
            className={classi(
              'da-dividere__pdf',
              vetrina.aperto() === smistamento.file && 'da-dividere__pdf--aperto',
            )}
            type="button"
            title={t.guarda(smistamento.nome)}
            onClick={() => vetrina.apri(smistamento.file)}
          >
            <span className="da-dividere__nome">{smistamento.nome}</span>
            <span className="da-dividere__conto">{t.pagine(restano || smistamento.pagine)}</span>
          </button>
        )
      })}
      <span className="testo-quieto da-dividere__aiuto">{t.trascinaQui}</span>
    </div>
  )
}

/**
 * La tendina che manda un PDF a un'altra classe, o gliene dà una: una
 * scansione può attraversare due classi. Le pagine già collocate non si
 * muovono, e il titolo lo dice. `null` se non c'è un'altra classe.
 */
export function spostaInClasse (smistamento: Smistamento, invito: string): ReactNode {
  const altre = classiDiCuiSonoDocente().filter((classe) => classe.id !== smistamento.classeId)
  if (altre.length === 0) return null

  return (
    <select
      // La freccia è quella delle tendine del pannello; l'aspetto quieto è di `.sposta-classe`.
      className="sposta-classe campo__controllo--selezione"
      aria-label={`${invito} — «${smistamento.nome}»`}
      title={testi().spostaTitolo}
      defaultValue=""
      // Una tendina che torna sempre alla domanda: niente valore dallo stato da
      // portarci dentro, e il `change` di React su una `select` è quello del browser.
      onChange={(evento) => {
        const bersaglio = evento.currentTarget
        const scelto = bersaglio.value
        // La tendina torna alla domanda: se l'azione non passa, non mostra una classe sbagliata.
        bersaglio.value = ''
        if (!scelto) return
        // `void`: l'esito lo mostra `esegui`, la tendina non aspetta.
        void esegui({
          tipo: 'smistamento.attribuisci',
          smistamentoId: smistamento.id,
          classeId: scelto,
        })
      }}
    >
      <option value="">{invito}</option>
      {altre.map((classe) => <option key={classe.id} value={classe.id}>{classe.nome}</option>)}
    </select>
  )
}

/** I gesti sul PDF intero, in testa alla cornice: ognuno con la sua chiave, stanno in fila. */
export function comandiDelPdf (smistamento: Smistamento): ReactNode[] {
  const proposte = smistamento.blocchi.filter((b) => b.allievoId).length
  const daLeggere = smistamento.letture.filter((l) => l.lettura === 'niente').length
  const inCoda = stato.lavoro.coda.some((voce) => voce.smistamentoId === smistamento.id) ||
    stato.lavoro.corrente?.smistamentoId === smistamento.id
  const tutte = smistamento.letture.map((l) => l.numero)
  const t = testi()

  return [
    proposte > 0 && smistamento.consegnaId
      ? (
          <Pulsante
            key="conferma"
            testo={t.conferma(proposte)}
            simbolo="spunta"
            variante="primario"
            titolo={t.confermaTitolo}
            al={() => esegui({ tipo: 'smistamento.confermaTutto', smistamentoId: smistamento.id })}
          />
        )
      : null,
    !stato.ocrAttivo
      ? (
          <Pulsante
            key="lettura"
            testo={t.letturaSpenta}
            simbolo="impostazioni"
            variante="fantasma"
            titolo={t.letturaSpentaTitolo('registroDocenti.ocr.attivo')}
            al={() => esegui({ tipo: 'smistamento.impostazioni' })}
          />
        )
      : inCoda
        ? (
            <Pulsante
              key="lettura"
              testo={t.inLettura}
              simbolo="ricarica"
              variante="sottile"
              disabilitato
              titolo={t.inLetturaTitolo}
            />
          )
        : daLeggere > 0
          ? (
              <Pulsante
                key="lettura"
                testo={t.leggi(daLeggere)}
                simbolo="ricarica"
                variante="sottile"
                titolo={t.leggiTitolo}
                al={() => esegui({ tipo: 'smistamento.leggiTutto', smistamentoId: smistamento.id })}
              />
            )
          : null,
    // «Rileggi» sta accanto a «Leggi le scansioni»: leggere quel che manca e
    // rifare tutto con il modello di adesso sono due domande diverse.
    stato.ocrAttivo && !inCoda && tutte.length > 0
      ? (
          <Pulsante
            key="rileggi"
            testo={daLeggere > 0 ? t.rileggi : t.rileggiN(tutte.length)}
            simbolo="ricarica"
            variante="fantasma"
            titolo={t.rileggiTitolo(tutte.length)}
            al={() =>
              esegui({
                tipo: 'smistamento.leggiPagine',
                smistamentoId: smistamento.id,
                pagine: tutte,
              })}
          />
        )
      : null,
    // Con i gesti sul file intero; solo finché resta qualcosa da collocare.
    smistamento.blocchi.length > 0
      ? <Fragment key="sposta">{spostaInClasse(smistamento, t.spostaIn)}</Fragment>
      : null,
  ]
}

/**
 * «Rileggi le scansioni», comando della pagina: tutte le pagine da smistare di
 * tutti i PDF della classe, rimesse in coda. Serve quando la lettura
 * automatica cambia (accesa dopo, modello migliore). Chiede conferma perché
 * la coda può durare minuti.
 */
export async function rileggiScansioni (classe: Classe): Promise<void> {
  const suoi = pdfInAttesa(classe)
  const pagine = pagineAttive(suoi)
  const t = testi()
  if (pagine === 0) {
    notifica(t.nienteDaRileggere, 'avviso')
    return
  }

  const sicuro = await conferma({
    titolo: t.rileggereTitolo(pagine),
    testo: t.rileggereTesto(suoi.length, classe.nome),
    testoConferma: t.rileggi,
  })
  if (!sicuro) return

  await esegui(
    { tipo: 'smistamento.rileggiAttive', smistamentiId: suoi.map((s) => s.id) },
    t.inCodaFatto(pagine),
  )
}

/**
 * La coda di lettura fuori dalla cornice, da sola: l'isola che `main.tsx` rifà a
 * ogni pagina letta. Dentro la cornice di un PDF da dividere la coda è parte
 * dell'isola della cornice (`corniceFoglio`), e si usa `codaLettura`.
 * `display: contents`: vuota non lascia uno spazio nella colonna.
 */
export function codaLetturaInIsola (): ReactElement {
  return <Isola chiave={ISOLA_LETTURA} disegna={codaLettura} style={{ display: 'contents' }} />
}

/**
 * La coda di lettura: che cosa si sta leggendo e che cosa aspetta. Nessuna
 * percentuale sul singolo foglio (l'OCR non la dà): pagine fatte, rimaste, e
 * il modo di fermare tutto.
 */
export function codaLettura (): ReactNode {
  const { corrente, fatte, totale, coda } = stato.lavoro
  if (!corrente && coda.length === 0) return null
  const t = testi()

  return (
    <div className="lavoro-ocr">
      <div className="lavoro-ocr__testata">
        <span>{corrente ? t.stoLeggendo(corrente.etichetta) : t.inAvvio}</span>
        {totale > 0 ? <Pastiglia testo={t.fatteDi(fatte, totale)} tono="informativo" /> : null}
        {coda.length > 0 ? <Pastiglia testo={t.inCoda(coda.length)} tono="neutro" /> : null}
        <Pulsante
          testo={t.ferma}
          simbolo="chiudi"
          variante="fantasma"
          classe="lavoro-ocr__ferma"
          titolo={t.fermaTitolo}
          al={() => esegui({ tipo: 'smistamento.fermaLettura' })}
        />
      </div>
      <div className="barra-lavoro"><span /></div>
      {coda.length > 0
        ? (
            <ul className="lavoro-ocr__coda">
              {coda.slice(0, 6).map((voce, indice) => (
                // La coda è in ordine e si consuma dalla testa: la posizione e la voce insieme.
                <li key={`${indice}:${voce.etichetta}`} className="testo-quieto">{voce.etichetta}</li>
              ))}
              {coda.length > 6 ? <li className="testo-quieto">{t.altre(coda.length - 6)}</li> : null}
            </ul>
          )
        : null}
    </div>
  )
}

// --------------------------------------------------------- far entrare i PDF

/** I byte di un file trascinato, in base64: è così che passano il ponte. */
async function inBase64 (file: File): Promise<string> {
  const byte = new Uint8Array(await file.arrayBuffer())
  let testo = ''
  // A pezzi e non con lo spread: milioni di argomenti farebbero fallire
  // `String.fromCharCode`.
  const PASSO = 8192
  for (let i = 0; i < byte.length; i += PASSO) {
    testo += String.fromCharCode(...byte.subarray(i, i + PASSO))
  }
  return btoa(testo)
}

/**
 * Come si entra: senza domande. Dal pannello passa solo la classe: il documento
 * lo dice la casella su cui si lasciano le pagine, il taglio si vede dalle
 * proposte.
 */
const COME_ENTRA: Divisione = { modo: 'nomi' }

/** «Carica dei PDF», comando della pagina: l'alternativa al trascinamento. */
export async function caricaPdf (
  classe: Classe,
  vetrina: Vetrina = VETRINA_ARCHIVIO,
): Promise<void> {
  const primaDi = new Set(pdfInAttesa(classe).map((s) => s.id))
  const esito = await esegui({
    tipo: 'smistamento.carica',
    consegnaId: null,
    classeId: classe.id,
    divisione: COME_ENTRA,
  })
  if (esito.ok) apriIlNuovo(classe, primaDi, vetrina)
}

/**
 * La classe com'è adesso: il rilascio arriva dopo il disegno che ha dato i
 * gestori, e nel frattempo il registro può essere cambiato.
 */
function classeAdesso (classe: Classe): Classe {
  return stato.registro.classi.find((c) => c.id === classe.id) ?? classe
}

/** Quante entrate senza uscita ha contato ogni bersaglio (vedi `rendiBersaglio`). */
const entrate = new WeakMap<HTMLElement, number>()

/** La classe che dice «qui si può lasciare il PDF». */
const IN_ARRIVO = 'archivio--in-arrivo'

/**
 * Fa di un elemento un bersaglio per i PDF trascinati da fuori: i gestori da
 * spargere sull'elemento. `dragover` va fermato a ogni evento, o torna il
 * divieto; `dragleave` scatta anche sui figli, quindi si contano entrate e
 * uscite per non far lampeggiare la cornice. Le pagine prese dallo sfoglio qui
 * si ignorano: vanno alla matrice.
 */
export function rendiBersaglio (
  classe: Classe,
  vetrina: Vetrina = VETRINA_ARCHIVIO,
): GestoriBersaglio {
  // Il conto sta sull'elemento e non nella closure: un disegno a trascinamento in
  // corso dà gestori nuovi, e un conto nella closure ripartirebbe da zero.
  const vivo = (evento: EventoTrascina<HTMLElement>) => evento.currentTarget
  const acceso = (evento: EventoTrascina<HTMLElement>, attivo: boolean) =>
    vivo(evento).classList.toggle(IN_ARRIVO, attivo)

  return {
    onDragEnter: (evento) => {
      if (portaPagine(evento)) return
      evento.preventDefault()
      entrate.set(vivo(evento), (entrate.get(vivo(evento)) ?? 0) + 1)
      acceso(evento, true)
    },
    onDragOver: (evento) => {
      if (portaPagine(evento)) return
      evento.preventDefault()
      evento.stopPropagation()
      evento.dataTransfer.dropEffect = 'copy'
      acceso(evento, true)
    },
    onDragLeave: (evento) => {
      const dentro = Math.max(0, (entrate.get(vivo(evento)) ?? 0) - 1)
      entrate.set(vivo(evento), dentro)
      if (dentro === 0) acceso(evento, false)
    },
    onDrop: (evento) => {
      if (portaPagine(evento)) return
      evento.preventDefault()
      evento.stopPropagation()
      entrate.set(vivo(evento), 0)
      acceso(evento, false)
      const file = [...evento.dataTransfer.files]
      if (file.length === 0) {
        notifica(testi().nessunFile, 'avviso')
        return
      }
      void deposita(file, classeAdesso(classe), vetrina)
    },
  }
}

/**
 * Uno per uno: si legge il file e si manda all'host; il primo che entra si
 * apre da sé.
 */
async function deposita (file: File[], classe: Classe, vetrina: Vetrina): Promise<void> {
  const primaDi = new Set(pdfInAttesa(classe).map((s) => s.id))

  for (const uno of file) {
    if (!uno.name.toLowerCase().endsWith('.pdf')) {
      notifica(testi().nonPdf(uno.name), 'avviso')
      continue
    }
    notifica(testi().leggendoFile(uno.name), 'info')
    await esegui({
      tipo: 'smistamento.deposita',
      consegnaId: null,
      classeId: classe.id,
      nome: uno.name,
      contenuto: await inBase64(uno),
      divisione: COME_ENTRA,
    })
  }

  apriIlNuovo(classe, primaDi, vetrina)
}

/** Apre le pagine del PDF appena entrato: chi lo porta dentro vuole dividerlo. */
function apriIlNuovo (classe: Classe, primaDi: Set<string>, vetrina: Vetrina): void {
  const nuovo = pdfInAttesa(classe).find((s) => !primaDi.has(s.id))
  if (nuovo) vetrina.apri(nuovo.file)
}
