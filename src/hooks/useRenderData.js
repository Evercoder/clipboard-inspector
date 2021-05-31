import { useEffect, useState } from "react";
import { useDataTransfer } from "./useDataTransfer";

export function useRenderData() {
  const [renderData, setRenderData] = useState(null);
  const { dataTransfer, label } = useDataTransfer();

  useEffect(() => {
    const parseDataTransfer = (dataTransfer) => {
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

    dataTransfer && setRenderData(parseDataTransfer(dataTransfer));
  }, [dataTransfer]);

  return { renderData, label };
}
