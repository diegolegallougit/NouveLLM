# Workflows Dify — NouveLLM

Ce dossier contient les exports DSL YAML des workflows Dify
qui alimentent les agents NouveLLM.

## Prérequis

- Instance Dify auto-hébergée (v1.14.0+)
- Modèle LLM compatible OpenAI API (Mistral, DeepSeek, Qwen...)
- Reranker TEI optionnel (BAAI/bge-reranker-v2-m3)
- Proxy académique optionnel (HAL + OpenAlex)

## Import des workflows

1. Ouvrir Dify UI → Studio → bouton "Import DSL"
2. Importer chaque fichier YAML dans l'ordre indiqué ci-dessous
3. Après import, récupérer l'App ID de chaque workflow (Dify → app → Paramètres)
4. Renseigner ces IDs dans votre `.env` NouveLLM

## Workflows disponibles

| Fichier | Agent NouveLLM | Description |
|---------|---------------|-------------|
| `IIIAAS_v3.yml` | @assistant-ec | Chat généraliste SHS avec RAG académique automatique. Détecte les questions de recherche et interroge HAL/OpenAlex. |
| `W2_Bibliographie.yml` | @bibliographie | Bibliographie annotée avec sources HAL, OpenAlex, ArXiv, Semantic Scholar. Anti-hallucination strict — aucune référence inventée. |
| `W3_Examen.yml` | @examen | Sujets d'examen ancrés dans le corpus du cours, conçus pour résister à la délégation à une IA générative. Fondé sur l'alignement constructif (Biggs & Tang). |
| `W_ConcepteurSeances.yml` | @concepteur-seances | Conception de séances pédagogiques en 3 phases avec 8 archétypes. Produit un JSON importable directement dans NouveLLM. |
| `W1A_Module.yml` | @module | Module de cours structuré avec objectifs, progression, ressources. |
| `W10_Redaction.yml` | @redaction | Rédaction administrative — notes, comptes-rendus, courriers institutionnels. |
| `W11_Briefing.yml` | @briefing | Synthèse de réunion et briefing. |
| `W5_FicheECTS.yml` | @fiche-ects | Fiche descriptive ECTS d'un cours (objectifs, compétences, bibliographie). |
| `W_Revelateur.yml` | @révélateur | Médiation de groupe — détection de polarisation, reformulation, rappel de l'intersubjectivité. |
| `W_AgentLibre.yml` | — | Agent-chat expérimental avec tool calling (HAL/OpenAlex, webscraper). Requiert Dify 1.14.0+ et un modèle avec function calling natif. |

## Variables à configurer après import

Après import, renseignez ces variables dans votre `.env` NouveLLM :

| Variable | Description |
|----------|-------------|
| `DIFY_BASE_URL` | URL de votre instance Dify |
| `DIFY_APP_API_KEY` | Clé API (Dify → app → API) |
| `ACADEMIC_PROXY_URL` | URL du proxy HAL/OpenAlex (optionnel) |
| `RERANKER_URL` | URL du reranker TEI (optionnel) |

## Configuration des Knowledge Bases

Les workflows utilisent des Knowledge Bases (KB) Dify pour le RAG.
Créez ces KB dans Dify avant d'importer les workflows :

| KB | Contenu recommandé | Paramètres |
|----|-------------------|------------|
| Sources académiques SHS | Publications HAL/OpenAlex en libre accès | hybrid_search, top_k=5, reranker |
| Formations institutionnelles | Pages publiques du catalogue de votre université | hybrid_search, top_k=3 |
| Ressources pédagogiques | Guides ministériels, rapports publics | hybrid_search, top_k=3 |

## Proxy académique

IIIAAS_v3 et W2_Bibliographie utilisent un proxy HAL/OpenAlex local
(`academic-proxy`). Le code source est dans `scripts/` du projet.

## Modèles LLM recommandés

Les workflows sont optimisés pour `deepseek-v4-flash` mais compatibles
avec tout modèle via l'API OpenAI-compatible de Dify.

| Usage | Modèle recommandé | Notes |
|-------|------------------|-------|
| Chat général (IIIAAS) | deepseek-v4-flash | Rapide, bon français |
| Bibliographie | mistral-small-2503 | Stable sur tâches structurées |
| Examen | deepseek-v4-flash | Temperature 0.5 |
| Concepteur séances | deepseek-v4-flash | Temperature 0.7, agent-chat |
