// NouveLLM — Teacher (Enseignant) interface

const { useState: useStateT } = React;

function NLTeacher({ paletteMode = 'at', sidebarOpen = true, density = 'normal' }) {
  const D = window.NL_DATA;
  const user = { name: 'Camille Daniaux', initials: 'CD' };

  const paletteKind = paletteMode === 'at' ? '@' : paletteMode === 'hash' ? '#' : paletteMode === 'help' ? 'help' : null;
  const inputText = paletteMode === 'at' ? '@' :
                    paletteMode === 'hash' ? 'Pour la séance 4, peux-tu me proposer 3 lectures introductives accessibles aux L2 ? Cherche dans #' :
                    paletteMode === 'help' ? '/aide' :
                    'Pour la séance 4, peux-tu me proposer 3 lectures introductives accessibles aux L2 ?';

  const placeholderInput = 'Posez votre question, joignez un document, ou tapez @ pour un agent, # pour une source…';

  return (
    <div className="nl-app">
      <NLHeader user={user} role="Enseignant — UFR Langues" sidebarOpen={sidebarOpen} />
      <div className={`nl-main ${sidebarOpen ? 'nl-main--with-sidebar' : 'nl-main--no-sidebar'}`}>
        <div className="nl-convo">
          <div className="nl-convo-scroll">
            <div className="nl-convo-inner">
              <div className="nl-day-divider">Aujourd’hui · Mardi 6 mai 2026</div>

              {/* Message 1 — user */}
              <NLMessage msg={{
                role: 'user', author: 'Vous', initials: 'CD',
                when: '14:32',
                text: D.TEACHER_THREAD[0].text,
                chips: D.TEACHER_THREAD[0].chips,
              }} />

              {/* Message 2 — system with plan card and sources */}
              <NLMessage msg={D.TEACHER_THREAD[1]} planCard={<NLPlanCard />} />
            </div>
          </div>

          <NLComposer
            paletteKind={paletteKind}
            inputText={inputText}
            agents={D.AGENTS_TEACHER}
            sources={D.SOURCES_TEACHER}
            placeholder={placeholderInput}
            contextChips={paletteMode === 'idle' ? [{ label: '#pédagogie-usn' }] : []}
          />
        </div>

        {sidebarOpen && <NLTeacherSidebar />}
      </div>
      <div className="nl-footer">
        <div>
          <strong>Université Sorbonne Nouvelle</strong> · INTEGRIA · France 2030
        </div>
        <div>
          <a href="#" style={{color:'var(--color-grey-mid)', textDecoration:'none'}}>Conditions d’usage institutionnel</a>
          {' · '}
          <a href="#" style={{color:'var(--color-grey-mid)', textDecoration:'none'}}>Confidentialité</a>
        </div>
      </div>
    </div>
  );
}

function NLTeacherSidebar() {
  const [tab, setTab] = useStateT('espace');
  return (
    <aside className="nl-sidebar">
      <div className="nl-sidebar-tabs">
        <button className="nl-sidebar-tab" data-active={tab==='espace'} onClick={() => setTab('espace')}>Mon espace</button>
        <button className="nl-sidebar-tab" data-active={tab==='convs'}  onClick={() => setTab('convs')}>Conversations</button>
        <button className="nl-sidebar-tab" data-active={tab==='inst'}   onClick={() => setTab('inst')}>Institutionnel</button>
      </div>
      <div className="nl-sidebar-content">
        {tab === 'espace' && <>
          <section className="nl-sidebar-section">
            <div className="nl-sidebar-section-header">
              <div className="nl-sidebar-section-title">Mes sources externes</div>
            </div>
            <div className="nl-connector">
              <span className="nl-connector-logo" style={{background:'#fff', border:'1px solid var(--color-border)'}}>
                <Icon name="drive" size={16} color="#1a73e8" />
              </span>
              <div className="nl-connector-body">
                <div className="nl-connector-name">Google Drive</div>
                <div className="nl-connector-status" data-state="connected">connecté · 1 248 documents</div>
              </div>
              <button className="nl-connector-action" aria-label="Configurer"><Icon name="settings" size={12} /></button>
            </div>
            <div className="nl-connector">
              <span className="nl-connector-logo" style={{background:'#000', color:'#fff'}}>N</span>
              <div className="nl-connector-body">
                <div className="nl-connector-name">Notion</div>
                <div className="nl-connector-status" data-state="off">non connecté</div>
              </div>
              <button className="nl-connector-action">Lier</button>
            </div>
            <div className="nl-connector">
              <span className="nl-connector-logo" style={{background:'#0082c9', color:'#fff'}}>
                <Icon name="cloud" size={16} color="#fff" />
              </span>
              <div className="nl-connector-body">
                <div className="nl-connector-name">Nextcloud USN</div>
                <div className="nl-connector-status" data-state="connected">connecté · 312 documents</div>
              </div>
              <button className="nl-connector-action" aria-label="Configurer"><Icon name="settings" size={12} /></button>
            </div>
          </section>

          <section className="nl-sidebar-section">
            <div className="nl-sidebar-section-header">
              <div className="nl-sidebar-section-title">Mes espaces documentaires</div>
              <button className="nl-sidebar-section-action"><Icon name="plus" size={11} /> Créer</button>
            </div>
            <div className="nl-list-item" data-active="true">
              <span className="nl-list-item-icon"><Icon name="folder" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">Cours L2 — Sociolinguistique</div>
                <div className="nl-list-item-meta">14 docs · maj. il y a 2 j</div>
              </div>
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon"><Icon name="folder" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">Mémoires M2 — direction 2025-26</div>
                <div className="nl-list-item-meta">28 docs · maj. il y a 6 j</div>
              </div>
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon"><Icon name="folder" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">Veille — politiques linguistiques</div>
                <div className="nl-list-item-meta">63 docs · maj. ce matin</div>
              </div>
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon"><Icon name="folder" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">Conseil d’UFR — réunions</div>
                <div className="nl-list-item-meta">9 docs · maj. il y a 1 mois</div>
              </div>
            </div>
          </section>
        </>}

        {tab === 'convs' && <>
          <section className="nl-sidebar-section">
            <div className="nl-conv-group">
              <div className="nl-conv-group-label">Aujourd’hui</div>
              <div className="nl-list-item" data-active="true">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Plan L2 sociolinguistique 12 séances</div>
                  <div className="nl-list-item-meta">il y a quelques minutes</div>
                </div>
              </div>
              <div className="nl-list-item">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Réponse à E. Lambert (CR Conseil scientifique)</div>
                  <div className="nl-list-item-meta">10:14</div>
                </div>
              </div>
            </div>
            <div className="nl-conv-group">
              <div className="nl-conv-group-label">Hier</div>
              <div className="nl-list-item">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Bibliographie M2 — corpus oral catalan</div>
                  <div className="nl-list-item-meta">17:48</div>
                </div>
              </div>
              <div className="nl-list-item">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Sujet partiel — analyse de discours</div>
                  <div className="nl-list-item-meta">15:02</div>
                </div>
              </div>
            </div>
            <div className="nl-conv-group">
              <div className="nl-conv-group-label">Cette semaine</div>
              <div className="nl-list-item">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Briefing CFVU — point INTEGRIA</div>
                  <div className="nl-list-item-meta">vendredi</div>
                </div>
              </div>
              <div className="nl-list-item">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Traduction abstract — colloque Bologne</div>
                  <div className="nl-list-item-meta">jeudi</div>
                </div>
              </div>
              <div className="nl-list-item">
                <span className="nl-list-item-icon"><Icon name="message-square" size={13} /></span>
                <div className="nl-list-item-body">
                  <div className="nl-list-item-title">Veille — débat « simplification linguistique »</div>
                  <div className="nl-list-item-meta">mardi</div>
                </div>
              </div>
            </div>
          </section>
        </>}

        {tab === 'inst' && <>
          <section className="nl-sidebar-section">
            <div className="nl-sidebar-section-header">
              <div className="nl-sidebar-section-title">Espaces institutionnels</div>
              <span style={{
                fontFamily:'var(--font-display)', fontWeight:300, fontSize:10,
                letterSpacing:'0.06em', color:'var(--color-grey-mid)',
                display:'inline-flex', alignItems:'center', gap:4,
              }}>
                <Icon name="lock" size={11} /> lecture seule
              </span>
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon" style={{background:'var(--color-blue-deep)', color:'#fff'}}><Icon name="building" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">Présidence — communications</div>
                <div className="nl-list-item-meta">82 docs · institutionnel</div>
              </div>
              <Icon name="lock" size={12} color="var(--color-grey-mid)" />
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon" style={{background:'var(--color-blue-deep)', color:'#fff'}}><Icon name="book-open" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">UFR Langues, littératures et civilisations étrangères</div>
                <div className="nl-list-item-meta">204 docs · institutionnel</div>
              </div>
              <Icon name="lock" size={12} color="var(--color-grey-mid)" />
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon" style={{background:'var(--color-blue-deep)', color:'#fff'}}><Icon name="graduation-cap" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">CFVU — délibérations 2025-2026</div>
                <div className="nl-list-item-meta">47 docs · institutionnel</div>
              </div>
              <Icon name="lock" size={12} color="var(--color-grey-mid)" />
            </div>
            <div className="nl-list-item">
              <span className="nl-list-item-icon" style={{background:'var(--color-blue-deep)', color:'#fff'}}><Icon name="database" size={13} /></span>
              <div className="nl-list-item-body">
                <div className="nl-list-item-title">DRH — règlements et procédures</div>
                <div className="nl-list-item-meta">131 docs · institutionnel</div>
              </div>
              <Icon name="lock" size={12} color="var(--color-grey-mid)" />
            </div>
          </section>
        </>}
      </div>
    </aside>
  );
}

window.NLTeacher = NLTeacher;
