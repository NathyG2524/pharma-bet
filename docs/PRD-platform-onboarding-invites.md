# PRD: Platform onboarding, tenant provisioning & invites

**Tracking:** GitHub issue [#40](https://github.com/NathyG2524/pharma-bet/issues/40) (parent). Vertical slices: [#41](https://github.com/NathyG2524/pharma-bet/issues/41)–[#46](https://github.com/NathyG2524/pharma-bet/issues/46).

## Problem Statement

The product needs a **clear, secure onboarding model** for **multi-tenant** operations: a **platform owner** can provision **customer organizations (tenants)** and the **first HQ administrator** without open self-service org creation; **customer staff** join **only through invites**. The application has **email/password login** and related auth, but **open registration** is not desired in production. **Tenant creation** today can attach an **`hq_admin` membership by user id** immediately rather than an **invite-first** flow. **Roles and tenant context** can still be influenced from the **client** (headers), which is **not** appropriate for production authorization. There is **no** first-class **invite** model, **no** **copy-link** admin UX, **no** **post-login tenant/branch selection gate**, and **no** **seeded internal platform tenant + platform owner** aligned with the intended operating model.

## Solution

Introduce a **platform operations** model centered on:

1. **Seeded internal “Platform” tenant** and a **seeded platform owner user** (credentials via secure bootstrap, e.g. environment + forced rotation policy).
2. **Authoritative authorization** for **platform-admin capabilities** via a **global flag on the user record** (e.g. `platformAdmin`), **in addition to** **`platform_admin` membership** on the internal tenant for **UI tenant context** and listing in the tenant switcher.
3. **Customer tenant creation** by the platform owner: **always** requires **first HQ admin email**; **no immediate membership** for a new user until the invite is **accepted** (policy: invite creates the binding for audit consistency unless product explicitly allows instant attach for existing users).
4. **Invite-only** account creation for **customer users**: **`/invite/[token]`** supports **set password + activate**; **disable public registration** in production UI and restrict/disable open **`register`** API except explicit dev override.
5. **HQ admin** can create **branch-scoped invites** only (`branch_manager`, `branch_user`), **always** with **`branchId`**; **copy invite URL** in the UI for admins to share (no email provider in v1).
6. **Post-login gating**: full-screen **`/choose-tenant`** (no sidebar). **No default** when **multiple** tenants; **auto-select** only when **exactly one** tenant. **Branch step** on the same gate when the user has **multiple branch memberships** in the chosen tenant and is **not** tenant-wide HQ (`branchId` null); **single branch** auto-selects; **branch switcher** remains for ongoing use.

## User Stories

1. As a **platform owner**, I want to **log in** with seeded credentials, so that I can **operate the platform** without relying on open signup.
2. As a **platform owner**, I want my **authority** to be enforced **server-side**, so that **nobody can spoof** platform admin by changing client headers.
3. As a **platform owner**, I want to see the **internal Platform tenant** in my tenant list, so that I have a **normal tenant context** for platform-scoped work and auditing.
4. As a **platform owner**, I want to **create a customer tenant** with a **unique name**, so that each customer org is **isolated** in the system.
5. As a **platform owner**, I want to **enter the first HQ admin’s email** when creating a tenant, so that **exactly one** initial HQ admin is designated **by design**.
6. As a **platform owner**, I want the system to create an **invite** for that HQ admin when they **do not yet have an account**, so that they **cannot** use public register as the primary path.
7. As a **platform owner**, I want to **copy an invite link** after creating a tenant, so that I can **share it** out-of-band without email integration in v1.
8. As a **platform owner**, I want to see **pending invites** and **revoke** them, so that I can **invalidate** leaked or mistaken invitations.
9. As an **invited HQ admin**, I want to open an **invite link**, see my **email (read-only)**, and **set my password**, so that I can **activate** my account in one step.
10. As an **invited HQ admin**, after activation I want to receive a **session** (e.g. JWT), so that I can use the **dashboard** immediately.
11. As an **HQ admin**, I want to **invite branch staff** with role **`branch_manager`** or **`branch_user`**, so that I can **onboard** stores without platform involvement.
12. As an **HQ admin**, I want to **require a branch** on every branch invite, so that **permissions** are always **branch-scoped** as intended.
13. As an **HQ admin**, I want to **copy the invite link** for branch staff, so that I can share it **manually**.
14. As an **HQ admin**, I want to **list and revoke** branch invites, so that I maintain **control** over access.
15. As a **user with multiple tenant memberships**, I want to be **forced to pick a tenant** after login (full-screen), so that I never **accidentally** work in the wrong org.
16. As a **user with exactly one tenant**, I want the app to **skip unnecessary picking**, so that I am **not slowed down** for the common case.
17. As a **user with no tenant access**, I want a **clear empty state**, so that I know to **contact support** instead of seeing broken pages.
18. As a **branch user with exactly one branch**, I want my **branch context defaulted**, so that I can **start working** without an extra step.
19. As a **branch user with multiple branches**, I want a **second step** in the gate to **pick a branch**, so that my **active branch** is explicit before I see data.
20. As a **tenant-wide HQ user** (`branchId` null), I want the **branch gate step skipped** when inappropriate, so that HQ workflows are **not blocked** by branch selection.
21. As a **security reviewer**, I want **invite tokens** stored **hashed** server-side with **expiry** and **single-use** semantics, so that **stolen links** have **limited** impact.
22. As an **operator**, I want **audit events** for tenant creation, invite creation, invite acceptance, and revoke, so that we have a **traceable** onboarding trail.
23. As a **developer**, I want **feature flags** or environment controls for **open registration** in dev only, so that **local testing** remains practical without weakening prod.

## Implementation Decisions

- **Modules (deep interfaces to aim for)**
  - **Invite domain service**: create/revoke/validate/accept invites; encapsulates token generation, hashing, expiry, consumption, and role/tenant/branch invariants. Simple outward API; most policy inside.
  - **Platform bootstrap / seed**: idempotent creation of internal Platform tenant, platform owner user, password hash from config, `platformAdmin` flag, and `platform_admin` membership. Isolated from request handlers.
  - **Authorization resolution**: single place that builds **effective auth context** from **verified JWT** + **database** (`User`, `UserMembership`, `platformAdmin`), **not** from client-supplied role headers for security-sensitive checks. Headers may remain as transitional hints for tenant/branch UI only until fully replaced by server-derived context.
  - **Tenant provisioning**: extend **create customer tenant** to **require HQ admin email**, create **invite** (not direct membership for new emails), and return **metadata** for UI copy-link.
  - **Branch invite API**: HQ-admin-guarded; validates **branch belongs to tenant**; roles restricted to **branch_manager** / **branch_user**.
  - **Dashboard routes**: remove or hide **`/register`** in production; add **`/invite/[token]`**, **`/choose-tenant`** wizard; **Platform admin** surface vs **Organization** surface for copy-link flows.
  - **Session contract**: JWT (or equivalent) should carry **user identity**; **tenant/branch** may remain client-selected but **membership checks** must run server-side per request for protected resources.

- **Schema / data**
  - **`users`**: add **`platformAdmin`** (boolean, default false) or equivalent global role field.
  - **`invites`** (new table): type (e.g. first_hq_admin vs branch_staff), `tenantId`, optional `branchId`, email (normalized), hashed token, expiresAt, consumedAt, createdByUserId, revokedAt, role enum, timestamps.
  - **Seeded tenant**: internal Platform tenant record (name convention TBD, e.g. fixed constant or env).
  - **Memberships**: platform owner has **`platform_admin`** on Platform tenant; customer HQ admin gets **`hq_admin`** with **`branchId` null** upon invite acceptance.

- **API contracts (behavioral)**
  - **Create customer tenant** (platform): input includes **tenant name** + **first HQ email**; output includes **invite id** and/or **copy URL components** (never raw token in logs).
  - **Accept invite**: input token + password; creates user if needed; creates membership; invalidates token; returns auth session.
  - **Revoke invite**: platform or HQ admin per rules; idempotent.

- **Architectural**
  - **Production** must not trust **`x-roles`** for authorization; **JWT verification** + **DB** is the source of truth for **platformAdmin** and **membership-derived roles** for the active tenant.
  - **Copy-link base URL** from app configuration (e.g. public dashboard origin).

- **Product**
  - **Email delivery** is **out of scope** for v1; **copy link in UI** only.

## Testing Decisions

- **Good tests** assert **observable behavior**: HTTP status and body for happy paths and violations; **authorization** denials when JWT/user lacks rights; **invite** cannot be reused after acceptance; **expired/revoked** invites fail; **branch invite** rejected if branch not in tenant; **tenant create** rejected without HQ email.
- **Modules to test first**
  - **Invite domain service** (unit tests: token lifecycle, state machine, invariants).
  - **Tenant provisioning** integration tests (create tenant + invite record, no membership until accept).
  - **Accept invite** integration tests (user creation, membership, HQ vs branch roles).
  - **Auth guard / effective context** tests ensuring **platformAdmin** and **membership** drive access, not headers.
- **Prior art**: follow patterns used for **calculation or policy** tests already in the API (e.g. existing service-level tests) rather than asserting internal private methods.

**Recommendation:** require automated tests for **Invite domain service** and **accept-invite + tenant provision** flows before shipping; **dashboard E2E** optional for v1.

## Out of Scope

- **Transactional email** (SendGrid/SES/etc.) and **email templates**.
- **Self-serve “create my organization”** for arbitrary internet signups.
- **HQ admin inviting `hq_user` / additional `hq_admin`** (explicitly deferred; promotion or platform-only flows later).
- **SSO / OAuth**, **MFA**, **password reset** flows (unless minimal reset is required for bootstrap—track separately if added).
- **Multi-owner platform** administration UX (only implied by global flag; no full RBAC for “second platform owner” unless added later).

## Further Notes

- **`user_memberships.userId`** may historically be a **string**; **`users.id`** may be **UUID**—implementation should **standardize** identifiers so invites and memberships reference the same user id format consistently.
- Sensible implementation order: **schema + seed** → **invite service + APIs** → **harden auth context** → **dashboard gates + remove prod register** → **admin UIs for copy-link**.
