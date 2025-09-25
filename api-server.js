const express = require('express')
const axios = require('axios')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const session = require('express-session')
const path = require('path')
const db = require('./database')

// 환경변수 로드
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// 환경변수 및 키 정보 출력
console.log('🔑 카카오 앱 키 정보:')
console.log('- KAKAO_CLIENT_ID:', process.env.KAKAO_CLIENT_ID)
console.log('- KAKAO_CLIENT_SECRET:', process.env.KAKAO_CLIENT_SECRET ? '설정됨' : '미설정')
console.log('- KAKAO_REDIRECT_URI:', process.env.KAKAO_REDIRECT_URI)
console.log('- PORT:', PORT)
console.log('='.repeat(50))

// CORS 설정 - 외부 React 앱에서 접근 가능하도록 설정
const corsOptions = {
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용, 프로덕션에서는 특정 도메인만 허용
    const allowedOrigins = [
      'http://localhost:3000', // React 개발 서버
      'http://localhost:3001', // React 다른 포트
      'http://localhost:5173', // Vite 개발 서버
      'https://your-react-app.com', // 프로덕션 React 앱 도메인
    ]
    
    // origin이 없는 경우 (예: Postman, 모바일 앱) 또는 허용된 origin인 경우
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true, // 쿠키 및 인증 정보 포함
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

// 미들웨어 설정
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'kakao-login-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS를 사용할 때는 true로 설정
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24시간
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
)

// 정적 파일 제공 (선택적)
app.use(express.static(path.join(__dirname, 'public')))

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Kakao Login API'
  })
})

// API 정보 엔드포인트
app.get('/api', (req, res) => {
  res.json({
    service: 'Kakao Login REST API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'GET /api/auth/kakao': '카카오 로그인 시작',
        'GET /api/auth/kakao/callback': '카카오 로그인 콜백',
        'POST /api/auth/logout': '로그아웃',
        'GET /api/auth/user': '현재 로그인된 사용자 정보'
      },
      users: {
        'GET /api/users': '전체 사용자 목록',
        'GET /api/users/:userId': '특정 사용자 정보',
        'DELETE /api/users/:userId': '사용자 삭제'
      },
      system: {
        'GET /health': '서버 상태 확인',
        'GET /api/db/status': '데이터베이스 상태 확인'
      }
    }
  })
})

// 카카오 로그인 시작 - React 앱에서 호출할 URL 반환
app.get('/api/auth/kakao', (req, res) => {
  console.log('🚀 [API] 카카오 로그인 URL 요청')
  
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?` + 
    `client_id=${process.env.KAKAO_CLIENT_ID}&` + 
    `redirect_uri=${process.env.KAKAO_REDIRECT_URI}&` + 
    `response_type=code`

  console.log('- 카카오 인증 URL 생성:', kakaoAuthURL)
  
  // React 앱이 사용할 수 있도록 URL을 JSON으로 반환
  res.json({
    success: true,
    authUrl: kakaoAuthURL,
    message: 'React 앱에서 이 URL로 리다이렉트하세요.'
  })
})

// 카카오 로그인 직접 리다이렉트 (브라우저에서 직접 접근 시)
app.get('/auth/kakao', (req, res) => {
  console.log('🚀 [REDIRECT] 카카오 로그인 직접 리다이렉트')
  
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?` + 
    `client_id=${process.env.KAKAO_CLIENT_ID}&` + 
    `redirect_uri=${process.env.KAKAO_REDIRECT_URI}&` + 
    `response_type=code`

  res.redirect(kakaoAuthURL)
})

// 카카오 로그인 콜백 처리
app.get('/api/auth/kakao/callback', async (req, res) => {
  console.log('🔄 [CALLBACK] 카카오 콜백 수신')
  
  const { code, error } = req.query
  console.log('- 받은 인증 코드:', code ? `${code.substring(0, 10)}...` : '없음')
  
  if (error) {
    console.log('❌ 카카오 인증 오류:', error)
    return res.status(400).json({ 
      success: false, 
      error: '카카오 인증이 취소되었거나 실패했습니다.',
      details: error
    })
  }

  if (!code) {
    console.log('❌ 오류: 인증 코드가 없습니다.')
    return res.status(400).json({ 
      success: false, 
      error: '인증 코드가 없습니다.' 
    })
  }

  try {
    console.log('🔑 [STEP 1] 액세스 토큰 요청')
    
    // 1. 액세스 토큰 요청
    const tokenResponse = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token } = tokenResponse.data
    console.log('✅ 액세스 토큰 획득 성공')

    console.log('👤 [STEP 2] 사용자 정보 요청')
    
    // 2. 사용자 정보 요청
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const userInfo = userResponse.data
    console.log('✅ 사용자 정보 조회 성공:', userInfo.id)

    // 세션에 사용자 정보 저장
    const userData = {
      id: userInfo.id,
      nickname: userInfo.properties?.nickname,
      email: userInfo.kakao_account?.email,
      profile_image: userInfo.properties?.profile_image,
      access_token: access_token,
      login_time: new Date().toISOString()
    }

    req.session.user = userData
    console.log('💾 [STEP 3] 세션에 사용자 정보 저장 완료')

    // 데이터베이스에 사용자 정보 저장
    try {
      await db.saveUser(userData)
      console.log('🗄️ [STEP 4] 데이터베이스에 사용자 정보 저장 완료')
    } catch (dbError) {
      console.error('⚠️ 데이터베이스 저장 실패:', dbError.message)
    }

    console.log('🎉 로그인 성공!')

    // 성공 응답 - React 앱이 처리할 수 있는 형태
    const { access_token: _, ...publicUserData } = userData
    res.json({
      success: true,
      message: '로그인이 성공적으로 완료되었습니다.',
      user: publicUserData
    })

  } catch (error) {
    console.log('❌ [오류] 카카오 로그인 실패')
    console.error('- 오류 상세:', error.response?.data || error.message)
    
    res.status(500).json({
      success: false,
      error: '카카오 로그인 처리 중 오류가 발생했습니다.',
      details: error.response?.data || error.message
    })
  }
})

// 현재 로그인된 사용자 정보 조회
app.get('/api/auth/user', (req, res) => {
  console.log('📊 [API] 현재 사용자 정보 조회 요청')

  if (!req.session.user) {
    console.log('- 결과: 로그인되지 않음 (401)')
    return res.status(401).json({ 
      success: false,
      error: '로그인이 필요합니다.',
      authenticated: false
    })
  }

  const { access_token, ...userInfo } = req.session.user
  console.log('- 결과: 사용자 정보 반환 성공 - ID:', userInfo.id)
  
  res.json({
    success: true,
    authenticated: true,
    user: userInfo
  })
})

// 로그아웃
app.post('/api/auth/logout', async (req, res) => {
  console.log('🚪 [API] 로그아웃 요청')

  if (!req.session.user) {
    console.log('- 결과: 로그인되지 않은 상태')
    return res.status(401).json({ 
      success: false,
      error: '로그인되어 있지 않습니다.' 
    })
  }

  console.log('- 사용자 ID:', req.session.user.id)
  console.log('- 카카오 서버에 로그아웃 요청 중...')

  try {
    // 카카오 로그아웃 (선택적)
    await axios.post(
      'https://kapi.kakao.com/v1/user/logout',
      {},
      {
        headers: {
          Authorization: `Bearer ${req.session.user.access_token}`,
        },
      }
    )
    console.log('✅ 카카오 서버 로그아웃 성공')
  } catch (error) {
    console.log('⚠️ 카카오 서버 로그아웃 오류:', error.response?.data || error.message)
  }

  // 세션 삭제
  req.session.destroy((err) => {
    if (err) {
      console.log('❌ 세션 삭제 오류:', err)
      return res.status(500).json({ 
        success: false,
        error: '로그아웃 중 오류가 발생했습니다.' 
      })
    }
    
    console.log('✅ 세션 삭제 완료')
    console.log('🎉 로그아웃 성공!')
    
    res.json({ 
      success: true,
      message: '로그아웃되었습니다.' 
    })
  })
})

// 데이터베이스 관련 API들
// 전체 사용자 목록 조회
app.get('/api/users', async (req, res) => {
  console.log('👥 [API] 전체 사용자 목록 조회 요청')

  try {
    const users = await db.getAllUsers()
    console.log('✅ 사용자 목록 조회 성공, 총', users.length, '명')
    
    res.json({
      success: true,
      count: users.length,
      users: users,
    })
  } catch (error) {
    console.error('❌ 사용자 목록 조회 실패:', error.message)
    res.status(500).json({
      success: false,
      error: '사용자 목록 조회에 실패했습니다.',
      details: error.message
    })
  }
})

// 특정 사용자 정보 조회
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params
  console.log('👤 [API] 사용자 정보 조회 요청 - ID:', userId)

  try {
    const user = await db.getUser(userId)
    if (user) {
      console.log('✅ 사용자 정보 조회 성공')
      res.json({
        success: true,
        user: user,
      })
    } else {
      console.log('❌ 사용자를 찾을 수 없음')
      res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.',
      })
    }
  } catch (error) {
    console.error('❌ 사용자 조회 실패:', error.message)
    res.status(500).json({
      success: false,
      error: '사용자 조회에 실패했습니다.',
      details: error.message
    })
  }
})

// 사용자 삭제
app.delete('/api/users/:userId', async (req, res) => {
  const { userId } = req.params
  console.log('🗑️ [API] 사용자 삭제 요청 - ID:', userId)

  try {
    const deleted = await db.deleteUser(userId)
    if (deleted) {
      console.log('✅ 사용자 삭제 성공')
      res.json({
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다.',
      })
    } else {
      console.log('❌ 삭제할 사용자를 찾을 수 없음')
      res.status(404).json({
        success: false,
        error: '삭제할 사용자를 찾을 수 없습니다.',
      })
    }
  } catch (error) {
    console.error('❌ 사용자 삭제 실패:', error.message)
    res.status(500).json({
      success: false,
      error: '사용자 삭제에 실패했습니다.',
      details: error.message
    })
  }
})

// 데이터베이스 상태 확인
app.get('/api/db/status', async (req, res) => {
  console.log('🔍 [API] 데이터베이스 상태 확인 요청')

  try {
    const isConnected = await db.testConnection()
    res.json({
      success: true,
      connected: isConnected,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '요청한 엔드포인트를 찾을 수 없습니다.',
    availableEndpoints: [
      'GET /api - API 정보',
      'GET /health - 서버 상태',
      'GET /api/auth/kakao - 카카오 로그인 URL',
      'GET /api/auth/user - 현재 사용자 정보',
      'POST /api/auth/logout - 로그아웃'
    ]
  })
})

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('🚨 서버 에러:', error)
  res.status(500).json({
    success: false,
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// 서버 시작 및 데이터베이스 초기화
app.listen(PORT, async () => {
  console.log('\n🎯 카카오 로그인 REST API 서버 시작!')
  console.log('='.repeat(50))
  console.log(`🚀 서버 주소: http://localhost:${PORT}`)
  console.log(`📖 API 문서: http://localhost:${PORT}/api`)
  console.log(`💓 헬스체크: http://localhost:${PORT}/health`)
  console.log(`🔗 카카오 로그인: http://localhost:${PORT}/api/auth/kakao`)
  console.log(`📞 콜백 URL: http://localhost:${PORT}/api/auth/kakao/callback`)
  console.log('='.repeat(50))

  // 데이터베이스 연결 및 초기화
  console.log('🗄️ 데이터베이스 초기화 중...')
  try {
    const dbConnected = await db.testConnection()
    if (dbConnected) {
      await db.createUserTable()
      console.log('🎉 데이터베이스 준비 완료!')
    } else {
      console.log('⚠️ 데이터베이스 연결 실패 - 세션 기반으로만 동작합니다.')
    }
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error.message)
  }

  console.log('='.repeat(50))
  console.log('📝 React 앱에서 사용법:')
  console.log('1️⃣ GET /api/auth/kakao - 카카오 로그인 URL 획득')
  console.log('2️⃣ 해당 URL로 사용자 리다이렉트')
  console.log('3️⃣ 콜백에서 로그인 결과 확인')
  console.log('4️⃣ GET /api/auth/user - 로그인 상태 확인')
  console.log('5️⃣ POST /api/auth/logout - 로그아웃')
  console.log('='.repeat(50))
})

module.exports = app