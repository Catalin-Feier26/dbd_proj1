import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5435"),
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "root",
  database: process.env.PG_DATABASE || "steamdb",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

export default pool;
