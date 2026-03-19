/**
 * ============================================
 * BLITZ & GLITZ ATTENDANCE SYSTEM
 * Authentication Module
 * ============================================
 */

// Auth state
let currentUser = null;
let currentUserProfile = null;

/**
 * Initialize authentication
 */
async function initAuth() {
    const supabase = supabaseClient.getClient();
    if (!supabase) {
        showToast('Supabase not configured', 'error');
        return false;
    }
    
    // Check for existing session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Session error:', error);
        return false;
    }
    
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        return true;
    }
    
    return false;
}

/**
 * Load user profile from database
 */
async function loadUserProfile() {
    if (!currentUser) return null;
    
    const supabase = supabaseClient.getClient();
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) {
            // If user doesn't exist in users table, create profile
            if (error.code === 'PGRST116') {
                return await createUserProfile();
            }
            throw error;
        }
        
        currentUserProfile = data;
        return data;
    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
}

/**
 * Create user profile after signup
 */
async function createUserProfile() {
    if (!currentUser) return null;
    
    const supabase = supabaseClient.getClient();
    
    const profile = {
        id: currentUser.id,
        name: currentUser.user_metadata?.name || currentUser.email.split('@')[0],
        email: currentUser.email,
        role: 'member', // Default role
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString()
    };
    
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([profile])
            .select()
            .single();
        
        if (error) throw error;
        
        currentUserProfile = data;
        return data;
    } catch (error) {
        console.error('Error creating user profile:', error);
        return null;
    }
}

/**
 * Sign in with email and password
 * @param {string} email 
 * @param {string} password 
 */
async function signIn(email, password) {
    const supabase = supabaseClient.getClient();
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await loadUserProfile();
        
        // Log activity
        await logActivity('user_login', { email });
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sign up new user
 * @param {string} email 
 * @param {string} password 
 * @param {string} name 
 */
async function signUp(email, password, name) {
    const supabase = supabaseClient.getClient();
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await createUserProfile();
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    const supabase = supabaseClient.getClient();
    if (!supabase) return;
    
    try {
        await logActivity('user_logout');
        
        await supabase.auth.signOut();
        
        currentUser = null;
        currentUserProfile = null;
        
        // Clear any subscriptions
        supabase.removeAllChannels();
        
        // Redirect to login
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

/**
 * Send password reset email
 * @param {string} email 
 */
async function resetPassword(email) {
    const supabase = supabaseClient.getClient();
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user password
 * @param {string} newPassword 
 */
async function updatePassword(newPassword) {
    const supabase = supabaseClient.getClient();
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Check if current user is admin
 * @returns {boolean}
 */
function isAdmin() {
    return currentUserProfile?.role === 'admin';
}

/**
 * Get current user
 * @returns {Object|null}
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Get current user profile
 * @returns {Object|null}
 */
function getCurrentUserProfile() {
    return currentUserProfile;
}

/**
 * Get user initials from name
 * @param {string} name 
 * @returns {string}
 */
function getUserInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Log user activity
 * @param {string} action 
 * @param {Object} details 
 */
async function logActivity(action, details = {}) {
    const supabase = supabaseClient.getClient();
    if (!supabase || !currentUser) return;
    
    try {
        await supabase.rpc('log_activity', {
            p_user_id: currentUser.id,
            p_action: action,
            p_details: details
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

/**
 * Setup auth state change listener
 */
function setupAuthListener() {
    const supabase = supabaseClient.getClient();
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            currentUser = session.user;
            await loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentUserProfile = null;
        }
    });
}

/**
 * Protect route - redirect to login if not authenticated
 * @param {boolean} requireAdmin - Also check for admin role
 */
async function protectRoute(requireAdmin = false) {
    const isAuthed = await initAuth();
    
    if (!isAuthed) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (requireAdmin && !isAdmin()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

/**
 * Redirect based on role
 */
function redirectBasedOnRole() {
    if (isAdmin()) {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Setup auth listener on module load
setupAuthListener();

// Export for use in other modules
window.auth = {
    init: initAuth,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated,
    isAdmin,
    getCurrentUser,
    getCurrentUserProfile,
    getUserInitials,
    logActivity,
    protectRoute,
    redirectBasedOnRole,
    loadUserProfile
};
