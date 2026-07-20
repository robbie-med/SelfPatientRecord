import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Inbox from './pages/Inbox';
import Timeline from './pages/Timeline';
import Labs from './pages/Labs';
import Meds from './pages/Meds';
import Prevention from './pages/Prevention';
import Imaging from './pages/Imaging';
import AskMyRecord from './pages/AskMyRecord';
import Settings from './pages/Settings';
import Supplements from './pages/Supplements';
import Illness from './pages/Illness';
import MedAdminLog from './pages/MedAdminLog';
import Attachments from './pages/Attachments';
import Reminders from './pages/Reminders';

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
        <Route path="imaging" element={<Imaging />} />
        <Route path="ask" element={<AskMyRecord />} />
        <Route path="settings" element={<Settings />} />
        <Route path="supplements" element={<Supplements />} />
        <Route path="illness" element={<Illness />} />
        <Route path="med-log" element={<MedAdminLog />} />
        <Route path="attachments" element={<Attachments />} />
        <Route path="reminders" element={<Reminders />} />
      </Route>
    </Routes>
  );
}
