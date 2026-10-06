// Gli aiuti che i rapporti hanno in comune: il rapporto vuoto, le colonne
// nella lingua di stampa, l'intestazione, la legenda, la soglia d'assenza.
// Che cosa entra in un rapporto lo dice `index.ts`; l'impaginazione la decide
// il modello e la disegna `data/reportsPdf.ts`.

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  arrotondaCentesimo,
  formattaVoto,
  mediaAllievo,
  nomeCompleto,
  notaFineSemestre,
  ordinaAllievi,
} from '#core/dominio/calculations.js'
import { LINGUA_PREDEFINITA, lingua, minuscolo, type Lingua } from '#core/i18n/index.js'
import { Maiuscola } from '#core/dominio/lexicon.js'
import { oltreSoglia, percentoAssenza } from '#core/dominio/alerts.js'
import { testoDiVoce } from '#core/dominio/lists.js'
import { scadenzaConsegna } from '#core/dominio/assignments.js'
import { etichettaSemestre, formattaData, oggi, semestreDi } from '#core/dominio/dates.js'
import type {
  Allievo,
  Classe,
  Consegna,
  Iso,
  MomentoValutazione,
  Registro,
} from '#core/dominio/models.js'
import type { DatiRapporto, Tabella } from '#core/dominio/reports.js'
import { annoInUso } from '#core/dominio/years.js'
import { cartaDeiCorsi } from '#core/dominio/letterhead.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './reportData.testi.js'

/**
 * A chi va una consegna, con le stesse parole in ogni foglio: il docente, le
 * persone scelte per nome, o tutta la classe.
 */
export function aChiConsegna (consegna: Consegna, nomi: ReadonlyMap<string, string>): string {
  const t = testi()
  if (consegna.a === 'docente') return t.docente
  if (consegna.a === 'allievi') return consegna.allieviIds.map((id) => nomi.get(id) ?? id).join(', ')
  return t.tuttaLaClasse
}

/** Il «per quando» di una consegna: il giorno dell'ora a cui è legata, o la data scritta. */
export function perQuando (registro: Registro, consegna: Consegna): string {
  const scadenza = scadenzaConsegna(registro, consegna)
  return scadenza ? formattaData(scadenza) : ''
}

/** Un rapporto vuoto su cui i costruttori scrivono. */
export function vuoto (): DatiRapporto {
  return { valori: {}, elenchi: {}, tabelle: {}, grafici: {} }
}

/**
 * I nomi delle colonne in una lingua: quelli dei rapporti sopra le parole di
 * tutti (`parole()`: «Data», «Tipo», «Stato»…).
 */
function nomiDiColonna (scelta: Lingua) {
  return { ...parole.in(scelta), ...testi.in(scelta).colonne }
}

type Colonne = ReturnType<typeof nomiDiColonna>

/**
 * L'intestazione di una tabella nella lingua di stampa, con accanto (fuori
 * dall'italiano) i nomi di serie con cui i modelli scelgono le colonne (vedi
 * `Tabella.chiavi`). La scelta si chiama due volte, una per lingua.
 */
export function colonne (scegli: (c: Colonne) => string[]): Pick<Tabella, 'intestazione' | 'chiavi'> {
  const intestazione = scegli(nomiDiColonna(lingua()))
  const chiavi = scegli(nomiDiColonna(LINGUA_PREDEFINITA))
  return chiavi.every((nome, i) => nome === intestazione[i])
    ? { intestazione }
    : { intestazione, chiavi }
}

/**
 * I valori comuni a ogni rapporto, usati dall'intestazione. `periodo` non è
 * mai vuoto: senza semestre è l'anno, e va detto.
 */
export function comuni (
  registro: Registro,
  titolo: string,
  periodo: string,
  corsiIds: readonly string[],
): Record<string, string> {
  const anno = annoInUso(registro)
  // La carta intestata la decide il corso del foglio: scuola in cima e, con
  // `carta`, il logo. Chi firma è uno solo per tutte le carte.
  const intestazione = registro.impostazioni.intestazione
  const carta = cartaDeiCorsi(intestazione, corsiIds)
  return {
    titolo,
    anno: anno?.etichetta ?? '',
    periodo,
    generato: formattaData(oggi()),
    sede: carta.sede,
    docente: intestazione.docente,
    'docente.appellativo': intestazione.docenteAppellativo ?? '',
    'docente.nome': intestazione.docenteNome ?? '',
    'docente.cognome': intestazione.docenteCognome ?? '',
    'docente.completo':
      [intestazione.docenteAppellativo, intestazione.docenteNome, intestazione.docenteCognome]
        .filter(Boolean)
        .join(' ') || intestazione.docente,
    [CHIAVE_CARTA]: carta.id,
  }
}

/**
 * La chiave dei valori con l'id della carta intestata: non si stampa, ma dice
 * a chi compone il PDF quale logo mettere, deciso qui insieme alla sede.
 */
export const CHIAVE_CARTA = 'cartaIntestata'

/**
 * La legenda delle sigle dell'appello, per chi non ha visto lo schermo. Le
 * sigle vengono dal codice; la frase la decide `_testi.tpl`
 * (`legenda-presenze`). `{{legendaPresenze}}` è composta qui per i modelli che
 * non usano `_testi.tpl`.
 */
export function legenda (dati: DatiRapporto): void {
  const vive = SIGLE_PRESENZA.filter((v) => v.valore !== 'non-impostato')
  for (const voce of vive) {
    const nome = voce.valore.replace(/-(.)/g, (_, c: string) => c.toUpperCase())
    dati.valori[`sigla${Maiuscola(nome)}`] = voce.sigla
    dati.valori[`nome${Maiuscola(nome)}`] = minuscolo(voce.nome)
  }
  dati.valori.legendaPresenze = vive.map((v) => `${v.sigla} ${minuscolo(v.nome)}`).join(' · ')
}

/** Come si chiama il semestre in cui cade un giorno, per la testata. */
export function periodoDi (registro: Registro, giorno: Iso): string {
  const anno = annoInUso(registro)
  return etichettaSemestre(anno ? semestreDi(anno, giorno) : null)
}

/** Come si chiama un aspetto osservato, con le parole delle impostazioni. */
export function nomeAspetto (registro: Registro, valore: string): string {
  return testoDiVoce(registro.impostazioni, 'aspettoOsservato', valore)
}

/** Se un'assenza supera la soglia: la regola sta in `alerts.ts`, come per il todo. */
export function sopraLaSoglia (registro: Registro, assenza: number | null): boolean {
  return oltreSoglia(registro.impostazioni.sogliaAssenza, assenza)
}

/** La frase d'avviso quando un'assenza supera la soglia, o vuoto. */
export function avvisoAssenza (registro: Registro, assenza: number | null): string {
  if (!sopraLaSoglia(registro, assenza)) return ''
  const soglia = registro.impostazioni.sogliaAssenza
  // Appena oltre, l'intero arrotondato cade sulla soglia (20,09% di 45 UD su
  // 224): un decimale per eccesso, come nella pagina Assenze.
  return testi().avvisoAssenza(percentoAssenza(assenza, soglia), soglia)
}

/**
 * Le persone di una tabella di classe, in ordine di elenco: chi frequenta, e
 * chi si è ritirato solo se ha lasciato una traccia sul foglio (un voto, un
 * appello), segnato come tale. I conti contano chi frequenta; una casella
 * scritta però non sparisce.
 */
export function righeDiClasse (
  classe: Classe | null,
  traccia: (allievo: Allievo) => boolean = () => false,
): Array<{ allievo: Allievo, nome: string }> {
  if (!classe) return []
  const ritirato = testi().ritirato
  return ordinaAllievi(classe.allievi.filter((a) => a.attivo || traccia(a))).map((allievo) => ({
    allievo,
    nome: allievo.attivo ? nomeCompleto(allievo) : `${nomeCompleto(allievo)} (${ritirato})`,
  }))
}

/** Una media come si stampa: con la virgola fissa, o «—» quando non ha senso. */
interface MediaStampata {
  /** Il numero, se lo si può dire: nullo senza voti o con scale diverse. */
  valore: number | null
  media: string
  nota: string
  /** Vero se i voti stanno su scale diverse: il numero sarebbe falso. */
  scaleDiverse: boolean
  conteggio: number
}

/**
 * Media e nota di pagella di una persona sui momenti dati. Con voti su scale
 * diverse (un 24 su 30 e un 5 su 6) la media pesata non è la media di niente:
 * niente numero, e la nota dice perché.
 */
export function mediaStampata (
  registro: Registro,
  momenti: MomentoValutazione[],
  allievoId: string,
): MediaStampata {
  const conto = mediaAllievo(momenti, allievoId)
  if (conto.scaleEterogenee) {
    return { valore: null, media: '—', nota: testi().scaleDiverse, scaleDiverse: true, conteggio: conto.conteggio }
  }
  const nota = notaFineSemestre(
    conto.media,
    registro.impostazioni.scala,
    registro.impostazioni.passoFineSemestre,
  )
  return {
    valore: conto.media,
    media: conto.media === null ? '' : conto.media.toFixed(2),
    nota: nota === null ? '' : formattaVoto(nota),
    scaleDiverse: false,
    conteggio: conto.conteggio,
  }
}

/**
 * La media del corso: la media delle medie di chi frequenta e ha almeno un
 * voto, al centesimo. Senza numero se anche una sola delle medie mescola scale.
 */
export function mediaDiClasse (
  registro: Registro,
  momenti: MomentoValutazione[],
  classe: Classe | null,
): { valore: number | null, scaleDiverse: boolean } {
  const medie = (classe ? allieviAttivi(classe) : [])
    .map((a) => mediaStampata(registro, momenti, a.id))
  if (medie.some((m) => m.scaleDiverse)) return { valore: null, scaleDiverse: true }
  const valori = medie.map((m) => m.valore).filter((m): m is number => m !== null)
  const somma = valori.reduce((s, m) => s + m, 0)
  return {
    valore: valori.length === 0 ? null : arrotondaCentesimo(somma / valori.length),
    scaleDiverse: false,
  }
}
