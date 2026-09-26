// Classi e allievi: la classe scelta nella tendina «Classe» della barra, con
// l'anagrafica dei suoi allievi (recapiti, azienda di tirocinio). Solo
// anagrafica: che cosa si insegna sta in Corsi, come va un allievo nella sua
// scheda.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import { scriviIndirizzo } from '../../domain/addresses.js'
import { Uno, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { formattaData } from '../../domain/dates.js'
import type { Classe } from '../../domain/models.js'
import {
  campo,
  collegamento,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { recapitoPremibile, type GenereRecapito } from '../components/contacts.js'
import { statoVuotoAnno } from '../components/filters.js'
import { h, type Figlio } from '../dom.js'
import {
  chiediEliminazione,
  moduloAllievo,
  moduloAnno,
  moduloClasse,
  moduloImportaAllievi,
} from '../forms.js'
import { azione, chiedi } from '../bridge.js'
import { classeDellaPaginaClassi } from '../context.js'
import { validaClasse } from '../../domain/validation.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  materieDiClasse,
  stato,
} from '../state.js'
import { tabella } from '../components/table.js'
import { cellaNome } from '../components/avatar.js'
import { inviaDalModulo } from '../forms/common.js'
import { testi } from './classes.testi.js'

function tabellaAllievi (classe: Classe): HTMLElement {
  const allievi = ordinaAllievi(classe.allievi)
  const t = testi()
  const L = lessico()

  if (allievi.length === 0) {
    return statoVuoto({
      simbolo: 'utente',
      titolo: t.classeVuota,
      testo: t.comeSiRiempie,
      azione: h(
        'div',
        { class: 'stato-vuoto__pulsanti' },
        pulsante({
          testo: t.aggiungiPif,
          variante: 'primario',
          simbolo: 'piu',
          al: () => moduloAllievo(classe),
        }),
        pulsante({
          testo: t.incollaElenco,
          simbolo: 'piano',
          al: () => moduloImportaAllievi(classe),
        }),
      ),
    })
  }

  /**
   * Una casella che può essere vuota: il trattino dice «non c'è». Con `apribile`
   * il contenuto apre il programma di posta, per scrivere a una persona sola.
   */
  const cella = (
    valore: string | undefined,
    classe?: string,
    apribile?: GenereRecapito,
  ): Figlio =>
    valore
      ? h('td', { class: classe }, apribile ? recapitoPremibile(apribile, valore) : valore)
      : h('td', { class: classe }, h('span', { class: 'testo-quieto' }, '—'))

  return tabella({
    variante: 'allievi',
    intestazione: [
      h('th', null, Uno(L.pif)),
      h('th', null, t.nascita),
      h('th', null, parole().indirizzo),
      h('th', null, Uno(L.email)),
      h('th', null, Uno(L.datore)),
      h('th', null, t.indirizzoDatore),
      h('th', null, t.emailDatore),
      h('th', { class: 'tabella__azioni' }, ''),
    ],
    righe: allievi.map((allievo) =>
      h(
        'tr',
        { class: [!allievo.attivo && 'tabella__riga--spenta'] },
        h(
          'th',
          { class: 'tabella__nome', attr: { scope: 'row' } },
          // Il nome apre la scheda, non il modulo.
          cellaNome(
            allievo,
            collegamento({
              testo: nomeCompleto(allievo),
              titolo: t.apriScheda,
              al: () => aggiorna({ vista: 'allievo', classeId: classe.id, allievoId: allievo.id }),
            }),
            allievo.attivo ? null : pastiglia(t.nonFrequenta, 'quiete'),
          ),
        ),
        // La data come sui moduli, non in ISO: si ricopia a mano.
        cella(allievo.dataNascita ? formattaData(allievo.dataNascita) : undefined),
        cella(scriviIndirizzo(allievo.indirizzo) || undefined),
        cella(allievo.email, 'tabella__recapito', 'email'),
        cella(allievo.azienda),
        cella(scriviIndirizzo(allievo.indirizzoDatore) || undefined),
        cella(allievo.emailDatore, 'tabella__recapito', 'email'),
        h(
          'td',
          { class: 'tabella__azioni' },
          pulsante({
            simbolo: 'matita',
            variante: 'fantasma',
            titolo: parole().modifica,
            al: () => moduloAllievo(classe, allievo),
          }),
        ),
      ),
    ),
  })
}

// ------------------------------------------------------------ i dettagli

type CampoClasse = 'nome' | 'colore' | 'note' | 'docenteDiClasse' | 'archiviata'

/**
 * Scrive un campo cambiato sulla classe com'è adesso: `classe.salva` manda la
 * classe intera, e quella del disegno perderebbe gli allievi aggiunti nel
 * frattempo. Un nome vuoto o già usato nell'anno non si scrive.
 */
async function scriviClasse (
  classeId: string,
  campo: CampoClasse,
  valore: string | boolean,
  torna: () => void,
): Promise<void> {
  const viva = classePerId(classeId)
  if (!viva) return
  const aggiornata: Classe = {
    ...viva,
    [campo]: typeof valore === 'string' && campo !== 'note' ? valore.trim() : valore,
  }
  const esito = validaClasse(aggiornata, stato.registro.classi)
  if (!esito.valido) {
    notifica(esito.errori.join(' '), 'avviso')
    torna()
    return
  }
  const risposta = await azione({ tipo: 'classe.salva', classe: aggiornata })
  if (!risposta.ok) torna()
}

/** La classe se ne va, dopo aver detto che cosa si porta via. */
async function eliminaClasse (classe: Classe): Promise<void> {
  if (!(await chiediEliminazione({ genere: 'classe', id: classe.id }))) return
  const risposta = await azione({ tipo: 'classe.elimina', classeId: classe.id })
  if (risposta.ok) aggiorna({ classeId: null })
}

/**
 * I dettagli della classe, modificabili sul posto: nome, colore, docenza di
 * classe, archiviazione, note. Ogni campo si salva uscendone (Esc torna com'era).
 */
function dettagliClasse (classe: Classe): HTMLElement {
  const t = testi()
  const p = parole()
  const testoInRiga = (
    campo: 'nome',
    etichetta: string,
    valore: string,
    segnaposto: string,
  ): HTMLElement => {
    const input = h('input', {
      class: 'campo__controllo',
      type: 'text',
      value: valore,
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `classe-${classe.id}-${campo}` },
      attr: { placeholder: segnaposto, 'aria-label': etichetta },
      onchange: () => void scriviClasse(classe.id, campo, input.value, () => {
        input.value = valore
      }),
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'Enter') input.blur()
        if (evento.key === 'Escape') {
          input.value = valore
          input.blur()
        }
      },
    })
    return h('label', { class: 'dettagli-classe__campo' }, h('span', null, etichetta), input)
  }

  const spunta = (
    campo: 'docenteDiClasse' | 'archiviata',
    etichetta: string,
    aiuto: string,
  ): HTMLElement => {
    const input = h('input', {
      type: 'checkbox',
      checked: classe[campo],
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `classe-${classe.id}-${campo}` },
      onchange: () => void scriviClasse(classe.id, campo, input.checked, () => {
        input.checked = classe[campo]
      }),
    })
    return h(
      'label',
      { class: 'dettagli-classe__spunta', attr: { title: aiuto } },
      input,
      h('span', null, etichetta),
    )
  }

  const colore = h('input', {
    class: 'dettagli-classe__colore',
    type: 'color',
    value: classe.colore,
    // testo-fisso: chiave del fuoco, non si legge
    dataset: { fuoco: `classe-${classe.id}-colore` },
    attr: { 'aria-label': t.coloreNelCalendario, title: t.coloreDellaClasse },
    onchange: () => void scriviClasse(classe.id, 'colore', colore.value, () => {
      colore.value = classe.colore
    }),
  })

  const note = h('textarea', {
    class: 'campo__controllo',
    rows: 2,
    value: classe.note ?? '',
    // testo-fisso: chiave del fuoco, non si legge
    dataset: { fuoco: `classe-${classe.id}-note` },
    attr: { placeholder: t.noteSullaClasse, 'aria-label': p.note },
    onchange: () => void scriviClasse(classe.id, 'note', note.value, () => {
      note.value = classe.note ?? ''
    }),
  })

  return scheda({
    titolo: p.dettagli,
    azioni: pulsante({
      testo: t.eliminaClasse,
      simbolo: 'cestino',
      variante: 'fantasma',
      titolo: t.cosaSiPortaVia,
      al: () => eliminaClasse(classe),
    }),
    contenuto: h(
      'div',
      { class: 'dettagli-classe' },
      h(
        'div',
        { class: 'dettagli-classe__riga' },
        h('label', { class: 'dettagli-classe__campo dettagli-classe__campo--colore' },
          h('span', null, parole().colore), colore),
        testoInRiga('nome', t.nomeClasse, classe.nome, 'I MEC A'),
      ),
      h(
        'div',
        { class: 'dettagli-classe__riga' },
        spunta('docenteDiClasse', t.sonoDocenteDiClasse, t.aiutoDocenteDiClasse),
        spunta('archiviata', t.archiviata, t.aiutoArchiviata),
      ),
      h('label', { class: 'dettagli-classe__campo' }, h('span', null, p.note), note),
    ),
  })
}

/** Una classe di un altro anno, come la elenca `classi.altrove`. */
interface ClasseAltrove {
  id: string
  nome: string
  persone: number
  materie: string[]
}

/**
 * «Importa classe dall'anno…»: porta una classe da un altro documento `.regi`,
 * di norma quello dell'anno scorso. Gli anni proposti sono i recenti e i
 * preferiti, tolti quello aperto e quelli irraggiungibili. Il documento scelto
 * si legge (`classi.altrove`) ma non si apre.
 */
export function chiediImportaClasse (): void {
  const t = testi()
  const L = lessico()
  const documenti = stato.documenti.elenco.filter((d) => !d.aperto && !d.mancante)
  if (documenti.length === 0) {
    notifica(t.nessunAltroAnno, 'avviso')
    return
  }
  /** Le classi del documento scelto, per ritrovarne il nome alla scelta. */
  let classi: ClasseAltrove[] = []
  /** Il nome proposto per ultimo: finché è quello, lo si può cambiare da qui. */
  let proposto = ''

  const campoClasse = campo({
    nome: 'classeId',
    etichetta: Uno(L.classe),
    tipo: 'select',
    richiesto: true,
    opzioni: [],
    al: (valore) => proponiNome(valore),
  })
  const tendinaClasse = campoClasse.querySelector('select') as HTMLSelectElement
  const campoNome = campo({
    nome: 'nome',
    etichetta: t.nomeNuovaClasse,
    tipo: 'text',
    richiesto: true,
    aiuto: t.aiutoNome,
  })
  const casellaNome = campoNome.querySelector('input') as HTMLInputElement

  /** Il nome della classe scelta, se chi importa non ne ha già scritto un altro. */
  function proponiNome (classeId: string): void {
    const nome = classi.find((c) => c.id === classeId)?.nome ?? ''
    if (casellaNome.value.trim() === '' || casellaNome.value === proposto) casellaNome.value = nome
    proposto = nome
  }

  /** Le classi dell'altro documento, lette quando lo si sceglie. */
  async function leggiClassi (
    percorso: string,
    contesto: { mostraErrori: (e: string[]) => void },
  ): Promise<void> {
    classi = []
    tendinaClasse.replaceChildren(h('option', { value: '' }, t.lettura))
    tendinaClasse.disabled = true
    const esito = await chiedi<{ anno: string, classi: ClasseAltrove[] }>('classi.altrove', { percorso })
    // Nel frattempo si è scelto un altro documento: questa risposta è vecchia.
    if (percorso !== documentoScelto) return
    tendinaClasse.disabled = false
    if (!esito.ok || !esito.dati) {
      tendinaClasse.replaceChildren(h('option', { value: '' }, t.nessunaClasse))
      contesto.mostraErrori(esito.errori.length ? esito.errori : [t.nonSiLegge])
      return
    }
    contesto.mostraErrori([])
    classi = esito.dati.classi
    tendinaClasse.replaceChildren(
      ...(classi.length === 0 ? [h('option', { value: '' }, t.nessunaClasseInQuellAnno)] : []),
      ...classi.map((c) =>
        h('option', { value: c.id }, `${c.nome} — ${quanti(c.persone, L.pif)}`),
      ),
    )
    tendinaClasse.value = classi[0]?.id ?? ''
    proponiNome(tendinaClasse.value)
  }

  let documentoScelto = documenti[0].percorso
  const modale = apriModale({
    titolo: t.titoloImporta,
    larghezza: 'stretta',
    aiuto: t.aiutoImporta,
    corpo: (contesto) =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'percorso',
          etichetta: t.dallAnno,
          tipo: 'select',
          richiesto: true,
          valore: documentoScelto,
          opzioni: documenti.map((d) => ({
            valore: d.percorso,
            testo: d.etichetta ? `${d.etichetta} — ${d.nome}` : d.nome,
          })),
          al: (valore) => {
            documentoScelto = valore
            void leggiClassi(valore, contesto)
          },
        }),
        campoClasse,
        campoNome,
        campo({
          nome: 'anagrafica',
          etichetta: t.anagrafica,
          tipo: 'checkbox',
          valore: true,
          aiuto: t.aiutoAnagrafica,
        }),
        campo({
          nome: 'corsi',
          etichetta: t.corsiEMaterie,
          tipo: 'checkbox',
          valore: false,
          aiuto: t.aiutoCorsi,
        }),
      ),
    testoSalva: parole().importa,
    alSalva: async (valori, contesto) => {
      const percorso = String(valori.percorso ?? '')
      const classeId = String(valori.classeId ?? '')
      const nome = String(valori.nome ?? '').trim()
      if (!percorso || !classeId || !nome) {
        contesto.mostraErrori([t.obbligatori])
        return
      }
      // Lo stesso controllo dell'host, prima di leggere un altro file.
      const controllo = validaClasse(
        { id: '', nome, annoId: annoCorrente()?.id ?? '' },
        stato.registro.classi,
      )
      if (!controllo.valido) {
        contesto.mostraErrori(controllo.errori)
        return
      }
      const risposta = await inviaDalModulo(contesto, {
        tipo: 'classe.importa',
        percorso,
        classeId,
        nome,
        anagrafica: valori.anagrafica === true,
        corsi: valori.corsi === true,
      })
      if (!risposta) return
      contesto.chiudi()
      notifica(t.importata(nome), 'successo')
      if (risposta.creato) aggiorna({ vista: 'classi', classeId: risposta.creato.id })
    },
  })
  void leggiClassi(documentoScelto, modale)
}

export function vistaClassi (): Figlio {
  const t = testi()
  const L = lessico()
  const anno = annoCorrente()
  if (!anno) {
    return statoVuotoAnno({ simbolo: 'classi', testo: t.classiInUnAnno, crea: () => moduloAnno() })
  }

  // La stessa che mostra la tendina della barra, e su cui lavorano i comandi.
  const classe = classeDellaPaginaClassi()

  return h(
    'div',
    { class: 'vista vista--classi' },
    testataVista({
      titolo: t.titolo,
      sottotitolo: t.anno(anno.etichetta),
      aiuto: t.aiuto,
      // «Nuova classe» sta nella riga delle azioni.
    }),
    h(
      'div',
      { class: 'colonna' },
      classe
        ? h(
            'div',
            { class: 'colonna' },
            dettagliClasse(classe),
            scheda({
              titolo: classe.nome,
              sottotitolo:
                [
                  quanti(allieviAttivi(classe).length, L.pif),
                  materieDiClasse(classe.id).join(', '),
                  classe.archiviata ? t.archiviataMinuscolo : '',
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined,
              // I comandi della classe stanno nella riga delle azioni; i dettagli nel riquadro sopra.
              contenuto: h(
                'div',
                null,
                classe.note ? h('p', { class: 'nota-classe' }, classe.note) : null,
                // Il fascicolo del docente di classe ha la sua voce nel menu: qui solo la pastiglia.
                classe.docenteDiClasse
                  ? pastiglia(L.docenteClasse.singolare, 'informativo', 'posta')
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
              titolo: t.nessunaClasseTitolo,
              testo: t.cheCosEUnaClasse,
              azione: pulsante({
                testo: t.primaClasse,
                variante: 'primario',
                al: () => moduloClasse(),
              }),
            }),
          ),
    ),
  )
}
