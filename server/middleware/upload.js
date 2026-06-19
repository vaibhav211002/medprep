const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeStorage(subfolder) {
  const dir = path.join(__dirname, '..', 'uploads', subfolder);
  fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  });
}

function pdfFileFilter(req, file, cb) {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are accepted.'));
  }
}

const uploadPyq = multer({
  storage: makeStorage('pyqs'),
  fileFilter: pdfFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const uploadSubmission = multer({
  storage: makeStorage('submissions'),
  fileFilter: pdfFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = { uploadPyq, uploadSubmission };
