import { useState, useRef } from 'react';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import "./LeafDiseasePrediction.css";

function LeafDiseasePrediction({ onBack }) {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // ───────── IMAGE HANDLING ─────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
      setPrediction(null);
      setError(null);
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];

    if (file && file.type.startsWith('image/')) {
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setPrediction(null);
        setError(null);
      };

      reader.readAsDataURL(file);
    }
  };

  // ───────── PREDICTION ─────────
  const handlePredictDisease = async () => {
    if (!imageFile) {
      setError('Please upload an image first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('http://127.0.0.1:8000/api/predict-disease', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to predict disease.');
      }

      const result = await response.json();
      setPrediction(result);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearImage = () => {
    setImage(null);
    setImageFile(null);
    setPrediction(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="disease-prediction-container">
      <div className="prediction-content">

        <header className="prediction-header">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={24} />
            <span>Back</span>
          </button>
          <h1 className="page-title">Leaf Disease Detection</h1>
          <div className="header-spacer"></div>
        </header>

        <div className="prediction-main">

          {/* ───── Upload Section ───── */}
          <div className="upload-section">
            <h2 className="section-title">Upload Leaf Image</h2>
            <p className="section-subtitle">
              Take a clear photo of the affected leaf for accurate disease detection
            </p>

            <div
              className={`upload-area ${image ? 'has-image' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDragDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <div className="image-preview">
                  <img src={image} alt="Leaf Preview" />
                </div>
              ) : (
                <div className="upload-prompt">
                  <Upload size={48} />
                  <p>Drag & drop your image here</p>
                  <p>or click to browse</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden-input"
              />
            </div>

            {image && (
              <div className="image-actions">
                <button className="action-btn clear-btn" onClick={handleClearImage}>
                  Clear Image
                </button>
                <button
                  className="action-btn predict-btn"
                  onClick={handlePredictDisease}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="spinner" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Predict Disease</span>
                  )}
                </button>
              </div>
            )}

            {loading && (
              <div className="upload-status">
                🤖 Running disease analysis...
              </div>
            )}
          </div>

          {/* ───── Error Section ───── */}
          {error && (
            <div className="result-section error-result">
              <div className="result-header error-header">
                <AlertCircle size={24} />
                <h3>Error</h3>
              </div>
              <p>{error}</p>
            </div>
          )}

          {/* ───── Result Section ───── */}
          {prediction && (
            <div className="result-section success-result">
              <div className="result-header success-header">
                <CheckCircle size={24} />
                <h3>Diagnosis Result</h3>
              </div>

              <div className="prediction-details">

                <div className="detail-item">
                  <label>Disease Detected</label>
                  <p className="disease-name">{prediction.disease}</p>
                </div>

                <div className="detail-item">
                  <label>Confidence</label>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${(prediction.confidence || 0) * 100}%` }}
                    ></div>
                  </div>
                  <p>{((prediction.confidence || 0) * 100).toFixed(1)}%</p>
                </div>

                {prediction.description && (
                  <div className="detail-item">
                    <label>Description</label>
                    <p>{prediction.description}</p>
                  </div>
                )}

                {prediction.treatment && (
                  <div className="detail-item">
                    <label>Recommended Treatment</label>
                    <p>{prediction.treatment}</p>
                  </div>
                )}

              </div>

              <button className="action-btn predict-btn" onClick={handleClearImage}>
                Analyze Another Leaf
              </button>
            </div>
          )}

          {/* ───── Tips Section (Restored) ───── */}
          {!image && !prediction && (
            <div className="info-section">
              <h3 className="info-title">Tips for Best Results</h3>
              <ul className="info-list">
                <li>Use good natural lighting</li>
                <li>Focus clearly on the affected leaf area</li>
                <li>Avoid shadows and glare</li>
                <li>Hold the camera steady</li>
                <li>Capture a close-up of the leaf</li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default LeafDiseasePrediction;