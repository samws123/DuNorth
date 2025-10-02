// db.js
import { Pool } from "pg";

let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!pool) {
    console.log("🔌 Initializing DB pool...");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
      ssl: { rejectUnauthorized: false },
    });

    pool.on("connect", () => console.log("✅ DB connection established"));
    pool.on("acquire", () => console.log("📥 Client acquired from pool"));
    pool.on("remove", () => console.log("❌ Client removed from pool"));
    pool.on("error", (err) => console.error("🔥 Pool error:", err));
  }
  return pool;
}

// Utility to validate UUID
function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function queryDb(collection, filters = {}) {
  const client = await getPool().connect();
  try {
    let sql;
    const values = [];

    // Validate UUIDs in filters
    for (const key in filters) {
      if (key === "user_id") {
        if (!isValidUUID(filters[key])) {
          console.log(`Invalid UUID provided for ${key}: ${filters[key]}`)
          throw new Error(`Invalid UUID provided for ${key}: ${filters[key]}`);
        }
      }
      values.push(filters[key]);
    }

    // Dynamic WHERE clause
    const conditions = Object.keys(filters).map((key, i) => `${key} = $${i + 1}`);
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    switch (collection) {
      case "assignments":
        sql = `
          SELECT a.*, c.name AS course_name, g.score, g.grade, g.graded_at
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          LEFT JOIN grades g ON g.assignment_id = a.id
          ${whereClause}
          ORDER BY a.created_at DESC
          LIMIT 10
        `;
        break;

      case "grades":
        sql = `
          SELECT g.*, a.name AS assignment_name, a.points_possible, c.name AS course_name
          FROM grades g
          JOIN assignments a ON g.assignment_id = a.id
          JOIN courses c ON g.course_id = c.id
          ${whereClause}
          ORDER BY g.graded_at DESC
          LIMIT 10
        `;
        break;

      case "announcements":
        sql = `
          SELECT an.*, c.name AS course_name
          FROM announcements an
          JOIN courses c ON an.course_id = c.id
          ${whereClause}
          ORDER BY an.posted_at DESC
          LIMIT 10
        `;
        break;

      case "files":
        sql = `
          SELECT f.*, c.name AS course_name
          FROM files f
          JOIN courses c ON f.course_id = c.id
          ${whereClause}
          ORDER BY f.created_at DESC
          LIMIT 10
        `;
        break;

      case "courses":
        sql = `
          SELECT id, name, course_code, term, created_at, updated_at
          FROM courses
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT 10
        `;
        break;

      default:
        sql = `
          SELECT *
          FROM ${collection}
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT 10
        `;
        break;
    }

    console.log("📌 Executing SQL:", sql, values);
    const res = await client.query(sql, values);
    return res.rows;
  } catch (err) {
    console.error("🔥 DB query error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}
