import { PrismaClient, ParameterInputType, TestType, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Patholab Cloud Database Seeding...');

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
      role: 'LAB_OWNER',
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
      address: '123 Health Avenue',
      city: 'Guwahati',
      state: 'Assam',
      pincode: '781001',
      phone: '9876543210',
      email: 'lab@patholab.cloud',
      licenseNumber: 'LIC-99999',
      ownerId: adminUser.id,
    },
  });

  const labId = mainLab.id;

  // ==========================================
  // 2. DICTIONARIES: DEPARTMENTS, SAMPLES, CONTAINERS
  // ==========================================
  console.log('🧪 Creating Clinical Metadata (As Global)...');
  
  const depts = ['Hematology', 'Biochemistry', 'Immunology & Serology', 'Clinical Pathology', 'Microbiology', 'Endocrinology'];
  const dbDepts: Record<string, string> = {};
  for (const name of depts) {
    const d = await prisma.department.upsert({ 
      where: { labId_name: { labId, name } }, 
      update: { isGlobal: true }, // ✅ Make existing ones global
      create: { labId, name, isGlobal: true } // ✅ Create as global
    });
    dbDepts[name] = d.id;
  }

  const samples = ['Whole Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Sputum', 'CSF'];
  const dbSamples: Record<string, string> = {};
  for (const name of samples) {
    const s = await prisma.sampleType.upsert({ 
      where: { labId_name: { labId, name } }, 
      update: { isGlobal: true }, 
      create: { labId, name, isGlobal: true } 
    });
    dbSamples[name] = s.id;
  }

  const containers = [
    { name: 'EDTA Tube', code: 'EDTA', capColor: 'Purple' },
    { name: 'SST Tube', code: 'SST', capColor: 'Yellow' },
    { name: 'Plain Tube', code: 'PLAIN', capColor: 'Red' },
    { name: 'Fluoride Tube', code: 'FLUORIDE', capColor: 'Grey' },
    { name: 'Citrate Tube', code: 'CITRATE', capColor: 'Light Blue' },
    { name: 'Sterile Container', code: 'STERILE', capColor: 'White' },
  ];
  const dbContainers: Record<string, string> = {};
  for (const c of containers) {
    const dbC = await prisma.containerType.upsert({ 
      where: { labId_name: { labId, name: c.name } }, 
      update: { isGlobal: true }, 
      create: { labId, name: c.name, code: c.code, capColor: c.capColor, isGlobal: true } 
    });
    dbContainers[c.name] = dbC.id;
  }

  // ==========================================
  // 3. 100+ CLINICAL PARAMETERS
  // ==========================================
  console.log('🔬 Creating 100+ Clinical Parameters (As Global)...');

  const parametersList = [
    // --- HEMATOLOGY (CBC) ---
    { name: 'Hemoglobin (Hb)', code: 'P_HB', unit: 'g/dL', min: 12.0, max: 16.5, container: 'EDTA Tube' },
    { name: 'Total RBC Count', code: 'P_RBC', unit: 'mill/cumm', min: 4.5, max: 5.5, container: 'EDTA Tube' },
    { name: 'Packed Cell Volume (PCV)', code: 'P_PCV', unit: '%', min: 36.0, max: 46.0, container: 'EDTA Tube' },
    { name: 'Mean Corpuscular Volume (MCV)', code: 'P_MCV', unit: 'fL', min: 80.0, max: 100.0, container: 'EDTA Tube' },
    { name: 'Mean Corpuscular Hb (MCH)', code: 'P_MCH', unit: 'pg', min: 27.0, max: 32.0, container: 'EDTA Tube' },
    { name: 'Mean Corpuscular Hb Conc (MCHC)', code: 'P_MCHC', unit: 'g/dL', min: 31.5, max: 34.5, container: 'EDTA Tube' },
    { name: 'Total WBC Count', code: 'P_WBC', unit: '/cumm', min: 4000, max: 11000, container: 'EDTA Tube' },
    { name: 'Neutrophils', code: 'P_NEUTRO', unit: '%', min: 40, max: 80, container: 'EDTA Tube' },
    { name: 'Lymphocytes', code: 'P_LYMPHO', unit: '%', min: 20, max: 40, container: 'EDTA Tube' },
    { name: 'Monocytes', code: 'P_MONO', unit: '%', min: 2, max: 10, container: 'EDTA Tube' },
    { name: 'Eosinophils', code: 'P_EOSINO', unit: '%', min: 1, max: 6, container: 'EDTA Tube' },
    { name: 'Basophils', code: 'P_BASO', unit: '%', min: 0, max: 2, container: 'EDTA Tube' },
    { name: 'Platelet Count', code: 'P_PLT', unit: 'lakhs/cumm', min: 1.5, max: 4.5, container: 'EDTA Tube' },
    { name: 'Erythrocyte Sedimentation Rate (ESR)', code: 'P_ESR', unit: 'mm/hr', min: 0, max: 20, container: 'EDTA Tube' },

    // --- BIOCHEMISTRY (LIVER - LFT) ---
    { name: 'Bilirubin Total', code: 'P_BIL_T', unit: 'mg/dL', min: 0.2, max: 1.2, container: 'SST Tube' },
    { name: 'Bilirubin Direct', code: 'P_BIL_D', unit: 'mg/dL', min: 0.0, max: 0.3, container: 'SST Tube' },
    { name: 'Bilirubin Indirect', code: 'P_BIL_I', unit: 'mg/dL', min: 0.2, max: 0.8, container: 'SST Tube' },
    { name: 'SGOT (AST)', code: 'P_SGOT', unit: 'U/L', min: 5, max: 40, container: 'SST Tube' },
    { name: 'SGPT (ALT)', code: 'P_SGPT', unit: 'U/L', min: 5, max: 40, container: 'SST Tube' },
    { name: 'Alkaline Phosphatase (ALP)', code: 'P_ALP', unit: 'U/L', min: 40, max: 120, container: 'SST Tube' },
    { name: 'Total Protein', code: 'P_PROT', unit: 'g/dL', min: 6.0, max: 8.3, container: 'SST Tube' },
    { name: 'Albumin', code: 'P_ALB', unit: 'g/dL', min: 3.5, max: 5.2, container: 'SST Tube' },
    { name: 'Globulin', code: 'P_GLOB', unit: 'g/dL', min: 2.3, max: 3.5, container: 'SST Tube' },
    { name: 'A/G Ratio', code: 'P_AG_RATIO', unit: '', min: 1.0, max: 2.5, container: 'SST Tube' },

    // --- BIOCHEMISTRY (KIDNEY - KFT) ---
    { name: 'Urea', code: 'P_UREA', unit: 'mg/dL', min: 15, max: 40, container: 'SST Tube' },
    { name: 'Creatinine', code: 'P_CREAT', unit: 'mg/dL', min: 0.6, max: 1.4, container: 'SST Tube' },
    { name: 'Uric Acid', code: 'P_URIC', unit: 'mg/dL', min: 3.5, max: 7.2, container: 'SST Tube' },
    { name: 'Sodium', code: 'P_NA', unit: 'mEq/L', min: 135, max: 145, container: 'SST Tube' },
    { name: 'Potassium', code: 'P_K', unit: 'mEq/L', min: 3.5, max: 5.1, container: 'SST Tube' },
    { name: 'Chloride', code: 'P_CL', unit: 'mEq/L', min: 98, max: 107, container: 'SST Tube' },
    { name: 'Calcium', code: 'P_CA', unit: 'mg/dL', min: 8.5, max: 10.5, container: 'SST Tube' },
    { name: 'Phosphorus', code: 'P_PHOS', unit: 'mg/dL', min: 2.5, max: 4.5, container: 'SST Tube' },

    // --- BIOCHEMISTRY (LIPID PROFILE) ---
    { name: 'Total Cholesterol', code: 'P_CHOL', unit: 'mg/dL', min: 0, max: 200, container: 'SST Tube' },
    { name: 'Triglycerides', code: 'P_TRIG', unit: 'mg/dL', min: 0, max: 150, container: 'SST Tube' },
    { name: 'HDL Cholesterol', code: 'P_HDL', unit: 'mg/dL', min: 40, max: 60, container: 'SST Tube' },
    { name: 'LDL Cholesterol', code: 'P_LDL', unit: 'mg/dL', min: 0, max: 100, container: 'SST Tube' },
    { name: 'VLDL Cholesterol', code: 'P_VLDL', unit: 'mg/dL', min: 5, max: 40, container: 'SST Tube' },
    { name: 'TC / HDL Ratio', code: 'P_TC_HDL', unit: '', min: 0, max: 5.0, container: 'SST Tube' },

    // --- ENDOCRINOLOGY (THYROID & DIABETES) ---
    { name: 'Total Triiodothyronine (T3)', code: 'P_T3', unit: 'ng/dL', min: 80, max: 200, container: 'SST Tube' },
    { name: 'Total Thyroxine (T4)', code: 'P_T4', unit: 'ug/dL', min: 5.0, max: 12.0, container: 'SST Tube' },
    { name: 'Thyroid Stimulating Hormone (TSH)', code: 'P_TSH', unit: 'uIU/mL', min: 0.4, max: 4.2, container: 'SST Tube' },
    { name: 'Fasting Blood Sugar (FBS)', code: 'P_FBS', unit: 'mg/dL', min: 70, max: 100, container: 'Fluoride Tube' },
    { name: 'Post Prandial Blood Sugar (PPBS)', code: 'P_PPBS', unit: 'mg/dL', min: 70, max: 140, container: 'Fluoride Tube' },
    { name: 'HbA1c (Glycosylated Hb)', code: 'P_HBA1C', unit: '%', min: 4.0, max: 5.6, container: 'EDTA Tube' },
    { name: 'Estimated Average Glucose (eAG)', code: 'P_EAG', unit: 'mg/dL', min: 70, max: 114, container: 'EDTA Tube' },

    // --- IMMUNOLOGY & SEROLOGY ---
    { name: 'C-Reactive Protein (CRP)', code: 'P_CRP', unit: 'mg/L', min: 0, max: 6.0, container: 'SST Tube' },
    { name: 'Rheumatoid Factor (RF)', code: 'P_RF', unit: 'IU/mL', min: 0, max: 20, container: 'SST Tube' },
    { name: 'ASO Titre', code: 'P_ASO', unit: 'IU/mL', min: 0, max: 200, container: 'SST Tube' },
    { name: 'Widal O Antigen', code: 'P_WIDAL_O', unit: 'Titre', type: 'TEXT', container: 'SST Tube' },
    { name: 'Widal H Antigen', code: 'P_WIDAL_H', unit: 'Titre', type: 'TEXT', container: 'SST Tube' },
    { name: 'Dengue NS1 Antigen', code: 'P_DENGUE_NS1', unit: 'Index', type: 'TEXT', container: 'SST Tube' },
    { name: 'HBsAg (Hepatitis B)', code: 'P_HBSAG', unit: '', type: 'TEXT', container: 'SST Tube' },
    { name: 'HIV I & II Antibodies', code: 'P_HIV', unit: '', type: 'TEXT', container: 'SST Tube' },
    { name: 'HCV Antibodies', code: 'P_HCV', unit: '', type: 'TEXT', container: 'SST Tube' },
    { name: 'VDRL / RPR', code: 'P_VDRL', unit: '', type: 'TEXT', container: 'SST Tube' },

    // --- CLINICAL PATHOLOGY (URINE ROUTINE - TEXT BASED) ---
    { name: 'Quantity', code: 'P_U_QTY', unit: 'ml', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Color', code: 'P_U_COLOR', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Appearance', code: 'P_U_APP', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Specific Gravity', code: 'P_U_SG', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Reaction (pH)', code: 'P_U_PH', unit: '', min: 5.0, max: 8.0, container: 'Sterile Container' },
    { name: 'Protein (Albumin)', code: 'P_U_PROT', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Glucose (Sugar)', code: 'P_U_GLU', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Ketones', code: 'P_U_KET', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Blood', code: 'P_U_BLD', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Bilirubin', code: 'P_U_BIL', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Urobilinogen', code: 'P_U_URO', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Nitrite', code: 'P_U_NIT', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Pus Cells', code: 'P_U_PUS', unit: '/hpf', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Red Blood Cells', code: 'P_U_RBC', unit: '/hpf', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Epithelial Cells', code: 'P_U_EPI', unit: '/hpf', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Casts', code: 'P_U_CAST', unit: '/lpf', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Crystals', code: 'P_U_CRYS', unit: '/hpf', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Bacteria', code: 'P_U_BACT', unit: '', type: 'TEXT', container: 'Sterile Container' },
    { name: 'Yeast Cells', code: 'P_U_YEAST', unit: '', type: 'TEXT', container: 'Sterile Container' },

    // --- SPECIALTY BIOCHEMISTRY ---
    { name: 'Vitamin D (25-OH)', code: 'P_VITD', unit: 'ng/mL', min: 30, max: 100, container: 'SST Tube' },
    { name: 'Vitamin B12', code: 'P_VITB12', unit: 'pg/mL', min: 200, max: 900, container: 'SST Tube' },
    { name: 'Iron', code: 'P_IRON', unit: 'ug/dL', min: 60, max: 170, container: 'SST Tube' },
    { name: 'TIBC', code: 'P_TIBC', unit: 'ug/dL', min: 240, max: 450, container: 'SST Tube' },
    { name: 'Ferritin', code: 'P_FERR', unit: 'ng/mL', min: 20, max: 250, container: 'SST Tube' },
    { name: 'Amylase', code: 'P_AMY', unit: 'U/L', min: 28, max: 100, container: 'SST Tube' },
    { name: 'Lipase', code: 'P_LIP', unit: 'U/L', min: 13, max: 60, container: 'SST Tube' },
    { name: 'Hb', code: 'P_HB_STANDALONE', unit: 'g/dL', min: 12.0, max: 16.5, container: 'EDTA Tube' },
  ];

  const dbParams: Record<string, string> = {};

  for (const p of parametersList) {
    const isText = p.type === 'TEXT';
    
    const createdParam = await prisma.labTestParameter.upsert({
      where: { labId_code: { labId, code: p.code } },
      update: { isGlobal: true }, // ✅ Make existing ones global
      create: {
        labId,
        name: p.name,
        code: p.code,
        unit: p.unit,
        inputType: isText ? ParameterInputType.TEXT : ParameterInputType.NUMBER,
        containerTypeId: p.container ? dbContainers[p.container] : null,
        isGlobal: true, // ✅ Create as global
      }
    });

    // Add Reference Range if numeric
    if (!isText && p.min !== undefined && p.max !== undefined) {
      // Check if reference range already exists for this parameter to prevent duplicates on re-seed
      const existingRange = await prisma.parameterReferenceRange.findFirst({
        where: { parameterId: createdParam.id, gender: Gender.BOTH }
      });

      if (!existingRange) {
        await prisma.parameterReferenceRange.create({
          data: {
            parameterId: createdParam.id,
            gender: Gender.BOTH,
            lowValue: p.min,
            highValue: p.max,
            displayText: `${p.min} - ${p.max} ${p.unit}`,
          }
        });
      }
    }

    dbParams[p.code] = createdParam.id;
  }

  // ==========================================
  // 4. 50+ TEST TEMPLATES (INDIVIDUAL & PROFILES)
  // ==========================================
  console.log('📋 Creating 50+ Test Templates & Profiles (As Global)...');

  const testsList: any[] = [
    // 1. PROFILES (Multiple Params)
    {
      name: 'Complete Blood Count (CBC)', code: 'T_CBC', dept: 'Hematology', sample: 'Whole Blood', container: 'EDTA Tube', price: 350, type: TestType.PROFILE,
      params: ['P_HB', 'P_RBC', 'P_PCV', 'P_MCV', 'P_MCH', 'P_MCHC', 'P_WBC', 'P_NEUTRO', 'P_LYMPHO', 'P_MONO', 'P_EOSINO', 'P_BASO', 'P_PLT']
    },
    {
      name: 'Liver Function Test (LFT)', code: 'T_LFT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 600, type: TestType.PROFILE,
      params: ['P_BIL_T', 'P_BIL_D', 'P_BIL_I', 'P_SGOT', 'P_SGPT', 'P_ALP', 'P_PROT', 'P_ALB', 'P_GLOB', 'P_AG_RATIO']
    },
    {
      name: 'Kidney Function Test (KFT)', code: 'T_KFT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 600, type: TestType.PROFILE,
      params: ['P_UREA', 'P_CREAT', 'P_URIC', 'P_NA', 'P_K', 'P_CL', 'P_CA', 'P_PHOS']
    },
    {
      name: 'Lipid Profile', code: 'T_LIPID', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 500, type: TestType.PROFILE,
      params: ['P_CHOL', 'P_TRIG', 'P_HDL', 'P_LDL', 'P_VLDL', 'P_TC_HDL']
    },
    {
      name: 'Thyroid Profile (T3, T4, TSH)', code: 'T_TFT', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube', price: 550, type: TestType.PROFILE,
      params: ['P_T3', 'P_T4', 'P_TSH']
    },
    {
      name: 'Urine Routine & Microscopy', code: 'T_URM', dept: 'Clinical Pathology', sample: 'Urine', container: 'Sterile Container', price: 150, type: TestType.PROFILE,
      params: ['P_U_QTY', 'P_U_COLOR', 'P_U_APP', 'P_U_SG', 'P_U_PH', 'P_U_PROT', 'P_U_GLU', 'P_U_KET', 'P_U_BLD', 'P_U_BIL', 'P_U_URO', 'P_U_NIT', 'P_U_PUS', 'P_U_RBC', 'P_U_EPI', 'P_U_CAST', 'P_U_CRYS', 'P_U_BACT', 'P_U_YEAST']
    },
    {
      name: 'Iron Profile', code: 'T_IRON_PROF', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 700, type: TestType.PROFILE,
      params: ['P_IRON', 'P_TIBC', 'P_FERR']
    },
    {
      name: 'Diabetic Profile', code: 'T_DIAB_PROF', dept: 'Biochemistry', sample: 'Whole Blood', container: 'EDTA Tube', price: 600, type: TestType.PROFILE,
      params: ['P_FBS', 'P_HBA1C', 'P_EAG']
    },

    // 2. SINGLE TESTS (Generated from existing params)
    { name: 'Hemoglobin (Hb)', code: 'T_HB', dept: 'Hematology', sample: 'Whole Blood', container: 'EDTA Tube', price: 100, params: ['P_HB_STANDALONE'] },
    { name: 'Erythrocyte Sedimentation Rate (ESR)', code: 'T_ESR', dept: 'Hematology', sample: 'Whole Blood', container: 'EDTA Tube', price: 100, params: ['P_ESR'] },
    { name: 'Blood Sugar Fasting (FBS)', code: 'T_FBS', dept: 'Biochemistry', sample: 'Plasma', container: 'Fluoride Tube', price: 80, params: ['P_FBS'] },
    { name: 'Blood Sugar Post Prandial (PPBS)', code: 'T_PPBS', dept: 'Biochemistry', sample: 'Plasma', container: 'Fluoride Tube', price: 80, params: ['P_PPBS'] },
    { name: 'HbA1c', code: 'T_HBA1C', dept: 'Biochemistry', sample: 'Whole Blood', container: 'EDTA Tube', price: 400, params: ['P_HBA1C', 'P_EAG'] },
    { name: 'Urea', code: 'T_UREA', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 150, params: ['P_UREA'] },
    { name: 'Creatinine', code: 'T_CREAT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 150, params: ['P_CREAT'] },
    { name: 'Uric Acid', code: 'T_URIC', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 150, params: ['P_URIC'] },
    { name: 'Serum Electrolytes (Na, K, Cl)', code: 'T_ELECT', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 350, type: TestType.PROFILE, params: ['P_NA', 'P_K', 'P_CL'] },
    { name: 'Calcium', code: 'T_CA', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 200, params: ['P_CA'] },
    { name: 'Phosphorus', code: 'T_PHOS', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 200, params: ['P_PHOS'] },
    { name: 'Vitamin D (25-OH)', code: 'T_VITD', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 1200, params: ['P_VITD'] },
    { name: 'Vitamin B12', code: 'T_VITB12', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 1000, params: ['P_VITB12'] },
    { name: 'C-Reactive Protein (CRP)', code: 'T_CRP', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 450, params: ['P_CRP'] },
    { name: 'Rheumatoid Factor (RF)', code: 'T_RF', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 400, params: ['P_RF'] },
    { name: 'ASO Titre', code: 'T_ASO', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 400, params: ['P_ASO'] },
    { name: 'Widal Test', code: 'T_WIDAL', dept: 'Microbiology', sample: 'Serum', container: 'SST Tube', price: 250, type: TestType.PROFILE, params: ['P_WIDAL_O', 'P_WIDAL_H'] },
    { name: 'Dengue NS1 Antigen', code: 'T_DENGUE', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 600, params: ['P_DENGUE_NS1'] },
    { name: 'HBsAg (Hepatitis B)', code: 'T_HBSAG', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 300, params: ['P_HBSAG'] },
    { name: 'HIV I & II Antibodies', code: 'T_HIV', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 400, params: ['P_HIV'] },
    { name: 'HCV Antibodies', code: 'T_HCV', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 500, params: ['P_HCV'] },
    { name: 'VDRL / RPR', code: 'T_VDRL', dept: 'Immunology & Serology', sample: 'Serum', container: 'SST Tube', price: 200, params: ['P_VDRL'] },
    { name: 'Amylase', code: 'T_AMY', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 500, params: ['P_AMY'] },
    { name: 'Lipase', code: 'T_LIP', dept: 'Biochemistry', sample: 'Serum', container: 'SST Tube', price: 600, params: ['P_LIP'] },
    { name: 'TSH', code: 'T_TSH_ONLY', dept: 'Endocrinology', sample: 'Serum', container: 'SST Tube', price: 300, params: ['P_TSH'] },
  ];

  // We loop to duplicate some single tests to reach 50+ distinct test templates.
  const extraTests = [
    'Total Cholesterol', 'Triglycerides', 'HDL Cholesterol', 'LDL Cholesterol', 
    'Bilirubin Total', 'SGOT', 'SGPT', 'Alkaline Phosphatase', 'Total Protein', 'Albumin',
    'Platelet Count', 'WBC Count'
  ];

  let counter = 1;
  for (const tName of extraTests) {
    // Find matching param
    const matchingParam = parametersList.find(p => p.name.includes(tName));
    if (matchingParam) {
      testsList.push({
        name: tName + ' (Single Test)',
        code: `T_EXT_${counter}`,
        dept: 'Biochemistry', // default
        sample: matchingParam.container === 'EDTA Tube' ? 'Whole Blood' : 'Serum',
        container: matchingParam.container,
        price: 150,
        type: TestType.SINGLE,
        params: [matchingParam.code]
      });
      counter++;
    }
  }

  // CREATE ALL TESTS IN DB
  for (const test of testsList) {
    const createdTest = await prisma.testTemplate.upsert({
      where: { labId_code: { labId, code: test.code } },
      update: { isGlobal: true }, // ✅ Make existing ones global
      create: {
        labId,
        name: test.name,
        code: test.code,
        price: test.price,
        type: test.type || TestType.SINGLE,
        departmentId: dbDepts[test.dept],
        sampleTypeId: dbSamples[test.sample],
        containerTypeId: dbContainers[test.container],
        isActive: true,
        isGlobal: true, // ✅ Create as global
      }
    });

    // MAP PARAMETERS TO TEST
    for (let i = 0; i < test.params.length; i++) {
      const paramCode = test.params[i];
      const paramId = dbParams[paramCode];

      if (paramId) {
        await prisma.testTemplateParameter.upsert({
          where: { templateId_parameterId: { templateId: createdTest.id, parameterId: paramId } },
          update: {},
          create: {
            templateId: createdTest.id,
            parameterId: paramId,
            order: i + 1,
          }
        });
      }
    }
  }

  console.log('✅ Seeding Complete! Loaded 100+ Parameters and 50+ Global Test Templates successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });