// Il confronto col calendario ICS: la revisione prima di scrivere. La finestra
// sceglie un calendario del documento, chiede il confronto all'host e mostra
// quattro mucchi: da creare, da allineare, da annullare, eventi senza corso.
// Cambia solo quel che è spuntato, quando si preme il tasto in fondo. Le scelte
// sugli eventi senza corso diventano regole e il confronto si rifà subito; le
// regole si salvano con le lezioni. Le lezioni che il calendario non ha si
// elencano soltanto, senza spunta per cancellarle.

import type {
  Confronto,
  EsitoConfronto,
  FasciaProposta,
  VoceConfronto,
} from '../../domain/calendar.js'
import { formattaData } from '../../domain/dates.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { RegolaCalendario } from '../../domain/models.js'
import { parole } from '../../domain/words.testi.js'
import { minuscolo } from '../../i18n/index.js'
import { avviso, pastiglia, pulsante, quieto, sezioneModulo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, rimpiazza } from '../dom.js'
import { azione, chiedi } from '../bridge.js'
import { nomeCorso, stato } from '../state.js'
import { contiDelleRegole, segnoConteggio } from '../ruleCounts.js'
import { inviaDalModulo, opzioniCorsi } from './common.js'

import { testi } from './calendar.testi.js'

/** Il valore della tendina che dice «non è una lezione». */
const IGNORA = '—ignora—'

type Regola = Omit<RegolaCalendario, 'id'> & { id?: string }

function orario (fasce: readonly FasciaProposta[]): string {
  const lezioni = fasce.filter((f) => f.tipo === 'lezione')
  if (lezioni.length <= 1) return fasce.length > 0 ? `${fasce[0].inizio}–${fasce[fasce.length - 1].fine}` : ''
  return lezioni.map((f) => `${f.inizio}–${f.fine}`).join(' + ')
}

/** Spuntata di partenza: un'ora già svolta non si tocca senza volerlo. */
function spuntataDiPartenza (voce: VoceConfronto): boolean {
  return voce.esito === 'nuova' || voce.statoLezione !== 'svolta'
}

/**
 * Il confronto con uno dei calendari del documento: `calendarioId` quello da
 * cui partire (se no il primo); la tendina in alto lo cambia.
 */
export function moduloCalendario (calendarioId?: string): void {
  const t = testi()
  /** La pastiglia di un'ora già svolta. */
  const svolta = minuscolo(lessico().statiLezione.svolta)
  const salvato = stato.registro.impostazioni.calendario
  let regole: Regola[] = (salvato?.regole ?? []).map((r) => ({ ...r }))
  let confronto: Confronto | null = null
  const spuntate = new Set<string>()
  /** Le voci già mostrate: una spunta tolta a mano non torna al confronto dopo. */
  const visteFinora = new Set<string>()
  let giro = 0

  const calendari = () => stato.registro.impostazioni.calendario?.calendari ?? []
  let scelto = calendari().find((c) => c.id === calendarioId)?.id ?? calendari()[0]?.id ?? ''

  const tendina = h('select', {
    class: 'campo__controllo campo__controllo--selezione',
    attr: { 'aria-label': t.calendarioDaConfrontare },
    onchange: (evento: Event) => {
      scelto = (evento.target as HTMLSelectElement).value
      // Un altro calendario, altre voci: le spunte di prima non valgono qui.
      spuntate.clear()
      visteFinora.clear()
      void confronta()
    },
  })
  function riempiTendina (): void {
    tendina.replaceChildren(...calendari().map((c) => h('option', { value: c.id }, c.nome)))
    tendina.value = scelto
    tendina.hidden = calendari().length === 0
  }

  // Aggiungerne uno da qui: la prima volta non ce n'è nessuno.
  const campoNuovo = h('input', {
    type: 'text',
    class: 'campo__controllo',
    attr: {
      placeholder: t.segnapostoNuovo,
      'aria-label': t.indirizzoNuovo,
      spellcheck: 'false',
    },
    onkeydown: (evento: KeyboardEvent) => {
      if (evento.key === 'Enter') {
        evento.preventDefault()
        void aggiungi(campoNuovo.value)
      }
    },
  })

  async function aggiungi (origine: string): Promise<void> {
    const prima = new Set(calendari().map((c) => c.id))
    const risposta = await azione({ tipo: 'calendario.aggiungi', origine: origine.trim() })
    if (!risposta.ok) return
    const nuovo = calendari().find((c) => !prima.has(c.id))
    if (!nuovo) return
    campoNuovo.value = ''
    scelto = nuovo.id
    spuntate.clear()
    visteFinora.clear()
    riempiTendina()
    void confronta()
  }

  const zonaEsito = h('div', { class: 'confronto-calendario' })

  async function confronta (): Promise<void> {
    if (!scelto) {
      rimpiazza(zonaEsito, avviso(t.nessunCalendario, 'attenzione'))
      return
    }
    giro += 1
    const questo = giro
    rimpiazza(zonaEsito, quieto(t.lettura))
    const esito = await chiedi<Confronto>('calendario.confronta', { calendarioId: scelto, regole })
    // Due confronti in volo: vince l'ultimo chiesto, non l'ultimo arrivato.
    if (questo !== giro) return
    if (!esito.ok || !esito.dati) {
      confronto = null
      rimpiazza(zonaEsito, avviso(esito.errori.join(' ') || t.nonSiLegge, 'negativo'))
      return
    }
    confronto = esito.dati
    // Le voci nuove nascono con la spunta di partenza; le già viste tengono la loro.
    const vive = new Set(confronto.voci.map((v) => v.id))
    for (const id of [...spuntate]) if (!vive.has(id)) spuntate.delete(id)
    for (const voce of confronto.voci) {
      if (voce.esito === 'combacia') continue
      if (!visteFinora.has(voce.id) && spuntataDiPartenza(voce)) spuntate.add(voce.id)
      visteFinora.add(voce.id)
    }
    disegna()
  }

  function scegliRegola (testo: string, corsoId: string | null): void {
    const pulito = testo.trim()
    if (!pulito) return
    regole = [...regole.filter((r) => r.testo.trim().toLowerCase() !== pulito.toLowerCase()), {
      testo: pulito, corsoId,
    }]
    void confronta()
  }

  function togliRegola (regola: Regola): void {
    regole = regole.filter((r) => r !== regola)
    void confronta()
  }

  function casella (voce: VoceConfronto): HTMLInputElement {
    return h('input', {
      type: 'checkbox',
      checked: spuntate.has(voce.id),
      attr: { 'aria-label': `${formattaData(voce.data)} ${voce.inizio}` },
      onchange: (evento: Event) => {
        if ((evento.target as HTMLInputElement).checked) spuntate.add(voce.id)
        else spuntate.delete(voce.id)
      },
    })
  }

  function rigaVoce (voce: VoceConfronto): HTMLElement {
    return h(
      'label',
      { class: 'confronto-calendario__voce' },
      voce.esito === 'combacia' ? null : casella(voce),
      h('span', { class: 'confronto-calendario__quando' }, `${formattaData(voce.data, 'giorno')} ${formattaData(voce.data, 'corto')}`),
      h('span', { class: 'confronto-calendario__ora' }, orario(voce.fasce)),
      h('span', { class: 'confronto-calendario__corso' }, nomeCorso(voce.corsoId)),
      voce.aula ? h('span', { class: 'testo-quieto' }, voce.aula) : null,
      voce.differenze.length > 0
        ? h('span', { class: 'confronto-calendario__differenza' }, voce.differenze.join(' · '))
        : null,
      voce.statoLezione === 'svolta' ? pastiglia(svolta, 'attenzione') : null,
      pastiglia(t.vie[voce.via], voce.via === 'regola' || voce.via === 'nome' ? 'neutro' : 'informativo'),
    )
  }

  function mucchio (
    titolo: string,
    spiegazione: string,
    voci: VoceConfronto[],
    avvertenza?: string,
  ): HTMLElement | null {
    if (voci.length === 0) return null
    const tutte = h('input', {
      type: 'checkbox',
      checked: voci.every((v) => spuntate.has(v.id)),
      attr: { 'aria-label': t.tutteDi(titolo) },
      onchange: (evento: Event) => {
        const si = (evento.target as HTMLInputElement).checked
        for (const v of voci) {
          if (si) spuntate.add(v.id)
          else spuntate.delete(v.id)
        }
        disegna()
      },
    })
    tutte.indeterminate = !tutte.checked && voci.some((v) => spuntate.has(v.id))
    // La spiegazione del mucchio dietro la «i»; conteggio e avvertenza in vista.
    return sezioneModulo(
      { testo: `${titolo} (${voci.length})`, aiuto: spiegazione },
      avvertenza ? quieto(avvertenza) : null,
      h('label', { class: 'confronto-calendario__voce confronto-calendario__tutte' }, tutte, h('span', null, parole().tutte)),
      h('div', { class: 'confronto-calendario__elenco' }, voci.map(rigaVoce)),
    )
  }

  function senzaCorso (esito: Confronto): HTMLElement | null {
    if (esito.senzaCorso.length === 0) return null
    const corsi = opzioniCorsi()
    return sezioneModulo(
      {
        testo: t.eventiSenzaCorso(esito.senzaCorso.length),
        aiuto: t.aiutoSenzaCorso,
      },
      h(
        'div',
        { class: 'confronto-calendario__elenco' },
        esito.senzaCorso.map((gruppo) => {
          const testo = h('input', {
            type: 'text',
            class: 'campo__controllo',
            value: gruppo.titolo || gruppo.luogo,
            attr: { 'aria-label': t.testoDellaRegola },
            onkeydown: (evento: KeyboardEvent) => {
              if (evento.key === 'Enter') evento.preventDefault()
            },
          })
          const scelta = h(
            'select',
            {
              class: 'campo__controllo campo__controllo--selezione',
              attr: { 'aria-label': t.diCheCorso },
              onchange: (evento: Event) => {
                const valore = (evento.target as HTMLSelectElement).value
                if (!valore) return
                scegliRegola(testo.value, valore === IGNORA ? null : valore)
              },
            },
            h('option', { value: '' }, t.daDecidere),
            h('option', { value: IGNORA }, t.nonELezione),
            corsi.map((c) => h('option', { value: c.valore }, c.testo)),
          )
          return h(
            'div',
            { class: 'confronto-calendario__regola' },
            testo,
            scelta,
            h(
              'span',
              { class: 'testo-quieto' },
              t.gruppo(
                gruppo.quanti,
                gruppo.primo === gruppo.ultimo
                  ? formattaData(gruppo.primo)
                  : t.dalAl(formattaData(gruppo.primo, 'corto'), formattaData(gruppo.ultimo)),
              ),
            ),
          )
        }),
      ),
    )
  }

  function elencoRegole (): HTMLElement | null {
    if (regole.length === 0) return null
    // Sugli eventi di tutti i calendari del documento: le regole sono comuni.
    const conti = contiDelleRegole(regole)
    return sezioneModulo(
      t.regole(regole.length),
      h(
        'div',
        { class: 'confronto-calendario__elenco' },
        regole.map((regola, i) =>
          h(
            'div',
            { class: 'confronto-calendario__voce' },
            h('span', { class: 'confronto-calendario__corso' }, t.citata(regola.testo)),
            h('span', null, '→'),
            h('span', null, regola.corsoId ? nomeCorso(regola.corsoId) : t.nonELezioneRegola),
            conti?.[i] && !conti[i].valida
              ? pastiglia(t.regolaIlleggibile, 'negativo')
              : segnoConteggio(conti?.[i]),
            pulsante({
              testo: '',
              simbolo: 'chiudi',
              variante: 'sottile',
              titolo: t.togliRegola,
              al: () => togliRegola(regola),
            }),
          )),
      ),
    )
  }

  function assenti (esito: Confronto): HTMLElement | null {
    if (esito.assenti.length === 0) return null
    // «Solo segnalate» rassicura, non avverte di un rischio: può stare dietro la «i».
    return sezioneModulo(
      {
        testo: t.assenti(esito.assenti.length),
        aiuto: t.aiutoAssenti,
      },
      h(
        'div',
        { class: 'confronto-calendario__elenco' },
        esito.assenti.map((l) =>
          h(
            'div',
            { class: 'confronto-calendario__voce' },
            h('span', { class: 'confronto-calendario__quando' }, `${formattaData(l.data, 'giorno')} ${formattaData(l.data, 'corto')}`),
            h('span', { class: 'confronto-calendario__ora' }, `${l.inizio}–${l.fine}`),
            h('span', { class: 'confronto-calendario__corso' }, nomeCorso(l.corsoId)),
            l.stato === 'svolta' ? pastiglia(svolta, 'attenzione') : null,
          )),
      ),
    )
  }

  function disegna (): void {
    const esito = confronto
    if (!esito) return
    const di = (quale: EsitoConfronto) => esito.voci.filter((v) => v.esito === quale)
    const combaciano = di('combacia')
    const riassunto = [
      t.eventiLetti(esito.eventi),
      esito.copre ? t.dalAl(formattaData(esito.copre.dal), formattaData(esito.copre.al)) : '',
      t.combaciano(combaciano.length),
      esito.ignorati > 0 ? t.ignorati(esito.ignorati) : '',
      esito.scartati > 0 ? t.scartati(esito.scartati) : '',
    ].filter(Boolean).join(' · ')

    rimpiazza(
      zonaEsito,
      quieto(riassunto),
      esito.eventi === 0 ? avviso(t.nessunEvento, 'attenzione') : null,
      mucchio(t.daCreare, t.aiutoDaCreare, di('nuova')),
      mucchio(t.daAllineare, t.aiutoDaAllineare, di('allineare'), t.svolteSenzaSpunta),
      mucchio(t.daAnnullare, t.aiutoDaAnnullare, di('annullare')),
      senzaCorso(esito),
      elencoRegole(),
      assenti(esito),
      combaciano.length > 0
        ? h(
            'details',
            { class: 'confronto-calendario__combaciano' },
            h('summary', null, t.combacianoTitolo(combaciano.length)),
            h('div', { class: 'confronto-calendario__elenco' }, combaciano.map(rigaVoce)),
          )
        : null,
    )
  }

  const corpo = h(
    'div',
    { class: 'modulo' },
    sezioneModulo(
      {
        testo: t.calendario,
        aiuto: t.aiutoCalendario,
      },
      h(
        'div',
        { class: 'confronto-calendario__sorgente' },
        tendina,
        pulsante({ testo: t.confronta, simbolo: 'ricarica', al: () => void confronta() }),
      ),
      h(
        'div',
        { class: 'confronto-calendario__sorgente' },
        campoNuovo,
        pulsante({
          testo: parole().aggiungi,
          simbolo: 'piu',
          variante: 'sottile',
          al: () => void aggiungi(campoNuovo.value),
        }),
        pulsante({
          testo: t.unFile,
          simbolo: 'cartella',
          variante: 'sottile',
          titolo: t.aiutoUnFile,
          al: () => void aggiungi(''),
        }),
      ),
    ),
    zonaEsito,
  )

  apriModale({
    titolo: t.titolo,
    sottotitolo: t.sottotitolo,
    larghezza: 'larga',
    testoSalva: t.applicaLeSpunte,
    corpo: () => corpo,
    alSalva: async (_valori, contesto) => {
      const voci = confronto?.voci ?? []
      const scelte = voci.filter((v) => spuntate.has(v.id))
      const risposta = await inviaDalModulo(contesto, {
        tipo: 'calendario.applica',
        regole,
        crea: scelte
          .filter((v) => v.esito === 'nuova')
          .map((v) => ({
            corsoId: v.corsoId, data: v.data, fasce: v.fasce, ...(v.aula ? { aula: v.aula } : {}),
          })),
        allinea: scelte
          .filter((v) => v.esito === 'allineare' && v.lezioneId)
          .map((v) => ({
            lezioneId: v.lezioneId!,
            ...(v.cambiaOrario ? { fasce: v.fasce } : {}),
            aula: v.aula,
          })),
        annulla: scelte.filter((v) => v.esito === 'annullare' && v.lezioneId).map((v) => v.lezioneId!),
      }, t.nonApplicato)
      if (!risposta) return
      contesto.chiudi()
      // La frase la dice l'host (e la mostra `invia`): qui solo se non ne ha detta.
      if (!risposta.messaggio) notifica(t.applicato, 'successo')
    },
  })

  riempiTendina()
  if (scelto) void confronta()
}
