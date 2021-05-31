import React, { useEffect } from "react";
//import components
import ClipboardInspector from "./components/clipboard-inspector";
import Footer from "./components/Footer";
import Header from "./components/Header";

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
