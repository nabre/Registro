# Le parole comuni a tutti i rapporti, in tedesco.
#
# Le stesse frasi di _testi.tpl, con gli stessi nomi e gli stessi segnaposto,
# scritte nel tedesco della Svizzera: «ss» e non «ß», «Lernende», «Lehrbetrieb»,
# «Lektion» per l'unità didattica. Vale quando il registro parla tedesco; il
# perché di tutto, e le regole, stanno in _testi.tpl.
#
# Una frase aggiunta a _testi.tpl si aggiunge anche qui, o in tedesco esce
# vuota: «npm test» lo dice prima.

[frasi]

# --- La testata e il piede, in _base

registro-scolastico: Klassenbuch
pagina-di-pagine: Seite {{pagina}} von {{pagine}}

# --- I sottotitoli

quanti-pif: {{allievi}} Lernende
quanti-momenti: {{quanti}} Leistungsbeurteilungen

# --- Le etichette dei campi

classe: Klasse
materia: Fach
orario: Zeit
aula: Zimmer
durata: Dauer
stato: Status
etichette: Schlagwörter
corsi: Kurse
tipo: Art
peso: Gewichtung
voti: Noten
media: Durchschnitt
voto-piu-alto: Beste Note
voto-piu-basso: Tiefste Note
sufficienti: Genügend
insufficienti: Ungenügend
lezioni-a-calendario: Stunden im Kalender
ud-previste: Vorgesehene Lektionen
ud-a-calendario: Lektionen im Kalender
ud-seguite: Besuchte Lektionen
ud-di-assenza: Verpasste Lektionen
ritardi: Verspätungen
presenza: Anwesenheit
assenza: Absenz
appello-fatto-su: Anwesenheit laut Kontrolle
assenza-di-classe: Absenz der Klasse
presenza-di-classe: Anwesenheit der Klasse
data-di-nascita: Geburtsdatum
indirizzo: Adresse
email: E-Mail
telefono: Telefon
rappresentante: Ges. Vertretung
azienda: Lehrbetrieb
indirizzo-azienda: Adresse des Lehrbetriebs
datore: Arbeitgeber
telefono-rappresentante: Telefon der gesetzlichen Vertretung
telefono-datore: Telefon des Arbeitgebers
nota-semestre: Semesternote

# --- I titoli delle sezioni

presenze: Anwesenheit
obiettivi: Lernziele
prerequisiti: Voraussetzungen
scaletta: Ablauf
scaletta-svolta: Durchgeführter Ablauf
materiali: Material
note: Notizen
argomenti-svolti: Behandelte Themen
consegne-date: Erteilte Aufträge
osservazioni: Beobachtungen
com-e-andata: Wie es lief
consuntivo: Rückblick
persone-in-formazione: Lernende
documenti-raccolti: Eingesammelte Dokumente
periodi-di-assenze: Absenzzeiträume
distribuzione: Verteilung
i-voti: Die Noten
da-recuperare: Nachzuholen
per-persona: Nach Lernenden
da-seguire: Im Auge behalten
profitto: Leistungen
le-prove: Die Prüfungen
griglia-presenze: Präsenzraster im Detail
annotazioni: Vermerke
voti-e-medie: Noten und Durchschnitte
esecuzione-e-riconsegna: Durchführung und Rückgabe
i-momenti: Die Beurteilungen
recuperi: Nachprüfungen
da-ridare: Noch zurückzugebende Prüfungen

# --- Le frasi

oltre-soglia: Absenz über den vorgesehenen {{sogliaAssenza}}%:

appello-incompleto: Präsenzkontrolle unvollständig: {{udSenzaAppello}} Felder nicht erfasst.

riepilogo-presenze: Anwesend {{presenti}}/{{conAppello}} · abwesend {{assenti}} · teilweise {{parziali}} · verspätet {{ritardi}}

legenda-presenze: {{siglaPresente}} {{nomePresente}} · {{siglaAssente}} {{nomeAssente}} · {{siglaRitardo}} {{nomeRitardo}} · {{siglaEsonerato}} {{nomeEsonerato}}

nota-presenze: Laut Stundenplan des Kurses sind im Zeitraum {{udPrevisteCorso}} Lektionen vorgesehen, davon {{udACalendario}} bereits im Kalender. «% Anwesenheit» und «% Absenz» beziehen sich auf die vorgesehenen Lektionen: Die zweite gibt an, wie viel vom Programm verpasst wurde, die erste ist die Anwesenheit, also hundert minus die Absenz. Lektionen, die noch bevorstehen, zählen bei keiner der beiden. Die «% Kontrolle» bezieht sich dagegen nur auf die Lektionen, in denen die Präsenzkontrolle gemacht wurde, und zeigt, wie verlässlich die ersten beiden Zahlen sind: Eine Lektion, in der niemand etwas erfasst hat, ist für niemanden eine Absenz.

esecuzione-riconsegna: Jedes Feld nennt den Tag, an dem die Prüfung geschrieben wurde, und nach dem Zeichen «>» den Tag, an dem sie zurückgegeben wurde. Ein Strich bedeutet, dass das Blatt noch nicht zurückgegeben ist.

[colonne]

# Come in _testi.tpl: a sinistra il nome di serie, che è quello italiano in
# tutte le lingue; a destra quello che si vuole leggere sul foglio stampato in
# tedesco. Di serie non si cambia niente.
#
# PiF: Name und Vorname
# UD seguite: Besuchte Stunden
