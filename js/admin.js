/**
 * ============================================
 * BLITZ & GLITZ ATTENDANCE SYSTEM
 * Admin Module
 * ============================================
 */

// Admin state
let allUsers = [];
let allAttendance = [];
let teamStats = null;

/**
 * Get all users (admin only)
 */
async function getAllUsers() {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return [];
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allUsers = data || [];
        return allUsers;
    } catch (error) {
        console.error('Error fetching users:', error);
        showToast(error.message, 'error');
        return [];
    }
}

/**
 * Get user by ID
 * @param {string} userId 
 */
async function getUserById(userId) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) return null;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

/**
 * Create new user (admin only)
 * @param {Object} userData 
 */
async function createUser(userData) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        // First, create auth user using admin API
        // Note: This requires using Supabase Admin API or Edge Functions
        // For now, we'll just add to users table (user must sign up separately)
        
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('User created successfully', 'success');
        await auth.logActivity('user_created', { user_id: data.id, email: data.email });
        
        return { success: true, data };
    } catch (error) {
        console.error('Error creating user:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Update user (admin only)
 * @param {string} userId 
 * @param {Object} updates 
 */
async function updateUser(userId, updates) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('User updated successfully', 'success');
        await auth.logActivity('user_updated', { user_id: userId, updates });
        
        return { success: true, data };
    } catch (error) {
        console.error('Error updating user:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Delete user (admin only)
 * @param {string} userId 
 */
async function deleteUser(userId) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }
    
    // Prevent deleting yourself
    if (userId === auth.getCurrentUser()?.id) {
        return { success: false, error: 'Cannot delete your own account' };
    }
    
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('User deleted successfully', 'success');
        await auth.logActivity('user_deleted', { user_id: userId });
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get all attendance records with filters
 * @param {Object} filters 
 */
async function getAllAttendance(filters = {}) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return [];
    }
    
    try {
        let query = supabase
            .from('attendance')
            .select(`
                *,
                users:user_id (name, email, role, avatar_url)
            `);
        
        // Apply filters
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        
        if (filters.startDate) {
            query = query.gte('date', filters.startDate);
        }
        
        if (filters.endDate) {
            query = query.lte('date', filters.endDate);
        }
        
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        
        const { data, error } = await query
            .order('date', { ascending: false })
            .limit(filters.limit || 100);
        
        if (error) throw error;
        
        allAttendance = data || [];
        return allAttendance;
    } catch (error) {
        console.error('Error fetching attendance:', error);
        showToast(error.message, 'error');
        return [];
    }
}

/**
 * Get team statistics
 * @param {string} startDate 
 * @param {string} endDate 
 */
async function getTeamStats(startDate, endDate) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return null;
    }
    
    try {
        // Get attendance stats
        const { data: stats, error: statsError } = await supabase
            .rpc('get_attendance_stats', {
                p_start_date: startDate,
                p_end_date: endDate,
                p_user_id: null
            });
        
        if (statsError) throw statsError;
        
        // Get daily summary
        const { data: dailySummary, error: dailyError } = await supabase
            .from('daily_attendance_summary')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });
        
        if (dailyError) throw dailyError;
        
        teamStats = {
            userStats: stats,
            dailySummary: dailySummary || []
        };
        
        return teamStats;
    } catch (error) {
        console.error('Error fetching team stats:', error);
        showToast(error.message, 'error');
        return null;
    }
}

/**
 * Get today's team attendance
 */
async function getTodayTeamAttendance() {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                users:user_id (name, email, role, avatar_url)
            `)
            .eq('date', today);
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        return [];
    }
}

/**
 * Export attendance data to CSV
 * @param {Array} data 
 */
function exportToCSV(data) {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    // CSV headers
    const headers = ['Date', 'Name', 'Email', 'Status', 'Check In', 'Check Out', 'Work Hours', 'Notes'];
    
    // CSV rows
    const rows = data.map(record => [
        record.date,
        record.users?.name || '-',
        record.users?.email || '-',
        record.status,
        record.check_in_time ? new Date(record.check_in_time).toLocaleString() : '-',
        record.check_out_time ? new Date(record.check_out_time).toLocaleString() : '-',
        record.work_hours || '-',
        record.notes || '-'
    ]);
    
    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV exported successfully', 'success');
}

/**
 * Get activity logs
 * @param {number} limit 
 */
async function getActivityLogs(limit = 50) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return [];
    }
    
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .select(`
                *,
                users:user_id (name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return [];
    }
}

/**
 * Bulk update attendance status
 * @param {Array} attendanceIds 
 * @param {string} newStatus 
 */
async function bulkUpdateAttendance(attendanceIds, newStatus) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .update({ status: newStatus })
            .in('id', attendanceIds)
            .select();
        
        if (error) throw error;
        
        showToast(`${data.length} records updated`, 'success');
        await auth.logActivity('bulk_attendance_update', { count: data.length, status: newStatus });
        
        return { success: true, data };
    } catch (error) {
        console.error('Error bulk updating attendance:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get dashboard summary data
 */
async function getDashboardSummary() {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return null;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        
        // Get total users count
        const { count: totalUsers, error: userCountError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (userCountError) throw userCountError;
        
        // Get active users count
        const { count: activeUsers, error: activeError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        
        if (activeError) throw activeError;
        
        // Get today's attendance count
        const { count: todayCount, error: todayError } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today);
        
        if (todayError) throw todayError;
        
        // Get this month's attendance count
        const { count: monthCount, error: monthError } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .gte('date', startOfMonth.toISOString().split('T')[0]);
        
        if (monthError) throw monthError;
        
        return {
            totalUsers,
            activeUsers,
            todayAttendance: todayCount,
            monthAttendance: monthCount,
            pendingAttendance: activeUsers - todayCount
        };
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        return null;
    }
}

// Export for use in other modules
window.admin = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getAllAttendance,
    getTeamStats,
    getTodayTeamAttendance,
    exportToCSV,
    getActivityLogs,
    bulkUpdateAttendance,
    getDashboardSummary,
    getAllUsersList: () => allUsers,
    getAllAttendanceList: () => allAttendance,
    getTeamStatsData: () => teamStats
};
