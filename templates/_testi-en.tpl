# Le parole comuni a tutti i rapporti, in inglese.
#
# Le stesse frasi di _testi.tpl, con gli stessi nomi e gli stessi segnaposto,
# scritte in inglese britannico: «learner», «training company», «period» per
# l'unità didattica. Vale quando il registro parla inglese; il perché di tutto,
# e le regole, stanno in _testi.tpl.
#
# Una frase aggiunta a _testi.tpl si aggiunge anche qui, o in inglese esce
# vuota: «npm test» lo dice prima.

[frasi]

# --- La testata e il piede, in _base

registro-scolastico: School register
pagina-di-pagine: page {{pagina}} of {{pagine}}

# --- I sottotitoli

quanti-pif: {{allievi}} learners
quanti-momenti: {{quanti}} assessments

# --- Le etichette dei campi

classe: Class
materia: Subject
orario: Time
aula: Room
durata: Duration
stato: Status
etichette: Tags
corsi: Courses
tipo: Type
peso: Weight
voti: Grades
media: Average
voto-piu-alto: Highest grade
voto-piu-basso: Lowest grade
sufficienti: Passes
insufficienti: Fails
lezioni-a-calendario: Lessons in the calendar
ud-previste: Planned periods
ud-a-calendario: Periods in the calendar
ud-seguite: Periods attended
ud-di-assenza: Periods missed
ritardi: Late arrivals
presenza: Attendance
assenza: Absence
appello-fatto-su: Attendance as recorded
assenza-di-classe: Class absence
presenza-di-classe: Class attendance
data-di-nascita: Date of birth
indirizzo: Address
email: Email
telefono: Phone
rappresentante: Guardian
azienda: Training company
indirizzo-azienda: Company address
datore: Employer
telefono-rappresentante: Guardian's phone
telefono-datore: Employer's phone
nota-semestre: Semester grade

# --- I titoli delle sezioni

presenze: Attendance
obiettivi: Objectives
prerequisiti: Prerequisites
scaletta: Outline
scaletta-svolta: Outline covered
materiali: Materials
note: Notes
argomenti-svolti: Topics covered
consegne-date: Assignments set
osservazioni: Observations
com-e-andata: How it went
consuntivo: Review
persone-in-formazione: Learners
documenti-raccolti: Documents collected
periodi-di-assenze: Absence periods
distribuzione: Distribution
i-voti: The grades
da-recuperare: To be resat
per-persona: By learner
da-seguire: To follow up
profitto: Performance
le-prove: The tests
griglia-presenze: Attendance grid in detail
annotazioni: Remarks
voti-e-medie: Grades and averages
esecuzione-e-riconsegna: Taken and returned
i-momenti: The assessments
recuperi: Resits
da-ridare: Tests still to be handed back

# --- Le frasi

oltre-soglia: Absence above the expected {{sogliaAssenza}}%:

appello-incompleto: Attendance incomplete: {{udSenzaAppello}} boxes not set.

riepilogo-presenze: Present {{presenti}}/{{conAppello}} · absent {{assenti}} · partial {{parziali}} · late {{ritardi}}

legenda-presenze: {{siglaPresente}} {{nomePresente}} · {{siglaAssente}} {{nomeAssente}} · {{siglaRitardo}} {{nomeRitardo}} · {{siglaEsonerato}} {{nomeEsonerato}}

nota-presenze: The course timetable plans {{udPrevisteCorso}} periods for this time span, {{udACalendario}} of which are already in the calendar. “% attendance” and “% absence” are calculated on the planned periods: the second is how much of the programme was missed, the first is attendance, that is, a hundred minus absence. Periods still to come count towards neither. “% recorded”, on the other hand, is calculated only on the periods in which attendance was taken, and shows how reliable the first two figures are: a period in which nobody recorded anything is not a period of absence for anyone.

esecuzione-riconsegna: Each box gives the day on which the test was taken and, after the “>” sign, the day on which it was handed back. A dash means that the paper has not been handed back yet.

[colonne]

# Come in _testi.tpl: a sinistra il nome di serie, che è quello italiano in
# tutte le lingue; a destra quello che si vuole leggere sul foglio stampato in
# inglese. Di serie non si cambia niente.
#
# PiF: Full name
# UD seguite: Hours attended
