-- =====================================================
-- 인증 데이터 동기화 최적화 마이그레이션
-- 목적: 단일 쓰기 경로 + 즉시 반영 + 중복 방지
-- =====================================================

-- 1) certification_url을 nullable로 변경 (빌더/세일즈 트랙 대응)
ALTER TABLE public.certifications 
ALTER COLUMN certification_url DROP NOT NULL;

COMMENT ON COLUMN public.certifications.certification_url IS 
'Certification URL - Optional for builder and sales tracks which use task content field instead';

-- 2) 유니크 제약: user × track × period = 1행 (중복 방지)
-- 기존 중복 데이터가 있을 경우를 대비해 DO $$ 블록 사용
DO $$ 
BEGIN
  -- 기존 제약이 있으면 스킵
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uniq_user_track_period'
  ) THEN
    ALTER TABLE public.certifications
      ADD CONSTRAINT uniq_user_track_period 
      UNIQUE (user_id, track_id, period_id);
  END IF;
END $$;

-- 3) 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_certifications_period 
ON public.certifications (period_id);

CREATE INDEX IF NOT EXISTS idx_certifications_user 
ON public.certifications (user_id);

CREATE INDEX IF NOT EXISTS idx_certifications_track 
ON public.certifications (track_id);

CREATE INDEX IF NOT EXISTS idx_certifications_status 
ON public.certifications (status);

-- 4) 멱등성 키 컬럼 추가
ALTER TABLE public.certifications
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS idx_certifications_idem 
ON public.certifications (idempotency_key);

COMMENT ON COLUMN public.certifications.idempotency_key IS 
'Idempotency key to prevent duplicate submissions from client retries';

-- 5) certified_at 타임스탬프 (submitted_at과 별도)
ALTER TABLE public.certifications
ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.certifications.certified_at IS 
'UTC timestamp when certification was verified/approved';

-- 6) 대시보드 집계용 뷰
CREATE OR REPLACE VIEW public.certifications_by_track_v AS
SELECT 
  t.id AS track_id,
  t.name AS track_name,
  t.type AS track_type,
  COUNT(c.id)::INT AS verified_count,
  COUNT(DISTINCT c.user_id)::INT AS unique_users
FROM public.tracks t
LEFT JOIN public.certifications c 
  ON t.id = c.track_id 
  AND c.status IN ('submitted', 'approved')
GROUP BY t.id, t.name, t.type;

COMMENT ON VIEW public.certifications_by_track_v IS 
'Aggregated certification counts by track for dashboard display';

-- 7) 기간별 트랙별 집계 뷰
CREATE OR REPLACE VIEW public.certifications_by_period_track_v AS
SELECT 
  p.id AS period_id,
  p.term_number,
  t.id AS track_id,
  t.name AS track_name,
  COUNT(c.id)::INT AS verified_count,
  COUNT(DISTINCT c.user_id)::INT AS unique_users,
  COUNT(DISTINCT c.certification_date)::INT AS unique_dates
FROM public.periods p
CROSS JOIN public.tracks t
LEFT JOIN public.certifications c 
  ON p.id = c.period_id 
  AND t.id = c.track_id
  AND c.status IN ('submitted', 'approved')
GROUP BY p.id, p.term_number, t.id, t.name;

COMMENT ON VIEW public.certifications_by_period_track_v IS 
'Certification statistics by period and track for tracking page';

