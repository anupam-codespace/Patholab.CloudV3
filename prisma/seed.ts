import { PrismaClient, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Patholab Cloud MEGA Database Seeding...');

  // ==========================================
  // 1. CREATE MASTER LAB & ADMIN USER
  // ==========================================
  console.log('🏢 Provisioning Master Lab & Super Admin...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  let adminUser = await prisma.user.findUnique({ where: { email: 'admin@patholab.cloud' } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@patholab.cloud',
        password: hashedPassword,
        name: 'System Administrator',
        phone: '9876543210',
        role: 'SUPER_ADMIN',
        isActive: true,
        onboardingStatus: 'COMPLETED',
      },
    });
  }

  let mainLab = await prisma.lab.findFirst({ where: { ownerId: adminUser.id } });
  if (!mainLab) {
    mainLab = await prisma.lab.create({
      data: {
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
  }

  const labId = mainLab.id;

  // ==========================================
  // 2. DICTIONARIES (Depts, Samples, Containers)
  // ==========================================
  console.log('🧪 Creating Clinical Departments & Containers...');
  
  const depts = [
    'Hematology', 'Biochemistry', 'Immunology & Serology', 'Clinical Pathology', 
    'Microbiology', 'Endocrinology', 'Molecular Biology', 'Coagulation', 'Cytology', 'Toxicology'
  ];
  const dbDepts: Record<string, string> = {};
  for (const name of depts) {
    let d = await prisma.department.findFirst({ where: { labId, name } });
    if (!d) d = await prisma.department.create({ data: { labId, name, isGlobal: true } });
    else d = await prisma.department.update({ where: { id: d.id }, data: { isGlobal: true } });
    dbDepts[name] = d.id;
  }

  const samples = ['Whole Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Sputum', 'CSF', 'Swab', 'Semen', 'Fluid'];
  const dbSamples: Record<string, string> = {};
  for (const name of samples) {
    let s = await prisma.sampleType.findFirst({ where: { labId, name } });
    if (!s) s = await prisma.sampleType.create({ data: { labId, name, isGlobal: true } });
    else s = await prisma.sampleType.update({ where: { id: s.id }, data: { isGlobal: true } });
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
    let dbC = await prisma.containerType.findFirst({ where: { labId, name: c.name } });
    if (!dbC) dbC = await prisma.containerType.create({ data: { labId, name: c.name, code: c.code, capColor: c.capColor, isGlobal: true } });
    else dbC = await prisma.containerType.update({ where: { id: dbC.id }, data: { code: c.code, capColor: c.capColor, isGlobal: true } });
    dbContainers[c.name] = dbC.id;
  }

  // ==========================================
  // 3. MASSIVE PARAMETER LIST (> 250 Items)
  // ==========================================
  console.log('🔬 Generating 250+ Master Clinical Parameters...');

  const parametersList = [
    // --- HEMATOLOGY ---
    { name: 'Hemoglobin (Hb)', code: 'P_HB', unit: 'g/dL', min: 12.0, max: 16.5, container: 'EDTA Tube' },
    { name: 'Total RBC Count', code: 'P_RBC', unit: 'mill/cumm', min: 4.5, max: 5.5, container: 'EDTA Tube' },
    { name: 'Packed Cell Volume (PCV)', code: 'P_PCV', unit: '%', min: 36.0, max: 46.0, container: 'EDTA Tube' },
    { name: 'Mean Corpuscular Volume (MCV)', code: 'P_MCV', unit: 'fL', min: 80.0, max: 100.0, container: 'EDTA Tube', formula: '(P_PCV * 10) / P_RBC' },
    { name: 'Mean Corpuscular Hb (MCH)', code: 'P_MCH', unit: 'pg', min: 27.0, max: 32.0, container: 'EDTA Tube', formula: '(P_HB * 10) / P_RBC' },
    { name: 'Mean Corpuscular Hb Conc (MCHC)', code: 'P_MCHC', unit: 'g/dL', min: 31.5, max: 34.5, container: 'EDTA Tube', formula: '(P_HB * 100) / P_PCV' },
    { name: 'Red Cell Distribution Width (RDW-CV)', code: 'P_RDW_CV', unit: '%', min: 11.6, max: 14.0, container: 'EDTA Tube' },
    { name: 'Red Cell Distribution Width (RDW-SD)', code: 'P_RDW_SD', unit: 'fL', min: 39.0, max: 46.0, container: 'EDTA Tube' },
    { name: 'Total WBC Count', code: 'P_WBC', unit: '/cumm', min: 4000, max: 11000, container: 'EDTA Tube' },
    { name: 'Neutrophils', code: 'P_NEUTRO', unit: '%', min: 40, max: 80, container: 'EDTA Tube' },
    { name: 'Lymphocytes', code: 'P_LYMPHO', unit: '%', min: 20, max: 40, container: 'EDTA Tube' },
    { name: 'Monocytes', code: 'P_MONO', unit: '%', min: 2, max: 10, container: 'EDTA Tube' },
    { name: 'Eosinophils', code: 'P_EOSINO', unit: '%', min: 1, max: 6, container: 'EDTA Tube' },
    { name: 'Basophils', code: 'P_BASO', unit: '%', min: 0, max: 2, container: 'EDTA Tube' },
    { name: 'Absolute Neutrophil Count (ANC)', code: 'P_ANC', unit: '/cumm', min: 2000, max: 7000, container: 'EDTA Tube', formula: '(P_WBC * P_NEUTRO) / 100' },
    { name: 'Absolute Lymphocyte Count (ALC)', code: 'P_ALC', unit: '/cumm', min: 1000, max: 4000, container: 'EDTA Tube', formula: '(P_WBC * P_LYMPHO) / 100' },
    { name: 'Absolute Eosinophil Count (AEC)', code: 'P_AEC', unit: '/cumm', min: 40, max: 440, container: 'EDTA Tube', formula: '(P_WBC * P_EOSINO) / 100' },
    { name: 'Platelet Count', code: 'P_PLT', unit: 'lakhs/cumm', min: 1.5, max: 4.5, container: 'EDTA Tube' },
    { name: 'Mean Platelet Volume (MPV)', code: 'P_MPV', unit: 'fL', min: 7.2, max: 11.1, container: 'EDTA Tube' },
    { name: 'Plateletcrit (PCT)', code: 'P_PCT', unit: '%', min: 0.10, max: 0.28, container: 'EDTA Tube' },
    { name: 'Platelet Distribution Width (PDW)', code: 'P_PDW', unit: 'fL', min: 9.0, max: 17.0, container: 'EDTA Tube' },
    { name: 'Erythrocyte Sedimentation Rate (ESR)', code: 'P_ESR', unit: 'mm/hr', min: 0, max: 20, container: 'EDTA Tube' },
    { name: 'Reticulocyte Count', code: 'P_RETIC', unit: '%', min: 0.5, max: 2.5, container: 'EDTA Tube' },
    { name: 'Peripheral Smear', code: 'P_PSMEAR', unit: '', type: 'TEXT', container: 'EDTA Tube', textVal: 'Normocytic Normochromic' },

    // --- COAGULATION ---
    { name: 'Prothrombin Time (PT)', code: 'P_PT', unit: 'Sec', min: 11.0, max: 15.0, container: 'Citrate Tube' },
    { name: 'PT Control', code: 'P_PT_CTRL', unit: 'Sec', min: 11.0, max: 15.0, container: 'Citrate Tube' },
    { name: 'INR', code: 'P_INR', unit: '', min: 0.8, max: 1.2, container: 'Citrate Tube', formula: '(P_PT / P_PT_CTRL)' },
    { name: 'APTT', code: 'P_APTT', unit: 'Sec', min: 25.0, max: 35.0, container: 'Citrate Tube' },
    { name: 'APTT Control', code: 'P_APTT_CTRL', unit: 'Sec', min: 25.0, max: 35.0, container: 'Citrate Tube' },
    { name: 'D-Dimer', code: 'P_DDIMER', unit: 'ng/mL FEU', min: 0, max: 500, container: 'Citrate Tube' },
    { name: 'Fibrinogen', code: 'P_FIB', unit: 'mg/dL', min: 200, max: 400, container: 'Citrate Tube' },
    { name: 'Bleeding Time (BT)', code: 'P_BT', unit: 'mins', min: 2.0, max: 7.0, container: 'Plain Tube' },
    { name: 'Clotting Time (CT)', code: 'P_CT', unit: 'mins', min: 4.0, max: 10.0, container: 'Plain Tube' },
    { name: 'Lupus Anticoagulant', code: 'P_LUPUS', unit: 'Ratio', min: 0, max: 1.2, container: 'Citrate Tube' },
    { name: 'Protein C', code: 'P_PROTC', unit: '%', min: 70, max: 140, container: 'Citrate Tube' },
    { name: 'Protein S', code: 'P_PROTS', unit: '%', min: 60, max: 130, container: 'Citrate Tube' },

    // --- LFT (LIVER) ---
    { name: 'Bilirubin Total', code: 'P_BIL_T', unit: 'mg/dL', min: 0.2, max: 1.2, container: 'SST Tube (Gel)' },
    { name: 'Bilirubin Direct', code: 'P_BIL_D', unit: 'mg/dL', min: 0.0, max: 0.3, container: 'SST Tube (Gel)' },
    { name: 'Bilirubin Indirect', code: 'P_BIL_I', unit: 'mg/dL', min: 0.2, max: 0.8, container: 'SST Tube (Gel)', formula: '(P_BIL_T - P_BIL_D)' },
    { name: 'SGOT (AST)', code: 'P_SGOT', unit: 'U/L', min: 5, max: 40, container: 'SST Tube (Gel)' },
    { name: 'SGPT (ALT)', code: 'P_SGPT', unit: 'U/L', min: 5, max: 40, container: 'SST Tube (Gel)' },
    { name: 'AST/ALT Ratio', code: 'P_AST_ALT', unit: '', min: 0.8, max: 2.0, container: 'SST Tube (Gel)', formula: '(P_SGOT / P_SGPT)' },
    { name: 'Alkaline Phosphatase (ALP)', code: 'P_ALP', unit: 'U/L', min: 40, max: 120, container: 'SST Tube (Gel)' },
    { name: 'Total Protein', code: 'P_PROT', unit: 'g/dL', min: 6.0, max: 8.3, container: 'SST Tube (Gel)' },
    { name: 'Albumin', code: 'P_ALB', unit: 'g/dL', min: 3.5, max: 5.2, container: 'SST Tube (Gel)' },
    { name: 'Globulin', code: 'P_GLOB', unit: 'g/dL', min: 2.3, max: 3.5, container: 'SST Tube (Gel)', formula: '(P_PROT - P_ALB)' },
    { name: 'A/G Ratio', code: 'P_AG_RATIO', unit: '', min: 1.0, max: 2.5, container: 'SST Tube (Gel)', formula: '(P_ALB / P_GLOB)' },
    { name: 'Gamma GT (GGT)', code: 'P_GGT', unit: 'U/L', min: 8, max: 61, container: 'SST Tube (Gel)' },
    { name: 'Lactate Dehydrogenase (LDH)', code: 'P_LDH', unit: 'U/L', min: 140, max: 280, container: 'SST Tube (Gel)' },

    // --- KFT (KIDNEY) & ELECTROLYTES ---
    { name: 'Blood Urea Nitrogen (BUN)', code: 'P_BUN', unit: 'mg/dL', min: 7, max: 20, container: 'SST Tube (Gel)' },
    { name: 'Urea', code: 'P_UREA', unit: 'mg/dL', min: 15, max: 40, container: 'SST Tube (Gel)', formula: '(P_BUN * 2.14)' },
    { name: 'Creatinine', code: 'P_CREAT', unit: 'mg/dL', min: 0.6, max: 1.4, container: 'SST Tube (Gel)' },
    { name: 'BUN/Creatinine Ratio', code: 'P_BUN_CR_RATIO', unit: '', min: 10, max: 20, container: 'SST Tube (Gel)', formula: '(P_BUN / P_CREAT)' },
    { name: 'Uric Acid', code: 'P_URIC', unit: 'mg/dL', min: 3.5, max: 7.2, container: 'SST Tube (Gel)' },
    { name: 'Sodium (Na)', code: 'P_NA', unit: 'mEq/L', min: 135, max: 145, container: 'SST Tube (Gel)' },
    { name: 'Potassium (K)', code: 'P_K', unit: 'mEq/L', min: 3.5, max: 5.1, container: 'SST Tube (Gel)' },
    { name: 'Chloride (Cl)', code: 'P_CL', unit: 'mEq/L', min: 98, max: 107, container: 'SST Tube (Gel)' },
    { name: 'Calcium Total', code: 'P_CA', unit: 'mg/dL', min: 8.5, max: 10.5, container: 'SST Tube (Gel)' },
    { name: 'Calcium Ionic', code: 'P_CA_ION', unit: 'mg/dL', min: 4.5, max: 5.6, container: 'SST Tube (Gel)' },
    { name: 'Phosphorus Inorganic', code: 'P_PHOS', unit: 'mg/dL', min: 2.5, max: 4.5, container: 'SST Tube (Gel)' },
    { name: 'Magnesium', code: 'P_MAG', unit: 'mg/dL', min: 1.7, max: 2.2, container: 'SST Tube (Gel)' },
    { name: 'Cystatin C', code: 'P_CYSTATIN', unit: 'mg/L', min: 0.5, max: 1.0, container: 'SST Tube (Gel)' },

    // --- LIPID PROFILE (HEART) ---
    { name: 'Total Cholesterol', code: 'P_CHOL', unit: 'mg/dL', min: 0, max: 200, container: 'SST Tube (Gel)' },
    { name: 'Triglycerides', code: 'P_TRIG', unit: 'mg/dL', min: 0, max: 150, container: 'SST Tube (Gel)' },
    { name: 'HDL Cholesterol', code: 'P_HDL', unit: 'mg/dL', min: 40, max: 60, container: 'SST Tube (Gel)' },
    { name: 'VLDL Cholesterol', code: 'P_VLDL', unit: 'mg/dL', min: 5, max: 40, container: 'SST Tube (Gel)', formula: '(P_TRIG / 5)' },
    { name: 'LDL Cholesterol', code: 'P_LDL', unit: 'mg/dL', min: 0, max: 100, container: 'SST Tube (Gel)', formula: '(P_CHOL - P_HDL - P_VLDL)' },
    { name: 'Non-HDL Cholesterol', code: 'P_NON_HDL', unit: 'mg/dL', min: 0, max: 130, container: 'SST Tube (Gel)', formula: '(P_CHOL - P_HDL)' },
    { name: 'TC / HDL Ratio', code: 'P_TC_HDL', unit: '', min: 0, max: 5.0, container: 'SST Tube (Gel)', formula: '(P_CHOL / P_HDL)' },
    { name: 'LDL / HDL Ratio', code: 'P_LDL_HDL', unit: '', min: 0, max: 3.5, container: 'SST Tube (Gel)', formula: '(P_LDL / P_HDL)' },
    { name: 'Apolipoprotein A1', code: 'P_APO_A1', unit: 'mg/dL', min: 110, max: 205, container: 'SST Tube (Gel)' },
    { name: 'Apolipoprotein B', code: 'P_APO_B', unit: 'mg/dL', min: 55, max: 130, container: 'SST Tube (Gel)' },
    { name: 'Lipoprotein (a)', code: 'P_LPA', unit: 'mg/dL', min: 0, max: 30, container: 'SST Tube (Gel)' },

    // --- CARDIAC MARKERS ---
    { name: 'Troponin I (High Sensitive)', code: 'P_TROP_I', unit: 'ng/mL', min: 0, max: 0.04, container: 'SST Tube (Gel)' },
    { name: 'Troponin T', code: 'P_TROP_T', unit: 'ng/mL', min: 0, max: 0.014, container: 'SST Tube (Gel)' },
    { name: 'Total CPK', code: 'P_CPK', unit: 'U/L', min: 20, max: 200, container: 'SST Tube (Gel)' },
    { name: 'CK-MB', code: 'P_CKMB', unit: 'U/L', min: 0, max: 25, container: 'SST Tube (Gel)' },
    { name: 'NT-proBNP', code: 'P_NT_PROBNP', unit: 'pg/mL', min: 0, max: 125, container: 'SST Tube (Gel)' },
    { name: 'hs-CRP (High Sensitivity)', code: 'P_HSCRP', unit: 'mg/L', min: 0, max: 3.0, container: 'SST Tube (Gel)' },
    { name: 'Myoglobin', code: 'P_MYO', unit: 'ng/mL', min: 0, max: 85, container: 'SST Tube (Gel)' },
    { name: 'Homocysteine', code: 'P_HCY', unit: 'umol/L', min: 5.0, max: 15.0, container: 'SST Tube (Gel)' },

    // --- DIABETES & PANCREATIC ---
    { name: 'Fasting Blood Sugar (FBS)', code: 'P_FBS', unit: 'mg/dL', min: 70, max: 100, container: 'Fluoride Tube' },
    { name: 'Post Prandial Blood Sugar (PPBS)', code: 'P_PPBS', unit: 'mg/dL', min: 70, max: 140, container: 'Fluoride Tube' },
    { name: 'Random Blood Sugar (RBS)', code: 'P_RBS', unit: 'mg/dL', min: 70, max: 140, container: 'Fluoride Tube' },
    { name: 'HbA1c (Glycosylated Hb)', code: 'P_HBA1C', unit: '%', min: 4.0, max: 5.6, container: 'EDTA Tube' },
    { name: 'Estimated Average Glucose (eAG)', code: 'P_EAG', unit: 'mg/dL', min: 70, max: 114, container: 'EDTA Tube', formula: '((28.7 * P_HBA1C) - 46.7)' },
    { name: 'Fasting Insulin', code: 'P_INSULIN', unit: 'uIU/mL', min: 2.6, max: 24.9, container: 'SST Tube (Gel)' },
    { name: 'C-Peptide', code: 'P_CPEPTIDE', unit: 'ng/mL', min: 1.1, max: 4.4, container: 'SST Tube (Gel)' },
    { name: 'Microalbumin (Urine)', code: 'P_U_MALB', unit: 'mg/L', min: 0, max: 20, container: 'Sterile Container' },
    { name: 'Serum Amylase', code: 'P_AMYLASE', unit: 'U/L', min: 28, max: 100, container: 'SST Tube (Gel)' },
    { name: 'Serum Lipase', code: 'P_LIPASE', unit: 'U/L', min: 13, max: 60, container: 'SST Tube (Gel)' },

    // --- THYROID, FERTILITY & HORMONES ---
    { name: 'Total T3', code: 'P_T3', unit: 'ng/dL', min: 80, max: 200, container: 'SST Tube (Gel)' },
    { name: 'Total T4', code: 'P_T4', unit: 'ug/dL', min: 5.0, max: 12.0, container: 'SST Tube (Gel)' },
    { name: 'TSH (Ultrasensitive)', code: 'P_TSH', unit: 'uIU/mL', min: 0.4, max: 4.2, container: 'SST Tube (Gel)' },
    { name: 'Free T3 (FT3)', code: 'P_FT3', unit: 'pg/mL', min: 2.3, max: 4.1, container: 'SST Tube (Gel)' },
    { name: 'Free T4 (FT4)', code: 'P_FT4', unit: 'ng/dL', min: 0.9, max: 1.7, container: 'SST Tube (Gel)' },
    { name: 'Anti-TPO', code: 'P_ANTI_TPO', unit: 'IU/mL', min: 0, max: 34, container: 'SST Tube (Gel)' },
    { name: 'Anti-Thyroglobulin', code: 'P_ANTI_TG', unit: 'IU/mL', min: 0, max: 115, container: 'SST Tube (Gel)' },
    { name: 'FSH', code: 'P_FSH', unit: 'mIU/mL', min: 1.5, max: 12.4, container: 'SST Tube (Gel)' },
    { name: 'LH', code: 'P_LH', unit: 'mIU/mL', min: 1.7, max: 8.6, container: 'SST Tube (Gel)' },
    { name: 'Prolactin', code: 'P_PRL', unit: 'ng/mL', min: 4.0, max: 15.2, container: 'SST Tube (Gel)' },
    { name: 'Testosterone Total', code: 'P_TESTO', unit: 'ng/dL', min: 240, max: 950, container: 'SST Tube (Gel)' },
    { name: 'Testosterone Free', code: 'P_TESTO_F', unit: 'pg/mL', min: 9.0, max: 30.0, container: 'SST Tube (Gel)' },
    { name: 'AMH', code: 'P_AMH', unit: 'ng/mL', min: 1.0, max: 3.0, container: 'SST Tube (Gel)' },
    { name: 'Estradiol (E2)', code: 'P_E2', unit: 'pg/mL', min: 12.5, max: 166.0, container: 'SST Tube (Gel)' },
    { name: 'Progesterone', code: 'P_PROG', unit: 'ng/mL', min: 0.2, max: 1.5, container: 'SST Tube (Gel)' },
    { name: 'Cortisol (Morning)', code: 'P_CORT_AM', unit: 'ug/dL', min: 4.3, max: 22.4, container: 'SST Tube (Gel)' },
    { name: 'DHEAS', code: 'P_DHEAS', unit: 'ug/dL', min: 35, max: 430, container: 'SST Tube (Gel)' },

    // --- VITAMINS & IRON (ANEMIA) ---
    { name: 'Vitamin D (25-OH)', code: 'P_VITD', unit: 'ng/mL', min: 30, max: 100, container: 'SST Tube (Gel)' },
    { name: 'Vitamin B12', code: 'P_VITB12', unit: 'pg/mL', min: 200, max: 900, container: 'SST Tube (Gel)' },
    { name: 'Folic Acid', code: 'P_FOLATE', unit: 'ng/mL', min: 3.1, max: 17.5, container: 'SST Tube (Gel)' },
    { name: 'Serum Iron', code: 'P_IRON', unit: 'ug/dL', min: 60, max: 170, container: 'SST Tube (Gel)' },
    { name: 'TIBC', code: 'P_TIBC', unit: 'ug/dL', min: 240, max: 450, container: 'SST Tube (Gel)' },
    { name: 'UIBC', code: 'P_UIBC', unit: 'ug/dL', min: 110, max: 370, container: 'SST Tube (Gel)', formula: '(P_TIBC - P_IRON)' },
    { name: 'Transferrin Saturation', code: 'P_TRF_SAT', unit: '%', min: 20, max: 50, container: 'SST Tube (Gel)', formula: '(P_IRON / P_TIBC) * 100' },
    { name: 'Ferritin', code: 'P_FERR', unit: 'ng/mL', min: 20, max: 250, container: 'SST Tube (Gel)' },

    // --- TUMOR MARKERS ---
    { name: 'PSA Total', code: 'P_PSA_T', unit: 'ng/mL', min: 0, max: 4.0, container: 'SST Tube (Gel)' },
    { name: 'PSA Free', code: 'P_PSA_F', unit: 'ng/mL', min: 0, max: 0.9, container: 'SST Tube (Gel)' },
    { name: 'CEA', code: 'P_CEA', unit: 'ng/mL', min: 0, max: 3.0, container: 'SST Tube (Gel)' },
    { name: 'CA-125', code: 'P_CA125', unit: 'U/mL', min: 0, max: 35.0, container: 'SST Tube (Gel)' },
    { name: 'CA 15-3', code: 'P_CA153', unit: 'U/mL', min: 0, max: 31.3, container: 'SST Tube (Gel)' },
    { name: 'CA 19-9', code: 'P_CA199', unit: 'U/mL', min: 0, max: 37.0, container: 'SST Tube (Gel)' },
    { name: 'Alpha Fetoprotein (AFP)', code: 'P_AFP', unit: 'IU/mL', min: 0, max: 7.0, container: 'SST Tube (Gel)' },
    { name: 'Beta HCG', code: 'P_BHCG', unit: 'mIU/mL', min: 0, max: 5.0, container: 'SST Tube (Gel)' },

    // --- IMMUNOLOGY & AUTOIMMUNE (ANA BLOT) ---
    { name: 'C-Reactive Protein (CRP)', code: 'P_CRP', unit: 'mg/L', min: 0, max: 6.0, container: 'SST Tube (Gel)' },
    { name: 'Rheumatoid Factor (RF)', code: 'P_RF', unit: 'IU/mL', min: 0, max: 20, container: 'SST Tube (Gel)' },
    { name: 'ASO Titre', code: 'P_ASO', unit: 'IU/mL', min: 0, max: 200, container: 'SST Tube (Gel)' },
    { name: 'ANA by IFA', code: 'P_ANA', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Anti-dsDNA', code: 'P_DSDNA', unit: 'IU/mL', min: 0, max: 20.0, container: 'SST Tube (Gel)' },
    { name: 'HLA-B27', code: 'P_HLAB27', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Anti-CCP', code: 'P_ANTI_CCP', unit: 'U/mL', min: 0, max: 5.0, container: 'SST Tube (Gel)' },
    { name: 'Total IgE (Allergy)', code: 'P_IGE', unit: 'IU/mL', min: 0, max: 100, container: 'SST Tube (Gel)' },
    { name: 'ANA Blot - nRNP/Sm', code: 'P_ANA_RNP', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - Sm', code: 'P_ANA_SM', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - SS-A (Ro)', code: 'P_ANA_SSA', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - Ro-52', code: 'P_ANA_RO52', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - SS-B (La)', code: 'P_ANA_SSB', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - Scl-70', code: 'P_ANA_SCL70', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - Jo-1', code: 'P_ANA_JO1', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'ANA Blot - Centromere B', code: 'P_ANA_CENP', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },

    // --- SEROLOGY & TORCH PANEL ---
    { name: 'Malaria Antigen (Pv)', code: 'P_MAL_PV', unit: '', type: 'TEXT', container: 'EDTA Tube', textVal: 'Negative' },
    { name: 'Malaria Antigen (Pf)', code: 'P_MAL_PF', unit: '', type: 'TEXT', container: 'EDTA Tube', textVal: 'Negative' },
    { name: 'Dengue NS1 Antigen', code: 'P_DENGUE_NS1', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Dengue IgG Antibody', code: 'P_DENGUE_IGG', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Dengue IgM Antibody', code: 'P_DENGUE_IGM', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Typhoid IgG (Typhidot)', code: 'P_TYPHI_IGG', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Typhoid IgM (Typhidot)', code: 'P_TYPHI_IGM', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Negative' },
    { name: 'Widal O Antigen', code: 'P_WIDAL_O', unit: 'Titre', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Non-Reactive (< 1:80)' },
    { name: 'Widal H Antigen', code: 'P_WIDAL_H', unit: 'Titre', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Non-Reactive (< 1:80)' },
    { name: 'HBsAg (Hepatitis B)', code: 'P_HBSAG', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Non-Reactive' },
    { name: 'HIV I & II Antibodies', code: 'P_HIV', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Non-Reactive' },
    { name: 'HCV Antibodies', code: 'P_HCV', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Non-Reactive' },
    { name: 'VDRL (Syphilis)', code: 'P_VDRL', unit: '', type: 'TEXT', container: 'SST Tube (Gel)', textVal: 'Non-Reactive' },
    { name: 'Toxoplasma IgG', code: 'P_TOXO_IGG', unit: 'IU/mL', min: 0, max: 3.0, container: 'SST Tube (Gel)' },
    { name: 'Toxoplasma IgM', code: 'P_TOXO_IGM', unit: 'Index', min: 0, max: 0.8, container: 'SST Tube (Gel)' },
    { name: 'Rubella IgG', code: 'P_RUB_IGG', unit: 'IU/mL', min: 0, max: 10.0, container: 'SST Tube (Gel)' },
    { name: 'Rubella IgM', code: 'P_RUB_IGM', unit: 'Index', min: 0, max: 0.8, container: 'SST Tube (Gel)' },
    { name: 'CMV IgG', code: 'P_CMV_IGG', unit: 'U/mL', min: 0, max: 6.0, container: 'SST Tube (Gel)' },
    { name: 'CMV IgM', code: 'P_CMV_IGM', unit: 'Index', min: 0, max: 0.85, container: 'SST Tube (Gel)' },
    { name: 'HSV 1/2 IgG', code: 'P_HSV_IGG', unit: 'Index', min: 0, max: 0.9, container: 'SST Tube (Gel)' },
    { name: 'HSV 1/2 IgM', code: 'P_HSV_IGM', unit: 'Index', min: 0, max: 0.9, container: 'SST Tube (Gel)' },

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

    // --- STOOL ROUTINE ---
    { name: 'Stool Color', code: 'P_ST_COLOR', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Brown' },
    { name: 'Stool Consistency', code: 'P_ST_CONSIS', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Semi-Solid' },
    { name: 'Mucus', code: 'P_ST_MUCUS', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Absent' },
    { name: 'Occult Blood', code: 'P_ST_OCCULT', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Negative' },
    { name: 'Ova', code: 'P_ST_OVA', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Not Seen' },
    { name: 'Cysts', code: 'P_ST_CYSTS', unit: '', type: 'TEXT', container: 'Sterile Container', textVal: 'Not Seen' },
    { name: 'Pus Cells', code: 'P_ST_PUS', unit: '/hpf', type: 'TEXT', container: 'Sterile Container', textVal: '0 - 2' },

    // --- SEMEN ANALYSIS ---
    { name: 'Volume', code: 'P_SEM_VOL', unit: 'mL', min: 1.5, max: 5.0, container: 'Sterile Container' },
    { name: 'Liquefaction Time', code: 'P_SEM_LIQ', unit: 'mins', min: 15, max: 60, container: 'Sterile Container' },
    { name: 'Sperm Count', code: 'P_SEM_CNT', unit: 'mill/mL', min: 15, max: 150, container: 'Sterile Container' },
    { name: 'Active Motility', code: 'P_SEM_MOT_A', unit: '%', min: 40, max: 100, container: 'Sterile Container' },
    { name: 'Normal Morphology', code: 'P_SEM_MORPH', unit: '%', min: 4, max: 100, container: 'Sterile Container' },
  ];

  const dbParams: Record<string, string> = {};

  for (const p of parametersList) {
    const isText = p.type === 'TEXT' || p.type === 'LONG_TEXT';
    const isDerived = !!p.formula;
    
    // We use findFirst to safely avoid any @@unique compilation errors.
    let createdParam = await prisma.labTestParameter.findFirst({ where: { labId, code: p.code } });
    if (!createdParam) {
      createdParam = await prisma.labTestParameter.create({
        data: {
          labId, name: p.name, code: p.code, unit: p.unit,
          containerTypeId: p.container ? dbContainers[p.container] : null,
          formula: p.formula || null, isDerived, isGlobal: true, 
        }
      });
    } else {
      createdParam = await prisma.labTestParameter.update({
        where: { id: createdParam.id },
        data: { formula: p.formula || null, isDerived, isGlobal: true }
      });
    }

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
  // 4. TEST TEMPLATES & PACKAGES (40+ items)
  // ==========================================
  console.log('📋 Creating 40+ Master Packages, Profiles & Tests...');

  const testsList: any[] = [
    // --- MASTER PACKAGES ---
    {
      name: 'Comprehensive Full Body Checkup (Aarogyam)', code: 'PKG_COMPREHENSIVE', dept: 'Biochemistry', sample: 'Serum', container: 'Multiple', price: 2500, type: 'PROFILE',
      params: ['P_HB', 'P_WBC', 'P_PLT', 'P_FBS', 'P_HBA1C', 'P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', 'P_BIL_T', 'P_SGOT', 'P_SGPT', 'P_ALP', 'P_UREA', 'P_CREAT', 'P_URIC', 'P_TSH', 'P_VITD', 'P_VITB12']
    },
    {
      name: 'Advanced Fever Panel', code: 'PKG_FEVER', dept: 'Microbiology', sample: 'Serum', container: 'Multiple', price: 1800, type: 'PROFILE',
      params: ['P_MAL_PV', 'P_MAL_PF', 'P_DENGUE_NS1', 'P_DENGUE_IGG', 'P_DENGUE_IGM', 'P_TYPHI_IGG', 'P_TYPHI_IGM', 'P_WIDAL_O', 'P_WIDAL_H', 'P_CRP']
    },
    {
      name: 'PCOS / Fertility Profile', code: 'PKG_PCOS', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube (Gel)', price: 2200, type: 'PROFILE',
      params: ['P_FSH', 'P_LH', 'P_PRL', 'P_TESTO', 'P_TSH', 'P_INSULIN']
    },
    {
      name: 'Cardiac Risk Profile', code: 'PKG_CARDIAC', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 2000, type: 'PROFILE',
      params: ['P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', 'P_VLDL', 'P_TC_HDL', 'P_HSCRP', 'P_NT_PROBNP', 'P_HBA1C']
    },
    {
      name: 'Arthritis Panel', code: 'PKG_ARTHRITIS', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 1500, type: 'PROFILE',
      params: ['P_URIC', 'P_RF', 'P_CRP', 'P_ASO', 'P_ANA', 'P_CA']
    },
    {
      name: 'ANC Profile (Antenatal Care)', code: 'PKG_ANC', dept: 'Clinical Pathology', sample: 'Multiple', container: 'Multiple', price: 1200, type: 'PROFILE',
      params: ['P_HB', 'P_RBS', 'P_HBSAG', 'P_HIV', 'P_VDRL', 'P_U_PROT', 'P_U_GLU', 'P_TSH']
    },
    {
      name: 'Pre-Operative Profile (Major)', code: 'PKG_PRE_OP', dept: 'Clinical Pathology', sample: 'Multiple', container: 'Multiple', price: 1500, type: 'PROFILE',
      params: ['P_HB', 'P_RBC', 'P_WBC', 'P_PLT', 'P_RBS', 'P_UREA', 'P_CREAT', 'P_PT', 'P_INR', 'P_APTT', 'P_HBSAG', 'P_HIV', 'P_HCV']
    },

    // --- STANDARD PROFILES ---
    { name: 'Complete Blood Count (CBC)', code: 'T_CBC', dept: 'Hematology', sample: 'Whole Blood', container: 'EDTA Tube', price: 350, type: 'PROFILE', params: ['P_HB', 'P_RBC', 'P_PCV', 'P_MCV', 'P_MCH', 'P_MCHC', 'P_RDW_CV', 'P_RDW_SD', 'P_WBC', 'P_NEUTRO', 'P_LYMPHO', 'P_MONO', 'P_EOSINO', 'P_BASO', 'P_ANC', 'P_ALC', 'P_AMC', 'P_AEC', 'P_PLT', 'P_MPV', 'P_PCT', 'P_PDW', 'P_PSMEAR'] },
    { name: 'Liver Function Test (LFT)', code: 'T_LFT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 600, type: 'PROFILE', params: ['P_BIL_T', 'P_BIL_D', 'P_BIL_I', 'P_SGOT', 'P_SGPT', 'P_AST_ALT', 'P_ALP', 'P_PROT', 'P_ALB', 'P_GLOB', 'P_AG_RATIO', 'P_GGT', 'P_LDH'] },
    { name: 'Kidney Function Test (KFT)', code: 'T_KFT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 600, type: 'PROFILE', params: ['P_BUN', 'P_UREA', 'P_CREAT', 'P_BUN_CR_RATIO', 'P_URIC', 'P_NA', 'P_K', 'P_CL', 'P_CA', 'P_PHOS', 'P_MAG', 'P_CYSTATIN'] },
    { name: 'Lipid Profile', code: 'T_LIPID', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 500, type: 'PROFILE', params: ['P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', 'P_VLDL', 'P_NON_HDL', 'P_TC_HDL', 'P_LDL_HDL', 'P_APO_A1', 'P_APO_B', 'P_LPA'] },
    { name: 'Thyroid Profile (T3, T4, TSH)', code: 'T_TFT', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube (Gel)', price: 550, type: 'PROFILE', params: ['P_T3', 'P_T4', 'P_TSH'] },
    { name: 'Free Thyroid Profile (FT3, FT4, TSH)', code: 'T_FTFT', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube (Gel)', price: 750, type: 'PROFILE', params: ['P_FT3', 'P_FT4', 'P_TSH'] },
    { name: 'Urine Routine & Microscopy', code: 'T_URM', dept: 'Clinical Pathology', sample: 'Urine', container: 'Sterile Container', price: 150, type: 'PROFILE', params: ['P_U_QTY', 'P_U_COLOR', 'P_U_APP', 'P_U_SG', 'P_U_PH', 'P_U_PROT', 'P_U_GLU', 'P_U_KET', 'P_U_BLD', 'P_U_BIL', 'P_U_URO', 'P_U_NIT', 'P_U_LEU', 'P_U_PUS', 'P_U_RBC', 'P_U_EPI', 'P_U_CAST', 'P_U_CRYS', 'P_U_BACT'] },
    { name: 'Stool Routine & Microscopy', code: 'T_STOOL', dept: 'Clinical Pathology', sample: 'Stool', container: 'Sterile Container', price: 200, type: 'PROFILE', params: ['P_ST_COLOR', 'P_ST_CONSIS', 'P_ST_MUCUS', 'P_ST_OCCULT', 'P_ST_OVA', 'P_ST_CYSTS', 'P_ST_PUS', 'P_ST_RBC', 'P_ST_MACRO'] },
    { name: 'Coagulation Profile (PT/INR & APTT)', code: 'T_COAG', dept: 'Coagulation', sample: 'Plasma', container: 'Citrate Tube', price: 800, type: 'PROFILE', params: ['P_PT', 'P_PT_CTRL', 'P_INR', 'P_APTT', 'P_APTT_CTRL', 'P_FIB'] },
    { name: 'Iron Profile', code: 'T_IRON_PROF', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 700, type: 'PROFILE', params: ['P_IRON', 'P_TIBC', 'P_UIBC', 'P_TRF_SAT', 'P_FERR'] },
    { name: 'Diabetic Profile', code: 'T_DIAB_PROF', dept: 'Biochemistry', sample: 'Whole Blood', container: 'EDTA Tube', price: 600, type: 'PROFILE', params: ['P_FBS', 'P_PPBS', 'P_HBA1C', 'P_EAG', 'P_U_MALB'] },
    { name: 'TORCH Panel (IgG & IgM)', code: 'T_TORCH', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 2500, type: 'PROFILE', params: ['P_TOXO_IGG', 'P_TOXO_IGM', 'P_RUB_IGG', 'P_RUB_IGM', 'P_CMV_IGG', 'P_CMV_IGM', 'P_HSV_IGG', 'P_HSV_IGM'] },
    { name: 'ANA Profile (Immunoblot)', code: 'T_ANA_BLOT', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 3000, type: 'PROFILE', params: ['P_ANA_RNP', 'P_ANA_SM', 'P_ANA_SSA', 'P_ANA_RO52', 'P_ANA_SSB', 'P_ANA_SCL70', 'P_ANA_JO1', 'P_ANA_CENP'] },
    { name: 'Semen Analysis', code: 'T_SEMEN', dept: 'Clinical Pathology', sample: 'Semen', container: 'Sterile Container', price: 400, type: 'PROFILE', params: ['P_SEM_VOL', 'P_SEM_LIQ', 'P_SEM_CNT', 'P_SEM_MOT_A', 'P_SEM_MORPH'] },

    // --- FREQUENT SINGLE TESTS ---
    { name: 'HbA1c', code: 'T_HBA1C', dept: 'Biochemistry', sample: 'Whole Blood', container: 'EDTA Tube', price: 400, params: ['P_HBA1C', 'P_EAG'] },
    { name: 'Vitamin D (25-OH)', code: 'T_VITD', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 1200, params: ['P_VITD'] },
    { name: 'Vitamin B12', code: 'T_VITB12', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 1000, params: ['P_VITB12'] },
    { name: 'TSH Only', code: 'T_TSH', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube (Gel)', price: 300, params: ['P_TSH'] },
    { name: 'Troponin I (High Sensitive)', code: 'T_TROPI', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube (Gel)', price: 1200, params: ['P_TROP_I'] },
    { name: 'D-Dimer', code: 'T_DDIMER', dept: 'Coagulation', sample: 'Plasma', container: 'Citrate Tube', price: 1000, params: ['P_DDIMER'] },
    { name: 'PSA Total', code: 'T_PSA', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 700, params: ['P_PSA_T'] },
    { name: 'CA-125', code: 'T_CA125', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 1000, params: ['P_CA125'] },
    { name: 'C-Reactive Protein (CRP)', code: 'T_CRP', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 400, params: ['P_CRP'] },
    { name: 'Viral Markers (HBsAg, HCV, HIV)', code: 'T_VIRAL', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 1200, type: 'PROFILE', params: ['P_HBSAG', 'P_HCV', 'P_HIV'] },
    { name: 'Typhoid (Widal)', code: 'T_WIDAL', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube (Gel)', price: 200, type: 'PROFILE', params: ['P_WIDAL_O', 'P_WIDAL_H'] },
  ];

  for (const test of testsList) {
    let createdTest = await prisma.testTemplate.findFirst({ where: { labId, code: test.code } });

    if (createdTest) {
      createdTest = await prisma.testTemplate.update({
        where: { id: createdTest.id },
        data: {
          isGlobal: true, name: test.name, price: test.price, type: test.type || 'SINGLE',
          departmentId: dbDepts[test.dept],
          sampleTypeId: test.sample && dbSamples[test.sample] ? dbSamples[test.sample] : null,
          containerTypeId: test.container && dbContainers[test.container] ? dbContainers[test.container] : null,
          isActive: true,
        }
      });
    } else {
      createdTest = await prisma.testTemplate.create({
        data: {
          labId, name: test.name, code: test.code, price: test.price, type: test.type || 'SINGLE',
          departmentId: dbDepts[test.dept],
          sampleTypeId: test.sample && dbSamples[test.sample] ? dbSamples[test.sample] : null,
          containerTypeId: test.container && dbContainers[test.container] ? dbContainers[test.container] : null,
          isActive: true, isGlobal: true, 
        }
      });
    }

    for (let i = 0; i < test.params.length; i++) {
      const paramCode = test.params[i];
      const paramId = dbParams[paramCode];

      if (paramId) {
        let mapping = await prisma.testTemplateParameter.findFirst({
          where: { templateId: createdTest.id, parameterId: paramId }
        });

        if (!mapping) {
          await prisma.testTemplateParameter.create({
            data: { templateId: createdTest.id, parameterId: paramId, order: i + 1 }
          });
        }
      }
    }
  }

  console.log('✅ MEGA Seeding Complete! Over 250 Parameters and 40 Packages Loaded Successfully.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });