// L'ora: quando si fa, quanto dura, che cosa è successo dentro. L'editor degli
// slot porta il peso: un'ora ha pause in mezzo, e le parti si spostano insieme.

import { inizioSullaGriglia, lezioneNellaGiornata, slotSullePause } from '../../domain/breaks.js'
import { Molti, Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import {
  allieviAttivi, nomeCompleto, ordinaAllievi, slotIncatenati, slotOrdinati, slotSegnati,
} from '../../domain/calculations.js'
import {
  durataMinuti,
  formattaData,
  formattaDurata,
  minutiDaUd,
  oggi,
  siglaUd,
  sommaMinuti,
  udDaMinuti,
} from '../../domain/dates.js'
import { creaOsservazione, creaSlot } from '../../domain/factories.js'
import type { Classe, Giornata, Lezione, Osservazione, Slot } from '../../domain/models.js'
import { avviso, campo, pastiglia, pulsante, riga, sezioneModulo } from '../components/base.js'
import { icona } from '../components/icons.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, rimpiazza } from '../dom.js'
import { ancorataAIcs, aulaDaIcs } from '../externalCalendar.js'
import { aggiorna, lezionePerId, nomeDiPiano, pianiPerCorso, stato } from '../state.js'

import {
  baseViva,
  campoCollegato,
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
} from './common.js'
import { moduloAnno } from './year.js'
import { campoCorso } from './course.js'
import { sincronizzaDaIcs } from './icsEvent.js'
import { moduloPiano } from './plan.js'
import { testi } from './lesson.testi.js'

/** Se le fasce del calendario stanno in un blocco solo, senza fasce libere in mezzo. */
function calendarioContiguo (slot: readonly Slot[]): boolean {
  const primo = slot.findIndex((s) => s.ics)
  if (primo < 0) return true
  const dopo = slot.findIndex((s, i) => i > primo && !s.ics)
  return dopo < 0 || !slot.slice(dopo).some((s) => s.ics)
}

/**
 * Le fasce del calendario della lezione viva più le fasce libere del modulo,
 * riattaccate: se l'evento si è spostato a modulo aperto, le libere lo seguono.
 */
function conFasceLibere (vive: readonly Slot[], modulo: readonly Slot[]): Slot[] {
  const delCalendario = slotOrdinati(slotSegnati(vive).filter((s) => s.ics))
  const inModulo = slotOrdinati([...modulo])
  const primoIcs = Math.max(0, inModulo.findIndex((s) => s.ics))
  const libere = (da: number, a?: number) =>
    inModulo.slice(da, a).filter((s) => !s.ics).map((s) => ({ ...s }))
  const tutte = [...libere(0, primoIcs), ...delCalendario, ...libere(primoIcs)]
  appoggiaAlCalendario(tutte)
  return tutte
}

/**
 * La catena di una lezione ancorata, sugli stessi oggetti: le fasce del
 * calendario restano, quelle sopra finiscono dove il blocco comincia, quelle
 * sotto cominciano dove finisce.
 */
function appoggiaAlCalendario (slot: Slot[]): void {
  const primo = slot.findIndex((s) => s.ics)
  if (primo < 0) return
  let ultimo = primo
  while (ultimo + 1 < slot.length && slot[ultimo + 1].ics) ultimo += 1
  let ora = slot[primo].inizio
  for (let i = primo - 1; i >= 0; i -= 1) {
    const durata = durataMinuti(slot[i].inizio, slot[i].fine)
    slot[i].fine = ora
    slot[i].inizio = sommaMinuti(ora, -durata)
    ora = slot[i].inizio
  }
  ora = slot[ultimo].fine
  for (let i = ultimo + 1; i < slot.length; i += 1) {
    const durata = durataMinuti(slot[i].inizio, slot[i].fine)
    slot[i].inizio = ora
    slot[i].fine = sommaMinuti(ora, durata)
    ora = slot[i].fine
  }
}

/**
 * L'editor degli slot: i tratti di un'ora, pause comprese. Le righe si
 * costruiscono una volta e restano; scrivendo si riscrivono solo i numeri che
 * dipendono, l'ordine si rifà solo aggiungendo, togliendo o trascinando.
 *
 * Gli slot stanno attaccati: si dichiara solo l'inizio del primo, le altre ore
 * sono un conto (campo spento). Una pausa è uno slot di pausa, non un buco. Di
 * ogni slot si dichiara la durata: la lezione in UD, la pausa in minuti.
 *
 * `ancorata`: le fasce del calendario (`Slot.ics`) sono l'ora dell'evento e
 * non si toccano; le altre si aggiungono e tolgono, appoggiate al blocco.
 *
 * `giornata`: UD e pause di Impostazioni. Con «Segue le pause della giornata»
 * accesa (di norma) l'editor ridispone le fasce a ogni gesto (`slotSullePause`):
 * l'inizio battuto si aggancia alla griglia, un'ora che non stava sulle pause
 * si ridispone all'apertura (spegnendo torna com'era), e pause a mano non se ne
 * aggiungono. Su una lezione ancorata la casella non c'è.
 */
function editorSlot (
  iniziali: Slot[],
  allaModifica: (slot: Slot[]) => void,
  giornata: Giornata,
  opzioni: { ancorata?: boolean, seguePause?: boolean } = {},
): HTMLElement {
  const t = testi().editor
  const L = lessico()
  const ancorata = opzioni.ancorata ?? false
  const { minutiUd } = giornata
  // Ancorata, le pause della giornata non contano: l'ora la detta l'evento.
  const suPause: Giornata = ancorata ? { minutiUd } : giornata
  let seguePause = Boolean(suPause.pause) && (opzioni.seguePause ?? false)
  let slot = slotOrdinati(ancorata ? slotSegnati(iniziali) : iniziali).map((s) => ({ ...s }))
  /** L’ora com’era all’apertura: spegnendo la casella si torna qui. */
  const originali = slot.map((s) => ({ ...s }))
  const contenitore = h('div', { class: 'slot-editor' })
  /** Il perché di un orario cambiato senza che nessuno l’abbia toccato. */
  const ridisposta = h('p', { class: 'slot-editor__nota testo-quieto' })

  const notifica_ = () => allaModifica(slot.map((s) => ({ ...s })))

  // I pezzi che cambiano da soli, senza rifare le righe.
  const conti = h('div', { class: 'slot-editor__conti' })
  const righe = h('div', { class: 'slot-editor__righe' })
  /** Come rimettere nei campi di ogni riga quel che dice il modello. */
  const sincronizzatori: Array<() => void> = []

  /**
   * Riattacca gli slot uno dietro l'altro, sugli stessi oggetti: le righe già
   * costruite tengono in mano la loro voce.
   */
  const riallinea = (inizio?: string) => {
    if (ancorata) {
      appoggiaAlCalendario(slot)
      return
    }
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

    // Si dice solo quando è la casella ad aver cambiato l'ora.
    rimpiazza(
      ridisposta,
      seguePause && cambiata() ? t.orarioAdattato : '',
    )
    rimpiazza(
      conti,
      pastiglia(
        t.contoLezione(udDaMinuti(effettivi, minutiUd), formattaDurata(effettivi)),
        'informativo',
        'orologio',
      ),
      pause > 0 ? pastiglia(t.contoPause(formattaDurata(pause)), 'quiete', 'pausa') : null,
      fine ? h('span', { class: 'testo-quieto' }, t.finoAlle(fine)) : null,
    )
  }

  /** Rifà la catena e rimette nei campi quel che ne è venuto fuori. */
  const incatena = (inizio?: string) => {
    if (seguePause) {
      disponi(inizio)
      return
    }
    riallinea(inizio)
    for (const sincronizza of sincronizzatori) sincronizza()
    aggiornaConti()
    notifica_()
  }

  /**
   * Le fasce rifatte sulle pause della giornata, dall'inizio dato (o di adesso)
   * portato sulla griglia. Le righe si rifanno, perché il numero può cambiare
   * (succede su `change`, a campo lasciato).
   */
  const disponi = (inizio?: string) => {
    const agganciato = inizio === undefined ? undefined : inizioSullaGriglia(inizio, suPause)
    slot = slotSullePause(slot, suPause, agganciato)
    disegna()
    notifica_()
  }

  /** Se l’orario non è più quello con cui l’ora si è aperta. */
  const cambiata = (): boolean =>
    slot.length !== originali.length ||
    slot.some((s, i) => {
      const o = originali[i]
      return s.tipo !== o.tipo || s.inizio !== o.inizio || s.fine !== o.fine
    })

  const riordina = riordinatore(righe, (da, a) => {
    if (a < 0 || a >= slot.length || da === a) return
    const spostati = spostaVoce(slot, da, a)
    // Le fasce del calendario restano un blocco solo: una fascia libera messa
    // in mezzo spezzerebbe l'ora dell'evento.
    if (ancorata && !calendarioContiguo(spostati)) return
    slot = spostati
    // Sulle pause l’ordine non si sceglie: lo dettano loro.
    if (seguePause) return disponi()
    disegna()
    notifica_()
    fuocoSullaPresa(righe, a)
  })

  const rigaSlot = (voce: Slot, indice: number): HTMLElement => {
    if (ancorata && voce.ics) return rigaDelCalendario(voce)
    const pausa = voce.tipo === 'pausa'
    // Il primo slot detta l’ora di tutta la lezione; gli altri la ereditano.
    // Ancorata, nessuno: l’ora la detta l’evento.
    const attaccato = indice > 0 || ancorata
    const inizio = h('input', {
      class: 'campo__controllo campo__controllo--ora',
      type: 'time',
      value: voce.inizio,
      disabled: attaccato,
      attr: {
        'aria-label': attaccato ? t.inizioAttaccato : t.inizioLezione,
        title: ancorata ? t.titoloAncorata : attaccato ? t.titoloAttaccato : t.titoloPrimo,
      },
    })
    // La fine si legge, non si scrive: la dettano inizio e durata.
    const fine = h('span', { class: 'slot-riga__durata' })
    // Sulle pause della giornata una pausa si legge soltanto: la ridisposizione la
    // rimetterebbe.
    const dellaGiornata = pausa && seguePause
    const durata = h('input', {
      class: 'campo__controllo campo__controllo--numero',
      type: 'number',
      value: pausa
        ? String(durataMinuti(voce.inizio, voce.fine))
        : String(udDaMinuti(durataMinuti(voce.inizio, voce.fine), minutiUd)),
      disabled: dellaGiornata,
      attr: pausa
        ? {
            min: '1',
            step: 'any',
            'aria-label': t.durataInMinuti,
            title: dellaGiornata ? t.pausaDellaGiornata : '',
          }
        : { min: '1', step: '1', 'aria-label': Molti(L.unitaDidattica) },
    })

    const sincronizza = () => {
      const quanto = durataMinuti(voce.inizio, voce.fine)
      inizio.value = voce.inizio
      durata.value = pausa ? String(quanto) : String(udDaMinuti(quanto, minutiUd))
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
        : minutiDaUd(scritto || 1, minutiUd)
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
        { class: 'slot-riga__genere', attr: { title: Uno(pausa ? L.pausa : L.lezione) } },
        icona(pausa ? 'pausa' : 'orologio'),
      ),
      inizio,
      durata,
      h('span', { class: 'slot-riga__durata' }, pausa ? t.minuti : siglaUd()),
      fine,
      h('input', {
        class: 'campo__controllo slot-riga__etichetta',
        type: 'text',
        value: voce.etichetta ?? '',
        placeholder: voce.tipo === 'pausa' ? L.pausa.singolare : t.notaSullaFascia,
        onchange: (evento: Event) => {
          voce.etichetta = (evento.target as HTMLInputElement).value
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.togliFascia,
        disabilitato: slot.length <= 1 || dellaGiornata,
        al: () => {
          slot = slot.filter((s) => s.id !== voce.id)
          if (seguePause) return disponi()
          disegna()
          notifica_()
        },
      }),
    )
    riordina(riga, presa, indice)
    sincronizza()
    return riga
  }

  /**
   * La presa c'è ma non si vede: tiene le colonne allineate alle righe libere,
   * e una fascia del calendario non si trascina.
   */
  const presaNascosta = (): HTMLElement => {
    const presa = presaDiRiga()
    presa.style.visibility = 'hidden'
    presa.tabIndex = -1
    return presa
  }

  /** Una fascia del calendario: si legge, con la catena, e non si tocca. */
  const rigaDelCalendario = (voce: Slot): HTMLElement => {
    const pausa = voce.tipo === 'pausa'
    const quanto = durataMinuti(voce.inizio, voce.fine)
    return h(
      'div',
      {
        class: ['slot-riga', 'slot-riga--ics', pausa && 'slot-riga--pausa'],
        attr: { title: t.titoloIcs },
      },
      presaNascosta(),
      h(
        'span',
        { class: 'slot-riga__genere', attr: { title: t.dalCalendarioIcs } },
        icona('collegamento'),
      ),
      h('span', { class: 'slot-riga__ora' }, voce.inizio),
      h(
        'span',
        { class: 'slot-riga__durata' },
        pausa ? t.quantiMinuti(quanto) : t.quanteUd(udDaMinuti(quanto, minutiUd)),
      ),
      h('span', { class: 'slot-riga__durata' }, `→ ${voce.fine}`),
      h(
        'span',
        { class: 'slot-riga__etichetta testo-quieto' },
        voce.etichetta || t.dalCalendarioIcsInRiga,
      ),
    )
  }

  /** Rifà le righe. Solo quando cambia quante sono, o in che ordine stanno. */
  function disegna (): void {
    riallinea()
    sincronizzatori.length = 0
    rimpiazza(righe, ...slot.map(rigaSlot))
    aggiornaConti()
  }

  const aggiungi = (tipo: 'lezione' | 'pausa') => {
    // In coda, attaccato all’ultimo: da lì lo si trascina dove serve. Ancorata,
    // anche sopra l’ora del calendario, per cominciare prima.
    const ultimo = slot.at(-1)
    const inizio = ultimo?.fine ?? stato.registro.impostazioni.oraInizioGiornata
    const durata =
      tipo === 'pausa'
        ? stato.registro.impostazioni.durataPausaPredefinita
        : stato.registro.impostazioni.durataSlotPredefinita
    slot.push(creaSlot(inizio, durata, tipo))
    if (seguePause) return disponi()
    disegna()
    notifica_()
  }

  const tastoPausa = pulsante({
    testo: Uno(L.pausa),
    simbolo: 'pausa',
    variante: 'sottile',
    al: () => aggiungi('pausa'),
  })
  /** La pausa a mano si spegne quando le pause le mette la giornata. */
  const accordaTastoPausa = () => {
    tastoPausa.disabled = seguePause
    tastoPausa.title = seguePause ? t.pauseDellaGiornata(t.seguePause) : ''
  }
  accordaTastoPausa()

  contenitore.append(
    righe,
    h(
      'div',
      { class: 'slot-editor__piede' },
      h(
        'div',
        { class: 'slot-editor__comandi' },
        pulsante({
          testo: t.fasciaDiLezione,
          simbolo: 'piu',
          variante: 'sottile',
          al: () => aggiungi('lezione'),
        }),
        tastoPausa,
      ),
      conti,
    ),
    ...(suPause.pause
      ? [campo({
          nome: 'seguePause',
          etichetta: t.seguePause,
          tipo: 'checkbox',
          valore: seguePause,
          aiuto: t.aiutoSeguePause,
          al: (_valore, evento) => {
            seguePause = (evento.target as HTMLInputElement).checked
            accordaTastoPausa()
            if (seguePause) return disponi()
            // Spenta, l’ora torna com’era all’apertura, e le fasce tornano
            // scrivibili tutte.
            slot = originali.map((s) => ({ ...s }))
            disegna()
            notifica_()
          },
        }), ridisposta]
      : []),
  )

  if (seguePause) {
    disponi()
    return contenitore
  }
  disegna()
  // Quel che si vede è già attaccato (un buco nell'ora salvata la catena l'ha
  // chiuso): anche senza toccare niente si salva questo.
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
  /**
   * Quanto dura l'ora proposta, in minuti: l'editor del calendario la ricava
   * dal tratto disegnato. Senza, l'ora predefinita delle Impostazioni.
   */
  durataProposta?: number
  /** Che cosa fare dopo aver salvato: di norma aprirsi sulla lezione. */
  dopo?: (lezioneId: string) => void
}

export function moduloLezione (opzioni: OpzioniModuloLezione = {}): void {
  const t = testi().lezione
  const L = lessico()
  // Senza anno non c'è a che cosa appendere una lezione: si apre il modulo che lo crea.
  const anno = richiedeAnno(() => moduloAnno())
  if (!anno) return

  const modifica = Boolean(opzioni.lezione)
  // Un'ora che c'è già si cambia solo con «Modifica» accesa; i pulsanti lo dicono
  // spegnendosi, questo è per chi arriva da altrove.
  if (modifica && !stato.editorCalendario) {
    notifica(t.accendiModifica(parole().modifica), 'avviso')
    return
  }
  // Una lezione nuova nasce sulle pause della giornata, se ce ne sono.
  const giornata = stato.registro.impostazioni
  const base =
    opzioni.lezione ??
    lezioneNellaGiornata(
      opzioni.corsoId && stato.registro.corsi.some((c) => c.id === opzioni.corsoId)
        ? opzioni.corsoId
        : corsoProposto(opzioni.classeId),
      opzioni.data ?? stato.data ?? oggi(),
      inizioSullaGriglia(
        opzioni.oraProposta ?? giornata.oraInizioGiornata,
        giornata,
      ),
      opzioni.durataProposta ?? giornata.durataSlotPredefinita,
      giornata,
    )

  let slot = base.slot.map((s) => ({ ...s }))
  // Ancorata a eventi ICS: corso, data e orario li detta il calendario, e qui sono
  // spenti (cambiarli romperebbe il collegamento). Vedi `ancorataAIcs`.
  const ancorata = modifica && ancorataAIcs(base.id)
  // L'aula la detta solo se l'evento ne scrive una (campo spento, si allinea
  // salvando); altrimenti si scrive a mano. Vedi `aulaDaIcs`.
  const aulaIcs = ancorata ? aulaDaIcs(base.id) : ''
  // Il corso scelto comanda l'elenco dei piani: quelli della sua materia, di
  // qualunque anno. Cambiando corso l'elenco si rifà.
  let corsoScelto = base.corsoId
  let rinfrescaPiani: ((scelto?: string) => void) | null = null

  apriModale({
    titolo: modifica ? t.titoloModifica : t.titoloNuova,
    sottotitolo: modifica ? formattaData(base.data, 'lungo') : undefined,
    larghezza: 'media',
    testoSalva: modifica ? parole().salva : t.crea,
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        ancorata ? avviso(aulaIcs ? t.collegataConAula : t.collegataSenzaAula) : null,
        riga(
          campoCorso({
            valore: base.corsoId,
            richiesto: true,
            disabilitato: ancorata,
            aiuto: t.aiutoCorso,
            al: (valore) => {
              corsoScelto = valore
              // Il piano di un'altra materia non c'entra più: la scelta riparte da zero.
              rinfrescaPiani?.('')
            },
          }),
          campo({
            nome: 'data',
            etichetta: parole().data,
            tipo: 'date',
            valore: base.data,
            richiesto: true,
            disabilitato: ancorata,
            larghezza: 'meta',
          }),
        ),
        riga(
          campo({
            nome: 'aula',
            etichetta: parole().aula,
            valore: aulaIcs || (base.aula ?? ''),
            disabilitato: Boolean(aulaIcs),
            aiuto: aulaIcs ? t.aulaDaIcs : undefined,
            larghezza: 'meta',
          }),
          campo({
            nome: 'stato',
            etichetta: parole().stato,
            tipo: 'select',
            valore: base.stato,
            opzioni: VOCI_STATO_LEZIONE,
            larghezza: 'quarto',
          }),
        ),
        sezioneModulo(
          t.orario,
          // Ancorata: le fasce del calendario ferme, le altre modificabili (`editorSlot`).
          // L'ora segue le pause della giornata da sé; la casella la lascia libera.
          editorSlot(slot, (nuovi) => {
            slot = nuovi
          }, giornata, { ancorata, seguePause: true }),
        ),
        sezioneModulo(
          Uno(L.pianoLezione),
          campoCollegato({
            nome: 'pianoId',
            etichetta: Uno(L.scaletta),
            valore: base.pianoId ?? '',
            vuoto: t.nessunPiano,
            voci: () =>
              pianiPerCorso(corsoScelto).map((p) => ({ valore: p.id, testo: nomeDiPiano(p) })),
            titoloNuovo: t.nuovoPiano,
            apriNuovo: (fatto) =>
              moduloPiano(undefined, fatto, corsoScelto || null),
            aiuto: t.aiutoPiano,
            riferimento: (rinfresca) => {
              rinfrescaPiani = rinfresca
            },
          }),
        ),
      ),
    alSalva: async (valori, contesto) => {
      // L'ora com'è adesso: presenze, argomenti e consuntivo possono essere cambiati altrove.
      const viva = baseViva(contesto, modifica, base, lezionePerId(base.id))
      if (!viva) return
      // Ancorata: corso, data e fasce del calendario sono quelli dell'ora viva (il
      // calendario può averli spostati a modulo aperto); del modulo si prendono le
      // fasce libere, e l'aula dell'evento se ne dà una.
      const lezione: Lezione = {
        ...viva,
        ...(ancorata
          ? { slot: conFasceLibere(viva.slot, slot) }
          : { corsoId: testo(valori.corsoId), data: testo(valori.data), slot }),
        aula: aulaIcs || testo(valori.aula),
        stato: testo(valori.stato) as Lezione['stato'],
        pianoId: testo(valori.pianoId) || null,
      }
      // Cambiare piano dopo che si è già segnato l'avanzamento lascerebbe
      // spunte su attività di un altro piano.
      if (lezione.pianoId !== viva.pianoId) lezione.avanzamento = []

      await salva(
        contesto,
        { tipo: 'lezione.salva', lezione },
        modifica ? t.aggiornata : t.creata,
        (idCreato) => opzioni.dopo?.(idCreato ?? lezione.id),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? [
            // Ancorata: orario e aula come negli eventi ICS. Scrive subito e
            // chiude, perché i campi aperti direbbero ancora il prima.
            ancorata
              ? pulsante({
                  testo: t.sincronizza,
                  simbolo: 'ricarica',
                  variante: 'sottile',
                  titolo: t.titoloSincronizza,
                  al: async () => {
                    contesto.occupato(true)
                    const cambiata = await sincronizzaDaIcs(lezionePerId(base.id) ?? base)
                    contesto.occupato(false)
                    if (cambiata) contesto.chiudi()
                  },
                })
              : null,
            tastoDuplica({
              contesto,
              azione: { tipo: 'lezione.duplica', lezioneId: base.id, data: base.data },
              fatto: t.duplicata,
              poi: (idCreato) => aggiorna({ vista: 'lezione', lezioneId: idCreato }),
            }),
            // Ancorata a eventi ICS: niente «Elimina». Vedi `ancorataAIcs`.
            ancorata
              ? null
              : tastoElimina({
                  contesto,
                  chiedi: { genere: 'lezione', id: base.id },
                  azione: { tipo: 'lezione.elimina', lezioneId: base.id },
                  fatto: t.eliminata,
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
  const t = testi().osservazione
  const modifica = Boolean(osservazione)
  const base = osservazione ?? creaOsservazione('nota', '')
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  apriModale({
    titolo: modifica ? t.titoloModifica : t.titoloNuova,
    sottotitolo: `${classe?.nome ?? ''} — ${formattaData(lezione.data, 'lungo')}`,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'allievoId',
            etichetta: t.riguarda,
            tipo: 'select',
            valore: base.allievoId ?? '',
            opzioni: [
              { valore: '', testo: t.tuttaLaClasse },
              ...allievi.map((a) => ({ valore: a.id, testo: nomeCompleto(a) })),
            ],
            larghezza: 'meta',
          }),
          campo({
            nome: 'tipo',
            etichetta: parole().tipo,
            tipo: 'select',
            valore: base.tipo,
            opzioni: VOCI_TIPO_OSSERVAZIONE,
            larghezza: 'meta',
          }),
        ),
        campo({
          nome: 'testo',
          etichetta: Uno(lessico().osservazione),
          tipo: 'textarea',
          righe: 4,
          valore: base.testo,
          richiesto: true,
        }),
        campo({
          nome: 'ora',
          etichetta: parole().ora,
          tipo: 'time',
          valore: base.ora ?? '',
          larghezza: 'quarto',
        }),
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
        modifica ? t.aggiornata : t.registrata,
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: {
              titolo: t.eliminare,
              testo: t.nonSiTorna,
            },
            azione: { tipo: 'osservazione.elimina', lezioneId: lezione.id, osservazioneId: base.id },
            fatto: t.eliminata,
          })
        : null,
  })
}

