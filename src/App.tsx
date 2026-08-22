import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { SidebarNav } from './components/layout/SidebarNav';
import { LoginView } from './components/auth/LoginView';
import { ConversationList } from './components/agent/ConversationList';
import { ChatWindow } from './components/agent/ChatWindow';
import { RightPanel } from './components/agent/RightPanel';
import { AdminPortal } from './components/admin/AdminPortal';
import { TeamAgentsView } from './components/agent/TeamAgentsView';
import { BIPortal } from './components/bi/BIPortal';
import { AgentSummaryView } from './components/agent/AgentSummaryView';

const MainLayout: React.FC = () => {
  const { currentRoute, isLoggedIn, currentUser, navigateTo } = useApp();

  useEffect(() => {
    const adminOnly = currentRoute.startsWith('/admin') || currentRoute.startsWith('/dev-tools/');
    const biRestricted = currentRoute.startsWith('/bi/') && currentRoute !== '/bi/summary' && !['admin', 'supervisor', 'bi'].includes(currentUser.role);
    if (isLoggedIn && (adminOnly && currentUser.role !== 'admin' || biRestricted)) navigateTo('/agent/inbox');
  }, [currentRoute, currentUser.role, isLoggedIn, navigateTo]);

  // If user is navigating to /login or is logged out
  const isLoginRoute = currentRoute === '/login' || !isLoggedIn;
  const blockedRoute = (currentRoute.startsWith('/admin') && currentUser.role !== 'admin') || (currentRoute.startsWith('/bi/') && currentRoute !== '/bi/summary' && !['admin', 'supervisor', 'bi'].includes(currentUser.role));
  if (blockedRoute) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* View router switch */}
      {isLoginRoute ? (
        <LoginView />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Operational App Header */}
          <Header />

          {/* Core Shell Body */}
          <div className="flex-1 flex min-w-0 overflow-hidden">
            {/* Left Vertical Icon Bar */}
            <SidebarNav />

            {/* Dynamic Center/Right Area based on Route Hierarchy */}
            {currentRoute === '/agent/summary' ? (
              <AgentSummaryView />
            ) : currentRoute === '/agent/team' ? (
              <TeamAgentsView />
            ) : currentRoute.startsWith('/bi/') ? (
              <BIPortal />
            ) : currentRoute.startsWith('/admin') ? (
              <AdminPortal />
            ) : (
              /* Agent Panel: 3-column Layout matching reference screenshot (/agent/inbox, /agent/assigned, /agent/bookmarked) */
              <main className="flex-1 flex min-w-0 overflow-hidden">
                <ConversationList />
                <ChatWindow />
                <RightPanel />
              </main>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
