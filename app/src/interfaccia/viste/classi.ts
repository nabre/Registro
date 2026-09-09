// Classi e allievi.
//
// A sinistra l'elenco delle classi, a destra la classe scelta con l'anagrafica
// dei suoi allievi: chi è, dove abita, come lo si raggiunge, in che azienda fa
// il tirocinio e a chi si scrive lì. È l'elenco che si tiene aperto quando si
// deve mandare una mail, spedire una lettera o chiamare un datore di lavoro.
//
// E non c'è nient'altro. Qui c'erano i tre numeri della classe, le materie che
// ci si insegnano e, per ogni allievo, presenze, ritardi e media. Erano tre
// altre domande, e ognuna ha già il suo posto: che cosa si insegna sta nella
// vista Corsi, come va un allievo nella sua scheda — una riga, un clic sul
// nome — e i conti della classe nel Cruscotto. Mescolate all'anagrafica
// facevano una tabella che non si finiva di leggere: sei colonne di numeri
// prima di arrivare all'indirizzo che si era venuti a copiare.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { formattaData } from '../../dominio/date.js'
import type { Classe } from '../../dominio/modelli.js'
import {
  campo,
  pastiglia,
  pulsante,
  puntoColore,
  scheda,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { apriModale } from '../componenti/modale.js'
import { notifica } from '../componenti/notifiche.js'
import { h, type Figlio } from '../dom.js'
import {
  moduloAllievo,
  moduloAvvio,
  moduloClasse,
  moduloImportaAllievi,
} from '../moduli.js'
import { invia } from '../ponte.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  classiDellAnno,
  materieDiClasse,
  stato,
} from '../stato.js'
import { tabella } from '../componenti/tabella.js'

function elencoClassi (): HTMLElement {
  const classi = classiDellAnno()

  return h(
    'aside',
    { class: 'elenco-laterale' },
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, 'Classi'),
      pulsante({ simbolo: 'piu', variante: 'sottile', titolo: 'Nuova classe', al: () => moduloClasse() }),
    ),
    classi.length === 0
      ? h('p', { class: 'testo-quieto' }, 'Nessuna classe in questo anno.')
      : h(
          'ul',
          { class: 'elenco-laterale__voci' },
          ...classi.map((classe) =>
            h(
              'li',
              null,
              h(
                'button',
                {
                  class: [
                    'voce-laterale',
                    stato.classeId === classe.id && 'voce-laterale--attiva',
                    classe.archiviata && 'voce-laterale--spenta',
                  ],
                  type: 'button',
                  onclick: () => aggiorna({ classeId: classe.id }),
                },
                puntoColore(classe.colore),
                h(
                  'span',
                  { class: 'voce-laterale__testo' },
                  h('strong', null, classe.nome),
                  h(
                    'small',
                    null,
                    `${allieviAttivi(classe).length} allievi${
                      materieDiClasse(classe.id).length > 0
                        ? ` · ${materieDiClasse(classe.id).join(', ')}`
                        : ''
                    }`,
                  ),
                ),
                classe.archiviata ? pastiglia('archiviata', 'quiete') : null,
              ),
            ),
          ),
        ),
  )
}

function tabellaAllievi (classe: Classe): HTMLElement {
  const allievi = ordinaAllievi(classe.allievi)

  if (allievi.length === 0) {
    return statoVuoto({
      simbolo: 'utente',
      titolo: 'Classe ancora vuota',
      testo: 'Gli allievi si aggiungono uno per uno, oppure incollando l’elenco.',
      azione: h(
        'div',
        { class: 'stato-vuoto__pulsanti' },
        pulsante({ testo: 'Aggiungi allievo', variante: 'primario', simbolo: 'piu', al: () => moduloAllievo(classe) }),
        pulsante({ testo: 'Incolla elenco', simbolo: 'piano', al: () => moduloImportaAllievi(classe) }),
      ),
    })
  }

  /** Una casella che può essere vuota: il trattino dice «non c’è», non «zero». */
  const cella = (valore: string | undefined, classe?: string): Figlio =>
    valore
      ? h('td', { class: classe }, valore)
      : h('td', { class: classe }, h('span', { class: 'testo-quieto' }, '—'))

  return tabella({
    variante: 'allievi',
    intestazione: [
      h('th', null, 'Allievo'),
      h('th', null, 'Nascita'),
      h('th', null, 'Indirizzo'),
      h('th', null, 'E-mail'),
      h('th', null, 'Datore di lavoro'),
      h('th', null, 'Indirizzo del datore'),
      h('th', null, 'E-mail del datore'),
      h('th', { class: 'tabella__azioni' }, ''),
    ],
    righe: allievi.map((allievo) =>
      h(
        'tr',
        { class: [!allievo.attivo && 'tabella__riga--spenta'] },
        h(
          'td',
          { class: 'tabella__nome' },
          // Il nome apre la scheda, non il modulo: durante un colloquio si
          // vuole leggere, e modificare l'anagrafica è il caso raro.
          h(
            'button',
            {
              class: 'collegamento',
              type: 'button',
              attr: { title: 'Apri la scheda dell’allievo' },
              onclick: () =>
                aggiorna({ vista: 'allievo', classeId: classe.id, allievoId: allievo.id }),
            },
            nomeCompleto(allievo),
          ),
          allievo.attivo ? null : pastiglia('non frequenta', 'quiete'),
        ),
        // La data com'è scritta sui moduli, non in ISO: da qui si copia a
        // mano su un contratto di tirocinio, e '2010-05-23' si ricopia male.
        cella(allievo.dataNascita ? formattaData(allievo.dataNascita) : undefined),
        cella(allievo.indirizzo),
        cella(allievo.email, 'tabella__recapito'),
        cella(allievo.azienda),
        cella(allievo.indirizzoDatore),
        cella(allievo.emailDatore, 'tabella__recapito'),
        h(
          'td',
          { class: 'tabella__azioni' },
          pulsante({
            simbolo: 'matita',
            variante: 'fantasma',
            titolo: 'Modifica',
            al: () => moduloAllievo(classe, allievo),
          }),
        ),
      ),
    ),
  })
}

/**
 * «Duplica nell'anno…»: la stessa classe, con lo stesso elenco di allievi, in
 * un anno a scelta — di norma quello dopo, quando la si ritrova con lo stesso
 * gruppo. L'azione c'è già nel protocollo e nell'host; qui mancava soltanto
 * chi la chiede.
 */
function chiediDuplicaClasse (classe: Classe): void {
  const anni = stato.registro.anni
  apriModale({
    titolo: 'Duplica nell’anno…',
    sottotitolo: classe.nome,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'annoId',
          etichetta: 'Anno di destinazione',
          tipo: 'select',
          richiesto: true,
          valore: (annoCorrente() ?? anni[0])?.id ?? '',
          opzioni: anni.map((anno) => ({ valore: anno.id, testo: anno.etichetta })),
        }),
        campo({
          nome: 'nome',
          etichetta: 'Nome della nuova classe',
          tipo: 'text',
          richiesto: true,
          valore: classe.nome,
        }),
      ),
    testoSalva: 'Duplica',
    alSalva: async (valori, contesto) => {
      const nome = String(valori.nome ?? '').trim()
      const annoId = String(valori.annoId ?? '')
      if (!nome || !annoId) {
        contesto.mostraErrori(['Anno e nome sono obbligatori.'])
        return
      }
      contesto.occupato(true)
      const risposta = await invia({ tipo: 'classe.duplica', classeId: classe.id, annoId, nome })
      contesto.occupato(false)
      if (!risposta.ok) {
        contesto.mostraErrori(risposta.errori ?? ['Non riuscito.'])
        return
      }
      contesto.chiudi()
      notifica('Classe duplicata.', 'successo')
      if (risposta.creato) aggiorna({ vista: 'classi', classeId: risposta.creato.id })
    },
  })
}

export function vistaClassi (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return statoVuoto({
      simbolo: 'classi',
      titolo: 'Nessun anno scolastico',
      testo:
        'Le classi appartengono a un anno. L’avvio guidato lo crea insieme alla prima classe, ' +
        'alla sua materia e alle ore in cui la si fa.',
      azione: pulsante({
        testo: 'Avvio guidato',
        variante: 'primario',
        simbolo: 'piu',
        al: () => moduloAvvio(),
      }),
    })
  }

  const classi = classiDellAnno()
  const classe = classePerId(stato.classeId) ?? classi[0] ?? null

  return h(
    'div',
    { class: 'vista vista--classi' },
    testataVista({
      titolo: 'Classi e allievi',
      sottotitolo: `anno ${anno.etichetta} · recapiti, indirizzi e datori di lavoro`,
      azioni: pulsante({
        testo: 'Nuova classe',
        variante: 'primario',
        simbolo: 'piu',
        al: () => moduloClasse(),
      }),
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco' },
      elencoClassi(),
      classe
        ? h(
            'div',
            { class: 'colonna' },
            scheda({
              titolo: classe.nome,
              sottotitolo:
                [materieDiClasse(classe.id).join(', '), classe.sede]
                  .filter(Boolean)
                  .join(' · ') || undefined,
              azioni: [
                pulsante({ testo: 'Aggiungi allievo', simbolo: 'piu', variante: 'sottile', al: () => moduloAllievo(classe) }),
                pulsante({ testo: 'Incolla elenco', simbolo: 'piano', variante: 'sottile', al: () => moduloImportaAllievi(classe) }),
                // Niente stampe qui: il fascicolo, come ogni altro PDF, si
                // chiede da Documenti — la pagina che risponde alla domanda
                // «che cosa devo consegnare», che è un lavoro suo.
                pulsante({ testo: 'Modifica classe', simbolo: 'matita', al: () => moduloClasse(classe) }),
                pulsante({
                  testo: 'Duplica nell’anno…',
                  simbolo: 'duplica',
                  variante: 'sottile',
                  titolo: 'La stessa classe, con lo stesso elenco di allievi, in un altro anno',
                  al: () => chiediDuplicaClasse(classe),
                }),
              ],
              contenuto: h(
                'div',
                null,
                classe.note ? h('p', { class: 'nota-classe' }, classe.note) : null,
                // Il fascicolo — documenti, recapiti, comunicazioni — non sta
                // qui: ha la sua voce nel menu. Le stesse schede comparivano in
                // fondo a questa pagina, e chi insegna in quella classe senza
                // esserne docente le trovava lo stesso sotto l'elenco degli
                // allievi, dopo tutto quel che era venuto a cercare. Sono due
                // lavori diversi con due ritmi diversi: qui si guarda chi c'è e
                // come va, là si riscuotono documenti e si scrive alle famiglie.
                classe.docenteDiClasse
                  ? pastiglia('docente di classe', 'informativo', 'posta')
                  : null,
                tabellaAllievi(classe),
              ),
            }),
          )
        : h(
            'div',
            { class: 'colonna' },
            statoVuoto({
              simbolo: 'classi',
              titolo: 'Nessuna classe',
              testo: 'Una classe raccoglie gli allievi e tiene insieme lezioni e valutazioni.',
              azione: pulsante({ testo: 'Crea la prima classe', variante: 'primario', al: () => moduloClasse() }),
            }),
          ),
    ),
  )
}
