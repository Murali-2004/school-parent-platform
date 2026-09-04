# School–Parent Platform — Backend

Node.js + Express + MongoDB (Mongoose). **Modular monolith**: one Express app,
internally split into feature modules. Multi-tenant: every tenant-owned row
carries a `schoolId` and access is scoped by **tenant → role → relationship**.

## Requirements

- Node.js **>= 20**
- MongoDB (local `mongod` is fine; transactions are not used so a replica set is
  not required)

## Setup

```bash
cd server
cp .env.example .env        # then edit values (secrets!)
npm install
npm run seed                # creates SUPER_ADMIN + a demo school + SCHOOL_ADMIN
npm run dev                 # http://localhost:4000
```

Health check: `GET http://localhost:4000/api/v1/health`

> `bcrypt` is a native module. If `npm install` can't build it on Windows, run
> `npm remove bcrypt && npm install bcryptjs` and change the import in
> `common/utils/password.js` to `bcryptjs` (identical API).

## Project layout

```
server/
├── config/            env.js (validated), db.js
├── common/
│   ├── constants.js   ROLES, USER_STATUS, ...
│   ├── middleware/     authMiddleware, roleMiddleware, schoolScope,
│   │                   relationshipGuard, validate, rateLimiters, errorHandler
│   ├── plugins/        tenantPlugin.js  (Mongoose query guard)
│   └── utils/          ApiError, asyncHandler, jwt, password, zodHelpers
├── models/            index.js — model registry (imports every model)
├── modules/           feature modules (the "modular" in modular monolith)
│   ├── auth/           register / login / refresh / logout / me
│   ├── schools/        School model + SUPER_ADMIN CRUD
│   ├── users/          User + RefreshToken models
│   ├── teachers/       Teacher model + profile/assignment routes
│   ├── parents/        Parent model + profile routes
│   ├── students/       Student model + CRUD (reference for the guard stack)
│   └── academics/      Class + Section models + admin CRUD
├── routes/            index.js — mounts every module under /api/v1
├── scripts/           seed.js
├── app.js             Express assembly (importable by tests)
└── server.js          DB connect + listen
```

## The three isolation layers (read `common/` for the full comments)

| Layer | File | Question it answers |
|---|---|---|
| **Tenant (ergonomic)** | `common/middleware/schoolScope.js` | Injects `schoolId` for you: `req.scoped(Model)`, `req.tenantFilter({...})`. |
| **Tenant (safety net)** | `common/plugins/tenantPlugin.js` | Any query on a tenant model **without** a `schoolId` filter **throws**. Escape hatch: `.skipTenantGuard()` (greppable). |
| **Role** | `common/middleware/roleMiddleware.js` | `roleMiddleware(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)` — is this role allowed on this route at all. |
| **Relationship (row-level)** | `common/middleware/relationshipGuard.js` | Is *this* student mine (parent) / in a class I teach (teacher)? `parentOwnsStudent`, `teacherAssignedToClass`, `teacherTeachesStudent`, `studentAccessGuard`. |

`schoolId` always comes from the **signed JWT** (`req.user.schoolId`), never from
a request body/param, so it can't be spoofed. `SUPER_ADMIN` has
`schoolId: null` and must use `req.crossTenant(Model)` for deliberate
cross-school reads.

## Auth

- **Access token**: JWT, `JWT_ACCESS_TTL` (default 20m). Payload:
  `{ sub, role, schoolId, email }`.
- **Refresh token**: opaque random string, stored **hashed** in `RefreshToken`
  with **rotation** and **reuse detection** (presenting a revoked token revokes
  the user's whole active set). TTL: `REFRESH_TOKEN_TTL_DAYS` (default 14).
- Endpoints: `POST /api/v1/auth/{register,login,refresh,logout}`,
  `GET /api/v1/auth/me`.
- Public `register` only allows `PARENT` / `TEACHER`. Admins come from the seed
  script or a privileged admin flow.

## Security baseline

`helmet`, CORS locked to `ALLOWED_ORIGINS`, `express-rate-limit` (global +
tight limiter on `/auth/login` & `/auth/register`), and **Zod** validation on
every route body / relevant params & query.

## API quick reference

```
GET    /api/v1/health

POST   /api/v1/auth/register            {name,email,phone?,password,schoolId,role?}
POST   /api/v1/auth/login               {email,password,schoolId?}
POST   /api/v1/auth/refresh             {refreshToken}
POST   /api/v1/auth/logout              {refreshToken}
GET    /api/v1/auth/me                  (Bearer)

POST   /api/v1/schools                  SUPER_ADMIN
GET    /api/v1/schools                  SUPER_ADMIN
GET    /api/v1/schools/:schoolId        SUPER_ADMIN | SCHOOL_ADMIN(own)
PATCH  /api/v1/schools/:schoolId        SUPER_ADMIN

POST   /api/v1/academics/classes        SCHOOL_ADMIN
GET    /api/v1/academics/classes        SCHOOL_ADMIN
POST   /api/v1/academics/sections       SCHOOL_ADMIN
GET    /api/v1/academics/sections       SCHOOL_ADMIN

GET    /api/v1/teachers/me              TEACHER
GET    /api/v1/teachers                 SCHOOL_ADMIN
PATCH  /api/v1/teachers/:id/subjects    SCHOOL_ADMIN
POST   /api/v1/teachers/:id/assignments SCHOOL_ADMIN   {classId,sectionId?}
DELETE /api/v1/teachers/:id/assignments SCHOOL_ADMIN   {classId,sectionId?}

GET    /api/v1/parents/me               PARENT
GET    /api/v1/parents                  SCHOOL_ADMIN

POST   /api/v1/students                 SCHOOL_ADMIN
GET    /api/v1/students                 SCHOOL_ADMIN | TEACHER(their classes) | PARENT(their children)
GET    /api/v1/students/:studentId      + relationship guard
PATCH  /api/v1/students/:studentId      SCHOOL_ADMIN
POST   /api/v1/students/:studentId/parents  SCHOOL_ADMIN   {parentId}
```
