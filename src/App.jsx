import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CropRecommendation from "./components/CropRecommendation.jsx";
import Fertilizer from "./components/Fertilizer.jsx";
import LeafDiseasePredict from "./components/LeafDiseasePrediction.jsx";
import MarketAnalysis from "./components/MarketAnalysis.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get session once
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    // Listen for login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <Routes>
      {/* Login page */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />

      {/* Protected pages */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/" />}
      />

      <Route
        path="/crop-recommendation"
        element={user ? <CropRecommendation /> : <Navigate to="/" />}
      />

      <Route
        path="/fertilizer"
        element={user ? <Fertilizer /> : <Navigate to="/" />}
      />

      <Route
        path="/leaf-disease"
        element={user ? <LeafDiseasePredict /> : <Navigate to="/" />}
      />

      <Route
        path="/market-analysis"
        element={user ? <MarketAnalysis /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;