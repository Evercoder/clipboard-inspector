import React, { useState, useEffect, useRef } from "react";
import IntroMSg from "./intro-msg";
import FileInfo from "./file-info";
import RenderFile from "./render-file";

import useClipboardData, { parseDataTransfer } from "./use-clipboard-data";

function ClipboardInspector() {
  const [label, setLabel] = useState("my-label");
  const [renderData, setRenderData] = useState(null);
  const dataTransfer = useClipboardData(null);

  /*
  useEffect(
    () => [setRenderData({ ...parseDataTransfer(renderData) })],
    [dataTransfer]
  );

  const parseDataTransfer = (dataTransfer) => {
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
  */

  return renderData ? (
    <div className="clipboard-summary">
      <h1>
        <a
          className="mdn"
          href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer"
        >
          event.{label}
        </a>{" "}
        contains:
      </h1>

      <div className="clipboard-section">
        <h2>
          <a
            className="mdn"
            href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types"
          >
            .types
          </a>
          <span className="anno">
            {renderData.dataByType.length} type(s) available
          </span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>type</th>
              <th>
                <a
                  className="mdn"
                  href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/getData"
                >
                  getData(type)
                </a>
              </th>
            </tr>
          </thead>
          <tbody>
            {renderData.dataByType.map((obj, idx) => (
              <tr key={idx}>
                <td>
                  <code>{obj.type}</code>
                </td>
                <td>
                  <pre>
                    <code>{obj.data || <em>Empty string</em>}</code>
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="clipboard-section">
        <h2>
          <a
            className="mdn"
            href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/items"
          >
            .items
          </a>
          <span className="anno">
            {renderData.items ? (
              `${renderData.items.length} item(s) available`
            ) : (
              <em>Undefined</em>
            )}
          </span>
        </h2>

        {renderData.items ? (
          <table>
            <thead>
              <tr>
                <th>kind</th>
                <th>type</th>
                <th>
                  <a
                    className="mdn"
                    href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFile"
                  >
                    getAsFile()
                  </a>
                </th>
              </tr>
            </thead>
            <tbody>
              {renderData.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{item.kind}</code>
                  </td>
                  <td>
                    <code>{item.type}</code>
                  </td>
                  <td>{RenderFile(item.as_file)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="clipboard-section">
        <h2>
          <a
            className="mdn"
            href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files"
          >
            .files
          </a>
          <span className="anno">
            {renderData.files
              ? `${renderData.files.length} file(s) available`
              : "<em>Undefined</em>"}
          </span>
        </h2>
        {renderData.files ? (
          renderData.files.map((file, idx) => (
            <div key={idx}>{RenderFile(file)}</div>
          ))
        ) : (
          <span>N/A</span>
        )}
      </div>
    </div>
  ) : (
    <IntroMSg />
  );
}

export default ClipboardInspector;
