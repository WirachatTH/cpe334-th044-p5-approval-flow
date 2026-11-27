# Software Requirements Specification (SRS)

> **Project Deliverable 1, Part A: SRS and product scope.** Workflow & Approval System (Theme 5), team TH-044_P5.
> IDs are stable: never renumber them; mark retired IDs as *withdrawn*.
> Design: [`system-sds.md`](system-sds.md). Feature mapping: [`features.md`](features.md) and [`traceability.md`](traceability.md).

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | Menelaus122 | Skeleton created | Repository structure (#2) |
| 0.2 | 2026-11-14 | Menelaus122 | First complete version | Issue #3 |
| 0.3 | 2026-11-14 | Menelaus122 | FR-01: "one generic message" applies to wrong credentials only. BR-09: "neither its requester nor its assigned reviewer", with BR-10 checked first. BR-17 and Q-06: the threshold and status name added as provisional values. D-04: rationale reworded. | Reviews of PR #22 and PR #23 |
| 0.4 | 2026-11-26 | Menelaus122 | BR-12: a rejection reason needs at least 10 characters after trimming (before: only not blank). NFR-07: the database check still covers a missing or blank reason only; the minimum is enforced by the application. | Change request #65 (Lab 7): a reason such as "No" gives the requester nothing to act on |
| 0.5 | 2026-11-26 | Menelaus122 | FR-09 and BR-12: a rejection also carries one category from a fixed list; an approval carries none. D-12 added. NFR-07: the database also keeps a category off everything but a rejection. | Change request #65 (Lab 7), widened after the course announcement asked for a change that is more than trivial |
| 0.6 | 2026-11-27 | Menelaus122 | Sprint 2, return and resubmission: BR-11 lists its two transitions; BR-16 adds the comment limit and that a reviewer acts on the current content; NFR-07 adds the return comment; D-13 added and Q-05 decided. | F-06 contract (#71) |

---

## 1. Stakeholder problem and chosen context

**Problem.** A university department approves purchase and funding requests by email and paper forms.
- Requests get lost.
- Requesters cannot see where a request stands.
- Nobody can show afterwards who approved what, when, or why.
- Nothing stops a person from approving their own request.

The department needs a controlled workflow: a person submits a request, an assigned reviewer approves or rejects
it with a recorded reason, the requester sees the outcome, and every decision leaves a permanent record.

**Chosen context.** Departmental **purchase and funding requests** in one fictional university department, for
example equipment, materials, or funding for an activity. Amounts are in Thai baht (THB). All people and data in
the system are synthetic, and no real payment or accounting system is involved.

## 2. Actors and responsibilities

| Actor | Description | Responsibilities | In Sprint 1? |
|---|---|---|---|
| Requester (`REQUESTER`) | A staff member who needs something bought or funded | Submits requests with a clear title, description, and amount; chooses the reviewer; follows the status; reads the decision and its reason | Yes |
| Reviewer (`REVIEWER`) | A staff member with budget authority, for example a unit head | Reviews requests assigned to them; approves or rejects with a reason; may also submit their own requests, which another reviewer must decide | Yes |
| Second-stage reviewer | A `REVIEWER` who gives the second approval on a high-value request | Approves or rejects requests that a first reviewer has approved and that need a second approval | No (Sprint 2, F-07) |
| Development team (operator) | The two students who run the system; not a user role in the application | Create the demo accounts with the seed, configure environments, deploy, and keep secrets out of the repository | Yes (outside the app) |

## 3. Product scope

### 3.1 In scope

- Sign-in with email and password, sign-out, and current-user identity, with access by role
- Submitting a purchase/funding request to one assigned reviewer, and following its status
- Approving or rejecting a request, with the reason and a permanent history entry
- Returning a request for changes and resubmitting it (Sprint 2)
- A second approval for high-value requests (Sprint 2)
- Filtering and searching requests, and decision summaries (Sprint 3)
- Demo accounts for each role in every environment, and a deployment that keeps its data (Lab 5)

### 3.2 Explicit exclusions

- Self-registration, password recovery, password change, and account or role administration (accounts come only from the seed)
- Real payments, budget or accounting integration, purchase orders, or currency conversion (THB only)
- File attachments on requests
- Email, LINE, or push notifications
- Comment threads or chat on a request (the decision reason is the only free text)
- Delegation or out-of-office substitution of reviewers
- Single sign-on, native mobile apps, and multiple organisations or departments

## 4. Functional requirements (FR)

Priority uses MoSCoW: **M**ust, **S**hould, **C**ould.

| ID | Requirement (observable behaviour) | Actor | Priority | Planned sprint |
|---|---|---|---|---|
| FR-01 | A user signs in with email and password. On success the app shows the user's name and role and opens the role's home screen (Review Inbox for a reviewer, My Requests for a requester). For wrong credentials it shows one generic message that does not reveal whether the email exists, and stays on Login. Throttling, an inactive account, and server errors have their own messages. | Requester, Reviewer | M | 1 |
| FR-02 | A signed-in user signs out. The session ends on the server, the app returns to Login, and protected screens and endpoints then require a new sign-in. | Requester, Reviewer | M | 1 |
| FR-03 | A signed-in user who reloads or reopens the app within the session lifetime stays signed in, and the app shows who they are. | Requester, Reviewer | M | 1 |
| FR-04 | A user submits a request with a title, description, amount in THB, and one reviewer chosen from the list of active reviewers (excluding themselves). The system gives it a request number and the status `SUBMITTED`, and shows a confirmation with the number. | Requester, Reviewer | M | 1 |
| FR-05 | A user sees a list of their own requests, newest first, showing number, title, amount, status, assigned reviewer, and submission date. An empty list shows a prompt to create a request. | Requester, Reviewer | M | 1 |
| FR-06 | A user opens one of their own requests and sees its fields, status, decision and reason (if decided), and its full history in time order. | Requester, Reviewer | M | 1 |
| FR-07 | A reviewer sees an inbox of the `SUBMITTED` requests assigned to them, oldest first, and can open each one. | Reviewer | M | 1 |
| FR-08 | The assigned reviewer approves a `SUBMITTED` request, optionally with a reason. Its status becomes `APPROVED`, and the requester sees the decision. | Reviewer | M | 1 |
| FR-09 | The assigned reviewer rejects a `SUBMITTED` request with a category and a reason (BR-12). Its status becomes `REJECTED`, and the requester sees the decision, the category, and the reason. | Reviewer | M | 1 |
| FR-10 | The navigation shows only what the user's role can use: My Requests and New Request for a requester, plus Review Inbox for a reviewer. Opening a screen the role cannot use shows "not available" and no data. | Requester, Reviewer | M | 1 |
| FR-11 | Every environment can be given at least two requester accounts and two reviewer accounts with a documented, repeatable seed procedure. | Operator | M | 1 |
| FR-12 | The service reports that it is alive (`/api/health`) and whether it can reach its database (`/api/ready`), for operators and the deployment smoke test. | Operator | M | 1 |
| FR-13 | The assigned reviewer returns a `SUBMITTED` request to the requester for changes, with a comment. Its status becomes `RETURNED`. | Reviewer | S | 2 |
| FR-14 | The requester edits a `RETURNED` request and resubmits it. It keeps its number, goes back to `SUBMITTED` for the same reviewer, and its history shows each return and resubmission. | Requester, Reviewer | S | 2 |
| FR-15 | A request whose amount is above the multi-stage threshold needs a second approval by a different reviewer after the first approval. It becomes `APPROVED` only after both approvals, and either reviewer can reject it. | Reviewer | S | 2 |
| FR-16 | A user filters and searches the lists they can see (My Requests, Review Inbox, decided requests) by status, submission date range, amount range, and text in the number or title. | Requester, Reviewer | S | 3 |
| FR-17 | A reviewer sees the requests they have decided, newest first, with the decision and date. | Reviewer | C | 3 |
| FR-18 | A user sees a summary of the requests they can access for a chosen period: count and total amount by status, and for a reviewer the number approved and rejected. | Requester, Reviewer | S | 3 |

## 5. Business rules (BR)

| ID | Rule (testable) | Related FR | Planned sprint |
|---|---|---|---|
| BR-01 | Every request-related endpoint requires a signed-in user; without a valid session the answer is `401` and contains no request data. | FR-04 to FR-09 | 1 |
| BR-02 | Each account has exactly one role, `REQUESTER` or `REVIEWER`, assigned only by the seed. A user cannot choose or change their role, and the role used for a check always comes from the session, never from the client. | FR-01, FR-10, FR-11 | 1 |
| BR-03 | The requester of a new request is always the signed-in user. A requester or user ID supplied by the client is ignored. | FR-04 | 1 |
| BR-04 | The amount must be greater than 0 and at most 1,000,000.00 THB, with at most two decimal places. Otherwise the request is refused and nothing is stored. | FR-04 | 1 |
| BR-05 | The title must be 1–120 characters and the description 1–2000 characters, after trimming spaces. A blank value is refused and nothing is stored. | FR-04 | 1 |
| BR-06 | The assigned reviewer must be an existing, active user with the `REVIEWER` role, and must not be the requester. Otherwise the request is refused and nothing is stored. | FR-04 | 1 |
| BR-07 | A new request starts in `SUBMITTED`. The system generates a unique request number `REQ-` plus six digits, which never changes. | FR-04, FR-05 | 1 |
| BR-08 | A requester can see only their own requests. A reviewer can see their own requests and the requests assigned to them. Any other request is answered as "not found", with no data. | FR-05, FR-06, FR-07 | 1 |
| BR-09 | Only the reviewer assigned to a request may approve or reject it. A `REQUESTER` calling a review operation is refused with `403`. A user who is **neither its requester nor its assigned reviewer** gets "not found" (`404`). When the caller is the request's requester, the self-approval refusal of BR-10 (`403`) applies first. | FR-07, FR-08, FR-09 | 1 |
| BR-10 | **No self-approval:** a user can never approve or reject a request they submitted. The attempt is refused with `403` and changes nothing. | FR-08, FR-09 | 1 |
| BR-11 | Only a `SUBMITTED` request can be decided or returned. The transitions are `SUBMITTED → APPROVED` and `SUBMITTED → REJECTED`, and from Sprint 2 `SUBMITTED → RETURNED` and `RETURNED → SUBMITTED` (BR-16). Any other attempt, such as deciding an already decided request, is refused with `409` and changes nothing. | FR-08, FR-09, FR-13, FR-14 | 1 |
| BR-12 | A rejection needs exactly one category from a fixed list (budget not available, information missing or unclear, duplicate request, not allowed by policy, other) and a reason of at least 10 and at most 1000 characters, counted after trimming leading and trailing spaces. An approval has no category; its reason is optional, has no minimum, and is also at most 1000 characters. | FR-08, FR-09 | 1 |
| BR-13 | Every status change, including submission, adds exactly one history entry recording the actor, the previous and new status, the reason, and the time. History entries are never changed or deleted. | FR-04, FR-06, FR-08, FR-09 | 1 |
| BR-14 | When two decisions on the same request arrive at the same time, at most one succeeds. The other is refused as an invalid transition (`409`) and adds no history entry. | FR-08, FR-09 | 1 |
| BR-15 | In Sprint 1 nobody can edit or delete a request after submission. Changes go through return and resubmission (BR-16) from Sprint 2. | FR-04, FR-14 | 1 |
| BR-16 | Only the assigned reviewer can return a request, only while it is `SUBMITTED`, and only with a comment that is not blank and at most 1000 characters after trimming. Only its requester can edit and resubmit a `RETURNED` request; resubmission keeps the number and the reviewer. A reviewer who approves, rejects, or returns a resubmitted request must be acting on its current content. | FR-13, FR-14 | 2 |
| BR-17 | A request above the multi-stage threshold (**provisional: 100,000.00 THB**) needs a second approval from an active reviewer who is neither the requester nor the first approver. After the first approval its status is **provisionally `AWAITING_SECOND_APPROVAL`**, and only the second approval makes it `APPROVED`. The F-07 contract confirms or changes both values (Q-06). | FR-15 | 2 |
| BR-18 | Lists, filters, summaries, and reports include only the requests the viewer may see under BR-08. | FR-16, FR-17, FR-18 | 3 |

## 6. Non-functional requirements (NFR)

| ID | Category | Requirement | Measurable target | Verification method | Sprint verified |
|---|---|---|---|---|---|
| NFR-01 | Security: authentication | Protected endpoints refuse requests without a valid session | 100% of protected endpoints answer `401` with no request data when called without a session, or with an expired or unknown session | API test per protected endpoint | 1 |
| NFR-02 | Security: authorization | Role and ownership checks are enforced by the backend, not by the UI | Every forbidden role or ownership operation in the permission matrix (SDS §6) is refused (`403`/`404`) when called directly through the API | API tests calling endpoints as the wrong role, as a non-owner, and as an unrelated reviewer | 1 |
| NFR-03 | Security: credentials | Passwords are stored only as salted, slow hashes | 0 plaintext passwords in the database, logs, or responses; every stored hash uses scrypt with N = 16384, r = 8, p = 1 | DB integration test on the hash format; a test that responses never contain the hash; code review | 1 |
| NFR-04 | Security: sessions | Sessions are protected and expire | Cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` in production; the session ends 8 hours after sign-in; after sign-out the old cookie is refused immediately | API tests on cookie attributes, after logout, and with an expired session | 1 |
| NFR-05 | Security: brute force | Repeated failed sign-ins are throttled | After 5 failed sign-ins for one email within 15 minutes, further attempts get `429` with `Retry-After` until the window passes | API test | 1 |
| NFR-06 | Security: error safety | Errors never expose internals | 0 error responses containing a stack trace, SQL, file path, connection string, or secret; unexpected errors return a fixed message | API tests that force validation and server errors; review of the error handler | 1 |
| NFR-07 | Data integrity | The database itself rejects data that breaks the core rules | Direct inserts or updates that break BR-04, BR-06 (self-assignment), BR-12 (a missing or blank rejection reason, including `NULL`; the 10-character minimum, and requiring a category, are enforced by the application), a rejection category on anything but a rejection, BR-16 (a returned request or history entry with a missing or blank comment), or BR-13 (history update or delete) fail at the database | DB integration tests that bypass the API | 1 |
| NFR-08 | Persistence | Data survives restarts and redeployments | A request created before an application restart and a redeploy is still present, unchanged, afterwards; nothing the app needs is stored in the container | Lab 5 check C-05 (before and after evidence on the deployed service) | Lab 5 (Sprint 1 release) |
| NFR-09 | Configuration and secrets | Settings come only from the environment, and no secret is committed | Every variable read by the code is documented in `.env.example` and `deployment.md`; 0 secrets in the repository, image, client bundle, or logs | Static check TEST-F05-13; GitHub secret scanning; PR review checklist | 1 |
| NFR-10 | Reproducibility | A fresh clone builds and runs | Following the README with only `.env.example` values filled in, a fresh clone builds, migrates, seeds, and answers `200` on `/api/ready` | Fresh-clone run (Lab 5 C-03) | Lab 5 (Sprint 1 release) |
| NFR-11 | Usability and accessibility (basic) | Forms and states are clear and usable by keyboard | Each validation message appears beneath its field and is linked with `aria-describedby`; every action can be done with the keyboard; status is shown as text, not colour alone | Component tests and a manual keyboard pass on the Sprint 1 screens | 1 |
| NFR-12 | Accessibility (full) | The main screens meet WCAG 2.1 AA | 0 serious or critical violations from an automated axe scan of every main screen | Playwright with axe on each main screen | 3 |
| NFR-13 | Responsiveness | The app works on phone, tablet, and desktop | No horizontal scrolling and no clipped controls at 390 × 844, 820 × 1180, and 1440 × 900 | Playwright screenshots and layout checks at the three sizes | 3 |
| NFR-14 | Performance | Common operations respond quickly | p95 below 500 ms for list, detail, submit, and decision requests on a warm deployed instance with 1,000 requests in the database | Scripted timing run of 50 requests per operation against the deployed service | 3 |
| NFR-15 | Operability | Each deployment is checked and identifiable | The read-only smoke test (`/api/health`, `/api/ready`, `/`) passes after every deploy; the running revision's image tag equals the release commit SHA | Lab 5 pipeline run and the Cloud Run revision (C-06) | Lab 5 (Sprint 1 release) |
| NFR-16 | Cost | Running costs stay within the free-trial credit | Cloud Run minimum instances 0 and maximum 3 or fewer; smallest Cloud SQL tier; an alerts-only budget exists before any resource | Console screenshots in the Lab 5 evidence | Lab 5 (Sprint 1 release) |

## 7. Assumptions

| ID | Assumption | Impact if wrong |
|---|---|---|
| A-01 | One department, with one approval by the assigned reviewer, is enough for Sprint 1; a second approval is needed only above a threshold (Sprint 2). | Multi-stage approval would have to move into Sprint 1. |
| A-02 | All amounts are in THB; there is no currency conversion. | A currency field and conversion rules would be needed. |
| A-03 | Accounts are created by the team through the seed; there is no link to an HR or identity system. | Account administration would move into scope. |
| A-04 | Reviewers are few (under 50) and requests per user are few (under 200), so Sprint 1 lists need no paging. | Paging would be needed in Sprint 1 instead of Sprint 3. |
| A-05 | Users use a current version of Chrome, Edge, Firefox, or Safari. | Older browsers might need polyfills or extra testing. |
| A-06 | All data is synthetic; no real personal or financial data is ever entered. | Privacy and data-protection requirements would apply. |
| A-07 | Times are stored in UTC and shown in Asia/Bangkok time. | Users elsewhere would see times in the wrong zone. |

## 8. Design decisions

| ID | Decision | Alternatives considered | Rationale | Date |
|---|---|---|---|---|
| D-01 | **Context:** departmental purchase and funding requests | Travel approval; leave requests; reimbursement claims | It has a clear amount to validate and a natural need for an accountable decision, and it fits the theme brief. | 2026-11-14 |
| D-02 | **Roles:** `REQUESTER` and `REVIEWER`, one role per account. A `REVIEWER` may also submit requests. | Separate submit-only and approve-only people; several roles per account | Unit heads also need to buy things. Letting reviewers submit makes "no self-approval" a real rule that can be tested and demonstrated, while keeping one role per account. | 2026-11-14 |
| D-03 | **Reviewer assignment:** the requester chooses one active reviewer (not themselves) when submitting, and only that reviewer may decide | Automatic assignment by unit or round-robin; a shared queue that any reviewer may take | It is explicit and simple, and it gives "unrelated reviewer" a clear meaning that can be tested. A shared queue would remove the ownership rule the theme asks for. | 2026-11-14 |
| D-04 | **No self-approval** is enforced twice: the assignment rule (and a database constraint) stops a user being assigned their own request, and the decision operation refuses a decision on one's own request with `403` | Rely on the assignment rule alone | The two checks cover different cases. The assignment rule (and its `CHECK`) means a requester is never also the assigned reviewer. The `403` covers the normal self-approval attempt: a reviewer trying to decide a request they submitted, which is assigned to someone else. It is clearer than a `404`, because the caller already knows the request (it is theirs), and it is tested on its own (BR-10). | 2026-11-14 |
| D-05 | **Sprint 1 status model:** `SUBMITTED → APPROVED` or `SUBMITTED → REJECTED`; every other transition is invalid (`409`) | Include `DRAFT` and `RETURNED` in Sprint 1 | It is the smallest slice with a meaningful transition and rules. Return and resubmission come in Sprint 2. | 2026-11-14 |
| D-06 | **No editing after submission** in Sprint 1 | Allow editing until the reviewer opens the request | A reviewer must never decide on content that changes under them. Sprint 2's return and resubmission gives a controlled way to change a request. | 2026-11-14 |
| D-07 | **Decisions are recorded:** a rejection needs a reason, an approval reason is optional, and every status change appends a history entry that cannot be changed | Optional reasons; status kept only on the request | Accountability is the stakeholder's main need: who decided what, when, and why. | 2026-11-14 |
| D-08 | **Input limits:** amount above 0 and at most 1,000,000.00 THB with two decimals; title 1–120 characters; description 1–2000; reason at most 1000 | No upper bound; larger text limits | These limits fit a department's scale, catch typing mistakes (an extra zero), and keep screens readable. | 2026-11-14 |
| D-09 | **Not found instead of forbidden for records outside the caller's scope:** non-owners and unrelated reviewers get `404`, while a `REQUESTER` calling a review operation, or a self-approval attempt, gets `403` | `403` everywhere | `404` does not reveal that a request exists. `403` is used only where the caller already knows the resource or the operation is refused because of their role. | 2026-11-14 |
| D-10 | **The login throttle is kept in process memory** in Sprint 1, as in TokTickIT | Store the counter in the database | It is proven code, and it is simple. On Cloud Run each instance (up to 3) counts separately and a restart clears the count; this is accepted for Sprint 1 and revisited in F-10. | 2026-11-14 |
| D-11 | **Accounts come only from the seed**, and all demo accounts share one password from `DEMO_USER_PASSWORD` | Self-registration; an admin screen; one password per account | Accounts come from the seed only because account administration is excluded. The shared password keeps the Lab 6 handover to one secret, which can be rotated with the next deploy. | 2026-11-14 |
| D-12 | **Rejection category:** a rejection carries one category from a fixed list of five, as well as the written reason | Free text only; a list that someone edits in the application | The requester gets a consistent answer that can be acted on, and a fixed list needs no new screen or role. | 2026-11-26 |
| D-13 | **No reassignment of a reviewer** (Q-05): a waiting or returned request keeps its reviewer | Let the requester reassign; reassign automatically | The product has no function that deactivates an account (D-11), and BR-16 keeps the reviewer through a resubmission. Reassignment would need a new screen and a new permission rule. | 2026-11-27 |

## 9. Open questions and resolutions

| ID | Question | Resolution | Resolved on / by |
|---|---|---|---|
| Q-01 | Who decides which reviewer handles a request? | The requester chooses one active reviewer at submission (D-03). | 2026-11-14 / team |
| Q-02 | Can a request be edited after it is submitted? | Not in Sprint 1 (D-06). From Sprint 2, only through return and resubmission (FR-13, FR-14). | 2026-11-14 / team |
| Q-03 | Is multi-stage approval needed in Sprint 1? | No. It comes in Sprint 2 (FR-15, D-05). | 2026-11-14 / team |
| Q-04 | May reviewers submit their own requests? | Yes, and another reviewer must decide them (D-02, BR-10). | 2026-11-14 / team |
| Q-05 | What happens to waiting requests if their reviewer is deactivated? | No reassignment is built, because no function deactivates an account (D-11, D-13). If an operator deactivates a reviewer in the database, their requests keep waiting. | 2026-11-27 / Menelaus122 |
| Q-06 | What is the multi-stage threshold, and who may give the second approval? | **Open, with provisional values in BR-17:** above 100,000.00 THB, by any active reviewer other than the requester and the first approver, with the interim status `AWAITING_SECOND_APPROVAL`. To be confirmed in the F-07 contract in Sprint 2. Owner: WirachatTH. | — |
| Q-07 | Do summaries need an export (for example CSV)? | **Open.** To be decided in the F-09 contract in Sprint 3. Owner: team. | — |
| Q-08 | Should the login throttle be shared between Cloud Run instances? | Not in Sprint 1 (D-10). Revisit in F-10 (Sprint 3). | 2026-11-14 / team |
