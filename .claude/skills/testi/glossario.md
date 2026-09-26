# Glossario del registro

Vincolante per ogni catalogo `*.testi.ts`. Un termine si scrive **così** in
ogni punto del registro — schermo, stampa, e-mail, guida, assistente,
procedure. Cambiarne uno vuol dire cambiarlo qui e poi dappertutto.

I termini con un'entrata in `lessico()` (`src/domain/lexicon.testi.ts`) si
prendono da lì nel codice; questa tabella dice quale parola il lessico ha
scelto e fissa quelle che il lessico non ha.

## Tono

| | it | de | fr | en |
| --- | --- | --- | --- | --- |
| Chi legge | tu | **du** (minuscolo) | **tu** | you |
| Virgolette | «…» | «…» | « … » (spazio fine) | “…” |
| Grafia | — | svizzera: **ss**, mai ß | svizzera | britannica (colour, programme→**program** solo per il software) |
| Apostrofo | ’ | ’ | ’ | ’ |

Il marchio «Regiclass» non si traduce (ADR-40; fino alla 1.8.0 era «Registro
docenti»). «registro», il nome comune, invece sì: è la riga qui sotto. Nomi di prodotti (Outlook,
Teams, voicebox, GitHub, Hugging Face, Whisper) invariati.

## Il registro e l'anno

| it | de | fr | en |
| --- | --- | --- | --- |
| registro (il programma, il documento) | Klassenbuch | registre | register |
| anno scolastico | Schuljahr | année scolaire | school year |
| semestre | Semester | semestre | semester |
| periodo (intervallo di date) | Zeitraum | période (tendina «Période»); **intervalle** nelle frasi dove si confonde con l'UD | period (tendina «Period»); date range nelle frasi ambigue |
| anno intero | ganzes Jahr | année entière | whole year |
| vacanze | Ferien | vacances | holidays |
| impostazioni | Einstellungen | paramètres | settings |
| intestazione | Briefkopf | en-tête | letterhead |
| carta intestata | Briefpapier | papier à en-tête | letterhead |

## Le persone

| it | de | fr | en |
| --- | --- | --- | --- |
| persona in formazione (PiF) | Lernende (LP) | personne en formation (PeF) | learner |
| docente | Lehrperson | enseignant | teacher |
| docente di classe | Klassenlehrperson | maître de classe | class teacher |
| rappresentante legale | gesetzliche Vertretung | représentant légal | legal guardian |
| azienda formatrice | Lehrbetrieb | entreprise formatrice | training company |
| capoclasse | Klassenchef | délégué de classe | class representative |
| anagrafica | Personalien | données personnelles | personal details |
| scheda (della persona) | Personenblatt | fiche | record |
| recapito | Kontaktadresse | adresse de contact | contact address |

## L'ora di scuola

| it | de | fr | en |
| --- | --- | --- | --- |
| lezione / ora (la voce del calendario) | **Stunde** | **leçon** | **lesson** |
| unità didattica (UD) | Lektion (Lekt.) | période (pér.) | period (per.) |
| appello | Präsenzkontrolle | appel | attendance |
| presente / assente / in ritardo / esonerato | anwesend / abwesend / verspätet / dispensiert | présent / absent / en retard / dispensé | present / absent / late / excused |
| pianificata / svolta / annullata | geplant / gehalten / ausgefallen | prévue / donnée / annulée | planned / held / cancelled |
| verbale | Protokoll | procès-verbal | lesson record |
| svolgimento | Durchführung | mise en œuvre | delivery |
| piano lezione | Unterrichtsplan | plan de leçon | lesson plan |
| scaletta | Ablauf | déroulement | outline |
| tappa | Etappe | étape | step |
| fascia oraria | Zeitfenster | plage horaire | time slot |
| orario | Stundenplan | horaire | timetable |
| aula | Zimmer | salle | room |
| consegna (compito) | Auftrag | devoir | assignment |
| lettura delle scansioni | Lesen der Scans | lecture des scans | scan reading |

## Valutare

| it | de | fr | en |
| --- | --- | --- | --- |
| momento di valutazione | Leistungsbeurteilung (Beurteilung) | évaluation | assessment |
| prova | Prüfung | épreuve | test |
| voto | Note | note | grade |
| media | Durchschnitt | moyenne | average |
| nota di fine semestre | Semesternote | note semestrielle | semester grade |
| scala dei voti | Notenskala | barème | grading scale |
| sufficienza | genügend ab | seuil de suffisance | pass mark |
| peso | Gewichtung | pondération | weight |
| recupero | Nachprüfung | rattrapage | resit |
| riconsegna | Rückgabe | restitution | return |

## Carte e pagine

| it | de | fr | en |
| --- | --- | --- | --- |
| documento | Dokument | document | document |
| fascicolo di classe | Klassendossier | dossier de classe | class file |
| composizione | Zusammenstellung | compilation | compilation |
| archivio documentale | Dokumentenarchiv | archive des documents | document archive |
| smistamento / Da smistare | Zuordnung / Zuzuordnen | tri / À trier | sorting / To sort |
| pendenza | Pendenz | tâche en suspens | pending item |
| rimaste indietro | überfällig | en retard | overdue |
| comunicazione | Mitteilung | communication | message |
| bozza | Entwurf | brouillon | draft |
| Agenda (gruppo della barra) | Agenda | Agenda | Planner |
| Mappa | Karte | Carte | Map |
| Guida | Hilfe | Aide | Help |
| condotto | Kanal | canal | pipe |
| modelli linguistici | Sprachmodelle | modèles de langage | language models |

## Gesti che ricorrono (pulsanti)

Pulsanti generici: `parole()`. Questi sono fissati perché citati nella guida:

| it | de | fr | en |
| --- | --- | --- | --- |
| Modifica | Bearbeiten | Modifier | Edit |
| Annulla (gesto) | Abbrechen | Annuler | Cancel |
| Annulla / Ripristina (undo/redo) | Rückgängig / Wiederholen | Annuler / Rétablir | Undo / Redo |
| Ripristina (valore di serie) | Zurücksetzen | Réinitialiser | Reset |
| Aggiorna | Aktualisieren | Mettre à jour | Update |
| Nuova ora / Nuova lezione | Neue Stunde | Nouvelle leçon | New lesson |
| Proietta | Projizieren | Projeter | Project |
| Carica un file… | Datei laden… | Charger un fichier… | Load a file… |
| Carica dei PDF | PDFs laden | Charger des PDF | Load PDFs |
| Trova gli indirizzi | Adressen suchen | Trouver les adresses | Find addresses |
| Prepara l’invio | Versand vorbereiten | Préparer l’envoi | Prepare to send |
| Salva con nome… | Speichern unter… | Enregistrer sous… | Save as… |

Un pulsante citato in una frase si scrive **com'è sull'etichetta vera**: prima di
scriverlo, cercarne la chiave nei cataloghi (`grep -rn "'Etichetta'" src`).
