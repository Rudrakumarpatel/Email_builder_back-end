const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// File paths
const configFilePath = path.join(__dirname, 'emailConfig.json');
if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify([]), 'utf-8');
}

// Configure multer for image uploads
const upload = multer({ dest: 'uploads/' });

// **1. Get email layout**
app.get('/getEmailLayout', (req, res) => {
  const layoutPath = path.join(__dirname, 'layout.html');
  if (!fs.existsSync(layoutPath)) {
    return res.status(500).send('Layout file not found');
  }
  const layout = fs.readFileSync(layoutPath, 'utf-8');
  res.json({ layout });
});

// **2. Upload image**
app.post('/uploadImage', upload.single('image'), (req, res) => {
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// **3. Upload email configuration**
app.post('/uploadEmailConfig', (req, res) => {
  const emailConfig = req.body;

  // Check if the emailConfig object is valid
  if (!emailConfig || Object.keys(emailConfig).length === 0) {
    return res.status(400).send('Invalid email configuration');
  }

  let existingConfigs = [];

  try {
    // Check if the file exists
    if (fs.existsSync(configFilePath)) {
      const fileContent = fs.readFileSync(configFilePath, 'utf-8');

      // If the file is empty, initialize as an empty array
      existingConfigs = fileContent.trim() ? JSON.parse(fileContent) : [];
    }
  } catch (error) {
    console.error("Error reading or parsing the JSON file:", error);
    return res.status(500).send('Error reading existing configurations.');
  }

  // Construct the new configuration object to add to the list
  const newConfig = {
    title: emailConfig.title || { value: '', style: {} },
    content: emailConfig.content || { value: '', style: {} },
    footer: emailConfig.footer || { value: '', style: {} },
    imageUrl: emailConfig.imageUrl || '', // Ensure imageUrl is included, if available
  };

  // Add the new configuration to the existing configurations
  existingConfigs.push(newConfig);

  try {
    // Write the updated configurations back to the JSON file
    fs.writeFileSync(configFilePath, JSON.stringify(existingConfigs, null, 2), 'utf-8');
    res.send('Configuration saved successfully');
  } catch (error) {
    console.error("Error writing to the JSON file:", error);
    res.status(500).send("Error saving configuration.");
  }
});


// **4. Fetch saved configurations**
app.get('/getEmailConfigs', (req, res) => {
  const configs = JSON.parse(fs.readFileSync(configFilePath, 'utf-8') || '[]');
  res.json(configs);
});

// **5. Render and return template**
app.post('/renderTemplate', (req, res) => {
  const { title, content, footer, imageUrl } = req.body;

  const layoutPath = path.join(__dirname, 'layout.html');
  if (!fs.existsSync(layoutPath)) {
    return res.status(500).send('Layout file not found');
  }

  let layoutHTML = fs.readFileSync(layoutPath, 'utf-8');
  layoutHTML = layoutHTML
    .replace(/{{title}}/g, `<span style="${styleToString(title.style)}">${title.value}</span>`)
    .replace(/{{content}}/g, `<span style="${styleToString(content.style)}">${content.value}</span>`)
    .replace(/{{footer}}/g, `<span style="${styleToString(footer.style)}">${footer.value}</span>`)
    .replace(/{{imageUrl}}/g, imageUrl || ''); // Ensure imageUrl is replaced correctly

  res.send(layoutHTML);
});

const styleToString = (style) => {
  if (!style) return '';
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
};

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(5000, () => console.log('Backend running on http://localhost:5000'));
