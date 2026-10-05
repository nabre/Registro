// I recuperi: le prove da rifare a chi non c'era.
// Nascono dall'appello dell'ora; qui si decide quando si rifà, o che non si
// rifà. Due forme: una riga per recupero nel todo e nel registro della lezione
// (prove diverse mescolate), una tabella dentro la prova (pochi nomi, stesse
// colonne).

import { useId, type ReactElement, type ReactNode } from 'react'

import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import type { Lezione, MomentoValutazione } from '#core/dominio/models.js'
import {
  type Recupero,
  type StatoRecupero,
  recuperiDelMomento,
  recuperiDellaLezione,
} from '#core/dominio/retakes.js'
import { classi } from '#ui/classNames.js'
import { PostoAllegato } from '#ui/components/attachments.js'
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
import { notifica } from '#ui/components/notifications.js'
import { Input } from '#ui/fields.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import { moduloRecupero } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import {
  classeDiLezione,
  classeDiMomento,
  nomeCorso,
  stato,
} from '#ui/state.js'
import { SIGLA_ASSENTE, ElencoVoti, grigliaVoti, leggiCasella, useLampo } from './grades.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi as testiVoti } from './grades.testi.js'
import { testi } from './retakes.testi.js'

/** Il tono della pastiglia di ogni stato; le parole stanno nel catalogo. */
const TONI: Record<
  StatoRecupero,
  'negativo' | 'attenzione' | 'informativo' | 'positivo' | 'quiete'
> = {
  'da-fissare': 'attenzione',
  scaduto: 'negativo',
  oggi: 'attenzione',
  fissato: 'informativo',
  fatto: 'positivo',
  dispensato: 'quiete',
}

/** La pastiglia dello stato di un recupero. */
function pastigliaStato (recupero: Recupero): ReactElement {
  return <Pastiglia testo={testi().stati[recupero.stato]} tono={TONI[recupero.stato]} />
}

/**
 * La prossima ora del corso dopo oggi (non dopo la prova: un recupero fissato
 * nel passato nascerebbe arretrato). Fissarlo lì costa un clic.
 */
function prossimaOraDelCorso (corsoId: string): Lezione | null {
  return (
    stato.registro.lezioni
      .filter(
        (l) => l.corsoId === corsoId && l.data > stato.adessoData && l.stato !== 'annullata',
      )
      .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null
  )
}

interface OpzioniRigaRecupero {
  mostraCorso?: boolean
  mostraProva?: boolean
  mostraVoto?: boolean
  /**
   * Il giorno che i tasti scrivono: dentro un'ora quello dell'ora che si sta
   * verbalizzando, altrove oggi.
   */
  giorno?: string
}

function nomeAllievo (recupero: Recupero): string {
  return nomeCompleto(recupero.allievo)
}

/** La chiave stabile di un recupero in un elenco: la prova e chi la rifà. */
function chiaveRecupero (recupero: Recupero): string {
  return `${recupero.momento.id}:${recupero.allievo.id}`
}

/** Manda la decisione all'host: è lo stesso comando per tutte e tre le uscite. */
function fissa (
  recupero: Recupero,
  previstoIl: string | null,
  nota: string,
  dispensato: boolean,
): void {
  void eseguiOAvvisa({
    tipo: 'recupero.imposta',
    valutazioneId: recupero.momento.id,
    allievoId: recupero.allievo.id,
    previstoIl,
    nota,
    dispensato,
  })
}

/** Segna, o disdice, il giorno in cui la prova rifatta è tornata a chi l'ha fatta. */
function riconsegna (recupero: Recupero, il: string | null): void {
  void eseguiOAvvisa({
    tipo: 'recupero.imposta',
    valutazioneId: recupero.momento.id,
    allievoId: recupero.allievo.id,
    previstoIl: recupero.previstoIl,
    nota: recupero.nota,
    dispensato: false,
    riconsegnataIl: il,
  })
}

/**
 * Il giorno in cui la prova rifatta è tornata indietro: un campo e non una
 * spunta, perché la data conta (termini di ricorso) e va corretta. Il tasto
 * accanto la riempie con il giorno da cui si guarda.
 */
function dataRiconsegnaRecupero (recupero: Recupero): ReactElement {
  const t = testi()
  return (
    <DataInLinea
      etichetta={t.resaIl}
      // testo-fisso: nome del campo, non si legge
      nome={`resa-${recupero.momento.id}-${recupero.allievo.id}`}
      valore={recupero.riconsegnataIl ?? ''}
      titolo={t.giornoRiavuta(nomeAllievo(recupero))}
      al={(valore) => riconsegna(recupero, valore || null)}
    />
  )
}

/**
 * I gesti che chiudono un recupero, sempre in quest'ordine: fissalo alla
 * prossima ora, aprilo per scegliere, dichiara che non si fa. `giorno` è la
 * data che i tasti scrivono.
 */
function comandiRecupero (
  recupero: Recupero,
  giorno: string,
  // Nella tabella la riconsegna ha già la sua colonna.
  conRiconsegna = true,
): ReactNode {
  const t = testi()
  const prossima = prossimaOraDelCorso(recupero.corsoId)
  const chiuso = recupero.stato === 'fatto' || recupero.stato === 'dispensato'

  return (
    <>
      {chiuso || !prossima
        ? null
        : (
            <Pulsante
              simbolo="calendario"
              variante="fantasma"
              titolo={t.rifaIl(formattaData(prossima.data, 'giorno'))}
              al={() => fissa(recupero, prossima.data, recupero.nota, false)}
            />
          )}
      <Pulsante
        simbolo="matita"
        variante="fantasma"
        titolo={t.decidi}
        al={() => moduloRecupero(recupero)}
      />
      {/* Rifatta e valutata: resta da ridarla. */}
      {conRiconsegna && recupero.stato === 'fatto' ? dataRiconsegnaRecupero(recupero) : null}
      {conRiconsegna && recupero.stato === 'fatto' && !recupero.riconsegnataIl
        ? (
            <Pulsante
              simbolo="spunta"
              variante="fantasma"
              titolo={t.riconsegnataIl(formattaData(giorno, 'giorno'))}
              al={() => riconsegna(recupero, giorno)}
            />
          )
        : null}
      {conRiconsegna && recupero.stato === 'fatto' && recupero.riconsegnataIl
        ? (
            <Pulsante
              simbolo="ricarica"
              variante="fantasma"
              titolo={t.nonEraTornata}
              al={() => riconsegna(recupero, null)}
            />
          )
        : null}
      {recupero.stato === 'dispensato'
        ? (
            <Pulsante
              simbolo="ricarica"
              variante="fantasma"
              titolo={t.tornaARecuperarla}
              al={() => fissa(recupero, recupero.previstoIl, recupero.nota, false)}
            />
          )
        : recupero.stato === 'fatto'
          ? null
          : (
              <Pulsante
                simbolo="chiudi"
                variante="fantasma"
                titolo={t.nonSiRecupera}
                al={() => fissa(recupero, null, recupero.nota, true)}
              />
            )}
    </>
  )
}

/**
 * La casella del voto del recupero: la stessa della griglia, raggiunta da qui.
 * Il voto finisce nella colonna della prova. Vuota lo toglie e riporta la riga
 * fra quelle da recuperare.
 */
function CampoVotoRecupero ({ recupero }: { recupero: Recupero }): ReactElement {
  const t = testi()
  const mostrato = recupero.voto !== null ? String(recupero.voto) : ''
  const [errata, lampeggia] = useLampo()
  // La stessa tendina della griglia: i voti della scala della prova, più la
  // sigla dell'assente.
  // testo-fisso: id dell'elenco, non si legge
  const lista = `voti-${useId().replace(/[^\w-]/g, '')}`

  const cambia = async (elemento: HTMLInputElement): Promise<void> => {
    // Lo stesso lettore della griglia (`leggiCasella`): stessi significati di
    // vuoto e della sigla dell'assente.
    const letto = leggiCasella(elemento.value)
    if (!letto) {
      // Il valore battuto resta nel campo invece di tornare al voto di prima, come
      // per le date in `components/base.tsx`.
      lampeggia()
      notifica(testiVoti().nonEUnVoto(elemento.value), 'errore')
      return
    }

    const risposta = await azione({
      tipo: 'voto.imposta',
      valutazioneId: recupero.momento.id,
      allievoId: recupero.allievo.id,
      valore: letto.valore,
      assente: letto.assente,
    })
    if (!risposta.ok) {
      elemento.value = mostrato
      lampeggia()
    }
  }

  return (
    <span className="cella-voto__guscio">
      <Input
        className={classi('cella-voto', 'cella-voto--recupero', errata && 'cella-voto--errata')}
        type="text"
        valore={mostrato}
        placeholder="—"
        // Un `fuoco` riconoscibile, come nella griglia, perché il fuoco torni sul
        // campo dopo un ridisegno. Prefisso diverso da quello della griglia, o il
        // fuoco tornerebbe sulla casella sbagliata.
        // testo-fisso: chiave del fuoco, non si legge
        data-fuoco={`recupero-${recupero.momento.id}-${recupero.allievo.id}`}
        aria-label={t.votoDelRecuperoDi(nomeAllievo(recupero))}
        title={t.votoAiuto}
        inputMode="decimal"
        list={lista}
        onCambio={(evento) => { void cambia(evento.target as HTMLInputElement) }}
      />
      <ElencoVoti id={lista} scala={recupero.momento.scala} sigleInPiu={SIGLA_ASSENTE} />
    </span>
  )
}

/**
 * La data in cui la prova rifatta è tornata a chi l'ha fatta: una per allievo,
 * non quella della classe (da qui si contano i termini di un ricorso).
 */
function campoRiconsegnaRecupero (recupero: Recupero): ReactElement {
  return (
    <ControlloData
      // testo-fisso: nome del campo, non si legge
      nome={`riconsegna-${recupero.momento.id}-${recupero.allievo.id}`}
      valore={recupero.riconsegnataIl ?? ''}
      segnaposto={testi().formatoData}
      al={(valore) =>
        void eseguiOAvvisa({
          tipo: 'recupero.imposta',
          valutazioneId: recupero.momento.id,
          allievoId: recupero.allievo.id,
          previstoIl: recupero.previstoIl,
          nota: recupero.nota,
          dispensato: recupero.stato === 'dispensato',
          riconsegnataIl: String(valore) || null,
        })}
    />
  )
}

/**
 * La graffetta della scansione: apre il PDF se c'è, lo chiede se manca.
 * Sostituirlo e toglierlo si fa dalla tabella dentro la prova.
 */
function graffettaRecupero (recupero: Recupero): ReactElement {
  const t = testi()
  const foglio = recupero.documento
  return (
    <Pulsante
      simbolo="allegato"
      variante="fantasma"
      classe={foglio ? 'recupero__con-file' : undefined}
      titolo={foglio ? t.apri(foglio.nome) : t.allegaScansione(nomeAllievo(recupero))}
      al={() =>
        void (foglio
          ? azione({
              tipo: 'allegato.apri',
              valutazioneId: recupero.momento.id,
              allegatoId: foglio.id,
            })
          : azione({
              tipo: 'allegato.aggiungi',
              valutazioneId: recupero.momento.id,
              ruolo: 'recupero',
              allievoId: recupero.allievo.id,
            }))}
    />
  )
}

/**
 * Una riga: chi, quale prova, a che punto è, e i gesti che la chiudono. Per il
 * todo e il registro della lezione, dove ogni riga deve dire da sé di che prova si tratta.
 */
function rigaRecupero (
  recupero: Recupero,
  opzioni: OpzioniRigaRecupero = {},
): ReactElement {
  const t = testi()
  // Il giorno che i tasti scrivono: quello dell'ora da cui si guarda, o oggi.
  const giorno = opzioni.giorno ?? stato.adessoData

  return (
    <Pendenza
      key={chiaveRecupero(recupero)}
      classe="recupero"
      // testo-fisso: classe CSS
      stato={[`recupero--${recupero.stato}`]}
      testata={(
        <>
          <strong className="recupero__allievo">{nomeAllievo(recupero)}</strong>
          {opzioni.mostraProva !== false
            ? (
                <button
                  className="recupero__prova"
                  type="button"
                  title={t.apriMomento}
                  onClick={() => apriMomento({ id: recupero.momento.id, corsoId: recupero.corsoId })}
                >
                  {recupero.momento.titolo}
                </button>
              )
            : null}
          {opzioni.mostraCorso ? <CorsoPendenza classe="recupero" nome={nomeCorso(recupero.corsoId)} /> : null}
          {pastigliaStato(recupero)}
        </>
      )}
      // I gesti tutti insieme in fondo, separati da chi e che cosa.
      azioni={(
        <>
          {opzioni.mostraVoto === false ? null : <CampoVotoRecupero recupero={recupero} />}
          {graffettaRecupero(recupero)}
          {comandiRecupero(recupero, giorno)}
        </>
      )}
      quando={(
        <>
          {t.provaDel(formattaData(recupero.momento.data, 'giorno'))}
          {recupero.previstoIl
            ? (
                <span className={classi('recupero__data', recupero.stato === 'scaduto' && 'recupero__data--tardi')}>
                  {t.siRifaIl(formattaData(recupero.previstoIl, 'giorno'))}
                </span>
              )
            : recupero.stato === 'da-fissare'
              ? <span className="testo-quieto">{t.nessunaData}</span>
              : null}
          {/* Da dove viene l'assenza: dichiarata nella griglia, o dedotta dall'appello. */}
          {recupero.daAppello ? <span className="testo-quieto">{t.dallAppello}</span> : null}
          {recupero.riconsegnataIl
            ? (
                <span className="testo-quieto">
                  {t.riconsegnataIlQuieto(formattaData(recupero.riconsegnataIl, 'giorno'))}
                </span>
              )
            : null}
          {recupero.nota ? <span className="testo-quieto">{` · ${recupero.nota}`}</span> : null}
        </>
      )}
    />
  )
}

/** Un mucchio di recuperi con il suo titolo e il suo conto. */
export function gruppoRecuperi (
  titolo: string,
  recuperi: Recupero[],
  opzioni: OpzioniRigaRecupero = {},
): ReactNode {
  if (recuperi.length === 0) return null
  return (
    <section className="recuperi__gruppo">
      {titolo ? <TitoloGruppo titolo={titolo} quante={recuperi.length} /> : null}
      {recuperi.map((recupero) => rigaRecupero(recupero, opzioni))}
    </section>
  )
}

/** Una riga della tabella dentro la prova. */
function rigaTabella (recupero: Recupero): ReactElement {
  const t = testi()
  const chiuso = recupero.stato === 'fatto' || recupero.stato === 'dispensato'

  return (
    <tr key={chiaveRecupero(recupero)} className={chiuso ? 'tabella__riga--spenta' : undefined}>
      <td className="tabella__nome"><CellaNome persona={recupero.allievo} nome={nomeAllievo(recupero)} /></td>
      <td className="recuperi__quando" data-etichetta={t.colonnaSiRifaIl}>
        {recupero.previstoIl
          ? (
              <span className={recupero.stato === 'scaduto' ? 'recupero__data--tardi' : undefined}>
                {formattaData(recupero.previstoIl, 'giorno')}
              </span>
            )
          : <span className="testo-quieto">—</span>}
      </td>
      {/* Il voto accanto al giorno in cui la prova è stata rifatta. */}
      <td className="tabella__numero" data-etichetta={Uno(lessico().voto)}><CampoVotoRecupero recupero={recupero} /></td>
      {/* La riconsegna fra voto e stato: è il passo dopo la correzione. */}
      <td className="recuperi__riconsegna" data-etichetta={t.colonnaRiconsegnataIl}>
        {campoRiconsegnaRecupero(recupero)}
        {/* La spunta sta nella cella della data: riempie quel campo. */}
        {recupero.stato === 'fatto' && !recupero.riconsegnataIl
          ? (
              <Pulsante
                simbolo="spunta"
                variante="fantasma"
                titolo={t.riconsegnataIl(formattaData(stato.adessoData, 'giorno'))}
                al={() => riconsegna(recupero, stato.adessoData)}
              />
            )
          : null}
      </td>
      <td className="recuperi__stato">{pastigliaStato(recupero)}</td>
      <td className="recuperi__scansione" data-etichetta={t.scansione}>
        <PostoAllegato
          momento={recupero.momento}
          ruolo="recupero"
          etichetta={t.scansione}
          allievoId={recupero.allievo.id}
        />
      </td>
      <td className="tabella__azioni">{comandiRecupero(recupero, stato.adessoData, false)}</td>
    </tr>
  )
}

/**
 * La tabella dei recuperi di una prova, assente se non ce ne sono. In cima il
 * testo della prova di recupero, unico per tutti.
 */
export function pannelloRecuperi (momento: MomentoValutazione): ReactNode {
  const classe = classeDiMomento(momento)
  const recuperi = recuperiDelMomento(stato.registro, momento, classe, stato.adessoData)
  if (recuperi.length === 0) return null

  const aperti = recuperi.filter((r) => r.stato !== 'fatto' && r.stato !== 'dispensato')
  const daFissare = aperti.filter((r) => r.stato === 'da-fissare')
  const t = testi()
  const L = lessico()

  // Anello della catena di telaio della pagina delle valutazioni.
  return (
    <Scheda
      telaio="recuperi"
      classe="scheda--recuperi"
      titolo={Molti(L.recupero)}
      sottotitolo={daFissare.length > 0
        ? t.daFissareInSospeso(daFissare.length, aperti.length)
        : aperti.length > 0
          ? t.inSospeso(aperti.length)
          : t.tuttiSistemati}
      aiuto={t.aiuto}
    >
      <div className="recuperi" data-telaio="recuperi">
        <PostoAllegato momento={momento} ruolo="recupero" etichetta={t.testoDelRecupero} />
        <PostoAllegato
          momento={momento}
          ruolo="recupero-soluzione"
          etichetta={L.ruoliAllegato['recupero-soluzione']}
        />
        <Tabella
          // Sotto la griglia è larga; dove non ci sta si impila (`lists.css`).
          variante={['recuperi', 'impilabile']}
          telaio="recuperi:tabella"
          // testo-fisso: una chiave, non un testo
          scorrimento={`recuperi:${momento.id}`}
          intestazione={(
            <>
              <th>{Uno(L.pif)}</th>
              <th>{t.colonnaSiRifaIl}</th>
              <th className="tabella__numero">{Uno(L.voto)}</th>
              <th>{t.colonnaRiconsegnataIl}</th>
              <th>{parole().stato}</th>
              <th>{t.scansione}</th>
              <th className="tabella__azioni" />
            </>
          )}
          righe={recuperi.map(rigaTabella)}
        />
      </div>
    </Scheda>
  )
}

/**
 * I recuperi previsti in un'ora, dentro la scheda Valutazioni dell'ora. In
 * cima la griglia della prova che si rifà, ristretta a chi la rifà; sotto, le
 * righe con provenienza, data fissata, scansione e comandi. Il voto non si
 * ripete nelle righe.
 */
export function bloccoRecuperiDellOra (lezione: Lezione): ReactNode {
  const recuperi = recuperiDellaLezione(stato.registro, lezione)
  if (recuperi.length === 0) return null

  const classe = classeDiLezione(lezione)
  // Le prove che oggi si rifanno, ognuna una volta sola.
  const momenti: MomentoValutazione[] = []
  for (const recupero of recuperi) {
    if (!momenti.some((m) => m.id === recupero.momento.id)) momenti.push(recupero.momento)
  }
  const chi = [...new Set(recuperi.map((r) => r.allievo.id))]

  return (
    <div className="recuperi recuperi--ora">
      <h5 className="recuperi__intestazione">{testi().recuperiDiOggi(recuperi.length)}</h5>
      {classe ? grigliaVoti(classe, momenti, { soloAllievi: chi, medie: false }) : null}
      {/* Qui i tasti scrivono la data di quest'ora, il giorno che si verbalizza. */}
      {gruppoRecuperi('', recuperi, {
        mostraCorso: false,
        mostraVoto: false,
        giorno: lezione.data,
      })}
    </div>
  )
}
