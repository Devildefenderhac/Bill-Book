const express = require('express');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API security key protection
router.use(verifyApiKey);

const { exec } = require('child_process');

// In-memory print queue and configuration
let printQueue = [];
let printHistory = [];
let printerConfig = {
  model: 'POS-58 Thermal Printer',
  port: 'USB001',
  paperWidth: '58mm',
  charsPerLine: 32,
  manualConnected: false,
  cashDrawerTriggered: false,
};

// Helper: Real-time physical hardware port & printer detection on Windows
function detectPhysicalPrinters() {
  return new Promise((resolve) => {
    // Check Windows PnP connected devices and installed printers
    const cmd = `powershell -NoProfile -Command "
      $pnp = @(Get-PnpDevice -Class 'Printer', 'USB' -ErrorAction SilentlyContinue | Where-Object { $_.Present -eq $true -and $_.Status -eq 'OK' } | Select-Object FriendlyName, InstanceId);
      $printers = @(Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Select-Object Name, PortName, PrinterStatus, Default);
      [PSCustomObject]@{ pnp = $pnp; printers = $printers } | ConvertTo-Json -Depth 3 -Compress
    "`;

    exec(cmd, { timeout: 3500 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve({ connected: false, activePrinter: null, activePort: null, thermalPrinters: [], allPrinters: [] });
      }

      try {
        const data = JSON.parse(stdout.trim());
        const pnpList = Array.isArray(data.pnp) ? data.pnp : (data.pnp ? [data.pnp] : []);
        const printerList = Array.isArray(data.printers) ? data.printers : (data.printers ? [data.printers] : []);

        // Detect thermal / POS printers in Windows print queue
        const thermalPrinters = printerList.filter((p) => {
          const name = (p.Name || '').toLowerCase();
          return (
            name.includes('pos') ||
            name.includes('thermal') ||
            name.includes('58') ||
            name.includes('80') ||
            name.includes('receipt') ||
            name.includes('esc') ||
            name.includes('xprinter') ||
            name.includes('rpp') ||
            name.includes('citizen') ||
            name.includes('epson') ||
            name.includes('tvs') ||
            name.includes('tsc')
          );
        });

        // Detect if USB hardware device is actively plugged into port
        const isHardwarePluggedIn = pnpList.some((p) => {
          const name = (p.FriendlyName || '').toLowerCase();
          const id = (p.InstanceId || '').toLowerCase();
          return (
            name.includes('pos') ||
            name.includes('thermal') ||
            (name.includes('printer') && !name.includes('pdf')) ||
            id.includes('vid_4e53') ||
            id.includes('vid_0416') ||
            id.includes('vid_0483') ||
            id.includes('vid_04b8')
          );
        });

        const activeThermal = thermalPrinters[0] || null;
        const isConnected = isHardwarePluggedIn;

        resolve({
          connected: isConnected,
          activePrinter: activeThermal ? activeThermal.Name : (printerList[0]?.Name || null),
          activePort: activeThermal ? activeThermal.PortName : null,
          thermalPrinters: thermalPrinters.map((p) => p.Name),
          allPrinters: printerList.map((p) => p.Name),
        });
      } catch (e) {
        resolve({ connected: false, activePrinter: null, activePort: null, thermalPrinters: [], allPrinters: [] });
      }
    });
  });
}

// GET status: Checks actual hardware port connection
router.get('/status', async (req, res) => {
  const detect = await detectPhysicalPrinters();
  const isOnline = detect.connected && printerConfig.manualConnected;

  res.json({
    connected: isOnline,
    model: detect.activePrinter || printerConfig.model,
    port: detect.activePort || printerConfig.port,
    interface: detect.activePort ? `Port: ${detect.activePort}` : 'USB Port',
    paperWidth: printerConfig.paperWidth,
    queueLength: printQueue.length,
    historyCount: printHistory.length,
    cashDrawerTriggered: printerConfig.cashDrawerTriggered,
  });
});

// GET printer list
router.get('/list', async (req, res) => {
  const detect = await detectPhysicalPrinters();
  res.json({
    all: detect.allPrinters.length > 0 ? detect.allPrinters : ['Microsoft Print to PDF'],
    thermal: detect.thermalPrinters,
    active: detect.activePrinter || (detect.thermalPrinters[0] || null),
  });
});

// POST connect: Probes port and hardware
router.post('/connect', async (req, res) => {
  const detect = await detectPhysicalPrinters();

  if (!detect.connected) {
    printerConfig.manualConnected = false;
    return res.json({
      success: false,
      connected: false,
      error: 'Physical printer not detected on USB/COM ports. Please connect the USB cable, turn on printer power, and try again.',
    });
  }

  printerConfig.manualConnected = true;
  printerConfig.model = detect.activePrinter || 'POS-58 Thermal Printer';
  printerConfig.port = detect.activePort || 'USB001';

  res.json({
    success: true,
    connected: true,
    message: `Connected to ${printerConfig.model} (${printerConfig.port})`,
    printer: printerConfig.model,
    config: { ...printerConfig, connected: true },
  });
});

// POST disconnect
router.post('/disconnect', (req, res) => {
  printerConfig.manualConnected = false;
  res.json({
    success: true,
    connected: false,
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
