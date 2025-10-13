-- 0016_create_periods_table.sql
-- 기수별 인증 기간을 관리하는 테이블 생성 및 certifications 테이블에 period_id FK 추가

-- 기수(Period) 테이블 생성
CREATE TABLE IF NOT EXISTS public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_number INTEGER NOT NULL UNIQUE, -- 기수 번호 (1기, 2기, ...)
  start_date DATE NOT NULL, -- 기수 시작일
  end_date DATE NOT NULL, -- 기수 종료일
  is_active BOOLEAN DEFAULT false NOT NULL, -- 현재 활성화된 기수인지 여부
  description TEXT, -- 기수 설명 (예: "1기 - 챌린지 시작")
  created_by UUID REFERENCES public.users(id), -- 생성한 관리자
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 제약조건: 시작일이 종료일보다 이전이어야 함
  CONSTRAINT valid_period_dates CHECK (start_date < end_date),
  -- 제약조건: 기수 번호는 1 이상이어야 함
  CONSTRAINT positive_term_number CHECK (term_number > 0)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_periods_term_number ON public.periods(term_number);
CREATE INDEX IF NOT EXISTS idx_periods_is_active ON public.periods(is_active);
CREATE INDEX IF NOT EXISTS idx_periods_dates ON public.periods(start_date, end_date);

-- RLS 활성화
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 기수 정보를 읽을 수 있음
CREATE POLICY "Anyone can read periods"
  ON public.periods
  FOR SELECT
  USING (true);

-- RLS 정책: 관리자만 기수를 생성/수정/삭제할 수 있음
CREATE POLICY "Admins can manage periods"
  ON public.periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- updated_at 트리거
CREATE TRIGGER update_periods_updated_at
  BEFORE UPDATE ON public.periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- certifications 테이블에 period_id 컬럼 추가
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES public.periods(id) ON DELETE SET NULL;

-- period_id 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_certifications_period_id ON public.certifications(period_id);

-- 활성화된 기수만 하나여야 함을 보장하는 함수
CREATE OR REPLACE FUNCTION public.ensure_single_active_period()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로 활성화하려는 경우
  IF NEW.is_active = true THEN
    -- 다른 모든 기수를 비활성화
    UPDATE public.periods
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거: 활성화된 기수는 하나만 존재하도록 보장
CREATE TRIGGER ensure_single_active_period_trigger
  BEFORE INSERT OR UPDATE ON public.periods
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_period();

-- 헬퍼 함수: 현재 활성화된 기수 가져오기
CREATE OR REPLACE FUNCTION public.get_active_period()
RETURNS UUID AS $$
DECLARE
  active_period_id UUID;
BEGIN
  SELECT id INTO active_period_id
  FROM public.periods
  WHERE is_active = true
  LIMIT 1;
  
  RETURN active_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 헬퍼 함수: 특정 날짜가 속한 기수 ID 가져오기
CREATE OR REPLACE FUNCTION public.get_period_by_date(check_date DATE)
RETURNS UUID AS $$
DECLARE
  period_id UUID;
BEGIN
  SELECT id INTO period_id
  FROM public.periods
  WHERE check_date BETWEEN start_date AND end_date
  LIMIT 1;
  
  RETURN period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 코멘트 추가
COMMENT ON TABLE public.periods IS '챌린지 기수별 기간 정보를 저장하는 테이블';
COMMENT ON COLUMN public.periods.term_number IS '기수 번호 (1기, 2기, ...)';
COMMENT ON COLUMN public.periods.start_date IS '기수 시작일';
COMMENT ON COLUMN public.periods.end_date IS '기수 종료일';
COMMENT ON COLUMN public.periods.is_active IS '현재 활성화된 기수인지 여부 (한 번에 하나만 활성화 가능)';
COMMENT ON COLUMN public.certifications.period_id IS '인증이 속한 기수 ID';

COMMENT ON FUNCTION public.get_active_period IS '현재 활성화된 기수의 ID를 반환';
COMMENT ON FUNCTION public.get_period_by_date IS '특정 날짜가 속한 기수의 ID를 반환';

