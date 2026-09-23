// Le classi dell'anno, come le elenca la pagina Classi.
//
// Era il buco più grande dell'assistente: il contesto gli dice `classeId` a ogni
// domanda — è la classe che si ha davanti — e non c'era **nessun** attrezzo che
// quell'id lo accettasse. «Quante persone ci sono nella 4a» finiva in «non lo
// so», e la sola strada era `corsi.elenco`, che le classi le nomina di
// sfuggita, dentro il nome di un corso.

import { allieviAttivi } from '../../../domain/calculations.js'
import { corsiDellaClasse, materiaDelCorso } from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import { booleano, elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { filtroTesto, ricerca } from '../common/filters.js'
import { esigiAnno } from '../common/register.js'
import { confrontaNomi } from '../../../domain/text.js'

export const procedura = definisci({
  nome: 'classi.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'Le classi dell’anno: quante persone, chi ne è docente di classe, quanti corsi',
  idempotente: true,
  ingresso: oggetto({
    annoId: opzionale(identificatore({ aiuto: 'Senza, l’anno in uso' })),
    archiviate: opzionale(booleano({
      aiuto: 'Vero per vedere anche le classi archiviate: di norma restano fuori',
    })),
    ...ricerca('nome, sede o materia', 'mec'),
  }),
  uscita: oggetto({
    annoId: nullabile(identificatore({ aiuto: 'L’anno di cui sono le classi' })),
    anno: testo({ aiuto: 'Come si chiama: «2026/2027»' }),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    // Stessa ragione di `persone.cerca`: un anno le cui classi sono tutte
    // archiviate tornava un elenco vuoto, e un elenco vuoto si legge come un
    // anno senza classi. Il numero accanto dice che ci sono e dove sono.
    escluse: nullabile(numero({
      intero: true,
      aiuto: 'Quante classi archiviate restano fuori: con «archiviate» a vero rientrano',
    })),
    classi: elenco(oggetto({
      id: testo(),
      nome: testo({ aiuto: 'La sigla con cui la classe si chiama ovunque: «I MEC A»' }),
      sede: testo(),
      allievi: numero({ intero: true, aiuto: 'Quante persone la frequentano adesso' }),
      ritirati: numero({ intero: true, aiuto: 'Quante ci sono ma non frequentano più' }),
      corsi: numero({ intero: true }),
      materie: elenco(testo(), { aiuto: 'Che cosa si insegna in questa classe' }),
      docenteDiClasse: booleano({ aiuto: 'Se chi tiene il registro ne è docente di classe' }),
      archiviata: booleano(),
    })),
  }),
  presentazione: {
    titolo: 'Le classi dell’anno',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'anno', etichetta: 'Anno scolastico' },
          { campo: 'escluse', etichetta: 'Archiviate, fuori dall’elenco', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'classi',
        colonne: [
          { campo: 'nome', testo: 'Classe' },
          { campo: 'allievi', testo: 'Persone', formato: 'numero' },
          { campo: 'ritirati', testo: 'Ritirate', formato: 'numero' },
          { campo: 'materie', testo: 'Materie', formato: 'elenco' },
          { campo: 'docenteDiClasse', testo: 'Docente di classe', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Come in `corsi.elenco`: l'anno nominato deve essere quello aperto, e se
    // non lo è si dice, invece di tornare zero classi come se l'anno fosse
    // vuoto. Un elenco vuoto non è un registro vuoto.
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
        // Le archiviate restano fuori se non le si chiede: sono classi finite,
        // e in mezzo alle altre fanno contare due volte la stessa sigla quando
        // una classe cambia anno.
        .filter((classe) => ingresso.archiviate === true || !classe.archiviata)
        // Sul nome, sulla sede e sulle materie che ci si insegnano: «chi fa
        // disegno» è una domanda sulle classi, e la materia è l'unica parola
        // con cui chi la fa sa nominarle.
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
            // Chi si è ritirato resta nel registro — la sua storia non sparisce
            // — e contarlo insieme agli altri direbbe una classe più grande di
            // quella che entra in aula.
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
