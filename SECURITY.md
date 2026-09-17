# Security Policy

## Reporting

Please report vulnerabilities privately through GitHub Security Advisories. Do not open a public issue containing credentials, tokens, personal data, or an exploitable proof of concept.

## Security principles

- OAuth access and refresh tokens belong only on the server and must be encrypted or stored through a credentials reference.
- Never place secrets in browser storage, client bundles, logs, repository files, screenshots, fixtures, or API responses.
- Every project, asset, listing draft, and marketplace connection query must include the authenticated `userId`.
- Marketplace publishing is intentionally out of scope. Adapters may create drafts only.
- Rotate any credential immediately if it is exposed.

Supported security fixes target the latest version on the default branch.
