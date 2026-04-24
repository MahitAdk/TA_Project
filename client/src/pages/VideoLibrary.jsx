import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchVideoLibrary } from "../services/ad.service.js";

const normalizeVideoItem = (item) => ({
  ...item,
  id: item.id,
  generatedVideoUrl: item.generatedVideoUrl || item.generated_image_url || null,
  originalImageUrl: item.originalImageUrl || item.original_image_url || null,
  productName: item.productName || item.product_name || "Untitled ad",
  headline: item.headline || "AI-generated video ad",
  adCopy: item.adCopy || item.ad_copy || "",
  createdAt: item.createdAt || item.created_at || null,
  status: item.status || "completed",
});

const formatCreatedAt = (value) => {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function VideoLibrary() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    const loadVideos = async () => {
      try {
        setLoading(true);
        const data = await fetchVideoLibrary();
        setVideos((data.videos || []).map(normalizeVideoItem));
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load your video library."
        );
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="home-page ad-generator-page">
      <div className="navbar">
        <h2>AI Video Ads Generator</h2>
        <div className="nav-right nav-right-links">
          <Link to="/home" className="nav-pill-link">Home</Link>
          <Link to="/ad-generator" className="nav-pill-link">Ad Generator</Link>
          <Link to="/video-library" className="nav-pill-link nav-pill-link-active">
            Video Library
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="ad-generator-shell">
        <div className="video-library-hero">
          <p className="ad-generator-eyebrow">Content Archive</p>
          <h1>Your Generated Video Ads</h1>
          <p>
            Review every completed video ad in one place, play it instantly,
            and see exactly when it was created.
          </p>
        </div>

        {loading && (
          <div className="ad-panel">
            <div className="history-placeholder">
              Loading your video library...
            </div>
          </div>
        )}

        {!loading && error && <p className="error">{error}</p>}

        {!loading && !error && videos.length === 0 && (
          <div className="ad-panel">
            <div className="history-placeholder">
              No generated videos yet. Create your first ad from the generator page.
            </div>
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="video-library-grid">
            {videos.map((video) => (
              <article key={video.id} className="video-library-card">
                <video
                  controls
                  preload="metadata"
                  poster={video.originalImageUrl || undefined}
                  className="video-library-player"
                >
                  <source src={video.generatedVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <div className="video-library-content">
                  <div className="video-library-meta">
                    <span className="video-library-chip">10 sec render</span>
                    <span className="video-library-time">
                      {formatCreatedAt(video.createdAt)}
                    </span>
                  </div>

                  <h3>{video.productName}</h3>
                  <p className="video-library-headline">{video.headline}</p>
                  <p className="video-library-copy">{video.adCopy}</p>

                  <div className="video-library-actions">
                    <a
                      href={video.generatedVideoUrl}
                      download={`${video.productName || "ad"}.mp4`}
                      className="download-link"
                    >
                      Download Video
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
