// 데이터베이스 연결 테스트 스크립트
const mariadb = require('mariadb')
const dotenv = require('dotenv')

// 환경변수 로드
dotenv.config()

async function testDirectConnection() {
  console.log('🔍 직접 MariaDB 연결 테스트')
  console.log('='.repeat(50))

  // 연결 정보 출력
  console.log('📋 연결 정보:')
  console.log('- 호스트:', process.env.DB_HOST)
  console.log('- 포트:', process.env.DB_PORT)
  console.log('- 사용자:', process.env.DB_USER)
  console.log('- 비밀번호:', process.env.DB_PASSWORD ? '***설정됨***' : '❌ 미설정')
  console.log('- 데이터베이스:', process.env.DB_NAME)
  console.log('='.repeat(50))

  let conn

  try {
    console.log('⏰ 1단계: 기본 서버 연결 테스트 (데이터베이스 지정 없이)')

    // 기본 연결 설정 (데이터베이스 없이)
    const basicConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      timeout: 5000,
      acquireTimeout: 5000,
    }

    console.log('🔌 연결 시도 중...')
    conn = await mariadb.createConnection(basicConfig)
    console.log('✅ 기본 서버 연결 성공!')

    // 서버 정보 조회
    const serverInfo = await conn.query('SELECT VERSION() as version, USER() as user, @@hostname as hostname')
    console.log('📊 서버 정보:')
    console.log('- 버전:', serverInfo[0].version)
    console.log('- 연결 사용자:', serverInfo[0].user)
    console.log('- 호스트명:', serverInfo[0].hostname)

    // 데이터베이스 목록 조회
    console.log('\n📋 사용 가능한 데이터베이스:')
    const databases = await conn.query('SHOW DATABASES')
    databases.forEach((db) => {
      const dbName = Object.values(db)[0]
      console.log(`- ${dbName}${dbName === process.env.DB_NAME ? ' ⭐ (대상 DB)' : ''}`)
    })

    // 대상 데이터베이스 존재 확인
    const targetDbExists = databases.some((db) => Object.values(db)[0] === process.env.DB_NAME)

    if (!targetDbExists) {
      console.log(`\n🏗️ 데이터베이스 '${process.env.DB_NAME}' 생성 시도`)
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
      console.log('✅ 데이터베이스 생성 완료')
    } else {
      console.log(`\n✅ 데이터베이스 '${process.env.DB_NAME}' 이미 존재`)
    }

    await conn.end()

    // 2단계: 특정 데이터베이스로 연결
    console.log(`\n⏰ 2단계: '${process.env.DB_NAME}' 데이터베이스 연결 테스트`)

    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timeout: 5000,
      acquireTimeout: 5000,
    }

    conn = await mariadb.createConnection(dbConfig)
    console.log('✅ 데이터베이스 연결 성공!')

    // 현재 데이터베이스 확인
    const currentDb = await conn.query('SELECT DATABASE() as current_db')
    console.log('- 현재 데이터베이스:', currentDb[0].current_db)

    // 테이블 목록 조회
    const tables = await conn.query('SHOW TABLES')
    console.log(`- 테이블 수: ${tables.length}개`)
    if (tables.length > 0) {
      console.log('- 테이블 목록:')
      tables.forEach((table) => {
        console.log(`  * ${Object.values(table)[0]}`)
      })
    }

    await conn.end()

    console.log('\n🎉 모든 연결 테스트 성공!')
    console.log('✅ 서버에서 정상적으로 사용할 수 있습니다.')
  } catch (error) {
    console.error('\n❌ 연결 테스트 실패:')
    console.error('- 오류:', error.message)
    console.error('- 코드:', error.code)
    console.error('- errno:', error.errno)

    // 구체적인 해결책 제시
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 해결책: 호스트 주소를 확인하세요.')
      console.error('- DNS 해상도 문제일 수 있습니다.')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 해결책: 포트 번호와 서버 상태를 확인하세요.')
      console.error('- MariaDB 서버가 실행 중인지 확인하세요.')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 해결책: 사용자명과 비밀번호를 확인하세요.')
    } else if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n💡 해결책: 데이터베이스 접근 권한을 확인하세요.')
    }
  } finally {
    if (conn && conn.end) {
      try {
        await conn.end()
      } catch (e) {
        console.error('연결 종료 오류:', e.message)
      }
    }
  }
}

// 테스트 실행
testDirectConnection()
  .then(() => {
    console.log('\n테스트 완료')
  })
  .catch((err) => {
    console.error('테스트 실행 오류:', err)
  })
