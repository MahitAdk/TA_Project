import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/");
          return;
        }

        const res = await axios.get("/api/user/home", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(res.data.user);
      } catch {
        localStorage.removeItem("token");
        navigate("/");
      }
    };

    fetchUser();
  }, [navigate]);

  const handlePayment = async (plan) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      if (!window.Razorpay) {
        alert("Payment system is unavailable right now.");
        return;
      }

      const { data: order } = await axios.post(
        "/api/payment/create-order",
        { plan },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "AI Video Ads Generator",
        description: `${plan} plan`,
        order_id: order.id,
        handler: async (response) => {
          await axios.post(
            "/api/payment/verify",
            {
              ...response,
              plan,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const refreshed = await axios.get("/api/user/home", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          setUser(refreshed.data.user);
          alert("Payment successful.");
        },
        theme: {
          color: "#22c55e",
        },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Payment failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      alert("Enter a prompt");
      return;
    }

    console.log("Prompt:", prompt);
    console.log("Uploaded Image:", image);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setImage(file);
    }
  };

  return (
    <div className="home-page">
      <div className="navbar">
        <h2>AI Video Ads Generator</h2>

        <div className="nav-right nav-right-links">
          <Link to="/home" className="nav-pill-link nav-pill-link-active">
            Home
          </Link>
          <Link to="/ad-generator" className="nav-pill-link">
            Ad Generator
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="home-container">
        <h1>Welcome, {user?.username}</h1>
        <p>Create AI-powered video ads in seconds.</p>

        <div className="generator-box">
          <input type="file" accept="image/*" onChange={handleImageUpload} />

          {image && (
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              Selected: {image.name}
            </p>
          )}

          <textarea
            placeholder="Describe your ad idea..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <button onClick={handleGenerate}>Generate Video</button>
        </div>

        <div className="home-shortcut-card">
          <div>
            <p className="home-shortcut-label">New Feature</p>
            <h3>Image to Ad Generator</h3>
            <p>
              Upload a product image, generate ad copy, and download a polished
              creative from one workspace.
            </p>
          </div>
          <Link to="/ad-generator" className="home-shortcut-link">
            Open Ad Generator
          </Link>
        </div>

        <div className="pricing-section">
          <h2>Pricing Plans</h2>

          <div className="pricing-cards">
            <div className="card">
              <h3>Starter</h3>
              <p className="price">Rs 0</p>
              <ul>
                <li>3 videos / month</li>
                <li>Basic quality</li>
                <li>Watermarked</li>
              </ul>
              <button disabled={(user?.plan || "starter") === "starter"}>
                Current Plan
              </button>
            </div>

            <div className="card highlight">
              <h3>Pro</h3>
              <p className="price">Rs 499 / month</p>
              <ul>
                <li>50 videos / month</li>
                <li>HD quality</li>
                <li>No watermark</li>
              </ul>
              <button onClick={() => handlePayment("pro")}>Upgrade</button>
            </div>

            <div className="card">
              <h3>Enterprise</h3>
              <p className="price">Rs 1499 / month</p>
              <ul>
                <li>Unlimited videos</li>
                <li>4K quality</li>
                <li>Priority support</li>
              </ul>
              <button onClick={() => handlePayment("enterprise")}>
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
