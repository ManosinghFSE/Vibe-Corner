# Testing Guide for Vibe Corner

This document provides comprehensive information about the testing infrastructure and practices for the Vibe Corner application.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Architecture](#test-architecture)
- [Getting Started](#getting-started)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## 🎯 Overview

The Vibe Corner application uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test API endpoints and component interactions
- **Component Tests**: Test React components with user interactions
- **Service Tests**: Test business logic and external service integrations

## 🏗️ Test Architecture

### Backend Testing Stack
- **Jest**: Test framework and test runner
- **Supertest**: HTTP assertion library for API testing
- **Babel**: ES modules transformation for Jest
- **Mocking**: Comprehensive mocking of external dependencies

### Frontend Testing Stack
- **Vitest**: Fast test runner built on Vite
- **React Testing Library**: Component testing utilities
- **Jest DOM**: Custom Jest matchers for DOM testing
- **User Event**: User interaction simulation
- **JSdom**: DOM implementation for Node.js

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js 18+
- npm or yarn

### Installation

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

### Quick Test Run

Use our comprehensive test runner:

```bash
# Run all tests
node test-runner.js

# Run with coverage
node test-runner.js --coverage

# Run only backend tests
node test-runner.js --backend

# Run only frontend tests
node test-runner.js --frontend
```

## 🔧 Backend Testing

### Test Structure

```
backend/src/
├── __tests__/
│   ├── auth.test.js                    # Authentication tests
│   ├── routes/
│   │   ├── billsplitter.test.js        # Bill splitter API tests
│   │   └── ...
│   ├── services/
│   │   ├── collaboration-service.test.js
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.test.js                # Auth middleware tests
│   │   └── ...
│   └── integration/
│       └── api.integration.test.js     # Full API flow tests
```

### Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Example Backend Test

```javascript
import request from 'supertest';
import express from 'express';
import { billSplitterRouter } from '../routes/billsplitter.js';

describe('Bill Splitter API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/billsplitter', billSplitterRouter);
  });

  it('should create a new bill', async () => {
    const newBill = {
      title: 'Team Dinner',
      amount: 120.50,
      participants: ['user1', 'user2']
    };

    const response = await request(app)
      .post('/billsplitter/bills')
      .send(newBill)
      .expect(201);

    expect(response.body.title).toBe('Team Dinner');
    expect(response.body.amount).toBe(120.50);
  });
});
```

## ⚛️ Frontend Testing

### Test Structure

```
frontend/src/
├── modules/
│   ├── auth/
│   │   └── __tests__/
│   │       └── AuthContext.test.tsx
│   ├── dashboard/
│   │   └── __tests__/
│   │       └── Dashboard.test.tsx
│   └── billsplitter/
│       └── __tests__/
│           └── BillSplitterPage.test.tsx
├── test/
│   └── setup.ts                        # Test setup configuration
└── vitest.config.ts                    # Vitest configuration
```

### Running Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Example Frontend Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// Mock AuthContext
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '123', name: 'Test User' },
    accessToken: 'mock-token',
    isInitialized: true
  })
}));

describe('Dashboard', () => {
  it('should render user greeting', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
```

## 🏃‍♂️ Running Tests

### Individual Test Commands

**Backend:**
```bash
# All backend tests
cd backend && npm test

# Specific test file
cd backend && npm test -- auth.test.js

# Watch mode
cd backend && npm run test:watch

# Coverage report
cd backend && npm run test:coverage
```

**Frontend:**
```bash
# All frontend tests
cd frontend && npm test

# Specific test file
cd frontend && npm test -- Dashboard.test.tsx

# Interactive UI
cd frontend && npm run test:ui

# Coverage report
cd frontend && npm run test:coverage
```

### Comprehensive Test Runner

Our custom test runner provides advanced options:

```bash
# Basic usage
node test-runner.js

# With coverage reports
node test-runner.js --coverage

# Backend only
node test-runner.js --backend

# Frontend only
node test-runner.js --frontend

# Linting only
node test-runner.js --lint

# Skip dependency check
node test-runner.js --skip-deps

# Help
node test-runner.js --help
```

## ✍️ Writing Tests

### Test Categories

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test API endpoints and workflows
3. **Component Tests**: Test React component behavior
4. **Service Tests**: Test business logic and external integrations

### Naming Conventions

- Test files: `*.test.js` or `*.test.tsx`
- Test directories: `__tests__/`
- Describe blocks: Use descriptive names for test suites
- Test cases: Use "should" statements for clarity

### Mocking Guidelines

**Backend Mocking:**
```javascript
// Mock external services
jest.mock('../services/supabase-client.js', () => ({
  getSupabase: jest.fn(() => mockSupabaseClient)
}));

// Mock middleware
jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { sub: 'test-user' };
    next();
  }
}));
```

**Frontend Mocking:**
```typescript
// Mock React hooks
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;
```

## 📊 Coverage Reports

### Backend Coverage

After running `npm run test:coverage` in the backend directory:

- **HTML Report**: `backend/coverage/index.html`
- **Text Summary**: Displayed in terminal
- **LCOV Report**: `backend/coverage/lcov.info`

### Frontend Coverage

After running `npm run test:coverage` in the frontend directory:

- **HTML Report**: `frontend/coverage/index.html`
- **Text Summary**: Displayed in terminal
- **Coverage Data**: `frontend/coverage/`

### Coverage Targets

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd backend && npm ci
        cd ../frontend && npm ci
        
    - name: Run tests
      run: node test-runner.js --coverage
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## 📝 Best Practices

### General Testing Principles

1. **Write tests first** (TDD approach when possible)
2. **Keep tests simple and focused**
3. **Use descriptive test names**
4. **Mock external dependencies**
5. **Test both happy path and error cases**
6. **Maintain test independence**
7. **Regular test maintenance**

### Backend Testing Best Practices

1. **API Testing**:
   - Test all HTTP methods
   - Validate request/response schemas
   - Test authentication and authorization
   - Test error handling

2. **Database Testing**:
   - Mock database calls
   - Test data validation
   - Test edge cases

3. **Service Testing**:
   - Mock external APIs
   - Test retry mechanisms
   - Test timeout scenarios

### Frontend Testing Best Practices

1. **Component Testing**:
   - Test user interactions
   - Test component props
   - Test conditional rendering
   - Test accessibility

2. **Integration Testing**:
   - Test API integration
   - Test routing
   - Test state management

3. **User Experience Testing**:
   - Test loading states
   - Test error boundaries
   - Test responsive design

### Code Quality

1. **Use ESLint** for code consistency
2. **Follow naming conventions**
3. **Write clear test descriptions**
4. **Keep tests DRY** (Don't Repeat Yourself)
5. **Regular refactoring**

## 🔍 Debugging Tests

### Backend Debugging

```bash
# Debug specific test
cd backend && npm test -- --detectOpenHandles auth.test.js

# Verbose output
cd backend && npm test -- --verbose

# Debug with Node inspector
cd backend && node --inspect-brk node_modules/.bin/jest auth.test.js
```

### Frontend Debugging

```bash
# Debug in browser
cd frontend && npm run test:ui

# Verbose output
cd frontend && npm test -- --reporter=verbose

# Debug specific test
cd frontend && npm test -- Dashboard.test.tsx
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## 🤝 Contributing

When contributing to the test suite:

1. **Add tests for new features**
2. **Update existing tests when modifying code**
3. **Ensure all tests pass before submitting PR**
4. **Maintain or improve code coverage**
5. **Follow established testing patterns**

---

For questions or issues with testing, please refer to the project documentation or create an issue in the repository. 