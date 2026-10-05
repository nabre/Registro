// I periodi di assenze del docente di classe: i fogli, la mail, le firme.
// Matrice come nei documenti (allievi in riga), con colonne che sono tre momenti
// dello stesso foglio: parte, mail per la firma, torna firmato. Un periodo per
// volta. I PDF di classe entrano come nell'archivio documentale e le pagine si
// posano sulla casella giusta, che dice anche che foglio sono; il foglio si
// guarda nella cornice accanto alla matrice, con le frecce nell'ordine della matrice.

import type { MouseEvent as EventoMouse, ReactElement, ReactNode } from 'react'

import {
  avanzamentoAssenze,
  daSpedire,
  destinatariAssenze,
  faseRiga,
  foglioDi,
  periodoDetto,
  raggiungibile,
  rigaDi,
  righeVive,
  TIPI_RAPPORTO,
  vergini,
  type RichiestaFirma,
} from '#core/dominio/absences.js'
import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import type { SegnalazioneAssenza } from '#core/dominio/alerts.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { elenco } from '#core/i18n/index.js'
import { formattaData, giornoDi } from '#core/dominio/dates.js'
import type {
  Allievo,
  BloccoAssenze,
  Classe,
  Istante,
  Smistamento,
  TipoRapporto,
} from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import {
  conAttesa,
  Pastiglia,
  Pulsante,
  Scheda,
  StatoVuoto,
  TitoloGruppo,
} from '#ui/components/base.js'
import { SintesiIncassata } from '#ui/components/filters.js'
import { Icona } from '#ui/components/icons.js'
import { dimentica } from '#ui/components/thumbnails.js'
import { conferma } from '#ui/components/modal.js'
import { Pendenza } from '#ui/components/pending.js'
import { Tabella } from '#ui/components/table.js'
import { CellaNome } from '#ui/components/avatar.js'
import { moduloBloccoAssenze, moduloImportaAssenze } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import { aggiorna, fascicoloDi, stato, toccaIlSemestreScelto, vai } from '#ui/state.js'

import { corniceFoglio, inventario, pannelloArchivio, scorri } from './archive.js'
import { accettaPagineAssenze } from './sorting/pageDrop.js'
import {
  caricaPdf,
  codaLettura,
  codaLetturaInIsola,
  comandiDelPdf,
  pdfDaDividere,
  pdfInAttesa,
  rendiBersaglio,
  type Vetrina,
} from './sorting.js'
import { testi } from './absences.testi.js'

/** Le cinque colonne della matrice, nell'ordine in cui si percorrono. */
interface Colonna {
  chiave: string
  titolo: string
  breve: string
}

function colonne (): Colonna[] {
  const t = testi().colonne
  return [
    { chiave: 'vergine-assenze', ...t.vergineAssenze },
    { chiave: 'vergine-ritardi', ...t.vergineRitardi },
    { chiave: 'invio', ...t.invio },
    { chiave: 'firmato-assenze', ...t.firmatoAssenze },
    { chiave: 'firmato-ritardi', ...t.firmatoRitardi },
  ]
}

// ------------------------------------------------- i fogli del periodo

/**
 * Un foglio del periodo come lo si guarda in pagina: di chi è, che cos'è, e se
 * il file c'è ancora. È l'equivalente di `RigaArchivio` dell'archivio documentale.
 */
interface FoglioInPagina {
  /** Il percorso dentro l’anno: è quel che la cornice inquadra. */
  file: string
  /** Come si chiamava il file quando è arrivato. */
  nome: string
  /** Di chi è, per esteso: è il titolo in testa alla cornice. */
  etichetta: string
  /** Che foglio è: «assenze», «ritardi firmati». */
  che: string
  allievoId: string
  genere: TipoRapporto
  firmato: boolean
  aggiuntoIl: Istante | null
  /** Quanto misura, in byte; zero quando il file non è nell’inventario. */
  misura: number
  /** Quante volte è stato riscritto: fa ricaricare la cornice. */
  revisione: number
  /** Se il file è ancora dentro il documento dell’anno. */
  presente: boolean
  /**
   * Il PDF di classe non ancora diviso, se la voce è uno di quelli: sta in fila
   * con i fogli perché le frecce scorrono una fila sola.
   */
  smistamentoId?: string
}

/** Le quattro caselle di una riga, nell’ordine in cui stanno in colonna. */
const CASELLE: Array<{ genere: TipoRapporto, firmato: boolean }> = [
  { genere: 'assenze', firmato: false },
  { genere: 'ritardi', firmato: false },
  { genere: 'assenze', firmato: true },
  { genere: 'ritardi', firmato: true },
]

/**
 * I fogli caricati in un periodo nell'ordine della matrice (persone, poi caselle
 * da sinistra). Un foglio il cui file non c'è più resta in elenco, per vederlo.
 */
function fogliDelPeriodo (
  blocco: BloccoAssenze,
  allievi: Allievo[],
  daDividere: Smistamento[] = [],
): FoglioInPagina[] {
  const t = testi()
  const fogli: FoglioInPagina[] = []
  for (const allievo of allievi) {
    const riga = rigaDi(blocco, allievo.id)
    if (!riga) continue
    for (const casella of CASELLE) {
      const foglio = foglioDi(riga, casella.genere, casella.firmato)
      if (!foglio) continue
      fogli.push({
        file: foglio.file,
        nome: foglio.nome,
        etichetta: nomeCompleto(allievo),
        che: t.foglio(casella.genere, casella.firmato),
        allievoId: allievo.id,
        genere: casella.genere,
        firmato: casella.firmato,
        aggiuntoIl: foglio.aggiuntoIl ?? null,
        ...inventario(foglio.file),
      })
    }
  }

  // In fondo i PDF ancora da dividere, come nell'archivio.
  for (const smistamento of daDividere) {
    const restano = smistamento.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0)
    fogli.push({
      file: smistamento.file,
      nome: smistamento.nome,
      etichetta: smistamento.nome,
      che: t.daDividere(restano || smistamento.pagine),
      allievoId: '',
      genere: 'assenze',
      firmato: false,
      aggiuntoIl: smistamento.arrivatoIl,
      smistamentoId: smistamento.id,
      ...inventario(smistamento.file),
    })
  }
  return fogli
}

/**
 * Apre un foglio nella cornice, o la chiude con `null`. Cambiando foglio si
 * scordano le pagine disegnate: pesano, e un percorso riusato mostrerebbe la
 * scansione vecchia.
 */
function guardaIlFoglio (percorso: string | null): void {
  if (percorso !== stato.anteprimaAssenze) dimentica()
  aggiorna({ anteprimaAssenze: percorso })
}

/**
 * La cornice di questa pagina per i PDF che entrano: il giro è quello
 * dell'archivio documentale, qui si dice solo dove guardare il PDF appena entrato.
 */
const VETRINA_ASSENZE: Vetrina = {
  aperto: () => stato.anteprimaAssenze,
  apri: guardaIlFoglio,
}

/** Vero se quel foglio è quello aperto adesso: la casella lo dice accendendosi. */
function apertoQui (percorso: string | undefined): boolean {
  return Boolean(percorso) && stato.anteprimaAssenze === percorso
}

/** Dove sta, nell’elenco, il foglio aperto; `-1` se non se ne guarda nessuno. */
function indiceAperto (fogli: FoglioInPagina[]): number {
  const percorso = stato.anteprimaAssenze
  return percorso ? fogli.findIndex((foglio) => foglio.file === percorso) : -1
}

/**
 * Una casella di foglio: un clic apre il PDF se c'è o lo chiede se manca; il
 * cestino compare passando sulla riga. Stesso gesto della matrice dei documenti.
 */
function cellaFoglio (
  classe: Classe,
  blocco: BloccoAssenze,
  allievo: Allievo,
  genere: TipoRapporto,
  firmato: boolean,
): ReactElement {
  const t = testi()
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

  return (
    <td
      // testo-fisso: la chiave della casella
      key={`${genere}:${firmato ? 'firmato' : 'vergine'}`}
      className="tabella__cella"
      // La casella prende anche le pagine di un PDF di classe: che cosa siano
      // (assenze o ritardi, vergini o firmati) lo dice la casella, non il file.
      {...accettaPagineAssenze({
        classeId: classe.id,
        bloccoId: blocco.id,
        allievoId: allievo.id,
        genere,
        firmato,
        etichetta: `${nomeCompleto(allievo)} · ${t.foglio(genere, firmato)}`,
      })}
    >
      <div className="cella-documento__gruppo">
        <button
          className={classi(
            'cella-documento',
            foglio
              ? 'cella-documento--consegnato'
              : atteso
                ? 'cella-documento--atteso'
                : 'cella-documento--fuori',
            foglio && apertoQui(foglio.file) && 'cella-documento--aperta',
          )}
          type="button"
          title={foglio
            ? t.guarda(foglio.nome)
            : t.sceltaFile(t.foglio(genere, firmato), nomeCompleto(allievo))}
          // Il foglio si apre nella cornice accanto; il programma del sistema resta a un
          // clic in testa alla cornice.
          onClick={(evento: EventoMouse<HTMLButtonElement>) => {
            if (foglio) {
              guardaIlFoglio(foglio.file)
              return
            }
            void conAttesa(
              evento.currentTarget,
              azione({ tipo: 'assenze.foglio.aggiungi', ...comando }),
            )
          }}
        >
          <Icona nome={foglio ? (firmato ? 'firma' : 'documento') : 'piu'} classe="icona--minuta" />
        </button>
        {foglio
          ? (
              <Pulsante
                simbolo="cestino"
                variante="fantasma"
                titolo={t.togliFile(foglio.nome)}
                classe="cella-documento__modifica"
                al={() => {
                  // Prima si chiude la cornice, se inquadrava il foglio che si sta buttando.
                  if (apertoQui(foglio.file)) guardaIlFoglio(null)
                  return azione({ tipo: 'assenze.foglio.togli', ...comando })
                }}
              />
            )
          : null}
      </div>
    </td>
  )
}

/**
 * La casella della mail: partita, non partita o fallita; il motivo del fallimento
 * (di solito un indirizzo, da correggere sulla scheda personale) sta nel titolo.
 */
function cellaInvio (classe: Classe, blocco: BloccoAssenze, allievo: Allievo): ReactElement {
  const t = testi()
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
        testo: t.nessunIndirizzo(nomeCompleto(allievo), senzaIndirizzo.join(', ')),
      })
      return
    }
    const sicuro = await conferma({
      titolo: partita
        ? t.rifareBozza(nomeCompleto(allievo))
        : t.preparareBozza(indirizzi.join(', ')),
      testo: t.allegati(pronti) + (partita ? t.giaPartita : ''),
      testoConferma: t.prepara,
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
    return (
      <td className="tabella__cella">
        <span className="cella-documento cella-documento--vuota">—</span>
      </td>
    )
  }

  return (
    <td className="tabella__cella">
      {/* Busta e visto affiancati, come documento e cestino nelle altre caselle, per
          non raddoppiare l'altezza della riga. */}
      <div className="cella-documento__gruppo">
        <button
          className={classi(
            'cella-documento',
            invio?.errore
              ? 'cella-documento--scaduto'
              : partita
                ? 'cella-documento--consegnato'
                : 'cella-documento--atteso',
          )}
          type="button"
          title={invio?.errore
            ? `${t.nonPartitaPerche(invio.errore)}\n${parole().riprova}`
            : partita
              ? t.speditaIl(
                  formattaData(giornoDi(invio?.inviatoIl) ?? ''),
                  invio?.destinatari.join(', ') ?? '',
                )
              : indirizzi.length === 0
                ? t.mancaIndirizzo(senzaIndirizzo.join(', '))
                : t.spedisciA(indirizzi.join(', '))}
          onClick={(evento: EventoMouse<HTMLButtonElement>) =>
            void conAttesa(evento.currentTarget, spedisci())}
        >
          <Icona nome={invio?.errore ? 'avviso' : partita ? 'spunta' : 'posta'} classe="icona--minuta" />
        </button>
        {/* Il visto accanto alla busta: la bozza la apre il pulsante grande, che sia
            partita lo dice questo. */}
        {pronti > 0 || partita
          ? (
              <Pulsante
                simbolo="spunta"
                variante={partita ? 'sottile' : 'fantasma'}
                classe="cella-documento__modifica"
                titolo={partita
                  ? t.riportaDaMandare(nomeCompleto(allievo))
                  : t.segnaSpedita(nomeCompleto(allievo))}
                al={() =>
                  azione({
                    tipo: 'assenze.spunta',
                    classeId: classe.id,
                    bloccoId: blocco.id,
                    allievoId: allievo.id,
                    spedita: !partita,
                  })}
              />
            )
          : null}
      </div>
    </td>
  )
}

/** In che fase sta un allievo, detto in una pastiglia. */
function pastigliaFase (blocco: BloccoAssenze, allievo: Allievo): ReactElement {
  const t = testi()
  switch (faseRiga(rigaDi(blocco, allievo.id))) {
    case 'firmato':
      return <Pastiglia testo={t.firmato} tono="positivo" simbolo="spunta" />
    case 'in-attesa':
      return <Pastiglia testo={t.inAttesa} tono="informativo" />
    case 'da-spedire':
      return <Pastiglia testo={t.daSpedire} tono="attenzione" />
    default:
      return <span className="testo-quieto">—</span>
  }
}

function tabellaAssenze (classe: Classe, blocco: BloccoAssenze, allievi: Allievo[]): ReactElement {
  const t = testi()
  return (
    <Tabella
      variante={['documenti', 'assenze']}
      griglia
      scorrimento={`assenze:${classe.id}:${blocco.id}`} // testo-fisso: chiave di scorrimento
      intestazione={(
        <>
          <th className="tabella__nome">{Uno(lessico().pif)}</th>
          {colonne().map((colonna) => (
            <th key={colonna.chiave} className="tabella__richiesta" title={colonna.titolo}>
              <span className="tabella__richiesta-titolo">{colonna.breve}</span>
            </th>
          ))}
          <th className="tabella__media">{parole().stato}</th>
        </>
      )}
      righe={allievi.map((allievo) => (
        <tr
          key={allievo.id}
          className={faseRiga(rigaDi(blocco, allievo.id)) === 'fuori' ? 'tabella__riga--spenta' : undefined}
        >
          {/* `th scope="row"` e non `td`: lo schermo vocale legge di chi è la riga
              dall'intestazione. Lo stile è già comune (`.tabella th, .tabella td`). */}
          <th className="tabella__nome" scope="row">
            <CellaNome persona={allievo} nome={<span>{nomeCompleto(allievo)}</span>}>
              {raggiungibile(allievo)
                ? null
                : <small className="testo-negativo" title={t.senzaDatoreAiuto}>{t.senzaDatore}</small>}
            </CellaNome>
          </th>
          {TIPI_RAPPORTO.map((tipo) => cellaFoglio(classe, blocco, allievo, tipo, false))}
          {cellaInvio(classe, blocco, allievo)}
          {TIPI_RAPPORTO.map((tipo) => cellaFoglio(classe, blocco, allievo, tipo, true))}
          <td className="tabella__media">{pastigliaFase(blocco, allievo)}</td>
        </tr>
      ))}
    />
  )
}

/** Una riga dell'elenco dei periodi: come va, e un clic per aprirlo. */
function rigaPeriodo (classe: Classe, blocco: BloccoAssenze, aperto: boolean): ReactElement {
  const t = testi()
  const conto = avanzamentoAssenze(blocco)
  return (
    <li key={blocco.id} className={classi('periodo-assenze', aperto && 'periodo-assenze--aperto')}>
      <button
        className="documento__titolo"
        type="button"
        title={t.apriPeriodo}
        onClick={() => aggiorna({ bloccoAssenzeId: blocco.id })}
      >
        <Icona nome="calendario" classe="icona--minuta" />
        <span>{periodoDetto(blocco)}</span>
      </button>
      <small className="testo-quieto">
        {conto.interessati === 0
          ? t.nessunFoglio
          : t.contoPeriodo(conto.firmate, conto.interessati, conto.inviate)}
      </small>
      {conto.falliti > 0 ? <Pastiglia testo={t.nonPartite(conto.falliti)} tono="negativo" simbolo="avviso" /> : null}
      {conto.completo ? <Pastiglia testo={t.completo} tono="positivo" simbolo="spunta" /> : null}
      <Pulsante
        simbolo="matita"
        variante="fantasma"
        titolo={t.modificaPeriodo}
        al={() => moduloBloccoAssenze(classe, blocco)}
      />
    </li>
  )
}

/// -------------------------------------------------------------- la cornice

/**
 * Il foglio aperto: testata con i suoi gesti e sotto il rapporto. Stesso telaio
 * della cornice dell'archivio; in testa di chi è e se è vergine o firmato,
 * perché i due fogli di una persona si distinguono appena.
 */
function corniceAssenze (
  classe: Classe,
  blocco: BloccoAssenze,
  fogli: FoglioInPagina[],
  indice: number,
  allievi: Allievo[],
): ReactNode {
  const t = testi()
  const foglio = fogli[indice]
  const daDividere = foglio.smistamentoId
    ? stato.registro.smistamenti.find((sm) => sm.id === foglio.smistamentoId) ?? null
    : null
  const comando = {
    classeId: classe.id,
    bloccoId: blocco.id,
    allievoId: foglio.allievoId,
    genere: foglio.genere,
    firmato: foglio.firmato,
  }

  // Si chiede conferma anche qui, lontano dalla casella: un rapporto firmato è
  // spesso l'unica copia.
  const butta = async () => {
    const sicuro = await conferma({
      titolo: daDividere
        ? t.buttareVia(foglio.nome)
        : t.togliere(foglio.che, foglio.etichetta),
      testo: daDividere
        ? t.nelCestinoDaDividere(foglio.nome)
        : t.nelCestino(foglio.nome, foglio.firmato),
      testoConferma: daDividere ? parole().buttaVia : parole().togli,
      pericolo: true,
    })
    if (!sicuro) return
    guardaIlFoglio(null)
    await azione(
      daDividere
        ? { tipo: 'smistamento.elimina', smistamentoId: daDividere.id }
        : { tipo: 'assenze.foglio.togli', ...comando },
    )
  }

  return corniceFoglio({
    foglio,
    titolo: foglio.etichetta,
    pastiglia: daDividere
      ? <Pastiglia testo={foglio.che} tono="attenzione" simbolo="documento" />
      : (
          <Pastiglia
            testo={foglio.che}
            tono={foglio.firmato ? 'positivo' : 'neutro'}
            simbolo={foglio.firmato ? 'firma' : 'documento'}
          />
        ),
    daDividere,
    comandiPdf: comandiDelPdf,
    indice,
    totale: fogli.length,
    freccia: (passo) => scorri(fogli, indice, passo, {
      cosa: 'foglio',
      detto: (prossimo) => `${prossimo.etichetta} · ${prossimo.che}`,
      apri: (prossimo) => guardaIlFoglio(prossimo?.file ?? null),
    }),
    titoloCestino: t.togliFile(foglio.nome),
    // Il gesto con cui questa voce si apre nel programma del sistema.
    apriFuori: () =>
      azione(
        daDividere
          ? { tipo: 'smistamento.apri', smistamentoId: daDividere.id }
          : { tipo: 'assenze.foglio.apri', ...comando },
      ),
    butta,
    chiudi: () => guardaIlFoglio(null),
    manca: t.manca(foglio.nome),
    // Nessuna richiesta: le pagine qui vanno in una casella, scelta dal rilascio.
    richieste: [],
    allievi,
    coda: codaLettura,
    // Un rapporto ricaricato sta allo stesso percorso: la chiave lo distingue.
    chiave: 'assenze',
    titoloLettore: t.diChi(foglio.che, foglio.etichetta),
  })
}

/**
 * Le assenze da far firmare: l'elenco dei periodi e la matrice di quello aperto.
 * Sta nel pannello del docente di classe accanto ai documenti.
 */
export function schedaAssenze (classe: Classe): ReactElement {
  const t = testi()
  const fascicolo = fascicoloDi(classe.id)
  // Del periodo scelto: un blocco a cavallo di gennaio resta in tutti e due i semestri.
  const blocchi = toccaIlSemestreScelto([...fascicolo.assenze]).sort((a, b) =>
    b.dal.localeCompare(a.dal),
  )
  const allievi = ordinaAllievi(allieviAttivi(classe))
  const scelto =
    blocchi.find((b) => b.id === stato.bloccoAssenzeId) ?? blocchi[0] ?? null
  const conto = scelto ? avanzamentoAssenze(scelto) : null
  const pronte = scelto ? daSpedire(scelto) : []

  /**
   * Se per questa riga esce almeno un indirizzo, con la stessa regola del
   * gestore (`destinatariAssenze`): non solo il datore, ma anche persona,
   * rappresentante legale o recapiti del fascicolo, secondo il periodo.
   */
  const haIndirizzo = (riga: { allievoId: string }): boolean => {
    const allievo = classe.allievi.find((a) => a.id === riga.allievoId)
    if (!allievo || !scelto) return false
    return destinatariAssenze(scelto, allievo, fascicolo).indirizzi.length > 0
  }

  const spedibili = pronte.filter(haIndirizzo)

  const spedisciTutte = async () => {
    if (!scelto || spedibili.length === 0) return
    const senzaIndirizzo = pronte.length - spedibili.length
    const sicuro = await conferma({
      titolo: spedibili.length === 1
        ? t.preparareUna
        : t.preparareMolte(spedibili.length),
      testo: t.spiegaInvio + (senzaIndirizzo > 0 ? t.restanoIndietro(senzaIndirizzo) : ''),
      testoConferma: t.prepara,
    })
    if (!sicuro) return
    await azione({
      tipo: 'assenze.invia',
      classeId: classe.id,
      bloccoId: scelto.id,
      allieviIds: [],
    })
  }

  // I fogli del periodo aperto nell'ordine della matrice (le frecce della cornice
  // e il «7 di 23»), in coda i PDF di classe non ancora divisi.
  const daDividere = pdfInAttesa(classe)
  const fogli = scelto ? fogliDelPeriodo(scelto, allievi, daDividere) : []
  const indice = indiceAperto(fogli)

  const riquadro = (
    <Scheda
      titolo={t.titolo}
      aiuto={t.aiuto}
      azioni={scelto
        ? (
            <>
              <Pulsante
                testo={t.caricaPdf}
                simbolo="documento"
                variante="sottile"
                titolo={t.caricaPdfAiuto}
                al={() => caricaPdf(classe, VETRINA_ASSENZE)}
              />
              <Pulsante
                testo={t.importaFogli}
                simbolo="esporta"
                variante="sottile"
                titolo={t.importaFogliAiuto}
                al={() => moduloImportaAssenze(classe, scelto)}
              />
              {pronte.length > 0
                ? (
                    <Pulsante
                      testo={t.preparaInvio(spedibili.length)}
                      disabilitato={spedibili.length === 0}
                      titolo={spedibili.length === 0 ? t.completaIndirizzi : t.preparaRichieste}
                      simbolo="posta"
                      variante="primario"
                      al={() => spedisciTutte()}
                    />
                  )
                : null}
            </>
          )
        // Senza periodo la testata tiene comunque il posto dei comandi, vuoto.
        : <></>}
      contenuto={blocchi.length === 0
        ? <StatoVuoto simbolo="firma" titolo={t.nessunPeriodo} testo={t.spiegaPeriodo} />
        : (
            <div>
              <ul className="elenco-documenti">
                {blocchi.map((blocco) => rigaPeriodo(classe, blocco, blocco.id === scelto?.id))}
              </ul>
              {/* I PDF da dividere: una riga di nomi che porta alla cornice. */}
              {pdfDaDividere(classe, VETRINA_ASSENZE)}
              {/* La coda di lettura compare qui solo quando nessun PDF è aperto: altrimenti
                  sta fra le pagine. */}
              {indice >= 0 ? null : codaLetturaInIsola()}
              {scelto && conto
                ? (
                    <div>
                      <SintesiIncassata
                        campi={[
                          { etichetta: t.conAssenze, valore: String(conto.interessati) },
                          {
                            etichetta: t.spediti,
                            valore: `${conto.inviate}/${conto.interessati}`,
                            tono: conto.inviate === conto.interessati ? 'positivo' : 'attenzione',
                          },
                          {
                            etichetta: t.firmati,
                            valore: `${conto.firmate}/${conto.interessati}`,
                            tono: conto.completo ? 'positivo' : 'attenzione',
                          },
                          conto.falliti > 0
                            ? {
                                etichetta: t.nonPartiteBreve,
                                valore: String(conto.falliti),
                                tono: 'negativo',
                              }
                            : null,
                        ]}
                      />
                      {allievi.length === 0
                        ? <p className="testo-quieto">{t.matriceVuota}</p>
                        : tabellaAssenze(classe, scelto, allievi)}
                      {righeVive(scelto).length === 0
                        ? <p className="campo__aiuto">{t.nessunFoglioAiuto}</p>
                        : null}
                    </div>
                  )
                : null}
            </div>
          )}
    />
  )

  // Lo stesso telaio dell'archivio: matrice a sinistra, foglio a destra; a
  // cornice chiusa la matrice prende tutta la larghezza. Tutta la pagina è
  // bersaglio per i PDF trascinati da fuori, come nell'archivio.
  return pannelloArchivio(
    riquadro,
    scelto && indice >= 0 ? corniceAssenze(classe, scelto, fogli, indice, allievi) : null,
    `assenze:${classe.id}`, // testo-fisso: chiave di scorrimento
    rendiBersaglio(classe, VETRINA_ASSENZE),
  )
}

// ------------------------------------------------- le richieste di firma nel todo

/**
 * Una richiesta di firma come riga del todo: nasce dal caricamento di un foglio.
 * I suoi due gesti la chiudono: mandare la mail e caricare il foglio firmato.
 */
function rigaRichiesta (richiesta: RichiestaFirma): ReactElement {
  const t = testi()
  const partita = richiesta.fase === 'in-attesa'
  const chiusa = richiesta.fase === 'firmato'
  const etichetta = richiesta.errore
    ? { testo: t.nonPartita, tono: 'negativo' as const }
    : chiusa
      ? { testo: t.firmato, tono: 'positivo' as const }
      : partita
        ? { testo: t.inAttesaDellaFirma, tono: 'informativo' as const }
        : { testo: t.daSpedire, tono: 'attenzione' as const }

  return (
    <Pendenza
      // testo-fisso: la chiave della richiesta
      key={`${richiesta.classeId}:${richiesta.bloccoId}:${richiesta.allievo.id}`}
      classe="richiesta"
      // testo-fisso: classi CSS
      stato={[`richiesta--${richiesta.fase}`, richiesta.errore && 'richiesta--tardi']}
      testata={(
        <>
          {/* Il nome porta alla matrice del periodo. Servono tutte e tre le chiavi:
              `classeId` è quella che legge `classeDelFascicolo()`, `filtroClasseId` è il
              filtro che le pagine del corso si portano dietro, `bloccoAssenzeId` sceglie
              il periodo. */}
          <button
            className="richiesta__allievo"
            type="button"
            title={t.apriPeriodoDellaClasse}
            onClick={() => {
              vai(
                { pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: richiesta.classeId } },
                {
                  contesto: { filtroClasseId: richiesta.classeId },
                  altro: { bloccoAssenzeId: richiesta.bloccoId },
                },
              )
            }}
          >
            {nomeCompleto(richiesta.allievo)}
          </button>
          <span className="richiesta__dove testo-quieto">
            {`${richiesta.classe} · ${richiesta.periodo} · ` +
              elenco(richiesta.tipi.map((tipo) => t.foglio(tipo, false)))}
          </span>
          <Pastiglia testo={etichetta.testo} tono={etichetta.tono} />
        </>
      )}
      azioni={(
        <>
          {/* Da spedire: si prepara l'e-mail con i fogli in allegato, come la busta nella matrice. */}
          {richiesta.fase === 'da-spedire'
            ? (
                <Pulsante
                  testo={t.preparaEmail}
                  simbolo="posta"
                  variante="sottile"
                  al={() =>
                    azione({
                      tipo: 'assenze.invia',
                      classeId: richiesta.classeId,
                      bloccoId: richiesta.bloccoId,
                      allieviIds: [richiesta.allievo.id],
                    })}
                />
              )
            : null}
          {/* In attesa: si carica il foglio firmato, un tasto per rapporto perché
              l'azienda può rimandarne indietro uno solo. */}
          {partita
            ? richiesta.daFirmare.map((tipo) => (
                <Pulsante
                  key={tipo}
                  testo={t.foglio(tipo, true)}
                  simbolo="firma"
                  variante="sottile"
                  titolo={t.caricaFirmato(nomeCompleto(richiesta.allievo))}
                  al={() =>
                    azione({
                      tipo: 'assenze.foglio.aggiungi',
                      classeId: richiesta.classeId,
                      bloccoId: richiesta.bloccoId,
                      allievoId: richiesta.allievo.id,
                      genere: tipo,
                      firmato: true,
                    })}
                />
              ))
            : null}
          {/* Il visto segna la mail come mandata; su una già partita la riporta da mandare. */}
          {chiusa
            ? null
            : (
                <Pulsante
                  simbolo="spunta"
                  variante={partita ? 'sottile' : 'fantasma'}
                  titolo={partita ? t.riportaNonPartita : t.segnaSpeditaDaPosta}
                  al={() =>
                    azione({
                      tipo: 'assenze.spunta',
                      classeId: richiesta.classeId,
                      bloccoId: richiesta.bloccoId,
                      allievoId: richiesta.allievo.id,
                      spedita: !partita,
                    })}
                />
              )}
        </>
      )}
      coda={richiesta.errore
        ? <p className="richiesta__guasto testo-negativo">{richiesta.errore}</p>
        : null}
    />
  )
}

/** Un mucchio di richieste con il suo titolo, come i gruppi del todo. */
export function gruppoRichiesteFirma (titolo: string, righe: RichiestaFirma[]): ReactNode {
  if (righe.length === 0) return null
  return (
    <section className="riconsegne__gruppo">
      {titolo ? <TitoloGruppo titolo={titolo} quante={righe.length} /> : null}
      {righe.map((riga) => rigaRichiesta(riga))}
    </section>
  )
}

// ------------------------------------------------- le assenze oltre la soglia

/**
 * Una persona oltre la soglia di assenza, in un corso: niente da spuntare, due
 * pulsanti portano alla sua scheda e al corso. La riga sparisce da sé quando la
 * percentuale rientra.
 */
function rigaSegnalazione (segnalazione: SegnalazioneAssenza): ReactElement {
  const t = testi()
  return (
    <Pendenza
      // testo-fisso: la chiave della segnalazione
      key={`${segnalazione.allievoId}:${segnalazione.corsoId}:${segnalazione.periodo}`}
      classe="richiesta"
      tag="div"
      testata={(
        <>
          <strong className="richiesta__nome">{segnalazione.allievo}</strong>
          <span className="richiesta__dove testo-quieto">
            {`${segnalazione.corso} · ${segnalazione.periodo} · ` +
              t.udPerse(segnalazione.udAssenza, segnalazione.udPreviste)}
          </span>
          <Pastiglia
            // Può avere un decimale (33,4 quando l'intero starebbe sotto soglia), scritto
            // come vuole la lingua.
            testo={t.percentoAssenza(segnalazione.percento)}
            tono={segnalazione.confermata ? 'negativo' : 'attenzione'}
          />
          {/* Non confermata: il numero viene dalle ore previste ma l'appello manca. */}
          {segnalazione.confermata
            ? null
            : <Pastiglia testo={t.appelliDaCompletare} tono="quiete" />}
        </>
      )}
      azioni={(
        <>
          <Pulsante
            testo={t.apriScheda}
            simbolo="utente"
            variante="sottile"
            titolo={t.apriSchedaAiuto}
            al={() => {
              vai(
                { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: segnalazione.allievoId } },
                { contesto: { classeId: segnalazione.classeId } },
              )
            }}
          />
          <Pulsante
            testo={t.apriCorso}
            simbolo="libro"
            variante="fantasma"
            titolo={t.apriCorsoAiuto}
            al={() => { vai({ pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: segnalazione.corsoId } }) }}
          />
        </>
      )}
    />
  )
}

/** Il mucchio delle segnalazioni, con il suo titolo: come gli altri gruppi del todo. */
export function gruppoSegnalazioni (titolo: string, righe: SegnalazioneAssenza[]): ReactNode {
  if (righe.length === 0) return null
  return (
    <section className="riconsegne__gruppo">
      {titolo ? <TitoloGruppo titolo={titolo} quante={righe.length} /> : null}
      {righe.map((riga) => rigaSegnalazione(riga))}
    </section>
  )
}

