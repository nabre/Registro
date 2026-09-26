// La scheda personale: i box delle materie, con ore, voti, osservazioni e check.

import {
  formattaVoto,
  mediaAllievo,
  notaFineSemestre,
} from '../../../domain/calculations.js'
import { checkDelCorso, checkDellAllievo } from '../../../domain/check.js'
import { percento } from '../../../domain/text.js'
import { celleDiAllievo, contiPerAspetto } from '../../../domain/observations.js'
import { testoDiVoce, vociDiLista } from '../../../domain/lists.js'
import { formattaData } from '../../../domain/dates.js'
import type { Allievo, Classe, Corso, Lezione, MomentoValutazione } from '../../../domain/models.js'
import { Molti, Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { minuscolo } from '../../../i18n/index.js'
import { collegamento, pastiglia, scheda } from '../../components/base.js'
import { sintesiIncassata } from '../../components/filters.js'
import { nomeSegno, segnoFermo } from '../../components/marks.js'
import { h, type Figlio } from '../../dom.js'
import { casellaDelCheck, comeSpuntata } from '../check.js'
import { aggiorna, nomeMateria, stato, valutazioniDi } from '../../state.js'
import { tabella } from '../../components/table.js'
import { presenzeDelCorso, giornateStorte, temaPresenze } from './attendance.js'
import { riquadroTema, nienteQui } from './common.js'
import { testi } from './themes.testi.js'

/**
 * I voti di una materia: la nota e i momenti da cui viene. La media si calcola
 * dentro il corso, mai fra corsi diversi.
 */
function temaVoti (allievo: Allievo, classe: Classe, momenti: MomentoValutazione[]): Figlio {
  const { media, conteggio } = mediaAllievo(momenti, allievo.id)
  const nota = notaFineSemestre(
    media,
    stato.registro.impostazioni.scala,
    stato.registro.impostazioni.passoFineSemestre,
  )
  const t = testi()

  return riquadroTema(
    t.valutazioni,
    momenti.length,
    h(
      'div',
      null,
      h(
        'p',
        { class: 'riquadro-tema__riga' },
        nota === null
          ? pastiglia(t.nessunVoto, 'quiete')
          : pastiglia(
              // La nota, e fra parentesi la media da cui esce.
              t.notaEMedia(formattaVoto(nota), formattaVoto(media)),
              nota >= stato.registro.impostazioni.scala.sufficienza ? 'positivo' : 'negativo',
            ),
        h(
          'span',
          { class: 'testo-quieto' },
          t.votiSu(conteggio, momenti.length),
        ),
      ),
      momenti.length === 0
        ? nienteQui(t.nessunMomento)
        : h(
            'ul',
            { class: 'diario' },
            ...momenti.map((momento) => {
              const voto = momento.voti.find((v) => v.allievoId === allievo.id)
              return h(
                'li',
                { class: 'diario__voce' },
                collegamento({
                  testo: formattaData(momento.data),
                  classe: 'diario__quando',
                  al: () =>
                    // Anche il corso: la pagina dei voti tiene la prova scelta solo se è del suo
                    // corso, altrimenti ne aprirebbe un'altra.
                    aggiorna({
                      vista: 'valutazioni',
                      valutazioneId: momento.id,
                      corsoId: momento.corsoId,
                      filtroClasseId: classe.id,
                    }),
                }),
                h('span', { class: 'diario__cosa' }, momento.titolo),
                momento.peso !== 1
                  ? h('span', { class: 'testo-quieto' }, t.peso(momento.peso))
                  : null,
                !voto || (voto.valore === null && !voto.assente)
                  ? pastiglia('—', 'quiete')
                  : voto.assente
                    ? pastiglia(minuscolo(lessico().presenze.assente), 'attenzione')
                    : pastiglia(
                        formattaVoto(voto.valore),
                        voto.valore! >= momento.scala.sufficienza ? 'positivo' : 'negativo',
                      ),
                voto?.nota ? h('span', { class: 'diario__nota' }, voto.nota) : null,
              )
            }),
          ),
    ),
  )
}

/**
 * Com'è andata, ora per ora: la matrice del comportamento del registro
 * dell'ora, girata (qui le righe sono le ore di una persona). Stessi quadretti
 * e aspetti in colonna nell'ordine della lista, tutti anche se mai segnati; in
 * coda gli aspetti tolti ma usati. Le date mostrano se i segni sono sparsi o
 * vicini; in fondo i totali.
 */
function temaOsservato (allievo: Allievo, lezioni: Lezione[]): Figlio {
  const celle = celleDiAllievo(lezioni, allievo.id)
  const annotate = celle.filter(({ cella }) => (cella.nota ?? '').trim())
  const nomeAspetto = (valore: string) =>
    testoDiVoce(stato.registro.impostazioni, 'aspettoOsservato', valore)

  // Gli aspetti della lista, più quelli segnati e poi tolti dalla lista.
  const dellaLista = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato').map(
    (voce) => voce.valore,
  )
  const aspetti = [
    ...dellaLista,
    ...[...new Set(celle.map(({ cella }) => cella.aspetto))].filter(
      (valore) => !dellaLista.includes(valore),
    ),
  ]

  // Una riga per ora con qualcosa di segnato, in ordine di calendario; le ore
  // senza niente non fanno riga.
  const righe = [...new Map(celle.map(({ lezione }) => [lezione.id, lezione])).values()].sort(
    (a, b) => a.data.localeCompare(b.data),
  )
  const cellaDi = (lezioneId: string, aspetto: string) =>
    celle.find(({ lezione, cella }) => lezione.id === lezioneId && cella.aspetto === aspetto)
      ?.cella ?? null

  const conti = new Map(contiPerAspetto(celle).map((conto) => [conto.aspetto, conto]))
  const t = testi()

  const casella = (lezione: Lezione, aspetto: string): HTMLElement => {
    const cella = cellaDi(lezione.id, aspetto)
    if (!cella) {
      // Niente segnato su quell'aspetto: il quadretto resta vuoto per tenere le colonne.
      return h('span', { class: 'cella-segno cella-segno--ferma' })
    }
    return segnoFermo(cella.segno, {
      conNota: Boolean(cella.nota),
      racconto: [
        `${formattaData(lezione.data, 'giorno')} · ${nomeAspetto(aspetto)}`,
        nomeSegno(cella.segno).toLowerCase(),
        cella.nota,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }

  return riquadroTema(
    t.comEAndata,
    celle.length,
    celle.length === 0
      ? nienteQui(t.nienteSegnato)
      : h(
          'div',
          null,
          tabella({
            classi: { telaio: 'matrice__telaio', tabella: 'matrice' },
            etichetta: t.aspettiOraPerOra,
            intestazione: [
              h('th', { class: 'matrice__chi', attr: { scope: 'col' } }, t.giorno),
              ...aspetti.map((aspetto) =>
                h(
                  'th',
                  { class: 'matrice__aspetto', attr: { scope: 'col' } },
                  nomeAspetto(aspetto),
                ),
              ),
            ],
            righe: [
              ...righe.map((lezione) =>
                h(
                  'tr',
                  null,
                  h(
                    'th',
                    { class: 'matrice__chi', attr: { scope: 'row' } },
                    // Il giorno porta all'ora.
                    collegamento({
                      testo: formattaData(lezione.data, 'giorno'),
                      al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                    }),
                  ),
                  ...aspetti.map((aspetto) => h('td', null, casella(lezione, aspetto))),
                ),
              ),
            ],
            piede: [
              h('th', { class: 'matrice__chi', attr: { scope: 'row' } }, t.inTutto),
              ...aspetti.map((aspetto) => {
                const conto = conti.get(aspetto)
                if (!conto) return h('td', { class: 'testo-quieto' }, '—')
                return h(
                  'td',
                  { class: 'matrice__conto' },
                  conto.positivi > 0
                    ? h('span', { class: 'matrice__conto--positivo' }, `+${conto.positivi}`)
                    : null,
                  conto.negativi > 0
                    ? h('span', { class: 'matrice__conto--negativo' }, `−${conto.negativi}`)
                    : null,
                  // Anche le annotazioni senza segno: qualcuno ha scritto una riga.
                  conto.neutre > 0
                    ? h('span', { class: 'testo-quieto' }, String(conto.neutre))
                    : null,
                )
              }),
            ],
          }),
          // Le righe scritte accanto ai quadretti: dicono che cosa è successo.
          annotate.length === 0
            ? null
            : h(
                'ul',
                { class: 'diario' },
                ...annotate.map(({ lezione, cella }) =>
                  h(
                    'li',
                    { class: 'diario__voce' },
                    collegamento({
                      testo: formattaData(lezione.data, 'giorno'),
                      classe: 'diario__quando',
                      al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                    }),
                    segnoFermo(cella.segno),
                    h('span', { class: 'testo-quieto' }, nomeAspetto(cella.aspetto)),
                    h('span', { class: 'diario__cosa' }, cella.nota ?? ''),
                  ),
                ),
              ),
        ),
  )
}

/** Le osservazioni scritte nelle ore di questa materia, dalla più recente. */
function temaOsservazioni (allievo: Allievo, lezioni: Lezione[]): Figlio {
  const voci = lezioni
    .flatMap((lezione) =>
      lezione.osservazioni
        .filter((o) => o.allievoId === allievo.id)
        .map((osservazione) => ({ lezione, osservazione })),
    )
    .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))
  const t = testi()

  return riquadroTema(
    Molti(lessico().osservazione),
    voci.length,
    voci.length === 0
      ? nienteQui(t.nienteAnnotato)
      : h(
          'ul',
          { class: 'diario' },
          ...voci.map(({ lezione, osservazione }) =>
            h(
              'li',
              { class: 'diario__voce' },
              collegamento({
                testo: formattaData(lezione.data, 'giorno'),
                classe: 'diario__quando',
                al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
              }),
              pastiglia(
                t.tipoOsservazione(osservazione.tipo),
                osservazione.tipo === 'merito' ? 'positivo' : 'quiete',
              ),
              h('span', { class: 'diario__cosa' }, osservazione.testo),
            ),
          ),
        ),
  )
}

/**
 * Il check di una materia: una riga per colonna, con la casella della griglia
 * (stesso clic e tasto destro) e, per intero, il giorno e come è stata
 * spuntata. Assente se il corso non ha colonne.
 */
function temaCheck (allievo: Allievo, corso: Corso): Figlio {
  const check = checkDelCorso(stato.registro, corso.id)
  const caselle = checkDellAllievo(stato.registro, corso.id, allievo.id)
  if (!check || caselle.length === 0) return null
  const fatte = caselle.filter((c) => c.spunta).length
  const t = testi()
  return riquadroTema(
    Uno(lessico().check),
    caselle.length,
    h(
      'div',
      null,
      sintesiIncassata({
        etichetta: t.fatte,
        valore: `${fatte}/${caselle.length}`,
        tono: fatte === caselle.length ? 'positivo' : undefined,
      }),
      h(
        'ul',
        { class: 'check-allievo' },
        ...caselle.map(({ colonna, spunta, data }) =>
          h(
            'li',
            { class: 'check-allievo__voce' },
            casellaDelCheck(corso.id, check, allievo, colonna),
            h('span', { class: 'check-allievo__titolo' }, colonna.titolo),
            h(
              'span',
              { class: 'testo-quieto check-allievo__quando' },
              spunta && data ? comeSpuntata(spunta, data) : t.daFare,
            ),
          ),
        ),
      ),
    ),
  )
}

/**
 * Il box di una materia: quel che il registro sa di questa persona in questa
 * materia. In cima la sintesi (assenza e nota), poi i riquadri sempre nello
 * stesso ordine.
 */
function boxMateria (
  allievo: Allievo,
  classe: Classe,
  corso: Corso,
  lezioni: Lezione[],
  momenti: MomentoValutazione[],
): HTMLElement {
  const riga = presenzeDelCorso(allievo, corso)
  const storte = giornateStorte(allievo, lezioni)
  // Le ore tenute, non quelle a calendario: le annullate non contano.
  const tenute = lezioni.filter((lezione) => lezione.stato !== 'annullata').length
  const { media } = mediaAllievo(momenti, allievo.id)
  const nota = notaFineSemestre(
    media,
    stato.registro.impostazioni.scala,
    stato.registro.impostazioni.passoFineSemestre,
  )
  const t = testi()

  return scheda({
    classe: 'box-materia',
    titolo: nomeMateria(corso.materiaId) || corso.titolo,
    sottotitolo: [
      riga ? t.diAssenza(percento(riga.assenza)) : t.nessunaOra,
      nota === null ? t.nessunVoto : t.nota(formattaVoto(nota)),
      t.ore(tenute),
    ].join(' · '),
    contenuto: h(
      'div',
      { class: 'box-materia__temi' },
      temaPresenze(riga, storte),
      temaVoti(allievo, classe, momenti),
      temaOsservato(allievo, lezioni),
      temaOsservazioni(allievo, lezioni),
      temaCheck(allievo, corso),
    ),
  })
}

/**
 * I box delle materie, uno per corso della classe. In fondo, se ce ne sono,
 * le ore rimaste senza corso (corso eliminato), con le loro osservazioni.
 */
export function boxDelleMaterie (
  allievo: Allievo,
  classe: Classe,
  corsi: Corso[],
  lezioni: Lezione[],
): Figlio[] {
  const valutazioni = valutazioniDi(classe.id)
  const box = corsi.map((corso) =>
    boxMateria(
      allievo,
      classe,
      corso,
      lezioni.filter((l) => l.corsoId === corso.id),
      valutazioni
        .filter((v) => v.corsoId === corso.id)
        .sort((a, b) => a.data.localeCompare(b.data)),
    ),
  )

  const sciolte = lezioni.filter((l) => !corsi.some((c) => c.id === l.corsoId))
  const orfane = sciolte.some(
    (lezione) => lezione.osservazioni.some((o) => o.allievoId === allievo.id),
  )
  if (orfane) {
    box.push(
      scheda({
        classe: 'box-materia',
        titolo: testi().oreSenzaCorso,
        sottotitolo: testi().corsoEliminato,
        contenuto: h(
          'div',
          { class: 'box-materia__temi' },
          temaOsservazioni(allievo, sciolte),
        ),
      }),
    )
  }

  return box
}
