-- 0015_create_page_contents_table.sql
-- 페이지 콘텐츠 관리 테이블 생성

-- 페이지 콘텐츠 테이블
CREATE TABLE IF NOT EXISTS page_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL, -- 페이지 경로 (예: '/admin/tracking', '/admin/certifications')
  content_key TEXT NOT NULL, -- 콘텐츠 고유 키 (예: 'page-title', 'warning-message')
  content_type TEXT NOT NULL DEFAULT 'text', -- 콘텐츠 타입 (text, html, markdown)
  content_value TEXT NOT NULL, -- 실제 콘텐츠 값
  description TEXT, -- 콘텐츠 설명
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES public.users(id), -- 마지막 수정자
  
  -- 페이지별 콘텐츠 키는 고유해야 함
  UNIQUE(page_path, content_key)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_page_contents_page_path ON page_contents(page_path);
CREATE INDEX IF NOT EXISTS idx_page_contents_content_key ON page_contents(content_key);

-- Enable Row Level Security
ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 모든 사용자가 읽을 수 있음
CREATE POLICY "Anyone can read page contents"
  ON page_contents
  FOR SELECT
  USING (true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can update page contents"
  ON page_contents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
      AND admin_users.is_active = true
    )
  );

-- 관리자만 삽입 가능
CREATE POLICY "Admins can insert page contents"
  ON page_contents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
      AND admin_users.is_active = true
    )
  );

-- updated_at 트리거
CREATE TRIGGER update_page_contents_updated_at
  BEFORE UPDATE ON page_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 기본 콘텐츠 삽입 (예시)
INSERT INTO page_contents (page_path, content_key, content_type, content_value, description) VALUES
  ('/admin/tracking', 'page-title', 'text', '인증 현황', '페이지 제목'),
  ('/admin/tracking', 'page-description', 'text', '챌린지 참여자들의 인증 현황을 추적하고 관리합니다.', '페이지 설명'),
  ('/admin/certifications', 'page-title', 'text', '인증 기록 관리', '페이지 제목'),
  ('/admin/certifications', 'page-description', 'text', '인증 기록을 삭제하고 초기화할 수 있습니다. 모든 삭제는 자동으로 백업됩니다.', '페이지 설명'),
  ('/admin/certifications', 'warning-title', 'text', '주의사항', '경고 제목'),
  ('/admin/certifications', 'bulk-delete-title', 'text', '기준 날짜 이전 일괄 삭제', '일괄 삭제 제목'),
  ('/admin/certifications', 'bulk-delete-description', 'text', '지정한 날짜 이전의 모든 인증 기록을 삭제합니다.', '일괄 삭제 설명'),
  ('/admin/certifications', 'reset-title', 'text', '전체 리셋 (인증 삭제 + 참여자 대기 전환)', '전체 리셋 제목'),
  ('/admin/certifications', 'reset-description', 'text', '지정한 날짜 이전의 인증 기록을 삭제하고, 모든 참여자를 대기 상태로 전환합니다.', '전체 리셋 설명'),
  ('/admin/certifications', 'backup-title', 'text', '자동 백업 시스템', '백업 제목')
ON CONFLICT (page_path, content_key) DO NOTHING;

-- 코멘트 추가
COMMENT ON TABLE page_contents IS '페이지별 텍스트 콘텐츠 관리 테이블';
COMMENT ON COLUMN page_contents.page_path IS '페이지 경로';
COMMENT ON COLUMN page_contents.content_key IS '콘텐츠 고유 식별자';
COMMENT ON COLUMN page_contents.content_value IS '실제 표시될 텍스트';

