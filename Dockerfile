# Node.js 18 Alpine 이미지 사용 (가벼운 Linux 배포판)
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 도구 설치
RUN apk update && apk add --no-cache \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# package.json과 package-lock.json 복사 (캐싱 최적화)
COPY package*.json ./

# 의존성 설치 (프로덕션 모드)
RUN npm ci --only=production && npm cache clean --force

# 애플리케이션 소스 코드 복사
COPY . .

# non-root 사용자 생성 및 권한 설정 (보안 강화)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

# non-root 사용자로 전환
USER nextjs

# 포트 노출
EXPOSE 3000

# 환경변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 애플리케이션 시작
CMD ["node", "api-server.js"]