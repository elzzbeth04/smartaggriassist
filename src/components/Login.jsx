import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");

  // ✅ HANDLE SESSION + REDIRECT PROPERLY
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setShowProfileModal(true);
        } else {
          navigate("/dashboard");
        }
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .single();

          if (!profile) {
            setShowProfileModal(true);
          } else {
            navigate("/dashboard");
          }
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to verify your account.");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        const user = data.user;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setShowProfileModal(true);
        } else {
          navigate("/dashboard");
        }
      }
    }

    setLoading(false);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      name,
      address,
      age: parseInt(age),
    });

    if (error) {
      setError(error.message);
    } else {
      setShowProfileModal(false);
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="logo">🌱 SmartAgriAssist</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}
          {message && <p className="message">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <p className="toggle-text">
          {isSignup ? "Already have an account?" : "Don't have an account?"}
          <span onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? " Login" : " Sign up"}
          </span>
        </p>
      </div>

      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Complete Your Profile</h2>

            <form onSubmit={handleProfileSave}>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />

              <input
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Register"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;