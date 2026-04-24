import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

interface GapSpec {
  gap_type: string;
  title: string;
  description: string;
  urgency: string;
}

export async function detectCareGaps(patientId: string): Promise<void> {
  const [patient] = await db.select().from(schema.patients)
    .where(eq(schema.patients.id, patientId)).limit(1);
  if (!patient) return;

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const sex = patient.sex_at_birth ?? 'unknown';

  const existingGaps = await db.select({ gap_type: schema.care_gaps.gap_type })
    .from(schema.care_gaps)
    .where(and(eq(schema.care_gaps.patient_id, patientId), eq(schema.care_gaps.status, 'open')));
  const openTypes = new Set(existingGaps.map(g => g.gap_type));

  const conditions = await db.select({ name: schema.conditions.name })
    .from(schema.conditions)
    .where(and(eq(schema.conditions.patient_id, patientId), eq(schema.conditions.status, 'active')));

  const meds = await db.select({ name: schema.medications.name })
    .from(schema.medications)
    .where(and(eq(schema.medications.patient_id, patientId), eq(schema.medications.status, 'current')));

  const labs = await db.select({
    test_name: schema.labs.test_name,
    value: schema.labs.value,
    collection_date: schema.labs.collection_date,
  }).from(schema.labs).where(eq(schema.labs.patient_id, patientId));

  const vitals = await db.select({ vital_type: schema.vitals.vital_type })
    .from(schema.vitals).where(eq(schema.vitals.patient_id, patientId));

  const condNames = conditions.map(c => c.name.toLowerCase());
  const labNames = labs.map(l => l.test_name.toLowerCase());
  const vitalTypes = vitals.map(v => v.vital_type.toLowerCase());

  const pending: GapSpec[] = [];

  const add = (spec: GapSpec) => {
    if (!openTypes.has(spec.gap_type)) pending.push(spec);
  };

  // ── A1c-based gaps ────────────────────────────────────────────────────────
  const a1cLabs = labs
    .filter(l => /a1c|hba1c|hemoglobin a1c/i.test(l.test_name))
    .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime());
  const latestA1c = a1cLabs[0];

  if (latestA1c) {
    const val = parseFloat(latestA1c.value);
    if (!isNaN(val)) {
      if (val >= 6.5) {
        if (!condNames.some(c => /retinopathy|diabetic eye/.test(c))) {
          add({ gap_type: 'diabetes_eye_exam', title: 'Annual Diabetic Eye Exam', description: 'Patients with diabetes should have annual dilated eye exams to screen for retinopathy.', urgency: 'soon' });
        }
        if (!labNames.some(l => /urine albumin|microalbumin|egfr|creatinine/.test(l))) {
          add({ gap_type: 'diabetes_kidney_screen', title: 'Diabetic Kidney Disease Screening', description: 'Annual urine albumin and eGFR testing recommended for patients with diabetes.', urgency: 'routine' });
        }
        add({ gap_type: 'diabetes_foot_exam', title: 'Annual Diabetic Foot Exam', description: 'Patients with diabetes should have an annual comprehensive foot exam.', urgency: 'routine' });
      } else if (val >= 5.7) {
        add({ gap_type: 'prediabetes_lifestyle', title: 'Prediabetes: Lifestyle Intervention', description: 'Your A1c indicates prediabetes. A CDC-recognized lifestyle change program can reduce your risk of developing type 2 diabetes.', urgency: 'soon' });
      }
    }
  }

  // ── Colorectal cancer screening (age 45–75) ───────────────────────────────
  if (age !== null && age >= 45 && age <= 75) {
    const hasScreen = labNames.some(l => /colonoscopy|cologuard|fit|fobt|stool dna|colorectal/.test(l))
      || condNames.some(c => /colonoscopy|colorectal screen/.test(c));
    if (!hasScreen) {
      add({ gap_type: 'colorectal_screening', title: 'Colorectal Cancer Screening', description: 'Adults aged 45–75 should be screened for colorectal cancer. Options include colonoscopy, stool DNA test (Cologuard), or annual FIT.', urgency: 'routine' });
    }
  }

  // ── Breast cancer screening (female, age 40–74) ───────────────────────────
  if ((sex === 'female' || sex === 'intersex') && age !== null && age >= 40 && age <= 74) {
    const hasMammo = labNames.some(l => /mammogram|mammography/.test(l))
      || condNames.some(c => /mammogram|mammography/.test(c));
    if (!hasMammo) {
      add({ gap_type: 'breast_cancer_screening', title: 'Mammography Screening', description: 'Women aged 40–74 should have mammography every 2 years. Discuss timing and frequency with your doctor.', urgency: 'routine' });
    }
  }

  // ── Cervical cancer screening (female, age 21–65) ─────────────────────────
  if ((sex === 'female' || sex === 'intersex') && age !== null && age >= 21 && age <= 65) {
    const hasPap = labNames.some(l => /pap|cervical|hpv/.test(l))
      || condNames.some(c => /pap smear|cervical screen/.test(c));
    if (!hasPap) {
      add({ gap_type: 'cervical_cancer_screening', title: 'Cervical Cancer Screening (Pap Smear)', description: 'Women 21–65 should have Pap smear every 3 years, or Pap + HPV co-test every 5 years (age 30–65).', urgency: 'routine' });
    }
  }

  // ── Lipid panel (age 35+ male, 45+ female) ───────────────────────────────
  const lipidAgeThreshold = sex === 'male' ? 35 : 45;
  if (age !== null && age >= lipidAgeThreshold) {
    const hasLipids = labNames.some(l => /cholesterol|ldl|hdl|triglyceride|lipid panel/.test(l));
    if (!hasLipids) {
      add({ gap_type: 'lipid_screening', title: 'Cholesterol / Lipid Panel', description: 'No lipid panel on record. Screening for high cholesterol is recommended for adults at cardiovascular risk.', urgency: 'routine' });
    }
  }

  // ── Blood pressure (age 18+, no BP vital recorded) ───────────────────────
  if (age !== null && age >= 18) {
    const hasBP = vitalTypes.some(v => /blood pressure|bp|systolic|diastolic/.test(v));
    if (!hasBP) {
      add({ gap_type: 'blood_pressure_check', title: 'Blood Pressure Check', description: 'No blood pressure reading recorded. Adults 18+ should have BP checked at least every 1–2 years.', urgency: 'routine' });
    }
  }

  // ── Anticoagulation: INR monitoring ──────────────────────────────────────
  const onWarfarin = meds.some(m => /warfarin|coumadin/.test(m.name.toLowerCase()));
  if (onWarfarin && !labNames.some(l => /inr|prothrombin|pt\/inr/.test(l))) {
    add({ gap_type: 'inr_monitoring', title: 'INR Monitoring for Warfarin', description: 'Patients on warfarin require regular INR checks to ensure safe anticoagulation levels.', urgency: 'urgent' });
  }

  if (!pending.length) return;

  const now = new Date().toISOString();
  await db.insert(schema.care_gaps).values(
    pending.map(g => ({
      id: uuid(),
      patient_id: patientId,
      gap_type: g.gap_type,
      title: g.title,
      description: g.description,
      urgency: g.urgency,
      status: 'open',
      detected_at: now,
    }))
  );

  console.log(`[care-gaps] Detected ${pending.length} new care gap(s).`);
}
