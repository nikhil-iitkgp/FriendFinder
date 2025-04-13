import React, { useContext } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import AuthContext from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import Call from "./pages/Call";
import { LoadScript } from "@react-google-maps/api";
import SearchFriends from "./pages/SearchFriends";
import GlobalStyle from "./globalstyles";







function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <GlobalStyle />
      <Navbar />  {/* <Navbar /> added here */}
      <LoadScript googleMapsApiKey="AIzaSyDkQwOIC4VCFqNA15qhvhAx1OEb14fbZXw">
      <Routes>
        <Route path="/" element={user ? <Home /> : <Navigate to="/signup" />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/call" element={<Call />} />
        <Route path="/search" element={<SearchFriends />} />
      </Routes>
      </LoadScript>
    </Router>
  );
}

export default App;