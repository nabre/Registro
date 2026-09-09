// L'ora: quando si fa, quanto dura, e che cosa è successo dentro.
//
// L'editor degli slot è la parte che porta il peso: un'ora non è un intervallo
// solo — c'è la pausa in mezzo, e le due metà si spostano insieme.

import { ordinaAllievi, slotIncatenati, slotOrdinati } from '../../dominio/calcoli.js'
import {
  durataMinuti,
  formattaData,
  formattaDurata,
  minutiDaUd,
  minutiInUd,
  oggi,
  sommaMinuti,
  udDaMinuti,
} from '../../dominio/date.js'
import { creaLezione, creaOsservazione, creaSlot } from '../../dominio/fabbriche.js'
import type { Classe, Lezione, Osservazione, Slot } from '../../dominio/modelli.js'
import { campo, pastiglia, pulsante, riga, sezioneModulo } from '../componenti/base.js'
import { icona } from '../componenti/icone.js'
import { apriModale } from '../componenti/modale.js'
import { h, rimpiazza } from '../dom.js'
import { aggiorna, nomeDiPiano, pianiPerCorso, stato } from '../stato.js'

import {
  campoCollegato,
  campoCorso,
  corsoProposto,
  fuocoSullaPresa,
  presaDiRiga,
  richiedeAnno,
  riordinatore,
  salva,
  spostaVoce,
  tastoDuplica,
  tastoElimina,
  testo,
  VOCI_STATO_LEZIONE,
  VOCI_TIPO_OSSERVAZIONE,
} from './comune.js'
import { moduloAvvio } from './corso.js'
import { moduloPiano } from './piano.js'

/**
 * L’editor degli slot: i tratti di cui è fatta un’ora, pause comprese.
 *
 * Si scriveva male per un motivo solo: a ogni tasto l’editor si ridisegnava
 * intero, e il campo che si stava compilando spariva sotto le dita — fuoco
 * perso, cursore a capo, righe che si riordinavano mentre le si scriveva. Qui
 * le righe si costruiscono una volta e restano: quando un valore cambia si
 * riscrivono solo i numeri che ne dipendono, e l’ordine si rifà quando si
 * aggiunge, si toglie o si trascina una riga, mai mentre si scrive.
 *
 * Gli slot stanno in fila, attaccati: ognuno comincia dove finisce quello
 * sopra, e per questo l’unica ora che si dichiara è quella del primo — le
 * altre sono un conto, e il campo è spento perché lasciarlo scrivibile
 * prometterebbe una libertà che non c’è. Quel che si sceglie è l’ordine, e lo
 * si sceglie trascinando la riga per la presa. Il buco fra due slot così non
 * esiste più: se in mezzo c’è una pausa la si mette come slot di pausa, che si
 * vede e si conta, invece di lasciarla implicita in due orari che non si
 * toccano — ed erano quei buchi a far quadrare male i minuti di lezione.
 *
 * Di ogni slot resta da dichiarare la durata: la fine la scrive il registro,
 * perché è un conto e non una scelta. Uno slot di lezione dura in unità
 * didattiche — quarantacinque minuti l’una, sempre multipli — perché è così
 * che si sa quanto si insegna; una pausa dura i minuti che dura.
 */
function editorSlot (iniziali: Slot[], allaModifica: (slot: Slot[]) => void): HTMLElement {
  let slot = slotOrdinati(iniziali).map((s) => ({ ...s }))
  const contenitore = h('div', { class: 'slot-editor' })

  const notifica_ = () => allaModifica(slot.map((s) => ({ ...s })))

  // I pezzi che cambiano da soli, senza rifare le righe.
  const conti = h('div', { class: 'slot-editor__conti' })
  const righe = h('div', { class: 'slot-editor__righe' })
  /** Come rimettere nei campi di ogni riga quel che dice il modello. */
  const sincronizzatori: Array<() => void> = []

  /**
   * Riattacca gli slot uno dietro l’altro, sugli stessi oggetti.
   *
   * Sugli stessi e non su copie: ogni riga già costruita tiene in mano la sua
   * voce, e sostituirla lascerebbe i campi a scrivere su slot che non sono più
   * nell’elenco.
   */
  const riallinea = (inizio?: string) => {
    const attaccati = slotIncatenati(slot, inizio)
    slot.forEach((s, i) => {
      s.inizio = attaccati[i].inizio
      s.fine = attaccati[i].fine
    })
  }

  const aggiornaConti = () => {
    const effettivi = slot
      .filter((s) => s.tipo === 'lezione')
      .reduce((somma, s) => somma + durataMinuti(s.inizio, s.fine), 0)
    const pause = slot
      .filter((s) => s.tipo === 'pausa')
      .reduce((somma, s) => somma + durataMinuti(s.inizio, s.fine), 0)
    const fine = slot.at(-1)?.fine

    rimpiazza(
      conti,
      pastiglia(
        `lezione ${udDaMinuti(effettivi)} UD · ${formattaDurata(effettivi)}`,
        'informativo',
        'orologio',
      ),
      pause > 0 ? pastiglia(`pause ${formattaDurata(pause)}`, 'quiete', 'pausa') : null,
      fine ? h('span', { class: 'testo-quieto' }, `fino alle ${fine}`) : null,
    )
  }

  /** Rifà la catena e rimette nei campi quel che ne è venuto fuori. */
  const incatena = (inizio?: string) => {
    riallinea(inizio)
    for (const sincronizza of sincronizzatori) sincronizza()
    aggiornaConti()
    notifica_()
  }

  const riordina = riordinatore(righe, (da, a) => {
    if (a < 0 || a >= slot.length || da === a) return
    slot = spostaVoce(slot, da, a)
    disegna()
    notifica_()
    fuocoSullaPresa(righe, a)
  })

  const rigaSlot = (voce: Slot, indice: number): HTMLElement => {
    const pausa = voce.tipo === 'pausa'
    // Il primo slot detta l’ora di tutta la lezione; gli altri la ereditano.
    const attaccato = indice > 0
    const inizio = h('input', {
      class: 'campo__controllo campo__controllo--ora',
      type: 'time',
      value: voce.inizio,
      disabled: attaccato,
      attr: {
        'aria-label': attaccato ? 'Inizio, dato dallo slot precedente' : 'Inizio della lezione',
        title: attaccato
          ? 'Comincia dove finisce lo slot sopra: per spostarlo, cambia l’ordine o l’ora del primo slot.'
          : 'L’ora della lezione: gli slot sotto la seguono.',
      },
    }) as HTMLInputElement
    // La fine si legge, non si scrive: la dettano inizio e durata.
    const fine = h('span', { class: 'slot-riga__durata' })
    const durata = h('input', {
      class: 'campo__controllo campo__controllo--numero',
      type: 'number',
      value: pausa
        ? String(durataMinuti(voce.inizio, voce.fine))
        : String(udDaMinuti(durataMinuti(voce.inizio, voce.fine))),
      attr: pausa
        ? { min: '1', step: 'any', 'aria-label': 'Durata in minuti' }
        : { min: '1', step: '1', 'aria-label': 'Unità didattiche' },
    }) as HTMLInputElement

    const sincronizza = () => {
      const quanto = durataMinuti(voce.inizio, voce.fine)
      inizio.value = voce.inizio
      durata.value = pausa ? String(quanto) : String(udDaMinuti(quanto))
      rimpiazza(fine, `→ ${voce.fine}`)
    }
    sincronizzatori.push(sincronizza)

    inizio.addEventListener('change', () => {
      if (!inizio.value) return sincronizza()
      // Spostando l’ora del primo slot si sposta la lezione intera: gli altri
      // sono attaccati e vengono dietro, senza allungarsi.
      incatena(inizio.value)
    })

    durata.addEventListener('change', () => {
      const scritto = Number(durata.value)
      const minuti = pausa
        ? Math.max(5, Math.round(scritto) || 5)
        : minutiDaUd(scritto || 1)
      voce.fine = sommaMinuti(voce.inizio, minuti)
      // Allungare uno slot spinge avanti tutti quelli che gli stanno dietro.
      incatena()
    })

    const presa = presaDiRiga()
    const riga = h(
      'div',
      { class: ['slot-riga', pausa && 'slot-riga--pausa'] },
      presa,
      h(
        'span',
        { class: 'slot-riga__genere', attr: { title: pausa ? 'Pausa' : 'Lezione' } },
        icona(pausa ? 'pausa' : 'orologio'),
      ),
      inizio,
      durata,
      h('span', { class: 'slot-riga__durata' }, pausa ? 'min' : 'UD'),
      fine,
      h('input', {
        class: 'campo__controllo slot-riga__etichetta',
        type: 'text',
        value: voce.etichetta ?? '',
        placeholder: voce.tipo === 'pausa' ? 'pausa' : 'nota sullo slot',
        onchange: (evento: Event) => {
          voce.etichetta = (evento.target as HTMLInputElement).value
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Togli lo slot',
        disabilitato: slot.length <= 1,
        al: () => {
          slot = slot.filter((s) => s.id !== voce.id)
          disegna()
          notifica_()
        },
      }),
    )
    riordina(riga, presa, indice)
    sincronizza()
    return riga
  }

  /** Rifà le righe. Solo quando cambia quante sono, o in che ordine stanno. */
  function disegna (): void {
    riallinea()
    sincronizzatori.length = 0
    rimpiazza(righe, ...slot.map(rigaSlot))
    aggiornaConti()
  }

  const aggiungi = (tipo: 'lezione' | 'pausa') => {
    // In coda, attaccato all’ultimo: da lì lo si trascina dove serve.
    const ultimo = slot.at(-1)
    const inizio = ultimo?.fine ?? stato.registro.impostazioni.oraInizioGiornata
    const durata =
      tipo === 'pausa'
        ? stato.registro.impostazioni.durataPausaPredefinita
        : minutiInUd(stato.registro.impostazioni.durataSlotPredefinita)
    slot.push(creaSlot(inizio, durata, tipo))
    disegna()
    notifica_()
  }

  contenitore.append(
    righe,
    h(
      'div',
      { class: 'slot-editor__piede' },
      h(
        'div',
        { class: 'slot-editor__comandi' },
        pulsante({ testo: 'Slot di lezione', simbolo: 'piu', variante: 'sottile', al: () => aggiungi('lezione') }),
        pulsante({ testo: 'Pausa', simbolo: 'pausa', variante: 'sottile', al: () => aggiungi('pausa') }),
      ),
      conti,
    ),
  )

  disegna()
  // Quel che si vede è già attaccato: se l'ora salvata aveva un buco, la
  // catena l'ha chiuso, e chi salva senza toccare niente deve salvare questo.
  notifica_()
  return contenitore
}

export interface OpzioniModuloLezione {
  lezione?: Lezione
  data?: string
  classeId?: string
  /** Il corso da proporre: chi apre il modulo da una scheda di corso lo sa già. */
  corsoId?: string
  /** Ora d'inizio proposta: il calendario la ricava dal punto in cui si è cliccato. */
  oraProposta?: string
  /** Che cosa fare dopo aver salvato: di norma aprirsi sulla lezione. */
  dopo?: (lezioneId: string) => void
}

export function moduloLezione (opzioni: OpzioniModuloLezione = {}): void {
  // Senza anno non c'è niente a cui appendere una lezione, e il posto in cui
  // rimediare è uno solo: si apre quello invece di dire di andarci.
  const anno = richiedeAnno(moduloAvvio)
  if (!anno) return

  const modifica = Boolean(opzioni.lezione)
  const base =
    opzioni.lezione ??
    creaLezione(
      opzioni.corsoId && stato.registro.corsi.some((c) => c.id === opzioni.corsoId)
        ? opzioni.corsoId
        : corsoProposto(opzioni.classeId),
      opzioni.data ?? stato.data ?? oggi(),
      opzioni.oraProposta ?? stato.registro.impostazioni.oraInizioGiornata,
      minutiInUd(stato.registro.impostazioni.durataSlotPredefinita),
    )

  let slot = base.slot.map((s) => ({ ...s }))
  // Il corso scelto comanda l'elenco dei piani: sono quelli della sua materia,
  // di qualunque anno — il piano dell'anno scorso è proprio quel che si cerca
  // preparando la stessa ora. Cambiando corso l'elenco si rifà.
  let corsoScelto = base.corsoId
  let rinfrescaPiani: ((scelto?: string) => void) | null = null

  apriModale({
    titolo: modifica ? 'Modifica lezione' : 'Nuova lezione',
    sottotitolo: modifica ? formattaData(base.data, 'lungo') : undefined,
    larghezza: 'media',
    testoSalva: modifica ? 'Salva' : 'Crea lezione',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campoCorso({
            valore: base.corsoId,
            richiesto: true,
            aiuto: 'La materia in questa classe: dice tutto quel che serve alla lezione.',
            al: (valore) => {
              corsoScelto = valore
              // Il piano di un'altra materia non c'entra più niente: l'elenco
              // si rifà e la scelta riparte da zero.
              rinfrescaPiani?.('')
            },
          }),
          campo({
            nome: 'data',
            etichetta: 'Data',
            tipo: 'date',
            valore: base.data,
            richiesto: true,
            larghezza: 'meta',
          }),
        ),
        riga(
          campo({ nome: 'aula', etichetta: 'Aula', valore: base.aula ?? '', larghezza: 'meta' }),
          campo({
            nome: 'stato',
            etichetta: 'Stato',
            tipo: 'select',
            valore: base.stato,
            opzioni: VOCI_STATO_LEZIONE,
            larghezza: 'quarto',
          }),
        ),
        sezioneModulo(
          'Orario',
          editorSlot(slot, (nuovi) => {
            slot = nuovi
          }),
        ),
        sezioneModulo(
          'Piano lezione',
          campoCollegato({
            nome: 'pianoId',
            etichetta: 'Scaletta',
            valore: base.pianoId ?? '',
            vuoto: '— nessun piano —',
            voci: () =>
              pianiPerCorso(corsoScelto).map((p) => ({ valore: p.id, testo: nomeDiPiano(p) })),
            titoloNuovo: 'Nuovo piano per questa materia',
            apriNuovo: (fatto) =>
              moduloPiano(undefined, fatto, corsoScelto || null),
            aiuto: 'La scaletta si può assegnare anche dopo, dal dettaglio della lezione.',
            riferimento: (rinfresca) => {
              rinfrescaPiani = rinfresca
            },
          }),
        ),
      ),
    alSalva: async (valori, contesto) => {
      const lezione: Lezione = {
        ...base,
        corsoId: testo(valori.corsoId),
        data: testo(valori.data),
        aula: testo(valori.aula),
        stato: testo(valori.stato) as Lezione['stato'],
        pianoId: testo(valori.pianoId) || null,
        slot,
      }
      // Cambiare piano dopo che si è già segnato l'avanzamento lascerebbe
      // spunte su attività di un altro piano.
      if (lezione.pianoId !== base.pianoId) lezione.avanzamento = []

      await salva(
        contesto,
        { tipo: 'lezione.salva', lezione },
        modifica ? 'Lezione aggiornata.' : 'Lezione creata.',
        (idCreato) => opzioni.dopo?.(idCreato ?? lezione.id),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? [
            tastoDuplica({
              contesto,
              azione: { tipo: 'lezione.duplica', lezioneId: base.id, data: base.data },
              fatto: 'Lezione duplicata: cambiare la data della copia.',
              poi: (idCreato) => aggiorna({ vista: 'lezione', lezioneId: idCreato }),
            }),
            tastoElimina({
              contesto,
              chiedi: { genere: 'lezione', id: base.id },
              azione: { tipo: 'lezione.elimina', lezioneId: base.id },
              fatto: 'Lezione eliminata.',
              poi: () => aggiorna({ vista: 'calendario', lezioneId: null }),
            }),
          ]
        : null,
  })
}


export function moduloOsservazione (
  lezione: Lezione,
  classe: Classe | null,
  osservazione?: Osservazione,
): void {
  const modifica = Boolean(osservazione)
  const base = osservazione ?? creaOsservazione('nota', '')
  const allievi = classe ? ordinaAllievi(classe.allievi.filter((a) => a.attivo)) : []

  apriModale({
    titolo: modifica ? 'Modifica osservazione' : 'Nuova osservazione',
    sottotitolo: `${classe?.nome ?? ''} — ${formattaData(lezione.data, 'lungo')}`,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'allievoId',
            etichetta: 'Riguarda',
            tipo: 'select',
            valore: base.allievoId ?? '',
            opzioni: [
              { valore: '', testo: 'Tutta la classe' },
              ...allievi.map((a) => ({ valore: a.id, testo: `${a.cognome} ${a.nome}` })),
            ],
            larghezza: 'meta',
          }),
          campo({
            nome: 'tipo',
            etichetta: 'Tipo',
            tipo: 'select',
            valore: base.tipo,
            opzioni: VOCI_TIPO_OSSERVAZIONE,
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'testo',
          etichetta: 'Osservazione',
          tipo: 'textarea',
          righe: 4,
          valore: base.testo,
          richiesto: true,
        }),
        campo({ nome: 'ora', etichetta: 'Ora', tipo: 'time', valore: base.ora ?? '', larghezza: 'quarto' }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornata: Osservazione = {
        ...base,
        allievoId: testo(valori.allievoId) || null,
        tipo: testo(valori.tipo) as Osservazione['tipo'],
        testo: testo(valori.testo),
        ora: testo(valori.ora) || undefined,
      }
      await salva(
        contesto,
        { tipo: 'osservazione.salva', lezioneId: lezione.id, osservazione: aggiornata },
        modifica ? 'Osservazione aggiornata.' : 'Osservazione registrata.',
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: {
              titolo: 'Eliminare l’osservazione?',
              testo: 'Non si torna indietro.',
            },
            azione: { tipo: 'osservazione.elimina', lezioneId: lezione.id, osservazioneId: base.id },
            fatto: 'Osservazione eliminata.',
          })
        : null,
  })
}

