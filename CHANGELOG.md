# Changelog

All notable changes to the FLASH project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Session timeout provider with 30-minute inactivity limit
- Clipboard auto-clear protection (60 seconds)
- Frontend security headers (CSP, X-Frame-Options, etc.)
- Comprehensive codebase audit documentation
- GitHub Actions CI/CD workflows
- Contributing guidelines and code of conduct

### Changed
- Migrated from localStorage to sessionStorage for credentials
- Updated security headers configuration
- Enhanced error handling in authentication middleware

### Fixed
- Fixed localStorage credential persistence vulnerability
- Fixed missing session timeout
- Fixed missing frontend security headers
- Fixed control token exposure in clipboard

### Security
- All OWASP Top 10 vulnerabilities addressed
- SQL injection prevention with parameterized queries
- XSS protection with CSP headers
- CSRF prevention with rate limiting
- Session fixation prevention with timeout + logout
- Timing-safe token comparison implemented

## [1.0.0] - 2026-04-02

### Added
- Initial release of FLASH platform
- Autonomous agent wallet management on Stellar
- BYOA (Bring Your Own Agent) subsystem
- PostgreSQL persistence layer
- Express REST API with security hardening
- Next.js React dashboard
- Stellar SDK integration
- AES-256-GCM wallet encryption
- Zod input validation
- Session timeout and audit logging
- Webhook delivery engine

### Features
- Agent creation and management
- Secure control token authentication
- Transaction intent processing
- Real-time balance checking
- Wallet encryption with key derivation
- Comprehensive security headers
- Rate limiting on public endpoints
- Database transaction safety
- Activity logging and audit trail

### Documentation
- Architecture documentation
- API reference
- Deployment guide
- Security implementation details
- Testing documentation
- Quick start guide

### Security
- 0 critical vulnerabilities
- 0 high severity vulnerabilities
- All parameterized database queries
- Authorization middleware on protected endpoints
- Comprehensive error handling
- No sensitive data in logs

---

## Release Process

### For Maintainers

1. Update version in package.json files
2. Update CHANGELOG.md with release notes
3. Create a git tag: `git tag -a v1.0.0 -m "Release version 1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. Create release on GitHub with detailed notes
6. Announce on channels

### Semantic Versioning

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards-compatible manner
- **PATCH** version when you make backwards-compatible bug fixes

Example tags:
- `v1.0.0` - Production release
- `v1.1.0` - Minor feature addition
- `v1.0.1` - Patch release
- `v2.0.0` - Major version with breaking changes

---

## Version Support

| Version | Status | Release Date | End of Life |
|---------|--------|--------------|------------|
| 1.0.x   | Current | 2026-04-02 | 2027-04-02 |

---

## Links

- [Latest Release](https://github.com/Reinasboo/Flash/releases/latest)
- [All Tags](https://github.com/Reinasboo/Flash/tags)
- [Compare Versions](https://github.com/Reinasboo/Flash/compare)
