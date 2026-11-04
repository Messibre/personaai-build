# Return-loop metrics

The number that matters: of the people who tried the tailor flow, how many came back with a second, different job posting.

## Definitions

Constants live in `return-loop.ts`.

- **Tested user**: a vault with at least 1 application. A vault with 0 applications is not counted.
- **Distinct posting**: applications are grouped by `jobTextHash`. The same posting pasted twice is one posting, seen first at its earliest `createdAt`.
- **Returner**: a vault with at least 2 distinct postings where a later posting was created at least `MIN_RETURN_GAP_MS` (1 hour) and at most `MAX_RETURN_WINDOW_MS` (14 days) after the first. A person with three postings is counted once.
- **Same-sitting second job**: a vault with a second distinct posting less than 1 hour after the first, and no qualifying return. Reported separately and never counted as a returner.
- **Status** per user: `returned`, `same_sitting`, or `one` (no qualifying second posting: only one distinct posting, or later postings fall outside the 14-day window).
- **Accuracy**: `accurateCount / feedbackCount` over applications that have `feedback`. Shown as "no answers yet" when there is no feedback.
- Applications dated after `now` are ignored (bad clocks or edited data).

## Headline

`returners / testedUsers`, shown as "3 of 10".

## Privacy

`computeLoopMetrics` is pure and works on full vaults. The admin route returns only name, counts, timestamps and feedback flags/notes. It never returns vault ids (they are access secrets), emails, facts, posting text or posting hashes.
