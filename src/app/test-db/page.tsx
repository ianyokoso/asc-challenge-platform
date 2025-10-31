'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { getUser } from '@/lib/supabase/client';

export default function TestDBPage() {
  const [results, setResults] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      setUserId(user?.id || null);
      addLog('User ID: ' + (user?.id || 'null'));
    };
    fetchUser();
  }, []);

  const addLog = (message: string) => {
    setResults(prev => [...prev, { time: new Date().toISOString(), message }]);
  };

  const testUserTracks = async () => {
    addLog('🔍 Testing user_tracks query...');
    const supabase = createClient();
    
    if (!userId) {
      addLog('❌ No user ID!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_tracks')
        .select('*, track:tracks(*)')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        addLog(`❌ Error: ${JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }, null, 2)}`);
      } else {
        addLog(`✅ Success! Found ${data?.length || 0} tracks`);
        if (data) {
          addLog(`Data: ${JSON.stringify(data, null, 2)}`);
        }
      }
    } catch (err: any) {
      addLog(`💥 Catch error: ${err.message}`);
    }
  };

  const testTracks = async () => {
    addLog('🔍 Testing tracks query...');
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*');

      if (error) {
        addLog(`❌ Error: ${JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }, null, 2)}`);
      } else {
        addLog(`✅ Success! Found ${data?.length || 0} tracks`);
        if (data) {
          addLog(`Tracks: ${JSON.stringify(data.map(t => ({ id: t.id, name: t.name })), null, 2)}`);
        }
      }
    } catch (err: any) {
      addLog(`💥 Catch error: ${err.message}`);
    }
  };

  const clearLogs = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <h1 className="text-h2 font-heading mb-4">데이터베이스 테스트</h1>
          
          <div className="space-x-4 mb-6">
            <Button onClick={testTracks}>
              1️⃣ Tracks 조회 테스트
            </Button>
            <Button onClick={testUserTracks}>
              2️⃣ User Tracks 조회 테스트
            </Button>
            <Button onClick={clearLogs} variant="outline">
              🗑️ 로그 지우기
            </Button>
          </div>

          <div className="space-y-2">
            <h2 className="text-h5 font-heading mb-2">결과:</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
              {results.length === 0 ? (
                <p className="text-gray-500">버튼을 클릭해서 테스트하세요...</p>
              ) : (
                results.map((log, i) => (
                  <div key={i} className="mb-2">
                    <span className="text-gray-500">[{new Date(log.time).toLocaleTimeString()}]</span>{' '}
                    <pre className="inline whitespace-pre-wrap">{log.message}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
