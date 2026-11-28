# Requirements traceability

> **Project Deliverable 1, Part B: requirement → feature/responsibility → sprint → verification.**
> Every baseline FR, BR, and important NFR from [`srs.md`](srs.md) appears in section 1. The features are in
> [`features.md`](features.md). Later-sprint requirements have a feature and a sprint now; their AC and TEST IDs are added
> when their contract is written.
> Status: Sprint 1 requirements verified at the commit named in section 4; later sprints planned. Section 5 lists the
> acceptance criteria added after the Sprint 1 release, for Lab 5, and the results of the Lab 5 checks for NFR-08, NFR-10,
> NFR-15, and NFR-16. Section 6 lists the results of change request #65 (Lab 7).

## Version history

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 0.1 | 2026-11-14 | | Skeleton created | Repository structure |
| 0.2 | 2026-11-15 | Menelaus122 | Section 1 covers all 18 FR, 18 BR, and 16 NFR. Sprint 1 rows link the AC IDs of the five contracts. Sections 2 and 3 filled. Section 4 added: AC → planned TEST → actual test → result for the 108 Sprint 1 ACs, from a real run. | Issue #5; Definition of Done RD-3 |
| 0.3 | 2026-11-15 | Menelaus122 | The rows for FR-16, FR-17, FR-18, and BR-18 and the coverage-gap row say that the contracts of F-08, F-09, and F-10 are written in Sprint 2 (`plan.md` section 3), not at the start of Sprint 3. No sprint allocation and no result changes. | Review of PR #48, and the description of PR #50 |
| 0.4 | 2026-11-16 | Menelaus122 | New section 5: AC-F05-29 and AC-F05-30 (the build footer, Lab 5 R-08) with their TESTs and results. Sections 1 to 4, and the Sprint 1 figures in them, are unchanged. | PRs #56 and #57 added the two ACs after the release |
| 0.5 | 2026-11-22 | Menelaus122 | The status of NFR-08, NFR-10, NFR-15, and NFR-16 in sections 1 and 2 follows the Lab 5 checks, which are listed in section 5. The keyboard pass by a person (NFR-11, RD-7) is recorded as done in sections 1, 2, and 4. The Sprint 1 figures in section 4 (108 ACs, 107 automated, tested at `7f8cf54`) and every AC and TEST row are unchanged. | The deployment (PRs #58, #59, #60) gave the evidence; the keyboard pass was done on 15 Nov, after section 4 was written |
| 0.6 | 2026-11-22 | Menelaus122 | The NFR-11 row in section 2 names the tag that the code of the keyboard pass is identical to (`v1.0.0-sprint1`) and says it is not the code of `v1.1.0-lab5`. No status, AC, TEST, or figure changes. | Review of PR #61: "the release tag" could be read as the Lab 5 release, which changes 6 client files for the footer |
| 0.7 | 2026-11-26 | Menelaus122 | The BR-12 row follows the revised rule and lists AC-F04-24 to AC-F04-29, which are specified and not yet implemented. The Sprint 1 figures in section 4 are unchanged. | Change request #65 (Lab 7) |
| 0.8 | 2026-11-26 | Menelaus122 | FR-09, BR-12, and NFR-07 list the acceptance criteria of the rejection category (AC-F04-30 to AC-F04-34), specified and not yet implemented. | Change request #65 (Lab 7) |
| 0.9 | 2026-11-26 | Menelaus122 | FR-06, FR-08, BR-09, BR-10, BR-11, BR-13, NFR-02, and NFR-11 list the acceptance criteria of #65 that link to them (AC-F04-24, -26 to -29, -31, -32, and -34), specified and not yet implemented. | Review of PR #66 |
| 0.10 | 2026-11-26 | Menelaus122 | Change request #65 is implemented: the rows of section 1 that it revised are Verified at `5890f39`, and the new section 6 lists AC-F04-24 to AC-F04-34 with their tests and results. Sections 3 to 5 are unchanged. | Implementation of #65 (PR #66) |
| 0.11 | 2026-11-27 | Menelaus122 | The F-06 contract defines AC-F06-01 to AC-F06-24: the rows of FR-13, FR-14, and BR-16 are Specified, and the other rows that its ACs link to list them. Nothing of F-06 is implemented. | Issue #71 |
| 0.12 | 2026-11-27 | Menelaus122 | The F-07 contract defines AC-F07-01 to AC-F07-20: the rows of FR-15 and BR-17 are Specified, and the other rows that its ACs link to list them. Nothing of F-07 is implemented. | Issue #76 |
| 0.13 | 2026-11-27 | Menelaus122 | AC-F06-25 to AC-F06-28 are listed in the rows they link to, specified and not implemented. | Review of PR #73 |
| 0.14 | 2026-11-27 | Menelaus122 | AC-F06-29 is listed in the rows of FR-14 and BR-11, specified and not implemented. | Second review of PR #73 |
| 0.15 | 2026-11-27 | Menelaus122 | F-06 is implemented: the rows its ACs link to are Verified at `e6369bc`, and the new section 7 lists AC-F06-01 to AC-F06-29 with their tests. | Implementation of #71 (PR #73) |
| 0.16 | 2026-11-28 | Menelaus122 | F-07 is implemented: the rows its ACs link to are Verified at `84aee97`, and the new section 8 lists AC-F07-01 to AC-F07-20 with their tests. AC-F05-02 and AC-F05-19 are marked as revised to five accounts. The two test gaps found in the review of PR #73 are covered at `073c02a` (a case under TEST-F06-17 and one under TEST-F06-22). | Implementation of #76 (PR #77) |
| 0.17 | 2026-11-28 | Menelaus122 | The F-08 contract defines AC-F08-01 to AC-F08-22: the rows of FR-16, FR-17, and BR-18 are Specified, and the other rows that its ACs link to list them. Nothing of F-08 is implemented. | Issue #79 (F-08) |
| 0.18 | 2026-11-28 | Menelaus122 | The two test gaps and the screen order found in the review of PR #77 are covered at `920b78e`, `3932403`, and `965bfa6` (cases under TEST-F07-15 and TEST-F07-17); the suites passed at `fcdba09` (section 8). | Follow-ups of the review of PR #77 (PR #80) |
| 0.19 | 2026-11-28 | Menelaus122 | F-08 slice 1 is implemented: AC-F08-01 to AC-F08-13 are verified at `71e32d1` (new section 9). The ACs of slices 2 and 3 stay specified. | Implementation of #79 (PR #80) |
| 0.20 | 2026-11-28 | Menelaus122 | The F-09 contract defines AC-F09-01 to AC-F09-13: the rows of FR-18 are Specified, and the other rows that its ACs link to list them. Nothing of F-09 is implemented. | Issue #84 (F-09) |
| 0.21 | 2026-11-28 | Menelaus122 | The F-10 contract defines AC-F10-01 to AC-F10-11: the rows of NFR-12 to NFR-14 are Specified, and the other rows that its ACs link to list them. Nothing of F-10 is implemented. | Issue #84 (F-10) |

---

## 1. Traceability table

How to read it:
- Every Sprint 1 AC has one TEST with the same number: `AC-F04-09` is checked by `TEST-F04-09`. Section 4 lists each pair with the actual test file, test name, and result.
- A status of **Verified** means every linked test passed in the run in section 4. **Planned** means the feature and sprint are allocated and the AC and TEST IDs do not exist yet. **Specified** means a contract defines them and they are not implemented. NFR-08, NFR-10, NFR-15, and NFR-16 have no test: their status comes from the Lab 5 check named in the row, and section 5 lists the result. **Partly verified** means only part of that evidence exists.
- `SYS-nn` is a cross-cutting responsibility from [`features.md`](features.md) section 2.

| Requirement | Feature or responsibility | Sprint | Verification (AC / TEST) | Status |
|---|---|---|---|---|
| FR-01 Sign in | F-01 | 1 | AC-F01-01, AC-F01-02, AC-F01-03, AC-F01-04, AC-F01-05, AC-F01-06, AC-F01-14, AC-F01-15 | Verified |
| FR-02 Sign out | F-01 | 1 | AC-F01-12, AC-F01-13, AC-F01-18, AC-F01-21 | Verified |
| FR-03 Stay signed in | F-01 | 1 | AC-F01-09, AC-F01-17, AC-F01-19 | Verified |
| FR-04 Submit a request | F-03 | 1 | AC-F03-01, AC-F03-02, AC-F03-10, AC-F03-15, AC-F03-16, AC-F03-17, AC-F03-20 | Verified |
| FR-05 List own requests | F-03; F-08 | 1 | AC-F03-11, AC-F03-18, AC-F03-20, AC-F03-21; Sprint 3 (F-08): AC-F08-10 | Verified; the F-08 ACs are verified at `71e32d1` (section 9) |
| FR-06 Request detail and history | F-03, F-04; F-06; F-07 | 1 | AC-F03-12, AC-F03-19, AC-F03-21, AC-F04-13; revised (#65): AC-F04-32, AC-F04-34; Sprint 2 (F-06): AC-F06-23; Sprint 2 (F-07): AC-F07-10, AC-F07-18 | Verified; the ACs of #65 at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8) |
| FR-07 Review inbox | F-04; F-06; F-07; F-08 | 1 | AC-F04-01, AC-F04-02, AC-F04-15, AC-F04-16, AC-F04-20, AC-F04-23; Sprint 2 (F-06): AC-F06-07; Sprint 2 (F-07): AC-F07-11, AC-F07-18; Sprint 3 (F-08): AC-F08-08, AC-F08-12 | Verified; the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8); the F-08 ACs are verified at `71e32d1` (section 9) |
| FR-08 Approve | F-04 | 1 | AC-F04-03, AC-F04-04, AC-F04-18, AC-F04-20; revised (#65): AC-F04-26, AC-F04-31 | Verified; the ACs of #65 at `5890f39` (section 6) |
| FR-09 Reject with a category and a reason | F-04 | 1 | AC-F04-05, AC-F04-13; revised (#65): AC-F04-25, AC-F04-29, AC-F04-32, AC-F04-34 | Verified; the ACs of #65 at `5890f39` (section 6) |
| FR-10 Navigation by role | F-02; F-06 | 1 | AC-F02-11, AC-F02-12; Sprint 2 (F-06): AC-F06-20, AC-F06-26 | Verified; the F-06 ACs are verified at `e6369bc` (section 7) |
| FR-11 Seeded accounts | F-05; F-07 | 1 | AC-F05-02, AC-F05-03, AC-F05-19 (-02 and -19 revised by F-07: five accounts); Sprint 2 (F-07): AC-F07-16 | Verified; AC-F05-02 and AC-F05-19 as revised, and AC-F07-16, passed at `84aee97` (section 8) |
| FR-12 Health and readiness | F-02, F-05 | 1 | AC-F02-13, AC-F05-08, AC-F05-09, AC-F05-10 | Verified |
| FR-13 Return for changes | F-06 | 2 | AC-F06-01, AC-F06-19, AC-F06-23, AC-F06-24 | Verified at `e6369bc` (section 7) |
| FR-14 Edit and resubmit | F-06 | 2 | AC-F06-07, AC-F06-08, AC-F06-16, AC-F06-21, AC-F06-24, AC-F06-25, AC-F06-29 | Verified at `e6369bc` (section 7) |
| FR-15 Second approval | F-07 | 2 | AC-F07-01, AC-F07-03, AC-F07-04, AC-F07-05, AC-F07-17, AC-F07-19 | Verified at `84aee97` (section 8) |
| FR-16 Filter and search | F-08 | 3 | AC-F08-01, AC-F08-02, AC-F08-03, AC-F08-04, AC-F08-05, AC-F08-06, AC-F08-08, AC-F08-09, AC-F08-10, AC-F08-11, AC-F08-12, AC-F08-13, AC-F08-16, AC-F08-19, AC-F08-20, AC-F08-21, AC-F08-22 | Slice 1 (AC-F08-01 to AC-F08-06 and AC-F08-08 to AC-F08-13) verified at `71e32d1` (section 9); the others are specified, not implemented |
| FR-17 Decided requests | F-08 | 3 | AC-F08-14, AC-F08-15, AC-F08-16, AC-F08-18 | Specified |
| FR-18 Summaries | F-09 | 3 | AC-F09-01, AC-F09-02, AC-F09-03, AC-F09-06, AC-F09-07, AC-F09-09, AC-F09-10, AC-F09-11, AC-F09-12, AC-F09-13 | Specified |
| BR-01 Session required | F-02 | 1 | AC-F02-01 | Verified |
| BR-02 One role, from the session | F-02 | 1 | AC-F02-07 | Verified |
| BR-03 Requester is the session user | F-03 | 1 | AC-F03-03 | Verified |
| BR-04 Amount range | F-03; F-06 | 1 | AC-F03-05, AC-F03-09; Sprint 2 (F-06): AC-F06-10, AC-F06-11 | Verified; the F-06 ACs are verified at `e6369bc` (section 7) |
| BR-05 Title and description | F-03; F-06 | 1 | AC-F03-06; Sprint 2 (F-06): AC-F06-10, AC-F06-11 | Verified; the F-06 ACs are verified at `e6369bc` (section 7) |
| BR-06 Reviewer rule | F-03 | 1 | AC-F03-07, AC-F03-08, AC-F03-09, AC-F03-10 | Verified |
| BR-07 Number and first status | F-03 | 1 | AC-F03-01, AC-F03-03, AC-F03-04, AC-F03-09 | Verified |
| BR-08 Who can see a request | F-03, F-04 (SYS-07); F-06; F-07; F-08; F-09 | 1 | AC-F03-11, AC-F03-12, AC-F03-13, AC-F04-01, AC-F04-09; Sprint 2 (F-06): AC-F06-04, AC-F06-12, AC-F06-26; Sprint 2 (F-07): AC-F07-09, AC-F07-10, AC-F07-11; Sprint 3 (F-08): AC-F08-07; Sprint 3 (F-09): AC-F09-04, AC-F09-05 | Verified; the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8); the F-08 ACs are verified at `71e32d1` (section 9); the F-09 ACs are specified, not implemented |
| BR-09 Only the assigned reviewer decides | F-02, F-04; F-07 | 1 | AC-F02-03, AC-F04-09, AC-F04-10, AC-F04-16; revised (#65): AC-F04-27; Sprint 2 (F-07): AC-F07-06, AC-F07-08, AC-F07-09 | Verified; the ACs of #65 at `5890f39` (section 6); the F-07 ACs are verified at `84aee97` (section 8) |
| BR-10 No self-approval | F-04; F-06; F-07 | 1 | AC-F04-08, AC-F04-23; revised (#65): AC-F04-27; Sprint 2 (F-06): AC-F06-04; Sprint 2 (F-07): AC-F07-07, AC-F07-15 | Verified; the ACs of #65 at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8) |
| BR-11 Only SUBMITTED is decided | F-04; F-06; F-07 | 1 | AC-F04-07, AC-F04-11, AC-F04-19; revised (#65): AC-F04-24; Sprint 2 (F-06): AC-F06-05, AC-F06-06, AC-F06-13, AC-F06-29; Sprint 2 (F-07): AC-F07-12 | Verified; the ACs of #65 at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8) |
| BR-12 Rejection reason | F-04; F-07 | 1 | AC-F04-04, AC-F04-05, AC-F04-06, AC-F04-14, AC-F04-17, AC-F04-21, AC-F04-22; revised rule (#65): AC-F04-24, AC-F04-25, AC-F04-26, AC-F04-27, AC-F04-28, AC-F04-29, AC-F04-30, AC-F04-31, AC-F04-32, AC-F04-33, AC-F04-34; Sprint 2 (F-07): AC-F07-04, AC-F07-05 | Verified; the ACs of #65 at `5890f39` (section 6); the F-07 ACs are verified at `84aee97` (section 8) |
| BR-13 Append-only history | F-03, F-04; F-06; F-07 | 1 | AC-F03-01, AC-F04-03, AC-F04-05, AC-F04-14; revised (#65): AC-F04-32; Sprint 2 (F-06): AC-F06-01, AC-F06-08, AC-F06-16, AC-F06-18, AC-F06-28; Sprint 2 (F-07): AC-F07-01, AC-F07-03 | Verified; the ACs of #65 at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8) |
| BR-14 Competing decisions | F-04; F-06; F-07 | 1 | AC-F04-12, AC-F04-19; Sprint 2 (F-06): AC-F06-17; Sprint 2 (F-07): AC-F07-13, AC-F07-14 | Verified; the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8) |
| BR-15 No edit after submission | F-03; F-06 | 1 | AC-F03-14; Sprint 2 (F-06): AC-F06-09, AC-F06-13 | Verified; the F-06 ACs are verified at `e6369bc` (section 7) |
| BR-16 Return rules | F-06 | 2 | AC-F06-01, AC-F06-02, AC-F06-03, AC-F06-04, AC-F06-05, AC-F06-08, AC-F06-09, AC-F06-12, AC-F06-14, AC-F06-15, AC-F06-20, AC-F06-22 | Verified at `e6369bc` (section 7) |
| BR-17 Multi-stage threshold | F-07 | 2 | AC-F07-01, AC-F07-02, AC-F07-06, AC-F07-07, AC-F07-14, AC-F07-15, AC-F07-20 | Verified at `84aee97` (section 8) |
| BR-18 Scope of lists and reports | F-08, F-09 (SYS-07) | 3 | AC-F08-07, AC-F08-08, AC-F08-14, AC-F08-17; Sprint 1 applies it to the two lists that exist (TEST-F03-11, TEST-F04-01); Sprint 3 (F-09): AC-F09-04, AC-F09-05, AC-F09-06 | AC-F08-07 and AC-F08-08 verified at `71e32d1` (section 9); AC-F08-14 and AC-F08-17 are specified, not implemented; the F-09 ACs are specified, not implemented |
| NFR-01 Authentication enforced | F-01, F-02, F-05 (SYS-03); F-09 | 1 | AC-F01-09, AC-F02-01, AC-F02-02, AC-F02-09, AC-F05-24; Sprint 3 (F-09): AC-F09-08 | Verified; the F-09 ACs are specified, not implemented |
| NFR-02 Authorization in the backend | F-02, F-03, F-04 (SYS-03); F-06; F-07; F-08; F-09; F-10 | 1 | AC-F02-03, AC-F02-04, AC-F02-05, AC-F02-06, AC-F02-07, AC-F02-08, AC-F02-09, AC-F02-12, AC-F02-14, AC-F03-13, AC-F04-09, AC-F04-10; revised (#65): AC-F04-27; Sprint 2 (F-06): AC-F06-04, AC-F06-09, AC-F06-12; Sprint 2 (F-07): AC-F07-08, AC-F07-09, AC-F07-10; Sprint 3 (F-08): AC-F08-07, AC-F08-17; Sprint 3 (F-09): AC-F09-04; Sprint 3 (F-10): AC-F10-11 | Verified; the ACs of #65 at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8); AC-F08-07 is verified at `71e32d1` (section 9); AC-F08-17 is specified, not implemented; the F-09 ACs are specified, not implemented; the F-10 ACs are specified, not implemented |
| NFR-03 Password hashing | F-01, F-05 | 1 | AC-F01-01, AC-F05-05, AC-F05-07 | Verified |
| NFR-04 Session protection | F-01; F-10 | 1 | AC-F01-01, AC-F01-06, AC-F01-10, AC-F01-11, AC-F01-12, AC-F01-19, AC-F01-21; Sprint 3 (F-10): AC-F10-10 | Verified; the F-10 ACs are specified, not implemented |
| NFR-05 Sign-in throttle | F-01; F-10 | 1 | AC-F01-05, AC-F01-07, AC-F01-08, AC-F01-16, AC-F01-20; Sprint 3 (F-10): AC-F10-06, AC-F10-07, AC-F10-08 | Verified; the F-10 ACs are specified, not implemented |
| NFR-06 Safe errors | F-01, F-02, F-05 (SYS-01); F-08; F-09; F-10 | 1 | AC-F01-04, AC-F02-05, AC-F02-10, AC-F02-13, AC-F02-15, AC-F05-10, AC-F05-24, AC-F05-25; Sprint 3 (F-08): AC-F08-06; Sprint 3 (F-09): AC-F09-07; Sprint 3 (F-10): AC-F10-09 | Verified; the F-08 ACs are verified at `71e32d1` (section 9); the F-09 ACs are specified, not implemented; the F-10 ACs are specified, not implemented |
| NFR-07 Database integrity | F-03, F-04 (SYS-04); F-06; F-07 | 1 | AC-F03-09, AC-F04-14; revised (#65): AC-F04-33; Sprint 2 (F-06): AC-F06-18; Sprint 2 (F-07): AC-F07-15, AC-F07-20 | Verified; the ACs of #65 at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8) |
| NFR-08 Persistence | F-05, SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 check C-05: a request created before a restart and a redeploy is still there afterwards, with before and after evidence on the deployed service | Verified (Lab 5 check C-05, section 5) |
| NFR-09 Configuration and secrets | F-05 (SYS-02) | 1 | AC-F05-03, AC-F05-04, AC-F05-05, AC-F05-06, AC-F05-18, AC-F05-20, AC-F05-21, AC-F05-22, AC-F05-27 | Verified |
| NFR-10 Reproducible build | F-05, SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 check C-03: a fresh clone builds, migrates, seeds, and answers 200 on `/api/ready` | Verified (Lab 5 check C-03, section 5) |
| NFR-11 Basic usability | F-01, F-03, F-04 (SYS-06); F-06; F-07; F-08; F-09; F-10 | 1 | AC-F01-15, AC-F03-16, AC-F03-18, AC-F04-17; revised (#65): AC-F04-28, AC-F04-29; Sprint 2 (F-06): AC-F06-19, AC-F06-21, AC-F06-24, AC-F06-25, AC-F06-27; Sprint 2 (F-07): AC-F07-17; Sprint 3 (F-08): AC-F08-11, AC-F08-13, AC-F08-18, AC-F08-22; Sprint 3 (F-09): AC-F09-11, AC-F09-12; Sprint 3 (F-10): AC-F10-02, AC-F10-09 | Verified (automated, including the keyboard-only journey TEST-REL-04); the pass by a person (RD-7) was done by hand on 15 Nov 2026 (section 2); AC-F04-28 and AC-F04-29 verified at `5890f39` (section 6); the F-06 ACs are verified at `e6369bc` (section 7); the F-07 ACs are verified at `84aee97` (section 8); AC-F08-11 and AC-F08-13 are verified at `71e32d1` (section 9); AC-F08-18 and AC-F08-22 are specified, not implemented; the F-09 ACs are specified, not implemented; the F-10 ACs are specified, not implemented |
| NFR-12 Accessibility (WCAG 2.1 AA) | F-10, SYS-06 | 3 | AC-F10-01, AC-F10-02 | Specified |
| NFR-13 Responsiveness | F-10, SYS-06 | 3 | AC-F10-03, AC-F10-04 | Specified |
| NFR-14 Performance | F-10 | 3 | AC-F10-05 | Specified |
| NFR-15 Operability | SYS-05; F-10 | Lab 5 (Sprint 1 release) | Lab 5 pipeline run (smoke test after every deploy) and the Cloud Run revision tag (C-06); Sprint 3 (F-10): AC-F10-11 | Verified (Lab 5 check C-06; the smoke test does not sign in, section 5); the F-10 ACs are specified, not implemented |
| NFR-16 Cost | SYS-05 | Lab 5 (Sprint 1 release) | Lab 5 console screenshots: instance limits, database tier, budget | Partly verified (budget and database size shown; section 5) |

## 2. Coverage gaps

Every requirement has a feature or responsibility and a sprint, so no requirement is unallocated. These are the places where verification is not complete, and the plan for each.

| Requirement | Gap | Plan |
|---|---|---|
| NFR-08, NFR-10, NFR-15, NFR-16 | No automated Sprint 1 test: they can only be checked on a fresh clone or on the deployed service. | Checked in Lab 5: C-03 (NFR-10), C-05 (NFR-08), C-06 (NFR-15), and the Console screenshots (NFR-16). The results are in section 5. NFR-16 is only partly verified: the budget and the database size are shown, but the Cloud Run instance limits and the storage setting are set in `deploy/deploy.sh` and not shown in a Console screenshot. |
| NFR-11 | The automated part (messages beside fields, `aria-describedby`, status as text) is verified. The keyboard-only journey TEST-REL-04 (Playwright, keyboard events only, no mouse) passes on the five main screens. It is not a pass by a person (RD-7). | Done by hand by WirachatTH on 15 Nov 2026 on the deployed service, whose server and client code are identical to the tag `v1.0.0-sprint1` (it is not the code of `v1.1.0-lab5`, which adds the build footer); recorded in Deliverable 1, Part F.5 (Figures 14 to 21). |
| FR-13, FR-14, BR-16 | Verified by automated tests only; no check on a deployed service and no pass by a person yet. | After the Sprint 2 release (#71). |
| FR-15, BR-17 | Verified by automated tests only; no check on a deployed service and no pass by a person yet. | After the Sprint 2 release (#76). |
| FR-16, FR-17, BR-18 | F-08 slice 1 (filtering and search) is implemented and verified (section 9). Slices 2 (FR-17, decided requests) and 3 (paging) are specified, not implemented. | Slices 2 and 3 in Sprint 3 (#79). |
| FR-18 | Specified in the F-09 contract, not implemented. | Tests, then the implementation, in Sprint 3. |
| NFR-12 to NFR-14 | Specified in the F-10 contract, not implemented. NFR-14 needs a measurement on the deployed service. | Sprint 3, after F-08 slice 3. |
| Q-05, Q-06, Q-07, Q-08 (SRS section 9) | Open questions that change F-06, F-07, F-09, and F-10. | Q-05 was decided in the F-06 contract (D-13). Q-06 was confirmed and recorded with the F-07 contract (D-14). Q-07 is decided in the F-09 contract and Q-08 in F-10 (Sprint 3). |

Self-registration, password recovery, account administration, real payments, attachments, notifications, comments, delegation, single sign-on, and multiple organisations are excluded on purpose (SRS section 3.2), so they have no feature.

## 3. Approved changes

| Date | Requirement(s) | Change | Reason | Approved in (PR) |
|---|---|---|---|---|
| 2026-11-14 | FR-01, BR-09, BR-17 | FR-01: "one generic message" applies to wrong credentials only. BR-09: "neither its requester nor its assigned reviewer", with BR-10 checked first. BR-17: the threshold and status name are given as provisional values. SRS v0.3. | Reviews of PR #22 and PR #23 | #26 |

## 4. Sprint 1 verification results

The table is produced from the test runs, not typed by hand: the AC and TEST IDs come from the five contracts, and the result of each TEST is read from the report of the run below. The title of a TEST, or of the group that holds its cases (the three cases (a), (b), (c) of TEST-F05-18), starts with its ID, so it can be found with `git grep TEST-F04-09`.

| Item | Value |
|---|---|
| Code commit tested | `7f8cf54` (commits after it change only documents) |
| Server: unit, API with a real database, process | `cd server && npm test`: 14 files, **131 passed, 0 failed, 0 skipped** |
| Client: component | `cd client && npm test`: 8 files, **36 passed, 0 failed, 0 skipped** |
| End-to-end: Playwright on Chromium | `cd client && npm run e2e`: **8 passed, 0 failed, 0 skipped, 0 flaky** (4 are AC tests, 4 are the release journeys below) |
| Automated vs manual | 107 of the 108 ACs are checked by automated tests (all pass). 1 AC is manual: AC-F05-13 (TEST-F05-13, the static check of environment variables), it was run on this commit and found every variable the code reads (`DATABASE_URL`, `DEMO_USER_PASSWORD`, `NODE_ENV`, `PORT`, `CLIENT_ORIGINS`, `API_PROXY_TARGET`, `CI`, and the Docker Compose `POSTGRES_*` ones) in an `.env.example` file and in `docs/labs/lab-05/deployment.md`; `API_PROXY_TARGET` and `CI` are commented lines in `client/.env.example`. The keyboard pass by a person (RD-7) is separate and was done by hand after this run, on 15 Nov 2026 (section 2); the keyboard-only journey TEST-REL-04 passed in this run. |
| Not covered by this run | NFR-08, NFR-10, NFR-15, NFR-16 (no automated test; checked in Lab 5, results in section 5), and the later-sprint requirements (section 2). |

"Cases" is the number of test cases (`it` and `it.each` rows) that carry the TEST ID. The "Actual test name" column shows the first of them.

| AC | Planned TEST | Level | Actual test file | Actual test name | Cases | Result |
|---|---|---|---|---|---|---|
| AC-F01-01 | TEST-F01-01 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-01 / AC-F01-01: a requester signs in and gets a hashed, expiring session | 2 | pass |
| AC-F01-02 | TEST-F01-02 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-02 / AC-F01-02: the email is trimmed and case-insensitive | 1 | pass |
| AC-F01-03 | TEST-F01-03 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-03 / AC-F01-03: a wrong password is refused with one message and no session | 1 | pass |
| AC-F01-04 | TEST-F01-04 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-04 / AC-F01-04: an unknown email gets exactly the same answer as a wrong password | 1 | pass |
| AC-F01-05 | TEST-F01-05 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-05 / AC-F01-05: invalid bodies are 400, and are not counted by the throttle | 1 | pass |
| AC-F01-06 | TEST-F01-06 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-06 / AC-F01-06: an inactive account gets 403 for the right password and 401 for a wrong one | 1 | pass |
| AC-F01-07 | TEST-F01-07 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-07 / AC-F01-07: after five wrong passwords the sixth attempt is 429, and other accounts are unaffe... | 1 | pass |
| AC-F01-08 | TEST-F01-08 | unit | `server/tests/sprint-1/login-throttle.test.ts` | TEST-F01-08 / AC-F01-08 (a): the oldest failure leaves the window at exactly 15 minutes | 3 | pass |
| AC-F01-09 | TEST-F01-09 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-09 / AC-F01-09: /me returns the signed-in user, and 401 without a valid session | 1 | pass |
| AC-F01-10 | TEST-F01-10 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-10 / AC-F01-10: an expired session answers 401 and its row is deleted | 1 | pass |
| AC-F01-11 | TEST-F01-11 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-11 / AC-F01-11: a session of a user who became inactive answers 401 | 1 | pass |
| AC-F01-12 | TEST-F01-12 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-12 / AC-F01-12: logout deletes the session, clears the cookie, and the old cookie is refused | 1 | pass |
| AC-F01-13 | TEST-F01-13 | API | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-13 / AC-F01-13: logout without a session is 204 | 1 | pass |
| AC-F01-14 | TEST-F01-14 | component | `client/tests/sprint-1/Login.test.tsx` | TEST-F01-14 / AC-F01-14: a requester lands on their home screen, and the header shows who they are | 2 | pass |
| AC-F01-15 | TEST-F01-15 | component | `client/tests/sprint-1/Login.test.tsx` | TEST-F01-15 / AC-F01-15 (a): blank fields show both messages beneath their fields and send nothing | 3 | pass |
| AC-F01-16 | TEST-F01-16 | component | `client/tests/sprint-1/Login.test.tsx` | TEST-F01-16 / AC-F01-16: a throttled sign-in and an inactive account have their own messages | 1 | pass |
| AC-F01-17 | TEST-F01-17 | e2e | `client/e2e/sprint-1/auth.spec.ts` | TEST-F01-17 / AC-F01-17: a signed-in user stays signed in after a reload | 1 | pass |
| AC-F01-18 | TEST-F01-18 | e2e | `client/e2e/sprint-1/auth.spec.ts` | TEST-F01-18 / AC-F01-18: after logging out, Login is shown, also for a direct visit to /requests | 1 | pass |
| AC-F01-19 | TEST-F01-19 | component | `client/tests/sprint-1/AuthFlow.test.tsx` | TEST-F01-19 / AC-F01-19: a 401 sends the user to Login with an explanation | 1 | pass |
| AC-F01-20 | TEST-F01-20 | API-DB (concurrency) | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-20 / AC-F01-20: twenty simultaneous wrong passwords give five 401 and fifteen 429 | 1 | pass |
| AC-F01-21 | TEST-F01-21 | API-DB | `server/tests/sprint-1/auth.api.test.ts` | TEST-F01-21 / AC-F01-21: signing out in one browser leaves the other browser's session working | 1 | pass |
| AC-F02-01 | TEST-F02-01 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-01 / AC-F02-01: get /api/auth/me without a session is 401 with no data | 7 | pass |
| AC-F02-02 | TEST-F02-02 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-02 / AC-F02-02: public and optional routes never answer 401 or 403 | 1 | pass |
| AC-F02-03 | TEST-F02-03 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-03 / AC-F02-03: a requester cannot use review operations, even with a malformed body | 1 | pass |
| AC-F02-04 | TEST-F02-04 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-04 / AC-F02-04: every role a route allows gets past the policy checks | 1 | pass |
| AC-F02-05 | TEST-F02-05 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-05 / AC-F02-05: unlisted routes are 404 for the anonymous | 2 | pass |
| AC-F02-06 | TEST-F02-06 | unit | `server/tests/sprint-1/route-policies.test.ts` | TEST-F02-06 / AC-F02-06: every registered route has exactly one policy | 1 | pass |
| AC-F02-07 | TEST-F02-07 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-07 / AC-F02-07: identity headers sent by a client are ignored | 1 | pass |
| AC-F02-08 | TEST-F02-08 | API-DB | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-08 / AC-F02-08: a foreign Origin is refused before sign-in and never counted by the throttle | 1 | pass |
| AC-F02-09 | TEST-F02-09 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-09 / AC-F02-09: the origin guard comes before the session check, which comes before the role check | 1 | pass |
| AC-F02-10 | TEST-F02-10 | API | `server/tests/sprint-1/errors.api.test.ts` | TEST-F02-10 / AC-F02-10: a database error is a fixed 500, and a malformed body is a fixed 400 | 1 | pass |
| AC-F02-11 | TEST-F02-11 | component | `client/tests/sprint-1/Navigation.test.tsx` | TEST-F02-11 / AC-F02-11: a requester sees two links, a reviewer sees three | 1 | pass |
| AC-F02-12 | TEST-F02-12 | component | `client/tests/sprint-1/Navigation.test.tsx` | TEST-F02-12 / AC-F02-12: a requester opening /reviews sees a message and no API call is made | 2 | pass |
| AC-F02-13 | TEST-F02-13 | API | `server/tests/sprint-1/errors.api.test.ts` | TEST-F02-13 / AC-F02-13: health and readiness never look up a session | 1 | pass |
| AC-F02-14 | TEST-F02-14 | API | `server/tests/sprint-1/authorization.api.test.ts` | TEST-F02-14 / AC-F02-14: the path variant get //api/reviews/inbox is not a route | 5 | pass |
| AC-F02-15 | TEST-F02-15 | API | `server/tests/sprint-1/errors.api.test.ts` | TEST-F02-15 / AC-F02-15: bodies of 102,400 bytes pass the size check, and 102,401 bytes are 413 | 1 | pass |
| AC-F03-01 | TEST-F03-01 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-01 / AC-F03-01: a valid request is stored as SUBMITTED with one history entry | 1 | pass |
| AC-F03-02 | TEST-F03-02 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-02 / AC-F03-02: a reviewer can submit a request to another reviewer | 1 | pass |
| AC-F03-03 | TEST-F03-03 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-03 / AC-F03-03: identity and status fields sent by the client are ignored | 1 | pass |
| AC-F03-04 | TEST-F03-04 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-04 / AC-F03-04: request numbers are unique and increasing | 1 | pass |
| AC-F03-05 | TEST-F03-05 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-05 / AC-F03-05: the amount is a string from 0.01 to 1,000,000.00 with at most two decimals | 1 | pass |
| AC-F03-06 | TEST-F03-06 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-06 / AC-F03-06: title and description lengths are checked after trimming | 1 | pass |
| AC-F03-07 | TEST-F03-07 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-07 / AC-F03-07: the reviewer must be an active reviewer | 1 | pass |
| AC-F03-08 | TEST-F03-08 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-08 / AC-F03-08: nobody can be the reviewer of their own request | 1 | pass |
| AC-F03-09 | TEST-F03-09 | DB integration | `server/tests/sprint-1/request-constraints.db.test.ts` | TEST-F03-09 (control): a valid row is accepted | 6 | pass |
| AC-F03-10 | TEST-F03-10 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-10 / AC-F03-10: the reviewer list has active reviewers only, without the caller, sorted by name | 1 | pass |
| AC-F03-11 | TEST-F03-11 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-11 / AC-F03-11: my requests are only the ones I submitted, newest first | 1 | pass |
| AC-F03-12 | TEST-F03-12 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-12 / AC-F03-12: the requester and the assigned reviewer can open a request with its history | 1 | pass |
| AC-F03-13 | TEST-F03-13 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-13 / AC-F03-13: anyone else gets the same 404 as for a request that does not exist | 1 | pass |
| AC-F03-14 | TEST-F03-14 | API-DB | `server/tests/sprint-1/requests.api.test.ts` | TEST-F03-14 / AC-F03-14: delete on a request is not a route | 3 | pass |
| AC-F03-15 | TEST-F03-15 | component | `client/tests/sprint-1/NewRequest.test.tsx` | TEST-F03-15 / AC-F03-15: a valid form is posted with the amount as a string, then the new request opens | 1 | pass |
| AC-F03-16 | TEST-F03-16 | component | `client/tests/sprint-1/NewRequest.test.tsx` | TEST-F03-16 / AC-F03-16 (a): a blank form shows four messages beneath their fields and sends nothing | 4 | pass |
| AC-F03-17 | TEST-F03-17 | component | `client/tests/sprint-1/NewRequest.test.tsx` | TEST-F03-17 / AC-F03-17: with no reviewers the form says so and cannot be submitted | 1 | pass |
| AC-F03-18 | TEST-F03-18 | component | `client/tests/sprint-1/MyRequests.test.tsx` | TEST-F03-18 / AC-F03-18: an error shows Try again, which loads the list again | 3 | pass |
| AC-F03-19 | TEST-F03-19 | component | `client/tests/sprint-1/RequestDetail.test.tsx` | TEST-F03-19 / AC-F03-19: a request shows its fields, status, and history | 2 | pass |
| AC-F03-20 | TEST-F03-20 | e2e | `client/e2e/sprint-1/requests.spec.ts` | TEST-F03-20 / AC-F03-20: a submitted request is listed as SUBMITTED, before and after a reload | 1 | pass |
| AC-F03-21 | TEST-F03-21 | API-DB + component | `client/tests/sprint-1/MyRequests.test.tsx` | TEST-F03-21 / AC-F03-21: markup in a title is shown as text, not turned into elements | 3 | pass |
| AC-F04-01 | TEST-F04-01 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-01 / AC-F04-01: the inbox lists only my SUBMITTED requests, oldest first | 1 | pass |
| AC-F04-02 | TEST-F04-02 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-02 / AC-F04-02: with nothing assigned the inbox is an empty list | 1 | pass |
| AC-F04-03 | TEST-F04-03 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-03 / AC-F04-03: approving without a reason records the decision and one history entry | 1 | pass |
| AC-F04-04 | TEST-F04-04 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-04 / AC-F04-04: an approval reason is trimmed and stored on the request and the event | 1 | pass |
| AC-F04-05 | TEST-F04-05 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-05 / AC-F04-05: rejecting with a reason stores it on the request and the event | 1 | pass |
| AC-F04-06 | TEST-F04-06 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-06 / AC-F04-06: a rejection needs a reason of 1 to 1000 characters | 1 | pass |
| AC-F04-07 | TEST-F04-07 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-07 / AC-F04-07: a lower-case decision is refused | 4 | pass |
| AC-F04-08 | TEST-F04-08 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-08 / AC-F04-08: a reviewer cannot decide a request they submitted, whatever the body | 1 | pass |
| AC-F04-09 | TEST-F04-09 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-09 / AC-F04-09: a reviewer the request is not assigned to gets the same 404 as for a missing request | 1 | pass |
| AC-F04-10 | TEST-F04-10 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-10 / AC-F04-10: a requester cannot decide, not even their own request | 1 | pass |
| AC-F04-11 | TEST-F04-11 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-11 / AC-F04-11: a decided request cannot be decided again | 1 | pass |
| AC-F04-12 | TEST-F04-12 | API-DB (concurrency) | `server/tests/sprint-1/decision-concurrency.api.test.ts` | TEST-F04-12 / AC-F04-12: an approve and a reject sent together give exactly one 200 and one 409, twenty times | 1 | pass |
| AC-F04-13 | TEST-F04-13 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-13 / AC-F04-13: the requester sees the decision, the reason, and the history | 1 | pass |
| AC-F04-14 | TEST-F04-14 | DB integration | `server/tests/sprint-1/request-constraints.db.test.ts` | TEST-F04-14 (controls): a valid submitted row, a valid rejected row, and a history row are accepted | 10 | pass |
| AC-F04-15 | TEST-F04-15 | component | `client/tests/sprint-1/ReviewInbox.test.tsx` | TEST-F04-15 / AC-F04-15: a row opens the request | 4 | pass |
| AC-F04-16 | TEST-F04-16 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-16 / AC-F04-16: nobody sees it once the request is decided | 3 | pass |
| AC-F04-17 | TEST-F04-17 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-17 / AC-F04-17 (a): Reject with a blank reason shows a message beneath the field and sends nothing | 3 | pass |
| AC-F04-18 | TEST-F04-18 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-18 / AC-F04-18: a rejection sends its reason | 2 | pass |
| AC-F04-19 | TEST-F04-19 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-19 / AC-F04-19: a 409 says so, loads the request again, and the panel is gone | 1 | pass |
| AC-F04-20 | TEST-F04-20 | e2e | `client/e2e/sprint-1/reviews.spec.ts` | TEST-F04-20 / AC-F04-20: Mint approves a request from the inbox, and it is gone from the inbox after a reload | 1 | pass |
| AC-F04-21 | TEST-F04-21 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-21 / AC-F04-21: a reason that is not a string is refused | 1 | pass |
| AC-F04-22 | TEST-F04-22 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-22 / AC-F04-22: spaces around a 1000-character reason are not counted or stored | 1 | pass |
| AC-F04-23 | TEST-F04-23 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-23 / AC-F04-23: a request I submitted is not in my inbox, but is in its reviewer's | 1 | pass |
| AC-F05-01 | TEST-F05-01 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-01 / AC-F05-01: migrate deploy then seed create the four demo accounts | 1 | pass |
| AC-F05-02 | TEST-F05-02 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-02 / AC-F05-02: running the seed again changes nothing | 1 | pass |
| AC-F05-03 | TEST-F05-03 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-03 / AC-F05-03: a new DEMO_USER_PASSWORD replaces every hash | 1 | pass |
| AC-F05-04 | TEST-F05-04 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-04 / AC-F05-04: without DEMO_USER_PASSWORD the seed exits 1 and creates nothing | 1 | pass |
| AC-F05-05 | TEST-F05-05 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-05 / AC-F05-05: a password with 9 characters is refused without being printed | 2 | pass |
| AC-F05-06 | TEST-F05-06 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-06 / AC-F05-06: no seed run prints the password or a hash | 1 | pass |
| AC-F05-07 | TEST-F05-07 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-07 / AC-F05-07: every stored password_hash is an scrypt hash, not the password | 1 | pass |
| AC-F05-08 | TEST-F05-08 | API | `server/tests/sprint-1/health.api.test.ts` | TEST-F05-08 / AC-F05-08: GET /api/health answers 200 ok, with no cookie | 1 | pass |
| AC-F05-09 | TEST-F05-09 | API | `server/tests/sprint-1/health.api.test.ts` | TEST-F05-09 / AC-F05-09: GET /api/ready answers 200 ready when the database is reachable | 1 | pass |
| AC-F05-10 | TEST-F05-10 | API | `server/tests/sprint-1/health.api.test.ts` | TEST-F05-10 / AC-F05-10: GET /api/ready answers 503 not_ready, with no error detail, when the database fails | 1 | pass |
| AC-F05-11 | TEST-F05-11 | integration (process) | `server/tests/sprint-1/config.process.test.ts` | TEST-F05-11 / AC-F05-11: a broken production configuration exits with code 1 and never listens | 1 | pass |
| AC-F05-12 | TEST-F05-12 | integration (process) | `server/tests/sprint-1/config.process.test.ts` | TEST-F05-12 / AC-F05-12: PORT=4123 with a valid configuration serves /api/health on that port | 1 | pass |
| AC-F05-13 | TEST-F05-13 | manual (static check) | `-` | Recorded in the #8 PR and in Part F | - | manual (see note) |
| AC-F05-14 | TEST-F05-14 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-14 / AC-F05-14: DATABASE_URL unset throws, NODE_ENV=development | 2 | pass |
| AC-F05-15 | TEST-F05-15 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-15 / AC-F05-15: PORT unset gives 3000 and 4123 gives 4123 | 8 | pass |
| AC-F05-16 | TEST-F05-16 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-16 / AC-F05-16: NODE_ENV=staging is refused without echoing it; unset gives development | 1 | pass |
| AC-F05-17 | TEST-F05-17 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-17 / AC-F05-17: CLIENT_ORIGINS defaults outside production, and entries are trimmed | 1 | pass |
| AC-F05-18 | TEST-F05-18 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-18 / AC-F05-18: production (a) only CLIENT_ORIGINS missing names CLIENT_ORIGINS and not DATABASE_URL | 3 | pass |
| AC-F05-19 | TEST-F05-19 | integration (DB) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-19 / AC-F05-19: a changed name and role are restored by one update | 1 | pass |
| AC-F05-20 | TEST-F05-20 | integration (process) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-20 / AC-F05-20: without DATABASE_URL the seed exits 1 within 15 s | 1 | pass |
| AC-F05-21 | TEST-F05-21 | integration (process) | `server/tests/sprint-1/seed.test.ts` | TEST-F05-21 / AC-F05-21: the placeholder password in server/.env.example is refused | 1 | pass |
| AC-F05-22 | TEST-F05-22 | unit | `server/tests/sprint-1/config.test.ts` | TEST-F05-22 / AC-F05-22: CLIENT_DIST_DIR is null when unset or blank, and trimmed when set | 1 | pass |
| AC-F05-23 | TEST-F05-23 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-23 / AC-F05-23: the page, a deep link, and a file are served to anyone | 1 | pass |
| AC-F05-24 | TEST-F05-24 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-24 / AC-F05-24: the API is unchanged while the UI is served | 1 | pass |
| AC-F05-25 | TEST-F05-25 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-25 / AC-F05-25: nothing outside the directory is served | 1 | pass |
| AC-F05-26 | TEST-F05-26 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-26 / AC-F05-26: without CLIENT_DIST_DIR the UI is not served | 1 | pass |
| AC-F05-27 | TEST-F05-27 | unit | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-27 / AC-F05-27: a directory without index.html is refused when the app is created | 1 | pass |
| AC-F05-28 | TEST-F05-28 | API | `server/tests/sprint-1/static-ui.api.test.ts` | TEST-F05-28 / AC-F05-28: a missing file with an extension is a 404, not the page, and deep links still work | 1 | pass |

### Release verification journeys (not AC tests)

These four end-to-end journeys (Issue #12, defined in `docs/sprints/sprint-1/README.md`) check the integrated increment. They pass when first written, so they are not red evidence.

| TEST | Journey | File | Result |
|---|---|---|---|
| TEST-REL-01 | happy path, from submission to the approved request seen by its requester | `client/e2e/sprint-1/journeys.spec.ts` | pass |
| TEST-REL-02 | business rules block a bad request and an undecided rejection, and change nothing | `client/e2e/sprint-1/journeys.spec.ts` | pass |
| TEST-REL-03 | a requester cannot reach or use reviewer operations, and an unrelated reviewer sees nothing | `client/e2e/sprint-1/journeys.spec.ts` | pass |
| TEST-REL-04 | every action on the five main screens can be done with the keyboard alone | `client/e2e/sprint-1/keyboard.spec.ts` | pass |

## 5. Lab 5 additions

These acceptance criteria were added after the Sprint 1 release (`v1.0.0-sprint1`, tested at `7f8cf54`), for Lab 5 requirement R-08: the commit that is running can be read on the page. The Sprint 1 figures in sections 1 to 4 (108 ACs, 107 automated) stay as they were when the release was verified; version 0.5 changes only the status and the wording of NFR-08, NFR-10, NFR-11, NFR-15, and NFR-16 there. With the two ACs below, F-05 has 30 ACs and the contracts hold 110 in all. The contract is [`F-05-seed-and-config.md`](sprints/sprint-1/F-05-seed-and-config.md) (version 0.11); neither AC changes a requirement in section 1.

| Item | Value |
|---|---|
| Code commit tested | `aa1b589` (the merge of PR #57 into `staging`) |
| Client: component | `cd client && npm test`: 9 files, **44 passed, 0 failed, 0 skipped** (8 files and 36 tests at `7f8cf54`; the new file is `BuildFooter.test.tsx`, with 8 tests) |
| Not run for this section | The server suite and the end-to-end tests: neither AC touches `server/`. The footer on the deployed page was checked after the release of PR #59: the live Login page shows `Build 21b7135` (`docs/labs/lab-05/deployment.md` section 6.3, check C-06) |

| AC | TEST | Level | File | Test title (first case) | Tests | Result |
|---|---|---|---|---|---|---|
| AC-F05-29 | TEST-F05-29 | component | `client/tests/sprint-1/BuildFooter.test.tsx` | TEST-F05-29 / AC-F05-29: a 40-character commit shows as its first 7 characters, on the Login screen and when signed in | 1 | pass |
| AC-F05-30 | TEST-F05-30 | component | `client/tests/sprint-1/BuildFooter.test.tsx` | TEST-F05-30 / AC-F05-30: a value that is unset shows Build dev | 7 | pass |

Cases (f) 41 characters and (g) uppercase hexadecimal of AC-F05-30 pass when they were first written (a control, as TEST-F05-26 did; the mutation check in the contract shows they fail when a limit is loosened). The lower limit of 7 characters is checked from below only (a 6-character value is refused): no test uses a valid 7-character value yet.

### Lab 5 checks for the requirements without a Sprint 1 test

NFR-08, NFR-10, NFR-15, and NFR-16 had no automated Sprint 1 test (section 2). They were checked in Lab 5 on a fresh clone and on the deployed service (project `cpe334-th044-p5`, region `asia-southeast1`). The record of the deployments is [`deployment.md`](labs/lab-05/deployment.md) section 6.3. Times are Thai time (UTC+7).

| Requirement | Check | What was done | Result |
|---|---|---|---|
| NFR-10 Reproducible build | C-03 | A fresh clone of the branch `build/33-docker` (commit `c9d691e`, 15 Nov) was built and started with `docker compose --profile app up -d --build`: the migration job applied the 3 migrations, a seeded account could sign in, and `/api/ready` answered 200 (PR #37) | Verified |
| NFR-08 Persistence | C-05 | REQ-000004 was created on 16 Nov at 22:28 on revision `approval-flow-00003-l98` and left Submitted. Run 43899764286 deployed the new revision `approval-flow-00004-rq6`. At 23:18 the same four requests were listed and REQ-000004 was still Submitted; it was decided at 23:19 on the new revision | Verified. A restart without a new revision was not run separately: each revision starts new containers |
| NFR-15 Operability | C-06 | Run 43899764286, started by the merge of release PR #59 (commit `21b7135`, tag `v1.1.0-lab5`): the tests, the image tagged with the full commit, the migration job `approval-flow-migrate-zlb8p` before the service changed, the deploy by digest, and the smoke test of `/api/health`, `/api/ready`, and `/`. The serving revision has the digest of the image tagged `21b7135…`, and the Login page shows `Build 21b7135` | Verified. The smoke test does not sign in (`SMOKE_EMAIL` and `SMOKE_PASSWORD` are not set) |
| NFR-16 Cost | Console | The budget `CPE334-TH044-P5-alert` (alerts only, at 10, 20, 50, and 90 percent) and the Cloud SQL instance `approval-flow-pg` (PostgreSQL 16, 1 vCPU, single zone) are shown in the Lab 5 report (Figures 19 and 6). The Cloud Run limits (minimum 0, maximum 3 instances) and the storage setting (10 GB, auto-increase off) are set in `deploy/deploy.sh` and are not shown in a Console screenshot | Partly verified |

## 6. Change request #65 (Lab 7)

BR-12 and FR-09 were revised after the Sprint 1 release: a rejection needs a category and a reason of at least 10
characters ([F-04](sprints/sprint-1/F-04-review-decision.md) v0.8 to v0.10). The Sprint 1 figures in sections 1 to 4 stay as
they were when that release was verified.

| Item | Value |
|---|---|
| Code commit tested | `5890f39` (branch `feat/65-rejection-reason-min-length`, PR #66) |
| Server | `cd server && npm test`: 14 files, **145 passed, 0 failed, 0 skipped** |
| Client | `cd client && npm test`: 9 files, **54 passed, 0 failed, 0 skipped** |
| End-to-end | `cd client && npm run e2e` against an API from the same commit on a local database: **9 passed** |
| Not run | The previous image against the new columns, the deployed service, and a keyboard pass by a person on the new select |

| AC | TEST | Level | File | Test title (first case) | Tests | Result |
|---|---|---|---|---|---|---|
| AC-F04-24 | TEST-F04-24 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-24 / AC-F04-24: a rejection reason under 10 characters is refused, counted in code points | 1 | pass |
| AC-F04-25 | TEST-F04-25 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-25 / AC-F04-25: ten characters after trimming are accepted and stored with the category | 1 | pass |
| AC-F04-26 | TEST-F04-26 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-26 / AC-F04-26: an approval reason has no minimum | 1 | pass |
| AC-F04-27 | TEST-F04-27 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-27 / AC-F04-27: who may decide is checked before the reason and the category | 1 | pass |
| AC-F04-28 | TEST-F04-28 | component | `client/tests/sprint-1/DecisionPanel.test.tsx` | TEST-F04-28 / AC-F04-28 (a): a short reason and no category show both messages, with focus on the reason | 7 | pass |
| AC-F04-29 | TEST-F04-29 | e2e | `client/e2e/sprint-1/reviews.spec.ts` | TEST-F04-29 / AC-F04-29: Mint rejects with a category chosen by keyboard, and Ploy sees both after a reload | 1 | pass |
| AC-F04-30 | TEST-F04-30 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-30 / AC-F04-30: a missing or unknown category is refused, together with a short reason | 1 | pass |
| AC-F04-31 | TEST-F04-31 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-31 / AC-F04-31: an approval takes no category | 1 | pass |
| AC-F04-32 | TEST-F04-32 | API-DB | `server/tests/sprint-1/reviews.api.test.ts` | TEST-F04-32 / AC-F04-32: every category is stored and returned to the requester | 1 | pass |
| AC-F04-33 | TEST-F04-33 | DB integration | `server/tests/sprint-1/request-constraints.db.test.ts` | TEST-F04-33 (controls): rejected rows with and without a category are accepted | 6 | pass |
| AC-F04-34 | TEST-F04-34 | component | `client/tests/sprint-1/RequestDetail.test.tsx` | TEST-F04-34 / AC-F04-34: a rejection shows its category in the Decision section and the history | 3 | pass |

## 7. Sprint 2: F-06, return and resubmission

[F-06](sprints/sprint-2/F-06-return-and-resubmission.md) v0.3. The Sprint 1 figures in section 4 stay as they were.

| Item | Value |
|---|---|
| Code commit tested | `e6369bc` (branch `feat/71-return-and-resubmit`, PR #73) |
| Server | `cd server && npm test`: 20 files, **174 passed, 0 failed, 0 skipped** |
| Client | `cd client && npm test`: 12 files, **77 passed, 0 failed, 0 skipped** |
| End-to-end | `cd client && npm run e2e -- --workers=1` against an API from the same commit on a local database: **10 passed**. With parallel workers on the same machine `TEST-REL-04` exceeded its time limit in two runs |
| Not run | The deployed service, a pass by a person, and the previous image against the new values |

| AC | TEST | Level | File | Result |
|---|---|---|---|---|
| AC-F06-01 | TEST-F06-01 | API-DB | `server/tests/sprint-2/returns.api.test.ts` | pass |
| AC-F06-02 | TEST-F06-02 | API-DB | `server/tests/sprint-2/returns.api.test.ts` | pass |
| AC-F06-03 | TEST-F06-03 | API-DB | `server/tests/sprint-2/returns.api.test.ts` | pass |
| AC-F06-04 | TEST-F06-04 | API-DB | `server/tests/sprint-2/returns.api.test.ts` | pass |
| AC-F06-05 | TEST-F06-05 | API-DB | `server/tests/sprint-2/returns.api.test.ts` | pass |
| AC-F06-06 | TEST-F06-06 | API-DB | `server/tests/sprint-2/returns.api.test.ts` | pass |
| AC-F06-07 | TEST-F06-07 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-08 | TEST-F06-08 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-09 | TEST-F06-09 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-10 | TEST-F06-10 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-11 | TEST-F06-11 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-12 | TEST-F06-12 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-13 | TEST-F06-13 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-14 | TEST-F06-14 | API-DB | `server/tests/sprint-2/revision.api.test.ts` | pass |
| AC-F06-15 | TEST-F06-15 | API-DB | `server/tests/sprint-2/revision.api.test.ts` | pass |
| AC-F06-16 | TEST-F06-16 | API-DB | `server/tests/sprint-2/resubmission.api.test.ts` | pass |
| AC-F06-17 | TEST-F06-17 | API-DB | `server/tests/sprint-2/return-concurrency.api.test.ts` | pass |
| AC-F06-18 | TEST-F06-18 | API-DB | `server/tests/sprint-2/return-constraints.db.test.ts` | pass |
| AC-F06-19 | TEST-F06-19 | component | `client/tests/sprint-2/ReturnPanel.test.tsx` | pass |
| AC-F06-20 | TEST-F06-20 | component | `client/tests/sprint-2/RequestDetailReturn.test.tsx` | pass |
| AC-F06-21 | TEST-F06-21 | component | `client/tests/sprint-2/ResubmitForm.test.tsx` | pass |
| AC-F06-22 | TEST-F06-22 | component | `client/tests/sprint-2/ReturnPanel.test.tsx` | pass |
| AC-F06-23 | TEST-F06-23 | component | `client/tests/sprint-2/RequestDetailReturn.test.tsx` | pass |
| AC-F06-24 | TEST-F06-24 | e2e | `client/e2e/sprint-2/return.spec.ts` | pass |
| AC-F06-25 | TEST-F06-25 | component | `client/tests/sprint-2/ResubmitForm.test.tsx`, `client/tests/sprint-2/ReturnPanel.test.tsx` | pass |
| AC-F06-26 | TEST-F06-26 | component | `client/tests/sprint-2/ResubmitForm.test.tsx`, `client/tests/sprint-2/ReturnPanel.test.tsx` | pass |
| AC-F06-27 | TEST-F06-27 | component | `client/tests/sprint-2/ResubmitForm.test.tsx`, `client/tests/sprint-2/ReturnPanel.test.tsx` | pass |
| AC-F06-28 | TEST-F06-28 | API-DB | `server/tests/sprint-2/return-rollback.api.test.ts` | pass |
| AC-F06-29 | TEST-F06-29 | component | `client/tests/sprint-2/ResubmitForm.test.tsx` | pass |

## 8. Sprint 2: F-07, multi-stage approval

[F-07](sprints/sprint-2/F-07-multi-stage-approval.md) v0.5. The figures in sections 4 and 7 stay as they were. The revised AC-F05-02 and AC-F05-19 (five accounts) passed in the same server run.

| Item | Value |
|---|---|
| Code commit tested | `84aee97` (branch `feat/76-second-approval`, PR #77) |
| Server | `cd server && npm test`: 25 files, **203 passed, 0 failed, 0 skipped** |
| Client | `cd client && npm test`: 13 files, **91 passed, 0 failed, 0 skipped** |
| End-to-end | `cd client && npm run e2e -- --workers=1` against an API from the same commit on a local database: **11 passed** |
| Not run | The deployed service, a pass by a person, and the previous image against the new values |
| After the review of PR #77 | At `fcdba09` (branch `feat/79-filtering-and-search`, PR #80): server **204 passed**, client **93 passed**, end to end **11 passed** (`--workers=1`), 0 failed |

| AC | TEST | Level | File | Result |
|---|---|---|---|---|
| AC-F07-01 | TEST-F07-01 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-02 | TEST-F07-02 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-03 | TEST-F07-03 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-04 | TEST-F07-04 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-05 | TEST-F07-05 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-06 | TEST-F07-06 | API-DB | `server/tests/sprint-2/second-approval-access.api.test.ts` | pass |
| AC-F07-07 | TEST-F07-07 | API-DB | `server/tests/sprint-2/second-approval-access.api.test.ts` | pass |
| AC-F07-08 | TEST-F07-08 | API-DB | `server/tests/sprint-2/second-approval-access.api.test.ts` | pass |
| AC-F07-09 | TEST-F07-09 | API-DB | `server/tests/sprint-2/second-approval-access.api.test.ts` | pass |
| AC-F07-10 | TEST-F07-10 | API-DB | `server/tests/sprint-2/second-approval-access.api.test.ts` | pass |
| AC-F07-11 | TEST-F07-11 | API-DB | `server/tests/sprint-2/second-approval-access.api.test.ts` | pass |
| AC-F07-12 | TEST-F07-12 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-13 | TEST-F07-13 | API-DB | `server/tests/sprint-2/second-approval-concurrency.api.test.ts` | pass |
| AC-F07-14 | TEST-F07-14 | API-DB | `server/tests/sprint-2/second-approval.api.test.ts` | pass |
| AC-F07-15 | TEST-F07-15 | DB integration | `server/tests/sprint-2/second-approval-constraints.db.test.ts` | pass |
| AC-F07-16 | TEST-F07-16 | integration | `server/tests/sprint-2/seed-accounts.test.ts` | pass |
| AC-F07-17 | TEST-F07-17 | component | `client/tests/sprint-2/SecondApproval.test.tsx` | pass |
| AC-F07-18 | TEST-F07-18 | component | `client/tests/sprint-2/SecondApproval.test.tsx` | pass |
| AC-F07-19 | TEST-F07-19 | e2e | `client/e2e/sprint-2/second-approval.spec.ts` | pass |
| AC-F07-20 | TEST-F07-20 | DB integration | `server/tests/sprint-2/second-approval-constraints.db.test.ts` | pass |

## 9. Sprint 3 work for Deliverable 2: F-08 slice 1, filtering and search

[F-08](sprints/sprint-2/F-08-filtering-and-search.md) v0.3. The figures in sections 4, 7, and 8 stay as they were.

| Item | Value |
|---|---|
| Code commit tested | `71e32d1` (branch `feat/79-filtering-and-search`, PR #80) |
| Server | `cd server && npm test`: 28 files, **238 passed, 0 failed, 0 skipped** |
| Client | `cd client && npm test`: 15 files, **106 passed, 0 failed, 0 skipped** |
| End-to-end | `cd client && npm run e2e -- --workers=1` against an API from the same commit on a local database: **12 passed** |
| Not run | The deployed service, a pass by a person, and a performance measurement |

| AC | TEST | Level | File | Result |
|---|---|---|---|---|
| AC-F08-01 | TEST-F08-01 | API-DB | `server/tests/sprint-3/filters.api.test.ts` | pass |
| AC-F08-02 | TEST-F08-02 | API-DB | `server/tests/sprint-3/filters.api.test.ts` | pass |
| AC-F08-03 | TEST-F08-03 | API-DB | `server/tests/sprint-3/filters.api.test.ts` | pass |
| AC-F08-04 | TEST-F08-04 | API-DB | `server/tests/sprint-3/filters.api.test.ts` | pass |
| AC-F08-05 | TEST-F08-05 | API-DB | `server/tests/sprint-3/filters.api.test.ts` | pass |
| AC-F08-06 | TEST-F08-06 | API-DB | `server/tests/sprint-3/filter-validation.api.test.ts` | pass |
| AC-F08-07 | TEST-F08-07 | API-DB | `server/tests/sprint-3/filter-access.api.test.ts` | pass |
| AC-F08-08 | TEST-F08-08 | API-DB | `server/tests/sprint-3/filters.api.test.ts` | pass |
| AC-F08-09 | TEST-F08-09 | API-DB | `server/tests/sprint-3/filter-validation.api.test.ts` | pass |
| AC-F08-10 | TEST-F08-10 | component | `client/tests/sprint-3/MyRequestsFilters.test.tsx` | pass |
| AC-F08-11 | TEST-F08-11 | component | `client/tests/sprint-3/MyRequestsFilters.test.tsx` | pass |
| AC-F08-12 | TEST-F08-12 | component | `client/tests/sprint-3/ReviewInboxFilters.test.tsx` | pass |
| AC-F08-13 | TEST-F08-13 | e2e | `client/e2e/sprint-3/search.spec.ts` | pass |
