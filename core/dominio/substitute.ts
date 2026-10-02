// La supplenza vista dall'altra parte: io manco, un collega tiene le mie ore.
// Qui si decide che cosa va nel pacchetto per chi mi sostituisce e con che
// nomi, senza toccare il disco: lo zip lo compone `core/azioni/substitute.ts`.
// L'ora tenuta da me al posto di un altro è `Lezione.supplenza`, un'altra cosa.

import { confrontaLezioni, fineLezione, inizioLezione } from './calculations.js'
import { classeDellaLezione, materiaDellaLezione } from './courses.js'
import { formattaData, formattaUd } from './dates.js'
import type { Attivita, Classe, Lezione, PianoLezione, Registro, Risorsa } from './models.js'
import { testi as paroleDeiRapporti } from './reportData/reportData.testi.js'
import { nomeDelFile, nomeSicuro } from './text.js'
import { parole } from './words.testi.js'
import { testi } from './substitute.testi.js'

/** A chi va il pacchetto: la persona che sostituisce, o il segretariato che la troverà. */
export interface DestinatarioSupplenza {
  /** Il nome di chi sostituisce; vuoto se non lo si sa ancora. */
  supplente: string
  /** Vero se il pacchetto va al segretariato, che lo girerà. */
  segretariato: boolean
}

/** Le ore scelte che esistono ancora, nell'ordine in cui si terranno. Le annullate no. */
export function lezioniDellaSupplenza (registro: Registro, ids: readonly string[]): Lezione[] {
  const scelte = new Set(ids)
  return registro.lezioni
    .filter((l) => scelte.has(l.id) && l.stato !== 'annullata')
    .sort(confrontaLezioni)
}

/** Le classi delle ore, una volta sola ciascuna: ognuna ha il suo foglio con le foto. */
export function classiDellaSupplenza (registro: Registro, lezioni: readonly Lezione[]): Classe[] {
  const viste = new Map<string, Classe>()
  for (const lezione of lezioni) {
    const classe = classeDellaLezione(registro, lezione)
    if (classe && !viste.has(classe.id)) viste.set(classe.id, classe)
  }
  return [...viste.values()]
}

/**
 * Il nome dello zip, accanto al documento: il giorno, o il primo e l'ultimo.
 * In ISO, così nella cartella le supplenze si ordinano da sé; la stessa
 * giornata rifatta sostituisce lo zip di prima.
 */
export function nomeDelloZip (lezioni: readonly Lezione[]): string {
  const t = testi()
  const primo = lezioni[0]?.data ?? ''
  const ultimo = lezioni[lezioni.length - 1]?.data ?? primo
  const quando = primo === ultimo ? primo : `${primo} – ${ultimo}`
  return `${nomeSicuro(`${t.supplenza} ${quando}`)}.zip`
}

/** L'ora come la si legge: «08:15–09:00», o niente se non ha orario. */
function orario (lezione: Lezione): string {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  return inizio && fine ? `${inizio}–${fine}` : ''
}

/** La cartella di un'ora dentro lo zip: «2026-10-05 08.15 3A Matematica». */
export function cartellaDellOra (registro: Registro, lezione: Lezione): string {
  const ora = (inizioLezione(lezione) ?? '').replace(':', '.')
  const classe = classeDellaLezione(registro, lezione)?.nome ?? ''
  const materia = materiaDellaLezione(registro, lezione)?.nome ?? ''
  return nomeSicuro([lezione.data, ora, classe, materia].filter(Boolean).join(' '))
}

/** Il foglio con le foto di una classe, alla radice dello zip. */
export function nomeFoglioAllievi (classe: Classe): string {
  return `${nomeSicuro(testi().allieviDi(classe.nome))}.pdf`
}

/** Il piano in PDF dentro la cartella dell'ora. */
export function nomeFoglioPiano (): string {
  return `${nomeSicuro(testi().pianoDellaLezione)}.pdf`
}

/** Una risorsa del piano, con la tappa a cui appartiene (null: del piano intero). */
export interface RisorsaDellOra {
  risorsa: Risorsa
  attivita: Attivita | null
  /** Il nome con cui sta nella cartella `risorse/` dell'ora; solo per i file. */
  nome: string | null
}

/**
 * Tutte le risorse di un piano, quelle del piano prima e poi tappa per tappa.
 * I file prendono un nome unico nella cartella: due «scheda.pdf» di due tappe
 * diverse non si devono sovrascrivere.
 */
export function risorseDellOra (piano: PianoLezione | null): RisorsaDellOra[] {
  if (!piano) return []
  const tutte: Array<{ risorsa: Risorsa, attivita: Attivita | null }> = [
    ...piano.risorse.map((risorsa) => ({ risorsa, attivita: null })),
    ...piano.attivita.flatMap((attivita) =>
      attivita.risorse.map((risorsa) => ({ risorsa, attivita }))),
  ]
  const presi = new Set<string>()
  return tutte.map(({ risorsa, attivita }) => {
    if (risorsa.tipo === 'collegamento' || !risorsa.file) return { risorsa, attivita, nome: null }
    return { risorsa, attivita, nome: nomeLibero(nomeDellaRisorsa(risorsa), presi) }
  })
}

/** Il nome di un file: com'era quando lo si è scelto, o quello archiviato. */
function nomeDellaRisorsa (risorsa: Risorsa): string {
  return nomeSicuro(risorsa.nome?.trim() || nomeDelFile(risorsa.file ?? '') || risorsa.titolo)
}

/** `nome`, o `nome (2)` se è già preso: senza distinguere maiuscole, come Windows. */
function nomeLibero (nome: string, presi: Set<string>): string {
  const punto = nome.lastIndexOf('.')
  const base = punto > 0 ? nome.slice(0, punto) : nome
  const estensione = punto > 0 ? nome.slice(punto) : ''
  let scelto = nome
  for (let n = 2; presi.has(scelto.toLowerCase()); n++) scelto = `${base} (${n})${estensione}`
  presi.add(scelto.toLowerCase())
  return scelto
}

/**
 * Una risorsa in una riga del foglio da leggere: il file nella cartella, o
 * l'indirizzo. Un file rimasto fuori (`assenti`, per id) si nomina senza percorso.
 */
function rigaRisorsa (
  voce: RisorsaDellOra,
  cartella: string,
  assenti: ReadonlySet<string>,
): string {
  const t = testi()
  const { risorsa } = voce
  const dove = risorsa.tipo === 'collegamento'
    ? risorsa.url ?? ''
    : voce.nome && !assenti.has(risorsa.id) ? `${cartella}/${t.cartellaRisorse}/${voce.nome}` : ''
  const nota = risorsa.note ? ` — ${risorsa.note}` : ''
  return `${risorsa.titolo}${dove ? `: ${dove}` : ''}${nota}`
}

/** Il racconto di un'ora per chi la tiene: quando, dove, che cosa, con che cosa. */
function raccontoDellOra (
  registro: Registro,
  lezione: Lezione,
  assenti: ReadonlySet<string>,
): string[] {
  const t = testi()
  const rapporti = paroleDeiRapporti()
  const classe = classeDellaLezione(registro, lezione)
  const materia = materiaDellaLezione(registro, lezione)
  const piano = registro.piani.find((p) => p.id === lezione.pianoId) ?? null
  const cartella = cartellaDellOra(registro, lezione)
  const risorse = risorseDellOra(piano)
  const righe: string[] = []

  const quando = [formattaData(lezione.data, 'lungo'), orario(lezione)].filter(Boolean).join(', ')
  righe.push(`## ${quando} — ${[classe?.nome, materia?.nome].filter(Boolean).join(', ')}`)
  righe.push('')
  if (lezione.aula) righe.push(`${parole().aula}: ${lezione.aula}`)
  if (classe) righe.push(`${t.elenco}: ${nomeFoglioAllievi(classe)}`)
  righe.push('')

  if (!piano) {
    righe.push(t.senzaPiano)
    if (lezione.argomenti) righe.push('', lezione.argomenti)
    righe.push('')
    return righe
  }

  righe.push(`${t.piano}: ${cartella}/${nomeFoglioPiano()}`)
  if (piano.obiettivi.length > 0) {
    righe.push('', `${t.obiettivi}:`)
    for (const obiettivo of piano.obiettivi) righe.push(`- ${obiettivo}`)
  }
  if (piano.prerequisiti) righe.push('', `${t.prerequisiti}: ${piano.prerequisiti}`)

  if (piano.attivita.length > 0) {
    righe.push('', `${t.scaletta}:`)
    piano.attivita.forEach((attivita, i) => {
      const come = [
        formattaUd(attivita.durataUd),
        rapporti.tipoAttivita(attivita.tipo),
        attivita.raggruppamento ? rapporti.raggruppamento(attivita.raggruppamento) : '',
      ].filter(Boolean).join(', ')
      righe.push(`${i + 1}. ${attivita.titolo} (${come})`)
      if (attivita.descrizione) {
        for (const riga of attivita.descrizione.split('\n')) righe.push(`   ${riga}`)
      }
      if (attivita.materiali) righe.push(`   ${t.materiali}: ${attivita.materiali}`)
      for (const voce of risorse.filter((r) => r.attivita?.id === attivita.id)) {
        righe.push(`   - ${rigaRisorsa(voce, cartella, assenti)}`)
      }
    })
  }

  const delPiano = risorse.filter((r) => r.attivita === null)
  if (delPiano.length > 0) {
    righe.push('', `${t.risorse}:`)
    for (const voce of delPiano) righe.push(`- ${rigaRisorsa(voce, cartella, assenti)}`)
  }
  righe.push('')
  return righe
}

/**
 * Il foglio da leggere per primo, alla radice dello zip. `assenti`: gli id
 * delle risorse il cui file non si è trovato, e che nello zip non ci sono.
 */
export function leggimi (
  registro: Registro,
  lezioni: readonly Lezione[],
  docente: string,
  destinatario: DestinatarioSupplenza,
  assenti: ReadonlySet<string> = new Set(),
): string {
  const t = testi()
  const righe = [`# ${t.titolo(docente)}`, '']
  const chi = destinatario.supplente.trim()
  if (chi) righe.push(t.per(chi), '')
  righe.push(t.introduzione(lezioni.length), '')
  for (const lezione of lezioni) righe.push(...raccontoDellOra(registro, lezione, assenti))
  return righe.join('\r\n')
}

/** Il nome del foglio da leggere. */
export function nomeLeggimi (): string {
  return `${nomeSicuro(testi().leggimi)}.txt`
}

/** Oggetto e testo della mail che accompagna lo zip. */
export function messaggioSupplenza (
  registro: Registro,
  lezioni: readonly Lezione[],
  docente: string,
  destinatario: DestinatarioSupplenza,
): { oggetto: string, corpo: string } {
  const t = testi()
  const classi = classiDellaSupplenza(registro, lezioni).map((c) => c.nome)
  const giorni = [...new Set(lezioni.map((l) => formattaData(l.data, 'breve')))]
  const ore = lezioni.map((lezione) => {
    const classe = classeDellaLezione(registro, lezione)?.nome ?? ''
    const materia = materiaDellaLezione(registro, lezione)?.nome ?? ''
    return `- ${[formattaData(lezione.data, 'breve'), orario(lezione), classe, materia, lezione.aula ?? '']
      .filter(Boolean).join(', ')}`
  })
  const chi = destinatario.supplente.trim()
  const saluto = destinatario.segretariato ? t.salutoSegretariato : chi ? t.salutoA(chi) : t.saluto
  const corpo = [
    saluto,
    '',
    destinatario.segretariato ? t.corpoSegretariato(chi) : t.corpoSupplente,
    '',
    ...ore,
    '',
    t.nelloZip,
    '',
    t.grazie,
    docente,
  ].join('\n')
  return { oggetto: t.oggetto(giorni.join(', '), classi.join(', ')), corpo }
}
