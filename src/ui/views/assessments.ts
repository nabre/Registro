// I momenti di valutazione e i voti, in forma di foglio di calcolo: allievi in
// riga, momenti in colonna, frecce per spostarsi, medie pesate in fondo. Una
// casella accetta il voto o la sigla dell'assente: chi è assente esce dalla media.

import {
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  nomeCompleto,
  ordinaAllievi,
} from '../../domain/calculations.js'
import { corsiDellAnno } from '../../domain/courses.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { formattaData } from '../../domain/dates.js'
import { motivoOrfano, valutazioniOrfane } from '../../domain/orphans.js'
// L'assenza all'ora sta nel dominio: la leggono anche i recuperi.
import type {
  Allievo,
  Corso,
  MomentoValutazione,
} from '../../domain/models.js'
import {
  avviso,
  barra,
  collegamento,
  pulsante,
  quieto,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { postoAllegato } from '../components/attachments.js'
import { eseguiOAvvisa, sintesiIncassata, statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { conferma } from '../components/modal.js'
import { graficoNote } from '../components/notes.js'
import { notifica } from '../components/notifications.js'
import { h, type Figlio } from '../dom.js'
import { chiediEliminazione, moduloAnno, moduloValutazione } from '../forms.js'
import { grigliaVoti, SIGLA_ASSENTE } from './grades.js'
import { pannelloRecuperi } from './retakes.js'
import { pannelloRiconsegna } from './returns.js'
import { testi } from './assessments.testi.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  classeDiMomento,
  classePerId,
  lezionePerId,
  stato,
  valutazionePerId,
  nomeSemestreScelto,
  nelSemestreScelto,
} from '../state.js'

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
function schedaAllegati (momento: MomentoValutazione, allievi: Allievo[]): HTMLElement {
  const prove = momento.allegati.filter((a) => a.ruolo === 'prova').length
  const t = testi()
  const L = lessico()

  return scheda({
    titolo: Molti(L.documento),
    aiuto: t.documentiAiuto,
    contenuto: h(
      'div',
      { class: 'allegati' },
      postoAllegato(momento, 'verifica', t.verifica),
      postoAllegato(momento, 'soluzione', L.ruoliAllegato.soluzione),
      h(
        'div',
        { class: 'allegati__testata-prove' },
        h('h4', null, t.proveCorrette),
        h('span', { class: 'testo-quieto' }, `${prove}/${allievi.length}`),
      ),
      ...allievi.map((allievo) =>
        postoAllegato(momento, 'prova', nomeCompleto(allievo), { allievoId: allievo.id }),
      ),
      allievi.length === 0 ? quieto(t.classeSenzaPif) : null,
    ),
  })
}

function dettaglioMomento (momento: MomentoValutazione): HTMLElement {
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

  return scheda({
    titolo: momento.titolo,
    sottotitolo: t.sottotitolo(formattaData(momento.data, 'lungo'), momento.tipo, momento.peso, motivo),
    azioni: [
      lezione
        ? pulsante({
            testo: t.vaiAllaLezione,
            simbolo: 'calendario',
            variante: 'fantasma',
            al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
          })
        : null,
      pulsante({
        testo: parole().modifica,
        simbolo: 'matita',
        variante: 'sottile',
        al: () => moduloValutazione(momento),
      }),
      // L'eliminazione accanto a quel che elimina.
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.eliminaMomento,
        al: async () => {
          if (!(await chiediEliminazione({ genere: 'valutazione', id: momento.id }))) return
          const risposta = await azione({
            tipo: 'valutazione.elimina',
            valutazioneId: momento.id,
          })
          if (!risposta.ok) return
          aggiorna({ valutazioneId: null })
          notifica(t.momentoEliminato, 'info')
        },
      }),
    ],
    contenuto: h(
      'div',
      null,
      momento.descrizione ? h('p', { class: 'nota-classe' }, momento.descrizione) : null,
      lezione === null && momento.lezioneId === null
        ? null
        : h(
            'p',
            { class: 'testo-quieto' },
            lezione
              ? t.svoltoNellaLezione(formattaData(lezione.data, 'lungo'))
              : t.lezioneSparita,
          ),
      sintesiIncassata(
        { etichetta: t.votiMessi, valore: `${messiAttivi}/${attivi.length}` },
        { etichetta: lessico().media.singolare, valore: formattaVoto(statistiche.media) },
        { etichetta: t.minimo, valore: formattaVoto(statistiche.minimo) },
        { etichetta: t.massimo, valore: formattaVoto(statistiche.massimo) },
        {
          etichetta: t.sufficienti,
          valore: statistiche.conteggio === 0 ? '—' : `${Math.round(statistiche.quotaSufficienti * 100)}%`,
          tono: statistiche.quotaSufficienti >= 0.6 ? 'positivo' : 'attenzione',
        },
      ),
      // Lo stesso componente del grafico del PDF e della vista di classe.
      statistiche.conteggio > 0
        ? graficoNote({
            grafico: distribuzioneAPunti(momento),
            media: formattaVoto(statistiche.media),
            sufficienti: statistiche.sufficienti,
            conteggio: statistiche.conteggio,
            estremi:
              statistiche.minimo !== null && statistiche.massimo !== null
                ? t.estremi(formattaVoto(statistiche.minimo), formattaVoto(statistiche.massimo))
                : null,
          })
        : quieto(t.nessunVoto),
      h(
        'div',
        { class: 'avanzamento-inserimento' },
        h('span', null, t.inserimento),
        barra(attivi.length === 0 ? 0 : messiAttivi / attivi.length, 'informativo'),
      ),
    ),
  })
}

/**
 * I momenti che nessuna tappa del piano ha fatto nascere: si dice quali, perché
 * sono sganciati e quanti voti porterebbero via; decide chi guarda. Solo quando
 * ce ne sono.
 */
function riquadroOrfane (corso: Corso | null): Figlio {
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
    return avviso(h('span', null, t.sganciatiAltrove(altrove)), 'informativo')
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

  return avviso(
    h(
      'div',
      { class: 'orfane' },
      h(
        'div',
        { class: 'orfane__testata' },
        h(
          'strong',
          null,
          t.nonAgganciati(orfane.length),
        ),
        pulsante({
          testo: t.eliminaTutti,
          simbolo: 'cestino',
          variante: 'sottile',
          titolo: t.eliminaTuttiAiuto,
          al: () => void eliminaTutte(),
        }),
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        t.spiegazioneSganciati(altrove),
      ),
      h(
        'ul',
        { class: 'orfane__elenco' },
        ...orfane.map((orfana) =>
          h(
            'li',
            { class: 'orfane__voce' },
            collegamento({
              testo: `${formattaData(orfana.momento.data)} · ${orfana.momento.titolo}`,
              titolo: t.apriQuestoMomento,
              al: () => aggiorna({ valutazioneId: orfana.momento.id }),
            }),
            h(
              'span',
              { class: 'testo-quieto' },
              t.rigaSganciato(orfana.motivo, orfana.voti),
            ),
            pulsante({
              simbolo: 'cestino',
              variante: 'fantasma',
              titolo: t.eliminaQuesto(orfana.momento.titolo),
              al: async () => {
                const vaBene = await chiediEliminazione({
                  genere: 'valutazione',
                  id: orfana.momento.id,
                })
                if (!vaBene) return
                await eseguiOAvvisa({
                  tipo: 'valutazione.elimina',
                  valutazioneId: orfana.momento.id,
                })
              },
            }),
          ),
        ),
      ),
    ),
    'attenzione',
  )
}

export function vistaValutazioni (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return statoVuotoAnno({ simbolo: 'valutazioni', crea: () => moduloAnno() })
  }

  // Un corso alla volta: la media in fondo alla griglia è quella del corso.
  const corso = corsoScelto()
  const classe = corso ? classePerId(corso.classeId) : null
  const t = testi()

  if (!corso || !classe) {
    return statoVuoto({
      simbolo: 'valutazioni',
      titolo: t.nessunCorso,
      testo: t.nessunCorsoTesto,
      azione: pulsante({
        testo: t.vaiAiCorsi,
        variante: 'primario',
        al: () => aggiorna({ vista: 'corsi' }),
      }),
    })
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

  return h(
    'div',
    { class: 'vista vista--valutazioni' },
    testataVista({
      titolo: Molti(lessico().momento),
      sottotitolo: `${classe.nome} · ${nomeSemestreScelto()}`,
      // Niente esportazioni (stanno in Documenti) e niente scelta del corso (la
      // tendina in cima): resta solo come si scrive nelle caselle.
      contorno: h(
        'div',
        { class: 'filtri' },
        h('p', { class: 'suggerimento' }, t.suggerimento(SIGLA_ASSENTE)),
      ),
    }),
    // Prima della griglia: è la cosa da sistemare.
    riquadroOrfane(corso),
    momenti.length === 0
      ? statoVuoto({
          simbolo: 'valutazioni',
          titolo: t.nessunMomento,
          // Nessun pulsante «crea»: un momento nasce dalla tappa del piano che è una
          // prova, dentro la sua ora.
          testo: t.nessunMomentoTesto,
        })
      : h(
          'div',
          { class: 'colonne colonne--valutazioni' },
          h(
            'div',
            { class: 'colonna colonna--larga' },
            // Si scrive anche qui: è la pagina dell'anno intero, per correggere voti
            // vecchi e mettere quelli che non appartengono a un'ora.
            grigliaVoti(classe, momenti),
            // I recuperi sotto la griglia, a tutta larghezza: la tabella ha sei colonne.
            momentoMostrato ? pannelloRecuperi(momentoMostrato) : null,
          ),
          momentoMostrato
            ? h(
                'div',
                { class: 'colonna' },
                dettaglioMomento(momentoMostrato),
                pannelloRiconsegna(momentoMostrato),
                schedaAllegati(momentoMostrato, ordinaAllievi(allieviAttivi(classe))),
              )
            : null,
        ),
  )
}
