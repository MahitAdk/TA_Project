import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/auth";

export default function Login() {
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
      const res = await loginUser(form);

      localStorage.setItem("token", res.data.token);

      setIsSuccess(true);
      setMsg("Login successful");

      setTimeout(() => {
        navigate("/home");
      }, 1000);

    } catch (err) {
      setIsSuccess(false);
      setMsg(err.response?.data?.message || "Login failed");
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

          <h2>Login</h2>

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
            Login
          </button>

        </div>
      </div>
    </div>
  );
}