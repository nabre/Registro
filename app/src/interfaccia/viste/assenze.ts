// I periodi di assenze del docente di classe: i fogli, la mail, le firme.
//
// La forma è quella dei documenti — allievi in riga, caselle in colonna —
// perché la domanda è la stessa e si legge nello stesso modo: per colonna si
// vede a che punto è la classe, per riga a che punto è uno. Quel che cambia
// sono le colonne, che qui non sono cose diverse ma la stessa cosa a tre
// momenti: il foglio che parte, la mail che chiede la firma, il foglio che
// torna firmato. Guardata così, la casella scura dice sempre la prossima mossa.
//
// Un periodo per volta: cinque colonne per venticinque nomi riempiono lo
// schermo, e due matrici aperte sono una pagina in cui non si trova più niente.

import {
  avanzamentoAssenze,
  daSpedire,
  destinatariAssenze,
  etichettaFoglio,
  faseRiga,
  foglioDi,
  periodoDetto,
  raggiungibile,
  rigaDi,
  righeVive,
  TIPI_RAPPORTO,
  vergini,
  type RichiestaFirma,
} from '../../dominio/assenze.js'
import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { formattaData, giornoDi } from '../../dominio/date.js'
import type { Allievo, BloccoAssenze, Classe, TipoRapporto } from '../../dominio/modelli.js'
import {
  conAttesa,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
} from '../componenti/base.js'
import { sintesiIncassata } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { conferma } from '../componenti/modale.js'
import { h, type Figlio } from '../dom.js'
import { tabella } from '../componenti/tabella.js'
import { moduloBloccoAssenze, moduloImportaAssenze } from '../moduli.js'
import { azione } from '../ponte.js'
import { aggiorna, fascicoloDi, stato, toccaIlSemestreScelto } from '../stato.js'

/** Le cinque colonne della matrice, nell'ordine in cui si percorrono. */
interface Colonna {
  chiave: string
  titolo: string
  breve: string
}

const COLONNE: Colonna[] = [
  { chiave: 'vergine-assenze', titolo: 'Assenze da spedire', breve: 'ass.' },
  { chiave: 'vergine-ritardi', titolo: 'Ritardi da spedire', breve: 'rit.' },
  { chiave: 'invio', titolo: 'Richiesta di firma spedita', breve: 'mail' },
  { chiave: 'firmato-assenze', titolo: 'Assenze firmate', breve: 'ass. ✓' },
  { chiave: 'firmato-ritardi', titolo: 'Ritardi firmati', breve: 'rit. ✓' },
]

/**
 * Una casella di foglio: aperta se il file c'è, da riempire se manca.
 *
 * Un clic fa quel che serve in quel momento — apre il PDF, o lo chiede — e il
 * cestino accanto, che compare passando sulla riga, lo toglie. È lo stesso
 * gesto della matrice dei documenti, e volutamente: sono due matrici della
 * stessa pagina, e due modi di spuntare sarebbero due modi di sbagliarsi.
 */
function cellaFoglio (
  classe: Classe,
  blocco: BloccoAssenze,
  allievo: Allievo,
  genere: TipoRapporto,
  firmato: boolean,
) {
  const riga = rigaDi(blocco, allievo.id)
  const foglio = foglioDi(riga, genere, firmato)
  const atteso = firmato && foglioDi(riga, genere, false) !== null

  const comando = {
    classeId: classe.id,
    bloccoId: blocco.id,
    allievoId: allievo.id,
    genere,
    firmato,
  }

  return h(
    'td',
    { class: 'tabella__cella' },
    h(
      'div',
      { class: 'cella-documento__gruppo' },
      h(
        'button',
        {
          class: [
            'cella-documento',
            foglio
              ? 'cella-documento--consegnato'
              : atteso
                ? 'cella-documento--atteso'
                : 'cella-documento--fuori',
          ],
          type: 'button',
          attr: {
            title: foglio
              ? `Apri ${foglio.nome}`
              : `${etichettaFoglio(genere, firmato)} di ${nomeCompleto(allievo)}: scegli il file`,
          },
          onclick: (evento: MouseEvent) =>
            void conAttesa(
              evento.currentTarget as HTMLButtonElement,
              azione(
                foglio
                  ? { tipo: 'assenze.foglio.apri', ...comando }
                  : { tipo: 'assenze.foglio.aggiungi', ...comando },
              ),
            ),
        },
        icona(foglio ? (firmato ? 'firma' : 'documento') : 'piu', 'icona--minuta'),
      ),
      foglio
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: `Togli ${foglio.nome}`,
            classe: 'cella-documento__modifica',
            al: () => azione({ tipo: 'assenze.foglio.togli', ...comando }),
          })
        : null,
    ),
  )
}

/**
 * La casella della mail. Non è un file ma un fatto: o è partita, o non è
 * ancora partita, o è andata storta — e in quest'ultimo caso il motivo si legge
 * passandoci sopra, perché è quasi sempre un indirizzo sbagliato e si corregge
 * sulla scheda dell'allievo.
 */
function cellaInvio (classe: Classe, blocco: BloccoAssenze, allievo: Allievo) {
  const riga = rigaDi(blocco, allievo.id)
  const pronti = vergini(riga).length
  const invio = riga?.invio ?? null
  const partita = Boolean(invio && !invio.errore)
  const { indirizzi, senzaIndirizzo } = destinatariAssenze(blocco, allievo, fascicoloDi(classe.id))

  const spedisci = async () => {
    if (indirizzi.length === 0) {
      void azione({
        tipo: 'sistema.messaggio',
        livello: 'avviso',
        testo:
          `Non si sa a chi scrivere per ${nomeCompleto(allievo)}: manca ` +
          `${senzaIndirizzo.join(', ')}. L’indirizzo del datore di lavoro sta nella sua scheda.`,
      })
      return
    }
    const sicuro = await conferma({
      titolo: partita
        ? `Rifare la bozza per ${nomeCompleto(allievo)}?`
        : `Preparare la bozza per ${indirizzi.join(', ')}?`,
      testo:
        `${pronti} fogli in allegato. La bozza si apre nel programma di posta, e a spedirla sei tu.` +
        (partita ? '\n\nLa richiesta era già partita: arriverà una seconda volta.' : ''),
      testoConferma: 'Prepara',
    })
    if (!sicuro) return
    await azione({
      tipo: 'assenze.invia',
      classeId: classe.id,
      bloccoId: blocco.id,
      allieviIds: [allievo.id],
    })
  }

  if (pronti === 0 && !invio) {
    return h(
      'td',
      { class: 'tabella__cella' },
      h('span', { class: 'cella-documento cella-documento--vuota' }, '—'),
    )
  }

  return h(
    'td',
    { class: 'tabella__cella' },
    h(
      'div',
      // La busta e il visto stanno affiancati, come il documento e il suo
      // cestino nelle altre caselle: sono lo stesso gesto in due tempi —
      // preparo la mail, poi dico che è partita — e su due righe la casella
      // dell'allievo diventava alta il doppio delle altre.
      { class: 'cella-documento__gruppo' },
      h(
        'button',
        {
          class: [
            'cella-documento',
            invio?.errore
              ? 'cella-documento--scaduto'
              : partita
                ? 'cella-documento--consegnato'
                : 'cella-documento--atteso',
          ],
          type: 'button',
          attr: {
            title: invio?.errore
              ? `Non partita: ${invio.errore}\nRiprova`
              : partita
                ? `Spedita il ${formattaData(giornoDi(invio?.inviatoIl) ?? '')} a ${invio?.destinatari.join(', ')}\nRispedisci`
                : indirizzi.length === 0
                  ? `Manca l’indirizzo: ${senzaIndirizzo.join(', ')}`
                  : `Spedisci a ${indirizzi.join(', ')}`,
          },
          onclick: (evento: MouseEvent) =>
            void conAttesa(evento.currentTarget as HTMLButtonElement, spedisci()),
        },
        icona(invio?.errore ? 'avviso' : partita ? 'spunta' : 'posta', 'icona--minuta'),
      ),
      // Il visto accanto alla busta: la bozza la apre il pulsante grande, che
      // sia partita lo dice questo. Il registro non domanda più «l'hai
      // spedita?» subito dopo l'apertura — quando nessuno l'aveva mandata.
      pronti > 0 || partita
        ? pulsante({
            simbolo: 'spunta',
            variante: partita ? 'sottile' : 'fantasma',
            classe: 'cella-documento__modifica',
            titolo: partita
              ? `Riporta da mandare la richiesta di ${nomeCompleto(allievo)}`
              : `Segna spedita la richiesta di ${nomeCompleto(allievo)}`,
            al: () =>
              azione({
                tipo: 'assenze.spunta',
                classeId: classe.id,
                bloccoId: blocco.id,
                allievoId: allievo.id,
                spedita: !partita,
              }),
          })
        : null,
    ),
  )
}

/** In che fase sta un allievo, detto in una pastiglia. */
function pastigliaFase (blocco: BloccoAssenze, allievo: Allievo) {
  switch (faseRiga(rigaDi(blocco, allievo.id))) {
    case 'firmato':
      return pastiglia('firmato', 'positivo', 'spunta')
    case 'in-attesa':
      return pastiglia('in attesa', 'informativo')
    case 'da-spedire':
      return pastiglia('da spedire', 'attenzione')
    default:
      return h('span', { class: 'testo-quieto' }, '—')
  }
}

function tabellaAssenze (classe: Classe, blocco: BloccoAssenze, allievi: Allievo[]) {
  return tabella({
    variante: ['documenti', 'assenze'],
    griglia: true,
    intestazione: [
      h('th', { class: 'tabella__nome' }, 'Allievo'),
      ...COLONNE.map((colonna) =>
        h(
          'th',
          { class: 'tabella__richiesta', attr: { title: colonna.titolo } },
          h('span', { class: 'tabella__richiesta-titolo' }, colonna.breve),
        ),
      ),
      h('th', { class: 'tabella__media' }, 'Stato'),
    ],
    righe: allievi.map((allievo) =>
      h(
        'tr',
        { class: faseRiga(rigaDi(blocco, allievo.id)) === 'fuori' ? 'tabella__riga--spenta' : undefined },
        h(
          'td',
          { class: 'tabella__nome' },
          h('span', null, nomeCompleto(allievo)),
          raggiungibile(allievo)
            ? null
            : h(
                'small',
                {
                  class: 'testo-negativo',
                  attr: { title: 'Senza l’indirizzo del datore la mail non parte' },
                },
                ' senza datore',
              ),
        ),
        ...TIPI_RAPPORTO.map((tipo) => cellaFoglio(classe, blocco, allievo, tipo, false)),
        cellaInvio(classe, blocco, allievo),
        ...TIPI_RAPPORTO.map((tipo) => cellaFoglio(classe, blocco, allievo, tipo, true)),
        h('td', { class: 'tabella__media' }, pastigliaFase(blocco, allievo)),
      ),
    ),
  })
}

/** Una riga dell'elenco dei periodi: come va, e un clic per aprirlo. */
function rigaPeriodo (classe: Classe, blocco: BloccoAssenze, aperto: boolean) {
  const conto = avanzamentoAssenze(blocco)
  return h(
    'li',
    { class: ['periodo-assenze', aperto && 'periodo-assenze--aperto'] },
    h(
      'button',
      {
        class: 'documento__titolo',
        type: 'button',
        attr: { title: 'Apri il periodo' },
        onclick: () => aggiorna({ bloccoAssenzeId: blocco.id }),
      },
      icona('calendario', 'icona--minuta'),
      h('span', null, periodoDetto(blocco)),
    ),
    h(
      'small',
      { class: 'testo-quieto' },
      conto.interessati === 0
        ? 'nessun foglio caricato'
        : `${conto.firmate}/${conto.interessati} firmati · ${conto.inviate} spediti`,
    ),
    conto.falliti > 0 ? pastiglia(`${conto.falliti} non partite`, 'negativo', 'avviso') : null,
    conto.completo ? pastiglia('completo', 'positivo', 'spunta') : null,
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: 'Modifica il periodo',
      al: () => moduloBloccoAssenze(classe, blocco),
    }),
  )
}

/**
 * Le assenze da far firmare: l'elenco dei periodi e la matrice di quello aperto.
 *
 * Sta nel pannello del docente di classe accanto ai documenti perché è lo stesso
 * mestiere — riscuotere fogli da gente che ha altro da fare — ma è una pratica
 * sua: ha un periodo invece di una scadenza, un'azienda invece di una famiglia,
 * e finisce con una firma invece che con una spunta.
 */
export function schedaAssenze (classe: Classe) {
  const fascicolo = fascicoloDi(classe.id)
  // Del periodo scelto, come tutto il resto: un blocco che sta a cavallo di
  // gennaio riguarda tutti e due i semestri e resta in tutti e due — sparire da
  // entrambi sarebbe il modo di perderlo.
  const blocchi = toccaIlSemestreScelto([...fascicolo.assenze]).sort((a, b) =>
    b.dal.localeCompare(a.dal),
  )
  const allievi = ordinaAllievi(allieviAttivi(classe))
  const scelto =
    blocchi.find((b) => b.id === stato.bloccoAssenzeId) ?? blocchi[0] ?? null
  const conto = scelto ? avanzamentoAssenze(scelto) : null
  const pronte = scelto ? daSpedire(scelto) : []

  const spedisciTutte = async () => {
    if (!scelto) return
    const senzaIndirizzo = pronte.filter((riga) => {
      const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
      return !allievo || !raggiungibile(allievo)
    }).length
    const sicuro = await conferma({
      titolo: `Preparare ${pronte.length - senzaIndirizzo} richieste di firma?`,
      testo:
        'Una bozza per allievo, all’azienda, con dentro i suoi fogli. Finiscono tutte in ' +
        'una cartella che si apre da sé: le mandi una a una dal programma di posta.' +
        (senzaIndirizzo > 0
          ? `\n\n${senzaIndirizzo} restano indietro: manca l’indirizzo del datore di lavoro.`
          : ''),
      testoConferma: 'Prepara',
    })
    if (!sicuro) return
    await azione({
      tipo: 'assenze.invia',
      classeId: classe.id,
      bloccoId: scelto.id,
      allieviIds: [],
    })
  }

  return scheda({
    titolo: 'Assenze da far firmare',
    sottotitolo: 'un periodo per volta: i fogli che partono, la mail, le firme che tornano',
    azioni: [
      scelto
        ? pulsante({
            testo: 'Importa fogli',
            simbolo: 'esporta',
            variante: 'sottile',
            titolo: 'Prende una cartella di PDF e li assegna dal nome del file',
            al: () => moduloImportaAssenze(classe, scelto),
          })
        : null,
      scelto && pronte.length > 0
        ? pulsante({
            testo: `Spedisci le ${pronte.length} pronte`,
            simbolo: 'posta',
            variante: 'primario',
            al: () => spedisciTutte(),
          })
        : null,
      pulsante({
        testo: 'Nuovo periodo',
        simbolo: 'piu',
        variante: scelto ? 'sottile' : 'primario',
        al: () => moduloBloccoAssenze(classe),
      }),
    ].filter(Boolean),
    contenuto:
      blocchi.length === 0
        ? statoVuoto({
            simbolo: 'firma',
            titolo: 'Nessun periodo aperto',
            testo:
              'Un periodo tiene insieme le tre fasi: i fogli di assenze e ritardi che la ' +
              'scuola stampa, la mail che li manda in azienda con la richiesta di firma, e ' +
              'i fogli firmati che tornano indietro. Si comincia creandolo, poi si importano ' +
              'i PDF.',
            azione: pulsante({
              testo: 'Nuovo periodo',
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloBloccoAssenze(classe),
            }),
          })
        : h(
            'div',
            null,
            h(
              'ul',
              { class: 'elenco-documenti' },
              ...blocchi.map((blocco) => rigaPeriodo(classe, blocco, blocco.id === scelto?.id)),
            ),
            scelto && conto
              ? h(
                  'div',
                  null,
                  sintesiIncassata(
                    { etichetta: 'con assenze', valore: String(conto.interessati) },
                    {
                      etichetta: 'spediti',
                      valore: `${conto.inviate}/${conto.interessati}`,
                      tono: conto.inviate === conto.interessati ? 'positivo' : 'attenzione',
                    },
                    {
                      etichetta: 'firmati',
                      valore: `${conto.firmate}/${conto.interessati}`,
                      tono: conto.completo ? 'positivo' : 'attenzione',
                    },
                    conto.falliti > 0 ? { etichetta: 'non partite', valore: String(conto.falliti), tono: 'negativo' } : null,
                  ),
                  allievi.length === 0
                    ? h(
                        'p',
                        { class: 'testo-quieto' },
                        'La matrice compare quando la classe ha degli allievi che frequentano.',
                      )
                    : tabellaAssenze(classe, scelto, allievi),
                  righeVive(scelto).length === 0
                    ? h(
                        'p',
                        { class: 'campo__aiuto' },
                        'Nessun foglio caricato: «Importa fogli» ne prende una cartella intera e ' +
                          'assegna ciascuno dal nome del file; il « + » di una casella ne aggiunge uno solo.',
                      )
                    : null,
                )
              : null,
          ),
  })
}

// ------------------------------------------------- le richieste di firma nel todo

/**
 * Una richiesta di firma come riga d'elenco, per il todo.
 *
 * Nasce dal caricamento di un foglio e non da un gesto in più: appena i
 * rapporti della scuola entrano nel registro, quella pratica è un lavoro
 * aperto. Fin qui si vedeva solo aprendo la classe, e le richieste restavano
 * ferme per settimane senza che niente le reclamasse.
 *
 * Ha due gesti, e sono quelli che la chiudono: mandare la mail, e caricare il
 * foglio che torna firmato. Il secondo è la riconsegna di questa pratica, e sta
 * qui dentro come sta il campo della data in una prova da riconsegnare.
 */
function rigaRichiesta (richiesta: RichiestaFirma): HTMLElement {
  const partita = richiesta.fase === 'in-attesa'
  const chiusa = richiesta.fase === 'firmato'
  const etichetta = richiesta.errore
    ? { testo: 'non partita', tono: 'negativo' as const }
    : chiusa
      ? { testo: 'firmato', tono: 'positivo' as const }
      : partita
        ? { testo: 'in attesa della firma', tono: 'informativo' as const }
        : { testo: 'da spedire', tono: 'attenzione' as const }

  return h(
    'article',
    {
      class: [
        'richiesta',
        `richiesta--${richiesta.fase}`,
        richiesta.errore && 'richiesta--tardi',
      ],
    },
    h(
      'header',
      { class: 'richiesta__testata' },
      // Il nome porta alla matrice del periodo, che è dove il lavoro si fa: da
      // lì si carica un foglio, si rilegge la mail, si guarda tutta la classe.
      h(
        'button',
        {
          class: 'richiesta__allievo',
          attr: { type: 'button', title: 'Apri il periodo di quella classe' },
          onclick: () =>
            aggiorna({
              vista: 'docenteClasse',
              schedaDocente: 'assenze',
              filtroClasseId: richiesta.classeId,
            }),
        },
        nomeCompleto(richiesta.allievo),
      ),
      h(
        'span',
        { class: 'richiesta__dove testo-quieto' },
        `${richiesta.classe} · ${richiesta.periodo} · ${richiesta.tipi.join(' e ')}`,
      ),
      pastiglia(etichetta.testo, etichetta.tono),
      h(
        'div',
        { class: 'richiesta__azioni' },
        // Da spedire: si prepara la mail di quell'allievo, con i suoi fogli in
        // allegato. È lo stesso gesto della busta nella matrice.
        richiesta.fase === 'da-spedire'
          ? pulsante({
              testo: 'Prepara la mail',
              simbolo: 'posta',
              variante: 'sottile',
              al: () =>
                azione({
                  tipo: 'assenze.invia',
                  classeId: richiesta.classeId,
                  bloccoId: richiesta.bloccoId,
                  allieviIds: [richiesta.allievo.id],
                }),
            })
          : null,
        // In attesa: quel che chiude la pratica è il foglio che torna firmato,
        // e si carica da qui. Un tasto per rapporto, perché un'azienda può
        // rimandarne indietro uno solo e l'altro resta da avere.
        ...(partita
          ? richiesta.daFirmare.map((tipo) =>
              pulsante({
                testo: etichettaFoglio(tipo, true),
                simbolo: 'firma',
                variante: 'sottile',
                titolo: `Carica il foglio firmato di ${nomeCompleto(richiesta.allievo)}`,
                al: () =>
                  azione({
                    tipo: 'assenze.foglio.aggiungi',
                    classeId: richiesta.classeId,
                    bloccoId: richiesta.bloccoId,
                    allievoId: richiesta.allievo.id,
                    genere: tipo,
                    firmato: true,
                  }),
              }),
            )
          : []),
        // Il visto: la mail l'ha mandata chi sta davanti allo schermo, e lo
        // dice qui. Su una già partita lo stesso tasto la riporta da mandare.
        chiusa
          ? null
          : pulsante({
              simbolo: 'spunta',
              variante: partita ? 'sottile' : 'fantasma',
              titolo: partita
                ? 'Riporta da mandare: la mail non è partita'
                : 'Segna spedita: l’hai mandata dal programma di posta',
              al: () =>
                azione({
                  tipo: 'assenze.spunta',
                  classeId: richiesta.classeId,
                  bloccoId: richiesta.bloccoId,
                  allievoId: richiesta.allievo.id,
                  spedita: !partita,
                }),
            }),
      ),
    ),
    richiesta.errore
      ? h('p', { class: 'richiesta__guasto testo-negativo' }, richiesta.errore)
      : null,
  )
}

/** Un mucchio di richieste con il suo titolo, come i gruppi del todo. */
export function gruppoRichiesteFirma (titolo: string, righe: RichiestaFirma[]): Figlio {
  if (righe.length === 0) return null
  return h(
    'section',
    { class: 'riconsegne__gruppo' },
    titolo ? h('h4', { class: 'riconsegne__titolo' }, `${titolo} · ${righe.length}`) : null,
    ...righe.map((riga) => rigaRichiesta(riga)),
  )
}
