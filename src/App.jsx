import React from "react";
import BarcodeScaleConnector from "./components/BarcodeScaleConnector";
import "./styles.css";

function App() {
  return (
    <div style={{ padding: "20px" }}>
      {/* Machine Connection Section */}
      <BarcodeScaleConnector />

      {/* Existing App Content Below */}
      <h2 style={{ marginTop: "30px" }}>Your Inventory Dashboard</h2>
      <p>
        Your existing components, tables, outlet system, and inventory UI will
        continue to work below this section.
      </p>
    </div>
  );
}

export default App;
