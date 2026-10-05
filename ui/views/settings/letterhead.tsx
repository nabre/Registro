// Le carte intestate del documento: le scuole, i loghi, chi firma, e quale
// corso stampa su quale carta. Stanno nel `.regi` con le altre impostazioni.
// Più carte per chi insegna in più sedi; ogni corso sta su una carta sola (lo
// garantisce `completaCarte` in `domain/letterhead.ts`, riapplicato dall'host);
// qui si sposta con `spostaCorsi` e `togliCarta`. La predefinita è la prima:
// «Rendi predefinita» la porta in cima. Chi firma è uno solo. La firma delle
// e-mail si scrive in Utente › Posta (`mail.tsx`).
// I campi si salvano all'uscita mandando la matrice intera, e dicono l'esito
// accanto a sé (`CampoAnno`); il logo ha azioni sue. Le regole senza DOM stanno
// in `letterheadCourses.ts`, dove si provano.

import {
  useSyncExternalStore,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

import type { Esito } from '#core/controlli/control.js'
import { MODI_PDF } from '#core/dominio/automation.js'
import { cartaVuota, spostaCorsi, togliCarta } from '#core/dominio/letterhead.js'
import { ALTEZZA_LOGO, type CartaIntestata, type QuandoRifarePdf } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Pulsante, Scheda } from '#ui/components/base.js'
import { CampoAnno, GruppoAnno, SezioneAnno, VoceAnno } from '#ui/components/yearSetting.js'
import { menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione, invia } from '#ui/bridge.js'
import { corsiDellAnnoAperto, ridisegna, stato, uriDato } from '#ui/state.js'
import { salvaConEsito } from './document.js'
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
import { parole } from '#core/dominio/words.testi.js'
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

/**
 * Sopra quale carta sta il trascinamento, e quante entrate vi ha contato:
 * `dragleave` scatta anche sulle pastiglie figlie.
 */
let sopra: { carta: string, dentro: number } | null = null

// La selezione e il trascinamento cambiano solo le carte: chi li cambia
// avvisa, e le carte si ridisegnano da sole, senza la pagina.
const ascoltatori = new Set<() => void>()
let giro = 0

function avvisa (): void {
  giro += 1
  for (const ascoltatore of ascoltatori) ascoltatore()
}

function iscriviGesti (ascoltatore: () => void): () => void {
  ascoltatori.add(ascoltatore)
  return () => { ascoltatori.delete(ascoltatore) }
}

/** Ridisegna chi la chiama quando cambiano la selezione o il trascinamento. */
function useGesti (): void {
  useSyncExternalStore(iscriviGesti, () => giro)
}

/** Le carte di adesso, non quelle del disegno: due gesti di fila partono prima del ridisegno. */
function carteVive (): CartaIntestata[] {
  return stato.registro.impostazioni.intestazione.carte
}

/** Come si chiama una carta a schermo: la sua scuola, o il suo posto. */
function nomeCarta (carta: CartaIntestata, indice: number): string {
  return carta.sede.trim() || testi().cartaN(indice + 1)
}

/** Chi firma, per intero, dalle sue parti: è quel che finisce sui fogli. */
function docenteDa (appellativo: string, nome: string, cognome: string): string {
  return [appellativo, nome, cognome].map((parte) => parte.trim()).filter(Boolean).join(' ')
}

/**
 * Salva l'intestazione completa (carte, docente strutturato e firma per le
 * stampe). Il nome intero (`docente`) si rifà dalle parti quando se ne cambia
 * una: le due fonti non si separano. L'esito lo dice il campo che ha salvato:
 * `invia` e non `azione`, perché il rifiuto si legga lì.
 */
async function salvaIntestazione (modifiche: {
  carte?: CartaIntestata[]
  docenteAppellativo?: string
  docenteNome?: string
  docenteCognome?: string
}): Promise<Esito> {
  const attuale = stato.registro.impostazioni.intestazione
  const carte = modifiche.carte ?? attuale.carte
  const appellativo = modifiche.docenteAppellativo !== undefined
    ? modifiche.docenteAppellativo.trim()
    : (attuale.docenteAppellativo ?? '')
  const nome = modifiche.docenteNome !== undefined
    ? modifiche.docenteNome.trim()
    : (attuale.docenteNome ?? '')
  const cognome = modifiche.docenteCognome !== undefined
    ? modifiche.docenteCognome.trim()
    : (attuale.docenteCognome ?? '')

  let docente = attuale.docente
  const toccoAnagrafica = modifiche.docenteAppellativo !== undefined ||
    modifiche.docenteNome !== undefined ||
    modifiche.docenteCognome !== undefined
  if (toccoAnagrafica) docente = docenteDa(appellativo, nome, cognome)

  const { intestazione: _intestazione, ...resto } = stato.registro.impostazioni
  const intestazione = {
    carte: carte.map(({ id, sede, altezzaLogo, corsi }) => ({
      id, sede, altezzaLogo, corsi: [...corsi],
    })),
    docente,
    ...(appellativo ? { docenteAppellativo: appellativo } : {}),
    ...(nome ? { docenteNome: nome } : {}),
    ...(cognome ? { docenteCognome: cognome } : {}),
    ...(attuale.firma && attuale.firma.trim() !== '' ? { firma: attuale.firma } : {}),
  }

  const risposta = await invia({ tipo: 'impostazioni.salva', impostazioni: { ...resto, intestazione } })
  if (risposta.ok) return null
  return risposta.errori?.join(' ') || testi().nonSalvata
}

/** Salva la matrice intera: l'host la completa e tiene i loghi per id. */
function salvaCarte (carte: CartaIntestata[]): Promise<Esito> {
  return salvaIntestazione({ carte })
}

/** Come `salvaCarte`, per un gesto che non ha un campo accanto: il rifiuto va in una notifica. */
async function salvaCarteDaGesto (carte: CartaIntestata[]): Promise<void> {
  const esito = await salvaCarte(carte)
  if (esito) notifica(esito, 'errore')
}

/**
 * Cambia un campo di una carta, lasciando le altre com'erano. Se l'host lo
 * raddrizza (un'altezza fuori dai limiti) lo si dice accanto al campo.
 */
async function cambiaCarta (
  cartaId: string,
  modifica: Partial<Pick<CartaIntestata, 'sede' | 'altezzaLogo'>>,
): Promise<Esito> {
  const carte = carteVive().map((carta) =>
    carta.id === cartaId ? { ...carta, ...modifica } : carta)
  const esito = await salvaCarte(carte)
  if (esito !== null || modifica.altezzaLogo === undefined) return esito
  const salvata = carteVive().find((carta) => carta.id === cartaId)?.altezzaLogo
  return salvata === undefined || salvata === modifica.altezzaLogo
    ? null
    : testi().altezzaPortata(salvata)
}

/**
 * La carta che diventa la predefinita: va in cima, dove l'host cerca quella dei
 * corsi nuovi. I corsi restano sulle carte dove sono.
 */
function rendiPredefinita (cartaId: string): void {
  const carte = carteVive()
  const scelta = carte.find((carta) => carta.id === cartaId)
  if (!scelta || carte[0]?.id === cartaId) return
  void salvaCarteDaGesto([scelta, ...carte.filter((carta) => carta.id !== cartaId)])
}

/** Sposta dei corsi su una carta e salva; se sono già tutti lì non parte niente. */
function sposta (ids: readonly string[], cartaId: string): void {
  const carte = carteVive()
  const meta = carte.find((carta) => carta.id === cartaId)
  if (!meta || ids.length === 0 || ids.every((id) => meta.corsi.includes(id))) return
  selezione = { scelti: new Set(), ancora: null }
  avvisa()
  void salvaCarteDaGesto(spostaCorsi(carte, ids, cartaId))
}

// ------------------------------------------------------------- la selezione

/** Cambia le pastiglie scelte: si ridisegnano le carte, non la pagina. */
function scegli (nuova: Selezione): void {
  selezione = nuova
  avvisa()
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
  if (partono.length === 0) return
  inViaggio = { ids: partono, da }
  evento.dataTransfer.effectAllowed = 'move'
  evento.dataTransfer.setData(TIPO_CORSI, codificaCorsi(partono))
  // Anche in chiaro: il fantasma si disegna meglio, e in un campo di testo
  // cadono nomi e non id.
  evento.dataTransfer.setData('text/plain', testi().corsi(partono.length))
  avvisa()
}

/** Finito il trascinamento, andato a segno o no: si spegne tutto. */
function finisce (): void {
  if (inViaggio === null && sopra === null) return
  inViaggio = null
  sopra = null
  avvisa()
}

/**
 * La zona dei corsi di una carta come bersaglio, solo per i corsi di questa
 * sezione e non per la carta di partenza. Si contano entrate e uscite perché
 * `dragleave` scatta anche sulle pastiglie figlie.
 */
function gestiBersaglio (cartaId: string): Pick<
  HTMLAttributes<HTMLDivElement>,
  'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'
> {
  const valido = (evento: DragEvent): boolean =>
    inViaggio !== null && inViaggio.da !== cartaId &&
    evento.dataTransfer.types.includes(TIPO_CORSI)
  const accendi = (): void => {
    if (sopra?.carta === cartaId) return
    sopra = { carta: cartaId, dentro: 1 }
    avvisa()
  }
  return {
    onDragEnter: (evento) => {
      if (!valido(evento)) return
      evento.preventDefault()
      if (sopra?.carta === cartaId) sopra.dentro += 1
      else accendi()
    },
    onDragOver: (evento) => {
      if (!valido(evento)) return
      evento.preventDefault()
      evento.dataTransfer.dropEffect = 'move'
      accendi()
    },
    onDragLeave: () => {
      if (sopra?.carta !== cartaId) return
      sopra.dentro = Math.max(0, sopra.dentro - 1)
      if (sopra.dentro > 0) return
      sopra = null
      avvisa()
    },
    onDrop: (evento) => {
      if (!valido(evento)) return
      evento.preventDefault()
      const ids = decodificaCorsi(evento.dataTransfer.getData(TIPO_CORSI))
      finisce()
      sposta(ids, cartaId)
    },
  }
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
function tastoSposta (ids: string[], da: string, di: string): ReactNode {
  if (carteVive().length < 2) return null
  return (
    <Pulsante
      simbolo="giu"
      variante="fantasma"
      classe="corso-carta__sposta"
      titolo={testi().spostaDi(di)}
      al={(evento) => menuSposta(evento.currentTarget, ids, da)}
    />
  )
}

/** Una pastiglia: il corso, che si sceglie col clic e si trascina. */
function pastigliaCorso (
  corso: GruppoDiClasse['corsi'][number],
  cartaId: string,
  ordine: string[],
): ReactElement {
  const scelto = selezione.scelti.has(corso.id)
  const viaggia = inViaggio?.ids.includes(corso.id) ?? false
  return (
    <li
      key={corso.id}
      className={classi('corso-carta', scelto && 'corso-carta--scelto', viaggia && 'corso-carta--in-viaggio')}
    >
      <button
        className="corso-carta__nome"
        type="button"
        draggable
        data-corso={corso.id}
        title={testi().corsoAiuto(corso.nome)}
        aria-label={corso.nome}
        aria-pressed={scelto}
        onClick={(evento) => scegli(selezionaCon(selezione, corso.id, modoDelClic(evento), ordine))}
        onKeyDown={(evento) => {
          if (evento.key !== 'Escape' || selezione.scelti.size === 0) return
          evento.stopPropagation()
          scegli({ scelti: new Set(), ancora: null })
        }}
        onDragStart={(evento) => comincia(evento, [corso.id], cartaId)}
        onDragEnd={() => finisce()}
      >
        {corso.etichetta}
      </button>
      {tastoSposta([corso.id], cartaId, testi().virgolettato(corso.nome))}
    </li>
  )
}

/** Una classe dentro una carta: il suo nome si trascina e porta tutti i suoi corsi di qui. */
function gruppoClasse (gruppo: GruppoDiClasse, cartaId: string, ordine: string[]): ReactElement {
  const ids = gruppo.corsi.map((corso) => corso.id)
  return (
    <div key={gruppo.classeId} className="carta-classe" role="group" aria-label={gruppo.nome}>
      <div className="carta-classe__testata">
        <button
          className="carta-classe__nome"
          type="button"
          draggable
          title={testi().classeAiuto(gruppo.nome)}
          onClick={(evento) => {
            const modo = modoDelClic(evento)
            const base: Selezione = modo === 'solo' ? { scelti: new Set(), ancora: null } : selezione
            scegli({ scelti: new Set([...base.scelti, ...ids]), ancora: ids.at(-1) ?? null })
          }}
          onDragStart={(evento) => comincia(evento, ids, cartaId)}
          onDragEnd={() => finisce()}
        >
          {gruppo.nome}
          <span className="carta-classe__conto">{String(ids.length)}</span>
        </button>
        {tastoSposta(ids, cartaId, testi().corsiDi(gruppo.nome))}
      </div>
      <ul className="carta-classe__corsi">{gruppo.corsi.map((corso) => pastigliaCorso(corso, cartaId, ordine))}</ul>
    </div>
  )
}

/** La zona dei corsi di una carta: dove si lascia cadere. */
function zonaCorsi (
  carta: CartaIntestata,
  indice: number,
  visibili: ReadonlySet<string>,
): ReactElement {
  const { gruppi, altri } = gruppiDellaCarta(carta.corsi, stato.registro, visibili)
  const ordine = ordineAVista(gruppi)
  const t = testi()
  const pronta = inViaggio !== null && inViaggio.da !== carta.id
  return (
    <div
      className={classi(
        'carta-intestata__corsi',
        pronta && 'carta-intestata__corsi--pronta',
        pronta && sopra?.carta === carta.id && 'carta-intestata__corsi--sopra',
      )}
      data-carta={carta.id}
      role="group"
      aria-label={t.corsiSu(nomeCarta(carta, indice))}
      {...gestiBersaglio(carta.id)}
    >
      {gruppi.length === 0
        ? <p className="carta-intestata__vuota">{indice === 0 ? t.vuotaPrima : t.vuotaAltra}</p>
        : gruppi.map((gruppo) => gruppoClasse(gruppo, carta.id, ordine))}
      {altri > 0 ? <small className="carta-intestata__altri">{t.altriAnni(altri)}</small> : null}
    </div>
  )
}

// ------------------------------------------------------------------- il logo

/** Il dialogo del sistema per il logo di una carta: il file scelto entra nel documento. */
async function scegliLogo (cartaId: string): Promise<void> {
  const risposta = await azione({ tipo: 'intestazione.logo', cartaId })
  if (!risposta.ok) return
  versioniLogo.set(cartaId, (versioniLogo.get(cartaId) ?? 0) + 1)
  ridisegna()
}

/**
 * Toglie il logo di una carta: i suoi fogli escono con la sola scritta in cima.
 * Chiede prima, perché il file se ne va dal documento e non si rimette con un
 * «Annulla»: va ricaricato dal disco.
 */
async function togliLogo (cartaId: string, nome: string): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.togliereLogo(nome),
    testo: t.togliereLogoTesto,
    testoConferma: parole().togli,
  })
  if (!sicuro) return
  const risposta = await azione({ tipo: 'intestazione.togliLogo', cartaId })
  if (risposta.ok) ridisegna()
}

/** Il logo com'è adesso, con i gesti per cambiarlo accanto. */
function riquadroLogo (carta: CartaIntestata, nome: string): ReactElement {
  const indirizzo = uriDato(carta.logo)
  const versione = versioniLogo.get(carta.id) ?? 0
  const sorgente = versione > 0 ? `${indirizzo}?v=${versione}` : indirizzo
  const t = testi()
  return (
    <div className="campo campo--piena">
      <span className="campo__etichetta">{t.logo}</span>
      <div className="intestazione__logo">
        {carta.logo && indirizzo
          ? (
              // Con la sorgente per chiave: tenuta fra un disegno e l'altro finché il
              // file è lo stesso, perché una miniatura ricreata lampeggia a ogni gesto.
              <img key={sorgente ?? ''} className="intestazione__miniatura" src={sorgente ?? undefined} alt={t.logoAlt} />
            )
          : null}
        {carta.logo
          ? (
              <>
                <Pulsante
                  testo={t.sostituisci}
                  simbolo="immagine"
                  variante="sottile"
                  titolo={t.sostituisciAiuto}
                  al={() => scegliLogo(carta.id)}
                />
                <Pulsante
                  testo={parole().togli}
                  simbolo="cestino"
                  variante="fantasma"
                  titolo={t.togliLogoAiuto}
                  al={() => togliLogo(carta.id, nome)}
                />
              </>
            )
          : (
              <Pulsante
                testo={t.caricaLogo}
                simbolo="immagine"
                variante="sottile"
                titolo={t.caricaLogoAiuto}
                al={() => scegliLogo(carta.id)}
              />
            )}
      </div>
    </div>
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
  await salvaCarteDaGesto(togliCarta(carteVive(), cartaId))
}

/** Una carta intestata: la scuola, il logo, e i corsi che la usano. */
function schedaCarta (
  carta: CartaIntestata,
  indice: number,
  quante: number,
  visibili: ReadonlySet<string>,
): ReactElement {
  const nome = nomeCarta(carta, indice)
  const t = testi()
  return (
    <article
      key={carta.id}
      className={classi('carta-intestata', indice === 0 && 'carta-intestata--prima')}
      aria-label={nome}
    >
      <header className="carta-intestata__testata">
        <h4 className="carta-intestata__titolo">{nome}</h4>
        {indice === 0
          ? <span className="carta-intestata__predefinita" title={t.predefinitaAiuto}>{t.predefinita}</span>
          : (
              <Pulsante
                testo={t.rendiPredefinita}
                simbolo="spunta"
                variante="sottile"
                classe="carta-intestata__rendi"
                titolo={t.rendiPredefinitaAiuto}
                al={() => rendiPredefinita(carta.id)}
              />
            )}
        {quante > 1
          ? (
              <Pulsante
                simbolo="cestino"
                variante="fantasma"
                classe="carta-intestata__elimina"
                titolo={t.eliminaCartaAiuto(nome)}
                al={() => eliminaCarta(carta.id)}
              />
            )
          : null}
      </header>
      <div className="voci-opzioni">
        <VoceAnno
          nome={t.nomeScuola}
          aiuto={t.nomeScuolaAiuto}
          controllo={(
            <CampoAnno
              spec={() => ({
                tipo: 'testo',
                // testo-fisso: il nome del campo, non si legge
                chiave: `intestazioneSede-${carta.id}`,
                nome: t.nomeScuola,
                valore: carteVive().find((viva) => viva.id === carta.id)?.sede ?? carta.sede,
              })}
              quandoCambia={(valore) => cambiaCarta(carta.id, { sede: String(valore).trim() })}
            />
          )}
        />
        {riquadroLogo(carta, nome)}
        {/* Un cursore: i limiti si vedono, e un valore fuori non si può battere. */}
        <VoceAnno
          nome={t.altezzaLogo}
          aiuto={t.altezzaLogoAiuto(ALTEZZA_LOGO.minimo, ALTEZZA_LOGO.massimo, ALTEZZA_LOGO.predefinita)}
          controllo={(
            <CampoAnno
              spec={() => ({
                tipo: 'cursore',
                // testo-fisso: il nome del campo, non si legge
                chiave: `intestazioneAltezzaLogo-${carta.id}`,
                nome: t.altezzaLogo,
                valore: carteVive().find((viva) => viva.id === carta.id)?.altezzaLogo ?? carta.altezzaLogo,
                minimo: ALTEZZA_LOGO.minimo,
                massimo: ALTEZZA_LOGO.massimo,
                unita: t.mm,
              })}
              quandoCambia={(valore) => cambiaCarta(carta.id, { altezzaLogo: Number(valore) })}
            />
          )}
        />
      </div>
      <span className="campo__etichetta">{t.corsiSuQuesta}</span>
      {zonaCorsi(carta, indice, visibili)}
    </article>
  )
}

/**
 * Chi firma i fogli: appellativo, nome e cognome, e sotto come si legge per
 * intero. Il nome intero lo calcola il registro dalle parti; la firma delle
 * e-mail di serie lo usa, quella scritta a mano no. Impostazioni › Utente › Chi sei.
 */
export function schedaChiFirma (): ReactElement {
  const intestazione = stato.registro.impostazioni.intestazione
  const t = testi()
  const vive = () => stato.registro.impostazioni.intestazione

  const parte = (
    chiave: 'docenteAppellativo' | 'docenteNome' | 'docenteCognome',
    nome: string,
    aiuto: string,
    proposte?: readonly string[],
  ): ReactElement => (
    <VoceAnno
      nome={nome}
      aiuto={aiuto}
      // testo-fisso: il nome del campo e l'ancora, non si leggono
      voce={`intestazione.${chiave}`}
      controllo={(
        <CampoAnno
          spec={() => ({
            tipo: 'testo',
            // testo-fisso: il nome del campo, non si legge
            chiave: `intestazione.${chiave}`,
            nome,
            valore: vive()[chiave] ?? '',
            // L'appellativo si sceglie fra quelli d'uso, o se ne scrive un altro.
            scelte: proposte?.map((proposta) => ({ valore: proposta, nome: proposta })),
          })}
          quandoCambia={(valore) => salvaIntestazione({ [chiave]: String(valore) })}
        />
      )}
    />
  )

  const intero = docenteDa(
    intestazione.docenteAppellativo ?? '',
    intestazione.docenteNome ?? '',
    intestazione.docenteCognome ?? '',
  ) || intestazione.docente

  return (
    <Scheda titolo={t.chiFirma} aiuto={t.chiFirmaAiuto} classe="scheda--opzioni">
      <SezioneAnno
        // Come esce sui fogli, in vista: è quel che si sta decidendo.
        stato={(
          <p className="voce-opzione__aiuto impostazioni-anno__stato" aria-live="polite">
            {intero ? t.siLegge(intero) : t.nessunNome}
          </p>
        )}
        scelte={(
          <GruppoAnno titolo={null}>
            {parte('docenteAppellativo', t.docenteAppellativo, t.docenteAppellativoAiuto, t.appellativi)}
            {parte('docenteNome', parole().nome, t.docenteNomeAiuto)}
            {parte('docenteCognome', parole().cognome, t.docenteCognomeAiuto)}
          </GruppoAnno>
        )}
      />
    </Scheda>
  )
}

/** Quando il registro rifà da sé i PDF di un corso: prima solo da `Ctrl+K`. */
function quandoRifarePdf (): ReactElement {
  const t = testi()
  return (
    <VoceAnno
      nome={t.pdfAutomatici}
      aiuto={t.pdfAutomaticiAiuto}
      voce="pdfAutomatici"
      controllo={(
        <CampoAnno
          spec={() => ({
            tipo: 'segmenti',
            chiave: 'pdfAutomatici',
            nome: t.pdfAutomatici,
            valore: stato.registro.impostazioni.pdfAutomatici,
            // La frase di ogni modo detta da sola: quella di `MODI_PDF` rimanda alla pagina Documenti.
            scelte: MODI_PDF.map((modo) => ({ valore: modo.valore, nome: modo.nome, aiuto: t.modiPdf[modo.valore] })),
          })}
          quandoCambia={(valore) => salvaConEsito({ pdfAutomatici: valore as QuandoRifarePdf })}
        />
      )}
    />
  )
}

/**
 * Le carte intestate, con i corsi che le usano, e quando si rifanno i PDF:
 * Impostazioni › Utente › Carta e stampa.
 */
export function schedaCarte (): ReactElement {
  return <SchedaCarte />
}

function SchedaCarte (): ReactElement {
  useGesti()
  const carte = stato.registro.impostazioni.intestazione.carte
  const visibili = new Set(corsiDellAnnoAperto().map((corso) => corso.id))
  const t = testi()

  return (
    <Scheda
      titolo={t.carte}
      aiuto={t.carteAiuto}
      azioni={(
        <Pulsante
          testo={t.nuovaCarta}
          simbolo="piu"
          variante="sottile"
          titolo={t.nuovaCartaAiuto}
          al={() => salvaCarteDaGesto([...carteVive(), cartaVuota()])}
        />
      )}
    >
      <SezioneAnno
        stato={(
          <div className="carte-intestate">
            {carte.map((carta, indice) => schedaCarta(carta, indice, carte.length, visibili))}
          </div>
        )}
        scelte={<GruppoAnno titolo={t.stampa}>{quandoRifarePdf()}</GruppoAnno>}
      />
    </Scheda>
  )
}
