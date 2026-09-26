// Quel che sta dentro il documento d'anno: scala dei voti, materie, file. La
// giornata sta in `settings/schoolDay.ts`, che usa da qui il salvataggio e i
// lettori dei campi.
// Queste impostazioni viaggiano con il `.regi`. Si salvano appena si tocca un
// campo; quel che l'host corregge in silenzio si dice nella notifica.

import type { Impostazioni } from '../../../domain/models.js'
import type { ImpostazioniDaSalvare } from '../../../protocol.js'
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
import { testi } from './document.testi.js'

/** Le differenze fra quel che si è mandato e quel che l'host ha salvato (normalizza in silenzio). */
function scostamenti (mandate: ImpostazioniDaSalvare, arrivate: Impostazioni): string[] {
  const esito: string[] = []
  const t = testi()
  const nomi = t.scostamenti
  const confronta = (etichetta: string, a: unknown, b: unknown) => {
    if (a !== b) esito.push(t.portataA(etichetta, String(b)))
  }
  confronta(nomi.minutiUd, mandate.minutiUd, arrivate.minutiUd)
  confronta(nomi.oraInizioGiornata, mandate.oraInizioGiornata, arrivate.oraInizioGiornata)
  confronta(nomi.oraFineGiornata, mandate.oraFineGiornata, arrivate.oraFineGiornata)
  confronta(
    nomi.durataPausaPredefinita,
    mandate.durataPausaPredefinita,
    arrivate.durataPausaPredefinita,
  )
  confronta(
    nomi.durataSlotPredefinita,
    mandate.durataSlotPredefinita,
    arrivate.durataSlotPredefinita,
  )
  confronta(nomi.passoFineSemestre, mandate.passoFineSemestre, arrivate.passoFineSemestre)
  confronta(nomi.sogliaAssenza, mandate.sogliaAssenza, arrivate.sogliaAssenza)
  // Anche la scala: `validaImpostazioni` raddrizza una scala impossibile (con
  // `max` a zero fa `massimo = min + 1`), e va detto.
  confronta(nomi.scalaMin, mandate.scala.min, arrivate.scala.min)
  confronta(nomi.scalaMax, mandate.scala.max, arrivate.scala.max)
  confronta(nomi.sufficienza, mandate.scala.sufficienza, arrivate.scala.sufficienza)
  confronta(nomi.passoVoti, mandate.scala.passo, arrivate.scala.passo)
  // L'altezza del logo è per carta: si confronta per id; una carta aggiunta o
  // tolta dall'host non ha niente da dire.
  for (const mandata of mandate.intestazione?.carte ?? []) {
    const arrivata = arrivate.intestazione.carte.find((carta) => carta.id === mandata.id)
    if (arrivata) confronta(nomi.altezzaLogo, mandata.altezzaLogo, arrivata.altezzaLogo)
  }
  return esito
}

/**
 * Il numero battuto in un campo, o `null` se non ce n'è uno: `Number('')` fa
 * zero, e un campo svuotato salverebbe zero.
 */
export function numeroBattuto (valore: string, etichetta: string): number | null {
  const pulito = valore.trim().replace(',', '.')
  const numero = Number(pulito)
  if (pulito === '' || !Number.isFinite(numero)) {
    notifica(testi().serveUnNumero(etichetta), 'errore')
    return null
  }
  return numero
}

/** Come sopra, per i campi orario: vuoto vuol dire «non toccare». */
export function oraBattuta (valore: string, etichetta: string): string | null {
  if (valore.trim() === '') {
    notifica(testi().serveUnOrario(etichetta), 'errore')
    return null
  }
  return valore
}

/** L'intestazione come la si manda a salvare: senza logo, che ha le sue azioni. */
type IntestazioneDaSalvare = NonNullable<ImpostazioniDaSalvare['intestazione']>

/** Una modifica puntuale: l'intestazione si può mandare anche a pezzi. */
type ModificheImpostazioni =
  Partial<Omit<Impostazioni, 'intestazione'>> & { intestazione?: Partial<IntestazioneDaSalvare> }

/**
 * L'intestazione di adesso, pronta da rimandare. Le carte partono senza logo
 * (lo gestiscono `intestazione.logo` e `intestazione.togliLogo`, per id) e
 * senza il segno della vecchia cartella (lo scrive solo il registro). Le carte
 * si mandano sempre tutte: l'host sostituisce la matrice intera, non la fonde.
 */
function intestazioneDaSalvare (
  modifiche: Partial<IntestazioneDaSalvare> = {},
): IntestazioneDaSalvare {
  const attuale = stato.registro.impostazioni.intestazione
  const carte = modifiche.carte ?? attuale.carte
  const docente = modifiche.docente ?? attuale.docente
  const firma = modifiche.firma ?? attuale.firma
  return {
    carte: carte.map(({ id, sede, altezzaLogo, corsi }) => ({
      id, sede, altezzaLogo, corsi: [...corsi],
    })),
    docente,
    // Una firma vuota vuol dire «quella di serie»: si manda senza, e l'host usa la sua.
    ...(firma && firma.trim() !== '' ? { firma } : {}),
  }
}

/** Salva una modifica puntuale delle impostazioni, senza toccare il resto. */
export async function salvaImpostazioni (modifiche: ModificheImpostazioni): Promise<void> {
  const { intestazione: _intestazione, ...resto } = stato.registro.impostazioni
  const impostazioni: ImpostazioniDaSalvare = {
    ...resto,
    ...modifiche,
    scala: { ...stato.registro.impostazioni.scala, ...(modifiche.scala ?? {}) },
    intestazione: intestazioneDaSalvare(modifiche.intestazione),
  }
  const risposta = await azione({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return
  // Lo stato nuovo è già arrivato: il pannello lo spinge prima di rispondere
  // (`panels/panel.ts`), quindi `stato.registro` è quello appena salvato.
  const scarti = scostamenti(impostazioni, stato.registro.impostazioni)
  notifica(
    scarti.length === 0 ? testi().salvate : testi().salvateCorrette(scarti.join(', ')),
    scarti.length === 0 ? 'successo' : 'avviso',
  )
}

/**
 * Un campo con il suo formato scritto sotto, in vista («0.25 = mezzi e
 * quarti»): serve mentre si batte, non dietro la «i». La casella lo nomina
 * come sua descrizione.
 */
let contaFormati = 0
function conFormato (involucro: HTMLElement, formato: string): HTMLElement {
  // testo-fisso: un id del DOM, non si legge
  const id = `impostazioni-formato-${++contaFormati}`
  involucro.append(h('small', { id, class: 'campo__aiuto' }, formato))
  involucro.querySelector('input')?.setAttribute('aria-describedby', id)
  return involucro
}

// ------------------------------------------------------------ la valutazione

export function schedaValutazione (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  const scala = impostazioni.scala
  // La scala al momento di salvare, non quella del disegno: due campi cambiati
  // di fila partono prima del ridisegno.
  const scalaViva = (): Impostazioni['scala'] => stato.registro.impostazioni.scala
  const t = testi()

  return scheda({
    titolo: t.scala,
    aiuto: t.scalaAiuto,
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campo({
          nome: 'scalaMin',
          etichetta: t.votoMinimo,
          tipo: 'number',
          valore: scala.min,
          // Gli estremi di una scala non hanno una grana; il passo dei voti è un altro campo.
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const min = numeroBattuto(valore, t.votoMinimo)
            if (min !== null) void salvaImpostazioni({ scala: { ...scalaViva(), min } })
          },
        }),
        campo({
          nome: 'scalaMax',
          etichetta: t.votoMassimo,
          tipo: 'number',
          valore: scala.max,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const max = numeroBattuto(valore, t.votoMassimo)
            if (max !== null) void salvaImpostazioni({ scala: { ...scalaViva(), max } })
          },
        }),
        campo({
          nome: 'scalaSufficienza',
          etichetta: t.sufficienza,
          tipo: 'number',
          valore: scala.sufficienza,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const sufficienza = numeroBattuto(valore, t.sufficienza)
            if (sufficienza === null) return
            void salvaImpostazioni({ scala: { ...scalaViva(), sufficienza } })
          },
        }),
        conFormato(campo({
          nome: 'scalaPasso',
          etichetta: t.passoVoti,
          tipo: 'number',
          valore: scala.passo,
          min: 0.01,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const passo = numeroBattuto(valore, t.passoVoti)
            if (passo !== null) void salvaImpostazioni({ scala: { ...scalaViva(), passo } })
          },
        }), t.passoVotiFormato),
        // Un passo suo, diverso da quello dei voti: la nota di pagella si arrotonda
        // (p. es. a mezzi) anche se i voti sono a quarti.
        conFormato(campo({
          nome: 'passoFineSemestre',
          etichetta: t.passoFineSemestre,
          tipo: 'number',
          valore: impostazioni.passoFineSemestre,
          min: 0,
          max: 10,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const passo = numeroBattuto(valore, t.passoFineSemestre)
            if (passo !== null) void salvaImpostazioni({ passoFineSemestre: passo })
          },
        }), t.passoFineSemestreFormato),
        // La soglia oltre cui un'assenza diventa un caso da segnalare: la decide la scuola.
        conFormato(campo({
          nome: 'sogliaAssenza',
          etichetta: t.sogliaAssenza,
          tipo: 'number',
          valore: impostazioni.sogliaAssenza,
          min: 0,
          max: 100,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => {
            const soglia = numeroBattuto(valore, t.sogliaAssenza)
            if (soglia !== null) void salvaImpostazioni({ sogliaAssenza: soglia })
          },
        }), t.sogliaAssenzaFormato),
      ),
    ),
  })
}

// ---------------------------------------------------------------- le materie

/**
 * Le materie e i corsi che ne derivano. Ogni riga dice che cosa le sta appeso;
 * si rinomina, si unisce a un'altra, si elimina sapendo che cosa se ne va.
 */
export function schedaMaterie (): HTMLElement {
  const registro = stato.registro
  const t = testi()

  return scheda({
    titolo: t.materie,
    aiuto: t.materieAiuto,
    azioni: pulsante({
      testo: t.nuovaMateria,
      simbolo: 'piu',
      variante: 'primario',
      al: () => moduloMateria(),
    }),
    contenuto:
      registro.materie.length === 0
        ? statoVuoto({
            simbolo: 'libro',
            titolo: t.nessunaMateria,
            testo: t.nessunaMateriaTesto,
            azione: pulsante({
              testo: t.nuovaMateria,
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
                  t.contiMateria(classi, corsi.length, piani),
                ),
                h(
                  'span',
                  { class: 'materia__azioni' },
                  pulsante({
                    simbolo: 'matita',
                    variante: 'fantasma',
                    titolo: t.modificaMateria,
                    al: () => moduloMateria(materia),
                  }),
                  // Due voci nate dalla stessa cosa tornano una, senza perdere i corsi.
                  registro.materie.length > 1
                    ? pulsante({
                        simbolo: 'duplica',
                        variante: 'fantasma',
                        titolo: t.unisciMateria,
                        al: () => moduloUnisciMaterie(materia),
                      })
                    : null,
                  pulsante({
                    simbolo: 'cestino',
                    variante: 'fantasma',
                    titolo: t.eliminaMateria,
                    al: async () => {
                      if (!(await chiediEliminazione({ genere: 'materia', id: materia.id }))) return
                      const risposta = await azione({ tipo: 'materia.elimina', materiaId: materia.id })
                      if (!risposta.ok) return
                      notifica(t.materiaEliminata(materia.nome), 'info')
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

/** Il documento aperto e quel che c'è dentro, con il percorso per esteso: dice quale copia è. */
export function schedaFile (): HTMLElement {
  const registro = stato.registro
  const corrente = stato.documenti.corrente
  const t = testi()

  return scheda({
    titolo: t.documento,
    // Com'è fatto il documento dietro la «i»; restano in vista gli avvisi (file
    // provvisorio, niente documento, riferimenti che non tornano).
    aiuto: h('span', null, t.documentoAiuto, t.documentoDentro),
    azioni: [
      pulsante({
        testo: t.apriAltro,
        simbolo: 'cartella',
        variante: 'sottile',
        titolo: t.apriAltroAiuto,
        al: () => azione({ tipo: 'documento.apri' }),
      }),
      pulsante({
        testo: t.mostraNellaCartella,
        simbolo: 'cartella',
        variante: 'sottile',
        al: () => azione({ tipo: 'sistema.apriCartella' }),
      }),
      pulsante({
        testo: t.ricarica,
        simbolo: 'ricarica',
        variante: 'sottile',
        titolo: t.ricaricaAiuto,
        al: async () => {
          const risposta = await azione({ tipo: 'stato.ricarica' })
          if (!risposta.ok) return
          notifica(t.ricaricati, 'info')
        },
      }),
    ],
    contenuto: h(
      'div',
      null,
      corrente && stato.documenti.provvisorio
        ? h(
            'div',
            null,
            avviso(t.provvisorio(nomeDelFile(corrente)), 'attenzione'),
            pulsante({
              testo: t.salvaConNome,
              simbolo: 'spunta',
              variante: 'primario',
              al: () => azione({ tipo: 'stato.salva' }),
            }),
          )
        : corrente
          ? h(
              'div',
              { class: 'documento-aperto' },
              h('strong', null, nomeDelFile(corrente)),
              h('code', { class: 'documento-aperto__percorso' }, corrente),
            )
          : avviso(t.nessunDocumento, 'attenzione'),
      sintesiIncassata(
        { etichetta: t.sintesi.anni, valore: String(registro.anni.length) },
        { etichetta: t.sintesi.classi, valore: String(registro.classi.length) },
        { etichetta: t.sintesi.lezioni, valore: String(registro.lezioni.length) },
        { etichetta: t.sintesi.piani, valore: String(registro.piani.length) },
        { etichetta: t.sintesi.valutazioni, valore: String(registro.valutazioni.length) },
      ),
      stato.avvisi.length > 0
        ? avviso(
            h(
              'div',
              null,
              h('strong', null, t.riferimenti),
              h('ul', null, ...stato.avvisi.slice(0, 8).map((testo) => h('li', null, testo))),
              stato.avvisi.length > 8 ? h('p', null, t.eAltri(stato.avvisi.length - 8)) : null,
            ),
            'attenzione',
          )
        : avviso(t.tuttiTornano, 'informativo'),
    ),
  })
}
