import Link from 'next/link';
import { Github, Mail } from 'lucide-react';

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
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-body-sm text-gray-500">
            © 2025 ASC 챌린지 인증 플랫폼. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

