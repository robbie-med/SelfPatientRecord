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
import Surgeries from './pages/Surgeries';
import Implants from './pages/Implants';
import EquipmentPage from './pages/EquipmentPage';
import Sensitivities from './pages/Sensitivities';
import SexEvents from './pages/SexEvents';
import PregnancyOutcomes from './pages/PregnancyOutcomes';
import Ultrasounds from './pages/Ultrasounds';
import Micronutrients from './pages/Micronutrients';
import AccessDevices from './pages/AccessDevices';
import KickCounter from './pages/KickCounter';
import Contractions from './pages/Contractions';
import Pregnancies from './pages/Pregnancies';
import Screenings from './pages/Screenings';
import BirthPlans from './pages/BirthPlans';
import FeedingLog from './pages/FeedingLog';
import JaundiceTracker from './pages/JaundiceTracker';
import DialysisSessions from './pages/DialysisSessions';
import CycleTracker from './pages/CycleTracker';
import LhTests from './pages/LhTests';
import PregnancyTests from './pages/PregnancyTests';
import MoodJournal from './pages/MoodJournal';
import Experiments from './pages/Experiments';

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
        <Route path="surgeries" element={<Surgeries />} />
        <Route path="implants" element={<Implants />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="sensitivities" element={<Sensitivities />} />
        <Route path="sex-events" element={<SexEvents />} />
        <Route path="pregnancy-outcomes" element={<PregnancyOutcomes />} />
        <Route path="ultrasounds" element={<Ultrasounds />} />
        <Route path="micronutrients" element={<Micronutrients />} />
        <Route path="lines" element={<AccessDevices />} />
        <Route path="kick-counter" element={<KickCounter />} />
        <Route path="contractions" element={<Contractions />} />
        <Route path="pregnancies" element={<Pregnancies />} />
        <Route path="screenings" element={<Screenings />} />
        <Route path="birth-plans" element={<BirthPlans />} />
        <Route path="feeding-log" element={<FeedingLog />} />
        <Route path="jaundice" element={<JaundiceTracker />} />
        <Route path="dialysis" element={<DialysisSessions />} />
        <Route path="cycle-tracker" element={<CycleTracker />} />
        <Route path="lh-tests" element={<LhTests />} />
        <Route path="pregnancy-tests" element={<PregnancyTests />} />
        <Route path="mood" element={<MoodJournal />} />
        <Route path="experiments" element={<Experiments />} />
      </Route>
    </Routes>
  );
}
