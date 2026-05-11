// NouveLLM — Étudiant interface

const { useState: useStateS } = React;

function NLStudent({ paletteMode = 'hash', showOnboarding = false, sessionMode = false, density = 'normal' }) {
  const D = window.NL_DATA;
  const user = { name: 'Yasmine Belkacem', initials: 'YB' };

  const paletteKind = paletteMode === 'at' ? '@' : paletteMode === 'hash' ? '#' : paletteMode === 'help' ? 'help' : null;

  const inputText =
    paletteMode === 'at'   ? '@' :
    paletteMode === 'hash' ? 'Pour mon mémoire de M1 sur la diaspora arménienne en France, où trouver les sources institutionnelles francophones ? Cherche dans #' :
    paletteMode === 'help' ? '/aide' :
    'Pour mon mémoire de M1, où trouver des sources institutionnelles francophones sur la diaspora arménienne en France ?';

  const studentThread = [
    {
      role: 'user', author: 'Vous', initials: 'YB',
      when: '11:08',
      text: 'Bonjour, je rends un dossier en méthodologie cette semaine. Comment citer un document officiel publié sur le site de l’université, dans le style APA 7e édition ?',
    },
    {
      role: 'system',
      agent: 'rédaction',
      when: 'à l’instant',
      html: `
        <p>En APA 7<sup>e</sup> édition, un document institutionnel publié en ligne par l’université se cite comme suit&nbsp;:</p>
        <p style="background:var(--color-off-white); border-left:3px solid var(--color-blue-deep); padding:10px 14px; font-size:14.5px; font-style:italic;">
          Université Sorbonne Nouvelle. (Année). <em>Titre exact du document</em> (Document n° X). https://www.sorbonne-nouvelle.fr/...
        </p>
        <p>Trois précisions importantes&nbsp;:</p>
        <ol>
          <li>Le nom institutionnel se met en <strong>auteur principal</strong>, sans abréviation (pas «&nbsp;USN&nbsp;»).</li>
          <li>Si une direction ou un service précis est l’auteur, il devient sous-auteur après l’université.</li>
          <li>L’URL doit pointer vers la page d’origine, pas vers un PDF re-hébergé.</li>
        </ol>
      `,
      sources: [
        { tag: '#bibliothèques-usn', title: 'Guide APA 7 — BU Censier (édition 2025).pdf', icon: 'book' },
        { tag: '#services-usn', title: 'Charte de citation des publications USN — DSI', icon: 'building' },
      ],
    },
  ];

  return (
    <div className="nl-app">
      <NLHeader user={user} role="Étudiante — M1 Études romanes" sidebarOpen={false} showSidebarToggle={false} />

      {sessionMode && (
        <div className="nl-session-banner" style={{
          gridColumn: '1 / -1',
        }}>
          <span className="nl-session-banner-tag">Session de cours</span>
          <span className="nl-session-banner-title">SOC-L2-04 · Sociolinguistique et plurilinguisme — séance 4 · Mme Daniaux</span>
          <span style={{
            fontFamily:'var(--font-display)', fontWeight:300, fontSize:11,
            letterSpacing:'0.06em', color:'rgba(255,255,255,0.65)',
          }}>contexte du cours chargé · 14 documents</span>
          <button className="nl-session-banner-exit">Quitter</button>
        </div>
      )}

      <div className="nl-main nl-main--no-sidebar">
        <div className="nl-convo">
          <div className="nl-convo-scroll">
            <div className="nl-convo-inner">
              <div className="nl-day-divider">Aujourd’hui · Mardi 6 mai 2026</div>
              {studentThread.map((m, i) => <NLMessage key={i} msg={m} />)}
            </div>
          </div>

          <NLComposer
            paletteKind={paletteKind}
            inputText={inputText}
            agents={D.AGENTS_STUDENT}
            sources={D.SOURCES_STUDENT}
            placeholder="Posez votre question, ou tapez @ pour un agent, # pour une source institutionnelle…"
          />
        </div>
      </div>

      <div className="nl-footer">
        <div>
          <strong>Université Sorbonne Nouvelle</strong> · INTEGRIA · France 2030
        </div>
        <div className="nl-credit">
          <span className="nl-credit-label">Crédit disponible ce mois&nbsp;: <strong>97&nbsp;%</strong></span>
          <span className="nl-credit-bar"><span className="nl-credit-bar-fill" style={{width:'97%'}} /></span>
          <a className="nl-footer-quota-link" href="#" style={{fontSize:11}}>Recharge sur demande</a>
        </div>
      </div>

      {showOnboarding && <NLOnboarding />}
    </div>
  );
}

function NLOnboarding() {
  const [step, setStep] = useStateS(2);
  const [pick, setPick] = useStateS(null);

  const steps = 4;
  const stepData = {
    1: {
      step: 'Étape 1 / 4 · Bienvenue',
      q: 'NouveLLM est un assistant institutionnel. Comment l’utiliser ?',
      text: 'NouveLLM produit des réponses sourcées à partir de documents officiels de l’université. C’est un outil d’aide — pas un substitut à votre travail intellectuel.',
      options: [],
      cta: 'Commencer le parcours',
    },
    2: {
      step: 'Étape 2 / 4 · Cadre académique',
      q: 'Vous rendez un travail noté. Vous demandez à NouveLLM d’en rédiger l’introduction. Que faites-vous du texte produit ?',
      text: 'Une seule réponse est conforme au cadre académique de l’USN.',
      options: [
        { letter: 'A', text: 'Je le copie tel quel : c’est l’assistant officiel de l’université, donc il est validé.' },
        { letter: 'B', text: 'Je m’en inspire pour structurer mes idées, je le réécris avec mes propres mots, et je cite NouveLLM si je reprends une formulation.' },
        { letter: 'C', text: 'Je le traduis dans une autre langue puis le retraduis pour masquer l’origine.' },
      ],
      correct: 'B',
      cta: 'Étape suivante',
    },
    3: {
      step: 'Étape 3 / 4 · Sources et vérification',
      q: 'Chaque réponse de NouveLLM affiche des sources cliquables. Pourquoi ?',
      text: '',
      options: [
        { letter: 'A', text: 'Pour la décoration : ça donne un aspect officiel à la réponse.' },
        { letter: 'B', text: 'Pour pouvoir vérifier la réponse à la source. Vous êtes responsable de cette vérification avant tout usage académique.' },
        { letter: 'C', text: 'Parce que la loi l’oblige uniquement pour les bibliothèques universitaires.' },
      ],
      correct: 'B',
      cta: 'Étape suivante',
    },
    4: {
      step: 'Étape 4 / 4 · Engagement',
      q: 'Avant d’accéder à NouveLLM, je m’engage à :',
      text: '',
      options: [
        { letter: '1', text: 'Vérifier les sources avant de citer une réponse dans un travail noté.' },
        { letter: '2', text: 'Mentionner l’usage de NouveLLM dans mes travaux, conformément à la charte de l’université.' },
        { letter: '3', text: 'Ne pas soumettre de données personnelles d’autres étudiant·es ou personnels USN.' },
      ],
      cta: 'J’accepte et accède à NouveLLM',
    },
  };

  const cur = stepData[step];

  return (
    <div className="nl-onboarding">
      <div className="nl-onboarding-card">
        <div className="nl-onboarding-head">
          <div className="nl-onboarding-eyebrow">Première connexion · Parcours obligatoire</div>
          <h2 className="nl-onboarding-title">Avant d’utiliser NouveLLM, parlons cadre.</h2>
          <div className="nl-onboarding-trap">
            <TrapMotif size={26} color="#fff" opacity={1} cols={3} rows={3} />
          </div>
        </div>
        <div className="nl-onboarding-body">
          <div className="nl-onboarding-step">{cur.step}</div>
          <div className="nl-onboarding-q">{cur.q}</div>
          {cur.text && <p className="nl-onboarding-text">{cur.text}</p>}
          {cur.options.length > 0 && (
            <div className="nl-onboarding-options">
              {cur.options.map(o => (
                <button key={o.letter}
                        className="nl-onboarding-option"
                        data-selected={pick === o.letter}
                        onClick={() => setPick(o.letter)}>
                  <span className="nl-onboarding-option-letter">{o.letter}</span>
                  <span>{o.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="nl-onboarding-foot">
          <div className="nl-onboarding-progress">
            {[1,2,3,4].map(s => (
              <span key={s} className="nl-onboarding-progress-dot" data-on={s <= step} />
            ))}
          </div>
          <div style={{display:'flex', gap:8}}>
            {step > 1 && <button className="nl-btn-secondary" onClick={() => setStep(s => Math.max(1, s-1))}>Retour</button>}
            <button className="nl-btn-primary"
                    onClick={() => { setPick(null); setStep(s => Math.min(steps, s+1)); }}>
              {cur.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini trap motif for onboarding banner
function TrapMotif({ size = 18, color = '#fff', opacity = 1, cols = 3, rows = 3 }) {
  const h = size * 1.2;
  const gap = Math.round(size * 0.13);
  const items = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const flip = (r + c) % 2 === 1;
      items.push(
        <div key={`${r}-${c}`} style={{
          width: size, height: h, background: color,
          clipPath: flip
            ? 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)'
            : 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
        }} />
      );
    }
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, ${size}px)`, gap, opacity }}>
      {items}
    </div>
  );
}

window.NLStudent = NLStudent;
window.NLTrapMotif = TrapMotif;
