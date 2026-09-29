// L'anno scolastico aperto e quel che lo descrive. Aprirne un altro o crearne
// uno nuovo sta nel menu «File»: un file non è un'impostazione.
// L'anno aperto ha tre schede (anno, chiusure, settimane). I semestri non si
// modificano da qui ma nel modulo dell'anno, che li tratta insieme: due
// semestri sovrapposti o con un buco romperebbero le medie di fine periodo.

import { vociDiLista } from '../../../../core/dominio/lists.js'
import { conLetteraSettimana, letteraSettimana } from '../../../../core/dominio/years.js'
import { differenzaGiorni, formattaData, inizioSettimana, nomeSemestre, settimanaIso, sommaGiorni } from '../../../../core/dominio/dates.js'
import type { AnnoScolastico, Iso, Sospensione } from '../../../../core/dominio/models.js'
import { parole } from '../../../../core/dominio/words.testi.js'
import { sospensioneDi } from '../../../../core/dominio/timetable.js'
import {
  avviso,
  collegamento,
  conAttesa,
  pulsante,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import { notificaAnnullabile } from '../../components/annullabile.js'
import { COME_SI_PARTE, eseguiOAvvisa } from '../../components/filters.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h } from '../../dom.js'
import { moduloAnno, moduloPause } from '../../forms.js'
import { èCollegata } from '../../../../core/dominio/schoolCalendar.js'
import {
  collegaAlCalendario,
  pastigliaCalendario,
  pastigliaChiusuraUfficiale,
  riallineaAlCalendario,
  vociDaRiallineare,
  vociUfficialiDaImportare,
} from '../../forms/schoolCalendar.js'
import { testi as testiCalendario } from '../../forms/schoolCalendar.testi.js'
import { azione } from '../../bridge.js'
import { annoCorrente, stato } from '../../state.js'
import { testi } from './year.testi.js'

/** I lunedì dell'anno, dal primo all'ultimo: è la griglia delle settimane. */
function lunediDellAnno (anno: AnnoScolastico): Iso[] {
  const lunedi: Iso[] = []
  const ultimo = inizioSettimana(anno.fine)
  for (
    let giorno = inizioSettimana(anno.inizio);
    giorno <= ultimo;
    giorno = sommaGiorni(giorno, 7)
  ) {
    lunedi.push(giorno)
  }
  return lunedi
}

/**
 * L'anno com'è adesso nel registro, o `null` se non c'è più: i gesti mandano
 * l'anno intero, e quello del disegno può essere vecchio.
 */
function annoVivo (id: string): AnnoScolastico | null {
  const vivo = stato.registro.anni.find((a) => a.id === id) ?? null
  if (!vivo) notifica(testi().annoNonCePiu, 'avviso')
  return vivo
}

/** Salva l'anno intero, per i gesti che toccano più di una cosa insieme. */
async function salvaAnno (anno: AnnoScolastico, detto: string): Promise<void> {
  const risposta = await azione({ tipo: 'anno.salva', anno })
  if (!risposta.ok) return
  notifica(detto, 'successo')
}

// ------------------------------------------------------------- l'anno aperto

/**
 * L'anno in uso, con le sue date e i suoi semestri. I conti accanto ai semestri
 * valgono solo per l'anno caricato.
 */
export function schedaAnnoAperto (): HTMLElement {
  const corrente = annoCorrente()
  const t = testi()

  if (!corrente) {
    return scheda({
      titolo: t.annoScolastico,
      aiuto: t.annoScolasticoAiuto,
      contenuto: statoVuoto({
        simbolo: 'calendario',
        titolo: t.nessunAnnoAperto,
        testo: t.nessunAnnoTesto(COME_SI_PARTE),
        azione: pulsante({
          testo: t.creaAnno,
          variante: 'primario',
          simbolo: 'piu',
          al: () => moduloAnno(),
        }),
      }),
    })
  }

  const valutazioniDel = (inizio: Iso, fine: Iso) =>
    stato.registro.valutazioni.filter((v) => v.data >= inizio && v.data <= fine).length

  return scheda({
    titolo: t.anno(corrente.etichetta),
    sottotitolo: `${formattaData(corrente.inizio)} → ${formattaData(corrente.fine)}${
      corrente.cartella ? t.cartella(corrente.cartella) : ''
    }`,
    azioni: pulsante({
      testo: parole().modifica,
      simbolo: 'matita',
      variante: 'sottile',
      titolo: t.modificaAiuto,
      al: () => moduloAnno(corrente),
    }),
    contenuto: h(
      'div',
      { class: 'anno-aperto' },
      pastigliaCalendario(corrente),
      h(
        'div',
        { class: 'anno__semestri' },
        ...corrente.semestri.map((semestre) =>
          h(
            'div',
            { class: 'anno__semestre' },
            h('span', { class: 'anno__semestre-nome' }, nomeSemestre(semestre)),
            h(
              'span',
              { class: 'anno__semestre-periodo' },
              `${formattaData(semestre.inizio)} → ${formattaData(semestre.fine)}`,
            ),
            h(
              'span',
              { class: 'anno__semestre-conti' },
              t.valutazioni(valutazioniDel(semestre.inizio, semestre.fine)),
            ),
          ),
        ),
      ),
      corrente.semestri.length === 0
        ? avviso(t.senzaSemestri, 'attenzione')
        : null,
      avvisoCalendarioUfficiale(corrente),
    ),
  })
}

/**
 * Il calendario ufficiale ha date o chiusure diverse dall'anno: il registro lo
 * nota da sé ma non scrive niente; cosa importare si sceglie nel modulo dell'anno,
 * o si collega l'anno al calendario. Un anno che lo segue si riallinea in un gesto.
 */
function avvisoCalendarioUfficiale (anno: AnnoScolastico): HTMLElement | null {
  const tc = testiCalendario()
  if (anno.calendarioUfficiale) {
    const diverse = vociDaRiallineare(anno)
    if (diverse === 0) return null
    return avviso(
      h(
        'span',
        null,
        `${tc.daRiallineare(diverse)} `,
        collegamento({ testo: tc.riallinea, al: () => void riallineaAlCalendario(anno) }),
      ),
      'informativo',
    )
  }
  const quante = vociUfficialiDaImportare(anno)
  if (quante === 0) return null
  const t = testi()
  return avviso(
    h(
      'span',
      null,
      t.calendarioUfficiale(quante),
      collegamento({ testo: t.rivediImporta, al: () => moduloAnno(anno) }),
      ' · ',
      collegamento({ testo: tc.collega, al: () => void collegaAlCalendario(anno) }),
    ),
    'informativo',
  )
}

// ------------------------------------------------------------- le chiusure

/**
 * Toglie una chiusura senza chiedere: le lezioni già sul calendario restano
 * dove sono, e niente si perde. La notifica ha «Annulla», che la rimette.
 */
async function togliChiusura (annoId: string, sospensione: Sospensione): Promise<void> {
  const vivo = annoVivo(annoId)
  if (!vivo) return
  const risposta = await azione({
    tipo: 'anno.salva',
    anno: { ...vivo, sospensioni: vivo.sospensioni.filter((altra) => altra.id !== sospensione.id) },
  })
  if (!risposta.ok) return
  notificaAnnullabile(testi().tolta(sospensione.etichetta), async () => {
    const adesso = annoVivo(annoId)
    if (!adesso || adesso.sospensioni.some((altra) => altra.id === sospensione.id)) return
    await salvaAnno(
      {
        ...adesso,
        sospensioni: [...adesso.sospensioni, sospensione].sort((a, b) => a.dal.localeCompare(b.dal)),
      },
      testi().rimessa(sospensione.etichetta),
    )
  })
}

/**
 * I giorni senza lezione dell'anno aperto: la generazione dell'orario li
 * salta. È il posto solo delle chiusure: ogni riga si toglie col suo cestino
 * (con «Annulla» nella notifica); il modulo delle chiusure serve per metterle e
 * sistemarle insieme.
 */
export function schedaChiusure (): HTMLElement {
  const anno = annoCorrente()
  const t = testi()

  if (!anno) {
    return scheda({
      titolo: t.giorniSenzaLezione,
      aiuto: t.chiusureAiuto,
      contenuto: statoVuoto({
        simbolo: 'calendario',
        titolo: t.nessunAnnoAperto,
        testo: t.chiusureSenzaAnno,
      }),
    })
  }

  const giorniChiusi = anno.sospensioni.reduce(
    (conto, sospensione) => conto + differenzaGiorni(sospensione.dal, sospensione.al) + 1,
    0,
  )

  return scheda({
    titolo: t.giorniSenzaLezione,
    // Il conto in vista, la spiegazione dietro la «i».
    sottotitolo:
      anno.sospensioni.length === 0
        ? undefined
        : t.periodiGiorni(anno.sospensioni.length, giorniChiusi),
    aiuto: t.chiusureAiuto,
    azioni: pulsante({
      testo: parole().aggiungi,
      simbolo: 'piu',
      variante: 'primario',
      al: () => moduloPause(anno),
    }),
    contenuto:
      anno.sospensioni.length === 0
        ? statoVuoto({
            simbolo: 'calendario',
            titolo: t.nessunaChiusura,
            testo: t.nessunaChiusuraTesto,
            azione: pulsante({
              testo: t.aggiungiVacanze,
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloPause(anno),
            }),
          })
        : h(
            'ul',
            { class: 'sospensioni' },
            ...anno.sospensioni.map((sospensione) => {
              const giorni = differenzaGiorni(sospensione.dal, sospensione.al) + 1
              // Una chiusura del calendario che l'anno segue non si toglie da qui.
              const ufficiale = èCollegata(anno, sospensione)
              return h(
                'li',
                { class: 'sospensione' },
                h('strong', null, sospensione.etichetta),
                h(
                  'span',
                  { class: 'testo-quieto' },
                  sospensione.dal === sospensione.al
                    ? formattaData(sospensione.dal, 'lungo')
                    : `${formattaData(sospensione.dal)} → ${formattaData(sospensione.al)} · ` +
                      t.giorni(giorni),
                ),
                h(
                  'span',
                  { class: 'sospensione__azioni' },
                  ufficiale ? pastigliaChiusuraUfficiale() : null,
                  pulsante({
                    simbolo: 'matita',
                    variante: 'fantasma',
                    titolo: t.modificaChiusure,
                    al: () => moduloPause(anno),
                  }),
                  ufficiale ? null : pulsante({
                    simbolo: 'cestino',
                    variante: 'fantasma',
                    titolo: t.togliChiusura(sospensione.etichetta),
                    al: () => togliChiusura(anno.id, sospensione),
                  }),
                ),
              )
            }),
          ),
  })
}

// ---------------------------------------------------------- i tipi di settimana

/**
 * I tipi delle settimane dell'anno aperto, una casella per settimana: A e B, o
 * le voci della lista «Tipi di settimana», che le sta sotto. Si mettono
 * tutte insieme qui. «Alterna» riempie l'anno dalla prima settimana marcata
 * girando sulla lista e saltando le chiusure; «Pulisci» toglie tutto.
 */
export function schedaSettimane (): HTMLElement {
  const anno = annoCorrente()
  const t = testi()

  if (!anno) {
    return scheda({
      titolo: t.tipiSettimana,
      aiuto: t.tipiSenzaAnnoAiuto,
      contenuto: statoVuoto({
        simbolo: 'calendario',
        titolo: t.nessunAnnoAperto,
        testo: t.settimaneSenzaAnno,
      }),
    })
  }

  const lunedi = lunediDellAnno(anno)
  const messe = lunedi.filter((giorno) => letteraSettimana(anno, giorno)).length
  // I tipi nell'ordine della lista, che è anche l'ordine di «Alterna».
  const tipi = vociDiLista(stato.registro.impostazioni, 'tipoSettimana')

  /**
   * Riempie l'anno alternando dalla prima marcata in poi, saltando le chiusure.
   * Chiede prima: riscrive il tipo di ogni settimana da lì in avanti, anche
   * quelle segnate a mano.
   */
  const alterna = async () => {
    const primaVista = annoVivo(anno.id)
    if (!primaVista || tipi.length === 0) return
    const inizioGiro = lunediDellAnno(primaVista).find((giorno) => letteraSettimana(primaVista, giorno)) ??
      lunediDellAnno(primaVista)[0]
    if (!inizioGiro) return
    const sicuro = await conferma({
      titolo: t.alternareTitolo,
      testo: t.alternareTesto(
        formattaData(inizioGiro, 'lungo'),
        tipi.map((tipo) => tipo.testo).join(', '),
      ),
      testoConferma: t.alterna,
    })
    if (!sicuro) return
    const vivo = annoVivo(anno.id)
    if (!vivo) return
    const settimane = lunediDellAnno(vivo)
    const prima = settimane.find((giorno) => letteraSettimana(vivo, giorno))
    const partenza = prima ?? settimane[0]
    if (!partenza) return
    // Si riparte dal tipo della prima settimana marcata, se è nella lista;
    // altrimenti dal primo della lista.
    let indice = Math.max(0, tipi.findIndex((t) => t.valore === letteraSettimana(vivo, partenza)))
    let nuovo = vivo
    for (const giorno of settimane) {
      if (giorno < partenza) continue
      // Una settimana interamente chiusa non consuma il turno.
      const chiusa = [0, 1, 2, 3, 4].every(
        (scarto) => sospensioneDi(vivo, sommaGiorni(giorno, scarto)),
      )
      if (chiusa) {
        nuovo = conLetteraSettimana(nuovo, giorno, null)
        continue
      }
      nuovo = conLetteraSettimana(nuovo, giorno, tipi[indice].valore)
      indice = (indice + 1) % tipi.length
    }
    await salvaAnno(nuovo, t.alternanzaScritta(formattaData(partenza)))
  }

  const pulisci = async () => {
    const sicuro = await conferma({
      titolo: t.togliereTipi,
      testo: t.settimaneTornano(messe),
      testoConferma: t.togliTutto,
      pericolo: true,
    })
    if (!sicuro) return
    const vivo = annoVivo(anno.id)
    if (!vivo) return
    await salvaAnno({ ...vivo, settimane: {} }, t.tipiTolti)
  }

  return scheda({
    titolo: t.tipiSettimana,
    // «Nessuna marcata» resta in vista come il conto; a che cosa servono le
    // lettere sta dietro la «i».
    sottotitolo: messe === 0 ? t.nessunaMarcata : t.marcate(messe, lunedi.length),
    aiuto: t.tipiAiuto,
    azioni: [
      pulsante({
        testo: t.alterna,
        simbolo: 'ricarica',
        variante: 'sottile',
        titolo: t.alternaAiuto(tipi.map((tipo) => tipo.testo).join(', ')),
        al: (evento) => void conAttesa(evento.currentTarget as HTMLButtonElement, alterna()),
      }),
      ...(messe > 0
        ? [
            pulsante({
              testo: t.pulisci,
              simbolo: 'cestino',
              variante: 'fantasma',
              titolo: t.pulisciAiuto,
              al: () => void pulisci(),
            }),
          ]
        : []),
    ],
    contenuto: [
      h(
        'div',
        { class: 'settimane-ab' },
        ...lunedi.map((giorno) => {
          const lettera = letteraSettimana(anno, giorno)
          const sospesa = sospensioneDi(anno, giorno)
          return h(
            'div',
            {
              class: ['settimana-ab', sospesa && 'settimana-ab--sospesa'],
              attr: {
                title: [
                  t.settimanaDal(settimanaIso(giorno), formattaData(giorno)),
                  sospesa ? sospesa.etichetta : null,
                ]
                  .filter(Boolean)
                  .join(' · '),
              },
            },
            h('span', { class: 'settimana-ab__numero' }, String(settimanaIso(giorno))),
            h(
              'div',
              { class: 'settimana-ab__lettere' },
              // Un pulsante per tipo della lista, più quello della settimana se il suo tipo
              // è stato tolto dalla lista: si vede, segnato, e cliccandolo lo si toglie.
              ...[
                ...tipi,
                ...(lettera && !tipi.some((t) => t.valore === lettera)
                  ? [{ valore: lettera, testo: lettera, fuoriLista: true }]
                  : []),
              ].map((quale) =>
                h(
                  'button',
                  {
                    class: [
                      'settimana-ab__lettera',
                      lettera === quale.valore && 'settimana-ab__lettera--scelta',
                      'fuoriLista' in quale && 'settimana-ab__lettera--fuori-lista',
                    ],
                    type: 'button',
                    attr: {
                      // Ricliccando quello già messo si toglie: «nessun tipo» non ha un pulsante suo.
                      title:
                        'fuoriLista' in quale
                          ? t.fuoriLista(quale.valore)
                          : lettera === quale.valore
                            ? t.togliSettimana(quale.testo)
                            : t.segnaSettimana(quale.testo),
                      'aria-pressed': lettera === quale.valore ? 'true' : 'false',
                    },
                    onclick: (evento: MouseEvent) => {
                      const bottone = evento.currentTarget as HTMLButtonElement
                      // La riga di stato viva, sotto la griglia: il ridisegno la tiene.
                      const riga = bottone.closest('.scheda')?.querySelector('.settimane-ab__esito')
                      const nuova = lettera === quale.valore ? null : quale.valore
                      void conAttesa(
                        bottone,
                        eseguiOAvvisa({ tipo: 'anno.settimana', annoId: anno.id, giorno, lettera: nuova }),
                      ).then((risposta) => {
                        if (!risposta.ok || !riga) return
                        riga.textContent = nuova === null
                          ? t.settimanaSenzaTipo(settimanaIso(giorno))
                          : t.settimanaSegnata(settimanaIso(giorno), quale.testo)
                      })
                    },
                  },
                  quale.testo,
                ),
              ),
            ),
          )
        }),
      ),
      // Che cosa ha fatto l'ultimo clic, detto piano: il pulsante acceso da solo si vede poco.
      h('p', {
        class: 'settimane-ab__esito',
        attr: { role: 'status' },
        // testo-fisso: la chiave con cui il ridisegno ritrova la riga
        dataset: { tieni: 'settimane-esito' },
      }),
    ],
  })
}

