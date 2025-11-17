import dotenv from "dotenv";
import { connectMongoDB } from "./config/mongodb";
import pool from "./config/postgres";
import migrationService from "./services/migrationService";

dotenv.config();

async function runMigration() {
  try {
    console.log("Connecting to databases...\n");

    await connectMongoDB();
    console.log("Connected to MongoDB\n");

    await pool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL\n");

    const limit = process.argv.includes("--limit")
      ? parseInt(process.argv[process.argv.indexOf("--limit") + 1])
      : undefined;

    if (limit) {
      console.log(`Running migration with limit: ${limit}\n`);
    }

    await migrationService.migrate(limit);

    console.log("\nFinal Statistics:");
    const stats = await migrationService.getStatistics();
    console.log(JSON.stringify(stats, null, 2));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
