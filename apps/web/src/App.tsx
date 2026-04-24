import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Inbox from './pages/Inbox';
import Timeline from './pages/Timeline';
import Labs from './pages/Labs';
import Meds from './pages/Meds';
import Prevention from './pages/Prevention';
import AskMyRecord from './pages/AskMyRecord';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="labs" element={<Labs />} />
        <Route path="meds" element={<Meds />} />
        <Route path="prevention" element={<Prevention />} />
        <Route path="ask" element={<AskMyRecord />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
