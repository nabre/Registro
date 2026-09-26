# Le parole comuni a tutti i rapporti, in italiano.
#
# Il terzo strato, accanto a _base (che cosa c'è in testata) e _stile (quanto è
# grande). Qui ci sono le parole dei modelli: i titoli delle sezioni, le
# etichette dei campi, le frasi che contengono un numero, e come si chiamano le
# colonne delle tabelle. I modelli non ne scrivono nessuna: le chiamano per
# nome, e così la stessa struttura stampa in tutte le lingue.
#
# Ogni lingua ha il suo file: questo è l'italiano, _testi-de il tedesco,
# _testi-fr il francese, _testi-en l'inglese. Il registro prende quello della
# lingua in cui parla al momento di stampare, e solo quello: una frase che manca
# in una lingua non si ripiega sull'italiano, esce vuota. Per questo i quattro
# file hanno le stesse frasi, con gli stessi segnaposto dentro — lo controlla
# «npm test» — e una frase nuova si scrive in tutti e quattro.
#
# Non si estende e non si dichiara: vale per tutti i rapporti, sempre.
# Una riga che non si capisce viene saltata, e vale quel che il registro dice
# di suo.

[frasi]

# Si richiamano da un modello con «{{frase.nome}}», e dentro possono avere i
# segnaposto del rapporto. Un segnaposto vuoto sparisce, e la riga con lui:
# per questo l'appello incompleto si scrive dentro un «se:», così la frase non
# compare quando non c'è niente da dire.
#
# Le etichette dei campi non possono contenere «=», «;» né «|»: sono i segni
# con cui una riga «campi:» si divide, e una parola che ne contiene uno la
# spezzerebbe in due.

# La sede e chi firma non stanno qui: sono di chi usa il registro, e vivono
# nell'intestazione del documento. I modelli li chiamano «{{sede}}» e
# «{{docente}}».

# --- La testata e il piede, in _base

registro-scolastico: Registro scolastico
pagina-di-pagine: pagina {{pagina}} di {{pagine}}

# --- I sottotitoli

quanti-pif: {{allievi}} PiF
quanti-momenti: {{quanti}} momenti di valutazione

# --- Le etichette dei campi

classe: Classe
materia: Materia
orario: Orario
aula: Aula
durata: Durata
stato: Stato
etichette: Etichette
corsi: Corsi
tipo: Tipo
peso: Peso
voti: Voti
media: Media
voto-piu-alto: Voto più alto
voto-piu-basso: Voto più basso
sufficienti: No. suff.
insufficienti: No. Ins.
lezioni-a-calendario: Lezioni a calendario
ud-previste: UD previste
ud-a-calendario: UD a calendario
ud-seguite: UD seguite
ud-di-assenza: UD di assenza
ritardi: Ritardi
presenza: Presenza
assenza: Assenza
appello-fatto-su: Appello fatto su
assenza-di-classe: Assenza di classe
presenza-di-classe: Presenza di classe
data-di-nascita: Data di nascita
indirizzo: Indirizzo
email: E-mail
telefono: Telefono
rappresentante: Rappr. legale
azienda: Azienda formatrice
indirizzo-azienda: Indirizzo dell'azienda
datore: Datore di lavoro
telefono-rappresentante: Telefono del rappresentante
telefono-datore: Telefono del datore
nota-semestre: Nota di fine semestre

# --- I titoli delle sezioni

presenze: Presenze
obiettivi: Obiettivi
prerequisiti: Prerequisiti
scaletta: Scaletta
scaletta-svolta: Scaletta svolta
materiali: Materiali
note: Note
argomenti-svolti: Argomenti svolti
consegne-date: Consegne date
osservazioni: Osservazioni
com-e-andata: Com'è andata
consuntivo: Consuntivo
persone-in-formazione: Persone in formazione
documenti-raccolti: Documenti raccolti
periodi-di-assenze: Periodi di assenze
distribuzione: Distribuzione
i-voti: I voti
da-recuperare: Da recuperare
per-persona: Per persona in formazione
da-seguire: Da seguire
profitto: Profitto
le-prove: Le prove
griglia-presenze: Dettaglio griglia delle presenze
annotazioni: Annotazioni
voti-e-medie: Voti e medie
esecuzione-e-riconsegna: Esecuzione e riconsegna
i-momenti: I momenti
recuperi: Recuperi
da-ridare: Prove ancora da ridare

# --- Le frasi

oltre-soglia: Assenza oltre il {{sogliaAssenza}}% previsto:

appello-incompleto: Appello incompleto: {{udSenzaAppello}} caselle non impostate.

riepilogo-presenze: Presenti {{presenti}}/{{conAppello}} · assenti {{assenti}} · parziali {{parziali}} · ritardi {{ritardi}}

# La legenda delle sigle dell'appello. Le lettere vengono dal registro — sono
# le stesse che si premono nella griglia, e riscriverle qui vorrebbe dire poter
# dire una cosa diversa da quella che si compila — mentre le parole si scrivono
# qui: «X assente» diventa «X non c'era» cambiando questa riga e nient'altro.
legenda-presenze: {{siglaPresente}} {{nomePresente}} · {{siglaAssente}} {{nomeAssente}} · {{siglaRitardo}} {{nomeRitardo}} · {{siglaEsonerato}} {{nomeEsonerato}}

# Chi legge «8%» ha il diritto di sapere su che cosa è fatto: messe una accanto
# all'altra senza dirlo, le due percentuali sembrerebbero in contraddizione.
nota-presenze: Le UD previste dall'orario del corso nel periodo sono {{udPrevisteCorso}}, di cui {{udACalendario}} già a calendario. «% presenza» e «% assenza» sono calcolate su quelle previste: la seconda è quanto si è perso di ciò che era in programma, la prima è la frequenza, cioè cento meno quella. Le ore ancora da fare non pesano su nessuna delle due. La «% appello» è invece calcolata sulle sole UD in cui l'appello è stato fatto, e dice quanto i primi due numeri sono affidabili: un'ora di cui nessuno ha segnato niente non è un'ora di assenze per nessuno.

esecuzione-riconsegna: Ogni casella dice il giorno in cui la prova è stata fatta e, dopo il segno «>», quello in cui è stata riconsegnata. Un trattino vuol dire che quel foglio non è ancora tornato indietro.

[colonne]

# Come si chiamano le colonne delle tabelle: a sinistra il nome di serie, a
# destra quello che si vuole leggere sul foglio. Vale per tutte le tabelle di
# tutti i rapporti, perché la stessa colonna deve chiamarsi allo stesso modo
# dappertutto — è lo stesso motivo per cui la testata sta in un file solo.
#
# Per nome e non per posizione: le colonne di una griglia non sono sempre le
# stesse — una per unità didattica, una per prova — e «la terza colonna» di due
# classi diverse non è la stessa cosa.
#
# Il nome di serie è quello italiano in tutte le lingue: le colonne le scrive il
# registro nella lingua in cui stampa, e qui si ribattezzano per il nome che
# hanno in italiano, che non cambia. Un nome cambiato qui vale solo quando si
# stampa in italiano.
#
# Sono commentate perché di serie non si cambia niente. Togliendo il cancelletto
# a una riga, quel nome cambia dalla stampa dopo.
#
# PiF: Nome e cognome
# UD seguite: Ore seguite
# UD di assenza: Ore di assenza
# % presenza: Frequenza
# Min.: Minuti persi
