# Authentication & Authorization System

## Overview

Secure authentication system with JWT tokens, httpOnly refresh tokens, bcrypt password hashing, and role-based access control (RBAC).

## Architecture

### Token Strategy

**Access Token (Short-lived - 15 minutes)**
- Stored in memory on client (NOT in localStorage/cookies)
- Sent via `Authorization: Bearer <token>` header
- Contains: userId, restaurantId, role, email
- Prevents XSS attacks (not stored in browser storage)

**Refresh Token (Long-lived - 7 days)**
- Stored in httpOnly, secure, SameSite cookie
- Cannot be accessed by JavaScript (XSS protection)
- Used only to get new access tokens
- Contains: userId, restaurantId, tokenVersion
- Token version enables revocation on logout

### Security Features

✅ **bcrypt Password Hashing** - BCRYPT_ROUNDS = 12
✅ **httpOnly Cookies** - Refresh tokens protected from XSS
✅ **Secure Cookies** - HTTPS only in production
✅ **SameSite Strict** - CSRF protection
✅ **Token Versioning** - Logout invalidates all refresh tokens
✅ **Rate Limiting** - 10 requests per 15 minutes on auth endpoints
✅ **JWT Expiration** - Automatic token expiry

## API Endpoints

### POST /api/v1/auth/login

Login with restaurant slug, email, and password.

**Request:**
```json
{
  "slug": "joes-pizza",
  "email": "owner@joespizza.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "owner@joespizza.com",
      "role": "OWNER",
      "restaurantId": "uuid",
      "restaurantSlug": "joes-pizza"
    }
  },
  "meta": {
    "requestId": "req-123"
  }
}
```

**Sets Cookie:**
```
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

**Errors:**
- `404` - Restaurant not found
- `401` - Invalid credentials
- `401` - Restaurant is not active
- `400` - Validation error

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token cookie.

**Request:**
- No body required
- Refresh token sent automatically via cookie

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGc..."
  },
  "meta": {
    "requestId": "req-124"
  }
}
```

**Errors:**
- `401` - Missing refresh token
- `401` - Invalid refresh token
- `401` - Token expired
- `401` - Token revoked (user logged out)

---

### POST /api/v1/auth/logout

Logout and invalidate all refresh tokens.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "data": {
    "message": "Logged out successfully"
  },
  "meta": {
    "requestId": "req-125"
  }
}
```

**Side Effects:**
- Increments user's `tokenVersion` in database
- Clears refresh token cookie
- Invalidates ALL refresh tokens for the user

**Errors:**
- `401` - Not authenticated

---

### GET /api/v1/auth/me

Get current authenticated user information.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "owner@joespizza.com",
    "role": "OWNER",
    "restaurantId": "uuid",
    "restaurantSlug": "joes-pizza",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "requestId": "req-126"
  }
}
```

**Errors:**
- `401` - Not authenticated
- `404` - User not found

## Authentication Middleware

### `requireAuth()`

Validates JWT access token from Authorization header.

**Usage:**
```typescript
router.get('/admin/dashboard',
  requireAuth(),
  controller.getDashboard
);
```

**Effects:**
- Extracts `Authorization: Bearer <token>` header
- Verifies JWT signature and expiration
- Sets `req.user` with payload
- Throws `UnauthorizedError` if invalid

### `optionalAuth()`

Attempts authentication but doesn't fail if no token present.

**Usage:**
```typescript
router.get('/public/menu',
  optionalAuth(),  // User context if logged in
  controller.getMenu
);
```

**Effects:**
- If token present and valid: sets `req.user`
- If no token or invalid: continues without user

## Authorization Middleware (RBAC)

### `requireRole(...roles)`

Restricts access based on user role.

**Prerequisites:** Must run AFTER `requireAuth()`

**Usage:**
```typescript
// Only owners
router.delete('/menu/:id',
  requireAuth(),
  requireRole('OWNER'),
  controller.deleteItem
);

// Owners and managers
router.post('/menu',
  requireAuth(),
  requireRole('OWNER', 'MANAGER'),
  controller.createItem
);

// All authenticated users
router.get('/menu',
  requireAuth(),
  controller.listItems
);
```

**Role Hierarchy:**
- `OWNER` - Full access (create, read, update, delete)
- `MANAGER` - Most operations (create, read, update)
- `STAFF` - Limited operations (read, update status)

**Error:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required role: OWNER. Your role: STAFF",
    "requestId": "req-127"
  }
}
```

## Client Implementation

### Login Flow

```typescript
// 1. Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: sends/receives cookies
  body: JSON.stringify({
    slug: 'joes-pizza',
    email: 'owner@joespizza.com',
    password: 'SecurePass123!',
  }),
});

const { data } = await response.json();

// 2. Store access token IN MEMORY (NOT localStorage)
let accessToken = data.accessToken;

// 3. Use access token in requests
const menuResponse = await fetch('/api/v1/admin/menu', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});
```

### Token Refresh Flow

```typescript
// When access token expires (401 error)
try {
  const response = await fetch('/api/v1/admin/menu', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  if (response.status === 401) {
    // Try to refresh
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Sends refresh token cookie
    });
    
    if (refreshResponse.ok) {
      const { data } = await refreshResponse.json();
      accessToken = data.accessToken; // Update in-memory token
      
      // Retry original request
      return fetch('/api/v1/admin/menu', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
    } else {
      // Refresh failed - redirect to login
      window.location.href = '/login';
    }
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

### Logout Flow

```typescript
await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  credentials: 'include',
});

// Clear in-memory token
accessToken = null;

// Redirect to login
window.location.href = '/login';
```

## Database Schema

### RestaurantUser Model

```prisma
model RestaurantUser {
  id           String   @id @default(uuid())
  restaurantId String
  email        String
  passwordHash String
  name         String
  role         UserRole
  tokenVersion Int      @default(0) // For refresh token revocation
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([restaurantId, email])
  @@index([restaurantId])
}

enum UserRole {
  OWNER
  MANAGER
  STAFF
}
```

## Testing

### Test Credentials

After running seed script (`npm run seed:auth`):

```
Restaurant Slug: test-restaurant
Emails:
  - owner@test.com (OWNER)
  - manager@test.com (MANAGER)
  - staff@test.com (STAFF)
Password: Password123!
```

### Using test-auth.http

1. Open `test-auth.http` in VS Code with REST Client extension
2. Run "Login (Owner)" request
3. Copy accessToken from response
4. Replace `YOUR_ACCESS_TOKEN` in other requests
5. Test different endpoints and RBAC scenarios

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-restaurant",
    "email": "owner@test.com",
    "password": "Password123!"
  }' \
  -c cookies.txt

# Get Me
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt

# Refresh
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

## Security Best Practices

### ✅ DO

- Store access tokens in memory (JavaScript variables)
- Use httpOnly cookies for refresh tokens
- Use HTTPS in production
- Implement rate limiting on auth endpoints
- Hash passwords with bcrypt (rounds >= 12)
- Validate token expiration
- Implement token versioning for revocation
- Use strong JWT secrets (min 32 characters)

### ❌ DON'T

- Store access tokens in localStorage (XSS vulnerable)
- Store access tokens in cookies without httpOnly
- Use weak passwords or secrets
- Skip token expiration
- Log passwords or tokens
- Reuse JWT secrets across environments
- Skip rate limiting on login endpoints

## Troubleshooting

### Issue: "Authorization header is required"
**Solution:** Add `Authorization: Bearer <token>` header to request

### Issue: "Token has expired"
**Solution:** Call `/auth/refresh` to get new access token

### Issue: "Token has been revoked"
**Solution:** User logged out, redirect to login

### Issue: "Refresh token not found"
**Solution:** Ensure `credentials: 'include'` in fetch, check cookie settings

### Issue: "Access denied. Required role: OWNER"
**Solution:** Current user doesn't have required role for this operation

### Issue: "Invalid credentials"
**Solution:** Check email, password, and restaurant slug are correct

## Migration from Legacy Auth

If migrating from old `/api/auth` routes:

1. ✅ Update client to use `/api/v1/auth/*` endpoints
2. ✅ Change token storage from localStorage to in-memory
3. ✅ Add `credentials: 'include'` to all fetch calls
4. ✅ Implement token refresh logic
5. ✅ Update middleware from `authenticate` to `requireAuth()`
6. ✅ Update RBAC from `authorize(['OWNER'])` to `requireRole('OWNER')`
7. ✅ Update token payload to include `role` instead of `userRole`

## Related Documentation

- [TENANT_RESOLUTION.md](./TENANT_RESOLUTION.md) - Multi-tenant architecture
- [API.md](./API.md) - Full API reference
- Swagger UI: http://localhost:3000/api-docs
