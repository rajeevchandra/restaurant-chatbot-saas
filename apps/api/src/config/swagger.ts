import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant SaaS API',
      version: '1.0.0',
      description: 'Multi-tenant restaurant management and chatbot API with production-ready features',
      contact: {
        name: 'API Support',
        email: 'support@restaurant-saas.example.com',
      },
    },
    servers: [
      {
        url: config.nodeEnv === 'production' ? 'https://api.example.com' : `http://localhost:${config.port}`,
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Request validation failed' },
                details: { type: 'object' },
              },
              required: ['code', 'message'],
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string', format: 'uuid' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string', format: 'uuid' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                pageSize: { type: 'number', example: 20 },
                total: { type: 'number', example: 100 },
                totalPages: { type: 'number', example: 5 },
              },
              required: ['page', 'pageSize', 'total', 'totalPages'],
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string', format: 'uuid' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            restaurantId: { type: 'string', format: 'uuid' },
            customerName: { type: 'string', example: 'John Doe' },
            customerEmail: { type: 'string', format: 'email', example: 'john@example.com' },
            customerPhone: { type: 'string', example: '+1234567890' },
            deliveryAddress: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['CREATED', 'PAYMENT_PENDING', 'PAID', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
              example: 'CREATED',
            },
            subtotal: { type: 'number', format: 'decimal', example: 25.99 },
            tax: { type: 'number', format: 'decimal', example: 2.08 },
            total: { type: 'number', format: 'decimal', example: 28.07 },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' },
            },
          },
          required: ['id', 'restaurantId', 'customerName', 'status', 'subtotal', 'tax', 'total'],
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            menuItemId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', minimum: 1, example: 2 },
            price: { type: 'number', format: 'decimal', example: 12.99 },
            options: { type: 'object', nullable: true },
          },
          required: ['menuItemId', 'quantity', 'price'],
        },
        CreateOrderRequest: {
          type: 'object',
          properties: {
            customerName: { type: 'string', minLength: 1, example: 'John Doe' },
            customerEmail: { type: 'string', format: 'email', example: 'john@example.com' },
            customerPhone: { type: 'string', example: '+1234567890' },
            deliveryAddress: { type: 'string', nullable: true },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                properties: {
                  menuItemId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'number', minimum: 1 },
                  price: { type: 'number', format: 'decimal' },
                  options: { type: 'object', nullable: true },
                },
                required: ['menuItemId', 'quantity', 'price'],
              },
            },
            notes: { type: 'string', nullable: true },
          },
          required: ['customerName', 'items'],
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['CREATED', 'PAYMENT_PENDING', 'PAID', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
            },
          },
          required: ['status'],
        },
      },
      parameters: {
        RequestId: {
          name: 'X-Request-Id',
          in: 'header',
          description: 'Optional request ID for tracking. If not provided, one will be generated.',
          required: false,
          schema: { type: 'string', format: 'uuid' },
        },
        IdempotencyKey: {
          name: 'X-Idempotency-Key',
          in: 'header',
          description: 'Unique key to ensure idempotent operations. Required for order creation.',
          required: false,
          schema: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Request validation failed',
                  details: [
                    { path: 'customerName', message: 'Required' },
                    { path: 'items', message: 'Must have at least 1 item' },
                  ],
                },
              },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later',
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/modules/*/routes.ts',
    './src/modules/*/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
