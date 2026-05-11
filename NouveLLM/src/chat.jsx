// NouveLLM — Shared chat building blocks (header, message rendering, palettes, sidebar pieces)

const { useState, useRef, useEffect, useMemo } = React;

// ── Header ───────────────────────────────────────────────
function NLHeader({ user, role = 'Enseignant', onToggleSidebar, sidebarOpen = true, showSidebarToggle = true }) {
  return (
    <header className="nl-header">
      <div className="nl-header-left">
        <span className="nl-logo">NouveLLM</span>
        <span className="nl-logo-divider" />
        <span className="nl-header-tagline">Université Sorbonne Nouvelle</span>
      </div>
      <div className="nl-header-right">
        <button className="nl-icon-btn" aria-label="Aide">
          <Icon name="help" size={18} />
        </button>
        <button className="nl-icon-btn" aria-label="Notifications">
          <Icon name="bell" size={18} />
        </button>
        <button className="nl-icon-btn" aria-label="Paramètres">
          <Icon name="settings" size={18} />
        </button>
        <span className="nl-user-chip">
          <span className="nl-user-avatar">{user.initials}</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
            <span className="nl-user-name">{user.name}</span>
            <span className="nl-user-role">{role}</span>
          </span>
        </span>
        {showSidebarToggle && (
          <button className="nl-icon-btn"
            data-active={sidebarOpen}
            onClick={onToggleSidebar}
            aria-label="Espace personnel"
            title="Espace personnel"
          >
            <Icon name={sidebarOpen ? 'panel' : 'panel-collapsed'} size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

// ── Message bubbles ──────────────────────────────────────
function NLMessage({ msg, planCard }) {
  const isUser = msg.role === 'user';
  return (
    <div className="nl-msg-row">
      <div className={`nl-msg-avatar ${isUser ? 'nl-msg-avatar--user' : 'nl-msg-avatar--system'}`}>
        {isUser ? msg.initials || 'CD' : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 3v18M3 12h18" />
            <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
          </svg>
        )}
      </div>
      <div className="nl-msg-body">
        <div className="nl-msg-meta">
          <strong>{isUser ? (msg.author || 'Vous') : 'NouveLLM'}</strong>
          <span>{msg.when}</span>
          {!isUser && msg.agent && <span style={{marginLeft:8}}>· agent <span className="nl-mention">@{msg.agent}</span></span>}
        </div>

        {msg.attachedFile && (
          <div className="nl-attached-file">
            <span className="nl-attached-file-icon">PDF</span>
            <span className="nl-attached-file-name">{msg.attachedFile.name}</span>
            <span className="nl-attached-file-size">{msg.attachedFile.size}</span>
          </div>
        )}

        {msg.chips && msg.chips.length > 0 && msg.role === 'user' && msg.text && (
          <div className="nl-msg-content">
            <NLRichText text={msg.text} chips={msg.chips} />
          </div>
        )}

        {msg.text === 'plan-card' && planCard}

        {msg.role === 'system' && msg.html && (
          <div className="nl-msg-content" dangerouslySetInnerHTML={{ __html: msg.html }} />
        )}

        {msg.sources && msg.sources.length > 0 && <NLSources sources={msg.sources} />}
        {msg.showActions && <NLActionBar primaryDocx={msg.primaryDocx} />}
      </div>
    </div>
  );
}

function NLSources({ sources }) {
  return (
    <div className="nl-sources">
      <div className="nl-sources-label">Sources consultées</div>
      <div className="nl-source-list">
        {sources.map((s, i) => s.group ? (
          <div key={i} className="nl-source-group-line">
            <span className="nl-source-group-icon"><Icon name={s.icon || 'database'} size={12} /></span>
            <span>{s.title}</span>
            <span className="nl-source-domain">{s.count} extraits</span>
          </div>
        ) : (
          <a key={i} className="nl-source" href="#" onClick={e => e.preventDefault()}>
            <span className="nl-source-icon"><Icon name={s.icon || 'file-text'} size={13} /></span>
            <span className="nl-source-main">
              <span className="nl-source-title-line">
                {s.tag && <span className="nl-source-tag-pill">{s.tag}</span>}
                <span className="nl-source-title">{s.title}</span>
              </span>
            </span>
            <span className="nl-source-domain">{s.domain || '→'}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function NLActionBar({ primaryDocx = false }) {
  return (
    <div className="nl-actions" role="toolbar" aria-label="Actions sur la réponse">
      <button className="nl-action" aria-label="Copier la réponse">
        <Icon name="file-text" size={13} /> Copier
      </button>
      <button className="nl-action" data-primary={primaryDocx} aria-label="Télécharger DOCX">
        <Icon name="upload" size={13} style={{transform:'rotate(180deg)'}} /> Télécharger DOCX
      </button>
      <button className="nl-action" aria-label="Régénérer la réponse">
        <Icon name="sparkle" size={13} /> Régénérer
      </button>
      <button className="nl-action nl-action-icon-only" aria-label="Réponse utile">
        <Icon name="check" size={14} />
      </button>
      <button className="nl-action nl-action-icon-only" aria-label="Réponse à améliorer">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function NLProcessing({ agent = 'module', currentStep = 2, totalSteps = 4, steps = [] }) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="nl-processing">
      <div className="nl-processing-head">
        <span className="nl-processing-tag">
          <span className="nl-processing-spinner" />
          NouveLLM · agent <span className="nl-mention" style={{fontSize:11,padding:'1px 5px',marginLeft:2}}>@{agent}</span>
        </span>
        <span className="nl-processing-step"><strong>Étape {currentStep}/{totalSteps}</strong></span>
      </div>
      <div className="nl-processing-progress">
        <div className="nl-processing-progress-fill" style={{width:`${pct}%`}} />
      </div>
      <div className="nl-processing-steps">
        {steps.map((s, i) => (
          <div key={i} className="nl-step-line" data-state={s.state}>
            <span className="nl-step-glyph">
              {s.state === 'done' ? '✓' : s.state === 'current' ? '⟳' : '•'}
            </span>
            <span style={{flex:1}}>{s.text}</span>
            {s.meta && <span className="nl-step-line-meta">{s.meta}</span>}
          </div>
        ))}
      </div>
      <div className="nl-processing-foot">
        <span>Patientez, structuration en cours… <span style={{color:'var(--color-grey-mid)'}}>environ 18 secondes restantes</span></span>
        <button className="nl-cancel">Annuler</button>
      </div>
    </div>
  );
}

// Render text where #foo and @foo become highlighted mentions
function NLRichText({ text }) {
  const parts = useMemo(() => {
    const out = [];
    const re = /([@#][\wÀ-ÿ-]+)/g;
    let last = 0; let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: 'txt', v: text.slice(last, m.index) });
      out.push({ t: 'mention', v: m[1] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: 'txt', v: text.slice(last) });
    return out;
  }, [text]);
  return (
    <p>
      {parts.map((p, i) => p.t === 'mention'
        ? <span key={i} className="nl-mention">{p.v}</span>
        : <React.Fragment key={i}>{p.v}</React.Fragment>)}
    </p>
  );
}

// ── Course-plan card (rich content inside system message) ─
function NLPlanCard() {
  const sessions = [
    ['1', 'Introduction. Qu’est-ce que la sociolinguistique ?', 'Champ, méthodes, articulations avec la sociologie du langage.'],
    ['2', 'Variation linguistique : axes diatopique, diastratique, diaphasique', 'Lectures : Labov 1972, Gadet 2007.'],
    ['3', 'Communautés de pratique et réseaux sociaux', 'Études de cas francophones et anglophones.'],
    ['4', 'Plurilinguisme individuel et sociétal', 'Définitions, typologies, contextes européens.'],
    ['5', 'Politiques linguistiques et droits linguistiques', 'Cas comparés : Belgique, Catalogne, Québec, Maghreb.'],
    ['6', 'Contacts de langues et alternance codique', 'TD : analyse de corpus oraux.'],
  ];
  return (
    <div className="nl-plan-card">
      <div className="nl-plan-card-header">
        <span className="nl-plan-card-title">L2 Sciences du langage — Sociolinguistique et plurilinguisme</span>
        <span className="nl-plan-card-meta">12 séances · 24 h CM · S3</span>
      </div>
      {sessions.map(([n, t, s]) => (
        <div key={n} className="nl-plan-row">
          <div className="nl-plan-row-num">SÉANCE {n}</div>
          <div>
            <div className="nl-plan-row-title">{t}</div>
            <div className="nl-plan-row-sub">{s}</div>
          </div>
        </div>
      ))}
      <div className="nl-plan-row" style={{color:'var(--color-grey-mid)', fontStyle:'italic'}}>
        <div className="nl-plan-row-num">…</div>
        <div className="nl-plan-row-title" style={{fontWeight:400, color:'var(--color-grey-mid)'}}>6 séances supplémentaires (7 à 12) générées — voir la fiche complète.</div>
      </div>
    </div>
  );
}

// ── Palette popover (@ or #) ─────────────────────────────
function NLPalette({ kind, items, onPick, onClose }) {
  const isAgent = kind === '@';
  return (
    <div className="nl-palette" role="listbox" aria-label={isAgent ? 'Agents' : 'Sources documentaires'}>
      <div className="nl-palette-header">
        <span className="nl-palette-title">{isAgent ? 'Agents' : 'Sources documentaires'}</span>
        <span className="nl-palette-hint">
          {isAgent ? 'Sélectionnez un workflow pour structurer votre demande.' : 'Choisissez les bases à interroger pour cette réponse.'}
        </span>
      </div>
      <div className="nl-palette-list">
        {items.map((it, i) => (
          <button key={it.key} className="nl-palette-item"
                  data-selected={i === 0}
                  onClick={() => onPick && onPick(it)}>
            <span className="nl-palette-icon" data-variant={isAgent ? 'agent' : 'source'}>
              <Icon name={it.icon} size={18} />
            </span>
            <span className="nl-palette-body">
              <span className="nl-palette-name">
                <span className="nl-palette-name-prefix">{kind}</span>{it.name}
              </span>
              <span className="nl-palette-desc">{it.desc}</span>
            </span>
            <span className="nl-palette-meta">
              {isAgent ? '' : `${it.count} docs · ${it.scope}`}
            </span>
          </button>
        ))}
      </div>
      <div className="nl-palette-footer">
        <span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span>
        <span><kbd>↵</kbd> sélectionner</span>
        <span><kbd>esc</kbd> fermer</span>
        <span style={{marginLeft:'auto'}}>{items.length} {isAgent ? 'agents disponibles' : 'sources accessibles'}</span>
      </div>
    </div>
  );
}

// ── /aide help overlay ───────────────────────────────────
function NLHelp({ agents, sources }) {
  return (
    <div className="nl-help">
      <div className="nl-help-title">Aide rapide</div>
      <div className="nl-help-sub">Tapez <span className="nl-mention">@</span> ou <span className="nl-mention">#</span> dans la conversation pour ouvrir la palette correspondante. Cliquez un exemple ci-dessous pour l’insérer.</div>
      <div className="nl-help-cols">
        <div>
          <div className="nl-help-col-title"><kbd>@</kbd> Agents</div>
          {agents.slice(0, 4).map(a => (
            <div key={a.key} className="nl-help-example">
              <span className="nl-mention">@{a.name}</span> {a.desc}
            </div>
          ))}
        </div>
        <div>
          <div className="nl-help-col-title"><kbd>#</kbd> Sources</div>
          {sources.map(s => (
            <div key={s.key} className="nl-help-example">
              <span className="nl-mention">#{s.name}</span> {s.desc}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Composer (input + palette) ───────────────────────────
function NLComposer({
  paletteKind, // '@' | '#' | 'help' | null
  paletteItems = [],
  inputText = '',
  contextChips = [],
  onSend,
  agents = [], sources = [],
  placeholder = 'Posez votre question · @ agent  ·  # source  ·  ⌘↵ envoyer',
}) {
  return (
    <div className="nl-composer-wrap">
      <div className="nl-composer-inner">
        <div className="nl-composer" style={{ position: 'relative' }}>
          {paletteKind === '@' && (
            <NLPalette kind="@" items={paletteItems.length ? paletteItems : agents} />
          )}
          {paletteKind === '#' && (
            <NLPalette kind="#" items={paletteItems.length ? paletteItems : sources} />
          )}
          {paletteKind === 'help' && (
            <NLHelp agents={agents} sources={sources} />
          )}

          {contextChips.length > 0 && (
            <div className="nl-composer-context">
              {contextChips.map((c, i) => (
                <span key={i} className="nl-context-chip">
                  {c.label}
                  <button className="nl-context-chip-remove" aria-label="Retirer">
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea className="nl-composer-text"
                    placeholder={placeholder}
                    defaultValue={inputText}
                    rows={2} />

          <div className="nl-composer-toolbar">
            <div className="nl-composer-tools">
              <button className="nl-composer-tool" data-active={paletteKind==='@'} title="Agent (@)">
                <Icon name="at" size={16} />
              </button>
              <button className="nl-composer-tool" data-active={paletteKind==='#'} title="Source (#)">
                <Icon name="hash" size={16} />
              </button>
              <button className="nl-composer-tool" title="Joindre un fichier">
                <Icon name="paperclip" size={16} />
              </button>
              <button className="nl-composer-tool" data-active={paletteKind==='help'} title="Aide (/aide)" aria-label="Aide — commandes disponibles">
                <Icon name="help" size={16} />
              </button>
              <span style={{width:1, height:18, background:'var(--color-border)', margin:'0 4px'}} />
              <button className="nl-composer-tool nl-tooltip"
                      data-tooltip="Effacer le contexte de session"
                      aria-label="Effacer le contexte de session (sources et fichiers joints)">
                <Icon name="x" size={16} />
              </button>
            </div>
            <button className="nl-composer-send" data-disabled={!inputText && contextChips.length === 0}>
              Envoyer <Icon name="arrow-up" size={14} />
            </button>
          </div>
        </div>

        <div style={{
          textAlign: 'center', marginTop: 8,
          fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 11,
          letterSpacing: '0.04em', color: 'var(--color-grey-mid)',
        }}>
          Glissez un fichier dans la conversation pour l’ajouter au contexte.
        </div>
      </div>
    </div>
  );
}

window.NLHeader = NLHeader;
window.NLMessage = NLMessage;
window.NLPlanCard = NLPlanCard;
window.NLComposer = NLComposer;
window.NLPalette = NLPalette;
window.NLHelp = NLHelp;
window.NLSources = NLSources;
window.NLActionBar = NLActionBar;
window.NLProcessing = NLProcessing;
