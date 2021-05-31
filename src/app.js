import React from "react";
import Header from "./components/Header";
import ClipboardInspector from "./components/ClipboardInspector";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="page">
      <Header />
      <ClipboardInspector />
      <Footer />
    </div>
  );
}

export default App;
