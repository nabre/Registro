// I momenti di valutazione e i voti, in forma di foglio di calcolo: allievi in
// riga, momenti in colonna, frecce per spostarsi, medie pesate in fondo. Una
// casella accetta il voto o la sigla dell'assente: chi è assente esce dalla media.

import type { ReactElement, ReactNode } from 'react'

import {
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  nomeCompleto,
  ordinaAllievi,
} from '#core/dominio/calculations.js'
import { corsiDellAnno } from '#core/dominio/courses.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { formattaData } from '#core/dominio/dates.js'
import { motivoOrfano, valutazioniOrfane } from '#core/dominio/orphans.js'
// L'assenza all'ora sta nel dominio: la leggono anche i recuperi.
import type {
  Allievo,
  Corso,
  MomentoValutazione,
} from '#core/dominio/models.js'
import {
  Avviso,
  Barra,
  Collegamento,
  Pulsante,
  Quieto,
  Scheda,
  StatoVuoto,
  TestataVista,
} from '#ui/components/base.js'
import { PostoAllegato } from '#ui/components/attachments.js'
import { SintesiIncassata, StatoVuotoAnno, eseguiOAvvisa } from '#ui/components/filters.js'
import { conferma } from '#ui/components/modal.js'
import { GraficoNote } from '#ui/components/notes.js'
import { corsoDelContesto } from '#ui/context.js'
import { notifica } from '#ui/components/notifications.js'
import { chiediEliminazione, moduloAnno, moduloValutazione } from '#ui/forms.js'
import { telaioVista } from '#ui/viewFrame.js'
import { grigliaVoti, scegliMomento, SIGLA_ASSENTE } from './assessments/grades.js'
import { pannelloRecuperi } from './assessments/retakes.js'
import { pannelloRiconsegna } from './assessments/returns.js'
import { testi } from './assessments.testi.js'
import { azione } from '#ui/bridge.js'
import {
  annoCorrente,
  classeDiMomento,
  classePerId,
  lezionePerId,
  stato,
  valutazionePerId,
  nomeSemestreScelto,
  nelSemestreScelto,
  vai,
} from '#ui/state.js'
import { apriLezione } from '#ui/pages.js'

/**
 * I momenti di un corso nel semestre scelto dalla barra (quello in cui cade la
 * loro data).
 */
function momentiDi (corso: Corso): MomentoValutazione[] {
  return nelSemestreScelto(
    stato.registro.valutazioni.filter((v) => v.corsoId === corso.id),
  ).sort((a, b) => a.data.localeCompare(b.data))
}

/** I corsi vivi dell'anno, per contare i momenti sganciati degli altri corsi. */
function corsiDellAnnoVivi (): Corso[] {
  return corsiDellAnno(stato.registro, annoCorrente()?.id ?? null).filter(
    (corso) => !classePerId(corso.classeId)?.archiviata,
  )
}

/** Il corso di cui si guardano le valutazioni: quello della tendina in cima. */
function corsoScelto (): Corso | null {
  return corsoDelContesto()
}



// ------------------------------------------------------------------ allegati

/** I PDF del momento: il testo, la soluzione, e la prova corretta di ogni allievo. */
function schedaAllegati (momento: MomentoValutazione, allievi: Allievo[]): ReactElement {
  const prove = momento.allegati.filter((a) => a.ruolo === 'prova').length
  const t = testi()
  const L = lessico()

  return (
    <Scheda titolo={Molti(L.documento)} aiuto={t.documentiAiuto}>
      <div className="allegati">
        <PostoAllegato momento={momento} ruolo="verifica" etichetta={t.verifica} />
        <PostoAllegato momento={momento} ruolo="soluzione" etichetta={L.ruoliAllegato.soluzione} />
        <div className="allegati__testata-prove">
          <h4>{t.proveCorrette}</h4>
          <span className="testo-quieto">{`${prove}/${allievi.length}`}</span>
        </div>
        {allievi.map((allievo) => (
          <PostoAllegato
            key={allievo.id}
            momento={momento}
            ruolo="prova"
            etichetta={nomeCompleto(allievo)}
            allievoId={allievo.id}
          />
        ))}
        {allievi.length === 0 ? <Quieto>{t.classeSenzaPif}</Quieto> : null}
      </div>
    </Scheda>
  )
}

function dettaglioMomento (momento: MomentoValutazione): ReactElement {
  const t = testi()
  const statistiche = distribuzione(momento)
  const classe = classeDiMomento(momento)
  const attivi = classe ? allieviAttivi(classe) : []
  // «Voti messi» conta solo chi frequenta, come il denominatore: `distribuzione`
  // include anche i ritirati.
  const attiviIds = new Set(attivi.map((a) => a.id))
  const messiAttivi = momento.voti.filter(
    (v) => attiviIds.has(v.allievoId) && !v.assente && typeof v.valore === 'number',
  ).length

  const lezione = lezionePerId(momento.lezioneId)

  // Se non viene da nessuna tappa lo si dice: resta nelle medie.
  const motivo = motivoOrfano(stato.registro, momento)

  return (
    <Scheda
      titolo={momento.titolo}
      sottotitolo={t.sottotitolo(formattaData(momento.data, 'lungo'), momento.tipo, momento.peso, motivo)}
      azioni={(
        <>
          {lezione
            ? (
                <Pulsante
                  testo={t.vaiAllaLezione}
                  simbolo="calendario"
                  variante="fantasma"
                  // L'ora porta con sé il suo giorno.
                  al={() => apriLezione(lezione.id)}
                />
              )
            : null}
          <Pulsante
            testo={parole().modifica}
            simbolo="matita"
            variante="sottile"
            al={() => moduloValutazione(momento)}
          />
          {/* L'eliminazione accanto a quel che elimina. */}
          <Pulsante
            simbolo="cestino"
            variante="fantasma"
            titolo={t.eliminaMomento}
            al={async () => {
              if (!(await chiediEliminazione({ genere: 'valutazione', id: momento.id }))) return
              const risposta = await azione({
                tipo: 'valutazione.elimina',
                valutazioneId: momento.id,
              })
              if (!risposta.ok) return
              scegliMomento(null)
              notifica(t.momentoEliminato, 'info')
            }}
          />
        </>
      )}
    >
      <div>
        {momento.descrizione ? <p className="nota-classe">{momento.descrizione}</p> : null}
        {lezione === null && momento.lezioneId === null
          ? null
          : (
              <p className="testo-quieto">
                {lezione
                  ? t.svoltoNellaLezione(formattaData(lezione.data, 'lungo'))
                  : t.lezioneSparita}
              </p>
            )}
        <SintesiIncassata
          campi={[
            { etichetta: t.votiMessi, valore: `${messiAttivi}/${attivi.length}` },
            { etichetta: lessico().media.singolare, valore: formattaVoto(statistiche.media) },
            { etichetta: t.minimo, valore: formattaVoto(statistiche.minimo) },
            { etichetta: t.massimo, valore: formattaVoto(statistiche.massimo) },
            {
              etichetta: t.sufficienti,
              valore: statistiche.conteggio === 0 ? '—' : `${Math.round(statistiche.quotaSufficienti * 100)}%`,
              tono: statistiche.quotaSufficienti >= 0.6 ? 'positivo' : 'attenzione',
            },
          ]}
        />
        {/* Lo stesso componente del grafico del PDF e della vista di classe. */}
        {statistiche.conteggio > 0
          ? (
              <GraficoNote
                grafico={distribuzioneAPunti(momento)}
                media={formattaVoto(statistiche.media)}
                sufficienti={statistiche.sufficienti}
                conteggio={statistiche.conteggio}
                estremi={statistiche.minimo !== null && statistiche.massimo !== null
                  ? t.estremi(formattaVoto(statistiche.minimo), formattaVoto(statistiche.massimo))
                  : null}
              />
            )
          : <Quieto>{t.nessunVoto}</Quieto>}
        <div className="avanzamento-inserimento">
          <span>{t.inserimento}</span>
          <Barra quota={attivi.length === 0 ? 0 : messiAttivi / attivi.length} tono="informativo" />
        </div>
      </div>
    </Scheda>
  )
}

/**
 * I momenti che nessuna tappa del piano ha fatto nascere: si dice quali, perché
 * sono sganciati e quanti voti porterebbero via; decide chi guarda. Solo quando
 * ce ne sono.
 */
function riquadroOrfane (corso: Corso | null): ReactNode {
  if (!corso) return null
  // Nel semestre scelto, come la griglia accanto.
  const nelPeriodo = (voci: ReturnType<typeof valutazioniOrfane>) =>
    voci.filter((o) => nelSemestreScelto([o.momento]).length > 0)
  const orfane = nelPeriodo(valutazioniOrfane(stato.registro, [corso.id]))
  // Quelli degli altri corsi si contano, così si sa che c'è ancora da fare.
  const altrove =
    nelPeriodo(valutazioniOrfane(stato.registro, corsiDellAnnoVivi().map((c) => c.id))).length -
    orfane.length
  if (orfane.length === 0 && altrove === 0) return null
  const t = testi()
  if (orfane.length === 0) {
    return <Avviso tono="informativo"><span>{t.sganciatiAltrove(altrove)}</span></Avviso>
  }

  const voti = orfane.reduce((somma, o) => somma + o.voti, 0)

  const eliminaTutte = async () => {
    const vaBene = await conferma({
      titolo: t.eliminareSganciati(orfane.length),
      testo: t.eliminareSganciatiTesto(voti),
      testoConferma: parole().elimina,
      pericolo: true,
    })
    if (!vaBene) return
    await eseguiOAvvisa({ tipo: 'valutazione.eliminaOrfane', ids: orfane.map((o) => o.momento.id) })
  }

  return (
    <Avviso tono="attenzione">
      <div className="orfane">
        <div className="orfane__testata">
          <strong>{t.nonAgganciati(orfane.length)}</strong>
          <Pulsante
            testo={t.eliminaTutti}
            simbolo="cestino"
            variante="sottile"
            titolo={t.eliminaTuttiAiuto}
            al={() => void eliminaTutte()}
          />
        </div>
        <p className="testo-quieto">{t.spiegazioneSganciati(altrove)}</p>
        <ul className="orfane__elenco">
          {orfane.map((orfana) => (
            <li key={orfana.momento.id} className="orfane__voce">
              <Collegamento
                testo={`${formattaData(orfana.momento.data)} · ${orfana.momento.titolo}`}
                titolo={t.apriQuestoMomento}
                al={() => scegliMomento(orfana.momento.id)}
              />
              <span className="testo-quieto">{t.rigaSganciato(orfana.motivo, orfana.voti)}</span>
              <Pulsante
                simbolo="cestino"
                variante="fantasma"
                titolo={t.eliminaQuesto(orfana.momento.titolo)}
                al={async () => {
                  const vaBene = await chiediEliminazione({
                    genere: 'valutazione',
                    id: orfana.momento.id,
                  })
                  if (!vaBene) return
                  await eseguiOAvvisa({
                    tipo: 'valutazione.elimina',
                    valutazioneId: orfana.momento.id,
                  })
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </Avviso>
  )
}

function VistaValutazioni (): ReactElement {
  const anno = annoCorrente()
  const t = testi()
  if (!anno) {
    return <StatoVuotoAnno telaio={telaioVista()} simbolo="valutazioni" crea={() => moduloAnno()} />
  }

  // Un corso alla volta: la media in fondo alla griglia è quella del corso.
  const corso = corsoScelto()
  const classe = corso ? classePerId(corso.classeId) : null

  if (!corso || !classe) {
    return (
      <StatoVuoto
        telaio={telaioVista()}
        simbolo="valutazioni"
        titolo={t.nessunCorso}
        testo={t.nessunCorsoTesto}
        azione={(
          <Pulsante
            testo={t.vaiAiCorsi}
            variante="primario"
            al={() => { vai({ pagina: 'pagina.corsi' }) }}
          />
        )}
      />
    )
  }

  const momenti = momentiDi(corso)
  const scelto = valutazionePerId(stato.valutazioneId)
  // Anche il dettaglio sta nel semestre scelto: un momento fuori periodo non si
  // mostra accanto a una griglia che non lo elenca.
  const daMostrare =
    scelto && scelto.corsoId === corso.id && momenti.some((m) => m.id === scelto.id)
      ? scelto
      : null
  const momentoMostrato = daMostrare ?? momenti.at(-1) ?? null

  // Catena di telaio fino alla griglia dei voti (`grades.tsx`): le prove la leggono.
  return (
    <div className="vista vista--valutazioni" data-telaio={telaioVista()}>
      <TestataVista
        titolo={Molti(lessico().momento)}
        sottotitolo={`${classe.nome} · ${nomeSemestreScelto()}`}
        // Niente esportazioni (stanno in Documenti) e niente scelta del corso (la
        // tendina in cima): resta solo come si scrive nelle caselle.
        contorno={(
          <div className="filtri">
            <p className="suggerimento">{t.suggerimento(SIGLA_ASSENTE)}</p>
          </div>
        )}
      />
      {/* Prima della griglia: è la cosa da sistemare. */}
      {riquadroOrfane(corso)}
      {momenti.length === 0
        ? (
            <StatoVuoto
              simbolo="valutazioni"
              titolo={t.nessunMomento}
              // Nessun pulsante «crea»: un momento nasce dalla tappa del piano che è una
              // prova, dentro la sua ora.
              testo={t.nessunMomentoTesto}
            />
          )
        : (
            <div className="colonne colonne--valutazioni" data-telaio="valutazioni:colonne">
              <div className="colonna colonna--larga" data-telaio="valutazioni:griglia">
                {/* Si scrive anche qui: è la pagina dell'anno intero, per correggere voti
                    vecchi e mettere quelli che non appartengono a un'ora. */}
                {grigliaVoti(classe, momenti)}
                {/* I recuperi sotto la griglia, a tutta larghezza: la tabella ha sei colonne. */}
                {momentoMostrato ? pannelloRecuperi(momentoMostrato) : null}
              </div>
              {momentoMostrato
                ? (
                    <div className="colonna">
                      {dettaglioMomento(momentoMostrato)}
                      {pannelloRiconsegna(momentoMostrato)}
                      {schedaAllegati(momentoMostrato, ordinaAllievi(allieviAttivi(classe)))}
                    </div>
                  )
                : null}
            </div>
          )}
    </div>
  )
}

export function vistaValutazioni (): ReactElement {
  return <VistaValutazioni />
}
