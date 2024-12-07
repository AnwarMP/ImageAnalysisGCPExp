// server.js
const express = require('express');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Cloud Vision API client
const client = new vision.ImageAnnotatorClient();

// Initialize Cloud Storage
const storage = new Storage();
const bucketName = 'image_analyzer_andre_pol_tt'; // You'll need to create this

app.use(express.static('public'));

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    // Upload to Cloud Storage
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(`images/${Date.now()}-${req.file.originalname}`);
    const blobStream = blob.createWriteStream();

    blobStream.on('finish', async () => {
      // Perform vision API analysis
      const [result] = await client.labelDetection(`gs://${bucketName}/${blob.name}`);
      const labels = result.labelAnnotations;

      // Get text from image
      const [textResult] = await client.textDetection(`gs://${bucketName}/${blob.name}`);
      const texts = textResult.textAnnotations;

      res.json({
        labels: labels.map(label => ({
          description: label.description,
          confidence: label.score
        })),
        texts: texts.length > 0 ? texts[0].description : 'No text found'
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing image');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});