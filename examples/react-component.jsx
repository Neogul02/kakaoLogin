// React 앱에서 사용할 수 있는 카카오 로그인 컴포넌트 예제

import React, { useState, useEffect } from 'react';

const KakaoLogin = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // API 서버 URL (실제 배포된 도메인으로 변경)
  const API_BASE_URL = 'https://your-api-domain.run.goorm.site';

  // 컴포넌트 마운트 시 로그인 상태 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 로그인 상태 확인
  const checkLoginStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
        credentials: 'include', // 쿠키 포함
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        console.log('로그인된 사용자:', data.user);
      } else {
        setUser(null);
        console.log('로그인되지 않음');
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 카카오 로그인 시작
  const handleKakaoLogin = async () => {
    try {
      // 카카오 로그인 URL 획득
      const response = await fetch(`${API_BASE_URL}/api/auth/kakao`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // 카카오 로그인 페이지로 리다이렉트
        window.location.href = data.authUrl;
      } else {
        throw new Error('로그인 URL 획득 실패');
      }
    } catch (error) {
      console.error('카카오 로그인 오류:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        setUser(null);
        alert('로그아웃되었습니다.');
      } else {
        throw new Error('로그아웃 실패');
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃에 실패했습니다.');
    }
  };

  // 사용자 목록 조회 (관리자 기능)
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('전체 사용자 목록:', data.users);
        return data.users;
      } else {
        throw new Error('사용자 목록 조회 실패');
      }
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>로그인 상태 확인 중...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>카카오 로그인 테스트</h2>
      
      {user ? (
        // 로그인 상태
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>로그인 성공! 👋</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>사용자 ID:</strong> {user.id}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>닉네임:</strong> {user.nickname || '없음'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>이메일:</strong> {user.email || '비공개'}
          </div>
          {user.profile_image && (
            <div style={{ marginBottom: '10px' }}>
              <strong>프로필 이미지:</strong>
              <br />
              <img 
                src={user.profile_image} 
                alt="프로필" 
                style={{ width: '60px', height: '60px', borderRadius: '50%', marginTop: '5px' }}
              />
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <strong>로그인 시간:</strong> {new Date(user.login_time).toLocaleString()}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleLogout}
              style={{
                backgroundColor: '#fee500',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              로그아웃
            </button>
            
            <button 
              onClick={fetchUsers}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              사용자 목록 조회 (콘솔 확인)
            </button>
          </div>
        </div>
      ) : (
        // 로그아웃 상태
        <div style={{ textAlign: 'center' }}>
          <p>카카오 로그인을 통해 서비스를 이용하세요.</p>
          <button 
            onClick={handleKakaoLogin}
            style={{
              backgroundColor: '#fee500',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto'
            }}
          >
            <span>🍋</span>
            카카오로 로그인
          </button>
        </div>
      )}

      {/* API 테스트 섹션 */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>API 테스트</h4>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p><strong>API 서버:</strong> {API_BASE_URL}</p>
          <p><strong>사용 가능한 엔드포인트:</strong></p>
          <ul style={{ textAlign: 'left', margin: '10px 0' }}>
            <li>GET /api/auth/kakao - 카카오 로그인 URL</li>
            <li>GET /api/auth/user - 현재 사용자 정보</li>
            <li>POST /api/auth/logout - 로그아웃</li>
            <li>GET /api/users - 전체 사용자 목록</li>
            <li>GET /health - 서버 상태 확인</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KakaoLogin;

/*
사용법:

1. React 프로젝트에서 이 컴포넌트를 import
2. API_BASE_URL을 실제 배포된 API 서버 주소로 변경
3. 컴포넌트를 페이지에 렌더링

예시:
import KakaoLogin from './components/KakaoLogin';

function App() {
  return (
    <div className="App">
      <KakaoLogin />
    </div>
  );
}

주의사항:
- CORS 설정이 올바르게 되어있는지 확인
- credentials: 'include' 옵션으로 쿠키가 전송되도록 설정
- API 서버의 환경변수에 React 앱 도메인이 ALLOWED_ORIGINS에 포함되어 있는지 확인
*/