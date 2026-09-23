// I modelli dei rapporti, governati da dentro il registro.
//
// Prima di questo file la pagina sapeva fare una cosa sola con `templates/`:
// aprirla nel gestore di file del sistema. Il resto — quale dei tredici file
// tocca quel pezzo di foglio, che cosa si può scrivere dentro, se quel che si
// è scritto verrà capito — era roba da sapere in anticipo o da imparare
// stampando e riguardando il PDF.
//
// Qui ci sono le cinque cose che servono a farlo dal registro: leggere un
// modello con i nomi che quel rapporto sa riempire, salvarlo, rimettere quello
// di serie, provarlo su dati veri, e portare dentro un'immagine. Il lavoro
// vero sta sotto — `data/templates.ts` per la cartella, `domain/reports.ts`
// per il formato — e questo file è il centralino.
//
// **L'anteprima non scrive niente.** Compone il PDF e lo rimanda indietro in
// base64, che la pagina disegna con il suo lettore: un foglio di prova nella
// cartella delle esportazioni sarebbe un documento in più da spiegare a chi
// apre quella cartella per consegnare, e dentro il documento dell'anno
// resterebbe per sempre. Si guarda, si chiude, non è mai esistito.

import {
  CATALOGO_MODELLI,
  genereDiProva,
  titoloModello,
} from '../domain/templateCatalog.js'
import { nomeCompleto } from '../domain/calculations.js'
import { documentoPiano, type GenereRapporto } from '../domain/locations.js'
import { classeDelCorsoId, corsiDellaClasse } from '../domain/courses.js'
import {
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
} from '../domain/reportData.js'
import type { Registro } from '../domain/models.js'
import { impronta } from '../domain/text.js'
import type { DatiRapporto } from '../domain/reports.js'
import {
  aggiornaInventarioModelli,
  blocchi,
  immaginiModelli,
  importaImmagine,
  modello,
  ripristinaModello,
  scriviModello,
  sorgenteModello,
  testi,
} from '../data/templates.js'
import { componiPdf } from '../data/reportsPdf.js'
import type { NomiModello } from '../protocol.js'
import { immagineDelRapporto } from './reports.js'
import { conMessaggio, rifiuta, rifiutaCon, scegliUnFile, type Parte } from './context.js'

/**
 * Com'è andata a una delle due letture qui sotto.
 *
 * Tornano un risultato e non un `EsitoAzione` perché **non sono azioni**: sono
 * domande, e da quando il protocollo ha un canale per le domande
 * (`Domanda`/`Riscontro`) non hanno più bisogno di travestirsi.
 *
 * Erano `modello.leggi` e `modello.prova`, due azioni di scrittura che non
 * scrivevano niente e che si portavano dietro tre campi di ritorno — `testo`,
 * `nomi`, `pdf` — appesi alla busta di tutte le altre centoquaranta per
 * servire loro sole. Le azioni sono state ritirate, i tre campi con loro, e
 * quel che facevano vive qui: lo chiamano le procedure `modelli.leggi` e
 * `modelli.prova` in `src/api/procedures/rapporti.ts`.
 */
export type Letto<T> = { ok: true, dati: T } | { ok: false, errore: string }

/**
 * Il sorgente di un modello, con i nomi che quel rapporto sa riempire.
 *
 * **Non scrive niente.** Qui c'era `assicuraModelli()`, che semina `templates/`
 * con tredici `.tpl` piu' `_impronte.json`: quattordici file scritti sul disco
 * da una procedura che si dichiara `genere: 'lettura'`, e che `contract.ts`
 * descrive con «una lettura non tocca il registro, mai». Il canale delle
 * domande la apre a ogni webview **senza passare dalla coda**, e
 * `archivio.revisione` non si muoveva: la garanzia dichiarata non la vedeva
 * nemmeno. La scrittura era anche condizionata da una cache di sessione, quindi
 * la prima chiamata scriveva e le successive no — una lettura che non era
 * nemmeno uniforme.
 *
 * La risposta non cambia: `sorgenteModello` ripiega gia' su
 * `MODELLI_PREDEFINITI` quando il file non c'e'. E la semina continua ad
 * avvenire dove e' una scrittura vera — `actions/reports.ts`, prima di comporre
 * i PDF — e da `scriviModello`, che la cartella se la crea da se'.
 */
export async function leggiModello (
  registro: Registro,
  nome: string,
): Promise<Letto<{ testo: string, nomi: NomiModello }>> {
  await aggiornaInventarioModelli()
  const testo = await sorgenteModello(nome)
  if (testo === null) return { ok: false, errore: `Il modello «${nome}» non c’è.` }
  return { ok: true, dati: { testo, nomi: await nomiDelModello(registro, nome) } }
}

/**
 * Il PDF di prova di un modello, composto sui dati veri e mai scritto.
 *
 * Si guarda, si chiude, non è mai esistito: un foglio di prova nella cartella
 * delle esportazioni sarebbe un documento in più da spiegare a chi apre quella
 * cartella per consegnare.
 */
export async function provaModello (
  registro: Registro,
  nome: string,
  sorgente: string,
): Promise<Letto<{ pdf: string, di: string }>> {
  const genere = genereDiProva(nome)
  if (!genere) return { ok: false, errore: perchéNiente(null, nome) }

  const prova = datiDiProva(registro, genere)
  if (!prova) return { ok: false, errore: perchéNiente(genere, nome) }

  // Il modello si compone con la bozza al posto del file: la catena sotto —
  // `_base`, `_stile` — resta quella su disco, perché è quella che varrà.
  const impaginazione = await modello(nome, sorgente)
  if (!impaginazione) return { ok: false, errore: `Il modello «${nome}» non c’è.` }

  const [parole, pezzi] = await Promise.all([testi(), blocchi()])
  const dati = {
    ...prova.dati,
    frasi: parole.frasi,
    colonne: parole.colonne,
    blocchi: pezzi,
  }

  try {
    const byte = await componiPdf(impaginazione, dati, immagineDelRapporto)
    return { ok: true, dati: { pdf: Buffer.from(byte).toString('base64'), di: prova.di } }
  } catch (errore) {
    return { ok: false, errore: `L’anteprima non si è composta: ${(errore as Error).message}` }
  }
}

/**
 * I dati veri su cui si guarda un modello, e di chi sono.
 *
 * Dati veri e non inventati: un'anteprima con dentro «Mario Rossi» e tre voti
 * finti direbbe che il modello *funziona*, che non è la domanda — la domanda è
 * come viene il foglio con questa classe, questi nomi lunghi, queste
 * ventidue prove in larghezza. È anche il solo modo di vedere una tabella che
 * non ci sta nella pagina, che è il motivo per cui `_stile.tpl` esiste.
 *
 * Si prende il primo soggetto che c'è, ed è una scelta arbitraria dichiarata:
 * l'etichetta dice di chi si sta guardando il foglio, così chi non riconosce i
 * nomi non pensa che il modello abbia pescato a caso dentro un'altra classe.
 */
function datiDiProva (
  registro: Registro,
  genere: GenereRapporto,
): { dati: DatiRapporto, di: string } | null {
  const corso = registro.corsi[0] ?? null
  const classe = corso ? classeDelCorsoId(registro, corso.id) : registro.classi[0] ?? null

  if (genere === 'lezione') {
    // L'ultima svolta, non la prima del calendario: è quella che ha dentro
    // l'appello fatto, il consuntivo e le osservazioni — cioè tutto quel che un
    // verbale contiene, e che su un'ora futura sarebbe vuoto.
    const svolte = registro.lezioni.filter((l) => l.stato === 'svolta')
    const lezione = svolte[svolte.length - 1] ?? registro.lezioni[0] ?? null
    if (!lezione) return null
    const consegne = registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
    return { dati: datiLezione(registro, lezione, consegne), di: `lezione del ${lezione.data}` }
  }

  if (genere === 'piano') {
    const piano = registro.piani[0] ?? null
    return piano ? { dati: datiPiano(registro, piano), di: documentoPiano(registro, piano) } : null
  }

  if (genere === 'valutazioni' || genere === 'presenze') {
    if (!corso) return null
    // L'anno intero e non un semestre: è il periodo che contiene più roba, e
    // un'anteprima serve a vedere il foglio pieno.
    const dati =
      genere === 'presenze'
        ? datiPresenze(registro, corso, null)
        : datiValutazioni(registro, corso, null)
    return { dati, di: corso.titolo }
  }

  if (genere === 'momento') {
    const momento = registro.valutazioni[0] ?? null
    return momento ? { dati: datiMomento(registro, momento), di: momento.titolo } : null
  }

  if (genere === 'fascicolo') {
    const suo = registro.classi.find((c) => c.docenteDiClasse) ?? classe
    return suo ? { dati: datiFascicolo(registro, suo), di: suo.nome } : null
  }

  if (genere === 'foto-classe') {
    return classe ? { dati: datiFotoClasse(registro, classe), di: classe.nome } : null
  }

  // La scheda di una persona: la prima della prima classe, con il corso che ha
  // se ne ha uno solo — la stessa regola del rapporto vero.
  const conAllievi = registro.classi.find((c) => c.allievi.some((a) => a.attivo)) ?? classe
  const allievo = conAllievi?.allievi.find((a) => a.attivo) ?? null
  if (!conAllievi || !allievo) return null
  const suoi = corsiDellaClasse(registro, conAllievi.id)
  return {
    dati: datiAllievo(registro, conAllievi, allievo, null, suoi.length === 1 ? suoi[0] : null),
    di: nomeCompleto(allievo),
  }
}

/** Perché per quel modello non si può comporre niente, detto a chi ha premuto. */
function perchéNiente (genere: GenereRapporto | null, nome: string): string {
  if (genere === null) {
    return `«${titoloModello(nome)}» non è un rapporto: non c’è un foglio da guardare.`
  }
  return 'Serve almeno una lezione, un corso e una classe: l’anteprima si compone sui dati veri del registro.'
}

/**
 * I nomi che quel rapporto sa riempire.
 *
 * Non una tabella scritta a mano: sono le chiavi dei dati che il dominio ha
 * appena prodotto. Una tabella a mano resterebbe indietro al primo dato nuovo,
 * e chi scrive un modello si fiderebbe di un elenco sbagliato — che è peggio
 * che non averlo.
 */
async function nomiDelModello (
  registro: Registro,
  nome: string,
): Promise<NomiModello> {
  const genere = genereDiProva(nome)
  const prova = genere ? datiDiProva(registro, genere) : null
  const dati = prova?.dati ?? null
  const [parole, pezzi] = await Promise.all([testi(), blocchi()])

  return {
    valori: Object.keys(dati?.valori ?? {}).sort(),
    elenchi: Object.keys(dati?.elenchi ?? {}).sort(),
    tabelle: Object.keys(dati?.tabelle ?? {}).sort(),
    grafici: Object.keys(dati?.grafici ?? {}).sort(),
    gallerie: Object.keys(dati?.gallerie ?? {}).sort(),
    gruppi: Object.keys(dati?.gruppi ?? {}).sort(),
    blocchi: Object.keys(pezzi).sort(),
    frasi: Object.keys(parole.frasi).sort(),
    immagini: immaginiModelli(),
    modelli: CATALOGO_MODELLI.filter((voce) => voce.ruolo !== 'immagine' && voce.ruolo !== 'posta')
      .map((voce) => voce.nome),
  }
}

export const modelli = {
  /**
   * Il testo di un modello e i nomi che quel rapporto produce.
   *
   * I due insieme e non in due richieste: la pagina li usa insieme — il testo
   * nell'editor, i nomi nell'elenco accanto e nel controllo che segnala una
   * `tabella:` che non esiste — e chiederli separati vorrebbe dire una pagina
   * che per mezzo secondo mostra il modello segnalando come sbagliato tutto
   * quel che contiene.
   */

  'modello.salva': async (_contesto, azione) => {
    // Quel che c'è adesso sul disco è ancora quel che la pagina aveva letto?
    // Se no, qualcuno l'ha corretto da fuori mentre la pagina era aperta, e
    // scriverci sopra vorrebbe dire buttare via il suo lavoro senza dirlo.
    if (azione.attesoSuDisco !== undefined) {
      const adesso = await sorgenteModello(azione.nome)
      // Salvare due volte lo stesso testo non e' un conflitto: dopo la prima
      // chiamata il disco contiene gia' `azione.testo`, e l'impronta attesa non
      // combacia piu'. La procedura si dichiara `idempotente: true`, e senza
      // questa riga il ritentativo accusava di aver modificato il file da fuori
      // qualcuno che non lo aveva toccato.
      const uguale = adesso !== null && impronta(adesso) === impronta(azione.testo)
      if (adesso !== null && !uguale && impronta(adesso) !== azione.attesoSuDisco) {
        // `conflitto` e non `rifiutato`: e' la definizione testuale del codice
        // — «qualcosa e' cambiato sotto: il file su disco non e' piu' quello
        // letto» — e finora non lo sollevava nessuno, in tutte le 149.
        return rifiutaCon(
          'conflitto',
          `«${titoloModello(azione.nome)}» è stato cambiato fuori dal registro dopo che ` +
            'questa pagina lo aveva letto. Riaprilo per vedere la versione di adesso: ' +
            'salvando ora si perderebbe quella correzione.',
        )
      }
    }
    const esito = await scriviModello(azione.nome, azione.testo)
    if (esito) return rifiuta(esito.errore)
    return conMessaggio(
      `Modello «${titoloModello(azione.nome)}» salvato: vale dal prossimo rapporto.`,
    )
  },

  /**
   * Rimette il modello di serie.
   *
   * Non chiede conferma da qui: la chiede la pagina, che è dove si vede che
   * cosa si sta per buttare via. Un dialogo di sistema in mezzo a un'azione
   * sarebbe la seconda domanda sulla stessa cosa.
   */
  'modello.ripristina': async (_contesto, azione) => {
    const esito = await ripristinaModello(azione.nome)
    if (esito) return rifiuta(esito.errore)
    return conMessaggio(`«${titoloModello(azione.nome)}» è tornato com’era di serie.`)
  },

  /**
   * Compone il modello su dati veri e rimanda il PDF senza scriverlo.
   *
   * Il testo è quello che si sta scrivendo, non quello su disco: l'anteprima
   * serve prima di salvare — è lì che si vuole sapere se la riga appena
   * aggiunta viene come si pensava — e un'anteprima del file salvato
   * risponderebbe alla domanda di ieri.
   *
   * Gli strati comuni non hanno un foglio loro e ne prendono in prestito uno:
   * `_stile.tpl` si guarda sulla griglia dei voti, che è il rapporto in cui le
   * misure si vedono. Lo dice il catalogo, non questo file.
   */

  /**
   * Porta un'immagine in `templates/`.
   *
   * È il logo della sede, quasi sempre. Il file si copia con il nome che ha, e
   * il messaggio dice come richiamarlo: il passo che si dimentica non è
   * copiare l'immagine, è scrivere la riga che la mostra.
   */
  'modello.immagine': async (_contesto, _azione) => {
    const scelto = await scegliUnFile({
      titolo: 'Un’immagine per i modelli: il logo della sede',
      tasto: 'Porta in templates',
      filtri: { Immagini: ['png', 'jpg', 'jpeg'] },
    })
    if (!scelto) return { ok: true, invariato: true }

    const esito = await importaImmagine(scelto.uri, scelto.nome)
    if ('errore' in esito) return rifiuta(esito.errore)
    return conMessaggio(
      `«${esito.file}» è in templates/. Per mostrarla: «immagine: ${esito.file} | altezza 14 | destra».`,
    )
  },
} satisfies Parte
