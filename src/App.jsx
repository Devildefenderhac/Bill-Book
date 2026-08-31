import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import BillingView from "./components/BillingView";
import OwnerDashboard from "./components/OwnerDashboard";
import PaymentModal from "./components/PaymentModal";
import PrintReceipt from "./components/PrintReceipt";
import {
  getSettings,
  saveSettings,
  getProducts,
  saveProducts,
  getTransactions,
  saveTransactions,
  generateNextBillNumber,
  processSaleTransaction,
} from "./utils/storage";

export default function App() {
  const [activeTab, setActiveTab] = useState("billing"); // 'billing' | 'owner'
  const [settings, setSettings] = useState(() => getSettings());
  const [products, setProducts] = useState(() => getProducts());
  const [transactions, setTransactions] = useState(() => getTransactions());

  const [cart, setCart] = useState([]);
  const [currentBillNo, setCurrentBillNo] = useState(() => generateNextBillNumber());

  // Payment Modal & Print State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [billToPrint, setBillToPrint] = useState(null);

  // Settings update handler
  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Inventory update handlers
  const handleAddProduct = (newProd) => {
    const updated = [newProd, ...products];
    setProducts(updated);
    saveProducts(updated);
  };

  const handleUpdateProduct = (updatedProd) => {
    const updated = products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
    setProducts(updated);
    saveProducts(updated);
  };

  // Payment trigger from Billing View
  const handleInitiatePayment = (cartSummary) => {
    setPendingCheckout(cartSummary);
    setIsPaymentModalOpen(true);
  };

  // Complete sale & print bill
  const handleCompleteSale = ({
    paymentMode,
    cashTendered,
    changeReturned,
    upiRefNo,
    cardRefNo,
    shouldPrint,
  }) => {
    if (!pendingCheckout) return;

    const newTransaction = {
      billNo: currentBillNo,
      timestamp: new Date().toISOString(),
      customerName: pendingCheckout.customerName,
      customerPhone: pendingCheckout.customerPhone,
      items: pendingCheckout.cart,
      subtotal: pendingCheckout.subtotal,
      discount: pendingCheckout.discount,
      grandTotal: pendingCheckout.grandTotal,
      paymentMode,
      cashTendered,
      changeReturned,
      upiRefNo,
      cardRefNo,
      workerName: settings.workerName || "Cashier Counter 1",
      status: "COMPLETED",
    };

    // Update DB & deduct inventory stock
    const { updatedProducts, updatedTransactions } =
      processSaleTransaction(newTransaction);
    setProducts(updatedProducts);
    setTransactions(updatedTransactions);

    // Set for printing
    setBillToPrint(newTransaction);

    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 300);
    }

    // Reset cart & generate next sequential bill number
    setCart([]);
    setIsPaymentModalOpen(false);
    setPendingCheckout(null);
    setCurrentBillNo(generateNextBillNumber());
  };

  // Reprint existing bill
  const handleReprintBill = (tx) => {
    setBillToPrint(tx);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Cancel bill
  const handleCancelBill = (billNoToCancel) => {
    const updated = transactions.map((t) =>
      t.billNo === billNoToCancel ? { ...t, status: "CANCELLED" } : t
    );
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleReloadData = () => {
    setSettings(getSettings());
    setProducts(getProducts());
    setTransactions(getTransactions());
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onOpenSettings={() => setActiveTab("owner")}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === "billing" ? (
          <BillingView
            products={products}
            cart={cart}
            setCart={setCart}
            currentBillNo={currentBillNo}
            onInitiatePayment={handleInitiatePayment}
          />
        ) : (
          <OwnerDashboard
            transactions={transactions}
            products={products}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onReprintBill={handleReprintBill}
            onCancelBill={handleCancelBill}
            onReloadData={handleReloadData}
          />
        )}
      </main>

      {/* Payment Modal */}
      {pendingCheckout && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          cartSummary={pendingCheckout}
          settings={settings}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {/* Hidden Thermal / A4 Print Receipt View */}
      <PrintReceipt billData={billToPrint} settings={settings} />
    </div>
  );
}
