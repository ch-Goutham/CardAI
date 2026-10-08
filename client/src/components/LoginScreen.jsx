import { useState } from "react";
import "./LoginScreen.css";

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Please enter your username and password to continue.");
      return;
    }

    onLogin(trimmedUsername);
  };

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="7.5" width="17" height="13" rx="2" />
              <path d="M8 7.5V5.75A1.75 1.75 0 0 1 9.75 4h4.5A1.75 1.75 0 0 1 16 5.75V7.5M12 8v12M3.5 12h17" />
            </svg>
          </div>
          <h1 id="login-title">Card AI</h1>
          <p>Your Intelligent Business Companion</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <span className="login-eyebrow">GREETINGS</span>
          <h2>Welcome Back</h2>
          <p className="login-description">
            Sign in to access your workspace
          </p>

          <label className="login-field">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <circle cx="12" cy="9" r="2.5" />
              <path d="M8 17c.65-1.7 2.1-2.5 4-2.5s3.35.8 4 2.5" />
            </svg>
            <input
              autoFocus
              type="text"
              autoComplete="username"
              placeholder="Username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (error) setError("");
              }}
              aria-label="Username"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              maxLength={80}
            />
          </label>

          <label className="login-field">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
            </svg>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              aria-label="Password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>

          {error && (
            <p className="login-error" id="login-error" role="alert">
              {error}
            </p>
          )}

          <button className="login-submit" type="submit">
            Sign In
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </form>

        <footer className="login-footer">
          © 2026 MANVIAN GROUP · SECURE ACCESS
        </footer>
      </section>
    </main>
  );
}

export default LoginScreen;
