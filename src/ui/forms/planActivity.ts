// L'editor della scaletta di un piano: le attività una per una, con i loro
// parametri, lo svolgimento e la valutazione, posate sui gruppi di unità
// didattiche della lezione quando ce n'è una sotto. Il piano che le contiene,
// e i moduli che lo aprono, stanno in `plan.ts`.

import {
  minutiDiAttivita,
  scalettaSulleUd,
  udDaMinutiAttivita,
} from '../../domain/calculations.js'
import {
  nomeTipoAttivita,
  parametriDi,
  riassuntoParametri,
  valoreParametro,
} from '../../domain/activities.js'
import { coloreDiVoce, testoDiVoce, vociConValore } from '../../domain/lists.js'
import { formattaDurata, formattaUd } from '../../domain/dates.js'
import { creaAttivita } from '../../domain/factories.js'
import type {
  Attivita,
  Lezione,
  Risorsa,
  TipoValutazione,
} from '../../domain/models.js'
import {
  pastiglia,
  pulsante,
  quieto,
  tendina,
} from '../components/base.js'
import { menuSotto } from '../components/menu.js'
import { icona } from '../components/icons.js'
import { legaAlSegno, suggerimento } from '../components/hint.js'
import { h, rimpiazza,
  type Figlio,
} from '../dom.js'
import { stato } from '../state.js'
import { Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'

import { parole } from '../../domain/words.testi.js'
import { testi } from './planActivity.testi.js'
import { bloccoRisorse } from './resources.js'
import {
  numero,
  presaDiRiga,
  riordinatore,
  spostaVoce,
  vociTipoAttivita,
} from './common.js'

/**
 * Una voce del modulo che si legge e non si tocca: non un campo spento, ma
 * un'informazione che arriva da un'altra scelta (l'ora scelta nell'elenco a fianco).
 */
export function voceFerma (etichetta: string, valore: string, aiuto?: string): HTMLElement {
  return h(
    'div',
    { class: 'campo campo--meta' },
    h(
      'span',
      { class: 'campo__etichetta' },
      etichetta,
      aiuto ? suggerimento(aiuto, { etichetta }) : null,
    ),
    h('strong', { class: 'campo__dettato' }, valore),
  )
}

/**
 * Un campo del dettaglio di una tappa: etichetta visibile sopra, controllo
 * sotto. Un campo già riempito senza etichetta non dice che cosa chiede.
 */
function campoTappa (etichetta: string, controllo: Figlio, aiuto?: string): HTMLElement {
  const segno = aiuto ? suggerimento(aiuto, { etichetta }) : null
  legaAlSegno(controllo, segno, etichetta)
  return h(
    'label',
    { class: 'campo-tappa' },
    h('span', { class: 'campo-tappa__etichetta' }, etichetta, segno),
    controllo,
  )
}

/** Una casella sì/no del dettaglio: la domanda sta accanto alla spunta. */
function spuntaTappa (
  etichetta: string,
  acceso: boolean,
  al: (acceso: boolean) => void,
  aiuto?: string,
): HTMLElement {
  // Niente `title`, la spiegazione sta dietro la «i» (che non spunta la casella:
  // `suggerimento` ferma il clic).
  const segno = aiuto ? suggerimento(aiuto, { etichetta }) : null
  const casella = h('input', {
    type: 'checkbox',
    checked: acceso,
    onchange: (evento: Event) => al((evento.target as HTMLInputElement).checked),
  })
  legaAlSegno(casella, segno, etichetta)
  return h(
    'label',
    { class: ['campo-tappa', 'campo-tappa--sino'] },
    casella,
    h('span', { class: 'campo-tappa__etichetta' }, etichetta, segno),
  )
}

/**
 * Un gruppo di campi del dettaglio col suo titolino: svolgimento, parametri
 * del tipo, prova, materiale.
 */
function gruppoTappa (titolo: string, figli: Figlio[], classe?: string): Figlio {
  const campi = figli.filter(Boolean)
  if (campi.length === 0) return null
  return h(
    'section',
    { class: ['gruppo-tappa', classe] },
    h('h6', { class: 'gruppo-tappa__titolo' }, titolo),
    h('div', { class: 'gruppo-tappa__campi' }, ...campi),
  )
}

/**
 * I campi che dipendono dal tipo dell'attività: compaiono e spariscono col
 * tipo, ma quel che si era scritto resta nel file, così un cambio per sbaglio
 * non cancella niente. Le voci delle tendine vengono dalle liste di sistema
 * (Impostazioni → Liste).
 */
function campiParametri (voce: Attivita, alCambio: () => void): Figlio[] {
  const parametri = parametriDi(voce.tipo)
  if (parametri.length === 0) return []

  const scrivi = (chiave: string, valore: string | number | boolean | undefined) => {
    const attuali = { ...(voce.parametri ?? {}) }
    if (valore === undefined || valore === '' || valore === false) delete attuali[chiave]
    else attuali[chiave] = valore
    voce.parametri = Object.keys(attuali).length > 0 ? attuali : undefined
    alCambio()
  }

  return parametri.map((parametro) => {
    const valore = valoreParametro(voce, parametro.chiave)

    if (parametro.tipo === 'sino') {
      return spuntaTappa(
        parametro.etichetta,
        valore === true,
        (acceso) => scrivi(parametro.chiave, acceso),
        parametro.aiuto,
      )
    }

    if (parametro.tipo === 'scelta') {
      // Il valore scelto resta offerto anche se la lista non lo ha più, se no il
      // primo salvataggio lo cambierebbe di nascosto.
      const voci = parametro.lista
        ? vociConValore(
            stato.registro.impostazioni,
            parametro.lista,
            valore === undefined ? null : String(valore),
          )
        : []
      return campoTappa(
        parametro.etichetta,
        tendina({
          voci: [{ valore: '', testo: '—' }, ...voci],
          valore: valore === undefined ? '' : String(valore),
          al: (scelto) => scrivi(parametro.chiave, scelto),
        }),
        parametro.aiuto,
      )
    }

    const numerico = parametro.tipo === 'numero'
    return campoTappa(
      parametro.unita ? `${parametro.etichetta} (${parametro.unita})` : parametro.etichetta,
      h('input', {
        class: ['campo__controllo', numerico && 'campo__controllo--numero'],
        type: numerico ? 'number' : 'text',
        value: valore === undefined ? '' : String(valore),
        placeholder: parametro.segnaposto ?? '',
        attr: {
          // Senza passo fisso: suggerisce, non rifiuta quel che non ci cade sopra.
          ...(numerico ? { min: 0, step: 'any' } : {}),
        },
        onchange: (evento: Event) => {
          const scritto = (evento.target as HTMLInputElement).value.trim()
          if (numerico) {
            scrivi(parametro.chiave, scritto === '' ? undefined : numero(scritto, 0))
            return
          }
          scrivi(parametro.chiave, scritto === '' ? undefined : scritto)
        },
      }),
      parametro.aiuto,
    )
  })
}

/** Come si svolge la tappa (descrizione, raggruppamento, materiali): vale per ogni tipo. */
function campiSvolgimento (voce: Attivita, alCambio: () => void): Figlio[] {
  const t = testi()
  return [
    campoTappa(
      t.comeSiSvolge,
      h('textarea', {
        class: 'campo__controllo campo__controllo--area campo-tappa__testo',
        rows: 2,
        value: voce.descrizione ?? '',
        placeholder: t.segnapostoSvolgimento,
        onchange: (evento: Event) => {
          voce.descrizione = (evento.target as HTMLTextAreaElement).value
          alCambio()
        },
      }),
    ),
    campoTappa(
      t.comeLavoraLaClasse,
      tendina({
        voci: vociConValore(
          stato.registro.impostazioni,
          'raggruppamento',
          voce.raggruppamento ?? 'plenaria',
        ),
        valore: voce.raggruppamento ?? 'plenaria',
        al: (scelto) => {
          voce.raggruppamento = scelto as Attivita['raggruppamento']
          alCambio()
        },
      }),
    ),
    campoTappa(
      t.materialeDAula,
      h('input', {
        class: 'campo__controllo',
        type: 'text',
        value: voce.materiali ?? '',
        placeholder: t.segnapostoMateriale,
        onchange: (evento: Event) => {
          voce.materiali = (evento.target as HTMLInputElement).value
          alCambio()
        },
      }),
      t.aiutoMateriale,
    ),
  ]
}

/**
 * La prova che una tappa prevede. Sta sull'attività perché una lezione può
 * averne due; il momento con i voti nasce nella lezione in cui si fa. Spenta è
 * una casella sola; accesa chiede titolo, tipo e peso.
 */
function campiValutazione (voce: Attivita, alCambio: () => void): Figlio[] {
  const t = testi()
  const prevista = voce.valutazione ?? null

  const acceso = spuntaTappa(
    t.eUnaProva,
    prevista !== null,
    (attiva) => {
      // Spenta, la prova si toglie; riaccesa riparte da scritto, peso 1.
      voce.valutazione = attiva ? voce.valutazione ?? { titolo: '', tipo: 'scritto', peso: 1 } : null
      alCambio()
    },
    t.aiutoProva,
  )

  if (!prevista) return [acceso]

  return [
    acceso,
    campoTappa(
      t.titoloProva,
      h('input', {
        class: 'campo__controllo',
        type: 'text',
        value: prevista.titolo,
        // Vuoto vuol dire «come la tappa», che è quasi sempre il titolo giusto.
        placeholder: voce.titolo || t.comeLaTappa,
        onchange: (evento: Event) => {
          if (!voce.valutazione) return
          voce.valutazione.titolo = (evento.target as HTMLInputElement).value.trim()
          alCambio()
        },
      }),
    ),
    campoTappa(
      t.tipoProva,
      tendina({
        voci: vociConValore(stato.registro.impostazioni, 'tipoValutazione', prevista.tipo),
        valore: prevista.tipo,
        al: (scelto) => {
          if (!voce.valutazione) return
          voce.valutazione.tipo = scelto as TipoValutazione
          alCambio()
        },
      }),
    ),
    campoTappa(
      t.peso,
      h('input', {
        class: 'campo__controllo campo__controllo--numero',
        type: 'number',
        value: String(prevista.peso),
        // Passo libero: un passo fisso rifiuterebbe i decimali.
        attr: { min: 0, max: 10, step: 'any' },
        onchange: (evento: Event) => {
          if (!voce.valutazione) return
          voce.valutazione.peso = Math.min(
            10,
            Math.max(0, numero((evento.target as HTMLInputElement).value, 1)),
          )
          alCambio()
        },
      }),
      t.zeroNonFaMedia,
    ),
  ]
}

/**
 * Che cosa serve alla scaletta per allegare file mentre la si scrive. L'editor
 * lavora su una copia, ma i file li copia l'host e deve sapere di quale piano
 * sono: prima di allegare il piano si salva (`prima`), e dopo la copia locale
 * rilegge le risorse (`rilette`), se no il salvataggio seguente cancellerebbe
 * l'allegato.
 */
export interface GestoreRisorse {
  pianoId: string
  prima: () => Promise<boolean>
  rilette: (attivitaId: string | null) => Risorsa[] | null
  /**
   * Chi disegna un elenco di risorse registra qui come ridisegnarsi, e chiama
   * `rinfrescaTutto` a ogni cambio: una risorsa può spostarsi fra tappe.
   */
  registra: (rinfresca: () => void) => void
  rinfrescaTutto: () => void
}

/**
 * L'editor della scaletta. Con una lezione sotto, le attività si posano sui
 * suoi gruppi di unità didattiche: si vede dove cade ciascuna e quanto resta.
 */
export function editorAttivita (
  iniziali: Attivita[],
  allaModifica: (attivita: Attivita[]) => void,
  lezione?: Lezione | null,
  gestore?: GestoreRisorse,
  /**
   * Se sulla classe di questo piano si fa anche il docente di classe. Una
   * funzione perché il corso può cambiare a modulo aperto.
   */
  docenteDiClasse: () => boolean = () => false,
): HTMLElement {
  let attivita = iniziali.map((a) => ({ ...a }))
  const contenitore = h('div', { class: 'attivita-editor' })
  /**
   * Le tappe col dettaglio aperto, fuori da `disegna`: l'elenco si ridisegna a
   * ogni carattere, e il pannello si richiuderebbe.
   */
  const aperte = new Set<string>()

  /**
   * La tappa in `da` portata in `a` (posizioni, come vuole `riordinatore`). Il
   * fuoco torna sulla presa della tappa spostata; non con `fuocoSullaPresa`,
   * perché fra le tappe ci sono testate di gruppo e intervalli.
   */
  const posa = (da: number, a: number) => {
    if (a < 0 || a >= attivita.length || da === a) return
    const spostata = attivita[da].id
    attivita = spostaVoce(attivita, da, a)
    disegna()
    allaModifica(attivita)
    contenitore
      .querySelector<HTMLElement>(`[data-attivita-id="${spostata}"] .presa-riga`)
      ?.focus()
  }

  /** Rilegge dal registro le risorse di tutte le tappe: una può essersi spostata. */
  const rileggiRisorse = () => {
    if (!gestore) return
    for (const voce of attivita) {
      const fresche = gestore.rilette(voce.id)
      if (fresche) voce.risorse = fresche
    }
  }
  gestore?.registra(() => {
    rileggiRisorse()
    disegna()
    allaModifica(attivita)
  })

  const disegna = () => {
    const t = testi()
    const totale =attivita.reduce((somma, a) => somma + a.durataUd, 0)
    // La scaletta posata sulle UD dell'ora: quanto è presa ciascuna, e che cosa
    // resta fuori dalla lezione.
    const { minutiUd } = stato.registro.impostazioni
    const sulleUd = lezione ? scalettaSulleUd(attivita, lezione, minutiUd) : null
    const posto = (indice: number) => sulleUd?.posti[indice] ?? null
    // Nel piano le durate si scrivono in minuti, sotto restano UD: il cambio è
    // quello dell'ora vera se c'è, altrimenti quello del documento.
    const perUd = sulleUd?.minutiPerUd ?? minutiUd

    // L'elenco nasce prima delle righe: il riordinatore vuole il contenitore, le
    // righe vogliono il riordinatore.
    const elenco = h('ol', {
      class: ['attivita-editor__elenco', sulleUd && 'attivita-editor__elenco--con-orario'],
    })
    const riordina = riordinatore(elenco, posa)

    /**
     * Quel che una tappa ha dentro, in una riga (raggruppamento, parametri, prova,
     * allegati): serve a dettaglio chiuso.
     */
    const sommarioTappa = (voce: Attivita): Figlio => {
      const pezzi: Figlio[] = []
      const raggruppamento = voce.raggruppamento ?? 'plenaria'
      if (raggruppamento !== 'plenaria') {
        pezzi.push(
          pastiglia(
            testoDiVoce(stato.registro.impostazioni, 'raggruppamento', raggruppamento),
            'informativo',
          ),
        )
      }
      if (voce.valutazione) {
        pezzi.push(
          pastiglia(
            testoDiVoce(stato.registro.impostazioni, 'tipoValutazione', voce.valutazione.tipo) +
              (voce.valutazione.peso !== 1 ? t.conPeso(voce.valutazione.peso) : ''),
            'attenzione',
            'valutazioni',
          ),
        )
      }
      if (voce.risorse.length > 0) {
        pezzi.push(pastiglia(String(voce.risorse.length), 'quiete', 'allegato'))
      }

      // La descrizione prima e in chiaro: è quel che si rilegge scorrendo.
      const detto = [
        voce.descrizione?.trim(),
        riassuntoParametri(voce, stato.registro.impostazioni),
        voce.materiali?.trim(),
      ]
        .filter(Boolean)
        .join(' · ')

      if (pezzi.length === 0 && !detto) return null
      return h(
        'div',
        { class: 'attivita-riga__sommario' },
        detto ? h('span', { class: 'attivita-riga__detto' }, detto) : null,
        ...pezzi,
      )
    }

    /**
     * Una tappa in riga: numero, titolo, tipo, durata, quando, su una griglia
     * comune dichiarata dall'elenco, per confrontarle in colonna. Sotto c'è il
     * dettaglio, chiuso finché non lo si apre, con una riga di sommario al suo posto.
     */
    const rigaAttivita = (voce: Attivita, indice: number): HTMLElement => {
      const aperta = aperte.has(voce.id)
      const parametri = campiParametri(voce, () => {
        disegna()
        allaModifica(attivita)
      })
      const presa = presaDiRiga()

      // Quanto si prende questa tappa del suo gruppo di UD (o, senza ora sotto,
      // dell'intera scaletta): è il filo colorato in fondo alla riga.
      const minuti = minutiDiAttivita(voce.durataUd, perUd)
      const suoBlocco = sulleUd?.blocchi[posto(indice)?.blocco ?? -1] ?? null
      const riferimento = suoBlocco ? suoBlocco.capienza : minutiDiAttivita(totale, perUd)
      const quota = riferimento > 0 ? Math.min(100, (minuti / riferimento) * 100) : 0

      // Il tipo è una pastiglia con la sua tinta, che premuta apre l'elenco: lascia
      // spazio al titolo.
      const vociDelTipo = vociTipoAttivita().filter(
        // La docenza di classe solo dove la si fa; se una tappa ce l'ha già resta
        // visibile, se no il primo salvataggio la cambierebbe di nascosto.
        (v) =>
          v.valore !== 'docenza-di-classe' ||
          docenteDiClasse() ||
          voce.tipo === 'docenza-di-classe',
      )
      const nomeDelTipo = nomeTipoAttivita(voce.tipo, stato.registro.impostazioni)
      const tipo: HTMLElement = h(
        'button',
        {
          class: 'attivita-riga__tipo',
          type: 'button',
          attr: {
            title: t.tipoPremi(nomeDelTipo),
            'aria-label': t.tipoDiAttivita(nomeDelTipo),
            'aria-haspopup': 'menu',
          },
          onclick: () =>
            menuSotto(
              tipo,
              vociDelTipo.map((v) => ({
                testo: v.testo,
                accesa: voce.tipo === v.valore,
                al: () => {
                  voce.tipo = v.valore as Attivita['tipo']
                  disegna()
                  allaModifica(attivita)
                },
              })),
            ),
        },
        h('span', { class: 'attivita-riga__punto' }),
        h('span', { class: 'attivita-riga__tipo-testo' }, nomeDelTipo),
      )

      const riga = h(
        'li',
        {
          class: [
            'attivita-riga',
            aperta && 'attivita-riga--aperta',
            posto(indice)?.ud === null && 'attivita-riga--fuori',
            posto(indice)?.aCavallo && 'attivita-riga--a-cavallo',
            posto(indice)?.oltreLaPausa && 'attivita-riga--oltre-la-pausa',
          ],
          dataset: { attivitaId: voce.id },
          // La tinta del tipo viene dalla lista dei tipi, come variabile sulla riga:
          // filetto, punto, pastiglia e filo la leggono da qui.
          style: { '--tinta-tappa': coloreDiVoce(stato.registro.impostazioni, 'tipoAttivita', voce.tipo) },
        },
        h(
          'div',
          { class: 'attivita-riga__ordine' },
          presa,
          h('span', { class: 'attivita-riga__numero' }, String(indice + 1)),
        ),
        h('input', {
          class: 'campo__controllo attivita-riga__titolo',
          type: 'text',
          value: voce.titolo,
          placeholder: t.segnapostoTitolo,
          attr: { 'aria-label': t.titoloAttivita },
          onchange: (evento: Event) => {
            voce.titolo = (evento.target as HTMLInputElement).value
            disegna()
            allaModifica(attivita)
          },
        }),
        tipo,
        h(
          'div',
          { class: 'attivita-riga__durata' },
          h('input', {
            class: 'campo__controllo campo__controllo--numero',
            type: 'number',
            value: String(minutiDiAttivita(voce.durataUd, perUd)),
            // Qualunque numero di minuti, senza passo: un passo fisso impedirebbe di
            // salvare quel che non ci cade sopra.
            attr: { min: 1, step: 'any', 'aria-label': t.durataInMinuti },
            onchange: (evento: Event) => {
              voce.durataUd = udDaMinutiAttivita(
                numero((evento.target as HTMLInputElement).value, perUd / 2),
                perUd,
              )
              disegna()
              allaModifica(attivita)
            },
          }),
          h('span', { class: 'attivita-riga__unita' }, t.min),
        ),
        // L'ora dell'orologio, intervalli compresi; la colonna c'è solo con un'ora sotto.
        sulleUd
          ? h(
              'span',
              {
                class: 'attivita-riga__orario',
                attr: { title: t.quandoCade },
              },
              posto(indice)?.oraInizio
                ? `${posto(indice)?.oraInizio}–${posto(indice)?.oraFine ?? '…'}`
                : '—',
            )
          : null,
        h(
          'div',
          { class: 'attivita-riga__azioni' },
          pulsante({
            simbolo: aperta ? 'su' : 'giu',
            variante: 'fantasma',
            classe: 'attivita-riga__apri',
            titolo: aperta ? t.chiudiDettaglio : t.dettaglioTappa,
            al: () => {
              if (aperta) aperte.delete(voce.id)
              else aperte.add(voce.id)
              disegna()
            },
          }),
          pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: t.togliAttivita,
            al: () => {
              attivita = attivita.filter((a) => a.id !== voce.id)
              aperte.delete(voce.id)
              disegna()
              allaModifica(attivita)
            },
          }),
        ),
        aperta ? null : sommarioTappa(voce),
        aperta
          ? h(
              'div',
              { class: 'attivita-riga__dettagli' },
              gruppoTappa(
                t.svolgimento,
                campiSvolgimento(voce, () => {
                  disegna()
                  allaModifica(attivita)
                }),
              ),
              // Il titolo dice di quale tipo sono i campi: cambiando tipo il gruppo cambia.
              gruppoTappa(
                t.dettagliDi(nomeTipoAttivita(voce.tipo, stato.registro.impostazioni)),
                parametri,
              ),
              gruppoTappa(
                t.valutazione,
                campiValutazione(voce, () => {
                  disegna()
                  allaModifica(attivita)
                }),
                voce.valutazione ? 'gruppo-tappa--prova' : undefined,
              ),
              // Il materiale della tappa sta con la tappa, non in un elenco del piano.
              gestore
                ? gruppoTappa(t.materialeDellaTappa, [
                    bloccoRisorse({
                      pianoId: gestore.pianoId,
                      attivitaId: voce.id,
                      risorse: voce.risorse,
                      compatto: true,
                      prima: gestore.prima,
                      dopo: () => gestore.rinfrescaTutto(),
                    }),
                  ])
                : null,
            )
          : null,
        // Il filo del tempo in fondo alla riga, largo quanto la tappa dura.
        h('span', {
          class: 'attivita-riga__quota',
          style: { width: `${quota}%` },
          attr: { 'aria-hidden': 'true' },
        }),
      )

      riordina(riga, presa, indice)
      return riga
    }

    /** I nomi delle colonne, una volta sola in cima all'elenco. */
    const intestazione = (): HTMLElement =>
      h(
        'li',
        { class: 'attivita-riga attivita-riga--intestazione' },
        h('span', null, '#'),
        h('span', null, Uno(lessico().attivita)),
        h('span', null, parole().tipo),
        h('span', null, t.minuti),
        sulleUd ? h('span', null, t.quando) : null,
        h('span', { class: 'attivita-riga__azioni' }, ''),
      )

    /**
     * L'ora intera gruppo per gruppo (le UD attaccate fra un intervallo e l'altro,
     * l'unità con cui si pianifica), con dentro le attività che ci cadono. Ci sono
     * tutti i gruppi, anche vuoti, e gli intervalli al loro posto: si vede il tempo
     * che resta.
     */
    const scheletro = (): Figlio[] => {
      if (!sulleUd) {
        return [intestazione(), ...attivita.map((voce, indice) => rigaAttivita(voce, indice))]
      }

      const righe: Figlio[] = [intestazione()]
      sulleUd.blocchi.forEach((blocco, i) => {
        // Fra un gruppo e l'altro l'intervallo, con i minuti che dura.
        if (i > 0) {
          const prima = sulleUd.blocchi[i - 1]
          righe.push(
            h(
              'li',
              { class: 'attivita-editor__pausa' },
              icona('pausa', 'icona--minuta'),
              h('span', null, t.intervallo(blocco.pausaPrima, prima.fine, blocco.inizio)),
            ),
          )
        }

        // Il gruppo si conta in UD; i minuti del dominio restano sotto.
        const libero = blocco.capienza - blocco.occupati
        righe.push(
          h(
            'li',
            {
              class: [
                'attivita-editor__blocco',
                blocco.occupati === 0 && 'attivita-editor__blocco--vuoto',
              ],
            },
            h('strong', null, sulleUd.blocchi.length > 1 ? t.gruppo(i + 1) : Uno(lessico().lezione)),
            // Quante UD attaccate, non quali: dentro il gruppo il tempo è continuo.
            h('span', { class: 'attivita-editor__blocco-ud' }, t.udAttaccate(blocco.ud)),
            h(
              'span',
              { class: 'testo-quieto' },
              t.orarioGruppo(blocco.inizio, blocco.fine, blocco.occupati, blocco.capienza),
            ),
            blocco.occupati === 0
              ? pastiglia(parole().vuoto, 'quiete')
              : libero > 0
                ? pastiglia(t.minutiLiberi(libero), 'quiete')
                : libero === 0
                  ? pastiglia(t.pieno, 'positivo')
                  : pastiglia(t.minutiDiTroppo(-libero), 'attenzione'),
          ),
        )
        attivita.forEach((voce, indice) => {
          if (posto(indice)?.blocco === i) righe.push(rigaAttivita(voce, indice))
        })
      })

      // Quel che non ci sta più nell'ora resta in fondo, dichiarato: non si toglie
      // al posto di chi l'ha scritto.
      if (attivita.some((_, indice) => posto(indice)?.ud === null)) {
        righe.push(
          h(
            'li',
            { class: 'attivita-editor__ud attivita-editor__ud--fuori' },
            icona('avviso', 'icona--minuta'),
            h('span', null, t.oltreLaFine),
          ),
        )
        attivita.forEach((voce, indice) => {
          if (posto(indice)?.ud === null) righe.push(rigaAttivita(voce, indice))
        })
      }
      return righe
    }

    // Senza lezione sotto niente scheletro: l'elenco, o che è vuoto.
    const vuotoSenzOra = attivita.length === 0 && !sulleUd
    if (!vuotoSenzOra) rimpiazza(elenco, scheletro())

    rimpiazza(
      contenitore,
      vuotoSenzOra ? quieto(t.nessunaAttivita) : elenco,
      attivita.length === 0 && sulleUd ? quieto(t.nessunaAttivita) : null,
      h(
        'div',
        { class: 'attivita-editor__piede' },
        pulsante({
          testo: t.aggiungiAttivita,
          simbolo: 'piu',
          variante: 'sottile',
          al: () => {
            const nuova = creaAttivita('', udDaMinutiAttivita(15, perUd))
            attivita.push(nuova)
            // Una tappa nuova nasce col dettaglio aperto: è lì che le manca tutto.
            aperte.add(nuova.id)
            disegna()
            allaModifica(attivita)
            // E col fuoco sul titolo.
            contenitore
              .querySelector<HTMLElement>(`[data-attivita-id="${nuova.id}"] input`)
              ?.focus()
          },
        }),
        // Il totale in minuti come le tappe, accanto a quanto dura l'ora.
        sulleUd
          ? pastiglia(
              t.totaleSu(
                formattaDurata(minutiDiAttivita(totale, sulleUd.minutiPerUd)),
                formattaDurata(sulleUd.minutiLezione),
                formattaUd(sulleUd.udLezione),
              ) +
                (sulleUd.scostamento > 0
                  ? ' · ' +
                    t.minutiDiTroppo(minutiDiAttivita(sulleUd.scostamento, sulleUd.minutiPerUd))
                  : ''),
              sulleUd.scostamento > 0 ? 'negativo' : 'positivo',
              'orologio',
            )
          : pastiglia(
              t.totale(formattaDurata(minutiDiAttivita(totale, perUd))),
              'informativo',
              'orologio',
            ),
      ),
    )
  }

  disegna()
  return contenitore
}
