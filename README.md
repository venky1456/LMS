# Internship Learning Management System (LMS)

A full-stack Learning Management System built with the **MERN** stack (MongoDB, Express, React, Node.js) featuring **Role-Based Access Control (RBAC)** for three roles:

- **Student** – consumes learning content
- **Mentor** – creates/manages courses and tracks student progress
- **Admin** – approves mentors and manages the platform

This README is an end-to-end guide covering **architecture, setup, and usage** for all roles.

---

## 1. Architecture Overview

### 1.1 Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT, PDFKit
- **Frontend**: React 18, React Router v6, Axios, Vite
- **Auth & Security**:
  - JWT-based authentication
  - Password hashing with bcrypt
  - RBAC middleware on API routes
  - Protected routes on the frontend

### 1.2 High-Level Flow

- Users authenticate via the backend (`/api/auth`).
- The frontend stores the JWT in `localStorage` and attaches it to all requests.
- Based on the user role (`student | mentor | admin`), the UI and accessible routes differ.
- Mentors create courses and chapters; courses are assigned to students.
- Students complete chapters **sequentially**; progress is tracked and certificates unlock at 100% completion.

### 1.3 Project Structure

```bash
OLP/
├── backend/                    # Node.js/Express API
│   ├── config/                 # Database configuration
│   ├── middleware/             # Auth & RBAC middleware
│   ├── models/                 # Mongoose models
│   ├── routes/                 # Route handlers
│   ├── scripts/                # Utility scripts (create users)
│   ├── utils/                  # Helper functions
│   ├── package.json
│   └── server.js
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── components/         # Navbar, ProtectedRoute, ChapterViewer, etc.
│   │   ├── context/            # AuthContext
│   │   ├── pages/              # Role-specific pages
│   │   ├── App.jsx             # Routes
│   │   ├── main.jsx            # React entry
│   │   └── index.css           # Global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── PROJECT_SUMMARY.md          # Detailed technical summary
└── README.md                   # This file
```

---

## 2. Backend – Setup & Configuration

### 2.1 Prerequisites

- **Node.js**: v16+ recommended
- **npm**: v8+ (comes with Node)
- **MongoDB**: local instance or MongoDB Atlas

### 2.2 Install Dependencies

From the project root (`OLP/`):

```bash
cd backend
npm install
```

### 2.3 Environment Variables

Create a `.env` file in `backend/` (you can copy from `.env.example` if present):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

> **Note**: `MONGODB_URI` can point to a local instance or a MongoDB Atlas cluster.

### 2.4 Database Connection

The backend connects to MongoDB in `server.js` using `MONGODB_URI`. Ensure MongoDB is running **before** starting the backend.

### 2.5 Creating Users via Scripts

The backend provides scripts to bootstrap **admin** and **mentor** users.

From `backend/`:

#### Create Admin User

```bash
npm run create-admin email password "Name"
# Example:
npm run create-admin admin@lms.com admin123 "Admin User"
```

#### Create Mentor User (optional shortcut)

```bash
npm run create-mentor email password "Name"
# Example:
npm run create-mentor mentor@lms.com mentor123 "Mentor User"
```

> Mentors created via script still require **admin approval** before they can log in.

### 2.6 Running the Backend

From `backend/`:

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

By default the API will be available at:

```text
http://localhost:5000
```

---

## 3. Frontend – Setup & Configuration

### 3.1 Prerequisites

- Same Node.js / npm as backend

### 3.2 Install Dependencies

From the project root (`OLP/`):

```bash
cd frontend
npm install
```

### 3.3 Running the Frontend (Vite)

From `frontend/`:

```bash
npm run dev
```

By default Vite runs on something like:

```text
http://localhost:5173
```

### 3.4 Frontend–Backend Integration

- Axios calls are made with **relative paths** (e.g. `/api/auth/login`).
- Typically, you will run frontend and backend on the **same host** and configure a dev proxy if needed.

If running them on different ports in development, configure a proxy in `vite.config.js` (already present if you set it up previously) so that calls to `/api` are forwarded to `http://localhost:5000`.

---

## 4. Authentication & RBAC (End-to-End)

### 4.1 User Roles

- **student** (default role on `/api/auth/register`)
- **mentor** (via `/api/auth/register-mentor` or script, requires approval)
- **admin** (created via script only)

### 4.2 Flow

1. User logs in via `/api/auth/login`.
2. On success, backend returns a **JWT** and user details (id, name, email, role, isApproved).
3. Frontend `AuthContext` stores the token in `localStorage` and sets `axios.defaults.Authorization`.
4. `protect` middleware on backend and `ProtectedRoute` on frontend enforce access:
   - Students can only access **student** routes.
   - Mentors only access mentor endpoints and pages.
   - Admins have full access.

### 4.3 Mentor Approval

- New mentors start with `isApproved = false`.
- Backend checks `isApproved` in both **login** and **protected routes**.
- Admin approves mentors via Admin Panel (Users → Approve Mentor).

---

## 5. Feature Walkthrough by Role

### 5.1 Student Flow

1. **Registration & Login**
   - Register via the frontend `Register` page.
   - Login using the `Login` page.

2. **Student Dashboard (`/student/dashboard`)**
   - Shows **My Assigned Courses**.
   - Each course card displays:
     - Course name & description
     - Mentor name
     - Status: **In Progress** / **Completed**
     - Overall progress bar (% + completed / total chapters)
     - **View Course** button
     - **Download Certificate** button (enabled only at 100% completion)
   - If **no courses** are assigned:
     - A clear message explains that enrollment is controlled by mentor/admin.
     - A **Contact Mentor / Admin** section displays admin contact details (name & email) so students can request course assignment (purely informational; no self-enrollment).

3. **Course Viewer (`/course/:courseId`)**
   - Top card shows course title, description, and overall progress bar.
   - Layout is split:
     - **Left**: Chapters list
     - **Right**: Active chapter content
   - Chapters list:
     - Uses badges and styles to indicate:
       - **✓ Completed** chapters
       - **▶ Current** active chapter
       - **🔒 Locked** upcoming chapters (cannot be opened until previous are complete)
   - Backend enforces **sequential completion**; UI only visualizes this.

4. **Chapter Content (ChapterViewer)**
   - Sections:
     - **Chapter Image** (if provided)
     - **Chapter Description**
     - **Video Content** (YouTube/Vimeo embed or external link using existing `videoLink`)
   - Button: **“Mark this chapter as complete”**
     - Calls existing `/api/progress/:chapterId/complete` endpoint.
     - On success, the next chapter unlocks; progress is updated.

5. **Certificates**
   - Endpoint: `GET /api/certificates/:courseId`.
   - Button is disabled until overall course completion == 100%.
   - On click, the PDF is downloaded in the browser.

---

### 5.2 Mentor Flow

1. **Registration & Approval**
   - Mentors register via the **Mentor Register** page.
   - They remain in **pending** state until an admin approves them.
   - Pending mentors cannot log in (enforced by backend + middleware).

2. **Mentor Dashboard (`/mentor/dashboard`)**

   The Mentor Dashboard has been redesigned for clarity but uses the **same APIs**:

   - **Sidebar Navigation** (role-focused, not admin-like):
     - Dashboard
     - My Courses
     - Create Course
     - Student Progress

   - **Dashboard Tab**:
     - Welcome message with mentor name.
     - Approval badge: **Approved Mentor** / **Pending Approval**.
     - Overview cards:
       - Total courses created
       - Total unique students assigned
     - Quick action buttons:
       - Create New Course (goes to Create Course tab)
       - View My Courses

   - **Create Course Tab** (step-based UI, same backend logic):
     - **Step 1 – Course Details**:
       - Title, description, optional UI-only category
       - Submits to existing `POST /api/courses` endpoint.
     - **Step 2 – Chapters**:
       - Button to open existing **Chapter Management** page:
         - `GET /api/courses/:courseId/chapters`
         - `POST /api/courses/:courseId/chapters`
         - `DELETE /api/chapters/:id`
     - **Step 3 – Review**:
       - Read-only summary using the course data
       - Navigation back to My Courses.

   - **My Courses Tab**:
     - Table of courses created by the mentor (via `GET /api/courses/my`).
     - Each row includes:
       - Course title & description
       - Assigned student count
       - Status (Active / Inactive via `isActive`)
       - Actions:
         - **Chapters** – opens ChapterManagement
         - **Progress** – opens MentorCourseProgress
         - **Assign** – opens in-card assignment UI
         - **Delete** – existing delete logic (`DELETE /api/courses/:id`)

   - **Assign Students** (within My Courses):
     - Uses `/api/users/students` and `POST /api/courses/:id/assign`.
     - Students are listed with checkboxes; submitting assigns them to the course.

   - **Student Progress Tab**:
     - Lists courses and provides a button to open detailed progress per course
       (existing `MentorCourseProgress` page using `/api/progress/course/:courseId/students`).

3. **Chapter Management (`/course/:courseId/manage`)**
   - Mentors can:
     - Create chapters with title, description, image, `videoLink`, and `sequenceOrder`.
     - Delete chapters.
   - Sequence order enforces the learning path; API ensures sequential constraints for students.

4. **Mentor Course Progress (`/mentor/course/:courseId/progress`)**
   - Shows each student assigned to the course and their completion percentage.

---

### 5.3 Admin Flow

1. **Login** with admin credentials created via the backend script.

2. **Admin Panel (`/admin/panel`)**

   - **Mentor Approval**:
     - View all mentors.
     - Approve / reject mentors.
   - **User Management**:
     - View all users (students, mentors, admins).
     - Delete non-admin users.
   - **Analytics Overview**:
     - Total users / students / mentors / courses / completions (via `/api/analytics/summary`).

> Note: The Admin UI was extended to include richer management tables but **backend logic and security remain unchanged**.

---

## 6. API Overview (Quick Reference)

### 6.1 Authentication

- `POST /api/auth/register` – Register student
- `POST /api/auth/register-mentor` – Register mentor (requires approval)
- `POST /api/auth/login` – Login (all roles)
- `GET /api/auth/me` – Get current user

### 6.2 Users (Admin)

- `GET /api/users` – Get all users
- `GET /api/users/students` – Get all students (mentor/admin)
- `PUT /api/users/:id/approve-mentor` – Approve / reject mentor
- `PUT /api/users/:id` – Update user (admin)
- `PUT /api/users/:id/activate` – Activate / deactivate user
- `DELETE /api/users/:id` – Delete user (non-admin)

### 6.3 Courses

- `POST /api/courses` – Create course (mentor)
- `GET /api/courses/my` – Get courses for current user (mentor/student/admin)
- `GET /api/courses/:id` – Get course details
- `PUT /api/courses/:id` – Update course (mentor)
- `DELETE /api/courses/:id` – Delete course (mentor/admin)
- `POST /api/courses/:id/assign` – Assign course to students (mentor/admin)

### 6.4 Chapters

- `POST /api/courses/:courseId/chapters` – Create chapter (mentor)
- `GET /api/courses/:courseId/chapters` – Get chapters for course
- `GET /api/chapters/:id` – Get chapter by ID
- `PUT /api/chapters/:id` – Update chapter
- `DELETE /api/chapters/:id` – Delete chapter

### 6.5 Progress

- `POST /api/progress/:chapterId/complete` – Mark chapter complete (student)
- `GET /api/progress/my` – Get student progress across courses
- `GET /api/progress/course/:courseId` – Get progress for one course (student/mentor/admin)
- `GET /api/progress/course/:courseId/students` – Get all students&apos; progress for a course (mentor/admin)

### 6.6 Certificates

- `GET /api/certificates/:courseId` – Download certificate PDF (student)
- `GET /api/certificates/verify/:certificateNumber` – Verify certificate

---

## 7. Development & Testing Tips

- **Sequential logic** is enforced in `progress` routes; do not bypass these endpoints when testing.
- Use different browsers or private windows to simulate **student**, **mentor**, and **admin** sessions.
- Confirm mentor approval flow:
  1. Register mentor.
  2. Attempt login → should fail with pending approval message.
  3. Approve via Admin panel.
  4. Login again → should succeed.

---

## 8. Deployment Notes

### 8.1 Backend Deployment (e.g., Render / Railway / Heroku)

1. Push `backend/` code to a separate service or repo if needed.
2. Configure environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, etc.).
3. Set the start command to `npm start`.
4. Ensure MongoDB is accessible from your hosting provider.

### 8.2 Frontend Deployment (e.g., Netlify / Vercel)

1. From `frontend/`, build the app:

   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder.
3. Configure environment or proxy so the frontend calls the correct backend URL (e.g., `https://your-backend.com/api`).

---

## 9. License & Purpose

This project was created for **educational and internship** purposes.

- You may reuse and extend it for learning.
- For production use, harden security (rate limiting, logging, monitoring, backups, etc.).

---

