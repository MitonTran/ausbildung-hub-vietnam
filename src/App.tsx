import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NewsHub from './pages/NewsHub';
import ArticleDetail from './pages/ArticleDetail';
import CenterDirectory from './pages/CenterDirectory';
import CenterDetail from './pages/CenterDetail';
import CompanyDirectory from './pages/CompanyDirectory';
import JobOrderList from './pages/JobOrderList';
import JobOrderDetail from './pages/JobOrderDetail';
import CommunityFeed from './pages/CommunityFeed';
import Pricing from './pages/Pricing';
import LoginRegister from './pages/LoginRegister';
import StudentDashboard from './pages/StudentDashboard';
import CenterDashboard from './pages/CenterDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';
import { useAuth } from './store/auth';
import type { Role } from './types';

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="news" element={<NewsHub />} />
        <Route path="news/:slug" element={<ArticleDetail />} />
        <Route path="centers" element={<CenterDirectory />} />
        <Route path="centers/:id" element={<CenterDetail />} />
        <Route path="companies" element={<CompanyDirectory />} />
        <Route path="jobs" element={<JobOrderList />} />
        <Route path="jobs/:id" element={<JobOrderDetail />} />
        <Route path="community" element={<CommunityFeed />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="login" element={<LoginRegister mode="login" />} />
        <Route path="register" element={<LoginRegister mode="register" />} />
        <Route path="dashboard/student" element={<RequireRole roles={['student']}><StudentDashboard /></RequireRole>} />
        <Route path="dashboard/center" element={<RequireRole roles={['center']}><CenterDashboard /></RequireRole>} />
        <Route path="dashboard/employer" element={<RequireRole roles={['employer']}><EmployerDashboard /></RequireRole>} />
        <Route path="admin" element={<RequireRole roles={['admin']}><AdminPanel /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
