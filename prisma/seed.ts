import { PrismaClient, ParameterInputType, TestType, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Patholab Cloud MEGA Database Seeding...');

  // ==========================================
  // 1. CREATE MASTER LAB & ADMIN USER
  // ==========================================
  console.log('🏢 Creating Master Lab & Admin...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@patholab.cloud' },
    update: {},
    create: {
      email: 'admin@patholab.cloud',
      password: hashedPassword,
      name: 'Dr. Admin',
      phone: '9876543210',
      role: 'SUPER_ADMIN',
      isActive: true,
      onboardingStatus: 'COMPLETED',
    },
  });

  const mainLab = await prisma.lab.upsert({
    where: { ownerId: adminUser.id },
    update: {},
    create: {
      name: 'Globiz Master Lab',
      labCode: 'GLO',
      address: 'Assam Water Centre Area',
      city: 'Guwahati',
      state: 'Assam',
      pincode: '781001',
      phone: '9876543210',
      email: 'lab@patholab.cloud',
      licenseNumber: 'LIC-MASTER-001',
      ownerId: adminUser.id,
    },
  });

  const labId = mainLab.id;

  // ==========================================
  // 2. DICTIONARIES
  // ==========================================
  console.log('🧪 Creating Clinical Departments & Containers...');
  
  const depts = [
    'Hematology', 'Biochemistry', 'Immunology & Serology', 'Clinical Pathology', 
    'Microbiology', 'Endocrinology', 'Molecular Biology', 'Coagulation', 'Cytology'
  ];
  const dbDepts: Record<string, string> = {};
  for (const name of depts) {
    const d = await prisma.department.upsert({ 
      where: { labId_name: { labId, name } }, update: { isGlobal: true }, create: { labId, name, isGlobal: true } 
    });
    dbDepts[name] = d.id;
  }

  const samples = ['Whole Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Sputum', 'CSF', 'Swab', 'Semen'];
  const dbSamples: Record<string, string> = {};
  for (const name of samples) {
    const s = await prisma.sampleType.upsert({ 
      where: { labId_name: { labId, name } }, update: { isGlobal: true }, create: { labId, name, isGlobal: true } 
    });
    dbSamples[name] = s.id;
  }

  const containers = [
    { name: 'EDTA Tube', code: 'EDTA', capColor: '#6b21a8' }, // Purple
    { name: 'SST Tube (Gel)', code: 'SST', capColor: '#eab308' }, // Yellow
    { name: 'Plain Tube', code: 'PLAIN', capColor: '#dc2626' }, // Red
    { name: 'Fluoride Tube', code: 'FLUORIDE', capColor: '#94a3b8' }, // Grey
    { name: 'Citrate Tube', code: 'CITRATE', capColor: '#38bdf8' }, // Light Blue
    { name: 'Heparin Tube', code: 'HEPARIN', capColor: '#22c55e' }, // Green
    { name: 'Sterile Container', code: 'STERILE', capColor: '#ffffff' }, // White
  ];
  const dbContainers: Record<string, string> = {};
  for (const c of containers) {
    const dbC = await prisma.containerType.upsert({ 
      where: { labId_name: { labId, name: c.name } }, update: { isGlobal: true }, create: { labId, name: c.name, code: c.code, capColor: c.capColor, isGlobal: true } 
    });
    dbContainers[c.name] = dbC.id;
  }

  // ==========================================
  // 3. PARAMETERS MASTER LIST
  // ==========================================
  console.log('🔬 Generating 200+ Master Clinical Parameters...');

  const parametersList = [
    // --- HEMATOLOGY (CBC & ESR) ---
    { name: 'Hemoglobin (Hb)', code: 'P_HB', unit: 'g/dL', min: 12.0, max: 16.5, container: 'EDTA Tube' },
    { name: 'Total RBC Count', code: 'P_RBC', unit: 'mill/cumm', min: 4.5, max: 5.5, container: 'EDTA Tube' },
    { name: 'Packed Cell Volume (PCV)', code: 'P_PCV', unit: '%', min: 36.0, max: 46.0, container: 'EDTA Tube' },
    { name: 'Mean Corpuscular Volume (MCV)', code: 'P_MCV', unit: 'fL', min: 80.0, max: 100.0, container: 'EDTA Tube', formula: '(P_PCV * 10) / P_RBC' },
    { name: 'Mean Corpuscular Hb (MCH)', code: 'P_MCH', unit: 'pg', min: 27.0, max: 32.0, container: 'EDTA Tube', formula: '(P_HB * 10) / P_RBC' },
    { name: 'Mean Corpuscular Hb Conc (MCHC)', code: 'P_MCHC', unit: 'g/dL', min: 31.5, max: 34.5, container: 'EDTA Tube', formula: '(P_HB * 100) / P_PCV' },
    { name: 'Red Cell Distribution Width (RDW-CV)', code: 'P_RDW_CV', unit: '%', min: 11.6, max: 14.0, container: 'EDTA Tube' },
    { name: 'Total WBC Count', code: 'P_WBC', unit: '/cumm', min: 4000, max: 11000, container: 'EDTA Tube' },
    { name: 'Neutrophils', code: 'P_NEUTRO', unit: '%', min: 40, max: 80, container: 'EDTA Tube' },
    { name: 'Lymphocytes', code: 'P_LYMPHO', unit: '%', min: 20, max: 40, container: 'EDTA Tube' },
    { name: 'Monocytes', code: 'P_MONO', unit: '%', min: 2, max: 10, container: 'EDTA Tube' },
    { name: 'Eosinophils', code: 'P_EOSINO', unit: '%', min: 1, max: 6, container: 'EDTA Tube' },
    { name: 'Basophils', code: 'P_BASO', unit: '%', min: 0, max: 2, container: 'EDTA Tube' },
    { name: 'Absolute Neutrophil Count (ANC)', code: 'P_ANC', unit: '/cumm', min: 2000, max: 7000, container: 'EDTA Tube', formula: '(P_WBC * P_NEUTRO) / 100' },
    { name: 'Platelet Count', code: 'P_PLT', unit: 'lakhs/cumm', min: 1.5, max: 4.5, container: 'EDTA Tube' },
    { name: 'Mean Platelet Volume (MPV)', code: 'P_MPV', unit: 'fL', min: 7.2, max: 11.1, container: 'EDTA Tube' },
    { name: 'Erythrocyte Sedimentation Rate (ESR)', code: 'P_ESR', unit: 'mm/hr', min: 0, max: 20, container: 'EDTA Tube' },
    { name: 'Peripheral Smear', code: 'P_PSMEAR', unit: '', type: 'LONG_TEXT', container: 'EDTA Tube', textVal: 'Normocytic Normochromic' },

    // --- COAGULATION ---
    { name: 'Prothrombin Time (PT)', code: 'P_PT', unit: 'Sec', min: 11.0, max: 15.0, container: 'Citrate Tube' },
    { name: 'Control Time', code: 'P_PT_CTRL', unit: 'Sec', min: 11.0, max: 15.0, container: 'Citrate Tube' },
    { name: 'INR', code: 'P_INR', unit: '', min: 0.8, max: 1.2, container: 'Citrate Tube', formula: '(P_PT / P_PT_CTRL)' },
    { name: 'Activated Partial Thromboplastin Time (APTT)', code: 'P_APTT', unit: 'Sec', min: 25.0, max: 35.0, container: 'Citrate Tube' },
    { name: 'D-Dimer', code: 'P_DDIMER', unit: 'ng/mL FEU', min: 0, max: 500, container: 'Citrate Tube' },

    // --- LFT (LIVER) ---
    { name: 'Bilirubin Total', code: 'P_BIL_T', unit: 'mg/dL', min: 0.2, max: 1.2, container: 'SST Tube' },
    { name: 'Bilirubin Direct', code: 'P_BIL_D', unit: 'mg/dL', min: 0.0, max: 0.3, container: 'SST Tube' },
    { name: 'Bilirubin Indirect', code: 'P_BIL_I', unit: 'mg/dL', min: 0.2, max: 0.8, container: 'SST Tube', formula: '(P_BIL_T - P_BIL_D)' },
    { name: 'SGOT (AST)', code: 'P_SGOT', unit: 'U/L', min: 5, max: 40, container: 'SST Tube' },
    { name: 'SGPT (ALT)', code: 'P_SGPT', unit: 'U/L', min: 5, max: 40, container: 'SST Tube' },
    { name: 'Alkaline Phosphatase (ALP)', code: 'P_ALP', unit: 'U/L', min: 40, max: 120, container: 'SST Tube' },
    { name: 'Total Protein', code: 'P_PROT', unit: 'g/dL', min: 6.0, max: 8.3, container: 'SST Tube' },
    { name: 'Albumin', code: 'P_ALB', unit: 'g/dL', min: 3.5, max: 5.2, container: 'SST Tube' },
    { name: 'Globulin', code: 'P_GLOB', unit: 'g/dL', min: 2.3, max: 3.5, container: 'SST Tube', formula: '(P_PROT - P_ALB)' },
    { name: 'A/G Ratio', code: 'P_AG_RATIO', unit: '', min: 1.0, max: 2.5, container: 'SST Tube', formula: '(P_ALB / P_GLOB)' },
    { name: 'Gamma GT (GGT)', code: 'P_GGT', unit: 'U/L', min: 8, max: 61, container: 'SST Tube' },

    // --- KFT (KIDNEY) & ELECTROLYTES ---
    { name: 'Blood Urea Nitrogen (BUN)', code: 'P_BUN', unit: 'mg/dL', min: 7, max: 20, container: 'SST Tube' },
    { name: 'Urea', code: 'P_UREA', unit: 'mg/dL', min: 15, max: 40, container: 'SST Tube', formula: '(P_BUN * 2.14)' },
    { name: 'Creatinine', code: 'P_CREAT', unit: 'mg/dL', min: 0.6, max: 1.4, container: 'SST Tube' },
    { name: 'BUN/Creatinine Ratio', code: 'P_BUN_CR_RATIO', unit: '', min: 10, max: 20, container: 'SST Tube', formula: '(P_BUN / P_CREAT)' },
    { name: 'Uric Acid', code: 'P_URIC', unit: 'mg/dL', min: 3.5, max: 7.2, container: 'SST Tube' },
    { name: 'Sodium (Na)', code: 'P_NA', unit: 'mEq/L', min: 135, max: 145, container: 'SST Tube' },
    { name: 'Potassium (K)', code: 'P_K', unit: 'mEq/L', min: 3.5, max: 5.1, container: 'SST Tube' },
    { name: 'Chloride (Cl)', code: 'P_CL', unit: 'mEq/L', min: 98, max: 107, container: 'SST Tube' },
    { name: 'Calcium Total', code: 'P_CA', unit: 'mg/dL', min: 8.5, max: 10.5, container: 'SST Tube' },
    { name: 'Phosphorus Inorganic', code: 'P_PHOS', unit: 'mg/dL', min: 2.5, max: 4.5, container: 'SST Tube' },
    { name: 'Magnesium', code: 'P_MAG', unit: 'mg/dL', min: 1.7, max: 2.2, container: 'SST Tube' },

    // --- LIPID PROFILE (HEART) ---
    { name: 'Total Cholesterol', code: 'P_CHOL', unit: 'mg/dL', min: 0, max: 200, container: 'SST Tube' },
    { name: 'Triglycerides', code: 'P_TRIG', unit: 'mg/dL', min: 0, max: 150, container: 'SST Tube' },
    { name: 'HDL Cholesterol', code: 'P_HDL', unit: 'mg/dL', min: 40, max: 60, container: 'SST Tube' },
    { name: 'VLDL Cholesterol', code: 'P_VLDL', unit: 'mg/dL', min: 5, max: 40, container: 'SST Tube', formula: '(P_TRIG / 5)' },
    { name: 'LDL Cholesterol', code: 'P_LDL', unit: 'mg/dL', min: 0, max: 100, container: 'SST Tube', formula: '(P_CHOL - P_HDL - P_VLDL)' },
    { name: 'TC / HDL Ratio', code: 'P_TC_HDL', unit: '', min: 0, max: 5.0, container: 'SST Tube', formula: '(P_CHOL / P_HDL)' },
    { name: 'LDL / HDL Ratio', code: 'P_LDL_HDL', unit: '', min: 0, max: 3.5, container: 'SST Tube', formula: '(P_LDL / P_HDL)' },

    // --- CARDIAC MARKERS ---
    { name: 'Troponin I (High Sensitive)', code: 'P_TROP_I', unit: 'ng/mL', min: 0, max: 0.04, container: 'SST Tube' },
    { name: 'Troponin T', code: 'P_TROP_T', unit: 'ng/mL', min: 0, max: 0.014, container: 'SST Tube' },
    { name: 'CK-MB', code: 'P_CKMB', unit: 'U/L', min: 0, max: 25, container: 'SST Tube' },
    { name: 'NT-proBNP', code: 'P_NT_PROBNP', unit: 'pg/mL', min: 0, max: 125, container: 'SST Tube' },
    { name: 'hs-CRP (High Sensitivity)', code: 'P_HSCRP', unit: 'mg/L', min: 0, max: 3.0, container: 'SST Tube' },

    // --- DIABETES ---
    { name: 'Fasting Blood Sugar (FBS)', code: 'P_FBS', unit: 'mg/dL', min: 70, max: 100, container: 'Fluoride Tube' },
    { name: 'Post Prandial Blood Sugar (PPBS)', code: 'P_PPBS', unit: 'mg/dL', min: 70, max: 140, container: 'Fluoride Tube' },
    { name: 'Random Blood Sugar (RBS)', code: 'P_RBS', unit: 'mg/dL', min: 70, max: 140, container: 'Fluoride Tube' },
    { name: 'HbA1c (Glycosylated Hb)', code: 'P_HBA1C', unit: '%', min: 4.0, max: 5.6, container: 'EDTA Tube' },
    { name: 'Estimated Average Glucose (eAG)', code: 'P_EAG', unit: 'mg/dL', min: 70, max: 114, container: 'EDTA Tube', formula: '((28.7 * P_HBA1C) - 46.7)' },
    { name: 'Fasting Insulin', code: 'P_INSULIN', unit: 'uIU/mL', min: 2.6, max: 24.9, container: 'SST Tube' },
    { name: 'C-Peptide', code: 'P_CPEPTIDE', unit: 'ng/mL', min: 1.1, max: 4.4, container: 'SST Tube' },

    // --- THYROID & HORMONES ---
    { name: 'Total Triiodothyronine (T3)', code: 'P_T3', unit: 'ng/dL', min: 80, max: 200, container: 'SST Tube' },
    { name: 'Total Thyroxine (T4)', code: 'P_T4', unit: 'ug/dL', min: 5.0, max: 12.0, container: 'SST Tube' },
    { name: 'Thyroid Stimulating Hormone (TSH)', code: 'P_TSH', unit: 'uIU/mL', min: 0.4, max: 4.2, container: 'SST Tube' },
    { name: 'Free T3 (FT3)', code: 'P_FT3', unit: 'pg/mL', min: 2.3, max: 4.1, container: 'SST Tube' },
    { name: 'Free T4 (FT4)', code: 'P_FT4', unit: 'ng/dL', min: 0.9, max: 1.7, container: 'SST Tube' },
    { name: 'Follicle Stimulating Hormone (FSH)', code: 'P_FSH', unit: 'mIU/mL', min: 1.5, max: 12.4, container: 'SST Tube' },
    { name: 'Luteinizing Hormone (LH)', code: 'P_LH', unit: 'mIU/mL', min: 1.7, max: 8.6, container: 'SST Tube' },
    { name: 'Prolactin (PRL)', code: 'P_PRL', unit: 'ng/mL', min: 4.0, max: 15.2, container: 'SST Tube' },
    { name: 'Testosterone Total', code: 'P_TESTO', unit: 'ng/dL', min: 240, max: 950, container: 'SST Tube' },
    { name: 'Anti-Mullerian Hormone (AMH)', code: 'P_AMH', unit: 'ng/mL', min: 1.0, max: 3.0, container: 'SST Tube' },

    // --- VITAMINS & ANEMIA ---
    { name: 'Vitamin D Total (25-OH)', code: 'P_VITD', unit: 'ng/mL', min: 30, max: 100, container: 'SST Tube' },
    { name: 'Vitamin B12', code: 'P_VITB12', unit: 'pg/mL', min: 200, max: 900, container: 'SST Tube' },
    { name: 'Iron', code: 'P_IRON', unit: 'ug/dL', min: 60, max: 170, container: 'SST Tube' },
    { name: 'Total Iron Binding Capacity (TIBC)', code: 'P_TIBC', unit: 'ug/dL', min: 240, max: 450, container: 'SST Tube' },
    { name: 'Transferrin Saturation', code: 'P_TRF_SAT', unit: '%', min: 20, max: 50, container: 'SST Tube', formula: '(P_IRON / P_TIBC) * 100' },
    { name: 'Ferritin', code: 'P_FERR', unit: 'ng/mL', min: 20, max: 250, container: 'SST Tube' },
    { name: 'Folic Acid (Folate)', code: 'P_FOLATE', unit: 'ng/mL', min: 3.1, max: 17.5, container: 'SST Tube' },

    // --- INFECTION / FEVER PANEL / SEROLOGY ---
    { name: 'C-Reactive Protein (CRP)', code: 'P_CRP', unit: 'mg/L', min: 0, max: 6.0, container: 'SST Tube' },
    { name: 'Rheumatoid Factor (RF)', code: 'P_RF', unit: 'IU/mL', min: 0, max: 20, container: 'SST Tube' },
    { name: 'ASO Titre', code: 'P_ASO', unit: 'IU/mL', min: 0, max: 200, container: 'SST Tube' },
    { name: 'Malaria Antigen (Pv)', code: 'P_MAL_PV', unit: '', type: 'TEXT', container: 'EDTA Tube', textVal: 'Negative' },
    { name: 'Malaria Antigen (Pf)', code: 'P_MAL_PF', unit: '', type: 'TEXT', container: 'EDTA Tube', textVal: 'Negative' },
    { name: 'Dengue NS1 Antigen', code: 'P_DENGUE_NS1', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Dengue IgG Antibody', code: 'P_DENGUE_IGG', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Dengue IgM Antibody', code: 'P_DENGUE_IGM', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Typhoid IgG (Typhidot)', code: 'P_TYPHI_IGG', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Typhoid IgM (Typhidot)', code: 'P_TYPHI_IGM', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Widal O Antigen', code: 'P_WIDAL_O', unit: 'Titre', type: 'TEXT', container: 'SST Tube', textVal: 'Non-Reactive (< 1:80)' },
    { name: 'Widal H Antigen', code: 'P_WIDAL_H', unit: 'Titre', type: 'TEXT', container: 'SST Tube', textVal: 'Non-Reactive (< 1:80)' },
    { name: 'Scrub Typhus Antibodies', code: 'P_SCRUB', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Chikungunya IgM', code: 'P_CHIKUN', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    
    // --- VIRAL MARKERS ---
    { name: 'HBsAg (Hepatitis B)', code: 'P_HBSAG', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Non-Reactive' },
    { name: 'HIV I & II Antibodies', code: 'P_HIV', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Non-Reactive' },
    { name: 'HCV Antibodies', code: 'P_HCV', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Non-Reactive' },
    { name: 'VDRL / RPR (Syphilis)', code: 'P_VDRL', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Non-Reactive' },

    // --- TUMOR MARKERS (CANCER) ---
    { name: 'PSA Total (Prostate)', code: 'P_PSA', unit: 'ng/mL', min: 0, max: 4.0, container: 'SST Tube' },
    { name: 'CEA (Colon/GI)', code: 'P_CEA', unit: 'ng/mL', min: 0, max: 3.0, container: 'SST Tube' },
    { name: 'CA-125 (Ovarian)', code: 'P_CA125', unit: 'U/mL', min: 0, max: 35.0, container: 'SST Tube' },
    { name: 'CA 15-3 (Breast)', code: 'P_CA153', unit: 'U/mL', min: 0, max: 31.3, container: 'SST Tube' },
    { name: 'CA 19-9 (Pancreatic)', code: 'P_CA199', unit: 'U/mL', min: 0, max: 37.0, container: 'SST Tube' },
    { name: 'Alpha Fetoprotein (AFP)', code: 'P_AFP', unit: 'IU/mL', min: 0, max: 7.0, container: 'SST Tube' },

    // --- IMMUNOLOGY (SPECIAL) ---
    { name: 'ANA (Anti-Nuclear Antibody)', code: 'P_ANA', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },
    { name: 'Anti-dsDNA', code: 'P_DSDNA', unit: 'IU/mL', min: 0, max: 20.0, container: 'SST Tube' },
    { name: 'HLA-B27', code: 'P_HLAB27', unit: '', type: 'TEXT', container: 'SST Tube', textVal: 'Negative' },

    // --- URINE ROUTINE ---
    { name: 'Quantity', code: 'P_U_QTY', unit: 'ml', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Color', code: 'P_U_COLOR', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Pale Yellow' },
    { name: 'Appearance', code: 'P_U_APP', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Clear' },
    { name: 'Specific Gravity', code: 'P_U_SG', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: '1.010 - 1.025' },
    { name: 'Reaction (pH)', code: 'P_U_PH', unit: '', min: 5.0, max: 8.0, container: 'Sterile Container' },
    { name: 'Protein (Albumin)', code: 'P_U_PROT', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Glucose (Sugar)', code: 'P_U_GLU', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Ketones', code: 'P_U_KET', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Blood', code: 'P_U_BLD', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Bilirubin', code: 'P_U_BIL', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Urobilinogen', code: 'P_U_URO', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Normal' },
    { name: 'Nitrite', code: 'P_U_NIT', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Negative' },
    { name: 'Pus Cells', code: 'P_U_PUS', unit: '/hpf', type: 'TEXT', container: 'Sterile Container', textVal: '0 - 5' },
    { name: 'Red Blood Cells', code: 'P_U_RBC', unit: '/hpf', type: 'TEXT', container: 'Sterile Container', textVal: 'Nil' },
    { name: 'Epithelial Cells', code: 'P_U_EPI', unit: '/hpf', type: 'TEXT', container: 'Sterile Container', textVal: 'Occasional' },
    { name: 'Casts', code: 'P_U_CAST', unit: '/lpf', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Crystals', code: 'P_U_CRYS', unit: '/hpf', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Bacteria', code: 'P_U_BACT', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Yeast Cells', code: 'P_U_YEAST', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Urine Microalbumin', code: 'P_U_MALB', unit: 'mg/L', min: 0, max: 20, container: 'Sterile Container' },

    // --- STOOL ROUTINE ---
    { name: 'Stool Color', code: 'P_ST_COLOR', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Brown' },
    { name: 'Stool Consistency', code: 'P_ST_CONSIS', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Semi-Solid' },
    { name: 'Occult Blood', code: 'P_ST_OCCULT', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Negative' },
    { name: 'Ova / Cysts', code: 'P_ST_OVA', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Not Seen' },
  ];

  const dbParams: Record<string, string> = {};

  for (const p of parametersList) {
    const isText = p.type === 'TEXT' || p.type === 'LONG_TEXT';
    const isDerived = !!p.formula;
    
    const createdParam = await prisma.labTestParameter.upsert({
      where: { labId_code: { labId, code: p.code } },
      update: { isGlobal: true, formula: p.formula || null, isDerived }, 
      create: {
        labId, name: p.name, code: p.code, unit: p.unit,
        inputType: isText ? (p.type as any) : ParameterInputType.NUMBER,
        containerTypeId: p.container ? dbContainers[p.container] : null,
        formula: p.formula || null, isDerived, isGlobal: true, 
      }
    });

    const existingRange = await prisma.parameterReferenceRange.findFirst({
      where: { parameterId: createdParam.id, gender: Gender.BOTH }
    });

    if (!existingRange) {
      if (!isText && p.min !== undefined && p.max !== undefined) {
        await prisma.parameterReferenceRange.create({
          data: { parameterId: createdParam.id, gender: Gender.BOTH, lowValue: p.min, highValue: p.max, displayText: `${p.min} - ${p.max} ${p.unit}` }
        });
      } else if (isText && p.textVal) {
        await prisma.parameterReferenceRange.create({
          data: { parameterId: createdParam.id, gender: Gender.BOTH, textValue: p.textVal, displayText: p.textVal }
        });
      }
    }
    dbParams[p.code] = createdParam.id;
  }

  // ==========================================
  // 4. TEST TEMPLATES & INDIAN LIMS PACKAGES
  // ==========================================
  console.log('📋 Creating Packages, Profiles & Single Tests...');

  const testsList: any[] = [
    // --- MASTER PACKAGES (AAROGYAM STYLE) ---
    {
      name: 'Comprehensive Full Body Checkup', code: 'PKG_COMPREHENSIVE', dept: 'Biochemistry', sample: 'Serum & Blood', container: 'Multiple', price: 2500, type: TestType.PROFILE,
      params: [
        'P_HB', 'P_RBC', 'P_PCV', 'P_WBC', 'P_PLT', // CBC Snapshot
        'P_FBS', 'P_HBA1C', // Sugar
        'P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', // Lipid
        'P_BIL_T', 'P_SGOT', 'P_SGPT', 'P_ALP', // LFT Snapshot
        'P_UREA', 'P_CREAT', 'P_URIC', // KFT Snapshot
        'P_TSH', // Thyroid
        'P_VITD', 'P_VITB12' // Vitamins
      ]
    },
    {
      name: 'Advanced Fever Panel', code: 'PKG_FEVER', dept: 'Microbiology', sample: 'Serum & Blood', container: 'Multiple', price: 1800, type: TestType.PROFILE,
      params: ['P_MAL_PV', 'P_MAL_PF', 'P_DENGUE_NS1', 'P_DENGUE_IGG', 'P_DENGUE_IGM', 'P_TYPHI_IGG', 'P_TYPHI_IGM', 'P_WIDAL_O', 'P_WIDAL_H', 'P_CBC_T', 'P_CRP']
    },
    {
      name: 'PCOS / Fertility Profile', code: 'PKG_PCOS', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube', price: 2200, type: TestType.PROFILE,
      params: ['P_FSH', 'P_LH', 'P_PRL', 'P_TESTO', 'P_TSH', 'P_INSULIN']
    },
    {
      name: 'Cardiac Risk Profile', code: 'PKG_CARDIAC', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 2000, type: TestType.PROFILE,
      params: ['P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', 'P_VLDL', 'P_TC_HDL', 'P_HSCRP', 'P_NT_PROBNP', 'P_HBA1C']
    },
    {
      name: 'Arthritis Panel', code: 'PKG_ARTHRITIS', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 1500, type: TestType.PROFILE,
      params: ['P_URIC', 'P_RF', 'P_CRP', 'P_ASO', 'P_ANA', 'P_CA']
    },
    {
      name: 'ANC Profile (Antenatal Care)', code: 'PKG_ANC', dept: 'Clinical Pathology', sample: 'Multiple', container: 'Multiple', price: 1200, type: TestType.PROFILE,
      params: ['P_HB', 'P_RBS', 'P_HBSAG', 'P_HIV', 'P_VDRL', 'P_U_PROT', 'P_U_GLU', 'P_TSH']
    },

    // --- STANDARD PROFILES ---
    { name: 'Complete Blood Count (CBC)', code: 'T_CBC', dept: 'Hematology', sample: 'Whole Blood', container: 'EDTA Tube', price: 350, type: TestType.PROFILE, params: ['P_HB', 'P_RBC', 'P_PCV', 'P_MCV', 'P_MCH', 'P_MCHC', 'P_RDW_CV', 'P_WBC', 'P_NEUTRO', 'P_LYMPHO', 'P_MONO', 'P_EOSINO', 'P_BASO', 'P_ANC', 'P_PLT', 'P_MPV'] },
    { name: 'Liver Function Test (LFT)', code: 'T_LFT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 600, type: TestType.PROFILE, params: ['P_BIL_T', 'P_BIL_D', 'P_BIL_I', 'P_SGOT', 'P_SGPT', 'P_ALP', 'P_PROT', 'P_ALB', 'P_GLOB', 'P_AG_RATIO', 'P_GGT'] },
    { name: 'Kidney Function Test (KFT)', code: 'T_KFT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 600, type: TestType.PROFILE, params: ['P_BUN', 'P_UREA', 'P_CREAT', 'P_BUN_CR_RATIO', 'P_URIC', 'P_NA', 'P_K', 'P_CL', 'P_CA', 'P_PHOS'] },
    { name: 'Lipid Profile', code: 'T_LIPID', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 500, type: TestType.PROFILE, params: ['P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', 'P_VLDL', 'P_TC_HDL', 'P_LDL_HDL'] },
    { name: 'Thyroid Profile (T3, T4, TSH)', code: 'T_TFT', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube', price: 550, type: TestType.PROFILE, params: ['P_T3', 'P_T4', 'P_TSH'] },
    { name: 'Free Thyroid Profile (FT3, FT4, TSH)', code: 'T_FTFT', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube', price: 750, type: TestType.PROFILE, params: ['P_FT3', 'P_FT4', 'P_TSH'] },
    { name: 'Urine Routine & Microscopy', code: 'T_URM', dept: 'Clinical Pathology', sample: 'Urine', container: 'Sterile Container', price: 150, type: TestType.PROFILE, params: ['P_U_QTY', 'P_U_COLOR', 'P_U_APP', 'P_U_SG', 'P_U_PH', 'P_U_PROT', 'P_U_GLU', 'P_U_KET', 'P_U_BLD', 'P_U_BIL', 'P_U_URO', 'P_U_NIT', 'P_U_PUS', 'P_U_RBC', 'P_U_EPI', 'P_U_CAST', 'P_U_CRYS', 'P_U_BACT', 'P_U_YEAST'] },
    { name: 'Coagulation Profile (PT/INR & APTT)', code: 'T_COAG', dept: 'Coagulation', sample: 'Plasma', container: 'Citrate Tube', price: 800, type: TestType.PROFILE, params: ['P_PT', 'P_PT_CTRL', 'P_INR', 'P_APTT'] },
    { name: 'Iron Profile', code: 'T_IRON_PROF', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 700, type: TestType.PROFILE, params: ['P_IRON', 'P_TIBC', 'P_TRF_SAT', 'P_FERR'] },
    { name: 'Diabetic Profile', code: 'T_DIAB_PROF', dept: 'Biochemistry', sample: 'Whole Blood', container: 'EDTA Tube', price: 600, type: TestType.PROFILE, params: ['P_FBS', 'P_HBA1C', 'P_EAG', 'P_U_MALB'] },
    { name: 'Stool Routine', code: 'T_STOOL', dept: 'Clinical Pathology', sample: 'Stool', container: 'Sterile Container', price: 200, type: TestType.PROFILE, params: ['P_ST_COLOR', 'P_ST_CONSIS', 'P_ST_OCCULT', 'P_ST_OVA'] },

    // --- FREQUENT SINGLE TESTS ---
    { name: 'HbA1c', code: 'T_HBA1C', dept: 'Biochemistry', sample: 'Whole Blood', container: 'EDTA Tube', price: 400, params: ['P_HBA1C', 'P_EAG'] },
    { name: 'Vitamin D (25-OH)', code: 'T_VITD', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 1200, params: ['P_VITD'] },
    { name: 'Vitamin B12', code: 'T_VITB12', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 1000, params: ['P_VITB12'] },
    { name: 'TSH Only', code: 'T_TSH', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube', price: 300, params: ['P_TSH'] },
    { name: 'Troponin I (High Sensitive)', code: 'T_TROPI', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 1200, params: ['P_TROP_I'] },
    { name: 'D-Dimer', code: 'T_DDIMER', dept: 'Coagulation', sample: 'Plasma', container: 'Citrate Tube', price: 1000, params: ['P_DDIMER'] },
    { name: 'PSA Total (Prostate Specific Antigen)', code: 'T_PSA', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 700, params: ['P_PSA'] },
    { name: 'CA-125', code: 'T_CA125', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 1000, params: ['P_CA125'] },
    { name: 'Peripheral Blood Smear', code: 'T_PSMEAR', dept: 'Hematology', sample: 'Whole Blood', container: 'EDTA Tube', price: 250, params: ['P_PSMEAR'] },
    { name: 'Viral Markers (HBsAg, HCV, HIV)', code: 'T_VIRAL', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 1200, type: TestType.PROFILE, params: ['P_HBSAG', 'P_HCV', 'P_HIV'] }
  ];

  for (const test of testsList) {
    const createdTest = await prisma.testTemplate.upsert({
      where: { labId_code: { labId, code: test.code } },
      update: { isGlobal: true }, 
      create: {
        labId,
        name: test.name,
        code: test.code,
        price: test.price,
        type: test.type || TestType.SINGLE,
        departmentId: dbDepts[test.dept],
        sampleTypeId: test.sample && dbSamples[test.sample] ? dbSamples[test.sample] : null,
        containerTypeId: test.container && dbContainers[test.container] ? dbContainers[test.container] : null,
        isActive: true,
        isGlobal: true, 
      }
    });

    for (let i = 0; i < test.params.length; i++) {
      const paramCode = test.params[i];
      const paramId = dbParams[paramCode];

      if (paramId) {
        await prisma.testTemplateParameter.upsert({
          where: { templateId_parameterId: { templateId: createdTest.id, parameterId: paramId } },
          update: {},
          create: { templateId: createdTest.id, parameterId: paramId, order: i + 1 }
        });
      }
    }
  }

  console.log('✅ MEGA Seeding Complete! Loaded advanced profiles, calculations, and clinical constraints.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });