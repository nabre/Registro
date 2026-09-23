// I riquadri della pagina Documenti: che cosa un corso sa stampare.
//
// Uno per famiglia di fogli — quelli del corso, le prove, i piani, le ore, le
// persone, le composizioni — e tutti costruiti con gli stessi mattoni:
// `schedaDiFogli` per la cornice e il conto, `rigaFoglio` per ogni documento.
// Quel che cambia da un riquadro all'altro è soltanto dove si vanno a prendere
// gli oggetti di cui si parla, ed è il motivo per cui stanno tutti qui.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import { fraIFascicoli, pdfDi } from '../../../domain/compositions.js'
import { classeDelCorsoId, registroDelCorso } from '../../../domain/courses.js'
import { formattaData } from '../../../domain/dates.js'
import { DOCUMENTO_SCHEDE, PIF, Molti, quanti } from '../../../domain/lexicon.js'
import type { Corso, Lezione } from '../../../domain/models.js'
import { pastiglia, pulsante } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { tabella } from '../../components/table.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import {
  aggiorna,
  nelSemestreScelto,
  nomeDiPiano,
  nomeSemestreScelto,
  pianiPerCorso,
  pianoPerId,
  stato,
} from '../../state.js'

import {
  cellaFoglio,
  conto,
  fileEsportato,
  foglio,
  nome,
  rigaFoglio,
  schedaDiFogli,
} from './sheets.js'

/** I documenti che riguardano il corso intero: quelli che si consegnano. */
export function delCorso (corso: Corso): HTMLElement {
  const semestreId = stato.semestreId
  const contesto = { corsoId: corso.id, semestreId }
  const presenze = foglio('presenze', corso.id, contesto)
  const valutazioni = foglio('valutazioni', corso.id, contesto)
  // Il CSV accanto al PDF e non altrove: sono lo stesso dato in due forme, e
  // chi cerca «le presenze» non sa ancora quale delle due gli serve.
  const presenzeCsv = foglio('presenze', corso.id, contesto, 'csv')
  const valutazioniCsv = foglio('valutazioni', corso.id, contesto, 'csv')

  return schedaDiFogli({
    titolo: 'Del corso',
    sottotitolo: conto(`Di tutta la classe insieme · ${nomeSemestreScelto()}`),
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto' },
      rigaFoglio({
        etichetta: nome('Presenze'),
        foglio: presenze,
        nome: 'il conto delle presenze',
        rifai: { tipo: 'rapporto.genera', genere: 'presenze', id: corso.id, semestreId },
      }),
      rigaFoglio({
        etichetta: nome('Valutazioni'),
        foglio: valutazioni,
        nome: 'la griglia dei voti',
        rifai: { tipo: 'rapporto.genera', genere: 'valutazioni', id: corso.id, semestreId },
      }),
      rigaFoglio({
        etichetta: nome('Presenze in CSV'),
        foglio: presenzeCsv,
        nome: 'le presenze per il foglio di calcolo',
        rifai: { tipo: 'esporta.presenze', corsoId: corso.id, semestreId },
      }),
      rigaFoglio({
        etichetta: nome('Valutazioni in CSV'),
        foglio: valutazioniCsv,
        nome: 'i voti per il foglio di calcolo',
        rifai: { tipo: 'esporta.valutazioni', corsoId: corso.id, semestreId },
      }),
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
export function prove (corso: Corso): HTMLElement {
  // Dalla più recente, come i verbali: si stampa quasi sempre quella appena
  // corretta.
  const momenti = nelSemestreScelto(
    stato.registro.valutazioni.filter((momento) => momento.corsoId === corso.id),
  )
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
  return schedaDiFogli({
    titolo: 'Prove',
    sottotitolo: conto(
      `${momenti.length} ${momenti.length === 1 ? 'prova' : 'prove'} · ${nomeSemestreScelto()}`,
    ),
    contenuto: () =>
      momenti.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessuna prova nel periodo scelto.')
        : h(
            'ul',
            { class: 'documenti__elenco' },
            momenti.map((momento) => {
              const votati = momento.voti.filter((v) => v.valore !== null).length
              return rigaFoglio({
                etichetta: nome(`${formattaData(momento.data, 'corto')} · ${momento.titolo}`),
                // Quanti voti ci sono davvero: una prova senza voti stampa un
                // foglio con il grafico vuoto, e saperlo prima risparmia il
                // giro.
                segni:
                  votati === 0
                    ? pastiglia('nessun voto', 'quiete')
                    : h('span', { class: 'testo-quieto' }, String(votati)),
                foglio: foglio('momento', momento.id, { corsoId: corso.id }),
                nome: `la scheda di «${momento.titolo}»`,
                rifai: { tipo: 'rapporto.genera', genere: 'momento', id: momento.id },
              })
            }),
          ),
  })
}

/** Un piano per foglio: la scaletta che si porta in aula stampata. */
export function piani (corso: Corso): HTMLElement {
  const suoi = pianiPerCorso(corso.id)

  return schedaDiFogli({
    titolo: 'Piani lezione',
    sottotitolo: conto(`${suoi.length} ${suoi.length === 1 ? 'piano' : 'piani'} · di questo corso`),
    contenuto: () =>
      suoi.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Questo corso non ha piani lezione.')
        : h(
            'ul',
            { class: 'documenti__elenco' },
            suoi.map((piano) =>
              rigaFoglio({
                etichetta: nome(nomeDiPiano(piano)),
                foglio: foglio('piano', piano.id, { corsoId: corso.id }),
                nome: nomeDiPiano(piano),
                rifai: { tipo: 'rapporto.genera', genere: 'piano', id: piano.id },
              }),
            ),
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
export function dellaClasse (corso: Corso): Figlio {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  if (!classe) return null
  const suo = foglio('fascicolo', classe.id)

  return schedaDiFogli({
    titolo: 'Della classe',
    sottotitolo: conto(`${classe.nome} · vale per tutte le materie, e per l’anno intero`),
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto' },
      rigaFoglio({
        etichetta: h(
          'span',
          { class: 'documenti__nome', title: `${Molti(PIF)}, documenti e periodi di assenze` },
          'Fascicolo',
        ),
        foglio: suo,
        nome: 'il fascicolo della classe',
        rifai: { tipo: 'rapporto.genera', genere: 'fascicolo', id: classe.id },
      }),
    ),
  })
}

/**
 * Le composizioni: i PDF messi insieme a mano, con il loro elenco alle spalle.
 *
 * Una composizione nasce spuntando le caselle dei fogli e premendo «Combina»,
 * che chiede come chiamarla. Da lì in poi è un documento come gli altri — sta
 * nella cartella, si guarda nella cornice, si rifà — con una cosa in più: il
 * registro si ricorda di che cosa è fatta, e «aggiorna» la ricompone con le
 * schede di adesso invece di rispuntare venticinque caselle.
 *
 * Il riquadro si chiama «Composizioni» e non «Fascicoli» perché nella stessa
 * pagina c'è già il *fascicolo della classe*, che è un'altra cosa: due riquadri
 * con lo stesso nome si leggono come lo stesso documento fatto due volte.
 *
 * Il riquadro compare solo quando ce n'è almeno una: una scheda vuota che dice
 * «qui non c'è niente» è una riga in meno di spazio per i fogli da consegnare,
 * e il gesto che ne crea una sta nella riga delle azioni.
 *
 * Sta in tutte e tre le schede, e non è una ripetizione: una composizione mette
 * insieme fogli presi da elenchi diversi — i verbali con le schede — e non
 * appartiene a nessuno dei tre.
 */
export function composizioni (): Figlio {
  const suoi = stato.composizioni
  const orfani = pdfSenzaElenco()
  if (suoi.length === 0 && orfani.length === 0) return null

  const quante = `${suoi.length} ${suoi.length === 1 ? 'composizione' : 'composizioni'}`
  return schedaDiFogli({
    titolo: 'Composizioni',
    sottotitolo: conto(
      orfani.length > 0
        ? `${quante} · ${orfani.length} senza elenco`
        : `${quante} · più documenti in un PDF solo`,
    ),
    contenuto: () =>
      h(
        'ul',
        { class: 'documenti__elenco documenti__elenco--corto' },
        orfani.map(rigaSenzaElenco),
        suoi.map((composizione) => {
          const percorso = pdfDi(composizione)
          // Quanti dei suoi fogli stanno ancora nella cartella. Le schede di cui
          // è fatta si buttano via e si rifanno con un nome nuovo, e una
          // composizione che ne nomina venticinque e ne ritrova ventitré si
          // consegna per sbaglio: il conto lo dice prima, e «aggiorna» — che
          // lascerebbe fuori le due — non è più un gesto al buio.
          const dentro = composizione.percorsi.filter(
            (p) => stato.esportati.some((e) => e.percorso === p),
          ).length
          const tutti = composizione.percorsi.length
          return rigaFoglio({
            etichetta: nome(composizione.nome),
            segni: h(
              'span',
              {
                class: ['testo-quieto', dentro < tutti && 'documenti__manchevole'],
                attr: {
                  title:
                    dentro < tutti
                      ? `${dentro} dei ${tutti} documenti sono ancora nella cartella: rifacendolo ` +
                        `adesso ne resterebbero fuori ${tutti - dentro}`
                      : `${tutti} documenti dentro`,
                },
              },
              dentro < tutti ? `${dentro}/${tutti}` : `${tutti}`,
            ),
            foglio: fileEsportato(percorso),
            nome: `la composizione «${composizione.nome}»`,
            rifai: { tipo: 'composizione.aggiorna', id: composizione.id },
            butta: async () => {
              const sicuro = await conferma({
                titolo: `Buttare via «${composizione.nome}»?`,
                testo:
                  'Vanno via il PDF e l’elenco di che cosa ci sta dentro. I documenti che lo ' +
                  'compongono restano dove sono, uno per uno.',
                testoConferma: 'Butta via',
                pericolo: true,
              })
              if (!sicuro) return
              const risposta = await azione({ tipo: 'composizione.elimina', id: composizione.id })
              if (!risposta.ok) return
              // La riga se ne va qui e non aspettando lo stato che l'host
              // rispinge. Sono la stessa cosa quando tutto va bene, ma quel che
              // si è appena buttato via non deve restare in elenco nemmeno per
              // un ridisegno: una composizione ancora lì dopo la conferma si
              // legge come «non ha funzionato», e lo si butta via due volte.
              aggiorna({
                composizioni: stato.composizioni.filter((c) => c.id !== composizione.id),
                // Anche il PDF, e non solo l'elenco: senza questa riga il file
                // resterebbe fra gli esportati per un ridisegno, e il riquadro
                // lo rimetterebbe su come un PDF «senza elenco» — che è proprio
                // quel che non è: è appena andato via con la sua composizione.
                esportati: stato.esportati.filter((e) => e.percorso !== percorso),
                documentiScelti: stato.documentiScelti.filter((p) => p !== percorso),
                anteprima: stato.anteprima === percorso ? null : stato.anteprima,
              })
            },
          })
        }),
      ),
  })
}

/**
 * I PDF rimasti sotto `esportazioni/composizioni/` senza la loro ricetta.
 *
 * Non sono un caso di scuola: una composizione scritta da una versione di
 * prima, o un'eliminazione riuscita a metà, lasciano lì un file che il riquadro
 * non nominava — e che quindi non si poteva più buttare via da nessuna parte,
 * perché sotto quella cartella non passa nessun altro elenco. Restava nella
 * cartella che si consegna, e l'unico modo di toglierlo era il gestore file.
 */
function pdfSenzaElenco (): string[] {
  const nominati = new Set(stato.composizioni.map((c) => pdfDi(c)))
  return stato.esportati
    .map((e) => e.percorso)
    .filter((percorso) => fraIFascicoli(percorso) && !nominati.has(percorso))
    .sort()
}

/**
 * La riga di un PDF senza elenco: si guarda e si butta via, non si rifà.
 *
 * Il pulsante che lo rifarebbe non c'è — di che cosa fosse fatto non lo sa più
 * nessuno — e la pastiglia lo dice invece di lasciar credere a una composizione
 * come le altre a cui manca solo un aggiornamento.
 */
function rigaSenzaElenco (percorso: string): Figlio {
  const etichetta = (percorso.split('/').pop() ?? percorso).replace(/\.pdf$/i, '')
  return rigaFoglio({
    etichetta: nome(etichetta),
    segni: pastiglia('senza elenco', 'quiete'),
    foglio: fileEsportato(percorso),
    nome: `il PDF «${etichetta}»`,
    bloccato:
      'Questo PDF non ha più l’elenco di che cosa ci sta dentro: non si può rifare, ' +
      'si guarda e si butta via.',
    // La domanda è sua e non quella di un documento qualunque: «si rifà quando
    // serve» qui sarebbe una promessa che nessuno può mantenere.
    butta: async () => {
      const sicuro = await conferma({
        titolo: `Buttare via «${etichetta}»?`,
        testo:
          'Va via il PDF. Non si può rifare — l’elenco di che cosa ci stava dentro non c’è ' +
          'più — ma i documenti che lo componevano sono ancora nella cartella, uno per uno.',
        testoConferma: 'Butta via',
        pericolo: true,
      })
      if (!sicuro) return
      const risposta = await azione({ tipo: 'esportazione.elimina', percorso })
      if (!risposta.ok) return
      aggiorna({
        esportati: stato.esportati.filter((e) => e.percorso !== percorso),
        documentiScelti: stato.documentiScelti.filter((p) => p !== percorso),
        anteprima: stato.anteprima === percorso ? null : stato.anteprima,
      })
    },
  })
}

// ----------------------------------------------------------- delle lezioni

/**
 * Le lezioni come matrice: una riga per data, una colonna per documento.
 *
 * I due fogli di un'ora sono due cose distinte e si governano distinte — il
 * piano si stampa *prima*, per portarlo in aula; il verbale *dopo*, quando
 * l'ora è chiusa — e in una matrice si vede a colpo d'occhio quale delle due
 * colonne è in ritardo. In riquadri separati, uno per ora, la stessa domanda
 * («dei verbali quali mancano?») voleva dire aprire trenta riquadri.
 *
 * Le celle non si parlano: ognuna ha il suo stato e i suoi tre gesti, e rifare
 * il verbale di martedì non tocca il piano di martedì.
 *
 * Dalla più recente, perché è quella che si sta chiudendo: chi arriva qui viene
 * dal registro dell'ora appena compilata. Le ore non svolte restano in
 * elenco — sapere che il verbale di giovedì non si può ancora fare è
 * l'informazione che si cerca — con i pulsanti spenti e la riga in grigio.
 */
export function matriceLezioni (corso: Corso): Figlio {
  // Il numero si conta in avanti — la prima ora del periodo è la 1 — e solo
  // dopo l'elenco si rovescia: rovesciando prima, la riga in cima sarebbe la 1
  // e il conto andrebbe all'indietro rispetto a come si nomina un'ora.
  const ore = nelSemestreScelto(registroDelCorso(stato.registro, corso.id))
    .map((lezione, indice) => ({ lezione, numero: indice + 1 }))
    .reverse()

  return schedaDiFogli({
    titolo: 'Lezioni',
    sottotitolo: conto(`${ore.length} ${ore.length === 1 ? 'ora' : 'ore'} · ${nomeSemestreScelto()}`),
    contenuto: () =>
      ore.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessun’ora nel periodo scelto.')
        : tabella({
            variante: 'lezioni',
            intestazione: [
              h('th', null, 'N.'),
              h('th', null, 'Data'),
              h('th', null, 'Verbale'),
              h('th', null, 'Piano lezione'),
            ],
            righe: ore.map(({ lezione, numero }) => rigaOra(corso, lezione, numero)),
          }),
  })
}

/** Un numero, una data e i due documenti di quell'ora. */
function rigaOra (corso: Corso, lezione: Lezione, numero: number): HTMLElement {
  const conclusa = lezione.stato === 'svolta'
  // Il motivo per cui il verbale adesso non si fa. Vale per il verbale e non
  // per il piano: il piano è la scaletta che si porta in aula, e aspettare che
  // l'ora sia finita per stamparlo non avrebbe senso.
  const bloccato = conclusa
    ? null
    : lezione.stato === 'annullata'
      ? 'L’ora è annullata: non c’è niente da verbalizzare.'
      : 'L’ora non è ancora conclusa: il verbale uscirebbe senza appello e senza consuntivo.'
  const piano = lezione.pianoId ? pianoPerId(lezione.pianoId) : null

  return h(
    'tr',
    { class: conclusa ? undefined : 'tabella__riga--spenta' },
    h('td', { class: 'documenti__numero' }, String(numero)),
    h(
      'td',
      { class: 'documenti__quando' },
      nome(formattaData(lezione.data)),
      conclusa
        ? null
        : pastiglia(lezione.stato, lezione.stato === 'annullata' ? 'negativo' : 'quiete'),
    ),
    cellaFoglio({
      foglio: foglio('lezione', lezione.id, { corsoId: corso.id }),
      nome: `il verbale del ${formattaData(lezione.data)}`,
      rifai: { tipo: 'rapporto.genera', genere: 'lezione', id: lezione.id },
      bloccato,
      // Lo stesso verbale in Markdown, accanto al PDF: il PDF si consegna, il
      // testo si riapre e si corregge.
      altro: pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        titolo: bloccato ?? 'Lo stesso verbale in testo, da correggere',
        disabilitato: Boolean(bloccato),
        al: () => azione({ tipo: 'esporta.lezione', lezioneId: lezione.id }),
      }),
    }),
    piano
      ? cellaFoglio({
          foglio: foglio('piano', piano.id, { corsoId: corso.id }),
          nome: nomeDiPiano(piano),
          rifai: { tipo: 'rapporto.genera', genere: 'piano', id: piano.id },
        })
      : h(
          'td',
          { class: 'documenti__cella' },
          h('span', { class: 'testo-quieto' }, 'nessun piano'),
        ),
  )
}

// ----------------------------------------------------------- degli allievi

/**
 * La parete di ritratti: una faccia e un nome per ogni persona.
 *
 * Sta con le persone e non con i documenti del corso, dove era finita perché il
 * foglio si stampa per l'aula in cui si insegna: ma quel che c'è dentro sono
 * loro, e chi apre questa scheda cerca un nome o una faccia. Nel file resta
 * dov'era — sotto la materia, con il resto di quel che si porta in aula — che è
 * una faccenda della cartella e non di questa pagina.
 *
 * Porta nel nome il giorno in cui è stato fatto: una classe cambia — qualcuno
 * arriva a novembre, qualcuno lascia — e il foglio di settembre resta quello di
 * settembre.
 */
export function fotoDellaClasse (corso: Corso): HTMLElement {
  const suo = foglio('foto-classe', corso.id, { corsoId: corso.id })

  return schedaDiFogli({
    titolo: 'Foto della classe',
    sottotitolo: conto(`Una faccia e un nome per ${PIF.singolare}: il foglio da portare in aula`),
    contenuto: () => h(
      'ul',
      { class: 'documenti__elenco documenti__elenco--corto' },
      rigaFoglio({
        etichetta: nome(Molti(PIF)),
        foglio: suo,
        nome: 'il foglio delle facce',
        rifai: { tipo: 'rapporto.genera', genere: 'foto-classe', id: corso.id },
      }),
    ),
  })
}

export function schedeAllievo (corso: Corso): HTMLElement {
  const classe = classeDelCorsoId(stato.registro, corso.id)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  return schedaDiFogli({
    titolo: DOCUMENTO_SCHEDE,
    sottotitolo: conto(
      `${quanti(allievi.length, PIF)} · una ciascuna · ${nomeSemestreScelto()}`,
    ),
    contenuto: () =>
      allievi.length === 0
        ? h('p', { class: 'testo-quieto' }, `La classe non ha ${PIF.plurale} attive.`)
        : h(
            'ul',
            { class: 'documenti__elenco documenti__elenco--lungo' },
            allievi.map((allievo) =>
              rigaFoglio({
                etichetta: nome(nomeCompleto(allievo)),
                foglio: foglio('allievo', allievo.id, {
                  corsoId: corso.id,
                  semestreId: stato.semestreId,
                }),
                nome: `la scheda di ${nomeCompleto(allievo)}`,
                rifai: {
                  tipo: 'rapporto.genera',
                  genere: 'allievo',
                  id: allievo.id,
                  corsoId: corso.id,
                  semestreId: stato.semestreId,
                },
              }),
            ),
          ),
  })
}
