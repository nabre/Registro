// Il grafico delle note in React: un punto per voto, sopra l'asse della scala.
// Lo disegnano il registro e lo schermo per la classe, con la stessa forma del
// PDF (i dati vengono da `distribuzioneAPunti`): chi commenta una verifica sul
// proiettore deve ritrovare la stessa forma sul portatile e sul foglio. Non
// conosce lo stato né il registro, perché il webview della proiezione non ha
// `state.js`.

import type { CSSProperties, ReactElement } from 'react'

import type { Grafico } from '#core/dominio/reports.js'
import { classi } from '#ui/classNames.js'
import { testi } from '#ui/components/notes.testi.js'

interface DatiGraficoNote {
  /** Il disegno: asse, punti, segni. Lo fa `distribuzioneAPunti`. */
  grafico: Grafico
  media: string
  sufficienti: number
  /** Quanti voti ci sono davvero: la media di tre non è la media della classe. */
  conteggio: number
  /** «da 3 a 5.5», quando serve dirlo. */
  estremi?: string | null
  /**
   * Senza la riga dei conti: dove gli stessi numeri stanno già accanto, in
   * tessere (la scheda della prova), ripeterli sopra il grafico li raddoppia.
   */
  senzaConti?: boolean
}

/** Dove cade un valore sull'asse, in percentuale: lo stesso disegno a ogni misura. */
function posizione (grafico: Grafico, valore: number): number {
  const campo = grafico.a - grafico.da
  if (campo <= 0) return 50
  return ((valore - grafico.da) / campo) * 100
}

/** Come si appoggia un'etichetta sopra l'asse: centrata, tranne agli estremi. */
function ancoraggio (quanto: number): CSSProperties {
  if (quanto < 12) return { left: '0', transform: 'none' }
  if (quanto > 88) return { left: '100%', transform: 'translateX(-100%)' }
  return { left: `${quanto}%`, transform: 'translateX(-50%)' }
}

/**
 * Le tacche dell'asse: solo la prima e l'ultima si appoggiano al bordo. Con la
 * regola delle etichette (`ancoraggio`) anche la seconda, se cade nel primo
 * decimo, finirebbe appoggiata al bordo sopra la prima.
 */
function ancoraggioTacca (quanto: number, indice: number, quante: number): CSSProperties {
  if (indice === 0) return { left: '0', transform: 'none' }
  if (indice === quante - 1) return { left: '100%', transform: 'translateX(-100%)' }
  // Il punto d'appoggio scivola col valore, dal bordo sinistro dell'etichetta a
  // quello destro: vicina a un estremo resta dentro l'asse, a metà è centrata.
  return { left: `${quanto}%`, transform: `translateX(${-quanto}%)` } // testo-fisso: misura CSS
}

/** Il numero di una tacca: 4.5 col decimale, 4 senza. */
function formattaTacca (valore: number): string {
  return Number.isInteger(valore) ? String(valore) : valore.toFixed(1)
}

/** Il grafico con sopra la riga dei conti, o niente senza voti. */
export function GraficoNote (dati: DatiGraficoNote): ReactElement | null {
  if (dati.conteggio === 0) return null
  const { grafico } = dati
  const segni = grafico.segni ?? []
  // La pila più alta decide l'altezza, con un minimo perché i segni verticali
  // non diventino trattini.
  const pile = Math.max(4, ...grafico.punti.map((p) => p.quanti))
  const altezza = `${pile * 13 + 6}px` // testo-fisso: misura CSS
  const t = testi()
  // Prima le lineette; quelle dei quarti restano mute e più corte.
  const lineette = [
    ...grafico.tacche.map((valore) => ({ valore, lunga: true })),
    ...(grafico.tacchette ?? []).map((valore) => ({ valore, lunga: false })),
  ]

  return (
    <div className="note-grafico">
      {dati.senzaConti
        ? null
        : (
            <div className="note-grafico__conti">
              <span className="conto"><strong>{dati.media}</strong>{t.media}</span>
              <span className="conto">
                <strong>{String(dati.sufficienti)}</strong>
                {t.sufficienti(dati.sufficienti, dati.conteggio)}
              </span>
              {dati.estremi ? <span className="conto conto--quieto">{dati.estremi}</span> : null}
            </div>
          )}
      {/* Le etichette dei segni su righe diverse: media e sufficienza possono cadere nello stesso punto. */}
      {segni.length > 0
        ? (
            <div className="note-grafico__segni">
              {segni.map((segno, indice) => (
                // Lista fissa del disegno: l'indice basta.
                <div key={indice} className="note-grafico__riga-segno">
                  <span className="note-grafico__etichetta" style={ancoraggio(posizione(grafico, segno.valore))}>
                    {segno.etichetta}
                  </span>
                </div>
              ))}
            </div>
          )
        : null}
      <div className="note-grafico__campo" style={{ height: altezza }}>
        {/* I segni verticali passano dietro ai punti. */}
        {segni.map((segno, indice) => (
          <span
            key={`segno-${indice}`} // testo-fisso: chiave di React
            className="note-grafico__segno"
            style={{ left: `${posizione(grafico, segno.valore)}%` }}
          />
        ))}
        {grafico.punti.flatMap((punto) =>
          Array.from({ length: punto.quanti }, (_, i) => (
            <span
              key={`${punto.valore}-${i}`}
              className={classi(
                'note-grafico__punto',
                grafico.soglia !== undefined && punto.valore < grafico.soglia
                  ? 'note-grafico__punto--sotto'
                  : 'note-grafico__punto--sopra',
              )}
              style={{ left: `${posizione(grafico, punto.valore)}%`, bottom: `${i * 13}px` }} // testo-fisso: misura CSS
              title={t.voti(punto.valore, punto.quanti)}
            />
          )),
        )}
      </div>
      <div className="note-grafico__asse">
        {lineette.map(({ valore, lunga }) => (
          <span
            key={`${lunga ? 'tacca' : 'quarto'}-${valore}`} // testo-fisso: chiave di React
            className={classi('note-grafico__lineetta', !lunga && 'note-grafico__lineetta--corta')}
            style={{ left: `${posizione(grafico, valore)}%` }}
          />
        ))}
        {grafico.tacche.map((tacca, indice) => (
          <span
            key={tacca}
            className="note-grafico__tacca"
            style={ancoraggioTacca(posizione(grafico, tacca), indice, grafico.tacche.length)}
          >
            {formattaTacca(tacca)}
          </span>
        ))}
      </div>
    </div>
  )
}
