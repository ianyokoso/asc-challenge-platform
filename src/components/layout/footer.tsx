import Link from 'next/link';
import { Github, Mail, Info } from 'lucide-react';
import { APP_VERSION, getLatestVersion } from '@/constants/version';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="space-y-3">
            <h3 className="text-h6 font-heading text-gray-900">
              ASC 챌린지
            </h3>
            <p className="text-body-sm text-gray-600">
              ASC 디스코드 커뮤니티를 위한 챌린지 인증 플랫폼
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-body font-semibold text-gray-900">
              빠른 링크
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/tracks"
                  className="text-body-sm text-gray-600 hover:text-primary transition-colors"
                >
                  트랙 선택
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className="text-body-sm text-gray-600 hover:text-primary transition-colors"
                >
                  리더보드
                </Link>
              </li>
              <li>
                <Link
                  href="/calendar"
                  className="text-body-sm text-gray-600 hover:text-primary transition-colors"
                >
                  캘린더
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="text-body font-semibold text-gray-900">지원</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:support@asc.com"
                  className="text-body-sm text-gray-600 hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  문의하기
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/asc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-gray-600 hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <h4 className="text-body font-semibold text-gray-900">
              커뮤니티
            </h4>
            <p className="text-body-sm text-gray-600">
              Discord에서 함께 성장하세요!
            </p>
            <a
              href="https://discord.gg/asc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-secondary hover:bg-secondary-hover text-secondary-foreground px-4 py-2 rounded-md text-body-sm font-semibold transition-colors"
            >
              Discord 참여
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-body-sm text-gray-500">
              © 2025 ASC 챌린지 인증 플랫폼. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-body-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span className="font-semibold">버전 {APP_VERSION}</span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="text-body-xs text-gray-500">
                최근 업데이트: {getLatestVersion().date}
              </div>
            </div>
          </div>
          
          {/* 최근 변경사항 */}
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <p className="text-body-xs font-semibold text-gray-700 mb-2">
              📦 최근 변경사항 (v{getLatestVersion().version})
            </p>
            <ul className="space-y-1">
              {getLatestVersion().changes.map((change, index) => (
                <li key={index} className="text-body-xs text-gray-600 flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

