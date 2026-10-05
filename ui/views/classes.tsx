// Classi e allievi: la classe scelta nella tendina «Classe» della barra, con
// l'anagrafica dei suoi allievi (recapiti, azienda di tirocinio). Solo
// anagrafica: che cosa si insegna sta in Corsi, come va un allievo nella sua
// scheda.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as EventoTastiera,
  type ReactElement,
  type ReactNode,
} from 'react'

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { scriviIndirizzo } from '#core/dominio/addresses.js'
import { Uno, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { formattaData } from '#core/dominio/dates.js'
import type { Classe } from '#core/dominio/models.js'
import type { DocumentoRecente } from '#contract/protocol.js'
import {
  Campo,
  Collegamento,
  Pastiglia,
  Pulsante,
  Scheda,
  StatoVuoto,
  TestataVista,
} from '#ui/components/base.js'
import { apriModale, type ContestoModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { RecapitoPremibile, type GenereRecapito } from '#ui/components/contacts.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Input, TextArea } from '#ui/fields.js'
import {
  chiediEliminazione,
  moduloAllievo,
  moduloAnno,
  moduloClasse,
  moduloImportaAllievi,
} from '#ui/forms.js'
import { azione, chiedi } from '#ui/bridge.js'
import { classeDellaPaginaClassi } from '#ui/context.js'
import { validaClasse } from '#core/dominio/validation.js'
import {
  annoCorrente,
  classePerId,
  materieDiClasse,
  stato,
  vai,
} from '#ui/state.js'
import { Tabella } from '#ui/components/table.js'
import { CellaNome } from '#ui/components/avatar.js'
import { inviaDalModulo } from '#ui/forms/common.js'
import { telaioVista } from '#ui/viewFrame.js'
import { testi } from './classes.testi.js'

/**
 * Una casella che può essere vuota: il trattino dice «non c'è». Con `apribile`
 * il contenuto apre il programma di posta, per scrivere a una persona sola.
 */
function cella (
  valore: string | undefined,
  classe?: string,
  apribile?: GenereRecapito,
): ReactNode {
  if (!valore) return <td className={classe}><span className="testo-quieto">—</span></td>
  const contenuto = apribile ? <RecapitoPremibile genere={apribile} valore={valore} /> : valore
  return <td className={classe}>{contenuto}</td>
}

function tabellaAllievi (classe: Classe): ReactElement {
  const allievi = ordinaAllievi(classe.allievi)
  const t = testi()
  const L = lessico()

  if (allievi.length === 0) {
    return (
      <StatoVuoto
        simbolo="utente"
        titolo={t.classeVuota}
        testo={t.comeSiRiempie}
        azione={(
          <div className="stato-vuoto__pulsanti">
            <Pulsante
              testo={t.aggiungiPif}
              variante="primario"
              simbolo="piu"
              al={() => moduloAllievo(classe)}
            />
            <Pulsante
              testo={t.incollaElenco}
              simbolo="piano"
              al={() => moduloImportaAllievi(classe)}
            />
          </div>
        )}
      />
    )
  }

  return (
    <Tabella
      variante="allievi"
      // Tante colonne: scorre di lato, e un campo salvato sopra non la riporta a sinistra.
      // testo-fisso: chiave di scorrimento, non si legge
      scorrimento={`allievi:${classe.id}`}
      intestazione={(
        <>
          <th>{Uno(L.pif)}</th>
          <th>{t.nascita}</th>
          <th>{parole().indirizzo}</th>
          <th>{Uno(L.email)}</th>
          <th>{Uno(L.datore)}</th>
          <th>{t.indirizzoDatore}</th>
          <th>{t.emailDatore}</th>
          <th className="tabella__azioni" />
        </>
      )}
      righe={allievi.map((allievo) => (
        <tr key={allievo.id} className={allievo.attivo ? undefined : 'tabella__riga--spenta'}>
          <th className="tabella__nome" scope="row">
            {/* Il nome apre la scheda, non il modulo. */}
            <CellaNome
              persona={allievo}
              nome={(
                <Collegamento
                  testo={nomeCompleto(allievo)}
                  titolo={t.apriScheda}
                  al={() => { vai({ pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: allievo.id } }, { contesto: { classeId: classe.id } }) }}
                />
              )}
            >
              {allievo.attivo ? null : <Pastiglia testo={t.nonFrequenta} tono="quiete" />}
            </CellaNome>
          </th>
          {/* La data come sui moduli, non in ISO: si ricopia a mano. */}
          {cella(allievo.dataNascita ? formattaData(allievo.dataNascita) : undefined)}
          {cella(scriviIndirizzo(allievo.indirizzo) || undefined)}
          {cella(allievo.email, 'tabella__recapito', 'email')}
          {cella(allievo.azienda)}
          {cella(scriviIndirizzo(allievo.indirizzoDatore) || undefined)}
          {cella(allievo.emailDatore, 'tabella__recapito', 'email')}
          <td className="tabella__azioni">
            <Pulsante
              simbolo="matita"
              variante="fantasma"
              titolo={parole().modifica}
              al={() => moduloAllievo(classe, allievo)}
            />
          </td>
        </tr>
      ))}
    />
  )
}

// ------------------------------------------------------------ i dettagli

type CampoClasse = 'nome' | 'colore' | 'note' | 'docenteDiClasse' | 'archiviata'

/**
 * Scrive un campo cambiato sulla classe com'è adesso: la mutazione atomica
 * `classe.modifica` invia solo il campo toccato ed evita di sovrascrivere
 * campi concorrenti o l'elenco degli allievi.
 */
async function scriviClasse (
  classeId: string,
  campo: CampoClasse,
  valore: string | boolean,
  torna: () => void,
): Promise<void> {
  const viva = classePerId(classeId)
  if (!viva) return
  const pulito = typeof valore === 'string' && campo !== 'note' ? valore.trim() : valore
  const aggiornata: Classe = {
    ...viva,
    [campo]: pulito,
  }
  const esito = validaClasse(aggiornata, stato.registro.classi)
  if (!esito.valido) {
    notifica(esito.errori.join(' '), 'avviso')
    torna()
    return
  }
  const risposta = await azione({
    tipo: 'classe.modifica',
    classeId,
    [campo]: pulito,
  })
  if (!risposta.ok) torna()
}

/** La classe se ne va, dopo aver detto che cosa si porta via. */
async function eliminaClasse (classe: Classe): Promise<void> {
  if (!(await chiediEliminazione({ genere: 'classe', id: classe.id }))) return
  const risposta = await azione({ tipo: 'classe.elimina', classeId: classe.id })
  if (risposta.ok) vai({ pagina: 'pagina.classi' }, { contesto: { classeId: null } })
}

/**
 * I dettagli della classe, modificabili sul posto: nome, colore, docenza di
 * classe, archiviazione, note. Ogni campo si salva uscendone (Esc torna com'era).
 */
function dettagliClasse (classe: Classe): ReactElement {
  const t = testi()
  const p = parole()
  const testoInRiga = (
    campo: 'nome',
    etichetta: string,
    valore: string,
    segnaposto: string,
  ): ReactElement => (
    <label className="dettagli-classe__campo">
      <span>{etichetta}</span>
      <Input
        className="campo__controllo"
        type="text"
        valore={valore}
        // testo-fisso: chiave del fuoco, non si legge
        data-fuoco={`classe-${classe.id}-${campo}`}
        placeholder={segnaposto}
        aria-label={etichetta}
        onCambio={(evento) => {
          const vivo = evento.currentTarget as HTMLInputElement
          void scriviClasse(classe.id, campo, vivo.value, () => {
            vivo.value = valore
          })
        }}
        onKeyDown={(evento: EventoTastiera<HTMLInputElement>) => {
          const vivo = evento.currentTarget
          if (evento.key === 'Enter') vivo.blur()
          if (evento.key === 'Escape') {
            vivo.value = valore
            vivo.blur()
          }
        }}
      />
    </label>
  )

  const spunta = (
    campo: 'docenteDiClasse' | 'archiviata',
    etichetta: string,
    aiuto: string,
  ): ReactElement => (
    <label className="dettagli-classe__spunta" title={aiuto}>
      <Input
        type="checkbox"
        spuntato={classe[campo]}
        // testo-fisso: chiave del fuoco, non si legge
        data-fuoco={`classe-${classe.id}-${campo}`}
        onCambio={(evento) => {
          const vivo = evento.currentTarget as HTMLInputElement
          void scriviClasse(classe.id, campo, vivo.checked, () => {
            vivo.checked = classe[campo]
          })
        }}
      />
      <span>{etichetta}</span>
    </label>
  )

  return (
    <Scheda
      titolo={p.dettagli}
      azioni={(
        <Pulsante
          testo={t.eliminaClasse}
          simbolo="cestino"
          variante="fantasma"
          titolo={t.cosaSiPortaVia}
          al={() => eliminaClasse(classe)}
        />
      )}
    >
      <div className="dettagli-classe">
        <div className="dettagli-classe__riga">
          <label className="dettagli-classe__campo dettagli-classe__campo--colore">
            <span>{parole().colore}</span>
            <Input
              className="dettagli-classe__colore"
              type="color"
              valore={classe.colore}
              // testo-fisso: chiave del fuoco, non si legge
              data-fuoco={`classe-${classe.id}-colore`}
              aria-label={t.coloreNelCalendario}
              title={t.coloreDellaClasse}
              onCambio={(evento) => {
                const vivo = evento.currentTarget as HTMLInputElement
                void scriviClasse(classe.id, 'colore', vivo.value, () => {
                  vivo.value = classe.colore
                })
              }}
            />
          </label>
          {testoInRiga('nome', t.nomeClasse, classe.nome, 'I MEC A')}
        </div>
        <div className="dettagli-classe__riga">
          {spunta('docenteDiClasse', t.sonoDocenteDiClasse, t.aiutoDocenteDiClasse)}
          {spunta('archiviata', t.archiviata, t.aiutoArchiviata)}
        </div>
        <label className="dettagli-classe__campo">
          <span>{p.note}</span>
          <TextArea
            className="campo__controllo"
            rows={2}
            valore={classe.note ?? ''}
            // testo-fisso: chiave del fuoco, non si legge
            data-fuoco={`classe-${classe.id}-note`}
            placeholder={t.noteSullaClasse}
            aria-label={p.note}
            onCambio={(evento) => {
              const vivo = evento.currentTarget as HTMLTextAreaElement
              void scriviClasse(classe.id, 'note', vivo.value, () => {
                vivo.value = classe.note ?? ''
              })
            }}
          />
        </label>
      </div>
    </Scheda>
  )
}

/** Una classe di un altro anno, come la elenca `classi.altrove`. */
interface ClasseAltrove {
  id: string
  nome: string
  persone: number
  materie: string[]
}

/** Come stanno le classi del documento scelto: in lettura, illeggibili o lette. */
type ClassiLette =
  | { stato: 'lettura' }
  | { stato: 'errore' }
  | { stato: 'pronte', classi: ClasseAltrove[] }

/**
 * Il corpo della modale d'importazione: le classi del documento scelto si
 * leggono quando lo si sceglie, e il nome della classe scelta si propone.
 */
function CorpoImportaClasse ({ documenti, contesto }: {
  documenti: readonly DocumentoRecente[]
  contesto: ContestoModale
}): ReactElement {
  const t = testi()
  const L = lessico()
  const [scelto, impostaScelto] = useState(documenti[0].percorso)
  const [lette, impostaLette] = useState<ClassiLette>({ stato: 'lettura' })
  const modulo = useRef<HTMLDivElement | null>(null)
  /** Il nome proposto per ultimo: finché è quello, lo si può cambiare da qui. */
  const proposto = useRef('')
  const classi = lette.stato === 'pronte' ? lette.classi : []

  /** Il nome della classe scelta, se chi importa non ne ha già scritto un altro. */
  function proponiNome (classeId: string): void {
    const casella = modulo.current?.querySelector<HTMLInputElement>('input[name="nome"]')
    if (!casella) return
    const nome = classi.find((c) => c.id === classeId)?.nome ?? ''
    if (casella.value.trim() === '' || casella.value === proposto.current) casella.value = nome
    proposto.current = nome
  }

  // Le classi dell'altro documento, lette quando lo si sceglie.
  useEffect(() => {
    let vecchia = false
    impostaLette({ stato: 'lettura' })
    void chiedi<{ anno: string, classi: ClasseAltrove[] }>('classi.altrove', { percorso: scelto }).then((esito) => {
      // Nel frattempo si è scelto un altro documento: questa risposta è vecchia.
      if (vecchia) return
      if (!esito.ok || !esito.dati) {
        impostaLette({ stato: 'errore' })
        contesto.mostraErrori(esito.errori.length ? esito.errori : [testi().nonSiLegge])
        return
      }
      contesto.mostraErrori([])
      impostaLette({ stato: 'pronte', classi: esito.dati.classi })
    })
    return () => { vecchia = true }
  }, [scelto, contesto])

  // Appena lette, la prima classe è la scelta e il suo nome si propone.
  useLayoutEffect(() => {
    if (lette.stato === 'pronte') proponiNome(lette.classi[0]?.id ?? '')
    // `proponiNome` legge le classi di questo disegno: basta `lette`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lette])

  const vociClasse = lette.stato === 'lettura'
    ? [{ valore: '', testo: t.lettura }]
    : lette.stato === 'errore'
      ? [{ valore: '', testo: t.nessunaClasse }]
      : [
          ...(classi.length === 0 ? [{ valore: '', testo: t.nessunaClasseInQuellAnno }] : []),
          ...classi.map((c) => ({ valore: c.id, testo: `${c.nome} — ${quanti(c.persone, L.pif)}` })),
        ]

  return (
    <div ref={modulo} className="modulo">
      <Campo
        nome="percorso"
        etichetta={t.dallAnno}
        tipo="select"
        richiesto
        valore={documenti[0].percorso}
        opzioni={documenti.map((d) => ({
          valore: d.percorso,
          testo: d.etichetta ? `${d.etichetta} — ${d.nome}` : d.nome,
        }))}
        al={(valore) => impostaScelto(valore)}
      />
      <Campo
        // Ogni lettura è una tendina nuova: la scelta di prima non resta su voci d'altri.
        key={`${scelto}:${lette.stato}`}
        nome="classeId"
        etichetta={Uno(L.classe)}
        tipo="select"
        richiesto
        disabilitato={lette.stato === 'lettura'}
        valore={classi[0]?.id ?? ''}
        opzioni={vociClasse}
        al={(valore) => proponiNome(valore)}
      />
      <Campo
        nome="nome"
        etichetta={t.nomeNuovaClasse}
        tipo="text"
        richiesto
        aiuto={t.aiutoNome}
      />
      <Campo
        nome="anagrafica"
        etichetta={t.anagrafica}
        tipo="checkbox"
        valore
        aiuto={t.aiutoAnagrafica}
      />
      <Campo
        nome="corsi"
        etichetta={t.corsiEMaterie}
        tipo="checkbox"
        valore={false}
        aiuto={t.aiutoCorsi}
      />
    </div>
  )
}

/**
 * «Importa classe dall'anno…»: porta una classe da un altro documento `.regi`,
 * di norma quello dell'anno scorso. Gli anni proposti sono i recenti e i
 * preferiti, tolti quello aperto e quelli irraggiungibili. Il documento scelto
 * si legge (`classi.altrove`) ma non si apre.
 */
export function chiediImportaClasse (): void {
  const t = testi()
  const documenti = stato.documenti.elenco.filter((d) => !d.aperto && !d.mancante)
  if (documenti.length === 0) {
    notifica(t.nessunAltroAnno, 'avviso')
    return
  }
  apriModale({
    titolo: t.titoloImporta,
    larghezza: 'stretta',
    aiuto: t.aiutoImporta,
    corpo: (contesto) => <CorpoImportaClasse documenti={documenti} contesto={contesto} />,
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
      if (risposta.creato) vai({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: risposta.creato.id } })
    },
  })
}

function VistaClassi (): ReactElement {
  const t = testi()
  const L = lessico()
  const anno = annoCorrente()
  if (!anno) {
    return <StatoVuotoAnno simbolo="classi" testo={t.classiInUnAnno} crea={() => moduloAnno()} telaio={telaioVista()} />
  }

  // La stessa che mostra la tendina della barra, e su cui lavorano i comandi.
  const classe = classeDellaPaginaClassi()

  return (
    <div className="vista vista--classi" data-telaio={telaioVista()}>
      <TestataVista
        titolo={t.titolo}
        sottotitolo={t.anno(anno.etichetta)}
        aiuto={t.aiuto}
        // «Nuova classe» sta nella riga delle azioni.
      />
      <div className="colonna" data-telaio="classi:corpo">
        {classe
          ? (
              // testo-fisso: chiave di telaio
              <div key={classe.id} className="colonna" data-telaio={`classe:${classe.id}`}>
                {dettagliClasse(classe)}
                <Scheda
                  titolo={classe.nome}
                  sottotitolo={
                    [
                      quanti(allieviAttivi(classe).length, L.pif),
                      materieDiClasse(classe.id).join(', '),
                      classe.archiviata ? t.archiviataMinuscolo : '',
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  // I comandi della classe stanno nella riga delle azioni; i dettagli nel riquadro sopra.
                >
                  <div>
                    {classe.note ? <p className="nota-classe">{classe.note}</p> : null}
                    {/* Il fascicolo del docente di classe ha la sua voce nel menu: qui solo la pastiglia. */}
                    {classe.docenteDiClasse
                      ? <Pastiglia testo={L.docenteClasse.singolare} tono="informativo" simbolo="posta" />
                      : null}
                    {tabellaAllievi(classe)}
                  </div>
                </Scheda>
              </div>
            )
          : (
              <div className="colonna">
                <StatoVuoto
                  simbolo="classi"
                  titolo={t.nessunaClasseTitolo}
                  testo={t.cheCosEUnaClasse}
                  azione={(
                    <Pulsante
                      testo={t.primaClasse}
                      variante="primario"
                      al={() => moduloClasse()}
                    />
                  )}
                />
              </div>
            )}
      </div>
    </div>
  )
}

export function vistaClassi (): ReactElement {
  return <VistaClassi />
}
