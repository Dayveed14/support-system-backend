# SupportDesk API (Node.js + Express + MySQL)

Authentication backend for the SupportDesk frontend. It implements registration, login, JWT authentication, and a protected current-user endpoint. Public registration always creates a `customer`; never accept a role from the public registration request.

## Requirements
- Node.js 18+
- XAMPP with MySQL/MariaDB running (or MySQL/TiDB)

## 1. Create the database
1. Start **MySQL** in the XAMPP Control Panel.
2. Open phpMyAdmin (`http://localhost/phpmyadmin`).
3. Import `database.sql` from this folder. It creates the `supportdesk` database and `users` table.

You can also run the SQL file from the MySQL command line. The schema uses standard MySQL features and is suitable for local XAMPP testing and later TiDB use.

## 2. Configure environment
From this `backend` directory, copy `.env.example` to `.env` and configure it. Typical XAMPP defaults are:

```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=supportdesk
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=12
```

Use a long, random JWT secret; do not commit `.env` or share it. If your XAMPP MySQL root user has a password, set `DB_PASSWORD` accordingly.

## 3. Install and start
```bash
cd backend
npm install
npm run dev
```

Start the frontend in a second terminal from the project root:
```bash
npm install
cp .env.example .env
npm run dev
```

On Windows Command Prompt, copy environment examples with `copy .env.example .env` instead of `cp`. Restart Vite after changing `.env`.

## Endpoints
Base URL: `http://localhost:4000/api`

- `GET /api/health` — API health check
- `POST /auth/register` — `{ "name": "Ada Example", "email": "ada@example.com", "password": "strongpass123" }`
- `POST /auth/login` — `{ "email": "ada@example.com", "password": "strongpass123" }`
- `GET /auth/me` — protected; requires `Authorization: Bearer <token>`

Successful login/registration returns `{ success, message, data: { user, token } }`. The frontend stores the JWT in localStorage and uses it to restore the signed-in session. Logout clears the local token.

## Roles
Registration is customer-only. Agent/admin users should be provisioned through a trusted administrative process; do not allow a public client to choose its role. For local development, after creating an account you can change its role directly in phpMyAdmin if you need to test the existing agent/admin dashboard, e.g. update a specific user's `role` to `agent` or `admin`.

## Structure
```text
src/
  config/       env and database pool
  controllers/  HTTP request/response handling
  middleware/   JWT auth and error handling
  routes/       auth endpoint definitions
  services/     registration, login, password hashing, token generation
  utils/        ApiError and async handler
```

The current ticket/dashboard data remains frontend mock data; this backend only implements authentication and registration, as requested.


## Ticket replies, status and assignment

The API now persists ticket replies in `ticket_replies` and persists ticket status and agent assignment in `tickets`.

### Existing XAMPP database

If you already imported the original schema and have users/tickets in MySQL, import `migrations/001_ticket_replies.sql` through phpMyAdmin. It only adds the replies table and preserves existing records. For a brand-new database, `database.sql` includes this table.

### Ticket endpoints (JWT required)

- `GET /api/tickets` — list tickets visible to the current user, including persisted replies.
- `POST /api/tickets` — create a customer ticket.
- `GET /api/tickets/agents` — list support agents for the staff UI.
- `POST /api/tickets/:ticketId/replies` — add a reply; body: `{ "message": "..." }`.
- `PATCH /api/tickets/:ticketId/status` — update status; body: `{ "status": "Pending" }`. Valid statuses: `Open`, `Pending`, `Resolved`, `Closed`.
- `PATCH /api/tickets/:ticketId/assignment` — admin-only assignment; body: `{ "agentId": 12 }` or `{ "agentId": null }` to unassign.

The `:ticketId` path parameter is the numeric database ID (`dbId` on the ticket object), not the human-readable reference like `TKT-00001`. The frontend handles this automatically.

### Roles

- Customers can view and reply to their own non-closed tickets.
- Agents can view/reply to tickets assigned to them or currently unassigned, and update those tickets' statuses.
- Admins can view/reply to all tickets, update status, and assign/unassign agents.
- Public registration still creates customer accounts only. To promote a trusted user, run `UPDATE users SET role = 'agent' WHERE email = 'agent@example.com';` or set `role = 'admin'` for an administrator, then sign out and sign in again so the new role is reflected in the JWT.
