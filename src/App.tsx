import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DiscoveryProvider } from './contexts/DiscoveryContext';
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
import AffiliatePerformance from './pages/AffiliatePerformance';
import AcceptInvite from './pages/AcceptInvite';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Brands from './pages/Brands';
import BrandDetail from './pages/BrandDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import Partnerships from './pages/Partnerships';
import PartnershipDetail from './pages/PartnershipDetail';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Content from './pages/Content';
import ContentDetail from './pages/ContentDetail';
import AcceptOffer from './pages/AcceptOffer';
import ProvideAddress from './pages/ProvideAddress';
import Analytics from './pages/Analytics';
import AnalyticsDetail from './pages/AnalyticsDetail';
import CreatorCampaignContentDetail from './pages/CreatorCampaignContentDetail';

// Temporary placeholders for missing pages

import { Outlet } from 'react-router-dom';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <DiscoveryProvider>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </DiscoveryProvider>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-offer/:id" element={<AcceptOffer />} />
          <Route path="/provide-address/:id" element={<ProvideAddress />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/my-creators" element={<Creators onlyEngaged={true} />} />
            <Route path="/creators/:id" element={<CreatorDetail />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/brands/:id" element={<BrandDetail />} />
            <Route path="/partnerships" element={<Partnerships />} />
            <Route path="/partnerships/:id" element={<PartnershipDetail />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/shipments/:id" element={<ShipmentDetail />} />
            <Route path="/content" element={<Content />} />
            <Route path="/content/:id" element={<ContentDetail />} />
            <Route path="/content/creator-campaign/:creatorId/:campaignId" element={<CreatorCampaignContentDetail />} />
            <Route path="/affiliate" element={<AffiliatePerformance />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/analytics/creator-campaign/:creatorId/:campaignId" element={<AnalyticsDetail />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
