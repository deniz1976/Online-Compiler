import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Online C++ Compiler API',
      version: '1.0.0',
      description: 'API documentation for the Online C++ Compiler service',
      contact: {
        name: 'API Support',
        url: 'https://github.com/deniz1976/Online-Compiler'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'User name'
            },
            email: {
              type: 'string',
              description: 'User email'
            },
            password: {
              type: 'string',
              description: 'User password (hashed, not returned in responses)'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'User name'
            },
            email: {
              type: 'string',
              description: 'User email'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Code: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Code ID'
            },
            userId: {
              type: 'string',
              description: 'User ID who owns this code'
            },
            title: {
              type: 'string',
              description: 'Title of the code'
            },
            code: {
              type: 'string',
              description: 'Source code content'
            },
            language: {
              type: 'string',
              description: 'Programming language',
              default: 'cpp'
            },
            cppVersion: {
              type: 'string',
              enum: ['cpp98', 'cpp11', 'cpp14', 'cpp17', 'cpp20'],
              description: 'C++ standard version',
              default: 'cpp17'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        CompileRequest: {
          type: 'object',
          required: ['code'],
          properties: {
            code: {
              type: 'string',
              description: 'C++ code to compile and execute'
            },
            input: {
              type: 'string',
              description: 'Input to provide to the program'
            }
          }
        },
        CompileResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether compilation and execution was successful'
            },
            output: {
              type: 'string',
              description: 'Compilation output or execution result'
            },
            executionTime: {
              type: 'number',
              description: 'Execution time in milliseconds'
            },
            memoryUsage: {
              type: 'number',
              description: 'Memory usage in bytes'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Error status'
            },
            message: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized, no token provided or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        BadRequest: {
          description: 'Bad request, validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.ts', './controllers/*.ts']
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi }; 