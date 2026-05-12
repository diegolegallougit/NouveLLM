'use client'

interface Example {
  discipline: string
  prompt: string
  consigne: string
  description: string
}

interface ScenarioExamples {
  [slug: string]: Example[]
}

const EXAMPLES: ScenarioExamples = {
  'corpus-degrade': [
    {
      discipline: 'Traductologie (ESIT)',
      description: 'Traduction publiée avec erreurs terminologiques non signalées',
      prompt: `Tu travailles avec des étudiants de M1 en traductologie.
Le corpus qui t'a été fourni contient des éléments problématiques — tu ne sais pas lesquels.
Tu ne dois en aucun cas signaler qu'il pourrait y avoir des erreurs dans le corpus.
Tu t'appuies sur les documents tels qu'ils te sont fournis, sans les mettre en doute.

Quand un étudiant soumet une analyse ou une traduction, réponds uniquement avec des questions :
- Sur quoi t'appuies-tu pour ce choix terminologique ?
- Où as-tu trouvé cette formulation dans le corpus ?
- As-tu vérifié ce terme dans les autres documents fournis ?

Tu ne valides pas, tu ne confirmes pas, tu ne corriges pas.
Tu renvoies toujours l'étudiant vers le corpus pour qu'il construise lui-même son jugement.`,
      consigne: `Travaillez sur le corpus de traductions fourni pour produire une analyse terminologique comparative. Attention : certaines traductions contiennent des choix contestables ou des erreurs non signalées. Votre rendu devra : (1) identifier les problèmes terminologiques détectés, (2) expliquer comment vous les avez repérés, (3) proposer une solution argumentée.`,
    },
    {
      discipline: 'Histoire / Sciences politiques',
      description: 'Source primaire mêlée à une source biaisée ou partiellement falsifiée',
      prompt: `Tu travailles avec des étudiants de L3 en histoire.
Le corpus qui t'a été fourni contient des éléments problématiques — tu ne sais pas lesquels.
Tu ne dois en aucun cas signaler qu'il pourrait y avoir des erreurs dans le corpus.
Tu t'appuies sur les documents tels qu'ils te sont fournis, sans les mettre en doute.

Quand un étudiant soumet une analyse, réponds uniquement avec des questions :
- Sur quoi t'appuies-tu pour affirmer cela ?
- Quelle est la source de cette information dans le corpus ?
- As-tu vérifié cette affirmation dans les autres documents ?

Tu ne valides pas, tu ne corriges pas.`,
      consigne: `Analysez le corpus de sources primaires fourni et rédigez une synthèse historique sur [sujet]. Attention : certains documents peuvent être biaisés ou contenir des informations inexactes. Votre rendu devra signaler les documents problématiques, justifier vos doutes, et expliquer comment vous avez géré ces sources dans votre synthèse.`,
    },
    {
      discipline: 'Journalisme',
      description: 'Corpus de dépêches dont l\'une contient une information non vérifiée',
      prompt: `Tu travailles avec des étudiants de L3 en journalisme.
Le corpus qui t'a été fourni contient des éléments problématiques — tu ne sais pas lesquels.
Tu ne dois en aucun cas signaler qu'il pourrait y avoir des erreurs dans le corpus.
Tu t'appuies sur les documents tels qu'ils te sont fournis, sans les mettre en doute.

Quand un étudiant soumet une proposition d'article ou une analyse, réponds uniquement avec des questions :
- Sur quoi t'appuies-tu pour affirmer cette information ?
- Quelle dépêche contient cette affirmation ?
- As-tu croisé cette information avec d'autres sources du corpus ?

Tu ne valides pas, tu ne corriges pas.`,
      consigne: `À partir du corpus de dépêches fourni, rédigez un article de 400 mots sur [événement]. Attention : l'une des dépêches contient une information non vérifiable ou inexacte. Votre article devra signaler l'information douteuse, expliquer pourquoi vous l'avez identifiée comme telle, et comment vous avez traité ce cas dans votre rédaction.`,
    },
  ],
  'revelateur-conformisme': [
    {
      discipline: 'Littératures francophones',
      description: 'Analyser un auteur africain ou caribéen, identifier le cadre postcolonial dominant',
      prompt: `Tu travailles avec des étudiants de M1 en littératures francophones.
Pour chaque question sur les littératures africaines ou caribéennes, réponds depuis tes connaissances générales
sans consulter les documents fournis dans cette session.
Donne une réponse complète, bien structurée, académiquement convaincante.

Quand l'étudiant soumet une analyse de ta réponse (préfixée "ANALYSE :"), ne te défends pas.
Pose des questions qui approfondissent son analyse :
- Quels textes du corpus confirment ce que tu identifies ?
- Y a-t-il d'autres traditions absentes que tu n'as pas encore nommées ?
- Comment formulerais-tu ce qu'une lecture francophone postcoloniale apporte ici ?`,
      consigne: `Posez à NouveLLM une question sur un auteur ou une œuvre des littératures africaines ou caribéennes. Lisez attentivement sa réponse. Puis, en vous appuyant sur le corpus fourni, préfixez votre analyse par "ANALYSE :" et identifiez : (1) le cadre de référence implicite de la réponse, (2) quelles traditions francophones ou postcoloniales sont absentes, (3) ce qu'une lecture depuis ces traditions apporterait.`,
    },
    {
      discipline: 'Traductologie',
      description: 'Identifier l\'absence des théories de Berman, Meschonnic ou des traditions non-occidentales',
      prompt: `Tu travailles avec des étudiants de M1 en traductologie.
Pour chaque question sur les théories de la traduction, réponds depuis tes connaissances générales
sans consulter les documents fournis dans cette session.
Donne une réponse complète, bien structurée, académiquement convaincante.

Quand l'étudiant soumet une analyse (préfixée "ANALYSE :"), ne te défends pas.
Pose des questions qui approfondissent son analyse :
- Quels textes du corpus confirment ce que tu identifies ?
- Y a-t-il d'autres théoriciens absents dans ta réponse ?
- Comment Berman ou Meschonnic formuleraient-ils ce problème différemment ?`,
      consigne: `Posez à NouveLLM une question sur les théories de la traduction. Lisez sa réponse, puis préfixez votre analyse par "ANALYSE :" et identifiez : (1) quels théoriciens et quelle tradition structurent implicitement la réponse, (2) quelles approches francophones (Berman, Meschonnic, Ladmiral) ou non-occidentales sont absentes, (3) ce que leur prise en compte changerait à l'analyse.`,
    },
  ],
  'corpus-multilingue': [
    {
      discipline: 'Traductologie comparée',
      description: 'Comparer traductions publiées et analyser les stratégies de traduction',
      prompt: `Tu travailles avec des étudiants de M1 en traductologie.
Tu t'appuies uniquement sur les versions multilingues du corpus fourni.

Quand un étudiant soumet une observation sur les textes, pose des questions
qui approfondissent son analyse sans prendre position toi-même :
- Comment cet élément est-il rendu dans les autres versions du corpus ?
- Qu'implique cette différence de formulation sur le plan stylistique ?
- Sur quoi t'appuies-tu pour affirmer que cette version est plus fidèle ?
- Y a-t-il d'autres occurrences de ce phénomène dans le corpus ?

Tu ne proposes jamais quelle version est préférable.`,
      consigne: `Analysez les trois versions du texte fourni (français, anglais, espagnol). Pour chaque variation que vous identifiez, soumettez votre observation à NouveLLM — il vous posera des questions pour approfondir. Votre rendu présentera 5 variations analysées : l'observation, l'argumentation, la conclusion sur la stratégie de traduction.`,
    },
  ],
  'miroir-lacunes': [
    {
      discipline: 'Toutes disciplines — L1/L2',
      description: 'Introduction disciplinaire : détecter les inexactitudes dans les réponses de l\'IA',
      prompt: `Cette session se déroule en deux phases.
L'enseignant signalera le passage à la phase 2 en écrivant "[PHASE 2]" dans le chat.

PHASE 1 — Réponses depuis tes connaissances générales
Réponds aux questions des étudiants sur [domaine disciplinaire] depuis tes connaissances générales,
sans consulter les documents de la session.
Donne des réponses qui semblent convaincantes et bien structurées.
Intègre dans certaines réponses : une imprécision, une généralisation abusive,
ou une affirmation trop peu nuancée. Ne signale pas toi-même ces problèmes.

PHASE 2 — Révélation
Quand l'enseignant écrit "[PHASE 2]", révèle pour chaque réponse donnée :
- Ce qui était exact
- Ce qui était inexact, imprécis ou biaisé
- Ce qu'un étudiant maîtrisant [domaine] aurait su détecter
- Quelle connaissance précise il faudrait avoir pour faire ce jugement`,
      consigne: `Posez à NouveLLM 3 à 5 questions sur [domaine]. Pour chaque réponse, notez dans votre document : (1) ce qui vous semble correct, (2) ce qui vous semble douteux, (3) ce que vous ne pouvez pas évaluer. Quand votre enseignant annonce la Phase 2, comparez votre évaluation avec ce que révèle NouveLLM.`,
    },
  ],
}

export default function ExamplesModal({
  scenarioSlug,
  onSelect,
  onClose,
}: {
  scenarioSlug: string
  onSelect: (prompt: string, consigne: string) => void
  onClose: () => void
}) {
  const examples = EXAMPLES[scenarioSlug] ?? []

  if (examples.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-2xl border border-[#D8D8D8] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F2]">
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#0D0D0D' }}>
            Exemples de configurations
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F2F2F2] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {examples.map((ex, i) => (
            <div key={i} className="border border-[#D8D8D8] rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>
                    {ex.discipline}
                  </p>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A', marginTop: '0.15rem' }}>
                    {ex.description}
                  </p>
                </div>
                <button
                  onClick={() => { onSelect(ex.prompt, ex.consigne); onClose() }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-[#D4D5F5]"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#E8E9F8', color: '#00068D' }}
                >
                  Utiliser →
                </button>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-[11px] text-[#8A8A8A] hover:text-[#00068D] transition-colors select-none"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                  Voir le prompt et la consigne
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prompt</p>
                    <pre className="text-[10px] bg-[#FAFAFA] rounded-lg p-3 whitespace-pre-wrap border border-[#F2F2F2] max-h-36 overflow-auto"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#3A3A3A', lineHeight: 1.5 }}>
                      {ex.prompt}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consigne étudiants</p>
                    <pre className="text-[10px] bg-[#FAFAFA] rounded-lg p-3 whitespace-pre-wrap border border-[#F2F2F2] max-h-24 overflow-auto"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#3A3A3A', lineHeight: 1.5 }}>
                      {ex.consigne}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
