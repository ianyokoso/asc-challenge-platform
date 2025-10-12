-- 0014_create_certifications_backup_table.sql
-- 인증 기록 백업 테이블 생성

-- 백업 테이블 생성 (certifications 테이블과 동일한 구조 + 백업 메타데이터)
CREATE TABLE IF NOT EXISTS certifications_backup (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  certification_date DATE NOT NULL,
  submission_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  -- 백업 메타데이터
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  backed_up_by UUID, -- 백업을 수행한 관리자 ID
  backup_reason TEXT, -- 백업 사유 (예: 'bulk_delete_before_2025-01-01')
  original_deleted_at TIMESTAMPTZ -- 원본이 삭제된 시각
);

-- 백업 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_certifications_backup_user_id ON certifications_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_backup_track_id ON certifications_backup(track_id);
CREATE INDEX IF NOT EXISTS idx_certifications_backup_date ON certifications_backup(certification_date);
CREATE INDEX IF NOT EXISTS idx_certifications_backup_backed_up_at ON certifications_backup(backed_up_at);

-- 백업 테이블에 RLS 활성화
ALTER TABLE certifications_backup ENABLE ROW LEVEL SECURITY;

-- 관리자만 백업 테이블 접근 가능
CREATE POLICY "Admin users can view backup certifications"
  ON certifications_backup
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Service Role은 모든 작업 가능 (RLS 우회)

COMMENT ON TABLE certifications_backup IS '삭제된 인증 기록의 백업 테이블. 복구 및 감사 목적으로 사용됩니다.';
COMMENT ON COLUMN certifications_backup.backed_up_at IS '백업이 수행된 시각';
COMMENT ON COLUMN certifications_backup.backed_up_by IS '백업을 수행한 관리자의 user_id';
COMMENT ON COLUMN certifications_backup.backup_reason IS '백업 사유 (예: bulk_delete, individual_delete)';
COMMENT ON COLUMN certifications_backup.original_deleted_at IS '원본 레코드가 삭제된 시각';

