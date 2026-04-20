# PRD: Multi-tenant pharmacy management and inventory

## Problem Statement

Pharmacy groups need to run **inventory and purchasing** across **many branches** without losing **traceability, financial accuracy, or operational control**. Today the product behaves like a **single global catalog**: each medicine carries one **aggregate stock** number, **buy/sell** transactions adjust that total **without lots or per-branch balances**, and there is **no tenant isolation**, **no branch model**, **no supplier or purchase-order lifecycle**, **no inter-branch transfers**, **no approval workflows** for sensitive stock movements, **no append-only audit trail**, or **line-level tax** modeling.

That gap blocks real-world rollout: **HQ cannot buy for a specific branch** with **branch sign-off**, staff cannot see **which branch** holds stock, **recalls and expiry discipline** cannot be enforced at **batch level**, and **COGS/margin** cannot be tied to **actual received batches**.

## Solution

Deliver a **multi-tenant pharmacy operations platform** where:

- A **tenant** is the **owning organization**; a **branch** is a **physical site** with its own **on-hand inventory**.
- **Every receipt** captures **lot and expiry** (and **unit cost**), driving **FEFO allocation** for **sales** and **outbound transfers**, with **authorized overrides** and reasons.
- **HQ** maintains **canonical products** (plus **branch “draft” products** that cannot appear on **HQ purchase orders** until **published**) and **supplier masters** (**HQ-only** supplier creation).
- **Purchase orders** can be created by **HQ for a branch**; the **branch always approves** (approve / reject with reason / request changes) before the PO is committed.
- **Inter-branch transfers** move **explicit lots**; **org-wide availability** is visible to **authorized roles** for sourcing decisions.
- **Inventory decreases** outside normal sales/transfers (including **stock count variances** and **supplier returns**) use **dual approval** with **branch manager** and **HQ**, including **delegation** and **HQ break-glass** when the manager is unavailable, and a controlled exception allowing **one HQ user** to complete **both** approvals for **single-branch tenants** or when the **branch manager** cannot act.
- **Lot states** (e.g. **quarantine**, **recall block**) prevent **allocation** by default.
- **Tax** is modeled **per line**; **currency** is **single per tenant** in v1.
- **Sales** support **anonymous OTC** and **patient-linked** sales, with **rules** for when a patient is required (**full prescription workflow deferred**).
- **Append-only audit events** cover sensitive actions; **in-app and email** notifications support workflow queues.
- The system is **online-first** in v1 (no offline sync).

## Tax model v1

- **Tenant tax categories** store a **rate** (decimal) and are assigned to products.
- **Branch tax settings** provide a **default tax category** and an optional **rate override** for the branch.
- **Line tax** is computed at creation time:
  - **Tax base** = quantity × unit price.
  - **Tax rate** = branch override rate (if set) → else product tax category rate → else null.
  - **Tax amount** = tax base × tax rate.
- **Recalculation rules**: line tax is **snapshotted** on creation. Updates to tax categories or branch settings **do not** retroactively change stored line tax. If tax needs to change, create a new line or adjustment.
- If unit price or tax rate is missing, the corresponding tax fields remain null.

## User Stories

### Tenancy, onboarding, and administration

1. As a **platform admin**, I want to **provision a new tenant** and its **first HQ admin**, so that **new pharmacy organizations** can be onboarded **safely without public signup**.
2. As an **HQ admin**, I want to **create and manage branches**, so that **each physical site** has a **clear identity** for stock and workflows.
3. As an **HQ admin**, I want to **invite users** and assign **roles and branch access**, so that **staff only see and act** where permitted.
4. As an **HQ admin**, I want to **configure tax categories and branch tax settings**, so that **line-level tax** is calculated **consistently per jurisdiction**.
5. As an **HQ admin**, I want to **configure approval exception policies** (e.g. **single-branch**, **break-glass**) with **audit metadata**, so that **real-world staffing constraints** do not **silently weaken controls**.

### Identity, authorization, and security

6. As a **branch user**, I want to **log in** and **select/act within my assigned branches**, so that I do not **accidentally operate** on the wrong site.
7. As an **HQ user**, I want **HQ-scoped permissions** (purchasing, publishing, approvals), so that **central functions** are **segregated** from **branch operations** where needed.
8. As a **branch manager**, I want to **assign temporary delegation** when I am away, so that **approvals** are not **blocked** without **accountability**.
9. As an **HQ admin**, I want to **activate break-glass branch-manager override** with **reason and time window**, so that **emergencies** are handled with **traceability**.
10. As a **security reviewer**, I want **patient record access** to emit **audit events**, so that **privacy expectations** can be demonstrated.

### Product catalog (tenant-wide + branch overlays + drafts)

11. As an **HQ catalog manager**, I want to **create and publish canonical products**, so that **all branches share one definition** of a SKU.
12. As a **branch user**, I want to **set branch overlays** (e.g. **reorder min/max**, **bin location**, **local pricing fields**), so that **operations** reflect **site reality** without **forking** the canonical product.
13. As a **branch user**, I want to **create draft local products** with **warnings**, so that I can **receive and sell** edge cases **without waiting for HQ**—while **HQ POs** remain **clean**.
14. As an **HQ catalog manager**, I want to **promote draft products** to **tenant canonical**, so that **catalog sprawl** is **controlled**.
15. As an **HQ catalog manager**, I want **deduplication hints** on **barcode/GTIN + key attributes**, so that **duplicate SKUs** are **caught early**.

### Suppliers (HQ-only)

16. As an **HQ purchaser**, I want to **create and maintain supplier records**, so that **purchasing** references **authorized suppliers only**.
17. As a **branch manager**, I want to **request a new supplier** (optional if implemented as tickets rather than self-create), so that **local discovery** still flows into **HQ governance**.
18. As an **HQ purchaser**, I want to **map supplier catalog details to tenant products**, so that **PO lines** are **accurate and fast to enter**.

### Purchase orders (HQ-for-branch + branch approval)

19. As an **HQ purchaser**, I want to **create a PO addressed to a supplier** with **receive-at branch**, so that **central buying** lands in the **right inventory bucket**.
20. As a **branch manager**, I want to **approve a HQ-created PO as-is**, so that **branch reality** is **explicitly accepted** before commitment.
21. As a **branch manager**, I want to **reject a HQ-created PO with a reason**, so that **incorrect orders** are **stopped early**.
22. As a **branch manager**, I want to **request changes** and return the PO to **HQ revision**, so that **pack size, quantities, and timing** can be corrected **collaboratively**.
23. As an **HQ purchaser**, I want to **revise and resubmit** a PO after **request changes**, so that the workflow **closes cleanly** with **history**.
24. As a **branch user**, I want **notifications** when a PO needs **my approval**, so that **purchasing** does not **stall**.

### Receiving, lots, costing

25. As a **branch receiver**, I want to **receive goods against a PO** into **my branch**, capturing **lot, expiry, quantity, and unit cost**, so that **inventory** is **traceable and valued** correctly.
26. As a **branch receiver**, I want to be **blocked** from receiving **expired or invalid lots** according to policy, so that **bad stock** does not enter **sellable inventory** (exact validation rules to be defined).
27. As a **finance user**, I want **inventory valuation** to reflect **lot costs**, so that **margins** match **supplier reality**.
28. As an **auditor**, I want **receipt events** tied to **PO lines and lots**, so that **investigations** are **feasible**.

### Stock movements: transfers

29. As a **branch user**, I want to **create an inter-branch transfer** from **Branch A to Branch B**, so that I can **rebalance** stock physically.
30. As a **branch user**, I want **source lots auto-selected by FEFO** by default, so that **expiry risk** is reduced **without manual picking** every time.
31. As an **authorized user**, I want to **override lot selection** with **reason**, so that **legitimate exceptions** are supported with **auditability**.
32. As a **receiving branch user**, I want to **confirm inbound transfer receipt** against **expected lots/quantities**, so that **loss in transit** is **visible**.
33. As an **authorized user**, I want **read-only visibility** into **other branches’ on-hand** (where permitted), so that I can **source transfers** efficiently.

### Sales (OTC + optional patient; no full Rx v1)

34. As a **cashier**, I want to **sell OTC without selecting a patient**, so that **throughput** stays high for **simple sales**.
35. As a **cashier**, I want the system to **require a patient** for **rule-defined products/categories**, so that **compliance intent** is **enforced** even before **full Rx**.
36. As a **cashier**, I want **FEFO lot allocation** automatically applied on sale, so that **batch discipline** is **default**.
37. As an **authorized user**, I want **lot override on sale** with **reason**, so that **exceptions** are **traceable**.
38. As a **customer/patient-facing workflow user**, I want **line-level tax** computed and stored, so that **receipts and reporting** are **consistent**.

### Lot status: quarantine / recall blocking

39. As a **quality role**, I want to **quarantine a lot** to **block allocation**, so that **suspect stock** cannot be **sold or transferred** by default.
40. As a **quality role**, I want **recalled lots** to be **hard-blocked** with **only return/destruction paths**, so that **recall compliance** is **enforceable**.

### Adjustments and stock counts (dual approval)

41. As a **branch staff member**, I want to **request an inventory adjustment** (shrink, damage, expiry destruction, samples, etc.) **against specific lots**, so that **changes** are **explainable**.
42. As a **branch manager**, I want to **approve or deny** adjustment requests per the defined approval chain, so that **branch accountability** is preserved.
43. As an **HQ approver**, I want to **complete the second approval**, so that **dual control** is enforced—**except** where **policy allows** the **combined HQ path** with **explicit audit flags**.
44. As an **inventory lead**, I want **stock count sessions** that produce **variance proposals** requiring **the same dual approval** for **both increases and decreases**, so that **counts** have the **same control posture** as adjustments.
45. As an **auditor**, I want **reason codes and notes** on adjustments and variances, so that **month-end explanations** are possible.

### Supplier returns (RMA / credit) — dual approval + HQ confirmation

46. As a **branch user**, I want to **initiate a supplier return** tied to **specific lots** (and ideally **source receipts/PO**), so that **returns** are **traceable**.
47. As an **HQ user**, I want to **initiate returns** as well, so that **central coordination** is supported.
48. As an **HQ user**, I want to **confirm/publish the return** against the **supplier relationship** (authorization/credit expectations), so that **finance and supplier comms** align.
49. As **both approvers**, I want **dual approval before stock leaves**, so that **returns** match the **risk posture** of other **inventory decreases**.

### Notifications and workflow UX

50. As a **user**, I want **in-app notifications** for **pending approvals** and **critical workflow events**, so that I can **act quickly**.
51. As a **user**, I want **email notifications** for the same, so that **I don’t miss** tasks when not **in the app**.

### Audit and investigations

52. As a **compliance user**, I want an **append-only audit trail** for **inventory movements, approvals, PO lifecycle, permission changes, and patient access**, so that investigations can rely on **non-repudiation**.
53. As a **compliance user**, I want to **filter/export audit events** by **tenant, branch, user, entity, time**, so that **reviews** are practical.

### Reporting (baseline)

54. As an **HQ user**, I want **expiry horizon reports** by **branch and lot**, so that **waste** can be managed proactively.
55. As an **HQ user**, I want **stock valuation by branch**, so that **financial oversight** is possible.
56. As a **branch manager**, I want **exception reports** (overrides, break-glass, quarantine blocks), so that **risk** is visible.

### Platform operations

57. As an **operator**, I want **online-first** semantics with **clear failure modes** when offline, so that users **do not assume** transactions succeeded when they did not.

## Implementation Decisions

### Current baseline (verified at PRD time)

- Backend is **NestJS + TypeORM** with modules for **patients** and **medicines**.
- **Medicines** store a **single aggregate stock** and **transactions** are **BUY/SELL** without **branch**, **tenant**, **lot**, **PO**, or **tax lines**.
- **Patients** use a **global** uniqueness constraint (e.g. phone) without **tenant scoping** yet.
- **Automated tests** may be absent or minimal; testing strategy should be **introduced** with this program of work.

### Target architecture (modules to build or substantially modify)

- **Tenancy module (deep)**: centralized helpers for **`tenantId` scoping**, request context propagation, and **enforcement guards**. *Interface concept:* `TenantContext` + `assertTenantScope(entity)`.
- **Branches module**: branch CRUD, user-to-branch assignments, branch **tax configuration** hooks.
- **Catalog module**: canonical products, **draft branch products**, **publish/dedupe** workflow, **branch overlays**.
- **Suppliers module**: HQ-only supplier master, product-supplier mapping.
- **Purchasing module**: PO entities, **HQ-for-branch** authoring, **branch approval** state machine (approve/reject/request-changes), linkage to receipts.
- **Inventory ledger module (deep)**: **lot balances per branch**, immutable movement records (conceptually append-only ledger entries), and invariants like **no negative lot qty**, **blocked lots cannot allocate**, **FEFO ordering rules**.
- **Allocation engine (deep)**: domain service implementing **FEFO selection**, **override inputs**, and **deterministic outputs** for sales/transfers. *Stable interface:* `allocateLots({ branchId, productId, quantity, policy, override? }) -> allocation[]`.
- **Receiving module**: PO receipt posting, **lot+expiry+cost** creation, tax fields as needed at line level.
- **Transfers module**: transfer orders, shipment/receipt confirmation, lot allocations from source branch.
- **Sales module** (or evolve transactions): sell lines with **patient optional**, **tax lines**, **lot allocations**, **COGS** derived from lot unit cost.
- **Adjustments & counts module**: adjustment requests, count sessions, variance postings, **approval chaining**.
- **Returns module**: supplier return documents, **HQ confirmation**, dual approvals, stock decrement on dispatch.
- **Approvals orchestration (deep)**: **BM + HQ dual approval**, **delegation**, **break-glass windows**, and **combined HQ exception** with explicit **`approval_path`** metadata. *Stable interface:* `submitApproval`, `recordDecision`, `evaluatePolicy`.
- **Audit sink (deep)**: append-only writer with **structured event schema**; subscribers/hooks from domain services. *Stable interface:* `recordAuditEvent(event)`.
- **Notifications module**: in-app notification store + email dispatcher; templated events for approval queues.
- **Policy/rules module**: product/category rules requiring patient on sale; tax category resolution; future extension point for Rx.

### Schema and data model (high level)

- Add **`tenantId`** (and **`branchId`** where appropriate) across **patient**, **product**, **inventory**, **transactions**, **POs**, **audit events**, **notifications**.
- Replace or migrate **aggregate stock** into **branch lot balances**; use transitional compatibility only if required for migration windows.
- Introduce **lot** entities with **status**, **expiry**, **unit cost**, **received reference** (PO receipt line).
- Introduce **approval tables** or **generic approval instances** referencing domain objects (PO, adjustment, variance, return).

### Patient tenancy migration (validation)

- Migration `AddTenancyAndBranches1750000000000` seeds a **Legacy tenant/branch** and backfills null `tenantId`/`branchId` for `patients` and `patient_history`.
- Uniqueness is enforced on **(`tenantId`, `phone`)** via `UQ_patients_tenant_phone`.
- Sample data validation: create two tenants/branches, insert patients with the same phone in each tenant, run the migration, and confirm the legacy backfill plus per-tenant uniqueness (duplicates allowed across tenants, rejected within a tenant).

### API contracts (directional)

- All mutating endpoints require **tenant context** and enforce **branch permissions**.
- Read endpoints for **org-wide stock visibility** are **explicitly permission-gated**.
- Webhooks are **out of scope** unless added later; **email/in-app** are in scope.

### Interactions between modules

- **Purchasing → Receiving → Inventory ledger** posts lots and costs.
- **Sales/Transfers → Allocation engine → Inventory ledger** consumes lots and computes COGS.
- **Adjustments/Returns/Counts → Approvals orchestration → Inventory ledger** applies changes only when approved.
- **All sensitive modules → Audit sink**.

## Testing Decisions

- **Good tests** assert **observable outcomes** and **invariants**, not internal private methods: e.g. after a sale, **lot quantities** and **COGS** match expectations; **blocked lots** never allocate; **dual approval** blocks posting until satisfied; **break-glass** emits **audit metadata**.
- **Modules to prioritize for automated tests**:
  - **Allocation engine** (FEFO, tie-breaking, expiry edge cases, override behavior).
  - **Approvals orchestration** (standard path, delegation, break-glass, combined HQ exception flags, segregation rules).
  - **Inventory ledger** invariants (non-negative, concurrency/posting rules at the service boundary).
  - **PO approval state machine** (reject/request-changes loops).
- **Prior art**: may be limited in-repo; introduce a standard test runner with **test factories** for tenants/branches/lots.

## Out of Scope (v1)

- **Full prescription (Rx) workflow** (dispensing, transfers, adjudication, clinical checks beyond basic patient gating hooks).
- **Offline-first POS** and **conflict reconciliation**.
- **Multi-currency** and **FX**.
- **Public self-serve tenant signup** (v1 is **admin-provisioned**).
- **Wholesaler EDI integrations** (unless explicitly added later).
- **Deep accounting/ERP replacement** (export to accounting may come later; not defined here).

## Further Notes

- Expect a **foundational migration** rather than incremental tweaks relative to a single-global-stock model.
- Confirm whether branches get a formal **“supplier request”** entity or strict **HQ-only intake** via external process.
- **Category-based vs universal lot rules**: this PRD assumes **lot + expiry on every receipt for every SKU** as agreed in design interviews; if that changes, update **Receiving**, **Allocation**, and **Reporting** sections together.
