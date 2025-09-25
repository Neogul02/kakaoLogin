# 카카오 소셜 로그인 테스트 서버

Node.js Express를 사용한 카카오 소셜 로그인 구현 예제입니다.

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일에서 다음 항목들을 설정하세요:

```env
KAKAO_CLIENT_ID=your_kakao_client_id_here
KAKAO_CLIENT_SECRET=your_kakao_client_secret_here
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
PORT=3000
SESSION_SECRET=your_session_secret_here
```

### 3. 카카오 개발자 센터 설정

1. [카카오 개발자 센터](https://developers.kakao.com/)에 접속
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름과 사업자명 입력 후 저장
4. **앱 키** 탭에서 **REST API 키**를 복사하여 `.env`의 `KAKAO_CLIENT_ID`에 입력
5. **제품 설정** → **카카오 로그인** 활성화
6. **Redirect URI** 등록: `http://localhost:3000/auth/kakao/callback`
7. **동의항목** 설정:
   - 닉네임: 필수 동의
   - 프로필 사진: 선택 동의
   - 카카오계정(이메일): 선택 동의

### 4. 서버 실행

```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 일반 실행
npm start
```

### 5. 테스트

브라우저에서 `http://localhost:3000`에 접속하여 카카오 로그인을 테스트하세요.

## 📁 프로젝트 구조

```
kakaoLogin/
├── server.js              # 메인 서버 파일
├── package.json           # 프로젝트 설정 및 의존성
├── .env                   # 환경변수 (카카오 앱 설정)
├── .gitignore            # Git 무시 파일 목록
├── README.md             # 프로젝트 설명서
└── public/               # 정적 파일들
    ├── index.html        # 메인 페이지 (로그인 버튼)
    ├── success.html      # 로그인 성공 페이지
    └── error.html        # 로그인 오류 페이지
```

## 🔗 API 엔드포인트

- `GET /` - 메인 페이지
- `GET /auth/kakao` - 카카오 로그인 시작
- `GET /auth/kakao/callback` - 카카오 로그인 콜백
- `GET /success` - 로그인 성공 페이지
- `GET /error` - 로그인 오류 페이지
- `GET /api/user` - 현재 사용자 정보 조회
- `POST /auth/logout` - 로그아웃

## ⚙️ 주요 기능

- ✅ 카카오 OAuth 2.0 로그인
- ✅ 사용자 정보 조회 (닉네임, 이메일, 프로필 이미지)
- ✅ 세션 관리
- ✅ 로그아웃 기능
- ✅ 오류 처리
- ✅ 반응형 웹 디자인

## 🔧 개발 정보

### 사용된 기술 스택

- **백엔드**: Node.js, Express.js
- **인증**: Kakao OAuth 2.0
- **세션 관리**: express-session
- **HTTP 클라이언트**: axios
- **기타**: dotenv, cors, cookie-parser

### 환경 요구사항

- Node.js 14.0.0 이상
- npm 6.0.0 이상

## 🗄️ 데이터베이스 연동 (추후 예정)

현재는 세션 기반 임시 저장을 사용하고 있습니다.
추후 MySQL/PostgreSQL 연동 시 다음 환경변수들을 사용할 예정입니다:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=kakao_login_db
```

## 🚨 주의사항

1. **보안**: 실제 배포 시에는 HTTPS를 사용하고 `SESSION_SECRET`을 안전한 값으로 설정하세요.
2. **환경변수**: `.env` 파일은 절대 git에 커밋하지 마세요.
3. **카카오 앱 설정**: Redirect URI는 반드시 카카오 개발자 센터에서 등록해야 합니다.
4. **도메인**: 실제 서비스 시에는 카카오 개발자 센터에서 서비스 도메인을 등록해야 합니다.

## 📝 로그

- 서버는 `http://localhost:3000`에서 실행됩니다.
- 콘솔에서 요청 로그와 오류를 확인할 수 있습니다.

## 🤝 기여하기

1. 이 저장소를 Fork하세요
2. 새로운 기능 브랜치를 만드세요 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋하세요 (`git commit -am '새 기능 추가'`)
4. 브랜치에 Push하세요 (`git push origin feature/새기능`)
5. Pull Request를 만드세요

## 📜 라이선스

MIT License - 자유롭게 사용하세요!
