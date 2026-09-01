const { PrismaClient } = require("@prisma/client");
const { getFeatureConfiguration } = require("../src/lib/featureConfig");

const prisma = new PrismaClient();

async function runInstituteModeTest() {
  console.log("=== STARTING INSTITUTE MODE & FEATURE CONFIG TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) {
      console.log("Creating temporary test institute...");
      const newInst = await prisma.institute.create({
        data: {
          name: "Mode Test Institute",
          institute_mode: "hybrid",
        },
      });
      console.log(`Created test institute ID: ${newInst.id}`);
    }

    const testInstitute = await prisma.institute.findFirst();

    console.log("\n1. Testing updating institute_mode to 'offline'...");
    const updatedOffline = await prisma.institute.update({
      where: { id: testInstitute.id },
      data: { institute_mode: "offline" },
    });
    console.log(`✓ Database record updated: institute_mode = ${updatedOffline.institute_mode}`);
    console.assert(updatedOffline.institute_mode === "offline", "Expected 'offline' mode!");

    const offlineFeatures = getFeatureConfiguration("offline");
    console.log(`✓ Features enabled for 'offline': ${offlineFeatures.enabledFeatures.map(f => f.key).join(", ")}`);
    console.assert(offlineFeatures.isFeatureEnabled("physical_classrooms") === true, "physical_classrooms should be enabled in offline!");
    console.assert(offlineFeatures.isFeatureEnabled("virtual_classrooms") === false, "virtual_classrooms should be disabled in offline!");

    console.log("\n2. Testing updating institute_mode to 'online'...");
    const updatedOnline = await prisma.institute.update({
      where: { id: testInstitute.id },
      data: { institute_mode: "online" },
    });
    console.log(`✓ Database record updated: institute_mode = ${updatedOnline.institute_mode}`);
    console.assert(updatedOnline.institute_mode === "online", "Expected 'online' mode!");

    const onlineFeatures = getFeatureConfiguration("online");
    console.log(`✓ Features enabled for 'online': ${onlineFeatures.enabledFeatures.map(f => f.key).join(", ")}`);
    console.assert(onlineFeatures.isFeatureEnabled("virtual_classrooms") === true, "virtual_classrooms should be enabled in online!");
    console.assert(onlineFeatures.isFeatureEnabled("physical_classrooms") === false, "physical_classrooms should be disabled in online!");

    console.log("\n3. Testing updating institute_mode to 'hybrid'...");
    const updatedHybrid = await prisma.institute.update({
      where: { id: testInstitute.id },
      data: { institute_mode: "hybrid" },
    });
    console.log(`✓ Database record updated: institute_mode = ${updatedHybrid.institute_mode}`);
    console.assert(updatedHybrid.institute_mode === "hybrid", "Expected 'hybrid' mode!");

    const hybridFeatures = getFeatureConfiguration("hybrid");
    console.assert(hybridFeatures.isFeatureEnabled("physical_classrooms") === true, "physical_classrooms should be enabled in hybrid!");
    console.assert(hybridFeatures.isFeatureEnabled("virtual_classrooms") === true, "virtual_classrooms should be enabled in hybrid!");

    console.log("\n=== ALL INSTITUTE MODE TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Institute mode test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runInstituteModeTest();
