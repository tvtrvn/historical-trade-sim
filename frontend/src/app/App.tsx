import { Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/features/landing/LandingPage';
import { BuilderPage } from '@/features/builder/BuilderPage';
import { ResultsPage } from '@/features/results/ResultsPage';
import { SavedPage } from '@/features/saved/SavedPage';
import { ComparePage } from '@/features/compare/ComparePage';
import { MethodologyPage } from '@/features/methodology/MethodologyPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/results/:id" element={<ResultsPage />} />
        <Route path="/scenarios" element={<SavedPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
      </Route>
    </Routes>
  );
}
