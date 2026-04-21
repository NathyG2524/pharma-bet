import dataSource from "../typeorm-config";
import { seedPlatformBootstrap } from "./platform-bootstrap.seed";

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedPlatformBootstrap(dataSource);
    console.log("[seed] Platform bootstrap finished.");
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[seed] Failed:", err);
  process.exitCode = 1;
});
