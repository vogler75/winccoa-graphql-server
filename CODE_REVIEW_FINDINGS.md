# Code Review Findings

Review scope: GraphQL and REST server implementation.

## 1. [P1] Login exemption bypasses auth for the whole operation

File: `index.js:573-574`

The auth plugin returns as soon as any top-level field is named `login`, so a single unauthenticated mutation can include `login` plus other mutating fields. Because the operation is exempted before execution, those sibling mutations bypass both authentication and readonly checks.

Recommendation: Restrict the exemption to operations whose only root field is `login`, or move authorization into field-level guards.

## 2. [P1] GraphQL subscriptions use the global WinCC OA manager

File: `index.js:260-263`

`buildContextAwareResolvers` only wraps direct function resolvers. Subscription fields are resolver objects with `subscribe`, so they are copied unchanged. Those `subscribe` functions close over the global `winccoa` from `createSubscriptionResolvers`, meaning WebSocket subscriptions do not use the per-session manager/user context.

Impact: This breaks session isolation and can run subscriptions under the wrong WinCC OA identity.

Recommendation: Make subscription resolver objects dispatch through `contextValue.v2Resolvers` or refactor subscription resolvers to use `context.winccoa`.

## 3. [P1] Public debug endpoint leaks bearer tokens

File: `index.js:712-727`

`/debug-headers` is unauthenticated and returns `allHeaders: req.headers`, including `authorization` and any proxy/session headers. On a remotely reachable server this exposes live credentials to anyone who can call the endpoint.

Recommendation: Remove this endpoint or gate it behind an explicit local-only/debug-only admin check, and never echo auth headers.

## 4. [P2] Missing sessions fall back to global privileges

File: `index.js:226-233`

After a token validates, a missing session falls back to the global WinCC OA manager instead of rejecting the request. A request racing with logout or idle cleanup can therefore continue against the global manager after its per-user session was destroyed.

Recommendation: Treat a missing non-static session as unauthorized and return `401` or GraphQL `Unauthorized`.

## 5. [P2] Production auth can silently fall back to dev credentials

File: `lib/auth.js:198-203`

When no configured users are present, `AUTH_MODE=config` accepts `dev/dev`, and the JWT secret also has a hardcoded default. This is useful locally but unsafe as a production default.

Recommendation: Gate dev credentials behind an explicit `NODE_ENV !== 'production'` or `ALLOW_DEV_LOGIN=true`, and fail startup when auth is enabled without credentials or a custom JWT secret.

## 6. [P2] tagSubscribe interpolates DPE names into dpQuery

File: `graphql/subscriptions.js:290-292`

`dpeName` is inserted directly into a quoted dpQuery string. A crafted name containing quotes can alter the query instead of being treated as a datapoint name.

Recommendation: Validate allowed DPE syntax or escape single quotes before constructing the query.

## 7. [P3] Readonly users cannot logout via GraphQL

File: `index.js:581-583`

The readonly guard blocks every mutation except operations containing `login`, so `mutation { logout }` is forbidden for readonly JWT users even though logout is a session-management action.

Recommendation: Allowlist `logout` alongside `login`, preferably with stricter per-root-field auth logic.

## 8. [P3] npm test targets a missing file

File: `package.json:7-10`

The repository has a numbered integration runner at `tests/run-all.js`, but `npm test` still runs `node test-graphql.js`, which does not exist. This makes the standard test command fail before any tests run.

Recommendation: Point `npm test` at `node tests/run-all.js` or add separate scripts for full and suite-specific runs.

