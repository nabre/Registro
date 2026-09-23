import { classeDelFascicolo } from '../context.js'
// Il pannello del docente di classe: documenti, recapiti, comunicazioni.
//
// Compare solo sulle classi in cui si spunta «sono docente di classe», perché
// per le altre sarebbe rumore: chi insegna e basta non raccoglie certificati e
// non scrive alle famiglie.
//
// Il filo che tiene insieme le tre parti è uno solo — chi ha consegnato, chi si
// raggiunge, che cosa è stato detto — e sono le tre domande a cui un docente di
// classe deve saper rispondere in due secondi.

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
import { CARTE, PIF, Molti, Uno } from '../../domain/lexicon.js'
import { formattaData, giornoDi } from '../../domain/dates.js'
import {
  FAMIGLIE_TODO,
  nomeFamiglia,
  todoDellaClasse,
} from '../../domain/todo.js'
import { smistamentiDellaClasse } from '../../domain/sorting.js'
import { CHI_INSEGNA } from '../../domain/models.js'
import type { Allievo, Classe, Comunicazione, Consegna } from '../../domain/models.js'
import {
  conAttesa,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { sintesiIncassata } from '../components/filters.js'
import { recapitoPremibile } from '../components/contacts.js'
import { icona } from '../components/icons.js'
import { conferma } from '../components/modal.js'
import { h } from '../dom.js'
import { tabella } from '../components/table.js'
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
import { accettaPagine, accettaPagineFirme, accettaPagineSullaRiga } from './pageBrowser.js'
import { codaLettura, comandiDelPdf, pdfDaDividere, rendiBersaglio } from './sorting.js'
import { riassuntoClasse, sezioniTodoClasse } from './classTodo.js'

/**
 * Il posto del cestino, quando non c'è niente da buttare.
 *
 * Le caselle della matrice stanno in colonna, e una colonna si legge se i
 * segni sono incolonnati. Il cestino compare solo dove c'è un file da
 * togliere: senza un segnaposto della sua misura, la casella accanto scivola
 * di dieci pixel e la griglia si legge storta — proprio la griglia il cui
 * mestiere è far vedere a colpo d'occhio chi manca.
 *
 * È un pulsante finto e non un pulsante spento: un pulsante disabilitato
 * resta un bersaglio per chi naviga a tastiera e viene letto dai lettori di
 * schermo, e qui non c'è niente da annunciare — c'è solo dello spazio.
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
 * Gli elenchi di destinatari già mandati e non ancora tornati indietro.
 *
 * `consegna` è quel che ha disegnato la casella, e resta fermo finché l'host
 * non rispinge il registro: fra il clic e quella spinta passa un giro di IPC.
 * Premendo il «+» di due persone di fila, il secondo clic ripartiva
 * dall'elenco del ridisegno di prima — quello senza il primo nome — e
 * `consegna.salva` rimpiazza il record intero: la prima persona spariva in
 * silenzio, senza errori e senza che niente lo dicesse. È lo stesso difetto
 * già corretto sulla casella dell'appello, su un'altra superficie.
 *
 * Si riparte quindi da quel che si è mandato, non da quel che si vede. Lì il
 * ricordo stava in una chiusura e moriva col ridisegno; qui le caselle sono
 * due diverse e il ricordo dev'essere del documento, non della casella, quindi
 * si dice a mano quando lasciarlo andare: quando il ridisegno porta un elenco
 * che contiene già tutto quel che si è mandato — la scrittura è arrivata — e
 * quando viene respinta, perché allora l'unica cosa che sa la verità è il
 * ridisegno.
 */
const destinatariMandati = new Map<string, string[]>()

/**
 * Scorda quel che si era mandato: cambiato documento, erano consegne di un
 * altro registro, e il ricordo non deve sopravvivere al registro di cui parla.
 */
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
 * Una cella della matrice: quel documento, quella persona.
 *
 * Due bottoni, perché i fatti sono due e non coincidono mai del tutto. A
 * sinistra il gesto — l'ha portato, gliel'ho dato — che è quel che si spunta in
 * aula passando fra i banchi. A destra il file: la scansione di quel che ha
 * portato, o la copia che gli si consegnerà. Uno può esserci senza l'altro, ed è
 * la situazione normale: Rossi mi ha dato il certificato stamattina e lo
 * scansionerò stasera; la pagella di Bianchi è pronta da tre giorni e gliela do
 * lunedì.
 */
function cellaDocumento (consegna: Consegna, allievo: Allievo) {
  const tocca = consegna.a === 'classe' || consegna.allieviIds.includes(allievo.id)

  if (!tocca) {
    return h(
      'td',
      { class: 'tabella__cella' },
      h(
        'button',
        {
          class: 'cella-documento cella-documento--fuori',
          type: 'button',
          attr: { title: `«${consegna.testo}»: chiedilo anche a ${nomeCompleto(allievo)}` },
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

  const titoloGesto = fatto
    ? consegno
      ? `Consegnato${spunta?.modo === 'email' ? ' per e-mail' : ' a mano'} — togli la spunta`
      : 'Portato — togli la spunta'
    : consegno
      ? `Segna che l’hai consegnato a ${nomeCompleto(allievo)}`
      : `Segna che ${nomeCompleto(allievo)} l’ha portato`

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
      attr: { title: titoloGesto },
      onclick: (evento: MouseEvent) =>
        void conAttesa(
          evento.currentTarget as HTMLButtonElement,
          azione(
            consegno
              ? { tipo: 'consegna.consegnato', consegnaId: consegna.id, allievoId: allievo.id, fatta: !fatto }
              : { tipo: 'consegna.spunta', consegnaId: consegna.id, chi: allievo.id, fatta: !fatto },
          ),
        ),
    },
    icona(fatto ? 'spunta' : inRitardo ? 'avviso' : 'utente', 'icona--minuta'),
  )

  // La casella con il foglio lo apre nella cornice qui accanto, e non nel
  // lettore del sistema: la domanda dopo «chi ha portato» è «che cosa ha
  // portato», e fin qui costava una finestra per foglio da ritrovare nella
  // barra delle applicazioni. Il programma del sistema resta a un clic, in
  // testa alla cornice, per chi deve annotarlo o stamparlo.
  const titoloFile = documento
    ? `Guarda ${documento.nome || 'il documento'} di ${nomeCompleto(allievo)}`
    : consegno
      ? `Allega il documento da consegnare a ${nomeCompleto(allievo)}`
      : `Allega la scansione di ${nomeCompleto(allievo)}`

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
          titolo: `Togli il documento di ${nomeCompleto(allievo)}`,
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

  // La colonna sta scritta sulla cella: quando le pagine si lasciano sulla riga
  // — e la colonna la dice il PDF — è così che la riga trova la casella da
  // accendere, e chi trascina vede dove finiranno prima di lasciare.
  const cella = h('td', {
    class: 'tabella__cella tabella__cella--pagine',
    dataset: { consegna: consegna.id },
  }, gruppo)

  // Qui cadono le pagine prese dallo sfoglio del PDF da dividere: questa
  // casella è l'incrocio fra una persona e un documento, cioè esattamente le
  // due cose che servono per archiviare un ritaglio. È bersaglio anche dove il
  // documento c'è già: l'host rifiuta e lo dice — «ha già un documento:
  // toglierlo prima» — e una casella che non reagisce lascerebbe credere di
  // aver mirato male.
  //
  // Il bersaglio è la cella intera e non i due pulsantini che ci stanno dentro:
  // chi trascina guarda l'altra metà dello schermo e mira un incrocio in una
  // griglia di venticinque righe, e i sei pixel di margine della cella sono
  // esattamente quelli che facevano cadere il rilascio nel vuoto. La cella è
  // già l'incrocio riga-colonna: prenderla tutta non allarga la promessa, la
  // mantiene.
  accettaPagine(cella, {
    consegnaId: consegna.id,
    allievoId: allievo.id,
    etichetta: `${nomeCompleto(allievo)} · ${consegna.testo}`,
  })

  return cella
}

/**
 * La casella delle firme di una colonna: il foglio con cui si dimostra di aver
 * distribuito quel documento.
 *
 * Vuota dove le firme non si chiedono — è una spunta della consegna, non un
 * obbligo — e vuota sulle richieste che si raccolgono, dove non avrebbe senso.
 */
function cellaFirme (consegna: Consegna) {
  if (consegna.verso !== 'consegno' || !consegna.firmeRichieste) {
    return h('td', { class: 'tabella__cella' })
  }

  const allegate = Boolean(consegna.fileFirme)
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
              ? `Guarda il foglio firme di «${consegna.testo}»`
              : `Allega il foglio firme di «${consegna.testo}»`,
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
            titolo: 'Togli il foglio firme',
            classe: 'cella-documento__modifica',
            al: () => azione({ tipo: 'consegna.firme.togli', consegnaId: consegna.id }),
          })
        : postoDelCestino(),
    ),
  )

  // Anche qui cadono le pagine: il foglio firme è un foglio come gli altri, e
  // arriva nella stessa scansione. La casella è già il posto in cui vive —
  // dove lo si guarda, dove lo si butta via — e chiedere di ritagliarlo fuori
  // dal registro per poi allegarlo da disco era l'unico giro largo rimasto.
  accettaPagineFirme(cella, {
    consegnaId: consegna.id,
    etichetta: `Foglio firme · ${consegna.testo}`,
  })

  return cella
}

/**
 * La riga delle firme, in cima alla matrice: una casella per ogni documento che
 * le chiede.
 *
 * Prende pagine come le righe delle persone, e per la stessa ragione: il foglio
 * firme arriva nella stessa scansione di classe. Dove il PDF non è agganciato a
 * una richiesta che chiede le firme la riga non prende niente, e lo dice con il
 * cursore prima che le pagine cadano — sarebbe una casella che non esiste.
 */
function rigaFirme (raccolte: Consegna[]) {
  const riga = h(
    'tr',
    { class: 'tabella__riga-firme' },
    h('td', { class: 'tabella__nome' }, 'Firme di consegna'),
    ...raccolte.map((consegna) => cellaFirme(consegna)),
    h('td', { class: 'tabella__media' }, h('span', { class: 'testo-quieto' }, '—')),
  )
  accettaPagineSullaRiga(riga, { tipo: 'firme' })
  return riga
}

/**
 * La matrice: gli allievi in riga, i documenti chiesti in colonna.
 *
 * Le colonne sono consegne come tutte le altre — stesso elenco, stessa
 * scadenza, stessa spunta — e questa è solo la forma in cui si leggono quando
 * quel che si spunta è un foglio: per colonna si vede chi non l'ha portato,
 * per riga chi è indietro su tutto.
 */
function tabellaDocumenti (classe: Classe, raccolte: Consegna[], allievi: Allievo[]) {
  return tabella({
    variante: 'documenti',
    griglia: true,
    scorrimento: `documenti-classe:${classe.id}`,
    intestazione: [
      h('th', { class: 'tabella__nome' }, Uno(PIF)),
      ...raccolte.map((consegna) => {
        const avanzamento = avanzamentoConsegna(consegna, classe)
        const termine = scadenzaConsegna(stato.registro, consegna)
        return h(
          'th',
          { class: 'tabella__richiesta' },
          h(
            'button',
            {
              class: 'collegamento',
              type: 'button',
              attr: {
                title:
                  `${consegna.testo} — ${consegna.documento ?? 'documento'}` +
                  (termine ? ` · entro ${formattaData(termine)}` : '') +
                  '\nApri la consegna',
              },
              onclick: () => moduloConsegna({ consegna }),
            },
            h('span', { class: 'tabella__richiesta-titolo' }, consegna.testo),
            h(
              'small',
              { class: scaduta(consegna) && !avanzamento.completa ? 'testo-negativo' : undefined },
              `${avanzamento.fatte}/${avanzamento.destinatari.length}` +
                (termine ? ` · ${formattaData(termine, 'corto')}` : ''),
            ),
          ),
          // La spedizione sta in testa alla colonna perché è un gesto che
          // riguarda tutta la colonna: parte un messaggio a testa a chi
          // aspetta ancora, con il suo documento in allegato.
          siConsegna(consegna) &&
          consegna.modoConsegna === 'email' &&
          daConsegnareA(consegna, classe).length > 0
            ? pulsante({
                testo: `Prepara invio (${daConsegnareA(consegna, classe).length})`,
                simbolo: 'posta',
                variante: 'sottile',
                classe: 'tabella__spedisci',
                titolo: 'Prepara per ognuno la bozza con il suo documento',
                al: async () => {
                  const quanti = daConsegnareA(consegna, classe).length
                  const sicuro = await conferma({
                    titolo: `Preparare le bozze per ${quanti} ${PIF.plurale}?`,
                    testo:
                      'Una bozza a testa, con il suo documento in allegato. Finiscono in una ' +
                      'cartella che si apre da sé: le mandi una a una dal programma di posta.',
                    testoConferma: 'Prepara',
                  })
                  if (!sicuro) return
                  await azione({ tipo: 'consegna.distribuisci', consegnaId: consegna.id })
                },
              })
            : null,
        )
      }),
      h('th', { class: 'tabella__media' }, 'Suoi'),
    ],
    righe: [
      // Le firme di consegna stanno in cima, prima dei nomi: sono la prova
      // che riguarda tutta la colonna, non una persona. Sotto ogni documento
      // che le chiede compare la sua casella; le altre colonne restano vuote,
      // perché una riga con dodici trattini non dice niente.
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
          h('th', { class: 'tabella__nome', attr: { scope: 'row' } }, nomeCompleto(allievo)),
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

        // Tutta la riga prende le pagine, quando il PDF dice già a quale
        // documento appartiene: la casella resta lì per chi deve archiviare in
        // un'altra colonna, ma la domanda normale — di chi sono queste pagine —
        // si risponde puntando un nome, non un incrocio.
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
  return h(
    'li',
    { class: ['documento', dato && aperto(dato.file) && 'documento--aperto'] },
    h(
      'button',
      {
        class: 'documento__titolo',
        type: 'button',
        attr: { title: dato ? `Guarda ${dato.nome}` : 'Non ancora raccolto' },
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
    dato ? pastiglia('raccolto', 'positivo', 'spunta') : pastiglia('atteso', 'attenzione'),
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: 'Apri la consegna',
      al: () => moduloConsegna({ consegna }),
    }),
  )
}

/**
 * I documenti della classe: la matrice di quel che si è chiesto agli allievi, e
 * sopra le raccolte proprie — la circolare, il modulo da allegare a una
 * comunicazione.
 *
 * Non è un secondo elenco di cose da fare: sono le consegne del Todo, quelle
 * che si spuntano portando un foglio, guardate nel modo in cui la domanda si fa
 * da sola.
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
  // I PDF ancora da dividere stanno nello stesso elenco — è quello che scorrono
  // le frecce dell'anteprima — ma non sono fogli raccolti: contarli qui direbbe
  // che sono arrivati documenti che nessuno ha ancora attribuito a nessuno.
  const raccolti = righe.filter((riga) => riga.genere !== 'smistamento').length

  return scheda({
    titolo: 'Chi ha portato che cosa',
    sottotitolo: `le ${PIF.plurale} in riga, i documenti chiesti in colonna · ${nomeSemestreScelto()}`,
    contenuto:
      corsi.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Un documento si chiede con una consegna, e una consegna sta su un corso: ' +
              'in questa classe non ne hai ancora nessuno.',
          )
        : h(
            'div',
            null,
            // Quattro numeri e non tre: «raccolti» è quel che si ha in mano, e
            // senza di lui la scheda diceva solo che cosa manca — che è metà
            // della domanda di chi sta mettendo insieme una cartella. «Scadute»
            // sta per ultimo perché è l'unico che chiede di fare qualcosa oggi.
            sintesiIncassata(
              { etichetta: 'richieste', valore: String(loro.length) },
              { etichetta: 'personali', valore: String(mie.length) },
              { etichetta: 'fogli raccolti', valore: String(raccolti), tono: raccolti > 0 ? 'positivo' : 'quiete' },
              { etichetta: 'in attesa', valore: String(attesi), tono: attesi > 0 ? 'attenzione' : 'positivo' },
              scadute > 0 ? { etichetta: 'scadute', valore: String(scadute), tono: 'negativo' as const } : null,
            ),
            mie.length > 0
              ? h(
                  'div',
                  null,
                  h('h5', { class: 'blocco-testo__titolo' }, 'Documenti personali'),
                  h('ul', { class: 'elenco-documenti' }, ...mie.map(rigaRaccoltaMia)),
                )
              : null,
            loro.length === 0 || allievi.length === 0
              ? statoVuoto({
                  simbolo: 'documento',
                  titolo: loro.length === 0 ? 'Nessun documento chiesto' : 'Classe ancora vuota',
                  testo:
                    loro.length === 0
                      ? 'Chiedere un documento è dare una consegna che si spunta portando un ' +
                        'foglio: sta nel todo con tutto il resto, e qui si vede a matrice chi ' +
                        'non l’ha ancora portato.'
                      : `La matrice compare quando la classe ha delle ${PIF.plurale} attive.`,
                })
              : tabellaDocumenti(classe, loro, allievi),
          ),
  })
}

/**
 * Il todo di questa classe: tutte e quattro le famiglie, dove si sta lavorando.
 *
 * La pagina Todo tiene insieme tutte le classi; qui c'è la sola classe che si
 * ha davanti, con dentro le stesse quattro cose — le assenze da far firmare, le
 * prove e i recuperi, i documenti che vanno e vengono, le attività assegnate —
 * lette dallo stesso posto e quindi contate allo stesso modo.
 *
 * Le linguette accanto restano dove si lavora nel dettaglio: la matrice dei
 * documenti, quella delle assenze, le comunicazioni. Qui c'è che cosa manca,
 * non come si fa. Non è una ripetizione: le due cose non si vedono mai insieme,
 * perché una linguetta alla volta sta aperta.
 *
 * Una todo nuova nasce già agganciata a questa classe: il termine può essere una
 * qualunque ora in cui la si rivede, anche di un'altra materia.
 */
function schedaTodo (classe: Classe) {
  const corsi = corsiDi(classe.id)
  const filtro = stato.filtroTodoClasse
  const todo = todoDellaClasse(
    stato.registro,
    classe,
    corsi,
    stato.adessoData,
    (consegna) => filtro !== 'mie' || consegna.a === 'docente',
  )

  return scheda({
    titolo: Molti(CARTE.pendenza),
    // Che cosa si sta guardando lo dice il sottotitolo, non un selettore qui
    // dentro: «Tutte le consegne» e «Consegne personali» sono due comandi di
    // questa scheda e stanno nella riga delle azioni, dove si cercano i gesti.
    sottotitolo:
      todo.aperti === 0
        ? 'niente in sospeso in questa classe'
        : `${riassuntoClasse(todo)} · ${
          filtro === 'mie' ? 'solo le consegne personali' : 'tutte le consegne'
        }; assenze e valutazioni sempre incluse`,
    contenuto:
      corsi.length === 0 && todo.aperti === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Per aggiungere una pendenza, crea prima un corso per questa classe dalla pagina Corsi.',
          )
        : todo.aperti === 0
          ? statoVuoto({
              simbolo: 'spunta',
              titolo: filtro === 'mie' ? 'Niente in sospeso' : 'Niente in giro',
              testo:
                'Qui compare da sé quel che resta aperto in questa classe: i rapporti delle ' +
                'assenze da mandare e le firme da avere, le prove da correggere e da ridare, i ' +
                'documenti da raccogliere o da consegnare, le attività assegnate.',
            })
          : h(
              'div',
              { class: 'todo-classe__corpo' },
              sintesiIncassata(
                ...FAMIGLIE_TODO.map((famiglia) => ({
                  etichetta: nomeFamiglia(famiglia).toLowerCase(),
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

  return scheda({
    titolo: 'Recapiti',
    sottotitolo: `gli indirizzi fissi; quelli delle ${PIF.plurale} stanno nelle loro schede`,
    contenuto: h(
      'div',
      null,
      sintesiIncassata(
        {
          etichetta: `${PIF.plurale} raggiungibili`,
          valore: `${conMail}/${attivi}`,
          tono: conMail === attivi ? 'positivo' : 'attenzione',
        },
        { etichetta: 'recapiti fissi', valore: String(fascicolo.recapiti.length) },
      ),
      fascicolo.recapiti.length === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessun recapito fisso: segreteria, sede, capoclasse.')
        : h(
            'ul',
            { class: 'elenco-recapiti' },
            ...fascicolo.recapiti.map((recapito) =>
              h(
                'li',
                { class: 'recapito' },
                h('strong', null, recapito.etichetta),
                recapitoPremibile('email', recapito.email, 'testo-quieto'),
                recapito.predefinito ? pastiglia('predefinito', 'informativo') : null,
                pulsante({
                  simbolo: 'matita',
                  variante: 'fantasma',
                  titolo: 'Modifica il recapito',
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
      h('strong', null, comunicazione.oggetto || 'senza oggetto'),
      h(
        'small',
        null,
        comunicazione.stato === 'inviata'
          ? `${formattaData(giornoDi(comunicazione.inviataIl) ?? '')} · ${comunicazione.destinatari.length} destinatari`
          : `bozza · ${indirizzi.length} destinatari`,
      ),
    ),
    pastiglia(comunicazione.stato, tono),
    // «Apri» scrive la bozza e la mette nel programma di posta, senza
    // domandare niente; la spunta è il modo di dire che è partita. Sono due
    // gesti separati perché succedono in due momenti diversi — e perché una
    // finestra «l'hai spedita?» subito dopo l'apertura chiedeva una cosa che
    // ancora non era vera.
    comunicazione.stato === 'inviata'
      ? null
      : pulsante({
          testo: 'Prepara invio',
          simbolo: 'posta',
          variante: 'sottile',
          titolo: 'Prepara la comunicazione secondo le impostazioni di posta',
          al: () =>
            azione({ tipo: 'comunicazione.invia', classeId: classe.id, comunicazioneId: comunicazione.id }),
        }),
    pulsante({
      simbolo: 'spunta',
      variante: comunicazione.stato === 'inviata' ? 'sottile' : 'fantasma',
      titolo:
        comunicazione.stato === 'inviata'
          ? 'Riporta a bozza: la spunta era per sbaglio'
          : 'Segna spedita: l’hai mandata dal programma di posta',
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
  // Del periodo scelto: le comunicazioni non si cancellano mai, e dopo un anno
  // l'elenco è lungo quanto l'anno. La data è quella in cui è nata — una
  // comunicazione appartiene al momento in cui si è deciso di scriverla, non a
  // quello in cui è partita.
  const comunicazioni = nelSemestreSceltoPer(
    [...fascicoloDi(classe.id).comunicazioni],
    (c) => c.creataIl,
  ).sort((a, b) => b.creataIl.localeCompare(a.creataIl))

  return scheda({
    titolo: 'Comunicazioni',
    sottotitolo: `bozze da spedire dal programma di posta · ${nomeSemestreScelto()}`,
    contenuto:
      comunicazioni.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            `Nessuna comunicazione. Gli indirizzi vengono presi dalle schede delle ${PIF.plurale} ` +
              'e dai recapiti fissi, e vanno sempre in copia nascosta. Il registro prepara la ' +
              'bozza e la apre nel programma di posta: a spedirla sei tu.',
          )
        : h(
            'ul',
            { class: 'elenco-comunicazioni' },
            ...comunicazioni.map((c) => rigaComunicazione(classe, c)),
          ),
  })
}

/**
 * L'archivio documentale della classe: la matrice, i PDF ancora da dividere —
 * e, quando se ne apre uno, il foglio che si sta guardando.
 *
 * Una scheda sola. Ce n'erano tre: una elencava i fogli raccolti uno sotto
 * l'altro, ed era la matrice riscritta in colonna; l'altra — «Da smistare» —
 * era un pannello alto mezzo schermo in cui ogni PDF portava la sua bozza,
 * fatta di tendine e di campi numerici. Se ne sono andate tutt'e due per la
 * stessa ragione: dicevano a parole quel che la pagina può mostrare. Le caselle
 * piene *sono* l'elenco dei fogli raccolti; le pagine di un PDF *sono* la sua
 * bozza, e si smistano prendendole.
 *
 * Quel che resta dei PDF in attesa è una riga di nomi sopra la matrice: una
 * porta, non un pannello. Aprendone uno, le sue pagine compaiono nella cornice
 * accanto — accanto e non sopra, perché la matrice è il bersaglio del
 * trascinamento e deve restare in vista mentre si tira.
 *
 * Tutta la pagina è bersaglio per i PDF trascinati da fuori: chi lascia cadere
 * un file punta alla pagina, non a un rettangolo di tre centimetri.
 */
function archivioDocumentale (classe: Classe) {
  const corsi = corsiDi(classe.id)
  // Del periodo scelto, come tutto il resto del registro: le richieste si
  // accumulano per un anno intero, e la matrice di settembre non è la domanda
  // che ci si fa a febbraio.
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
      // La coda di lettura sta fra le pagine, dove si legge pagina per pagina:
      // qui compare solo quando non c'è nessun PDF aperto, che è l'unico caso
      // in cui non avrebbe dove mostrarsi.
      indice >= 0 ? null : codaLettura(),
      schedaDocumenti(classe, raccolte, righe),
    ],
    indice >= 0 ? corniceArchivio(righe, indice, allievi, raccolte, comandiDelPdf, codaLettura) : null,
    `archivio:${classe.id}`,
  )
  rendiBersaglio(pannello, classe)
  return pannello
}

/**
 * Il pannello intero, diviso in quattro schede.
 *
 * Quattro mestieri con quattro ritmi diversi: il todo si guarda ogni mattina, i
 * documenti si riscuotono per settimane, le assenze si chiudono a fine periodo,
 * i messaggi si scrivono quando succede qualcosa. Impilate su una pagina sola
 * volevano dire scorrerne tre per arrivare alla quarta — e il todo, che è
 * l'unica che si apre tutti i giorni, spingeva giù tutto il resto.
 *
 * Le coppie stanno insieme perché sono la stessa domanda: quel che resta da
 * smistare è la coda dei documenti — chi non ha ancora portato quel foglio — e
 * i recapiti sono a chi si scrive, cioè metà del mestiere di scrivere.
 */
function pannelloDocenteClasse (classe: Classe) {
  if (!classe.docenteDiClasse) return null
  // Si rilegge dallo stato: la classe passata può essere una copia vecchia di
  // un ciclo di ridisegno.
  const corrente = stato.registro.classi.find((c) => c.id === classe.id) ?? classe

  return h(
    'div',
    { class: 'docente-classe' },
    stato.schedaDocente === 'todo' ? schedaTodo(corrente) : null,
    // Le coppie tornano come figli diretti e non dentro un contenitore: lo
    // stacco fra una scheda e l'altra lo dà la colonna che le contiene, e un
    // `div` in mezzo se lo mangerebbe.
    stato.schedaDocente === 'documenti' ? archivioDocumentale(corrente) : null,
    stato.schedaDocente === 'assenze' ? schedaAssenze(corrente) : null,
    stato.schedaDocente === 'messaggistica'
      ? h('div', { class: 'docente-classe__messaggi' }, schedaComunicazioni(corrente), schedaRecapiti(corrente))
      : null,
  )
}

/**
 * La sezione a sé: una classe alla volta, e l'unico posto in cui sta.
 *
 * Le stesse schede comparivano anche in fondo alla vista Classi, dopo l'elenco
 * degli allievi: chi insegna in quella classe senza esserne docente ci
 * inciampava scorrendo, e chi lo è le trovava due volte senza sapere quale
 * delle due fosse quella buona. Il docente di classe fa un lavoro suo —
 * l'archivio documentale, le famiglie da avvisare — con un ritmo che non è
 * quello di guardare medie e assenze, e ha una porta sua nella barra laterale,
 * una per classe. La vista Classi resta quel che era: chi c'è e come va.
 */
export function vistaDocenteClasse () {
  const classi = classiDiCuiSonoDocente()
  if (classi.length === 0) {
    return statoVuoto({
      simbolo: 'posta',
      titolo: 'Nessuna classe di cui sei docente',
      testo:
        'Il fascicolo — documenti, recapiti, comunicazioni — compare sulle classi in cui è ' +
        'spuntato «Sono docente di classe». La spunta si mette modificando la classe.',
      azione: pulsante({
        testo: 'Vai alle classi',
        variante: 'primario',
        simbolo: 'classi',
        al: () => aggiorna({ vista: 'classi' }),
      }),
    })
  }

  // Lo stesso contesto del selettore in alto: solo classi dell'anno corrente.
  const classe = classeDelFascicolo() ?? classi[0]
  const pagine = {
    todo: { titolo: 'Pendenze della classe', aiuto: 'Le attività aperte e le scadenze da seguire.' },
    documenti: { titolo: 'Archivio documentale', aiuto: 'Che cosa è stato chiesto, che cosa è arrivato, e i PDF da dividere.' },
    assenze: { titolo: 'Assenze', aiuto: 'Importa i fogli, prepara le richieste e registra le firme ricevute.' },
    messaggistica: { titolo: 'Messaggistica', aiuto: 'Prepara le comunicazioni e gestisci i recapiti della classe.' },
  }
  const pagina = pagine[stato.schedaDocente]

  return h(
    'div',
    { class: 'vista vista--docente-classe' },
    testataVista({
      titolo: pagina.titolo,
      sottotitolo: `${classe.nome} · ${pagina.aiuto}`,
    }),
    pannelloDocenteClasse(classe),
  )
}
