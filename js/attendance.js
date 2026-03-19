/**
 * ============================================
 * BLITZ & GLITZ ATTENDANCE SYSTEM
 * Attendance Module
 * ============================================
 */

// Attendance state
let attendanceChannel = null;
let todayAttendance = null;
let attendanceHistory = [];

/**
 * Mark attendance for today
 * @param {string} status - 'present', 'absent', 'late', 'half_day'
 * @param {string} notes - Optional notes
 */
async function markAttendance(status, notes = '') {
    const supabase = supabaseClient.getClient();
    const user = auth.getCurrentUser();
    
    if (!supabase || !user) {
        return { success: false, error: 'Not authenticated' };
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Check if already marked
        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();
        
        const attendanceData = {
            user_id: user.id,
            date: today,
            status,
            notes,
            check_in_time: new Date().toISOString()
        };
        
        let result;
        
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('attendance')
                .update(attendanceData)
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Attendance updated successfully', 'success');
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('attendance')
                .insert([attendanceData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            showToast('Attendance marked successfully', 'success');
        }
        
        todayAttendance = result;
        
        // Log activity
        await auth.logActivity('attendance_marked', { status, date: today });
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Error marking attendance:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Check out (mark end of work day)
 */
async function checkOut() {
    const supabase = supabaseClient.getClient();
    const user = auth.getCurrentUser();
    
    if (!supabase || !user || !todayAttendance) {
        return { success: false, error: 'No attendance record found' };
    }
    
    try {
        const checkOutTime = new Date();
        const checkInTime = new Date(todayAttendance.check_in_time);
        const workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);
        
        const { data, error } = await supabase
            .from('attendance')
            .update({
                check_out_time: checkOutTime.toISOString(),
                work_hours: parseFloat(workHours)
            })
            .eq('id', todayAttendance.id)
            .select()
            .single();
        
        if (error) throw error;
        
        todayAttendance = data;
        showToast(`Checked out! Worked ${workHours} hours`, 'success');
        
        await auth.logActivity('checked_out', { work_hours: workHours });
        
        return { success: true, data };
    } catch (error) {
        console.error('Error checking out:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get today's attendance for current user
 */
async function getTodayAttendance() {
    const supabase = supabaseClient.getClient();
    const user = auth.getCurrentUser();
    
    if (!supabase || !user) return null;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        todayAttendance = data || null;
        return todayAttendance;
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        return null;
    }
}

/**
 * Get attendance history for current user
 * @param {number} limit - Number of records to fetch
 */
async function getAttendanceHistory(limit = 30) {
    const supabase = supabaseClient.getClient();
    const user = auth.getCurrentUser();
    
    if (!supabase || !user) return [];
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        attendanceHistory = data || [];
        return attendanceHistory;
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        return [];
    }
}

/**
 * Get attendance for a specific date range
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {string} userId - Optional user ID (for admin)
 */
async function getAttendanceByDateRange(startDate, endDate, userId = null) {
    const supabase = supabaseClient.getClient();
    const currentUser = auth.getCurrentUser();
    
    if (!supabase || !currentUser) return [];
    
    const targetUserId = userId || currentUser.id;
    
    try {
        let query = supabase
            .from('attendance')
            .select(`
                *,
                users:user_id (name, email, role)
            `)
            .gte('date', startDate)
            .lte('date', endDate);
        
        // If not admin, only see own records
        if (!auth.isAdmin()) {
            query = query.eq('user_id', currentUser.id);
        } else if (userId) {
            query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query.order('date', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching attendance by date range:', error);
        return [];
    }
}

/**
 * Update attendance record (admin only)
 * @param {string} attendanceId 
 * @param {Object} updates 
 */
async function updateAttendance(attendanceId, updates) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .update(updates)
            .eq('id', attendanceId)
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Attendance updated', 'success');
        await auth.logActivity('attendance_updated', { attendance_id: attendanceId, updates });
        
        return { success: true, data };
    } catch (error) {
        console.error('Error updating attendance:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Delete attendance record (admin only)
 * @param {string} attendanceId 
 */
async function deleteAttendance(attendanceId) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase || !auth.isAdmin()) {
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('id', attendanceId);
        
        if (error) throw error;
        
        showToast('Attendance record deleted', 'success');
        await auth.logActivity('attendance_deleted', { attendance_id: attendanceId });
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get attendance statistics
 * @param {string} startDate 
 * @param {string} endDate 
 * @param {string} userId 
 */
async function getAttendanceStats(startDate, endDate, userId = null) {
    const supabase = supabaseClient.getClient();
    
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .rpc('get_attendance_stats', {
                p_start_date: startDate,
                p_end_date: endDate,
                p_user_id: userId
            });
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        return null;
    }
}

/**
 * Setup realtime subscription for attendance updates
 * @param {Function} callback - Function to call when data changes
 */
function setupRealtimeAttendance(callback) {
    const supabase = supabaseClient.getClient();
    const user = auth.getCurrentUser();
    
    if (!supabase || !user) return;
    
    // Remove existing channel if any
    if (attendanceChannel) {
        supabase.removeChannel(attendanceChannel);
    }
    
    attendanceChannel = supabase
        .channel('attendance_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'attendance'
            },
            (payload) => {
                console.log('Attendance change received:', payload);
                
                // Only notify if relevant to current user or admin
                if (auth.isAdmin() || payload.new.user_id === user.id) {
                    if (callback) callback(payload);
                }
            }
        )
        .subscribe();
}

/**
 * Get status color class
 * @param {string} status 
 */
function getStatusColorClass(status) {
    const colors = {
        present: 'success',
        absent: 'danger',
        late: 'warning',
        half_day: 'info'
    };
    return colors[status] || 'gray';
}

/**
 * Get status label
 * @param {string} status 
 */
function getStatusLabel(status) {
    const labels = {
        present: 'Present',
        absent: 'Absent',
        late: 'Late',
        half_day: 'Half Day'
    };
    return labels[status] || status;
}

/**
 * Format date for display
 * @param {string} dateString 
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time for display
 * @param {string} dateString 
 */
function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export for use in other modules
window.attendance = {
    mark: markAttendance,
    checkOut,
    getToday: getTodayAttendance,
    getHistory: getAttendanceHistory,
    getByDateRange: getAttendanceByDateRange,
    update: updateAttendance,
    delete: deleteAttendance,
    getStats: getAttendanceStats,
    setupRealtime: setupRealtimeAttendance,
    getStatusColorClass,
    getStatusLabel,
    formatDate,
    formatTime,
    getTodayRecord: () => todayAttendance,
    getHistoryRecords: () => attendanceHistory
};
