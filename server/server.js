require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subjects');
const topicRoutes = require('./routes/topics');
const uploadRoutes = require('./routes/upload');
const questionRoutes = require('./routes/questions');
const askRoutes = require('./routes/ask');
const submissionRoutes = require('./routes/submissions');

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.CLIENT_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));


app.get('/' , (req,res)=>{
  res.json({ok:true})
})



app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/ask', askRoutes);
app.use('/api/submissions', submissionRoutes);

// Multer / general error handler (keeps error responses JSON instead of HTML stack traces)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
