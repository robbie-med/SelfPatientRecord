# HealthBinder — Security Notes

## Local-First Architecture

HealthBinder is designed to be **local-first**: your health data lives on your device or your own server, not on a third-party cloud by default.

## Data Storage

- SQLite database stored at the configured `DATA_DIR` path
- Default path: `./data/healthbinder.db`
- In Docker: mounted as a named volume (not inside the container)
- The database is not encrypted at rest by default; use OS-level disk encryption (e.g., FileVault, BitLocker, dm-crypt) for additional protection

## AI Data Transmission

When AI features are enabled:

1. You will see a clear warning before any text is transmitted
2. Only the text you explicitly choose to process is sent
3. No background or automatic uploads occur
4. The destination (AI provider URL) is configurable
5. Review your AI provider's privacy policy and data retention practices

### Recommended: Maple Proxy

For stronger privacy, configure `AI_BASE_URL` to point to a [Maple Proxy](https://mapleproxy.com) instance, which provides end-to-end encryption and TEE attestation before text reaches the LLM.

## API Keys

- Never hardcode API keys in source code
- Store API keys in `.env` file or environment variables only
- The `.env` file is listed in `.gitignore` and must never be committed

## Network Exposure

- By default, the server binds to `localhost` only (not accessible from other machines)
- In Docker, map only the port you intend to expose
- Do not expose HealthBinder to the public internet without:
  - HTTPS with a valid TLS certificate
  - Authentication layer (not included in MVP)
  - Firewall rules

## Known Limitations (MVP)

- No authentication or user accounts (single-patient, local use assumed)
- No database encryption at rest
- No rate limiting on AI endpoints
- No audit log viewer UI (audit data stored but not displayed)
- No automatic backup system

These are known gaps intended to be addressed in future versions.

## Reporting Issues

Report security issues via the project issue tracker. Do not include actual health data in bug reports.

---

*Last updated: 2026-04-24*
