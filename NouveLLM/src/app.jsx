// NouveLLM — Main app: design canvas presenting both interfaces with tweaks

const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "side-by-side",
  "teacher_palette": "at",
  "student_palette": "hash",
  "teacher_sidebar": true,
  "student_session_mode": false,
  "student_onboarding": false,
  "mobile_sheet_open": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <DesignCanvas
        title="NouveLLM"
        subtitle="Service IA institutionnel · Université Sorbonne Nouvelle · INTEGRIA · France 2030"
      >
        <DCSection id="ec"
                   title="NouveLLM Enseignant"
                   subtitle="UFR Langues · Camille Daniaux · conversation en cours montrant l’activation de la palette des agents.">
          <DCArtboard id="teacher-1" label="01 · Activation @ — palette des Agents"
                      width={1440} height={900}>
            <NLTeacher paletteMode={t.teacher_palette}
                       sidebarOpen={t.teacher_sidebar} />
          </DCArtboard>
        </DCSection>

        <DCSection id="etu"
                   title="NouveLLM Étudiant"
                   subtitle="M1 Études romanes · Yasmine Belkacem · interface allégée, crédit visible, sources institutionnelles uniquement.">
          <DCArtboard id="student-1" label="02 · Activation # — palette des Sources"
                      width={1440} height={900}>
            <NLStudent paletteMode={t.student_palette}
                       sessionMode={t.student_session_mode}
                       showOnboarding={t.student_onboarding} />
          </DCArtboard>
        </DCSection>

        <DCSection id="iter2-ec"
                   title="Itération 2 · Enseignant"
                   subtitle="États complémentaires : traitement en cours, réponse terminée avec barre d’actions, recherche dans l’historique.">
          <DCArtboard id="teacher-processing" label="A · État « en cours de traitement » — agent @module"
                      width={1440} height={900}>
            <NLTeacherProcessing />
          </DCArtboard>
          <DCArtboard id="teacher-completed" label="B · Réponse complète · barre d’actions · DOCX mis en avant"
                      width={1440} height={900}>
            <NLTeacherCompleted />
          </DCArtboard>
          <DCArtboard id="teacher-search" label="E · Recherche dans l’historique des conversations"
                      width={1440} height={900}>
            <NLTeacherSearch />
          </DCArtboard>
        </DCSection>

        <DCSection id="iter2-etu"
                   title="Itération 2 · Étudiant"
                   subtitle="Mode « Session de cours » encadré par l’EC, et version mobile 390 px avec bottom sheet # actif.">
          <DCArtboard id="student-session" label="C · Mode « Session de cours » — code TRAD-M1-2026"
                      width={1440} height={900}>
            <NLStudentSession />
          </DCArtboard>
          <DCArtboard id="student-mobile" label="D · Interface mobile étudiant · 390 px"
                      width={390} height={844}>
            <NLStudentMobile sheetOpen={t.mobile_sheet_open} />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · NouveLLM">
        <TweakSection label="Enseignant">
          <TweakRadio label="Palette ouverte"
                      value={t.teacher_palette}
                      options={[
                        { value: 'idle', label: 'Aucune' },
                        { value: 'at',   label: '@ Agents' },
                        { value: 'hash', label: '# Sources' },
                        { value: 'help', label: '/aide' },
                      ]}
                      onChange={v => setTweak('teacher_palette', v)} />
          <TweakToggle label="Sidebar ouverte"
                       value={t.teacher_sidebar}
                       onChange={v => setTweak('teacher_sidebar', v)} />
        </TweakSection>

        <TweakSection label="Étudiant">
          <TweakRadio label="Palette ouverte"
                      value={t.student_palette}
                      options={[
                        { value: 'idle', label: 'Aucune' },
                        { value: 'at',   label: '@ Agents' },
                        { value: 'hash', label: '# Sources' },
                        { value: 'help', label: '/aide' },
                      ]}
                      onChange={v => setTweak('student_palette', v)} />
          <TweakToggle label="Mode « Session de cours »"
                       value={t.student_session_mode}
                       onChange={v => setTweak('student_session_mode', v)} />
          <TweakToggle label="Onboarding éthique (1ʳᵉ connexion)"
                       value={t.student_onboarding}
                       onChange={v => setTweak('student_onboarding', v)} />
        </TweakSection>

        <TweakSection label="Mobile (étudiant)">
          <TweakToggle label="Bottom sheet # ouvert"
                       value={t.mobile_sheet_open}
                       onChange={v => setTweak('mobile_sheet_open', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
