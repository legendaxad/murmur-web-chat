import { Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Homepage from "./components/homepage";
import Sendbird from "./components/sendbird";
import Login from "./components/login";

const Router = () => {
  const [user, setUser] = useState<{
    id: string;
    name: string;
    token: string;
    nickname: string;
  } | null>(null);

  const navigate = useNavigate();

  // 🔹 restore login after refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  }, []);

  const handleLogin = (user: {
    id: string;
    name: string;
    token: string;
    nickname: string;
  }) => {
    setUser(user);
    localStorage.setItem("user", JSON.stringify(user));

    navigate("/chat");
  };

  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />

      {/* protect chat route */}
      <Route
        path="/chat"
        element={
          user ? <Sendbird user={user} /> : <Login onLogin={handleLogin} />
        }
      />
    </Routes>
  );
};

export default Router;
