import * as React from "react";

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

export default FileInfo;
