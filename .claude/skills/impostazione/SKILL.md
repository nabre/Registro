---
name: impostazione
description: >
  Come si aggiunge, si cambia e si toglie un'impostazione di
  Regiklass, toccando ogni punto che la riguarda: la dichiarazione in
  `contract/manifest.ts` (tipo, predefinito, `scelte`, `formato`,
  `minimo`/`massimo`/`passo`, `controllo`, `unita`, `dipendeDa`, `richiede`,
  `avanzata`, `alProssimoAvvio`) con i testi in `manifest.testi.ts`, la dogana
  di `valoreConMotivo`, le chiavi dismesse e migrate, l'area e la sezione in
  cui compare (`core/controlli/areas.ts`), le due superfici che la mostrano con
  gli stessi controlli — la pagina del pannello e la finestra nativa — e le
  prove che impediscono a una chiave di sparire in silenzio. Da usare ogni volta che si
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
| Dichiarata in | `contract/manifest.ts` → `IMPOSTAZIONI` | il modello dati, `registro.json` |
| Esempi | tema, icona accanto all'orologio, posta, OCR | scala dei voti, griglia oraria, materie |

La domanda che decide: **se il docente aprisse questo file su un altro
computer, si aspetterebbe di ritrovare questo valore?** Sì → documento. No →
programma. Il tema no; la scala dei voti sì, anche fra due anni.

Questa skill parla della prima famiglia. Le impostazioni del documento sono
campi del modello dati come gli altri: si aggiungono in `core/dominio/models.ts`
e si normalizzano in `core/dominio/validation.ts`.

## Il manifesto è l'unico elenco

`contract/manifest.ts` è la sola verità: chiave, tipo, predefinito, disegno,
dogana. Etichetta, descrizione, unità e aiuto di ogni scelta stanno in
`contract/manifest.testi.ts`, nelle quattro lingue (skill `testi`). Da lì nascono i valori predefiniti, la pagina del pannello e la finestra
nativa. **Non si scrive mai una chiave a mano in `impostazioni.json`**, e non si
ricopia mai un predefinito altrove: due elenchi da tenere allineati divergono in
pochi mesi, e la divergenza si scopre dal comportamento.

```ts
'registroDocenti.promemoria.avviso': {
  tipo: 'string',
  predefinito: '5',
  scelte: ['nessuno', '0', '2', '5', '10', '15'],
  controllo: 'tendina',
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
| `etichetta`, `descrizione` | sempre, in `manifest.testi.ts` | il nome della riga, e sotto una frase discorsiva: chi apre le impostazioni non sa già che cosa cerca |
| `scelte` | le risposte sono poche e note | dogana **e** elenco della tendina — o delle schede con la miniatura, se la chiave ha una raffigurazione in `core/controlli/figure.ts` (oggi tema e lingua). L'`aiuto` di ogni scelta è anche la sua etichetta: va scritto con il nome della scelta davanti |
| `formato: 'email'` | il valore è un indirizzo | dogana vera, non un `type="email"`: vale anche da riga di comando |
| `minimo` / `massimo` | fuori da un intervallo il numero non vuol dire niente | dogana; diventano gli attributi `min`/`max` dei campi |
| `passo` | il numero non è intero, o salta | dogana anche lui; assente vale 1 |
| `unita` | un numero ha un'unità («min») | scritta accanto al campo, dal catalogo |
| `controllo` | il tipo non basta a dire il disegno | `segmenti` (poche scelte brevi), `tendina`, `cursore`; è un disegno, non una dogana (ADR-52) |
| `scelteDinamiche` | le scelte si sanno solo sul momento | oggi `indirizziPosta`, gli indirizzi dell'account collegato |
| `sceltaLibera` | si può scrivere anche fuori elenco | con `scelte`, le scelte con un nome passano così e il resto passa dal `formato` (`ocr.lettore`) |
| `richiede` | un interruttore senza un altro valore non ha senso | la dogana rifiuta l'accensione con `motivo`, `get` risponde spento (l'assistente senza modello) |
| `dipendeDa` | la voce conta solo se un'altra è accesa | la figlia si disabilita e **si mostra spenta** finché il padre è spento; il valore scritto resta e torna riaccendendo il padre |
| `avanzata` | voci di rara modifica | in fondo alla sezione, in «Avanzate (n)», chiuso; si apre solo a mano |
| `alProssimoAvvio` | il registro la legge solo partendo | pastiglia «al prossimo avvio» accanto al nome, in tutte e due le superfici |

**Non c'è un'uscita** dalla garanzia «ogni chiave compare da qualche parte»:
tutte le chiavi del manifesto arrivano a tutte e due le superfici. C'era un
campo `nascosta`, per lo stato che l'agenda sul desktop si scriveva addosso
(posizione, misura, linguetta); se n'è andato con lei. Uno stato che il
programma scrive da sé non è un'impostazione: va in `userData/interfaccia/`
(`desktop/apparato/uiState.ts`), non nel manifesto.

Togliere o accorpare: la chiave vecchia va in `CHIAVI_DISMESSE`, che
`ritiraChiaviDismesse` toglie dal file all'avvio. Se il suo valore deve
sopravvivere in una chiave nuova, una voce in `MIGRAZIONI` (`nuova`,
`vecchie`, `ricava`): chi legge il file la applica solo se la nuova non c'è
(esempi: `api.accesso` da tre interruttori, `promemoria.avviso` da interruttore
più minuti). `CHIAVI_DEL_COLLEGAMENTO` sono quelle che scrive «Collega la
casella»: si mostrano, non si scrivono a mano, e «Ripristina» non le tocca.

## La dogana

`valoreConMotivo` in `desktop/apparato/settings.ts` è il punto in cui si passa
o non si passa, per **tutti** i chiamanti: la pagina, la finestra nativa, il
condotto, la riga di comando. Guarda `scelte`, `tipo`, `formato`, `minimo` e
`massimo`. `valore` a `undefined` vuol dire «non scrivere».

Chi rifiuta deve **dirlo**: `valoreConMotivo()` torna anche la ragione
(`motivo`), e tutte e due le superfici la mostrano. Un valore rifiutato in silenzio lascia il campo
con il testo sbagliato e il file con il valore vecchio — è successo, ed è il
genere di guasto che il docente scopre mesi dopo dal rifiuto di un server di
posta.

I ripieghi a valle — i `Math.max` di `desktop/widget/reminders.ts`, di `core/dati/llm.ts` — restano
dove sono: sono **la rete, non la dogana**. La dogana impedisce di scrivere il
valore; la rete impedisce che un file modificato a mano faccia danni.

## Dove compare

Quattro aree — Calendario, Didattica, Utente, Programma — ognuna una pagina che
scorre per sezioni. Calendario e Didattica sono tutte dell'anno (campi del
`.regi`); le chiavi del manifesto stanno in Utente › Posta e nelle cinque
sezioni del Programma. Elenco e nomi in `core/controlli/areas.ts` e
`areas.testi.ts`, uguali per le due superfici; le sezioni dell'anno e le parole
di ricerca le aggiunge il pannello (`ui/pannello/views/settings/sections.ts`,
`sections.testi.ts`, `SEZIONI_DELLE_AREE` in `ui/pannello/place.ts`).

`DIVISIONI` dà a ogni sezione con chiavi i suoi `prefissi`; `divisioneDi`
sceglie il prefisso **più lungo** (così `avvio.integrazioneSistema` va nelle
Avanzate senza portarsi dietro il gruppo `avvio`). Aspetto ha
`raccoglie: true`: una chiave che nessuno nomina finisce lì, e si vede comunque —
il guasto peggiore sarebbe una chiave che si cambia da riga di comando e non si
vede da nessuna parte. `avvertenza: true` (solo le Avanzate, il condotto): il
testo da leggere prima di concedere qualcosa ad altri programmi. `titoliGruppi`
dà il titolo ai gruppi di chiavi che si chiamano tutte «Attivo».

`CHIAVI_IN_SCHEDA` (in `sections.ts`) sono le chiavi che una scheda dedicata
disegna da sé — la casella in Posta, le righe d'uso in Assistente e modelli —
e che l'elenco generico salta; «Ripristina» (per area, `daRipristinare`) tocca
solo le voci degli elenchi. Non c'è più «Ritira» né un pannello «Dettagli».

Una chiave con prefisso nuovo: o le si dà una divisione, o va nel raccoglitore.
Va bene tutte e due, ma va **deciso**, non subìto. Spostare una sezione cambia
gli indirizzi (`area#sezione`): quelli di prima si riportano in
`SCHEDE_DI_PRIMA` di `place.ts`.

## Le due superfici

| | Pagina del pannello | Finestra nativa |
| --- | --- | --- |
| Dove | `ui/pannello/views/settings*` | `desktop/shell/pages/settings/settings.ts`, bundle esbuild; dogana in `desktop/shell/windows/menu.ts` |
| Quando serve | quasi sempre | la scialuppa: nessun documento aperto, il pannello non c'è (menu Registro › «Impostazioni senza documento aperto…») |
| Che cosa mostra | tutte e quattro le aree | Utente › Posta e Programma; Calendario e Didattica dicono che stanno nel file |

I controlli sono **gli stessi** (ADR-52): `core/controlli/control.ts` sceglie il
disegno dalla `VoceProgramma`, `field.ts` fa lo stesso per i campi dell'anno.
`core/controlli/` importa solo `core/i18n`, le parole comuni e i tipi di
`contract/` (`npm run layers`).

Quel che le due devono sapere si calcola in `vociImpostazioni()`
(`desktop/apparato/settings.ts`) e viaggia come campo di `VoceProgramma`
(`contract/protocol.ts`): `sospesa` (la regola di `dipendeDa`),
`delCollegamento`, `alProssimoAvvio`, il disegno. Un punto solo, un conto solo.

## Le prove

Ognuna sorveglia una cosa diversa:

- `tests/environment/settings.test.mjs` — la **dogana** (indirizzo, estremi,
  passo, chiave inventata, `richiede`), le voci che arrivano alle superfici, e
  le chiavi vecchie che diventano la scelta nuova (`MIGRAZIONI`).
- `tests/ui/settingsSections.test.mjs` — che **ogni chiave compaia in
  una sezione e in una sola**, le aree, la ricerca, il punto sulla scheda.
- `tests/ui/controlli.test.mjs` — che ogni voce del manifesto prenda il suo
  disegno, e le aree della finestra nativa.
- `tests/environment/menu.test.mjs` — che la finestra nativa riceva ogni voce.
- `tests/ui/posto.test.mjs` — gli indirizzi di prima (`SCHEDE_DI_PRIMA`).
- `tests/interfaccia/settingsKeyboard.spec.ts`, `impostazioniAnno.spec.ts` — la
  pagina vera, da tastiera e senza anno.

Sono le tre cose di questa zona che possono rompersi in silenzio. Una chiave
nuova senza prova non è un rischio teorico: è la prova che fallisce, ed è così
che si scopre di aver dimenticato la sezione.

## Il giro completo, per una chiave nuova

1. Dichiararla in `contract/manifest.ts`, con le dogane e il disegno che le
   servono, e i testi in `manifest.testi.ts` nelle quattro lingue.
2. Deciderne la sezione: un prefisso in `DIVISIONI` (`core/controlli/areas.ts`) —
   o lasciarla al raccoglitore, sapendo di averlo deciso. Un gruppo nuovo vuole
   il suo titolo in `titoliGruppi`.
3. Leggerla dove serve:
   `apparato.impostazioni.leggi('registroDocenti.x').get('y', ripiego)`.
4. Se cambiarla deve avere effetto **subito**, iscriversi a
   `onDidChangeConfiguration` e guardare `affectsConfiguration`. Se invece ha
   effetto al riavvio, `alProssimoAvvio: true` — `vassoio.attivo` lo fa.
5. `npm test`, e il rituale della skill `verifica`.
6. Una voce visibile vuole la sua riga nella guida
   (`ui/pannello/views/help/settings.testi.ts`), con il percorso scritto
   «Impostazioni › Area › Sezione» come i titoli dei cataloghi.
7. Nessun documento elenca le chiavi: `docs/CATALOGO.md` § 5 dice le regole,
   non l'elenco. Un elenco scritto a mano, in passato, ne aveva due che non
   esistevano più e undici mai entrate.
