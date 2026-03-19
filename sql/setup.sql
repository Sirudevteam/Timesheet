-- ============================================
-- BLITZ & GLITZ ATTENDANCE SYSTEM
-- Supabase Database Setup
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    avatar_url TEXT,
    department TEXT DEFAULT 'General',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day')),
    notes TEXT,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    work_hours DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks/Projects table for tagging
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('editing', 'shooting', 'script_writing', 'meeting', 'other')),
    color TEXT DEFAULT '#dc2626',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance tasks junction table
CREATE TABLE IF NOT EXISTS public.attendance_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    hours_spent DECIMAL(4,2) DEFAULT 0,
    UNIQUE(attendance_id, task_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR users TABLE
-- ============================================

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own non-sensitive data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert users
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete users (except themselves)
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        ) AND id != auth.uid()
    );

-- ============================================
-- RLS POLICIES FOR attendance TABLE
-- ============================================

-- Users can read their own attendance
CREATE POLICY "Users can read own attendance" ON public.attendance
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own attendance
CREATE POLICY "Users can insert own attendance" ON public.attendance
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own attendance (only for today)
CREATE POLICY "Users can update own attendance today" ON public.attendance
    FOR UPDATE USING (
        user_id = auth.uid() AND date = CURRENT_DATE
    );

-- Users can delete their own attendance (only for today)
CREATE POLICY "Users can delete own attendance today" ON public.attendance
    FOR DELETE USING (
        user_id = auth.uid() AND date = CURRENT_DATE
    );

-- Admins can read all attendance
CREATE POLICY "Admins can read all attendance" ON public.attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert attendance for anyone
CREATE POLICY "Admins can insert any attendance" ON public.attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any attendance
CREATE POLICY "Admins can update any attendance" ON public.attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete any attendance
CREATE POLICY "Admins can delete any attendance" ON public.attendance
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR activity_logs TABLE
-- ============================================

-- Users can read their own activity logs
CREATE POLICY "Users can read own activity logs" ON public.activity_logs
    FOR SELECT USING (user_id = auth.uid());

-- Admins can read all activity logs
CREATE POLICY "Admins can read all activity logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System can insert activity logs
CREATE POLICY "System can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- RLS POLICIES FOR tasks TABLE
-- ============================================

-- Everyone can read active tasks
CREATE POLICY "Everyone can read active tasks" ON public.tasks
    FOR SELECT USING (is_active = true);

-- Admins can manage tasks
CREATE POLICY "Admins can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR attendance_tasks TABLE
-- ============================================

-- Users can read their own attendance tasks
CREATE POLICY "Users can read own attendance tasks" ON public.attendance_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.attendance 
            WHERE id = attendance_id AND user_id = auth.uid()
        )
    );

-- Users can manage their own attendance tasks
CREATE POLICY "Users can manage own attendance tasks" ON public.attendance_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.attendance 
            WHERE id = attendance_id AND user_id = auth.uid()
        )
    );

-- Admins can manage all attendance tasks
CREATE POLICY "Admins can manage all attendance tasks" ON public.attendance_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for attendance table
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (p_user_id, p_action, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get attendance statistics
CREATE OR REPLACE FUNCTION get_attendance_stats(
    p_start_date DATE,
    p_end_date DATE,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    total_days BIGINT,
    present_days BIGINT,
    absent_days BIGINT,
    late_days BIGINT,
    half_days BIGINT,
    attendance_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        COUNT(a.id) AS total_days,
        COUNT(*) FILTER (WHERE a.status = 'present') AS present_days,
        COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_days,
        COUNT(*) FILTER (WHERE a.status = 'late') AS late_days,
        COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_days,
        ROUND(
            (COUNT(*) FILTER (WHERE a.status IN ('present', 'late')))::DECIMAL 
            / NULLIF(COUNT(a.id), 0) * 100, 
            2
        ) AS attendance_rate
    FROM public.users u
    LEFT JOIN public.attendance a ON u.id = a.user_id 
        AND a.date BETWEEN p_start_date AND p_end_date
    WHERE u.is_active = true
        AND (p_user_id IS NULL OR u.id = p_user_id)
    GROUP BY u.id, u.name
    ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default tasks
INSERT INTO public.tasks (name, category, color) VALUES
    ('Video Editing', 'editing', '#3b82f6'),
    ('Thumbnail Design', 'editing', '#8b5cf6'),
    ('Video Shooting', 'shooting', '#ef4444'),
    ('Photo Shoot', 'shooting', '#f97316'),
    ('Script Writing', 'script_writing', '#10b981'),
    ('Team Meeting', 'meeting', '#6366f1'),
    ('Content Planning', 'other', '#f59e0b'),
    ('Research', 'other', '#06b6d4')
ON CONFLICT DO NOTHING;

-- ============================================
-- REALTIME CONFIGURATION
-- ============================================

-- Enable realtime for attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- ============================================
-- VIEWS
-- ============================================

-- Daily attendance summary view
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    date,
    COUNT(*) FILTER (WHERE status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE status = 'late') AS late_count,
    COUNT(*) FILTER (WHERE status = 'half_day') AS half_day_count,
    COUNT(*) AS total_count
FROM public.attendance
GROUP BY date
ORDER BY date DESC;

-- Monthly attendance view
CREATE OR REPLACE VIEW monthly_attendance_summary AS
SELECT 
    DATE_TRUNC('month', date) AS month,
    user_id,
    COUNT(*) FILTER (WHERE status = 'present') AS present_days,
    COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
    COUNT(*) FILTER (WHERE status = 'late') AS late_days,
    COUNT(*) FILTER (WHERE status = 'half_day') AS half_day_days,
    COUNT(*) AS total_days
FROM public.attendance
GROUP BY DATE_TRUNC('month', date), user_id;
