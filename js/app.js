/**
 * ============================================
 * BLITZ & GLITZ ATTENDANCE SYSTEM
 * Main Application Module
 * ============================================
 */

// App initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabase = supabaseClient.init();
    
    if (!supabaseClient.isConfigured()) {
        showConfigModal();
        return;
    }
    
    // Check if we're on the login page
    const isLoginPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');
    
    if (isLoginPage) {
        initLoginPage();
    } else {
        // Protect route and initialize
        const isAuthed = await auth.protectRoute();
        if (isAuthed) {
            initApp();
        }
    }
});

/**
 * Initialize the main application
 */
async function initApp() {
    // Setup UI
    setupSidebar();
    setupHeader();
    
    // Load initial data
    await loadUserInfo();
    
    // Setup realtime
    attendance.setupRealtime(handleAttendanceUpdate);
    
    // Initialize page-specific features
    const page = getCurrentPage();
    
    switch (page) {
        case 'dashboard':
            await initDashboard();
            break;
        case 'admin':
            await initAdminDashboard();
            break;
        case 'history':
            await initHistoryPage();
            break;
        case 'reports':
            await initReportsPage();
            break;
        case 'profile':
            await initProfilePage();
            break;
    }
}

/**
 * Get current page name
 */
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('admin')) return 'admin';
    if (path.includes('history')) return 'history';
    if (path.includes('reports')) return 'reports';
    if (path.includes('profile')) return 'profile';
    if (path.includes('dashboard')) return 'dashboard';
    return 'dashboard';
}

/**
 * Setup sidebar navigation
 */
function setupSidebar() {
    const user = auth.getCurrentUserProfile();
    
    // Build sidebar HTML
    const sidebarHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="brand">
                    <div class="brand-logo">
                        <i class="fas fa-film"></i>
                    </div>
                    <div class="brand-info">
                        <h1>Blitz & Glitz</h1>
                        <span>Attendance System</span>
                    </div>
                </div>
            </div>
            
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Main Menu</div>
                    <a href="dashboard.html" class="nav-item ${getCurrentPage() === 'dashboard' ? 'active' : ''}">
                        <i class="fas fa-home"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="history.html" class="nav-item ${getCurrentPage() === 'history' ? 'active' : ''}">
                        <i class="fas fa-history"></i>
                        <span>My History</span>
                    </a>
                </div>
                
                ${user?.role === 'admin' ? `
                <div class="nav-section">
                    <div class="nav-section-title">Administration</div>
                    <a href="admin.html" class="nav-item ${getCurrentPage() === 'admin' ? 'active' : ''}">
                        <i class="fas fa-users-cog"></i>
                        <span>Team Management</span>
                    </a>
                    <a href="reports.html" class="nav-item ${getCurrentPage() === 'reports' ? 'active' : ''}">
                        <i class="fas fa-chart-bar"></i>
                        <span>Reports</span>
                    </a>
                </div>
                ` : ''}
                
                <div class="nav-section">
                    <div class="nav-section-title">Account</div>
                    <a href="profile.html" class="nav-item ${getCurrentPage() === 'profile' ? 'active' : ''}">
                        <i class="fas fa-user"></i>
                        <span>My Profile</span>
                    </a>
                    <a href="#" class="nav-item" onclick="auth.signOut(); return false;">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Sign Out</span>
                    </a>
                </div>
            </nav>
            
            <div class="sidebar-footer">
                <div class="user-card">
                    <div class="user-avatar" id="sidebarUserAvatar">
                        ${auth.getUserInitials(user?.name)}
                    </div>
                    <div class="user-info">
                        <div class="user-name" id="sidebarUserName">${user?.name || 'User'}</div>
                        <div class="user-role">${user?.role === 'admin' ? 'Administrator' : 'Team Member'}</div>
                    </div>
                </div>
            </div>
        </aside>
        
        <div class="main-content">
            <header class="header">
                <div class="header-left">
                    <button class="menu-toggle" onclick="toggleSidebar()">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="page-title">
                        <h2 id="pageTitle">Dashboard</h2>
                        <p id="pageSubtitle">Welcome back!</p>
                    </div>
                </div>
                <div class="header-right">
                    <button class="header-action" onclick="showNotifications()">
                        <i class="fas fa-bell"></i>
                        <span class="badge" id="notificationBadge" style="display: none;">0</span>
                    </button>
                </div>
            </header>
            
            <main class="content" id="mainContent">
                <!-- Page content will be loaded here -->
            </main>
        </div>
        
        <div class="toast-container" id="toastContainer"></div>
    `;
    
    // Replace body content
    document.body.innerHTML = sidebarHTML;
}

/**
 * Setup header
 */
function setupHeader() {
    const pageTitles = {
        dashboard: { title: 'Dashboard', subtitle: 'Track your attendance' },
        admin: { title: 'Team Management', subtitle: 'Manage your team' },
        history: { title: 'Attendance History', subtitle: 'View your past records' },
        reports: { title: 'Reports & Analytics', subtitle: 'Team performance insights' },
        profile: { title: 'My Profile', subtitle: 'Manage your account' }
    };
    
    const page = getCurrentPage();
    const titles = pageTitles[page] || pageTitles.dashboard;
    
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    
    if (titleEl) titleEl.textContent = titles.title;
    if (subtitleEl) subtitleEl.textContent = titles.subtitle;
}

/**
 * Load user info
 */
async function loadUserInfo() {
    const profile = auth.getCurrentUserProfile();
    
    if (profile) {
        const avatarEl = document.getElementById('sidebarUserAvatar');
        const nameEl = document.getElementById('sidebarUserName');
        
        if (avatarEl) avatarEl.textContent = auth.getUserInitials(profile.name);
        if (nameEl) nameEl.textContent = profile.name;
    }
}

/**
 * Initialize dashboard page
 */
async function initDashboard() {
    const content = document.getElementById('mainContent');
    
    // Get today's attendance
    const todayRecord = await attendance.getToday();
    
    content.innerHTML = `
        <div class="animate-slide-up">
            <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon present">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="presentCount">-</div>
                    <div class="stat-label">Days Present (This Month)</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon absent">
                            <i class="fas fa-times-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="absentCount">-</div>
                    <div class="stat-label">Days Absent (This Month)</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon late">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="lateCount">-</div>
                    <div class="stat-label">Days Late (This Month)</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon total">
                            <i class="fas fa-percentage"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="attendanceRate">-</div>
                    <div class="stat-label">Attendance Rate</div>
                </div>
            </div>
            
            <!-- Mark Attendance Section -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Mark Today's Attendance</h3>
                        <p class="card-subtitle">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div id="todayStatus">
                        ${todayRecord ? `
                            <span class="status-badge ${todayRecord.status}">
                                ${attendance.getStatusLabel(todayRecord.status)}
                            </span>
                        ` : '<span class="status-badge absent">Not Marked</span>'}
                    </div>
                </div>
                <div class="card-body">
                    <div class="attendance-grid" id="attendanceGrid">
                        <label class="attendance-option present ${todayRecord?.status === 'present' ? 'selected' : ''}">
                            <input type="radio" name="attendance" value="present" 
                                ${todayRecord?.status === 'present' ? 'checked' : ''}
                                onchange="handleAttendanceSelect('present')">
                            <div class="attendance-icon">
                                <i class="fas fa-check"></i>
                            </div>
                            <div class="attendance-label">Present</div>
                            <div class="attendance-desc">I'm here and ready</div>
                        </label>
                        
                        <label class="attendance-option absent ${todayRecord?.status === 'absent' ? 'selected' : ''}">
                            <input type="radio" name="attendance" value="absent"
                                ${todayRecord?.status === 'absent' ? 'checked' : ''}
                                onchange="handleAttendanceSelect('absent')">
                            <div class="attendance-icon">
                                <i class="fas fa-times"></i>
                            </div>
                            <div class="attendance-label">Absent</div>
                            <div class="attendance-desc">I won't be available today</div>
                        </label>
                        
                        <label class="attendance-option late ${todayRecord?.status === 'late' ? 'selected' : ''}">
                            <input type="radio" name="attendance" value="late"
                                ${todayRecord?.status === 'late' ? 'checked' : ''}
                                onchange="handleAttendanceSelect('late')">
                            <div class="attendance-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="attendance-label">Late</div>
                            <div class="attendance-desc">I'll be coming in late</div>
                        </label>
                        
                        <label class="attendance-option half_day ${todayRecord?.status === 'half_day' ? 'selected' : ''}">
                            <input type="radio" name="attendance" value="half_day"
                                ${todayRecord?.status === 'half_day' ? 'checked' : ''}
                                onchange="handleAttendanceSelect('half_day')">
                            <div class="attendance-icon">
                                <i class="fas fa-adjust"></i>
                            </div>
                            <div class="attendance-label">Half Day</div>
                            <div class="attendance-desc">Working partial hours</div>
                        </label>
                    </div>
                    
                    <div class="form-group" style="margin-top: var(--space-6);">
                        <label class="form-label">Notes (Optional)</label>
                        <textarea class="form-textarea" id="attendanceNotes" 
                            placeholder="Add any notes about your work today...">${todayRecord?.notes || ''}</textarea>
                    </div>
                    
                    <div class="btn-group" style="margin-top: var(--space-6);">
                        <button class="btn btn-primary btn-lg" onclick="submitAttendance()">
                            <i class="fas fa-save"></i>
                            ${todayRecord ? 'Update Attendance' : 'Mark Attendance'}
                        </button>
                        
                        ${todayRecord && !todayRecord.check_out_time ? `
                            <button class="btn btn-secondary btn-lg" onclick="handleCheckOut()">
                                <i class="fas fa-sign-out-alt"></i>
                                Check Out
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="card" style="margin-top: var(--space-8);">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Recent Activity</h3>
                        <p class="card-subtitle">Your last 5 attendance records</p>
                    </div>
                    <a href="history.html" class="btn btn-ghost">
                        View All <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="data-table" id="recentTable">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody id="recentTableBody">
                                <tr>
                                    <td colspan="5" class="empty-cell">
                                        <div class="loading"></div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load stats
    await loadDashboardStats();
    
    // Load recent activity
    await loadRecentActivity();
}

/**
 * Handle attendance selection
 * @param {string} status 
 */
function handleAttendanceSelect(status) {
    // Update visual selection
    document.querySelectorAll('.attendance-option').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelector(`.attendance-option.${status}`).classList.add('selected');
}

/**
 * Submit attendance
 */
async function submitAttendance() {
    const selectedStatus = document.querySelector('input[name="attendance"]:checked');
    const notes = document.getElementById('attendanceNotes').value;
    
    if (!selectedStatus) {
        showToast('Please select a status', 'warning');
        return;
    }
    
    const result = await attendance.mark(selectedStatus.value, notes);
    
    if (result.success) {
        await loadDashboardStats();
        await loadRecentActivity();
        updateTodayStatus(result.data.status);
    }
}

/**
 * Handle check out
 */
async function handleCheckOut() {
    const result = await attendance.checkOut();
    if (result.success) {
        await loadRecentActivity();
    }
}

/**
 * Update today's status display
 * @param {string} status 
 */
function updateTodayStatus(status) {
    const statusEl = document.getElementById('todayStatus');
    statusEl.innerHTML = `
        <span class="status-badge ${status}">
            ${attendance.getStatusLabel(status)}
        </span>
    `;
}

/**
 * Load dashboard stats
 */
async function loadDashboardStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    
    const stats = await attendance.getStats(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
    );
    
    if (stats && stats.length > 0) {
        const userStats = stats[0];
        
        document.getElementById('presentCount').textContent = userStats.present_days || 0;
        document.getElementById('absentCount').textContent = userStats.absent_days || 0;
        document.getElementById('lateCount').textContent = userStats.late_days || 0;
        document.getElementById('attendanceRate').textContent = (userStats.attendance_rate || 0) + '%';
    }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
    const history = await attendance.getHistory(5);
    const tbody = document.getElementById('recentTableBody');
    
    if (history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-calendar-times"></i>
                        </div>
                        <h4 class="empty-title">No records yet</h4>
                        <p class="empty-description">Start by marking your attendance above</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = history.map(record => `
        <tr>
            <td>${attendance.formatDate(record.date)}</td>
            <td>
                <span class="status-badge ${record.status}">
                    ${attendance.getStatusLabel(record.status)}
                </span>
            </td>
            <td>${attendance.formatTime(record.check_in_time)}</td>
            <td>${attendance.formatTime(record.check_out_time)}</td>
            <td>${record.notes || '-'}</td>
        </tr>
    `).join('');
}

/**
 * Handle realtime attendance updates
 * @param {Object} payload 
 */
function handleAttendanceUpdate(payload) {
    console.log('Realtime update:', payload);
    
    // Refresh data based on current page
    const page = getCurrentPage();
    
    if (page === 'dashboard') {
        loadDashboardStats();
        loadRecentActivity();
    } else if (page === 'admin') {
        loadAdminData();
    }
}

/**
 * Initialize login page
 */
function initLoginPage() {
    // Login page already has its own structure
    // Just ensure form handler is set up
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

/**
 * Handle login form submission
 * @param {Event} e 
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    const result = await auth.signIn(email, password);
    
    if (result.success) {
        auth.redirectBasedOnRole();
    } else {
        showToast(result.error, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

/**
 * Show configuration modal
 */
function showConfigModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'configModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title">Supabase Configuration</h3>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: var(--space-4); color: var(--gray-600);">
                    Please enter your Supabase project credentials to connect to the database.
                </p>
                <div class="form-group">
                    <label class="form-label required">Supabase URL</label>
                    <input type="url" class="form-input" id="supabaseUrl" 
                        placeholder="https://your-project.supabase.co">
                </div>
                <div class="form-group">
                    <label class="form-label required">Anon Key</label>
                    <input type="text" class="form-input" id="supabaseKey" 
                        placeholder="your-anon-key">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveConfig()">
                    <i class="fas fa-save"></i> Save & Continue
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Save configuration
 */
function saveConfig() {
    const url = document.getElementById('supabaseUrl').value;
    const key = document.getElementById('supabaseKey').value;
    
    if (!url || !key) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    
    supabaseClient.setConfig(url, key);
    location.reload();
}

/**
 * Show toast notification
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration 
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Toggle sidebar on mobile
 */
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

/**
 * Show notifications
 */
function showNotifications() {
    showToast('No new notifications', 'info');
}

// Placeholder functions for other pages
async function initAdminDashboard() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="animate-slide-up">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Team Management</h3>
                    <button class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Member
                    </button>
                </div>
                <div class="card-body">
                    <p>Admin dashboard coming soon. Use the SQL setup to configure your team.</p>
                </div>
            </div>
        </div>
    `;
}

async function initHistoryPage() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="animate-slide-up">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Attendance History</h3>
                </div>
                <div class="card-body">
                    <p>Full history view coming soon.</p>
                </div>
            </div>
        </div>
    `;
}

async function initReportsPage() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="animate-slide-up">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Reports & Analytics</h3>
                </div>
                <div class="card-body">
                    <p>Reports coming soon.</p>
                </div>
            </div>
        </div>
    `;
}

async function initProfilePage() {
    const content = document.getElementById('mainContent');
    const profile = auth.getCurrentUserProfile();
    
    content.innerHTML = `
        <div class="animate-slide-up">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">My Profile</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-input" value="${profile?.name || ''}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" value="${profile?.email || ''}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role</label>
                        <input type="text" class="form-input" value="${profile?.role === 'admin' ? 'Administrator' : 'Team Member'}" readonly>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Export for use in HTML
window.submitAttendance = submitAttendance;
window.handleAttendanceSelect = handleAttendanceSelect;
window.handleCheckOut = handleCheckOut;
window.toggleSidebar = toggleSidebar;
window.showNotifications = showNotifications;
window.showToast = showToast;
window.saveConfig = saveConfig;
