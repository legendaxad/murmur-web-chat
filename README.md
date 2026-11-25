# Sendbird Social Chat

Monorepo with two apps:

| Folder | Stack | Role |
|---|---|---|
| `backend/` | Node, Express, TypeScript, MongoDB/Mongoose, Zod | Auth (source of truth), users, contacts, notifications, privileged Sendbird Platform API calls |
| `frontend/` | React 19, TypeScript, Redux Toolkit + RTK Query, `@sendbird/chat` v4 | Custom chat UI |

## Run locally

```bash
npm run install:all
cp backend/.env.example backend/.env    # fill in values
npm run dev:backend                     # http://localhost:7722
npm run dev:frontend                    # http://localhost:3000 (proxies /api to the backend)
```

## Security model

- The backend is the only holder of `SENDBIRD_API_TOKEN`. **Never put secrets in `frontend/.env`**:
  CRA can inline every `REACT_APP_*` variable into the public bundle.
- Login issues a 15-minute access JWT (memory only) and a rotating, httpOnly refresh cookie
  (stored hashed, with reuse detection).
- The browser connects to Sendbird only with a short-lived **session token** issued by
  `GET /api/sendbird/session-token` after app authentication.
- Channel creation and membership changes go through the backend, which enforces blocks,
  DM policy and contacts-only groups. Messages, reactions, files and receipts go directly from
  the client to Sendbird.

## Architecture

```
backend/src/
  config/env.ts          validated env (fails fast)
  errors/                AppError + HttpCode/Message enums
  middleware/            auth (verifyAuth/retrieveAuth, CSRF header, rate limits), validate, error
  validators/            zod request schemas
  models/                User, RefreshToken, Friendship, Block, Notification
  services/              auth, token, user, contact, conversation, notification
  lib/sendbird/          Platform API client (users, channels)
  controllers/ routes/   thin HTTP layer under /api

frontend/src/
  app/                   store, typed hooks, baseApi (RTK Query + auto refresh)
  features/auth          slice, api, bootstrap, login/register
  features/messaging     sendbird/ (connection + conversation: SDK owner), slice (serializable DTOs), UI
  features/{users,contacts,conversations,notifications,profile,ui}
  components/{ui,layouts,common}   design system + shell
  theme/                 tokens (light/dark), theme effect
```
