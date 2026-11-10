# Domain docs

This repository uses a single-context layout. Domain documentation stays in the
`AstrologyEngine/web` code repository; issues and specs live in the private
`AstrologyEngine/web-issues` tracker. Use full GitHub URLs when linking between
code, decisions, and tracker issues.

## Before exploring

Read root `GLOSSARY.md` and relevant decisions in `docs/adr/`.

If these files do not exist, proceed silently. Do not flag their absence
or suggest creating them upfront. The domain-modeling skill creates
them lazily when terms or decisions are resolved.

## File structure

- `GLOSSARY.md`: shared domain vocabulary.
- `docs/adr/`: numbered architecture decision records.

## Use the glossary's vocabulary

Use defined domain terms in issue titles, proposals, hypotheses, and
tests. Avoid synonyms the glossary explicitly excludes.

If a needed concept is missing, reconsider whether it belongs in the
domain or note the gap for domain-modeling.

## Flag ADR conflicts

If a proposal contradicts an existing ADR, identify the ADR and explain
why the decision should be reopened.
