# SupportHub triage rubric

Priority is assigned from evidence, not from how alarming an error looks or how many times it fired.
A high occurrence count with a small blast radius is noise. A low count that blocks checkout is not.

## Priority levels

| Priority | Impact | Affected users | Workaround | Response |
|---|---|---|---|---|
| **P0** | Core workflow unavailable; data loss or corruption | Any number — severity alone qualifies | None | Immediate |
| **P1** | Core workflow degraded or failing for many users | 100 or more | None, or manual only | Same day |
| **P2** | Non-core workflow failing, or core workflow with a workaround | 10 to 99 | Documented workaround exists | Next sprint |
| **P3** | Cosmetic, noisy, or self-recovering | Fewer than 10 | Unaffected in practice | Backlog |

## Required evidence

A priority is only valid when all four are present:

1. **Impact** — which user workflow breaks, named specifically
2. **Affected users** — a count from the error source, not an estimate
3. **Workaround** — whether one exists, and whether users can find it unaided
4. **Confidence** — how strongly the supporting evidence ties cause to effect

## Confidence levels

| Level | Meaning |
|---|---|
| **High** | Stack trace points at code a recent change touched, and timing aligns |
| **Medium** | Evidence is consistent with the hypothesis but other causes remain open |
| **Low** | Correlation is circumstantial — proximity in time is the only link |

**Low confidence is not a priority.** A finding with low confidence is deferred for more evidence,
whatever its apparent severity.

## Rules that override raw counts

- **Occurrence count does not set priority.** One error firing 900 times for 3 users is P3.
- **Recency is not causation.** The most recent deploy is not automatically the cause. A change is
  only implicated when it touched code on the failing path.
- **Duplicates are merged before prioritizing.** Two events with the same root cause are one finding;
  their user counts combine, and the merged finding is prioritized once.
