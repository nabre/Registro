// Che cosa sta vedendo la classe adesso, detto dentro la barra dei comandi,
// perché lo schermo grande è alle spalle e da qui non si vede. I comandi sono
// nella scheda «Proiezione» della barra (`dove: ['schermo']`); qui stanno le
// tre cose che un pulsante di comando non sa dire da sé: se lo schermo è in
// pausa, quali schede sono accese ma non in vista, e quando sullo schermo ci
// sono dati di singole persone.

import type { ReactNode } from 'react'

import {
  NOMI_BLOCCO,
  bloccoAperto,
  riservato,
  type BloccoProiezione,
  type ImpostazioniProiezione,
} from '#core/dominio/projection.js'
import { classi } from '#ui/classNames.js'
import type { ComandoUI } from '#ui/commands.js'
import { stato } from '#ui/state.js'
import { Icona } from './icons.js'
import { testi } from './projection.testi.js'

/** Il prefisso dei comandi che mettono una scheda sullo schermo (`comandoDiBlocco`). */
const PREFISSO_BLOCCO = 'proiezione.blocco.'

/**
 * La frase sui dati riservati, se la scheda in vista ne ha. Solo per quella:
 * un allarme su un blocco che nessuno vede si imparerebbe a ignorare.
 */
export function avvisoRiservato (impostazioni: ImpostazioniProiezione): string | null {
  const aperto = bloccoAperto(impostazioni)
  if (impostazioni.sospesa || !aperto || !riservato(aperto)) return null
  return `${testi().sulloSchermo(NOMI_BLOCCO[aperto])}${impostazioni.nomi ? testi().conINomi : ''}.`
}

/**
 * Il primo riquadro della riga dello schermo: in proiezione o in pausa, e
 * l'avviso quando la classe vede dati di singole persone. Non è un pulsante:
 * la pausa si comanda col suo interruttore, qui accanto.
 */
export function statoDelloSchermo (): ReactNode {
  if (!stato.proiezione.aperta) return null
  const impostazioni = stato.proiezione.impostazioni
  const avviso = avvisoRiservato(impostazioni)

  return (
    <div
      className={classi(
        'barra-comandi__gruppo',
        'stato-schermo',
        impostazioni.sospesa && 'stato-schermo--sospeso',
        avviso && 'stato-schermo--riservato',
      )}
      role="status"
      aria-label={testi().cheCosaVede}
    >
      <span className="stato-schermo__marchio">
        <Icona nome={impostazioni.sospesa ? 'pausa' : 'schermo'} />
        <strong>{impostazioni.sospesa ? testi().inPausa : testi().inProiezione}</strong>
      </span>
      {avviso
        ? <span className="stato-schermo__avviso"><Icona nome="avviso" classe="icona--minuta" />{avviso}</span>
        : null}
    </div>
  )
}

/** Quel che un pulsante di scheda della proiezione porta in più degli altri comandi. */
export interface SegniDelBlocco {
  /** Le classi da aggiungere: `comando--in-coda`, `comando--riservato`. */
  classi: string[]
  /** Il titolo che prende il posto di quello del comando, o `null`. */
  titolo: string | null
}

/**
 * Il terzo stato delle schede: accesa ma non in vista (fra quelle fra cui si
 * passa con avanti e indietro). «In vista» è già `comando--acceso`; i blocchi
 * riservati restano riconoscibili anche spenti, vanno guardati due volte.
 * `null` per i comandi che non sono schede. `spento` è il pulsante disabilitato.
 */
export function segnaBlocco (comando: ComandoUI, spento: boolean): SegniDelBlocco | null {
  if (!comando.id.startsWith(PREFISSO_BLOCCO)) return null
  const blocco = comando.id.slice(PREFISSO_BLOCCO.length) as BloccoProiezione
  const impostazioni = stato.proiezione.impostazioni
  const acceso = impostazioni.blocchi.includes(blocco)
  const inVista = acceso && bloccoAperto(impostazioni) === blocco

  const segni: string[] = []
  if (acceso && !inVista) segni.push('comando--in-coda')
  if (riservato(blocco)) segni.push('comando--riservato')
  return {
    classi: segni,
    // Solo «in vista» ha una frase sua: ricliccare toglie quel che si sta vedendo.
    titolo: inVista && !spento ? testi().inVista(NOMI_BLOCCO[blocco]) : null,
  }
}
