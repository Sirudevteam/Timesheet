/**
 * ============================================
 * BLITZ & GLITZ ATTENDANCE SYSTEM
 * Supabase Client Configuration
 * ============================================
 */

// Supabase configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
    // Get these from your Supabase project settings
    url: localStorage.getItem('supabase_url') || 'https://your-project.supabase.co',
    anonKey: localStorage.getItem('supabase_anon_key') || 'your-anon-key-here'
};

// Initialize Supabase client
let supabase = null;

/**
 * Initialize the Supabase client
 * @returns {Object} Supabase client instance
 */
function initSupabase() {
    if (typeof supabaseJs === 'undefined') {
        console.error('Supabase library not loaded');
        return null;
    }
    
    if (!supabase) {
        supabase = supabaseJs.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                },
                realtime: {
                    enabled: true
                }
            }
        );
    }
    
    return supabase;
}

/**
 * Update Supabase configuration
 * @param {string} url - Supabase project URL
 * @param {string} anonKey - Supabase anonymous key
 */
function setSupabaseConfig(url, anonKey) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', anonKey);
    SUPABASE_CONFIG.url = url;
    SUPABASE_CONFIG.anonKey = anonKey;
    
    // Reinitialize client with new config
    supabase = null;
    return initSupabase();
}

/**
 * Get current Supabase configuration
 * @returns {Object} Current configuration
 */
function getSupabaseConfig() {
    return {
        url: SUPABASE_CONFIG.url,
        anonKey: SUPABASE_CONFIG.anonKey.substring(0, 10) + '...' // Mask for security
    };
}

/**
 * Check if Supabase is properly configured
 * @returns {boolean}
 */
function isSupabaseConfigured() {
    return SUPABASE_CONFIG.url.includes('supabase.co') && 
           SUPABASE_CONFIG.anonKey.length > 20;
}

/**
 * Test Supabase connection
 * @returns {Promise<Object>} Connection test result
 */
async function testConnection() {
    try {
        const client = initSupabase();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }
        
        const { data, error } = await client.from('users').select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        return { success: true, message: 'Connection successful' };
    } catch (error) {
        console.error('Supabase connection test failed:', error);
        return { success: false, error: error.message };
    }
}

// Initialize on module load
initSupabase();

// Export for use in other modules
window.supabaseClient = {
    init: initSupabase,
    getClient: () => supabase,
    setConfig: setSupabaseConfig,
    getConfig: getSupabaseConfig,
    isConfigured: isSupabaseConfigured,
    testConnection: testConnection
};
