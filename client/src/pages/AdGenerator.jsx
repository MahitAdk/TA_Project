import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAdHistory, generateAdFromImage } from "../services/ad.service.js";

// 1. Updated messages to reflect the video generation process
const LOADING_MESSAGES = [
  "Analyzing your product image...",
  "Writing your persuasive ad copy...",
  "Generating base creative...",
  "Animating video with Kling AI...",
  "This usually takes 1-2 minutes...",
  "Finalizing your cinematic ad...",
];

const normalizeHistoryItem = (item) => ({
  ...item,
  // Mapping the backend column to a Video URL
  generatedVideoUrl: item.generatedVideoUrl || item.generated_image_url || null,
  originalImageUrl: item.originalImageUrl || item.original_image_url || null,
  productName: item.productName || item.product_name || "Untitled ad",
  headline: item.headline || "AI-generated creative",
  adCopy: item.adCopy || item.ad_copy || "",
  createdAt: item.createdAt || item.created_at,
  hashtags: item.hashtags || [],
});

const isValidImageFile = (file) =>
  ["image/jpeg", "image/png", "image/webp"].includes(file?.type);

export default function AdGenerator() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const msgIndexRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    fetchAdHistory()
      .then((data) => setHistory((data.ads || []).map(normalizeHistoryItem)))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }
        console.error(err);
      });
  }, [navigate]);

  useEffect(() => {
    if (!loading) return undefined;

    const interval = setInterval(() => {
      msgIndexRef.current = (msgIndexRef.current + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIndexRef.current]);
    }, 4000); // Slightly longer interval for video generation

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const assignFile = (file) => {
    if (!file) return;
    if (!isValidImageFile(file)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleFileSelect = (event) => assignFile(event.target.files?.[0]);
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    assignFile(event.dataTransfer.files?.[0]);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    msgIndexRef.current = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);

    try {
      const data = normalizeHistoryItem(await generateAdFromImage(selectedFile));
      setResult(data);
      setHistory((prev) => [data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to generate ad.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

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
          <Link to="/ad-generator" className="nav-pill-link nav-pill-link-active">Ad Generator</Link>
          <Link to="/video-library" className="nav-pill-link">Video Library</Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="ad-generator-shell">
        <div className="ad-generator-hero">
          <p className="ad-generator-eyebrow">Paid Workspace</p>
          <h1>AI Video Ad Generator</h1>
          <p>
            Upload a photo and watch it transform into a cinematic 10-second video ad 
            with professional copy and motion.
          </p>
        </div>

        {!result && (
          <div className="ad-panel">
            <div
              className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="upload-preview" />
              ) : (
                <div>
                  <p className="upload-title">Click or drag a product image here</p>
                  <p className="upload-subtitle">JPEG, PNG, or WebP. Max 5 MB.</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden-input"
              onChange={handleFileSelect}
            />

            {selectedFile && (
              <p className="upload-meta">
                Ready to animate: <strong>{selectedFile.name}</strong>
              </p>
            )}

            {error && <p className="error">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={!selectedFile || loading}
              className="generator-primary-btn"
            >
              {loading ? (
                <div className="loading-spinner-container">
                  <span className="spinner"></span> {loadingMsg}
                </div>
              ) : "Generate Video Ad *"}
            </button>
          </div>
        )}

        {result && (
          <div className="ad-result-grid">
            <div className="ad-panel">
              {result.videoGenerationFailed || !result.generatedVideoUrl ? (
                <div className="generated-placeholder">
                  Video generation unavailable. Your ad copy is ready below.
                </div>
              ) : (
                <>
                  {/* 2. Swapped Image for Video Player */}
                  <video 
                    controls  
                    loop 
                    className="generated-preview"
                    poster={result.originalImageUrl}
                    preload="none"
                  >
                    <source src={result.generatedVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  
                  <a
                    href={result.generatedVideoUrl}
                    download={`${result.productName || "ad"}.mp4`}
                    className="download-link"
                  >
                    Download Video Ad (.mp4)
                  </a>
                </>
              )}
            </div>

            <div className="ad-panel ad-copy-panel">
              <p className="ad-copy-label">Product</p>
              <p className="ad-copy-value">{result.productName}</p>

              <p className="ad-copy-label">Headline</p>
              <p className="ad-copy-headline">{result.headline}</p>

              <p className="ad-copy-label">Ad Copy</p>
              <p className="ad-copy-body">{result.adCopy}</p>

              <div className="ad-copy-meta-grid">
                <div>
                  <p className="ad-copy-label">CTA</p>
                  <span className="cta-pill">{result.cta}</span>
                </div>
                <div>
                  <p className="ad-copy-label">Platform</p>
                  <span className="platform-badge">{result.platform}</span>
                </div>
              </div>

              <p className="ad-copy-label">Key Features</p>
              <p className="ad-copy-body">{result.keyFeatures}</p>

              <p className="ad-copy-label">Tone & Strategy</p>
              <p className="ad-copy-body">
                <strong>{result.tone}</strong> - {result.usp}
              </p>

              <p className="ad-copy-label">Hashtags</p>
              <div className="hashtag-list">
                {(result.hashtags || []).map((tag) => (
                  <span key={tag} className="hashtag-chip">#{tag}</span>
                ))}
              </div>

              <button onClick={handleReset} className="generator-secondary-btn">
                Generate Another
              </button>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="history-section">
            <h2>Your Video Ad History</h2>
            <div className="history-grid">
              {history.map((item) => (
                <div key={item.id} className="history-card">
                  {/* 3. History uses product photo as thumbnail for speed */}
                  <div className="history-thumbnail-wrapper">
                    <img
                      src={item.originalImageUrl || "/placeholder.png"}
                      alt={item.productName}
                      className="history-image"
                    />
                    {item.generatedVideoUrl && (
                      <span className="video-badge">▶ Video</span>
                    )}
                  </div>

                  <div className="history-card-body">
                    <p className="history-title">{item.productName}</p>
                    <p className="history-subtitle">{item.headline}</p>
                    <p className="history-date">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "Just now"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
