// Le riconsegne: le prove svolte che non sono ancora tornate agli allievi.
// I voti si mettono nella griglia; da qui si segna solo che la prova è tornata
// alla classe, l'unica cosa che il registro non sa dedurre.

import type { ReactElement, ReactNode } from 'react'

import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { formattaData } from '#core/dominio/dates.js'
import type { Lezione, MomentoValutazione } from '#core/dominio/models.js'
import {
  GIORNI_PER_RICONSEGNARE,
  type Riconsegna,
  type RiconsegnaAllievo,
  type StatoRiconsegna,
  riconsegnaDelMomento,
  riconsegneDegliAllievi,
} from '#core/dominio/returns.js'
import { formattaVoto, nomeCompleto } from '#core/dominio/calculations.js'
import { type Recupero, recuperiDelMomento } from '#core/dominio/retakes.js'
import { gruppoRecuperi } from './retakes.js'
import { grigliaVoti } from './grades.js'
import { allieviAttivi } from '#core/dominio/calculations.js'
import { CellaNome } from '#ui/components/avatar.js'
import {
  ControlloData,
  DataInLinea,
  Pastiglia,
  Pulsante,
  Scheda,
  TitoloGruppo,
} from '#ui/components/base.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { CorsoPendenza, Pendenza } from '#ui/components/pending.js'
import { Tabella } from '#ui/components/table.js'
import { classi } from '#ui/classNames.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import {
  classeDiLezione,
  classeDiMomento,
  nomeCorso,
  stato,
} from '#ui/state.js'
import { testi } from './returns.testi.js'

type Tono = 'negativo' | 'attenzione' | 'informativo' | 'positivo' | 'quiete'

function pastiglie (): Record<StatoRiconsegna, { testo: string, tono: Tono }> {
  const t = testi()
  return {
    'da-correggere': { testo: t.daCorreggere, tono: 'attenzione' },
    'da-riconsegnare': { testo: t.daRiconsegnare, tono: 'informativo' },
    riconsegnata: { testo: t.riconsegnata, tono: 'positivo' },
  }
}

interface OpzioniRigaRiconsegna {
  mostraCorso?: boolean
  mostraProva?: boolean
  /** Il giorno che il tasto scrive: dentro un'ora quello dell'ora, altrove oggi. */
  giorno?: string
}

/** «due settimane fa», «ieri»: il ritardo si legge meglio in giorni che in date. */
function daQuanto (giorni: number): string {
  const t = testi()
  if (giorni <= 0) return t.oggi
  if (giorni === 1) return t.ieri
  if (giorni < 14) return t.giorniFa(giorni)
  const settimane = Math.floor(giorni / 7)
  return settimane < 8 ? t.settimaneFa(settimane) : t.mesiFa(Math.floor(giorni / 30))
}

/**
 * Una riga: quale prova, a che punto è, e il gesto «riconsegnata». Il titolo
 * della prova è un tasto che apre la sua griglia.
 */
function rigaRiconsegna (
  riconsegna: Riconsegna,
  opzioni: OpzioniRigaRiconsegna = {},
): ReactElement {
  const t = testi()
  const etichetta = pastiglie()[riconsegna.stato]
  const momento = riconsegna.momento
  // Il giorno che il tasto scrive: dentro un'ora quello dell'ora, altrove oggi.
  const giorno = opzioni.giorno ?? stato.adessoData

  const segna = (il: string | null) =>
    eseguiOAvvisa(
      { tipo: 'valutazione.riconsegna', valutazioneId: momento.id, il },
      il ? t.segnata : t.diNuovoDaRiconsegnare,
    )

  return (
    <Pendenza
      key={momento.id}
      classe="riconsegna"
      // testo-fisso: classi CSS
      stato={[`riconsegna--${riconsegna.stato}`, riconsegna.inRitardo && 'riconsegna--tardi']}
      testata={(
        <>
          {opzioni.mostraProva !== false
            ? (
                <button
                  className="riconsegna__prova"
                  type="button"
                  title={t.apriProva}
                  onClick={() => apriMomento({ id: momento.id, corsoId: riconsegna.corsoId })}
                >
                  {momento.titolo}
                </button>
              )
            : null}
          {opzioni.mostraCorso ? <CorsoPendenza classe="riconsegna" nome={nomeCorso(riconsegna.corsoId)} /> : null}
          <Pastiglia testo={etichetta.testo} tono={etichetta.tono} />
        </>
      )}
      // I gesti tutti insieme in fondo alla riga, separati dalla descrizione.
      azioni={(
        <>
          {/* Niente campo di data: la riconsegna è per allievo (tabella dei nomi). La
              scorciatoia scrive una riconsegna per allievo, tutte dello stesso giorno. */}
          {riconsegna.daRidare === 0
            ? (
                <span className="testo-quieto">
                  {riconsegna.riconsegnataIl
                    ? t.resaATuttiEntro(formattaData(riconsegna.riconsegnataIl, 'giorno'))
                    : t.nienteDaRidare}
                </span>
              )
            : (
                <Pulsante
                  testo={t.resaATutti(riconsegna.daRidare)}
                  simbolo="spunta"
                  variante="sottile"
                  titolo={t.segnaIl(formattaData(giorno, 'giorno'))}
                  al={() => segna(giorno)}
                />
              )}
          {/* Il ripensamento toglie la data a tutti in un gesto. */}
          {riconsegna.riconsegnataIl
            ? (
                <Pulsante
                  simbolo="ricarica"
                  variante="fantasma"
                  titolo={t.nonEraQuesta}
                  al={() => segna(null)}
                />
              )
            : null}
        </>
      )}
      quando={(
        <>
          {t.svolta(daQuanto(riconsegna.giorniPassati), formattaData(momento.data, 'giorno'))}
          {/* La data della riconsegna sta nel campo sopra, non si ripete. */}
          {riconsegna.stato === 'da-correggere'
            ? (
                <span className="testo-quieto">
                  {` · ${t.caselleVuote(riconsegna.attesi - riconsegna.corretti)}`}
                </span>
              )
            : null}
          {/* Il ritardo detto una volta sola, dove si legge la data. */}
          {riconsegna.inRitardo
            ? (
                <span className="riconsegna__tardi">
                  {` · ${t.fermaDa(Math.floor(GIORNI_PER_RICONSEGNARE / 7))}`}
                </span>
              )
            : null}
        </>
      )}
    />
  )
}

/** Un mucchio di riconsegne con il suo titolo e il suo conto. */
export function gruppoRiconsegne (
  titolo: string,
  riconsegne: Riconsegna[],
  opzioni: OpzioniRigaRiconsegna = {},
): ReactNode {
  if (riconsegne.length === 0) return null
  return (
    <section className="riconsegne__gruppo">
      {titolo ? <TitoloGruppo titolo={titolo} quante={riconsegne.length} /> : null}
      {riconsegne.map((riconsegna) => rigaRiconsegna(riconsegna, opzioni))}
    </section>
  )
}


// ------------------------------------------------------- una riga per allievo

/** Il nome come si scrive in un elenco: prima il cognome. */
function nomeDiAllievo (riga: RiconsegnaAllievo): string {
  return nomeCompleto(riga.allievo)
}

/** La chiave stabile di una riga: la prova e chi la riavrà. */
function chiaveRiga (riga: RiconsegnaAllievo): string {
  return `${riga.momento.id}:${riga.allievo.id}`
}

/** Segna, o disdice, il giorno in cui quella persona ha riavuto la sua prova. */
function segnaAllievo (riga: RiconsegnaAllievo, il: string | null): void {
  void eseguiOAvvisa({
    tipo: 'voto.riconsegna',
    valutazioneId: riga.momento.id,
    allievoId: riga.allievo.id,
    il,
  })
}

/**
 * Una riga d'elenco: a chi manca ancora la sua prova. Per il todo: la riga dice
 * da sola di che verifica si tratta.
 */
function rigaRiconsegnaAllievo (
  riga: RiconsegnaAllievo,
  opzioni: { mostraCorso?: boolean, giorno?: string } = {},
): ReactElement {
  const t = testi()
  const giorno = opzioni.giorno ?? stato.adessoData
  return (
    <Pendenza
      key={chiaveRiga(riga)}
      classe="riconsegna"
      stato={['riconsegna--allievo']}
      testata={(
        <>
          <strong>{nomeDiAllievo(riga)}</strong>
          <button
            className="riconsegna__prova"
            type="button"
            title={t.apriProva}
            onClick={() => apriMomento({ id: riga.momento.id, corsoId: riga.corsoId })}
          >
            {riga.momento.titolo}
          </button>
          {opzioni.mostraCorso ? <CorsoPendenza classe="riconsegna" nome={nomeCorso(riga.corsoId)} /> : null}
          <Pastiglia
            testo={formattaVoto(riga.voto)}
            tono={riga.voto >= riga.momento.scala.sufficienza ? 'positivo' : 'negativo'}
          />
        </>
      )}
      azioni={(
        <>
          <DataInLinea
            etichetta={t.resaIl}
            nome={`resa-${riga.momento.id}-${riga.allievo.id}`} // testo-fisso: nome del campo
            valore={riga.riconsegnataIl ?? ''}
            titolo={t.ilGiornoIn(nomeDiAllievo(riga))}
            al={(valore) => segnaAllievo(riga, valore || null)}
          />
          <Pulsante
            simbolo="spunta"
            variante="sottile"
            titolo={t.riconsegnataIlGiorno(formattaData(giorno, 'giorno'))}
            al={() => segnaAllievo(riga, giorno)}
          />
        </>
      )}
      quando={t.provaDel(formattaData(riga.momento.data, 'giorno'))}
    />
  )
}

/** Un mucchio di righe per allievo, con il suo titolo e il suo conto. */
export function gruppoRiconsegneAllievi (
  titolo: string,
  righe: RiconsegnaAllievo[],
  opzioni: { mostraCorso?: boolean, giorno?: string } = {},
): ReactNode {
  if (righe.length === 0) return null
  return (
    <section className="riconsegne__gruppo">
      {titolo ? <TitoloGruppo titolo={titolo} quante={righe.length} /> : null}
      {righe.map((riga) => rigaRiconsegnaAllievo(riga, opzioni))}
    </section>
  )
}

/**
 * La tabella di chi ha riavuto la sua prova, una riga per allievo. La data di
 * classe si vede in trasparenza su chi non ne ha una propria; scriverne una la
 * sostituisce per quel nome.
 */
function tabellaRiconsegneAllievi (
  momento: MomentoValutazione,
  soloDaFare = false,
  quando?: string,
): ReactNode {
  const righe = riconsegneDegliAllievi(momento, classeDiMomento(momento), soloDaFare)
  if (righe.length === 0) return null
  const giorno = quando ?? stato.adessoData
  const t = testi()
  const L = lessico()

  return (
    <Tabella
      // In una colonna stretta ogni riga si impila (`lists.css`): accanto alla
      // griglia e nell'ora la data, dove si scrive, finiva fuori vista.
      variante={['riconsegne', 'impilabile']}
      // testo-fisso: chiave di scorrimento
      scorrimento={`riconsegne:${momento.id}:${soloDaFare ? 'da-fare' : 'tutte'}`}
      intestazione={(
        <>
          <th>{Uno(L.pif)}</th>
          <th className="tabella__numero">{Uno(L.voto)}</th>
          <th>{t.riconsegnataIl}</th>
          <th className="tabella__azioni" />
        </>
      )}
      righe={righe.map((riga) => (
        <tr key={riga.allievo.id} className={classi(riga.riconsegnataIl && 'tabella__riga--spenta')}>
          <td className="tabella__nome"><CellaNome persona={riga.allievo} nome={nomeDiAllievo(riga)} /></td>
          {/* Impilata, il voto sta accanto al nome senza etichetta: si legge da sé. */}
          <td className="tabella__numero">{formattaVoto(riga.voto)}</td>
          <td className="riconsegne__data" data-etichetta={t.riconsegnataIl}>
            <ControlloData
              nome={`riconsegna-${momento.id}-${riga.allievo.id}`} // testo-fisso: nome del campo
              valore={riga.riconsegnataIl ?? ''}
              segnaposto={t.segnapostoData}
              al={(valore) => segnaAllievo(riga, String(valore) || null)}
            />
          </td>
          <td className="tabella__azioni">
            {riga.riconsegnataIl
              ? null
              : (
                  <Pulsante
                    simbolo="spunta"
                    variante="fantasma"
                    titolo={t.riconsegnataOggi}
                    al={() => segnaAllievo(riga, giorno)}
                  />
                )}
          </td>
        </tr>
      ))}
    />
  )
}

/**
 * Le prove del corso ancora da ridare, nell'amministrazione dell'ora: si
 * ridistribuiscono in aula. I tasti scrivono la data di quest'ora, non di oggi.
 */
export function pannelloRiconsegneDellOra (lezione: Lezione): ReactNode {
  const classe = classeDiLezione(lezione)
  const giorno = lezione.data

  /** Le prove del corso che a quest'ora hanno ancora qualcosa in sospeso. */
  const aperte: Array<{
    riconsegna: Riconsegna
    singoli: RiconsegnaAllievo[]
    recuperi: Recupero[]
  }> = []
  for (const momento of stato.registro.valutazioni) {
    if (momento.corsoId !== lezione.corsoId) continue
    // Le prove non ancora fatte a quest'ora non c'entrano.
    const riconsegna = riconsegnaDelMomento(momento, classe, giorno)
    if (!riconsegna) continue
    const singoli = riconsegneDegliAllievi(momento, classe, true)
    // Anche i recuperi valutati e non ancora ridati: stessa pila.
    const daRidare = recuperiDelMomento(stato.registro, momento, classe, giorno).filter(
      (r) => r.stato === 'fatto' && !r.riconsegnataIl,
    )
    // Una prova già tornata alla classe resta finché a qualcuno manca la sua.
    if (riconsegna.stato === 'riconsegnata' && singoli.length === 0 && daRidare.length === 0) {
      continue
    }
    aperte.push({ riconsegna, singoli, recuperi: daRidare })
  }

  if (aperte.length === 0) return null

  const daCorreggere = aperte.filter((v) => v.riconsegna.stato === 'da-correggere').length
  const pronte = aperte.filter((v) => v.riconsegna.stato !== 'da-correggere').length
  const t = testi()

  return (
    <Scheda
      titolo={t.proveDaRiconsegnare}
      sottotitolo={[
        pronte > 0 ? t.daRidare(pronte) : null,
        daCorreggere > 0 ? t.quanteDaCorreggere(daCorreggere) : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      classe="scheda--riconsegna"
    >
      <div className="riconsegne">
        {aperte.map((voce) => (
          <BloccoProvaDaChiudere
            key={voce.riconsegna.momento.id}
            riconsegna={voce.riconsegna}
            singoli={voce.singoli}
            recuperi={voce.recuperi}
            giorno={giorno}
          />
        ))}
      </div>
    </Scheda>
  )
}

/**
 * Una prova non ancora finita, con quel che le manca sotto: la riga con lo
 * stato e la riconsegna; la griglia, se ci sono caselle vuote; la tabella di
 * chi non l'ha ancora riavuta.
 */
function BloccoProvaDaChiudere ({ riconsegna, singoli, recuperi, giorno }: {
  riconsegna: Riconsegna
  singoli: RiconsegnaAllievo[]
  recuperi: Recupero[]
  giorno: string
}): ReactElement {
  const t = testi()
  const momento = riconsegna.momento
  const classe = classeDiMomento(momento)
  // Chi ha la casella vuota (né voto né assenza): rende la prova «da correggere».
  const daRiempire = (classe ? allieviAttivi(classe) : []).filter((allievo) => {
    const voto = momento.voti.find((v) => v.allievoId === allievo.id)
    return !voto || (!voto.assente && voto.valore === null)
  })

  return (
    <section className="riconsegne__prova">
      {rigaRiconsegna(riconsegna, { mostraProva: true, giorno })}
      {classe && daRiempire.length > 0
        ? (
            <div className="riconsegne__griglia">
              <TitoloGruppo titolo={t.daCompletare} quante={daRiempire.length} livello="h5" />
              {grigliaVoti(classe, [momento], {
                soloAllievi: daRiempire.map((allievo) => allievo.id),
                medie: false,
              })}
            </div>
          )
        : null}
      {singoli.length > 0
        ? (
            <div className="riconsegne__singoli">
              <TitoloGruppo titolo={t.daRidareA} quante={singoli.length} livello="h5" />
              {tabellaRiconsegneAllievi(momento, true, giorno)}
            </div>
          )
        : null}
      {/* I recuperi di questa prova valutati e ancora da ridare: stessa pila, stesso gesto. */}
      {recuperi.length > 0
        ? (
            <div className="riconsegne__singoli">
              <TitoloGruppo titolo={t.recuperiDaRidare} quante={recuperi.length} livello="h5" />
              {gruppoRecuperi('', recuperi, { mostraProva: false, mostraVoto: false, giorno })}
            </div>
          )
        : null}
    </section>
  )
}

/**
 * La riconsegna di una prova, dentro la scheda della prova, accanto alla
 * griglia. Non compare per una prova ancora da svolgere.
 */
export function pannelloRiconsegna (momento: MomentoValutazione): ReactNode {
  const riconsegna = riconsegnaDelMomento(
    momento,
    classeDiMomento(momento),
    stato.adessoData,
  )
  if (!riconsegna) return null

  const t = testi()
  /** Lo stato della prova, e quanti non l'hanno ancora riavuta. */
  const sottotitolo = (): string => {
    if (riconsegna.stato === 'riconsegnata') {
      // Solo a prova tornata alla classe chi resta senza è chi mancava; prima,
      // da ridare sono tutti, e lo dice già «Resa a tutti» nella riga sotto.
      const restano = riconsegna.daRidare
      const coda = restano > 0 ? ` · ${t.daRidareAChiMancava(restano)}` : ''
      const quando = formattaData(riconsegna.riconsegnataIl ?? momento.data, 'giorno')
      return `${t.tornataATutti(quando)}${coda}`
    }
    if (riconsegna.stato === 'da-correggere') {
      return t.caselleVuote(riconsegna.attesi - riconsegna.corretti)
    }
    return t.corretta
  }
  return (
    <Scheda titolo={Uno(lessico().riconsegna)} sottotitolo={sottotitolo()} classe="scheda--riconsegna">
      <div className="riconsegne">
        {rigaRiconsegna(riconsegna, { mostraProva: false })}
        {/* Sotto, nome per nome: chi mancava riavrà la sua un altro giorno. */}
        {tabellaRiconsegneAllievi(momento)}
      </div>
    </Scheda>
  )
}
