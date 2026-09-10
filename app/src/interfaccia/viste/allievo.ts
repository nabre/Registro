// La scheda personale: tutto quel che il registro sa di una persona sola.
//
// È la vista che mancava. I dati c'erano già tutti — presenze nelle lezioni,
// voti nei momenti, osservazioni sparse, documenti nel fascicolo — ma stavano
// in quattro posti diversi, e il momento in cui servono è uno solo: il
// colloquio. «Come va Damiano?» non si risponde aprendo quattro schede.
//
// Non si modifica niente da qui, salvo l'anagrafica: è una vista da leggere ad
// alta voce con un genitore davanti, e ogni comando in più è un comando che si
// preme per sbaglio.

import {
  formattaVoto,
  mediaAllievo,
  notaFineSemestre,
  nomeCompleto,
  ordinaAllievi,
  segnato,
  statisticheAllievo,
  statoDellOra,
} from '../../dominio/calcoli.js'
import { consegneDocumento, haFatto } from '../../dominio/consegne.js'
import { PERSONE, PIF, Uno, un } from '../../dominio/lessico.js'
import { formattaData } from '../../dominio/date.js'
import type { Allievo, Classe, Corso, Lezione } from '../../dominio/modelli.js'
import {
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { sintesiIncassata } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { h, type Figlio } from '../dom.js'
import { moduloAllievo } from '../moduli.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  classePerId,
  corsiDi,
  lezioniDi,
  nomeMateria,
  nomeSemestreScelto,
  stato,
  uriDato,
  valutazioniDi,
} from '../stato.js'

/** Come si chiama uno stato di presenza quando lo si legge in un elenco. */
const PRESENZE: Record<string, { nome: string; tono: 'negativo' | 'attenzione' | 'quiete' }> = {
  assente: { nome: 'assente', tono: 'negativo' },
  ritardo: { nome: 'in ritardo', tono: 'attenzione' },
  esonerato: { nome: 'esonerato', tono: 'quiete' },
}

/**
 * Il quadro presenze: i numeri in cima, poi le sole giornate storte.
 *
 * Le presenze regolari non si elencano — sono la norma, e un elenco di
 * duecento righe uguali nasconde le tre che contano.
 */
function pannelloPresenze (allievo: Allievo, lezioni: Lezione[]): HTMLElement {
  const conti = statisticheAllievo(lezioni, allievo.id)
  // Le ore che contano sono quelle con l'appello fatto, non quelle dichiarate
  // svolte: lo stato è la cosa che si dimentica di aggiornare, e una giornata
  // storta non deve sparire da questa pagina perché a fine ora nessuno ha
  // premuto «svolta». Le annullate restano fuori: ore non sono.
  const irregolari = lezioni
    .filter((l) => l.stato !== 'annullata')
    .map((lezione) => ({
      lezione,
      presenza: lezione.presenze.find((p) => p.allievoId === allievo.id),
    }))
    .filter((v) => v.presenza && v.presenza.stati.some(segnato))
    .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))

  return scheda({
    titolo: 'Presenze',
    sottotitolo: `sulle ore con l’appello fatto del ${nomeSemestreScelto()}`,
    contenuto: h(
      'div',
      null,
      sintesiIncassata(
        { etichetta: 'lezioni', valore: String(conti.lezioni) },
        // In UD, non in ore: è l'unità in cui le assenze si sommano.
        { etichetta: 'UD', valore: String(conti.ud) },
        { etichetta: 'presenze', valore: String(conti.presenze), tono: 'positivo' },
        {
          etichetta: 'assenze',
          valore: String(conti.udAssenza),
          tono: conti.quotaAssenze > 0.15 ? 'negativo' : 'neutro',
        },
        { etichetta: 'ritardi', valore: String(conti.ritardi), tono: conti.ritardi > 0 ? 'attenzione' : 'neutro' },
        { etichetta: 'assenze %', valore: `${Math.round(conti.quotaAssenze * 100)}%` },
      ),
      irregolari.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Sempre presente: niente da segnalare.')
        : h(
            'ul',
            { class: 'diario' },
            ...irregolari.map(({ lezione, presenza }) => {
              // Nel diario l'ora si riassume in uno stato solo: qui non c'è
              // spazio per quattro colonne, e quel che si cerca è la giornata
              // storta — le UD si guardano aprendola.
              const sintesi = statoDellOra(presenza!.stati)
              const persi = presenza!.stati.filter(segnato).length
              const voce = PRESENZE[sintesi] ?? { nome: sintesi, tono: 'quiete' as const }
              return h(
                'li',
                { class: 'diario__voce' },
                h(
                  'button',
                  {
                    class: 'collegamento diario__quando',
                    type: 'button',
                    onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                  },
                  formattaData(lezione.data, 'giorno'),
                ),
                pastiglia(voce.nome, voce.tono),
                h(
                  'span',
                  { class: 'testo-quieto' },
                  `${persi} UD su ${presenza!.stati.length}`,
                ),
                presenza!.minuti ? h('span', { class: 'testo-quieto' }, `${presenza!.minuti} min`) : null,
                presenza!.nota ? h('span', { class: 'diario__nota' }, presenza!.nota) : null,
              )
            }),
          ),
    ),
  })
}

/**
 * I voti, un corso per volta. La media si calcola dentro il corso e non fra
 * corsi diversi: una media che mescola matematica e italiano non vuol dire
 * niente, e sarebbe l'unico numero sbagliato in tutta la pagina.
 */
function pannelloVoti (allievo: Allievo, classe: Classe, corsi: Corso[]): HTMLElement {
  const tutti = valutazioniDi(classe.id)

  return scheda({
    titolo: 'Valutazioni',
    sottotitolo: `la media è pesata, si ferma dentro il corso ed è del ${nomeSemestreScelto()}`,
    contenuto:
      corsi.length === 0
        ? h('p', { class: 'testo-quieto' }, 'La classe non ha corsi: nessun voto da mostrare.')
        : h(
            'div',
            null,
            ...corsi.map((corso) => {
              const momenti = tutti
                .filter((v) => v.corsoId === corso.id)
                .sort((a, b) => a.data.localeCompare(b.data))
              const { media, conteggio } = mediaAllievo(momenti, allievo.id)
              const nota = notaFineSemestre(
                media,
                stato.registro.impostazioni.scala,
                stato.registro.impostazioni.passoFineSemestre,
              )

              return h(
                'section',
                { class: 'materia-voti' },
                h(
                  'header',
                  { class: 'materia-voti__testata' },
                  h('strong', null, nomeMateria(corso.materiaId) || corso.titolo),
                  nota === null
                    ? pastiglia('nessun voto', 'quiete')
                    : pastiglia(
                        // La nota, e fra parentesi la media da cui esce: la
                        // prima è quel che si scrive, la seconda è il conto da
                        // cui viene, e chi guarda vuole vedere tutte e due.
                        `nota ${formattaVoto(nota)} (media ${formattaVoto(media)})`,
                        nota >= stato.registro.impostazioni.scala.sufficienza ? 'positivo' : 'negativo',
                      ),
                  h(
                    'span',
                    { class: 'testo-quieto' },
                    `${conteggio} vot${conteggio === 1 ? 'o' : 'i'} su ${momenti.length}`,
                  ),
                ),
                momenti.length === 0
                  ? null
                  : h(
                      'ul',
                      { class: 'diario' },
                      ...momenti.map((momento) => {
                        const voto = momento.voti.find((v) => v.allievoId === allievo.id)
                        return h(
                          'li',
                          { class: 'diario__voce' },
                          h(
                            'button',
                            {
                              class: 'collegamento diario__quando',
                              type: 'button',
                              onclick: () =>
                                aggiorna({
                                  vista: 'valutazioni',
                                  valutazioneId: momento.id,
                                  filtroClasseId: classe.id,
                                }),
                            },
                            formattaData(momento.data),
                          ),
                          h('span', { class: 'diario__cosa' }, momento.titolo),
                          momento.peso !== 1
                            ? h('span', { class: 'testo-quieto' }, `peso ${momento.peso}`)
                            : null,
                          !voto || (voto.valore === null && !voto.assente)
                            ? pastiglia('—', 'quiete')
                            : voto.assente
                              ? pastiglia('assente', 'attenzione')
                              : pastiglia(
                                  formattaVoto(voto.valore),
                                  voto.valore! >= momento.scala.sufficienza ? 'positivo' : 'negativo',
                                ),
                          voto?.nota ? h('span', { class: 'diario__nota' }, voto.nota) : null,
                        )
                      }),
                    ),
              )
            }),
          ),
  })
}

/** Le osservazioni che la riguardano, dalla più recente. */
function pannelloOsservazioni (allievo: Allievo, lezioni: Lezione[]): Figlio {
  const voci = lezioni
    .flatMap((lezione) =>
      lezione.osservazioni
        .filter((o) => o.allievoId === allievo.id)
        .map((osservazione) => ({ lezione, osservazione })),
    )
    .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))

  if (voci.length === 0) return null

  return scheda({
    titolo: 'Osservazioni',
    sottotitolo: 'quel che è stato annotato durante l’anno',
    contenuto: h(
      'ul',
      { class: 'diario' },
      ...voci.map(({ lezione, osservazione }) =>
        h(
          'li',
          { class: 'diario__voce' },
          h(
            'button',
            {
              class: 'collegamento diario__quando',
              type: 'button',
              onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
            },
            formattaData(lezione.data, 'giorno'),
          ),
          pastiglia(osservazione.tipo, osservazione.tipo === 'merito' ? 'positivo' : 'quiete'),
          h('span', { class: 'diario__cosa' }, osservazione.testo),
        ),
      ),
    ),
  })
}

/**
 * I documenti che gli sono stati chiesti: li vede solo il docente di classe.
 *
 * Sono le consegne che si spuntano portando un foglio, lette dalla parte sua —
 * la matrice della classe risponde a «chi non ha portato cosa», questa scheda
 * a «cosa manca a lui», che è la domanda che ci si fa aprendo la sua pagina.
 */
function pannelloDocumenti (allievo: Allievo, classe: Classe): Figlio {
  if (!classe.docenteDiClasse) return null
  const suoi = consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => c.a === 'classe' || c.allieviIds.includes(allievo.id),
  )
  if (suoi.length === 0) return null

  return scheda({
    titolo: 'Documenti',
    sottotitolo: 'quelli chiesti a lui',
    contenuto: h(
      'ul',
      { class: 'diario' },
      ...suoi.map((consegna) => {
        // Dalla matrice si spunta anche senza un file: leggere il documento
        // della spunta lasciava «atteso» chi in realtà l'aveva già portato.
        const portato = haFatto(consegna, allievo.id)
        return h(
          'li',
          { class: 'diario__voce' },
          icona('documento'),
          h('span', { class: 'diario__cosa' }, consegna.testo),
          pastiglia(consegna.documento ?? 'documento', 'quiete'),
          portato ? pastiglia('consegnato', 'positivo') : pastiglia('atteso', 'attenzione'),
        )
      }),
    ),
  })
}

/**
 * Chi è e come lo si raggiunge: la faccia da una parte, i recapiti dall'altra.
 *
 * Una scheda sola e non due — il ritratto sopra, i recapiti sotto — perché è
 * quel che si guarda insieme: questa vista si apre con la persona davanti o
 * con qualcuno che chiede di lei, e la faccia accanto al nome del tutore è la
 * cosa che serve al telefono.
 *
 * È anche l'unico punto del registro da cui una foto entra: la scheda in PDF e
 * la parete della classe pescano da qui, e chi non trova la faccia stampata
 * deve sapere dove metterla. Senza foto resta il riquadro vuoto con il
 * pulsante accanto: un posto segnato si riempie, una scheda che non nomina le
 * foto lascia credere che non esistano.
 */
function pannelloAnagrafica (classe: Classe, allievo: Allievo): HTMLElement {
  const indirizzo = uriDato(allievo.foto)
  const comando = (tipo: 'allievo.foto.imposta' | 'allievo.foto.togli') => () =>
    void azione({ tipo, classeId: classe.id, allievoId: allievo.id })

  // Solo i recapiti che ci sono: una riga «Azienda: —» non dice niente più che
  // non scriverla, e sei righe vuote fanno sembrare vuota l'anagrafica di chi
  // ha soltanto la mail.
  const recapiti: Array<[string, string | undefined]> = [
    // La nascita in cima: non è un recapito, è chi è la persona, e in fondo
    // all'elenco delle caselle si leggeva come l'ultimo dei modi di scrivergli.
    ['Data di nascita', allievo.dataNascita ? formattaData(allievo.dataNascita) : undefined],
    ['Indirizzo', allievo.indirizzo],
    ['E-mail', allievo.email],
    [Uno(PERSONE.rappresentante), allievo.emailTutore],
    ['Telefono', allievo.telefono],
    [Uno(PERSONE.azienda), allievo.azienda],
    ['Indirizzo dell’azienda', allievo.indirizzoDatore],
    [Uno(PERSONE.datore), allievo.emailDatore],
    ['Telefono del datore', allievo.telefonoDatore],
  ]
  const scritti = recapiti.filter(([, valore]) => Boolean(valore))

  return scheda({
    titolo: 'Anagrafica',
    contenuto: h(
      'div',
      { class: 'ritratto' },
      h(
        'div',
        { class: 'ritratto__colonna' },
        indirizzo
          ? h('img', {
              class: 'ritratto__foto',
              attr: { src: indirizzo, alt: nomeCompleto(allievo), loading: 'lazy' },
            })
          : h('div', { class: 'ritratto__vuoto' }, icona('utente', 'ritratto__simbolo')),
        h(
          'div',
          { class: 'ritratto__comandi' },
          pulsante({
            testo: allievo.foto ? 'Cambia foto' : 'Aggiungi foto',
            simbolo: 'immagine',
            variante: 'sottile',
            al: comando('allievo.foto.imposta'),
          }),
          allievo.foto
            ? pulsante({
                testo: 'Togli',
                simbolo: 'cestino',
                variante: 'sottile',
                al: comando('allievo.foto.togli'),
              })
            : null,
        ),
      ),
      scritti.length > 0
        ? h(
            'div',
            { class: 'anagrafica' },
            scritti.map(([etichetta, valore]) =>
              h('p', null, h('strong', null, `${etichetta}: `), valore ?? ''),
            ),
          )
        : h('p', { class: 'testo-quieto' }, 'Nessun recapito: si aggiungono da «Modifica».'),
    ),
  })
}

export function vistaAllievo (): Figlio {
  // La classe di solito la si sa già — ci si arriva dal suo elenco — ma
  // dall'albero arriva soltanto la persona: in quel caso la si cerca.
  const dichiarata = classePerId(stato.classeId)
  const classe =
    dichiarata?.allievi.some((a) => a.id === stato.allievoId) === true
      ? dichiarata
      : stato.registro.classi.find((c) => c.allievi.some((a) => a.id === stato.allievoId)) ?? null
  const allievo = classe?.allievi.find((a) => a.id === stato.allievoId) ?? null

  if (!classe || !allievo) {
    return h(
      'div',
      { class: 'vista vista--allievo' },
      statoVuoto({
        simbolo: 'utente',
        titolo: `Nessuna ${PIF.singolare} scelta`,
        testo: `La scheda si apre dal nome di ${un(PIF)}, nell’elenco della sua classe.`,
        azione: pulsante({
          testo: 'Vai alle classi',
          variante: 'primario',
          al: () => aggiorna({ vista: 'classi' }),
        }),
      }),
    )
  }

  // Gli allievi nell'ordine dell'elenco di classe, da cui si è arrivati qui:
  // scorrendo con le frecce si passa al nome che si aveva sotto, non a uno
  // pescato da un ordine diverso. Ci sono anche i ritirati, come nell'elenco:
  // la scheda di chi se n'è andato si guarda ancora, e saltarlo qui vorrebbe
  // dire un allievo raggiungibile solo tornando indietro.
  const elenco = ordinaAllievi(classe.allievi)
  const dove = elenco.findIndex((a) => a.id === allievo.id)
  const vaiA = (quale: Allievo | undefined) =>
    quale ? () => aggiorna({ vista: 'allievo', classeId: classe.id, allievoId: quale.id }) : undefined
  const precedente = elenco[dove - 1]
  const successivo = elenco[dove + 1]

  const lezioni = lezioniDi(classe.id)
  const corsi = corsiDi(classe.id)

  return h(
    'div',
    { class: 'vista vista--allievo' },
    testataVista({
      titolo: nomeCompleto(allievo),
      sottotitolo:
        `${classe.nome}${allievo.attivo ? '' : ' · ritirato'} · ${nomeSemestreScelto()}` +
        // A che punto della classe si è: senza, scorrendo venticinque schede
        // non si sa se ne restano due o dodici, e si torna all'elenco per
        // contarle.
        (elenco.length > 1 ? ` · ${dove + 1} di ${elenco.length}` : ''),
      azioni: [
        // Le frecce prima di tutto: da qui si scorre la classe uno per uno —
        // è quel che si fa preparando i colloqui — e tornare all'elenco per
        // aprire il nome successivo erano due gesti per ogni allievo.
        pulsante({
          simbolo: 'su',
          variante: 'sottile',
          titolo: precedente ? `Scheda di ${nomeCompleto(precedente)}` : 'È il primo della classe',
          disabilitato: !precedente,
          al: vaiA(precedente),
        }),
        pulsante({
          simbolo: 'giu',
          variante: 'sottile',
          titolo: successivo ? `Scheda di ${nomeCompleto(successivo)}` : 'È l’ultimo della classe',
          disabilitato: !successivo,
          al: vaiA(successivo),
        }),
        pulsante({
          testo: 'Torna alla classe',
          simbolo: 'sinistra',
          variante: 'sottile',
          al: () => aggiorna({ vista: 'classi', allievoId: null }),
        }),
        // La sua scheda in PDF si chiede da Documenti, con quelle di tutti
        // gli altri: stampare per una classe intera qui vorrebbe dire venti
        // pagine aperte una per una.
        pulsante({
          testo: 'Modifica',
          simbolo: 'matita',
          al: () => moduloAllievo(classe, allievo),
        }),
      ],
    }),
    h(
      'div',
      { class: 'colonne colonne--allievo' },
      h(
        'div',
        { class: 'colonna' },
        pannelloAnagrafica(classe, allievo),
        pannelloPresenze(allievo, lezioni),
        pannelloOsservazioni(allievo, lezioni),
        pannelloDocumenti(allievo, classe),
      ),
      h('div', { class: 'colonna' }, pannelloVoti(allievo, classe, corsi)),
    ),
  )
}
