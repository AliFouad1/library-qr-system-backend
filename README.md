# Library Management System - Backend

QR Code Based Smart Library Management System - Backend API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or pnpm

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Setup database**
```bash
# Create database
createdb library_db

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed database with sample data
npm run prisma:seed
```

4. **Start server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

### Default Credentials

After seeding, you can login with:

- **Admin**: admin@library.local / admin123
- **Staff**: staff@library.local / staff123
- **User**: john@example.com / user123

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.js             # Seed data
├── src/
│   ├── controllers/        # Route controllers
│   │   ├── auth.controller.js
│   │   ├── book.controller.js
│   │   ├── borrowing.controller.js
│   │   ├── category.controller.js
│   │   ├── qr.controller.js
│   │   └── shelf.controller.js
│   ├── middleware/         # Express middleware
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── routes/             # API routes
│   │   ├── auth.routes.js
│   │   ├── book.routes.js
│   │   ├── borrowing.routes.js
│   │   ├── category.routes.js
│   │   ├── qr.routes.js
│   │   ├── shelf.routes.js
│   │   ├── user.routes.js
│   │   ├── notification.routes.js
│   │   └── report.routes.js
│   ├── services/           # Business logic
│   │   ├── qr.service.js
│   │   └── overdue.service.js
│   └── server.js           # Main application file
├── .env.example            # Environment template
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/library_db"

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000

# QR Configuration
QR_CODE_BASE_URL=http://localhost:5000/scan

# Business Rules
MAX_BORROW_DAYS=14
MAX_BOOKS_PER_USER=5
OVERDUE_CHECK_INTERVAL=86400000  # 24 hours in ms
```

## 📚 API Documentation

See [API_DOCS.md](./API_DOCS.md) for complete API reference.

### Quick Examples

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@library.local","password":"admin123"}'
```

**Get Books:**
```bash
curl http://localhost:5000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗄️ Database Schema

### Main Tables:
- **users** - System users (admin, staff, borrowers)
- **books** - Book inventory
- **categories** - Book categories
- **shelves** - Physical shelf locations
- **borrowing** - Borrowing transactions
- **notifications** - User notifications
- **audit_logs** - System audit trail

See [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) for ERD and details.

## 🎯 Key Features

### 1. QR Code Generation
- Automatic QR generation for books and shelves
- QR contains only ID (not sensitive data)
- Base64 encoded PNG format
- High error correction level

### 2. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Token expiration handling

### 3. Book Management
- CRUD operations
- Automatic copy tracking
- Status management (AVAILABLE, BORROWED, MAINTENANCE, LOST)
- Category and shelf assignment

### 4. Borrowing System
- Borrow/return workflow
- Overdue detection
- Borrowing limits
- Extension support
- Borrowing history

### 5. Shelf Auditing
- Scan shelf to see expected books
- Detect missing books
- Identify misplaced books

### 6. Notifications
- Overdue alerts
- Return reminders
- System notifications

### 7. Reports & Analytics
- Dashboard statistics
- Most borrowed books
- Overdue reports
- Monthly summaries

## 🔐 Security Features

- Password hashing (bcrypt, 10 rounds)
- JWT token authentication
- Role-based access control
- SQL injection prevention (Prisma ORM)
- Input validation
- CORS configuration
- Audit logging
- Rate limiting (TODO)

## 🧪 Testing

### Manual Testing
Use the seed data to test the system:

1. Login as admin
2. Create a book → QR generated automatically
3. Scan book QR → View details
4. Borrow book → Updates availability
5. Scan shelf QR → View shelf inventory
6. Return book → Restores availability

### API Testing Tools
- **Postman**: Import the API collection
- **Thunder Client**: VS Code extension
- **cURL**: Command-line testing

## 🚀 Deployment

### Production Checklist

1. **Environment**
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Secure database credentials
   - Configure CORS for production domain

2. **Database**
   - Run migrations: `npx prisma migrate deploy`
   - Setup automated backups
   - Configure connection pooling

3. **Server**
   - Use process manager (PM2)
   - Setup reverse proxy (Nginx)
   - Enable HTTPS
   - Configure logging

4. **Monitoring**
   - Setup error logging
   - Monitor database performance
   - Track API response times

### PM2 Configuration

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name library-api

# Save configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

## 📊 Database Maintenance

### Migrations
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npm run db:reset
```

### Backup
```bash
# Backup database
pg_dump -U postgres library_db > backup.sql

# Restore database
psql -U postgres library_db < backup.sql
```

### Prisma Studio
```bash
# Open database GUI
npm run prisma:studio
```

## 🔧 Troubleshooting

### Common Issues

**Database connection error:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

**Prisma client error:**
```bash
npx prisma generate
```

**Port already in use:**
```bash
# Change PORT in .env or kill process
lsof -ti:5000 | xargs kill -9
```

**Migration errors:**
```bash
# Reset migrations (dev only)
npx prisma migrate reset
```

## 📝 Development Workflow

1. **Feature Development**
   - Create feature branch
   - Update database schema if needed
   - Generate Prisma Client
   - Implement controller logic
   - Create/update routes
   - Test endpoints

2. **Code Style**
   - Use ES6+ features
   - Async/await for promises
   - Error handling with try-catch
   - JSDoc comments for functions
   - Meaningful variable names

3. **Commit Messages**
   - feat: Add new feature
   - fix: Bug fix
   - docs: Documentation
   - refactor: Code refactoring
   - test: Add tests

## 🤝 Contributing

This is a graduation project. For academic purposes only.

## 📄 License

MIT License - For educational purposes

## 👨‍💻 Author

Your Name - Graduation Project 2024

## 📞 Support

For issues or questions:
- Check API documentation
- Review database schema
- Examine audit logs
- Enable debug logging

---

**Happy Coding! 🎓**
