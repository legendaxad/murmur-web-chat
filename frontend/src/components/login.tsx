import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type LoginProps = {
  onLogin: (user: {
    id: string;
    name: string;
    token: string;
    nickname: string;
  }) => void;
};

const Login = ({ onLogin }: LoginProps) => {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  const validateFields = () => {
    if (!name || !nickname) {
      toast.error("Please fill in all fields.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateFields()) return;

    setLoading(true);

    try {
      const response = await fetch("http://localhost:7722/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nickname }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      toast.success("Welcome 🚀");

      onLogin({
        id: data.user.id, // ✅ IMPORTANT FIX
        name: data.user.name,
        token: data.token,
        nickname: data.user.nickname,
      });
    } catch (err: any) {
      toast.error(err.message || "Server error!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome 👋</h2>
        <p style={styles.subtitle}>Join your chat community</p>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />

        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={handleLogin}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Entering..." : "Enter Chat"}
        </button>
      </div>

      <ToastContainer />
    </div>
  );
};

const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  },
  card: {
    width: "320px",
    padding: "30px",
    borderRadius: "16px",
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    textAlign: "center" as const,
  },
  title: {
    marginBottom: "5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    outline: "none",
    fontSize: "14px",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #066858, #027d69)",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "15px",
    transition: "0.3s",
  },
};

export default Login;
