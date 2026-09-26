# Gli schemi: dire che forma ha un ingresso

Uno schema fa tre cose con una dichiarazione sola: convalida quando il programma
gira, dà il tipo TypeScript per inferenza, e si sa descrivere in JSON Schema —
che è quel che finisce in `resources/tools.json` e in `regi schema`.

Il contratto esposto è quello «Standard Schema» (`~standard`), lo stesso di zod e
valibot: il nucleo non conosce `schemas.ts`, conosce quell'interfaccia. Se un
giorno servisse di più, si sostituisce la libreria senza toccare una riga di
nucleo o di procedura.

## Indice

- [I costruttori](#i-costruttori)
- [Le due coppie che si confondono](#le-due-coppie-che-si-confondono)
- [Le entità del dominio](#le-entità-del-dominio)
- [L'aiuto non è un commento](#laiuto-non-è-un-commento)
- [Quel che `oggetto()` fa e non si vede](#quel-che-oggetto-fa-e-non-si-vede)

## I costruttori

| Costruttore | Per | Opzioni oltre ad `aiuto` |
| --- | --- | --- |
| `testo()` | testo libero | `minimo`, `massimo`, `modello` (RegExp), `esempio` |
| `numero()` | numeri | `minimo`, `massimo`, `intero` |
| `booleano()` | sì/no | — |
| `scelta([...])` | un valore fra pochi noti | — |
| `esaustivo<T>()([...] as const)` | l'elenco **completo** di un'unione del dominio | — |
| `identificatore()` | un id di voce del registro | — |
| `iso()` | una data di calendario, `2026-09-21` | — |
| `ora()` | un'ora del giorno, `08:15` | — |
| `elenco(di)` | un array | `minimo`, `massimo` |
| `oggetto({...})` | un oggetto con campi dichiarati | — |
| `opzionale(di)` | la chiave può mancare | — |
| `nullabile(di)` | il valore può essere `null` | — |
| `entita({cosa, valida})` | un'entità intera del dominio | — |
| `vuoto()` | non chiede niente | — |
| `qualunque()` | quel che nessuno sa descrivere | — |

`SCRITTURA` (da `nucleo.js`) è l'uscita canonica di una scrittura: `revisione`,
e facoltativi `creato`, `messaggio`, `documento`, `invariato`. Le scritture
tornano quasi sempre quella — il dato nuovo arriva al pannello dallo stato
spinto, non dalla busta. Per questo `scrittura({…})` la mette da sé.

## Le due coppie che si confondono

### `opzionale` non è `nullabile`

Non è una finezza: `ore.appello.campi` e `valutazioni.recupero.imposta` si
comportano in due modi diversi a seconda che una chiave **manchi** o valga
**`null`**, e confonderle vuol dire cancellare un dato che nessuno aveva chiesto
di cancellare.

- `opzionale(testo())` — la chiave può non esserci. «Non lo sto cambiando.»
- `nullabile(testo())` — la chiave c'è e vale `null`. «Cancellalo.»
- `opzionale(nullabile(testo()))` — tutte e due, quando servono tutte e due.

Nel JSON Schema `nullabile` diventa `"type": ["string", "null"]` e non un
`anyOf`: chi si genera un client da lì deve poter mandare `null` senza che il
proprio validatore lo rifiuti.

### `scelta` non è `esaustivo`

`scelta(['a', 'b'])` accetta quei due valori e basta. Non sa nulla del dominio:
se il dominio ne aggiunge un terzo, `scelta` continua a compilare e a rifiutarlo
quando il programma gira — con «Serve uno fra: a, b» in faccia a chi l'ha appena
scelto in una tendina.

`esaustivo<StatoPresenza>()([...] as const)` non compila se manca un valore, e
`tsc` **nomina** quello che manca. Usalo ogni volta che l'elenco è un'unione del
dominio:

```ts
export const STATI_APPELLO = esaustivo<StatoPresenza>()([
  'non-impostato', 'presente', 'assente', 'ritardo', 'esonerato',
] as const)

// poi, nello schema:
stato: scelta(STATI_APPELLO, { aiuto: 'Come risulta quella persona' })
```

`as const satisfies readonly T[]` **non** fa la stessa cosa: verifica che ogni
elemento sia valido, non che ci siano tutti.

## Le entità del dominio

Quando il pannello manda un'entità intera — una `Lezione`, un `PianoLezione` —
non si riscrive il suo schema campo per campo: c'è già un validatore nel dominio.

```ts
lezione: entita<Lezione>({ cosa: 'Lezione', valida: validaLezione })
```

`entita` controlla che sia un oggetto con un `id` non vuoto, poi delega al
validatore del dominio. Senza `valida` resta il solo controllo di forma: è il
caso dei validatori che hanno bisogno di sapere che cosa c'è già nel registro —
`validaClasse(classe, altre)` — e che quindi restano dentro il gestore.

La forma dichiara il solo `id` ed è **aperta** (`additionalProperties` non
diventa `false`): senza, il JSON Schema pubblicato direbbe che una Lezione vera
non è una Lezione.

## L'aiuto non è un commento

```ts
lezioneId: identificatore({ aiuto: 'L’ora su cui si scrive' })
```

Quell'`aiuto` finisce in tre posti: nel JSON Schema che il condotto pubblica,
nella tabella di `regi schema <procedura>`, e nella descrizione dell'attrezzo
che il modello locale legge. Per chi chiama da fuori è **l'unica frase che
riceverà** su quel campo. Scriverlo bene costa una riga; non scriverlo lascia un
campo muto in tre interfacce.

Il `titolo` della procedura funziona allo stesso modo: diventa la descrizione
dell'attrezzo nel tool calling, ed è per questo che non c'è una seconda frase da
scrivere da nessun'altra parte.

## Quel che `oggetto()` fa e non si vede

**Scarta le chiavi che non dichiara.** È voluto — è la tolleranza che permette a
un pannello più nuovo di parlare con un host più vecchio — e ha una conseguenza
che vale la pena tenere in mente ogni volta che si tocca uno schema:

> un campo che lo schema non nomina **non arriva al gestore**, e la scrittura
> risponde «fatto» lo stesso.

Nessun tipo lo prende: `daGestore` riceve un oggetto costruito a mano, e un campo
mancante diventa `undefined`, che per un campo opzionale è un valore legittimo.
Per le procedure che prendono in carico un'azione lo prende
`tests/api/coverage.test.mjs`, che confronta i campi dichiarati con l'unione
`Azione` letta dal sorgente. Per le altre lo prende soltanto chi guarda.

**I problemi portano il percorso del campo.** `oggetto` e `elenco` accumulano i
problemi dei figli anteponendo la propria chiave o il proprio indice, e il nucleo
ci costruisce sopra il campo della busta d'errore. Senza, chi chiama riceve
«Serve un numero» e non sa di quale campo si parli.
