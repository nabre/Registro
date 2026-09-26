// L'appello dell'ora: la matrice delle presenze, persone in riga e unità
// didattiche in colonna, con il pulsante che gira gli stati a ogni clic e il
// menu che li nomina tutti a pressione lunga.

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  segnato,
  statiAllineati,
  unitaDidattiche,
} from '../../../domain/calculations.js'
import { Uno, corto } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { minuscolo } from '../../../i18n/index.js'
import type { Allievo, Lezione, Presenza, StatoPresenza } from '../../../domain/models.js'
import { pulsante, scheda, statoVuoto } from '../../components/base.js'
import { eseguiOAvvisa } from '../../components/filters.js'
import { menuContestuale } from '../../components/menu.js'
import { conferma } from '../../components/modal.js'
import { h } from '../../dom.js'
import { azione } from '../../bridge.js'
import type { Risposta } from '../../../protocol.js'
import { aggiorna, classeDiLezione, stato as statoPannello } from '../../state.js'
import { tabella } from '../../components/table.js'
import { testi } from './attendance.testi.js'

/**
 * Gli stati dell'appello, nell'ordine in cui il pulsante li gira. Si parte da
 * «–» (non detto), che distingue un appello mai cominciato da uno con tutti
 * presenti; poi presente, assente, ritardo, esonero, e di nuovo «–».
 */
const STATI = SIGLE_PRESENZA

const SIGLE = new Map(STATI.map((v) => [v.valore, v.sigla]))
// Le parole dell'appello nella lingua della pagina: le sigle restano quelle.
const NOMI = new Map(STATI.map((v) => [v.valore, lessico().presenze[v.valore]]))

/** Lo stato dopo questo, girando in tondo. */
function prossimoStato (stato: StatoPresenza): StatoPresenza {
  const posto = STATI.findIndex((v) => v.valore === stato)
  return STATI[(posto + 1) % STATI.length].valore
}

/** Lo stato di un gruppo di caselle se è uno solo; nullo se sono mescolate. */
function statoUniforme (stati: StatoPresenza[]): StatoPresenza | null {
  const primo = stati[0]
  if (primo === undefined) return null
  return stati.every((s) => s === primo) ? primo : null
}

/** Quanto va tenuto premuto un pulsante prima che si apra il menu, in ms. */
const PRESSIONE_LUNGA = 450

/**
 * Il menu degli stati, a pressione lunga: si sceglie lo stato per nome senza
 * girare il pulsante. La spunta segna quello di adesso.
 */
function menuStati (
  evento: MouseEvent,
  attuale: StatoPresenza | null,
  al: (stato: StatoPresenza) => void,
): void {
  menuContestuale(
    evento,
    STATI.map((v) => ({
      testo: `${v.sigla} — ${NOMI.get(v.valore) ?? v.nome}`,
      simbolo: v.valore === attuale ? ('spunta' as const) : undefined,
      al: () => al(v.valore),
    })),
  )
}

function pulsanteStato (opzioni: {
  stato: StatoPresenza | null
  titolo: string
  fuoco: string
  classe?: string
  al: (prossimo: StatoPresenza) => Promise<Risposta>
}): HTMLElement {
  const { stato, titolo, fuoco, classe, al } = opzioni

  /**
   * Lo stato che questa casella ha mandato e non ha ancora visto tornare.
   * `stato` resta quello del ridisegno finché l'host non rispinge il registro,
   * e un secondo clic rapido ricalcolerebbe lo stesso stato del primo: si
   * riparte da quel che si è mandato. Se la scrittura è respinta si torna al
   * ridisegno. Vale anche per la casella di colonna.
   */
  let inVolo: StatoPresenza | null = null

  const manda = (prossimo: StatoPresenza): void => {
    inVolo = prossimo
    void al(prossimo).then((esito) => {
      if (!esito.ok) inVolo = null
    })
  }

  // Pressione lunga e clic partono dallo stesso tocco: se il tempo arriva in
  // fondo si apre il menu e il clic che segue è marcato come speso, così la
  // casella non gira. Il marchio si azzera al tocco dopo.
  let attesa: number | null = null
  let clicSpeso = false

  const fermaAttesa = (): void => {
    if (attesa !== null) {
      clearTimeout(attesa)
      attesa = null
    }
    bottone.classList.remove('stato-presenza--premuto')
  }

  const bottone = h(
    'button',
    {
      class: [
        'stato-presenza',
        // testo-fisso: classe CSS
        stato ? `stato-presenza--${stato}` : 'stato-presenza--misto',
        classe,
      ],
      type: 'button',
      dataset: { fuoco },
      attr: {
        title: testi().suggerimento(
          titolo,
          (stato ? NOMI.get(stato) : undefined) ?? testi().misto,
          minuscolo(NOMI.get(prossimoStato(stato ?? 'non-impostato')) ?? ''),
        ),
        'aria-label': titolo,
        'aria-haspopup': 'menu',
      },
      // Nessuna rotella: l'appello si fa a raffica e la conferma è la lettera che
      // cambia al ridisegno.
      onclick: () => {
        if (clicSpeso) {
          clicSpeso = false
          return
        }
        manda(prossimoStato(inVolo ?? stato ?? 'non-impostato'))
      },
      onpointerdown: (evento: PointerEvent) => {
        clicSpeso = false
        if (evento.button !== 0) return
        fermaAttesa()
        bottone.classList.add('stato-presenza--premuto')
        attesa = window.setTimeout(() => {
          attesa = null
          clicSpeso = true
          bottone.classList.remove('stato-presenza--premuto')
          menuStati(evento, inVolo ?? stato, manda)
        }, PRESSIONE_LUNGA)
      },
      onpointerup: fermaAttesa,
      onpointerleave: fermaAttesa,
      onpointercancel: fermaAttesa,
      // Il tasto destro apre lo stesso menu.
      oncontextmenu: (evento: MouseEvent) => {
        fermaAttesa()
        clicSpeso = true
        menuStati(evento, inVolo ?? stato, manda)
      },
    },
    stato ? SIGLE.get(stato) ?? '?' : '·',
  )

  return bottone
}

/**
 * La matrice dell'appello: persone in riga, unità didattiche in colonna, una
 * casella per UD. La testata di colonna applica lo stato a tutta la classe, il
 * pulsante di riga a tutta l'ora di una persona. Le pause non sono colonne, ma
 * uno stacco fra le colonne.
 */
export function pannelloAppello (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const t = testi()
  if (!classe) {
    return scheda({
      titolo: t.appello,
      contenuto: statoVuoto({ simbolo: 'classi', titolo: t.classeSparita }),
    })
  }
  const L = lessico()

  const allievi = ordinaAllievi(allieviAttivi(classe))
  const ud = unitaDidattiche(lezione, statoPannello.registro.impostazioni.minutiUd)
  const perId = new Map(lezione.presenze.map((p) => [p.allievoId, p]))
  const statiDi = (allievoId: string) => statiAllineati(perId.get(allievoId), ud.length)
  const riepilogo = riepilogaPresenze(allievi.map((a) => ({
    allievoId: a.id,
    stati: statiDi(a.id),
  })))

  // Quel che manca si dice per primo: con caselle vuote i conti dei presenti ingannano.
  const daFare = riepilogo.udSenzaAppello
  const sottotitolo =
    (daFare > 0 ? t.daFare(daFare) : '') +
    t.presenti(riepilogo.presenti, riepilogo.totale - riepilogo.senzaAppello, ud.length) +
    (riepilogo.udAssenza > 0 ? t.udAssenza(riepilogo.udAssenza) : '')

  /** Una riga di allievo: il nome, il pulsante di riga, e una casella per UD. */
  const rigaAllievo = (allievo: Allievo): HTMLElement => {
    const presenza = perId.get(allievo.id)
    const stati = statiDi(allievo.id)
    const inRitardo = stati.some((st) => st === 'ritardo')
    const storta = stati.some(segnato)

    return h(
      'tr',
      { class: ['appello__riga', storta && 'appello__riga--segnata'] },
      h(
        'th',
        { class: 'appello__nome', attr: { scope: 'row' } },
        pulsanteStato({
          stato: statoUniforme(stati),
          titolo: t.tuttaLOra(nomeCompleto(allievo)),
          // testo-fisso: chiave di fuoco
          fuoco: `riga-${allievo.id}`,
          classe: 'stato-presenza--riga',
          al: (stato) =>
            azione({ tipo: 'presenze.riga', lezioneId: lezione.id, allievoId: allievo.id, stato }),
        }),
        h('span', { class: 'appello__cognome' }, nomeCompleto(allievo)),
      ),
      ...ud.map((unita) =>
        h(
          'td',
          { class: ['appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco'] },
          pulsanteStato({
            stato: stati[unita.indice],
            titolo: t.cella(nomeCompleto(allievo), unita.indice + 1, unita.inizio, unita.fine),
            // testo-fisso: chiave di fuoco
            fuoco: `ud-${allievo.id}-${unita.indice}`,
            al: (stato) =>
              azione({
                tipo: 'presenze.ud',
                lezioneId: lezione.id,
                allievoId: allievo.id,
                ud: unita.indice,
                stato,
              }),
          }),
        ),
      ),
      h(
        'td',
        { class: 'appello__minuti' },
        // I minuti solo dove c'è un ritardo.
        inRitardo
          ? h('input', {
              class: 'campo__controllo campo__controllo--minuti',
              type: 'number',
              value: String(presenza?.minuti ?? 0),
              // testo-fisso: chiave di fuoco
              dataset: { fuoco: `minuti-${allievo.id}` },
              // Senza passo: con un passo il browser rifiuterebbe i sette minuti.
              attr: {
                min: 0,
                max: 240,
                step: 'any',
                'aria-label': t.minutiRitardo(nomeCompleto(allievo)),
              },
              onchange: (evento: Event) =>
                void scriviRiga(lezione, allievo.id, {
                  minuti: Number((evento.target as HTMLInputElement).value),
                }),
            })
          : null,
      ),
      h(
        'td',
        { class: 'appello__nota' },
        h('input', {
          class: 'campo__controllo',
          type: 'text',
          value: presenza?.nota ?? '',
          placeholder: t.nota,
          // testo-fisso: chiave di fuoco
          dataset: { fuoco: `nota-${allievo.id}` },
          attr: { 'aria-label': t.notaSu(nomeCompleto(allievo)) },
          onchange: (evento: Event) =>
            void scriviRiga(lezione, allievo.id, {
              nota: (evento.target as HTMLInputElement).value,
            }),
        }),
      ),
    )
  }

  const nonImpostato = minuscolo(L.presenze['non-impostato'])
  return scheda({
    titolo: t.appello,
    sottotitolo,
    azioni: [
      pulsante({
        testo: t.tuttiPresenti,
        variante: 'sottile',
        simbolo: 'spunta',
        al: () =>
          eseguiOAvvisa(
            { tipo: 'presenze.tutti', lezioneId: lezione.id, stato: 'presente' },
            t.fatto,
          ),
      }),
      // Rimettere tutto a non detto cancella l'appello intero: si chiede conferma.
      pulsante({
        testo: t.azzera,
        variante: 'sottile',
        simbolo: 'ricarica',
        titolo: t.azzeraTitolo(nonImpostato),
        al: async () => {
          const sicuro = await conferma({
            titolo: t.azzerareTitolo,
            testo: t.azzerareTesto(nonImpostato),
            testoConferma: t.azzera,
            pericolo: true,
          })
          if (!sicuro) return
          await eseguiOAvvisa(
            { tipo: 'presenze.tutti', lezioneId: lezione.id, stato: 'non-impostato' },
            t.azzerato,
          )
        },
      }),
    ],
    classe: 'scheda--appello',
    contenuto:
      allievi.length === 0
        ? statoVuoto({
            simbolo: 'utente',
            titolo: t.nessuno,
            azione: pulsante({
              testo: t.vaiAllaClasse,
              variante: 'primario',
              al: () => aggiorna({ vista: 'classi', classeId: classe.id }),
            }),
          })
        : tabella({
            classi: { telaio: 'appello__telaio', tabella: 'appello' },
            intestazione: [
              h('th', { class: 'appello__nome', attr: { scope: 'col' } }, Uno(L.pif)),
              ...ud.map((unita) => {
                const colonna = allievi.map((a) => statiDi(a.id)[unita.indice])
                return h(
                  'th',
                  {
                    class: ['appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco'],
                    attr: { scope: 'col' },
                  },
                  h(
                    'span',
                    { class: 'appello__ud' },
                    `${corto(L.unitaDidattica)} ${unita.indice + 1}`,
                  ),
                  h('span', { class: 'appello__ora' }, unita.inizio),
                  pulsanteStato({
                    stato: statoUniforme(colonna),
                    titolo: t.colonna(unita.indice + 1, unita.inizio, unita.fine),
                    // testo-fisso: chiave di fuoco
                    fuoco: `colonna-${unita.indice}`,
                    classe: 'stato-presenza--colonna',
                    al: (stato) =>
                      azione({
                        tipo: 'presenze.colonna',
                        lezioneId: lezione.id,
                        ud: unita.indice,
                        stato,
                      }),
                  }),
                )
              }),
              h('th', { class: 'appello__minuti', attr: { scope: 'col' } }, t.minuti),
              h('th', { class: 'appello__nota', attr: { scope: 'col' } }, t.nota),
            ],
            righe: allievi.map(rigaAllievo),
          }),
  })
}

/**
 * Minuti e nota di una riga, mandati da soli: rimandare tutta
 * `presenze.imposta` con gli allievi attivi cancellerebbe l'appello di chi si
 * è ritirato.
 */
async function scriviRiga (
  lezione: Lezione,
  allievoId: string,
  campi: Partial<Pick<Presenza, 'minuti' | 'nota'>>,
): Promise<void> {
  await azione({ tipo: 'presenze.campi', lezioneId: lezione.id, allievoId, ...campi })
}
