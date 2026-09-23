// Il grafico delle note: un punto per voto, sopra l'asse della scala.
//
// Sta fra i componenti e non dentro una vista perché lo disegnano in due: il
// registro, sotto la griglia dei voti, e lo schermo per la classe. Sono due
// applicazioni diverse — due bundle, due fogli di stile — e prima avevano due
// istogrammi scritti a mano, con due aspetti e due regole. Restituendo una
// verifica il docente commenta sul proiettore una forma, e riguardandola sul
// portatile ne trovava un'altra: non un errore di calcolo, ma abbastanza per
// far dubitare del numero.
//
// La forma è quella del PDF, e non per somiglianza: sono gli stessi dati, che
// il dominio prepara una volta sola in `distribuzioneAPunti`. Un foglio
// stampato e lo schermo da cui è uscito devono dire la stessa cosa nello
// stesso modo, o il foglio non è più una copia di quel che si è visto.
//
// Non conosce né lo stato del pannello né il registro: prende cifre già fatte.
// È la condizione per poter vivere in tutti e due i posti — il webview della
// proiezione non ha `stato.js` e non deve averlo.

import type { Grafico } from '../../domain/reports.js'
import { h, type Figlio } from '../dom.js'

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

/**
 * Dove cade un valore sull'asse, in percentuale.
 *
 * Le percentuali e non i pixel: il grafico esce piccolo sul portatile e grande
 * sul proiettore, e le due cose devono essere lo stesso disegno ingrandito.
 */
function posizione (grafico: Grafico, valore: number): number {
  const campo = grafico.a - grafico.da
  if (campo <= 0) return 50
  return ((valore - grafico.da) / campo) * 100
}

/**
 * Come si appoggia un'etichetta sopra un punto dell'asse.
 *
 * Centrata, tranne agli estremi: sul primo e sull'ultimo tratto la metà di
 * fuori uscirebbe dal riquadro, e fuori non si legge.
 */
function ancoraggio (quanto: number): Record<string, string> {
  if (quanto < 12) return { left: '0', transform: 'none' }
  if (quanto > 88) return { left: '100%', transform: 'translateX(-100%)' }
  return { left: `${quanto}%`, transform: 'translateX(-50%)' }
}

/**
 * Il numero di una tacca: il mezzo punto con il suo decimale, l'intero senza.
 *
 * «quattro e mezzo» sotto l'asse è 4.5, ma il quattro secco resta 4: scriverlo
 * 4.0 raddoppierebbe le cifre di metà asse senza dire niente di più.
 */
function formattaTacca (valore: number): string {
  return Number.isInteger(valore) ? String(valore) : valore.toFixed(1)
}

/**
 * Il grafico, con sopra la riga dei conti.
 *
 * Torna `null` senza voti: un asse spoglio non dice «nessuno ha ancora un
 * voto», dice «guardate che bel niente».
 */
export function graficoNote (dati: DatiGraficoNote): Figlio {
  if (dati.conteggio === 0) return null
  const { grafico } = dati
  // L'altezza della pila più alta decide quella del riquadro, con un minimo:
  // con due soli punti in colonna i segni verticali diventerebbero trattini.
  const pile = Math.max(4, ...grafico.punti.map((p) => p.quanti))

  return h(
    'div',
    { class: 'note-grafico' },
    h(
      'div',
      { class: 'note-grafico__conti' },
      h('span', { class: 'conto' }, h('strong', null, dati.media), ' media'),
      h(
        'span',
        { class: 'conto' },
        h('strong', null, String(dati.sufficienti)),
        ` sufficient${dati.sufficienti === 1 ? 'e' : 'i'} su ${dati.conteggio}`,
      ),
      dati.estremi ? h('span', { class: 'conto conto--quieto' }, dati.estremi) : null,
    ),
    // Le etichette dei segni su righe sovrapposte: la media può cadere
    // esattamente sulla sufficienza — succede, e non è un caso strano — e su
    // una riga sola le due scritte si coprirebbero.
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
      { class: 'note-grafico__campo', style: { height: `${pile * 13 + 6}px` } },
      // I segni verticali passano dietro ai punti, non sopra.
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
            style: { left: `${posizione(grafico, punto.valore)}%`, bottom: `${i * 13}px` },
            attr: {
              title: `${punto.valore}: ${punto.quanti} ${punto.quanti === 1 ? 'voto' : 'voti'}`,
            },
          }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'note-grafico__asse' },
      // Le lineette prima dei numeri: quelle del quarto restano mute e più
      // corte — servono a dividere il tratto, non a farsi leggere.
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
