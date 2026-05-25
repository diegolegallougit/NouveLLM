import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'NouveLLM API',
    description:
      'API publique de NouveLLM — service IA institutionnel de l\'Université Sorbonne Nouvelle. ' +
      'Développé dans le cadre du projet INTEGRIA (ANR France 2030).',
    version: '0.3.0',
    contact: {
      name: 'Équipe NouveLLM',
      url: 'https://nouvellm.sorbonne-nouvelle.fr',
    },
    license: {
      name: 'Propriétaire — usage institutionnel',
    },
  },
  servers: [
    { url: '/api', description: 'Serveur de production' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
        description: 'Session JWT NextAuth — connexion via /login requise',
      },
    },
    schemas: {
      Agent: {
        type: 'object',
        properties: {
          slug: { type: 'string', example: 'iiiaas' },
          label: { type: 'string', example: 'Assistant généraliste IIIAAS' },
          description: { type: 'string' },
          icon: { type: 'string', example: '🎓' },
          allowedRoles: { type: 'array', items: { type: 'string' } },
        },
      },
      Source: {
        type: 'object',
        properties: {
          slug: { type: 'string', example: 'traductologie' },
          label: { type: 'string', example: 'Traductologie USN' },
          icon: { type: 'string' },
          description: { type: 'string' },
          docCount: { type: 'integer', nullable: true },
          access: { type: 'string', enum: ['PUBLIC', 'RESTRICTED'] },
        },
      },
      RoutingFamily: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string', example: 'Recherche documentaire' },
          icon: { type: 'string' },
          description: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      label: { type: 'string' },
                      agentSlug: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', nullable: true },
          agentSlug: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Space: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
          icon: { type: 'string' },
          description: { type: 'string', nullable: true },
          folders: { type: 'array', items: { type: 'object' } },
          _count: { type: 'object', properties: { documents: { type: 'integer' } } },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          code: { type: 'string', example: 'TRAD-2026-142' },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'] },
          agentSlug: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ChatChunk: {
        type: 'object',
        description: 'Événement SSE envoyé en streaming',
        oneOf: [
          {
            properties: {
              type: { type: 'string', enum: ['conv_id'] },
              conversationId: { type: 'string' },
            },
          },
          {
            properties: {
              type: { type: 'string', enum: ['chunk'] },
              text: { type: 'string' },
            },
          },
          {
            properties: {
              type: { type: 'string', enum: ['done'] },
              messageId: { type: 'string' },
              sources: { type: 'array', items: { type: 'object' } },
              agentLabel: { type: 'string', nullable: true },
            },
          },
        ],
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    '/chat': {
      post: {
        summary: 'Envoyer un message — réponse en streaming SSE',
        description:
          'Démarre une conversation avec un agent IA. La réponse est streamed via Server-Sent Events. ' +
          'Chaque événement `data:` contient un objet JSON typé.',
        tags: ['Chat'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', description: 'Message de l\'utilisateur' },
                  agentSlug: { type: 'string', description: 'Slug de l\'agent à utiliser (optionnel)' },
                  sourceSlugs: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Sources à filtrer (slugs institutionnels ou "espace/dossier")',
                  },
                  conversationId: { type: 'string', description: 'ID conversation existante (pour continuer)' },
                  uploadedFileId: { type: 'string', description: 'ID fichier Dify uploadé' },
                },
              },
              example: {
                message: 'Quels sont les enjeux de la traductologie moderne ?',
                agentSlug: 'iiiaas',
                sourceSlugs: ['traductologie'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Stream SSE — une ligne `data: {...}` par événement',
            content: {
              'text/event-stream': {
                schema: { '$ref': '#/components/schemas/ChatChunk' },
              },
            },
          },
          401: { description: 'Non authentifié', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          502: { description: 'Erreur Dify upstream' },
        },
      },
    },
    '/config/agents': {
      get: {
        summary: 'Liste des agents disponibles pour l\'utilisateur connecté',
        tags: ['Configuration'],
        responses: {
          200: {
            description: 'Liste filtrée selon le rôle de l\'utilisateur',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agents: { type: 'array', items: { '$ref': '#/components/schemas/Agent' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/config/sources': {
      get: {
        summary: 'Liste des sources documentaires disponibles',
        tags: ['Configuration'],
        responses: {
          200: {
            description: 'Sources institutionnelles et bases KB',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sources: { type: 'array', items: { '$ref': '#/components/schemas/Source' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/routing': {
      get: {
        summary: 'Familles de routing et arbre de décision',
        description: 'Retourne l\'arbre de familles / questions / options pour le routing intelligent',
        tags: ['Routing'],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    families: { type: 'array', items: { '$ref': '#/components/schemas/RoutingFamily' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/conversations': {
      get: {
        summary: 'Historique des conversations de l\'utilisateur',
        tags: ['Conversations'],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    conversations: { type: 'array', items: { '$ref': '#/components/schemas/Conversation' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/conversations/{id}': {
      get: {
        summary: 'Détail d\'une conversation avec ses messages',
        tags: ['Conversations'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    conversation: { '$ref': '#/components/schemas/Conversation' },
                    messages: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
          403: { description: 'Conversation d\'un autre utilisateur' },
          404: { description: 'Conversation introuvable' },
        },
      },
    },
    '/spaces': {
      get: {
        summary: 'Espaces documentaires de l\'utilisateur',
        tags: ['Espaces'],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    spaces: { type: 'array', items: { '$ref': '#/components/schemas/Space' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
      post: {
        summary: 'Créer un espace documentaire',
        tags: ['Espaces'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  icon: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Espace créé' },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/sessions': {
      get: {
        summary: 'Sessions de cours (EC uniquement)',
        tags: ['Sessions'],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessions: { type: 'array', items: { '$ref': '#/components/schemas/Session' } },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
          403: { description: 'Rôle STUDENT — accès réservé EC/ADMIN' },
        },
      },
    },
    '/meta-prompts': {
      get: {
        summary: 'Postures disponibles (institutionnelles, partagées, personnelles)',
        tags: ['Postures'],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    institutional: { type: 'array', items: { type: 'object' } },
                    shared: { type: 'array', items: { type: 'object' } },
                    personal: { type: 'array', items: { type: 'object' } },
                    active: { type: 'object', nullable: true },
                  },
                },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
    },
    '/user/export': {
      get: {
        summary: 'Export RGPD Art. 20 — archive ZIP de toutes les données',
        description: 'Génère une archive ZIP contenant toutes les conversations (MD), méta-prompts personnels, espaces documentaires et métadonnées.',
        tags: ['Portabilité'],
        responses: {
          200: {
            description: 'Archive ZIP',
            content: {
              'application/zip': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          401: { description: 'Non authentifié' },
        },
      },
    },
  },
}

export function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  })
}
