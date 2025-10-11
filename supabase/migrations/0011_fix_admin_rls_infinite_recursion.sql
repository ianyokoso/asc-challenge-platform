-- ============================================
-- 관리자 RLS 무한 루프 수정
-- ============================================

-- ============================================
-- 1. admin_users 테이블 RLS 완전히 비활성화
-- ============================================
-- 관리자 테이블은 SECURITY DEFINER 함수를 통해서만 접근

-- 기존 정책 모두 제거
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;

-- RLS는 활성화 상태 유지 (보안을 위해)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 아무도 직접 접근할 수 없음 (SECURITY DEFINER 함수를 통해서만 접근)
CREATE POLICY "No direct access to admin_users"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (false);

-- ============================================
-- 2. 안전한 관리자 확인 함수 (RLS 우회)
-- ============================================

-- is_admin 함수 재작성 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  is_admin_user BOOLEAN;
BEGIN
  -- check_user_id가 NULL이면 현재 사용자 ID 사용
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  -- admin_users 테이블에서 직접 확인 (RLS 우회)
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = target_user_id 
      AND is_active = true
  ) INTO is_admin_user;
  
  RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- is_super_admin 함수 재작성
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  is_super_admin_user BOOLEAN;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = target_user_id 
      AND is_active = true
      AND role = 'super_admin'
  ) INTO is_super_admin_user;
  
  RETURN is_super_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- has_permission 함수 재작성
CREATE OR REPLACE FUNCTION public.has_permission(
  check_user_id UUID,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id 
      AND is_active = true
      AND required_permission = ANY(permissions)
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. users 테이블 정책 수정 (함수 사용)
-- ============================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- 단순화된 정책 (함수 사용으로 무한 루프 방지)
CREATE POLICY "Users can view profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- 4. user_tracks 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Users can view own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can view all user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can insert user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can update user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can delete user tracks" ON public.user_tracks;

CREATE POLICY "Users can view tracks"
  ON public.user_tracks
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can manage user tracks"
  ON public.user_tracks
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 5. certifications 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Users can view own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can insert own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can update certifications" ON public.certifications;

CREATE POLICY "Users can view certifications"
  ON public.certifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can insert certifications"
  ON public.certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage certifications"
  ON public.certifications
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 6. admin_audit_logs 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Super admins can delete audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can delete audit logs"
  ON public.admin_audit_logs
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ============================================
-- 7. 관리자 목록 조회 함수 (안전한 접근)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  permissions TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  -- 호출자가 관리자인지 확인
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view admin users';
  END IF;

  -- 관리자 목록 반환
  RETURN QUERY
  SELECT 
    a.user_id,
    a.role,
    a.permissions,
    a.is_active,
    a.created_at,
    a.created_by
  FROM public.admin_users a
  WHERE a.is_active = true
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 코멘트
-- ============================================

COMMENT ON FUNCTION public.is_admin IS 'Safely check if user is admin (bypasses RLS)';
COMMENT ON FUNCTION public.is_super_admin IS 'Safely check if user is super admin (bypasses RLS)';
COMMENT ON FUNCTION public.has_permission IS 'Safely check admin permission (bypasses RLS)';
COMMENT ON FUNCTION public.get_admin_users IS 'Get list of admin users (admin only)';

