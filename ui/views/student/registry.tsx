// La scheda personale: l'anagrafica e il lavoro del docente di classe.
// Chi è, dove sta, come lo si raggiunge; documenti da riscuotere e rapporti
// delle assenze da far firmare.

import type { ReactElement, ReactNode } from 'react'

import { nomeCompleto } from '#core/dominio/calculations.js'
import { consegneDocumento, haFatto } from '#core/dominio/assignments.js'
import { faseRiga, nomePeriodo, rapportiDetti, rigaDi, vergini } from '#core/dominio/absences.js'
import { Maiuscola, Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { anniCompiuti } from '#core/dominio/birthdays.js'
import { formattaData } from '#core/dominio/dates.js'
import {
  condivisioni,
  coordinataDi,
  distanzaKm,
  indirizzoDi,
  rubricaDi,
  scriviCoordinate,
  scriviDistanza,
  segniDiAllievo,
  SEDE,
  type Inquadratura,
  type SegnoMappa,
} from '#core/dominio/map.js'
import type { Allievo, Classe, ContattoTelefonico } from '#core/dominio/models.js'
import { telefoniDi } from '#core/dominio/phones.js'
import { scriviIndirizzo } from '#core/dominio/addresses.js'
import { Pastiglia, Pulsante, Scheda, StatoVuoto } from '#ui/components/base.js'
import { RecapitoPremibile, type GenereRecapito } from '#ui/components/contacts.js'
import { notifica } from '#ui/components/notifications.js'
import { RiquadroMappa } from '#ui/components/map.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { moduloAllievo, moduloConsegna } from '#ui/forms.js'
import { mostraSullaMappa } from '#ui/views/map.js'
import { azione } from '#ui/bridge.js'
import { corsiDi, fascicoloDi, stato, uriDato, vai } from '#ui/state.js'
import { FASI } from './attendance.js'
import { testi } from './registry.testi.js'

/**
 * I documenti chiesti a questa persona (solo per il docente di classe): le
 * consegne con un foglio, dalla sua parte.
 */
export function pannelloDocumenti (allievo: Allievo, classe: Classe): ReactNode {
  if (!classe.docenteDiClasse) return null
  const suoi = consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => c.a === 'classe' || c.allieviIds.includes(allievo.id),
  )
  if (suoi.length === 0) return null
  const t = testi()
  const L = lessico()

  return (
    <Scheda
      titolo={Molti(L.documento)}
      aiuto={t.quelliChiesti}
      contenuto={(
        <ul className="diario">
          {suoi.map((consegna) => {
            // Dalla matrice si spunta anche senza file: conta la spunta, non il documento.
            const portato = haFatto(consegna, allievo.id)
            return (
              <li key={consegna.id} className="diario__voce">
                <Icona nome="documento" />
                <span className="diario__cosa">{consegna.testo}</span>
                <Pastiglia testo={consegna.documento ?? L.documento.singolare} tono="quiete" />
                {portato
                  ? <Pastiglia testo={t.consegnato} tono="positivo" />
                  : <Pastiglia testo={t.atteso} tono="attenzione" />}
              </li>
            )
          })}
        </ul>
      )}
    />
  )
}

/**
 * La linguetta del docente di classe quando non ha ancora niente: dice che cosa
 * ci comparirà e offre i due gesti che la riempiono, invece di una riga muta.
 */
export function vuotoDocenteClasse (classe: Classe): ReactElement {
  const t = testi()
  // Come «Chiedi un documento» del docente di classe: la consegna sta sul primo corso.
  const corso = corsiDi(classe.id)[0] ?? null
  return (
    <StatoVuoto
      simbolo="firma"
      titolo={t.nienteDaSeguire}
      testo={t.cheCosaCompare}
      azione={(
        <>
          <Pulsante
            testo={t.chiediDocumento}
            simbolo="documento"
            variante="sottile"
            disabilitato={!corso}
            titolo={corso ? undefined : t.primaUnCorso}
            al={() => { if (corso) moduloConsegna({ corsoId: corso.id, a: 'classe', documento: true }) }}
          />
          <Pulsante
            testo={t.apriLeAssenze}
            simbolo="firma"
            variante="sottile"
            al={() => {
              vai({ pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: classe.id } })
            }}
          />
        </>
      )}
    />
  )
}

/**
 * Sotto un indirizzo: il punto sulla mappa, come l'ha capito il geocodificatore
 * e quanto dista dalla sede. Se il punto manca o non vale più, il gesto che lo
 * trova.
 */
function rigaCoordinate (
  classe: Classe,
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): ReactNode {
  const indirizzo = indirizzoDi(allievo, genere)
  if (!indirizzo) return null

  const rubrica = rubricaDi(stato.registro)
  const punto = coordinataDi(rubrica, indirizzo)
  const t = testi()

  if (!punto) {
    return (
      <span className="coordinate coordinate--assenti">
        <Icona nome="segnaposto" />
        <span>{t.nonCollocato}</span>
        <Pulsante
          testo={t.trova}
          variante="sottile"
          simbolo="segnaposto"
          al={() =>
            azione({ tipo: 'mappa.geocodifica', classeIds: [classe.id], allievoId: allievo.id })}
        />
      </span>
    )
  }

  // Chi altro sta a questo stesso indirizzo (fratelli, stessa ditta di tirocinio).
  const gruppo = condivisioni(stato.registro.classi, rubrica).find((c) => c.chiave === punto.chiave)
  const altri = (gruppo?.usi ?? []).filter((uso) => uso.allievoId !== allievo.id)

  return (
    <span className="coordinate">
      <Icona nome="segnaposto" />
      <code className="coordinate__numeri">{scriviCoordinate(punto)}</code>
      <span className="coordinate__nota">
        {t.dallaSede(scriviDistanza(distanzaKm(punto, SEDE)))}
        {punto.etichetta ? ` · ${punto.etichetta}` : ''}
      </span>
      {altri.length > 0
        ? (
            <Pastiglia
              testo={altri.length === 1
                ? t.ancheUno(altri[0].chi)
                : t.ancheAltre(altri.length)}
              tono="informativo"
              simbolo="classi"
            />
          )
        : null}
      <Pulsante
        testo={t.sullaMappa}
        variante="fantasma"
        simbolo="mappa"
        al={() => mostraSullaMappa(punto.chiave)}
      />
    </span>
  )
}

/** Il cartellino corto della mappa piccola: che punto è e quanto dista dalla sede. */
function cartellinoCorto (segno: SegnoMappa): ReactElement {
  const t = testi()
  return (
    <div className="mappa__cartellino">
      <strong className="mappa__cartellino-titolo">{segno.titolo}</strong>
      <span className="mappa__cartellino-riga">{segno.indirizzo}</span>
      <span className="mappa__cartellino-riga">
        {segno.genere === 'sede'
          ? t.laSede
          : t.inLineaDAria(scriviDistanza(segno.distanzaKm))}
      </span>
    </div>
  )
}

/**
 * La mappa piccola dell'ultima persona guardata: inquadratura e cartellino
 * restano finché si torna su di lei, anche dopo un'altra pagina; un'altra
 * persona li azzera, e tornando si riparte dall'inquadratura di serie.
 */
let mappaPiccola: { chiave: string, inquadratura: Inquadratura | null, aperto: string | null } | null = null

/**
 * Dove sta: casa, azienda e scuola in un riquadro solo, per vedere le distanze.
 * Lo stesso riquadro della pagina Mappa, in piccolo, con il tragitto
 * casa-azienda tratteggiato e cartellini corti. Assente se c'è solo la scuola.
 */
export function pannelloDoveSta (classe: Classe, allievo: Allievo): ReactNode {
  const rubrica = rubricaDi(stato.registro)
  const segni = segniDiAllievo(classe, allievo, rubrica, stato.registro.classi)
  const suoi = segni.filter((segno) => segno.genere !== 'sede')
  if (suoi.length === 0) return null
  const t = testi()
  // Il riquadro resta fra due disegni, con spostamento e ingrandimento; una
  // persona nuova, un riquadro nuovo.
  // testo-fisso: la chiave del riquadro
  const chiave = `mappa:allievo:${allievo.id}`
  if (mappaPiccola?.chiave !== chiave) mappaPiccola = { chiave, inquadratura: null, aperto: null }
  const memoria = mappaPiccola

  const casa = suoi.find((segno) => segno.genere === 'domicilio')
  const lavoro = suoi.find((segno) => segno.genere === 'lavoro')

  return (
    <Scheda
      titolo={t.doveSta}
      sottotitolo={[
        casa ? t.casaA(scriviDistanza(casa.distanzaKm)) : null,
        lavoro ? t.lavoroA(lavoro.titolo, scriviDistanza(lavoro.distanzaKm)) : null,
        casa && lavoro ? t.fraCasaELavoro(scriviDistanza(distanzaKm(casa, lavoro))) : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      classe="dove-sta"
      azioni={(
        <Pulsante
          testo={t.apriLaMappa}
          variante="fantasma"
          simbolo="mappa"
          al={() => mostraSullaMappa((casa ?? lavoro ?? segni[0]).chiave)}
        />
      )}
      contenuto={(
        <div className="dove-sta__tela">
          <RiquadroMappa
            key={chiave}
            chiave={chiave}
            // La memoria è quella dell'ultima persona guardata, non di tutte.
            ricorda={false}
            inquadratura={memoria.inquadratura}
            alloSpostamento={(inquadratura) => { memoria.inquadratura = inquadratura }}
            aperto={memoria.aperto}
            allApertura={(id) => { memoria.aperto = id }}
            segni={segni}
            cartellino={cartellinoCorto}
            // Un margine piccolo: il riquadro è basso.
            margine={28}
          />
        </div>
      )}
    />
  )
}

/** Una riga dell'anagrafica: come si chiama, che cosa dice, e che cosa ci si fa. */
interface Riga {
  etichetta: string
  valore: string | undefined
  /** Come si disegna il valore, quando una riga di testo non basta. */
  disegna?: ReactNode
  /** Vero per quel che si finisce sempre per ricopiare altrove: mail, telefoni. */
  copiabile?: boolean
  /**
   * Che cosa sa farci il sistema: comporre il numero, aprire una mail nuova. Il
   * tasto che copia resta accanto.
   */
  apribile?: GenereRecapito
  /** Quel che sta sotto al valore: le coordinate, una pastiglia. */
  sotto?: ReactNode
}

/** Copia un recapito negli appunti, per incollarlo senza ribatterlo. */
async function copiaRecapito (valore: string, che: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(valore)
    notifica(testi().negliAppunti(che), 'successo')
  } catch {
    // Gli appunti si possono negare: lo si dice.
    notifica(testi().appuntiNegati, 'avviso')
  }
}

/** Una riga scritta, o niente se il dato non c'è. */
function rigaAnagrafica (riga: Riga, chiave: number): ReactElement | null {
  if (!riga.valore) return null
  const valore = riga.valore
  const scritto = riga.disegna
    ?? (riga.apribile
      ? <RecapitoPremibile genere={riga.apribile} valore={valore} classe="anagrafica__testo" />
      : <span className="anagrafica__testo">{valore}</span>)

  return (
    // Le righe sono una lista fissa, scritta qui: la posizione è una chiave stabile.
    <div key={chiave} className="anagrafica__riga">
      <dt className="anagrafica__etichetta">{riga.etichetta}</dt>
      <dd className="anagrafica__valore">
        <div className="anagrafica__dato">
          {scritto}
          {riga.copiabile
            ? (
                <Pulsante
                  simbolo="duplica"
                  variante="fantasma"
                  classe="anagrafica__copia"
                  titolo={testi().copia(riga.etichetta)}
                  al={() => copiaRecapito(valore, riga.etichetta)}
                />
              )
            : null}
        </div>
        {riga.sotto ?? null}
      </dd>
    </div>
  )
}

/**
 * Un blocco di righe sotto un titolino, o niente se è vuoto. Persona e azienda
 * in blocchi distinti, per non confondere i recapiti.
 */
function gruppoAnagrafica (titolo: string, simbolo: NomeIcona, righe: Riga[]): ReactNode {
  const scritte = righe
    .map((riga, indice) => rigaAnagrafica(riga, indice))
    .filter((riga) => riga !== null)
  if (scritte.length === 0) return null
  return (
    <section className="anagrafica__gruppo">
      <h4 className="anagrafica__titolo"><Icona nome={simbolo} />{titolo}</h4>
      <dl className="anagrafica__elenco">{scritte}</dl>
    </section>
  )
}

/**
 * Un indirizzo in due righe, come su una busta: via sopra, NAP e località
 * sotto. Quel che non ha una casella sua resta scritto dov'era.
 */
function rigaIndirizzo (
  classe: Classe,
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): Riga {
  const dove = genere === 'domicilio' ? allievo.indirizzo : allievo.indirizzoDatore
  const scritto = scriviIndirizzo(dove)
  if (!scritto) return { etichetta: parole().indirizzo, valore: undefined }

  const citta = [dove?.cap, dove?.localita, dove?.paese].filter(Boolean).join(' ')
  return {
    etichetta: parole().indirizzo,
    // Il tasto copia l'indirizzo intero.
    valore: scritto,
    disegna: (
      <div className="indirizzo">
        <span>{[dove?.presso, dove?.via, dove?.casella].filter(Boolean).join(', ')}</span>
        {citta ? <span className="indirizzo__citta">{citta}</span> : null}
      </div>
    ),
    copiabile: true,
    sotto: rigaCoordinate(classe, allievo, genere),
  }
}

/** La data di nascita con quel che se ne ricava: gli anni, e se sono diciotto. */
function rigaNascita (allievo: Allievo): Riga {
  const nascita = allievo.dataNascita
  const t = testi()
  if (!nascita) return { etichetta: t.dataDiNascita, valore: undefined }
  const anni = anniCompiuti(nascita, stato.adessoData)

  return {
    etichetta: t.dataDiNascita,
    valore: formattaData(nascita),
    sotto:
      anni === null
        ? null
        : (
            <span className="anagrafica__coda">
              <span className="testo-quieto">{t.anni(anni)}</span>
              {/* Solo sotto i diciotto una pastiglia: cambia chi firma le giustificazioni. */}
              {anni < 18 ? <Pastiglia testo={t.minorenne} tono="informativo" /> : null}
            </span>
          ),
  }
}

/**
 * I periodi di assenze da far firmare per questa persona. Si legge a che punto
 * è; stampa e invio si fanno per la classe dalla pagina delle assenze.
 */
export function pannelloAssenze (classe: Classe, allievo: Allievo): ReactNode {
  if (!classe.docenteDiClasse) return null
  const fascicolo = fascicoloDi(classe.id)
  const periodi = fascicolo.assenze
    .map((blocco) => ({ blocco, riga: rigaDi(blocco, allievo.id) }))
    // Chi in un periodo non ha mancato niente non ha una riga.
    .filter((voce) => faseRiga(voce.riga) !== 'fuori')
    .sort((a, b) => b.blocco.dal.localeCompare(a.blocco.dal))

  if (periodi.length === 0) return null

  const aperti = periodi.filter((voce) => faseRiga(voce.riga) !== 'firmato').length
  const t = testi()

  return (
    <Scheda
      titolo={t.daFarFirmare}
      sottotitolo={aperti === 0 ? t.tuttoFirmato : t.daChiudere(aperti)}
      azioni={(
        <Pulsante
          testo={t.apriLeAssenze}
          simbolo="firma"
          variante="fantasma"
          al={() => {
            vai({ pagina: 'pagina.classe.assenze', soggetto: { tipo: 'classe', id: classe.id } })
          }}
        />
      )}
      contenuto={(
        <ul className="diario">
          {periodi.map(({ blocco, riga }) => {
            const fase = faseRiga(riga)
            const voce = FASI[fase]
            const fogli = vergini(riga)
            return (
              <li key={blocco.id} className="diario__voce">
                <span className="diario__quando">{nomePeriodo(blocco)}</span>
                <Pastiglia testo={voce.nome} tono={voce.tono} />
                {fogli.length > 0
                  ? <span className="testo-quieto diario__cosa">{rapportiDetti(fogli)}</span>
                  : null}
                {riga?.note ? <span className="diario__nota">{riga.note}</span> : null}
              </li>
            )
          })}
        </ul>
      )}
    />
  )
}

/**
 * Chi è e come lo si raggiunge: il ritratto accanto ai recapiti, divisi fra
 * persona e azienda. Si scrive solo quel che c'è, e in fondo quel che manca. Il
 * ritratto si cambia da «Modifica», non da qui; senza foto resta il riquadro vuoto.
 */
export function pannelloAnagrafica (classe: Classe, allievo: Allievo): ReactElement {
  const indirizzo = uriDato(allievo.foto)
  const t = testi()
  const L = lessico()
  const P = parole()

  // Un numero per riga, con il suo nome al posto dell'etichetta «Telefono».
  const numeriDi = (contatto: ContattoTelefonico): Riga[] =>
    telefoniDi(allievo, contatto).map((telefono) => ({
      etichetta: Maiuscola(L.etichetteTelefono[telefono.etichetta]),
      valore: telefono.numero,
      copiabile: true,
      apribile: 'telefono' as const,
    }))

  const suoi: Riga[] = [
    // Cognome e nome separati, come nei documenti: dalla testata non si capisce
    // quale metà è il cognome.
    { etichetta: P.cognome, valore: allievo.cognome, copiabile: true },
    { etichetta: P.nome, valore: allievo.nome, copiabile: true },
    // La nascita subito dopo il nome: dice chi è la persona, non come raggiungerla.
    rigaNascita(allievo),
    rigaIndirizzo(classe, allievo, 'domicilio'),
    { etichetta: Uno(L.email), valore: allievo.email, copiabile: true, apribile: 'email' },
    ...numeriDi('pif'),
  ]

  // Il rappresentante legale ha un blocco suo: è un'altra persona.
  const delRappresentante: Riga[] = [
    {
      etichetta: Uno(L.email),
      valore: allievo.emailTutore,
      copiabile: true,
      apribile: 'email',
    },
    ...numeriDi('rappresentante'),
  ]

  const dellAzienda: Riga[] = [
    { etichetta: t.nomeAzienda, valore: allievo.azienda },
    rigaIndirizzo(classe, allievo, 'lavoro'),
    {
      etichetta: t.emailDatore,
      valore: allievo.emailDatore,
      copiabile: true,
      apribile: 'email',
    },
    ...numeriDi('datore'),
  ]

  const tutte = [...suoi, ...delRappresentante, ...dellAzienda]
  const scritte = tutte.filter((riga) => Boolean(riga.valore))
  // Quel che manca, detto una volta sola e sottovoce, per nome e per blocco: in
  // una fila sola tre «e-mail» non direbbero di chi è ognuna.
  const blocchi: readonly (readonly [string, Riga[], ContattoTelefonico])[] = [
    [Uno(L.pif), suoi, 'pif'],
    [Uno(L.rappresentante), delRappresentante, 'rappresentante'],
    [Uno(L.azienda), dellAzienda, 'datore'],
  ]
  const mancano = blocchi
    .map(([chi, righe, contatto]) => [chi, [
      ...righe.filter((riga) => !riga.valore).map((riga) => t.mancante(riga.etichetta)),
      // I numeri non hanno righe vuote da segnalare: la mancanza si dice qui.
      ...(telefoniDi(allievo, contatto).length === 0 ? [t.telefono] : []),
    ]] as const)
    .filter(([, voci]) => voci.length > 0)

  return (
    <Scheda
      titolo={t.anagrafica}
      // La matita anche accanto ai dati, dove ci si accorge di quel che manca.
      azioni={(
        <Pulsante
          testo={P.modifica}
          simbolo="matita"
          variante="sottile"
          al={() => moduloAllievo(classe, allievo)}
        />
      )}
      contenuto={(
        <div className="ritratto">
          <div className="ritratto__colonna">
            {indirizzo
              ? <img className="ritratto__foto" src={indirizzo} alt={nomeCompleto(allievo)} loading="lazy" />
              : <div className="ritratto__vuoto"><Icona nome="utente" classe="ritratto__simbolo" /></div>}
          </div>
          <div className="anagrafica">
            {scritte.length === 0
              ? (
                  <StatoVuoto
                    simbolo="utente"
                    titolo={t.nessunRecapito}
                    testo={t.comeSiAggiunge}
                    azione={(
                      <Pulsante
                        testo={t.compila}
                        variante="primario"
                        simbolo="matita"
                        al={() => moduloAllievo(classe, allievo)}
                      />
                    )}
                  />
                )
              : (
                  <div>
                    {gruppoAnagrafica(Uno(L.pif), 'utente', suoi)}
                    {gruppoAnagrafica(Uno(L.rappresentante), 'classi', delRappresentante)}
                    {gruppoAnagrafica(Uno(L.azienda), 'azienda', dellAzienda)}
                    {mancano.length > 0
                      ? (
                          <div className="anagrafica__mancano testo-quieto">
                            <span className="anagrafica__mancano-titolo">{t.manca}</span>
                            <ul>
                              {mancano.map(([chi, voci]) => (
                                <li key={chi}>{t.mancaDi(chi, voci)}</li>
                              ))}
                            </ul>
                          </div>
                        )
                      : null}
                  </div>
                )}
          </div>
        </div>
      )}
    />
  )
}
