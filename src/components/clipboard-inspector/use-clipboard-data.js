import React, { useState, useEffect } from "react";

const useClipboardData = (props) => {
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

  return dataTransfer;
};

export const parseDataTransfer = (dataTransfer) => {
  const FileInfo = (file) => {
    return file
      ? {
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
        }
      : null;
  };

  return {
    dataByType: Array.from(dataTransfer.types).map((type) => {
      let data = dataTransfer.getData(type);
      return {
        type: type,
        data: data,
      };
    }),
    items: dataTransfer.items
      ? Array.from(dataTransfer.items).map((item) => {
          return {
            kind: item.kind,
            type: item.type,
            as_file: FileInfo(item.getAsFile()),
          };
        })
      : null,
    files: dataTransfer.files
      ? Array.from(dataTransfer.files).map((file) => {
          return FileInfo(file);
        })
      : null,
  };
};

export default useClipboardData;
