import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/auth";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const res = await registerUser(form);

      // ✅ auto login after register
      localStorage.setItem("token", res.data.token);

      setIsSuccess(true);
      setMsg("Registration successful");

      setTimeout(() => {
        navigate("/home");
      }, 1000);

    } catch (err) {
      setIsSuccess(false);
      setMsg(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="auth-page">

      <div className="top-bar">
        <h3>AI video ads generator</h3>

        <div className="nav-links">
          <Link to="/">Login</Link>
          <span className="nav-divider"></span>
          <Link to="/register" className="register-btn">Register</Link>
        </div>
      </div>

      <div className="auth-container">
        <div className="auth-form">

          <h2>Create account</h2>

          {msg && (
            <p className={isSuccess ? "success" : "error"}>
              {msg}
            </p>
          )}

          <input
            className="auth-input"
            placeholder="Username"
            value={form.username}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />

          <input
            className="auth-input"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <div style={{ position: "relative" }}>
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "35%",
                cursor: "pointer"
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <button className="submit-btn" onClick={handleSubmit}>
            Register
          </button>

        </div>
      </div>
    </div>
  );
}