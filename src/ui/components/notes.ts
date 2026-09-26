// Il grafico delle note: un punto per voto, sopra l'asse della scala. Lo
// disegnano il registro e lo schermo per la classe, con la stessa forma del PDF
// (i dati vengono da `distribuzioneAPunti`): chi commenta una verifica sul
// proiettore deve ritrovare la stessa forma sul portatile e sul foglio. Non
// conosce lo stato né il registro, perché il webview della proiezione non ha
// `state.js`.

import type { Grafico } from '../../domain/reports.js'
import { h, type Figlio } from '../dom.js'
import { testi } from './notes.testi.js'

interface DatiGraficoNote {
  /** Il disegno: asse, punti, segni. Lo fa `distribuzioneAPunti`. */
  grafico: Grafico
  media: string
  sufficienti: number
  /** Quanti voti ci sono davvero: la media di tre non è la media della classe. */
  conteggio: number
  /** «da 3 a 5.5», quando serve dirlo. */
  estremi?: string | null
}

/** Dove cade un valore sull'asse, in percentuale: lo stesso disegno a ogni misura. */
function posizione (grafico: Grafico, valore: number): number {
  const campo = grafico.a - grafico.da
  if (campo <= 0) return 50
  return ((valore - grafico.da) / campo) * 100
}

/** Come si appoggia un'etichetta sopra l'asse: centrata, tranne agli estremi. */
function ancoraggio (quanto: number): Record<string, string> {
  if (quanto < 12) return { left: '0', transform: 'none' }
  if (quanto > 88) return { left: '100%', transform: 'translateX(-100%)' }
  return { left: `${quanto}%`, transform: 'translateX(-50%)' }
}

/** Il numero di una tacca: 4.5 col decimale, 4 senza. */
function formattaTacca (valore: number): string {
  return Number.isInteger(valore) ? String(valore) : valore.toFixed(1)
}

/** Il grafico con sopra la riga dei conti, o `null` senza voti. */
export function graficoNote (dati: DatiGraficoNote): Figlio {
  if (dati.conteggio === 0) return null
  const { grafico } = dati
  // La pila più alta decide l'altezza, con un minimo perché i segni verticali
  // non diventino trattini.
  const pile = Math.max(4, ...grafico.punti.map((p) => p.quanti))
  const t = testi()

  return h(
    'div',
    { class: 'note-grafico' },
    h(
      'div',
      { class: 'note-grafico__conti' },
      h('span', { class: 'conto' }, h('strong', null, dati.media), t.media),
      h(
        'span',
        { class: 'conto' },
        h('strong', null, String(dati.sufficienti)),
        t.sufficienti(dati.sufficienti, dati.conteggio),
      ),
      dati.estremi ? h('span', { class: 'conto conto--quieto' }, dati.estremi) : null,
    ),
    // Le etichette dei segni su righe diverse: media e sufficienza possono cadere
    // nello stesso punto.
    (grafico.segni ?? []).length > 0
      ? h(
          'div',
          { class: 'note-grafico__segni' },
          ...(grafico.segni ?? []).map((segno) =>
            h(
              'div',
              { class: 'note-grafico__riga-segno' },
              h(
                'span',
                {
                  class: 'note-grafico__etichetta',
                  style: ancoraggio(posizione(grafico, segno.valore)),
                },
                segno.etichetta,
              ),
            ),
          ),
        )
      : null,
    h(
      'div',
      { class: 'note-grafico__campo', style: { height: `${pile * 13 + 6}px` } }, // testo-fisso: misura CSS
      // I segni verticali passano dietro ai punti.
      ...(grafico.segni ?? []).map((segno) =>
        h('span', {
          class: 'note-grafico__segno',
          style: { left: `${posizione(grafico, segno.valore)}%` },
        }),
      ),
      ...grafico.punti.flatMap((punto) =>
        Array.from({ length: punto.quanti }, (_, i) =>
          h('span', {
            class: [
              'note-grafico__punto',
              grafico.soglia !== undefined && punto.valore < grafico.soglia
                ? 'note-grafico__punto--sotto'
                : 'note-grafico__punto--sopra',
            ],
            style: { left: `${posizione(grafico, punto.valore)}%`, bottom: `${i * 13}px` }, // testo-fisso: misura CSS
            attr: {
              title: t.voti(punto.valore, punto.quanti),
            },
          }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'note-grafico__asse' },
      // Prima le lineette; quelle dei quarti restano mute e più corte.
      ...[
        ...grafico.tacche.map((valore) => ({ valore, lunga: true })),
        ...(grafico.tacchette ?? []).map((valore) => ({ valore, lunga: false })),
      ].map(({ valore, lunga }) =>
        h('span', {
          class: ['note-grafico__lineetta', lunga ? null : 'note-grafico__lineetta--corta'],
          style: { left: `${posizione(grafico, valore)}%` },
        }),
      ),
      ...grafico.tacche.map((tacca) =>
        h(
          'span',
          {
            class: 'note-grafico__tacca',
            style: ancoraggio(posizione(grafico, tacca)),
          },
          formattaTacca(tacca),
        ),
      ),
    ),
  )
}
