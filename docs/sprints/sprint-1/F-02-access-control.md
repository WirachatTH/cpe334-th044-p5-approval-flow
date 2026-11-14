# F-02: Role-based access control (working title) (engineering contract)

> **Project Deliverable 1, Part E.** Write and commit this contract (`docs(F-02): ...`) **before** any test or
> implementation commit for this feature. Revisions stay visible: add a version-history row for every change.
> Write "No change" for a layer the feature does not touch.

| Field | Value |
|---|---|
| Feature ID | F-02 |
| Sprint | 1 |
| Status | Skeleton (Draft → Agreed → Implemented → Verified) |
| Linked requirements | <!-- FR-.., BR-.., NFR-.. --> |
| GitHub Issue | #7 (contract), #9 (implementation) |
| Author / reviewer | |
| Depends on | <!-- F-.. --> |

## Version history

| Version | Date | Author | Change | Reason | Commit / PR |
|---|---|---|---|---|---|
| 0.1 | 2026-11-14 | | Skeleton created | Repository structure | |

---

## 1. Feature design (feature SDS)

### 1.1 Purpose and behaviour

### 1.2 Workflow and state transitions

<!-- Steps, and allowed / rejected transitions. -->

### 1.3 Business rules enforced

| BR | How it is enforced (layer) |
|---|---|
| | |

### 1.4 Validation

| Field / input | Rule | Error returned |
|---|---|---|
| | | |

### 1.5 Failure and boundary cases

-

### 1.6 Permissions

<!-- Who may perform each operation, and which records they may see or change. Backend-enforced. -->

| Operation | Requester | Reviewer | Unauthenticated | Record scope |
|---|---|---|---|---|
| | | | | |

### 1.7 Dependencies

-

## 2. Layer specifications

### 2.1 UI

<!-- Screens, components, validation / loading / empty / error states. Or "No change". -->

### 2.2 API

| Method | Path | Auth / role | Request | Success | Errors |
|---|---|---|---|---|---|
| | | | | | |

Request / response / error examples:

```json
```

### 2.3 Data

<!-- Fields, types, constraints, indexes, migration name (additive only). Or "No change". -->

## 3. Acceptance criteria

| AC ID | Given | When | Then (observable result) | Kind | Linked req. |
|---|---|---|---|---|---|
| AC-F02-01 | | | | normal / negative / boundary / role | |

## 4. Software Test Specification (STS)

| TEST ID | Linked AC | Level | Preconditions / input | Action | Expected result | File / test name |
|---|---|---|---|---|---|---|
| TEST-F02-01 | AC-F02-01 | unit / API-DB / e2e / manual | | | | |

**Coverage check:** every AC above maps to at least one TEST.

## 5. Definition of Done (feature)

The [Product Definition of Done](README.md#product-definition-of-done) applies, plus:

- [ ] All AC in section 3 have a passing automated test (or a recorded manual check that says why it is manual)
- [ ] TDD evidence recorded for each rule: failing test commit, then passing implementation commit

## 6. Completion evidence (fill in after implementation)

| Item | Value |
|---|---|
| Contract commit(s) | |
| Red commit(s) and failing test | |
| Green commit(s) | |
| PR (author → reviewer) | |
| Test run (command, commit, pass / fail / skip) | |
| Known limitations | |
