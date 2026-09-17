# Contributing

Thank you for improving Wallpaper AI Studio.

1. Fork the repository and create a focused branch.
2. Copy `.env.example` to `.env.local`; never commit credentials.
3. Run `npm install`, `npm test`, and `npm run lint` before opening a pull request.
4. Keep marketplace, rendering, storage, authentication, and export services behind adapter interfaces.
5. Add ownership checks to every query that reads user-owned data.
6. Include tests for behavior changes and explain any schema migration.

By contributing, you agree that your contribution is licensed under the MIT License.
