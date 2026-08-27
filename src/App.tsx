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

type ErrorBoundaryState = { hasError: boolean };
type ErrorBoundaryProps = { children?: React.ReactNode };

class FrontendErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private readonly children: React.ReactNode;
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.children = props.children;
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500">The workspace could not render this view. Refresh and try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Refresh workspace
            </button>
          </div>
        </div>
      );
    }
    return this.children;
  }
}

const MainLayout: React.FC = () => {
  const { currentRoute, isLoggedIn, currentUser, navigateTo, workspaceNotice } = useApp();

  useEffect(() => {
    const adminOnly = currentRoute.startsWith('/admin') || currentRoute.startsWith('/dev-tools/');
    const biRestricted = currentRoute.startsWith('/bi/') && !['admin', 'supervisor', 'bi'].includes(currentUser.role);
    if (isLoggedIn && (adminOnly && currentUser.role !== 'admin' || biRestricted)) navigateTo('/agent/inbox');
  }, [currentRoute, currentUser.role, isLoggedIn, navigateTo]);

  // If user is navigating to /login or is logged out
  const isLoginRoute = currentRoute === '/login' || !isLoggedIn;
  const blockedRoute = (currentRoute.startsWith('/admin') && currentUser.role !== 'admin') || (currentRoute.startsWith('/bi/') && !['admin', 'supervisor', 'bi'].includes(currentUser.role));
  if (blockedRoute) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900">
      {workspaceNotice && <div role="status" className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-amber-900 px-4 py-3 text-xs font-semibold text-white shadow-xl"><span>{workspaceNotice}</span><button type="button" onClick={() => window.location.reload()} className="rounded bg-white/15 px-2 py-1 text-[11px] font-bold hover:bg-white/25">Refresh</button></div>}
      {/* View router switch */}
      {isLoginRoute ? (
        <LoginView />
      ) : (
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <SidebarNav />
          <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
            <Header />

            {/* Dynamic Center/Right Area based on Route Hierarchy */}
            {(currentRoute === '/agent/summary' || currentRoute === '/admin/summary/all' || currentRoute === '/admin/summary/agents') ? (
              <AgentSummaryView />
            ) : currentRoute === '/agent/team' ? (
              <TeamAgentsView />
            ) : currentRoute.startsWith('/bi/') ? (
              <BIPortal />
            ) : currentRoute.startsWith('/admin') ? (
              <AdminPortal />
            ) : (
              /* Agent Panel: 3-column Layout matching reference screenshot (/agent/inbox, /agent/assigned, /agent/bookmarked) */
              <main className="flex min-h-0 flex-1 min-w-0 overflow-hidden">
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
      <FrontendErrorBoundary>
        <MainLayout />
      </FrontendErrorBoundary>
    </AppProvider>
  );
}
