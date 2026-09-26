// La scheda personale: l'anagrafica e il lavoro del docente di classe.
// Chi è, dove sta, come lo si raggiunge; documenti da riscuotere e rapporti
// delle assenze da far firmare.

import { nomeCompleto } from '../../../domain/calculations.js'
import { consegneDocumento, haFatto } from '../../../domain/assignments.js'
import { faseRiga, nomePeriodo, rapportiDetti, rigaDi, vergini } from '../../../domain/absences.js'
import { Maiuscola, Molti, Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { parole } from '../../../domain/words.testi.js'
import { anniCompiuti } from '../../../domain/birthdays.js'
import { formattaData } from '../../../domain/dates.js'
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
  type SegnoMappa,
} from '../../../domain/map.js'
import type { Allievo, Classe, ContattoTelefonico } from '../../../domain/models.js'
import { CONTATTI, telefoniDi } from '../../../domain/phones.js'
import { scriviIndirizzo } from '../../../domain/addresses.js'
import { pastiglia, pulsante, scheda, statoVuoto } from '../../components/base.js'
import { recapitoPremibile, type GenereRecapito } from '../../components/contacts.js'
import { notifica } from '../../components/notifications.js'
import { riquadroMappa } from '../../components/map.js'
import { icona, type NomeIcona } from '../../components/icons.js'
import { h, type Figlio } from '../../dom.js'
import { moduloAllievo } from '../../forms.js'
import { mostraSullaMappa } from '../map.js'
import { azione } from '../../bridge.js'
import { aggiorna, corsiDi, fascicoloDi, stato, uriDato } from '../../state.js'
import { FASI } from './attendance.js'
import { testi } from './registry.testi.js'

/**
 * I documenti chiesti a questa persona (solo per il docente di classe): le
 * consegne con un foglio, dalla sua parte.
 */
export function pannelloDocumenti (allievo: Allievo, classe: Classe): Figlio {
  if (!classe.docenteDiClasse) return null
  const suoi = consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => c.a === 'classe' || c.allieviIds.includes(allievo.id),
  )
  if (suoi.length === 0) return null
  const t = testi()
  const L = lessico()

  return scheda({
    titolo: Molti(L.documento),
    aiuto: t.quelliChiesti,
    contenuto: h(
      'ul',
      { class: 'diario' },
      ...suoi.map((consegna) => {
        // Dalla matrice si spunta anche senza file: conta la spunta, non il documento.
        const portato = haFatto(consegna, allievo.id)
        return h(
          'li',
          { class: 'diario__voce' },
          icona('documento'),
          h('span', { class: 'diario__cosa' }, consegna.testo),
          pastiglia(consegna.documento ?? L.documento.singolare, 'quiete'),
          portato ? pastiglia(t.consegnato, 'positivo') : pastiglia(t.atteso, 'attenzione'),
        )
      }),
    ),
  })
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
): Figlio {
  const indirizzo = indirizzoDi(allievo, genere)
  if (!indirizzo) return null

  const rubrica = rubricaDi(stato.registro)
  const punto = coordinataDi(rubrica, indirizzo)
  const t = testi()

  if (!punto) {
    return h(
      'span',
      { class: 'coordinate coordinate--assenti' },
      icona('segnaposto'),
      h('span', null, t.nonCollocato),
      pulsante({
        testo: t.trova,
        variante: 'sottile',
        simbolo: 'segnaposto',
        al: () =>
          azione({ tipo: 'mappa.geocodifica', classeIds: [classe.id], allievoId: allievo.id }),
      }),
    )
  }

  // Chi altro sta a questo stesso indirizzo (fratelli, stessa ditta di tirocinio).
  const gruppo = condivisioni(stato.registro.classi, rubrica).find((c) => c.chiave === punto.chiave)
  const altri = (gruppo?.usi ?? []).filter((uso) => uso.allievoId !== allievo.id)

  return h(
    'span',
    { class: 'coordinate' },
    icona('segnaposto'),
    h('code', { class: 'coordinate__numeri' }, scriviCoordinate(punto)),
    h(
      'span',
      { class: 'coordinate__nota' },
      t.dallaSede(scriviDistanza(distanzaKm(punto, SEDE))),
      punto.etichetta ? ` · ${punto.etichetta}` : '',
    ),
    altri.length > 0
      ? pastiglia(
          altri.length === 1
            ? t.ancheUno(altri[0].chi)
            : t.ancheAltre(altri.length),
          'informativo',
          'classi',
        )
      : null,
    pulsante({
      testo: t.sullaMappa,
      variante: 'fantasma',
      simbolo: 'mappa',
      al: () => mostraSullaMappa(punto.chiave),
    }),
  )
}

/**
 * Dove sta: casa, azienda e scuola in un riquadro solo, per vedere le distanze.
 * Lo stesso riquadro della pagina Mappa, in piccolo, con il tragitto
 * casa-azienda tratteggiato e cartellini corti. Assente se c'è solo la scuola.
 */
export function pannelloDoveSta (classe: Classe, allievo: Allievo): Figlio {
  const rubrica = rubricaDi(stato.registro)
  const segni = segniDiAllievo(classe, allievo, rubrica, stato.registro.classi)
  const suoi = segni.filter((segno) => segno.genere !== 'sede')
  if (suoi.length === 0) return null
  const t = testi()

  const cartellino = (segno: SegnoMappa) =>
    h(
      'div',
      { class: 'mappa__cartellino' },
      h('strong', { class: 'mappa__cartellino-titolo' }, segno.titolo),
      h('span', { class: 'mappa__cartellino-riga' }, segno.indirizzo),
      h(
        'span',
        { class: 'mappa__cartellino-riga' },
        segno.genere === 'sede'
          ? t.laSede
          : t.inLineaDAria(scriviDistanza(segno.distanzaKm)),
      ),
    )

  const vivo = riquadroMappa({
    segni: () => segni,
    cartellino,
    // Un margine piccolo: il riquadro è basso.
    margine: 28,
  })

  const casa = suoi.find((segno) => segno.genere === 'domicilio')
  const lavoro = suoi.find((segno) => segno.genere === 'lavoro')

  return scheda({
    titolo: t.doveSta,
    sottotitolo: [
      casa ? t.casaA(scriviDistanza(casa.distanzaKm)) : null,
      lavoro ? t.lavoroA(lavoro.titolo, scriviDistanza(lavoro.distanzaKm)) : null,
      casa && lavoro ? t.fraCasaELavoro(scriviDistanza(distanzaKm(casa, lavoro))) : null,
    ]
      .filter(Boolean)
      .join(' · '),
    classe: 'dove-sta',
    azioni: pulsante({
      testo: t.apriLaMappa,
      variante: 'fantasma',
      simbolo: 'mappa',
      al: () => mostraSullaMappa((casa ?? lavoro ?? segni[0]).chiave),
    }),
    contenuto: h('div', { class: 'dove-sta__tela' }, vivo.elemento),
  })
}

/** Una riga dell'anagrafica: come si chiama, che cosa dice, e che cosa ci si fa. */
interface Riga {
  etichetta: string
  valore: string | undefined
  /** Come si disegna il valore, quando una riga di testo non basta. */
  disegna?: Figlio
  /** Vero per quel che si finisce sempre per ricopiare altrove: mail, telefoni. */
  copiabile?: boolean
  /**
   * Che cosa sa farci il sistema: comporre il numero, aprire una mail nuova. Il
   * tasto che copia resta accanto.
   */
  apribile?: GenereRecapito
  /** Quel che sta sotto al valore: le coordinate, una pastiglia. */
  sotto?: Figlio
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
function rigaAnagrafica (riga: Riga): Figlio {
  if (!riga.valore) return null
  const valore = riga.valore
  const scritto = riga.disegna
    ?? (riga.apribile
      ? recapitoPremibile(riga.apribile, valore, 'anagrafica__testo')
      : h('span', { class: 'anagrafica__testo' }, valore))

  return h(
    'div',
    { class: 'anagrafica__riga' },
    h('dt', { class: 'anagrafica__etichetta' }, riga.etichetta),
    h(
      'dd',
      { class: 'anagrafica__valore' },
      h(
        'div',
        { class: 'anagrafica__dato' },
        scritto,
        riga.copiabile
          ? pulsante({
              simbolo: 'duplica',
              variante: 'fantasma',
              classe: 'anagrafica__copia',
              titolo: testi().copia(riga.etichetta),
              al: () => copiaRecapito(valore, riga.etichetta),
            })
          : null,
      ),
      riga.sotto ?? null,
    ),
  )
}

/**
 * Un blocco di righe sotto un titolino, o niente se è vuoto. Persona e azienda
 * in blocchi distinti, per non confondere i recapiti.
 */
function gruppoAnagrafica (titolo: string, simbolo: NomeIcona, righe: Riga[]): Figlio {
  const scritte = righe.map(rigaAnagrafica).filter((riga) => riga !== null)
  if (scritte.length === 0) return null
  return h(
    'section',
    { class: 'anagrafica__gruppo' },
    h('h4', { class: 'anagrafica__titolo' }, icona(simbolo), titolo),
    h('dl', { class: 'anagrafica__elenco' }, ...scritte),
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
    disegna: h(
      'div',
      { class: 'indirizzo' },
      h('span', null, [dove?.presso, dove?.via, dove?.casella].filter(Boolean).join(', ')),
      citta ? h('span', { class: 'indirizzo__citta' }, citta) : null,
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
        : h(
            'span',
            { class: 'anagrafica__coda' },
            h('span', { class: 'testo-quieto' }, t.anni(anni)),
            // Solo sotto i diciotto una pastiglia: cambia chi firma le giustificazioni.
            anni < 18 ? pastiglia(t.minorenne, 'informativo') : null,
          ),
  }
}

/**
 * I periodi di assenze da far firmare per questa persona. Si legge a che punto
 * è; stampa e invio si fanno per la classe dalla pagina delle assenze.
 */
export function pannelloAssenze (classe: Classe, allievo: Allievo): Figlio {
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

  return scheda({
    titolo: t.daFarFirmare,
    sottotitolo: aperti === 0 ? t.tuttoFirmato : t.daChiudere(aperti),
    azioni: pulsante({
      testo: t.apriLeAssenze,
      simbolo: 'firma',
      variante: 'fantasma',
      al: () =>
        aggiorna({ vista: 'docenteClasse', schedaDocente: 'assenze', classeId: classe.id }),
    }),
    contenuto: h(
      'ul',
      { class: 'diario' },
      ...periodi.map(({ blocco, riga }) => {
        const fase = faseRiga(riga)
        const voce = FASI[fase]
        const fogli = vergini(riga)
        return h(
          'li',
          { class: 'diario__voce' },
          h('span', { class: 'diario__quando' }, nomePeriodo(blocco)),
          pastiglia(voce.nome, voce.tono),
          fogli.length > 0
            ? h('span', { class: 'testo-quieto diario__cosa' }, rapportiDetti(fogli))
            : null,
          riga?.note ? h('span', { class: 'diario__nota' }, riga.note) : null,
        )
      }),
    ),
  })
}

/**
 * Chi è e come lo si raggiunge: il ritratto accanto ai recapiti, divisi fra
 * persona e azienda. Si scrive solo quel che c'è, e in fondo quel che manca. Il
 * ritratto si cambia da «Modifica», non da qui; senza foto resta il riquadro vuoto.
 */
export function pannelloAnagrafica (classe: Classe, allievo: Allievo): HTMLElement {
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
  // Quel che manca, detto una volta sola e sottovoce, per nome.
  const mancano = [
    ...tutte.filter((riga) => !riga.valore).map((riga) => t.mancante(riga.etichetta)),
    // I numeri non hanno righe vuote da segnalare: la mancanza si dice qui.
    ...CONTATTI.filter((contatto) => telefoniDi(allievo, contatto).length === 0).map(
      (contatto) => t.telefonoDi[contatto],
    ),
  ]

  return scheda({
    titolo: t.anagrafica,
    // La matita anche accanto ai dati, dove ci si accorge di quel che manca.
    azioni: pulsante({
      testo: P.modifica,
      simbolo: 'matita',
      variante: 'sottile',
      al: () => moduloAllievo(classe, allievo),
    }),
    contenuto: h(
      'div',
      { class: 'ritratto' },
      h(
        'div',
        { class: 'ritratto__colonna' },
        indirizzo
          ? h('img', {
              class: 'ritratto__foto',
              attr: { src: indirizzo, alt: nomeCompleto(allievo), loading: 'lazy' },
            })
          : h('div', { class: 'ritratto__vuoto' }, icona('utente', 'ritratto__simbolo')),
      ),
      h(
        'div',
        { class: 'anagrafica' },
        scritte.length === 0
          ? statoVuoto({
              simbolo: 'utente',
              titolo: t.nessunRecapito,
              testo: t.comeSiAggiunge,
              azione: pulsante({
                testo: t.compila,
                variante: 'primario',
                simbolo: 'matita',
                al: () => moduloAllievo(classe, allievo),
              }),
            })
          : h(
              'div',
              null,
              gruppoAnagrafica(Uno(L.pif), 'utente', suoi),
              gruppoAnagrafica(Uno(L.rappresentante), 'classi', delRappresentante),
              gruppoAnagrafica(Uno(L.azienda), 'azienda', dellAzienda),
              mancano.length > 0
                ? h(
                    'p',
                    { class: 'anagrafica__mancano testo-quieto' },
                    t.manca(mancano),
                  )
                : null,
            ),
      ),
    ),
  })
}
