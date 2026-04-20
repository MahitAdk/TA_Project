import { pool } from "../config/db.js";

export const updateUserPlan = async (userId, plan) => {
  await pool.query("UPDATE users SET plan = $1 WHERE id = $2", [plan, userId]);
};

export const getUserById = async (userId) => {
  const result = await pool.query(
    "SELECT id, username, email, plan FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0];
};
