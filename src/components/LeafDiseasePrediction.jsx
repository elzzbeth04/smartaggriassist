import { useState, useRef } from 'react';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import "./LeafDiseasePrediction.css";

function LeafDiseasePrediction({ onBack }) {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setError(null);
        setPrediction(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setError(null);
        setPrediction(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Step 1: Upload image to Supabase bucket, return public URL
  const uploadImageToBucket = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('leaf-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

    // Get public URL
    const { data } = supabase.storage
      .from('leaf-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };
  
  // ── Step 2: Save prediction result + image URL to predictions table
  const savePredictionToDB = async (imageUrl, result) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error: dbError } = await supabase.from('predictions').insert({
      user_id: user.id,
      image_url: imageUrl,
      disease_name: result.disease || 'Unknown',
      confidence: result.confidence || 0,
      treatment: result.treatment || null,
    });

    if (dbError) throw new Error(`Failed to save prediction: ${dbError.message}`);
  };

  const handlePredictDisease = async () => {
    if (!imageFile) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1 — Upload to Supabase bucket → get URL
      const imageUrl = await uploadImageToBucket(imageFile);
      console.log('✅ Bucket URL:', imageUrl);
      // Step 2 — Send URL to ML backend for prediction
      const response = await fetch('/api/predict-disease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      if (!response.ok) throw new Error('Failed to predict disease');
      const result = await response.json();
      console.log('✅ ML Result:', result);
      // Step 3 — Save image URL + result to Supabase DB
      await savePredictionToDB(imageUrl, result);
      console.log('✅ Saved to DB');
      setPrediction(result);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      console.error('Prediction error:', err);
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
      <div className="background-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

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
                  <img src={image} alt="Leaf" />
                </div>
              ) : (
                <div className="upload-prompt">
                  <Upload size={48} />
                  <p className="upload-text">Drag and drop your image here</p>
                  <p className="upload-subtext">or click to browse</p>
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

            {/* Upload progress indicator */}
            {loading && (
              <div className="upload-status">
                <p className="upload-status-text">
                  📤 Uploading image → 🤖 Running analysis → 💾 Saving result...
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="result-section error-result">
              <div className="result-header error-header">
                <AlertCircle size={24} />
                <h3>Error</h3>
              </div>
              <p className="result-message">{error}</p>
            </div>
          )}

          {prediction && (
            <div className="result-section success-result">
              <div className="result-header success-header">
                <CheckCircle size={24} />
                <h3>Diagnosis Result</h3>
              </div>

              <div className="prediction-details">
                <div className="detail-item">
                  <label className="detail-label">Disease Detected</label>
                  <p className="detail-value disease-name">
                    {prediction.disease || 'Unknown Disease'}
                  </p>
                </div>

                <div className="detail-item">
                  <label className="detail-label">Confidence Level</label>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${(prediction.confidence || 0) * 100}%` }}
                    ></div>
                  </div>
                  <p className="confidence-text">
                    {((prediction.confidence || 0) * 100).toFixed(1)}%
                  </p>
                </div>

                {prediction.treatment && (
                  <div className="detail-item">
                    <label className="detail-label">Recommended Treatment</label>
                    <p className="detail-value treatment-text">{prediction.treatment}</p>
                  </div>
                )}

                {prediction.severity && (
                  <div className="detail-item">
                    <label className="detail-label">Severity Level</label>
                    <p className={`severity-badge severity-${prediction.severity.toLowerCase()}`}>
                      {prediction.severity}
                    </p>
                  </div>
                )}

                {/* Saved confirmation */}
                <div className="saved-badge">
                  <CheckCircle size={14} />
                  <span>Result saved to your history</span>
                </div>
              </div>

              <button className="action-btn predict-btn" onClick={handleClearImage}>
                Analyze Another Leaf
              </button>
            </div>
          )}

          {!image && !prediction && (
            <div className="info-section">
              <h3 className="info-title">Tips for Best Results</h3>
              <ul className="info-list">
                <li>Use good lighting conditions</li>
                <li>Focus on the affected leaf area</li>
                <li>Keep the leaf steady in frame</li>
                <li>Avoid shadows or glare</li>
                <li>Use high-quality camera or phone</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeafDiseasePrediction;