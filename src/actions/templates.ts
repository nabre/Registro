// I modelli dei rapporti: sono del programma, qui si leggono e se ne compone
// l'anteprima (in base64, mai scritta). Del documento è solo la carta
// intestata: il logo passa dalle azioni in fondo, il resto da `impostazioni.salva`.

import { CATALOGO_MODELLI, genereDiProva, titoloModello } from '../domain/templateCatalog.js'
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
import { NOME_LOGO, type DatiRapporto } from '../domain/reports.js'
import { normalizzaIntestazione } from '../domain/normalization.js'
import { blocchi, paroleDeiModelli, sorgenteModello, vecchiaCartella } from '../data/templates.js'
import { archiviaCopia } from '../data/filing.js'
import { componiPdf } from '../data/reportsPdf.js'
import type { NomiModello } from '../protocol.js'
import { immaginiDelDocumento, impaginazioneDi } from './reports.js'
import {
  cestina,
  documentoCambiato,
  fatto,
  invariato,
  motivoSicuro,
  rifiuta,
  rifiutaCon,
  scegliUnFile,
  type Gestore,
  type Parte,
} from './context.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './templates.testi.js'

/** Quel che un gestore ha sottomano: il registro e i modi di scriverlo. */
type Contesto = Parameters<Gestore<'stato.leggi'>>[0]

/**
 * Esito delle due letture qui sotto: non sono azioni ma domande, chiamate dalle
 * procedure `modelli.leggi` e `modelli.prova` (`src/api/procedures/modelli/`).
 */
export type Letto<T> = { ok: true, dati: T } | { ok: false, errore: string }

/** Il sorgente di un modello del programma, con i nomi che quel rapporto sa riempire. */
export function leggiModello (
  registro: Registro,
  nome: string,
): Letto<{ testo: string, nomi: NomiModello }> {
  const testo = sorgenteModello(nome)
  if (testo === null) return { ok: false, errore: testi().modelloAssente(nome) }
  return { ok: true, dati: { testo, nomi: nomiDelModello(registro, nome) } }
}

/** Il PDF di prova di un modello, sui dati veri e con la carta intestata del documento; mai scritto. */
export async function provaModello (
  registro: Registro,
  nome: string,
): Promise<Letto<{ pdf: string, di: string }>> {
  const genere = genereDiProva(nome)
  if (!genere) return { ok: false, errore: perchéNiente(null, nome) }

  const prova = datiDiProva(registro, genere)
  if (!prova) return { ok: false, errore: perchéNiente(genere, nome) }

  const pronto = impaginazioneDi(nome, prova.dati, registro.impostazioni.intestazione)
  if (!pronto) return { ok: false, errore: testi().modelloAssente(nome) }

  try {
    const byte = await componiPdf(pronto.impaginazione, pronto.dati, immaginiDelDocumento(pronto.carta))
    return { ok: true, dati: { pdf: Buffer.from(byte).toString('base64'), di: prova.di } }
  } catch (errore) {
    return { ok: false, errore: testi().anteprimaFallita(motivoSicuro(errore)) }
  }
}

/**
 * I dati veri su cui si guarda un modello, e di chi sono (`di`, mostrato
 * nell'etichetta). Veri perché l'anteprima mostra come viene il foglio pieno.
 */
function datiDiProva (
  registro: Registro,
  genere: GenereRapporto,
): { dati: DatiRapporto, di: string } | null {
  const corso = registro.corsi[0] ?? null
  const classe = corso ? classeDelCorsoId(registro, corso.id) : registro.classi[0] ?? null

  if (genere === 'lezione') {
    // L'ultima svolta: ha appello, consuntivo e osservazioni.
    const svolte = registro.lezioni.filter((l) => l.stato === 'svolta')
    const lezione = svolte[svolte.length - 1] ?? registro.lezioni[0] ?? null
    if (!lezione) return null
    const consegne = registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
    return { dati: datiLezione(registro, lezione, consegne), di: testi().lezioneDel(lezione.data) }
  }

  if (genere === 'piano') {
    const piano = registro.piani[0] ?? null
    return piano ? { dati: datiPiano(registro, piano), di: documentoPiano(registro, piano) } : null
  }

  if (genere === 'valutazioni' || genere === 'presenze') {
    if (!corso) return null
    // L'anno intero: il foglio più pieno.
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

  // La scheda della prima persona attiva; il corso solo se è unico, come nel rapporto vero.
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
  if (genere === null) return testi().nonRapporto(titoloModello(nome))
  return testi().servonoDati
}

/** I nomi che quel rapporto sa riempire: le chiavi dei dati di prova, così non restano indietro. */
function nomiDelModello (
  registro: Registro,
  nome: string,
): NomiModello {
  const genere = genereDiProva(nome)
  const prova = genere ? datiDiProva(registro, genere) : null
  const dati = prova?.dati ?? null
  const parole = paroleDeiModelli()
  const pezzi = blocchi()

  return {
    valori: Object.keys(dati?.valori ?? {}).sort(),
    elenchi: Object.keys(dati?.elenchi ?? {}).sort(),
    tabelle: Object.keys(dati?.tabelle ?? {}).sort(),
    grafici: Object.keys(dati?.grafici ?? {}).sort(),
    gallerie: Object.keys(dati?.gallerie ?? {}).sort(),
    gruppi: Object.keys(dati?.gruppi ?? {}).sort(),
    blocchi: Object.keys(pezzi).sort(),
    frasi: Object.keys(parole.frasi).sort(),
    // Il logo è l'unica immagine per nome; c'è sempre, così un nome sbagliato si segnala.
    immagini: [NOME_LOGO],
    modelli: CATALOGO_MODELLI.filter((voce) => voce.ruolo !== 'immagine' && voce.ruolo !== 'posta')
      .map((voce) => voce.nome),
  }
}

/** I formati di logo che finiscono in un PDF. */
const FORMATI_LOGO = ['png', 'jpg', 'jpeg']

/**
 * Percorso del logo di una carta in `intestazione/`. Il segno temporale nel nome
 * cambia l'indirizzo, così la cache non mostra il logo vecchio; l'id si ripulisce
 * perché un `..` scriverebbe fuori dalla cartella.
 */
export function percorsoLogo (cartaId: string, estensione: string): string {
  const nome = cartaId.replace(/[^A-Za-z0-9_-]/g, '') || 'carta'
  const segno = Date.now().toString(36)
  return `intestazione/${nome}-${segno}.${estensione === 'jpeg' ? 'jpg' : estensione}`
}

/**
 * Porta nel documento, una volta sola, l'intestazione della cartella `templates/`
 * accanto (sulla prima carta). Chiamata all'apertura; agisce solo se
 * `vecchiaCartellaVista` è falso e l'intestazione è vuota. Torna la frase da
 * dire, o `null`.
 */
export async function portaDentroLaVecchiaCartella (contesto: Contesto): Promise<string | null> {
  const intestazione = contesto.registro.impostazioni.intestazione
  if (intestazione.vecchiaCartellaVista) return null
  const vuota = !intestazione.docente && !intestazione.firma &&
    intestazione.carte.every((carta) => !carta.sede && !carta.logo)
  const vecchia = vuota ? await vecchiaCartella() : null
  if (!vecchia) return null
  if (!contesto.ancoraQui()) return null

  const prima = intestazione.carte[0]
  let logo: string | undefined
  if (vecchia.logo) {
    const esito = await archiviaCopia(percorsoLogo(prima.id, vecchia.logo.estensione), vecchia.logo.uri)
    if (!('errore' in esito)) logo = esito.relativo
  }

  const salvato = contesto.modifica((r) => {
    const adesso = r.impostazioni.intestazione
    r.impostazioni.intestazione = {
      ...adesso,
      carte: adesso.carte.map((carta, i) => i > 0
        ? carta
        : {
            ...carta,
            sede: vecchia.sede,
            ...(logo ? { logo } : {}),
            ...(vecchia.logo?.altezza
              ? { altezzaLogo: normalizzaIntestazione({ carte: [{ altezzaLogo: vecchia.logo.altezza }] }).carte[0].altezzaLogo }
              : {}),
          }),
      docente: vecchia.docente,
      ...(vecchia.firma ? { firma: vecchia.firma } : {}),
      vecchiaCartellaVista: true,
    }
  }, ['registro'])
  if (!salvato.ok) return null

  const t = testi()
  const portati = [
    vecchia.sede ? t.portatoSede : null,
    vecchia.docente ? t.portatoDocente : null,
    logo ? t.portatoLogo : null,
    vecchia.firma ? t.portatoFirma : null,
  ].filter((voce): voce is string => voce !== null)
  const detto = portati.length > 0 ? t.intestazionePortata(portati) : t.cartellaInDisuso
  const persi = vecchia.personalizzati.length > 0
    ? t.modelliPersi(vecchia.personalizzati)
    : t.cartellaDaCancellare
  return detto + persi
}

export const modelli = {
  /** Sceglie il logo di una carta intestata e lo copia nel documento; quello di prima va nel cestino. */
  'intestazione.logo': async (contesto, azione) => {
    const t = testi()
    // «Non trovata»: chi chiama rilegge le impostazioni e ritenta.
    if (!contesto.registro.impostazioni.intestazione.carte.some((c) => c.id === azione.cartaId)) {
      return rifiutaCon('non-trovato', t.cartaNonTrovata)
    }
    const scelto = await scegliUnFile({
      titolo: t.titoloSceltaLogo,
      tasto: t.tastoSceltaLogo,
      filtri: { [parole().immagini]: FORMATI_LOGO },
    })
    if (!scelto) return fatto

    const formato = scelto.estensione.replace('.', '').toLowerCase()
    if (!FORMATI_LOGO.includes(formato)) {
      return rifiuta(t.nonPngJpeg(scelto.nome))
    }
    // Durante il dialogo può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const carta = contesto.registro.impostazioni.intestazione.carte.find((c) => c.id === azione.cartaId)
    // Tolta mentre si sceglieva il file.
    if (!carta) return rifiutaCon('non-trovato', t.cartaNonTrovata)
    const vecchio = carta.logo ?? null
    const esito = await archiviaCopia(percorsoLogo(carta.id, formato), scelto.uri)
    if ('errore' in esito) return rifiuta(t.copiaLogoFallita(esito.errore))

    const salvato = contesto.modifica((r) => {
      const bersaglio = r.impostazioni.intestazione.carte.find((c) => c.id === azione.cartaId)
      if (!bersaglio) return false
      bersaglio.logo = esito.relativo
    }, ['registro'], t.cartaNonTrovata)
    if (salvato.ok && vecchio && vecchio !== esito.relativo) await cestina(vecchio)
    return salvato
  },

  /** Toglie il logo da una carta e il suo file dal documento. */
  'intestazione.togliLogo': async (contesto, azione) => {
    const carta = contesto.registro.impostazioni.intestazione.carte.find((c) => c.id === azione.cartaId)
    if (!carta) return rifiutaCon('non-trovato', testi().cartaNonTrovata)
    const vecchio = carta.logo
    if (!vecchio) return invariato
    const salvato = contesto.modifica((r) => {
      const bersaglio = r.impostazioni.intestazione.carte.find((c) => c.id === azione.cartaId)
      if (bersaglio) delete bersaglio.logo
    }, ['registro'])
    if (salvato.ok) await cestina(vecchio)
    return salvato
  },
} satisfies Parte
