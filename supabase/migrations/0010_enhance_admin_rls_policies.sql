-- ============================================
-- 관리자 전용 RLS 정책 강화
-- ============================================

-- ============================================
-- 1. admin_users 테이블 RLS 정책 강화
-- ============================================

-- 기존 SELECT 정책 유지 (관리자만 관리자 목록 조회 가능)
-- 이미 0007_create_admin_users_table.sql에서 생성됨

-- INSERT: Super Admin만 새로운 관리자 추가 가능
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
CREATE POLICY "Super admins can insert admin users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- UPDATE: Super Admin만 관리자 정보 수정 가능
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
CREATE POLICY "Super admins can update admin users"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- DELETE: Super Admin만 관리자 삭제 가능 (soft delete 권장)
DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;
CREATE POLICY "Super admins can delete admin users"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- ============================================
-- 2. user_tracks 테이블 관리자 정책
-- ============================================

-- 관리자는 모든 user_tracks 조회 가능
DROP POLICY IF EXISTS "Admins can view all user tracks" ON public.user_tracks;
CREATE POLICY "Admins can view all user tracks"
  ON public.user_tracks
  FOR SELECT
  TO authenticated
  USING (
    -- 자신의 트랙이거나
    user_id = auth.uid()
    OR
    -- 관리자인 경우
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 3. certifications 테이블 관리자 정책
-- ============================================

-- 관리자는 모든 인증 조회 가능
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
CREATE POLICY "Admins can view all certifications"
  ON public.certifications
  FOR SELECT
  TO authenticated
  USING (
    -- 자신의 인증이거나
    user_id = auth.uid()
    OR
    -- 관리자인 경우
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 관리자는 인증 상태 변경 가능 (승인/거부)
DROP POLICY IF EXISTS "Admins can update certifications" ON public.certifications;
CREATE POLICY "Admins can update certifications"
  ON public.certifications
  FOR UPDATE
  TO authenticated
  USING (
    -- 관리자만 인증 상태 변경 가능
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 4. users 테이블 관리자 정책
-- ============================================

-- 관리자는 모든 사용자 조회 가능
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- 자신의 정보이거나
    id = auth.uid()
    OR
    -- 관리자인 경우
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 관리자는 사용자 정보 수정 가능 (is_active 등)
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    -- 관리자만 사용자 정보 수정 가능
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 5. 보안 강화 함수
-- ============================================

-- 관리자 권한 레벨 확인 함수
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id 
      AND is_active = true
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 권한 보유 확인 함수
CREATE OR REPLACE FUNCTION public.has_admin_permission(
  check_user_id UUID,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id 
      AND is_active = true
      AND required_permission = ANY(permissions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 감사 로그 테이블 (선택사항)
-- ============================================

-- 관리자 작업 로그 테이블
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject'
  target_table TEXT NOT NULL,
  target_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id 
  ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action 
  ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at 
  ON public.admin_audit_logs(created_at DESC);

-- RLS 활성화
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 감사 로그 조회 가능
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Super Admin만 감사 로그 삭제 가능
CREATE POLICY "Super admins can delete audit logs"
  ON public.admin_audit_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND role = 'super_admin'
    )
  );

-- 관리자 작업 로그 기록 함수
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_table TEXT,
  p_target_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_table,
    target_id,
    changes
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_table,
    p_target_id,
    p_changes
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 코멘트 추가
-- ============================================

COMMENT ON FUNCTION public.is_super_admin IS 'Check if user is a super admin';
COMMENT ON FUNCTION public.has_admin_permission IS 'Check if admin user has specific permission';
COMMENT ON FUNCTION public.log_admin_action IS 'Log admin actions for audit trail';
COMMENT ON TABLE public.admin_audit_logs IS 'Audit log for all admin actions';

