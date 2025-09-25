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

// 미들웨어 설정
app.use(
  cors({
    origin: `http://localhost:${PORT}`,
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'kakao-login-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // HTTPS를 사용할 때는 true로 설정
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24시간
    },
  })
)

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')))

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// 카카오 로그인 요청
app.get('/auth/kakao', (req, res) => {
  console.log('🚀 [STEP 1] 카카오 로그인 시작')
  console.log('- 사용자가 카카오 로그인 버튼 클릭')

  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?` + `client_id=${process.env.KAKAO_CLIENT_ID}&` + `redirect_uri=${process.env.KAKAO_REDIRECT_URI}&` + `response_type=code`

  console.log('- 카카오 인증 URL:', kakaoAuthURL)
  console.log('- 사용자를 카카오 서버로 리다이렉트...')
  console.log('-'.repeat(50))

  res.redirect(kakaoAuthURL)
})

// 카카오 로그인 콜백 처리
app.get('/api/auth/kakao/callback', async (req, res) => {
  console.log('🔄 [STEP 2] 카카오 콜백 수신')
  console.log('- 카카오 서버에서 인증 코드와 함께 돌아옴')

  const { code } = req.query
  console.log('- 받은 인증 코드:', code ? `${code}` : '없음')

  if (!code) {
    console.log('❌ 오류: 인증 코드가 없습니다.')
    return res.status(400).json({ error: '인증 코드가 없습니다.' })
  }

  try {
    console.log('🔑 [STEP 3] 액세스 토큰 요청')
    console.log('- 인증 코드를 액세스 토큰으로 교환 중...')

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
    console.log('✅ 액세스 토큰 획득 성공:', access_token ? `${access_token}` : '없음')

    console.log('👤 [STEP 4] 사용자 정보 요청')
    console.log('- 액세스 토큰으로 사용자 정보 조회 중...')

    // 2. 사용자 정보 요청
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const userInfo = userResponse.data

    console.log('✅ 사용자 정보 조회 성공:')
    console.log('- 사용자 ID:', userInfo.id)
    console.log('- 닉네임:', userInfo.properties?.nickname || '없음')
    console.log('- 이메일:', userInfo.kakao_account?.email || '비공개')
    console.log('- 프로필 이미지:', userInfo.properties?.profile_image ? '있음' : '없음')

    // 세션에 사용자 정보 저장
    const userData = {
      id: userInfo.id,
      nickname: userInfo.properties?.nickname,
      email: userInfo.kakao_account?.email,
      profile_image: userInfo.properties?.profile_image,
      access_token: access_token,
    }

    req.session.user = userData

    console.log('💾 [STEP 5] 세션에 사용자 정보 저장 완료')

    // 데이터베이스에 사용자 정보 저장
    try {
      await db.saveUser(userData)
      console.log('🗄️ [STEP 6] 데이터베이스에 사용자 정보 저장 완료')
    } catch (dbError) {
      console.error('⚠️ 데이터베이스 저장 실패 (로그인은 계속 진행):', dbError.message)
    }

    console.log('🎉 로그인 성공! success 페이지로 리다이렉트...')
    console.log('='.repeat(50))

    // 성공 페이지로 리다이렉트
    res.redirect('/success')
  } catch (error) {
    console.log('❌ [오류] 카카오 로그인 실패')
    console.error('- 오류 상세:', error.response?.data || error.message)
    console.log('- error 페이지로 리다이렉트...')
    console.log('='.repeat(50))
    res.redirect('/error')
  }
})

// 로그인 성공 페이지
app.get('/success', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/')
  }
  res.sendFile(path.join(__dirname, 'public', 'success.html'))
})

// 에러 페이지
app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'error.html'))
})

// 사용자 관리 페이지
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})

// 사용자 정보 API
app.get('/api/user', (req, res) => {
  console.log('📊 [API] 사용자 정보 조회 요청')

  if (!req.session.user) {
    console.log('- 결과: 로그인되지 않음 (401)')
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }

  const { access_token, ...userInfo } = req.session.user
  console.log('- 결과: 사용자 정보 반환 성공')
  console.log('- 사용자 ID:', userInfo.id)
  res.json(userInfo)
})

// 로그아웃
app.post('/auth/logout', async (req, res) => {
  console.log('🚪 [로그아웃] 로그아웃 요청')

  if (!req.session.user) {
    console.log('- 결과: 로그인되지 않은 상태')
    return res.status(401).json({ error: '로그인되어 있지 않습니다.' })
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
      return res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' })
    }
    console.log('✅ 세션 삭제 완료')
    console.log('🎉 로그아웃 성공!')
    console.log('='.repeat(50))
    res.json({ message: '로그아웃되었습니다.' })
  })
})

// 데이터베이스 관련 API들
// 전체 사용자 목록 조회
app.get('/api/users', async (req, res) => {
  console.log('👥 [DB API] 전체 사용자 목록 조회 요청')

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
    })
  }
})

// 특정 사용자 정보 조회
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params
  console.log('👤 [DB API] 사용자 정보 조회 요청 - ID:', userId)

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
    })
  }
})

// 사용자 삭제
app.delete('/api/users/:userId', async (req, res) => {
  const { userId } = req.params
  console.log('🗑️ [DB API] 사용자 삭제 요청 - ID:', userId)

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
    })
  }
})

// 데이터베이스 상태 확인
app.get('/api/db/status', async (req, res) => {
  console.log('🔍 [DB API] 데이터베이스 상태 확인 요청')

  try {
    const isConnected = await db.testConnection()
    res.json({
      success: true,
      connected: isConnected,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message,
    })
  }
})

// 서버 시작 및 데이터베이스 초기화
app.listen(PORT, async () => {
  console.log('\n🎯 카카오 소셜 로그인 + MariaDB 서버 시작!')
  console.log('='.repeat(50))
  console.log(`🚀 서버 주소: http://localhost:${PORT}`)
  console.log(`🔗 카카오 로그인: http://localhost:${PORT}/auth/kakao`)
  console.log(`📞 콜백 URL: http://localhost:${PORT}/api/auth/kakao/callback`)
  console.log('='.repeat(50))

  // 데이터베이스 연결 및 초기화
  console.log('�️ 데이터베이스 초기화 중...')
  const dbConnected = await db.testConnection()
  if (dbConnected) {
    await db.createUserTable()
    console.log('🎉 데이터베이스 준비 완료!')
  } else {
    console.log('⚠️ 데이터베이스 연결 실패 - 세션 기반으로만 동작합니다.')
  }

  console.log('='.repeat(50))
  console.log('�💡 테스트 방법: 브라우저에서 위 서버 주소로 접속하세요!')
  console.log('\n📝 로그인 흐름:')
  console.log('1️⃣ 사용자가 "카카오로 로그인" 클릭')
  console.log('2️⃣ 카카오 서버로 리다이렉트')
  console.log('3️⃣ 카카오 로그인 완료 후 콜백 URL로 돌아옴')
  console.log('4️⃣ 인증 코드 → 액세스 토큰 교환')
  console.log('5️⃣ 사용자 정보 조회 및 세션 저장')
  console.log('6️⃣ 데이터베이스에 사용자 정보 저장')
  console.log('7️⃣ 로그인 완료!')
  console.log('\n🔗 새로운 API 엔드포인트:')
  console.log(`- GET /api/users - 전체 사용자 목록`)
  console.log(`- GET /api/users/:userId - 특정 사용자 정보`)
  console.log(`- DELETE /api/users/:userId - 사용자 삭제`)
  console.log(`- GET /api/db/status - 데이터베이스 상태`)
  console.log('='.repeat(50))
})
