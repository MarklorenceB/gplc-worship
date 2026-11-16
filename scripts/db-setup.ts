// Creates the tables and loads the doc's data into an empty database.
// Usage: DATABASE_URL=postgres://... npm run db:setup  (without DATABASE_URL it sets up local PGlite)
import { setupDb } from "../lib/db/client";

setupDb()
  .then(() => {
    console.log("Database is ready.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
