// I calendari ICS del documento, e le regole con cui i loro eventi diventano
// lezioni. Ogni calendario si legge da una copia dentro il documento, rifatta
// solo con «Aggiorna»: il confronto funziona senza rete e non cambia da solo.
// Le regole valgono per tutti i calendari e si salvano con `impostazioni.salva`;
// i calendari hanno azioni loro, perché scrivono o buttano la copia.
// L'origine può contenere un gettone d'accesso: a schermo solo il sito, il link
// intero solo nel campo per cambiarlo, mai in una notifica.

import { criterioRegola } from '../../../domain/calendarRules.js'
import { istante } from '../../../i18n/index.js'
import { parole } from '../../../domain/words.testi.js'
import { nuovoIdRegolaCalendario } from '../../../domain/identifiers.js'
import type {
  CalendarioEsterno,
  Impostazioni,
  RegolaCalendario,
  SorgenteCalendario,
} from '../../../domain/models.js'
import { nomeDaOrigine } from '../../../domain/normalization.js'
import { campo, pastiglia, pulsante, scheda, statoVuoto } from '../../components/base.js'
import { suggerimento } from '../../components/hint.js'
import { apriModale, conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h, type Figlio } from '../../dom.js'
import { azione, invia } from '../../bridge.js'
import { aggiorna, iscriviti, stato } from '../../state.js'
import { moduloCalendario } from '../../forms/calendar.js'
import { opzioniCorsi } from '../../forms/common.js'
import { contiDelleRegole, segnoConteggio } from '../../ruleCounts.js'
import { testi } from './icsCalendar.testi.js'

/** Il valore della tendina che dice «non è una lezione». */
const NON_LEZIONE = ''

/** Che cosa si può scrivere come origine di un calendario. */
const ESEMPIO_ORIGINE = testi().esempioOrigine

function calendarioOra (): CalendarioEsterno {
  const salvato = stato.registro.impostazioni.calendario
  return { calendari: salvato?.calendari ?? [], regole: salvato?.regole ?? [] }
}

/**
 * Scrive le regole nel documento, o toglie il calendario se non resta niente.
 * I calendari passano come sono (li gestiscono le loro azioni). Non usa
 * `salvaImpostazioni` di `document.ts`, che fonde e quindi non toglie mai un
 * campo: qui il campo si manda intero, o non si manda.
 */
async function scrivi (calendario: CalendarioEsterno, detto?: string): Promise<boolean> {
  const { calendario: _vecchio, ...resto } = stato.registro.impostazioni
  const vuoto = calendario.calendari.length === 0 && calendario.regole.length === 0
  const impostazioni: Impostazioni = vuoto ? resto : { ...resto, calendario }
  const risposta = await azione({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return false
  if (detto) notifica(detto, 'info')
  return true
}

/**
 * Se un'altra regola ha già questo testo, a meno di maiuscole e spazi in fondo:
 * normalizzare come il confronto storpierebbe le espressioni regolari.
 */
function doppione (testo: string, tranne?: string): RegolaCalendario | undefined {
  const cercato = testo.trim().toLowerCase()
  return calendarioOra().regole.find(
    (r) => r.id !== tranne && r.testo.trim().toLowerCase() === cercato,
  )
}

/**
 * Perché un testo non va bene come regola, o `null`: vuoto, o espressione
 * regolare che non si compila (non abbinerebbe mai).
 */
function testoRifiutato (testo: string): string | null {
  if (!testo.trim()) return testi().regolaVuota
  if (criterioRegola(testo) === null) return testi().regolaIlleggibile
  return null
}

/** Le voci della tendina dei corsi, con quello che non c'è più se serve. */
function opzioniDi (corsoId: string | null): Array<{ valore: string, testo: string }> {
  const corsi = opzioniCorsi()
  const voci = [{ valore: NON_LEZIONE, testo: testi().nonLezione }, ...corsi]
  // Un corso tolto o di un altro anno che la regola nomina ancora: la tendina lo dice.
  if (corsoId && !corsi.some((c) => c.valore === corsoId)) {
    voci.push({ valore: corsoId, testo: testi().corsoSparito })
  }
  return voci
}

// --------------------------------------------------------------- i calendari

/**
 * Il gesto su un calendario, con la frase d'errore dell'host se va male.
 * `invia` e non `azione`, che direbbe il rifiuto una seconda volta.
 */
async function gesto (chiesta: Parameters<typeof invia>[0], ripiego: string): Promise<boolean> {
  const risposta = await invia(chiesta)
  if (!risposta.ok) notifica(risposta.errori?.[0] ?? ripiego, 'errore')
  return risposta.ok
}

/** Quando si è fatta la copia, come lo si dice. */
function dataCopia (iso: string | undefined): string {
  const t = testi()
  if (!iso) return t.nessunaCopia
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return t.copiaSconosciuta
  return t.copiaDel(istante(data, {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }))
}

/** Da dove viene, detto senza mai scrivere il gettone d'accesso. */
function provenienza (origine: string): string {
  return /^(https?|webcals?):\/\//i.test(origine)
    ? testi().dalSito(nomeDaOrigine(origine))
    : testi().dalFile(origine)
}

async function togliCalendario (calendario: SorgenteCalendario): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.togliere(calendario.nome),
    testo: t.togliereTesto,
    testoConferma: parole().togli,
  })
  if (!sicuro) return
  const tolto = await gesto({ tipo: 'calendario.togli', calendarioId: calendario.id }, t.nonTolto)
  if (tolto) notifica(t.tolto(calendario.nome), 'info')
}

function rigaCalendario (calendario: SorgenteCalendario): HTMLElement {
  const t = testi()
  return h(
    'div',
    { class: 'ics-calendario' },
    h(
      'div',
      { class: 'ics-calendario__testata' },
      campo({
        // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
        nome: `calendario-nome-${calendario.id}`,
        valore: calendario.nome,
        classe: 'ics-calendario__nome',
        // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
        fuoco: `ics-nome-${calendario.id}`,
        al: (valore, evento) => {
          const nome = valore.trim()
          if (nome === calendario.nome) return
          if (!nome) {
            notifica(t.serveNome, 'avviso')
            // Direttamente nel campo: nella finestra dei calendari non arriva un ridisegno.
            ;(evento.target as HTMLInputElement).value = calendario.nome
            return
          }
          void gesto(
            { tipo: 'calendario.modifica', calendarioId: calendario.id, nome },
            t.nomeNonCambiato,
          )
        },
      }),
      h(
        'div',
        { class: 'ics-sorgente__gesti' },
        pulsante({
          testo: parole().aggiorna,
          simbolo: 'ricarica',
          variante: 'sottile',
          titolo: t.aggiornaAiuto,
          al: () => void gesto(
            { tipo: 'calendario.aggiorna', calendarioId: calendario.id },
            t.nonAggiornato,
          ),
        }),
        pulsante({
          testo: t.confronta,
          simbolo: 'calendario',
          variante: 'sottile',
          titolo: t.confrontaAiuto,
          al: () => moduloCalendario(calendario.id),
        }),
        pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: t.togliNome(calendario.nome),
          al: () => void togliCalendario(calendario),
        }),
      ),
    ),
    h(
      'p',
      { class: 'voce-opzione__aiuto' },
      `${provenienza(calendario.origine)} · ${dataCopia(calendario.copiatoIl)}`,
    ),
    // Il link intero solo qui, chiuso: serve a correggerlo, non a leggerlo.
    h(
      'details',
      { class: 'ics-calendario__origine' },
      // Che cosa succede cambiando sta dietro la «i»: il vecchio non si perde se il
      // nuovo non si legge.
      h(
        'summary',
        null,
        t.cambiaOrigine,
        suggerimento(t.cambiaOrigineAiuto, { etichetta: t.cambiaOrigine }),
      ),
      campo({
        // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
        nome: `calendario-origine-${calendario.id}`,
        valore: calendario.origine,
        segnaposto: ESEMPIO_ORIGINE,
        // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
        fuoco: `ics-origine-${calendario.id}`,
        al: (valore) => {
          const origine = valore.trim()
          if (!origine || origine === calendario.origine) return
          void gesto(
            { tipo: 'calendario.modifica', calendarioId: calendario.id, origine },
            t.restaQuello,
          )
        },
      }),
    ),
  )
}

/** La riga per aggiungere un calendario: un indirizzo, o un file dal disco. */
function rigaNuovoCalendario (): HTMLElement {
  const t = testi()
  const origine = campo({
    nome: 'calendario-nuovo',
    etichetta: t.aggiungiCalendario,
    segnaposto: ESEMPIO_ORIGINE,
    classe: 'ics-sorgente__campo',
    fuoco: 'ics-nuovo',
  })
  const aggiungi = (testo: string): void => {
    void gesto({ tipo: 'calendario.aggiungi', origine: testo.trim() }, t.nonAggiunto)
  }
  return h(
    'div',
    {
      class: 'ics-sorgente ics-sorgente--nuova',
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'Enter' && (evento.target as HTMLElement).tagName === 'INPUT') {
          evento.preventDefault()
          aggiungi((evento.target as HTMLInputElement).value)
        }
      },
    },
    origine,
    h(
      'div',
      { class: 'ics-sorgente__gesti' },
      pulsante({
        testo: parole().aggiungi,
        simbolo: 'piu',
        variante: 'sottile',
        titolo: t.aggiungiAiuto,
        al: () => aggiungi(origine.querySelector('input')?.value ?? ''),
      }),
      pulsante({
        testo: t.unFile,
        simbolo: 'cartella',
        variante: 'sottile',
        titolo: t.unFileAiuto,
        al: () => aggiungi(''),
      }),
    ),
  )
}

function gruppoCalendari (calendario: CalendarioEsterno): HTMLElement {
  return h(
    'section',
    { class: 'gruppo-opzioni' },
    h('h4', { class: 'gruppo-opzioni__titolo' }, testi().calendari(calendario.calendari.length)),
    calendario.calendari.length === 0
      ? h('p', { class: 'voce-opzione__aiuto' }, testi().nessunCalendario)
      : h('div', { class: 'ics-calendari' }, ...calendario.calendari.map((c) => rigaCalendario(c))),
    rigaNuovoCalendario(),
  )
}

// ----------------------------------------------------------------- le regole

/**
 * Il posto del conto di una regola, rifatto mentre si scrive: si riconta con
 * il testo di adesso (le altre regole restano quelle salvate) e si cambia solo
 * la pastiglia, per non perdere il cursore.
 */
function contoVivo (
  regole: readonly RegolaCalendario[],
  indice: number,
  conti: ReturnType<typeof contiDelleRegole>,
): { dove: HTMLElement, rifai: (testo: string) => void } {
  const dove = h('span', { class: 'ics-regola__conto' }, segnoConteggio(conti?.[indice]))
  const rifai = (testo: string): void => {
    const provate = regole.map((r, i) => (i === indice ? { ...r, testo } : r))
    dove.replaceChildren(segnoConteggio(contiDelleRegole(provate)?.[indice]) ?? '')
  }
  return { dove, rifai }
}

function rigaRegola (
  regola: RegolaCalendario,
  indice: number,
  regole: readonly RegolaCalendario[],
  conti: ReturnType<typeof contiDelleRegole>,
): HTMLElement {
  const corsoSparito =
    regola.corsoId !== null && !opzioniCorsi().some((c) => c.valore === regola.corsoId)
  const rottaGia = criterioRegola(regola.testo) === null
  const conto = contoVivo(regole, indice, conti)
  const t = testi()

  const cambia = (modifica: Partial<RegolaCalendario>): void => {
    const calendario = calendarioOra()
    void scrivi({
      ...calendario,
      regole: calendario.regole.map((r) => (r.id === regola.id ? { ...r, ...modifica } : r)),
    })
  }

  const campoTesto = campo({
    // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
    nome: `regola-testo-${regola.id}`,
    valore: regola.testo,
    classe: 'ics-regola__testo',
    // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
    fuoco: `ics-regola-${regola.id}`,
    al: (valore) => {
      const nuovo = valore.trim()
      if (nuovo === regola.testo) return
      const rifiuto = testoRifiutato(nuovo)
      if (rifiuto) {
        notifica(nuovo ? rifiuto : t.perToglierla(rifiuto), 'avviso')
        // Il campo mostrerebbe il testo rifiutato: si ridisegna con quello vero.
        aggiorna({})
        return
      }
      const gia = doppione(nuovo, regola.id)
      if (gia) {
        notifica(t.giaUnaRegola(gia.testo), 'avviso')
        aggiorna({})
        return
      }
      cambia({ testo: nuovo })
    },
  })
  campoTesto.addEventListener('input', (evento) => {
    conto.rifai((evento.target as HTMLInputElement).value)
  })

  return h(
    'div',
    { class: ['ics-regola', (corsoSparito || rottaGia) && 'ics-regola--orfana'] },
    campoTesto,
    h('span', { class: 'ics-regola__freccia', attr: { 'aria-hidden': 'true' } }, '→'),
    campo({
      // testo-fisso: nomi dei campi e chiavi di fuoco, non si leggono
      nome: `regola-corso-${regola.id}`,
      tipo: 'select',
      valore: regola.corsoId ?? NON_LEZIONE,
      opzioni: opzioniDi(regola.corsoId),
      classe: 'ics-regola__corso',
      al: (valore) => cambia({ corsoId: valore === NON_LEZIONE ? null : valore }),
    }),
    corsoSparito ? pastiglia(t.corsoNonPiu, 'attenzione') : null,
    // Salvata così da un'altra via (riga di comando, file vecchio): non abbina, e
    // solo qui si vede.
    rottaGia ? pastiglia(t.nonSiLegge, 'negativo') : null,
    conto.dove,
    pulsante({
      simbolo: 'cestino',
      variante: 'fantasma',
      titolo: t.togliRegola(regola.testo),
      al: () => {
        const calendario = calendarioOra()
        void scrivi(
          { ...calendario, regole: calendario.regole.filter((r) => r.id !== regola.id) },
          t.regolaTolta(regola.testo),
        )
      },
    }),
  )
}

/** La riga in fondo per una regola nuova: testo, corso, «Aggiungi». */
function rigaNuova (): HTMLElement {
  const t = testi()
  const testo = campo({
    nome: 'regola-nuova-testo',
    etichetta: t.regolaNuova,
    segnaposto: t.regolaNuovaSegnaposto,
    classe: 'ics-regola__testo',
    fuoco: 'ics-regola-nuova',
  })
  // Il conto della regola che si sta scrivendo, contro quelle già salvate.
  const contoNuovo = h('span', { class: 'ics-regola__conto' })
  testo.addEventListener('input', (evento) => {
    const scritto = (evento.target as HTMLInputElement).value
    const salvate = calendarioOra().regole
    const conti = scritto.trim()
      ? contiDelleRegole([...salvate, { testo: scritto, corsoId: null }])
      : null
    contoNuovo.replaceChildren(segnoConteggio(conti?.[salvate.length]) ?? '')
  })
  const corso = campo({
    nome: 'regola-nuova-corso',
    etichetta: t.lezioneDi,
    tipo: 'select',
    valore: opzioniCorsi()[0]?.valore ?? NON_LEZIONE,
    opzioni: opzioniDi(null),
    classe: 'ics-regola__corso',
  })

  const aggiungi = (): void => {
    const scritto = (testo.querySelector('input')?.value ?? '').trim()
    const corsoId = corso.querySelector('select')?.value ?? NON_LEZIONE
    const rifiuto = testoRifiutato(scritto)
    if (rifiuto) {
      notifica(scritto ? rifiuto : t.scriviTesto, 'avviso')
      return
    }
    const gia = doppione(scritto)
    if (gia) {
      notifica(t.giaUnaRegolaCorso(gia.testo), 'avviso')
      return
    }
    const calendario = calendarioOra()
    void scrivi({
      ...calendario,
      regole: [
        ...calendario.regole,
        {
          id: nuovoIdRegolaCalendario(),
          testo: scritto,
          corsoId: corsoId === NON_LEZIONE ? null : corsoId,
        },
      ],
    })
  }

  return h(
    'div',
    {
      class: 'ics-regola ics-regola--nuova',
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'Enter' && (evento.target as HTMLElement).tagName === 'INPUT') {
          evento.preventDefault()
          aggiungi()
        }
      },
    },
    testo,
    h('span', { class: 'ics-regola__freccia', attr: { 'aria-hidden': 'true' } }, '→'),
    corso,
    contoNuovo,
    pulsante({ testo: parole().aggiungi, simbolo: 'piu', variante: 'sottile', al: aggiungi }),
  )
}

function gruppoRegole (calendario: CalendarioEsterno): HTMLElement {
  const regole = calendario.regole
  const conti = contiDelleRegole(regole)
  const orfane = regole.filter(
    (r) => r.corsoId !== null && !opzioniCorsi().some((c) => c.valore === r.corsoId),
  ).length
  const t = testi()

  return h(
    'section',
    { class: 'gruppo-opzioni' },
    h(
      'div',
      { class: 'ics-regole__testata' },
      // Come si scrive una regola e che cosa dicono i numeri: dietro la «i» del
      // titolo. Le regole orfane restano in vista sotto.
      h(
        'h4',
        { class: 'gruppo-opzioni__titolo' },
        t.regoleConte(regole.length),
        suggerimento(
          h('span', null, t.regoleAiuto, conti ? t.regoleAiutoConti : null),
          { etichetta: t.regole },
        ),
      ),
      regole.length > 0
        ? pulsante({
            testo: t.togliTutte,
            simbolo: 'cestino',
            variante: 'fantasma',
            al: async () => {
              const sicuro = await conferma({
                titolo: t.togliereRegole(regole.length),
                testo: t.togliereRegoleTesto,
                testoConferma: t.togliTutte,
              })
              if (!sicuro) return
              await scrivi({ ...calendarioOra(), regole: [] }, t.regoleTolte)
            },
          })
        : null,
    ),
    orfane > 0
      ? h(
          'p',
          { class: 'voce-opzione__aiuto' },
          pastiglia(t.orfane(orfane), 'attenzione'),
          t.orfaneNota,
        )
      : null,
    regole.length === 0
      ? statoVuoto({
          simbolo: 'calendario',
          titolo: t.nessunaRegola,
          testo: t.nessunaRegolaTesto,
        })
      : h('div', { class: 'ics-regole' }, ...regole.map((r, i) => rigaRegola(r, i, regole, conti))),
    rigaNuova(),
  )
}

/** La scheda «Calendari ICS» nella sezione Calendario del documento. */
export function schedaCalendarioIcs (): HTMLElement {
  const calendario = calendarioOra()
  const qualcosa = calendario.calendari.length > 0 || calendario.regole.length > 0
  const t = testi()

  const azioni: Figlio = qualcosa
    ? pulsante({
        testo: t.rimuoviTutto,
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.rimuoviTuttoAiuto,
        al: async () => {
          const sicuro = await conferma({
            titolo: t.rimuovere,
            testo: t.rimuovereTesto,
            testoConferma: t.rimuovi,
          })
          if (!sicuro) return
          // Prima le regole, poi i calendari: l'ultimo che se ne va trova le regole già
          // vuote e porta via tutto il campo.
          if (!(await scrivi({ ...calendarioOra(), regole: [] }))) return
          for (const c of calendarioOra().calendari) {
            const tolto = await gesto({ tipo: 'calendario.togli', calendarioId: c.id }, t.nonTolto)
            if (!tolto) return
          }
          notifica(t.rimossi, 'info')
        },
      })
    : null

  return scheda({
    titolo: t.calendariIcs,
    aiuto: t.calendariIcsAiuto,
    classe: 'scheda--opzioni',
    azioni,
    contenuto: h(
      'div',
      { class: 'gruppi-opzioni' },
      gruppoCalendari(calendario),
      gruppoRegole(calendario),
    ),
  })
}

/**
 * I calendari ICS in una finestra, aperta da «Confronta con il calendario»:
 * lo stesso elenco della scheda, e «Confronta» apre la revisione. La finestra
 * si iscrive allo stato e rifà l'elenco solo quando cambiano i calendari, per
 * non perdere il cursore.
 */
export function moduloCalendariIcs (): void {
  const elenco = h('div', { class: 'gruppi-opzioni' })
  let visto: CalendarioEsterno | undefined | null = null
  const disegna = (): void => {
    const ora = stato.registro.impostazioni.calendario
    if (ora === visto) return
    visto = ora
    elenco.replaceChildren(gruppoCalendari(calendarioOra()))
  }
  disegna()
  const smetti = iscriviti(disegna)
  const t = testi()

  apriModale({
    titolo: t.calendariIcs,
    aiuto: t.finestraAiuto,
    larghezza: 'larga',
    corpo: (contesto) => h(
      'div',
      null,
      elenco,
      h(
        'div',
        { class: 'opzioni__rimando' },
        h('p', { class: 'opzioni__rimando-testo' }, t.regoleComuni),
        pulsante({
          testo: t.apriRegole,
          simbolo: 'impostazioni',
          variante: 'sottile',
          al: () => {
            contesto.chiudi()
            aggiorna({
              vista: 'impostazioni',
              ambitoImpostazioni: 'documento',
              schedaDocumento: 'ics',
            })
          },
        }),
      ),
    ),
    allaChiusura: () => { smetti() },
  })
}
