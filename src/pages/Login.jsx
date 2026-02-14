import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // ตรงนี้เดี๋ยวใส่โค้ด Firebase Login ทีหลัง
    alert("จำลองการ Login สำเร็จ");
    navigate('/'); // ส่งไปหน้า Home
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Yommarat Drug List</h1>
      <div className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-xl mb-4 text-center">เข้าสู่ระบบ</h2>
        <button 
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
};

export default Login;