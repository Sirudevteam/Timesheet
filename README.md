# 🎬 Blitz & Glitz Attendance System

A professional, real-time attendance tracking system built for the Blitz & Glitz YouTube team. Features a stunning UI/UX design with the iconic Blitz & Glitz branding throughout.

![Blitz & Glitz Logo](assets/logo.svg)

## ✨ Features

### 🔐 Authentication
- Secure email/password login with Supabase Auth
- Role-based access control (Admin/Member)
- JWT token-based authentication
- Password reset functionality

### 📅 Attendance Management
- Mark attendance with status: Present, Absent, Late, Half Day
- Add optional notes for each attendance entry
- Check-in/Check-out with automatic work hours calculation
- Real-time updates using Supabase Realtime

### 📊 Dashboard & Analytics
- Beautiful statistics cards showing attendance metrics
- Monthly performance summaries
- Attendance rate calculations
- Visual status indicators

### 👥 Admin Features
- Team member management
- View all attendance records
- Filter and search functionality
- Export data to CSV
- Bulk operations

### 📱 Responsive Design
- Fully responsive layout
- Mobile-friendly sidebar navigation
- Touch-optimized interactions
- Professional animations and transitions

## 🚀 Quick Start

### Prerequisites
1. [Supabase](https://supabase.com) account
2. Web server (or use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension)

### Setup Instructions

#### 1. Create Supabase Project
```bash
# Go to https://app.supabase.com and create a new project
# Note down your Project URL and Anon Key
```

#### 2. Run Database Setup
1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `sql/setup.sql`
3. Run the SQL to create tables, indexes, RLS policies, and functions

#### 3. Configure the Application
1. Open `index.html` in your browser
2. Click "Configure Database" button
3. Enter your Supabase URL and Anon Key
4. Save and continue

#### 4. Create First Admin User
```sql
-- After signing up through the app, run this SQL to make a user admin:
UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 🗂️ Project Structure

```
blitzandglitz-attendance/
├── assets/
│   ├── logo.svg          # Blitz & Glitz logo (used as watermark)
│   └── favicon.svg       # App favicon
├── css/
│   └── style.css         # Professional UI styles
├── js/
│   ├── supabaseClient.js # Supabase configuration
│   ├── auth.js           # Authentication logic
│   ├── attendance.js     # Attendance operations
│   ├── admin.js          # Admin functionality
│   └── app.js            # Main application logic
├── sql/
│   └── setup.sql         # Database schema & RLS policies
├── index.html            # Login page
├── dashboard.html        # User dashboard
├── admin.html            # Admin dashboard
├── history.html          # Attendance history
├── reports.html          # Reports & analytics
├── profile.html          # User profile
└── README.md             # This file
```

## 🎨 Design Features

### Visual Identity
- **Primary Color**: Blitz & Glitz red (#dc2626)
- **Logo**: Film reel icon integrated throughout UI
- **Watermark**: Subtle logo watermark on all pages
- **Typography**: Inter font family for professional look

### UI Components
- Glass-morphism effects
- Smooth animations and transitions
- Status badges with color coding
- Responsive data tables
- Interactive attendance cards
- Toast notifications

### Responsive Breakpoints
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

## 🔒 Security Features

### Row Level Security (RLS)
- Users can only view/edit their own attendance
- Admins have full access to all records
- Secure data isolation at database level

### Authentication
- JWT-based session management
- Automatic token refresh
- Secure password handling

### Data Protection
- All database operations use parameterized queries
- Input sanitization on all forms
- XSS protection through content escaping

## 📡 Realtime Features

The system uses Supabase Realtime for instant updates:
```javascript
supabase
  .channel('attendance')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, callback)
  .subscribe();
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Styling | Custom CSS with CSS Variables |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts (Inter) |

## 📝 Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, references auth.users |
| name | text | User's full name |
| email | text | User's email address |
| role | text | 'admin' or 'member' |
| avatar_url | text | Profile image URL |
| created_at | timestamp | Account creation date |

### attendance
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to users |
| date | date | Attendance date |
| status | text | present/absent/late/half_day |
| notes | text | Optional notes |
| check_in_time | timestamp | When marked |
| check_out_time | timestamp | When checked out |
| work_hours | decimal | Calculated hours |

## 🚧 Future Enhancements

- [ ] Geo-location attendance
- [ ] Selfie verification
- [ ] Task tagging (Editing, Shooting, Script Writing)
- [ ] Productivity scoring
- [ ] AI insights and trends
- [ ] Mobile app (PWA)
- [ ] Push notifications
- [ ] Dark mode

## 🤝 Contributing

This is a custom-built system for the Blitz & Glitz team. For feature requests or bug reports, please contact the development team.

## 📄 License

Private - Blitz & Glitz Digital Camera Conversations

---

<p align="center">
  <img src="assets/logo.svg" width="80" alt="Blitz & Glitz Logo">
  <br>
  <strong>Blitz & Glitz</strong>
  <br>
  <em>Digital Camera Conversations</em>
</p>
