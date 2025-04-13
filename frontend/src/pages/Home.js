import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import { Card, CardContent, Typography, Grid2 as Grid } from "@mui/material";

function Home() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/api/users") // Updated to fetch all users or friends
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Error fetching users", err));
  }, []);

  return (
    <div>
      <h1>Welcome to FriendFinder!</h1>
    </div>
  );
}

export default Home;
