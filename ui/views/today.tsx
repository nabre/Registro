// La Dashboard: giornata, priorità e collegamenti operativi in una schermata.
//
// Solo navigazione: ogni tessera, ora o prova porta alla sua pagina, e niente
// qui cambia il registro (quindi nessun comando nella riga delle azioni).
// I numeri vengono dalle stesse funzioni dello stato che usano le pagine di
// destinazione, così la tessera e la pagina dicono sempre lo stesso conto.

import { useEffect, type CSSProperties, type ReactElement } from 'react'

import {
  formattaData,
  daIso,
  differenzaGiorni,
  giorniBrevi,
  giornoDelMese,
  giornoSettimana,
} from '#core/dominio/dates.js'
import type { FaseOra } from '#core/dominio/dashboard.js'
import type {
  Corso,
  Lezione,
  MomentoValutazione,
} from '#core/dominio/models.js'
import { istante } from '#core/i18n/index.js'
import { apriMomento, vaiAOggi } from '#ui/calendarNavigation.js'
import { classi } from '#ui/classNames.js'
import {
  Pastiglia,
  Pulsante,
  Scheda,
  StatoVuoto,
  type TonoPastiglia,
} from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { moduloAnno } from '#ui/forms.js'
import { Isola } from '#ui/island.js'
import { isolaPresente, ridisegnaIsola } from '#ui/islands.js'
import { alMinuto } from '#ui/clock.js'
import { apriLezione, PAGINE, vaiA } from '#ui/pages.js'
import type { PaginaId } from '#ui/place.js'
import { testi as testiPagine } from '#ui/pages.testi.js'
import {
  annoCorrente,
  coloreDiCorso,
  coloreDiLezione,
  compleanniDellaDashboard,
  corsiDellAnnoAperto,
  dataProssimaGiornataDashboard,
  nelSemestreScelto,
  nomeClasseDiLezione,
  nomeMateriaDiLezione,
  oraDaFareDashboard,
  oreDaChiudereDashboard,
  oreDellaProssimaGiornataDashboard,
  oreDiOggiDashboard,
  pendenzeDellaBarra,
  stato,
  titoloDiLezione,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { pagineDaSmistareInTutto } from './sorting/toSort.js'
import { testi } from './today.testi.js'

/** Un'ora della giornata mostrata, con la fase calcolata dallo stato. */
type OraDiOggi = ReturnType<typeof oreDiOggiDashboard>[number]

/** Quante prove si annunciano: le prossime cinque bastano a vedere la settimana. */
const QUANTE_VALUTAZIONI = 5

/** Va in una pagina per nome, con i controlli di `vaiA`. */
function vaiAllaPagina (id: PaginaId): void {
  const pagina = PAGINE.find((p) => p.id === id)
  if (pagina) vaiA(pagina)
}

/** Il nome di una pagina come lo scrive la barra laterale. */
function nomeDellaPagina (id: PaginaId): string {
  return PAGINE.find((p) => p.id === id)?.titolo ?? id
}

// ------------------------------------------------------------------ tessere

/**
 * Una tessera: un numero, che cosa conta, e dove porta.
 * Tutta la tessera è un `<button>`, così è un bersaglio grande e Invio funziona da sé.
 */
function Tessera (opzioni: {
  chiave: string;
  simbolo: NomeIcona;
  tono: TonoPastiglia;
  valore: number;
  etichetta: string;
  nota: string;
  pagina: PaginaId;
  al: () => void;
}): ReactElement {
  const t = testi()
  const porta = t.portaA(nomeDellaPagina(opzioni.pagina))
  return (
    <button
      className={classi('oggi-tessera', `oggi-tessera--${opzioni.tono}`)} // testo-fisso: classe CSS
      type="button"
      // testo-fisso: chiave di fuoco, non si legge
      data-fuoco={`oggi-${opzioni.chiave}`}
      data-pagina={opzioni.pagina}
      title={porta}
      aria-label={`${opzioni.etichetta}: ${opzioni.valore}. ${opzioni.nota}. ${porta}`}
      onClick={() => opzioni.al()}
    >
      <span className="oggi-tessera__tondo"><Icona nome={opzioni.simbolo} /></span>
      <span className="oggi-tessera__testo">
        <span className="oggi-tessera__valore">{String(opzioni.valore)}</span>
        <span className="oggi-tessera__etichetta">{opzioni.etichetta}</span>
        <span className="oggi-tessera__nota">{opzioni.nota}</span>
      </span>
      <Icona nome="destra" classe="oggi-tessera__freccia icona--minuta" />
    </button>
  )
}

/** Quel che si dice sotto il numero delle ore di oggi: la prossima, o che è finita. */
function notaDelleOre (ore: readonly OraDiOggi[]): string {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  if (vive.length === 0) return t.nessunaOraOggi
  const inCorso = vive.find((o) => o.fase === 'in-corso')
  if (inCorso) return t.inCorsoFinoAlle(fineDi(inCorso.lezione))
  const prossima = vive.find(
    (o) => o.fase === 'futura' || o.fase === 'da-preparare',
  )
  return prossima ? t.prossimaAlle(inizioDi(prossima.lezione)) : t.tutteFatte
}

/**
 * Un giorno detto corto, per la nota di una tessera che non va a capo: «lun 14».
 * Il mese solo se non è quello di adesso, l'anno mai: le ore aperte sono di
 * quest'anno scolastico.
 */
function giornoCorto (data: string): string {
  return data.slice(0, 7) === stato.adessoData.slice(0, 7)
    ? formattaData(data, 'giorno')
    : `${giorniBrevi()[giornoSettimana(data) - 1]} ${formattaData(data, 'corto')}`
}

function Tessere ({ oreOggi }: { oreOggi: readonly OraDiOggi[] }): ReactElement {
  const t = testi()
  const tp = testiPagine()
  const vive = oreOggi.filter((o) => o.fase !== 'annullata').length
  const buchi = oreDaChiudereDashboard()
  const pendenze = pendenzeDellaBarra()
  const daSmistare = pagineDaSmistareInTutto()

  return (
    <div className="oggi-tessere" role="group" aria-label={t.tessere}>
      <Tessera
        chiave="ore"
        simbolo="calendario"
        tono={vive > 0 ? 'informativo' : 'quiete'}
        valore={vive}
        etichetta={t.oreDiOggi}
        nota={notaDelleOre(oreOggi)}
        pagina="pagina.calendario"
        // Il calendario su oggi, non dove lo si era lasciato: la tessera parla di oggi.
        al={() => {
          vaiAllaPagina('pagina.calendario')
          vaiAOggi()
        }}
      />
      <Tessera
        chiave="da-compilare"
        simbolo="matita"
        tono={buchi.length > 0 ? 'attenzione' : 'positivo'}
        valore={buchi.length}
        etichetta={t.daCompilare}
        nota={
          buchi.length > 0
            ? t.laPiuVecchia(giornoCorto(buchi[0].data))
            : t.inPari
        }
        pagina="pagina.corso.registro"
        // La stessa ora del comando «Ora da compilare»: la più vecchia senza registro,
        // o la prossima; se non c'è nessuna delle due si resta sul calendario.
        al={() => {
          const ora = oraDaFareDashboard()
          if (ora) apriLezione(ora.lezione.id)
          else vaiAllaPagina('pagina.calendario')
        }}
      />
      <Tessera
        chiave="pendenze"
        simbolo="spunta"
        tono={
          pendenze.urgenti > 0
            ? 'negativo'
            : pendenze.aperti > 0
              ? 'attenzione'
              : 'positivo'
        }
        valore={pendenze.aperti}
        etichetta={tp.pendenze}
        nota={t.urgenti(pendenze.urgenti)}
        pagina="pagina.pendenze"
        al={() => vaiAllaPagina('pagina.pendenze')}
      />
      <Tessera
        chiave="da-smistare"
        simbolo="vassoio"
        tono={daSmistare > 0 ? 'attenzione' : 'quiete'}
        valore={daSmistare}
        etichetta={tp.daSmistare}
        nota={t.pagineInAttesa(daSmistare)}
        pagina="pagina.daSmistare"
        al={() => vaiAllaPagina('pagina.daSmistare')}
      />
    </div>
  )
}

// ------------------------------------------------------------ le ore di oggi

function inizioDi (lezione: Lezione): string {
  return (
    lezione.slot.find((s) => s.tipo === 'lezione')?.inizio ??
    lezione.slot[0]?.inizio ??
    ''
  )
}

function fineDi (lezione: Lezione): string {
  const ore = lezione.slot.filter((s) => s.tipo === 'lezione')
  return (
    (ore[ore.length - 1] ?? lezione.slot[lezione.slot.length - 1])?.fine ?? ''
  )
}

/** Il tono di ogni fase: lo stesso significato che hanno i colori altrove. */
const TONO_FASE: Readonly<Record<FaseOra, TonoPastiglia>> = {
  'in-corso': 'informativo',
  'da-chiudere': 'attenzione',
  svolta: 'positivo',
  'da-preparare': 'neutro',
  futura: 'quiete',
  // Spenta e non rossa: un'ora annullata non è un guaio da sistemare.
  annullata: 'quiete',
}

/** L'ora da far vedere per prima, accesa: quella in corso, o la prossima. */
function oraInEvidenza (ore: readonly OraDiOggi[]): string | null {
  const inCorso = ore.find((o) => o.fase === 'in-corso')
  if (inCorso) return inCorso.lezione.id
  return (
    ore.find((o) => o.fase === 'futura' || o.fase === 'da-preparare')?.lezione
      .id ?? null
  )
}

function RigaOra ({ voce, evidenza }: { voce: OraDiOggi, evidenza: string | null }): ReactElement {
  const t = testi()
  const { lezione, fase } = voce
  const classe = nomeClasseDiLezione(lezione)
  const materia = nomeMateriaDiLezione(lezione)
  const argomento = titoloDiLezione(lezione)
  const inizio = inizioDi(lezione)
  const accesa = lezione.id === evidenza
  const dettagli = [argomento, lezione.aula].filter(Boolean).join(' · ')

  return (
    <li>
      <button
        className={classi(
          'oggi-ora',
          accesa && 'oggi-ora--evidenza',
          fase === 'annullata' && 'oggi-ora--annullata',
        )}
        type="button"
        // testo-fisso: chiave di fuoco, non si legge
        data-fuoco={`oggi-ora-${lezione.id}`}
        data-lezione={lezione.id}
        style={{ '--tinta': coloreDiLezione(lezione) } as CSSProperties}
        title={t.apriLOra(classe, inizio)}
        onClick={() => apriLezione(lezione.id)}
      >
        <span className="oggi-ora__quando">
          <span className="oggi-ora__inizio">{inizio}</span>
          <span className="oggi-ora__fine">{fineDi(lezione)}</span>
        </span>
        <span className="oggi-ora__filo" aria-hidden="true" />
        <span className="oggi-ora__cosa">
          <span className="oggi-ora__titolo">
            <span className="oggi-ora__classe">{classe}</span>
            {materia ? <span className="oggi-ora__materia">{materia}</span> : null}
          </span>
          {dettagli ? <span className="oggi-ora__dettagli">{dettagli}</span> : null}
        </span>
        <span className="oggi-ora__stato">
          {/* L'ora in corso lo dice già la sua pastiglia: il segnale serve alla prossima. */}
          {accesa && fase !== 'in-corso'
            ? <span className="oggi-ora__segnale">{t.prossima}</span>
            : null}
          <Pastiglia testo={t.fasi[fase]} tono={TONO_FASE[fase]} />
        </span>
      </button>
    </li>
  )
}

function SchedaOreOggi ({ ore, prossima }: {
  ore: readonly OraDiOggi[]
  prossima: string | null
}): ReactElement {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  const evidenza = oraInEvidenza(ore)
  return (
    <Scheda
      classe="oggi-scheda oggi-scheda--ore oggi-scheda--oggi"
      titolo={t.leOreDiOggi}
      sottotitolo={
        vive.length > 0
          ? t.quanteOre(
              vive.length,
              inizioDi(vive[0].lezione),
              fineDi(vive[vive.length - 1].lezione),
            )
          : undefined
      }
      contenuto={
        ore.length === 0
          ? (
              <StatoVuoto
                simbolo="sole"
                titolo={t.nienteOggi}
                testo={t.nienteOggiTesto(prossima ? formattaData(prossima, 'lungo') : null)}
                azione={(
                  <Pulsante
                    testo={t.portaA(nomeDellaPagina('pagina.calendario'))}
                    variante="sottile"
                    simbolo="calendario"
                    al={() => {
                      vaiAllaPagina('pagina.calendario')
                      vaiAOggi()
                    }}
                  />
                )}
              />
            )
          : (
              <ol className="oggi-ore">
                {ore.map((voce) => (
                  <RigaOra key={voce.lezione.id} voce={voce} evidenza={evidenza} />
                ))}
              </ol>
            )
      }
    />
  )
}

function SchedaOreProssima ({ ore, data }: {
  ore: readonly OraDiOggi[]
  data: string | null
}): ReactElement {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  const sottotitolo =
    data && vive.length > 0
      ? t.quanteOreData(
          formattaData(data, 'lungo'),
          vive.length,
          inizioDi(vive[0].lezione),
          fineDi(vive[vive.length - 1].lezione),
        )
      : data
        ? formattaData(data, 'lungo')
        : undefined

  return (
    <Scheda
      classe="oggi-scheda oggi-scheda--ore oggi-scheda--prossima"
      titolo={t.leOreDellaGiornata}
      sottotitolo={sottotitolo}
      contenuto={
        ore.length === 0
          ? (
              <StatoVuoto
                simbolo="calendario"
                titolo={t.nessunaProssimaGiornata}
                testo={t.nessunaProssimaGiornataTesto}
              />
            )
          : (
              <ol className="oggi-ore">
                {ore.map((voce) => <RigaOra key={voce.lezione.id} voce={voce} evidenza={null} />)}
              </ol>
            )
      }
    />
  )
}

// ------------------------------------------------------ prossime valutazioni

/**
 * Le prove che vengono, dalla più vicina, da oggi in poi.
 * Corsi dell'anno aperto e non del semestre scelto: a gennaio si vuole vedere
 * arrivare anche la prova di febbraio.
 */
function prossimeValutazioni (): MomentoValutazione[] {
  const corsi = new Set(corsiDellAnnoAperto().map((c) => c.id))
  return nelSemestreScelto(stato.registro.valutazioni)
    .filter((v) => corsi.has(v.corsoId) && v.data >= stato.adessoData)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) || a.titolo.localeCompare(b.titolo),
    )
    .slice(0, QUANTE_VALUTAZIONI)
}

/** Il foglietto del calendario: il giorno della settimana, il numero, il mese. */
function Foglietto ({ data }: { data: string }): ReactElement {
  return (
    <span className="oggi-foglietto" aria-hidden="true">
      <span className="oggi-foglietto__giorno">{giorniBrevi()[giornoSettimana(data) - 1]}</span>
      <span className="oggi-foglietto__numero">{String(giornoDelMese(data))}</span>
      <span className="oggi-foglietto__mese">
        {istante(daIso(data), { month: 'short', timeZone: 'UTC' })}
      </span>
    </span>
  )
}

function RigaValutazione ({ momento, mappaCorsi }: {
  momento: MomentoValutazione
  mappaCorsi?: ReadonlyMap<string, Corso>
}): ReactElement {
  const t = testi()
  const corso = mappaCorsi
    ? mappaCorsi.get(momento.corsoId)
    : corsiDellAnnoAperto().find((c) => c.id === momento.corsoId)
  const giorni = differenzaGiorni(stato.adessoData, momento.data)
  return (
    <li>
      <button
        className="oggi-prova"
        type="button"
        // testo-fisso: chiave di fuoco, non si legge
        data-fuoco={`oggi-prova-${momento.id}`}
        style={corso ? { '--tinta': coloreDiCorso(corso) } as CSSProperties : undefined}
        title={t.apriValutazione(momento.titolo)}
        onClick={() => apriMomento(momento)}
      >
        <Foglietto data={momento.data} />
        <span className="oggi-prova__cosa">
          <span className="oggi-prova__titolo">{momento.titolo}</span>
          <span className="oggi-prova__corso">
            <span className="oggi-prova__punto" aria-hidden="true" />
            {corso?.titolo ?? ''}
          </span>
        </span>
        <Pastiglia testo={t.fra(giorni)} tono={giorni <= 1 ? 'attenzione' : 'quiete'} />
      </button>
    </li>
  )
}

function SchedaValutazioni (): ReactElement {
  const t = testi()
  const prove = prossimeValutazioni()
  const mappaCorsi = new Map(corsiDellAnnoAperto().map((c) => [c.id, c]))
  return (
    <Scheda
      classe="oggi-scheda oggi-scheda--prove"
      titolo={t.prossimeValutazioni}
      contenuto={
        prove.length === 0
          ? (
              <StatoVuoto
                simbolo="valutazioni"
                titolo={t.nessunaValutazione}
                testo={t.nessunaValutazioneTesto}
              />
            )
          : (
              <ol className="oggi-prove">
                {prove.map((p) => (
                  <RigaValutazione key={p.id} momento={p} mappaCorsi={mappaCorsi} />
                ))}
              </ol>
            )
      }
    />
  )
}

// ---------------------------------------------------------------- compleanni

/** I compleanni di oggi, se ce n'è: altrimenti la scheda non c'è proprio. */
function SchedaCompleanni (): ReactElement | null {
  const data = stato.adessoData
  const festeggiati = compleanniDellaDashboard(data)
  if (festeggiati.length === 0) return null
  return (
    <Scheda
      classe="oggi-scheda oggi-scheda--compleanni"
      titolo={testi().compleanni}
      contenuto={
        <ul className="oggi-compleanni">
          {festeggiati.map((c) => (
            <li
              key={`${c.allievoId}:${c.classeId}`}
              className="oggi-compleanno"
              style={{ '--tinta': c.colore } as CSSProperties}
            >
              <span className="oggi-compleanno__tondo"><Icona nome="torta" /></span>
              <span className="oggi-compleanno__nome">{c.nome}</span>
              <span className="oggi-compleanno__classe">{c.classe}</span>
            </li>
          ))}
        </ul>
      }
    />
  )
}

// --------------------------------------------------------------- la pagina

// Il minuto che passa cambia le fasi delle ore di oggi («in corso», «prossima»)
// e la nota della tessera che le conta: si rifanno solo quei due riquadri, non
// la pagina (`clock.ts`). Le chiavi dicono che cosa segna l'ora.
// testo-fisso: chiave di un'isola, non si legge
const ISOLA_TESSERE = 'oggi-adesso:tessere'
// testo-fisso: chiave di un'isola, non si legge
const ISOLA_ORE = 'oggi-adesso'
/** Il contenitore dell'isola non fa scatola: griglia e colonna restano quelle di prima. */
const IN_LINEA: CSSProperties = { display: 'contents' }

function VistaOggi (): ReactElement {
  // Iscritti al minuto finché la Dashboard è a schermo.
  useEffect(() => alMinuto(() => {
    for (const chiave of [ISOLA_TESSERE, ISOLA_ORE]) {
      if (isolaPresente(chiave)) ridisegnaIsola(chiave)
    }
  }), [])

  const t = testi()
  const titolo = t.titolo
  const oreOggi = oreDiOggiDashboard()
  const dataProssima = dataProssimaGiornataDashboard()
  const oreProssima = oreDellaProssimaGiornataDashboard()

  const sottotitolo =
    oreOggi.length > 0 || !dataProssima
      ? t.sottotitolo(t.saluto(stato.adessoOra), formattaData(stato.adessoData, 'lungo'))
      : t.prossimaGiornata(formattaData(dataProssima, 'lungo'))

  const testata = (
    // La stessa riga delle altre pagine (`TestataVista`), senza «i»: il saluto
    // e la data fanno da sottotitolo.
    <header className="testata">
      <h2 className="testata__titolo">{titolo}</h2>
      <p className="testata__sottotitolo">{sottotitolo}</p>
    </header>
  )

  if (!annoCorrente()) {
    return (
      <div className="vista vista--oggi" data-telaio={telaioVista()}>
        {testata}
        <StatoVuotoAnno simbolo="dashboard" crea={() => moduloAnno()} />
      </div>
    )
  }

  return (
    <div className="vista vista--oggi" data-telaio={telaioVista()}>
      {testata}
      <Isola
        chiave={ISOLA_TESSERE}
        disegna={() => <Tessere oreOggi={oreDiOggiDashboard()} />}
        style={IN_LINEA}
      />
      <div className="oggi-griglia">
        <div className="oggi-colonna oggi-colonna--larga">
          <Isola
            chiave={ISOLA_ORE}
            disegna={() => (
              <SchedaOreOggi ore={oreDiOggiDashboard()} prossima={dataProssimaGiornataDashboard()} />
            )}
            style={IN_LINEA}
          />
          <SchedaOreProssima ore={oreProssima} data={dataProssima} />
        </div>
        <div className="oggi-colonna">
          <SchedaValutazioni />
          <SchedaCompleanni />
        </div>
      </div>
    </div>
  )
}

export function vistaOggi (): ReactElement {
  return <VistaOggi />
}
