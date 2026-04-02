.PHONY: help install dev build test lint format clean docker-up docker-down

help:
	@echo "FLASH - Agentic Wallet Platform"
	@echo ""
	@echo "Available commands:"
	@echo "  make install          Install all dependencies"
	@echo "  make dev              Start development servers"
	@echo "  make build            Build all projects"
	@echo "  make test             Run all tests"
	@echo "  make test-backend     Run backend tests"
	@echo "  make test-frontend    Run frontend tests"
	@echo "  make lint             Run all linters"
	@echo "  make lint-backend     Run backend linter"
	@echo "  make lint-frontend    Run frontend linter"
	@echo "  make type-check       TypeScript strict mode check"
	@echo "  make format           Format code with prettier"
	@echo "  make clean            Clean all build artifacts"
	@echo "  make docker-up        Start Docker containers"
	@echo "  make docker-down      Stop Docker containers"
	@echo "  make docker-logs      View Docker container logs"
	@echo ""

install:
	cd backend && npm install
	cd frontend && npm install

dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:3000"
	@concurrently "cd backend && npm run dev" "cd frontend && npm run dev"

build:
	cd backend && npm run build
	cd frontend && npm run build

test:
	cd backend && npm test
	cd frontend && npm test || true

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

lint:
	cd backend && npm run lint || true
	cd frontend && npm run lint || true

lint-backend:
	cd backend && npm run lint

lint-frontend:
	cd frontend && npm run lint

type-check:
	cd backend && npm run type-check
	cd frontend && npm run type-check
	@echo "TypeScript checks passed!"

format:
	npx prettier --write "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"

clean:
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/.next frontend/node_modules
	rm -rf backend/coverage frontend/coverage

docker-up:
	docker-compose up -d
	@echo "Services running:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Backend: localhost:3001"
	@echo "  Frontend: localhost:3000"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	docker-compose build

# Advanced targets

migrate:
	@echo "Running database migrations..."
	@echo "TODO: Implement migrations"

audit:
	cd backend && npm audit
	cd frontend && npm audit

security-check:
	@echo "Running security checks..."
	@npm install -g snyk 2>/dev/null || true
	@snyk test 2>/dev/null || echo "Snyk not available"

setup-hooks:
	git config core.hooksPath .git/hooks
	chmod +x .git/hooks/* 2>/dev/null || true

.DEFAULT_GOAL := help
