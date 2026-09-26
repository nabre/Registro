// Che cosa c'è in un altro registro, blocco per blocco: quel che «Importa da un
// altro registro…» mostra prima di portarlo. L'altro documento si legge e basta
// (`Archivio.leggiAltroAnno`); del registro aperto si guarda solo che cosa c'è
// già (materie omonime, classi che si salterebbero).
//
// Non va al modello (`perAssistente: false`), come `classi.altrove`: legge un
// file scelto da chi chiama.

import * as apparato from 'apparato'

import { corsiDellaClasse, materiaDelCorso } from '../../../domain/courses.js'
import { confrontaNomi } from '../../../domain/text.js'
import { nomeNormalizzato, validaClasse } from '../../../domain/validation.js'
import { definisci, errore } from '../../contract.js'
import { booleano, elenco, identificatore, numero, oggetto, testo } from '../../schemas.js'
import { testi } from './registro.testi.js'

const t = () => testi().altrove
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'registro.altrove',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  perAssistente: false,
  ingresso: oggetto({
    percorso: testo({
      minimo: 1,
      aiuto: () => t().percorso,
    }),
  }),
  uscita: oggetto({
    anno: testo({ aiuto: () => t().anno }),
    impostazioni: oggetto({
      scala: testo({ aiuto: () => t().scala }),
      carte: numero({ intero: true, aiuto: () => t().carte }),
      loghi: numero({ intero: true, aiuto: () => t().loghi }),
      docente: testo({ aiuto: () => t().docente }),
      liste: numero({ intero: true, aiuto: () => t().liste }),
    }),
    materie: elenco(oggetto({
      nome: testo(),
      nuova: booleano({ aiuto: () => t().nuova }),
    })),
    classi: elenco(oggetto({
      id: identificatore({ aiuto: () => t().classeId }),
      nome: testo(),
      persone: numero({ intero: true, aiuto: () => t().persone }),
      corsi: numero({ intero: true, aiuto: () => t().corsi }),
      materie: elenco(testo(), { aiuto: () => t().materie }),
      piani: numero({ intero: true, aiuto: () => t().piani }),
      esiste: booleano({ aiuto: () => t().esiste }),
    })),
    calendari: elenco(testo(), { aiuto: () => t().calendari }),
    regole: numero({ intero: true, aiuto: () => t().regole }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'anno', etichetta: () => p().anno },
          { campo: 'regole', etichetta: () => p().regole, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'classi',
        colonne: [
          { campo: 'nome', testo: () => p().classe },
          { campo: 'persone', testo: () => p().persone, formato: 'numero' },
          { campo: 'corsi', testo: () => p().corsi, formato: 'numero' },
          { campo: 'piani', testo: () => p().piani, formato: 'numero' },
          { campo: 'materie', testo: () => p().materie, formato: 'elenco' },
        ],
      },
    ],
  },
  esegui: async (ambito, ingresso) => {
    const qui = ambito.contesto.registro
    const file = apparato.Uri.file(ingresso.percorso)
    const letto = await ambito.contesto.archivio.leggiAltroAnno(file)
    if ('errore' in letto) throw errore.rifiuta(letto.errore)
    const r = letto.registro
    const { scala, intestazione, calendario, liste } = r.impostazioni
    const presenti = new Set(qui.materie.map((m) => nomeNormalizzato(m.nome)))
    const annoQui = qui.annoCorrenteId ?? ''
    return {
      anno: r.anni[0]?.etichetta ?? '',
      impostazioni: {
        scala: t().scalaInBreve(scala.min, scala.max, scala.sufficienza),
        carte: intestazione.carte.length,
        loghi: intestazione.carte.filter((c) => c.logo).length,
        docente: intestazione.docente,
        liste: Object.keys(liste ?? {}).length,
      },
      materie: [...r.materie]
        .sort((a, b) => confrontaNomi(a.nome, b.nome))
        .map((m) => ({ nome: m.nome, nuova: !presenti.has(nomeNormalizzato(m.nome)) })),
      // Anche le archiviate: la classe dell'anno scorso spesso lo è.
      classi: [...r.classi]
        .sort((a, b) => confrontaNomi(a.nome, b.nome))
        .map((classe) => {
          const corsi = corsiDellaClasse(r, classe.id)
          const suoi = new Set(corsi.map((c) => c.id))
          return {
            id: classe.id,
            nome: classe.nome,
            persone: classe.allievi.length,
            corsi: corsi.length,
            materie: [...new Set(corsi.map((c) => materiaDelCorso(r, c)?.nome ?? ''))]
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b, 'it')),
            piani: r.piani.filter((p) => p.corsoId !== null && suoi.has(p.corsoId)).length,
            esiste: !validaClasse({ id: '', nome: classe.nome.trim(), annoId: annoQui }, qui.classi).valido,
          }
        }),
      calendari: (calendario?.calendari ?? []).map((c) => c.nome),
      regole: calendario?.regole.length ?? 0,
    }
  },
})
