import { useState } from "react";
import { useEventListener } from "./useEventListener";

export const useDataTransfer = () => {
  // state
  const [dataTransfer, setDataTransfer] = useState(null);
  const [label, setLabel] = useState("");

  // paste event
  const handlePaste = (event) => {
    event.preventDefault();
    const { clipboardData } = event;
    setDataTransfer(clipboardData);
    setLabel("clipboardData");
    console.log("clipboardData", clipboardData);
  };

  useEventListener("paste", handlePaste, window);

  // dragover event
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  useEventListener("dragover", handleDragOver, window);

  // drop event
  const handleDrop = (event) => {
    event.preventDefault();
    const { dataTransfer } = event;
    setDataTransfer(dataTransfer);
    setLabel("dataTransfer");
    console.log("dataTransfer", dataTransfer);
  };

  useEventListener("drop", handleDrop, window);

  return { dataTransfer, label };
};
