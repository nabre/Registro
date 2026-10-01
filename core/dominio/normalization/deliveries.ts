// Le consegne dal file, e le forme vecchie che diventano consegne: i compiti
// scritti nella lezione e i documenti del fascicolo. Solo un lettore può
// convertirle, perché vede il file com'era.

import { giornoDi, isoValida, istanteAdesso, oggi } from '#core/dominio/dates.js'
import { nomeDelFile, percorsoRelativo } from '#core/dominio/text.js'
import { allieviAttivi } from '#core/dominio/calculations.js'
import { nuovoIdConsegna } from '#core/dominio/identifiers.js'
import type {
  Consegna,
  Classe,
  Lezione,
  Corso,
  Documento,
  Fascicolo,
  SpuntaConsegna,
} from '#core/dominio/models.js'
import { CHI_INSEGNA } from '#core/dominio/models.js'
import {
  testo,
  riferimento,
  booleano,
  unaData,
  unaVoce,
  elenco,
  oggetto,
  CATEGORIE_DOCUMENTO,
} from './readers.js'


const TIPI_CONSEGNA = [
  'compito',
  'studio',
  'materiale',
  'consegna',
  'preparazione',
  'amministrativo',
  'altro',
] as const

const DESTINATARI_CONSEGNA = ['classe', 'docente', 'allievi'] as const

const VERSI_DOCUMENTO = ['ricevo', 'consegno'] as const

const MODI_CONSEGNA = ['mano', 'email'] as const

function normalizzaSpunta (grezzo: unknown): SpuntaConsegna {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    chi: testo(dati.chi),
    fattaIl: testo(dati.fattaIl, istanteAdesso()),
    nota: testo(dati.nota),
    file: file || undefined,
    nome: file ? testo(dati.nome) || nomeDelFile(file) : undefined,
    modo: dati.modo === undefined || dati.modo === null
      ? undefined
      : unaVoce(dati.modo, MODI_CONSEGNA, 'mano'),
    destinatari: elenco(dati.destinatari).map((x) => testo(x)).filter(Boolean),
  }
}

export function normalizzaConsegna (grezzo: unknown): Consegna {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const a = unaVoce(dati.a, DESTINATARI_CONSEGNA, 'classe')
  const fatte = elenco(dati.fatte).map(normalizzaSpunta).filter((s) => s.chi)

  // I file dentro le spunte (forma vecchia) diventano documenti della
  // consegna, senza doppioni.
  const documenti = elenco((dati.documenti ?? dati.daConsegnare))
    .map((voce) => {
      const dato = oggetto(voce)
      const percorso = percorsoRelativo(dato.file)
      return {
        allievoId: testo(dato.allievoId),
        file: percorso,
        nome: testo(dato.nome) || nomeDelFile(percorso),
        aggiuntoIl: testo(dato.aggiuntoIl, ora),
      }
    })
    .filter((d) => d.allievoId && d.file)
  for (const spunta of fatte) {
    if (!spunta.file) continue
    if (!documenti.some((d) => d.allievoId === spunta.chi)) {
      documenti.push({
        allievoId: spunta.chi,
        file: spunta.file,
        nome: spunta.nome || nomeDelFile(spunta.file),
        aggiuntoIl: spunta.fattaIl,
      })
      spunta.file = undefined
      spunta.nome = undefined
    }
    // Se c'era già un documento per quella persona, il file resta sulla
    // spunta: buttare il percorso lo renderebbe introvabile.
  }

  return {
    id: testo(dati.id) || nuovoIdConsegna(),
    corsoId: testo(dati.corsoId),
    testo: testo(dati.testo),
    tipo: unaVoce(dati.tipo, TIPI_CONSEGNA, 'compito'),
    // Solo se c'è scritto: distingue una consegna che si spunta da una che
    // chiede un foglio.
    documento:
      dati.documento === undefined || dati.documento === null
        ? undefined
        : unaVoce(dati.documento, CATEGORIE_DOCUMENTO, 'altro'),
    verso: dati.documento === undefined || dati.documento === null
      ? undefined
      : unaVoce(dati.verso, VERSI_DOCUMENTO, 'ricevo'),
    modoConsegna: dati.documento === undefined || dati.documento === null
      ? undefined
      : unaVoce(dati.modoConsegna, MODI_CONSEGNA, 'mano'),
    mailAllievo: booleano(dati.mailAllievo, true),
    mailTutore: booleano(dati.mailTutore, true),
    oggettoMail: testo(dati.oggettoMail) || undefined,
    corpoMail: testo(dati.corpoMail) || undefined,
    documenti,
    fileTutti: percorsoRelativo(dati.fileTutti) || undefined,
    nomeTutti: testo(dati.nomeTutti) || undefined,
    firmeRichieste: dati.documento === undefined || dati.documento === null
      ? undefined
      : booleano(dati.firmeRichieste, false),
    fileFirme: percorsoRelativo(dati.fileFirme) || undefined,
    nomeFirme: testo(dati.nomeFirme) || undefined,
    a,
    // I nomi valgono solo per una consegna a persone scelte.
    allieviIds: a === 'allievi' ? elenco(dati.allieviIds).map((x) => testo(x)).filter(Boolean) : [],
    dataLezioneId: riferimento(dati.dataLezioneId),
    data: unaData(dati.data, oggi()),
    scadenzaLezioneId: riferimento(dati.scadenzaLezioneId),
    scadenza: isoValida(dati.scadenza) ? String(dati.scadenza) : null,
    note: testo(dati.note),
    docenteDiClasse: booleano(dati.docenteDiClasse, false),
    fatte,
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

/**
 * La chiusura dell'intera consegna (forma vecchia) diventa una spunta per
 * ciascuno, col giorno della chiusura: buttarla riaprirebbe tutto. Non tocca
 * chi ha già la sua spunta, con la data vera.
 */
export function conSpunteDiChiusura (
  consegne: Consegna[],
  chiuse: Set<string>,
  classi: Classe[],
  corsi: Corso[],
): Consegna[] {
  if (chiuse.size === 0) return consegne
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, classi.find((c) => c.id === corso.classeId) ?? null]),
  )

  return consegne.map((consegna) => {
    if (!chiuse.has(consegna.id)) return consegna
    const classe = classePerCorso.get(consegna.corsoId) ?? null
    const attivi = new Set((classe ? allieviAttivi(classe) : []).map((a) => a.id))
    const destinatari =
      consegna.a === 'docente'
        ? [CHI_INSEGNA]
        : consegna.a === 'allievi'
          ? consegna.allieviIds.filter((id) => attivi.has(id))
          : [...attivi]

    const gia = new Set(consegna.fatte.map((f) => f.chi))
    return {
      ...consegna,
      fatte: [
        ...consegna.fatte,
        ...destinatari
          .filter((chi) => !gia.has(chi))
          .map((chi) => ({ chi, fattaIl: consegna.aggiornataIl })),
      ],
    }
  })
}

/**
 * I vecchi «compiti assegnati» della lezione diventano consegne alla classe.
 * Nascono già spuntate per tutti, se no a gennaio ci sarebbero centinaia di
 * falsi arretrati; il testo resta leggibile dov'era.
 */
export function compitiDiventatiConsegne (grezze: unknown[], lezioni: Lezione[]): Consegna[] {
  const esito: Consegna[] = []

  for (const [indice, grezza] of grezze.entries()) {
    const compiti = testo(oggetto(grezza).compiti)
    const lezione = lezioni[indice]
    if (!compiti || !lezione?.corsoId) continue

    esito.push({
      id: `cns-da-${lezione.id}`,
      corsoId: lezione.corsoId,
      testo: compiti,
      tipo: 'compito',
      a: 'classe',
      allieviIds: [],
      dataLezioneId: lezione.id,
      data: lezione.data,
      scadenzaLezioneId: null,
      scadenza: null,
      note: '',
      // Le spunte le mette `conSpunteDiChiusura`, che conosce la classe.
      fatte: [],
      creataIl: lezione.creataIl,
      aggiornataIl: lezione.aggiornataIl,
    })
  }

  return esito
}

/**
 * I documenti del fascicolo (forma vecchia) diventano consegne: una per
 * titolo, con i file raccolti come spunte. Serve un corso della classe; se non
 * c'è, restano nel fascicolo e si riprova alla prossima apertura.
 */
export function documentiDiventatiConsegne (fascicoli: Fascicolo[], corsi: Corso[]): Consegna[] {
  const esito: Consegna[] = []
  const primoCorso = new Map<string, Corso>()
  for (const corso of corsi) {
    if (!primoCorso.has(corso.classeId)) primoCorso.set(corso.classeId, corso)
  }

  for (const fascicolo of fascicoli) {
    if (fascicolo.documenti.length === 0) continue
    const corso = primoCorso.get(fascicolo.classeId)
    if (!corso) continue

    // Stessa regola con cui li si leggeva a matrice: il titolo è il documento.
    const gruppi = new Map<string, Documento[]>()
    for (const documento of fascicolo.documenti) {
      const chiave =
        documento.allievoId === null
          ? `solo:${documento.id}` // testo-fisso: una chiave di raggruppamento
          : documento.titolo.trim().toLowerCase().replace(/\s+/g, ' ')
      const gia = gruppi.get(chiave)
      if (gia) gia.push(documento)
      else gruppi.set(chiave, [documento])
    }

    for (const documenti of gruppi.values()) {
      const capo = documenti[0]
      const diClasse = capo.allievoId === null
      // Passa da `normalizzaConsegna`: i file vanno fra i `documenti`, la forma
      // che leggono le comunicazioni, già in questa sessione.
      const conFile = documenti.filter((d) => d.file)
      esito.push(
        normalizzaConsegna({
          // Un documento di classe tiene il suo id: le comunicazioni lo citano.
          id: diClasse ? capo.id : `cns-da-${capo.id}`, // testo-fisso: un identificatore
          corsoId: corso.id,
          testo: capo.titolo,
          tipo: 'consegna',
          documento: capo.categoria,
          a: diClasse ? 'docente' : 'allievi',
          allieviIds: diClasse
            ? []
            : documenti.map((d) => d.allievoId).filter((id): id is string => id !== null),
          // Il giorno sull'orologio locale: i primi dieci caratteri di un
          // istante sono il giorno UTC.
          data: giornoDi(capo.aggiuntoIl) ?? capo.aggiuntoIl.slice(0, 10),
          scadenza: capo.scadenza ?? null,
          note: capo.note ?? '',
          documenti: conFile.map((d) => ({
            allievoId: d.allievoId ?? CHI_INSEGNA,
            file: d.file,
            nome: d.nome,
            aggiuntoIl: d.aggiuntoIl,
          })),
          fatte: conFile.map((d) => ({ chi: d.allievoId ?? CHI_INSEGNA, fattaIl: d.aggiuntoIl })),
          creataIl: capo.aggiuntoIl,
          aggiornataIl: capo.aggiuntoIl,
        }),
      )
    }

    fascicolo.documenti = []
  }

  return esito
}
