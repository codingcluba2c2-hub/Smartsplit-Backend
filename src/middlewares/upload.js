const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
