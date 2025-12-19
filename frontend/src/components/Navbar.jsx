import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'student') return '/student/dashboard';
    if (user.role === 'mentor') return '/mentor/dashboard';
    if (user.role === 'admin') return '/admin/panel';
    return null;
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <Link
            to={isAuthenticated && getDashboardLink() ? getDashboardLink() : '/'}
            className="navbar-brand"
          >
            LMS
            <span>Learning Platform</span>
          </Link>
          <div className="nav-links">
            {isAuthenticated && getDashboardLink() && (
              <NavLink
                to={getDashboardLink()}
                className={({ isActive }) => (isActive ? 'nav-active' : '')}
              >
                Dashboard
              </NavLink>
            )}
            {/* {user?.role === 'admin' && (
              <NavLink
                to="/admin/panel"
                className={({ isActive }) => (isActive ? 'nav-active' : '')}
              >
                Admin
              </NavLink>
            )} */}
          </div>
        </div>
        <div className="navbar-right">
          {isAuthenticated ? (
            <>
              <div className="navbar-user">
                {user.name} &nbsp;·&nbsp; {user.role}
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="nav-links">
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'nav-active' : '')}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? 'nav-active' : '')}
              >
                Student Register
              </NavLink>
              <NavLink
                to="/register/mentor"
                className={({ isActive }) => (isActive ? 'nav-active' : '')}
              >
                Mentor Register
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
