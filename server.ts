import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const db = new Database("photobooth.db");

// Configure Cloudinary (if credentials exist)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Ensure uploads directory exists for local simulation
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    package_name TEXT,
    amount INTEGER,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    photo_paths TEXT, -- JSON array of URLs
    photostrip_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" })); // Increase limit for base64 photos

  // API: Create Transaction (QRIS Simulation)
  app.post("/api/payments/create", (req, res) => {
    const { packageId, amount } = req.body;
    const transactionId = `TRX-${Date.now()}`;
    
    db.prepare("INSERT INTO transactions (id, package_name, amount, status) VALUES (?, ?, ?, ?)")
      .run(transactionId, packageId, amount, "PENDING");

    // In real app, call Midtrans/Xendit here
    res.json({ 
      transactionId, 
      qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SIMULATED_QRIS_PAYMENT_" + transactionId 
    });
  });

  // API: Check Payment Status
  app.get("/api/payments/status/:id", (req, res) => {
    const row = db.prepare("SELECT status FROM transactions WHERE id = ?").get(req.params.id) as any;
    res.json({ status: row?.status || "NOT_FOUND" });
  });

  // API: Update Payment (Simulate Webhook)
  app.post("/api/payments/webhook", (req, res) => {
    const { transactionId, status } = req.body;
    db.prepare("UPDATE transactions SET status = ? WHERE id = ?").run(status, transactionId);
    res.json({ success: true });
  });

  // API: Upload Session Photos (Cloud Simulation)
  app.post("/api/sessions/upload", async (req, res) => {
    const { transactionId, photos, photostrip } = req.body;
    const sessionId = `SES-${Date.now()}`;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    try {
      const photoUrls: string[] = [];
      let finalStripUrl = "";

      // Simulate cloud upload (saving locally to public/uploads)
      // In a real app, you'd use cloudinary.uploader.upload()
      
      // Upload individual photos
      for (let i = 0; i < photos.length; i++) {
        const base64Data = photos[i].replace(/^data:image\/\w+;base64,/, "");
        const fileName = `${sessionId}-photo-${i}.jpg`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        fs.writeFileSync(filePath, base64Data, { encoding: "base64" });
        photoUrls.push(`${appUrl}/uploads/${fileName}`);
      }

      // Upload photostrip
      const stripBase64 = photostrip.replace(/^data:image\/\w+;base64,/, "");
      const stripFileName = `${sessionId}-strip.png`;
      const stripFilePath = path.join(UPLOADS_DIR, stripFileName);
      fs.writeFileSync(stripFilePath, stripBase64, { encoding: "base64" });
      finalStripUrl = `${appUrl}/uploads/${stripFileName}`;

      // Save to DB
      db.prepare("INSERT INTO sessions (id, transaction_id, photo_paths, photostrip_url) VALUES (?, ?, ?, ?)")
        .run(sessionId, transactionId, JSON.stringify(photoUrls), finalStripUrl);

      const galleryUrl = `${appUrl}/gallery/${sessionId}`;
      
      res.json({ 
        success: true, 
        sessionId, 
        galleryUrl,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(galleryUrl)}`
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload photos" });
    }
  });

  // API: Get Session Data (for Gallery)
  app.get("/api/sessions/:id", (req, res) => {
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id) as any;
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({
      id: session.id,
      photos: JSON.parse(session.photo_paths),
      photostrip: session.photostrip_url,
      createdAt: session.created_at
    });
  });

  // API: Send WhatsApp (Simulation)
  app.post("/api/sessions/whatsapp", (req, res) => {
    const { phone, galleryUrl } = req.body;
    console.log(`[WhatsApp Simulation] Sending to ${phone}: Hello! Here is your photobooth gallery: ${galleryUrl}`);
    // In real app, use WhatsApp Business API or a service like Twilio
    res.json({ success: true, message: "WhatsApp message sent (simulated)" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  // Serve static uploads
  app.use("/uploads", express.static(UPLOADS_DIR));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnapPro Server running on http://localhost:${PORT}`);
  });
}

startServer();
