
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import LoginScreen from "./components/LoginScreen";
import UploadCard from "./components/UploadCard";
import ContactForm from "./components/ContactForm";
import ExcelTable from "./components/ExcelTable";

import "./App.css";

const API = import.meta.env.VITE_API_URL;
const API_BASE_URL = API.replace("/api/cards", "");
const USER_NAME_KEY = "card-ai-user-name";
const PAGE_PATHS = {
  login: "/login",
  scanner: "/visiting-card",
  jobs: "/job-posting",
  records: "/history",
};
const PAGE_BY_PATH = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page])
);

const fetchContacts = async () => {
  const response = await axios.get(API);
  return response.data;
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState(
    () => window.localStorage.getItem(USER_NAME_KEY) || ""
  );
  const [data, setData] = useState(null);
  const [confidence, setConfidence] = useState({});
  const [ocr, setOcr] = useState([]);
  const [image, setImage] = useState(null);

  const [contacts, setContacts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(
    () => Boolean(window.localStorage.getItem(USER_NAME_KEY))
  );
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const activeTab = PAGE_BY_PATH[location.pathname] || "scanner";
  const setActiveTab = (page) => navigate(PAGE_PATHS[page]);

  // ---------------------------------------
  // Load saved contacts
  // ---------------------------------------

  const loadContacts = useCallback(async () => {
    try {
      const response = await fetchContacts();

      if (response.data.success) {
        setContacts(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);

      setMessage(
        error.response?.data?.message ||
        "Failed to load saved contacts"
      );
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (!userName) return undefined;

    let isCurrent = true;

    fetchContacts().then(
      (response) => {
        if (!isCurrent) return;
        if (response.success) {
          setContacts(response.data || []);
        }
        setLoadingContacts(false);
      },
      (error) => {
        if (!isCurrent) return;
        console.error("Failed to load contacts:", error);
        setMessage(
          error.response?.data?.message ||
          "Failed to load saved contacts"
        );
        setLoadingContacts(false);
      }
    );

    return () => {
      isCurrent = false;
    };
  }, [userName]);

  useEffect(() => {
    const routePage = PAGE_BY_PATH[location.pathname];
    if (!userName && location.pathname !== PAGE_PATHS.login) {
      navigate(PAGE_PATHS.login, { replace: true });
    } else if (userName && (!routePage || routePage === "login")) {
      navigate(PAGE_PATHS.scanner, { replace: true });
    }
  }, [location.pathname, navigate, userName]);

  const handleLogin = (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setLoadingContacts(true);
    window.localStorage.setItem(USER_NAME_KEY, trimmedName);
    setUserName(trimmedName);
    navigate(PAGE_PATHS.scanner, { replace: true });
  };

  const handleSignOut = () => {
    window.localStorage.removeItem(USER_NAME_KEY);
    setUserName("");
    setData(null);
    setConfidence({});
    setOcr([]);
    setImage(null);
    setMessage("");
    navigate(PAGE_PATHS.login, { replace: true });
  };

  // ---------------------------------------
  // Extract card
  // ---------------------------------------

  const handleExtract = async (file) => {
    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();

      formData.append("visitingCard", file);

      const response = await axios.post(
        `${API}/extract`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000,
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Extraction failed"
        );
      }

      setData(response.data.data || {});
      setConfidence(response.data.confidence || {});
      setOcr(response.data.ocr || []);
      setImage(response.data.image || null);

      setActiveTab("scanner");

      setMessage(
        "Information extracted successfully. Please verify the fields."
      );
    } catch (error) {
      console.error("Extraction error:", error);

      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Extraction failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // Edit field
  // ---------------------------------------

  const handleChange = (field, value) => {
    setData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ---------------------------------------
  // Save contact
  // ---------------------------------------

  const handleSave = async () => {
    if (!data) {
      setMessage("Please extract a visiting card first.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await axios.post(
        `${API}/save`,
        {
          ...data,
          rawOCR: ocr,
          confidence,
          image,
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Save failed"
        );
      }

      setMessage("Contact saved successfully.");

      setLoadingContacts(true);
      await loadContacts();

      setActiveTab("records");
    } catch (error) {
      console.error("Save error:", error);

      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // Download Excel
  // ---------------------------------------

  const handleDownloadExcel = async () => {
    try {
      setMessage("");

      const response = await axios.get(
        `${API}/excel/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "visiting-cards.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setMessage("Excel file downloaded successfully.");
    } catch (error) {
      console.error("Excel download error:", error);

      setMessage(
        error.response?.data?.message ||
        "Failed to download Excel file."
      );
    }
  };

  // ---------------------------------------
  // Clear current scan
  // ---------------------------------------

  const handleNewScan = () => {
    setData(null);
    setConfidence({});
    setOcr([]);
    setImage(null);
    setMessage("");
    setActiveTab("scanner");
  };

  const handleManualEntry = () => {
    setData({
      name: "",
      company: "",
      designation: "",
      phone: "",
      alternatePhone: "",
      email: "",
      website: "",
      linkedin: "",
      address: "",
      notes: "",
    });
    setConfidence({});
    setOcr([]);
    setImage(null);
    setMessage("");
    setActiveTab("scanner");
  };

  if (location.pathname === PAGE_PATHS.login || !userName) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="sidebar-brand"
          href="#scanner"
          onClick={(event) => {
            event.preventDefault();
            handleNewScan();
          }}
        >
          <span className="sidebar-brand-icon" aria-hidden="true">▣</span>
          <span>Card AI</span>
        </a>

        <div className="sidebar-account">
          <span>Logged in as <strong>{userName}</strong></span>
          <button onClick={handleSignOut}>Logout</button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            className={activeTab === "jobs" ? "sidebar-nav-item active" : "sidebar-nav-item"}
            onClick={() => setActiveTab("jobs")}
          >
            <span aria-hidden="true">▦</span>
            Job Posting
          </button>
          <button
            className={activeTab === "scanner" ? "sidebar-nav-item active" : "sidebar-nav-item"}
            onClick={handleNewScan}
          >
            <span aria-hidden="true">▣</span>
            Visiting Card
          </button>
          <button
            className={activeTab === "records" ? "sidebar-nav-item active" : "sidebar-nav-item"}
            onClick={() => setActiveTab("records")}
          >
            <span aria-hidden="true">◷</span>
            History
            <small>{contacts.length}</small>
          </button>
        </nav>

        <section className="sidebar-new-card">
          <h2><span aria-hidden="true">✧</span> New</h2>
          <p>Scan a new visiting card or enter details manually.</p>
          <button className="sidebar-action primary" onClick={handleNewScan}>
            <span aria-hidden="true">▣</span>
            Visiting Card
          </button>
          <button className="sidebar-action" onClick={handleManualEntry}>
            <span aria-hidden="true">／</span>
            Manual Input
          </button>
        </section>
      </aside>

      <div className="app-main">
        <main className="main-content">

        {activeTab === "jobs" && (
          <section className="coming-soon-page">
            <div className="eyebrow">
              <span aria-hidden="true">✧</span> INTELLIGENT OCR SYSTEM
            </div>
            <div className="coming-soon-icon" aria-hidden="true">▤</div>
            <h1>Job Posting</h1>
            <p>
              Extract company and role details from job postings.
              This feature is coming soon.
            </p>
            <button className="upload-submit" onClick={handleNewScan}>
              Scan a Visiting Card <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {/* ================================= */}
        {/* SCANNER */}
        {/* ================================= */}

        {activeTab === "scanner" && (
          <>
            <section className="hero">

              <div>

                <div className="eyebrow">
                  <span aria-hidden="true">✧</span> INTELLIGENT OCR SYSTEM
                </div>

                <h1>
                  Turn business cards into
                  <span> structured contacts.</span>
                </h1>

                <p>
                  Stop manually typing details. Upload a visiting card
                  and let AI extract names, companies, phone numbers,
                  and contact details in seconds.
                </p>

              </div>

            </section>


            {/* ================================= */}
            {/* UPLOAD */}
            {/* ================================= */}

            {!data && (
              <section className="upload-section">

                <UploadCard
                  onExtract={handleExtract}
                  loading={loading}
                  onOpenRecords={() => setActiveTab("records")}
                />

              </section>
            )}


            {/* ================================= */}
            {/* EXTRACTION WORKSPACE */}
            {/* ================================= */}

            {data && (
              <section className="workspace">

                <div className="workspace-header">

                  <div>

                    <div className="eyebrow">
                      EXTRACTION COMPLETE
                    </div>

                    <h2>
                      Review contact information
                    </h2>

                    <p>
                      Verify the extracted information
                      before saving it.
                    </p>

                  </div>

                  <button
                    className="secondary-button"
                    onClick={handleNewScan}
                  >
                    + New Scan
                  </button>

                </div>


                <div className="workspace-grid">

                  {/* CARD PREVIEW */}

                  <div className="panel preview-panel">

                    <div className="panel-header">

                      <div>
                        <h3>Card Preview</h3>
                        <span>
                          Original uploaded image
                        </span>
                      </div>

                      <span className="verified-badge">
                        OCR
                      </span>

                    </div>

                    <div className="card-preview">

                      {image ? (
                        <img
                          src={`${API_BASE_URL}${image.url}`}
                          alt="Visiting card"
                        />
                      ) : (
                        <div className="no-image">
                          No preview available
                        </div>
                      )}

                    </div>

                  </div>


                  {/* CONTACT FORM */}

                  <div className="panel form-panel">

                    <div className="panel-header">

                      <div>
                        <h3>Contact Information</h3>
                        <span>
                          Review and correct extracted data
                        </span>
                      </div>

                      <div className="confidence-summary">
                        <span className="confidence-dot"></span>
                        AI extracted
                      </div>

                    </div>

                    <ContactForm
                      data={data}
                      confidence={confidence}
                      onChange={handleChange}
                      onSave={handleSave}
                      saving={saving}
                    />

                  </div>

                </div>


                {/* RAW OCR */}

                {ocr.length > 0 && (
                  <details className="ocr-panel">

                    <summary>
                      <span>
                        Raw OCR data
                      </span>

                      <small>
                        {ocr.length} detected items
                      </small>
                    </summary>

                    <pre>
                      {JSON.stringify(
                        ocr,
                        null,
                        2
                      )}
                    </pre>

                  </details>
                )}

              </section>
            )}
          </>
        )}


        {/* ================================= */}
        {/* RECORDS */}
        {/* ================================= */}

        {activeTab === "records" && (
          <section className="records-page">

            <div className="records-header">

              <div>

                <div className="eyebrow">
                  CONTACT DATABASE
                </div>

                <h1>
                  Saved contacts
                </h1>

                <p>
                  Manage all contacts extracted from
                  your visiting cards.
                </p>

              </div>

              <div className="records-actions">

                <button
                  className="secondary-button"
                  onClick={() => {
                    setActiveTab("scanner");
                    handleNewScan();
                  }}
                >
                  + Scan Card
                </button>

                <button
                  className="primary-button"
                  onClick={handleDownloadExcel}
                  disabled={contacts.length === 0}
                >
                  ↓ Download Excel
                </button>

              </div>

            </div>


            <div className="stats-grid">

              <div className="stat-card">
                <span>Total Contacts</span>
                <strong>{contacts.length}</strong>
                <small>Saved in database</small>
              </div>

              <div className="stat-card">
                <span>OCR Engine</span>
                <strong>PaddleOCR</strong>
                <small>Active extraction engine</small>
              </div>

              <div className="stat-card">
                <span>Export</span>
                <strong>Excel</strong>
                <small>Ready to download</small>
              </div>

            </div>


            <ExcelTable
              contacts={contacts}
              loading={loadingContacts}
              onDownload={handleDownloadExcel}
            />

          </section>
        )}

        </main>
      </div>


      {/* ================================= */}
      {/* TOAST */}
      {/* ================================= */}

      {message && (
        <div className="toast">

          <span className="toast-icon">
            ✓
          </span>

          <span>
            {message}
          </span>

          <button
            onClick={() => setMessage("")}
          >
            ×
          </button>

        </div>
      )}

    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}

export default App;
