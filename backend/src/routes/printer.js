const express = require('express');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API security key protection
router.use(verifyApiKey);

// In-memory print queue for Virtual Printer and physical printer spooler
let printQueue = [];
let printHistory = [];
let printerConfig = {
  model: 'BT-58D',
  interface: 'USB + Bluetooth',
  paperWidth: '58mm',
  charsPerLine: 32,
  connected: true,
  cashDrawerTriggered: false,
};

// GET status
router.get('/status', (req, res) => {
  res.json({
    connected: true,
    model: printerConfig.model,
    interface: printerConfig.interface,
    paperWidth: printerConfig.paperWidth,
    queueLength: printQueue.length,
    historyCount: printHistory.length,
    cashDrawerTriggered: printerConfig.cashDrawerTriggered,
  });
});

// GET printer list
router.get('/list', (req, res) => {
  res.json({
    all: ['BT-58D Thermal Printer (Virtual / USB)', 'Microsoft Print to PDF'],
    thermal: ['BT-58D Thermal Printer (58mm)'],
    active: 'BT-58D Thermal Printer (58mm)',
  });
});

// POST connect
router.post('/connect', (req, res) => {
  const { printerName, model } = req.body || {};
  printerConfig.model = model || 'BT-58D';
  printerConfig.connected = true;
  res.json({
    success: true,
    message: `Connected to ${printerConfig.model} Thermal Printer (58mm)`,
    config: printerConfig,
  });
});

// POST disconnect
router.post('/disconnect', (req, res) => {
  res.json({
    success: true,
    message: 'Disconnected from thermal printer',
  });
});

// POST print job (Adds to spooler queue)
router.post('/print', (req, res) => {
  const { billData, settings, rawText, type } = req.body || {};
  if (!billData && !rawText) {
    return res.status(400).json({ success: false, error: 'No print data provided' });
  }

  const job = {
    id: `print-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: type || (billData?.type) || 'BILL',
    billData,
    settings,
    rawText,
    status: 'QUEUED',
  };

  printQueue.push(job);
  printHistory.unshift(job);
  if (printHistory.length > 50) printHistory.pop();

  console.log(`🖨️ [BT-58D] Received print job #${job.id} for Bill: ${billData?.billNo || 'Raw'}`);

  res.json({
    success: true,
    message: 'Print job sent to BT-58D Thermal Printer queue',
    jobId: job.id,
  });
});

// GET active queue for Virtual Printer
router.get('/queue', (req, res) => {
  const jobs = [...printQueue];
  printQueue = []; // flush queue on read by simulator
  res.json({
    success: true,
    jobs,
    timestamp: new Date().toISOString(),
  });
});

// GET print history
router.get('/history', (req, res) => {
  res.json({
    success: true,
    history: printHistory,
  });
});

// POST cash drawer kick test (12V pulse)
router.post('/cash-drawer/kick', (req, res) => {
  printerConfig.cashDrawerTriggered = true;
  console.log('💵 [BT-58D] Cash drawer kick pulse (12V) triggered!');
  setTimeout(() => {
    printerConfig.cashDrawerTriggered = false;
  }, 3000);
  res.json({
    success: true,
    message: '12V pulse sent to cash box port',
    timestamp: new Date().toISOString(),
  });
});

// POST clear history
router.post('/clear', (req, res) => {
  printQueue = [];
  printHistory = [];
  res.json({ success: true, message: 'Print queue and history cleared' });
});

module.exports = router;
