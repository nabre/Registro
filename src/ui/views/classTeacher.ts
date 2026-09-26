import { classeDelFascicolo } from '../context.js'
// Il pannello del docente di classe: documenti, recapiti, comunicazioni.
// Compare solo sulle classi segnate «sono docente di classe».

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import { destinatariComunicazione, fileDellaConsegna } from '../../domain/communications.js'
import {
  avanzamentoConsegna,
  consegneDocumento,
  daConsegnareA,
  documentoPer,
  haFatto,
  scadenzaConsegna,
  siConsegna,
  spuntaDi,
} from '../../domain/assignments.js'
import { Molti, Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { gestoDelClic } from '../../domain/check.js'
import { formattaData, giornoDi, oggi } from '../../domain/dates.js'
import {
  nomeFamiglia,
  todoDelDocenteDiClasse,
  type FamigliaTodo,
} from '../../domain/todo.js'
import { smistamentiDellaClasse } from '../../domain/sorting.js'
import { CHI_INSEGNA } from '../../domain/models.js'
import type { Allievo, Classe, Comunicazione, Consegna } from '../../domain/models.js'
import {
  collegamento,
  conAttesa,
  pastiglia,
  pulsante,
  quieto,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { sintesiIncassata } from '../components/filters.js'
import { recapitoPremibile } from '../components/contacts.js'
import { icona } from '../components/icons.js'
import { menuContestuale } from '../components/menu.js'
import { conferma } from '../components/modal.js'
import { h } from '../dom.js'
import { tabella } from '../components/table.js'
import { cellaNome } from '../components/avatar.js'
import { moduloComunicazione, moduloConsegna, moduloRecapito } from '../forms.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  classiDiCuiSonoDocente,
  corsiDi,
  fascicoloDi,
  nelSemestreScelto,
  nelSemestreSceltoPer,
  nomeSemestreScelto,
  stato,
} from '../state.js'
import {
  aperto,
  corniceArchivio,
  guardaNellArchivio,
  indiceAperto,
  pannelloArchivio,
  righeArchivio,
  type RigaArchivio,
} from './archive.js'
import { schedaAssenze } from './absences.js'
import { accettaPagine, accettaPagineFirme, accettaPagineSullaRiga } from './pageDrop.js'
import { codaLettura, comandiDelPdf, pdfDaDividere, rendiBersaglio } from './sorting.js'
import { riassuntoClasse, sezioniTodoClasse } from './classTodo.js'
import { testi } from './classTeacher.testi.js'

/**
 * Il posto del cestino quando non c'è niente da buttare: tiene incolonnati i
 * segni della matrice. Uno spazio finto e non un pulsante spento, che sarebbe
 * raggiungibile da tastiera e letto dai lettori di schermo.
 */
function postoDelCestino () {
  return h(
    'span',
    {
      class: 'pulsante pulsante--fantasma pulsante--solo-icona cella-documento__modifica cella-documento__modifica--posto',
      attr: { 'aria-hidden': 'true' },
    },
    icona('cestino'),
  )
}

/**
 * Gli elenchi di destinatari già mandati e non ancora tornati dall'host.
 * `consegna` resta quella del ridisegno finché l'host non rispinge il registro,
 * e `consegna.salva` rimpiazza il record intero: due «+» di fila perderebbero
 * il primo nome. Si riparte quindi da quel che si è mandato. Il ricordo è per
 * documento e si lascia andare quando il ridisegno contiene già tutto il
 * mandato, o quando la scrittura è respinta.
 */
const destinatariMandati = new Map<string, string[]>()

/** Scorda quel che si era mandato: al cambio di documento non vale più. */
export function scordaDestinatariMandati (): void {
  destinatariMandati.clear()
}

/**
 * L'elenco dei destinatari con dentro anche questa persona, a partire da quel
 * che si è già mandato.
 */
function destinatariCon (consegna: Consegna, allievoId: string): string[] {
  const mandati = destinatariMandati.get(consegna.id)
  const arrivato = !mandati || mandati.every((id) => consegna.allieviIds.includes(id))
  if (arrivato) destinatariMandati.delete(consegna.id)
  const partenza = arrivato ? consegna.allieviIds : mandati
  return partenza.includes(allievoId) ? [...partenza] : [...partenza, allievoId]
}

/** Il giorno di oggi, per dire se un termine è passato. */
function scaduta (consegna: Consegna): boolean {
  const termine = scadenzaConsegna(stato.registro, consegna)
  return termine !== null && termine < stato.adessoData
}

/**
 * Una cella della matrice: quel documento, quella persona. Due bottoni per due
 * fatti indipendenti: a sinistra il gesto (portato / consegnato), a destra il
 * file (la scansione o la copia da consegnare).
 */
function cellaDocumento (consegna: Consegna, allievo: Allievo) {
  const tocca = consegna.a === 'classe' || consegna.allieviIds.includes(allievo.id)
  const t = testi()

  if (!tocca) {
    return h(
      'td',
      { class: 'tabella__cella' },
      h(
        'button',
        {
          class: 'cella-documento cella-documento--fuori',
          type: 'button',
          attr: { title: t.chiediloAnche(consegna.testo, nomeCompleto(allievo)) },
          onclick: (evento: MouseEvent) => {
            const destinatari = destinatariCon(consegna, allievo.id)
            destinatariMandati.set(consegna.id, destinatari)
            void conAttesa(
              evento.currentTarget as HTMLButtonElement,
              azione({
                tipo: 'consegna.salva',
                consegna: { ...consegna, a: 'allievi', allieviIds: destinatari },
              }).then((esito) => {
                if (!esito.ok) destinatariMandati.delete(consegna.id)
                return esito
              }),
            )
          },
        },
        icona('piu', 'icona--minuta'),
      ),
    )
  }

  const consegno = siConsegna(consegna)
  const spunta = spuntaDi(consegna, allievo.id)
  const fatto = spunta !== null
  const documento = documentoPer(consegna, allievo.id)
  const inRitardo = !fatto && scaduta(consegna)

  // Il clic segue la regola del check (`gestoDelClic`): vuota si spunta,
  // spuntata oggi si toglie, spuntata un altro giorno col clic non si tocca. Il
  // giorno è quello di `fattaIl`; un istante illeggibile vale «un altro giorno».
  const alClic = gestoDelClic(spunta ? (giornoDi(spunta.fattaIl) ?? '') : null, oggi())
  const cambia = (bottone: HTMLButtonElement, fai: boolean): void =>
    void conAttesa(
      bottone,
      azione(
        consegno
          ? { tipo: 'consegna.consegnato', consegnaId: consegna.id, allievoId: allievo.id, fatta: fai }
          : { tipo: 'consegna.spunta', consegnaId: consegna.id, chi: allievo.id, fatta: fai },
      ),
    )

  const fattoCome = consegno
    ? (spunta?.modo === 'email' ? t.consegnatoPerEmail : t.consegnatoAMano)
    : t.portato
  const titoloGesto = fatto
    ? t.fattoIl(fattoCome, formattaData(giornoDi(spunta?.fattaIl) ?? '', 'lungo')) +
      (alClic === 'togli' ? t.clicPerTogliere : t.clicNonCambia)
    : consegno
      ? t.segnaConsegnatoA(nomeCompleto(allievo))
      : t.segnaPortatoDa(nomeCompleto(allievo))

  const gesto = h(
    'button',
    {
      class: [
        'cella-documento',
        fatto
          ? 'cella-documento--consegnato'
          : inRitardo
            ? 'cella-documento--scaduto'
            : 'cella-documento--atteso',
      ],
      type: 'button',
      attr: { title: titoloGesto, 'aria-haspopup': 'menu' },
      onclick: (evento: MouseEvent) => {
        if (alClic === null) return
        cambia(evento.currentTarget as HTMLButtonElement, alClic === 'spunta')
      },
      oncontextmenu: (evento: MouseEvent) => {
        const bottone = evento.currentTarget as HTMLButtonElement
        menuContestuale(evento, [
          { titolo: nomeCompleto(allievo) },
          fatto
            ? {
                testo: t.togliLaSpunta,
                simbolo: 'chiudi',
                pericolo: true,
                al: () => cambia(bottone, false),
              }
            : {
                testo: consegno ? t.segnaConsegnato : t.segnaPortato,
                simbolo: 'spunta',
                al: () => cambia(bottone, true),
              },
        ], bottone)
      },
    },
    icona(fatto ? 'spunta' : inRitardo ? 'avviso' : 'utente', 'icona--minuta'),
  )

  // La casella con il foglio lo apre nella cornice accanto; il programma del
  // sistema resta a un clic in testa alla cornice.
  const titoloFile = documento
    ? t.guardaDocumentoDi(documento.nome, nomeCompleto(allievo))
    : consegno
      ? t.allegaDaConsegnare(nomeCompleto(allievo))
      : t.allegaScansione(nomeCompleto(allievo))

  const file = h(
    'button',
    {
      class: [
        'cella-documento',
        documento ? 'cella-documento--file' : 'cella-documento--senza-file',
        documento && aperto(documento.file) && 'cella-documento--aperta',
      ],
      type: 'button',
      attr: { title: titoloFile },
      onclick: (evento: MouseEvent) => {
        if (documento) {
          guardaNellArchivio(documento.file)
          return
        }
        void conAttesa(
          evento.currentTarget as HTMLButtonElement,
          azione({
            tipo: 'consegna.documento.allega',
            consegnaId: consegna.id,
            allievoId: allievo.id,
          }),
        )
      },
    },
    icona(documento ? 'documento' : 'allegato', 'icona--minuta'),
  )

  const gruppo = h(
    'div',
    { class: 'cella-documento__gruppo' },
    gesto,
    file,
    documento
      ? pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: t.togliDocumentoDi(nomeCompleto(allievo)),
          classe: 'cella-documento__modifica',
          al: () =>
            azione({
              tipo: 'consegna.documento.togli',
              consegnaId: consegna.id,
              allievoId: allievo.id,
            }),
        })
      : postoDelCestino(),
  )

  // La colonna sta scritta sulla cella: quando le pagine si lasciano sulla riga,
  // è così che la riga trova la casella da accendere.
  const cella = h('td', {
    class: 'tabella__cella tabella__cella--pagine',
    dataset: { consegna: consegna.id },
  }, gruppo)

  // Qui cadono le pagine prese dallo sfoglio: la casella è l'incrocio persona ×
  // documento. È bersaglio anche dove il documento c'è già, perché l'host rifiuta
  // e lo dice. Il bersaglio è la cella intera, non i pulsanti dentro: i margini
  // farebbero cadere il rilascio nel vuoto.
  accettaPagine(cella, {
    consegnaId: consegna.id,
    allievoId: allievo.id,
    etichetta: `${nomeCompleto(allievo)} · ${consegna.testo}`,
  })

  return cella
}

/**
 * La casella delle firme di una colonna: il foglio che prova la distribuzione.
 * Vuota dove le firme non si chiedono e sulle richieste che si raccolgono.
 */
function cellaFirme (consegna: Consegna) {
  if (consegna.verso !== 'consegno' || !consegna.firmeRichieste) {
    return h('td', { class: 'tabella__cella' })
  }

  const allegate = Boolean(consegna.fileFirme)
  const t = testi()
  const cella = h(
    'td',
    { class: 'tabella__cella tabella__cella--pagine', dataset: { consegna: consegna.id } },
    h(
      'div',
      { class: 'cella-documento__gruppo' },
      h(
        'button',
        {
          class: [
            'cella-documento',
            allegate ? 'cella-documento--consegnato' : 'cella-documento--atteso',
            allegate && consegna.fileFirme && aperto(consegna.fileFirme) && 'cella-documento--aperta',
          ],
          type: 'button',
          attr: {
            title: allegate
              ? t.guardaFoglioFirme(consegna.testo)
              : t.allegaFoglioFirme(consegna.testo),
          },
          onclick: (evento: MouseEvent) => {
            if (allegate && consegna.fileFirme) {
              guardaNellArchivio(consegna.fileFirme)
              return
            }
            void conAttesa(
              evento.currentTarget as HTMLButtonElement,
              azione({ tipo: 'consegna.firme.aggiungi', consegnaId: consegna.id }),
            )
          },
        },
        icona(allegate ? 'firma' : 'documento', 'icona--minuta'),
      ),
      allegate
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: t.togliFoglioFirme,
            classe: 'cella-documento__modifica',
            al: () => azione({ tipo: 'consegna.firme.togli', consegnaId: consegna.id }),
          })
        : postoDelCestino(),
    ),
  )

  // Anche qui cadono le pagine: il foglio firme arriva nella stessa scansione.
  accettaPagineFirme(cella, {
    consegnaId: consegna.id,
    etichetta: t.foglioFirmeDi(consegna.testo),
  })

  return cella
}

/**
 * La riga delle firme in cima alla matrice: una casella per ogni documento che
 * le chiede. Prende pagine come le righe delle persone; dove il PDF non è
 * agganciato a una richiesta con firme, lo dice il cursore prima del rilascio.
 */
function rigaFirme (raccolte: Consegna[]) {
  const riga = h(
    'tr',
    { class: 'tabella__riga-firme' },
    h('td', { class: 'tabella__nome' }, testi().firmeDiConsegna),
    ...raccolte.map((consegna) => cellaFirme(consegna)),
    h('td', { class: 'tabella__media' }, h('span', { class: 'testo-quieto' }, '—')),
  )
  accettaPagineSullaRiga(riga, { tipo: 'firme' })
  return riga
}

/**
 * La matrice: allievi in riga, documenti chiesti in colonna. Le colonne sono
 * consegne come le altre, lette in questa forma quando si spunta un foglio.
 */
function tabellaDocumenti (classe: Classe, raccolte: Consegna[], allievi: Allievo[]) {
  const t = testi()
  const L = lessico()
  return tabella({
    variante: 'documenti',
    griglia: true,
    // testo-fisso: la chiave con cui si ricorda lo scorrimento, non si legge
    scorrimento: `documenti-classe:${classe.id}`,
    intestazione: [
      h('th', { class: 'tabella__nome' }, Uno(L.pif)),
      ...raccolte.map((consegna) => {
        const avanzamento = avanzamentoConsegna(consegna, classe)
        const termine = scadenzaConsegna(stato.registro, consegna)
        return h(
          'th',
          { class: 'tabella__richiesta' },
          collegamento({
            titolo:
              `${consegna.testo} — ${consegna.documento ?? L.documento.singolare}` +
              (termine ? t.entro(formattaData(termine)) : '') +
              `\n${t.apriLaConsegna}`,
            al: () => moduloConsegna({ consegna }),
            testo: [
              h('span', { class: 'tabella__richiesta-titolo' }, consegna.testo),
              h(
                'small',
                { class: scaduta(consegna) && !avanzamento.completa ? 'testo-negativo' : undefined },
                `${avanzamento.fatte}/${avanzamento.destinatari.length}` +
                  (termine ? ` · ${formattaData(termine, 'corto')}` : ''),
              ),
            ],
          }),
          // La spedizione sta in testa alla colonna: manda un messaggio con il documento
          // a ciascuno di chi aspetta ancora.
          siConsegna(consegna) &&
          consegna.modoConsegna === 'email' &&
          daConsegnareA(consegna, classe).length > 0
            ? pulsante({
                testo: t.preparaInvioN(daConsegnareA(consegna, classe).length),
                simbolo: 'posta',
                variante: 'sottile',
                classe: 'tabella__spedisci',
                titolo: t.preparaPerOgnuno,
                al: async () => {
                  const quanti = daConsegnareA(consegna, classe).length
                  const sicuro = await conferma({
                    titolo: t.preparareLeBozze(quanti),
                    testo: t.bozzeATesta,
                    testoConferma: t.prepara,
                  })
                  if (!sicuro) return
                  await azione({ tipo: 'consegna.distribuisci', consegnaId: consegna.id })
                },
              })
            : null,
        )
      }),
      h('th', { class: 'tabella__media' }, t.suoi),
    ],
    righe: [
      // Le firme di consegna stanno in cima, prima dei nomi: riguardano tutta la
      // colonna. Le colonne che non le chiedono restano vuote.
      raccolte.some((c) => c.verso === 'consegno' && c.firmeRichieste)
        ? rigaFirme(raccolte)
        : null,
      ...allievi.map((allievo) => {
        const suoi = raccolte.filter(
          (c) => c.a === 'classe' || c.allieviIds.includes(allievo.id),
        )
        const portati = suoi.filter((c) => haFatto(c, allievo.id)).length
        const riga = h(
          'tr',
          null,
          h('th', { class: 'tabella__nome', attr: { scope: 'row' } }, cellaNome(allievo, nomeCompleto(allievo))),
          ...raccolte.map((consegna) => cellaDocumento(consegna, allievo)),
          h(
            'td',
            { class: 'tabella__media' },
            suoi.length === 0
              ? h('span', { class: 'testo-quieto' }, '—')
              : pastiglia(
                  `${portati}/${suoi.length}`,
                  portati === suoi.length ? 'positivo' : 'attenzione',
                ),
          ),
        )

        // Tutta la riga prende le pagine quando il PDF sa già il suo documento; la
        // casella resta per archiviare in un'altra colonna.
        accettaPagineSullaRiga(riga, {
          tipo: 'persona',
          allievoId: allievo.id,
          chi: nomeCompleto(allievo),
        })
        return riga
      }),
    ],
  })
}

/** Una raccolta «a me»: la circolare, il modulo da tenere da parte. */
function rigaRaccoltaMia (consegna: Consegna) {
  const dato = fileDellaConsegna(consegna)
  const t = testi()
  return h(
    'li',
    { class: ['documento', dato && aperto(dato.file) && 'documento--aperto'] },
    h(
      'button',
      {
        class: 'documento__titolo',
        type: 'button',
        attr: { title: dato ? t.guarda(dato.nome) : t.nonAncoraRaccolto },
        onclick: (evento: MouseEvent) => {
          if (dato) {
            guardaNellArchivio(dato.file)
            return
          }
          void conAttesa(
            evento.currentTarget as HTMLButtonElement,
            azione({ tipo: 'consegna.raccogli', consegnaId: consegna.id, chi: CHI_INSEGNA }),
          )
        },
      },
      icona('documento', 'icona--minuta'),
      h('span', null, consegna.testo),
    ),
    h('span', { class: 'documento__categoria testo-quieto' }, consegna.documento ?? ''),
    dato ? pastiglia(t.raccolto, 'positivo', 'spunta') : pastiglia(t.atteso, 'attenzione'),
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: t.apriLaConsegna,
      al: () => moduloConsegna({ consegna }),
    }),
  )
}

/**
 * I documenti della classe: la matrice di quel che si è chiesto agli allievi e,
 * sopra, le raccolte proprie. Sono le consegne del Todo che si spuntano con un foglio.
 */
function schedaDocumenti (classe: Classe, raccolte: Consegna[], righe: RigaArchivio[]) {
  const corsi = corsiDi(classe.id)
  const allievi = ordinaAllievi(allieviAttivi(classe))
  const mie = raccolte.filter((c) => c.a === 'docente')
  const loro = raccolte.filter((c) => c.a !== 'docente')
  const attesi = loro.reduce((somma, consegna) => {
    const avanzamento = avanzamentoConsegna(consegna, classe)
    return somma + (avanzamento.destinatari.length - avanzamento.fatte)
  }, 0)
  const scadute = loro.filter((c) => scaduta(c) && !avanzamentoConsegna(c, classe).completa).length
  // I PDF ancora da dividere stanno nello stesso elenco (lo scorrono le frecce
  // dell'anteprima) ma non si contano fra i raccolti.
  const raccolti = righe.filter((riga) => riga.genere !== 'smistamento').length
  const t = testi()

  return scheda({
    titolo: t.chiHaPortato,
    sottotitolo: nomeSemestreScelto(),
    aiuto: t.inRigaInColonna,
    contenuto:
      corsi.length === 0
        ? h('p', { class: 'testo-quieto' }, t.senzaCorsi)
        : h(
            'div',
            null,
            // «Raccolti» dice quel che si ha in mano; «Scadute» per ultimo perché è
            // l'unico che chiede di fare qualcosa oggi.
            sintesiIncassata(
              { etichetta: t.richieste, valore: String(loro.length) },
              { etichetta: t.personali, valore: String(mie.length) },
              {
                etichetta: t.fogliRaccolti,
                valore: String(raccolti),
                tono: raccolti > 0 ? 'positivo' : 'quiete',
              },
              {
                etichetta: t.inAttesa,
                valore: String(attesi),
                tono: attesi > 0 ? 'attenzione' : 'positivo',
              },
              scadute > 0
                ? { etichetta: t.scadute, valore: String(scadute), tono: 'negativo' as const }
                : null,
            ),
            mie.length > 0
              ? h(
                  'div',
                  null,
                  h('h5', { class: 'blocco-testo__titolo' }, t.documentiPersonali),
                  h('ul', { class: 'elenco-documenti' }, ...mie.map(rigaRaccoltaMia)),
                )
              : null,
            loro.length === 0 || allievi.length === 0
              ? statoVuoto({
                  simbolo: 'documento',
                  titolo: loro.length === 0 ? t.nessunDocumento : t.classeVuota,
                  testo: loro.length === 0 ? t.comeSiChiede : t.matriceQuando,
                })
              : tabellaDocumenti(classe, loro, allievi),
          ),
  })
}

/**
 * Il todo di questa classe: le stesse quattro famiglie della pagina Todo
 * (assenze da firmare, prove e recuperi, documenti, attività), lette dallo
 * stesso posto. Una todo nuova nasce agganciata a questa classe.
 */
const FAMIGLIE_DOCENTE_CLASSE: readonly FamigliaTodo[] = [
  'assenze',
  'segnalazioni',
  'consegnaClasse',
  'svolgeClasse',
]

function schedaTodo (classe: Classe) {
  const corsi = corsiDi(classe.id)
  const todo = todoDelDocenteDiClasse(stato.registro, classe, corsi, stato.adessoData)
  const t = testi()

  return scheda({
    titolo: Molti(lessico().pendenza),
    // Il sottotitolo riassume il lavoro della classe ancora aperto.
    sottotitolo: todo.aperti === 0 ? t.nienteInClasse : riassuntoClasse(todo),
    contenuto:
      corsi.length === 0 && todo.aperti === 0
        ? h('p', { class: 'testo-quieto' }, t.primaUnCorso)
        : todo.aperti === 0
          ? statoVuoto({
              simbolo: 'spunta',
              titolo: t.nienteInSospeso,
              testo: t.cheCosaCompare,
            })
          : h(
              'div',
              { class: 'todo-classe__corpo' },
              sintesiIncassata(
                ...FAMIGLIE_DOCENTE_CLASSE.map((famiglia) => ({
                  etichetta: t.etichettaFamiglia(nomeFamiglia(famiglia)),
                  valore: String(todo.conti[famiglia].aperti),
                  tono:
                    todo.conti[famiglia].urgenti > 0
                      ? ('negativo' as const)
                      : todo.conti[famiglia].aperti > 0
                        ? ('attenzione' as const)
                        : ('quiete' as const),
                })),
              ),
              ...sezioniTodoClasse(todo),
            ),
  })
}

function schedaRecapiti (classe: Classe) {
  const fascicolo = fascicoloDi(classe.id)
  const conMail = classe.allievi.filter((a) => a.attivo && (a.email || a.emailTutore)).length
  const attivi = allieviAttivi(classe).length
  const t = testi()

  return scheda({
    titolo: t.recapiti,
    aiuto: t.aiutoRecapiti,
    contenuto: h(
      'div',
      null,
      sintesiIncassata(
        {
          etichetta: t.raggiungibili,
          valore: `${conMail}/${attivi}`,
          tono: conMail === attivi ? 'positivo' : 'attenzione',
        },
        { etichetta: t.recapitiFissi, valore: String(fascicolo.recapiti.length) },
      ),
      fascicolo.recapiti.length === 0
        ? quieto(t.nessunRecapito)
        : h(
            'ul',
            { class: 'elenco-recapiti' },
            ...fascicolo.recapiti.map((recapito) =>
              h(
                'li',
                { class: 'recapito' },
                h('strong', null, recapito.etichetta),
                recapitoPremibile('email', recapito.email, 'testo-quieto'),
                recapito.predefinito ? pastiglia(t.predefinito, 'informativo') : null,
                pulsante({
                  simbolo: 'matita',
                  variante: 'fantasma',
                  titolo: t.modificaRecapito,
                  al: () => moduloRecapito(classe, recapito),
                }),
              ),
            ),
          ),
    ),
  })
}

function rigaComunicazione (classe: Classe, comunicazione: Comunicazione) {
  const { indirizzi } = destinatariComunicazione(classe, fascicoloDi(classe.id), comunicazione)
  const tono =
    comunicazione.stato === 'inviata' ? 'positivo' : comunicazione.stato === 'errore' ? 'negativo' : 'quiete'
  const t = testi()

  return h(
    'li',
    { class: 'comunicazione' },
    h(
      'button',
      {
        class: 'comunicazione__oggetto',
        type: 'button',
        onclick: () => moduloComunicazione(classe, comunicazione),
      },
      h('strong', null, comunicazione.oggetto || t.senzaOggetto),
      h(
        'small',
        null,
        comunicazione.stato === 'inviata'
          ? t.inviata(
              formattaData(giornoDi(comunicazione.inviataIl) ?? ''),
              comunicazione.destinatari.length,
            )
          : t.bozza(indirizzi.length),
      ),
    ),
    pastiglia(t.stati[comunicazione.stato] ?? comunicazione.stato, tono),
    // «Apri» scrive la bozza nel programma di posta; la spunta dice che è partita.
    // Due gesti perché succedono in due momenti.
    comunicazione.stato === 'inviata'
      ? null
      : pulsante({
          testo: t.preparaInvio,
          simbolo: 'posta',
          variante: 'sottile',
          titolo: t.preparaSecondoImpostazioni,
          al: () =>
            azione({ tipo: 'comunicazione.invia', classeId: classe.id, comunicazioneId: comunicazione.id }),
        }),
    pulsante({
      simbolo: 'spunta',
      variante: comunicazione.stato === 'inviata' ? 'sottile' : 'fantasma',
      titolo:
        comunicazione.stato === 'inviata'
          ? t.riportaABozza
          : t.segnaSpedita,
      al: () =>
        azione({
          tipo: 'comunicazione.spunta',
          classeId: classe.id,
          comunicazioneId: comunicazione.id,
          spedita: comunicazione.stato !== 'inviata',
        }),
    }),
  )
}

function schedaComunicazioni (classe: Classe) {
  // Del periodo scelto, per data di nascita della comunicazione (non d'invio).
  const comunicazioni = nelSemestreSceltoPer(
    [...fascicoloDi(classe.id).comunicazioni],
    (c) => c.creataIl,
  ).sort((a, b) => b.creataIl.localeCompare(a.creataIl))
  const t = testi()

  return scheda({
    titolo: Molti(lessico().comunicazione),
    sottotitolo: nomeSemestreScelto(),
    aiuto: t.aiutoComunicazioni,
    contenuto:
      comunicazioni.length === 0
        ? h('p', { class: 'testo-quieto' }, t.nessunaComunicazione)
        : h(
            'ul',
            { class: 'elenco-comunicazioni' },
            ...comunicazioni.map((c) => rigaComunicazione(classe, c)),
          ),
  })
}

/**
 * L'archivio documentale della classe: la matrice, la riga dei PDF da dividere
 * e, aprendone uno, le sue pagine nella cornice accanto (non sopra: la matrice
 * è il bersaglio e deve restare in vista). Tutta la pagina è bersaglio per i
 * PDF trascinati da fuori.
 */
function archivioDocumentale (classe: Classe) {
  const corsi = corsiDi(classe.id)
  // Del periodo scelto, come tutto il resto del registro.
  const raccolte = nelSemestreScelto(consegneDocumento(stato.registro, corsi))
  const daDividere = smistamentiDellaClasse(
    stato.registro.smistamenti,
    classe.id,
    raccolte.map((c) => c.id),
  )
  const allievi = ordinaAllievi(allieviAttivi(classe))
  const righe = righeArchivio(raccolte, allievi, daDividere)
  const indice = indiceAperto(righe)

  const pannello = pannelloArchivio(
    [
      pdfDaDividere(classe),
      // La coda di lettura compare qui solo quando nessun PDF è aperto: altrimenti
      // sta fra le pagine.
      indice >= 0 ? null : codaLettura(),
      schedaDocumenti(classe, raccolte, righe),
    ],
    indice >= 0
      ? corniceArchivio(righe, indice, allievi, raccolte, comandiDelPdf, codaLettura)
      : null,
    // testo-fisso: la chiave dell'archivio aperto, non si legge
    `archivio:${classe.id}`,
  )
  rendiBersaglio(pannello, classe)
  return pannello
}

/**
 * Il pannello intero in quattro schede, una per ritmo di lavoro: todo, documenti
 * (con quel che resta da smistare), assenze, messaggi (con i recapiti).
 */
function pannelloDocenteClasse (classe: Classe) {
  if (!classe.docenteDiClasse) return null
  // Si rilegge dallo stato: la classe passata può essere una copia di un ridisegno vecchio.
  const corrente = stato.registro.classi.find((c) => c.id === classe.id) ?? classe

  return h(
    'div',
    { class: 'docente-classe' },
    stato.schedaDocente === 'todo' ? schedaTodo(corrente) : null,
    // Figli diretti e non in un contenitore: lo stacco fra le schede lo dà la
    // colonna, e un `div` in mezzo lo annullerebbe.
    stato.schedaDocente === 'documenti' ? archivioDocumentale(corrente) : null,
    stato.schedaDocente === 'assenze' ? schedaAssenze(corrente) : null,
    stato.schedaDocente === 'messaggistica'
      ? h('div', { class: 'docente-classe__messaggi' }, schedaComunicazioni(corrente), schedaRecapiti(corrente))
      : null,
  )
}

/**
 * La sezione del docente di classe: una classe alla volta, con la sua porta
 * nella barra laterale. La vista Classi resta per chi c'è e come va.
 */
export function vistaDocenteClasse () {
  const classi = classiDiCuiSonoDocente()
  const t = testi()
  if (classi.length === 0) {
    return statoVuoto({
      simbolo: 'posta',
      titolo: t.nessunaClasse,
      testo: t.comeCompare,
      azione: pulsante({
        testo: t.vaiAlleClassi,
        variante: 'primario',
        simbolo: 'classi',
        al: () => aggiorna({ vista: 'classi' }),
      }),
    })
  }

  // Lo stesso contesto del selettore in alto: solo classi dell'anno corrente.
  const classe = classeDelFascicolo() ?? classi[0]
  const pagina = t.pagine[stato.schedaDocente]

  return h(
    'div',
    { class: 'vista vista--docente-classe' },
    testataVista({
      titolo: pagina.titolo,
      sottotitolo: classe.nome,
      aiuto: pagina.aiuto,
    }),
    pannelloDocenteClasse(classe),
  )
}
