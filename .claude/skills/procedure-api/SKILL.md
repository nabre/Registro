---
name: procedure-api
description: >
  Come si crea, si cambia e si cancella una procedura dell'API del Registro
  docenti (`src/api/procedures/`), toccando ogni punto che la riguarda: lo
  schema d'ingresso, l'indice della cartella, il ponte con le azioni del
  protocollo, le prove, il catalogo `resources/tools.json` che il modello
  legge, la riga di comando e i conti nelle docs. Da usare ogni volta che si
  parla di procedure, API, `definisci`, `chiama()`, schemi d'ingresso, condotto
  JSON-RPC, attrezzi per l'assistente, `registro catalogo`, o si aggiunge,
  rinomina, sposta o toglie una funzione dell'API — anche quando la richiesta
  non nomina la parola «procedura», per esempio «esporre una nuova lettura»,
  «far chiamare questa cosa da riga di comando», «l'assistente deve poter
  sapere X», «togliere quell'azione».
---

# Le procedure dell'API

Una procedura è il contratto davanti al lavoro. Il lavoro sta in `src/actions/` e
ci resta: una procedura ci mette davanti **la forma dell'ingresso controllata
quando il programma gira**, **un codice d'errore** accanto alle frasi italiane, e
**una versione dichiarata**. Serve perché le sponde che chiamano il registro sono
più di due — il pannello, il widget dell'agenda, il menu nativo, la riga di
comando, il modello locale — e un tipo TypeScript sparisce quando il programma
gira.

Prima di toccare qualcosa, leggi la procedura più vicina a quella che ti serve:
ce n'è un centinaio e mezzo, e una che somiglia alla tua esiste quasi sempre.
`docs/API.md` è il documento di riferimento; questo file è il modo di lavorarci
dentro.

## Il percorso è l'indirizzo

`ore.appello.casella` sta in `src/api/procedures/ore/appello/casella.ts`, e in
nessun altro posto. Un file per procedura, `export const procedura`, e il nome
del file è l'ultimo segmento del nome.

```
src/api/procedures/
├── comuni/              le guardie che più aree si dividono, per file d'origine
│   └── registro.ts      esigiAnno, esigiMateria, esigiCorso, esigiClasse
├── ore/
│   ├── comuni.ts        quel che le procedure di `ore` si dividono
│   ├── indice.ts        procedureOre: i file suoi e gli indici sotto
│   ├── salva.ts         ore.salva
│   └── appello/
│       ├── indice.ts    procedureOreAppello
│       └── casella.ts   ore.appello.casella
└── …
```

Regole, con il perché:

- **Un file, una procedura.** Due in un file e l'indice ne vedrebbe una sola:
  l'altra sparirebbe senza che niente lo dica.
- **`export const procedura`, sempre quel nome.** Uniforme perché gli indici e
  gli script lo possano scrivere senza sapere che cosa c'è dentro.
- **Gli indici si tengono a mano.** Un glob registrerebbe anche i file a metà, e
  toglierebbe il punto in cui ci si accorge che manca qualcosa.
- **`comuni.ts` per quel che si divide.** Una guardia usata da una procedura sola
  sta nel file di quella procedura: tenerla altrove obbliga ad aprire due file
  per leggerne una.

Che l'albero stia in piedi lo dice `npm run procedures`, che legge il testo e non
compila — serve soprattutto quando `tsc` non passa.

## I punti d'aggancio

Una procedura tocca più file di quanti se ne vedano. Questa è la mappa; il
dettaglio di ciascuno sta in [references/albero.md](references/albero.md).

| Dove | Che cosa | Quando si tocca |
| --- | --- | --- |
| `src/api/procedures/<segmenti>.ts` | la procedura | sempre |
| `…/<cartella>/indice.ts` | la registra | sempre |
| `src/api/index.ts` | le aree | area nuova o sparita |
| `src/protocol.ts` | l'unione `Azione` | se prende in carico un'azione |
| `src/actions/<area>.ts` | il gestore | idem |
| `resources/tools.json` | il catalogo per il modello | sempre — `npm run tools` |
| `tests/api/reads.test.mjs` · `writes.test.mjs` | la prova | sempre |
| `tests/api/coverage.test.mjs` · `bridge.test.mjs` | i conti delle azioni | azione nuova o tolta |
| `docs/API.md` · `docs/INDICE.md` | i conti e le tabelle | sempre |

La riga di comando **non si tocca mai**: non ha una copia dell'elenco, chiede
tutto al condotto (`$elenco`, `$schema`, `$attrezzi`). Una procedura aggiunta
stamattina si chiama da lì stasera senza che quel file cambi di una riga. Se ti
viene da modificarla per esporre una procedura, ti stai sbagliando.

## Crearne una

1. **Scegli il nome**: `area.cosa.verbo`, in italiano, minuscolo. È l'indirizzo,
   il percorso del file e il nome dell'attrezzo che il modello vedrà — cambiarlo
   dopo costa tre posti, sceglierlo bene costa un minuto.
2. **Apri lo scheletro:**
   ```sh
   node .claude/skills/procedure-api/scripts/nuova.mjs area.cosa.verbo \
     --genere scrittura --titolo "Che cosa fa, in una riga" \
     --azione protocollo.tipo --collezioni lezioni
   ```
   Fa le cartelle, il file e tutti gli indici fino a `src/api/index.ts`. Lascia
   dei `DA SCRIVERE` che non compilano, apposta.
3. **Scrivi lo schema dell'ingresso.** Un `aiuto:` su ogni campo: è l'unica
   frase che riceverà chi chiama da fuori, e finisce nel JSON Schema e nel
   catalogo del modello. I costruttori stanno in
   [references/schemi.md](references/schemi.md).
4. **Scrivi le guardie.** Distingui «non c'è più» — `errore.nonTrovato(TERMINE)`,
   che accorda la frase al genere della parola — da «non si può» —
   `errore.rifiuta('…')`. È la differenza fra una chiamata che si ritenta dopo
   aver riletto e una che non si ritenta mai.
5. **Passa la palla.** Se un gestore esiste, `daGestore(gestori['tipo'], …)`: il
   lavoro sta in un posto solo, come prima. Non riscriverlo qui.
6. **Scrivi la prova.** Una scrittura in `tests/api/writes.test.mjs`, una
   lettura in `reads.test.mjs`. Che cosa deve provare sta in
   [references/prove.md](references/prove.md).
7. **`npm run tools`**, e guarda la differenza in `resources/tools.json`: è
   la procedura come la vedrà il modello, ed è il posto in cui si legge se il
   titolo si capisce e se un campo manca.
8. **I cancelli**, qui sotto.

Se prende in carico un'azione che **non esiste ancora**, prima va dichiarata in
`src/protocol.ts`, poi il gestore in `src/actions/<area>.ts`, e **poi** i due
conti che leggono quel sorgente: `tests/api/coverage.test.mjs` («azioni
trovate») e `tests/api/bridge.test.mjs` («tutte e N le scritture»). Quei due
numeri sono scritti a mano apposta: se cambiano, è cambiato il protocollo, e va
visto.

## Cambiarne una

Il pericolo qui non è rompere: è **non rompere niente di visibile**.

- **Aggiungere un campo allo schema** è sicuro. Toglierlo o rinominarlo no:
  `oggetto()` scarta le chiavi che non dichiara — è la tolleranza che permette a
  un pannello più nuovo di parlare con un host più vecchio — quindi un campo che
  lo schema non nomina **non arriva al gestore**, e la scrittura risponde «fatto»
  lo stesso. Una nota che non si salva. Una scadenza che sparisce. Per le
  procedure che prendono in carico un'azione questo lo prende
  `tests/api/coverage.test.mjs`, che confronta campo per campo con l'unione
  `Azione`. Per le altre non lo prende nessuno: guarda il gestore.
- **`versione`** sale solo quando la forma di *questa* procedura cambia in modo
  non compatibile. Aggiungere un campo opzionale non è quello.
- **`VERSIONE_API`** sale solo quando cambia la *busta* — i campi di `Esito`, di
  `Fallimento`, il modo di chiamare — mai quando si aggiunge una procedura:
  alzarla ogni volta insegnerebbe a non guardarla.
- **`genere`** non si cambia a cuor leggero: è il campo su cui il condotto decide
  se concedere la chiamata e su cui l'assistente decide se un modello la può
  usare. Da `scrittura` a `lettura` vuol dire aprirla al modello locale.
- **`idempotente`** va riletto ogni volta che cambia `esegui`: è l'unica cosa che
  dica a chi chiama da fuori se può ritentare dopo un errore di trasporto.
- **Rinominare** vuol dire spostare il file (il percorso è l'indirizzo),
  aggiustare l'indice, e sapere che il nome è pubblico: sta nel catalogo, nel
  giornale e nei comandi che qualcuno ha già scritto negli script. Se non è
  sbagliato, lascialo.

Dopo ogni modifica: `npm run tools`, e **leggi la differenza**. È il modo più
veloce di vedere un campo che è sparito.

## Cancellarne una

```sh
node .claude/skills/procedure-api/scripts/togli.mjs area.cosa.verbo --prova
node .claude/skills/procedure-api/scripts/togli.mjs area.cosa.verbo
```

Toglie il file, la riga nell'indice, le cartelle rimaste vuote con i loro indici,
l'area da `src/api/index.ts`, e poi **elenca dove il nome compare ancora** —
prove, docs, README. Quelle non le tocca: una prova che cita una procedura tolta
di solito prova anche altro, e cancellarla sarebbe buttare via una rete insieme
al ferro vecchio.

Se prendeva in carico un'azione e nessun altro la usa, vanno tolti anche
l'azione da `src/protocol.ts` e il suo gestore, e aggiornati i due conti.

## I cancelli

Nell'ordine, perché ognuno dice una cosa che il successivo dà per buona:

```sh
npm run procedures          # l'albero: ogni file al suo posto, nel suo indice, registrato
npm run tools           # il catalogo, che altrimenti racconta un registro di ieri
npm run typecheck     # tsc
npm run lint    # eslint
npm test                   # tutte le prove, comprese quelle dell'API
```

`npm run procedures` sta per primo apposta: legge il testo e non compila, quindi
risponde anche quando `tsc` non passa — ed è proprio allora che serve sapere se
il file è al posto giusto.

Se `tests/api/tools.test.mjs` fallisce non c'è niente da aggiustare nel JSON:
si dà `npm run tools` e si legge la differenza, che è esattamente quel che si
voleva vedere.

## Le trappole

Tre modi di sbagliare che non lasciano traccia da nessuna parte:

1. **La procedura che non arriva all'indice.** Il file è lì, scritto giusto, e il
   nucleo non la conosce. Lo prende `npm run procedures`.
2. **Il campo che lo schema non dichiara.** Non arriva al gestore, e la risposta
   è «fatto». Lo prende `coverage.test.mjs`, ma solo per chi ha un'azione.
3. **Il catalogo rimasto indietro.** Il modello compone chiamate che il nucleo
   rifiuta, o parla di attrezzi che non esistono più. Lo prende
   `tests/api/tools.test.mjs`.

E una regola che vale sempre: **il lavoro non si sposta**. Se ti ritrovi a
riscrivere in una procedura quel che un gestore di `src/actions/` fa già, fermati:
o si chiama il gestore, o si estrae una funzione e la chiamano tutti e due —
estratta, non duplicata.

## Dove andare a leggere

- [references/albero.md](references/albero.md) — ogni file che partecipa, che cosa
  dichiara, quando si tocca. Da aprire quando non sai dove mettere le mani.
- [references/schemi.md](references/schemi.md) — i costruttori di schema, quando
  usarli, e le due coppie che si confondono (`opzionale` vs `nullabile`,
  `scelta` vs `esaustivo`).
- [references/prove.md](references/prove.md) — che cosa deve provare la prova di
  una procedura, e i sei file di `tests/api/`.
- [references/llm.md](references/llm.md) — `resources/tools.json`, il comando
  `registro catalogo`, e perché al modello si danno solo le letture.
