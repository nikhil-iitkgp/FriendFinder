import React, { useEffect, useState, useContext } from "react";
import { api } from "../api/api";
import { GoogleMap, Marker } from "@react-google-maps/api";
import AuthContext from "../context/AuthContext";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid2 as Grid,
  Select,
  MenuItem,
  TextField,
  Box,
  Container,
  Paper,
} from "@mui/material";

function SearchFriends() {
  const { user } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [searchType, setSearchType] = useState("wifi");
  const [distance, setDistance] = useState(5);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
    });
  }, []);

  const searchFriends = async () => {
    let endpoint = "/api/search-wifi";
    if (searchType === "location") {
        endpoint = `/api/search-location?distance=${distance}`;
    } else if (searchType === "bluetooth") {
        endpoint = `/api/nearby-bluetooth?bluetoothIdentifier=${user.bluetoothIdentifier}`;
    }

    try {
        const res = await api.get(endpoint);
        setFriends(Array.isArray(res.data) ? res.data : []); // Ensure it's an array
    } catch (err) {
        console.error("Error fetching nearby friends", err);
        setFriends([]); // Handle errors gracefully
    }
};


  const sendFriendRequest = async (id) => {
    try {
      await api.post(`/api/send-friend-request/${id}`);
      alert("Friend request sent!");
    } catch (err) {
      alert("Error sending friend request");
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ padding: 4, borderRadius: 3, marginTop: 4 }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: "bold", color: "#1976d2" }}>
          Find Nearby Friends
        </Typography>

        {/* Search Options */}
        <Box display="flex" justifyContent="center" alignItems="center" gap={2} flexWrap="wrap" mb={3}>
          <Select value={searchType} onChange={(e) => setSearchType(e.target.value)} variant="outlined">
            <MenuItem value="wifi">Search by WiFi</MenuItem>
            <MenuItem value="location">Search by Location</MenuItem>
            <MenuItem value="bluetooth">Search by Bluetooth</MenuItem>
          </Select>

          {searchType === "location" && (
            <TextField
              type="number"
              label="Distance (km)"
              variant="outlined"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              sx={{ width: "150px" }}
            />
          )}

          <Button variant="contained" color="primary" onClick={searchFriends}>
            Search
          </Button>
        </Box>

        {/* Nearby Friends List */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Nearby Friends
        </Typography>

        {friends.length > 0 ? (
          <Grid container spacing={2}>
            {friends.map((friend) =>
              friend && friend.name ? ( // Ensure friend object and name exist
                <Grid item xs={12} sm={6} md={4} key={friend._id}>
                  <Card sx={{ animation: "fadeIn 0.5s", padding: 2, textAlign: "center" }}>
                    <CardContent>
                      <Typography variant="h6">{friend.name || "Unknown"}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {friend.email || "No email available"}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => sendFriendRequest(friend._id)}
                        sx={{ marginTop: 2 }}
                      >
                        Add Friend
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ) : null
            )}
          </Grid>
        ) : (
          <Typography color="textSecondary" align="center" sx={{ marginTop: 2 }}>
            No nearby friends found
          </Typography>
        )}

        {/* Map View */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", marginTop: 4 }}>
          Map View
        </Typography>
        <Box sx={{ borderRadius: 3, overflow: "hidden", boxShadow: 2 }}>
          <GoogleMap center={mapCenter} zoom={14} mapContainerStyle={{ width: "100%", height: "400px" }}>
            {/* User's Location Marker */}
            <Marker position={mapCenter} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />

            {/* Friends' Locations Markers */}
            {friends.map((friend) =>
              friend && friend.location?.coordinates ? ( // Ensure friend & coordinates exist
                <Marker
                  key={friend._id}
                  position={{
                    lat: friend.location.coordinates[1],
                    lng: friend.location.coordinates[0],
                  }}
                  label={friend.name?.charAt(0).toUpperCase() || ""} // Ensure friend.name exists
                  icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                />
              ) : null
            )}
          </GoogleMap>
        </Box>
      </Paper>
    </Container>
  );
}

export default SearchFriends;
