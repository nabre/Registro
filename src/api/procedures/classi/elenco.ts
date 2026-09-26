// Le classi dell'anno, come le elenca la pagina Classi: accetta il `classeId`
// che il contesto manda a ogni domanda.

import { allieviAttivi } from '../../../domain/calculations.js'
import { corsiDellaClasse, materiaDelCorso } from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import { booleano, elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { CAMPI_CERCA, filtroTesto, ricerca } from '../common/filters.js'
import { esigiAnno } from '../common/register.js'
import { testi } from './classi.testi.js'
import { confrontaNomi } from '../../../domain/text.js'

const t = () => testi().elenco
const c = () => testi().comune
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'classi.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    annoId: opzionale(identificatore({ aiuto: () => t().annoId })),
    archiviate: opzionale(booleano({ aiuto: () => t().archiviate })),
    ...ricerca(() => t().dove, 'mec'),
  }),
  uscita: oggetto({
    annoId: nullabile(identificatore({ aiuto: () => t().annoIdUscita })),
    anno: testo({ aiuto: () => t().anno }),
    cerca: CAMPI_CERCA.cerca,
    // Come in `persone.cerca`: quante sono state escluse, perché un elenco vuoto
    // non sembri un anno senza classi.
    escluse: nullabile(numero({
      intero: true,
      aiuto: () => t().escluse,
    })),
    classi: elenco(oggetto({
      id: testo(),
      nome: testo({ aiuto: () => t().nome }),
      sede: testo(),
      allievi: numero({ intero: true, aiuto: () => t().allievi }),
      ritirati: numero({ intero: true, aiuto: () => t().ritirati }),
      corsi: numero({ intero: true }),
      materie: elenco(testo(), { aiuto: () => t().materie }),
      docenteDiClasse: booleano({ aiuto: () => t().docenteDiClasse }),
      archiviata: booleano(),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'anno', etichetta: () => c().annoScolastico },
          { campo: 'escluse', etichetta: () => p().escluse, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'classi',
        colonne: [
          { campo: 'nome', testo: () => c().classe },
          { campo: 'allievi', testo: () => c().persone, formato: 'numero' },
          { campo: 'ritirati', testo: () => p().ritirate, formato: 'numero' },
          { campo: 'materie', testo: () => c().materie, formato: 'elenco' },
          { campo: 'docenteDiClasse', testo: () => p().docenteDiClasse, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Come in `corsi.elenco`: l'anno nominato deve essere quello aperto, o si dice.
    if (ingresso.annoId) esigiAnno(ambito, ingresso.annoId)
    const annoId = ingresso.annoId ?? r.annoCorrenteId
    const anno = r.anni.find((a) => a.id === annoId) ?? null

    const dellAnno = r.classi.filter((classe) => (!annoId || classe.annoId === annoId))

    const { corrisponde } = filtroTesto(ingresso.cerca)

    return {
      annoId: anno?.id ?? null,
      anno: anno?.etichetta ?? '',
      cerca: ingresso.cerca ?? '',
      escluse: ingresso.archiviate === true
        ? null
        : dellAnno.filter((classe) => classe.archiviata).length || null,
      classi: r.classi
        .filter((classe) => (!annoId || classe.annoId === annoId))
        // Le archiviate restano fuori se non le si chiede: la stessa sigla comparirebbe
        // due volte quando una classe cambia anno.
        .filter((classe) => ingresso.archiviate === true || !classe.archiviata)
        // Su nome, sede e materie insegnate: «chi fa disegno» si chiede per materia.
        .filter((classe) =>
          corrisponde([
            classe.nome,
            classe.sede ?? '',
            ...corsiDellaClasse(r, classe.id).map((c) => materiaDelCorso(r, c)?.nome ?? ''),
          ].join(' ')),
        )
        .sort((a, b) => confrontaNomi(a.nome, b.nome))
        .map((classe) => {
          const corsi = corsiDellaClasse(r, classe.id)
          const attivi = allieviAttivi(classe)
          return {
            id: classe.id,
            nome: classe.nome,
            sede: classe.sede ?? '',
            allievi: attivi.length,
            // I ritirati restano nel registro, ma non si contano fra chi entra in aula.
            ritirati: classe.allievi.length - attivi.length,
            corsi: corsi.length,
            materie: [...new Set(corsi.map((corso) => materiaDelCorso(r, corso)?.nome ?? ''))]
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b, 'it')),
            docenteDiClasse: classe.docenteDiClasse,
            archiviata: classe.archiviata,
          }
        }),
    }
  },
})
