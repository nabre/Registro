// Lo schermo che guarda la classe: un'applicazione a sé che riceve un pacchetto
// già filtrato (i blocchi accesi dal docente) e lo disegna grande. Non manda
// niente indietro e non ha comandi; il codice del registro non entra. Il
// disegno è di React (ADR-56), con una radice sua come quella del pannello.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
import './styles/projection.css'

import { useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { GraficoNote } from '#ui/components/notes.js'
import { Quieto } from '#ui/components/base.js'
import { classi } from '#ui/classNames.js'
import type {
  AnnoProiettato,
  AppelloProiettato,
  CalendarioProiettato,
  ConsegnaProiettata,
  ContenutoProiezione,
  DocumentoProiettato,
  GiornoAnno,
  GiornoProiettato,
  MeseProiettato,
  OraProiettata,
  RisorsaProiettata,
  SettimanaProiettata,
  TappaProiettata,
  ValutazioneProiettata,
  VoceCalendario,
} from '#core/dominio/projection.js'
import type { MessaggioProiezione } from '#contract/protocol.js'
import { adesso, formattaData, oggi } from '#core/dominio/dates.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './projection.testi.js'

declare function acquireVsCodeApi (): { postMessage (messaggio: unknown): void }

// Si acquisisce comunque: la chiamata accende l'ascolto dei messaggi nel
// preload. Per mandare non serve.
acquireVsCodeApi()

const radice = document.getElementById('radice')
const radiceReact = radice ? createRoot(radice) : null

let contenuto: ContenutoProiezione | null = null
let radiceDati: string | null = null
let versione = ''

/**
 * Il logo, dalla radice dell'applicazione (`registro:` è nella CSP). Non
 * `components/logo.tsx`: legge lo stato del pannello, che qui non entra.
 */
const LOGO = 'registro://app/resources/registro-app.svg'

/** L'indirizzo di un file della cartella dei dati: ogni pezzo va codificato. */
function uriDato (relativo: string | undefined): string | null {
  if (!relativo || !radiceDati) return null
  const pezzi = relativo.split('/').filter(Boolean).map(encodeURIComponent)
  return pezzi.length > 0 ? `${radiceDati}/${pezzi.join('/')}` : null
}

// ------------------------------------------------------------------ pezzi

/**
 * Il blocco aperto è la scatola che scorre: fra due messaggi sulla stessa
 * scheda della stessa ora resta lo stesso nodo, e una scaletta lunga non torna
 * in cima a ogni presenza segnata. Cambiando scheda o ora cambia `scorrimento`,
 * che è anche la chiave: il nodo è nuovo e si riparte dall'alto.
 */
function sezione (scorrimento: string, titolo: string, figli: ReactNode): ReactElement {
  return sezioneCon(scorrimento, null, titolo, figli)
}

/**
 * Una scheda con una classe sua: il calendario deve prendersi tutta l'altezza,
 * e il riquadro deve saperlo.
 */
function sezioneCon (scorrimento: string, classe: string | null, titolo: string, figli: ReactNode): ReactElement {
  return (
    <section key={scorrimento} className={classi('blocco', classe)} data-telaio="blocco" data-scorrimento={scorrimento}>
      <h2 className="blocco__titolo">{titolo}</h2>
      <div className="blocco__corpo" data-telaio="corpo">{figli}</div>
    </section>
  )
}

/**
 * La testata: una riga sola e piccola, per chi entra a metà ora. Lo spazio è
 * del contenuto.
 */
function intestazione (dati: ContenutoProiezione['intestazione']): ReactElement {
  const quando = [dati.data, dati.orario, dati.aula ? testi().aula(dati.aula) : null]
    .filter(Boolean)
  return (
    <header className="testata">
      <div className="testata__chi">
        {dati.classe ? <span className="testata__classe">{dati.classe}</span> : null}
        {dati.materia ? <span className="testata__materia">{dati.materia}</span> : null}
        {/* Il titolo del piano di seguito, non sopra: in una riga sola si taglia. */}
        {dati.titolo ? <span className="testata__titolo">{dati.titolo}</span> : null}
      </div>
      {quando.length > 0 ? <div className="testata__quando">{quando.join(' · ')}</div> : null}
    </header>
  )
}

function risorsa (voce: RisorsaProiettata): ReactElement | null {
  if (voce.tipo === 'immagine') {
    const src = uriDato(voce.file)
    if (!src) return null
    return (
      <figure key={voce.id} className="figura">
        {/* La chiave è il file: fra un messaggio e l'altro l'immagine resta, e non lampeggia. */}
        <img key={src} className="figura__immagine" src={src} alt={voce.titolo} />
        <figcaption className="figura__nome">{voce.titolo}</figcaption>
      </figure>
    )
  }
  // Un collegamento resta scritto per esteso: la classe lo copia dallo schermo.
  return (
    <div key={voce.id} className="risorsa">
      <span className="risorsa__nome">{voce.titolo}</span>
      {voce.tipo === 'collegamento' && voce.url ? <span className="risorsa__indirizzo">{voce.url}</span> : null}
    </div>
  )
}

function tappa (voce: TappaProiettata, numero: number): ReactElement {
  return (
    <li
      key={voce.id}
      // testo-fisso: classe CSS
      className={classi('tappa', `tappa--${voce.stato}`)}
      // La tinta arriva già scelta: il foglio di stile la legge da `--tinta`.
      style={{ '--tinta': voce.colore } as CSSProperties}
    >
      <div className="tappa__riga">
        <span className="tappa__numero">{String(numero)}</span>
        <span className="tappa__titolo">{voce.titolo}</span>
        {voce.valutata ? <span className="segno segno--prova">{testi().prova}</span> : null}
        <span className="tappa__durata">{voce.durata}</span>
      </div>
      <div className="tappa__sotto">
        <span className="tappa__tipo">{voce.nomeTipo}</span>
        {voce.materiali ? <span className="tappa__materiali">{voce.materiali}</span> : null}
      </div>
      {voce.descrizione ? <p className="tappa__descrizione">{voce.descrizione}</p> : null}
      {voce.risorse.length > 0 ? <div className="tappa__risorse">{voce.risorse.map(risorsa)}</div> : null}
    </li>
  )
}

function scaletta (scorrimento: string, tappe: TappaProiettata[]): ReactElement | null {
  if (tappe.length === 0) return null
  return sezione(
    scorrimento,
    testi().cheCosaFacciamo,
    <ol className="scaletta">{tappe.map((t, i) => tappa(t, i + 1))}</ol>,
  )
}

function argomenti (scorrimento: string, dati: NonNullable<ContenutoProiezione['argomenti']>): ReactElement | null {
  if (!dati.argomenti && !dati.materiali) return null
  const t = testi()
  return sezione(
    scorrimento,
    parole().oggi,
    <>
      {dati.argomenti ? <p className="testo-grande">{dati.argomenti}</p> : null}
      {dati.materiali ? <Quieto>{t.portare}<strong>{dati.materiali}</strong></Quieto> : null}
    </>,
  )
}

function consegne (scorrimento: string, elenco: ConsegnaProiettata[]): ReactElement | null {
  if (elenco.length === 0) return null
  return sezione(
    scorrimento,
    testi().daFare,
    <ul className="elenco">
      {elenco.map((voce) => (
        // testo-fisso: classe CSS
        <li key={voce.id} className={classi('voce', `voce--${voce.stato}`)}>
          <div className="voce__riga">
            <span className="voce__testo">{voce.testo}</span>
            {voce.scadenza ? <span className="voce__quando">{voce.scadenza}</span> : null}
          </div>
          <div className="voce__sotto">
            {voce.a}
            {voce.note ? ` · ${voce.note}` : null}
          </div>
        </li>
      ))}
    </ul>,
  )
}

// ------------------------------------------------------------- calendario

/*
 * Le quattro viste, disposte come quelle del registro: il docente indica lo
 * schermo («qui, giovedì») e il punto deve essere lo stesso. Qui però non si
 * scorre: la griglia prende l'altezza che c'è e le ore stanno in percentuale
 * della fascia.
 */

/** Che giorno è, detto con i segni buoni per tutte e tre le griglie. */
function classiGiorno (giorno: GiornoProiettato): Array<string | false> {
  return [
    giorno.oggi && 'giorno--oggi',
    giorno.festivo && 'giorno--festivo',
    Boolean(giorno.chiuso) && 'giorno--chiuso',
    giorno.fuori && 'giorno--fuori',
  ]
}

/** Il rettangolo di un'ora nella griglia della settimana: in percentuale, non in pixel. */
function oraNellaGriglia (ora: OraProiettata, da: number, durata: number): ReactElement | null {
  if (ora.daMinuti === null || ora.aMinuti === null) return null
  const alto = ((ora.daMinuti - da) / durata) * 100
  const altezza = ((ora.aMinuti - ora.daMinuti) / durata) * 100
  return (
    <div
      key={ora.id}
      // testo-fisso: classe CSS
      className={classi('ora-blocco', `ora-blocco--${ora.stato}`, ora.corrente && 'ora-blocco--adesso')}
      style={{ top: `${alto}%`, height: `${altezza}%` }}
    >
      <span className="ora-blocco__quando">{ora.inizio ?? ''}</span>
      <span className="ora-blocco__titolo">{ora.titolo}</span>
    </div>
  )
}

function vistaSettimana (settimana: SettimanaProiettata): ReactElement {
  const durata = Math.max(1, settimana.aMinuti - settimana.daMinuti)
  const colonne = `3.2em repeat(${settimana.giorni.length}, 1fr)`
  const alto = (minuti: number): string => `${((minuti - settimana.daMinuti) / durata) * 100}%`

  return (
    <div className="calendario-settimana">
      <div className="calendario-settimana__testa" style={{ gridTemplateColumns: colonne }}>
        <div className="calendario-settimana__angolo">
          {`s. ${settimana.numero}`}
          {settimana.lettera ? <span className="calendario-settimana__lettera">{settimana.lettera}</span> : null}
        </div>
        {settimana.giorni.map((giorno) => (
          <div key={giorno.data} className={classi('calendario-settimana__giorno', ...classiGiorno(giorno))}>
            <span className="calendario-settimana__nome">{giorno.nome}</span>
            <span className="calendario-settimana__numero">{String(giorno.numero)}</span>
            {giorno.chiuso ? <span className="segno-chiusura">{giorno.chiuso}</span> : null}
            {giorno.semestre ? <span className="segno-semestre">{giorno.semestre}</span> : null}
          </div>
        ))}
      </div>
      <div className="calendario-settimana__corpo" style={{ gridTemplateColumns: colonne }}>
        <div className="calendario-settimana__ore">
          {settimana.ore.map((ora) => (
            <span key={ora.minuti} className="calendario-settimana__ora" style={{ top: alto(ora.minuti) }}>
              {ora.etichetta}
            </span>
          ))}
        </div>
        {settimana.giorni.map((giorno) => (
          <div key={giorno.data} className={classi('calendario-settimana__colonna', ...classiGiorno(giorno))}>
            {settimana.ore.map((ora) => (
              <span key={ora.minuti} className="calendario-settimana__riga" style={{ top: alto(ora.minuti) }} />
            ))}
            {giorno.ore.map((ora) => oraNellaGriglia(ora, settimana.daMinuti, durata))}
            {/* Le prove non hanno un'ora: stanno in fondo alla colonna, tutte insieme. */}
            {giorno.prove.length > 0
              ? (
                  <div className="giorno-prove">
                    {giorno.prove.map((prova) => <div key={prova.id} className="giorno-prova">{prova.titolo}</div>)}
                  </div>
                )
              : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function vistaMese (mese: MeseProiettato): ReactElement {
  const colonne = `2.6em repeat(${mese.colonne.length}, 1fr)`

  return (
    <div className="calendario-mese">
      <div className="calendario-mese__testa" style={{ gridTemplateColumns: colonne }}>
        <span>{'s.'}</span>
        {/* Lista fissa dei giorni della settimana: l'indice basta. */}
        {mese.colonne.map((nome, indice) => <span key={indice}>{nome}</span>)}
      </div>
      {mese.righe.map((riga) => (
        <div key={riga.giorni[0]?.data ?? riga.numero} className="calendario-mese__riga" style={{ gridTemplateColumns: colonne }}>
          <div className="calendario-mese__settimana">
            {String(riga.numero)}
            {riga.lettera ? <span className="calendario-mese__lettera">{riga.lettera}</span> : null}
          </div>
          {riga.giorni.map((giorno) => (
            <div key={giorno.data} className={classi('calendario-mese__cella', ...classiGiorno(giorno))}>
              <div className="calendario-mese__numero">
                {/* Il primo del mese per esteso: è il confine fra due mesi. */}
                {giorno.apreMese ? `1 ${giorno.mese}` : String(giorno.numero)}
                {giorno.semestre ? <span className="segno-semestre">{giorno.semestre}</span> : null}
              </div>
              {giorno.chiuso ? <div className="segno-chiusura">{giorno.chiuso}</div> : null}
              {giorno.ore.map((ora) => (
                <div
                  key={ora.id}
                  className={classi(
                    'ora-pastiglia',
                    // testo-fisso: classe CSS
                    `ora-pastiglia--${ora.stato}`,
                    ora.corrente && 'ora-pastiglia--adesso',
                  )}
                >
                  <span className="ora-pastiglia__quando">{ora.inizio ?? ''}</span>
                  <span className="ora-pastiglia__titolo">{ora.titolo}</span>
                </div>
              ))}
              {giorno.prove.map((prova) => <div key={prova.id} className="giorno-prova">{prova.titolo}</div>)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function vistaAnno (anno: AnnoProiettato): ReactElement {
  const colonne = `1.6em repeat(${anno.mesi.length}, minmax(0, 1fr)) 1.6em`
  const t = testi()
  const numeri = Array.from({ length: 31 }, (_, indice) => indice + 1)

  return (
    <div className="calendario-anno">
      <div className="calendario-anno__riga calendario-anno__riga--mesi" style={{ gridTemplateColumns: colonne }}>
        <span className="calendario-anno__numero">{t.giorno}</span>
        {/* Lista fissa dei mesi dell'anno: l'indice basta. */}
        {anno.mesi.map((mese, indice) => <span key={indice} className="calendario-anno__mese">{mese.titolo}</span>)}
        <span className="calendario-anno__numero">{t.giorno}</span>
      </div>
      {numeri.map((numero) => (
        <div key={numero} className="calendario-anno__riga" style={{ gridTemplateColumns: colonne }}>
          <span className="calendario-anno__numero">{String(numero)}</span>
          {anno.mesi.map((mese, indice) => cellaAnno(indice, mese.giorni[numero - 1]))}
          <span className="calendario-anno__numero">{String(numero)}</span>
        </div>
      ))}
      <div className="calendario-anno__legenda">
        <span><span className="calendario-anno__segno giorno--chiuso" />{t.vacanze}</span>
        <span><span className="calendario-anno__segno giorno--festivo" />{t.sabatoDomenica}</span>
        <span><span className="calendario-anno__segno calendario-anno__segno--lezione" />{t.giorniDiLezione}</span>
        <span>{t.letteraSettimana}</span>
      </div>
    </div>
  )
}

/**
 * Una casella dell'anno: l'iniziale del giorno e che cosa ci succede. Le
 * caselle che non esistono (31 novembre) restano vuote, per tenere allineate
 * le righe fra i mesi. `chiave` è il mese: una per colonna.
 */
function cellaAnno (chiave: number, giorno: GiornoAnno | undefined): ReactElement {
  if (!giorno || !giorno.data) {
    return <span key={chiave} className="calendario-anno__giorno calendario-anno__giorno--nulla" />
  }
  return (
    <span
      key={chiave}
      className={classi(
        'calendario-anno__giorno',
        giorno.festivo && 'giorno--festivo',
        Boolean(giorno.chiuso) && 'giorno--chiuso',
        giorno.oggi && 'giorno--oggi',
        giorno.ore > 0 && 'calendario-anno__giorno--lezione',
        giorno.apre && 'calendario-anno__giorno--apre',
        giorno.chiude && 'calendario-anno__giorno--chiude',
      )}
    >
      <span className="calendario-anno__lettera">{giorno.lettera ?? ''}</span>
      <span className="calendario-anno__dentro">
        {/* Il nome della vacanza vince sul conto delle ore, che dentro una pausa è zero. */}
        {giorno.chiuso ? giorno.chiuso : giorno.ore > 0 ? String(giorno.ore) : ''}
      </span>
      <span className="calendario-anno__iniziale">{giorno.iniziale}</span>
    </span>
  )
}

function agenda (elenco: VoceCalendario[]): ReactElement | null {
  if (elenco.length === 0) return null
  return (
    <ul className="elenco">
      {elenco.map((voce) => (
        <li
          key={voce.id}
          className={classi('voce', voce.genere === 'prova' && 'voce--prova', voce.corrente && 'voce--corrente')}
        >
          <div className="voce__riga">
            <span className="voce__testo">{voce.titolo}</span>
            <span className="voce__quando">{voce.data}</span>
          </div>
          <div className="voce__sotto">
            {voce.genere === 'prova' ? testi().prova : voce.orario ?? testi().lezione}
            {voce.corrente ? testi().adesso : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function calendario (scorrimento: string, dati: CalendarioProiettato): ReactElement | null {
  const dentro =
    dati.vista === 'agenda'
      ? dati.agenda
        ? agenda(dati.agenda)
        : null
      : dati.vista === 'settimana'
        ? dati.settimana
          ? vistaSettimana(dati.settimana)
          : null
        : dati.vista === 'mese'
          ? dati.mese
            ? vistaMese(dati.mese)
            : null
          : dati.anno
            ? vistaAnno(dati.anno)
            : null

  if (!dentro) return null
  // testo-fisso: classe CSS
  return sezioneCon(scorrimento, `blocco--${dati.vista}`, dati.titolo, dentro)
}

function valutazione (voce: ValutazioneProiettata): ReactElement {
  const t = testi()
  return (
    <article key={voce.id} className="prova">
      <div className="voce__riga">
        <span className="voce__testo">{voce.titolo}</span>
        <span className="voce__quando">{voce.data}</span>
      </div>
      <div className="prova__conti">
        <span className="conto conto--quieto">{t.votiSu(voce.espressi, voce.attesi)}</span>
      </div>
      {/* Lo stesso grafico del registro, perché la forma commentata sul proiettore sia
          quella che si ritrova sul portatile. */}
      <GraficoNote
        grafico={voce.grafico}
        media={voce.media}
        sufficienti={voce.sufficienti}
        conteggio={voce.espressi}
      />
      {/* I nomi, quando sono accesi, in tabella: da in fondo all'aula due colonne
          allineate si leggono meglio di un voto in coda alla riga. */}
      {voce.voti
        ? (
            <table className="tabella-voti">
              <thead>
                <tr>
                  <th>{t.persona}</th>
                  <th className="tabella-voti__voto">{t.voto}</th>
                </tr>
              </thead>
              <tbody>
                {/* Lista fissa della prova, già in ordine: l'indice basta. */}
                {voce.voti.map((v, indice) => (
                  <tr
                    key={indice}
                    className={classi(
                      v.sufficiente === false && 'tabella-voti__riga--insufficiente',
                      v.assente && 'tabella-voti__riga--assente',
                    )}
                  >
                    <td>{v.nome}</td>
                    <td className="tabella-voti__voto">{v.voto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        : null}
    </article>
  )
}

function valutazioni (scorrimento: string, elenco: ValutazioneProiettata[]): ReactElement | null {
  if (elenco.length === 0) return null
  return sezione(scorrimento, testi().valutazioni, elenco.map(valutazione))
}

function documenti (scorrimento: string, elenco: DocumentoProiettato[]): ReactElement | null {
  if (elenco.length === 0) return null
  const t = testi()
  return sezione(
    scorrimento,
    t.documentiDaPortare,
    <ul className="elenco">
      {elenco.map((voce) => (
        <li key={voce.id} className="voce">
          <div className="voce__riga">
            <span className="voce__testo">{voce.testo}</span>
            <span className="voce__quando">{`${voce.consegnati} / ${voce.attesi}`}</span>
          </div>
          <div className="voce__sotto">
            {voce.scadenza ? t.entro(voce.scadenza) : t.senzaTermine}
            {voce.mancano && voce.mancano.length > 0 ? t.manca(voce.mancano.join(', ')) : null}
          </div>
        </li>
      ))}
    </ul>,
  )
}

function appello (scorrimento: string, dati: AppelloProiettato): ReactElement | null {
  if (dati.righe.length === 0) return null
  const t = testi()
  return sezione(
    scorrimento,
    t.appello(dati.presenti, dati.totale),
    <div className="tabella-scorrevole" data-telaio="tabella">
      <table className="appello">
        <thead>
          <tr>
            <th className="appello__nome">{t.persona}</th>
            {dati.colonne.map((colonna) => <th key={colonna.indice} className="appello__ud">{colonna.inizio}</th>)}
          </tr>
        </thead>
        <tbody>
          {dati.righe.map((riga) => (
            <tr key={riga.allievoId} className={riga.presente ? 'appello__riga' : 'appello__riga--assente'}>
              <th className="appello__nome" scope="row">
                {riga.nome}
                {riga.minuti ? <span className="appello__minuti">{`+${riga.minuti}′`}</span> : null}
              </th>
              {/* La sigla va nel dataset: «appello__cella---» non è una classe scrivibile in CSS.
                  Una sigla per colonna, nell'ordine: l'indice basta. */}
              {riga.sigle.map((sigla, indice) => (
                <td key={indice} className="appello__cella" data-sigla={sigla}>{sigla}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
  )
}

// ------------------------------------------------------------------ pagina

/** Lo schermo in pausa, o senza niente da mostrare: due modi di dire «aspetta». */
function segnaposto (testo: string, sotto: string): ReactElement {
  return (
    <div className="attesa">
      <div className="attesa__titolo">{testo}</div>
      <div className="attesa__sotto">{sotto}</div>
    </div>
  )
}

/**
 * La striscia delle schede in cima allo schermo: non si clicca, dice quale si
 * guarda e che ce ne sono altre. Con una scheda sola sparisce.
 */
function strisciaSchede (schede: ContenutoProiezione['schede']): ReactElement | null {
  if (schede.length < 2) return null
  return (
    <div className="schede">
      {schede.map((scheda) => (
        <span key={scheda.blocco} className={classi('schede__voce', scheda.corrente && 'schede__voce--corrente')}>
          {scheda.nome}
        </span>
      ))}
    </div>
  )
}

/** La chiave di scorrimento del blocco aperto: quale blocco, di che giorno e di che ora. */
function scorrimentoDelBlocco (dati: ContenutoProiezione): string {
  const quale = (['argomenti', 'scaletta', 'appello', 'consegne', 'calendario', 'valutazioni', 'documenti'] as const)
    .find((nome) => dati[nome])
  // testo-fisso: una chiave, non un testo
  return `${quale ?? ''}|${dati.intestazione.data ?? ''}|${dati.intestazione.orario ?? ''}`
}

/** Il logo della pausa: un file che non arriva non lascia l'immagine rotta, resta il nome. */
function Marchio (): ReactElement {
  const [rotto, impostaRotto] = useState(false)
  return (
    <img
      className="pausa__logo"
      src={LOGO}
      alt=""
      width={28}
      height={28}
      draggable={false}
      aria-hidden="true"
      style={rotto ? { visibility: 'hidden' } : undefined}
      onError={() => impostaRotto(true)}
    />
  )
}

/**
 * Lo schermo in pausa: l'ora grande, che la classe guarda volentieri mentre
 * aspetta, e in fondo, piccolo, il nome del programma.
 */
function pausa (): ReactElement {
  const t = testi()
  const ora = adesso()
  return (
    <div className="foglio foglio--sospesa">
      <div className="attesa attesa--pausa">
        <time className="pausa__ora" dateTime={ora}>{ora}</time>
        <div className="pausa__data">{formattaData(oggi(), 'lungo')}</div>
        <div className="attesa__titolo">{t.pausa}</div>
        <div className="attesa__sotto">{t.riprende}</div>
      </div>
      <footer className="pausa__marchio">
        {/* Lo stesso nodo fra un minuto e l'altro: ricreato, lampeggerebbe. */}
        <Marchio />
        <span className="pausa__nome">{versione ? `${t.programma} ${versione}` : t.programma}</span>
        <span className="pausa__motto">{t.motto}</span>
      </footer>
    </div>
  )
}

/**
 * L'orologio della pausa: batte al minuto nuovo finché lo schermo è sospeso,
 * e si ferma appena riprende. Uno solo: lo regola ogni messaggio.
 */
let orologio: ReturnType<typeof setTimeout> | null = null

function regolaOrologio (): void {
  if (contenuto?.sospesa !== true) {
    if (orologio !== null) clearTimeout(orologio)
    orologio = null
    return
  }
  if (orologio !== null) return
  // Al cambio del minuto, non fra sessanta secondi: l'ora non resta indietro.
  // I fusi spostano di minuti interi, il resto della divisione vale ovunque.
  const attesa = 60_000 - (Date.now() % 60_000) + 50
  orologio = setTimeout(() => {
    orologio = null
    disegna()
    regolaOrologio()
  }, attesa)
}

function Pagina (): ReactElement {
  const t = testi()
  if (!contenuto) return segnaposto(t.registro, t.inAttesa)

  if (contenuto.sospesa) return pausa()

  // Uno solo: dal messaggio arriva un blocco solo, e riempie lo schermo.
  const k = scorrimentoDelBlocco(contenuto)
  const aperto =
    (contenuto.argomenti ? argomenti(k, contenuto.argomenti) : null) ??
    (contenuto.scaletta ? scaletta(k, contenuto.scaletta) : null) ??
    (contenuto.appello ? appello(k, contenuto.appello) : null) ??
    (contenuto.consegne ? consegne(k, contenuto.consegne) : null) ??
    (contenuto.calendario ? calendario(k, contenuto.calendario) : null) ??
    (contenuto.valutazioni ? valutazioni(k, contenuto.valutazioni) : null) ??
    (contenuto.documenti ? documenti(k, contenuto.documenti) : null)

  return (
    <div className="foglio" data-telaio="foglio">
      {intestazione(contenuto.intestazione)}
      {strisciaSchede(contenuto.schede)}
      {aperto ??
        segnaposto(
          contenuto.vuota ? t.nienteDaMostrare : t.schermoPulito,
          contenuto.vuota ? t.apriUnOra : t.nessunaScheda,
        )}
    </div>
  )
}

let disegnoProgrammato = false

/** L'ultimo messaggio disegnato: lo stesso contenuto spinto di nuovo non ridisegna. */
let ultimoDisegnato = ''

function disegna (): void {
  if (!radice || !radiceReact || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Le misure stanno su una classe della radice: ridefiniscono corpo e spazi, e
    // la pagina si stringe tutta insieme.
    radice.classList.toggle('proiezione--compatta', contenuto?.compatta !== false)
    // Tutto e subito, come nel pannello.
    flushSync(() => radiceReact.render(<Pagina />))
  })
}

window.addEventListener('message', (evento: MessageEvent<MessaggioProiezione>) => {
  const messaggio = evento.data
  if (!messaggio || messaggio.tipo !== 'proiezione') return
  const firma = JSON.stringify([messaggio.contenuto, messaggio.radiceDati])
  if (firma === ultimoDisegnato) return
  ultimoDisegnato = firma
  contenuto = messaggio.contenuto
  radiceDati = messaggio.radiceDati
  versione = messaggio.versione
  regolaOrologio()
  disegna()
})

disegna()
