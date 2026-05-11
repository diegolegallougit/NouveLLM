export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white">
      <header
        className="flex items-center justify-between px-8 bg-white border-b border-[#D8D8D8]"
        style={{ height: '56px' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00068D]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v18M3 12h18" />
              <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#00068D' }}>
            NouveLLM
          </span>
        </div>
        <a
          href="/"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.75rem', letterSpacing: '0.04em', color: '#8A8A8A' }}
          className="hover:text-[#00068D] transition-colors"
        >
          ← Retour
        </a>
      </header>

      <main className="max-w-[720px] mx-auto px-8 py-12">
        <h1
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em', color: '#0D0D0D' }}
          className="mb-2"
        >
          Mentions légales & protection des données
        </h1>
        <p
          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#8A8A8A', fontSize: '0.85rem' }}
          className="mb-10"
        >
          Mise à jour : mai 2026
        </p>

        <Section title="Responsable du traitement">
          <p>Université Sorbonne Nouvelle – Paris 3</p>
          <p>17 rue de la Sorbonne, 75005 Paris</p>
          <p>SIRET : 197 315 417 00013</p>
        </Section>

        <Section title="Finalité du traitement">
          <p>
            NouveLLM est un service IA pédagogique institutionnel développé dans le cadre du projet{' '}
            <strong>INTEGRIA</strong>, financé par l'ANR au titre du programme France 2030.
          </p>
          <p className="mt-2">
            Le service a pour finalité d'assister les enseignants-chercheurs et étudiants de l'Université
            Sorbonne Nouvelle dans leurs activités pédagogiques et de recherche, via des agents IA spécialisés.
          </p>
        </Section>

        <Section title="Données traitées">
          <ul className="list-disc pl-5 space-y-1">
            <li>Identité et email institutionnel (authentification)</li>
            <li>Conversations et messages échangés avec le service</li>
            <li>Métadonnées d'usage : horodatage, agents utilisés, nombre de tokens (anonymisées dans les rapports)</li>
            <li>Fichiers déposés temporairement pour analyse (non conservés au-delà de la session)</li>
          </ul>
        </Section>

        <Section title="Durée de conservation">
          <p>
            Les conversations sont conservées <strong>12 mois</strong> à compter de leur création, puis supprimées
            automatiquement. Les fichiers déposés sont supprimés immédiatement après traitement.
          </p>
          <p className="mt-2">
            Les données d'authentification sont conservées jusqu'à la suppression du compte.
          </p>
        </Section>

        <Section title="Hébergement">
          <p>
            L'ensemble des données est hébergé <strong>en France</strong>, sur l'infrastructure informatique de
            l'Université Sorbonne Nouvelle (mini PC USN / serveurs internes USN). Aucune donnée n'est transmise à des
            services tiers hors de l'Union Européenne.
          </p>
          <p className="mt-2">
            Le moteur IA est basé sur des modèles open-source déployés localement (infrastructure Dify on-premise).
          </p>
        </Section>

        <Section title="Vos droits">
          <p>Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Accès</strong> : consulter les données vous concernant</li>
            <li><strong>Rectification</strong> : corriger des informations inexactes</li>
            <li><strong>Effacement</strong> : supprimer vos conversations et/ou votre compte depuis les paramètres du compte (icône ⚙ dans l'interface)</li>
            <li><strong>Portabilité</strong> : sur demande au DPO</li>
            <li><strong>Opposition</strong> : s'opposer à certains traitements</li>
          </ul>
          <p className="mt-3">
            Pour exercer vos droits, utilisez directement les paramètres de l'application ou contactez le DPO.
          </p>
        </Section>

        <Section title="Délégué à la Protection des Données (DPO)">
          <p className="italic text-[#8A8A8A]">[À compléter par l'Université Sorbonne Nouvelle avant ouverture au public]</p>
        </Section>

        <Section title="Cookies et traceurs">
          <p>
            NouveLLM utilise uniquement les cookies strictement nécessaires au fonctionnement du service
            (authentification via session JWT). Aucun cookie publicitaire ou de tracking n'est déposé.
          </p>
        </Section>

        <Section title="Contact">
          <p>Pour toute question relative à ce traitement : <a href="mailto:dpo@sorbonne-nouvelle.fr" className="text-[#00068D] underline">dpo@sorbonne-nouvelle.fr</a></p>
        </Section>
      </main>

      <footer
        className="flex items-center justify-between px-8 bg-white border-t border-[#D8D8D8]"
        style={{ height: '40px' }}
      >
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.06em', color: '#8A8A8A' }}>
          UNIVERSITÉ SORBONNE NOUVELLE · INTEGRIA · FRANCE 2030
        </span>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.04em', color: '#00068D', textTransform: 'uppercase' }}
        className="mb-3"
      >
        {title}
      </h2>
      <div
        style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.9rem', color: '#3A3A3A', lineHeight: '1.7' }}
      >
        {children}
      </div>
    </section>
  )
}
