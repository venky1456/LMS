# LMS Backend

Backend API server for the Learning Management System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

3. Start server:
```bash
npm run dev
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run create-admin` - Create admin user (follow prompts)
- `npm run create-mentor` - Create mentor user (follow prompts)

## Creating Users

### Admin User
```bash
npm run create-admin email password "Name"
# Example: npm run create-admin admin@lms.com admin123 "Admin User"
```

### Mentor User
```bash
npm run create-mentor email password "Name"
# Example: npm run create-mentor mentor@lms.com mentor123 "Mentor User"
```

Note: Mentor accounts require admin approval before they can login.
