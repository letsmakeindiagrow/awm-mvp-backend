import app from "./app";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main();
