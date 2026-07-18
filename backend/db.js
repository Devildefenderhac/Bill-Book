import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'database.json');

const initialSeedProducts = [
  {
    id: "prod-001",
    code: "TSH-M-101",
    name: "Classic Crew Neck Cotton T-Shirt",
    category: "Men",
    sizes: ["S", "M", "L", "XL", "XXL"],
    price: 699,
    mrp: 1299,
    stock: 45,
    barcode: "890100100101",
  },
  {
    id: "prod-002",
    code: "JNS-M-102",
    name: "Slim Fit Stretch Denim Jeans",
    category: "Men",
    sizes: ["30", "32", "34", "36"],
    price: 1899,
    mrp: 2999,
    stock: 28,
    barcode: "890100100102",
  },
  {
    id: "prod-003",
    code: "SRT-M-103",
    name: "Pure Linen Casual Button Shirt",
    category: "Men",
    sizes: ["M", "L", "XL"],
    price: 1499,
    mrp: 2299,
    stock: 30,
    barcode: "890100100103",
  },
  {
    id: "prod-004",
    code: "DRS-W-201",
    name: "Floral Print Chiffon Midi Dress",
    category: "Women",
    sizes: ["S", "M", "L", "XL"],
    price: 2199,
    mrp: 3499,
    stock: 18,
    barcode: "890100100201",
  },
  {
    id: "prod-005",
    code: "TOP-W-202",
    name: "Satin V-Neck Elegant Blouse",
    category: "Women",
    sizes: ["XS", "S", "M", "L"],
    price: 999,
    mrp: 1699,
    stock: 35,
    barcode: "890100100202",
  },
  {
    id: "prod-006",
    code: "JNS-W-203",
    name: "High-Waist Wide Leg Denim",
    category: "Women",
    sizes: ["26", "28", "30", "32"],
    price: 1799,
    mrp: 2799,
    stock: 22,
    barcode: "890100100203",
  },
  {
    id: "prod-007",
    code: "KID-B-301",
    name: "Boys Cartoon Printed Cotton Set",
    category: "Kids",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    price: 799,
    mrp: 1299,
    stock: 50,
    barcode: "890100100301",
  },
  {
    id: "prod-008",
    code: "KID-G-302",
    name: "Girls Embroidered Party Frock",
    category: "Kids",
    sizes: ["3-4Y", "5-6Y", "7-8Y"],
    price: 1299,
    mrp: 1999,
    stock: 25,
    barcode: "890100100302",
  },
  {
    id: "prod-009",
    code: "ETH-M-401",
    name: "Silk Blend Kurta Pyjama Set",
    category: "Ethnic",
    sizes: ["38", "40", "42", "44"],
    price: 2499,
    mrp: 3999,
    stock: 15,
    barcode: "890100100401",
  },
  {
    id: "prod-010",
    code: "ETH-W-402",
    name: "Designer Anarkali Suit with Dupatta",
    category: "Ethnic",
    sizes: ["S", "M", "L", "XL", "XXL"],
    price: 3499,
    mrp: 5999,
    stock: 12,
    barcode: "890100100402",
  },
];

const defaultSettings = {
  storeName: "ROYAL FASHION MALL",
  tagline: "Premier Clothing & Apparel Store",
  address: "Grand Central Mall, Ground Floor, Main Road",
  city: "New Delhi, 110001",
  phone: "+91 98765 43210",
  gstin: "07AAACR1234F1Z5",
  upiId: "royalfashion@upi",
  upiName: "Royal Fashion Mall",
  billPrefix: "BILL-",
  receiptPaper: "80mm",
  workerName: "Cashier Counter 1",
};

// Initialize or load JSON Database
export function getDB() {
  if (!fs.existsSync(dbFilePath)) {
    const initialData = {
      products: initialSeedProducts,
      transactions: [],
      store_settings: defaultSettings,
      bill_counter: {},
      workers: [],
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading database file", e);
    return {
      products: initialSeedProducts,
      transactions: [],
      store_settings: defaultSettings,
      bill_counter: {},
      workers: [],
    };
  }
}

export function saveDB(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing database file", e);
  }
}
