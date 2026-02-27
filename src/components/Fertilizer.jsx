import { useState } from "react";
import "./Fertilizer.css";

const Fertilizer = () => {
  const [formData, setFormData] = useState({
    temperature: "",
    humidity: "",
    moisture: "",
    soil: "",
    crop: "",
    nitrogen: "",
    phosphorous: "",
    potassium: "",
  });

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheck = async () => {
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("http://localhost:8000/predict-fertilizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: Number(formData.temperature),
          humidity: Number(formData.humidity),
          moisture: Number(formData.moisture),
          soil: formData.soil,
          crop: formData.crop,
          nitrogen: Number(formData.nitrogen),
          phosphorous: Number(formData.phosphorous),
          potassium: Number(formData.potassium),
        }),
      });
      const data = await response.json();
      setResult(response.ok ? data.fertilizer : "Prediction failed. Check inputs.");
    } catch {
      setResult("Backend connection error.");
    }
    setLoading(false);
  };

  return (
    <div className="fertilizer-page">
      <div className="fertilizer-card">
        <h1>🌱 Fertilizer Recommendation</h1>
        <p className="subtitle">Enter environmental and soil details</p>

        {/* Temperature + Humidity */}
        <div className="field-row">
          <div className="field-group">
            <label>Temperature (°C)</label>
            <input type="number" name="temperature" placeholder="e.g. 28"
              value={formData.temperature} onChange={handleChange} />
          </div>
          <div className="field-group">
            <label>Humidity (%)</label>
            <input type="number" name="humidity" placeholder="e.g. 65"
              value={formData.humidity} onChange={handleChange} />
          </div>
        </div>

        {/* Moisture + Soil */}
        <div className="field-row">
          <div className="field-group">
            <label>Moisture (%)</label>
            <input type="number" name="moisture" placeholder="e.g. 40"
              value={formData.moisture} onChange={handleChange} />
          </div>
          <div className="field-group">
            <label>Soil Type</label>
            <select name="soil" value={formData.soil} onChange={handleChange}>
              <option value="">Select type</option>
              <option value="Loamy">Loamy</option>
              <option value="Sandy">Sandy</option>
              <option value="Clayey">Clayey</option>
              <option value="Black">Black</option>
              <option value="Red">Red</option>
            </select>
          </div>
        </div>

        {/* Crop — full width */}
        <div className="field-group full-width">
          <label>Crop</label>
          <input type="text" name="crop" placeholder="e.g. Rice, Wheat, Maize"
            value={formData.crop} onChange={handleChange} />
        </div>

        {/* Nitrogen + Phosphorous + Potassium */}
        <div className="field-row three-col">
          <div className="field-group">
            <label>Nitrogen</label>
            <input type="number" name="nitrogen" placeholder="e.g. 80"
              value={formData.nitrogen} onChange={handleChange} />
          </div>
          <div className="field-group">
            <label>Phosphorous</label>
            <input type="number" name="phosphorous" placeholder="e.g. 40"
              value={formData.phosphorous} onChange={handleChange} />
          </div>
          <div className="field-group">
            <label>Potassium</label>
            <input type="number" name="potassium" placeholder="e.g. 20"
              value={formData.potassium} onChange={handleChange} />
          </div>
        </div>

        <button onClick={handleCheck} disabled={loading}>
          {loading ? "Predicting..." : "Get Fertilizer"}
        </button>

        {result && (
          <div className="result-box">
            <strong>Recommended Fertilizer</strong>
            <p>{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fertilizer;
