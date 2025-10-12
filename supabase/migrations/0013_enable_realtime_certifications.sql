-- ============================================
-- Supabase Realtime 활성화 for certifications
-- ============================================
-- 
-- 이 마이그레이션은 certifications 테이블에 대해 
-- Supabase Realtime 기능을 활성화합니다.
-- 
-- 이를 통해 관리자 페이지에서 인증 현황을 
-- 실시간으로 업데이트할 수 있습니다.
-- ============================================

-- certifications 테이블에 대한 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE certifications;

-- user_tracks 테이블에 대한 Realtime 활성화 (참여자 변경 감지)
ALTER PUBLICATION supabase_realtime ADD TABLE user_tracks;

-- 코멘트 추가
COMMENT ON PUBLICATION supabase_realtime IS 'Supabase Realtime publication for real-time data synchronization';

-- 확인 쿼리 (실행 후 결과 확인)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

