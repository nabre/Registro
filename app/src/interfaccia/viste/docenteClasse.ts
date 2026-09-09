// Il pannello del docente di classe: documenti, recapiti, comunicazioni.
//
// Compare solo sulle classi in cui si spunta «sono docente di classe», perché
// per le altre sarebbe rumore: chi insegna e basta non raccoglie certificati e
// non scrive alle famiglie.
//
// Il filo che tiene insieme le tre parti è uno solo — chi ha consegnato, chi si
// raggiunge, che cosa è stato detto — e sono le tre domande a cui un docente di
// classe deve saper rispondere in due secondi.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { destinatariComunicazione, fileDellaConsegna } from '../../dominio/comunicazioni.js'
import {
  avanzamentoConsegna,
  consegneDocumento,
  daConsegnareA,
  documentoPer,
  haFatto,
  scadenzaConsegna,
  siConsegna,
  spuntaDi,
} from '../../dominio/consegne.js'
import { formattaData, giornoDi } from '../../dominio/date.js'
import {
  FAMIGLIE_TODO,
  nomeFamiglia,
  todoDellaClasse,
} from '../../dominio/todo.js'
import { CHI_INSEGNA } from '../../dominio/modelli.js'
import type { Allievo, Classe, Comunicazione, Consegna } from '../../dominio/modelli.js'
import {
  conAttesa,
  pastiglia,
  pulsante,
  scheda,
  selettore,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { sintesiIncassata } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { conferma } from '../componenti/modale.js'
import { h } from '../dom.js'
import { moduloComunicazione, moduloConsegna, moduloRecapito } from '../moduli.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  classePerId,
  classiVisibili,
  corsiDi,
  fascicoloDi,
  nelSemestreScelto,
  nelSemestreSceltoPer,
  nomeSemestreScelto,
  stato,
  type SchedaDocente,
} from '../stato.js'
import { schedaAssenze } from './assenze.js'
import { schedaSmistamento } from './smistamento.js'
import { riassuntoClasse, sezioniTodoClasse } from './todoClasse.js'

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
          onclick: (evento: MouseEvent) =>
            void conAttesa(
              evento.currentTarget as HTMLButtonElement,
              azione({
                tipo: 'consegna.salva',
                consegna: {
                  ...consegna,
                  a: 'allievi',
                  allieviIds: [...consegna.allieviIds, allievo.id],
                },
              }),
            ),
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
      ? `Consegnato${spunta?.modo === 'email' ? ' per mail' : ' a mano'} — togli la spunta`
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

  const titoloFile = documento
    ? `Apri ${documento.nome || 'il documento'}`
    : consegno
      ? `Allega il documento da consegnare a ${nomeCompleto(allievo)}`
      : `Allega la scansione di ${nomeCompleto(allievo)}`

  const file = h(
    'button',
    {
      class: ['cella-documento', documento ? 'cella-documento--file' : 'cella-documento--senza-file'],
      type: 'button',
      attr: { title: titoloFile },
      onclick: (evento: MouseEvent) =>
        void conAttesa(
          evento.currentTarget as HTMLButtonElement,
          azione(
            documento
              ? { tipo: 'consegna.documento.apri', consegnaId: consegna.id, allievoId: allievo.id }
              : { tipo: 'consegna.documento.allega', consegnaId: consegna.id, allievoId: allievo.id },
          ),
        ),
    },
    icona(documento ? 'documento' : 'allegato', 'icona--minuta'),
  )

  return h(
    'td',
    { class: 'tabella__cella' },
    h(
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
        : null,
    ),
  )
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
            allegate ? 'cella-documento--consegnato' : 'cella-documento--atteso',
          ],
          type: 'button',
          attr: {
            title: allegate
              ? `Apri il foglio firme di «${consegna.testo}»`
              : `Allega il foglio firme di «${consegna.testo}»`,
          },
          onclick: (evento: MouseEvent) =>
            void conAttesa(
              evento.currentTarget as HTMLButtonElement,
              azione(
                allegate
                  ? { tipo: 'consegna.firme.apri', consegnaId: consegna.id }
                  : { tipo: 'consegna.firme.aggiungi', consegnaId: consegna.id },
              ),
            ),
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
        : null,
    ),
  )
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
  return h(
    'div',
    { class: 'tabella-contenitore tabella-contenitore--griglia' },
    h(
      'table',
      { class: 'tabella tabella--documenti' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', { class: 'tabella__nome' }, 'Allievo'),
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
                    testo: `Spedisci (${daConsegnareA(consegna, classe).length})`,
                    simbolo: 'posta',
                    variante: 'sottile',
                    classe: 'tabella__spedisci',
                    titolo: 'Prepara per ognuno la bozza con il suo documento',
                    al: async () => {
                      const quanti = daConsegnareA(consegna, classe).length
                      const sicuro = await conferma({
                        titolo: `Preparare le bozze per ${quanti} allievi?`,
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
        ),
      ),
      h(
        'tbody',
        null,
        // Le firme di consegna stanno in cima, prima dei nomi: sono la prova
        // che riguarda tutta la colonna, non una persona. Sotto ogni documento
        // che le chiede compare la sua casella; le altre colonne restano vuote,
        // perché una riga con dodici trattini non dice niente.
        raccolte.some((c) => c.verso === 'consegno' && c.firmeRichieste)
          ? h(
              'tr',
              { class: 'tabella__riga-firme' },
              h('td', { class: 'tabella__nome' }, 'Firme di consegna'),
              ...raccolte.map((consegna) => cellaFirme(consegna)),
              h('td', { class: 'tabella__media' }, h('span', { class: 'testo-quieto' }, '—')),
            )
          : null,
        ...allievi.map((allievo) => {
          const suoi = raccolte.filter(
            (c) => c.a === 'classe' || c.allieviIds.includes(allievo.id),
          )
          const portati = suoi.filter((c) => haFatto(c, allievo.id)).length
          return h(
            'tr',
            null,
            h('td', { class: 'tabella__nome' }, nomeCompleto(allievo)),
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
        }),
      ),
    ),
  )
}

/** Una raccolta «a me»: la circolare, il modulo da tenere da parte. */
function rigaRaccoltaMia (consegna: Consegna) {
  const dato = fileDellaConsegna(consegna)
  return h(
    'li',
    { class: 'documento' },
    h(
      'button',
      {
        class: 'documento__titolo',
        type: 'button',
        attr: { title: dato ? `Apri ${dato.nome}` : 'Non ancora raccolto' },
        onclick: (evento: MouseEvent) =>
          void conAttesa(
            evento.currentTarget as HTMLButtonElement,
            azione(
              dato
                ? { tipo: 'consegna.file.apri', consegnaId: consegna.id, chi: CHI_INSEGNA }
                : { tipo: 'consegna.raccogli', consegnaId: consegna.id, chi: CHI_INSEGNA },
            ),
          ),
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
function schedaDocumenti (classe: Classe) {
  const corsi = corsiDi(classe.id)
  const allievi = ordinaAllievi(allieviAttivi(classe))
  // Del periodo scelto, come tutto il resto del registro: le richieste si
  // accumulano per un anno intero, e la matrice di settembre non è la domanda
  // che ci si fa a febbraio.
  const raccolte = nelSemestreScelto(consegneDocumento(stato.registro, corsi))
  const mie = raccolte.filter((c) => c.a === 'docente')
  const loro = raccolte.filter((c) => c.a !== 'docente')
  const attesi = loro.reduce((somma, consegna) => {
    const avanzamento = avanzamentoConsegna(consegna, classe)
    return somma + (avanzamento.destinatari.length - avanzamento.fatte)
  }, 0)

  const chiedi = (a: Consegna['a']) =>
    moduloConsegna({ corsoId: corsi[0]?.id, a, documento: true })

  return scheda({
    titolo: 'Documenti',
    sottotitolo: `gli allievi in riga, i documenti chiesti in colonna · ${nomeSemestreScelto()}`,
    azioni:
      corsi.length === 0
        ? undefined
        : [
            pulsante({
              testo: 'Chiedi un documento',
              simbolo: 'piu',
              variante: 'primario',
              al: () => chiedi('classe'),
            }),
            pulsante({
              testo: 'Raccolta mia',
              simbolo: 'piu',
              variante: 'sottile',
              al: () => chiedi('docente'),
            }),
          ],
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
            sintesiIncassata(
              { etichetta: 'richieste', valore: String(loro.length) },
              { etichetta: 'mie', valore: String(mie.length) },
              { etichetta: 'in attesa', valore: String(attesi), tono: attesi > 0 ? 'attenzione' : 'positivo' },
            ),
            mie.length > 0
              ? h(
                  'div',
                  null,
                  h('h5', { class: 'blocco-testo__titolo' }, 'Le mie'),
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
                      : 'La matrice compare quando la classe ha degli allievi attivi.',
                  azione:
                    loro.length === 0
                      ? pulsante({
                          testo: 'Chiedi un documento',
                          variante: 'primario',
                          simbolo: 'piu',
                          al: () => chiedi('classe'),
                        })
                      : undefined,
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
    titolo: 'Todo',
    sottotitolo:
      todo.aperti === 0
        ? 'niente in sospeso in questa classe'
        : `${riassuntoClasse(todo)} · le stesse cose che stanno nella pagina Todo`,
    azioni: [
      selettore(
        filtro,
        [
          { valore: 'mie', testo: 'Le mie' },
          { valore: 'tutte', testo: 'Tutte' },
        ],
        (scelto) => aggiorna({ filtroTodoClasse: scelto }),
      ),
      pulsante({
        testo: 'Nuova todo',
        simbolo: 'piu',
        variante: 'primario',
        al: () => moduloConsegna({ corsoId: corsi[0]?.id, a: 'docente' }),
      }),
    ],
    contenuto:
      corsi.length === 0 && todo.aperti === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Una todo si aggancia a un corso, e in questa classe non ne hai. ' +
              'Creane uno dalla vista Corsi per potertene segnare.',
          )
        : todo.aperti === 0
          ? statoVuoto({
              simbolo: 'spunta',
              titolo: filtro === 'mie' ? 'Niente in sospeso' : 'Niente in giro',
              testo:
                'Qui compare da sé quel che resta aperto in questa classe: i rapporti delle ' +
                'assenze da mandare e le firme da avere, le prove da correggere e da ridare, i ' +
                'documenti da raccogliere o da consegnare, le attività assegnate.',
              azione: pulsante({
                testo: 'Nuova todo',
                variante: 'primario',
                simbolo: 'piu',
                al: () => moduloConsegna({ corsoId: corsi[0]?.id, a: 'docente' }),
              }),
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
    sottotitolo: 'gli indirizzi fissi; quelli degli allievi stanno nelle loro schede',
    azioni: pulsante({
      testo: 'Nuovo recapito',
      simbolo: 'piu',
      variante: 'sottile',
      al: () => moduloRecapito(classe),
    }),
    contenuto: h(
      'div',
      null,
      sintesiIncassata(
        {
          etichetta: 'allievi raggiungibili',
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
                h('span', { class: 'testo-quieto' }, recapito.email),
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
          testo: 'Apri',
          simbolo: 'posta',
          variante: 'sottile',
          titolo: 'Scrive la bozza e la apre nel programma di posta',
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
    azioni: [
      pulsante({
        testo: 'Nuova comunicazione',
        simbolo: 'piu',
        variante: 'sottile',
        al: () => moduloComunicazione(classe),
      }),
    ],
    contenuto:
      comunicazioni.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Nessuna comunicazione. Gli indirizzi vengono presi dalle schede degli allievi ' +
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
export function pannelloDocenteClasse (classe: Classe) {
  if (!classe.docenteDiClasse) return null
  // Si rilegge dallo stato: la classe passata può essere una copia vecchia di
  // un ciclo di ridisegno.
  const corrente = stato.registro.classi.find((c) => c.id === classe.id) ?? classe

  return h(
    'div',
    { class: 'docente-classe' },
    selettore(
      stato.schedaDocente,
      [
        { valore: 'todo' as const, testo: 'Todo', simbolo: 'todo' },
        { valore: 'documenti' as const, testo: 'Documenti', simbolo: 'documento' },
        { valore: 'assenze' as const, testo: 'Assenze', simbolo: 'calendario' },
        { valore: 'messaggistica' as const, testo: 'Messaggistica', simbolo: 'posta' },
      ],
      (scelta: SchedaDocente) => aggiorna({ schedaDocente: scelta }),
    ),
    stato.schedaDocente === 'todo' ? schedaTodo(corrente) : null,
    // Le coppie tornano come figli diretti e non dentro un contenitore: lo
    // stacco fra una scheda e l'altra lo dà la colonna che le contiene, e un
    // `div` in mezzo se lo mangerebbe.
    stato.schedaDocente === 'documenti'
      ? [schedaDocumenti(corrente), schedaSmistamento(corrente)]
      : null,
    stato.schedaDocente === 'assenze' ? schedaAssenze(corrente) : null,
    stato.schedaDocente === 'messaggistica'
      ? [schedaComunicazioni(corrente), schedaRecapiti(corrente)]
      : null,
  )
}

/** Le classi di cui si è docente di classe: quelle che hanno un fascicolo. */
export function classiDiCuiSonoDocente () {
  return classiVisibili().filter((c) => c.docenteDiClasse)
}

/**
 * La sezione a sé: una classe alla volta, e l'unico posto in cui sta.
 *
 * Le stesse schede comparivano anche in fondo alla vista Classi, dopo l'elenco
 * degli allievi: chi insegna in quella classe senza esserne docente ci
 * inciampava scorrendo, e chi lo è le trovava due volte senza sapere quale
 * delle due fosse quella buona. Il docente di classe fa un lavoro suo —
 * documenti da riscuotere, famiglie da avvisare — con un ritmo che non è
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

  // Se lo stato punta a una classe che non ha (o non ha più) il fascicolo, si
  // apre la prima: meglio una pagina piena della classe sbagliata che vuota.
  const scelta = classePerId(stato.classeId)
  const classe = scelta && scelta.docenteDiClasse ? scelta : classi[0]

  return h(
    'div',
    { class: 'vista vista--docente-classe' },
    testataVista({
      titolo: classe.nome,
      sottotitolo: 'todo, documenti, assenze e messaggistica della classe',
      azioni: pulsante({
        testo: 'Apri la classe',
        simbolo: 'classi',
        variante: 'sottile',
        al: () => aggiorna({ vista: 'classi', classeId: classe.id }),
      }),
    }),
    pannelloDocenteClasse(classe),
  )
}
