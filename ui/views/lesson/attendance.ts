// L'appello dell'ora: la matrice delle presenze, persone in riga e unità
// didattiche in colonna, con il pulsante che gira gli stati a ogni clic e il
// menu che li nomina tutti a pressione lunga.

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  ammetteRitardo,
  minutiRitardoUd,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  segnato,
  statiAllineati,
  unitaDidattiche,
} from '#core/dominio/calculations.js'
import { Uno, corto } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { minuscolo } from '#core/i18n/index.js'
import type { Allievo, Lezione, StatoPresenza } from '#core/dominio/models.js'
import { pulsante, scheda, statoVuoto } from '#ui/components/base.js'
import { icona } from '#ui/components/icons.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { frecceNellaGriglia } from '#ui/components/gridArrows.js'
import { statoInVolo } from '#ui/components/inFlight.js'
import { menuContestuale } from '#ui/components/menu.js'
import { conferma } from '#ui/components/modal.js'
import { h } from '#ui/dom.js'
import { azione } from '#ui/bridge.js'
import type { Risposta } from '#contract/protocol.js'
import { classeDiLezione, stato as statoPannello, vai } from '#ui/state.js'
import { inTelaio, tabella } from '#ui/components/table.js'
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

/** Gli stati che una casella offre: senza ritardo dove non si può arrivare tardi. */
function statiDi (conRitardo: boolean): typeof STATI {
  return conRitardo ? STATI : STATI.filter((v) => v.valore !== 'ritardo')
}

/** Lo stato dopo questo, girando in tondo fra quelli offerti. */
function prossimoStato (stato: StatoPresenza, conRitardo = true): StatoPresenza {
  const giro = statiDi(conRitardo)
  const posto = STATI.findIndex((v) => v.valore === stato)
  // Il seguente nel giro completo che la casella offre: da una «R» già scritta
  // dove non va si prosegue come se ci fosse.
  for (let passo = 1; passo <= STATI.length; passo++) {
    const candidato = STATI[(posto + passo) % STATI.length]
    if (giro.includes(candidato)) return candidato.valore
  }
  return 'non-impostato'
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
  conRitardo: boolean,
  al: (stato: StatoPresenza) => void,
): void {
  menuContestuale(
    evento,
    statiDi(conRitardo).map((v) => ({
      testo: `${v.sigla} — ${NOMI.get(v.valore) ?? v.nome}`,
      simbolo: v.valore === attuale ? ('spunta' as const) : undefined,
      al: () => al(v.valore),
    })),
  )
}

/**
 * Lo stato che ogni casella ha mandato e non ha ancora visto tornare. `stato`
 * resta quello del ridisegno finché l'host non rispinge il registro, e un
 * secondo clic rapido ricalcolerebbe lo stesso stato del primo: si riparte da
 * quel che si è mandato. Vale anche per le caselle di riga e di colonna.
 */
const inVolo = statoInVolo<StatoPresenza>()

/**
 * Esportata per le prove di regressione: i clic a raffica partono dallo stato
 * in volo, non dal disegno.
 */
export function pulsanteStato (opzioni: {
  stato: StatoPresenza | null
  titolo: string
  fuoco: string
  /** Il nome della casella fra due ridisegni, per lo stato in volo; di norma `fuoco`. */
  chiave?: string
  classe?: string
  /** Falso dove non si può arrivare in ritardo: il giro e il menu saltano «R». */
  conRitardo?: boolean
  al: (prossimo: StatoPresenza) => Promise<Risposta>
}): HTMLElement {
  const { stato, titolo, fuoco, classe, conRitardo = true, al } = opzioni
  const chiave = opzioni.chiave ?? fuoco

  /** Lo stato da cui parte un gesto: quello in volo, o il disegnato. */
  const attuale = (): StatoPresenza | null => inVolo.da(chiave, stato)
  const manda = (prossimo: StatoPresenza): void => {
    void inVolo.manda(chiave, prossimo, () => al(prossimo))
  }

  // Pressione lunga e clic partono dallo stesso tocco: se il tempo arriva in
  // fondo si apre il menu e il clic che segue è marcato come speso, così la
  // casella non gira. Il marchio si azzera al tocco dopo.
  let attesa: number | null = null
  let clicSpeso = false
  /**
   * Il pulsante che si sta premendo, preso dall'evento: dopo un ridisegno
   * `bottone` può essere quello scartato.
   */
  let premuto: HTMLElement | null = null

  const fermaAttesa = (): void => {
    if (attesa !== null) {
      clearTimeout(attesa)
      attesa = null
    }
    ;(premuto ?? bottone).classList.remove('stato-presenza--premuto')
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
          minuscolo(NOMI.get(prossimoStato(stato ?? 'non-impostato', conRitardo)) ?? ''),
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
        manda(prossimoStato(attuale() ?? 'non-impostato', conRitardo))
      },
      onpointerdown: (evento: PointerEvent) => {
        clicSpeso = false
        if (evento.button !== 0) return
        fermaAttesa()
        premuto = evento.currentTarget as HTMLElement
        premuto.classList.add('stato-presenza--premuto')
        attesa = window.setTimeout(() => {
          attesa = null
          clicSpeso = true
          ;(premuto ?? bottone).classList.remove('stato-presenza--premuto')
          menuStati(evento, attuale(), conRitardo, manda)
        }, PRESSIONE_LUNGA)
      },
      onpointerup: fermaAttesa,
      onpointerleave: fermaAttesa,
      onpointercancel: fermaAttesa,
      // Il tasto destro apre lo stesso menu.
      oncontextmenu: (evento: MouseEvent) => {
        fermaAttesa()
        clicSpeso = true
        menuStati(evento, attuale(), conRitardo, manda)
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

  /**
   * Una riga di allievo: il nome, il pulsante di riga, una casella per UD con
   * i minuti di ritardo in apice, e la nota.
   */
  const rigaAllievo = (allievo: Allievo): HTMLElement => {
    const presenza = perId.get(allievo.id)
    const stati = statiDi(allievo.id)
    const storta = stati.some(segnato)
    const nome = nomeCompleto(allievo)

    return h(
      'tr',
      { class: ['appello__riga', storta && 'appello__riga--segnata'] },
      h(
        'th',
        { class: 'appello__nome', attr: { scope: 'row' } },
        pulsanteStato({
          stato: statoUniforme(stati),
          titolo: t.tuttaLOra(nome),
          // testo-fisso: chiave di fuoco
          fuoco: `riga-${allievo.id}`,
          chiave: `${lezione.id}|riga-${allievo.id}`,
          classe: 'stato-presenza--riga',
          // Una riga copre tutta l'ora: il ritardo va solo sulla sua UD.
          conRitardo: ud.every(ammetteRitardo),
          al: (stato) =>
            azione({ tipo: 'presenze.riga', lezioneId: lezione.id, allievoId: allievo.id, stato }),
        }),
        h('span', { class: 'appello__cognome' }, nome),
      ),
      ...ud.map((unita) =>
        h(
          'td',
          { class: ['appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco'] },
          h(
            'span',
            { class: 'appello__casella' },
            pulsanteStato({
              stato: stati[unita.indice],
              titolo: t.cella(nome, unita.indice + 1, unita.inizio, unita.fine),
              // testo-fisso: chiave di fuoco
              fuoco: `ud-${allievo.id}-${unita.indice}`,
              chiave: `${lezione.id}|ud-${allievo.id}-${unita.indice}`,
              conRitardo: ammetteRitardo(unita),
              al: (stato) =>
                azione({
                  tipo: 'presenze.ud',
                  lezioneId: lezione.id,
                  allievoId: allievo.id,
                  ud: unita.indice,
                  stato,
                }),
            }),
            // I minuti solo dove c'è un ritardo: uno per UD, perché in un'ora
            // si può arrivare tardi più d'una volta.
            stati[unita.indice] === 'ritardo'
              ? apiceMinuti({
                  minuti: minutiRitardoUd(presenza, unita.indice),
                  titolo: t.minutiRitardo(nome, unita.indice + 1),
                  // testo-fisso: chiave di fuoco
                  fuoco: `minuti-${allievo.id}-${unita.indice}`,
                  al: (minuti) =>
                    void scriviRiga(lezione, allievo.id, { ud: unita.indice, minuti }),
                })
              : null,
          ),
        ),
      ),
      h(
        'td',
        { class: 'appello__nota' },
        campoNota({
          nota: presenza?.nota ?? '',
          titolo: t.notaSu(nome),
          segnaposto: t.nota,
          // testo-fisso: chiave di fuoco
          fuoco: `nota-${allievo.id}`,
          al: (nota) => void scriviRiga(lezione, allievo.id, { nota }),
        }),
      ),
    )
  }

  const nonImpostato = minuscolo(L.presenze['non-impostato'])
  return inTelaio(scheda({
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
              al: () => { vai({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: classe.id } }) },
            }),
          })
        : conLeFrecce(tabella({
            classi: { telaio: 'appello__telaio', tabella: 'appello' },
            // Stesso nodo fra due clic, se la catena regge; se no almeno lo
            // scorrimento si rimette: a ogni presenza segnata non si torna a sinistra.
            telaio: 'appello',
            // testo-fisso: una chiave, non un testo
            scorrimento: `appello:${lezione.id}`,
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
                    chiave: `${lezione.id}|colonna-${unita.indice}`,
                    classe: 'stato-presenza--colonna',
                    conRitardo: ammetteRitardo(unita),
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
              h('th', { class: 'appello__nota', attr: { scope: 'col' } }, t.nota),
            ],
            righe: allievi.map(rigaAllievo),
          })),
  }), 'appello')
}

/**
 * Le frecce fra le caselle dell'appello, pulsante di riga compreso; nei minuti
 * e nella nota restano del campo.
 */
function conLeFrecce (griglia: HTMLElement): HTMLElement {
  frecceNellaGriglia(griglia, '.stato-presenza')
  return griglia
}

/**
 * Un campo che sta chiuso dietro un pulsante e si apre al clic, preso il
 * fuoco. Uscendone si richiude se `chiudi` lo dice: la tabella resta stretta
 * finché non c'è niente da scrivere.
 */
function apribile (
  chiuso: HTMLElement,
  apri: () => HTMLInputElement,
  chiudi: (campo: HTMLInputElement) => boolean,
): HTMLElement {
  chiuso.addEventListener('click', () => {
    const campo = apri()
    campo.addEventListener('blur', () => {
      if (campo.isConnected && chiudi(campo)) campo.replaceWith(chiuso)
    })
    campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') campo.blur()
      if (evento.key === 'Escape') campo.replaceWith(chiuso)
    })
    chiuso.replaceWith(campo)
    campo.focus()
    campo.select()
  })
  return chiuso
}

/**
 * I minuti di ritardo di una casella, in apice sul suo pulsante: «+» finché
 * non sono detti, poi il numero. Al clic diventa il campo; uscendo si torna
 * all'apice, e il ridisegno porta il numero nuovo.
 */
function apiceMinuti (opzioni: {
  minuti: number
  titolo: string
  fuoco: string
  al: (minuti: number) => void
}): HTMLElement {
  const { minuti, titolo, fuoco, al } = opzioni
  const apice = h(
    'button',
    {
      class: ['appello__apice', minuti > 0 && 'appello__apice--detto'],
      type: 'button',
      dataset: { fuoco },
      attr: { title: titolo, 'aria-label': titolo },
    },
    // testo-fisso: i minuti con il loro segno
    minuti > 0 ? `${minuti}′` : icona('piu'),
  )
  return apribile(
    apice,
    () =>
      h('input', {
        class: 'campo__controllo campo__controllo--minuti appello__apice-campo',
        type: 'number',
        value: minuti > 0 ? String(minuti) : '',
        dataset: { fuoco },
        // Senza passo: con un passo il browser rifiuterebbe i sette minuti.
        attr: { min: 0, max: 600, step: 'any', 'aria-label': titolo },
        onchange: (evento: Event) => {
          const scritti = Number((evento.target as HTMLInputElement).value)
          al(Number.isFinite(scritti) ? Math.max(0, Math.round(scritti)) : 0)
        },
      }),
    () => true,
  )
}

/**
 * La nota di una riga: un «+» finché è vuota, il campo quando c'è. Aperto e
 * lasciato vuoto, al primo clic fuori torna «+».
 */
function campoNota (opzioni: {
  nota: string
  titolo: string
  segnaposto: string
  fuoco: string
  al: (nota: string) => void
}): HTMLElement {
  const { nota, titolo, segnaposto, fuoco, al } = opzioni
  const campo = (): HTMLInputElement =>
    h('input', {
      class: 'campo__controllo',
      type: 'text',
      value: nota,
      placeholder: segnaposto,
      dataset: { fuoco },
      attr: { 'aria-label': titolo },
      onchange: (evento: Event) => al((evento.target as HTMLInputElement).value),
    })
  if (nota) return campo()
  return apribile(
    h(
      'button',
      {
        class: 'appello__aggiungi-nota',
        type: 'button',
        dataset: { fuoco },
        attr: { title: titolo, 'aria-label': titolo },
      },
      icona('piu'),
    ),
    campo,
    (aperto) => !aperto.value.trim(),
  )
}

/**
 * Minuti e nota di una riga, mandati da soli: rimandare tutta
 * `presenze.imposta` con gli allievi attivi cancellerebbe l'appello di chi si
 * è ritirato.
 */
async function scriviRiga (
  lezione: Lezione,
  allievoId: string,
  campi: { ud?: number; minuti?: number; nota?: string },
): Promise<void> {
  await azione({ tipo: 'presenze.campi', lezioneId: lezione.id, allievoId, ...campi })
}
