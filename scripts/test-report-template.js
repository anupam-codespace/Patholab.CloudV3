const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Test that we can create a ReportTemplate with a config OBJECT (which the action will JSON.stringify)
    // We simulate what the action does
    const configObj = {
      layout: { margins: { top: 10, bottom: 10, left: 10, right: 10 } },
      header: { show: true, title: 'Test' },
    };
    const configString = JSON.stringify(configObj);

    const created = await prisma.reportTemplate.create({
      data: {
        labId: 'ad651d19-a4e9-4d0b-beb6-20cf847cdadb', // Test Lab
        name: 'Test Template (auto-cleanup)',
        config: configString,
        isActive: false,
      },
    });
    console.log('✅ Created report template:', created.id);

    // Verify we can read it back and parse the config
    const fetched = await prisma.reportTemplate.findUnique({ where: { id: created.id } });
    const parsed = JSON.parse(fetched.config);
    console.log('✅ Config round-trip works:', parsed.header.title);

    // Cleanup
    await prisma.reportTemplate.delete({ where: { id: created.id } });
    console.log('✅ Cleanup done');
  } catch (e) {
    console.error('❌ Test failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
