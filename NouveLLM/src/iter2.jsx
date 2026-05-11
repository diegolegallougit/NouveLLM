// NouveLLM — Itération 2 — new mockups (processing, completed, session, mobile, search)

// ── A. Processing state (Enseignant) ─────────────────────
function NLTeacherProcessing() {
  const D = window.NL_DATA;
  const user = { name: 'Camille Daniaux', initials: 'CD' };

  const processingMsg = {
    role: 'system', agent: 'module', when: 'à l’instant',
  };

  const userMsg = {
    role: 'user', author: 'Vous', initials: 'CD', when: '14:32',
    text: 'Conçois un plan en 12 séances pour mon cours « Sociolinguistique et plurilinguisme » L2 SDL. Utilise #pédagogie-usn et #publications-shs. Joint : maquette SDL 2025-2029.',
    chips: [{ kind:'#', label:'pédagogie-usn' }, { kind:'#', label:'publications-shs' }],
    attachedFile: { name: 'Maquette mention SDL 2025-2029.pdf', size: '2,3 Mo' },
  };

  return (
    <div className="nl-app">
      <NLHeader user={user} role="Enseignant — UFR Langues" sidebarOpen={true} />
      <div className="nl-main nl-main--with-sidebar">
        <div className="nl-convo">
          <div className="nl-convo-scroll">
            <div className="nl-convo-inner">
              <div className="nl-day-divider">Aujourd’hui · Mardi 6 mai 2026</div>
              <NLMessage msg={userMsg} />

              <div className="nl-msg-row">
                <div className="nl-msg-avatar nl-msg-avatar--system">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
                  </svg>
                </div>
                <div className="nl-msg-body">
                  <div className="nl-msg-meta">
                    <strong>NouveLLM</strong>
                    <span>à l’instant</span>
                    <span style={{marginLeft:8}}>· agent <span className="nl-mention">@module</span></span>
                  </div>
                  <NLProcessing
                    agent="module"
                    currentStep={2}
                    totalSteps={4}
                    steps={[
                      { state: 'done',    text: 'Analyse du syllabus fourni', meta: '2,3 Mo · 38 p' },
                      { state: 'done',    text: 'Consultation de #pédagogie-usn',  meta: '8 extraits pertinents' },
                      { state: 'current', text: 'Recherche dans #publications-shs', meta: '12 / 218 k' },
                      { state: 'pending', text: 'Structuration du plan en 12 séances' },
                    ]} />
                </div>
              </div>
            </div>
          </div>

          <NLComposer paletteKind={null} inputText=""
                      agents={D.AGENTS_TEACHER} sources={D.SOURCES_TEACHER}
                      contextChips={[{label:'#pédagogie-usn'}, {label:'#publications-shs'}]} />
        </div>
        <NLTeacherSidebar />
      </div>
      <div className="nl-footer">
        <div><strong>Université Sorbonne Nouvelle</strong> · INTEGRIA · France 2030</div>
        <div>Réponse en cours · 18 s restantes</div>
      </div>
    </div>
  );
}

// ── B. Completed response with action bar (Enseignant) ───
function NLTeacherCompleted() {
  const D = window.NL_DATA;
  const user = { name: 'Camille Daniaux', initials: 'CD' };

  const userMsg = {
    role: 'user', author: 'Vous', initials: 'CD', when: '14:32',
    text: 'Conçois un plan en 12 séances pour mon cours « Sociolinguistique et plurilinguisme » L2 SDL. Utilise #pédagogie-usn et #publications-shs.',
    chips: [{ kind:'#', label:'pédagogie-usn' }, { kind:'#', label:'publications-shs' }],
  };
  const systemMsg = {
    role: 'system', agent: 'module', when: 'il y a 12 s',
    text: 'plan-card',
    showActions: true, primaryDocx: true,
    sources: [
      { tag:'#pédagogie-usn',  title:'Maquette mention Sciences du langage 2025-2029.pdf — p. 14', icon:'book-open', domain:'sorbonne-nouvelle.fr' },
      { tag:'#pédagogie-usn',  title:'Référentiel L2 SDL — UE Sociolinguistique.docx',             icon:'file-text', domain:'sorbonne-nouvelle.fr' },
      { tag:'#publications-shs', title:'Joussemet, F. (2025). InitIAtion à la sociolinguistique en L2.', icon:'file-text', domain:'hal.science' },
      { group:true, title:'Publications académiques — corpus HAL-SHS', count:2, icon:'database' },
    ],
  };

  return (
    <div className="nl-app">
      <NLHeader user={user} role="Enseignant — UFR Langues" sidebarOpen={true} />
      <div className="nl-main nl-main--with-sidebar">
        <div className="nl-convo">
          <div className="nl-convo-scroll">
            <div className="nl-convo-inner">
              <div className="nl-day-divider">Aujourd’hui · Mardi 6 mai 2026</div>
              <NLMessage msg={userMsg} />
              <NLMessage msg={systemMsg} planCard={<NLPlanCard />} />
            </div>
          </div>
          <NLComposer paletteKind={null} agents={D.AGENTS_TEACHER} sources={D.SOURCES_TEACHER} />
        </div>
        <NLTeacherSidebar />
      </div>
      <div className="nl-footer">
        <div><strong>Université Sorbonne Nouvelle</strong> · INTEGRIA · France 2030</div>
        <div><a href="#" style={{color:'var(--color-grey-mid)', textDecoration:'none'}}>Conditions d’usage institutionnel</a></div>
      </div>
    </div>
  );
}

// ── C. Session de cours mode (Étudiant) ──────────────────
function NLStudentSession() {
  const user = { name: 'Yasmine Belkacem', initials: 'YB' };

  // Session-specific tools (replace student @-palette)
  const sessionAgents = [
    { key:'analyse-source', icon:'sparkle', name:'analyse-source', desc:'Analyser un passage du texte source de l’activité.' },
    { key:'glossaire',      icon:'languages', name:'glossaire', desc:'Construire le glossaire bilingue de l’activité.' },
    { key:'commentaire',    icon:'edit', name:'commentaire', desc:'Rédiger un commentaire traductologique guidé.' },
  ];

  const sessionThread = [
    {
      role: 'system', agent: 'session', when: '11:02',
      html: `<p style="margin:0">Bonjour&nbsp;Yasmine. Cette session est encadrée par votre enseignante, Camille&nbsp;Daniaux. L’activité du jour&nbsp;: <strong>analyse comparée d’un extrait de Walter&nbsp;Benjamin, <em>Die Aufgabe des Übersetzers</em></strong>. Le texte source et la consigne sont déjà chargés dans le contexte.</p>`,
      sources: [
        { tag:'#session', title:'Benjamin (1923). Die Aufgabe des Übersetzers — extrait, p. 9-12.', icon:'file-text', domain:'session de cours' },
        { tag:'#session', title:'Consigne d’activité — Mme Daniaux.docx', icon:'file-text', domain:'session de cours' },
      ],
    },
    {
      role: 'user', author: 'Vous', initials: 'YB', when: '11:08',
      text: 'Je n’arrive pas à saisir la nuance entre « reine Sprache » et « langue pure ». Peux-tu m’aider à analyser ce passage avant que je rédige mon commentaire ?',
    },
    {
      role: 'system', agent: 'analyse-source', when: 'à l’instant',
      html: `
        <p>Bonne question — le passage est notoirement difficile. Trois pistes d’analyse, à articuler dans votre commentaire&nbsp;:</p>
        <ol>
          <li><strong>« reine Sprache »</strong> ne désigne pas une langue empirique mais une <em>visée</em>&nbsp;: ce que les langues humaines, prises ensemble, désignent sans qu’aucune ne l’atteigne.</li>
          <li>La traduction française usuelle <em>« langue pure »</em> fixe trop. Berman propose <em>« langue de pure visée »</em>&nbsp;; d’autres conservent l’allemand.</li>
          <li>Dans la consigne de Mme&nbsp;Daniaux, on attend une analyse du <strong>geste de désignation</strong>, non une définition lexicale.</li>
        </ol>
        <p>Procédez en commentaire&nbsp;: passez du mot (« reine ») au champ conceptuel (totalité, intentionnalité), puis aux choix du traducteur.</p>
      `,
      sources: [
        { tag:'#session', title:'Benjamin (1923) — extrait, paragraphe §4', icon:'file-text', domain:'session de cours' },
        { tag:'#bibliothèques-usn', title:'Berman, A. (1984). L’épreuve de l’étranger, ch. VIII.', icon:'book', domain:'bu.sorbonne-nouvelle.fr' },
      ],
    },
  ];

  return (
    <div className="nl-app" style={{gridTemplateRows: '56px 44px 1fr 28px'}}>
      <NLHeader user={user} role="Étudiante — M1 Études romanes" sidebarOpen={false} showSidebarToggle={false} />

      <div className="nl-session-banner">
        <span className="nl-session-banner-tag">Session</span>
        <span className="nl-session-banner-title">
          Traductologie M1 · Prof. Camille Daniaux · <span style={{opacity:0.75}}>Activité&nbsp;: Analyse de texte source</span>
        </span>
        <span style={{
          fontFamily:'var(--font-display)', fontWeight:300, fontSize:11,
          letterSpacing:'0.06em', color:'rgba(255,255,255,0.65)',
        }}>code&nbsp;: <strong style={{fontWeight:800, color:'#fff', letterSpacing:'0.06em'}}>TRAD-M1-2026</strong></span>
        <button className="nl-session-banner-exit">Quitter la session</button>
      </div>

      <div className="nl-main nl-main--no-sidebar">
        <div className="nl-convo">
          <div className="nl-convo-scroll">
            <div className="nl-convo-inner">
              <div className="nl-context-strip">
                <span className="nl-context-strip-icon"><Icon name="graduation-cap" size={18} /></span>
                <div className="nl-context-strip-body">
                  <div className="nl-context-strip-eyebrow">Contexte de session · pré-configuré par l’enseignante</div>
                  <div className="nl-context-strip-title">Analyse comparée — Walter Benjamin, <em>Die Aufgabe des Übersetzers</em></div>
                  <p>Comparez l’extrait source (§4, p. 9-12) à deux traductions françaises au choix. Repérez les choix lexicaux marquants et justifiez-les en 600 mots.</p>
                  <p className="nl-context-strip-locked"><Icon name="lock" size={11} /> Contexte verrouillé · sources et activité ne sont pas modifiables</p>
                </div>
              </div>
              {sessionThread.map((m, i) => <NLMessage key={i} msg={m} />)}
            </div>
          </div>

          <NLComposer paletteKind={null}
                      agents={sessionAgents}
                      sources={[{ key:'session', icon:'graduation-cap', name:'session', desc:'Documents fournis pour cette activité.', count:5, scope:'Cours' }]}
                      placeholder="Posez votre question sur l’activité · @ outils de session · ⌘↵ envoyer" />
        </div>
      </div>

      <div className="nl-footer">
        <div><strong>Université Sorbonne Nouvelle</strong> · INTEGRIA · France 2030</div>
        <div style={{
          fontFamily:'var(--font-display)', fontWeight:300, fontSize:11,
          color:'var(--color-grey-mid)', letterSpacing:'0.04em',
        }}>
          <Icon name="lock" size={10} style={{verticalAlign:'middle', marginRight:4}} />
          Crédit individuel non décompté en session · porté par l’EC
        </div>
      </div>
    </div>
  );
}

// ── D. Mobile student (390 × 844) ────────────────────────
function NLStudentMobile({ sheetOpen = true }) {
  return (
    <div className="nl-mobile">
      <div className="nl-mobile-statusbar">
        <span>9:41</span>
        <span className="nl-mobile-statusbar-icons">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
            <rect x="0" y="6" width="2" height="4" rx="0.5"/>
            <rect x="4" y="4" width="2" height="6" rx="0.5"/>
            <rect x="8" y="2" width="2" height="8" rx="0.5"/>
            <rect x="12" y="0" width="2" height="10" rx="0.5"/>
          </svg>
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="18" height="9" rx="2"/>
            <rect x="2" y="2" width="13" height="6" fill="currentColor"/>
            <rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
          </svg>
        </span>
      </div>
      <div className="nl-mobile-header">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="nl-mobile-logo">NouveLLM</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className="nl-mobile-tool" aria-label="Nouvelle conversation">
            <Icon name="plus" size={18} />
          </button>
          <span className="nl-user-avatar" style={{width:32,height:32,fontSize:12}}>YB</span>
        </div>
      </div>

      <div className="nl-mobile-convo">
        <div className="nl-mobile-day-divider">Aujourd’hui · 11:08</div>

        <div className="nl-mobile-bubble nl-mobile-bubble--user">
          <div className="nl-mobile-meta"><strong>Vous</strong></div>
          Comment citer un document officiel publié sur le site de l’université en APA 7&nbsp;?
        </div>

        <div className="nl-mobile-bubble nl-mobile-bubble--system">
          <div className="nl-mobile-meta"><strong>NouveLLM</strong> · agent <span className="nl-mention" style={{fontSize:10,padding:'0 4px'}}>@rédaction</span></div>
          <div>
            En APA 7<sup>e</sup>, l’université est <strong>auteur principal</strong>. Forme&nbsp;:<br/>
            <span style={{
              display:'block',
              background:'var(--color-off-white)',
              borderLeft:'3px solid var(--color-blue-deep)',
              padding:'8px 10px', marginTop:6, fontStyle:'italic', fontSize:13,
            }}>
              Université Sorbonne Nouvelle. (Année). <em>Titre exact</em>. https://www.sorbonne-nouvelle.fr/…
            </span>
          </div>
          <div className="nl-mobile-sources">
            <a className="nl-mobile-source" href="#">
              <Icon name="book" size={12} className="nl-mobile-source-icon" color="var(--color-grey-mid)" />
              <span>Guide APA 7 — BU Censier (2025)</span>
              <span className="nl-mobile-source-domain">bu.sorbonne-nouvelle.fr</span>
            </a>
            <a className="nl-mobile-source" href="#">
              <Icon name="building" size={12} className="nl-mobile-source-icon" color="var(--color-grey-mid)" />
              <span>Charte de citation USN — DSI</span>
              <span className="nl-mobile-source-domain">sorbonne-nouvelle.fr</span>
            </a>
          </div>
        </div>
      </div>

      <div className="nl-mobile-composer">
        <div className="nl-mobile-input">
          <input placeholder="Posez votre question…" />
          <button className="nl-mobile-send" aria-label="Envoyer">
            <Icon name="arrow-up" size={16} />
          </button>
        </div>
        <div className="nl-mobile-toolbar">
          <button className="nl-mobile-tool" aria-label="Agents (@)"><Icon name="at" size={16}/></button>
          <button className="nl-mobile-tool" data-active={sheetOpen} aria-label="Sources (#)"><Icon name="hash" size={16}/></button>
          <button className="nl-mobile-tool" aria-label="Joindre"><Icon name="paperclip" size={16}/></button>
          <span style={{flex:1}}/>
          <span style={{
            fontFamily:'var(--font-display)', fontWeight:800, fontSize:10,
            color:'var(--color-grey-mid)', letterSpacing:'0.06em',
          }}>⌘↵ ENVOYER</span>
        </div>
      </div>

      <div className="nl-mobile-footer">
        <span><strong>Sorbonne Nouvelle</strong> · INTEGRIA</span>
        <span className="nl-credit-label" style={{fontSize:11}}>Crédit : <strong>97 %</strong></span>
      </div>

      {sheetOpen && <>
        <div className="nl-bottomsheet-overlay" />
        <div className="nl-bottomsheet">
          <div className="nl-bottomsheet-grip" />
          <div className="nl-bottomsheet-header">
            <span className="nl-bottomsheet-title">Sources institutionnelles</span>
            <button className="nl-mobile-tool" aria-label="Fermer"><Icon name="x" size={16} /></button>
          </div>
          <div className="nl-bottomsheet-sub">Choisissez une base pour cette question.</div>
          <div className="nl-bottomsheet-search">
            <span className="nl-bottomsheet-search-icon"><Icon name="search" size={14}/></span>
            <input placeholder="Rechercher une source…" />
          </div>
          <div className="nl-bottomsheet-scroll">
            {window.NL_DATA.SOURCES_STUDENT.map((s, i) => (
              <button key={s.key} className="nl-palette-item" data-selected={i===0}>
                <span className="nl-palette-icon" data-variant="source"><Icon name={s.icon} size={18}/></span>
                <span className="nl-palette-body">
                  <span className="nl-palette-name"><span className="nl-palette-name-prefix">#</span>{s.name}</span>
                  <span className="nl-palette-desc">{s.desc}</span>
                </span>
                <span className="nl-palette-meta">{s.count} docs</span>
              </button>
            ))}
          </div>
        </div>
      </>}
    </div>
  );
}

// ── E. Search history (Enseignant) ────────────────────────
function NLTeacherSearch() {
  const D = window.NL_DATA;
  const user = { name: 'Camille Daniaux', initials: 'CD' };
  const term = 'sociolinguistique';
  const hi = (t) => {
    const idx = t.toLowerCase().indexOf(term);
    if (idx === -1) return t;
    return <>{t.slice(0, idx)}<mark className="nl-hl">{t.slice(idx, idx + term.length)}</mark>{t.slice(idx + term.length)}</>;
  };

  const results = [
    { date: 'Aujourd’hui · 14:32', agent:'module', title:'Plan L2 sociolinguistique 12 séances',
      excerpt:'Pourrais-tu me proposer un plan en 12 séances pour un cours de Licence 2 intitulé « Sociolinguistique et plurilinguisme »…' },
    { date: 'Hier · 17:48', agent:'bibliographie', title:'Bibliographie M2 — corpus oral catalan',
      excerpt:'Construire une bibliographie introductive en sociolinguistique du contact, niveau M2, articulée autour du catalan…' },
    { date: '4 mai · 09:12', agent:'examen', title:'Sujet partiel — sociolinguistique L3',
      excerpt:'Proposer un sujet de partiel sur 4 h pour le cours de sociolinguistique L3, en 3 exercices équilibrés…' },
    { date: '28 avril · 11:30', agent:'analyse', title:'Note de lecture — Gadet, « La variation sociale »',
      excerpt:'Note de lecture critique sur l’ouvrage de F. Gadet, en lien avec mon cours de sociolinguistique. 800 mots…' },
  ];

  return (
    <div className="nl-app">
      <NLHeader user={user} role="Enseignant — UFR Langues" sidebarOpen={true} />
      <div className="nl-main nl-main--with-sidebar">
        <div className="nl-convo">
          <div className="nl-convo-scroll">
            <div className="nl-convo-inner">
              <div className="nl-day-divider">Aujourd’hui · Mardi 6 mai 2026</div>
              <NLMessage msg={{
                role: 'user', author: 'Vous', initials: 'CD', when: '14:32',
                text: 'Pourrais-tu me proposer un plan en 12 séances pour un cours de Licence 2 intitulé « Sociolinguistique et plurilinguisme » ?',
              }} />
              <NLMessage msg={{
                role:'system', agent:'module', when:'14:33', text:'plan-card',
                sources: [
                  { tag:'#pédagogie-usn', title:'Maquette mention Sciences du langage 2025-2029.pdf — p. 14', icon:'book-open', domain:'sorbonne-nouvelle.fr' },
                  { tag:'#pédagogie-usn', title:'Référentiel L2 SDL — UE Sociolinguistique.docx', icon:'file-text', domain:'sorbonne-nouvelle.fr' },
                ],
              }} planCard={<NLPlanCard />} />
            </div>
          </div>
          <NLComposer paletteKind={null} agents={D.AGENTS_TEACHER} sources={D.SOURCES_TEACHER} />
        </div>

        {/* Search sidebar */}
        <aside className="nl-sidebar">
          <div className="nl-sidebar-tabs">
            <button className="nl-sidebar-tab">Mon espace</button>
            <button className="nl-sidebar-tab" data-active="true">Conversations</button>
            <button className="nl-sidebar-tab">Institutionnel</button>
          </div>
          <div className="nl-sidebar-content">
            <div className="nl-sidebar-search">
              <span className="nl-sidebar-search-icon"><Icon name="search" size={14}/></span>
              <input placeholder="Rechercher dans mes conversations…" defaultValue="sociolinguistique" />
            </div>
            <div style={{
              fontFamily:'var(--font-display)', fontWeight:300, fontSize:11,
              letterSpacing:'0.08em', textTransform:'uppercase',
              color:'var(--color-grey-mid)', marginBottom:8,
            }}>
              {results.length} résultats · 30 derniers jours
            </div>
            {results.map((r, i) => (
              <div key={i} className="nl-search-result">
                <div className="nl-search-result-meta">
                  <span>{r.date}</span>
                  <span className="nl-mention">@{r.agent}</span>
                </div>
                <div className="nl-search-result-title">{hi(r.title)}</div>
                <div className="nl-search-result-excerpt">{hi(r.excerpt)}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <div className="nl-footer">
        <div><strong>Université Sorbonne Nouvelle</strong> · INTEGRIA · France 2030</div>
        <div><a href="#" style={{color:'var(--color-grey-mid)', textDecoration:'none'}}>Conditions d’usage institutionnel</a></div>
      </div>
    </div>
  );
}

window.NLTeacherProcessing = NLTeacherProcessing;
window.NLTeacherCompleted = NLTeacherCompleted;
window.NLStudentSession = NLStudentSession;
window.NLStudentMobile = NLStudentMobile;
window.NLTeacherSearch = NLTeacherSearch;
