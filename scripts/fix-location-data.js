// MongoDB cleanup script to fix corrupted location data
const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/friendfinder";

async function fixLocationData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find users with corrupted location data
    const corruptedUsers = await usersCollection
      .find({
        "location.coordinates": { $exists: true },
      })
      .toArray();

    console.log(`Found ${corruptedUsers.length} users with location data`);

    for (const user of corruptedUsers) {
      const coordinates = user.location?.coordinates;

      // Check if coordinates are nested arrays or invalid
      if (
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        typeof coordinates[0] !== "number" ||
        typeof coordinates[1] !== "number"
      ) {
        console.log(`Fixing user: ${user.email}`);

        // Remove the corrupted location data
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $unset: {
              location: "",
            },
          }
        );

        console.log(`Fixed location data for user: ${user.email}`);
      }
    }

    // Create the geospatial index if it doesn't exist
    try {
      await usersCollection.createIndex({ location: "2dsphere" });
      console.log("Created 2dsphere index on location field");
    } catch (error) {
      console.log(
        "Index already exists or error creating index:",
        error.message
      );
    }

    console.log("Location data cleanup completed");
  } catch (error) {
    console.error("Error fixing location data:", error);
  } finally {
    await client.close();
  }
}

fixLocationData();
