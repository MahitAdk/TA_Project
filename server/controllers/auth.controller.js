import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUser, createUser } from "../services/auth.service.js";
import { validatePassword } from "../utils/passwordValidator.js";

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be 8-15 chars, include upper, lower, digit, special char, no spaces",
      });
    }

    const existingUser = await findUser(email, username);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // assuming createUser returns created user
    const newUser = await createUser(username, email, hashed);

    // ✅ auto login after register
    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(201).json({
      message: "User registered successfully",
      token,
    });

  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({
        message: "Provide email or username and password",
      });
    }

    const user = await findUser(email, username);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({ token });

  } catch (err) {
    next(err);
  }
};