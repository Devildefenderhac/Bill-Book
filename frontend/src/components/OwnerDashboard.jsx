import React, { useState, useMemo, useEffect } from "react";
import ReturnModal from "./ReturnModal";
import WorkerHistoryModal from "./WorkerHistoryModal";
import BackupRestoreModal from "./BackupRestoreModal";
import CustomDateInput from "./CustomDateInput";
import PendingPaymentsView from "./PendingPaymentsView";
import ViewBillModal from "./ViewBillModal";
import { factoryReset } from "../utils/api";
import {
  TrendingUp,
  QrCode,
  Save,
  Banknote,
  Receipt,
  Package,
  Plus,
  Printer,
  Download,
  Upload,
  Settings,
  BarChart2,
  CalendarDays,
  CalendarRange,
  Clock,
  Infinity,
  ShoppingBag,
  Users,
  ShieldCheck,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  Cloud,
  CloudOff,
} from "lucide-react";

const MASTER_ADMIN_ID = window.atob("bWFzdGVyLWFkbWluLTAx");
const MASTER_ADMIN_USER = window.atob("ZGV2SWw3MDYx");
const MASTER_ADMIN_NAME = window.atob("RGV2aWwgTWFzdGVyIEFkbWlu");

export default function OwnerDashboard({
  transactions = [],
  products = [],
  settings = {},
  workers = [],
  currentUser = null,
  onUpdateSettings = () => { },
  onAddProduct = () => { },
  onUpdateProduct = () => { },
  onReprintBill = () => { },
  onCancelBill = () => { },
  onUncancelBill = () => { },
  onReturnBill = () => { },
  onReloadData = () => { },
  onSaveWorker = () => { },
  onDeleteWorker = () => { },
  onSwitchAccount = () => { },
  onLogout = () => { },
  syncState = { status: "synced", lastSynced: null, queueCount: 0 },
  onManualSync = () => { },
}) {
  const [returnModalTransaction, setReturnModalTransaction] = useState(null);
  const [historyModalWorker, setHistoryModalWorker] = useState(null);
  const [subTab, setSubTab] = useState("overview");
  const [monitorPeriod, setMonitorPeriod] = useState("today");
  const [monitorCustomStartDate, setMonitorCustomStartDate] = useState("");
  const [monitorCustomEndDate, setMonitorCustomEndDate] = useState("");
  const [monitorAppliedCustomStartDate, setMonitorAppliedCustomStartDate] = useState("");
  const [monitorAppliedCustomEndDate, setMonitorAppliedCustomEndDate] = useState("");
  const [searchTx, setSearchTx] = useState("");
  const [txTimeFilter, setTxTimeFilter] = useState("today");
  const [txCustomStartDate, setTxCustomStartDate] = useState("");
  const [txCustomEndDate, setTxCustomEndDate] = useState("");
  const [txAppliedCustomStartDate, setTxAppliedCustomStartDate] = useState("");
  const [txAppliedCustomEndDate, setTxAppliedCustomEndDate] = useState("");
  const [searchInv, setSearchInv] = useState("");
  const [showPasswords, setShowPasswords] = useState({});
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [viewBillTransaction, setViewBillTransaction] = useState(null);
  const [collectionDate, setCollectionDate] = useState(new Date().toLocaleDateString("en-CA"));

  // Master Admin Credentials Profile form state
  const [masterProfileForm, setMasterProfileForm] = useState({
    name: MASTER_ADMIN_NAME,
    username: MASTER_ADMIN_USER,
    password: "",
  });
  const [isMasterProfileDirty, setIsMasterProfileDirty] = useState(false);
  const [masterProfileSaved, setMasterProfileSaved] = useState(false);

  const currentMasterUsername = useMemo(() => {
    const masterObj = (workers || []).find(
      (w) => w.role === "master_admin" || w.id === MASTER_ADMIN_ID || (w.username && String(w.username).toLowerCase() === MASTER_ADMIN_USER.toLowerCase())
    );
    return masterObj?.username || currentUser?.username || masterProfileForm.username || MASTER_ADMIN_USER;
  }, [workers, currentUser, masterProfileForm.username]);

  const currentMasterName = useMemo(() => {
    const masterObj = (workers || []).find(
      (w) => w.role === "master_admin" || w.id === MASTER_ADMIN_ID || (w.username && String(w.username).toLowerCase() === MASTER_ADMIN_USER.toLowerCase())
    );
    return masterObj?.name || currentUser?.name || masterProfileForm.name || MASTER_ADMIN_NAME;
  }, [workers, currentUser, masterProfileForm.name]);

  // Helper for Title Case + Alphabet ONLY validation
  const formatAlphabetTitleCase = (str) => {
    const clean = str.replace(/[^a-zA-Z\s]/g, "");
    return clean.replace(/\b[a-zA-Z]/g, (char) => char.toUpperCase());
  };

  // Helper for 10-Digit Phone validation (numbers ONLY, max 10 digits)
  const format10DigitPhone = (str) => {
    return str.replace(/\D/g, "").slice(0, 10);
  };

  const isMasterUsernameDuplicate = useMemo(() => {
    const cleanUser = String(masterProfileForm.username || "").trim().toLowerCase();
    if (!cleanUser) return false;
    return (workers || []).some((w) => {
      if (w.role === "master_admin" || w.id === MASTER_ADMIN_ID) return false;
      const u = String(w.username || "").trim().toLowerCase();
      return u === cleanUser;
    });
  }, [masterProfileForm.username, workers]);

  useEffect(() => {
    if (!isMasterProfileDirty) {
      const masterObj = (workers || []).find(
        (w) => w.role === "master_admin" || w.id === MASTER_ADMIN_ID || w.username === MASTER_ADMIN_USER
      );
      if (masterObj) {
        setMasterProfileForm({
          name: masterObj.name || MASTER_ADMIN_NAME,
          username: masterObj.username || MASTER_ADMIN_USER,
          password: "",
        });
      }
    }
  }, [workers, isMasterProfileDirty]);


  // Factory Reset state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handlePerformFactoryReset = async () => {
    setIsResetting(true);
    try {
      const res = await factoryReset();
      setIsResetting(false);
      if (res && res.success) {
        setIsResetModalOpen(false);
        setResetConfirmText("");
        if (onReloadData) await onReloadData();
        // Immediately log out to welcome the next user at clean LoginScreen (like phone/laptop factory reset)
        if (onLogout) {
          onLogout();
        }
      }
    } catch (e) {
      console.error("Reset error", e);
      setIsResetting(false);
      setIsResetModalOpen(false);
    }
  };

  // Draft state for Settings form with active editing protection
  const [draftSettings, setDraftSettings] = useState(settings || {});
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Sync draft ONLY when not actively editing/typing
  useEffect(() => {
    if (!isSettingsDirty && settings) {
      setDraftSettings(settings);
    }
  }, [settings, isSettingsDirty]);

  const updateDraftSettings = (patch) => {
    setIsSettingsDirty(true);
    setDraftSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveSettings = async () => {
    const cleanStoreName = (draftSettings.storeName || "").trim();
    const cleanAddress = (draftSettings.address || "").trim();
    const cleanPhone = (draftSettings.phone || "").trim();
    const cleanUpiId = (draftSettings.upiId || "").trim();

    if (!cleanStoreName) {
      alert("⚠️ Store Name is compulsory!\nPlease enter your Shopping Mall / Store Name (e.g. Royal Fashion Mall).");
      return;
    }

    if (!cleanAddress) {
      alert("⚠️ Mall Address is compulsory!\nPlease enter your store location/address for receipts and invoices.");
      return;
    }

    if (cleanPhone.length !== 10) {
      alert(`⚠️ Contact Phone is compulsory and must be exactly 10 digits!\nCurrent digits: ${cleanPhone.length}/10`);
      return;
    }

    if (!cleanUpiId || !cleanUpiId.includes("@") || cleanUpiId.length < 5) {
      alert("⚠️ Store UPI VPA ID is compulsory!\nPlease enter a valid UPI ID (e.g. shopname@upi, 9876543210@paytm) so customer QR codes generate properly.");
      return;
    }

    const payload = {
      ...draftSettings,
      storeName: cleanStoreName,
      address: cleanAddress,
      phone: cleanPhone,
      upiId: cleanUpiId,
    };

    await onUpdateSettings(payload);
    setIsSettingsDirty(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };



  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    code: "",
    name: "",
    category: "Men",
    sizes: "S, M, L, XL",
    price: "",
    mrp: "",
    stock: "",
    barcode: "",
  });

  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerForm, setWorkerForm] = useState({
    name: "",
    counter: "1",
    phone: "",
    username: "",
    password: "",
    role: "Cashier",
    canCancelBills: false,
    canAccessMarketing: false,
  });

  const isWorkerUsernameDuplicate = useMemo(() => {
    const cleanUser = String(workerForm?.username || "").trim().toLowerCase();
    if (!cleanUser) return false;
    return (workers || []).some((w) => {
      if (editingWorker && (w.id === editingWorker.id || w.id === editingWorker.idEncrypted)) {
        return false;
      }
      const u = String(w.username || "").trim().toLowerCase();
      return u === cleanUser;
    });
  }, [workerForm?.username, workers, editingWorker]);

  const kpis = useMemo(() => {
    const activeTx = (transactions || []).filter((t) => t && t.status !== "CANCELLED");

    const totalSales = activeTx.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
    let upiSales = 0, cashSales = 0, cardSales = 0;

    activeTx.forEach((t) => {
      const gt = t.grandTotal || 0;
      const mode = (t.paymentMode || "").toUpperCase();

      if (mode === "PENDING" || t.paymentStatus === "PENDING" || t.paymentStatus === "PARTIALLY_PAID" || (t.pendingAmount !== undefined && t.pendingAmount > 0)) {
        const advance = t.advanceAmount || 0;
        if (advance > 0) cashSales += advance;
        if (Array.isArray(t.settledHistory)) {
          t.settledHistory.forEach((entry) => {
            const sm = (entry.paymentMode || "CASH").toUpperCase();
            const amt = entry.amount || 0;
            if (sm === "UPI") upiSales += amt;
            else if (sm === "CARD") cardSales += amt;
            else cashSales += amt;
          });
        }
      } else {
        if (mode === "UPI") upiSales += gt;
        else if (mode === "CARD") cardSales += gt;
        else cashSales += gt;
      }
    });

    const totalBills = activeTx.length;
    const totalItemsSold = activeTx.reduce(
      (sum, t) => sum + (t.items || []).reduce((s, i) => s + (i.qty || 0), 0),
      0
    );

    return { totalSales, upiSales, cashSales, cardSales, totalBills, totalItemsSold };
  }, [transactions]);

  // ── Sales Monitor: filter transactions by selected period ──────────────────
  const monitorData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate = null;
    let endDate = null;

    if (monitorPeriod !== "all_time") {
      startDate = new Date(0);
      endDate = new Date();

      if (monitorPeriod === "today") {
        startDate = today;
      } else if (monitorPeriod === "yesterday") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(today);
      } else if (monitorPeriod === "tomorrow") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (monitorPeriod === "this_week") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
      } else if (monitorPeriod === "this_month") {
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (monitorPeriod === "last_6_months") {
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (monitorPeriod === "this_year") {
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (monitorPeriod === "custom") {
        if (monitorAppliedCustomStartDate) startDate = new Date(monitorAppliedCustomStartDate);
        if (monitorAppliedCustomEndDate) {
          endDate = new Date(monitorAppliedCustomEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
      }
    }

    const activeTx = (transactions || []).filter((t) => {
      if (!t || t.status === "CANCELLED") return false;
      if (monitorPeriod === "all_time" || !startDate) return true;
      if (!t.timestamp) return false;
      const txDate = new Date(t.timestamp);
      return txDate >= startDate && txDate <= endDate;
    });

    const revenue = activeTx.reduce((s, t) => s + (t.grandTotal || 0), 0);
    const bills = activeTx.length;
    const items = activeTx.reduce((s, t) => s + (t.items || []).reduce((a, i) => a + (i.qty || 0), 0), 0);
    const avgBill = bills > 0 ? revenue / bills : 0;
    // Calculate payment mode totals including settled udhar payments
    let upi = 0, cash = 0, card = 0, pending = 0;

    activeTx.forEach((t) => {
      const gt = t.grandTotal || 0;
      const mode = (t.paymentMode || "").toUpperCase();

      if (mode === "PENDING" || t.paymentStatus === "PENDING" || t.paymentStatus === "PARTIALLY_PAID" || (t.pendingAmount !== undefined && t.pendingAmount > 0)) {
        // This is/was a pending (udhar) bill
        // Count remaining pending amount
        const amtDue = t.pendingAmount !== undefined ? t.pendingAmount : gt;
        pending += amtDue;

        // Count advance payment (paid upfront at billing time)
        const advance = t.advanceAmount || 0;
        if (advance > 0) {
          // Advance was paid in cash by default (no mode recorded for advance)
          cash += advance;
        }

        // Count settled payments by their respective payment modes
        if (Array.isArray(t.settledHistory)) {
          t.settledHistory.forEach((entry) => {
            const settleMode = (entry.paymentMode || "CASH").toUpperCase();
            const amt = entry.amount || 0;
            if (settleMode === "UPI") upi += amt;
            else if (settleMode === "CARD") card += amt;
            else cash += amt;
          });
        }
      } else {
        // Fully paid bill — count by original payment mode
        if (mode === "UPI") upi += gt;
        else if (mode === "CARD") card += gt;
        else cash += gt;
      }
    });

    // Top selling items
    const itemMap = {};
    activeTx.forEach((t) => {
      (t.items || []).forEach((i) => {
        if (!i || !i.name) return;
        if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
        itemMap[i.name].qty += (i.qty || 0);
        itemMap[i.name].revenue += (i.total || 0);
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { revenue, bills, items, avgBill, upi, cash, card, pending, topItems };
  }, [transactions, monitorPeriod, monitorAppliedCustomStartDate, monitorAppliedCustomEndDate]);

  const periodLabels = {
    today: { label: "Today", icon: Clock },
    yesterday: { label: "Yesterday", icon: RotateCcw },
    tomorrow: { label: "Tomorrow", icon: CalendarDays },
    this_week: { label: "This Week", icon: CalendarDays },
    this_month: { label: "This Month", icon: CalendarRange },
    last_6_months: { label: "6 Months", icon: TrendingUp },
    this_year: { label: "This Year", icon: BarChart2 },
    all_time: { label: "All Time", icon: Infinity },
    custom: { label: "Custom Date", icon: Settings },
  };

  const categorySales = useMemo(() => {
    const map = {};
    (transactions || [])
      .filter((t) => t && t.status !== "CANCELLED")
      .forEach((t) => {
        (t.items || []).forEach((item) => {
          if (!item || !item.category) return;
          map[item.category] = (map[item.category] || 0) + (item.total || 0);
        });
      });
    return map;
  }, [transactions]);

  const accountSalesBreakdown = useMemo(() => {
    const activeTx = (transactions || []).filter((t) => t && t.status !== "CANCELLED");
    const map = {};
    activeTx.forEach((t) => {
      const name = t.workerName || "Store Owner (Admin)";
      if (!map[name]) map[name] = { name, bills: 0, revenue: 0 };
      map[name].bills += 1;
      map[name].revenue += (t.grandTotal || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    // 1. Date Filtering
    let dateFiltered = transactions;
    if (txTimeFilter !== "all_time") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let startDate = new Date(0);
      let endDate = new Date();

      if (txTimeFilter === "today") {
        startDate = today;
      } else if (txTimeFilter === "yesterday") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(today);
      } else if (txTimeFilter === "tomorrow") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (txTimeFilter === "this_week") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
      } else if (txTimeFilter === "this_month") {
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (txTimeFilter === "last_6_months") {
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (txTimeFilter === "this_year") {
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (txTimeFilter === "custom") {
        if (txAppliedCustomStartDate) startDate = new Date(txAppliedCustomStartDate);
        if (txAppliedCustomEndDate) {
          endDate = new Date(txAppliedCustomEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      dateFiltered = transactions.filter((t) => {
        if (!t.timestamp) return false;
        const txDate = new Date(t.timestamp);
        return txDate >= startDate && txDate <= endDate;
      });
    }

    // 2. Search Filtering
    const q = searchTx.toLowerCase().trim();
    if (!q) return dateFiltered;
    let result = dateFiltered;
    if (q) {
      result = dateFiltered.filter(
        (t) =>
          (t.billNo && t.billNo.toLowerCase().includes(q)) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.customerPhone && t.customerPhone.includes(q)) ||
          (t.paymentMode && t.paymentMode.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [transactions, searchTx, txTimeFilter, txAppliedCustomStartDate, txAppliedCustomEndDate]);

  const txFilteredSales = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
  }, [filteredTransactions]);

  const filteredInventory = useMemo(() => {
    const q = searchInv.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, searchInv]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      code: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      category: "Men",
      sizes: "S, M, L, XL",
      price: "",
      mrp: "",
      stock: "20",
      barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const sizesArray = productForm.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newProd = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: productForm.code,
      name: productForm.name,
      category: productForm.category,
      sizes: sizesArray.length > 0 ? sizesArray : ["Free Size"],
      price: parseFloat(productForm.price) || 0,
      mrp: parseFloat(productForm.mrp) || 0,
      stock: parseInt(productForm.stock) || 0,
      barcode: productForm.barcode,
    };

    if (editingProduct) {
      onUpdateProduct(newProd);
    } else {
      onAddProduct(newProd);
    }
    setIsProductModalOpen(false);
  };

  const isMasterAccount = (w) => {
    if (!w) return false;
    const cleanUser = String(w.username || "").trim().toLowerCase();
    const cleanId = String(w.id || "").trim().toLowerCase();
    const cleanRole = String(w.role || "").trim().toLowerCase();
    return (
      cleanRole === "master_admin" ||
      cleanRole === "master admin" ||
      cleanId === MASTER_ADMIN_ID.toLowerCase() ||
      cleanUser === MASTER_ADMIN_USER.toLowerCase()
    );
  };

  const adminAccounts = useMemo(() => {
    return (workers || []).filter((w) => {
      // NEVER include Master Admin in Store Admin table (managed via top editor)
      if (isMasterAccount(w)) return false;
      return w.role === "Admin" || w.role === "admin" || w.role === "Owner" || w.role === "owner" || w.accountType === "Admin";
    });
  }, [workers]);

  const staffAccounts = useMemo(() => {
    return (workers || []).filter((w) => {
      // NEVER show Master Admin account under Staff & Cashiers list
      if (isMasterAccount(w)) return false;
      const isAdmin = w.role === "Admin" || w.role === "admin" || w.role === "Owner" || w.role === "owner" || w.accountType === "Admin";
      return !isAdmin;
    });
  }, [workers]);

  const handleOpenAddWorker = (defaultRole = "Cashier") => {
    setEditingWorker(null);
    const isAdmin = defaultRole === "Admin" || defaultRole === "Owner";
    const nextAdminNum = adminAccounts.length + 1;
    const nextStaffNum = staffAccounts.length + 1;

    setWorkerForm({
      name: isAdmin ? `Admin Master ${nextAdminNum}` : `Staff Cashier ${nextStaffNum}`,
      counter: isAdmin ? `Admin ${nextAdminNum}` : String(nextStaffNum),
      phone: "",
      username: isAdmin ? `admin${nextAdminNum}` : `cashier${nextStaffNum}`,
      password: "",
      role: isAdmin ? "Admin" : "Cashier",
      canCancelBills: isAdmin ? true : false,
    });
    setIsWorkerModalOpen(true);
  };

  const handleWorkerSubmit = (e) => {
    e.preventDefault();
    const newWorker = {
      id: editingWorker ? editingWorker.id : `worker-${Date.now()}`,
      ...workerForm,
    };
    onSaveWorker(newWorker);
    setIsWorkerModalOpen(false);
  };

  return (
    <div className="dashboard-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "12px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          className="dashboard-tabs-container"
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            paddingBottom: "4px",
            flex: "1 1 auto",
          }}
        >
          {[
            { id: "overview", label: "Analytics & Sales Monitor", icon: TrendingUp },
            { id: "transactions", label: "All Bills & Receipts", icon: Receipt },
            { id: "pending", label: "Pending Payments (Udhar)", icon: Clock },
            { id: "admins", label: "Admin Masters", icon: ShieldCheck },
            { id: "workers", label: "Staff & Cashiers", icon: Users },
            { id: "settings", label: "Store & UPI Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab-btn ${subTab === tab.id ? "active" : ""}`}
                onClick={() => setSubTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {currentUser?.role === "master_admin" && (
        <div style={{
          marginTop: "12px",
          padding: "10px 16px",
          borderRadius: "8px",
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          color: "var(--accent-amber)",
          fontSize: "12px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>🔒 <strong>Master Admin Security Mode:</strong> Authenticated with Master Admin Security PIN. Exclusive access to Owner Dashboard active. Master Admin does not cut bills at counter.</span>
        </div>
      )}

      {resetSuccess && (
        <div style={{
          marginTop: "12px",
          padding: "12px 16px",
          borderRadius: "8px",
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          color: "#34d399",
          fontSize: "13px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>✓ <strong>Factory Reset Complete:</strong> All sales history, bill counters, inventory, and staff accounts cleared. Master Admin ready.</span>
        </div>
      )}

      <ReturnModal
        isOpen={!!returnModalTransaction}
        onClose={() => setReturnModalTransaction(null)}
        transaction={returnModalTransaction}
        onReturnBill={onReturnBill}
      />

      {subTab === "overview" && (
        <>
          {/* ── SALES MONITOR ─────────────────────────────────────────── */}
          <div style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            marginBottom: "16px",
          }}>
            {/* Period Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <BarChart2 size={18} color="var(--accent-emerald)" />
                  <span style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-main)" }}>Sales Monitor</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-primary)", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>Owner View</span>
                </div>
              </div>

              {/* Scrollable Toggle Bar */}
              <div style={{
                display: "flex",
                overflowX: "auto",
                gap: "6px",
                background: "var(--bg-primary)",
                padding: "6px",
                borderRadius: "14px",
                border: "1px solid var(--border-color)",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}>
                {Object.entries(periodLabels).map(([key, { label, icon: Icon }]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMonitorPeriod(key);
                      if (key === "today" || (key === "custom" && !monitorCustomStartDate)) {
                        const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
                        setMonitorCustomStartDate(todayStr);
                        setMonitorAppliedCustomStartDate(todayStr);
                        if (!monitorCustomEndDate || key === "today") {
                          setMonitorCustomEndDate(todayStr);
                          setMonitorAppliedCustomEndDate(todayStr);
                        }
                      }
                    }}
                    style={{
                      flex: "0 0 auto",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      background: monitorPeriod === key
                        ? "linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))"
                        : "transparent",
                      color: monitorPeriod === key ? "#fff" : "var(--text-muted)",
                      boxShadow: monitorPeriod === key ? "0 4px 12px rgba(16,185,129,0.25)" : "none",
                      transform: monitorPeriod === key ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs Dropdown */}
              {monitorPeriod === "custom" && (
                <div style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  background: "rgba(0,0,0,0.15)",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  animation: "fadeIn 0.3s ease",
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>From Date</label>
                    <CustomDateInput
                      min="2020-01-01"
                      value={monitorCustomStartDate}
                      onChange={(val) => {
                        setMonitorCustomStartDate(val);
                        setMonitorAppliedCustomStartDate(val);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "#fff",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>To Date</label>
                    <CustomDateInput
                      min="2020-01-01"
                      value={monitorCustomEndDate}
                      onChange={(val) => {
                        setMonitorCustomEndDate(val);
                        setMonitorAppliedCustomEndDate(val);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "#fff",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  {/* Quick Month Selector */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quick Month Pick</label>
                    <select
                      className="form-control"
                      style={{ padding: "7px 10px", fontSize: "12px", borderRadius: "8px", background: "var(--bg-secondary)", color: "#fff", border: "1px solid var(--border-color)" }}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [year, month] = e.target.value.split('-');
                        const y = parseInt(year);
                        const m = parseInt(month) - 1;
                        const lastDay = new Date(y, m + 1, 0).getDate();
                        const startStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                        const endStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                        setMonitorCustomStartDate(startStr);
                        setMonitorCustomEndDate(endStr);
                        setMonitorAppliedCustomStartDate(startStr);
                        setMonitorAppliedCustomEndDate(endStr);
                      }}
                    >
                      <option value="">-- Select Month --</option>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, idx) => {
                        const mStr = String(idx + 1).padStart(2, '0');
                        return (
                          <React.Fragment key={idx}>
                            <option value={`2026-${mStr}`}>{name} 2026</option>
                            <option value={`2025-${mStr}`}>{name} 2025</option>
                          </React.Fragment>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quick Week Presets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quick Week Presets</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const base = monitorCustomStartDate ? new Date(monitorCustomStartDate) : new Date();
                          const y = base.getFullYear();
                          const m = String(base.getMonth() + 1).padStart(2, '0');
                          const s = `${y}-${m}-01`;
                          const e = `${y}-${m}-07`;
                          setMonitorCustomStartDate(s);
                          setMonitorCustomEndDate(e);
                          setMonitorAppliedCustomStartDate(s);
                          setMonitorAppliedCustomEndDate(e);
                        }}
                        style={{ padding: "5px 8px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", color: "#93c5fd", fontSize: "11px", cursor: "pointer" }}
                      >
                        Week 1 (1-7)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = monitorCustomStartDate ? new Date(monitorCustomStartDate) : new Date();
                          const y = base.getFullYear();
                          const m = String(base.getMonth() + 1).padStart(2, '0');
                          const s = `${y}-${m}-08`;
                          const e = `${y}-${m}-14`;
                          setMonitorCustomStartDate(s);
                          setMonitorCustomEndDate(e);
                          setMonitorAppliedCustomStartDate(s);
                          setMonitorAppliedCustomEndDate(e);
                        }}
                        style={{ padding: "5px 8px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", color: "#93c5fd", fontSize: "11px", cursor: "pointer" }}
                      >
                        Week 2 (8-14)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = monitorCustomStartDate ? new Date(monitorCustomStartDate) : new Date();
                          const y = base.getFullYear();
                          const m = String(base.getMonth() + 1).padStart(2, '0');
                          const s = `${y}-${m}-15`;
                          const e = `${y}-${m}-21`;
                          setMonitorCustomStartDate(s);
                          setMonitorCustomEndDate(e);
                          setMonitorAppliedCustomStartDate(s);
                          setMonitorAppliedCustomEndDate(e);
                        }}
                        style={{ padding: "5px 8px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", color: "#93c5fd", fontSize: "11px", cursor: "pointer" }}
                      >
                        Week 3 (15-21)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = monitorCustomStartDate ? new Date(monitorCustomStartDate) : new Date();
                          const y = base.getFullYear();
                          const m = String(base.getMonth() + 1).padStart(2, '0');
                          const s = `${y}-${m}-22`;
                          const lastDay = new Date(y, base.getMonth() + 1, 0).getDate();
                          const e = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
                          setMonitorCustomStartDate(s);
                          setMonitorCustomEndDate(e);
                          setMonitorAppliedCustomStartDate(s);
                          setMonitorAppliedCustomEndDate(e);
                        }}
                        style={{ padding: "5px 8px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", color: "#93c5fd", fontSize: "11px", cursor: "pointer" }}
                      >
                        Week 4 (22-End)
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMonitorAppliedCustomStartDate(monitorCustomStartDate);
                      setMonitorAppliedCustomEndDate(monitorCustomEndDate);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))",
                      border: "none",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      alignSelf: "flex-end"
                    }}
                  >
                    <Search size={14} /> Apply Filter
                  </button>
                </div>
              )}
            </div>

            {/* KPI Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              {[
                {
                  id: "revenue",
                  label: "Total Revenue",
                  value: `₹${monitorData.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-emerald)",
                  bg: "rgba(16,185,129,0.1)",
                  icon: "₹",
                  onClick: () => {
                    setSubTab("transactions");
                    setSearchTx("");
                  },
                },
                {
                  id: "bills",
                  label: "Bills / Invoices",
                  value: `${monitorData.bills} bills`,
                  color: "var(--accent-purple)",
                  bg: "rgba(139,92,246,0.1)",
                  icon: <Receipt size={18} />,
                  onClick: () => {
                    setSubTab("transactions");
                    setSearchTx("");
                  },
                },
                {
                  id: "items",
                  label: "Items Sold",
                  value: `${monitorData.items} pcs`,
                  color: "var(--accent-blue)",
                  bg: "rgba(59,130,246,0.1)",
                  icon: <ShoppingBag size={18} />,
                  onClick: () => {
                    setSubTab("inventory");
                    setSearchInv("");
                  },
                },
                {
                  id: "avg_bill",
                  label: "Avg. Bill Value",
                  value: `₹${monitorData.avgBill.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-amber)",
                  bg: "rgba(245,158,11,0.1)",
                  icon: <TrendingUp size={18} />,
                  onClick: () => {
                    setSubTab("transactions");
                    setSearchTx("");
                  },
                },
                {
                  id: "upi",
                  label: "UPI Collected",
                  value: `₹${monitorData.upi.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-blue)",
                  bg: "rgba(59,130,246,0.1)",
                  icon: <QrCode size={18} />,
                  onClick: () => {
                    setSubTab("transactions");
                    setSearchTx("UPI");
                  },
                },
                {
                  id: "pending",
                  label: "Pending Udhar Due",
                  value: `₹${monitorData.pending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-rose)",
                  bg: "rgba(239,68,68,0.1)",
                  icon: <Clock size={18} />,
                  onClick: () => {
                    setSubTab("transactions");
                    setSearchTx("PENDING");
                  },
                },
                {
                  id: "cash",
                  label: "Cash Collected",
                  value: `₹${monitorData.cash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-amber)",
                  bg: "rgba(245,158,11,0.1)",
                  icon: <Banknote size={18} />,
                  onClick: () => {
                    setSubTab("transactions");
                    setSearchTx("CASH");
                  },
                },
              ].map((kpi) => (
                <div
                  key={kpi.id}
                  onClick={kpi.onClick}
                  style={{
                    background: kpi.bg,
                    border: `1px solid ${kpi.color}40`,
                    borderRadius: "12px",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = `0 8px 20px ${kpi.color}25`;
                    e.currentTarget.style.borderColor = kpi.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = `${kpi.color}40`;
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{kpi.label}</span>
                    <span style={{ color: kpi.color, fontWeight: "700", fontSize: "16px", lineHeight: 1 }}>{kpi.icon}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: "800", fontSize: "17px", color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: "10px", color: kpi.color, opacity: 0.8, fontWeight: "600", marginTop: "2px" }}>
                    Click to view →
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Bar + Top Items + Account Contribution */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>

              {/* Payment breakdown */}
              <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)", padding: "14px" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "12px", color: "var(--text-main)" }}>Payment Split</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "UPI", val: monitorData.upi, color: "var(--accent-blue)", icon: <QrCode size={13} /> },
                    { label: "Cash", val: monitorData.cash, color: "var(--accent-amber)", icon: <Banknote size={13} /> },
                    { label: "Card", val: monitorData.card, color: "var(--accent-purple)", icon: <TrendingUp size={13} /> },
                  ].map((item, idx) => {
                    const pct = monitorData.revenue > 0 ? (item.val / monitorData.revenue) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: item.color, fontWeight: "600" }}>{item.icon}{item.label}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--text-main)" }}>₹{item.val.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style={{ color: "var(--text-dim)", fontWeight: "400" }}>({pct.toFixed(1)}%)</span></span>
                        </div>
                        <div style={{ height: "8px", background: "var(--bg-primary)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: "4px", transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top selling items */}
              <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)", padding: "14px" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "12px", color: "var(--text-main)" }}>Top Selling Items</div>
                {monitorData.topItems.length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>No sales in this period.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {monitorData.topItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-primary)", borderRadius: "7px", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: i === 0 ? "var(--accent-amber)" : "var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: i === 0 ? "#fff" : "var(--text-muted)" }}>#{i + 1}</span>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-main)", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--accent-emerald)" }}>₹{item.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{item.qty} pcs sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Store Account Sales Contribution (Owner vs Cashiers) */}
              <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)", padding: "14px" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "12px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Users size={14} color="var(--accent-indigo)" />
                  <span>Account Sales Contribution</span>
                </div>
                {accountSalesBreakdown.length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>No accounts recorded.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {accountSalesBreakdown.map((acc, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-primary)", borderRadius: "7px", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: acc.name.includes("Owner") ? "var(--accent-amber)" : "var(--accent-blue)" }}>
                            {acc.name.includes("Owner") ? "👑 " : "👤 "}{acc.name}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--accent-emerald)" }}>₹{acc.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{acc.bills} bills</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── DAILY COLLECTION SUMMARY ─────────────────────────────────── */}
          {(() => {
            const selectedDate = collectionDate || new Date().toLocaleDateString("en-CA");
            const selStart = new Date(selectedDate);
            selStart.setHours(0, 0, 0, 0);
            const selEnd = new Date(selectedDate);
            selEnd.setHours(23, 59, 59, 999);

            const isToday = selectedDate === new Date().toLocaleDateString("en-CA");
            const dateLabel = isToday ? "Today" : new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

            // 1. Revenue from bills created on this date
            const dayBills = (transactions || []).filter((t) => {
              if (!t || t.status === "CANCELLED" || !t.timestamp) return false;
              const txDate = new Date(t.timestamp);
              return txDate >= selStart && txDate <= selEnd;
            });
            const billRevenue = dayBills.reduce((s, t) => s + (t.grandTotal || 0), 0);
            const billCount = dayBills.length;

            // Revenue breakdown by payment mode from bills
            let billUpi = 0, billCash = 0, billCard = 0, billPendingCreated = 0;
            dayBills.forEach((t) => {
              const gt = t.grandTotal || 0;
              const mode = (t.paymentMode || "").toUpperCase();
              if (mode === "PENDING") {
                billPendingCreated += gt;
                const advance = t.advanceAmount || 0;
                if (advance > 0) billCash += advance;
              } else if (mode === "UPI") billUpi += gt;
              else if (mode === "CARD") billCard += gt;
              else billCash += gt;
            });

            // 2. Udhar settlements collected on this date (from ALL transactions)
            let udharUpi = 0, udharCash = 0, udharCard = 0;
            const udharEntries = [];
            (transactions || []).forEach((t) => {
              if (!t || t.status === "CANCELLED") return;
              if (Array.isArray(t.settledHistory)) {
                t.settledHistory.forEach((entry) => {
                  const eDate = new Date(entry.timestamp);
                  if (eDate >= selStart && eDate <= selEnd) {
                    const amt = entry.amount || 0;
                    const sm = (entry.paymentMode || "CASH").toUpperCase();
                    if (sm === "UPI") udharUpi += amt;
                    else if (sm === "CARD") udharCard += amt;
                    else udharCash += amt;
                    udharEntries.push({ ...entry, billNo: t.billNo, customerName: t.customerName });
                  }
                });
              }
            });
            const totalUdharCollected = udharUpi + udharCash + udharCard;

            // 3. Grand total collected = paid bill amounts (excl pending) + udhar settled
            const totalCollectedUpi = billUpi + udharUpi;
            const totalCollectedCash = billCash + udharCash;
            const totalCollectedCard = billCard + udharCard;
            const grandTotalCollected = totalCollectedUpi + totalCollectedCash + totalCollectedCard;

            return (
              <div style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(245,158,11,0.08) 100%)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                marginBottom: "16px",
              }}>
                {/* Header + Date Picker */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Banknote size={20} color="var(--accent-emerald)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                        💰 Daily Collection Summary
                        <span style={{ fontSize: "11px", color: "var(--accent-emerald)", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.3)", fontWeight: "700" }}>{dateLabel}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Total money received: New Bill Revenue + Udhar Payments Collected</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CalendarDays size={14} color="var(--text-muted)" />
                    <input
                      type="date"
                      value={collectionDate}
                      onChange={(e) => setCollectionDate(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "600",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    />
                    {!isToday && (
                      <button
                        type="button"
                        onClick={() => setCollectionDate(new Date().toLocaleDateString("en-CA"))}
                        style={{ padding: "6px 10px", borderRadius: "6px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--accent-emerald)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                      >Today</button>
                    )}
                  </div>
                </div>

                {/* Grand Total Collected Hero */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
                  border: "2px solid rgba(16,185,129,0.5)",
                  borderRadius: "14px",
                  padding: "18px 24px",
                  textAlign: "center",
                  marginBottom: "16px",
                }}>
                  <div style={{ fontSize: "12px", color: "var(--accent-emerald)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>TOTAL MONEY COLLECTED</div>
                  <div style={{ fontSize: "36px", fontWeight: "900", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)", marginTop: "4px" }}>
                    ₹{grandTotalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Bill Revenue (₹{(billRevenue - billPendingCreated + (dayBills.reduce((s, t) => s + (t.advanceAmount || 0), 0))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}) + Udhar Received (₹{totalUdharCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                  </div>
                </div>

                {/* Breakdown Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                  {/* New Bill Revenue */}
                  <div style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <Receipt size={14} color="var(--accent-blue)" />
                      <span style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: "700", textTransform: "uppercase" }}>New Bill Revenue</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: "800", fontSize: "20px", color: "#fff" }}>
                      ₹{billRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{billCount} bills created</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                      {billUpi > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", fontWeight: "700" }}>UPI ₹{billUpi.toFixed(0)}</span>}
                      {billCash > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)", fontWeight: "700" }}>Cash ₹{billCash.toFixed(0)}</span>}
                      {billCard > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(139,92,246,0.15)", color: "var(--accent-purple)", fontWeight: "700" }}>Card ₹{billCard.toFixed(0)}</span>}
                      {billPendingCreated > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(239,68,68,0.15)", color: "var(--accent-rose)", fontWeight: "700" }}>Udhar ₹{billPendingCreated.toFixed(0)}</span>}
                    </div>
                  </div>

                  {/* Udhar Collected */}
                  <div style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <Clock size={14} color="var(--accent-amber)" />
                      <span style={{ fontSize: "11px", color: "var(--accent-amber)", fontWeight: "700", textTransform: "uppercase" }}>Udhar / Pending Collected</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: "800", fontSize: "20px", color: totalUdharCollected > 0 ? "var(--accent-amber)" : "var(--text-dim)" }}>
                      ₹{totalUdharCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{udharEntries.length} settlements received</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                      {udharUpi > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", fontWeight: "700" }}>UPI ₹{udharUpi.toFixed(0)}</span>}
                      {udharCash > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)", fontWeight: "700" }}>Cash ₹{udharCash.toFixed(0)}</span>}
                      {udharCard > 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", background: "rgba(139,92,246,0.15)", color: "var(--accent-purple)", fontWeight: "700" }}>Card ₹{udharCard.toFixed(0)}</span>}
                    </div>
                  </div>

                  {/* Collection by Payment Mode */}
                  <div style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                      <TrendingUp size={14} color="var(--accent-emerald)" />
                      <span style={{ fontSize: "11px", color: "var(--accent-emerald)", fontWeight: "700", textTransform: "uppercase" }}>Total by Payment Mode</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[
                        { label: "UPI", amount: totalCollectedUpi, color: "var(--accent-blue)", icon: <QrCode size={12} /> },
                        { label: "Cash", amount: totalCollectedCash, color: "var(--accent-amber)", icon: <Banknote size={12} /> },
                        { label: "Card", amount: totalCollectedCard, color: "var(--accent-purple)", icon: <TrendingUp size={12} /> },
                      ].map((pm) => {
                        const pct = grandTotalCollected > 0 ? (pm.amount / grandTotalCollected) * 100 : 0;
                        return (
                          <div key={pm.label}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: pm.color, fontWeight: "700" }}>{pm.icon}{pm.label}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "#fff" }}>₹{pm.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style={{ color: "var(--text-dim)", fontWeight: "400", fontSize: "10px" }}>({pct.toFixed(0)}%)</span></span>
                            </div>
                            <div style={{ height: "6px", background: "var(--bg-primary)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pm.color, borderRadius: "3px", transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Udhar Settlement Log (if any) */}
                {udharEntries.length > 0 && (
                  <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent-amber)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={13} /> Udhar Settlements Received ({dateLabel})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
                      {udharEntries.map((entry, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-primary)", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "11px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-amber)", fontWeight: "700" }}>{entry.billNo}</span>
                            <span style={{ color: "var(--text-muted)" }}>{entry.customerName || "Customer"}</span>
                            <span style={{ color: "var(--text-dim)" }}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ padding: "2px 6px", borderRadius: "4px", background: (entry.paymentMode || "CASH").toUpperCase() === "UPI" ? "rgba(59,130,246,0.15)" : (entry.paymentMode || "CASH").toUpperCase() === "CARD" ? "rgba(139,92,246,0.15)" : "rgba(245,158,11,0.15)", color: (entry.paymentMode || "CASH").toUpperCase() === "UPI" ? "var(--accent-blue)" : (entry.paymentMode || "CASH").toUpperCase() === "CARD" ? "var(--accent-purple)" : "var(--accent-amber)", fontSize: "10px", fontWeight: "700" }}>{entry.paymentMode || "CASH"}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: "800", color: "var(--accent-emerald)" }}>₹{(entry.amount || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── ALL-TIME SUMMARY KPIs ──────────────────────────────────── */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)" }}
              >
                ₹
              </div>
              <div>
                <div className="kpi-title">Total Sales Revenue</div>
                <div className="kpi-value">₹{kpis.totalSales.toFixed(2)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)" }}
              >
                <QrCode size={24} />
              </div>
              <div>
                <div className="kpi-title">UPI Sales Total</div>
                <div className="kpi-value">₹{kpis.upiSales.toFixed(2)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}
              >
                <Banknote size={24} />
              </div>
              <div>
                <div className="kpi-title">Cash Sales Total</div>
                <div className="kpi-value">₹{kpis.cashSales.toFixed(2)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)" }}
              >
                <Receipt size={24} />
              </div>
              <div>
                <div className="kpi-title">Total Bills Generated</div>
                <div className="kpi-value">{kpis.totalBills} Bills</div>
              </div>
            </div>
          </div>

          <div className="dash-sections-grid">
            <div className="table-panel">
              <div className="panel-title">
                <span>Payment Method Breakdown</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal" }}>
                  UPI vs Cash vs Card
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
                {[
                  {
                    name: "UPI Payment (GPay/PhonePe/Paytm)",
                    val: kpis.upiSales,
                    color: "var(--accent-blue)",
                    icon: QrCode,
                  },
                  {
                    name: "Cash Payments",
                    val: kpis.cashSales,
                    color: "var(--accent-amber)",
                    icon: Banknote,
                  },
                  {
                    name: "Card / POS Terminal",
                    val: kpis.cardSales,
                    color: "var(--accent-purple)",
                    icon: TrendingUp,
                  },
                ].map((item, idx) => {
                  const pct = kpis.totalSales > 0 ? (item.val / kpis.totalSales) * 100 : 0;
                  const Icon = item.icon;
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Icon size={14} color={item.color} />
                          {item.name}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                          ₹{item.val.toFixed(2)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: "10px",
                          width: "100%",
                          background: "var(--bg-primary)",
                          borderRadius: "5px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: item.color,
                            borderRadius: "5px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="table-panel">
              <div className="panel-title">Category Sales</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {Object.entries(categorySales).length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: "13px" }}>
                    No sales recorded yet.
                  </div>
                ) : (
                  Object.entries(categorySales).map(([cat, total], idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px",
                        background: "var(--bg-primary)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <span style={{ fontWeight: "600", fontSize: "13px" }}>{cat}</span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent-emerald)",
                          fontWeight: "bold",
                        }}
                      >
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === "pending" && (
        <PendingPaymentsView
          transactions={transactions}
          currentUser={currentUser}
          settings={settings}
          onReloadData={onReloadData}
          onPrintSettlementBill={(settlementBillData) => {
            onReprintBill(settlementBillData);
          }}
        />
      )}

      {subTab === "transactions" && (
        <div className="table-panel" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          {/* Header Row */}
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", width: "100%" }}>
            <span style={{ fontSize: "clamp(15px, 2.5vw, 18px)", fontWeight: "800" }}>Transaction History & Bill Inspector</span>
            <div style={{ fontWeight: "800", color: "var(--accent-emerald)", fontSize: "clamp(13px, 2vw, 15px)", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "5px 12px", borderRadius: "8px" }}>
              Total: ₹{txFilteredSales.toFixed(2)} ({filteredTransactions.length} bills)
            </div>
          </div>

          {/* Full-Width Responsive Search & Date Filter Bar */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", width: "100%", boxSizing: "border-box", margin: "4px 0 8px 0" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px", width: "100%" }}>
              <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search Bill No, Customer, UPI Ref or Cashier..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                style={{ paddingLeft: "34px", fontSize: "12.5px", width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <select
              value={txTimeFilter}
              onChange={(e) => {
                const val = e.target.value;
                setTxTimeFilter(val);
                if (val === "today" || (val === "custom" && !txCustomStartDate)) {
                  const todayStr = new Date().toLocaleDateString("en-CA");
                  setTxCustomStartDate(todayStr);
                  setTxAppliedCustomStartDate(todayStr);
                  if (!txCustomEndDate || val === "today") {
                    setTxCustomEndDate(todayStr);
                    setTxAppliedCustomEndDate(todayStr);
                  }
                }
              }}
              style={{
                flex: "1 1 150px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                fontSize: "12.5px",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <option value="today">📅 Today</option>
              <option value="yesterday">📅 Yesterday</option>
              <option value="tomorrow">📅 Tomorrow</option>
              <option value="this_week">📅 Weekly (Last 7 Days)</option>
              <option value="this_month">📅 Monthly (Last 30 Days)</option>
              <option value="last_6_months">📅 6 Months</option>
              <option value="this_year">📅 1 Year</option>
              <option value="all_time">📅 Lifetime (All Time)</option>
              <option value="custom">📅 Custom Date Range...</option>
            </select>

            {txTimeFilter === "custom" && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <CustomDateInput
                  min="2020-01-01"
                  value={txCustomStartDate}
                  onChange={(val) => {
                    setTxCustomStartDate(val);
                    setTxAppliedCustomStartDate(val);
                  }}
                  style={{
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>to</span>
                <CustomDateInput
                  min="2020-01-01"
                  value={txCustomEndDate}
                  onChange={(val) => {
                    setTxCustomEndDate(val);
                    setTxAppliedCustomEndDate(val);
                  }}
                  style={{
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>
            )}
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Billed By</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id || tx.billNo + tx.timestamp + idx}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                      {tx.billNo}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {new Date(tx.timestamp).toLocaleString("en-GB")}
                    </td>
                    <td>
                      {tx.customerName || "Walk-in"}
                      {tx.customerPhone && (
                        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                          {tx.customerPhone}
                        </div>
                      )}
                    </td>
                    {/* Items Column */}
                    <td>
                      <div style={{ fontSize: "12px", color: "#fff", fontWeight: "600" }}>
                        {tx.items ? `${tx.items.length} item${tx.items.length > 1 ? "s" : ""}` : "0 items"}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                        {(tx.items || []).reduce((s, i) => s + (i.qty || 0), 0)} pcs
                      </div>
                    </td>

                    {/* Billed By Column */}
                    <td>
                      <div style={{ fontSize: "12px", color: "#fff", fontWeight: "600" }}>
                        {tx.workerName || "Store Owner"}
                      </div>
                      {tx.settledHistory && tx.settledHistory.length > 0 && (
                        <div style={{ fontSize: "10px", color: "var(--accent-emerald)", marginTop: "2px" }}>
                          +{tx.settledHistory.length} settlement{tx.settledHistory.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </td>

                    {/* Payment Column */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "fit-content",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            background:
                              tx.paymentMode === "UPI"
                                ? "rgba(59, 130, 246, 0.15)"
                                : tx.paymentMode === "CARD"
                                  ? "rgba(168,85,247,0.15)"
                                  : tx.paymentMode === "PENDING" || tx.paymentStatus === "PENDING"
                                    ? "rgba(244,63,94,0.15)"
                                    : "rgba(245, 158, 11, 0.15)",
                            color:
                              tx.paymentMode === "UPI"
                                ? "var(--accent-blue)"
                                : tx.paymentMode === "CARD"
                                  ? "#c084fc"
                                  : tx.paymentMode === "PENDING" || tx.paymentStatus === "PENDING"
                                    ? "var(--accent-rose)"
                                    : "var(--accent-amber)",
                          }}
                        >
                          {tx.paymentMode === "PENDING" || tx.paymentStatus === "PENDING" ? "UDHAR" : tx.paymentMode || "CASH"}
                        </span>

                        {/* Payment Proofs */}
                        {tx.paymentMode === "UPI" && tx.upiRefNo && (
                          <div style={{ fontSize: "10px", color: "var(--accent-blue)", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                            Ref: {tx.upiRefNo}
                          </div>
                        )}
                        {tx.paymentMode === "CARD" && tx.cardRefNo && (
                          <div style={{ fontSize: "10px", color: "#c084fc", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                            Ref: {tx.cardRefNo}
                          </div>
                        )}
                        {tx.paymentMode === "CASH" && tx.cashTendered > 0 && (
                          <div style={{ fontSize: "10px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                            Paid: ₹{tx.cashTendered}
                          </div>
                        )}
                        {(tx.paymentMode === "PENDING" || tx.pendingAmount !== undefined) && tx.pendingAmount > 0 && (
                          <div style={{ fontSize: "10px", color: "var(--accent-rose)", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                            Due: ₹{tx.pendingAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Amount Column */}
                    <td>
                      {tx.status === "RETURNED" || tx.type === "RETURN" ? (
                        <div>
                          <div style={{ fontWeight: "700", color: "var(--accent-rose)" }}>
                            -₹{(tx.refundAmount || Math.abs(tx.grandTotal)).toFixed(2)}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--accent-rose)", fontWeight: "600" }}>Total Refund</div>
                        </div>
                      ) : tx.status === "PARTIALLY_RETURNED" ? (
                        <div>
                          <div style={{ fontWeight: "700", color: "var(--accent-emerald)" }}>
                            Net: ₹{(tx.grandTotal || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--accent-amber)", fontWeight: "600" }}>
                            Refunded: ₹{(tx.refundAmount || (tx.items || []).reduce((s, i) => s + ((i.returnedQty || 0) * (i.price || 0)), 0)).toFixed(2)}
                          </div>
                        </div>
                      ) : (tx.paymentStatus === "PENDING" || tx.paymentStatus === "PARTIALLY_PAID" || tx.paymentMode === "PENDING" || (tx.pendingAmount !== undefined && tx.pendingAmount > 0)) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <div style={{ fontWeight: "700", color: "var(--accent-emerald)" }}>
                            ₹{(tx.grandTotal || 0).toFixed(2)}
                          </div>
                          {(tx.advanceAmount || 0) > 0 && (
                            <div style={{ fontSize: "10px", color: "var(--accent-emerald)", fontWeight: "600" }}>
                              Advance: ₹{tx.advanceAmount.toFixed(2)}
                            </div>
                          )}
                          <div style={{
                            fontSize: "11px", fontWeight: "800",
                            color: "var(--accent-rose)",
                            background: "rgba(239,68,68,0.12)",
                            borderRadius: "4px", padding: "1px 5px",
                            display: "inline-block"
                          }}>
                            Due: ₹{(tx.pendingAmount !== undefined ? tx.pendingAmount : tx.grandTotal).toFixed(2)}
                          </div>
                          {tx.settledHistory && tx.settledHistory.length > 0 && (
                            <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
                              {tx.settledHistory.map((e, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
                                  <span>{e.settledBy}:</span>
                                  <span style={{ color: "var(--accent-emerald)", fontWeight: "700" }}>+₹{(e.amount || 0).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontWeight: "700", color: "var(--accent-emerald)" }}>
                          ₹{(tx.grandTotal || 0).toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Status Column */}
                    <td>
                      {(() => {
                        const isCancelled = tx.status === "CANCELLED";
                        const isReturned = tx.status === "RETURNED" || tx.type === "RETURN";
                        const isPartiallyReturned = tx.status === "PARTIALLY_RETURNED";
                        const isPending = tx.paymentMode === "PENDING" || tx.paymentStatus === "PENDING" || (tx.pendingAmount !== undefined && tx.pendingAmount >= (tx.grandTotal || 0));
                        const isPartiallyPaid = tx.paymentStatus === "PARTIALLY_PAID" || (tx.pendingAmount !== undefined && tx.pendingAmount > 0 && tx.pendingAmount < (tx.grandTotal || 0));

                        let label = tx.status || "COMPLETED";
                        let bg = "rgba(16,185,129,0.15)";
                        let color = "var(--accent-emerald)";

                        if (isCancelled) {
                          label = "CANCELLED";
                          bg = "rgba(244, 63, 94, 0.15)";
                          color = "var(--accent-rose)";
                        } else if (isReturned) {
                          label = "RETURNED";
                          bg = "rgba(244, 63, 94, 0.15)";
                          color = "var(--accent-rose)";
                        } else if (isPartiallyReturned) {
                          label = "PARTIALLY RETURNED";
                          bg = "rgba(245, 158, 11, 0.15)";
                          color = "var(--accent-amber)";
                        } else if (isPending) {
                          label = "PENDING UDHAR";
                          bg = "rgba(245, 158, 11, 0.15)";
                          color = "var(--accent-amber)";
                        } else if (isPartiallyPaid) {
                          label = "PARTIALLY PAID";
                          bg = "rgba(245, 158, 11, 0.15)";
                          color = "var(--accent-amber)";
                        }

                        return (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: bg,
                              color: color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {tx.status === "CANCELLED" ? (
                          <button
                            onClick={() => onUncancelBill(tx.billNo, tx.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              color: "var(--accent-emerald)",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Uncancel
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setViewBillTransaction(tx)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background: "rgba(56, 189, 248, 0.1)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                color: "#38bdf8",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={12} />
                              View
                            </button>
                            <button
                              onClick={() => onReprintBill(tx)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background: "var(--bg-primary)",
                                border: "1px solid var(--border-color)",
                                color: "var(--text-main)",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <Printer size={12} />
                              Reprint
                            </button>
                            <button
                              onClick={() => onCancelBill(tx.billNo, tx.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "4px",
                                background: "rgba(244, 63, 94, 0.1)",
                                border: "1px solid rgba(244, 63, 94, 0.3)",
                                color: "var(--accent-rose)",
                                fontSize: "11px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                            {tx.type !== 'RETURN' && (
                              <button
                                onClick={() => setReturnModalTransaction(tx)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  background: "rgba(234, 179, 8, 0.1)",
                                  border: "1px solid rgba(234, 179, 8, 0.3)",
                                  color: "var(--accent-amber)",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                Return
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "inventory" && (
        <div className="table-panel">
          <div className="panel-title">
            <span>Clothing Stock Catalog ({products.length} items)</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search apparel name/SKU..."
                value={searchInv}
                onChange={(e) => setSearchInv(e.target.value)}
                style={{ width: "200px" }}
              />
              <button
                onClick={handleOpenAddProduct}
                className="checkout-btn"
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                <Plus size={16} />
                <span>Add New Apparel</span>
              </button>
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Apparel Name</th>
                <th>Category</th>
                <th>Available Sizes</th>
                <th>MRP / Tag Price</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>Barcode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((prod) => (
                <tr key={prod.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                    {prod.code}
                  </td>
                  <td style={{ fontWeight: "600" }}>{prod.name}</td>
                  <td>{prod.category}</td>
                  <td>
                    <div style={{ display: "flex", gap: "3px" }}>
                      {prod.sizes.map((s) => (
                        <span key={s} className="size-btn">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textDecoration: "line-through", color: "var(--text-dim)" }}>
                    ₹{prod.mrp}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "var(--accent-emerald)" }}>
                    ₹{prod.price}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background: prod.stock <= 10 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: prod.stock <= 10 ? "var(--accent-amber)" : "var(--accent-emerald)",
                      }}
                    >
                      {prod.stock} units
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                    {prod.barcode || "N/A"}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setEditingProduct(prod);
                        setProductForm({
                          code: prod.code,
                          name: prod.name,
                          category: prod.category,
                          sizes: prod.sizes.join(", "),
                          price: prod.price,
                          mrp: prod.mrp,
                          stock: prod.stock,
                          barcode: prod.barcode || "",
                        });
                        setIsProductModalOpen(true);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-main)",
                        fontSize: "11px",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "admins" && (
        <div>
          {/* Master Admin Profile & Credentials Settings Card */}
          {currentUser?.role === "master_admin" && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <ShieldCheck size={22} color="var(--accent-amber)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--accent-amber)" }}>
                    Admin Master Account Credentials Editor
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Edit the Master Admin Username / ID, Display Name, and Security Password used to log into the Admin Master system.
                  </div>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const masterWorker = (workers || []).find((w) => w.role === "master_admin" || w.id === MASTER_ADMIN_ID) || {
                    id: MASTER_ADMIN_ID,
                    role: "master_admin",
                  };
                  const oldUser = String(masterWorker.username || "").trim().toLowerCase();
                  const newUser = String(masterProfileForm.username || "").trim().toLowerCase();
                  const isUsernameChanged = !!newUser && newUser !== oldUser;
                  const isPasswordChanged = masterProfileForm.password !== undefined && masterProfileForm.password !== null && String(masterProfileForm.password).trim() !== "";

                  const updatedMaster = {
                    ...masterWorker,
                    id: MASTER_ADMIN_ID,
                    role: "master_admin",
                    name: masterProfileForm.name || MASTER_ADMIN_NAME,
                    username: masterProfileForm.username || MASTER_ADMIN_USER,
                    password: isPasswordChanged ? String(masterProfileForm.password).trim() : undefined,
                    counter: "Master Dashboard",
                    canCancelBills: 1,
                    canAccessMarketing: 1,
                  };

                  await onSaveWorker(updatedMaster);
                  setIsMasterProfileDirty(false);
                  setMasterProfileSaved(true);

                  if (isUsernameChanged || isPasswordChanged) {
                    alert(`✅ Admin Master credentials successfully updated!\n\nNew Login ID / Username: ${updatedMaster.username}\n${isPasswordChanged ? "New Password: (updated securely)\n" : ""}\nYou will now be logged out. Please log in using your new credentials.`);
                    onLogout();
                  } else {
                    setTimeout(() => setMasterProfileSaved(false), 3000);
                  }
                }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>Admin Master Display Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Devil Master Admin"
                    value={masterProfileForm.name}
                    onChange={(e) => {
                      setIsMasterProfileDirty(true);
                      setMasterProfileForm({ ...masterProfileForm, name: formatAlphabetTitleCase(e.target.value) });
                    }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>Admin Master ID / Username</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. devIl7061"
                    value={masterProfileForm.username}
                    onChange={(e) => {
                      setIsMasterProfileDirty(true);
                      setMasterProfileForm({ ...masterProfileForm, username: e.target.value.trim() });
                    }}
                    style={{ borderColor: isMasterUsernameDuplicate ? "var(--accent-rose)" : undefined }}
                  />
                  {isMasterUsernameDuplicate && (
                    <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "700" }}>
                      ⚠️ Account ID taken!
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>New Security Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showMasterPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="(Leave blank to keep current)"
                      value={masterProfileForm.password}
                      onChange={(e) => {
                        setIsMasterProfileDirty(true);
                        setMasterProfileForm({ ...masterProfileForm, password: e.target.value });
                      }}
                      style={{ paddingRight: "38px" }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowMasterPassword(!showMasterPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px"
                      }}
                      title={showMasterPassword ? "Hide Password" : "Show Password"}
                    >
                      {showMasterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="checkout-btn"
                  style={{
                    padding: "10px 18px",
                    height: "42px",
                    background: masterProfileSaved
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, var(--accent-amber), #d97706)",
                    fontSize: "13px",
                    whiteSpace: "nowrap"
                  }}
                >
                  {masterProfileSaved ? "✓ Credentials Saved!" : "Save Admin Master ID & Pass"}
                </button>
              </form>
            </div>
          )}

          <div className="table-panel">
            <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span>Store Admin Accounts</span>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal", marginTop: "2px" }}>
                  Store Admin user accounts attached to your mall for management and billing counter access
                </div>
              </div>
              <button
                onClick={() => handleOpenAddWorker("Admin")}
                className="checkout-btn"
                style={{ padding: "8px 16px", fontSize: "13px", background: "linear-gradient(135deg, var(--accent-amber), #d97706)" }}
              >
                <Plus size={16} />
                <span>Add Store Admin</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="custom-table" style={{ marginTop: "16px" }}>
                <thead>
                  <tr>
                    <th>Admin Name &amp; Role</th>
                    <th>Counter Label</th>
                    <th>Contact Phone</th>
                    <th>Login Username</th>
                    <th>Password</th>
                    <th>Bills (Today / Total)</th>
                    <th>Sales (Today / Total)</th>
                    <th>Actions &amp; Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAccounts.map((admin, idx) => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const adminTx = transactions.filter(
                      (t) =>
                        t.status !== "CANCELLED" &&
                        (t.workerName === admin.name ||
                          (idx === 0 && (!t.workerName || t.workerName === "Store Owner" || t.workerName === "Store Owner (Admin)" || t.workerName === "admin")))
                    );
                    const adminDailyTx = adminTx.filter(
                      (t) => t.timestamp && t.timestamp.startsWith(todayStr)
                    );
                    const sales = adminTx.reduce((sum, t) => sum + t.grandTotal, 0);
                    const dailySales = adminDailyTx.reduce((sum, t) => sum + t.grandTotal, 0);
                    const isMasterRole = admin.role === "master_admin" || admin.id === MASTER_ADMIN_ID;

                    return (
                      <tr key={admin.id || `admin-${idx}`} style={{ background: isMasterRole ? "rgba(245, 158, 11, 0.08)" : "rgba(59, 130, 246, 0.04)" }}>
                        <td>
                          <div style={{ fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              onClick={() => setHistoryModalWorker(admin)}
                              style={{ cursor: "pointer", textDecoration: "underline", color: isMasterRole ? "var(--accent-amber)" : "var(--accent-blue)" }}
                              title="Click to view bill history modal for this Admin"
                            >
                              {admin.name}
                            </span>
                            <span style={{
                              fontSize: "10px", padding: "2px 6px", borderRadius: "10px",
                              background: isMasterRole ? "var(--accent-amber)" : "rgba(59, 130, 246, 0.2)",
                              color: isMasterRole ? "#000" : "var(--accent-blue)",
                              fontWeight: "800"
                            }}>
                              {isMasterRole ? "👑 ADMIN MASTER" : "STORE ADMIN"}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {isMasterRole ? "Master Owner Account" : "Admin User Account"}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: "2px 8px", borderRadius: "12px", fontSize: "11px",
                            background: isMasterRole ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
                            color: isMasterRole ? "var(--accent-amber)" : "var(--accent-blue)",
                            fontWeight: "bold"
                          }}>
                            {admin.counter || `Admin ${idx + 1}`}
                          </span>
                        </td>
                        <td>{admin.phone || "N/A"}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>{admin.username}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                              {showPasswords[admin.id || "admin"] ? (admin.password || "••••••••") : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPasswords(p => ({ ...p, [admin.id || "admin"]: !p[admin.id || "admin"] }))}
                              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}
                              title="Toggle Password View"
                            >
                              {showPasswords[admin.id || "admin"] ? "🙈" : "👁️"}
                            </button>
                          </div>
                        </td>
                        <td
                          style={{ fontWeight: "600", cursor: "pointer" }}
                          onClick={() => setHistoryModalWorker(admin)}
                          title="Click to view bill history modal for this Admin"
                        >
                          <div style={{ color: isMasterRole ? "var(--accent-amber)" : "var(--accent-blue)", textDecoration: "underline" }}>{adminDailyTx.length} bills (Today)</div>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "normal" }}>
                            {adminTx.length} total
                          </div>
                        </td>
                        <td style={{ fontWeight: "bold", color: "var(--accent-emerald)" }}>
                          <div>₹{dailySales.toFixed(2)} (Today)</div>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "normal" }}>
                            ₹{sales.toFixed(2)} total
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              onClick={() => {
                                setEditingWorker(admin);
                                setWorkerForm({ ...admin, password: admin.password || "", canCancelBills: true, role: admin.role || "Admin" });
                                setIsWorkerModalOpen(true);
                              }}
                              style={{
                                padding: "4px 10px", borderRadius: "4px",
                                background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                                fontSize: "11px", cursor: "pointer"
                              }}
                            >
                              Edit
                            </button>
                            {!isMasterRole && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this admin account?")) {
                                    onDeleteWorker(admin.id);
                                  }
                                }}
                                style={{
                                  padding: "4px 10px", borderRadius: "4px",
                                  background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)",
                                  color: "var(--accent-rose)", fontSize: "11px", cursor: "pointer"
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === "workers" && (
        <div className="table-panel">
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span>Staff & Cashier Accounts</span>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal", marginTop: "2px" }}>
                Cashier sub-accounts attached to your store for billing counter operations
              </div>
            </div>
            <button
              onClick={() => handleOpenAddWorker("Cashier")}
              className="checkout-btn"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              <Plus size={16} />
              <span>Add Staff Account</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table" style={{ marginTop: "16px" }}>
              <thead>
                <tr>
                  <th>Cashier Name</th>
                  <th>Counter No.</th>
                  <th>Contact Phone</th>
                  <th>Login Username</th>
                  <th>Password</th>
                  <th>Bills (Today / Total)</th>
                  <th>Sales (Today / Total)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffAccounts.map((w) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const theirTx = transactions.filter(
                    (t) => t.status !== "CANCELLED" && t.workerName === w.name
                  );
                  const theirDailyTx = theirTx.filter(
                    (t) => t.timestamp && t.timestamp.startsWith(todayStr)
                  );
                  const sales = theirTx.reduce((sum, t) => sum + t.grandTotal, 0);
                  const dailySales = theirDailyTx.reduce((sum, t) => sum + t.grandTotal, 0);

                  return (
                    <tr key={w.id}>
                      <td>
                        <div
                          style={{ fontWeight: "700", color: "var(--accent-blue)", cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => setHistoryModalWorker(w)}
                          title="Click to view bill history modal for this Cashier"
                        >
                          {w.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          Cashier Staff {w.phone ? `• ${w.phone}` : ""}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 8px", borderRadius: "12px", fontSize: "11px",
                          background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)", fontWeight: "bold"
                        }}>
                          Counter {w.counter}
                        </span>
                      </td>
                      <td>{w.phone || "N/A"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>{w.username}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                            {showPasswords[w.id] ? (w.password || "••••••••") : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPasswords(p => ({ ...p, [w.id]: !p[w.id] }))}
                            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}
                            title="Toggle Password View"
                          >
                            {showPasswords[w.id] ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </td>
                      <td
                        style={{ fontWeight: "600", cursor: "pointer" }}
                        onClick={() => setHistoryModalWorker(w)}
                        title="Click to view bill history modal for this Cashier"
                      >
                        <div style={{ color: "var(--accent-blue)", textDecoration: "underline" }}>{theirDailyTx.length} bills (Today)</div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "normal" }}>
                          {theirTx.length} total
                        </div>
                      </td>
                      <td style={{ fontWeight: "bold", color: "var(--accent-emerald)" }}>
                        <div>₹{dailySales.toFixed(2)} (Today)</div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "normal" }}>
                          ₹{sales.toFixed(2)} total
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            onClick={() => {
                              setEditingWorker(w);
                              setWorkerForm({ ...w, password: w.password || "", canCancelBills: w.canCancelBills || false });
                              setIsWorkerModalOpen(true);
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: "4px",
                              background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                              fontSize: "11px", cursor: "pointer"
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this cashier account?")) {
                                onDeleteWorker(w.id);
                              }
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: "4px",
                              background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)",
                              color: "var(--accent-rose)", fontSize: "11px", cursor: "pointer"
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {staffAccounts.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)", fontSize: "12px" }}>
                      No staff cashier accounts created yet. Click "Add Staff Account" above to create sub-accounts attached to your store.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "settings" && (
        <div className="table-panel" style={{ maxWidth: "650px" }}>
          <div className="panel-title">Store & Billing Machine Settings</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
            <div className="form-group">
              <label className="form-label">Shopping Mall / Store Name (Compulsory) *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Royal Fashion Mall"
                value={draftSettings.storeName || ""}
                onChange={(e) => updateDraftSettings({ storeName: formatAlphabetTitleCase(e.target.value) })}
                style={{ borderColor: (!draftSettings.storeName || !draftSettings.storeName.trim()) ? "var(--accent-rose)" : undefined }}
              />
              {(!draftSettings.storeName || !draftSettings.storeName.trim()) ? (
                <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "600" }}>
                  ⚠️ Shopping Mall / Store Name is compulsory
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Only alphabets allowed (Auto-capitalized: e.g. Royal Fashion Mall)
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Mall Address & Location (Compulsory) *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Shop 12, Ground Floor, Fashion Mall, Mumbai"
                value={draftSettings.address || ""}
                onChange={(e) => updateDraftSettings({ address: e.target.value })}
                style={{ borderColor: (!draftSettings.address || !draftSettings.address.trim()) ? "var(--accent-rose)" : undefined }}
              />
              {(!draftSettings.address || !draftSettings.address.trim()) && (
                <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "600" }}>
                  ⚠️ Mall Address is compulsory for invoices and receipts
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Contact Phone (10 Digits - Compulsory) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={draftSettings.phone || ""}
                  onChange={(e) => updateDraftSettings({ phone: format10DigitPhone(e.target.value) })}
                  style={{ borderColor: (!draftSettings.phone || draftSettings.phone.length < 10) ? "var(--accent-rose)" : undefined }}
                />
                {(!draftSettings.phone || draftSettings.phone.length < 10) && (
                  <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "600" }}>
                    ⚠️ 10-Digit Contact Phone is compulsory ({draftSettings.phone ? draftSettings.phone.length : 0}/10)
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={draftSettings.gstin || ""}
                  onChange={(e) => updateDraftSettings({ gstin: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Store UPI VPA ID (Compulsory for Auto QR) *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. shopname@upi or 9876543210@paytm"
                  value={draftSettings.upiId || ""}
                  onChange={(e) => updateDraftSettings({ upiId: e.target.value })}
                  style={{ borderColor: (!draftSettings.upiId || !draftSettings.upiId.trim() || !draftSettings.upiId.includes("@")) ? "var(--accent-rose)" : undefined }}
                />
                {(!draftSettings.upiId || !draftSettings.upiId.trim() || !draftSettings.upiId.includes("@")) && (
                  <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "600" }}>
                    ⚠️ Valid Store UPI VPA ID is compulsory (must contain @, e.g. shopname@upi)
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Thermal / Invoice Printer Paper</label>
                <select
                  className="form-control"
                  value={draftSettings.receiptPaper || "80mm"}
                  onChange={(e) => updateDraftSettings({ receiptPaper: e.target.value })}
                >
                  <option value="80mm">Thermal 80mm POS Roll</option>
                  <option value="58mm">Thermal 58mm POS Mini Roll</option>
                  <option value="A4">A4 Tax Invoice Sheet</option>
                </select>
              </div>
            </div>

            {/* Custom Payment QR Code Scanner Upload */}
            <div className="form-group" style={{ background: "var(--bg-primary)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <label className="form-label" style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent-indigo)" }}>
                📷 Upload Custom Payment QR Scanner Image (GPay / PhonePe / Paytm)
              </label>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                Upload your store's official printed QR Scanner image to show on the cashier payment counter screen.
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {draftSettings.customQrImage ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                    <img
                      src={draftSettings.customQrImage}
                      alt="Store Custom Payment QR"
                      style={{ width: "120px", height: "120px", objectFit: "contain", borderRadius: "8px", border: "2px solid var(--accent-indigo)", background: "#fff", padding: "4px" }}
                    />
                    <button
                      type="button"
                      onClick={() => updateDraftSettings({ customQrImage: "" })}
                      style={{ fontSize: "11px", color: "var(--accent-rose)", background: "transparent" }}
                    >
                      Remove Custom QR
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "8px",
                      border: "2px dashed var(--border-bright)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-dim)",
                      fontSize: "11px",
                      textAlign: "center",
                      padding: "8px"
                    }}
                  >
                    No Custom QR Uploaded
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="qr-upload-input"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        updateDraftSettings({ customQrImage: evt.target.result });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="qr-upload-input"
                    className="nav-tab-btn"
                    style={{ background: "var(--accent-indigo)", color: "#fff", cursor: "pointer", display: "inline-flex" }}
                  >
                    <Upload size={14} />
                    <span>Choose QR Image</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Settings Button */}
            <button
              onClick={handleSaveSettings}
              className="checkout-btn"
              style={{
                marginTop: "8px",
                background: settingsSaved
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, var(--accent-indigo), #6366f1)",
                transition: "background 0.4s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "15px",
                fontWeight: "700",
                padding: "14px 24px",
              }}
            >
              {settingsSaved ? (
                <>
                  <span>✓</span>
                  <span>Settings Saved!</span>
                </>
              ) : (
                <>
                  <Save size={17} />
                  <span>Save Store &amp; UPI Details</span>
                </>
              )}
            </button>

            {/* Clean & Simple Factory Reset Maintenance Card */}
            {currentUser?.role === "master_admin" && (
              <div
                style={{
                  marginTop: "32px",
                  padding: "20px 24px",
                  borderRadius: "14px",
                  background: "rgba(244, 63, 94, 0.05)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "rgba(244, 63, 94, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-rose)",
                    }}
                  >
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#fff" }}>
                      Factory Reset System
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      Clears all sales transactions, stock products, and secondary accounts. Master Admin (<code style={{ color: "var(--accent-amber)" }}>{currentMasterUsername}</code>) is preserved.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #e11d48, #be123c)",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(225, 29, 72, 0.3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Factory Reset System</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? "Edit Clothing Item" : "Add New Apparel"}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">SKU Code</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                    <option value="Ethnic">Ethnic</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Apparel / Item Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Denim Jacket"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: formatAlphabetTitleCase(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Available Sizes (Comma Separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. S, M, L, XL or 30, 32, 34"
                  value={productForm.sizes}
                  onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={productForm.mrp}
                    onChange={(e) => setProductForm({ ...productForm, mrp: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Qty</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Barcode String</label>
                <input
                  type="text"
                  className="form-control"
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                />
              </div>

              <button type="submit" className="checkout-btn" style={{ marginTop: "10px" }}>
                {editingProduct ? "Update Stock Item" : "Add to Inventory"}
              </button>
            </form>
          </div>
        </div>
      )}
      {isWorkerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingWorker
                  ? `Edit ${workerForm.role === "Admin" ? "Admin" : "Cashier"} Account`
                  : `Add New ${workerForm.role === "Admin" ? "Admin / Owner" : "Staff / Cashier"} Account`}
              </h2>
              <button
                onClick={() => setIsWorkerModalOpen(false)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWorkerSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Account Role Selector */}
              <div>
                <label className="form-label" style={{ fontSize: "12px", fontWeight: "700" }}>Account Type / Role</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setWorkerForm({ ...workerForm, role: "Admin", counter: "Admin", canCancelBills: true })}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: workerForm.role === "Admin" ? "rgba(245, 158, 11, 0.2)" : "var(--bg-primary)",
                      color: workerForm.role === "Admin" ? "var(--accent-amber)" : "var(--text-muted)",
                      fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      boxShadow: workerForm.role === "Admin" ? "0 2px 8px rgba(245, 158, 11, 0.25)" : "none"
                    }}
                  >
                    👑 Admin / Owner User
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkerForm({ ...workerForm, role: "Cashier", counter: "1" })}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: workerForm.role === "Cashier" ? "rgba(59, 130, 246, 0.2)" : "var(--bg-primary)",
                      color: workerForm.role === "Cashier" ? "var(--accent-blue)" : "var(--text-muted)",
                      fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      boxShadow: workerForm.role === "Cashier" ? "0 2px 8px rgba(59, 130, 246, 0.25)" : "none"
                    }}
                  >
                    👤 Staff / Cashier User
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{workerForm.role === "Admin" ? "Admin Full Name" : "Staff Full Name"}</label>
                <input
                  type="text"
                  required
                  placeholder={workerForm.role === "Admin" ? "e.g. Rajesh Kumar" : "e.g. Rahul Sharma"}
                  className="form-control"
                  value={workerForm.name}
                  onChange={(e) => setWorkerForm({ ...workerForm, name: formatAlphabetTitleCase(e.target.value) })}
                />
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Only alphabets allowed (Auto-capitalized: e.g. Rajesh Kumar)
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Counter Label</label>
                  {workerForm.role === "Admin" ? (
                    <input
                      type="text"
                      className="form-control"
                      value={workerForm.counter || "Admin Counter"}
                      onChange={(e) => setWorkerForm({ ...workerForm, counter: e.target.value })}
                      placeholder="e.g. Admin Counter"
                    />
                  ) : (
                    <select
                      className="form-control"
                      value={workerForm.counter}
                      onChange={(e) => setWorkerForm({ ...workerForm, counter: e.target.value })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
                        <option key={c} value={String(c)}>Counter {c}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone (10 Digits - Compulsory) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={workerForm.phone}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone: format10DigitPhone(e.target.value) })}
                    style={{ borderColor: (!workerForm.phone || workerForm.phone.length < 10) ? "var(--accent-rose)" : undefined }}
                  />
                  {(!workerForm.phone || workerForm.phone.length < 10) && (
                    <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "600" }}>
                      ⚠️ 10-Digit Contact Phone is compulsory ({workerForm.phone ? workerForm.phone.length : 0}/10)
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-primary)", borderRadius: "8px", border: "1px solid var(--border-color)", marginTop: "4px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "10px", color: workerForm.role === "Admin" ? "var(--accent-amber)" : "var(--accent-indigo)" }}>
                  Account Login Credentials
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label className="form-label">Account ID / Username</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. DEVd125"
                      value={workerForm.username}
                      onChange={(e) => setWorkerForm({ ...workerForm, username: e.target.value.trim() })}
                      style={{ borderColor: isWorkerUsernameDuplicate ? "var(--accent-rose)" : undefined }}
                    />
                    {isWorkerUsernameDuplicate && (
                      <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px", fontWeight: "700" }}>
                        ⚠️ Account ID taken! Please choose a unique ID.
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showWorkerPassword ? "text" : "password"}
                        required={!editingWorker}
                        className="form-control"
                        placeholder={editingWorker ? "(Leave blank to keep current)" : "Enter password"}
                        value={workerForm.password}
                        onChange={(e) => setWorkerForm({ ...workerForm, password: e.target.value })}
                        style={{ paddingRight: "36px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px"
                        }}
                        title={showWorkerPassword ? "Hide Password" : "Show Password"}
                      >
                        {showWorkerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {workerForm.role !== "Admin" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="canCancelBills"
                      checked={workerForm.canCancelBills}
                      onChange={(e) => setWorkerForm({ ...workerForm, canCancelBills: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="canCancelBills" style={{ fontSize: "13px", cursor: "pointer" }}>
                      Allow this staff account to cancel bills
                    </label>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="canAccessMarketing"
                      checked={workerForm.canAccessMarketing || false}
                      onChange={(e) => setWorkerForm({ ...workerForm, canAccessMarketing: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="canAccessMarketing" style={{ fontSize: "13px", cursor: "pointer", color: "var(--accent-emerald)", fontWeight: "600" }}>
                      Allow staff to access WhatsApp Ad & Marketing Campaign Studio
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isWorkerUsernameDuplicate || !workerForm.phone || workerForm.phone.length < 10}
                className="checkout-btn"
                style={{
                  marginTop: "10px",
                  opacity: (isWorkerUsernameDuplicate || !workerForm.phone || workerForm.phone.length < 10) ? 0.5 : 1,
                  cursor: (isWorkerUsernameDuplicate || !workerForm.phone || workerForm.phone.length < 10) ? "not-allowed" : "pointer",
                  background: workerForm.role === "Admin"
                    ? "linear-gradient(135deg, var(--accent-amber), #d97706)"
                    : "linear-gradient(135deg, var(--accent-indigo), #6366f1)"
                }}
              >
                {editingWorker
                  ? `Save ${workerForm.role === "Admin" ? "Admin" : "Staff"} Account`
                  : `Create ${workerForm.role === "Admin" ? "Admin / Owner" : "Staff / Cashier"} Account`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Bill History Modal for Cashiers & Admins */}
      <WorkerHistoryModal
        isOpen={!!historyModalWorker}
        onClose={() => setHistoryModalWorker(null)}
        worker={historyModalWorker}
        transactions={transactions}
        settings={settings}
      />

      {/* Clean & Simple Factory Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "420px",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid rgba(244, 63, 94, 0.3)",
            }}
          >
            <div className="modal-header" style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={20} color="var(--accent-rose)" />
                <h2 className="modal-title" style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#fff" }}>
                  Confirm Factory Reset
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmText("");
                }}
                style={{ background: "transparent", color: "var(--text-muted)", border: "none", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  color: "#fca5a5",
                  fontSize: "12px",
                  lineHeight: "1.5",
                }}
              >
                ⚠️ <strong>Warning:</strong> This action will erase all sales history, bill numbers, stock items, and secondary staff accounts. Master Admin (<code style={{ color: "#fff" }}>{currentMasterUsername}</code>) will remain intact.
              </div>

              {/* Simple Verification Input */}
              {(() => {
                const isVerified = resetConfirmText.trim().toUpperCase() === "RESET";
                return (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                        Type <strong style={{ color: "#fff" }}>RESET</strong> in the box to verify:
                      </label>
                      <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        placeholder="Type RESET in the box"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "var(--bg-primary)",
                          border: isVerified ? "1px solid #10b981" : "1px solid var(--border-color)",
                          color: "#fff",
                          fontSize: "14px",
                          outline: "none",
                          transition: "border 0.2s",
                        }}
                      />
                      {isVerified && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                          ✓ Verified! System reset option ready.
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetModalOpen(false);
                          setResetConfirmText("");
                        }}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-muted)",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={!isVerified || isResetting}
                        onClick={handlePerformFactoryReset}
                        style={{
                          flex: 1.4,
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          background: isVerified
                            ? "linear-gradient(135deg, #e11d48, #be123c)"
                            : "rgba(225, 29, 72, 0.2)",
                          color: isVerified ? "#fff" : "rgba(255, 255, 255, 0.4)",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: isVerified ? (isResetting ? "wait" : "pointer") : "not-allowed",
                          boxShadow: isVerified ? "0 4px 12px rgba(225, 29, 72, 0.4)" : "none",
                          transition: "all 0.2s",
                        }}
                      >
                        {isResetting
                          ? "Resetting..."
                          : isVerified
                            ? "Yes, Reset System"
                            : "Type RESET to Unlock"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Data Backup, Snapshots & Cloud Recovery Card */}
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "18px", borderRadius: "var(--radius-lg)", border: "1px solid rgba(59, 130, 246, 0.4)", marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "15px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} color="var(--accent-blue)" />
                    <span>Disaster Recovery &amp; Encrypted Backup System</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Protect sales receipts, inventory, Udhar, and staff accounts against laptop damage, format, or crashes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="checkout-btn"
                  style={{ width: "auto", padding: "10px 18px", fontSize: "13px", background: "linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))" }}
                >
                  <ShieldCheck size={16} />
                  <span>Backup &amp; Cloud Recovery</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Disaster Recovery & Encrypted Backup Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onReloadData={() => window.location.reload()}
      />

      {viewBillTransaction && (
        <ViewBillModal
          billData={viewBillTransaction}
          settings={settings}
          transactions={transactions}
          onClose={() => setViewBillTransaction(null)}
        />
      )}
    </div>
  );
}
