# Il registro raccontato a un modello

Due cose distinte, che si assomigliano:

- **`resources/tools.json`** — il catalogo generato: tutte le procedure con il
  loro schema in JSON Schema, più le istruzioni per il modello. Sta nel
  versionamento.
- **`regi catalogo`** — lo stesso catalogo, ma vivo: lo stampa la riga di
  comando chiedendolo al registro che sta rispondendo.

E una terza, che non va confusa: **l'assistente della finestra**
(`src/api/transports/assistant.ts`), il riquadro Assistente del pannello. È
l'unico posto in cui si fanno domande a un modello.

## Indice

- [Il catalogo](#il-catalogo)
- [Perché sta nel versionamento](#perché-sta-nel-versionamento)
- [Il comando `catalogo`](#il-comando-catalogo)
- [Solo le letture](#solo-le-letture)
- [Quando si tocca che cosa](#quando-si-tocca-che-cosa)

## Il catalogo

`src/api/tools.ts` lo costruisce dalle procedure registrate. Non c'è nessun
elenco scritto a mano: il `titolo` della procedura diventa la descrizione
dell'attrezzo, lo `Schema` dell'ingresso diventa `parameters` via `schemaJson()`.
Un attrezzo scritto a mano sarebbe una seconda verità, e la seconda verità è
quella che resta indietro.

```json
{
  "api": 1,
  "comando": "registro",
  "istruzioni": "Rispondi a domande su Regiclass, un registro di classe italiano, con gli…",
  "attrezzi": [
    {
      "nome": "corso.presenze",
      "funzione": "corso_presenze",
      "genere": "lettura",
      "titolo": "Presenze, assenze e medie di un corso in un periodo",
      "idempotente": true,
      "riga": "registro chiama corso.presenze --corsoId <testo>",
      "parametri": { "type": "object", "properties": { … } }
    }
  ]
}
```

`nome` ha i punti, `funzione` no: una parte dei modelli tratta il punto come
accesso a un campo e risponde `corso` con dentro `presenze`. La traduzione sta in
`nomeFunzione` / `daNomeFunzione`, in un posto solo, e la usano sia il catalogo
sia l'assistente della finestra.

Il catalogo è **deterministico**: nessuna data, nessun contatore, nessun ordine
che dipenda dall'inserimento. Un catalogo che cambia da sé non si può
confrontare, e una prova che non si può fare non protegge niente.

## Perché sta nel versionamento

Perché è il posto in cui una modifica al contratto diventa **una differenza
leggibile**. Una procedura aggiunta, tolta o con un campo in meno compare lì
come righe rosse e verdi, e chi rilegge la modifica vede che cos'è successo
all'API senza doverlo dedurre dai file delle procedure.

È lo stesso motivo di `tests/api/coverage.test.mjs`, con un altro mezzo.

Che non resti indietro lo tiene fermo `tests/api/tools.test.mjs`, che lo
ricostruisce e lo confronta **byte per byte**. Se fallisce non c'è niente da
aggiustare nel JSON: si dà `npm run tools` e si legge la differenza.

Un byte in particolare: il file è dichiarato `eol=lf` in `.gitattributes`.
Senza, su Windows git lo riscriverebbe in CRLF al checkout e la prova
fallirebbe su un clone appena fatto. Se ti capita dopo un `git stash pop` o un
cambio di ramo, `npm run tools` rimette a posto.

## Il comando `catalogo`

```sh
regi catalogo > attrezzi.json      # il catalogo vivo, per un altro programma
```

La riga di comando non fa più domande a un modello: `catalogo` stampa gli
attrezzi; le domande si fanno dal riquadro Assistente. C'era un comando
`regi chiedi`, con l'opzione `--passi`, ed è stato tolto: la conversazione
passa da scritture, e dentro la fila del condotto sarebbe durata minuti.

`catalogo` chiede `$attrezzi` al condotto: è il catalogo **vivo**, non quello su
disco. Il catalogo su disco serve quando il registro è chiuso — per darlo a un
altro programma, o per leggerlo —; quello vivo è l'unico che non possa essere
rimasto indietro di una modifica.

## Solo le letture

Al modello si danno gli attrezzi con `genere: 'lettura'`, e **prima di chiamarne
uno si ricontrolla il genere**. La whitelist vera non è l'elenco che si è
mandato: è il controllo che si fa al ritorno. Un modello che si inventa
`ore.appello.riga` — cosa che i modelli fanno — riceve un errore e non una
scrittura.

Non c'è nessuna impostazione per allargare questo confine, e non è una
dimenticanza: **una scrittura decisa da un modello è una scrittura che nessuno ha
chiesto**, e nel registro di una classe non si disfa. Quel che si ottiene al
posto suo è il comando da battere, che una persona legge e decide.

Il genere è dichiarato dalla procedura, non da un secondo elenco. Un elenco a
parte resterebbe indietro alla prima procedura nuova, e resterebbe indietro
*nella direzione pericolosa*.

Vale la pena sapere anche dove finiscono i dati: le domande e i risultati vanno
in `fetch` verso il servizio configurato, e i risultati contengono nomi, medie e
assenze di persone minorenni. Il predefinito è la macchina locale; chi sposta
l'indirizzo sta decidendo di mandarli altrove.

## Quando si tocca che cosa

| Hai fatto | Tocca |
| --- | --- |
| aggiunto, cambiato o tolto una procedura | `npm run tools`, e basta |
| cambiato la forma del catalogo (un campo nuovo in `AttrezzoCatalogo`) | `src/api/tools.ts`, poi `npm run tools`, poi `tests/api/tools.test.mjs` |
| cambiato le istruzioni per il modello | `istruzioni()` in `src/api/tools.ts` — e ricorda che una prova controlla che ci sia ancora scritto che non può scrivere |
| aggiunto un comando alla riga di comando | `src/cli/registro.mjs`: l'elenco in `AIUTO`, il controllo dei nomi e lo smistamento |
| cambiato come il condotto risponde | `src/api/transports/conduit.ts`, `eseguiMetodo` |

**`src/cli/registro.mjs` non si tocca per esporre una procedura.** Non ha una
copia dell'elenco: chiede tutto al condotto. Si tocca solo per aggiungere un
comando nuovo.
