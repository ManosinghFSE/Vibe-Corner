# Vibe Corner 🎉

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](./TESTING.md)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green)](./TESTING.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A modern, comprehensive team experience application that brings teams together through shared activities, collaborative planning, and meaningful connections. Built with React, Node.js, and Supabase.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/ManosinghFSE/Vibe-Corner.git
cd Vibe-Corner

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment
cp backend/env.example backend/.env
# Edit backend/.env with your Supabase credentials

# Run the application
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2

# Run tests
node test-runner.js --coverage
```

Visit `http://localhost:5173` to start using Vibe Corner!

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

### 🎯 **Activity Planner**
- Smart activity recommendations based on team preferences
- Location-based suggestions with Google Places integration
- Collaborative voting and decision-making
- Real-time activity planning sessions

### 💰 **Bill Splitter**
- Easy expense sharing among team members
- Multiple split options (equal, custom, percentage)
- Receipt upload and expense categorization
- Payment tracking and settlement reminders

### 🎂 **Birthday & Events**
- Automated birthday reminders
- Holiday calendar integration
- Custom event creation and management
- RSVP tracking and calendar exports (ICS)

### 💼 **Meeting Mind**
- Smart meeting scheduling with availability detection
- Action item tracking and assignment
- Meeting templates and recurring meetings
- Integration with calendar systems

### 📖 **Memory Lane**
- Team journal for shared experiences
- Mood tracking and sentiment analysis
- Photo and media attachments
- Advanced search and filtering
- Export capabilities

### 🔄 **Skill Swap**
- Team skill directory and matching
- Learning path recommendations
- Mentorship pairing
- Skill gap analysis

### 🤝 **Collaborative Planning**
- Real-time collaboration with Socket.IO
- Live voting and decision-making
- Session management and history
- Multi-user activity planning

### 📊 **Smart Dashboard**
- Personalized recommendations
- Upcoming events and deadlines
- Team activity insights
- Quick access to all features

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Styled Components** - CSS-in-JS styling
- **Framer Motion** - Smooth animations
- **React Spring** - Advanced animations
- **Socket.IO Client** - Real-time communication

### **Backend**
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Supabase** - Backend-as-a-Service
- **Socket.IO** - Real-time communication
- **JWT** - Authentication and authorization
- **Zod** - Schema validation
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

### **Testing**
- **Jest** - Backend testing framework
- **Vitest** - Frontend testing framework
- **React Testing Library** - Component testing
- **Supertest** - API testing
- **Coverage Reports** - Code coverage analysis

### **DevOps & Deployment**
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **GitHub Actions** - CI/CD pipeline
- **Azure/AWS** - Cloud deployment ready

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • Components    │    │ • REST API      │    │ • PostgreSQL    │
│ • State Mgmt    │    │ • Socket.IO     │    │ • Real-time     │
│ • Routing       │    │ • Auth          │    │ • Row Level     │
│ • Real-time     │    │ • Middleware    │    │   Security      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Key Design Principles**
- **Modular Architecture** - Feature-based organization
- **Real-time First** - Live collaboration throughout
- **Security by Design** - Authentication, authorization, and input validation
- **Test-Driven Development** - Comprehensive test coverage
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG AA compliance

## 🚀 Getting Started

### **Prerequisites**

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm or yarn** - Package manager
- **Supabase Account** - [Sign up](https://supabase.com/)
- **Git** - Version control

### **Installation**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ManosinghFSE/Vibe-Corner.git
   cd Vibe-Corner
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**
   ```bash
   # Copy environment template
   cp backend/env.example backend/.env
   
   # Edit with your credentials
   nano backend/.env
   ```

   Required environment variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your_jwt_secret
   PORT=4000
   NODE_ENV=development
   ```

5. **Database Setup**
   ```bash
   # Apply database schema (see Database section)
   # Run seeding scripts if desired
   cd backend
   npm run seed:events
   npm run seed:meetings
   npm run seed:memory-skills
   ```

### **Development**

Start both servers in development mode:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs (if configured)

## 🧪 Testing

Vibe Corner includes a comprehensive test suite covering unit tests, integration tests, and end-to-end scenarios.

### **Quick Test Commands**

```bash
# Run all tests with coverage
node test-runner.js --coverage

# Run only backend tests
node test-runner.js --backend

# Run only frontend tests
node test-runner.js --frontend

# Run tests in watch mode
cd backend && npm run test:watch
cd frontend && npm test
```

### **Test Coverage**

Our test suite maintains high coverage standards:

| Component | Coverage |
|-----------|----------|
| Backend API | 85%+ |
| Frontend Components | 80%+ |
| Authentication | 95%+ |
| Database Layer | 90%+ |

### **Testing Documentation**

For detailed testing information, see [TESTING.md](./TESTING.md):
- Test architecture and strategy
- Writing new tests
- Mocking guidelines
- Coverage reports
- CI/CD integration

## 📚 API Documentation

### **Authentication**

All API endpoints require authentication via JWT tokens:

```javascript
// Headers
Authorization: Bearer <your_jwt_token>
```

### **Core Endpoints**

#### **Activity Planner**
```bash
GET    /api/activity/recommendations     # Get activity suggestions
POST   /api/activity/sessions           # Create planning session
GET    /api/activity/sessions/:id       # Get session details
POST   /api/activity/sessions/:id/vote  # Vote on activities
```

#### **Bill Splitter**
```bash
GET    /api/billsplitter/bills          # Get user's bills
POST   /api/billsplitter/bills          # Create new bill
PUT    /api/billsplitter/bills/:id      # Update bill
DELETE /api/billsplitter/bills/:id      # Delete bill
POST   /api/billsplitter/bills/:id/split # Calculate splits
```

#### **Events & Birthdays**
```bash
GET    /api/eventgrid/events            # Get events
POST   /api/eventgrid/events            # Create event
POST   /api/eventgrid/events/:id/rsvp   # RSVP to event
GET    /api/birthday/upcoming           # Get upcoming birthdays
```

#### **Memory Lane**
```bash
GET    /api/memorylane/entries          # Get journal entries
POST   /api/memorylane/entries          # Create entry
PUT    /api/memorylane/entries/:id      # Update entry
DELETE /api/memorylane/entries/:id      # Delete entry
GET    /api/memorylane/stats            # Get statistics
```

#### **Real-time Collaboration**
```bash
# Socket.IO Events
join-session      # Join collaboration session
leave-session     # Leave session
activity-update   # Broadcast activity changes
vote-cast         # Cast vote for activity
session-update    # Session state changes
```

### **Request/Response Examples**

**Create Bill:**
```javascript
POST /api/billsplitter/bills
{
  "title": "Team Dinner",
  "amount": 120.50,
  "description": "Italian restaurant",
  "participants": ["user1", "user2", "user3"]
}

Response:
{
  "id": "bill_123",
  "title": "Team Dinner",
  "amount": 120.50,
  "splitAmount": 40.17,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## 🚢 Deployment

### **Docker Deployment**

The application includes Docker configuration for easy deployment:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t vibe-corner-backend ./backend
docker build -t vibe-corner-frontend ./frontend
```

### **Cloud Deployment**

#### **Vercel (Frontend)**
```bash
cd frontend
npm run build
vercel --prod
```

#### **Railway/Heroku (Backend)**
```bash
cd backend
# Configure environment variables in dashboard
git push railway main
```

#### **Azure Container Instances**
```bash
# Configure Azure CLI
az container create \
  --resource-group vibe-corner \
  --name vibe-corner-app \
  --image your-registry/vibe-corner:latest
```

### **Environment Configuration**

Production environment variables:
```env
NODE_ENV=production
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_key
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_MAX=100
```

## 🤝 Contributing

We welcome contributions! Please see our contribution guidelines:

### **Development Workflow**

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests for new functionality**
5. **Run the test suite**
   ```bash
   node test-runner.js --coverage
   ```
6. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
7. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### **Code Standards**

- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **TypeScript** - Type safety
- **Conventional Commits** - Commit message format
- **Test Coverage** - Maintain 80%+ coverage

### **Pull Request Guidelines**

- Include comprehensive tests
- Update documentation
- Follow existing code style
- Provide clear PR description
- Link related issues

## 🐛 Troubleshooting

### **Common Issues**

**Authentication Errors (401)**
```bash
# Check JWT token expiration
# Re-login through the application
# Verify SUPABASE_SERVICE_ROLE_KEY in .env
```

**Database Connection Issues**
```bash
# Verify Supabase credentials
# Check database schema is applied
# Ensure RLS policies are configured
```

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
npm run clean
```

**Socket.IO Connection Issues**
```bash
# Check backend is running on port 4000
# Verify CORS configuration
# Check firewall settings
```

### **Performance Optimization**

**Frontend:**
- Bundle size optimization with tree shaking
- Lazy loading of components
- Image optimization and caching
- Service worker for offline functionality

**Backend:**
- Database query optimization
- Redis caching for frequently accessed data
- Connection pooling
- Rate limiting and request throttling

### **Security Considerations**

- JWT token rotation
- Input validation with Zod schemas
- SQL injection prevention
- XSS protection with CSP headers
- Rate limiting on all endpoints
- Secure cookie configuration

## 📊 Monitoring & Analytics

### **Application Monitoring**
- Error tracking with Sentry
- Performance monitoring
- User analytics with privacy focus
- API response time tracking

### **Health Checks**
```bash
# Backend health check
GET /api/health

# Database connection check  
GET /api/health/db

# External services check
GET /api/health/external
```

## 🔗 Links & Resources

- **Live Demo**: [https://vibe-corner-demo.vercel.app](https://vibe-corner-demo.vercel.app)
- **Documentation**: [Full Documentation](./docs/)
- **API Reference**: [API Docs](./docs/api.md)
- **Testing Guide**: [Testing Documentation](./TESTING.md)
- **Deployment Guide**: [Deployment Documentation](./DEPLOYMENT_SUMMARY.md)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Vercel** - Frontend hosting
- **React Team** - Amazing framework
- **Contributors** - All the amazing people who contribute to this project

---

**Made with ❤️ by the Vibe Corner Team**

For support or questions, please [open an issue](https://github.com/ManosinghFSE/Vibe-Corner/issues) or reach out to our team. 