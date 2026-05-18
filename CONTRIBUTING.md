# Cursor session rules

1. Each session edits ONE sub-repository only.
2. Always git-commit before running Cursor on existing code.
3. Type-check / lint / test after every Cursor edit before next prompt.
4. New dependencies require explicit approval — Cursor must ASK before editing package.json or pyproject.toml.
5. Each new feature gets its own branch named feat/<scope>-<short-desc>.
