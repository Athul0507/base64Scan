const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyDMB3rPWTxiRjWuuBH8AQtdavo1zEmA0gE");

const express = require('express');
const cors = require('cors')
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const app = express();
app.use(cors())
app.use(express.json()); // Parse JSON request body
const PORT = process.env.PORT || 3000;

// API endpoint for text extraction from base64 image

app.get('/', (req, res)=>{
    res.json({"text": "hi how are you"})
})

app.post('/extractText', async (req, res) => {
    try {
        const base64Image = req.body.image; 
        
        // Assuming the base64 image is sent as 'image' in the request body
        console.log(base64Image)
        // Decode base64 string to image buffer
        const imageBuffer = decodeBase64ToImage(base64Image);

        // Pass image buffer to Tesseract for text extraction
        const { data: { text } } = await Tesseract.recognize(
            imageBuffer,
            'eng', // language
            { logger: m => m='' } // optional logger
        );

        // Extract medicine information from text
        const response = await findMedicineInfo(text);
        res.json({ response });
    } catch (error) {
        console.error('Error extracting text:', error);
        res.status(500).json({ error: 'Failed to extract text from the image' });
    }
});

// Function to decode base64 string to image buffer
function decodeBase64ToImage(base64String) {
    // Remove data URI prefix (e.g., 'data:image/jpeg;base64,')
    const base64Image = base64String.split(';base64,').pop();
    // Decode base64 string to buffer using sharp
    const buffer = Buffer.from(base64Image, 'base64');
    return buffer;
}

async function findMedicineInfo(name){
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    const prompt = `You are a medicine pharmacy expert. ${name} is the medicine I want information about. Give me the information in this format.
    {
        "name": "MedicineName",
        "usage": "What the medicine is used for",
        "dosage": {
          "amount": "Dosage amount",
          "unit": "Dosage unit (e.g., mg, mL)"
        },
        "avoid": "When the medicine should be avoided (e.g., contraindications)"
      }
      
    For avoid, include other unfavorable reactions with other medicines, possible allergies, lifestyles, and other information, but use only keywords not sentences. Let usage be sentences. strictly follow the format for the answer
    `

    const result = await model.generateContent(prompt);
    const response = await result.response;

    console.log(response.text())
    return response.text();
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
