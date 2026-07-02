import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { DiscoveryProvider } from './contexts/DiscoveryContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import React, { Suspense } from 'react';
import { LoadingState } from './components/ui/LoadingState';
import { RouteErrorBoundary, clearChunkReloadGuard } from './components/ui/RouteErrorBoundary';
import { RouteFocusManager } from './components/a11y/RouteFocusManager';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Campaigns = React.lazy(() => import('./pages/Campaigns'));
const CampaignDetail = React.lazy(() => import('./pages/CampaignDetail'));
const Creators = React.lazy(() => import('./pages/Creators'));
const CreatorDetail = React.lazy(() => import('./pages/CreatorDetail'));
const ReviewQueue = React.lazy(() => import('./pages/ReviewQueue'));
const Outreach = React.lazy(() => import('./pages/Outreach'));
const Conversations = React.lazy(() => import('./pages/Conversations'));
const Meetings = React.lazy(() => import('./pages/Meetings'));
const Login = React.lazy(() => import('./pages/Login'));
const AffiliatePerformance = React.lazy(() => import('./pages/AffiliatePerformance'));
const AcceptInvite = React.lazy(() => import('./pages/AcceptInvite'));
const Users = React.lazy(() => import('./pages/Users'));
const UserDetail = React.lazy(() => import('./pages/UserDetail'));
const Clients = React.lazy(() => import('./pages/Clients'));
const ClientDetail = React.lazy(() => import('./pages/ClientDetail'));
const Brands = React.lazy(() => import('./pages/Brands'));
const BrandDetail = React.lazy(() => import('./pages/BrandDetail'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Partnerships = React.lazy(() => import('./pages/Partnerships'));
const PartnershipDetail = React.lazy(() => import('./pages/PartnershipDetail'));
const Shipments = React.lazy(() => import('./pages/Shipments'));
const ShipmentDetail = React.lazy(() => import('./pages/ShipmentDetail'));
const Content = React.lazy(() => import('./pages/Content'));
const ContentDetail = React.lazy(() => import('./pages/ContentDetail'));
const AcceptOffer = React.lazy(() => import('./pages/AcceptOffer'));
const ProvideAddress = React.lazy(() => import('./pages/ProvideAddress'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const AnalyticsDetail = React.lazy(() => import('./pages/AnalyticsDetail'));
const CreatorCampaignContentDetail = React.lazy(
  () => import('./pages/CreatorCampaignContentDetail'),
);

// Temporary placeholders for missing pages

import { Outlet } from 'react-router-dom';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <DiscoveryProvider>
      <MainLayout>
        <RouteErrorBoundary>
          <Suspense
            fallback={
              <div className="py-24">
                <LoadingState message="Loading page..." />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </MainLayout>
    </DiscoveryProvider>
  </ProtectedRoute>
);

export default function App() {
  React.useEffect(() => clearChunkReloadGuard(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Router>
              <RouteFocusManager />
              <Suspense
                fallback={
                  <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                    <LoadingState message="Loading page..." />
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Login />} />
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
                    <Route
                      path="/content/creator-campaign/:creatorId/:campaignId"
                      element={<CreatorCampaignContentDetail />}
                    />
                    <Route path="/affiliate" element={<AffiliatePerformance />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route
                      path="/analytics/creator-campaign/:creatorId/:campaignId"
                      element={<AnalyticsDetail />}
                    />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
