import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Creators from './pages/Creators';
import CreatorDetail from './pages/CreatorDetail';
import ReviewQueue from './pages/ReviewQueue';
import Outreach from './pages/Outreach';
import Conversations from './pages/Conversations';
import Meetings from './pages/Meetings';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Brands from './pages/Brands';

// Temporary placeholders for missing pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full text-gray-400">
    <h2 className="text-xl font-medium">{title} Page (Under Construction)</h2>
  </div>
);

import { Outlet } from 'react-router-dom';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/creators/:id" element={<CreatorDetail />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/users" element={<Users />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/analytics" element={<Placeholder title="Analytics" />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
