// App.jsx decides which page to show for each web address (route).
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportEmergency from './pages/ReportEmergency';
import MyIncidents from './pages/MyIncidents';
import DispatcherDashboard from './pages/DispatcherDashboard';
import ResponderDashboard from './pages/ResponderDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Citizen pages */}
        <Route
          path="/report"
          element={
            <ProtectedRoute roles={['citizen']}>
              <ReportEmergency />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-incidents"
          element={
            <ProtectedRoute roles={['citizen']}>
              <MyIncidents />
            </ProtectedRoute>
          }
        />

        {/* Dispatcher pages */}
        <Route
          path="/dispatcher"
          element={
            <ProtectedRoute roles={['dispatcher']}>
              <DispatcherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Responder pages */}
        <Route
          path="/responder"
          element={
            <ProtectedRoute roles={['responder']}>
              <ResponderDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin pages */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<h2 className="container">Page not found</h2>} />
      </Routes>
    </>
  );
}

export default App;