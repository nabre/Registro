// L'ora: quando si fa, quanto dura, che cosa è successo dentro. L'editor degli
// slot porta il peso: un'ora ha pause in mezzo, e le parti si spostano insieme.

import { useLayoutEffect, useReducer, useRef, type ReactElement } from 'react'

import { inizioSullaGriglia, lezioneNellaGiornata, slotSullePause } from '#core/dominio/breaks.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { titoloComando } from '#contract/manifest.js'
import {
  allieviAttivi, nomeCompleto, ordinaAllievi, slotIncatenati, slotOrdinati, slotSegnati,
} from '#core/dominio/calculations.js'
import {
  durataMinuti,
  formattaData,
  formattaDurata,
  minutiDaUd,
  oggi,
  siglaUd,
  sommaMinuti,
  udDaMinuti,
} from '#core/dominio/dates.js'
import { creaOsservazione, creaSlot } from '#core/dominio/factories.js'
import type { Classe, Giornata, Lezione, Osservazione, Slot } from '#core/dominio/models.js'
import { Avviso, Campo, Pastiglia, Pulsante, Riga, SezioneModulo } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { apriModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { classi } from '#ui/classNames.js'
import { Input } from '#ui/fields.js'
import { ancorataAIcs, aulaDaIcs } from '#ui/externalCalendar.js'
import { lezionePerId, nomeDiPiano, pianiPerCorso, stato, vai } from '#ui/state.js'

import {
  CampoCollegato,
  PresaDiRiga,
  TastoDuplica,
  TastoElimina,
  baseViva,
  corsoProposto,
  richiedeAnno,
  salva,
  spostaVoce,
  testo,
  useRiordino,
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
 * L'editor degli slot: i tratti di un'ora, pause comprese. Le righe restano
 * mentre si scrive (si riscrivono solo i numeri che dipendono); si rifanno da
 * capo solo aggiungendo, togliendo, trascinando o ridisponendo sulle pause.
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
function EditorSlot ({ iniziali, allaModifica, giornata, ancorata = false, seguePause: segueChiesta = false }: {
  iniziali: Slot[]
  allaModifica: (slot: Slot[]) => void
  giornata: Giornata
  ancorata?: boolean
  seguePause?: boolean
}): ReactElement {
  const t = testi().editor
  const L = lessico()
  const { minutiUd } = giornata
  // Ancorata, le pause della giornata non contano: l'ora la detta l'evento.
  const suPause: Giornata = ancorata ? { minutiUd } : giornata
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  /** Cresce quando le righe si rifanno da capo. */
  const [versione, avanza] = useReducer((n: number) => n + 1, 0)

  /**
   * Le fasce di adesso, cambiate subito dai gesti (le righe tengono in mano la
   * loro voce), la casella delle pause e l'ora com'era all'apertura: spegnendo
   * la casella si torna lì.
   */
  const dati = useRef<{ slot: Slot[], seguePause: boolean, originali: Slot[] } | null>(null)

  /**
   * Riattacca gli slot uno dietro l'altro, sugli stessi oggetti: le righe già
   * disegnate tengono in mano la loro voce.
   */
  const riallinea = (slot: Slot[], inizio?: string) => {
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

  if (dati.current === null) {
    const slot = slotOrdinati(ancorata ? slotSegnati(iniziali) : iniziali).map((s) => ({ ...s }))
    const seguePause = Boolean(suPause.pause) && segueChiesta
    const originali = slot.map((s) => ({ ...s }))
    const disposte = seguePause ? slotSullePause(slot, suPause, undefined) : slot
    riallinea(disposte)
    dati.current = { slot: disposte, seguePause, originali }
  }
  const d = dati.current

  const notifica_ = () => allaModifica(d.slot.map((s) => ({ ...s })))

  // Quel che si vede è già attaccato (un buco nell'ora salvata la catena l'ha
  // chiuso, o l'ha ridisposto sulle pause): anche senza toccare niente si salva questo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => notifica_(), [])

  /** Rifà le righe da capo. Solo quando cambia quante sono, o in che ordine stanno. */
  const disegna = () => {
    riallinea(d.slot)
    avanza()
  }

  /**
   * Le fasce rifatte sulle pause della giornata, dall'inizio dato (o di adesso)
   * portato sulla griglia. Le righe si rifanno, perché il numero può cambiare
   * (succede su `change`, a campo lasciato).
   */
  const disponi = (inizio?: string) => {
    const agganciato = inizio === undefined ? undefined : inizioSullaGriglia(inizio, suPause)
    d.slot = slotSullePause(d.slot, suPause, agganciato)
    disegna()
    notifica_()
  }

  /** Rifà la catena: le righe restano, i numeri che dipendono si riscrivono. */
  const incatena = (inizio?: string) => {
    if (d.seguePause) {
      disponi(inizio)
      return
    }
    riallinea(d.slot, inizio)
    rifai()
    notifica_()
  }

  /** Se l’orario non è più quello con cui l’ora si è aperta. */
  const cambiata = (): boolean =>
    d.slot.length !== d.originali.length ||
    d.slot.some((s, i) => {
      const o = d.originali[i]
      return s.tipo !== o.tipo || s.inizio !== o.inizio || s.fine !== o.fine
    })

  const riordino = useRiordino((da, a) => {
    if (a < 0 || a >= d.slot.length || da === a) return false
    const spostati = spostaVoce(d.slot, da, a)
    // Le fasce del calendario restano un blocco solo: una fascia libera messa
    // in mezzo spezzerebbe l'ora dell'evento.
    if (ancorata && !calendarioContiguo(spostati)) return false
    d.slot = spostati
    // Sulle pause l’ordine non si sceglie: lo dettano loro.
    if (d.seguePause) return disponi()
    disegna()
    notifica_()
  })

  /** La durata scritta di una voce: la lezione in UD, la pausa in minuti. */
  const durataScritta = (voce: Slot): string => {
    const quanto = durataMinuti(voce.inizio, voce.fine)
    return voce.tipo === 'pausa' ? String(quanto) : String(udDaMinuti(quanto, minutiUd))
  }

  const rigaSlot = (voce: Slot, indice: number): ReactElement => {
    if (ancorata && voce.ics) return rigaDelCalendario(voce)
    const pausa = voce.tipo === 'pausa'
    // Il primo slot detta l’ora di tutta la lezione; gli altri la ereditano.
    // Ancorata, nessuno: l’ora la detta l’evento.
    const attaccato = indice > 0 || ancorata
    // Sulle pause della giornata una pausa si legge soltanto: la ridisposizione la
    // rimetterebbe.
    const dellaGiornata = pausa && d.seguePause
    return (
      <div key={voce.id} className={classi('slot-riga', pausa && 'slot-riga--pausa')} {...riordino.riga(indice)}>
        <PresaDiRiga {...riordino.presa(indice)} />
        <span className="slot-riga__genere" title={Uno(pausa ? L.pausa : L.lezione)}>
          <Icona nome={pausa ? 'pausa' : 'orologio'} />
        </span>
        <Input
          className="campo__controllo campo__controllo--ora"
          type="time"
          valore={voce.inizio}
          disabled={attaccato}
          aria-label={attaccato ? t.inizioAttaccato : t.inizioLezione}
          title={ancorata ? t.titoloAncorata : attaccato ? t.titoloAttaccato : t.titoloPrimo}
          onCambio={(evento) => {
            const campo = evento.target as HTMLInputElement
            // Spostando l’ora del primo slot si sposta la lezione intera: gli altri
            // sono attaccati e vengono dietro, senza allungarsi.
            if (campo.value) incatena(campo.value)
            // Il campo dice quel che ne è venuto fuori (vuoto, torna com'era).
            campo.value = voce.inizio
          }}
        />
        <Input
          className="campo__controllo campo__controllo--numero"
          type="number"
          valore={durataScritta(voce)}
          disabled={dellaGiornata}
          min="1"
          step={pausa ? 'any' : '1'}
          aria-label={pausa ? t.durataInMinuti : Molti(L.unitaDidattica)}
          title={pausa ? (dellaGiornata ? t.pausaDellaGiornata : '') : undefined}
          onCambio={(evento) => {
            const campo = evento.target as HTMLInputElement
            const scritto = Number(campo.value)
            const minuti = pausa
              ? Math.max(5, Math.round(scritto) || 5)
              : minutiDaUd(scritto || 1, minutiUd)
            voce.fine = sommaMinuti(voce.inizio, minuti)
            // Allungare uno slot spinge avanti tutti quelli che gli stanno dietro.
            incatena()
            campo.value = durataScritta(voce)
          }}
        />
        <span className="slot-riga__durata">{pausa ? t.minuti : siglaUd()}</span>
        {/* La fine si legge, non si scrive: la dettano inizio e durata. */}
        <span className="slot-riga__durata">{`→ ${voce.fine}`}</span>
        <Input
          className="campo__controllo slot-riga__etichetta"
          type="text"
          valore={voce.etichetta ?? ''}
          placeholder={voce.tipo === 'pausa' ? L.pausa.singolare : t.notaSullaFascia}
          onCambio={(evento) => {
            voce.etichetta = (evento.target as HTMLInputElement).value
            notifica_()
          }}
        />
        <Pulsante
          simbolo="cestino"
          variante="fantasma"
          titolo={t.togliFascia}
          disabilitato={d.slot.length <= 1 || dellaGiornata}
          al={() => {
            d.slot = d.slot.filter((s) => s.id !== voce.id)
            if (d.seguePause) return disponi()
            disegna()
            notifica_()
          }}
        />
      </div>
    )
  }

  /** Una fascia del calendario: si legge, con la catena, e non si tocca. */
  const rigaDelCalendario = (voce: Slot): ReactElement => {
    const pausa = voce.tipo === 'pausa'
    const quanto = durataMinuti(voce.inizio, voce.fine)
    return (
      <div
        key={voce.id}
        className={classi('slot-riga', 'slot-riga--ics', pausa && 'slot-riga--pausa')}
        title={t.titoloIcs}
      >
        {/* La presa c'è ma non si vede: tiene le colonne allineate alle righe libere,
            e una fascia del calendario non si trascina. */}
        <PresaDiRiga style={{ visibility: 'hidden' }} tabIndex={-1} />
        <span className="slot-riga__genere" title={t.dalCalendarioIcs}>
          <Icona nome="collegamento" />
        </span>
        <span className="slot-riga__ora">{voce.inizio}</span>
        <span className="slot-riga__durata">
          {pausa ? t.quantiMinuti(quanto) : t.quanteUd(udDaMinuti(quanto, minutiUd))}
        </span>
        <span className="slot-riga__durata">{`→ ${voce.fine}`}</span>
        <span className="slot-riga__etichetta testo-quieto">{voce.etichetta || t.dalCalendarioIcsInRiga}</span>
      </div>
    )
  }

  const aggiungi = (tipo: 'lezione' | 'pausa') => {
    // In coda, attaccato all’ultimo: da lì lo si trascina dove serve. Ancorata,
    // anche sopra l’ora del calendario, per cominciare prima.
    const ultimo = d.slot.at(-1)
    const inizio = ultimo?.fine ?? stato.registro.impostazioni.oraInizioGiornata
    const durata =
      tipo === 'pausa'
        ? stato.registro.impostazioni.durataPausaPredefinita
        : stato.registro.impostazioni.durataSlotPredefinita
    d.slot = [...d.slot, creaSlot(inizio, durata, tipo)]
    if (d.seguePause) return disponi()
    disegna()
    notifica_()
  }

  const effettivi = d.slot
    .filter((s) => s.tipo === 'lezione')
    .reduce((somma, s) => somma + durataMinuti(s.inizio, s.fine), 0)
  const pause = d.slot
    .filter((s) => s.tipo === 'pausa')
    .reduce((somma, s) => somma + durataMinuti(s.inizio, s.fine), 0)
  const fine = d.slot.at(-1)?.fine

  return (
    <div className="slot-editor">
      <div key={versione} className="slot-editor__righe" ref={riordino.elenco}>
        {d.slot.map(rigaSlot)}
      </div>
      <div className="slot-editor__piede">
        <div className="slot-editor__comandi">
          <Pulsante
            testo={t.fasciaDiLezione}
            simbolo="piu"
            variante="sottile"
            al={() => aggiungi('lezione')}
          />
          {/* La pausa a mano si spegne quando le pause le mette la giornata. */}
          <Pulsante
            testo={Uno(L.pausa)}
            simbolo="pausa"
            variante="sottile"
            disabilitato={d.seguePause}
            titolo={d.seguePause ? t.pauseDellaGiornata(t.seguePause) : ''}
            al={() => aggiungi('pausa')}
          />
        </div>
        <div className="slot-editor__conti">
          <Pastiglia
            testo={t.contoLezione(udDaMinuti(effettivi, minutiUd), formattaDurata(effettivi))}
            tono="informativo"
            simbolo="orologio"
          />
          {pause > 0 ? <Pastiglia testo={t.contoPause(formattaDurata(pause))} tono="quiete" simbolo="pausa" /> : null}
          {fine ? <span className="testo-quieto">{t.finoAlle(fine)}</span> : null}
        </div>
      </div>
      {suPause.pause
        ? (
            <>
              <Campo
                nome="seguePause"
                etichetta={t.seguePause}
                tipo="checkbox"
                valore={d.seguePause}
                aiuto={t.aiutoSeguePause}
                al={(_valore, evento) => {
                  d.seguePause = (evento.target as HTMLInputElement).checked
                  if (d.seguePause) return disponi()
                  // Spenta, l’ora torna com’era all’apertura, e le fasce tornano
                  // scrivibili tutte.
                  d.slot = d.originali.map((s) => ({ ...s }))
                  disegna()
                  notifica_()
                }}
              />
              {/* Il perché di un orario cambiato senza che nessuno l’abbia toccato:
                  si dice solo quando è la casella ad aver cambiato l'ora. */}
              <p className="slot-editor__nota testo-quieto">
                {d.seguePause && cambiata() ? t.orarioAdattato : ''}
              </p>
            </>
          )
        : null}
    </div>
  )
}

interface OpzioniModuloLezione {
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
    titolo: modifica ? t.titoloModifica : titoloComando('registroDocenti.nuovaLezione'),
    sottotitolo: modifica ? formattaData(base.data, 'lungo') : undefined,
    larghezza: 'media',
    testoSalva: modifica ? parole().salva : t.crea,
    corpo: () => (
      <div className="modulo">
        {ancorata ? <Avviso>{aulaIcs ? t.collegataConAula : t.collegataSenzaAula}</Avviso> : null}
        <Riga>
          {campoCorso({
            valore: base.corsoId,
            richiesto: true,
            disabilitato: ancorata,
            aiuto: t.aiutoCorso,
            al: (valore) => {
              corsoScelto = valore
              // Il piano di un'altra materia non c'entra più: la scelta riparte da zero.
              rinfrescaPiani?.('')
            },
          })}
          <Campo
            nome="data"
            etichetta={parole().data}
            tipo="date"
            valore={base.data}
            richiesto
            disabilitato={ancorata}
            larghezza="meta"
          />
        </Riga>
        <Riga>
          <Campo
            nome="aula"
            etichetta={parole().aula}
            valore={aulaIcs || (base.aula ?? '')}
            disabilitato={Boolean(aulaIcs)}
            aiuto={aulaIcs ? t.aulaDaIcs : undefined}
            larghezza="meta"
          />
          <Campo
            nome="stato"
            etichetta={parole().stato}
            tipo="select"
            valore={base.stato}
            opzioni={VOCI_STATO_LEZIONE}
            larghezza="quarto"
          />
        </Riga>
        <Riga>
          <Campo
            nome="supplenza"
            tipo="checkbox"
            etichetta={t.supplenza}
            valore={base.supplenza === true}
            aiuto={t.aiutoSupplenza}
          />
        </Riga>
        <SezioneModulo titolo={t.orario}>
          {/* Ancorata: le fasce del calendario ferme, le altre modificabili (`EditorSlot`).
              L'ora segue le pause della giornata da sé; la casella la lascia libera. */}
          <EditorSlot
            iniziali={slot}
            allaModifica={(nuovi) => {
              slot = nuovi
            }}
            giornata={giornata}
            ancorata={ancorata}
            seguePause
          />
        </SezioneModulo>
        <SezioneModulo titolo={Uno(L.pianoLezione)}>
          <CampoCollegato
            nome="pianoId"
            etichetta={Uno(L.scaletta)}
            valore={base.pianoId ?? ''}
            vuoto={t.nessunPiano}
            voci={() => pianiPerCorso(corsoScelto).map((p) => ({ valore: p.id, testo: nomeDiPiano(p) }))}
            titoloNuovo={t.nuovoPiano}
            apriNuovo={(fatto) => moduloPiano(undefined, fatto, corsoScelto || null)}
            aiuto={t.aiutoPiano}
            riferimento={(rinfresca) => {
              rinfrescaPiani = rinfresca
            }}
          />
        </SezioneModulo>
      </div>
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
      // Solo quando è vera, come la scrive la normalizzazione.
      if (valori.supplenza) lezione.supplenza = true
      else delete lezione.supplenza
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
        ? (
            <>
              {/* Ancorata: orario e aula come negli eventi ICS. Scrive subito e
                  chiude, perché i campi aperti direbbero ancora il prima. */}
              {ancorata
                ? (
                    <Pulsante
                      testo={t.sincronizza}
                      simbolo="ricarica"
                      variante="sottile"
                      titolo={t.titoloSincronizza}
                      al={async () => {
                        contesto.occupato(true)
                        try {
                          const cambiata = await sincronizzaDaIcs(lezionePerId(base.id) ?? base)
                          if (cambiata) contesto.chiudi()
                        } finally {
                          contesto.occupato(false)
                        }
                      }}
                    />
                  )
                : null}
              <TastoDuplica
                contesto={contesto}
                azione={{ tipo: 'lezione.duplica', lezioneId: base.id, data: base.data }}
                fatto={t.duplicata}
                poi={(idCreato) => {
                  vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: idCreato } })
                }}
              />
              {/* Ancorata a eventi ICS: niente «Elimina». Vedi `ancorataAIcs`. */}
              {ancorata
                ? null
                : (
                    <TastoElimina
                      contesto={contesto}
                      chiedi={{ genere: 'lezione', id: base.id }}
                      azione={{ tipo: 'lezione.elimina', lezioneId: base.id }}
                      fatto={t.eliminata}
                      poi={() => {
                        vai({ pagina: 'pagina.calendario' }, { contesto: { lezioneId: null } })
                      }}
                    />
                  )}
            </>
          )
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
    corpo: () => (
      <div className="modulo">
        <Riga>
          <Campo
            nome="allievoId"
            etichetta={t.riguarda}
            tipo="select"
            valore={base.allievoId ?? ''}
            opzioni={[
              { valore: '', testo: t.tuttaLaClasse },
              ...allievi.map((a) => ({ valore: a.id, testo: nomeCompleto(a) })),
            ]}
            larghezza="meta"
          />
          <Campo
            nome="tipo"
            etichetta={parole().tipo}
            tipo="select"
            valore={base.tipo}
            opzioni={VOCI_TIPO_OSSERVAZIONE}
            larghezza="meta"
          />
        </Riga>
        <Campo
          nome="testo"
          etichetta={Uno(lessico().osservazione)}
          tipo="textarea"
          righe={4}
          valore={base.testo}
          richiesto
        />
        <Campo nome="ora" etichetta={parole().ora} tipo="time" valore={base.ora ?? ''} larghezza="quarto" />
      </div>
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
        ? (
            <TastoElimina
              contesto={contesto}
              chiedi={{ titolo: t.eliminare, testo: t.nonSiTorna }}
              azione={{ tipo: 'osservazione.elimina', lezioneId: lezione.id, osservazioneId: base.id }}
              fatto={t.eliminata}
            />
          )
        : null,
  })
}

