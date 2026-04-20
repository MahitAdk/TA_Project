import { pool } from "../config/db.js";

export const findUser = async (email, username) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR username = $2",
    [email, username]
  );

  return result.rows[0];
};

export const createUser = async (username, email, password) => {
  const result = await pool.query(
    `INSERT INTO users(username, email, password)
     VALUES($1, $2, $3)
     RETURNING id, username, email, plan`,
    [username, email, password]
  );

  return result.rows[0];
};
