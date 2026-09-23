// La classe e chi la frequenta.
//
// L'elenco delle persone in formazione si compila a mano una per una o si incolla tutto
// insieme: la seconda è quel che si fa a settembre, e senza costerebbe venti
// finestre aperte e chiuse.

import { nomeCompleto } from '../../domain/calculations.js'
import { creaAllievo, creaTelefono, COLORI_CLASSE } from '../../domain/factories.js'
import {
  CONTATTI_TELEFONICI,
  ETICHETTE_TELEFONO,
  Maiuscola,
  PERSONE,
  PIF,
  Uno,
  del,
  frase,
} from '../../domain/lexicon.js'
import { nuovoIdClasse } from '../../domain/identifiers.js'
import { coordinataDi, indirizzoDi, rubricaDi, scriviCoordinate } from '../../domain/map.js'
import type {
  Allievo,
  Classe,
  ContattoTelefonico,
  EtichettaTelefono,
  Telefono,
} from '../../domain/models.js'
import { ETICHETTE, conPrefissoInternazionale } from '../../domain/phones.js'
import { INDIRIZZO_VUOTO, type Indirizzo } from '../../domain/addresses.js'
import { validaAllievo } from '../../domain/validation.js'
import { campo, pulsante, riga, sezioneModulo } from '../components/base.js'
import { icona } from '../components/icons.js'
import { apriModale } from '../components/modal.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { azione } from '../bridge.js'
import { aggiorna, classePerId, corsiDi, materieDiClasse, stato, uriDato } from '../state.js'

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
import { moduloAvvio } from './startup.js'
import { moduloMateria } from './subject.js'

export function moduloClasse (classe?: Classe, dopo?: (classeId: string) => void): void {
  // Una classe non ha comunque a chi appendersi senza un anno: l'avvio guidato
  // lo crea con il resto, invece di mandare a cercarlo altrove.
  const anno = richiedeAnno(moduloAvvio)
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

  // Le materie che la classe già porta: una per corso. Quelle si tolgono
  // dalla tendina, perché aggiungerle due volte non vuol dire niente.
  const gia = new Set(corsiDi(base.id).map((c) => c.materiaId))

  apriModale({
    titolo: modifica ? `Classe ${base.nome}` : 'Nuova classe',
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        riga(
          campo({
            nome: 'nome',
            etichetta: 'Nome della classe',
            valore: base.nome,
            segnaposto: 'I MEC A',
            richiesto: true,
            larghezza: 'meta',
          }),
          campoCollegato({
            nome: 'materiaId',
            etichetta: modifica ? 'Aggiungi una materia' : 'Materia insegnata',
            valore: '',
            vuoto: '— nessuna —',
            voci: () => opzioniMaterie().filter((o) => !gia.has(o.valore)),
            titoloNuovo: 'Nuova materia',
            apriNuovo: (fatto) => moduloMateria(undefined, fatto),
            aiuto:
              materieDiClasse(base.id).length > 0
                ? `Gia' insegnate: ${materieDiClasse(base.id).join(', ')}.`
                : 'Classe più materia fa un corso: le lezioni e i voti stanno lì.',
            larghezza: 'meta',
          }),
        ),
        riga(
          campo({ nome: 'sede', etichetta: 'Sede', valore: base.sede ?? '', larghezza: 'meta' }),
          campo({
            nome: 'colore',
            etichetta: 'Colore nel calendario',
            tipo: 'color',
            valore: base.colore,
            larghezza: 'quarto',
          }),
          campo({
            nome: 'archiviata',
            tipo: 'checkbox',
            etichetta: 'Archiviata',
            valore: base.archiviata,
            aiuto: 'Resta nello storico, sparisce dagli elenchi.',
            larghezza: 'quarto',
          }),
        ),
        // Il mestiere in più: chi non lo fa non vede nemmeno il pannello.
        campo({
          nome: 'docenteDiClasse',
          tipo: 'checkbox',
          etichetta: 'Sono docente di classe',
          valore: base.docenteDiClasse,
          aiuto: 'Aggiunge documenti, recapiti e comunicazioni alla scheda della classe.',
        }),
        campo({
          nome: 'note',
          etichetta: 'Note',
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
        modifica ? 'Classe aggiornata.' : 'Classe creata.',
        async (idCreato) => {
          const classeId = idCreato ?? aggiornata.id
          // La materia scelta apre un corso: è il momento in cui la classe
          // smette di essere solo un elenco di nomi e diventa un insegnamento.
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
            fatto: 'Classe eliminata.',
            poi: () => aggiorna({ classeId: null }),
          })
        : null,
  })
}


/**
 * Che cosa dire, sotto un indirizzo, di dove il registro l'ha collocato.
 *
 * Il modulo è il posto in cui l'indirizzo si scrive, ed è lì che serve sapere
 * se quel che c'era è ancora buono: correggendo una via, la riga passa da «cade
 * qui» a «le coordinate valgono per l'indirizzo di prima», e chi salva sa già
 * che dovrà ritrovarle. Le coordinate non si scrivono a mano — non è un campo,
 * è una conseguenza — e per questo stanno nell'aiuto e non in una casella.
 */
function aiutoCoordinate (
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
  base: string,
): string {
  const indirizzo = indirizzoDi(allievo, genere)
  if (!indirizzo) return base
  const punto = coordinataDi(rubricaDi(stato.registro), indirizzo)
  if (!punto) return `${base} Non ancora sulla mappa: «Trova gli indirizzi», nella Mappa.`
  // Le coordinate appartengono all'indirizzo, non alla persona: cambiando la
  // via questa riga cambia da sé, e nessuno si porta dietro il punto di prima.
  return `${base} Sulla mappa cade a ${scriviCoordinate(punto)}.`
}

/**
 * L'editor dei numeri di un contatto: una riga per numero, che numero è e
 * qual è.
 *
 * Le righe si costruiscono una volta sola e restano: ridisegnare a ogni tasto
 * toglierebbe il campo di sotto le dita a chi sta battendo un prefisso.
 *
 * L'ordine è l'ordine in cui si prova, e si cambia trascinando la riga per la
 * presa o con le frecce: il primo numero è quello che finisce nella casella
 * sola dei fogli stampati, e deciderlo è il motivo per cui le righe si
 * spostano invece di stare in fila come sono state scritte.
 */
function editorTelefoni (
  contatto: ContattoTelefonico,
  iniziali: Telefono[],
  allaModifica: (telefoni: Telefono[]) => void,
): HTMLElement {
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
      h(
        'select',
        {
          class: 'campo__controllo campo__controllo--selezione telefono__etichetta',
          attr: { 'aria-label': 'Che numero è' },
          onchange: (evento: Event) => {
            telefono.etichetta = (evento.target as HTMLSelectElement).value as EtichettaTelefono
            avvisa()
          },
        },
        ETICHETTE.map((valore) =>
          h(
            'option',
            { value: valore, selected: valore === telefono.etichetta },
            Maiuscola(ETICHETTE_TELEFONO[valore]),
          ),
        ),
      ),
      h('input', {
        class: 'campo__controllo telefono__numero',
        type: 'tel',
        value: telefono.numero,
        attr: {
          // Il nome dell'etichetta nel segnaposto: chi apre una riga vede che
          // cosa ci si aspetta senza leggere il menu accanto.
          placeholder: `Numero ${del(CONTATTI_TELEFONICI[contatto])}`,
          'aria-label': `${Maiuscola(ETICHETTE_TELEFONO[telefono.etichetta])}, numero`,
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
        titolo: 'Togli questo numero',
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
      testo: 'Aggiungi un numero',
      simbolo: 'piu',
      variante: 'sottile',
      classe: 'telefoni__aggiungi',
      al: () => {
        numeri = [...numeri, creaTelefono(contatto)]
        disegna()
        avvisa()
        // Il fuoco nella casella appena aperta: chi preme «aggiungi» ha già
        // il numero in mano, e cercare il campo con il mouse è un gesto in più.
        righe.lastElementChild?.querySelector<HTMLInputElement>('.telefono__numero')?.focus()
      },
    }),
  )

  return contenitore
}

/**
 * Il ritratto, dentro il modulo: la faccia e i due comandi che la cambiano.
 *
 * Sta qui e non più nella scheda perché la scheda è una vista da leggere con
 * la persona davanti, e «Cambia foto» accanto al suo ritratto è un comando che
 * si preme per sbaglio a colloquio aperto. Tutto quel che dell'anagrafica si
 * scrive si scrive da «Modifica», e la foto non è un'eccezione.
 *
 * La foto però non aspetta il tasto «Salva»: la sceglie l'host, che copia il
 * file nella cartella dell'anno e decide come si chiama, e quel lavoro è già
 * scritto quando la finestra è ancora aperta. Qui si rilegge dove è finita —
 * il registro nuovo arriva prima della risposta — e si passa a chi salva, o il
 * modulo riscriverebbe l'anagrafica con il percorso di prima e la faccia
 * appena messa sparirebbe dalla scheda restando sul disco.
 *
 * Su una persona che non c'è ancora i comandi sono spenti: l'host cerca
 * l'allievo nel registro per sapere in che cartella mettere il file, e in una
 * riga mai salvata non lo troverebbe.
 */
function campoFoto (
  classe: Classe,
  base: Allievo,
  modifica: boolean,
  allaModifica: (foto: string | undefined) => void,
): HTMLElement {
  // Si ridisegna solo il ritratto: l'etichetta e la riga d'aiuto non cambiano
  // mai, e rifarle a ogni foto vorrebbe dire rifare il campo intero per una
  // faccia che si è sostituita.
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
          testo: foto ? 'Cambia foto' : 'Aggiungi foto',
          simbolo: 'immagine',
          variante: 'sottile',
          disabilitato: !modifica,
          al: comando('allievo.foto.imposta'),
        }),
        foto
          ? pulsante({
              testo: 'Togli',
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
    h('span', { class: 'campo__etichetta' }, 'Foto'),
    ritratto,
    h(
      'small',
      { class: 'campo__aiuto' },
      modifica
        ? 'Un JPEG o un PNG: finisce sulla scheda stampata e sulla parete della classe. '
          + 'Si applica subito, senza aspettare «Salva».'
        : 'Prima si salva, poi si mette la faccia: il file va nella cartella della classe '
          + 'sotto il suo nome, e l’host quel nome lo cerca nel registro.',
    ),
  )
}

/** L'editor dei numeri di un contatto, dentro un campo con la sua etichetta. */
function campoTelefoni (
  contatto: ContattoTelefonico,
  telefoni: Telefono[],
  aiuto: string,
  allaModifica: (telefoni: Telefono[]) => void,
): HTMLElement {
  return h(
    'div',
    { class: 'campo campo--piena' },
    h('span', { class: 'campo__etichetta' }, 'Telefoni'),
    editorTelefoni(contatto, telefoni, allaModifica),
    h('small', { class: 'campo__aiuto' }, aiuto),
  )
}

/**
 * Le caselle di un indirizzo.
 *
 * Caselle e non una riga, perché il NAP dentro una frase non si ordina e non
 * si raggruppa, e chi intesta una busta vuole la località su una riga sua.
 *
 * Due righe di modulo e non sei campi in colonna: sopra quel che ha ogni
 * indirizzo — via, NAP, località — e sotto quel che ha qualcuno. Sono tutte
 * scrivibili: nascondere le tre di sotto voleva dire che quel che un file
 * vecchio si portava dietro — il nome di uno studio, una casella postale —
 * si vedeva nella scheda e non si poteva correggere da nessuna parte.
 */
function campiIndirizzo (
  prefisso: string,
  indirizzo: Indirizzo | undefined,
  aiuto: string,
): Figlio {
  const dove = indirizzo ?? INDIRIZZO_VUOTO
  return [
    // La riga che si batte tutta d'un fiato: via, numero, NAP, paese. È quel
    // che ha ogni indirizzo, ed è l'ordine in cui lo si detta al telefono.
    riga(
      campo({
        nome: `${prefisso}Via`,
        etichetta: 'Via e numero',
        valore: dove.via,
        aiuto,
        larghezza: 'meta',
      }),
      campo({
        nome: `${prefisso}Cap`,
        etichetta: 'NAP',
        valore: dove.cap,
        aiuto: 'Con la sigla davanti se è estero: I-22100.',
        larghezza: 'quarto',
      }),
      campo({
        nome: `${prefisso}Localita`,
        etichetta: 'Località',
        valore: dove.localita,
        larghezza: 'quarto',
      }),
    ),
    // Le tre caselle che quasi nessuno riempie, sulla riga di sotto: ci sono
    // perché negli indirizzi veri ci sono — un'azienda con il nome dello
    // studio davanti, una casella postale, un domicilio oltre confine — e
    // senza, quel che un file vecchio portava non si poteva più correggere.
    riga(
      campo({
        nome: `${prefisso}Presso`,
        etichetta: 'Presso',
        valore: dove.presso ?? '',
        aiuto: 'Quel che va scritto sopra la via: «c/o Rossi», il nome dello studio.',
        larghezza: 'terzo',
      }),
      campo({
        nome: `${prefisso}Casella`,
        etichetta: 'Casella postale',
        valore: dove.casella ?? '',
        aiuto: 'Dove riceve la posta, che non è dove sta: sulla mappa non conta.',
        larghezza: 'terzo',
      }),
      campo({
        nome: `${prefisso}Paese`,
        etichetta: 'Paese',
        valore: dove.paese ?? '',
        aiuto: 'Solo se non è la Svizzera: su una busta svizzera non si scrive.',
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
  // Le caselle facoltative vuote spariscono invece di restare stringhe vuote:
  // un `presso: ''` scritto nel file è un dato che non c'è travestito da dato
  // che c'è, e chi rilegge il file a mano non sa che farsene.
  const facoltativo = (nome: string) => testo(valori[`${prefisso}${nome}`]) || undefined
  return {
    presso: facoltativo('Presso'),
    via: testo(valori[`${prefisso}Via`]),
    casella: facoltativo('Casella'),
    cap: testo(valori[`${prefisso}Cap`]),
    localita: testo(valori[`${prefisso}Localita`]),
    paese: facoltativo('Paese'),
  }
}

export function moduloAllievo (classe: Classe, allievo?: Allievo): void {
  const modifica = Boolean(allievo)
  const base = allievo ?? creaAllievo('', '')
  // I numeri non passano da `valoriModulo`: sono righe che si aprono e si
  // chiudono mentre il modulo è aperto, e un elenco che cresce non sta in una
  // casella con un nome. Li tiene questa variabile, che le righe aggiornano a
  // ogni tasto e che `alSalva` legge com'è.
  let telefoni = (base.telefoni ?? []).map((t) => ({ ...t }))
  // La foto non passa nemmeno lei da `valoriModulo`: non è una casella che si
  // scrive, è un file già copiato sul disco. Qui si tiene dov'è finito, perché
  // `alSalva` riscrive l'anagrafica intera e senza questo il percorso salvato
  // sarebbe quello di quando la finestra si è aperta.
  let foto = base.foto
  const soloDi = (contatto: ContattoTelefonico) =>
    telefoni.filter((t) => t.contatto === contatto)
  const rimpiazzaDi = (contatto: ContattoTelefonico) => (nuovi: Telefono[]) => {
    telefoni = [...telefoni.filter((t) => t.contatto !== contatto), ...nuovi]
  }

  apriModale({
    titolo: modifica ? `Modifica ${PIF.singolare}` : `Nuova ${PIF.singolare}`,
    sottotitolo: classe.nome,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        // Tre sezioni e non dodici campi di fila: chi è la persona, come la si
        // raggiunge, e chi sta dall'altra parte. Le due mail e i due telefoni
        // stavano a due righe di distanza senza niente che dicesse di chi
        // fossero, e il numero del datore finiva nella casella del telefono suo.
        sezioneModulo(
          'Chi è',
          riga(
            campo({ nome: 'cognome', etichetta: 'Cognome', valore: base.cognome, richiesto: true, larghezza: 'meta' }),
            campo({ nome: 'nome', etichetta: 'Nome', valore: base.nome, richiesto: true, larghezza: 'meta' }),
          ),
          riga(
            campo({
              nome: 'dataNascita',
              etichetta: 'Data di nascita',
              tipo: 'date',
              valore: base.dataNascita ?? '',
              aiuto: 'Per i moduli della scuola, e per il compleanno sul calendario.',
              larghezza: 'meta',
            }),
            campo({
              nome: 'attivo',
              tipo: 'checkbox',
              etichetta: 'Frequenta',
              valore: base.attivo,
              aiuto: 'Togliendo la spunta esce dagli appelli, ma resta nello storico.',
              larghezza: 'meta',
            }),
          ),
          campoFoto(classe, base, modifica, (scelta) => {
            foto = scelta
          }),
        ),
        sezioneModulo(
          'Come la si raggiunge',
          campiIndirizzo(
            'indirizzo',
            base.indirizzo,
            aiutoCoordinate(base, 'domicilio', 'Dove abita.'),
          ),
          campo({ nome: 'email', etichetta: 'E-mail', tipo: 'email', valore: base.email ?? '' }),
          campoTelefoni(
            'pif',
            soloDi('pif'),
            'Quanti ne servono. Il primo è quello che si prova per primo, e quello '
              + 'che finisce sui fogli stampati: si sposta trascinando la riga.',
            rimpiazzaDi('pif'),
          ),
        ),
        sezioneModulo(
          Uno(PERSONE.rappresentante),
          campo({
            nome: 'emailTutore',
            etichetta: 'E-mail',
            tipo: 'email',
            valore: base.emailTutore ?? '',
            aiuto: 'Riceve le comunicazioni al posto suo, o insieme a lui.',
          }),
          campoTelefoni(
            'rappresentante',
            soloDi('rappresentante'),
            'Il numero di chi risponde per lei da minorenne: prima non aveva una '
              + 'casella, e finiva in quella sua.',
            rimpiazzaDi('rappresentante'),
          ),
        ),
        sezioneModulo(
          Uno(PERSONE.azienda),
          campo({
            nome: 'azienda',
            etichetta: 'Nome',
            valore: base.azienda ?? '',
            aiuto: 'Dove fa il tirocinio: serve solo a riconoscerla negli elenchi.',
          }),
          campiIndirizzo(
            'indirizzoDatore',
            base.indirizzoDatore,
            aiutoCoordinate(
              base,
              'lavoro',
              'Per la visita in azienda e per quel che si spedisce.',
            ),
          ),
          campo({
            nome: 'emailDatore',
            etichetta: `E-mail ${del(PERSONE.datore)}`,
            tipo: 'email',
            valore: base.emailDatore ?? '',
            aiuto: 'Riceve i fogli delle assenze da controfirmare. Senza, la richiesta non parte.',
          }),
          campoTelefoni(
            'datore',
            soloDi('datore'),
            'Per sollecitare una firma che non torna: il centralino e il diretto '
              + 'sono due numeri, e chiamarli in quest\u2019ordine è quel che si fa.',
            rimpiazzaDi('datore'),
          ),
        ),
      ),
    alSalva: async (valori, contesto) => {
      // La classe com'è adesso: `classe.salva` rimanda l'elenco intero, e
      // ripartire da quello dell'apertura riportava indietro tutti gli altri.
      const classeViva = classePerId(classe.id)
      if (!classeViva) {
        contesto.mostraErrori(['La classe non c’è più: è stata tolta altrove.'])
        return
      }
      const vivo = baseViva(
        contesto,
        modifica,
        base,
        classeViva.allievi.find((a) => a.id === base.id),
        'Non c’è più: è stato tolto dalla classe altrove.',
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
        // Le righe rimaste vuote non si salvano: chi apre un numero e cambia
        // idea non si porta dietro una riga senza niente dentro.
        // Il prefisso si mette qui e non mentre si scrive: vederlo comparire
        // sotto le dita a metà numero è il modo più sicuro di fargli sbagliare la
        // cifra dopo.
        telefoni: telefoni
          .map((t) => ({ ...t, numero: conPrefissoInternazionale(t.numero) }))
          .filter((t) => t.numero !== ''),
        attivo: Boolean(valori.attivo),
      }
      // Tolta la foto, la casella se ne va invece di restare a `undefined`:
      // una chiave che non dice niente scritta nel file è una chiave che chi
      // rilegge il registro a mano deve interpretare.
      if (foto) aggiornato.foto = foto
      else delete aggiornato.foto
      // L'host valida solo la classe: senza questo controllo una riga senza
      // cognome passava lo stesso, e ricompariva senza nome in ogni elenco.
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
        modifica ? frase(PIF, 'aggiornato') : frase(PIF, 'aggiunto'),
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            etichetta: 'Togli dalla classe',
            // Non basta più toglierlo dall'elenco: presenze e voti restavano
            // nei file a nome di uno che non c'era più, e il registro se ne
            // lamentava a ogni apertura. Se ne va lui, se ne va quel che
            // parlava di lui.
            chiedi: { genere: 'allievo', classeId: classe.id, id: base.id },
            azione: { tipo: 'allievo.elimina', classeId: classe.id, allievoId: base.id },
            fatto: frase(PIF, 'tolto', { coda: 'dalla classe' }),
          })
        : null,
  })
}

/** Incolla-elenco: il modo in cui gli allievi entrano davvero, all'inizio dell'anno. */
export function moduloImportaAllievi (classe: Classe): void {
  apriModale({
    titolo: `Importa ${PIF.plurale}`,
    sottotitolo: classe.nome,
    larghezza: 'media',
    testoSalva: 'Importa',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          `Una riga per ${PIF.singolare}. Vanno bene «Rossi Mario», «Rossi, Mario» e le righe ` +
            'copiate da un foglio di calcolo, anche con l’e-mail in fondo. ' +
            'I nomi già presenti vengono saltati.',
        ),
        campo({
          nome: 'testo',
          tipo: 'textarea',
          righe: 12,
          segnaposto: 'Bernasconi Luca\nRossi Maria; maria.rossi@edu.ti.ch',
        }),
      ),
    alSalva: async (valori, contesto) => {
      await salva(
        contesto,
        { tipo: 'allievi.importa', classeId: classe.id, testo: String(valori.testo ?? '') },
        'Elenco importato.',
      )
    },
  })
}

