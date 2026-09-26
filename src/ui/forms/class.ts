// La classe e chi la frequenta: le persone in formazione si aggiungono una per
// una o si incollano tutte insieme (quel che si fa a settembre).

import { nomeCompleto } from '../../domain/calculations.js'
import { creaAllievo, creaTelefono, COLORI_CLASSE } from '../../domain/factories.js'
import { Maiuscola, Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { nuovoIdClasse } from '../../domain/identifiers.js'
import { coordinataDi, indirizzoDi, rubricaDi, scriviCoordinate } from '../../domain/map.js'
import type {
  Allievo,
  Classe,
  ContattoTelefonico,
  Telefono,
} from '../../domain/models.js'
import { ETICHETTE, conPrefissoInternazionale } from '../../domain/phones.js'
import { INDIRIZZO_VUOTO, type Indirizzo } from '../../domain/addresses.js'
import { validaAllievo } from '../../domain/validation.js'
import { campo, pulsante, riga, sezioneModulo, tendina } from '../components/base.js'
import { suggerimento } from '../components/hint.js'
import { icona } from '../components/icons.js'
import { apriModale } from '../components/modal.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  classePerId,
  classiDellAnno,
  corsiDi,
  materieDiClasse,
  stato,
  uriDato,
} from '../state.js'

import {
  baseViva,
  campoCollegato,
  fuocoSullaPresa,
  opzioniMaterie,
  presaDiRiga,
  richiedeAnno,
  riordinatore,
  salva,
  spostaVoce,
  tastoElimina,
  testo,
} from './common.js'
import { moduloAnno } from './year.js'
import { moduloMateria } from './subject.js'
import { testi } from './class.testi.js'

export function moduloClasse (classe?: Classe, dopo?: (classeId: string) => void): void {
  const t = testi().classe
  // Senza anno una classe non ha a chi appendersi: si apre il modulo che lo crea.
  const anno = richiedeAnno(() => moduloAnno())
  if (!anno) return
  const modifica = Boolean(classe)
  const base =
    classe ??
    ({
      id: nuovoIdClasse(),
      annoId: anno.id,
      nome: '',
      sede: '',
      colore: COLORI_CLASSE[stato.registro.classi.length % COLORI_CLASSE.length],
      note: '',
      allievi: [],
      archiviata: false,
      docenteDiClasse: false,
      creataIl: new Date().toISOString(),
      aggiornataIl: new Date().toISOString(),
    } satisfies Classe)

  // Le materie che la classe già porta (una per corso) non si offrono di nuovo.
  const gia = new Set(corsiDi(base.id).map((c) => c.materiaId))

  // Sotto la tendina, in vista, quali materie la classe porta già (un dato);
  // dietro la «i» che cosa sia un corso (una spiegazione).
  const campoMateria = (): HTMLElement => {
    const insegnate = materieDiClasse(base.id)
    const elemento = campoCollegato({
      nome: 'materiaId',
      etichetta: modifica ? t.aggiungiMateria : t.materiaInsegnata,
      valore: '',
      vuoto: t.nessunaMateria,
      voci: () => opzioniMaterie().filter((o) => !gia.has(o.valore)),
      titoloNuovo: t.nuovaMateria,
      apriNuovo: (fatto) => moduloMateria(undefined, fatto),
      aiuto: insegnate.length > 0 ? undefined : t.aiutoMateria,
      larghezza: 'meta',
    })
    if (insegnate.length > 0) {
      elemento.append(
        h('small', { class: 'campo__aiuto' }, t.giaInsegnate(insegnate.join(', '))),
      )
    }
    return elemento
  }

  apriModale({
    titolo: modifica ? t.titolo(base.nome) : t.nuova,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'nome',
            etichetta: t.nome,
            valore: base.nome,
            segnaposto: t.segnapostoNome,
            richiesto: true,
            larghezza: 'meta',
          }),
          campoMateria(),
        ),
        riga(
          campo({ nome: 'sede', etichetta: t.sede, valore: base.sede ?? '', larghezza: 'meta' }),
          campo({
            nome: 'colore',
            etichetta: t.colore,
            tipo: 'color',
            valore: base.colore,
            larghezza: 'quarto',
          }),
          campo({
            nome: 'archiviata',
            tipo: 'checkbox',
            etichetta: t.archiviata,
            valore: base.archiviata,
            aiuto: t.aiutoArchiviata,
            larghezza: 'quarto',
          }),
        ),
        // Il mestiere in più: chi non lo fa non vede nemmeno il pannello.
        campo({
          nome: 'docenteDiClasse',
          tipo: 'checkbox',
          etichetta: t.docenteDiClasse,
          valore: base.docenteDiClasse,
          aiuto: t.aiutoDocenteDiClasse,
        }),
        campo({
          nome: 'note',
          etichetta: parole().note,
          tipo: 'textarea',
          righe: 3,
          valore: base.note ?? '',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const viva = baseViva(contesto, modifica, base, classePerId(base.id))
      if (!viva) return
      const aggiornata: Classe = {
        ...viva,
        nome: testo(valori.nome),
        sede: testo(valori.sede),
        colore: testo(valori.colore) || base.colore,
        note: testo(valori.note),
        archiviata: Boolean(valori.archiviata),
        docenteDiClasse: Boolean(valori.docenteDiClasse),
      }
      const materiaId = testo(valori.materiaId)
      await salva(
        contesto,
        { tipo: 'classe.salva', classe: aggiornata },
        modifica ? t.aggiornata : t.creata,
        async (idCreato) => {
          const classeId = idCreato ?? aggiornata.id
          // La materia scelta apre un corso.
          if (materiaId) await azione({ tipo: 'corso.crea', classeId, materiaId })
          if (dopo) {
            dopo(classeId)
            return
          }
          aggiorna({ vista: 'classi', classeId })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: { genere: 'classe', id: base.id },
            azione: { tipo: 'classe.elimina', classeId: base.id },
            fatto: t.eliminata,
            poi: () => aggiorna({ classeId: null }),
          })
        : null,
  })
}


/**
 * Che cosa dire, sotto un indirizzo, di dove il registro l'ha collocato: le
 * coordinate sono una conseguenza, non un campo, e cambiando la via la riga
 * dice che valgono per l'indirizzo di prima. In vista, perché è uno stato.
 * Senza indirizzo niente riga.
 */
function statoCoordinate (
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): string | null {
  const indirizzo = indirizzoDi(allievo, genere)
  if (!indirizzo) return null
  const punto = coordinataDi(rubricaDi(stato.registro), indirizzo)
  if (!punto) return testi().mappa.nonAncora
  // Le coordinate appartengono all'indirizzo, non alla persona.
  return testi().mappa.cadeA(scriviCoordinate(punto))
}

/** Un campo con sotto, in vista, uno stato o una conseguenza da leggere senza cercarla. */
function conRigaSotto (elemento: HTMLElement, testo: string | null): HTMLElement {
  if (testo) elemento.append(h('small', { class: 'campo__aiuto' }, testo))
  return elemento
}

/**
 * L'editor dei numeri di un contatto: una riga per numero. Le righe restano
 * (ridisegnare a ogni tasto toglierebbe il campo sotto le dita). L'ordine, per
 * presa o frecce, è quello in cui si prova, e il primo finisce nei fogli stampati.
 */
function editorTelefoni (
  contatto: ContattoTelefonico,
  iniziali: Telefono[],
  allaModifica: (telefoni: Telefono[]) => void,
): HTMLElement {
  const testiTelefoni = testi().telefoni
  const etichette = lessico().etichetteTelefono
  let numeri = iniziali.map((t) => ({ ...t }))

  const righe = h('div', { class: 'telefoni__righe' })
  const contenitore = h('div', { class: 'telefoni' }, righe)

  const avvisa = () => allaModifica(numeri.map((t) => ({ ...t })))

  const riordina = riordinatore(righe, (da, a) => {
    if (a < 0 || a >= numeri.length || da === a) return
    numeri = spostaVoce(numeri, da, a)
    disegna()
    avvisa()
    fuocoSullaPresa(righe, a)
  })

  const rigaTelefono = (telefono: Telefono, indice: number): HTMLElement => {
    const presa = presaDiRiga()
    const riga = h(
      'div',
      { class: 'telefono' },
      presa,
      tendina({
        voci: ETICHETTE.map((valore) => ({ valore, testo: Maiuscola(etichette[valore]) })),
        valore: telefono.etichetta,
        etichetta: testiTelefoni.cheNumero,
        classe: 'telefono__etichetta',
        al: (valore) => {
          telefono.etichetta = valore
          avvisa()
        },
      }),
      h('input', {
        class: 'campo__controllo telefono__numero',
        type: 'tel',
        value: telefono.numero,
        attr: {
          // Il nome dell'etichetta nel segnaposto: si vede che cosa ci si aspetta.
          placeholder: testiTelefoni.numeroDi(contatto),
          'aria-label': testiTelefoni.numeroCome(etichette[telefono.etichetta]),
          autocomplete: 'off',
        },
        oninput: (evento: Event) => {
          telefono.numero = (evento.target as HTMLInputElement).value
          avvisa()
        },
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: testiTelefoni.togli,
        al: () => {
          numeri = numeri.filter((t) => t.id !== telefono.id)
          disegna()
          avvisa()
        },
      }),
    )
    riordina(riga, presa, indice)
    return riga
  }

  function disegna (): void {
    rimpiazza(righe, ...numeri.map(rigaTelefono))
  }

  disegna()

  contenitore.append(
    pulsante({
      testo: testiTelefoni.aggiungi,
      simbolo: 'piu',
      variante: 'sottile',
      classe: 'telefoni__aggiungi',
      al: () => {
        numeri = [...numeri, creaTelefono(contatto)]
        disegna()
        avvisa()
        // Il fuoco nella casella appena aperta: chi preme «aggiungi» ha il numero in mano.
        righe.lastElementChild?.querySelector<HTMLInputElement>('.telefono__numero')?.focus()
      },
    }),
  )

  return contenitore
}

/**
 * Il ritratto nel modulo, con i comandi che lo cambiano (non nella scheda,
 * dove si premerebbero per sbaglio a colloquio). La foto non aspetta «Salva»:
 * l'host la copia subito, e qui si rilegge dov'è finita e la si passa a chi
 * salva, se no l'anagrafica riscriverebbe il percorso di prima. Su una persona
 * mai salvata i comandi sono spenti: l'host non saprebbe in che cartella metterla.
 */
function campoFoto (
  classe: Classe,
  base: Allievo,
  modifica: boolean,
  allaModifica: (foto: string | undefined) => void,
): HTMLElement {
  // Si ridisegna solo il ritratto: etichetta e aiuto non cambiano.
  const t = testi().foto
  const ritratto = h('div', { class: 'modulo__ritratto' })

  const comando = (tipo: 'allievo.foto.imposta' | 'allievo.foto.togli') => async () => {
    const risposta = await azione({ tipo, classeId: classe.id, allievoId: base.id })
    if (!risposta.ok) return
    const adesso = classePerId(classe.id)?.allievi.find((a) => a.id === base.id)?.foto
    allaModifica(adesso)
    disegna(adesso)
  }

  function disegna (foto: string | undefined): void {
    const indirizzo = uriDato(foto)
    rimpiazza(
      ritratto,
      indirizzo
        ? h('img', {
            class: 'ritratto__foto',
            attr: {
              src: indirizzo,
              alt: nomeCompleto(base),
              loading: 'lazy',
            },
          })
        : h('div', { class: 'ritratto__vuoto' }, icona('utente', 'ritratto__simbolo')),
      h(
        'div',
        { class: 'ritratto__comandi' },
        pulsante({
          testo: foto ? t.cambia : t.aggiungi,
          simbolo: 'immagine',
          variante: 'sottile',
          disabilitato: !modifica,
          al: comando('allievo.foto.imposta'),
        }),
        foto
          ? pulsante({
              testo: parole().togli,
              simbolo: 'cestino',
              variante: 'sottile',
              al: comando('allievo.foto.togli'),
            })
          : null,
      ),
    )
  }

  disegna(base.foto)

  return h(
    'div',
    { class: 'campo campo--piena' },
    // Che file ci va sta dietro la «i»; che la foto si applica subito, senza
    // «Salva», resta in vista, se no si scopre dopo aver premuto «Annulla».
    h(
      'span',
      { class: 'campo__etichetta' },
      t.titolo,
      suggerimento(modifica ? t.aiuto : t.aiutoNuova, { etichetta: t.titolo }),
    ),
    ritratto,
    modifica ? h('small', { class: 'campo__aiuto' }, t.subito) : null,
  )
}

/** L'editor dei numeri di un contatto, dentro un campo con la sua etichetta. */
function campoTelefoni (
  contatto: ContattoTelefonico,
  telefoni: Telefono[],
  aiuto: string,
  allaModifica: (telefoni: Telefono[]) => void,
): HTMLElement {
  const titolo = testi().telefoni.titolo
  return h(
    'div',
    { class: 'campo campo--piena' },
    h(
      'span',
      { class: 'campo__etichetta' },
      titolo,
      suggerimento(aiuto, { etichetta: titolo }),
    ),
    editorTelefoni(contatto, telefoni, allaModifica),
  )
}

/**
 * Le caselle di un indirizzo: caselle e non una riga, perché il NAP si ordina e
 * la località va su una riga sua. Sopra via, NAP e località; sotto presso,
 * casella postale e paese, tutte scrivibili.
 */
function campiIndirizzo (
  prefisso: string,
  indirizzo: Indirizzo | undefined,
  aiuto: string,
  coordinate: string | null,
): Figlio {
  const t = testi().indirizzo
  const dove = indirizzo ?? INDIRIZZO_VUOTO
  return [
    // La riga che si batte d'un fiato, nell'ordine in cui la si detta al telefono.
    riga(
      conRigaSotto(
        campo({
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome: `${prefisso}Via`,
          etichetta: t.via,
          valore: dove.via,
          aiuto,
          larghezza: 'meta',
        }),
        coordinate,
      ),
      campo({
        // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
        nome: `${prefisso}Cap`,
        etichetta: t.nap,
        valore: dove.cap,
        aiuto: t.aiutoNap,
        larghezza: 'quarto',
      }),
      campo({
        // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
        nome: `${prefisso}Localita`,
        etichetta: t.localita,
        valore: dove.localita,
        larghezza: 'quarto',
      }),
    ),
    // Le tre caselle che quasi nessuno riempie: un'azienda con lo studio davanti,
    // una casella postale, un domicilio oltre confine.
    riga(
      campo({
        // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
        nome: `${prefisso}Presso`,
        etichetta: t.presso,
        valore: dove.presso ?? '',
        aiuto: t.aiutoPresso,
        larghezza: 'terzo',
      }),
      campo({
        // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
        nome: `${prefisso}Casella`,
        etichetta: t.casella,
        valore: dove.casella ?? '',
        aiuto: t.aiutoCasella,
        larghezza: 'terzo',
      }),
      campo({
        // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
        nome: `${prefisso}Paese`,
        etichetta: t.paese,
        valore: dove.paese ?? '',
        aiuto: t.aiutoPaese,
        larghezza: 'terzo',
      }),
    ),
  ]
}

/** L'indirizzo riletto dalle sue caselle. */
function indirizzoScritto (
  prefisso: string,
  valori: Record<string, string | number | boolean>,
): Indirizzo {
  // Le facoltative vuote spariscono: un `presso: ''` nel file è un dato che non c'è.
  const facoltativo = (nome: string) => testo(valori[`${prefisso}${nome}`]) || undefined
  return {
    presso: facoltativo('Presso'), // testo-fisso: il nome del campo
    via: testo(valori[`${prefisso}Via`]),
    casella: facoltativo('Casella'), // testo-fisso: il nome del campo
    cap: testo(valori[`${prefisso}Cap`]),
    localita: testo(valori[`${prefisso}Localita`]),
    paese: facoltativo('Paese'), // testo-fisso: il nome del campo
  }
}

/**
 * Una persona nuova da una pagina che non è di una classe (l'elenco delle
 * persone): la classe si sceglie nel modulo, proposta quella in contesto.
 * Senza classi nell'anno, prima la classe.
 */
export function moduloNuovaPersona (classeProposta: Classe | null): void {
  const classi = classiDellAnno().filter((c) => !c.archiviata)
  if (classi.length === 0) {
    moduloClasse()
    return
  }
  // La classe si sceglie nel modulo stesso: qui si propone quella in contesto.
  const proposta = classeProposta && !classeProposta.archiviata ? classeProposta : classi[0]
  moduloAllievo(proposta)
}

export function moduloAllievo (classe: Classe, allievo?: Allievo): void {
  const t = testi().persona
  const L = lessico()
  const modifica = Boolean(allievo)
  const base = allievo ?? creaAllievo('', '')
  // I numeri non passano da `valoriModulo`: sono righe che si aprono e chiudono;
  // li tiene questa variabile, letta da `alSalva`.
  let telefoni = (base.telefoni ?? []).map((t) => ({ ...t }))
  // Nemmeno la foto: è un file già copiato. Si tiene dov'è finita, perché
  // `alSalva` riscrive l'anagrafica intera.
  let foto = base.foto
  const soloDi = (contatto: ContattoTelefonico) =>
    telefoni.filter((t) => t.contatto === contatto)
  const rimpiazzaDi = (contatto: ContattoTelefonico) => (nuovi: Telefono[]) => {
    telefoni = [...telefoni.filter((t) => t.contatto !== contatto), ...nuovi]
  }

  // Le classi aperte dell'anno, più la sua se archiviata: il campo deve elencare
  // il valore che mostra.
  const classiScelta = [
    ...classiDellAnno().filter((c) => !c.archiviata),
    ...(classe.archiviata ? [classe] : []),
  ]

  apriModale({
    titolo: modifica ? t.modifica : t.nuova,
    sottotitolo: modifica ? classe.nome : undefined,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        // La classe: nuova si sceglie, già scritta si legge soltanto (spostare appelli
        // e voti è un'altra cosa).
        campo({
          nome: 'classeId',
          etichetta: Uno(L.classe),
          tipo: 'select',
          valore: classe.id,
          opzioni: classiScelta.map((c) => ({ valore: c.id, testo: c.nome })),
          richiesto: true,
          disabilitato: modifica,
          aiuto: modifica ? t.aiutoClasseScritta : t.aiutoClasseNuova,
        }),
        // Tre sezioni: chi è, come la si raggiunge, chi sta dall'altra parte, così
        // mail e telefoni non si confondono fra persona, rappresentante e datore.
        sezioneModulo(
          t.chiE,
          riga(
            campo({
              nome: 'cognome',
              etichetta: parole().cognome,
              valore: base.cognome,
              richiesto: true,
              larghezza: 'meta',
            }),
            campo({
              nome: 'nome',
              etichetta: parole().nome,
              valore: base.nome,
              richiesto: true,
              larghezza: 'meta',
            }),
          ),
          riga(
            campo({
              nome: 'dataNascita',
              etichetta: t.dataNascita,
              tipo: 'date',
              valore: base.dataNascita ?? '',
              aiuto: t.aiutoDataNascita,
              larghezza: 'meta',
            }),
            campo({
              nome: 'attivo',
              tipo: 'checkbox',
              etichetta: t.frequenta,
              valore: base.attivo,
              aiuto: t.aiutoFrequenta,
              larghezza: 'meta',
            }),
          ),
          campoFoto(classe, base, modifica, (scelta) => {
            foto = scelta
          }),
        ),
        sezioneModulo(
          t.comeRaggiungerla,
          campiIndirizzo(
            'indirizzo',
            base.indirizzo,
            t.doveAbita,
            statoCoordinate(base, 'domicilio'),
          ),
          campo({
            nome: 'email',
            etichetta: Uno(L.email),
            tipo: 'email',
            valore: base.email ?? '',
          }),
          campoTelefoni('pif', soloDi('pif'), t.aiutoTelefoni, rimpiazzaDi('pif')),
        ),
        sezioneModulo(
          Uno(L.rappresentante),
          campo({
            nome: 'emailTutore',
            etichetta: Uno(L.email),
            tipo: 'email',
            valore: base.emailTutore ?? '',
            aiuto: t.aiutoEmailRappresentante,
          }),
          campoTelefoni(
            'rappresentante',
            soloDi('rappresentante'),
            t.aiutoTelefoniRappresentante,
            rimpiazzaDi('rappresentante'),
          ),
        ),
        sezioneModulo(
          Uno(L.azienda),
          campo({
            nome: 'azienda',
            etichetta: t.nomeAzienda,
            valore: base.azienda ?? '',
            aiuto: t.aiutoAzienda,
          }),
          campiIndirizzo(
            'indirizzoDatore',
            base.indirizzoDatore,
            t.aiutoIndirizzoAzienda,
            statoCoordinate(base, 'lavoro'),
          ),
          // Spezzata: a che cosa serve va dietro la «i»; che senza la
          // richiesta non parte resta scritto, perché è una conseguenza.
          conRigaSotto(
            campo({
              nome: 'emailDatore',
              etichetta: t.emailDatore,
              tipo: 'email',
              valore: base.emailDatore ?? '',
              aiuto: t.aiutoEmailDatore,
            }),
            t.senzaEmailDatore,
          ),
          campoTelefoni(
            'datore',
            soloDi('datore'),
            t.aiutoTelefoniDatore,
            rimpiazzaDi('datore'),
          ),
        ),
      ),
    alSalva: async (valori, contesto) => {
      // La classe com'è adesso (`classe.salva` rimanda l'elenco intero); nuova, è
      // quella scelta nel campo.
      const classeViva = classePerId(modifica ? classe.id : testo(valori.classeId) || classe.id)
      if (!classeViva) {
        contesto.mostraErrori([t.classeTolta])
        return
      }
      const vivo = baseViva(
        contesto,
        modifica,
        base,
        classeViva.allievi.find((a) => a.id === base.id),
        t.toltaAltrove,
      )
      if (!vivo) return
      const aggiornato: Allievo = {
        ...vivo,
        cognome: testo(valori.cognome),
        nome: testo(valori.nome),
        dataNascita: testo(valori.dataNascita),
        indirizzo: indirizzoScritto('indirizzo', valori),
        email: testo(valori.email),
        emailTutore: testo(valori.emailTutore),
        azienda: testo(valori.azienda),
        indirizzoDatore: indirizzoScritto('indirizzoDatore', valori),
        emailDatore: testo(valori.emailDatore),
        // Le righe vuote non si salvano. Il prefisso si mette qui e non mentre si
        // scrive, per non cambiare il numero sotto le dita.
        telefoni: telefoni
          .map((n) => ({ ...n, numero: conPrefissoInternazionale(n.numero) }))
          .filter((n) => n.numero !== ''),
        attivo: Boolean(valori.attivo),
      }
      // Senza foto la chiave se ne va, invece di restare `undefined` nel file.
      if (foto) aggiornato.foto = foto
      else delete aggiornato.foto
      // L'host valida solo la classe: la persona si controlla qui.
      const esito = validaAllievo(aggiornato)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      const allievi = modifica
        ? classeViva.allievi.map((a) => (a.id === aggiornato.id ? aggiornato : a))
        : [...classeViva.allievi, aggiornato]

      await salva(
        contesto,
        { tipo: 'classe.salva', classe: { ...classeViva, allievi } },
        modifica ? t.aggiornata : t.aggiunta,
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            etichetta: t.togliDallaClasse,
            // Con la persona se ne vanno presenze e voti a suo nome.
            chiedi: { genere: 'allievo', classeId: classe.id, id: base.id },
            azione: { tipo: 'allievo.elimina', classeId: classe.id, allievoId: base.id },
            fatto: t.tolta,
          })
        : null,
  })
}

/** Incolla-elenco: il modo in cui gli allievi entrano davvero, all'inizio dell'anno. */
export function moduloImportaAllievi (classe: Classe): void {
  const t = testi().importa
  apriModale({
    titolo: t.titolo,
    sottotitolo: classe.nome,
    larghezza: 'media',
    testoSalva: parole().importa,
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h('p', { class: 'testo-quieto' }, t.spiegazione),
        campo({
          nome: 'testo',
          tipo: 'textarea',
          righe: 12,
          segnaposto: t.segnaposto,
        }),
      ),
    alSalva: async (valori, contesto) => {
      await salva(
        contesto,
        { tipo: 'allievi.importa', classeId: classe.id, testo: String(valori.testo ?? '') },
        t.fatto,
      )
    },
  })
}

