const mariadb = require('mariadb')
const dotenv = require('dotenv')

// 환경변수 로드
dotenv.config()

// 기본 연결 설정 (데이터베이스 없이)
const adminConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  timeout: 5000,
  acquireTimeout: 5000,
  bigIntAsNumber: true, // BigInt를 Number로 변환
  supportBigNumbers: true,
  charset: 'utf8mb4',
}

// DB 연결 설정 (특정 데이터베이스로)
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timeout: 5000,
  acquireTimeout: 5000,
  bigIntAsNumber: true, // BigInt를 Number로 변환
  supportBigNumbers: true,
  charset: 'utf8mb4',
}

// 단일 연결 생성 함수
async function createConnection(useDatabase = true) {
  try {
    const config = useDatabase ? dbConfig : adminConfig
    const conn = await mariadb.createConnection(config)
    return conn
  } catch (error) {
    console.error('❌ 데이터베이스 연결 생성 실패:', error.message)
    throw error
  }
}

// 데이터베이스 생성 함수
async function createDatabase() {
  let conn
  try {
    console.log('🏗️ 데이터베이스 생성/확인 중...')
    conn = await createConnection(false) // 데이터베이스 없이 연결

    // 데이터베이스 존재 확인
    const checkQuery = `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`
    const existingDbs = await conn.query(checkQuery, [process.env.DB_NAME])

    if (existingDbs.length === 0) {
      // 데이터베이스가 없으면 생성
      console.log(`📝 데이터베이스 '${process.env.DB_NAME}' 생성 중...`)
      const createDbQuery = `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` 
                            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      await conn.query(createDbQuery)
      console.log(`✅ 데이터베이스 '${process.env.DB_NAME}' 생성 완료`)
    } else {
      console.log(`✅ 데이터베이스 '${process.env.DB_NAME}' 이미 존재함`)
    }

    return true
  } catch (err) {
    console.error('❌ 데이터베이스 생성 실패:', err.message)
    return false
  } finally {
    if (conn) await conn.end()
  }
} // 데이터베이스 연결 테스트 함수
async function testConnection() {
  let conn
  try {
    console.log('🔌 MariaDB 서버 연결 테스트 중...')
    console.log('- 연결 정보 확인:')
    console.log('  호스트:', process.env.DB_HOST)
    console.log('  포트:', process.env.DB_PORT)
    console.log('  사용자:', process.env.DB_USER)
    console.log('  비밀번호 설정:', process.env.DB_PASSWORD ? '설정됨' : '미설정')
    console.log('  대상 DB:', process.env.DB_NAME)

    // 기본 연결 테스트 (5초 타임아웃)
    console.log('⏰ 연결 시도 중... (최대 5초 대기)')
    const startTime = Date.now()

    conn = await Promise.race([createConnection(false), new Promise((_, reject) => setTimeout(() => reject(new Error('연결 타임아웃 (5초 초과)')), 5000))])

    const connectTime = Date.now() - startTime
    console.log(`✅ MariaDB 서버 연결 성공! (${connectTime}ms)`)

    // 서버 버전 확인
    const versionResult = await conn.query('SELECT VERSION() as version')
    console.log('- 서버 버전:', versionResult[0].version)

    await conn.end()
    conn = null

    // 데이터베이스 생성/확인
    const dbCreated = await createDatabase()
    if (!dbCreated) {
      console.log('⚠️ 데이터베이스 생성/확인 실패, 기본 연결만 사용')
      return false
    }

    // 특정 데이터베이스로 연결 테스트
    console.log(`🔌 데이터베이스 '${process.env.DB_NAME}' 연결 테스트 중...`)
    conn = await Promise.race([createConnection(true), new Promise((_, reject) => setTimeout(() => reject(new Error('DB 연결 타임아웃 (5초 초과)')), 5000))])

    console.log('✅ 데이터베이스 연결 성공!')

    // 연결된 데이터베이스 확인
    const dbResult = await conn.query('SELECT DATABASE() as current_db')
    console.log('- 현재 데이터베이스:', dbResult[0].current_db)

    await conn.end()

    return true
  } catch (err) {
    console.error('❌ MariaDB 연결 실패:')
    console.error('- 오류 메시지:', err.message)
    console.error('- 오류 코드:', err.code || 'Unknown')
    console.error('- errno:', err.errno || 'Unknown')

    // 일반적인 연결 문제 해결책 제시
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 해결책: 사용자 이름 또는 비밀번호를 확인하세요.')
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.error('💡 해결책: 호스트 주소와 포트를 확인하세요.')
    } else if (err.code === 'ER_GET_CONNECTION_TIMEOUT') {
      console.error('💡 해결책: 네트워크 연결 또는 방화벽 설정을 확인하세요.')
    }

    return false
  } finally {
    if (conn) {
      try {
        await conn.end()
      } catch (releaseErr) {
        console.error('연결 해제 오류:', releaseErr.message)
      }
    }
  }
}

// 사용자 테이블 생성 함수
async function createUserTable() {
  let conn
  try {
    console.log('📋 사용자 테이블 생성/확인 중...')
    conn = await createConnection(true)

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS kakao_users (
        id BIGINT PRIMARY KEY,
        nickname VARCHAR(100),
        email VARCHAR(255),
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `

    await conn.query(createTableQuery)
    console.log('✅ kakao_users 테이블 준비 완료')

    return true
  } catch (err) {
    console.error('❌ 테이블 생성 실패:', err.message)
    return false
  } finally {
    if (conn) await conn.end()
  }
}

// 사용자 정보 저장/업데이트 함수
async function saveUser(userInfo) {
  let conn
  try {
    console.log('💾 사용자 정보 DB 저장 중...')
    conn = await createConnection(true)

    const query = `
      INSERT INTO kakao_users (id, nickname, email, profile_image, last_login)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nickname = VALUES(nickname),
        email = VALUES(email),
        profile_image = VALUES(profile_image),
        updated_at = NOW(),
        last_login = NOW()
    `

    const result = await conn.query(query, [userInfo.id, userInfo.nickname || null, userInfo.email || null, userInfo.profile_image || null])

    console.log('✅ 사용자 정보 DB 저장 완료')
    console.log('- 사용자 ID:', userInfo.id)
    console.log('- 영향받은 행:', result.affectedRows)

    return result
  } catch (err) {
    console.error('❌ 사용자 정보 저장 실패:', err.message)
    throw err
  } finally {
    if (conn) await conn.end()
  }
}

// 사용자 정보 조회 함수
async function getUser(userId) {
  let conn
  try {
    conn = await createConnection(true)

    const query = 'SELECT * FROM kakao_users WHERE id = ?'
    const rows = await conn.query(query, [userId])

    if (rows.length > 0) {
      const user = rows[0]
      // BigInt 처리
      user.id = typeof user.id === 'bigint' ? Number(user.id) : user.id
      return user
    }

    return null
  } catch (err) {
    console.error('❌ 사용자 조회 실패:', err.message)
    throw err
  } finally {
    if (conn) await conn.end()
  }
}

// 전체 사용자 목록 조회 함수
async function getAllUsers() {
  let conn
  try {
    conn = await createConnection(true)

    const query = 'SELECT id, nickname, email, created_at, last_login FROM kakao_users ORDER BY last_login DESC'
    const rows = await conn.query(query)

    // BigInt 처리를 위한 변환
    const processedRows = rows.map((row) => ({
      ...row,
      id: typeof row.id === 'bigint' ? Number(row.id) : row.id,
    }))

    return processedRows
  } catch (err) {
    console.error('❌ 사용자 목록 조회 실패:', err.message)
    throw err
  } finally {
    if (conn) await conn.end()
  }
}

// 사용자 삭제 함수
async function deleteUser(userId) {
  let conn
  try {
    conn = await createConnection(true)

    const query = 'DELETE FROM kakao_users WHERE id = ?'
    const result = await conn.query(query, [userId])

    return result.affectedRows > 0
  } catch (err) {
    console.error('❌ 사용자 삭제 실패:', err.message)
    throw err
  } finally {
    if (conn) await conn.end()
  }
}

module.exports = {
  createConnection,
  createDatabase,
  testConnection,
  createUserTable,
  saveUser,
  getUser,
  getAllUsers,
  deleteUser,
}
