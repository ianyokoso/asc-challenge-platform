/**
 * 공통 읽기 레이어: 인증 데이터 조회
 * 
 * - 단일 API 엔드포인트 사용
 * - Next.js 캐시 태깅으로 선택적 무효화
 * - React Query와 함께 사용
 */

export interface FetchCertificationsParams {
  userId?: string;
  periodId?: string;
  trackId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface Certification {
  id: string;
  user_id: string;
  track_id: string;
  period_id: string;
  user_track_id: string;
  certification_url?: string | null;
  certification_date: string;
  submitted_at: string;
  certified_at?: string;
  status: string;
  notes?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FetchCertificationsResponse {
  ok: boolean;
  data: Certification[];
  count?: number;
}

/**
 * 인증 데이터 조회 (서버/클라이언트 공통)
 */
export async function fetchCertifications(
  params: FetchCertificationsParams = {}
): Promise<FetchCertificationsResponse> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  // 캐시 태그 구성
  const tags: string[] = ['certifications'];
  if (params.userId) tags.push(`certifications:user:${params.userId}`);
  if (params.periodId) tags.push(`certifications:period:${params.periodId}`);
  if (params.trackId) tags.push(`certifications:track:${params.trackId}`);

  const url = `/api/certifications${qs ? `?${qs}` : ''}`;
  
  console.log('[fetchCertifications] 🔍 Fetching:', { url, tags });

  try {
    const res = await fetch(url, {
      next: { 
        tags, 
        revalidate: 60, // 60초 캐시 (선택적)
      },
      cache: 'force-cache',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[fetchCertifications] ❌ HTTP error:', {
        status: res.status,
        statusText: res.statusText,
        body: errorText,
      });
      throw new Error(`Failed to fetch certifications: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    console.log('[fetchCertifications] ✅ Success:', { count: json.data?.length || 0 });
    return json;

  } catch (error) {
    console.error('[fetchCertifications] ❌ Fetch error:', error);
    throw error;
  }
}

/**
 * 대시보드 집계 데이터 조회
 */
export interface TrackStats {
  track_id: string;
  track_name: string;
  track_type: string;
  verified_count: number;
  unique_users: number;
}

export async function fetchDashboardStats(): Promise<TrackStats[]> {
  console.log('[fetchDashboardStats] 🔍 Fetching dashboard stats');

  try {
    const res = await fetch('/api/certifications/dashboard', {
      next: { 
        tags: ['certifications', 'dashboard'], 
        revalidate: 60,
      },
      cache: 'force-cache',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch dashboard stats: ${res.status}`);
    }

    const json = await res.json();
    console.log('[fetchDashboardStats] ✅ Success:', { count: json.data?.length || 0 });
    return json.data || [];

  } catch (error) {
    console.error('[fetchDashboardStats] ❌ Error:', error);
    throw error;
  }
}

