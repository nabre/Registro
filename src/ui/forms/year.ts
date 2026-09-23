// L'anno scolastico e le sue interruzioni: semestri, vacanze, giorni di
// sospensione.

import { allineaSemestri, annoAllineato } from '../../domain/years.js'
import { differenzaGiorni, formattaData, oggi, sommaGiorni } from '../../domain/dates.js'
import { creaSospensione } from '../../domain/factories.js'
import type { AnnoScolastico, Iso, Sospensione } from '../../domain/models.js'
import { campo, pulsante, riga, sezioneModulo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { h, rimpiazza } from '../dom.js'

import { salva, testo } from './common.js'

/**
 * L'anno scolastico: l'etichetta, e i due semestri che lo fanno.
 *
 * Le date da scrivere sono tre e non sei: quando comincia il primo semestre,
 * quando chiude, e quando finisce il secondo. L'anno le eredita — comincia col
 * primo e finisce con l'ultimo — e il secondo semestre parte il giorno dopo il
 * confine, senza che ci sia modo di lasciare un giorno fuori da tutti e due.
 */
/**
 * Le pause che quasi ogni anno ha, con il mese in cui cadono di solito.
 *
 * Sono scorciatoie, non un elenco chiuso: premendone una nasce la riga già
 * intitolata e con le date nel periodo giusto, che poi si spostano. Il nome
 * resta scrivibile a mano — ogni sede ha le sue giornate.
 */
const PAUSE_TIPICHE: Array<{ nome: string, mese: number, giorni: number }> = [
  { nome: 'Vacanze autunnali', mese: 10, giorni: 14 },
  { nome: 'Vacanze di Natale', mese: 12, giorni: 14 },
  { nome: 'Vacanze di carnevale', mese: 2, giorni: 7 },
  { nome: 'Vacanze di Pasqua', mese: 4, giorni: 7 },
  { nome: 'Giornata d’istituto', mese: 0, giorni: 1 },
]

/**
 * Le pause dell'anno: una riga per vacanza, con nome, dal, al.
 *
 * Il disegno si rifà solo quando le righe cambiano di numero — se ne aggiunge
 * una, se ne toglie una. Cambiando una data no: si aggiorna il conto dei
 * giorni di quella riga e basta. Prima si ridisegnava tutto a ogni data, e
 * l'input che si stava usando veniva distrutto e rifatto sotto le dita: il
 * fuoco saltava via, e passare da «dal» a «al» con il tabulatore non
 * funzionava. È il motivo per cui questa parte sembrava rotta anche quando
 * salvava bene.
 */
function editorPause (
  iniziali: Sospensione[],
  dentro: { inizio: Iso, fine: Iso },
  allaModifica: (pause: Sospensione[]) => void,
): HTMLElement {
  let pause = iniziali.map((s) => ({ ...s }))
  const contenitore = h('div', { class: 'pause-editor' })

  /** Dove cade di solito quella pausa, dentro quest'anno. */
  const quandoCade = (mese: number): Iso => {
    if (mese === 0) return dentro.inizio
    const annoCivile = Number(dentro.inizio.slice(0, 4)) + (mese >= 9 ? 0 : 1)
    const proposta = `${annoCivile}-${String(mese).padStart(2, '0')}-15`
    return proposta >= dentro.inizio && proposta <= dentro.fine ? proposta : dentro.inizio
  }

  const aggiungi = (nome: string, mese: number, giorni: number) => {
    const dal = quandoCade(mese)
    pause.push(creaSospensione(nome, dal, sommaGiorni(dal, Math.max(0, giorni - 1))))
    allaModifica(pause)
    disegna()
  }

  /** Una riga: le tre caselle, il conto dei giorni, il cestino. */
  const riga = (pausa: Sospensione): HTMLElement => {
    const stato = h('span', { class: 'testo-quieto' })

    // Quanti giorni dura, e se sta dentro l'anno. Si riscrive in posto a ogni
    // data cambiata: è l'unica cosa che dipende dalle date, e rifare la riga
    // intera per aggiornarla costerebbe il fuoco del campo che si sta usando.
    const aggiornaStato = () => {
      const giorni = differenzaGiorni(pausa.dal, pausa.al) + 1
      const fuori = pausa.dal < dentro.inizio || pausa.al > dentro.fine
      stato.className = fuori ? 'testo-negativo' : 'testo-quieto'
      stato.textContent = fuori
        ? 'fuori dall’anno'
        : `${giorni} giorn${giorni === 1 ? 'o' : 'i'}`
      elemento.classList.toggle('pausa-riga--fuori', fuori)
    }

    const dal = campo({
      nome: `pausa-dal-${pausa.id}`,
      tipo: 'date',
      valore: pausa.dal,
      classe: 'pausa-riga__data',
      al: (valore) => {
        pausa.dal = valore
        // Una pausa che finisce prima di cominciare dura un giorno: è quel
        // che si intendeva scrivendo una data sola.
        if (pausa.al < pausa.dal) {
          pausa.al = pausa.dal
          scriviData(al, pausa.al)
        }
        allaModifica(pause)
        aggiornaStato()
      },
    })

    const al = campo({
      nome: `pausa-al-${pausa.id}`,
      tipo: 'date',
      valore: pausa.al,
      classe: 'pausa-riga__data',
      al: (valore) => {
        pausa.al = valore < pausa.dal ? pausa.dal : valore
        if (pausa.al !== valore) scriviData(al, pausa.al)
        allaModifica(pause)
        aggiornaStato()
      },
    })

    const elemento = h(
      'li',
      { class: 'pausa-riga' },
      h('input', {
        class: 'campo__controllo pausa-riga__nome',
        type: 'text',
        value: pausa.etichetta,
        placeholder: 'Vacanze autunnali',
        attr: { 'aria-label': 'Come si chiama' },
        onchange: (evento: Event) => {
          pausa.etichetta = (evento.target as HTMLInputElement).value
          allaModifica(pause)
        },
      }),
      dal,
      al,
      stato,
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Togli la pausa',
        al: () => {
          pause = pause.filter((x) => x.id !== pausa.id)
          allaModifica(pause)
          disegna()
        },
      }),
    )

    aggiornaStato()
    return elemento
  }

  const disegna = () => {
    rimpiazza(
      contenitore,
      pause.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Nessuna pausa: vacanze e giorni di chiusura si dichiarano qui, e la ' +
              'generazione dell’orario li salta.',
          )
        : h(
            'ul',
            { class: 'pause-editor__elenco' },
            h(
              'li',
              { class: 'pause-editor__intestazione' },
              h('span', null, 'Che cosa'),
              h('span', null, 'Dal'),
              h('span', null, 'Al'),
              h('span', null, 'Quanto'),
              h('span', null, ''),
            ),
            ...[...pause].sort((a, b) => a.dal.localeCompare(b.dal)).map(riga),
          ),
      h(
        'div',
        { class: 'pause-editor__piede' },
        pulsante({
          testo: 'Aggiungi pausa',
          simbolo: 'piu',
          variante: 'sottile',
          al: () => aggiungi('', 0, 1),
        }),
        ...PAUSE_TIPICHE.map((tipica) =>
          pulsante({
            testo: tipica.nome,
            variante: 'fantasma',
            simbolo: 'piu',
            titolo: `Aggiunge «${tipica.nome}» nel periodo in cui cade di solito`,
            al: () => aggiungi(tipica.nome, tipica.mese, tipica.giorni),
          }),
        ),
      ),
    )
  }

  disegna()
  return contenitore
}

/**
 * Riscrive una data dentro un campo già disegnato.
 *
 * Serve quando è il registro a correggerla — un «al» prima del «dal» — e non
 * chi scrive: il campo tiene il valore in ISO in un input nascosto e mostra la
 * forma leggibile, e vanno aggiornati tutti e due.
 */
function scriviData (campoData: HTMLElement, iso: Iso): void {
  const nascosto = campoData.querySelector<HTMLInputElement>('input[type="hidden"]')
  const visibile = campoData.querySelector<HTMLInputElement>('input[type="text"]')
  if (nascosto) nascosto.value = iso
  if (visibile) visibile.value = formattaData(iso)
}

/**
 * Le sole pause, senza il resto dell'anno.
 *
 * Si aprono da sole perché è quel che si fa davvero: a settembre si mette il
 * calendario delle vacanze, e poi in primavera ne salta fuori una — una
 * giornata d'istituto, un ponte deciso a gennaio. Passare per il modulo
 * dell'anno intero voleva dire avere sotto gli occhi le date dei semestri per
 * aggiungere un giorno di chiusura, con il rischio di toccarle per sbaglio.
 */
export function moduloPause (anno: AnnoScolastico): void {
  let pause = anno.sospensioni.map((x) => ({ ...x }))

  apriModale({
    titolo: `Giorni senza lezione · ${anno.etichetta}`,
    sottotitolo: 'valgono per tutte le classi dell’anno, e la generazione dell’orario li salta',
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        editorPause(pause, { inizio: anno.inizio, fine: anno.fine }, (nuove) => {
          pause = nuove
        }),
      ),
    alSalva: async (_valori, contesto) => {
      const aggiornato = annoAllineato({
        ...anno,
        sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
      })
      await salva(contesto, { tipo: 'anno.salva', anno: aggiornato }, 'Pause aggiornate.')
    },
  })
}

export function moduloAnno (anno?: AnnoScolastico): void {
  const modifica = Boolean(anno)
  const oggiIso = oggi()
  const annoBase = Number(oggiIso.slice(0, 4)) - (Number(oggiIso.slice(5, 7)) >= 8 ? 0 : 1)

  let pause = anno?.sospensioni.map((x) => ({ ...x })) ?? []
  const semestri = anno ? allineaSemestri(anno.semestri) : []
  const primo = semestri[0] ?? null
  const secondo = semestri[1] ?? null

  apriModale({
    titolo: modifica ? `Anno ${anno!.etichetta}` : 'Nuovo anno scolastico',
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'etichetta',
          etichetta: 'Etichetta',
          valore: anno?.etichetta ?? `${annoBase}/${annoBase + 1}`,
          richiesto: true,
          larghezza: 'meta',
        }),
        sezioneModulo(
          'Semestri',
          h(
            'p',
            { class: 'testo-quieto' },
            'L’anno va da quando comincia il primo semestre a quando finisce il secondo: ' +
              'le sue date si ricavano da queste.',
          ),
          riga(
            campo({
              nome: 'primoEtichetta',
              etichetta: 'Nome del 1° semestre',
              valore: primo?.etichetta ?? '1° semestre',
              larghezza: 'meta',
            }),
            campo({
              nome: 'inizio',
              etichetta: 'Comincia il',
              tipo: 'date',
              valore: primo?.inizio ?? `${annoBase}-09-01`,
              richiesto: true,
              larghezza: 'quarto',
            }),
            campo({
              nome: 'confine',
              etichetta: 'Finisce il',
              tipo: 'date',
              valore: primo?.fine ?? `${annoBase + 1}-01-31`,
              richiesto: true,
              aiuto: 'Il 2° semestre comincia il giorno dopo.',
              larghezza: 'quarto',
            }),
          ),
          riga(
            campo({
              nome: 'secondoEtichetta',
              etichetta: 'Nome del 2° semestre',
              valore: secondo?.etichetta ?? '2° semestre',
              larghezza: 'meta',
            }),
            campo({
              nome: 'fine',
              etichetta: 'Finisce il',
              tipo: 'date',
              valore: secondo?.fine ?? `${annoBase + 1}-06-30`,
              richiesto: true,
              larghezza: 'quarto',
            }),
          ),
        ),
        sezioneModulo(
          'Pause',
          h(
            'p',
            { class: 'testo-quieto' },
            'Vacanze e giorni di chiusura: valgono per tutte le classi dell’anno, e la ' +
              'generazione dell’orario li salta.',
          ),
          editorPause(
            pause,
            {
              inizio: primo?.inizio ?? `${annoBase}-09-01`,
              fine: secondo?.fine ?? `${annoBase + 1}-06-30`,
            },
            (nuove) => {
              pause = nuove
            },
          ),
        ),
      ),
    alSalva: async (valori, contesto) => {
      const inizio = testo(valori.inizio)
      const confine = testo(valori.confine)
      const fine = testo(valori.fine)
      if (confine <= inizio) {
        contesto.mostraErrori(['Il 1° semestre deve finire dopo il suo inizio.'])
        return
      }
      if (fine <= confine) {
        contesto.mostraErrori(['Il 2° semestre deve finire dopo il confine.'])
        return
      }

      if (!anno) {
        // L'editor delle pause si compila anche per un anno che non esiste
        // ancora: mandarle è l'unico modo perché non si perdano appena create.
        await salva(
          contesto,
          {
            tipo: 'anno.crea',
            inizio,
            fine,
            etichetta: testo(valori.etichetta),
            confine,
            sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
            etichetteSemestri: [testo(valori.primoEtichetta), testo(valori.secondoEtichetta)],
          },
          'Anno scolastico creato.',
        )
        return
      }

      // Si riscrivono le date, non gli id: le lezioni e le valutazioni che si
      // appoggiano a un semestre devono continuare a trovarlo.
      const aggiornato = annoAllineato({
        ...anno,
        etichetta: testo(valori.etichetta),
        sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
        semestri: [
          {
            ...primo,
            etichetta: testo(valori.primoEtichetta) || primo.etichetta,
            inizio,
            fine: confine,
          },
          {
            ...secondo,
            etichetta: testo(valori.secondoEtichetta) || secondo.etichetta,
            inizio: sommaGiorni(confine, 1),
            fine,
          },
        ],
      })
      await salva(contesto, { tipo: 'anno.salva', anno: aggiornato }, 'Anno aggiornato.')
    },
    // Nessun tasto per eliminare: un anno è un documento, e un documento si
    // butta dal gestore di file. Il registro ne apre uno per volta e non
    // possiede più la cartella in cui stanno, quindi non gli spetta cestinarli.
    azioniSecondarie: () => null,
  })
}
