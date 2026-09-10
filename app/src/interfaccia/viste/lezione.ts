// Il dettaglio di una lezione: la schermata che si tiene aperta durante l'ora.
//
// È divisa in due colonne perché così si usa: a sinistra quello che si fa
// mentre la lezione va avanti — appello e osservazioni — a destra quello che si
// guarda e si scrive intorno — la scaletta, gli argomenti, il consuntivo.
//
// Tutto si salva da sé. L'appello parte al primo clic, i testi al momento in
// cui si lascia il campo: durante un'ora nessuno ha voglia di cercare un
// pulsante «Salva».

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  avanzamentoPiano,
  confrontaPianoConLezione,
  distribuzione,
  distribuzioneAPunti,
  fineLezione,
  formattaVoto,
  inizioLezione,
  minutiDiAttivita,
  minutiEffettivi,
  minutiTotali,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  scalettaSulleUd,
  segnato,
  siglaPresenza,
  statiAllineati,
  unitaDidattiche,
} from '../../dominio/calcoli.js'
import { attivitaValutata, nomeTipoAttivita, riassuntoParametri } from '../../dominio/attivita.js'
import { PIF, Uno } from '../../dominio/lessico.js'
import { formattaData, formattaDurata } from '../../dominio/date.js'
import type {
  Allievo,
  Attivita,
  Lezione,
  MomentoValutazione,
  Osservazione,
  Presenza,
  Risorsa,
  StatoAttivita,
  StatoPresenza,
} from '../../dominio/modelli.js'
import {
  barra,
  campo,
  datoSintetico,
  pastiglia,
  pulsante,
  scheda,
  selettore,
  statoVuoto,
  testataVista,
  type TonoPastiglia,
} from '../componenti/base.js'
import { eseguiOAvvisa } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { menuContestuale } from '../componenti/menu.js'
import { conferma } from '../componenti/modale.js'
import { notifica } from '../componenti/notifiche.js'
import { h, type Figlio } from '../dom.js'
import { pannelloConsegne } from './consegne.js'
import { bloccoRecuperiDellOra } from './recuperi.js'
import { pannelloRiconsegneDellOra } from './riconsegne.js'
import { graficoNote } from '../componenti/note.js'
import { grigliaVoti } from './valutazioni.js'
import {
  moduloPiano,
  moduloAssegnaPiano,
  moduloLezione,
  moduloOsservazione,
} from '../moduli.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  classeDelCorsoId,
  classeDiLezione,
  corsiVisibili,
  lezioneDiRiferimento,
  lezionePerId,
  lezioniDiCorso,
  nomeMateria,
  pianoPerId,
  stato,
  titoloDiLezione,
  uriDato,
  type SchedaLezione,
} from '../stato.js'

// ------------------------------------------------------------------ presenze

/**
 * Gli stati dell'appello, nell'ordine in cui il pulsante li gira.
 *
 * Si parte da «–», che vuol dire che nessuno ha ancora detto niente: è così
 * che ogni casella nasce, ed è l'unico modo per distinguere un appello fatto
 * con tutti in classe da un appello mai cominciato. Il primo clic dice
 * «presente», che è il caso normale; poi l'assenza, che è quel che si segna
 * dieci volte per una; poi il ritardo e l'esonero, che sono rari. Girando fino
 * in fondo si torna a «–», e una casella toccata per sbaglio si può rimettere
 * a non detta.
 */
const STATI = SIGLE_PRESENZA

const SIGLE = new Map(STATI.map((v) => [v.valore, v.sigla]))
const NOMI = new Map(STATI.map((v) => [v.valore, v.nome]))

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

/**
 * Il pulsante dell'appello: uno solo, che a ogni clic passa allo stato dopo.
 *
 * Erano sei pulsanti per riga, uno per stato, e con quattro unità didattiche
 * sarebbero ventiquattro pulsanti per allievo — una parete di lettere in cui
 * la classe si perde. Uno solo dice quel che c'è scritto adesso e lo cambia
 * dove lo si sta guardando: il dito resta dov'è e l'occhio pure.
 *
 * Su un gruppo mescolato non c'è uno stato da cui ripartire, e allora si parte
 * dal non detto: il primo clic su una colonna disordinata la mette tutta a
 * presente, che è il modo in cui la si rimette in riga.
 */
/** Quanto va tenuto premuto un pulsante prima che si apra il menu, in ms. */
const PRESSIONE_LUNGA = 450

/**
 * Il menu degli stati: tutti quanti, senza girare il pulsante fino a lì.
 *
 * Il giro a clic è la via veloce per il caso normale — presente, assente — ma
 * per arrivare a «esonerato» da «presente» servono tre clic, e chi corregge
 * una casella sbagliata li fa a occhio, rischiando di superarla e ricominciare.
 * Tenendo premuto si sceglie lo stato per nome, in un colpo solo. La spunta
 * dice qual è quello di adesso, così il menu si legge anche senza guardare
 * la casella sotto al dito.
 */
function menuStati (
  evento: MouseEvent,
  attuale: StatoPresenza | null,
  al: (stato: StatoPresenza) => void,
): void {
  menuContestuale(
    evento,
    STATI.map((v) => ({
      testo: `${v.sigla} — ${v.nome}`,
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
  al: (prossimo: StatoPresenza) => void
}): HTMLElement {
  const { stato, titolo, fuoco, classe, al } = opzioni

  // La pressione lunga e il clic sono lo stesso gesto finché non si sa quanto
  // dura: il conto parte al tocco e, se arriva in fondo, apre il menu e marca
  // il clic che seguirà come già speso — altrimenti la casella girerebbe anche
  // di uno stato mentre il menu si apre. Il marchio si azzera al tocco dopo,
  // così un menu chiuso col tasto destro non si porta via il clic successivo.
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
        stato ? `stato-presenza--${stato}` : 'stato-presenza--misto',
        classe,
      ],
      type: 'button',
      dataset: { fuoco },
      attr: {
        title: `${titolo} — ora ${stato ? NOMI.get(stato) : 'misto'}, clic per ${NOMI.get(prossimoStato(stato ?? 'non-impostato'))?.toLowerCase()}, premi a lungo per scegliere`,
        'aria-label': titolo,
        'aria-haspopup': 'menu',
      },
      // Nessuna rotella qui: l'appello si fa a raffica, la scrittura e' locale
      // e la conferma e' la casella che cambia lettera al ridisegno. Un
      // pulsante che si spegne a ogni clic renderebbe il giro piu' lento di
      // quanto la risposta non sia gia'.
      onclick: () => {
        if (clicSpeso) {
          clicSpeso = false
          return
        }
        al(prossimoStato(stato ?? 'non-impostato'))
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
          menuStati(evento, stato, al)
        }, PRESSIONE_LUNGA)
      },
      onpointerup: fermaAttesa,
      onpointerleave: fermaAttesa,
      onpointercancel: fermaAttesa,
      // Il tasto destro arriva allo stesso menu: su un mouse è il gesto che
      // tutti provano per primo, e tenere premuto per mezzo secondo con la
      // mano già sul mouse non lo sostituisce.
      oncontextmenu: (evento: MouseEvent) => {
        fermaAttesa()
        clicSpeso = true
        menuStati(evento, stato, al)
      },
    },
    stato ? SIGLE.get(stato) ?? '?' : '·',
  )

  return bottone
}

/**
 * La matrice dell'appello: le persone in riga, le unità didattiche in colonna.
 *
 * Un blocco di due ore sono quattro UD, e con un solo stato per lezione chi
 * arrivava alla terza risultava «in ritardo» come chi era arrivato con cinque
 * minuti di scarto: le due UD perse sparivano dai conti proprio quando servono,
 * a fine semestre. Qui ogni UD ha la sua casella.
 *
 * Le caselle non si toccano una per una quando non serve: la testata di ogni
 * colonna ha lo stesso pulsante e lo applica a tutta la classe — l'ora in cui
 * la classe era in assemblea si segna in un clic — e in testa a ogni riga ce
 * n'è un altro per chi oggi non c'è proprio.
 *
 * Le pause non sono colonne: durante la pausa non si fa appello. Si vedono
 * come uno stacco fra le colonne che separano.
 */
function pannelloAppello (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  if (!classe) {
    return scheda({
      titolo: 'Appello',
      contenuto: statoVuoto({ simbolo: 'classi', titolo: 'La classe di questa lezione non esiste più' }),
    })
  }

  const allievi = ordinaAllievi(allieviAttivi(classe))
  const ud = unitaDidattiche(lezione)
  const perId = new Map(lezione.presenze.map((p) => [p.allievoId, p]))
  const statiDi = (allievoId: string) => statiAllineati(perId.get(allievoId), ud.length)
  const riepilogo = riepilogaPresenze(allievi.map((a) => ({
    allievoId: a.id,
    stati: statiDi(a.id),
  })))

  // Quel che manca si dice per primo: un appello a metà è la cosa che si sta
  // guardando, e «18 presenti su 20» detto con sei caselle vuote è una bugia.
  const daFare = riepilogo.udSenzaAppello
  const sottotitolo =
    (daFare > 0
      ? `${daFare} caselle da fare · `
      : '') +
    `${riepilogo.presenti} presenti su ${riepilogo.totale - riepilogo.senzaAppello} · ${ud.length} UD` +
    (riepilogo.udAssenza > 0 ? ` · ${riepilogo.udAssenza} UD di assenza` : '')

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
          titolo: `Tutta l’ora di ${nomeCompleto(allievo)}`,
          fuoco: `riga-${allievo.id}`,
          classe: 'stato-presenza--riga',
          al: (stato) =>
            void azione({ tipo: 'presenze.riga', lezioneId: lezione.id, allievoId: allievo.id, stato }),
        }),
        h('span', { class: 'appello__cognome' }, nomeCompleto(allievo)),
      ),
      ...ud.map((unita) =>
        h(
          'td',
          { class: ['appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco'] },
          pulsanteStato({
            stato: stati[unita.indice],
            titolo: `${nomeCompleto(allievo)}, UD ${unita.indice + 1} (${unita.inizio}–${unita.fine})`,
            fuoco: `ud-${allievo.id}-${unita.indice}`,
            al: (stato) =>
              void azione({
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
        // I minuti hanno senso solo dove c'è un ritardo: altrove la casella non
        // c'è, invece di restare vuota a chiedersi che cosa vorrebbe.
        inRitardo
          ? h('input', {
              class: 'campo__controllo campo__controllo--minuti',
              type: 'number',
              value: String(presenza?.minuti ?? 0),
              dataset: { fuoco: `minuti-${allievo.id}` },
              // Senza passo: un ritardo di sette minuti è sette minuti, e con
              // un passo da cinque il browser lo rifiutava senza spiegarsi.
              attr: {
                min: 0,
                max: 240,
                step: 'any',
                'aria-label': `Minuti di ritardo di ${nomeCompleto(allievo)}`,
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
          placeholder: 'nota',
          dataset: { fuoco: `nota-${allievo.id}` },
          attr: { 'aria-label': `Nota su ${nomeCompleto(allievo)}` },
          onchange: (evento: Event) =>
            void scriviRiga(lezione, allievo.id, {
              nota: (evento.target as HTMLInputElement).value,
            }),
        }),
      ),
    )
  }

  return scheda({
    titolo: 'Appello',
    sottotitolo,
    azioni: [
      pulsante({
        testo: 'Tutti presenti',
        variante: 'sottile',
        simbolo: 'spunta',
        al: () =>
          eseguiOAvvisa(
            { tipo: 'presenze.tutti', lezioneId: lezione.id, stato: 'presente' },
            'Appello fatto: tutti presenti su tutte le UD.',
          ),
      }),
      // Rimettere tutto a non detto: serve dopo un clic sbagliato su «tutti
      // presenti», ma cancella l'appello intero senza rete — si chiede conferma
      // prima, come per ogni cancellazione che non si può disfare.
      pulsante({
        testo: 'Azzera',
        variante: 'sottile',
        simbolo: 'ricarica',
        titolo: 'Rimette ogni casella a «non impostato»',
        al: async () => {
          const sicuro = await conferma({
            titolo: 'Azzerare l’appello?',
            testo: 'Ogni casella dell’ora torna a «non impostato»: non si può disfare.',
            testoConferma: 'Azzera',
            pericolo: true,
          })
          if (!sicuro) return
          await eseguiOAvvisa(
            { tipo: 'presenze.tutti', lezioneId: lezione.id, stato: 'non-impostato' },
            'Appello azzerato: nessuna casella impostata.',
          )
        },
      }),
    ],
    classe: 'scheda--appello',
    contenuto:
      allievi.length === 0
        ? statoVuoto({
            simbolo: 'utente',
            titolo: `Nessuna ${PIF.singolare} nella classe`,
            azione: pulsante({
              testo: 'Vai alla classe',
              variante: 'primario',
              al: () => aggiorna({ vista: 'classi', classeId: classe.id }),
            }),
          })
        : h(
            'div',
            { class: 'appello__telaio' },
            h(
              'table',
              { class: 'appello' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', { class: 'appello__nome', attr: { scope: 'col' } }, Uno(PIF)),
                  ...ud.map((unita) => {
                    const colonna = allievi.map((a) => statiDi(a.id)[unita.indice])
                    return h(
                      'th',
                      {
                        class: ['appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco'],
                        attr: { scope: 'col' },
                      },
                      h('span', { class: 'appello__ud' }, `UD ${unita.indice + 1}`),
                      h('span', { class: 'appello__ora' }, unita.inizio),
                      pulsanteStato({
                        stato: statoUniforme(colonna),
                        titolo: `Tutta la classe, UD ${unita.indice + 1} (${unita.inizio}–${unita.fine})`,
                        fuoco: `colonna-${unita.indice}`,
                        classe: 'stato-presenza--colonna',
                        al: (stato) =>
                          void azione({
                            tipo: 'presenze.colonna',
                            lezioneId: lezione.id,
                            ud: unita.indice,
                            stato,
                          }),
                      }),
                    )
                  }),
                  h('th', { class: 'appello__minuti', attr: { scope: 'col' } }, 'min'),
                  h('th', { class: 'appello__nota', attr: { scope: 'col' } }, 'nota'),
                ),
              ),
              h('tbody', null, ...allievi.map(rigaAllievo)),
            ),
          ),
  })
}

/**
 * Minuti e nota di una riga: si mandano da soli, senza passare dall'elenco
 * intero degli allievi attivi. Rimandare tutta `presenze.imposta` da qui
 * cancellerebbe per sempre l'appello di chi si è ritirato — la matrice non lo
 * elenca più, e la lista ricostruita da qui non lo saprebbe.
 */
async function scriviRiga (
  lezione: Lezione,
  allievoId: string,
  campi: Partial<Pick<Presenza, 'minuti' | 'nota'>>,
): Promise<void> {
  await azione({ tipo: 'presenze.campi', lezioneId: lezione.id, allievoId, ...campi })
}

// ------------------------------------------------------------------ osservazioni

const TONI_OSSERVAZIONE: Record<Osservazione['tipo'], TonoPastiglia> = {
  nota: 'neutro',
  merito: 'positivo',
  disciplina: 'negativo',
  compiti: 'attenzione',
  materiale: 'attenzione',
  colloquio: 'informativo',
}

function pannelloOsservazioni (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])

  return scheda({
    titolo: 'Osservazioni',
    sottotitolo: 'annotazioni sull’andamento, sulla classe o sul singolo',
    azioni: pulsante({
      testo: 'Aggiungi',
      simbolo: 'piu',
      variante: 'sottile',
      al: () => moduloOsservazione(lezione, classe),
    }),
    contenuto:
      lezione.osservazioni.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessuna osservazione registrata.')
        : h(
            'ul',
            { class: 'osservazioni' },
            ...[...lezione.osservazioni]
              .sort((a, b) => (a.ora ?? '').localeCompare(b.ora ?? '') || a.creataIl.localeCompare(b.creataIl))
              .map((osservazione) =>
                h(
                  'li',
                  { class: 'osservazione' },
                  h(
                    'div',
                    { class: 'osservazione__testata' },
                    pastiglia(osservazione.tipo, TONI_OSSERVAZIONE[osservazione.tipo]),
                    h(
                      'span',
                      { class: 'osservazione__chi' },
                      osservazione.allievoId
                        ? nomi.get(osservazione.allievoId) ?? `${PIF.singolare} non più in elenco`
                        : 'tutta la classe',
                    ),
                    osservazione.ora ? h('span', { class: 'osservazione__ora' }, osservazione.ora) : null,
                    pulsante({
                      simbolo: 'matita',
                      variante: 'fantasma',
                      titolo: 'Modifica',
                      al: () => moduloOsservazione(lezione, classe, osservazione),
                    }),
                  ),
                  h('p', { class: 'osservazione__testo' }, osservazione.testo),
                ),
              ),
          ),
  })
}

// ------------------------------------------------------------------ piano

const STATI_ATTIVITA: Array<{ valore: StatoAttivita; sigla: string; nome: string }> = [
  { valore: 'da-fare', sigla: '·', nome: 'Da fare' },
  { valore: 'svolta', sigla: '✓', nome: 'Svolta' },
  { valore: 'parziale', sigla: '~', nome: 'Fatta in parte' },
  { valore: 'saltata', sigla: '×', nome: 'Saltata' },
]

/**
 * Le risorse di un piano viste dall'aula: si aprono e basta.
 *
 * Qui non si aggiunge e non si modifica niente — quello si fa nella vista
 * Piani, prima. Durante l'ora servono un elenco corto e un bersaglio grande su
 * cui premere, non un editor.
 */
function risorseDaAula (
  pianoId: string,
  attivitaId: string | null,
  risorse: Risorsa[],
): HTMLElement | null {
  if (risorse.length === 0) return null

  return h(
    'ul',
    { class: 'risorse__elenco risorse__elenco--aula' },
    ...risorse.map((risorsa) => {
      const apri = () =>
        void azione({ tipo: 'risorsa.apri', pianoId, attivitaId, risorsaId: risorsa.id })
      const indirizzo = risorsa.tipo === 'immagine' ? uriDato(risorsa.file) : null

      return h(
        'li',
        { class: `risorsa risorsa--${risorsa.tipo}` },
        indirizzo
          ? h('img', {
              class: 'risorsa__miniatura',
              attr: { src: indirizzo, alt: risorsa.titolo, loading: 'lazy' },
              onclick: apri,
            })
          : icona(risorsa.tipo === 'collegamento' ? 'collegamento' : 'documento', 'risorsa__simbolo'),
        h(
          'div',
          { class: 'risorsa__corpo' },
          h(
            'button',
            { class: 'collegamento', type: 'button', onclick: apri },
            risorsa.titolo || 'senza titolo',
          ),
          risorsa.note ? h('p', { class: 'risorsa__note' }, risorsa.note) : null,
        ),
      )
    }),
  )
}

function pannelloPiano (lezione: Lezione): HTMLElement {
  const piano = pianoPerId(lezione.pianoId)

  if (!piano) {
    return scheda({
      titolo: 'Piano lezione',
      contenuto: statoVuoto({
        simbolo: 'piano',
        titolo: 'Nessun piano assegnato',
        testo: 'Il piano è la scaletta delle attività: si prepara una volta e si riusa.',
        azione: pulsante({
          testo: 'Assegna un piano',
          variante: 'primario',
          simbolo: 'piano',
          al: () => moduloAssegnaPiano(lezione),
        }),
      }),
    })
  }

  const confronto = confrontaPianoConLezione(piano, lezione)
  // La scaletta posata sull'ora vera: serve per dire quando cade ogni tappa e
  // dove sta l'intervallo, che in aula non è un dettaglio.
  const posata = scalettaSulleUd(piano.attivita, lezione)
  const avanzamento = avanzamentoPiano(lezione, piano)
  const perAttivita = new Map(lezione.avanzamento.map((a) => [a.attivitaId, a]))

  return scheda({
    titolo: 'Piano lezione',
    // Un sottotitolo direbbe il nome del piano, che è la lezione che si sta
    // guardando: si dice invece quanto pesa la scaletta.
    sottotitolo: `${piano.attivita.length} attività · ${formattaDurata(minutiDiAttivita(confronto.durataPiano, posata.minutiPerUd))}`,
    azioni: [
      pulsante({ testo: 'Cambia', variante: 'sottile', simbolo: 'piano', al: () => moduloAssegnaPiano(lezione) }),
      pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        // Si modifica di qui, con le UD di quest'ora sotto gli occhi: aprirlo
        // nella vista Piani vuol dire perdere di vista quanto tempo c'è.
        titolo: 'Modifica la scaletta',
        al: () => moduloPiano(piano, undefined, undefined, lezione),
      }),
    ],
    contenuto: h(
      'div',
      { class: 'piano-lezione' },
      h(
        'div',
        { class: 'piano-lezione__sintesi' },
        barra(avanzamento, 'positivo'),
        h(
          'div',
          { class: 'piano-lezione__conti' },
          pastiglia(`${Math.round(avanzamento * 100)}% svolto`, 'informativo'),
          pastiglia(
            `piano ${formattaDurata(minutiDiAttivita(confronto.durataPiano, posata.minutiPerUd))}`,
            'quiete',
            'orologio',
          ),
          Math.abs(confronto.scostamento) >= 0.05
            ? pastiglia(
                confronto.scostamento > 0
                  ? `${minutiDiAttivita(confronto.scostamento, posata.minutiPerUd)} min di troppo`
                  : `${minutiDiAttivita(-confronto.scostamento, posata.minutiPerUd)} min liberi`,
                confronto.scostamento > 0 ? 'attenzione' : 'positivo',
              )
            : pastiglia('in orario', 'positivo'),
          // Sforare da una UD alla successiva attaccata non si vede in aula;
          // sforare l'intervallo sì, ed è l'unico caso che vale un avviso.
          confronto.oltreLaPausa > 0
            ? pastiglia(
                confronto.oltreLaPausa === 1
                  ? '1 attività a cavallo dell’intervallo'
                  : `${confronto.oltreLaPausa} attività a cavallo dell’intervallo`,
                'attenzione',
              )
            : null,
        ),
      ),
      piano.obiettivi.length > 0
        ? h(
            'div',
            { class: 'piano-lezione__obiettivi' },
            h('h5', null, 'Obiettivi'),
            h('ul', null, ...piano.obiettivi.map((o) => h('li', null, o))),
          )
        : null,
      // Il materiale che vale per tutta l'ora, in cima: durante la lezione lo
      // si cerca una volta sola, all'inizio.
      piano.risorse.length > 0
        ? h(
            'div',
            { class: 'piano-lezione__risorse' },
            h('h5', null, 'Risorse'),
            risorseDaAula(piano.id, null, piano.risorse),
          )
        : null,
      h(
        'ol',
        { class: 'scaletta scaletta--aula' },
        // I nomi delle colonne: la scaletta è una tabella, e in aula la si
        // scorre di sfuggita — sapere che cosa c'è in ogni colonna senza
        // leggerne il contenuto è metà del motivo per cui è incolonnata.
        h(
          'li',
          { class: 'scaletta__voce scaletta__voce--intestazione' },
          h('span', null, '#'),
          h('span', null, 'Attività'),
          h('span', null, 'Tipo'),
          h('span', null, 'Durata'),
          h('span', null, 'Quando'),
          h('span', null, 'Prova'),
          h('span', null, 'Stato'),
        ),
        ...piano.attivita.flatMap((attivita, indice) => {
          const corrente = perAttivita.get(attivita.id)?.stato ?? 'da-fare'
          const dove = posata.posti[indice]
          // L'intervallo si vede dov'è: fra la tappa che lo precede e quella
          // che riprende dopo, con i minuti che dura. In aula è il momento in
          // cui la classe esce, e una scaletta che non lo mostra mente.
          const bloccoDi = (ud: number | null | undefined): number | null =>
            ud === null || ud === undefined ? null : posata.ud[ud]?.blocco ?? null
          const apre = bloccoDi(dove?.ud)
          const chiudeLaPrima = indice > 0 ? bloccoDi(posata.posti[indice - 1]?.udFine) : null
          const stacco =
            apre !== null && chiudeLaPrima !== null && apre !== chiudeLaPrima
              ? posata.blocchi[apre]
              : null
          return [
            stacco
              ? h(
                  'li',
                  { class: 'scaletta__pausa' },
                  icona('pausa', 'icona--minuta'),
                  h('span', null, `Intervallo · ${stacco.pausaPrima} min`),
                )
              : null,
            h(
            'li',
            { class: ['scaletta__voce', `scaletta__voce--${corrente}`] },
            h('span', { class: 'scaletta__numero' }, String(indice + 1)),
            h(
              'div',
              { class: 'scaletta__titolo' },
              h('strong', null, attivita.titolo || 'senza titolo'),
              dove?.oltreLaPausa
                ? pastiglia('a cavallo dell’intervallo', 'attenzione')
                : null,
            ),
            h('span', { class: 'scaletta__tipo' }, pastiglia(nomeTipoAttivita(attivita.tipo), 'quiete')),
            h('span', { class: 'scaletta__durata' }, formattaDurata(minutiDiAttivita(attivita.durataUd, posata.minutiPerUd))),
            // Quando cade davvero, pause comprese: è la domanda che ci si fa a
            // metà lezione guardando l'orologio.
            h(
              'span',
              { class: 'scaletta__orario' },
              dove?.oraInizio ? `${dove.oraInizio}–${dove.oraFine ?? '…'}` : '—',
            ),
            // La tappa che è una prova lo dice qui, e da qui si apre il suo
            // foglio: è il posto in cui ci si trova quando la prova la si sta
            // facendo davvero — e l'unico da cui il momento nasce.
            h(
              'span',
              { class: 'scaletta__prova' },
              attivitaValutata(attivita) ? pulsanteValutazione(lezione, attivita) : null,
            ),
            h(
              'span',
              { class: 'scaletta__stati' },
              ...STATI_ATTIVITA.map((voce) =>
                h(
                  'button',
                  {
                    class: ['stato-attivita', corrente === voce.valore && 'stato-attivita--attivo'],
                    type: 'button',
                    attr: { title: voce.nome, 'aria-pressed': corrente === voce.valore },
                    onclick: () =>
                      void azione({
                        tipo: 'avanzamento.imposta',
                        lezioneId: lezione.id,
                        attivitaId: attivita.id,
                        stato: voce.valore,
                      }),
                  },
                  voce.sigla,
                ),
              ),
            ),
            // Quel che in una colonna non ci sta scende sotto, allineato al
            // titolo: è roba di questa tappa, e incolonnarla avrebbe voluto
            // dire tre colonne quasi sempre vuote.
            attivita.descrizione || riassuntoParametri(attivita) || attivita.risorse.length > 0
              ? h(
                  'div',
                  { class: 'scaletta__estesa' },
                  attivita.descrizione
                    ? h('p', { class: 'scaletta__descrizione' }, attivita.descrizione)
                    : null,
                  // I parametri del tipo, in una riga sola: «gruppi da 3 · a
                  // sorteggio» si legge di sfuggita mentre si prepara l'ora.
                  riassuntoParametri(attivita)
                    ? h('p', { class: 'scaletta__parametri testo-quieto' }, riassuntoParametri(attivita))
                    : null,
                  risorseDaAula(piano.id, attivita.id, attivita.risorse),
                )
              : null,
            ),
          ]
        }),
      ),
    ),
  })
}

// ------------------------------------------------------------------ contenuti

/** I campi di testo lunghi, salvati quando si lascia il campo. */
function pannelloContenuti (lezione: Lezione): HTMLElement {
  // Uno alla volta, e non l'intera lezione presa dalla chiusura del render:
  // scrivendo in due campi di fila, il secondo salvataggio rimanderebbe la
  // copia vecchia e cancellerebbe quel che il primo aveva appena scritto.
  const salvaCampo = async (chiave: 'argomenti' | 'materiali' | 'consuntivo', valore: string) => {
    if ((lezione[chiave] ?? '') === valore) return
    await azione(
      chiave === 'argomenti'
        ? { tipo: 'lezione.testi', lezioneId: lezione.id, argomenti: valore }
        : chiave === 'materiali'
          ? { tipo: 'lezione.testi', lezioneId: lezione.id, materiali: valore }
          : { tipo: 'lezione.testi', lezioneId: lezione.id, consuntivo: valore },
    )
  }

  return scheda({
    titolo: 'Svolgimento',
    sottotitolo: 'si salva da sé quando si esce dal campo',
    contenuto: h(
      'div',
      { class: 'modulo' },
      campo({
        nome: 'argomenti',
        etichetta: 'Argomenti svolti',
        tipo: 'textarea',
        righe: 4,
        valore: lezione.argomenti ?? '',
        segnaposto: 'che cosa si è fatto davvero in classe',
        fuoco: `lezione-argomenti-${lezione.id}`,
        al: (valore) => void salvaCampo('argomenti', valore),
      }),
      campo({
        nome: 'materiali',
        etichetta: 'Materiali',
        tipo: 'textarea',
        righe: 2,
        valore: lezione.materiali ?? '',
        segnaposto: 'schede, link, capitoli del libro',
        fuoco: `lezione-materiali-${lezione.id}`,
        al: (valore) => void salvaCampo('materiali', valore),
      }),
      campo({
        nome: 'consuntivo',
        etichetta: 'Consuntivo',
        tipo: 'textarea',
        righe: 4,
        valore: lezione.consuntivo ?? '',
        segnaposto: 'com’è andata, che cosa riprendere la prossima volta',
        fuoco: `lezione-consuntivo-${lezione.id}`,
        al: (valore) => void salvaCampo('consuntivo', valore),
      }),
    ),
  })
}

// ------------------------------------------------------------------ navigazione

/** Come si chiama un'ora nella tendina: giorno, ora d'inizio e di che parlava. */
/**
 * Il pulsante con cui una tappa valutata apre il suo momento.
 *
 * Se il momento non c'è ancora lo crea, con quel che la scaletta aveva già
 * detto — titolo, tipo, peso — e la data della lezione. Se c'è, ci porta: il
 * foglio dei voti è più giù, nella stessa scheda, e non ha senso crearne un
 * secondo per la stessa prova.
 */
function pulsanteValutazione (lezione: Lezione, attivita: Attivita) {
  const momento = stato.registro.valutazioni.find(
    (v) => v.lezioneId === lezione.id && v.attivitaId === attivita.id,
  )

  return pulsante({
    testo: momento ? 'Voti' : 'Crea la prova',
    simbolo: 'valutazioni',
    variante: momento ? 'sottile' : 'fantasma',
    titolo: momento
      ? `Apri «${momento.titolo}»`
      : 'Crea il momento di valutazione di questa tappa, dentro quest’ora',
    al: async () => {
      if (momento) {
        aggiorna({ valutazioneId: momento.id })
        return
      }
      const risposta = await eseguiOAvvisa({
        tipo: 'valutazione.daAttivita',
        lezioneId: lezione.id,
        attivitaId: attivita.id,
      })
      if (!risposta.ok) return
      if (risposta.creato) aggiorna({ valutazioneId: risposta.creato.id })
    },
  })
}

/**
 * Il foglio delle valutazioni di quest'ora.
 *
 * I voti si mettono qui, dentro la lezione in cui si è fatta la prova: la data
 * e la classe le eredita l'ora, e non c'è niente da ridigitare né da andare a
 * cercare altrove. La vista Valutazioni resta per guardare l'anno intero — le
 * medie, i confronti — ma il posto in cui si scrive è questo.
 */
/**
 * Come sono andate le note appena messe.
 *
 * Il disegno lo fa `componenti/note.ts`, lo stesso che lo schermo per la
 * classe: qui si preparano solo le cifre. Restituendo una verifica il docente
 * commenta sul proiettore una forma, e riguardandola sul portatile deve
 * trovare quella — non un istogramma cugino, scritto un'altra volta.
 */
function graficoNoteDi (momento: MomentoValutazione): Figlio {
  const conti = distribuzione(momento)

  return graficoNote({
    grafico: distribuzioneAPunti(momento),
    media: formattaVoto(conti.media),
    sufficienti: conti.sufficienti,
    conteggio: conti.conteggio,
    estremi:
      conti.minimo !== null && conti.massimo !== null
        ? `da ${formattaVoto(conti.minimo)} a ${formattaVoto(conti.massimo)}`
        : null,
  })
}

function pannelloValutazioni (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const momenti = stato.registro.valutazioni.filter((v) => v.lezioneId === lezione.id)
  // I recuperi fissati per oggi: sono valutazioni di quest'ora quanto le
  // prove nate qui — semplicemente la verifica era di un altro giorno.
  const recuperi = bloccoRecuperiDellOra(lezione)

  return scheda({
    titolo: 'Valutazioni',
    sottotitolo:
      momenti.length === 0
        ? recuperi
          ? 'nessuna prova nata qui, ma oggi si recupera'
          : 'quel che si è valutato in quest’ora'
        : `${momenti.length === 1 ? 'un momento' : `${momenti.length} momenti`} · i voti si mettono qui`,
    // Nessun «nuovo momento»: la prova la dichiara la scaletta, e il momento
    // nasce dal suo pulsante — lì la tappa sa già titolo, tipo e peso, e sa di
    // essere lei. Un pulsante qui creava un secondo momento per la stessa
    // prova, scollegato dalla tappa che l'aveva prevista.
    contenuto:
      !classe || momenti.length === 0
        ? h(
            'div',
            null,
            // Il richiamo alla scaletta solo quando non c'è davvero niente:
            // con un recupero in corso «in quest'ora non si è valutato
            // niente» sarebbe una frase falsa sopra una griglia da riempire.
            recuperi
              ? null
              : h(
                  'p',
                  { class: 'testo-quieto' },
                  'In quest’ora non si è valutato niente. Un momento nasce dalla tappa del ' +
                    'piano che dichiara di essere una prova: lo si crea dal suo pulsante, ' +
                    'qui sopra nella scaletta.',
                ),
            recuperi,
          )
        : h(
            'div',
            null,
            // Senza le colonne della media e della nota: qui si guarda una
            // prova sola, e la «media» di un voto è quel voto ricopiato
            // accanto a sé stesso. Il bilancio del semestre sta in Valutazioni.
            grigliaVoti(classe, momenti, { medie: false }),
            h(
              'p',
              { class: 'testo-quieto' },
              `Un voto si scrive nella casella; «${siglaPresenza('assente')}» segna chi era assente, come nell’appello.`,
            ),
            // Il grafico sotto la griglia, uno per prova: è la domanda che si
            // fa appena finito di mettere i voti, e con due prove nella stessa
            // ora le due forme non si possono sommare.
            ...momenti.map((momento) =>
              h(
                'div',
                { class: 'note-prova' },
                momenti.length > 1
                  ? h('h5', { class: 'note-prova__titolo' }, momento.titolo)
                  : null,
                graficoNoteDi(momento),
              ),
            ),
            // In fondo, dopo le prove di quest'ora: chi oggi ne rifà una di
            // un'altra volta. Prima le cose nate qui, poi quelle che sono
            // venute a farsi qui.
            recuperi,
          ),
  })
}

/**
 * Come una lezione si legge nella tendina del registro.
 *
 * Davanti il numero d'ordine: «la dodicesima» è il modo in cui una lezione si
 * nomina davvero parlando, e senza quel numero la tendina è un elenco di date
 * in cui si conta a mano. Poi il giorno della settimana, perché un corso si
 * tiene sempre negli stessi giorni e «giovedì» dice più del 14.11 — e chi
 * cerca l'ora saltata la riconosce dal giorno. Le annullate non contano nella
 * numerazione: la dodicesima è la dodicesima che si è fatta.
 */
function etichettaLezione (altra: Lezione, numero: number | null): string {
  const inizio = inizioLezione(altra)
  const titolo = titoloDiLezione(altra)
  const segno = altra.stato === 'svolta' ? '✓ ' : altra.stato === 'annullata' ? '× ' : ''
  const ordine = numero === null ? '' : `${numero}. `
  const giorno = formattaData(altra.data, 'giorno')
  return (
    `${segno}${ordine}${giorno} ${formattaData(altra.data)}` +
    `${inizio ? ` · ${inizio}` : ''}${titolo ? ` · ${titolo}` : ''}`
  )
}

/**
 * Il numero d'ordine di ogni lezione dentro il suo corso, saltando le annullate.
 * Si conta una volta per tutta la tendina: farlo dentro l'etichetta vorrebbe
 * dire riscorrere l'elenco per ogni voce.
 */
function numeriDiLezione (sorelle: Lezione[]): Map<string, number | null> {
  const numeri = new Map<string, number | null>()
  let contatore = 0
  for (const altra of sorelle) {
    if (altra.stato === 'annullata') {
      numeri.set(altra.id, null)
      continue
    }
    contatore += 1
    numeri.set(altra.id, contatore)
  }
  return numeri
}

/**
 * Le due tendine con cui si sfoglia il registro: il corso e, dentro il corso,
 * l'ora.
 *
 * È il modo in cui si scrive davvero il registro — una materia alla volta,
 * scendendo lungo le sue ore — e passare ogni volta dal calendario vorrebbe
 * dire cercare in mezzo alle lezioni di tutte le altre classi. Il corso di
 * questa lezione non si cambia da qui: scegliendone un altro si salta al suo
 * registro, sull'ora che vi si guardava per ultima.
 */
function navigatoreRegistro (lezione: Lezione): Figlio {
  const corsi = corsiVisibili()
  const sorelle = lezioniDiCorso(lezione.corsoId)
  const posizione = sorelle.findIndex((l) => l.id === lezione.id)
  const numeri = numeriDiLezione(sorelle)

  const vaiAlCorso = (corsoId: string) => {
    if (corsoId === lezione.corsoId) return
    const altre = lezioniDiCorso(corsoId)
    if (altre.length === 0) {
      notifica('Questo corso non ha ancora nessuna lezione.', 'avviso')
      return
    }
    // La stessa regola con cui la barra sceglie dove aprirsi: l'ultima già
    // passata, o la prima se l'anno del corso deve ancora cominciare. Il corso
    // si scrive anche nello stato: è il ramo dentro cui la barra laterale sta,
    // e restando indietro racconterebbe una materia che non si guarda più.
    const passate = altre.filter((l) => l.data <= stato.adessoData)
    aggiorna({
      lezioneId: (passate[passate.length - 1] ?? altre[0]).id,
      corsoId,
      filtroClasseId: classeDelCorsoId(corsoId)?.id ?? stato.filtroClasseId,
    })
  }

  // L'ora precedente e successiva dello stesso corso: le stesse due voci che
  // si troverebbero aprendo la tendina, un clic più corto per chi sfoglia il
  // registro in ordine invece di cercare una data precisa.
  const vaiA = (indice: number) => {
    const bersaglio = sorelle[indice]
    if (bersaglio) aggiorna({ lezioneId: bersaglio.id })
  }

  return h(
    'div',
    { class: 'navigatore-registro' },
    icona('agenda', 'navigatore-registro__simbolo'),
    h(
      'select',
      {
        class: 'campo__controllo campo__controllo--selezione navigatore-registro__corso',
        attr: { 'aria-label': 'Corso' },
        onchange: (evento: Event) => vaiAlCorso((evento.target as HTMLSelectElement).value),
      },
      ...corsi.map((corso) =>
        h(
          'option',
          { value: corso.id, selected: corso.id === lezione.corsoId },
          corso.titolo || nomeMateria(corso.materiaId) || 'corso senza titolo',
        ),
      ),
      // Un corso cancellato non è più in elenco, ma la sua lezione è ancora
      // qui: senza questa voce la tendina mostrerebbe il corso sbagliato.
      corsi.some((c) => c.id === lezione.corsoId)
        ? null
        : h('option', { value: lezione.corsoId, selected: true }, 'corso non più in elenco'),
    ),
    pulsante({
      simbolo: 'sinistra',
      variante: 'fantasma',
      titolo: 'Ora precedente di questo corso',
      disabilitato: posizione <= 0,
      al: () => vaiA(posizione - 1),
    }),
    h(
      'select',
      {
        class: 'campo__controllo campo__controllo--selezione navigatore-registro__lezione',
        attr: { 'aria-label': 'Lezione del corso' },
        onchange: (evento: Event) =>
          aggiorna({ lezioneId: (evento.target as HTMLSelectElement).value }),
      },
      ...sorelle.map((altra) =>
        h(
          'option',
          { value: altra.id, selected: altra.id === lezione.id },
          etichettaLezione(altra, numeri.get(altra.id) ?? null),
        ),
      ),
    ),
    pulsante({
      simbolo: 'destra',
      variante: 'fantasma',
      titolo: 'Ora successiva di questo corso',
      disabilitato: posizione < 0 || posizione >= sorelle.length - 1,
      al: () => vaiA(posizione + 1),
    }),
    h(
      'span',
      { class: 'navigatore-registro__conta' },
      posizione >= 0 ? `${posizione + 1} di ${sorelle.length}` : `${sorelle.length} lezioni`,
    ),
  )
}

// ------------------------------------------------------------------ vista

export function vistaLezione (): Figlio {
  const lezione = lezionePerId(stato.lezioneId)
  if (!lezione) {
    // Ci si arriva dal menu con il registro ancora vuoto, o su una lezione
    // cancellata da un'altra finestra: se c'è un'ora da aprire si offre quella,
    // altrimenti non resta che il calendario, dove le lezioni si creano.
    const riferimento = lezioneDiRiferimento()
    return statoVuoto({
      simbolo: 'agenda',
      titolo: 'Nessuna lezione aperta',
      testo: 'Il registro si scrive dentro un’ora: scegline una dal calendario.',
      azione: riferimento
        ? pulsante({
            testo: 'Apri l’ultima lezione',
            variante: 'primario',
            simbolo: 'agenda',
            al: () => aggiorna({ lezioneId: riferimento }),
          })
        : pulsante({
            testo: 'Vai al calendario',
            variante: 'primario',
            al: () => aggiorna({ vista: 'calendario' }),
          }),
    })
  }

  const classe = classeDiLezione(lezione)
  const riepilogo = riepilogaPresenze(lezione.presenze)

  const cambiaStato = async (nuovo: Lezione['stato']) => {
    const risposta = await azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: nuovo })
    if (!risposta.ok) return
    notifica(
      nuovo === 'svolta' ? 'Lezione segnata come svolta.' : `Lezione ${nuovo}.`,
      nuovo === 'annullata' ? 'avviso' : 'successo',
    )
  }

  return h(
    'div',
    { class: 'vista vista--lezione' },
    testataVista({
      // Che ora è questa lo dicono la classe e il giorno; di che cosa parla lo
      // dice il piano, appena sotto. Un titolo scritto a mano in cima ripeteva
      // uno dei due o restava vuoto.
      titolo: classe?.nome ?? 'Classe eliminata',
      sottotitolo: `${formattaData(lezione.data, 'lungo')} · ${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}${lezione.aula ? ` · aula ${lezione.aula}` : ''}`,
      azioni: [
        pulsante({
          simbolo: 'sinistra',
          titolo: 'Torna al calendario',
          al: () => aggiorna({ vista: 'calendario', data: lezione.data }),
        }),
        lezione.stato !== 'svolta'
          ? pulsante({ testo: 'Segna come svolta', variante: 'primario', simbolo: 'spunta', al: () => cambiaStato('svolta') })
          : pulsante({ testo: 'Riporta a pianificata', variante: 'sottile', al: () => cambiaStato('pianificata') }),
        // Il verbale in PDF sta in Documenti, in fila con le altre ore del
        // corso: qui si scrive l'ora, là si consegna.
        pulsante({ testo: 'Modifica', simbolo: 'matita', al: () => moduloLezione({ lezione }) }),
        pulsante({
          simbolo: 'chiudi',
          variante: 'fantasma',
          titolo: 'Annulla la lezione',
          al: async () => {
            if (lezione.stato === 'annullata') {
              await cambiaStato('pianificata')
              return
            }
            const sicuro = await conferma({
              titolo: 'Annullare la lezione?',
              testo: 'Resta nel registro, segnata come non svolta. I dati già inseriti non si perdono.',
              testoConferma: 'Annulla la lezione',
            })
            if (sicuro) await cambiaStato('annullata')
          },
        }),
      ],
      contorno: h(
        'div',
        { class: 'sintesi' },
        h(
          'div',
          { class: 'sintesi__stato' },
          lezione.stato === 'svolta'
            ? pastiglia('svolta', 'positivo', 'spunta')
            : lezione.stato === 'annullata'
              ? pastiglia('annullata', 'negativo', 'chiudi')
              : pastiglia('pianificata', 'informativo', 'orologio'),
        ),
        datoSintetico(
          'presenti',
          `${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`,
        ),
        datoSintetico('assenti', String(riepilogo.assenti + riepilogo.parziali)),
        riepilogo.udSenzaAppello > 0
          ? datoSintetico('da fare', String(riepilogo.udSenzaAppello), 'attenzione')
          : null,
        datoSintetico('ritardi', String(riepilogo.ritardi)),
        datoSintetico('durata', formattaDurata(minutiEffettivi(lezione))),
        minutiTotali(lezione) !== minutiEffettivi(lezione)
          ? datoSintetico('con pause', formattaDurata(minutiTotali(lezione)))
          : null,
      ),
    }),
    navigatoreRegistro(lezione),
    // Tre schede, tre mestieri, e tre momenti. L'amministrazione si fa mentre
    // la classe entra — chi c'è, che cosa si ritira. La lezione si guarda
    // durante: la scaletta da seguire e le prove da mettere. Le annotazioni si
    // scrivono dopo, a classe uscita, ed è per questo che ci sta anche lo
    // svolgimento: argomenti e consuntivo si scrivono nello stesso momento in
    // cui si segna che cosa è successo a qualcuno, non mentre si guarda il
    // piano. Tenerli tutti aperti insieme voleva dire scorrere mezza pagina
    // per arrivare all'appello.
    selettore(
      stato.schedaLezione,
      [
        { valore: 'amministrazione' as const, testo: 'Amministrazione', simbolo: 'todo' },
        { valore: 'lezione' as const, testo: 'Lezione', simbolo: 'piano' },
        { valore: 'annotazioni' as const, testo: 'Annotazioni', simbolo: 'matita' },
      ],
      (scelta: SchedaLezione) => aggiorna({ schedaLezione: scelta }),
    ),
    stato.schedaLezione === 'amministrazione'
      ? h(
          'div',
          { class: 'colonne colonne--lezione' },
          h('div', { class: 'colonna' }, pannelloAppello(lezione)),
          h(
            'div',
            { class: 'colonna' },
            pannelloConsegne(lezione),
            // La pila da ridare indietro sta accanto alle consegne da
            // ritirare: sono la stessa specie di cosa, e capitano nello stesso
            // momento — entrando in aula, con il registro di quest'ora aperto.
            pannelloRiconsegneDellOra(lezione),
          ),
        )
      : null,
    stato.schedaLezione === 'lezione'
      ? h(
          'div',
          { class: 'colonne colonne--lezione' },
          h('div', { class: 'colonna' }, pannelloPiano(lezione)),
          h('div', { class: 'colonna' }, pannelloValutazioni(lezione)),
        )
      : null,
    stato.schedaLezione === 'annotazioni'
      ? h(
          'div',
          { class: 'colonne colonne--lezione' },
          h('div', { class: 'colonna' }, pannelloContenuti(lezione)),
          h('div', { class: 'colonna' }, pannelloOsservazioni(lezione)),
        )
      : null,
  )
}
