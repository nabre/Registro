// I testi di `assessments.ts`: i momenti di valutazione, i voti, i recuperi, le
// riconsegne e i PDF delle prove.

import { catalogo } from '../i18n/index.js'
import { PIF, frase, il } from '../domain/lexicon.js'
import { plurale } from '../domain/text.js'

const it = {
  tappaSparita: 'Quella tappa non c’è più nel piano.',
  /** Il titolo del momento nato da una tappa che non ne ha uno. */
  verifica: 'Verifica',
  nessunoDaEliminare: 'Nessun momento da eliminare.',
  nessunoSganciato: 'Nessuno di quei momenti era ancora sganciato.',
  sganciatiEliminati: (tolti: number, voti: number) =>
    `${tolti === 1 ? 'Un momento sganciato eliminato' : `${tolti} momenti sganciati eliminati`}` +
    `${voti > 0 ? `, con ${plurale(voti, 'voto', 'voti')}` : ''}.`,
  fuoriScala: (min: number, max: number) => `Voto fuori dalla scala ${min}–${max}.`,
  nonSvolta: 'La prova non si è ancora svolta: non c’è niente da riconsegnare.',
  recuperoPrima: 'Il recupero non può essere prima della prova che recupera.',
  recuperoNonRifatto: 'La prova di recupero non si può riconsegnare prima di averla rifatta.',
  eraAssente: 'Era assente: quel che si riconsegna è il recupero, con la sua data.',
  senzaVoto: 'Quella prova non ha ancora un voto: non c’è un foglio corretto da riconsegnare.',
  senzaCasella:
    'Quella persona non ha una casella in questa prova: non c’è niente da riconsegnare.',
  serveChi: `Serve ${il(PIF)} a cui appartiene la prova.`,
  senzaClasse: 'La classe del momento di valutazione non esiste.',
  pifFuoriClasse: frase(PIF, 'trovato', { nega: true, coda: 'nella classe' }),
  /** Il titolo del dialogo che chiede il PDF di una persona. */
  provaDi: (recupero: boolean, nome: string) => `${recupero ? 'Recupero' : 'Prova'} di ${nome}`,
}

export const testi = catalogo(it, {
  de: {
    tappaSparita: 'Diese Etappe ist nicht mehr im Plan.',
    verifica: 'Prüfung',
    nessunoDaEliminare: 'Keine Leistungsbeurteilung zum Löschen.',
    nessunoSganciato: 'Keine dieser Leistungsbeurteilungen war noch losgelöst.',
    sganciatiEliminati: (tolti, voti) =>
      `${plurale(tolti, 'losgelöste Leistungsbeurteilung', 'losgelöste Leistungsbeurteilungen')}` +
      ` gelöscht${voti > 0 ? `, mit ${plurale(voti, 'Note', 'Noten')}` : ''}.`,
    fuoriScala: (min, max) => `Note ausserhalb der Skala ${min}–${max}.`,
    nonSvolta: 'Die Prüfung hat noch nicht stattgefunden: Es gibt nichts zurückzugeben.',
    recuperoPrima: 'Die Nachprüfung kann nicht vor der Prüfung liegen, die sie nachholt.',
    recuperoNonRifatto:
      'Die Nachprüfung kann nicht zurückgegeben werden, bevor sie geschrieben wurde.',
    eraAssente: 'War abwesend: Zurückgegeben wird die Nachprüfung, mit ihrem Datum.',
    senzaVoto: 'Diese Prüfung hat noch keine Note: Es gibt kein korrigiertes Blatt zurückzugeben.',
    senzaCasella:
      'Diese Person hat kein Feld in dieser Prüfung: Es gibt nichts zurückzugeben.',
    serveChi: 'Es braucht die lernende Person, der die Prüfung gehört.',
    senzaClasse: 'Die Klasse der Leistungsbeurteilung existiert nicht.',
    pifFuoriClasse: 'Lernende Person in der Klasse nicht gefunden.',
    provaDi: (recupero, nome) => `${recupero ? 'Nachprüfung' : 'Prüfung'} von ${nome}`,
  },
  fr: {
    tappaSparita: 'Cette étape n’est plus dans le plan.',
    verifica: 'Contrôle',
    nessunoDaEliminare: 'Aucune évaluation à supprimer.',
    nessunoSganciato: 'Aucune de ces évaluations n’était encore détachée.',
    sganciatiEliminati: (tolti, voti) =>
      `${plurale(tolti, 'évaluation détachée supprimée', 'évaluations détachées supprimées')}` +
      `${voti > 0 ? `, avec ${plurale(voti, 'note', 'notes')}` : ''}.`,
    fuoriScala: (min, max) => `Note hors du barème ${min}–${max}.`,
    nonSvolta: 'L’épreuve n’a pas encore eu lieu : il n’y a rien à rendre.',
    recuperoPrima: 'Le rattrapage ne peut pas précéder l’épreuve qu’il rattrape.',
    recuperoNonRifatto:
      'L’épreuve de rattrapage ne peut pas être rendue avant d’avoir été refaite.',
    eraAssente: 'Absent : ce qu’on rend, c’est le rattrapage, à sa date.',
    senzaVoto: 'Cette épreuve n’a pas encore de note : il n’y a pas de copie corrigée à rendre.',
    senzaCasella:
      'Cette personne n’a pas de case dans cette épreuve : il n’y a rien à rendre.',
    serveChi: 'Il faut la personne en formation à qui appartient l’épreuve.',
    senzaClasse: 'La classe de l’évaluation n’existe pas.',
    pifFuoriClasse: 'Personne en formation introuvable dans la classe.',
    provaDi: (recupero, nome) => `${recupero ? 'Rattrapage' : 'Épreuve'} de ${nome}`,
  },
  en: {
    tappaSparita: 'That step is no longer in the plan.',
    verifica: 'Test',
    nessunoDaEliminare: 'No assessments to delete.',
    nessunoSganciato: 'None of those assessments was still detached.',
    sganciatiEliminati: (tolti, voti) =>
      `${plurale(tolti, 'detached assessment', 'detached assessments')} deleted` +
      `${voti > 0 ? `, with ${plurale(voti, 'grade', 'grades')}` : ''}.`,
    fuoriScala: (min, max) => `Grade outside the scale ${min}–${max}.`,
    nonSvolta: 'The test hasn’t taken place yet: there’s nothing to hand back.',
    recuperoPrima: 'The resit can’t be before the test it makes up for.',
    recuperoNonRifatto: 'The resit can’t be handed back before it has been sat.',
    eraAssente: 'They were absent: what gets handed back is the resit, with its date.',
    senzaVoto: 'That test has no grade yet: there’s no marked paper to hand back.',
    senzaCasella: 'That person has no box in this test: there’s nothing to hand back.',
    serveChi: 'The learner the test belongs to is needed.',
    senzaClasse: 'The assessment’s class doesn’t exist.',
    pifFuoriClasse: 'Learner not found in the class.',
    provaDi: (recupero, nome) => `${nome}’s ${recupero ? 'resit' : 'test'}`,
  },
})
