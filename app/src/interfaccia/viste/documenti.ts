// Tutto quel che il registro sa stampare, in una pagina sola.
//
// I pulsanti c'erano già, ma sparsi: le presenze e le valutazioni nella scheda
// del corso, il verbale dentro l'ora, la scheda personale dentro la sua
// pagina. Ognuno al posto giusto per chi sta facendo quella cosa lì — e nessun
// posto per chi invece deve *consegnare*, che è un lavoro suo: succede a fine
// semestre, riguarda venti fogli insieme, e per farlo bisognava ricordarsi
// dove stava ogni pulsante e passare da cinque pagine diverse.
//
// Qui si sceglie un corso e si vede tutto quel che ne può uscire: i due
// documenti del corso, una scheda per allievo, un verbale per ora. E in fondo
// la regola con cui il registro li rifà da sé — perché un documento nella
// cartella è una fotografia, e senza qualcuno che la rifaccia invecchia in
// silenzio.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { MODI_PDF } from '../../dominio/automazione.js'
import { classeDelCorsoId, registroDelCorso } from '../../dominio/corsi.js'
import { formattaData } from '../../dominio/date.js'
import { PIF, Molti, corto, quanti } from '../../dominio/lessico.js'
import type { Corso, QuandoRifarePdf } from '../../dominio/modelli.js'
import {
  pastiglia,
  pulsante,
  puntoColore,
  scheda,
  selettore,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { eseguiOAvvisa, selettoreCorsi, statoVuotoAnno } from '../componenti/filtri.js'
import { h, type Figlio } from '../dom.js'
import { azione } from '../ponte.js'
import { moduloAvvio } from '../moduli.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  corsiDellAnnoAperto,
  nelSemestreScelto,
  nomeDiPiano,
  nomeSemestreScelto,
  pianiPerCorso,
  stato,
} from '../stato.js'

/** I documenti che riguardano il corso intero: quelli che si consegnano. */
function delCorso (corso: Corso): HTMLElement {
  const semestreId = stato.semestreId

  return scheda({
    titolo: 'Del corso',
    sottotitolo: `Di tutta la classe insieme · ${nomeSemestreScelto()}`,
    contenuto: h(
      'div',
      { class: 'documenti__pulsanti' },
      pulsante({
        testo: 'Presenze',
        simbolo: 'esporta',
        variante: 'sottile',
        titolo: 'Il conto delle presenze del corso, in PDF',
        al: () => azione({ tipo: 'rapporto.genera', genere: 'presenze', id: corso.id, semestreId }),
      }),
      pulsante({
        testo: 'Valutazioni',
        simbolo: 'esporta',
        variante: 'sottile',
        titolo: 'La griglia dei voti del corso, in PDF',
        al: () =>
          azione({ tipo: 'rapporto.genera', genere: 'valutazioni', id: corso.id, semestreId }),
      }),
      // Il CSV accanto al PDF e non altrove: sono lo stesso dato in due forme,
      // e chi cerca «le presenze» non sa ancora quale delle due gli serve.
      pulsante({
        testo: 'Presenze in CSV',
        simbolo: 'esporta',
        variante: 'fantasma',
        titolo: 'Le presenze per il foglio di calcolo',
        al: () => azione({ tipo: 'esporta.presenze', corsoId: corso.id, semestreId }),
      }),
      pulsante({
        testo: 'Valutazioni in CSV',
        simbolo: 'esporta',
        variante: 'fantasma',
        titolo: 'I voti per il foglio di calcolo',
        al: () => azione({ tipo: 'esporta.valutazioni', corsoId: corso.id, semestreId }),
      }),
      // La parete di ritratti sta con i documenti del corso e non con quelli
      // della classe: la si stampa per l'aula in cui si insegna, e va a finire
      // nella cartella della materia insieme al resto di quel che si porta
      // dentro.
      pulsante({
        testo: 'Foto della classe',
        simbolo: 'immagine',
        variante: 'sottile',
        titolo: `Una faccia e un nome per ${PIF.singolare}: il foglio da portare in aula le prime settimane`,
        al: () => azione({ tipo: 'rapporto.genera', genere: 'foto-classe', id: corso.id }),
      }),
    ),
  })
}

/** Una scheda a testa: il profitto, le presenze, le annotazioni. */
function schedeAllievo (corso: Corso): HTMLElement {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  return scheda({
    titolo: `Schede ${corto(PIF)}`,
    sottotitolo: `${quanti(allievi.length, PIF)} · una ciascuna`,
    contenuto:
      allievi.length === 0
        ? h('p', { class: 'testo-quieto' }, `La classe non ha ${PIF.plurale} attive.`)
        : h(
            'ul',
            { class: 'documenti__elenco' },
            allievi.map((allievo) =>
              h(
                'li',
                { class: 'documenti__riga' },
                h(
                  'button',
                  {
                    class: 'collegamento',
                    type: 'button',
                    // Dal nome si va alla sua pagina: chi guarda l'elenco per
                    // stampare spesso vuole prima controllare che cosa ci
                    // finirà dentro.
                    onclick: () =>
                      aggiorna({
                        vista: 'allievo',
                        classeId: classe?.id ?? null,
                        allievoId: allievo.id,
                      }),
                  },
                  nomeCompleto(allievo),
                ),
                pulsante({
                  simbolo: 'esporta',
                  variante: 'fantasma',
                  titolo: `La scheda di ${nomeCompleto(allievo)} in PDF`,
                  al: () =>
                    azione({
                      tipo: 'rapporto.genera',
                      genere: 'allievo',
                      id: allievo.id,
                      corsoId: corso.id,
                      semestreId: stato.semestreId,
                    }),
                }),
              ),
            ),
          ),
  })
}

/** Un verbale per ora: quel che si è fatto quel giorno. */
function verbali (corso: Corso): HTMLElement {
  // Le ore del semestre scelto, dalla più recente: si stampa quasi sempre
  // l'ultima, e scorrere fino in fondo per trovarla è la parte noiosa.
  const ore = nelSemestreScelto(registroDelCorso(stato.registro, corso.id)).reverse()

  return scheda({
    titolo: 'Verbali',
    sottotitolo: `${ore.length} ${ore.length === 1 ? 'ora' : 'ore'} · ${nomeSemestreScelto()}`,
    contenuto:
      ore.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessuna ora nel periodo scelto.')
        : h(
            'ul',
            { class: 'documenti__elenco' },
            ore.map((lezione) =>
              h(
                'li',
                { class: 'documenti__riga' },
                h(
                  'button',
                  {
                    class: 'collegamento',
                    type: 'button',
                    onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                  },
                  formattaData(lezione.data),
                ),
                // Lo stato dell'ora accanto alla data: un verbale di un'ora
                // ancora da fare esce vuoto, e vale la pena saperlo prima di
                // stamparlo invece che dopo.
                lezione.stato === 'svolta'
                  ? null
                  : pastiglia(lezione.stato, lezione.stato === 'annullata' ? 'negativo' : 'quiete'),
                pulsante({
                  simbolo: 'esporta',
                  variante: 'fantasma',
                  titolo: `Il verbale del ${formattaData(lezione.data)} in PDF`,
                  al: () =>
                    azione({ tipo: 'rapporto.genera', genere: 'lezione', id: lezione.id }),
                }),
              ),
            ),
          ),
  })
}

/**
 * Una scheda per prova, con la sua distribuzione.
 *
 * La griglia delle valutazioni risponde a «come va il corso»; questa risponde
 * a «com'è andata questa prova», che è la domanda del giorno in cui la si
 * riconsegna e di quello in cui qualcuno la contesta. Il foglio porta il
 * grafico della distribuzione, che è la sola cosa lì dentro che non si legge:
 * si guarda.
 */
function prove (corso: Corso): HTMLElement {
  // Dalla più recente, come i verbali: si stampa quasi sempre quella appena
  // corretta.
  const momenti = nelSemestreScelto(
    stato.registro.valutazioni.filter((momento) => momento.corsoId === corso.id),
  )
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))

  return scheda({
    titolo: 'Prove',
    sottotitolo: `${momenti.length} ${momenti.length === 1 ? 'prova' : 'prove'} · ${nomeSemestreScelto()}`,
    contenuto:
      momenti.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessuna prova nel periodo scelto.')
        : h(
            'ul',
            { class: 'documenti__elenco' },
            momenti.map((momento) => {
              const quanti = momento.voti.filter((v) => v.valore !== null).length
              return h(
                'li',
                { class: 'documenti__riga' },
                h(
                  'button',
                  {
                    class: 'collegamento',
                    type: 'button',
                    onclick: () =>
                      aggiorna({ vista: 'valutazioni', valutazioneId: momento.id }),
                  },
                  `${formattaData(momento.data, 'corto')} · ${momento.titolo}`,
                ),
                // Quanti voti ci sono davvero: una prova senza voti stampa un
                // foglio con il grafico vuoto, e saperlo prima risparmia il
                // giro.
                quanti === 0
                  ? pastiglia('nessun voto', 'quiete')
                  : h('span', { class: 'testo-quieto' }, String(quanti)),
                pulsante({
                  simbolo: 'esporta',
                  variante: 'fantasma',
                  titolo: `«${momento.titolo}» in PDF, con la distribuzione dei voti`,
                  al: () =>
                    azione({ tipo: 'rapporto.genera', genere: 'momento', id: momento.id }),
                }),
              )
            }),
          ),
  })
}

/**
 * Il fascicolo: della classe e non del corso.
 *
 * Recapiti, documenti raccolti e periodi di assenza non appartengono a una
 * materia — sono il mestiere del docente di classe — e per questo hanno una
 * scheda loro invece di stare fra i documenti del corso, dove il periodo
 * scelto in fondo alla barra li taglierebbe a metà.
 */
function dellaClasse (corso: Corso): Figlio {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  if (!classe) return null

  return scheda({
    titolo: 'Della classe',
    sottotitolo: `${classe.nome} · vale per tutte le materie, e per l’anno intero`,
    contenuto: h(
      'div',
      { class: 'documenti__pulsanti' },
      pulsante({
        testo: 'Fascicolo',
        simbolo: 'esporta',
        variante: 'sottile',
        titolo: `${Molti(PIF)}, documenti e periodi di assenze: quel che si consegna a chi subentra`,
        al: () => azione({ tipo: 'rapporto.genera', genere: 'fascicolo', id: classe.id }),
      }),
    ),
  })
}

/** Un piano per foglio: la scaletta che si porta in aula stampata. */
function piani (corso: Corso): HTMLElement {
  const suoi = pianiPerCorso(corso.id)

  return scheda({
    titolo: 'Piani lezione',
    sottotitolo: `${suoi.length} ${suoi.length === 1 ? 'piano' : 'piani'} · di questo corso`,
    contenuto:
      suoi.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Questo corso non ha piani lezione.')
        : h(
            'ul',
            { class: 'documenti__elenco' },
            suoi.map((piano) =>
              h(
                'li',
                { class: 'documenti__riga' },
                h(
                  'button',
                  {
                    class: 'collegamento',
                    type: 'button',
                    onclick: () => aggiorna({ vista: 'piani', pianoId: piano.id }),
                  },
                  nomeDiPiano(piano),
                ),
                pulsante({
                  simbolo: 'esporta',
                  variante: 'fantasma',
                  titolo: `${nomeDiPiano(piano)} in PDF, da portare in aula`,
                  al: () => azione({ tipo: 'rapporto.genera', genere: 'piano', id: piano.id }),
                }),
              ),
            ),
          ),
  })
}

/**
 * La regola con cui il registro rifà i documenti da sé.
 *
 * Sta in questa pagina e non nelle Impostazioni perché è la stessa domanda dei
 * pulsanti qui sopra — «chi tiene aggiornata la cartella» — e separarla
 * vorrebbe dire che chi preme i pulsanti a mano non sa di non doverlo fare.
 */
function automazione (): HTMLElement {
  const modo = stato.registro.impostazioni.pdfAutomatici
  const scelto = MODI_PDF.find((m) => m.valore === modo) ?? MODI_PDF[0]

  return scheda({
    titolo: 'Chi li rifà',
    sottotitolo: 'Un documento nella cartella invecchia da solo: nessuno se ne accorge guardandolo.',
    contenuto: h(
      'div',
      { class: 'documenti__automazione' },
      selettore(
        modo,
        MODI_PDF.map((m) => ({ valore: m.valore, testo: m.nome })),
        (valore: QuandoRifarePdf) => {
          void eseguiOAvvisa(
            {
              tipo: 'impostazioni.salva',
              impostazioni: { ...stato.registro.impostazioni, pdfAutomatici: valore },
            },
            'Regola cambiata.',
          )
        },
      ),
      h('p', { class: 'testo-quieto' }, scelto.spiegazione),
      // Il ritardo si dichiara: chi mette un voto e va subito a guardare la
      // cartella non trova niente, e senza questa riga penserebbe che
      // l'automazione non funziona.
      modo === 'sempre'
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Si aspetta qualche secondo dall’ultima modifica: correggere venti caselle ' +
              'dell’appello rifà i documenti una volta sola, non venti.',
          )
        : null,
    ),
  })
}

export function vistaDocumenti (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--documenti' },
      statoVuotoAnno({
        simbolo: 'esporta',
        testo:
          'I documenti escono da un corso: prima serve un anno, una classe e una materia. ' +
          'L’avvio guidato li mette insieme in una finestra sola.',
        avvia: () => moduloAvvio(),
      }),
    )
  }

  const corsi = corsiDellAnnoAperto()
  // Lo stesso corso della vista Corsi: si passa di qua per stampare quel che
  // si stava guardando, e ritrovarne un altro sarebbe una trappola.
  const scelto = corsi.find((c) => c.id === stato.corsoId) ?? corsi[0] ?? null
  const classe = scelto ? classePerId(scelto.classeId) : null

  return h(
    'div',
    { class: 'vista vista--documenti' },
    testataVista({
      titolo: 'Documenti',
      sottotitolo: `quel che esce dal registro e va in mano ad altri · ${nomeSemestreScelto()}`,
      azioni: [
        corsi.length > 0 &&
          pulsante({
            testo: 'Esporta tutti i corsi',
            simbolo: 'esporta',
            variante: 'primario',
            titolo: `Presenze, valutazioni e schede ${corto(PIF)} di tutti i corsi nel ${nomeSemestreScelto()}`,
            al: () =>
              azione({ tipo: 'rapporto.completo', corsoId: null, semestreId: stato.semestreId }),
          }),
        pulsante({
          testo: 'Modelli',
          simbolo: 'matita',
          variante: 'fantasma',
          titolo: 'Apre templates/: da lì si cambia come sono fatti tutti i rapporti',
          al: () => azione({ tipo: 'rapporto.modelli' }),
        }),
      ],
      contorno:
        corsi.length > 0
          ? selettoreCorsi({
              nome: 'sceltaCorsoDocumenti',
              corsi,
              valore: scelto?.id ?? null,
              al: (valore) => aggiorna({ corsoId: valore }),
            })
          : undefined,
    }),
    corsi.length === 0
      ? statoVuoto({
          simbolo: 'libro',
          titolo: 'Nessun corso',
          testo:
            'I documenti sono di un corso: le ore che si contano e la media in fondo alla ' +
            'griglia sono le sue. Senza corsi non c’è niente da stampare.',
          azione: pulsante({
            testo: 'Vai ai corsi',
            variante: 'primario',
            simbolo: 'libro',
            al: () => aggiorna({ vista: 'corsi' }),
          }),
        })
      : scelto
        ? h(
            'div',
            { class: 'documenti' },
            h(
              'div',
              { class: 'documenti__testa' },
              puntoColore(classe?.colore ?? '#888888'),
              h('h3', { class: 'documenti__corso' }, scelto.titolo),
              pulsante({
                testo: 'Esporta tutto il corso',
                simbolo: 'esporta',
                variante: 'primario',
                titolo:
                  `I documenti del corso, una scheda per ogni ${PIF.singolare} e una per ogni prova, in un colpo`,
                al: () =>
                  azione({
                    tipo: 'rapporto.completo',
                    corsoId: scelto.id,
                    semestreId: stato.semestreId,
                  }),
              }),
            ),
            delCorso(scelto),
            h('div', { class: 'documenti__colonne' }, schedeAllievo(scelto), verbali(scelto)),
            h('div', { class: 'documenti__colonne' }, prove(scelto), piani(scelto)),
            dellaClasse(scelto),
            automazione(),
          )
        : null,
  )
}
