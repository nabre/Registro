# Le parole comuni a tutti i rapporti, in francese.
#
# Le stesse frasi di _testi.tpl, con gli stessi nomi e gli stessi segnaposto,
# scritte nel francese della Svizzera romanda: «personne en formation»,
# «entreprise formatrice», «période» per l'unità didattica. Vale quando il
# registro parla francese; il perché di tutto, e le regole, stanno in
# _testi.tpl.
#
# Niente «œ»: i caratteri dei PDF sono quelli del Latin-1, e lì non c'è.
#
# Una frase aggiunta a _testi.tpl si aggiunge anche qui, o in francese esce
# vuota: «npm test» lo dice prima.

[frasi]

# --- La testata e il piede, in _base

registro-scolastico: Registre scolaire
pagina-di-pagine: page {{pagina}} sur {{pagine}}

# --- I sottotitoli

quanti-pif: {{allievi}} PeF
quanti-momenti: {{quanti}} évaluations

# --- Le etichette dei campi

classe: Classe
materia: Branche
orario: Horaire
aula: Salle
durata: Durée
stato: Statut
etichette: Étiquettes
corsi: Cours
tipo: Type
peso: Pondération
voti: Notes
media: Moyenne
voto-piu-alto: Note la plus haute
voto-piu-basso: Note la plus basse
sufficienti: Suffisantes
insufficienti: Insuffisantes
lezioni-a-calendario: Leçons au calendrier
ud-previste: Périodes prévues
ud-a-calendario: Périodes au calendrier
ud-seguite: Périodes suivies
ud-di-assenza: Périodes d'absence
ritardi: Retards
presenza: Présence
assenza: Absence
appello-fatto-su: Présence selon l'appel
assenza-di-classe: Absence de la classe
presenza-di-classe: Présence de la classe
data-di-nascita: Date de naissance
indirizzo: Adresse
email: E-mail
telefono: Téléphone
rappresentante: Repr. légal
azienda: Entreprise formatrice
indirizzo-azienda: Adresse de l'entreprise
datore: Employeur
telefono-rappresentante: Téléphone du représentant légal
telefono-datore: Téléphone de l'employeur
nota-semestre: Note semestrielle

# --- I titoli delle sezioni

presenze: Présences
obiettivi: Objectifs
prerequisiti: Prérequis
scaletta: Déroulement
scaletta-svolta: Déroulement effectué
materiali: Matériel
note: Notes
argomenti-svolti: Sujets traités
consegne-date: Devoirs donnés
osservazioni: Observations
com-e-andata: Comment ça s’est passé
consuntivo: Bilan
persone-in-formazione: Personnes en formation
documenti-raccolti: Documents recueillis
periodi-di-assenze: Périodes d'absence
distribuzione: Répartition
i-voti: Les notes
da-recuperare: À rattraper
per-persona: Par personne en formation
da-seguire: À suivre
profitto: Résultats
le-prove: Les épreuves
griglia-presenze: Grille des présences en détail
annotazioni: Annotations
voti-e-medie: Notes et moyennes
esecuzione-e-riconsegna: Passation et restitution
i-momenti: Les évaluations
recuperi: Rattrapages
da-ridare: Épreuves encore à rendre

# --- Le frasi

oltre-soglia: Absence au-delà des {{sogliaAssenza}} % prévus :

appello-incompleto: Appel incomplet : {{udSenzaAppello}} cases non saisies.

riepilogo-presenze: Présents {{presenti}}/{{conAppello}} · absents {{assenti}} · partiels {{parziali}} · retards {{ritardi}}

legenda-presenze: {{siglaPresente}} {{nomePresente}} · {{siglaAssente}} {{nomeAssente}} · {{siglaRitardo}} {{nomeRitardo}} · {{siglaEsonerato}} {{nomeEsonerato}}

nota-presenze: L'horaire du cours prévoit {{udPrevisteCorso}} périodes sur l'intervalle choisi, dont {{udACalendario}} déjà au calendrier. Le « % présence » et le « % absence » sont calculés sur les périodes prévues : le second indique ce qui a été manqué de ce qui était au programme, le premier est la fréquentation, c'est-à-dire cent moins l'absence. Les périodes encore à venir ne pèsent sur aucun des deux. Le « % appel » est en revanche calculé sur les seules périodes où l'appel a été fait, et dit dans quelle mesure les deux premiers chiffres sont fiables : une période où personne n'a rien saisi n'est une période d'absence pour personne.

esecuzione-riconsegna: Chaque case indique le jour où l'épreuve a été passée et, après le signe « > », celui où elle a été rendue. Un tiret signifie que la copie n'est pas encore revenue.

[colonne]

# Come in _testi.tpl: a sinistra il nome di serie, che è quello italiano in
# tutte le lingue; a destra quello che si vuole leggere sul foglio stampato in
# francese. Di serie non si cambia niente.
#
# PiF: Nom et prénom
# UD seguite: Heures suivies
