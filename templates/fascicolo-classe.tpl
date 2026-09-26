# Il fascicolo di classe: quel che si consegna a chi subentra.
#
# Vale per l'anno intero e non per un semestre: recapiti, documenti raccolti e
# comunicazioni non si azzerano a gennaio.

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{frase.quanti-pif}} · {{periodo}}
campi: {{frase.corsi}}={{corsi}}

sezione: {{frase.persone-in-formazione}}
tabella: allievi

sezione: {{frase.documenti-raccolti}}
tabella: documenti

sezione: {{frase.periodi-di-assenze}}
tabella: assenze
