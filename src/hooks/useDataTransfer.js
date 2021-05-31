import { useState, useEffect } from "react";

export const useDataTransfer = () => {
  // state
  const [dataTransfer, setDataTransfer] = useState(null);
  const [label, setLabel] = useState("");

  // effects
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    document.addEventListener("dragover", handleDragOver);
    return () => document.removeEventListener("dragover", handleDragOver);
  }, []);

  useEffect(() => {
    document.addEventListener("drop", handleDrop);
    return () => document.removeEventListener("drop", handleDrop);
  }, []);

  // handles
  const handlePaste = (event) => {
    event.preventDefault();
    const { clipboardData } = event;
    setDataTransfer(clipboardData);
    setLabel("clipboardData");
    console.log("clipboardData", clipboardData);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const { dataTransfer } = event;
    setDataTransfer(dataTransfer);
    setLabel("dataTransfer");
    console.log("dataTransfer", dataTransfer);
  };

  return { dataTransfer, label };
};
