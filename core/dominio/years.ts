// L'anno scolastico e i suoi semestri.
//
// Invariante: l'anno non ha date sue (va dall'inizio del primo semestre alla
// fine dell'ultimo) e i semestri sono attigui, così nessun giorno dell'anno
// resta fuori da un semestre, cioè da medie e cruscotto.

import { inizioSettimana, isoValida, sommaGiorni } from './dates.js'
import { scriviIndirizzo } from './addresses.js'
import { chiaveIndirizzo } from './map.js'
import type {
  AnnoScolastico,
  Iso,
  LetteraSettimana,
  Registro,
  Semestre,
} from './models.js'
import { nomeSicuro } from './text.js'
import { testi } from './years.testi.js'

/**
 * L'anno in uso: quello segnato come corrente, o il primo che c'è se
 * `annoCorrenteId` punta a un anno sparito. Tutti passano di qui, perché tutti
 * rispondano allo stesso modo.
 */
export function annoInUso (registro: Registro): AnnoScolastico | null {
  return registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? registro.anni[0] ?? null
}

/**
 * I semestri rimessi in fila: in ordine di inizio, rinumerati, attaccati.
 * Comanda la fine di ciascuno; l'inizio del successivo ne segue. Un semestre
 * che finirebbe prima di cominciare dura un giorno, visibile e correggibile.
 */
export function allineaSemestri (semestri: Semestre[]): Semestre[] {
  const ordinati = [...semestri].sort((a, b) => a.inizio.localeCompare(b.inizio))

  return ordinati.map((semestre, indice) => {
    const inizio = indice === 0 ? semestre.inizio : sommaGiorni(ordinati[indice - 1].fine, 1)
    return {
      ...semestre,
      numero: (indice + 1) as Semestre['numero'],
      inizio,
      fine: semestre.fine >= inizio ? semestre.fine : inizio,
    }
  })
}

/** Da quando a quando va l'anno: gli estremi dei suoi semestri. */
export function intervalloAnno (semestri: Semestre[]): { inizio: Iso, fine: Iso } | null {
  if (semestri.length === 0) return null
  const allineati = allineaSemestri(semestri)
  return { inizio: allineati[0].inizio, fine: allineati[allineati.length - 1].fine }
}

/**
 * Da quando a quando va un anno: i semestri se ci sono, altrimenti gli estremi
 * dichiarati (a differenza di `intervalloAnno`, che senza semestri torna
 * `null`). `null` solo senza anno.
 */
export function estremiAnno (anno: AnnoScolastico | null): { inizio: Iso, fine: Iso } | null {
  if (!anno) return null
  return intervalloAnno(anno.semestri) ?? { inizio: anno.inizio, fine: anno.fine }
}

/**
 * L'anno rimesso in accordo con i suoi semestri: ci passa tutto, da disco, dal
 * pannello o nuovo. Un anno senza semestri non si tocca.
 */
export function annoAllineato (anno: AnnoScolastico): AnnoScolastico {
  const semestri = allineaSemestri(anno.semestri)
  const intervallo = intervalloAnno(semestri)
  if (!intervallo) return anno
  return { ...anno, semestri, inizio: intervallo.inizio, fine: intervallo.fine }
}

/**
 * L'ultimo giorno del primo semestre: il confine, l'unica data interna che si
 * sceglie (sposta fine del primo e inizio del secondo insieme).
 */
export function confineAnno (anno: AnnoScolastico): Iso | null {
  const allineati = allineaSemestri(anno.semestri)
  return allineati.length > 1 ? allineati[0].fine : null
}

/** Il nome di serie di un semestre: «1° semestre», «2° semestre». */
export function etichettaSemestreNuovo (numero: number): string {
  return testi().semestre(numero)
}

/**
 * I due semestri di un anno da `inizio` a `fine`, spezzati al confine. Un
 * confine fuori dall'intervallo ricade a metà periodo: sbagliato ma visibile.
 */
export function semestriFra (
  inizio: Iso,
  fine: Iso,
  confine: Iso,
  identificatore: () => string,
): Semestre[] {
  const etichette = [etichettaSemestreNuovo(1), etichettaSemestreNuovo(2)]
  const dentro = confine > inizio && confine < fine
  // Una data non ISO dà `NaN`, e `toISOString()` su `NaN` lancia `RangeError`:
  // se gli estremi non si leggono si taglia sull'inizio.
  const mezzo = (Date.parse(inizio) + Date.parse(fine)) / 2
  const meta = dentro
    ? confine
    : Number.isFinite(mezzo)
      ? new Date(mezzo).toISOString().slice(0, 10)
      : inizio

  return [
    { id: identificatore(), numero: 1, etichetta: etichette[0], inizio, fine: meta },
    {
      id: identificatore(),
      numero: 2,
      etichetta: etichette[1],
      inizio: sommaGiorni(meta, 1),
      fine,
    },
  ]
}

// ------------------------------------------------------- l'anno come cartella

/**
 * Il nome di cartella di un anno, senza pestare quelli presi: dall'etichetta
 * («2026/2027» → «2026-2027»), e poi non cambia più, nemmeno se l'anno si
 * rinomina (i collegamenti e la sincronizzazione contano su quel nome).
 */
export function cartellaDellAnno (anno: AnnoScolastico, prese: Set<string>): string {
  const radice = nomeSicuro(anno.etichetta || anno.inizio.slice(0, 4), 'anno')
  const scegli = (nome: string) => {
    prese.add(nome)
    return nome
  }
  if (!prese.has(radice)) return scegli(radice)
  for (let n = 2; n < 100; n += 1) {
    if (!prese.has(`${radice} (${n})`)) return scegli(`${radice} (${n})`)
  }
  return scegli(`${radice} ${Date.now()}`)
}

/** Quel che di un registro appartiene a un anno: una collezione per chiave. */
interface FetteAnno {
  classi: Registro['classi']
  corsi: Registro['corsi']
  lezioni: Registro['lezioni']
  piani: Registro['piani']
  valutazioni: Registro['valutazioni']
  fascicoli: Registro['fascicoli']
  consegne: Registro['consegne']
  check: Registro['check']
  smistamenti: Registro['smistamenti']
  coordinate: Registro['coordinate']
}

/**
 * Le coordinate degli indirizzi di un gruppo di classi. Ogni cartella d'anno
 * porta le sue, così si apre da sola; la stessa via in due anni va bene.
 */
function coordinateDelleClassi (
  registro: Registro,
  classi: Registro['classi'],
  ripiego: boolean,
): Registro['coordinate'] {
  const chiavi = new Set<string>()
  for (const classe of classi) {
    for (const allievo of classe.allievi) {
      for (const dove of [allievo.indirizzo, allievo.indirizzoDatore]) {
        const scritto = scriviIndirizzo(dove)
        if (scritto) chiavi.add(chiaveIndirizzo(scritto))
      }
    }
  }
  const usate = new Set<string>()
  for (const classe of registro.classi) {
    for (const allievo of classe.allievi) {
      for (const dove of [allievo.indirizzo, allievo.indirizzoDatore]) {
        const scritto = scriviIndirizzo(dove)
        if (scritto) usate.add(chiaveIndirizzo(scritto))
      }
    }
  }
  return registro.coordinate.filter(
    (voce) => chiavi.has(voce.chiave) || (ripiego && !usate.has(voce.chiave)),
  )
}

/**
 * Che cosa, di un registro tenuto tutto insieme, appartiene a un anno,
 * risalendo la catena classe → corso → ora e voto.
 *
 * `ripiego` è l'anno che raccoglie gli sciolti (corso senza classe, piano mai
 * assegnato, PDF in quarantena): uno e uno solo deve averlo, perché non vadano
 * in ogni anno né in nessuno.
 */
export function fetteDellAnno (registro: Registro, annoId: string, ripiego: boolean): FetteAnno {
  const tieni = <T>(voci: T[], dentro: (v: T) => boolean, sciolto: (v: T) => boolean) =>
    voci.filter((v) => dentro(v) || (ripiego && sciolto(v)))

  const anni = new Set(registro.anni.map((a) => a.id))
  const classi = tieni(
    registro.classi,
    (c) => c.annoId === annoId,
    (c) => !anni.has(c.annoId),
  )

  const idClassi = new Set(classi.map((c) => c.id))
  const tutteLeClassi = new Set(registro.classi.map((c) => c.id))
  const corsi = tieni(
    registro.corsi,
    (c) => idClassi.has(c.classeId),
    (c) => !tutteLeClassi.has(c.classeId),
  )

  const idCorsi = new Set(corsi.map((c) => c.id))
  const tuttiICorsi = new Set(registro.corsi.map((c) => c.id))
  const delCorso = <T extends { corsoId: string | null }>(voci: T[]) =>
    tieni(
      voci,
      (v) => !!v.corsoId && idCorsi.has(v.corsoId),
      (v) => !v.corsoId || !tuttiICorsi.has(v.corsoId),
    )

  const consegne = delCorso(registro.consegne)
  const idConsegne = new Set(consegne.map((c) => c.id))
  const tutteLeConsegne = new Set(registro.consegne.map((c) => c.id))

  return {
    classi,
    corsi,
    lezioni: delCorso(registro.lezioni),
    piani: delCorso(registro.piani),
    valutazioni: delCorso(registro.valutazioni),
    consegne,
    // Il check è del corso come le consegne: va dove va il suo corso.
    check: delCorso(registro.check),
    fascicoli: tieni(
      registro.fascicoli,
      (f) => idClassi.has(f.classeId),
      (f) => !tutteLeClassi.has(f.classeId),
    ),
    // Uno smistamento segue la sua consegna o classe; senza, va fra gli sciolti.
    smistamenti: registro.smistamenti.filter((s) => {
      if (s.consegnaId && tutteLeConsegne.has(s.consegnaId)) return idConsegne.has(s.consegnaId)
      if (s.classeId && tutteLeClassi.has(s.classeId)) return idClassi.has(s.classeId)
      return ripiego
    }),
    // Gli indirizzi seguono le classi dell'anno; quelli che non usa nessuno
    // vanno con gli sciolti.
    coordinate: coordinateDelleClassi(registro, classi, ripiego),
  }
}

// ---------------------------------------------------------------- settimane A e B

/**
 * Vero per un tipo di settimana scrivibile: il valore di una voce della lista,
 * quindi testo breve e non vuoto. Non si controlla che la voce ci sia ancora:
 * una voce tolta dalla lista non cancella le settimane che l'avevano (le si
 * vede segnate come «non più in lista»).
 */
function letteraValida (valore: unknown): valore is LetteraSettimana {
  return typeof valore === 'string' && valore.trim() !== '' && valore.length <= 40
}

/**
 * La lettera della settimana in cui cade un giorno, o null. Si chiede per
 * giorno: il lunedì lo ricava questa funzione, sempre allo stesso modo.
 */
export function letteraSettimana (
  anno: AnnoScolastico | null,
  giorno: Iso,
): LetteraSettimana | null {
  if (!anno?.settimane) return null
  return anno.settimane[inizioSettimana(giorno)] ?? null
}

/**
 * L'anno con la lettera di una settimana messa, cambiata o tolta, come copia
 * (per validarlo prima di scriverlo). `null` toglie la voce.
 */
export function conLetteraSettimana (
  anno: AnnoScolastico,
  giorno: Iso,
  lettera: LetteraSettimana | null,
): AnnoScolastico {
  const lunedi = inizioSettimana(giorno)
  const settimane = { ...(anno.settimane ?? {}) }
  if (lettera) settimane[lunedi] = lettera
  else delete settimane[lunedi]
  return { ...anno, settimane: ordinaSettimane(settimane) }
}

/**
 * Le settimane in ordine di data e ripulite: una chiave scritta a mano su un
 * giorno qualsiasi diventa il suo lunedì.
 */
export function ordinaSettimane (
  grezze: Record<string, unknown>,
): Record<Iso, LetteraSettimana> {
  const messe: Record<Iso, LetteraSettimana> = {}
  for (const chiave of Object.keys(grezze).sort()) {
    const lettera = grezze[chiave]
    if (!isoValida(chiave) || !letteraValida(lettera)) continue
    messe[inizioSettimana(chiave)] = lettera
  }
  return messe
}
