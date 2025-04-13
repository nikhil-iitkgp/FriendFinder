import React, { createContext, useState, useEffect } from "react";
import { setAuthToken } from "../api/api";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthToken(token);
      const decoded = jwtDecode(token);
      setUser(decoded.user);
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setAuthToken(token);
    const decoded = jwtDecode(token);
    setUser(decoded.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
