import { useEffect } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { GapBoardScreen } from './screens/GapBoardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PrivacyScreen, TermsScreen } from './screens/LegalScreens';
import { PlanScreen } from './screens/PlanScreen';
import { ProviderScheduleScreen } from './screens/ProviderScheduleScreen';
import { ProvidersScreen } from './screens/ProvidersScreen';
import { SetupScreen } from './screens/SetupScreen';
import { StudentDetailScreen } from './screens/StudentDetailScreen';
import { StudentsScreen } from './screens/StudentsScreen';
import { TrackerScreen } from './screens/TrackerScreen';
import { emptyWorkspace } from './domain/types';
import { useWorkspaceStore } from './store/useWorkspaceStore';

const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/board" replace /> },
      { path: '/home', element: <HomeScreen /> },
      { path: '/board', element: <GapBoardScreen /> },
      { path: '/plan', element: <PlanScreen /> },
      { path: '/my-schedule', element: <ProviderScheduleScreen /> },
      { path: '/my-schedule/:providerId', element: <ProviderScheduleScreen /> },
      { path: '/students', element: <StudentsScreen /> },
      { path: '/students/:studentId', element: <StudentDetailScreen /> },
      { path: '/providers', element: <ProvidersScreen /> },
      { path: '/providers/:providerId', element: <ProvidersScreen /> },
      { path: '/setup', element: <SetupScreen /> },
      { path: '/tracker', element: <TrackerScreen /> },
      { path: '/terms', element: <TermsScreen /> },
      { path: '/privacy', element: <PrivacyScreen /> },
    ],
  },
]);

export default function App() {
  const loaded = useWorkspaceStore((s) => s.loaded);
  const isFresh = useWorkspaceStore((s) => s.isFresh);
  const init = useWorkspaceStore((s) => s.init);
  const replaceWorkspace = useWorkspaceStore((s) => s.replaceWorkspace);

  useEffect(() => {
    void init();
  }, [init]);

  // First launch: no welcome gate - create a blank school and land on the
  // guide, where "Start with sample data" is still one click away.
  useEffect(() => {
    if (loaded && isFresh) {
      window.location.hash = '#/home';
      replaceWorkspace(emptyWorkspace());
    }
  }, [loaded, isFresh, replaceWorkspace]);

  if (!loaded || isFresh) return null;
  return <RouterProvider router={router} />;
}
