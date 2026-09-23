// Quel che sta dentro il documento d'anno: il calendario, la scala dei voti, le
// materie, e i file.
//
// Sono impostazioni che **viaggiano con il `.registro`**: chi apre lo stesso
// documento su un'altra macchina trova la stessa griglia oraria e la stessa
// scala, e un anno chiuso resta leggibile con le regole con cui è stato
// scritto. È la differenza che la pagina tiene sotto due schede separate — vedi
// `views/settings.ts` — perché è l'unica cosa che qui si può sbagliare
// senza accorgersene.
//
// Si salvano appena si tocca un campo, senza un pulsante «salva»: sono valori
// singoli e indipendenti, e un modulo da confermare vorrebbe dire lasciare in
// sospeso una spunta già premuta. Quel che l'host corregge in silenzio — un'ora
// vuota che torna al predefinito, una pausa che sale a cinque minuti — viene
// detto nella notifica, invece di annunciare «salvate» mentre il campo mostra
// già un altro numero.

import {
  MINUTI_UD,
  minutiDaUd,
  udDaMinuti,
} from '../../../domain/dates.js'
import { LEZIONE, PIF, Uno, un } from '../../../domain/lexicon.js'
import type { Impostazioni } from '../../../domain/models.js'
import {
  avviso,
  campo,
  pastiglia,
  pulsante,
  puntoColore,
  riga,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import { sintesiIncassata } from '../../components/filters.js'
import { notifica } from '../../components/notifications.js'
import { h } from '../../dom.js'
import { chiediEliminazione, moduloMateria, moduloUnisciMaterie } from '../../forms.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'

const GIORNI = [
  { numero: 1, nome: 'lunedì' },
  { numero: 2, nome: 'martedì' },
  { numero: 3, nome: 'mercoledì' },
  { numero: 4, nome: 'giovedì' },
  { numero: 5, nome: 'venerdì' },
  { numero: 6, nome: 'sabato' },
  { numero: 7, nome: 'domenica' },
]

/**
 * Quel che si è mandato non è sempre quel che resta: l'host normalizza in
 * silenzio. Si dice, invece di annunciare «salvate» e basta.
 */
function scostamenti (mandate: Impostazioni, arrivate: Impostazioni): string[] {
  const esito: string[] = []
  const confronta = (etichetta: string, a: unknown, b: unknown) => {
    if (a !== b) esito.push(`${etichetta} portata a ${String(b)}`)
  }
  confronta('prima ora della giornata', mandate.oraInizioGiornata, arrivate.oraInizioGiornata)
  confronta('ultima ora della giornata', mandate.oraFineGiornata, arrivate.oraFineGiornata)
  confronta('durata della pausa', mandate.durataPausaPredefinita, arrivate.durataPausaPredefinita)
  confronta('durata della fascia', mandate.durataSlotPredefinita, arrivate.durataSlotPredefinita)
  confronta(
    'passo della nota di fine semestre',
    mandate.passoFineSemestre,
    arrivate.passoFineSemestre,
  )
  confronta('soglia di assenza', mandate.sogliaAssenza, arrivate.sogliaAssenza)
  // La scala mancava, ed era il buco piu' costoso: `validaImpostazioni`
  // raddrizza in silenzio una scala impossibile — con `max` a zero fa
  // `massimo = min + 1` e ci riporta dentro la sufficienza — e questa
  // funzione, che esiste apposta per dire «l'host ha corretto quel che hai
  // mandato», non se ne accorgeva. Il docente leggeva «Impostazioni salvate.»
  // in verde con la scala diventata 1-2.
  confronta('voto minimo', mandate.scala.min, arrivate.scala.min)
  confronta('voto massimo', mandate.scala.max, arrivate.scala.max)
  confronta('sufficienza', mandate.scala.sufficienza, arrivate.scala.sufficienza)
  confronta('passo dei voti', mandate.scala.passo, arrivate.scala.passo)
  return esito
}

/**
 * Il numero battuto in un campo, o `null` se non ce n'e' uno.
 *
 * `Number('')` fa zero, e un `<input type="number">` rende la stringa vuota
 * anche quando dentro c'e' testo che non e' un numero. Passarlo dritto a
 * `salvaImpostazioni` voleva dire che cancellare «Voto massimo» per riscriverlo
 * — e cliccare altrove prima di ribattere — salvava **zero**: l'host
 * raddrizzava a una scala 1-2, la notifica diceva «salvate» in verde, e i
 * momenti di valutazione nuovi nascevano su quella scala.
 */
function numeroBattuto (valore: string, etichetta: string): number | null {
  const pulito = valore.trim().replace(',', '.')
  const numero = Number(pulito)
  if (pulito === '' || !Number.isFinite(numero)) {
    notifica(`«${etichetta}» non è cambiata: serve un numero.`, 'errore')
    return null
  }
  return numero
}

/** Come sopra, per i campi orario: vuoto vuol dire «non toccare». */
function oraBattuta (valore: string, etichetta: string): string | null {
  if (valore.trim() === '') {
    notifica(`«${etichetta}» non è cambiata: serve un orario.`, 'errore')
    return null
  }
  return valore
}

/** Salva una modifica puntuale delle impostazioni, senza toccare il resto. */
export async function salvaImpostazioni (modifiche: Partial<Impostazioni>): Promise<void> {
  const impostazioni: Impostazioni = {
    ...stato.registro.impostazioni,
    ...modifiche,
    scala: { ...stato.registro.impostazioni.scala, ...(modifiche.scala ?? {}) },
  }
  const risposta = await azione({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return
  // Lo stato nuovo è già arrivato: il pannello lo spinge *prima* di rispondere
  // — vedi `panels/panel.ts`, che lo fa apposta perché il webview
  // ridisegni sul registro aggiornato — quindi qui `stato.registro` è quello
  // che l'host ha appena salvato.
  //
  // Prima si aspettava il primo `aggiorna` successivo: quello di questo
  // salvataggio era già passato, e l'avviso scattava al cambiamento *dopo*,
  // raccontandolo come una correzione dell'host a una cosa che l'host non
  // aveva corretto.
  const scarti = scostamenti(impostazioni, stato.registro.impostazioni)
  notifica(
    scarti.length === 0 ? 'Impostazioni salvate.' : `Impostazioni salvate, corrette: ${scarti.join(', ')}.`,
    scarti.length === 0 ? 'successo' : 'avviso',
  )
}

// ------------------------------------------------------------- il calendario

export function schedaCalendario (): HTMLElement {
  const impostazioni = stato.registro.impostazioni

  return scheda({
    titolo: 'Griglia della settimana',
    sottotitolo: 'come si presenta la settimana e che cosa viene proposto per una lezione nuova',
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campo({
          nome: 'oraInizioGiornata',
          etichetta: 'Prima ora mostrata',
          tipo: 'time',
          valore: impostazioni.oraInizioGiornata,
          larghezza: 'quarto',
          al: (valore) => {
            const ora = oraBattuta(valore, 'Prima ora mostrata')
            if (ora !== null) void salvaImpostazioni({ oraInizioGiornata: ora })
          },
        }),
        campo({
          nome: 'oraFineGiornata',
          etichetta: 'Ultima ora mostrata',
          tipo: 'time',
          valore: impostazioni.oraFineGiornata,
          larghezza: 'quarto',
          al: (valore) => {
            const ora = oraBattuta(valore, 'Ultima ora mostrata')
            if (ora !== null) void salvaImpostazioni({ oraFineGiornata: ora })
          },
        }),
        campo({
          nome: 'durataSlotPredefinita',
          etichetta: `${Uno(LEZIONE.fascia)} di lezione`,
          tipo: 'number',
          valore: udDaMinuti(impostazioni.durataSlotPredefinita),
          min: 1,
          max: 8,
          passo: 1,
          aiuto: `unità didattiche da ${MINUTI_UD} min`,
          larghezza: 'quarto',
          al: (valore) => {
            const ud = numeroBattuto(valore, `${Uno(LEZIONE.fascia)} di lezione`)
            if (ud !== null) void salvaImpostazioni({ durataSlotPredefinita: minutiDaUd(ud) })
          },
        }),
        campo({
          nome: 'durataPausaPredefinita',
          etichetta: 'Durata di una pausa',
          tipo: 'number',
          valore: impostazioni.durataPausaPredefinita,
          min: 1,
          max: 120,
          // Senza passo: una pausa dura i minuti che dura, e un passo da cinque
          // rifiutava i dodici minuti fra due blocchi invece di suggerirli.
          passo: 'any',
          aiuto: 'minuti',
          larghezza: 'quarto',
          al: (valore) => {
            const minuti = numeroBattuto(valore, 'Durata di una pausa')
            if (minuti !== null) void salvaImpostazioni({ durataPausaPredefinita: minuti })
          },
        }),
      ),
      h(
        'div',
        { class: 'campo' },
        h('span', { class: 'campo__etichetta' }, 'Giorni mostrati'),
        h(
          'div',
          { class: 'scelta-giorni' },
          ...GIORNI.map((giorno) =>
            h(
              'button',
              {
                class: [
                  'scelta-giorni__voce',
                  impostazioni.giorniVisibili.includes(giorno.numero) && 'scelta-giorni__voce--attiva',
                ],
                type: 'button',
                attr: { 'aria-pressed': impostazioni.giorniVisibili.includes(giorno.numero) },
                onclick: () => {
                  const attuali = new Set(impostazioni.giorniVisibili)
                  if (attuali.has(giorno.numero)) attuali.delete(giorno.numero)
                  else attuali.add(giorno.numero)
                  if (attuali.size === 0) {
                    notifica('Almeno un giorno deve restare visibile.', 'avviso')
                    return
                  }
                  void salvaImpostazioni({ giorniVisibili: [...attuali].sort((a, b) => a - b) })
                },
              },
              giorno.nome.slice(0, 3),
            ),
          ),
        ),
        h(
          'small',
          { class: 'campo__aiuto' },
          'Vale per il calendario, per la proiezione e per l’agenda sul desktop.',
        ),
      ),
    ),
  })
}

// ------------------------------------------------------------ la valutazione

export function schedaValutazione (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  const scala = impostazioni.scala

  return scheda({
    titolo: 'Scala dei voti',
    sottotitolo:
      'valori proposti per un nuovo momento di valutazione; ogni momento può poi avere la sua',
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campo({
          nome: 'scalaMin',
          etichetta: 'Voto minimo',
          tipo: 'number',
          valore: scala.min,
          // Gli estremi di una scala non hanno una grana: 1-6 e 0-100 sono
          // scale, e lo è anche una che parte da 2,3. Il passo con cui si
          // arrotondano i voti si dichiara qui accanto, ed è un'altra cosa.
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const min = numeroBattuto(valore, 'Voto minimo')
            if (min !== null) void salvaImpostazioni({ scala: { ...scala, min } })
          },
        }),
        campo({
          nome: 'scalaMax',
          etichetta: 'Voto massimo',
          tipo: 'number',
          valore: scala.max,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const max = numeroBattuto(valore, 'Voto massimo')
            if (max !== null) void salvaImpostazioni({ scala: { ...scala, max } })
          },
        }),
        campo({
          nome: 'scalaSufficienza',
          etichetta: 'Sufficienza',
          tipo: 'number',
          valore: scala.sufficienza,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const sufficienza = numeroBattuto(valore, 'Sufficienza')
            if (sufficienza !== null) void salvaImpostazioni({ scala: { ...scala, sufficienza } })
          },
        }),
        campo({
          nome: 'scalaPasso',
          etichetta: 'Passo dei voti',
          tipo: 'number',
          valore: scala.passo,
          min: 0.01,
          passo: 'any',
          aiuto: '0.25 = mezzi e quarti',
          larghezza: 'quarto',
          al: (valore) => {
            const passo = numeroBattuto(valore, 'Passo dei voti')
            if (passo !== null) void salvaImpostazioni({ scala: { ...scala, passo } })
          },
        }),
        // Un passo suo, diverso da quello dei voti: durante l'anno si mettono
        // quarti di punto, ma la nota che va sulla pagella si dà a mezzi — e la
        // media pesata di sei prove non ci cade quasi mai sopra. Prima
        // l'arrotondamento lo faceva a mente chi compilava, che è il posto
        // peggiore dove tenere una regola.
        campo({
          nome: 'passoFineSemestre',
          etichetta: 'Passo della nota di fine semestre',
          tipo: 'number',
          valore: impostazioni.passoFineSemestre,
          min: 0,
          max: 10,
          passo: 'any',
          aiuto: '0.5 = mezzi punti; 0 = non arrotondare',
          larghezza: 'quarto',
          al: (valore) => {
            const passo = numeroBattuto(valore, 'Passo della nota di fine semestre')
            if (passo !== null) void salvaImpostazioni({ passoFineSemestre: passo })
          },
        }),
        // La soglia oltre cui un'assenza diventa un caso da segnalare. Sta qui e
        // non dentro il codice perché la decide la scuola, e cambia fra un corso
        // di tirocinio e una formazione a tempo pieno.
        campo({
          nome: 'sogliaAssenza',
          etichetta: 'Segnala l’assenza oltre il',
          tipo: 'number',
          valore: impostazioni.sogliaAssenza,
          min: 0,
          max: 100,
          passo: 'any',
          aiuto: 'in percento; 0 = nessuna segnalazione',
          larghezza: 'quarto',
          al: (valore) => {
            const soglia = numeroBattuto(valore, 'Segnala l’assenza oltre il')
            if (soglia !== null) void salvaImpostazioni({ sogliaAssenza: soglia })
          },
        }),
      ),
    ),
  })
}

// ---------------------------------------------------------------- le materie

/**
 * Le materie e i corsi che ne derivano.
 *
 * Ogni riga dice che cosa le sta appeso — quante classi, quanti corsi, quanti
 * piani — e i tre gesti sono lì per quello: si rinomina, si unisce a un'altra
 * quando nascono due voci dalla stessa cosa, e si elimina soltanto sapendo che
 * cosa se ne va insieme.
 */
export function schedaMaterie (): HTMLElement {
  const registro = stato.registro

  return scheda({
    titolo: 'Materie',
    sottotitolo: 'classe + anno + materia fanno il programma a cui appartengono i piani lezione',
    azioni: pulsante({
      testo: 'Nuova materia',
      simbolo: 'piu',
      variante: 'primario',
      al: () => moduloMateria(),
    }),
    contenuto:
      registro.materie.length === 0
        ? statoVuoto({
            simbolo: 'libro',
            titolo: 'Nessuna materia',
            testo:
              'Finché non ce n’è una, le classi non hanno corsi e le lezioni non sanno di che ' +
              'cosa parlano.',
            azione: pulsante({
              testo: 'Nuova materia',
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloMateria(),
            }),
          })
        : h(
            'ul',
            { class: 'elenco-materie' },
            ...registro.materie.map((materia) => {
              const corsi = registro.corsi.filter((c) => c.materiaId === materia.id)
              const classi = new Set(corsi.map((c) => c.classeId)).size
              const suoi = new Set(corsi.map((c) => c.id))
              const piani = registro.piani.filter((p) => p.corsoId && suoi.has(p.corsoId)).length

              return h(
                'li',
                { class: 'materia' },
                materia.colore ? puntoColore(materia.colore) : null,
                h('strong', null, materia.nome),
                materia.sigla ? pastiglia(materia.sigla, 'quiete') : null,
                h(
                  'span',
                  { class: 'testo-quieto' },
                  `${classi} class${classi === 1 ? 'e' : 'i'} · ${corsi.length} cors${
                    corsi.length === 1 ? 'o' : 'i'
                  } · ${piani} pian${piani === 1 ? 'o' : 'i'}`,
                ),
                h(
                  'span',
                  { class: 'materia__azioni' },
                  pulsante({
                    simbolo: 'matita',
                    variante: 'fantasma',
                    titolo: 'Modifica la materia',
                    al: () => moduloMateria(materia),
                  }),
                  // Due voci nate dalla stessa cosa tornano una: è il rimedio a
                  // un refuso, e l'alternativa a cancellare portandosi via i corsi.
                  registro.materie.length > 1
                    ? pulsante({
                        simbolo: 'duplica',
                        variante: 'fantasma',
                        titolo: 'Unisci questa materia a un’altra',
                        al: () => moduloUnisciMaterie(materia),
                      })
                    : null,
                  pulsante({
                    simbolo: 'cestino',
                    variante: 'fantasma',
                    titolo: 'Elimina la materia',
                    al: async () => {
                      if (!(await chiediEliminazione({ genere: 'materia', id: materia.id }))) return
                      const risposta = await azione({ tipo: 'materia.elimina', materiaId: materia.id })
                      if (!risposta.ok) {
                        notifica(risposta.errori?.[0] ?? 'Non eliminata.', 'errore')
                        return
                      }
                      notifica(`Materia «${materia.nome}» eliminata.`, 'info')
                    },
                  }),
                ),
              )
            }),
          ),
  })
}

// -------------------------------------------------------------------- i file

/** Il nome del file, staccato dal percorso: è quel che si riconosce. */
function nomeDelFile (percorso: string): string {
  return percorso.split(/[\\/]/).pop() ?? percorso
}

/**
 * Il documento aperto e quel che c'è dentro.
 *
 * Il percorso per esteso non è un dettaglio da nascondere: è la risposta alla
 * domanda «ma sto lavorando su quale copia?», che nasce ogni volta che un
 * documento è anche su OneDrive e anche su una chiavetta.
 */
export function schedaFile (): HTMLElement {
  const registro = stato.registro
  const corrente = stato.documenti.corrente

  return scheda({
    titolo: 'Documento e dati',
    sottotitolo: 'l’anno aperto è un file solo: dentro ci stanno i dati e i documenti',
    azioni: [
      pulsante({
        testo: 'Apri un altro registro…',
        simbolo: 'cartella',
        variante: 'sottile',
        titolo: 'Sceglie un documento d’anno con il dialogo del sistema',
        al: () => azione({ tipo: 'documento.apri' }),
      }),
      pulsante({
        testo: 'Mostra nella cartella',
        simbolo: 'cartella',
        variante: 'sottile',
        al: () => azione({ tipo: 'sistema.apriCartella' }),
      }),
      pulsante({
        testo: 'Ricarica',
        simbolo: 'ricarica',
        variante: 'sottile',
        titolo: 'Rilegge il documento dal disco: serve se lo ha cambiato qualcun altro',
        al: async () => {
          const risposta = await azione({ tipo: 'stato.ricarica' })
          if (!risposta.ok) return
          notifica('Dati ricaricati dal disco.', 'info')
        },
      }),
    ],
    contenuto: h(
      'div',
      null,
      corrente
        ? h(
            'div',
            { class: 'documento-aperto' },
            h('strong', null, nomeDelFile(corrente)),
            h('code', { class: 'documento-aperto__percorso' }, corrente),
          )
        : avviso(
            'Nessun documento aperto: il registro sta lavorando su niente, e quel che si scrive ' +
              'non ha dove andare.',
            'attenzione',
          ),
      sintesiIncassata(
        { etichetta: 'anni', valore: String(registro.anni.length) },
        { etichetta: 'classi', valore: String(registro.classi.length) },
        { etichetta: 'lezioni', valore: String(registro.lezioni.length) },
        { etichetta: 'piani', valore: String(registro.piani.length) },
        { etichetta: 'valutazioni', valore: String(registro.valutazioni.length) },
      ),
      stato.avvisi.length > 0
        ? avviso(
            h(
              'div',
              null,
              h('strong', null, 'Riferimenti che non tornano'),
              h('ul', null, ...stato.avvisi.slice(0, 8).map((testo) => h('li', null, testo))),
              stato.avvisi.length > 8 ? h('p', null, `…e altri ${stato.avvisi.length - 8}.`) : null,
            ),
            'attenzione',
          )
        : avviso(
            'Tutti i riferimenti fra classi, lezioni, piani e valutazioni tornano.',
            'informativo',
          ),
      h(
        'p',
        { class: 'testo-quieto' },
        `Dentro il documento stanno anche i file: le schede di ${un(PIF)}, i rapporti stampati, ` +
          'le scansioni archiviate. Spostare il file vuol dire spostare l’anno intero.',
      ),
    ),
  })
}
