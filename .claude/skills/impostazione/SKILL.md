---
name: impostazione
description: >
  Come si aggiunge, si cambia e si toglie un'impostazione di
  Regiclass, toccando ogni punto che la riguarda: la dichiarazione in
  `src/manifest.ts` (tipo, predefinito, descrizione, `scelte`, `formato`,
  `minimo`/`massimo`, `dipendeDa`, `avanzata`), la dogana di
  `valoreConMotivo`, la sezione in cui compare, le due superfici che la
  mostrano — la pagina del pannello e la finestra nativa — e le prove che
  impediscono a una chiave di sparire in silenzio. Da usare ogni volta che si
  parla di impostazioni, preferenze, opzioni, `impostazioni.json`,
  `registroDocenti.*`, di «rendere configurabile» qualcosa, di una casella da
  aggiungere alle impostazioni, o si tocca la divisione fra impostazioni del
  programma e impostazioni del documento.
---

# Un'impostazione del registro

Due famiglie, e confonderle è l'unico errore che qui si paga caro (ADR-21 in
`docs/DECISIONI.md`):

| | **Programma** | **Documento** |
| --- | --- | --- |
| Dove finisce | `impostazioni.json` in `userData` | dentro il `.regi` dell'anno |
| Per chi vale | questa macchina, tutti i documenti | quel documento, ovunque lo si apra |
| Dichiarata in | `src/manifest.ts` → `IMPOSTAZIONI` | il modello dati, `registro.json` |
| Esempi | tema, icona accanto all'orologio, posta, OCR | scala dei voti, griglia oraria, materie |

La domanda che decide: **se il docente aprisse questo file su un altro
computer, si aspetterebbe di ritrovare questo valore?** Sì → documento. No →
programma. Il tema no; la scala dei voti sì, anche fra due anni.

Questa skill parla della prima famiglia. Le impostazioni del documento sono
campi del modello dati come gli altri: si aggiungono in `src/domain/models.ts`
e si normalizzano in `src/domain/validation.ts`.

## Il manifesto è l'unico elenco

`src/manifest.ts` è la sola verità: chiave, tipo, predefinito, descrizione,
dogana. Da lì nascono i valori predefiniti, la pagina del pannello e la finestra
nativa. **Non si scrive mai una chiave a mano in `impostazioni.json`**, e non si
ricopia mai un predefinito altrove: due elenchi da tenere allineati divergono in
pochi mesi, e la divergenza si scopre dal comportamento.

```ts
'registroDocenti.promemoria.anticipoMinuti': {
  tipo: 'number',
  predefinito: 5,
  minimo: 0,
  massimo: 120,
  descrizione:
    'Quanti minuti prima dell’inizio arriva l’avviso. Cinque è il tempo di prendere il ' +
    'computer e salire una rampa di scale; zero lo fa arrivare all’ora esatta.',
},
```

Le chiavi restano **piatte e puntate** — `registroDocenti.posta.mittente` — ed è
la forma in cui il registro le chiede:
`apparato.impostazioni.leggi('registroDocenti.posta')` più `get('mittente')`.

### I campi, e quando servono

| Campo | Serve quando | Che cosa fa davvero |
| --- | --- | --- |
| `tipo` | sempre | `'string'`, `'number'`, `'boolean'` |
| `predefinito` | sempre | il valore quando nessuno ha scelto |
| `descrizione` | sempre | discorsiva, non un'etichetta di tre parole: chi apre le impostazioni non sa già che cosa cerca |
| `scelte` | le risposte sono poche e note | dogana **e** elenco della tendina — o delle schede con la miniatura, se la chiave ha una raffigurazione in `src/ui/views/settings/figures.ts` (oggi il tema). L'`aiuto` di ogni scelta è anche la sua etichetta: va scritto con il nome della scelta davanti |
| `formato: 'email'` | il valore è un indirizzo | dogana vera, non un `type="email"`: vale anche da riga di comando |
| `minimo` / `massimo` | fuori da un intervallo il numero non vuol dire niente | dogana; diventano gli attributi `min`/`max` dei campi |
| `dipendeDa` | la voce conta solo se un'altra è accesa | la figlia si disabilita e **si mostra spenta** finché il padre è spento; il valore scritto resta e torna riaccendendo il padre |
| `avanzata` | percorsi di eseguibili, attese massime | in fondo alla sezione, in un gruppo che si apre da sé se qualcosa lì dentro è stato deciso a mano |

**Non c'è un'uscita** dalla garanzia «ogni chiave compare da qualche parte»:
tutte le chiavi del manifesto arrivano a tutte e due le superfici. C'era un
campo `nascosta`, per lo stato che l'agenda sul desktop si scriveva addosso
(posizione, misura, linguetta); se n'è andato con lei. Uno stato che il
programma scrive da sé non è un'impostazione: va in `userData/interfaccia/`
(`environment/uiState.ts`), non nel manifesto. Una chiave tolta va in
`CHIAVI_DISMESSE`, che la ripulisce dai file vecchi.

## La dogana

`valoreConMotivo` in `src/environment/settings.ts` è il punto in cui si passa
o non si passa, per **tutti** i chiamanti: la pagina, la finestra nativa, il
condotto, la riga di comando. Guarda `scelte`, `tipo`, `formato`, `minimo` e
`massimo`. `valore` a `undefined` vuol dire «non scrivere».

Chi rifiuta deve **dirlo**: `valoreConMotivo()` torna anche la ragione
(`motivo`), e tutte e due le superfici la mostrano. Un valore rifiutato in silenzio lascia il campo
con il testo sbagliato e il file con il valore vecchio — è successo, ed è il
genere di guasto che il docente scopre mesi dopo dal rifiuto di un server di
posta.

I ripieghi a valle — i `Math.max` di `promemoria.ts`, di `data/llm.ts` — restano
dove sono: sono **la rete, non la dogana**. La dogana impedisce di scrivere il
valore; la rete impedisce che un file modificato a mano faccia danni.

## Dove compare

`src/ui/views/settings/sections.ts` divide le chiavi in sezioni **per
prefisso**. Cinque sezioni, e la prima — «Generale» — `raccoglie: true`: quel
che nessuna ha nominato finisce lì. È la regola che rende impossibile il guasto peggiore — una
chiave aggiunta al manifesto e finita in nessuna sezione esisterebbe, si
potrebbe cambiare da riga di comando, e non si vedrebbe da nessuna parte.

Una sezione può portare anche:
- `pagina` — il rimando alla pagina dove quel che regola si fa davvero (le tre
  sezioni che nominano un `.gguf` rimandano a «Modelli linguistici»: qui si dice
  *quale* modello lavora, il file si scarica di là);
- `avvertenza` — quel che va letto **prima** di spuntare, quando spuntare
  concede qualcosa a qualcun altro. Una sola sezione ce l'ha, ed è il condotto.

Aggiungendo una chiave con un prefisso nuovo: o le si dà una sezione, o finisce
nel raccoglitore. Va bene tutte e due, ma va **deciso**, non subìto.

## Le due superfici

| | Pagina del pannello | Finestra nativa |
| --- | --- | --- |
| Dove | `src/ui/views/settings*` | `shell/pages/settings/settings.html` + `shell/windows/menu.ts` |
| Quando serve | quasi sempre | quando **non c'è nessun documento aperto**, e il pannello non esiste |
| Che cosa può importare | tutto | **niente**: è HTML con script inline |

Ne consegue la regola che governa ogni aggiunta: **quel che le due devono sapere
si calcola in `vociImpostazioni()`** (in `src/environment/settings.ts`) e viaggia
come campo di `VoceProgramma`, dentro `src/protocol.ts`. È l'unico punto da cui
tutte e due prendono l'elenco, quindi è l'unico in cui il conto non può
divergere. `sospesa` — la regola di `dipendeDa` — sta lì per questo: prima la
sapeva solo il pannello, e la finestra nativa mostrava spuntata una concessione
che il condotto non concedeva.

## Le prove

Tre file, e ognuno sorveglia una cosa diversa:

- `tests/environment/settings.test.mjs` — la **dogana**: un indirizzo che non è
  un indirizzo non entra, un numero fuori dagli estremi non entra, una chiave
  inventata non entra, e ogni chiave del manifesto arriva alle superfici.
- `tests/ui/settingsSections.test.mjs` — che **ogni chiave compaia in
  una sezione e in una sola**, senza eccezioni.
- `tests/environment/menu.test.mjs` — che la finestra nativa riceva ogni voce.

Sono le tre cose di questa zona che possono rompersi in silenzio. Una chiave
nuova senza prova non è un rischio teorico: è la prova che fallisce, ed è così
che si scopre di aver dimenticato la sezione.

## Il giro completo, per una chiave nuova

1. Dichiararla in `src/manifest.ts`, con la descrizione discorsiva e le dogane
   che le servono.
2. Deciderne la sezione in `views/settings/sections.ts` — o lasciarla al
   raccoglitore, sapendo di averlo deciso.
3. Leggerla dove serve:
   `apparato.impostazioni.leggi('registroDocenti.x').get('y', ripiego)`.
4. Se cambiarla deve avere effetto **subito**, iscriversi a
   `onDidChangeConfiguration` e guardare `affectsConfiguration`. Se invece ha
   effetto al riavvio, **dirlo nella descrizione** — `vassoio.attivo` lo fa.
5. `npm test`, e il rituale della skill `verifica`.
6. `docs/CATALOGO.md` porta l'elenco completo delle chiavi. Non si rigenera da
   sé — si aggiorna a mano, con i conteggi **contati a macchina sul sorgente**,
   mai ricordati. La `docs/GUIDA.md` invece non le elenca apposta: c'era una tabella
   scritta a mano, ed elencava diciotto chiavi di cui due non esistevano più e
   undici non c'erano mai entrate.
