# API Documentation
## QR Code Based Smart Library Management System

Base URL: `http://localhost:5000/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "role": "USER"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "USER"
    },
    "token": "jwt_token_here"
  }
}
```

### Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "admin@library.local",
  "password": "admin123"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

---

## 2. Book Endpoints

### Get All Books
```http
GET /api/books?page=1&limit=10&search=algorithm&categoryId=uuid&status=AVAILABLE
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "books": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

### Get Book by ID
```http
GET /api/books/:id
Authorization: Bearer {token}
```

### Create Book
```http
POST /api/books
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Introduction to Algorithms",
  "author": "Thomas H. Cormen",
  "isbn": "978-0262033848",
  "categoryId": "uuid",
  "shelfId": "uuid",
  "copiesTotal": 3,
  "description": "Book description",
  "publicationYear": 2009
}
```

**Note:** QR code is automatically generated upon creation.

### Update Book
```http
PUT /api/books/:id
Authorization: Bearer {token}
```

### Delete Book
```http
DELETE /api/books/:id
Authorization: Bearer {token}
```

### Regenerate QR Code
```http
POST /api/books/:id/regenerate-qr
Authorization: Bearer {token}
```

### Get Book Statistics
```http
GET /api/books/stats
Authorization: Bearer {token}
```

---

## 3. QR Code Endpoints

### Scan Book QR Code
```http
POST /api/qr/scan/book
Authorization: Bearer {token}
```

**Body (Option 1 - Direct ID):**
```json
{
  "bookId": "uuid"
}
```

**Body (Option 2 - QR Data):**
```json
{
  "qrData": "{\"type\":\"BOOK\",\"id\":\"uuid\",\"timestamp\":\"2024-01-06T10:00:00Z\"}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Introduction to Algorithms",
    "author": "Thomas H. Cormen",
    "isbn": "978-0262033848",
    "status": "AVAILABLE",
    "copiesAvailable": 2,
    "copiesTotal": 3,
    "category": {...},
    "shelf": {...},
    "isAvailable": true,
    "currentBorrower": null,
    "borrowingHistory": [...]
  }
}
```

### Scan Shelf QR Code
```http
POST /api/qr/scan/shelf
Authorization: Bearer {token}
```

**Body:**
```json
{
  "shelfId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shelf": {
      "id": "uuid",
      "shelfCode": "CS-A-01",
      "location": "Building A, Floor 1",
      "capacity": 100
    },
    "expectedBooks": 25,
    "availableBooks": 20,
    "borrowedBooks": 5,
    "books": [...]
  }
}
```

### Validate QR Code
```http
POST /api/qr/validate
Authorization: Bearer {token}
```

**Body:**
```json
{
  "qrData": "{\"type\":\"BOOK\",\"id\":\"uuid\"}"
}
```

---

## 4. Borrowing Endpoints

### Borrow a Book
```http
POST /api/borrowing/borrow
Authorization: Bearer {token}
```

**Body:**
```json
{
  "bookId": "uuid",
  "userId": "uuid",
  "borrowDays": 14,
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "bookId": "uuid",
    "borrowDate": "2024-01-06T10:00:00Z",
    "expectedReturnDate": "2024-01-20",
    "status": "BORROWED",
    "user": {...},
    "book": {...}
  }
}
```

### Return a Book
```http
POST /api/borrowing/return/:borrowingId
Authorization: Bearer {token}
```

### Get All Borrowings
```http
GET /api/borrowing?page=1&limit=10&status=BORROWED&userId=uuid
Authorization: Bearer {token}
```

### Get User Borrowings
```http
GET /api/borrowing/user/:userId?status=BORROWED
Authorization: Bearer {token}
```

### Get Overdue Borrowings
```http
GET /api/borrowing/overdue
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": {...},
      "book": {...},
      "expectedReturnDate": "2024-01-01",
      "daysOverdue": 5
    }
  ]
}
```

### Extend Borrowing
```http
PUT /api/borrowing/:borrowingId/extend
Authorization: Bearer {token}
```

**Body:**
```json
{
  "additionalDays": 7
}
```

### Get Borrowing Statistics
```http
GET /api/borrowing/stats
Authorization: Bearer {token}
```

---

## 5. Category Endpoints

### Get All Categories
```http
GET /api/categories
Authorization: Bearer {token}
```

### Create Category
```http
POST /api/categories
Authorization: Bearer {token}
```

**Body:**
```json
{
  "name": "Computer Science",
  "description": "Programming and algorithms"
}
```

### Update Category
```http
PUT /api/categories/:id
Authorization: Bearer {token}
```

### Delete Category
```http
DELETE /api/categories/:id
Authorization: Bearer {token}
```

---

## 6. Shelf Endpoints

### Get All Shelves
```http
GET /api/shelves
Authorization: Bearer {token}
```

### Get Shelf by ID
```http
GET /api/shelves/:id
Authorization: Bearer {token}
```

### Create Shelf
```http
POST /api/shelves
Authorization: Bearer {token}
```

**Body:**
```json
{
  "shelfCode": "CS-A-01",
  "location": "Building A, Floor 1, Section A",
  "floor": 1,
  "capacity": 100,
  "description": "Computer Science books"
}
```

**Note:** QR code is automatically generated.

### Update Shelf
```http
PUT /api/shelves/:id
Authorization: Bearer {token}
```

### Delete Shelf
```http
DELETE /api/shelves/:id
Authorization: Bearer {token}
```

---

## 7. User Endpoints

### Get All Users
```http
GET /api/users
Authorization: Bearer {token}
Requires: ADMIN or STAFF role
```

### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer {token}
```

---

## 8. Notification Endpoints

### Get User Notifications
```http
GET /api/notifications
Authorization: Bearer {token}
```

### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer {token}
```

---

## 9. Report Endpoints

### Dashboard Statistics
```http
GET /api/reports/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBooks": 150,
    "totalUsers": 50,
    "activeBorrowings": 25,
    "overdueBooks": 5
  }
}
```

### Most Borrowed Books
```http
GET /api/reports/most-borrowed
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Clean Code",
      "author": "Robert Martin",
      "borrow_count": 25
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes:
- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `ALREADY_BORROWED` - Book already borrowed by user
- `NO_COPIES_AVAILABLE` - No copies available
- `BORROWING_LIMIT_REACHED` - User reached max borrowing limit

---

## Role-Based Access Control

### Roles:
- **ADMIN**: Full system access
- **STAFF**: Can manage books, borrowings, shelves
- **USER**: Can view books, their own borrowings

### Permission Matrix:

| Endpoint | ADMIN | STAFF | USER |
|----------|-------|-------|------|
| View books | ✓ | ✓ | ✓ |
| Create/Edit books | ✓ | ✓ | ✗ |
| Delete books | ✓ | ✗ | ✗ |
| Borrow books | ✓ | ✓ | ✗ |
| View all borrowings | ✓ | ✓ | Own only |
| Manage users | ✓ | View only | ✗ |
| View reports | ✓ | ✓ | Limited |

---

## QR Code Format

### Book QR Code:
```json
{
  "type": "BOOK",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-06T10:30:00Z"
}
```

### Shelf QR Code:
```json
{
  "type": "SHELF",
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "code": "CS-A-01",
  "timestamp": "2024-01-06T10:30:00Z"
}
```

---

## Testing with cURL

### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@library.local","password":"admin123"}'
```

### Get Books:
```bash
curl http://localhost:5000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Scan Book:
```bash
curl -X POST http://localhost:5000/api/qr/scan/book \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"BOOK_UUID"}'
```
