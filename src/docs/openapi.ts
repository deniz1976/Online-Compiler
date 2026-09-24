import { z } from 'zod';
import { CPP_STANDARDS } from '../domain/cpp';
import { EXECUTION_STATUSES } from '../domain/execution';
import { loginSchema, registerSchema } from '../http/schemas/auth.schemas';
import { executionSchema } from '../http/schemas/execution.schemas';
import { createSnippetSchema, updateSnippetSchema } from '../http/schemas/snippet.schemas';

const requestSchema = (schema: z.ZodType) => {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  });
  return jsonSchema;
};

const timestamps = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonContent = (schema: object) => ({ 'application/json': { schema } });

const dataResponse = (description: string, properties: Record<string, object>) => ({
  description,
  content: jsonContent({
    type: 'object',
    properties: { data: { type: 'object', properties } },
  }),
});

const errorResponse = (description: string) => ({
  description,
  content: jsonContent(ref('ErrorResponse')),
});

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

const secured = [{ bearerAuth: [] }, { cookieAuth: [] }];

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Online C++ Compiler API',
    version: '2.0.0',
    description: 'Compile and run C++ programs in an isolated sandbox and manage saved snippets.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          ...timestamps,
        },
      },
      SnippetSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ownerId: { type: 'string' },
          title: { type: 'string' },
          standard: { type: 'string', enum: CPP_STANDARDS },
          ...timestamps,
        },
      },
      Snippet: {
        allOf: [ref('SnippetSummary'), { type: 'object', properties: { source: { type: 'string' } } }],
      },
      ExecutionResult: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: EXECUTION_STATUSES },
          compileOutput: { type: 'string' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
          exitCode: { type: ['integer', 'null'] },
          durationMs: { type: ['integer', 'null'] },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      RegisterRequest: requestSchema(registerSchema),
      LoginRequest: requestSchema(loginSchema),
      CreateSnippetRequest: requestSchema(createSnippetSchema),
      UpdateSnippetRequest: requestSchema(updateSnippetSchema),
      ExecutionRequest: requestSchema(executionSchema),
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health',
        responses: {
          200: dataResponse('Service is healthy', {
            status: { type: 'string' },
            database: { type: 'string' },
          }),
          503: { description: 'Service is degraded' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: { required: true, content: jsonContent(ref('RegisterRequest')) },
        responses: {
          201: dataResponse('User created', { user: ref('User') }),
          400: errorResponse('Validation failed'),
          409: errorResponse('Username or email already registered'),
          429: errorResponse('Too many requests'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a session token',
        description: 'Sets an HttpOnly session cookie and returns the same token for API clients.',
        requestBody: { required: true, content: jsonContent(ref('LoginRequest')) },
        responses: {
          200: dataResponse('Logged in', {
            user: ref('User'),
            token: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          }),
          400: errorResponse('Validation failed'),
          401: errorResponse('Invalid credentials'),
          429: errorResponse('Too many requests'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Clear the session cookie',
        responses: { 204: { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: secured,
        responses: {
          200: dataResponse('Current user', { user: ref('User') }),
          401: errorResponse('Not authenticated'),
        },
      },
    },
    '/snippets': {
      get: {
        tags: ['Snippets'],
        summary: 'List snippets of the current user',
        security: secured,
        responses: {
          200: dataResponse('Snippets', {
            snippets: { type: 'array', items: ref('SnippetSummary') },
          }),
          401: errorResponse('Not authenticated'),
        },
      },
      post: {
        tags: ['Snippets'],
        summary: 'Create a snippet',
        security: secured,
        requestBody: { required: true, content: jsonContent(ref('CreateSnippetRequest')) },
        responses: {
          201: dataResponse('Snippet created', { snippet: ref('Snippet') }),
          400: errorResponse('Validation failed'),
          401: errorResponse('Not authenticated'),
        },
      },
    },
    '/snippets/{id}': {
      parameters: [idParameter],
      get: {
        tags: ['Snippets'],
        summary: 'Get a snippet',
        security: secured,
        responses: {
          200: dataResponse('Snippet', { snippet: ref('Snippet') }),
          401: errorResponse('Not authenticated'),
          404: errorResponse('Snippet not found'),
        },
      },
      patch: {
        tags: ['Snippets'],
        summary: 'Update a snippet',
        security: secured,
        requestBody: { required: true, content: jsonContent(ref('UpdateSnippetRequest')) },
        responses: {
          200: dataResponse('Snippet updated', { snippet: ref('Snippet') }),
          400: errorResponse('Validation failed'),
          401: errorResponse('Not authenticated'),
          404: errorResponse('Snippet not found'),
        },
      },
      delete: {
        tags: ['Snippets'],
        summary: 'Delete a snippet',
        security: secured,
        responses: {
          204: { description: 'Snippet deleted' },
          401: errorResponse('Not authenticated'),
          404: errorResponse('Snippet not found'),
        },
      },
    },
    '/executions': {
      post: {
        tags: ['Executions'],
        summary: 'Compile and run C++ source code',
        security: secured,
        requestBody: { required: true, content: jsonContent(ref('ExecutionRequest')) },
        responses: {
          200: dataResponse('Execution finished', { result: ref('ExecutionResult') }),
          400: errorResponse('Validation failed'),
          401: errorResponse('Not authenticated'),
          429: errorResponse('Too many requests'),
          503: errorResponse('Execution capacity reached'),
        },
      },
    },
  },
};
