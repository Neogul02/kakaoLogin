# 카카오 로그인 REST API - 클라우드 타입 배포 가이드

## 🚀 빠른 시작

### 1. 클라우드 타입에서 프로젝트 생성
1. [클라우드 타입](https://cloudtype.io) 접속 및 로그인
2. "새 프로젝트" 생성
3. GitHub 저장소 연결: `https://github.com/Neogul02/kakaoLogin.git`

### 2. 환경변수 설정
클라우드 타입 프로젝트 설정에서 다음 환경변수들을 추가하세요:

```
# 필수 환경변수
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=https://your-app-domain.run.goorm.site/api/auth/kakao/callback

# 데이터베이스 설정
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# 서버 설정
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_super_secret_session_key

# CORS 허용 도메인
ALLOWED_ORIGINS=https://your-react-app.com,https://another-domain.com
```

### 3. 빌드 설정
- **빌드 명령어**: `npm install`
- **시작 명령어**: `node api-server.js`
- **포트**: `3000`

## 📡 API 엔드포인트

### 인증 관련
- `GET /api/auth/kakao` - 카카오 로그인 URL 획득
- `GET /api/auth/kakao/callback` - 카카오 로그인 콜백
- `GET /api/auth/user` - 현재 사용자 정보
- `POST /api/auth/logout` - 로그아웃

### 사용자 관리
- `GET /api/users` - 전체 사용자 목록
- `GET /api/users/:userId` - 특정 사용자 정보
- `DELETE /api/users/:userId` - 사용자 삭제

### 시스템
- `GET /health` - 서버 상태 확인
- `GET /api/db/status` - 데이터베이스 상태
- `GET /api` - API 문서

## 🔗 React 앱에서 사용법

### 1. 카카오 로그인 시작
```javascript
// 카카오 로그인 URL 획득
const response = await fetch('https://your-api-domain.run.goorm.site/api/auth/kakao', {
  credentials: 'include'
});
const data = await response.json();

// 카카오 로그인 페이지로 리다이렉트
window.location.href = data.authUrl;
```

### 2. 로그인 상태 확인
```javascript
const checkLoginStatus = async () => {
  try {
    const response = await fetch('https://your-api-domain.run.goorm.site/api/auth/user', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('로그인된 사용자:', userData.user);
      return userData.user;
    } else {
      console.log('로그인되지 않음');
      return null;
    }
  } catch (error) {
    console.error('로그인 상태 확인 오류:', error);
    return null;
  }
};
```

### 3. 로그아웃
```javascript
const logout = async () => {
  try {
    const response = await fetch('https://your-api-domain.run.goorm.site/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error('로그아웃 오류:', error);
  }
};
```

## 🔧 카카오 개발자 콘솔 설정

### 1. 애플리케이션 등록
1. [카카오 개발자 콘솔](https://developers.kakao.com) 접속
2. "내 애플리케이션" → "애플리케이션 추가하기"
3. 앱 이름 입력 및 생성

### 2. 플랫폼 설정
1. "플랫폼" → "Web 플랫폼 등록"
2. 사이트 도메인: `https://your-app-domain.run.goorm.site`

### 3. 카카오 로그인 설정
1. "카카오 로그인" → "활성화 설정" ON
2. "Redirect URI": `https://your-app-domain.run.goorm.site/api/auth/kakao/callback`

### 4. 동의항목 설정
- 닉네임: 필수
- 이메일: 선택 (필요한 경우)

## 🛠️ 로컬 개발 환경

### Docker Compose 사용
```bash
# 개발 환경 실행
docker-compose -f docker-compose.dev.yml up --build

# 프로덕션 환경 실행
docker-compose up --build
```

### 직접 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 서버 실행
npm start
```

## ✅ 배포 체크리스트

- [ ] 카카오 개발자 콘솔에서 애플리케이션 등록
- [ ] Redirect URI를 클라우드 타입 도메인으로 설정
- [ ] 환경변수 모두 설정
- [ ] 데이터베이스 연결 확인
- [ ] CORS 설정에 React 앱 도메인 추가
- [ ] 클라우드 타입에 배포
- [ ] API 엔드포인트 테스트

## 🚨 보안 고려사항

1. **환경변수 관리**: 민감한 정보는 환경변수로 관리
2. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용
3. **CORS 설정**: 신뢰할 수 있는 도메인만 허용
4. **세션 보안**: 안전한 세션 secret 사용

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 환경변수 설정 확인
2. 카카오 개발자 콘솔 설정 확인
3. 네트워크 연결 상태 확인
4. 로그 메시지 확인