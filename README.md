# MedPrep - PYQ Portal (MERN)

A two-portal app for medical exam revision:

- **Student portal** (`/`) - pick a subject and topic, browse previous-year questions (PYQs), and click
  "Tell me the answer" to get an AI-generated answer (via the Grok / xAI API). Includes a "Submit a paper"
  form (`/submit`) so students can send in question papers + their email.
- **Admin portal** (`/admin`) - log in, create subjects, upload PYQ PDFs (auto-extracted and AI-tagged by
  topic), review/approve questions before they go live, manage subjects & topics, and see student
  submissions.

Stack: **M**ongoDB, **E**xpress, **R**eact (Vite), **N**ode.

---

## 1. How it works (read this first)

1. **Admin uploads a PYQ PDF.** The server extracts text with `pdf-parse` and splits it into individual
   questions using a numbering pattern (`1.`, `Q2)`, `Question 3:` etc.). This is heuristic, not a perfect
   parser - unusual layouts or **scanned/photographed PDFs (no text layer) won't extract well** since OCR
   isn't wired up yet.
2. **Grok suggests a topic** for each extracted question (reusing an existing topic for that subject where
   it fits). Questions are saved as `pending_review` - **nothing is shown to students yet.**
3. **Admin reviews the queue** (`/admin/review`): fix the topic if needed, edit the question text if the
   split was messy, then **Approve**. Only approved questions appear on the student portal.
4. **Students browse by subject → topic** and click "Tell me the answer" - this calls Grok once per
   question and **caches the answer** in the database, so repeat clicks don't re-call the API.
5. **Students can also submit a paper** via a form (name optional, email required, PDF required). It's
   always saved and visible in the admin's Submissions tab; it's *also* emailed to the admin if you've
   configured SMTP (optional - see below).

## 2. Prerequisites

- Node.js 18+ and npm
- A MongoDB database - either install locally or use a free [MongoDB Atlas](https://www.mongodb.com/atlas)
  cluster
- A Grok (xAI) API key from <https://console.x.ai> - required for topic suggestions and answer generation
  (the rest of the app works without it, those two features just show a friendly error until you add it)

## 3. Setup

### Backend

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `MONGO_URI` - your MongoDB connection string
- `JWT_SECRET` - any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - your admin login (used once by the seed script below)
- `XAI_API_KEY` - your Grok API key (get one at console.x.ai)
- SMTP settings - optional, see section 5

Create your admin account (run this once, and again any time you want to reset the password):

```bash
npm run seed:admin
```

Start the API server:

```bash
npm run dev      # auto-restarts on changes (nodemon)
# or: npm start
```

It runs on `http://localhost:5000` by default.

### Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

It runs on `http://localhost:5173` and talks to the API at the URL in `client/.env`
(`VITE_API_URL`, defaults to `http://localhost:5000/api`).

Open `http://localhost:5173` for the student portal, and `http://localhost:5173/admin/login` for the
admin portal.

## 4. First-time admin walkthrough

1. Log in at `/admin/login` with the email/password from `server/.env`.
2. Go to **Subjects & topics** and add a subject (e.g. "Anatomy").
3. Go to **Upload PYQs**, pick that subject, and upload a PYQ PDF.
4. Go to the **Review queue** - check the AI-suggested topics, fix any that are wrong (or assign one
   manually if classification didn't run), then **Approve** the good ones (or select several and use
   **Approve selected**).
5. Visit the student portal (`/`) - the subject/topic you approved questions for now appears there.

## 5. Optional: email notifications for submissions

If you leave `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` blank in `server/.env`, student submissions are still
saved and visible under **Student submissions** in the admin portal - the server just skips sending an
email. To also get an email per submission:

- **Gmail**: turn on 2-Step Verification, then create an [App Password](https://myaccount.google.com/apppasswords),
  and use that as `SMTP_PASS` (host `smtp.gmail.com`, port `587`).
- **A transactional provider** (SendGrid, Resend, Mailgun, etc.): use the SMTP credentials they give you.

## 6. Known limitations / good next steps

- **Scanned PDFs**: question extraction needs a text layer in the PDF. Photographed/scanned papers would
  need an OCR step (e.g. `tesseract.js`) added to `server/utils/pdfParser.js`.
- **Question splitting is heuristic**: it looks for numbered lines. Unusual formats may split incorrectly
  - that's exactly why everything lands in "pending review" first instead of going live automatically.
  Fixing the text or topic in the review queue is the safety net.
  - **Student accounts**: the student portal currently has no login (open access), per your request. If
  you later want to track individual students, add a `Student` model + auth similar to the admin's.
  - **Single admin role**: the seed script creates one admin login. The `Admin` model/routes can be
  extended for multiple admin accounts if you need them.
- **Grok model name**: set via `GROK_MODEL` in `server/.env` (defaults to `grok-4.3`). xAI updates model
  names periodically - check <https://docs.x.ai/docs/models> if you start getting model-not-found errors.

## 7. Project structure

```
medprep/
  server/                 Express API
    config/db.js           MongoDB connection
    models/                Mongoose schemas (Admin, Subject, Topic, Question, Submission)
    middleware/             JWT auth guard + multer (PDF) upload config
    routes/                 auth, subjects, topics, upload, questions, ask, submissions
    utils/
      pdfParser.js          PDF text extraction + question splitting
      grokClient.js         xAI Grok API calls (topic classification + answers)
      mailer.js             optional submission-notification emails
    seedAdmin.js            creates/updates the admin login from .env
    server.js               app entry point
  client/                  React (Vite) app
    src/
      pages/student/        StudentHome (browse + ask AI), SubmitPaper (upload form)
      pages/admin/           Login, Dashboard, UploadPYQ, ReviewQuestions, ManageSubjects, Submissions
      context/AdminAuthContext.jsx   admin session handling
      api/client.js          axios instance with auth token
```

## 8. Deploying

This README covers running locally. To deploy: host `server/` on something like Render/Railway/an EC2
box (with `MONGO_URI` pointing at Atlas), and host `client/` (after `npm run build`) on something like
Vercel/Netlify, with `VITE_API_URL` pointing at your deployed API. Update `CLIENT_URL` in the server's
`.env` to your deployed frontend URL so CORS allows it.
