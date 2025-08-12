import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthContext';
import { CollaborationProvider } from './modules/collaboration/CollaborationProvider';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { LoginPage } from './modules/auth/LoginPage';
import { Dashboard } from './modules/dashboard/Dashboard';
import { ActivityPlannerPage } from './modules/activity/ActivityPlannerPage';
import { CollaborativePlanningPage } from './modules/collaboration/CollaborativePlanningPage';
import { BillSplitterPage } from './modules/billsplitter/BillSplitterPage';
import { BirthdayPage } from './modules/birthday/BirthdayPage';
import { BudgetPage } from './modules/budget/BudgetPage';
import { CodeMoodPage } from './modules/codemood/CodeMoodPage';
import { EventGridPage } from './modules/eventgrid/EventGridPage';
import { MeetingMindPage } from './modules/meetingmind/MeetingMindPage';
import { MemoryLanePage } from './modules/memorylane/MemoryLanePage';
import { SkillSwapPage } from './modules/skillswap/SkillSwapPage';
import { StoryCraftPage } from './modules/storycraft/StoryCraftPage';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { TeamsPage } from './modules/teams/TeamsPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { BountyPage } from './modules/bounty/BountyPage';
import './theme.css';
import './styles.css';
import './ui-fixes.css';
import 'animate.css/animate.min.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CollaborationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/activity-planner" element={<ProtectedRoute><ActivityPlannerPage /></ProtectedRoute>} />
            <Route path="/collaborate" element={<ProtectedRoute><CollaborativePlanningPage /></ProtectedRoute>} />
            <Route path="/collaborate/:sessionId" element={<ProtectedRoute><CollaborativePlanningPage /></ProtectedRoute>} />
            <Route path="/billsplitter" element={<ProtectedRoute><BillSplitterPage /></ProtectedRoute>} />
            <Route path="/birthday" element={<ProtectedRoute><BirthdayPage /></ProtectedRoute>} />
            <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
            <Route path="/codemood" element={<ProtectedRoute><CodeMoodPage /></ProtectedRoute>} />
            <Route path="/eventgrid" element={<ProtectedRoute><EventGridPage /></ProtectedRoute>} />
            <Route path="/meetingmind" element={<ProtectedRoute><MeetingMindPage /></ProtectedRoute>} />
            <Route path="/memorylane" element={<ProtectedRoute><MemoryLanePage /></ProtectedRoute>} />
            <Route path="/skillswap" element={<ProtectedRoute><SkillSwapPage /></ProtectedRoute>} />
            <Route path="/bounty" element={<ProtectedRoute><BountyPage /></ProtectedRoute>} />
            <Route path="/storycraft" element={<ProtectedRoute><StoryCraftPage /></ProtectedRoute>} />
            <Route path="/storycraft/:id" element={<ProtectedRoute><StoryCraftPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CollaborationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 