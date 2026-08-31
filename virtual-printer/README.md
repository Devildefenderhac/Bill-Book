# 🖨️ BT-58D Virtual POS Thermal Printer Simulator (58mm)

A dedicated, standalone hardware simulator for testing POS thermal receipts specifically calibrated for **Model: BT-58D** (USB + Bluetooth, 9V-2A, 58mm roll width).

---

## 🚀 How to Run the Virtual Printer

1. **Option 1 (1-Click Launch):** Double-click `start-virtual-printer.bat` in this folder.
2. **Option 2:** Double-click and open `index.html` in any browser (Chrome, Edge, Firefox).

---

## 🎯 Features & Test Capabilities

- **Realistic BT-58D Hardware Visuals:** Exact replica of the black BT-58D casing, LED lights, paper mouth, power rocker switch, and cutter teeth.
- **Accurate 58mm Monospace Layout:** Calibrated to 32-character Font-A monospace layout (384 dots @ 203 DPI) with authentic thermal paper textures.
- **20 Retail Scenarios Ready to Test:**
  1. Standard Cash Sale with Change Returned
  2. Dynamic UPI QR Code Bill
  3. Credit/Debit Card Swiped Bill
  4. Split Payment (Cash + UPI)
  5. Udhar / Khata Credit Bill with previous balance
  6. Udhar Settlement / Khata Payment Receipt
  7. Item Return & Cash Refund Slip
  8. Size / Item Exchange Slip (+ / - quantities)
  9. Advance Customer Order Booking Slip
  10. Bulk Wholesale Tax Invoice
  11. Cancelled Bill with VOID Watermark
  12. Duplicate / Reprint Copy
  13. Festival Discount Savings Bill
  14. GST Tax Breakdown Invoice (CGST + SGST)
  15. Long 8-Item Clothing Invoice
  16. BT-58D Hardware Self-Test Report
- **Sound Effects:** Built-in synthesized thermal printing stepper-motor hum, paper tear sound, and 12V cash box kick solenoid sound using the Web Audio API.
- **Live POS Spooler Listener:** Automatically listens to the POS backend at `http://127.0.0.1:5000/api/thermal-printer/queue`. When any sale or reprint happens in BillBook, the virtual printer feeds and animates the bill in real time.
- **Save as High-Res PNG Image:** 1-click export of any printed receipt as an image for sharing or customer preview.
- **Print Density Adjustment:** Toggle between Light, Standard, and Deep Black thermal burn densities.
- **Cash Drawer Kick (12V) Simulation:** Test cash box impulse triggers.

---

## 🗑️ How to Remove When Your Physical BT-58D Arrives

This tool is stored in its own clean, isolated directory (`virtual-printer/`).
When your physical BT-58D printer arrives and you connect it via USB / Bluetooth, you can simply **delete this `virtual-printer` folder** anytime — your core BillBook POS app will continue running without any changes.
