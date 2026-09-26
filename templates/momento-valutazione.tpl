# Una prova sola, per esteso: chi ha preso che cosa, e che forma ha la classe.
#
# La griglia delle valutazioni risponde a «come va il corso» e sta stretta in
# venti colonne; questo foglio risponde a «com'è andata questa prova», che è la
# domanda del giorno in cui la si riconsegna.
#
# Il grafico sta in alto, prima dei nomi: la forma della classe si guarda per
# prima e poi si va a cercare chi. È un punto per PiF sul suo voto esatto,
# con la riga della media; la sufficienza la dice il colore dei punti.

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{prova}}; sottotitolo={{corso}} · {{data}}
# Niente scala né riconsegna qui sopra: la scala la dice l'asse del grafico,
# numerato al mezzo punto, e la riconsegna sta nella colonna sua —
# per PiF, che è dove la si viene a cercare.
campi: {{frase.tipo}}={{tipo}}; {{frase.peso}}={{peso}}; {{frase.voti}}={{voti}}; {{frase.media}}={{media}}
campi: {{frase.voto-piu-alto}}={{massimo}}; {{frase.sufficienti}}={{sufficienti}}; {{frase.voto-piu-basso}}={{minimo}}; {{frase.insufficienti}}={{insufficienti}}
paragrafo: {{descrizione}}

sezione: {{frase.distribuzione}}
grafico: distribuzione

sezione: {{frase.i-voti}}
tabella: voti

sezione: {{frase.da-recuperare}}
tabella: recuperi
