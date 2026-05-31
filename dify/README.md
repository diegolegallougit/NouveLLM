# Workflows Dify — NouveLLM

Ce dossier contient les exports DSL YAML des workflows Dify
qui alimentent les agents NouveLLM.

## Prérequis

- Instance Dify auto-hébergée (v1.14.0+)
- Modèle LLM compatible OpenAI API (deepseek, mistral, etc.)
- Reranker TEI optionnel (BAAI/bge-reranker-v2-m3)

## Import

1. Ouvrir Dify UI → Studio → Import DSL
2. Importer chaque fichier YAML dans l'ordre suivant
3. Configurer les variables d'environnement (voir ci-dessous)
4. Récupérer les App IDs générés et les renseigner dans `.env`

## Variables à configurer après import

| Variable | Description |
|----------|-------------|
| `DIFY_BASE_URL` | URL de votre instance Dify |
| `DIFY_APP_API_KEY` | Clé API de l'app (dans Dify → app → API) |
| `ACADEMIC_PROXY_URL` | URL du proxy HAL/OpenAlex (optionnel) |
| `RERANKER_URL` | URL du reranker TEI (optionnel) |

## Workflows disponibles

| Fichier | Agent | Description |
|---------|-------|-------------|
| `IIIAAS_v3.yml` | @assistant-ec | Chat généraliste SHS avec RAG |
| `W2_Bibliographie.yml` | @bibliographie | Bibliographie annotée HAL/OpenAlex |
| `W3_Examen.yml` | @examen | Sujets d'examen résistants à l'IA |
| `W_ConcepteurSeances.yml` | @concepteur-seances | Conception de séances pédagogiques |
| `W1A_Module.yml` | @module | Module de cours complet |
| `W10_Redaction.yml` | @redaction | Rédaction administrative |
| `W11_Briefing.yml` | @briefing | Briefing et synthèse |
| `W_AgentLibre.yml` | — | Agent-chat expérimental (tool calling) |
