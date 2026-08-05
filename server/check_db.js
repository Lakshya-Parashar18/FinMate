import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://FinMate:Lucky123@cluster0.5iqrf.mongodb.net/?appName=Cluster0";

async function run() {
  console.log("Connecting to", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("Connected!");

  // List all collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));

  for (const col of collections) {
    const name = col.name;
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    for (const doc of docs) {
      const str = JSON.stringify(doc);
      if (str.includes("499999") || str.includes("500000")) {
        console.log(`Match in collection ${name}:`, doc);
      }
    }
  }

  await mongoose.disconnect();
  console.log("Done!");
}

run().catch(console.error);
