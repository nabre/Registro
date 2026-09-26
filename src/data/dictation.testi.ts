// I testi della dettatura: perché non è pronta e che cosa non si è sentito
// (`dictation.ts`), e quel che voicebox risponde quando non trascrive
// (`voicebox.ts`). «voicebox» è il nome del programma e resta quello.

import { catalogo } from '../i18n/index.js'

const it = {
  // ------------------------------------------------------------ dictation.ts
  spenta:
    'La dettatura è spenta: si accende nelle impostazioni del programma, sotto ' +
    '«Modelli linguistici», alla voce «Dettatura».',
  nonLocale: (scritto: string) =>
    `«${scritto}» non è un indirizzo di questo computer, e la voce non esce di qui: nelle ` +
    'impostazioni, «Dettatura», ci vuole un indirizzo come http://127.0.0.1:17493.',
  nienteSentito: 'Non ho sentito niente: prova a parlare più vicino.',
  nonCapito: 'Non sono riuscito a capire quel che è stato detto.',

  // ------------------------------------------------------------ voicebox.ts
  risposta: (stato: number) => `risposta ${stato}`,
  nonPronto: (indirizzo: string, stato: number) =>
    `voicebox su ${indirizzo} risponde, ma non è pronto (${stato}).`,
  nonRisponde: (indirizzo: string) => `voicebox non risponde su ${indirizzo}: è avviato?`,
  fermata: 'La dettatura è stata fermata.',
  scaduta: (secondi: number) => `voicebox non ha finito entro ${secondi} secondi.`,
  rinvio: (indirizzo: string) =>
    `Su ${indirizzo} qualcuno rimanda la voce altrove: non la mando. ` +
    'È davvero voicebox?',
  scaricaModello: (taglia: string) =>
    `voicebox sta scaricando il modello «${taglia}»: riprova fra poco.`,
  nonTrascritto: (dettaglio: string) => `voicebox non è riuscito a trascrivere: ${dettaglio}.`,
}

export const testi = catalogo(it, {
  de: {
    spenta:
      'Das Diktat ist ausgeschaltet: Du schaltest es in den Programmeinstellungen ein, unter ' +
      '«Sprachmodelle», beim Eintrag «Diktat».',
    nonLocale: (scritto) =>
      `«${scritto}» ist keine Adresse dieses Computers, und die Stimme verlässt ihn nicht: In ` +
      'den Einstellungen, «Diktat», braucht es eine Adresse wie http://127.0.0.1:17493.',
    nienteSentito: 'Ich habe nichts gehört: Versuch, näher am Mikrofon zu sprechen.',
    nonCapito: 'Ich konnte nicht verstehen, was gesagt wurde.',
    risposta: (stato) => `Antwort ${stato}`,
    nonPronto: (indirizzo, stato) =>
      `voicebox auf ${indirizzo} antwortet, ist aber nicht bereit (${stato}).`,
    nonRisponde: (indirizzo) => `voicebox antwortet nicht auf ${indirizzo}: Ist es gestartet?`,
    fermata: 'Das Diktat wurde angehalten.',
    scaduta: (secondi) => `voicebox ist nicht innerhalb von ${secondi} Sekunden fertig geworden.`,
    rinvio: (indirizzo) =>
      `Auf ${indirizzo} leitet jemand die Stimme anderswohin weiter: Ich schicke sie nicht. ` +
      'Ist das wirklich voicebox?',
    scaricaModello: (taglia) =>
      `voicebox lädt gerade das Modell «${taglia}» herunter: Versuch es gleich noch einmal.`,
    nonTrascritto: (dettaglio) => `voicebox konnte nicht transkribieren: ${dettaglio}.`,
  },
  fr: {
    spenta:
      'La dictée est désactivée : active-la dans les paramètres du programme, sous ' +
      '« Modèles de langage », à la rubrique « Dictée ».',
    nonLocale: (scritto) =>
      `« ${scritto} » n’est pas une adresse de cet ordinateur, et la voix ne sort pas d’ici : ` +
      'dans les paramètres, « Dictée », il faut une adresse comme http://127.0.0.1:17493.',
    nienteSentito: 'Je n’ai rien entendu : essaie de parler plus près.',
    nonCapito: 'Je n’ai pas réussi à comprendre ce qui a été dit.',
    risposta: (stato) => `réponse ${stato}`,
    nonPronto: (indirizzo, stato) =>
      `voicebox sur ${indirizzo} répond, mais n’est pas prêt (${stato}).`,
    nonRisponde: (indirizzo) => `voicebox ne répond pas sur ${indirizzo} : est-il lancé ?`,
    fermata: 'La dictée a été arrêtée.',
    scaduta: (secondi) => `voicebox n’a pas fini en ${secondi} secondes.`,
    rinvio: (indirizzo) =>
      `Sur ${indirizzo}, quelqu’un renvoie la voix ailleurs : je ne l’envoie pas. ` +
      'Est-ce vraiment voicebox ?',
    scaricaModello: (taglia) =>
      `voicebox est en train de télécharger le modèle « ${taglia} » : réessaie dans un instant.`,
    nonTrascritto: (dettaglio) => `voicebox n’a pas réussi à transcrire : ${dettaglio}.`,
  },
  en: {
    spenta:
      'Dictation is switched off: switch it on in the program settings, under ' +
      '“Language models”, in the “Dictation” group.',
    nonLocale: (scritto) =>
      `“${scritto}” is not an address on this computer, and the voice does not leave it: in ` +
      'the settings, “Dictation”, an address like http://127.0.0.1:17493 is needed.',
    nienteSentito: 'I didn’t hear anything: try speaking closer.',
    nonCapito: 'I could not make out what was said.',
    risposta: (stato) => `response ${stato}`,
    nonPronto: (indirizzo, stato) =>
      `voicebox at ${indirizzo} responds, but is not ready (${stato}).`,
    nonRisponde: (indirizzo) => `voicebox is not responding at ${indirizzo}: is it running?`,
    fermata: 'Dictation was stopped.',
    scaduta: (secondi) => `voicebox did not finish within ${secondi} seconds.`,
    rinvio: (indirizzo) =>
      `Something at ${indirizzo} is redirecting the voice elsewhere: I am not sending it. ` +
      'Is it really voicebox?',
    scaricaModello: (taglia) => `voicebox is downloading the “${taglia}” model: try again shortly.`,
    nonTrascritto: (dettaglio) => `voicebox could not transcribe: ${dettaglio}.`,
  },
})
