-- ============================================
-- 관리자 RLS 무한 재귀 최종 수정
-- ============================================

-- ============================================
-- 1. admin_users 테이블의 모든 정책 제거
-- ============================================
DROP POLICY IF EXISTS "No direct access to admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;

-- RLS 완전히 비활성화 (SECURITY DEFINER 함수만 사용)
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. is_admin 함수 재작성 (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- check_user_id가 NULL이면 현재 사용자 ID 사용
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  -- NULL 체크
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- admin_users 테이블에서 직접 확인 (RLS 없음)
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users
    WHERE user_id = target_user_id 
      AND is_active = true
  ) INTO admin_exists;
  
  RETURN COALESCE(admin_exists, FALSE);
END;
$$;

-- ============================================
-- 3. is_super_admin 함수 재작성
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  super_admin_exists BOOLEAN;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users
    WHERE user_id = target_user_id 
      AND is_active = true
      AND role = 'super_admin'
  ) INTO super_admin_exists;
  
  RETURN COALESCE(super_admin_exists, FALSE);
END;
$$;

-- ============================================
-- 4. has_permission 함수 재작성
-- ============================================
CREATE OR REPLACE FUNCTION public.has_permission(
  check_user_id UUID,
  required_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  IF check_user_id IS NULL OR required_permission IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users
    WHERE user_id = check_user_id 
      AND is_active = true
      AND required_permission = ANY(permissions)
  ) INTO has_perm;
  
  RETURN COALESCE(has_perm, FALSE);
END;
$$;

-- ============================================
-- 5. certifications 테이블 정책 수정
-- ============================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can view certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can insert certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can update certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can delete certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can manage certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can view own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can insert own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can update certifications" ON public.certifications;

-- RLS 활성화
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- 새로운 정책 생성
CREATE POLICY "Users can view own certifications"
  ON public.certifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all certifications"
  ON public.certifications
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own certifications"
  ON public.certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert certifications"
  ON public.certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own certifications"
  ON public.certifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update certifications"
  ON public.certifications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own certifications"
  ON public.certifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete certifications"
  ON public.certifications
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- 6. user_tracks 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Users can view tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can manage user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can view own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can view all user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can insert user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can update user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can delete user tracks" ON public.user_tracks;

ALTER TABLE public.user_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracks"
  ON public.user_tracks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tracks"
  ON public.user_tracks
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert tracks"
  ON public.user_tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update tracks"
  ON public.user_tracks
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tracks"
  ON public.user_tracks
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- 7. users 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 8. 코멘트 추가
-- ============================================

COMMENT ON FUNCTION public.is_admin IS 'Check if user is admin (SECURITY DEFINER, bypasses RLS)';
COMMENT ON FUNCTION public.is_super_admin IS 'Check if user is super admin (SECURITY DEFINER, bypasses RLS)';
COMMENT ON FUNCTION public.has_permission IS 'Check if user has specific permission (SECURITY DEFINER, bypasses RLS)';


