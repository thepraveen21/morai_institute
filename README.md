# Morai Institute OS — Backend API

A RESTful backend API for managing tuition institutes in Sri Lanka.
Built with Node.js, Express, TypeScript, and PostgreSQL (Supabase).

## Tech Stack
- Node.js + Express.js + TypeScript
- PostgreSQL via Supabase
- JWT Authentication
- Zod Validation
- Twilio SMS
- Helmet + Rate Limiting

## Getting Started

### 1. Clone the repository
git clone https://github.com/thepraveen21/morai_institute.git 
cd morai-institute

### 2. Install dependencies
npm install

### 3. Set up environment variables
cp .env.example .env
Fill in your values in .env

### 4. Run the server
npm run dev

## API Endpoints

### Auth
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

### Institutes
POST   /api/institutes
GET    /api/institutes
GET    /api/institutes/:id
PUT    /api/institutes/:id
DELETE /api/institutes/:id

### Classes
POST   /api/classes
GET    /api/classes
GET    /api/classes/:id
PUT    /api/classes/:id
DELETE /api/classes/:id

### Students
POST   /api/students
GET    /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
POST   /api/students/enroll
DELETE /api/students/unenroll

### Fees
POST   /api/fees
GET    /api/fees
GET    /api/fees/:id
PATCH  /api/fees/:id/status
PATCH  /api/fees/:id/proof
GET    /api/fees/:id/receipt
GET    /api/fees/unpaid

### Attendance
POST   /api/attendance/session
GET    /api/attendance/session
GET    /api/attendance/session/:id
POST   /api/attendance/scan
POST   /api/attendance/manual
GET    /api/attendance/session/:id/absent
GET    /api/attendance/summary/:student_id

### Announcements & SMS
POST   /api/announcements
GET    /api/announcements
GET    /api/announcements/:id
PUT    /api/announcements/:id
DELETE /api/announcements/:id
POST   /api/announcements/sms/fee-reminders
POST   /api/announcements/sms/custom

### Reports
GET    /api/reports/dashboard
GET    /api/reports/unpaid-fees
GET    /api/reports/fee-summary
GET    /api/reports/attendance
GET    /api/reports/chronic-absentees
GET    /api/reports/student/:student_id

### Teacher Portal
GET    /api/teacher/dashboard
GET    /api/teacher/classes
GET    /api/teacher/classes/:id
GET    /api/teacher/classes/:id/attendance
GET    /api/teacher/classes/:id/sessions

### Parent/Student Portal
GET    /api/portal/dashboard
GET    /api/portal/fees
GET    /api/portal/attendance
GET    /api/portal/announcements
POST   /api/portal/fees/proof
GET    /api/portal/fees/:fee_id/receipt