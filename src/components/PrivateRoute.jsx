import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  // *จำลอง* ว่า Login แล้ว (เดี๋ยวเราค่อยเปลี่ยนเป็น Firebase Auth ของจริง)
  const isAuth = true; 

  return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;