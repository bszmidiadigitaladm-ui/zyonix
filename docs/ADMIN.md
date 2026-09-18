# Admin panel

`/admin` is an internal back office. It is not linked from the app and returns a
plain 404 to everyone who is not an administrator.

## Who is an admin

Only rows in `public.admin_users` (migration `0039_admin.sql`). The table has no
client-facing policy, so the only way to add or remove an administrator is SQL in
the Supabase editor:

```sql
-- add
insert into public.admin_users (user_id, note)
select id, 'support' from auth.users where email = 'someone@example.com'
on conflict (user_id) do nothing;

-- remove
delete from public.admin_users
where user_id = (select id from auth.users where email = 'someone@example.com');
```

## Access control (every request)

1. Signed-in session, validated with the Auth server (`getUser()`).
2. Membership in `admin_users` (read with the service role).
3. Second factor: the session must be `aal2` (TOTP). First visit enrolls an
   authenticator app at `/admin/mfa`; later sessions just verify a code.
4. API routes additionally rate-limit (120/min per admin).

Layouts don't re-run on client-side navigation, so **every admin page calls
`requireAdminPage()` itself** — keep doing that for new pages, and use
`requireAdminApi()` for new routes under `/api/admin`.

## LGPD rules baked in

- Every action needs a written **reason**; it is stored in `admin_audit_log`.
- The audit entry is written **before** the action; if logging fails, nothing happens.
- `admin_audit_log` is append-only (a trigger blocks UPDATE/DELETE, even for the
  service role) and has no FK to `auth.users`, so it outlives deleted accounts.
- Admins see counts and account/plan data, never the content of chats, prayers or
  notes. The single exception is one crisis-flagged message, opened with a reason.
- Data-subject requests (access/portability export, deletion, correction) are
  fulfilled from the user's page and use the same code as the self-service flows.
- No impersonation.

## What it does not do

Refunds and cancellations happen in Hotmart. "Revoke access" here only changes our
own records (and says so on screen). A complimentary plan can't overwrite a paid
Hotmart subscription.
