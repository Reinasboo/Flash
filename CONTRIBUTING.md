# Contributing Guidelines

Thank you for your interest in contributing to FLASH (Financial Ledger Agent for Stellar Holdings)!

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites
- Node.js 18+ with npm or yarn
- PostgreSQL 14+
- Git 2.40+

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Reinasboo/Flash.git
cd Flash

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env.local  # (See docs/DEPLOYMENT.md for details)
```

### Development Commands

**Backend**
```bash
cd backend
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm test             # Run tests
npm run lint         # Check code style
npm run type-check   # TypeScript validation
```

**Frontend**
```bash
cd frontend
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # Check code style
npm run type-check   # TypeScript validation
```

## Code Standards

### TypeScript
- ✅ All code must be fully typed (no `any` without justification)
- ✅ Strict null checks enabled
- ✅ 0 TypeScript compilation errors required

### Security
- ✅ No hardcoded secrets or credentials
- ✅ Input validation required on all endpoints
- ✅ No SQL string concatenation (parameterized queries only)
- ✅ No eval(), innerHTML, or dangerouslySetInnerHTML
- ✅ Security review required for auth/crypto changes

### Code Style
- ✅ Use ESLint configuration (run `npm run lint`)
- ✅ Follow project naming conventions
- ✅ Single responsibility principle
- ✅ Clear, descriptive variable/function names
- ✅ Comments for non-obvious logic

### Testing
- ✅ Unit tests for business logic
- ✅ Integration tests for API endpoints
- ✅ Test coverage should not decrease
- ✅ All tests must pass before merge

## Pull Request Process

### Before Creating a Pull Request
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes with clear commits
4. **Test** your changes thoroughly:
   ```bash
   npm test           # Run tests
   npm run type-check # Verify types
   npm run lint       # Check code style
   ```
5. **Update** documentation if needed
6. **Push** to your fork

### Pull Request Checklist
- [ ] PR title is clear and descriptive
- [ ] PR description explains why (not just what)
- [ ] All tests pass (`npm test`)
- [ ] TypeScript has 0 errors (`npm run type-check`)
- [ ] Code passes linting (`npm run lint`)
- [ ] Documentation updated (if applicable)
- [ ] Commits follow semantic versioning
- [ ] No breaking changes (or clearly marked if necessary)
- [ ] Security implications considered

### Commit Message Format

Follow semantic commit messages:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Dependency updates, build changes
- `security`: Security fixes or hardening

**Examples:**
```
feat(auth): add token refresh mechanism

Implement automatic control token refresh before expiration.
Adds refresh_token field to BYOA credentials.

Fixes #123
```

```
fix(database): prevent connection pool exhaustion

Add connection timeout and proper cleanup in transaction handler.

Closes #456
```

## Review Process

All PRs will be reviewed by maintainers for:
- ✅ Code quality and standards
- ✅ Security implications
- ✅ Test coverage
- ✅ Documentation completeness
- ✅ Performance impact

Feedback will be provided constructively. Changes may be requested before merge.

## Area-Specific Guidelines

### Backend Changes

- Use TypeScript strict mode
- All database queries must use parameterized statements
- Validate input with Zod schemas
- Add appropriate error handling
- Include security event logging for auth changes
- Update API documentation

### Frontend Changes

- Use React hooks (no class components)
- Implement proper TypeScript types
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Ensure accessibility (WCAG 2.1 AA)
- Don't store sensitive data in localStorage
- Update component documentation

### Documentation Changes

- Use clear, concise language
- Include examples where helpful
- Update table of contents if adding sections
- Verify links are correct
- Include diagrams for architecture changes

## Security Issues

**Do not** create a public issue for security vulnerabilities.

Instead, please email security@flash-wallet.io with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

The team will respond within 48 hours.

## Licensing

By contributing to FLASH, you agree that your contributions will be licensed under the MIT License.

## Questions?

- 📖 Check [README.md](../README.md) for quick start
- 📚 Read [ARCHITECTURE.md](../docs/ARCHITECTURE.md) for system design
- 🔒 Review [SECURITY.md](../docs/SECURITY.md) for security guidelines
- 🚀 See [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for deployment guide

## Recognition

Contributors will be recognized in:
- Release notes for significant contributions
- CONTRIBUTORS.md file
- GitHub contributors page

Thank you for helping make FLASH better! 🚀
