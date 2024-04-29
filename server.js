const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3030;

app.use(express.static('public'));
app.use(express.json()); // Middleware to parse JSON requests

let documents = []; // Global array to store document data

// Function to read documents from a directory and return them
function loadDocuments() {
    const datasetPath = path.join(__dirname, 'dataset');
    documents = fs.readdirSync(datasetPath).map(file => {
        const filePath = path.join(datasetPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return { id: file, fileName: file, content: content };
    });
}

// Load documents once when the server starts
loadDocuments();

// Endpoint to get documents
app.get('/documents', (req, res) => {
    res.json(documents);
});

// Endpoint to get a specific document by ID
app.get('/documents/:id', (req, res) => {
    const { id } = req.params;
    const document = documents.find(doc => doc.id === id);
    if (document) {
        res.json(document); // Send the whole document object as JSON
    } else {
        res.status(404).send('Document not found');
    }
});

// Function to read clusters data from a file
function readClustersFromFile() {
    const clustersFilePath = path.join(__dirname, 'clusters.json');
    const clustersData = fs.readFileSync(clustersFilePath, 'utf-8');
    return JSON.parse(clustersData);
}

// Endpoint to serve clusters data
app.get('/clusters', (req, res) => {
    try {
        const clusters = readClustersFromFile();
        res.json(clusters);
    } catch (error) {
        console.error('Error reading clusters data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to read MDS data from a file
function readMDSData() {
    const mdsFilePath = path.join(__dirname, 'mds.json');
    const mdsData = fs.readFileSync(mdsFilePath, 'utf-8');
    return JSON.parse(mdsData);
}

// Route to serve MDS data
app.get('/mds', (req, res) => {
    try {
        const mdsData = readMDSData();
        res.json(mdsData);
    } catch (error) {
        console.error('Error reading MDS data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
