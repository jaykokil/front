import { useEffect, useRef, useState } from "react";

const DEMO_DATABASE = {
  "8901234567890": {
    productId: "P001",
    brandName: "Magic Moments Plain Vodka",
    category: "Vodka",
    bottleSizeML: 750,
    emptyBottleWeightG: 400,
  },
  "8901234567891": {
    productId: "P002",
    brandName: "Magic Moments Green Apple Vodka",
    category: "Vodka",
    bottleSizeML: 750,
    emptyBottleWeightG: 405,
  },
  "8901234567892": {
    productId: "P003",
    brandName: "Old Monk Rum",
    category: "Rum",
    bottleSizeML: 750,
    emptyBottleWeightG: 420,
  },
};

export default function BarcodeScaleConnector() {
  const scannerInputRef = useRef(null);
  const barcodeTimerRef = useRef(null);

  const [scaleStatus, setScaleStatus] = useState("Disconnected");
  const [scannerStatus, setScannerStatus] = useState("Disconnected");
  const [barcode, setBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const connectDevices = async () => {
    setScannerStatus("Ready - scan barcode now");
    setIsListening(true);

    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 100);

    await connectScale();
  };

  const connectScale = async () => {
    try {
      if (!("serial" in navigator)) {
        setScaleStatus("Web Serial not supported");
        alert("Use Chrome or Edge. Web Serial is not supported in this browser.");
        return;
      }

      const selectedPort = await navigator.serial.requestPort();

      await selectedPort.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });

      setScaleStatus("Connected");
      readWeight(selectedPort);
    } catch (error) {
      console.error(error);
      setScaleStatus("Connection failed");
    }
  };

  const readWeight = async (selectedPort) => {
    try {
      const decoder = new TextDecoderStream();
      selectedPort.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;

        const match = buffer.match(/-?\d+(\.\d+)?/);

        if (match) {
          const cleanWeight = Math.round(Number(match[0]));
          setCurrentWeight(cleanWeight);
          buffer = "";
        }
      }
    } catch (error) {
      console.error(error);
      setScaleStatus("Reading stopped");
    }
  };

  const handleScannerInput = (value) => {
    setBarcode(value);

    if (barcodeTimerRef.current) {
      clearTimeout(barcodeTimerRef.current);
    }

    barcodeTimerRef.current = setTimeout(() => {
      const cleanBarcode = value.trim();

      if (cleanBarcode.length > 0) {
        processBarcode(cleanBarcode);
      }
    }, 120);
  };

  const handleScannerKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const cleanBarcode = barcode.trim();
      if (cleanBarcode.length > 0) {
        processBarcode(cleanBarcode);
      }
    }
  };

  const processBarcode = (scannedBarcode) => {
    const bottle =
      DEMO_DATABASE[scannedBarcode] || {
        productId: "UNKNOWN",
        brandName: "Unknown Bottle",
        category: "Unknown",
        bottleSizeML: 750,
        emptyBottleWeightG: 400,
      };

    setSelectedBottle({
      barcode: scannedBarcode,
      ...bottle,
    });

    setScannerStatus("Barcode scanned");
    setManualBarcode("");
  };

  const processManualBarcode = () => {
    if (!manualBarcode.trim()) return;
    setBarcode(manualBarcode.trim());
    processBarcode(manualBarcode.trim());
    scannerInputRef.current?.focus();
  };

  const remainingML = (() => {
    if (!selectedBottle) return 0;

    const weight = Number(currentWeight);
    const emptyBottleWeight = Number(selectedBottle.emptyBottleWeightG);
    const bottleSize = Number(selectedBottle.bottleSizeML);

    if (!weight || weight <= emptyBottleWeight) return 0;

    const liquidML = Math.round(weight - emptyBottleWeight);

    return Math.min(liquidML, bottleSize);
  })();

  const saveReading = () => {
    if (!selectedBottle) {
      alert("Scan barcode first.");
      return;
    }

    const newLog = {
      time: new Date().toLocaleString(),
      barcode: selectedBottle.barcode,
      productId: selectedBottle.productId,
      brandName: selectedBottle.brandName,
      currentWeight,
      remainingML,
    };

    setLogs((prev) => [newLog, ...prev]);

    setBarcode("");
    setSelectedBottle(null);
    setScannerStatus("Ready - scan next barcode");

    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    const keepFocus = () => {
      if (isListening) {
        scannerInputRef.current?.focus();
      }
    };

    window.addEventListener("click", keepFocus);
    return () => window.removeEventListener("click", keepFocus);
  }, [isListening]);

  return (
    <section className="machine-card">
      <div className="top-row">
        <div>
          <h1>Barcode + Weight Machine Flow</h1>
          <p className="muted">
            Connect once, scan bottle barcode, read weight, calculate remaining ML.
          </p>
        </div>

        <button className="primary-btn" onClick={connectDevices}>
          Connect Devices
        </button>
      </div>

      <div className="status-grid">
        <div className="status-box">
          <span>Weight Machine</span>
          <strong>{scaleStatus}</strong>
        </div>

        <div className="status-box">
          <span>Barcode Scanner</span>
          <strong>{scannerStatus}</strong>
        </div>
      </div>

      <input
        ref={scannerInputRef}
        className="scanner-capture"
        value={barcode}
        onChange={(e) => handleScannerInput(e.target.value)}
        onKeyDown={handleScannerKeyDown}
        placeholder="Scanner capture input"
        autoComplete="off"
      />

      <div className="manual-row">
        <input
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          placeholder="Type barcode manually for testing"
        />
        <button onClick={processManualBarcode}>Use Barcode</button>
      </div>

      <div className="reading-grid">
        <label>
          Barcode
          <input value={selectedBottle?.barcode || ""} readOnly />
        </label>

        <label>
          Product ID
          <input value={selectedBottle?.productId || ""} readOnly />
        </label>

        <label>
          Brand Name
          <input value={selectedBottle?.brandName || ""} readOnly />
        </label>

        <label>
          Category
          <input value={selectedBottle?.category || ""} readOnly />
        </label>

        <label>
          Bottle Size ML
          <input value={selectedBottle?.bottleSizeML || ""} readOnly />
        </label>

        <label>
          Empty Bottle Weight G
          <input value={selectedBottle?.emptyBottleWeightG || ""} readOnly />
        </label>

        <label>
          Current Weight G
          <input value={currentWeight} readOnly />
        </label>

        <label>
          Remaining ML
          <input value={remainingML} readOnly />
        </label>
      </div>

      <button className="save-btn" onClick={saveReading}>
        Save Reading
      </button>

      <div className="history-section">
        <h2>Scanned History</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Barcode</th>
                <th>Product ID</th>
                <th>Brand Name</th>
                <th>Weight G</th>
                <th>Remaining ML</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty">
                    No readings yet.
                  </td>
                </tr>
              ) : (
                logs.map((item, index) => (
                  <tr key={index}>
                    <td>{item.time}</td>
                    <td>{item.barcode}</td>
                    <td>{item.productId}</td>
                    <td>{item.brandName}</td>
                    <td>{item.currentWeight}</td>
                    <td>{item.remainingML}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
