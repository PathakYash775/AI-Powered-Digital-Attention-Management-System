
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Attention Platform API',
    description: 'AI-Powered Digital Attention Management System API - Interactive Documentation',
    version: '1.0.0',
  },
  servers: [
    {
      url: '/',
      description: 'Current Origin',
    },
    {
      url: 'http://127.0.0.1:8000',
      description: 'Local API Server (Port 8000)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'User access token from /api/v1/auth/login or /api/v1/auth/register',
      },
      DeviceAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Device token (atn_...) from /api/v1/devices/pair',
      },
    },
    schemas: {
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'displayName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 10, example: 'StrongPass123!' },
          displayName: { type: 'string', example: 'Yash Pathak' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'StrongPass123!' },
        },
      },
      GoalInput: {
        type: 'object',
        required: ['type', 'period', 'targetValue'],
        properties: {
          type: {
            type: 'string',
            enum: ['focus_minutes', 'max_screen_minutes', 'max_context_switches'],
            example: 'focus_minutes',
          },
          period: {
            type: 'string',
            enum: ['daily', 'weekly'],
            example: 'daily',
          },
          targetValue: { type: 'integer', minimum: 1, maximum: 10080, example: 120 },
        },
      },
      GoalUpdateInput: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['focus_minutes', 'max_screen_minutes', 'max_context_switches'] },
          period: { type: 'string', enum: ['daily', 'weekly'] },
          targetValue: { type: 'integer', minimum: 1, maximum: 10080 },
        },
      },
      FocusSessionStartInput: {
        type: 'object',
        required: ['plannedMin'],
        properties: {
          plannedMin: { type: 'integer', minimum: 5, maximum: 480, example: 45 },
        },
      },
      FocusSessionStopInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['completed', 'abandoned'], example: 'completed' },
        },
      },
      DevicePairInput: {
        type: 'object',
        required: ['code', 'deviceName'],
        properties: {
          code: { type: 'string', example: 'ABC12345' },
          deviceName: { type: 'string', example: 'Chrome Browser Laptop' },
        },
      },
      ProfileUpdateInput: {
        type: 'object',
        properties: {
          displayName: { type: 'string', example: 'Yash Pathak' },
          timezone: { type: 'string', example: 'Asia/Kolkata' },
          occupationType: { type: 'string', enum: ['student', 'professional'], example: 'student' },
          workStart: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '09:00' },
          workEnd: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '18:00' },
        },
      },
      ActivityBatchIn: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['clientEventId', 'domain', 'startedAt', 'endedAt', 'idle'],
              properties: {
                clientEventId: { type: 'string', example: 'evt-001' },
                domain: { type: 'string', example: 'github.com' },
                startedAt: { type: 'string', format: 'date-time', example: '2026-10-17T08:00:00Z' },
                endedAt: { type: 'string', format: 'date-time', example: '2026-10-17T08:30:00Z' },
                idle: { type: 'boolean', example: false },
              },
            },
          },
        },
      },
      SwitchesBatchIn: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['clientEventId', 'fromApp', 'toApp', 'switchedAt'],
              properties: {
                clientEventId: { type: 'string', example: 'sw-001' },
                fromApp: { type: 'string', example: 'VS Code' },
                toApp: { type: 'string', example: 'Google Chrome' },
                switchedAt: { type: 'string', format: 'date-time', example: '2026-10-17T08:15:00Z' },
              },
            },
          },
        },
      },
      NotificationsBatchIn: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['clientEventId', 'sourceApp', 'receivedAt'],
              properties: {
                clientEventId: { type: 'string', example: 'notif-001' },
                sourceApp: { type: 'string', example: 'Slack' },
                receivedAt: { type: 'string', format: 'date-time', example: '2026-10-17T08:20:00Z' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'Register',
        description: 'Register a new user account with email, password, and display name.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
        },
        responses: {
          201: { description: 'Registration successful' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Login',
        description: 'Authenticate with email and password to receive JWT access token and refresh cookie.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: { description: 'Authentication successful' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['auth'],
        summary: 'Refresh',
        description: 'Rotate refresh token stored in cookie and return a new JWT access token.',
        responses: {
          200: { description: 'Token refreshed' },
          401: { description: 'Invalid or revoked refresh token' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Logout',
        description: 'Revoke active refresh token and clear session cookie.',
        responses: {
          204: { description: 'Logged out successfully' },
        },
      },
    },
    '/api/v1/profile': {
      get: {
        tags: ['profile'],
        summary: 'Get Profile',
        description: 'Get user settings, timezone, occupation type, and working hours.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'User profile details' } },
      },
      patch: {
        tags: ['profile'],
        summary: 'Update Profile',
        description: 'Update user display name, timezone, occupation type, or working hours.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileUpdateInput' } } },
        },
        responses: { 200: { description: 'Updated profile details' } },
      },
    },
    '/api/v1/focus-sessions': {
      get: {
        tags: ['focus-sessions'],
        summary: 'Focus History',
        description: 'List user focus sessions with pagination and interruption metrics.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Focus history list' } },
      },
    },
    '/api/v1/focus-sessions/active': {
      get: {
        tags: ['focus-sessions'],
        summary: 'Active Focus',
        description: 'Get currently active focus session or null.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Current active session or null' } },
      },
    },
    '/api/v1/focus-sessions/start': {
      post: {
        tags: ['focus-sessions'],
        summary: 'Start Focus',
        description: 'Start a new focus session (5 to 480 minutes).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FocusSessionStartInput' } } },
        },
        responses: { 201: { description: 'Focus session started' } },
      },
    },
    '/api/v1/focus-sessions/{focus_id}': {
      patch: {
        tags: ['focus-sessions'],
        summary: 'Update Focus',
        description: 'Stop or update an active focus session.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'focus_id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FocusSessionStopInput' } } },
        },
        responses: { 200: { description: 'Focus session updated' } },
      },
    },
    '/api/v1/stats/today': {
      get: {
        tags: ['stats'],
        summary: 'Stats Today',
        description: "Get today's total active/idle screen time, switch counts, and categorized breakdown.",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Today's activity statistics" } },
      },
    },
    '/api/v1/stats/range': {
      get: {
        tags: ['stats'],
        summary: 'Stats Range',
        description: 'Get activity statistics across a date range.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Range statistics' } },
      },
    },
    '/api/v1/analytics/daily': {
      get: {
        tags: ['analytics'],
        summary: 'Daily',
        description: 'Get daily attention breakdown, focused vs distracted minutes, and category distributions.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Daily analytics metrics' } },
      },
    },
    '/api/v1/analytics/focus-score': {
      get: {
        tags: ['analytics'],
        summary: 'Focus Score',
        description: 'Get computed attention focus score (0-100), rating, and component metrics.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Focus score metrics' } },
      },
    },
    '/api/v1/analytics/distractions': {
      get: {
        tags: ['analytics'],
        summary: 'Distractions',
        description: 'Get detected distraction sessions, high-distraction sources, and rates.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Distraction analytics' } },
      },
    },
    '/api/v1/analytics/predictions': {
      get: {
        tags: ['analytics'],
        summary: 'Predictions',
        description: 'Run real-time machine learning prediction on current behavioral features.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Behavioral ML predictions' } },
      },
    },
    '/api/v1/analytics/simulate': {
      post: {
        tags: ['analytics'],
        summary: 'Simulate Prediction',
        description: 'Run interactive ML prediction on custom behavioral features.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  appName: { type: 'string', example: 'Visual Studio Code' },
                  category: { type: 'string', enum: ['productive', 'social', 'communication', 'entertainment', 'other'], example: 'productive' },
                  hoursUsed: { type: 'number', example: 2.5 },
                  dayUsed: { type: 'string', example: 'Wednesday' },
                  numberEvents: { type: 'integer', example: 120 },
                  numberInteractions: { type: 'integer', example: 2400 },
                  switches: { type: 'integer', example: 6 },
                  eventSpan: { type: 'number', example: 150 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Interactive ML prediction output' } },
      },
    },
    '/api/v1/analytics/insights': {
      get: {
        tags: ['analytics'],
        summary: 'Insights',
        description: 'Get automated cognitive attention insights and recommendations.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Attention insights' } },
      },
    },
    '/api/v1/analytics/summary': {
      get: {
        tags: ['analytics'],
        summary: 'Summary',
        description: 'Get executive summary uniting focus score, screen time, and distraction analysis.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Analytics executive summary' } },
      },
    },
    '/api/v1/analytics/weekly-summary': {
      get: {
        tags: ['analytics'],
        summary: 'Weekly Focus Summary',
        description: 'Get weekly Monday-Sunday daily focus scores, weekly average, screen time, and completed sessions.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: { 200: { description: 'Weekly focus summary with daily breakdown' } },
      },
    },
    '/api/v1/goals': {
      post: {
        tags: ['goals'],
        summary: 'Create Goal',
        description: 'Create a new focus or screen time goal (max 20 per user).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GoalInput' } } },
        },
        responses: { 201: { description: 'Goal created' } },
      },
      get: {
        tags: ['goals'],
        summary: 'List Goals',
        description: 'Get all active goals for the current user.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'List of goals' } },
      },
    },
    '/api/v1/goals/{goal_id}': {
      patch: {
        tags: ['goals'],
        summary: 'Update Goal',
        description: 'Update target value or period for a goal.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'goal_id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GoalUpdateInput' } } },
        },
        responses: { 200: { description: 'Goal updated' } },
      },
      delete: {
        tags: ['goals'],
        summary: 'Delete Goal',
        description: 'Delete a user goal.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'goal_id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Goal deleted' } },
      },
    },
    '/api/v1/activity/summary': {
      get: {
        tags: ['activity'],
        summary: 'Daily Summary',
        description: 'Activity breakdown by category, top 5 sites, and 24-hour timeline.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', example: '2026-10-17' } }],
        responses: { 200: { description: 'Summary' } },
      },
    },
    '/api/v1/devices/pairing-code': {
      post: {
        tags: ['devices'],
        summary: 'Generate Pairing Code',
        description: 'Generate an 8-character single-use code to pair a Chrome Extension.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Pairing code generated' } },
      },
    },
    '/api/v1/devices/pair': {
      post: {
        tags: ['devices'],
        summary: 'Pair Device',
        description: 'Public endpoint to exchange 8-char code for device token (atn_...).',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DevicePairInput' } } },
        },
        responses: { 200: { description: 'Device token returned' } },
      },
    },
    '/api/v1/devices': {
      get: {
        tags: ['devices'],
        summary: 'List Devices',
        description: 'List all paired devices for user.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'List of devices' } },
      },
    },
    '/api/v1/ingest/activity': {
      post: {
        tags: ['ingest'],
        summary: 'Ingest Activity Logs',
        description: 'Batch ingest domain activity telemetry using Bearer device token.',
        security: [{ DeviceAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivityBatchIn' } } },
        },
        responses: { 200: { description: 'Batch ingested with rollups' } },
      },
    },
    '/api/v1/ingest/switches': {
      post: {
        tags: ['ingest'],
        summary: 'Ingest Context Switches',
        description: 'Batch ingest application context switch events.',
        security: [{ DeviceAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SwitchesBatchIn' } } },
        },
        responses: { 200: { description: 'Switches ingested' } },
      },
    },
    '/api/v1/ingest/notifications': {
      post: {
        tags: ['ingest'],
        summary: 'Ingest Notifications',
        description: 'Batch ingest incoming notification events.',
        security: [{ DeviceAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationsBatchIn' } } },
        },
        responses: { 200: { description: 'Notifications ingested' } },
      },
    },
    '/api/v1/ingest/heartbeat': {
      post: {
        tags: ['ingest'],
        summary: 'Heartbeat',
        description: 'Update device last seen timestamp.',
        security: [{ DeviceAuth: [] }],
        responses: { 200: { description: 'Heartbeat acknowledged' } },
      },
    },
  },
};

export function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Attention Platform API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.18.2/favicon-32x32.png" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>`;
}
