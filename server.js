require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

// عنوان القاعدة بيتقرا من ملف .env (أو من إعدادات الاستضافة)
// ولو مش موجود بيستخدم القاعدة اللي على اللاب
const MONGO_URI = process.env.MONGODB_URI
  ? process.env.MONGODB_URI
  : "mongodb://127.0.0.1:27017";
const PORT = process.env.PORT ? process.env.PORT : 3001;

mongoose
  .connect(MONGO_URI, { dbName: "hayat_signs" })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err.message));

// كل إشارة = مستند واحد: رقمها + معناها + samples
// كل عنصر في samples هو تسجيل بديل لنفس المعنى
const signSchema = new mongoose.Schema(
  {
    no: Number,
    meaning: { type: String, required: true, trim: true },
    samples: [
      {
        createdAt: { type: Date, default: Date.now },
        duration: Number,
        norm: String,
        faceIdx: [Number],
        frames: mongoose.Schema.Types.Mixed,
        hands: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);
const Sign = mongoose.model("Sign", signSchema);

app.post("/api/signs/sample", async (req, res) => {
  try {
    const { id, meaning, frames, duration, norm, faceIdx } = req.body;
    if (!(meaning && Array.isArray(frames) && frames.length > 0)) {
      return res.status(400).json({ error: "المعنى أو الإحداثيات ناقصة" });
    }
    let sign = null;
    if (id) {
      sign = await Sign.findById(id);
    }
    if (!sign) {
      const no = (await Sign.countDocuments()) + 1;
      sign = new Sign({ no, meaning, samples: [] });
    }
    sign.meaning = meaning;
    sign.samples.push({ frames, duration, norm, faceIdx });
    await sign.save();
    res.json({ id: sign._id, no: sign.no, count: sign.samples.length });
  } catch (e) {
    res.status(500).json({ error: "حصل خطأ، حاول تاني" });
  }
});

// حذف آخر تسجيل من الإشارة
app.delete("/api/signs/:id/last", async (req, res) => {
  try {
    const sign = await Sign.findById(req.params.id);
    if (!sign) {
      return res.status(404).json({ error: "الإشارة مش موجودة" });
    }
    sign.samples.pop();
    await sign.save();
    res.json({ count: sign.samples.length });
  } catch (e) {
    res.status(500).json({ error: "حصل خطأ، حاول تاني" });
  }
});

app.listen(PORT, () => console.log("http://localhost:" + PORT));
