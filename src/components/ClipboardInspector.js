import React from "react";
import IntroMSg from "./IntroMsg";
import RenderFile from "./RenderFile";

import { useRenderData } from "../hooks/useRenderData";

function ClipboardInspector() {
  const { renderData, label } = useRenderData();

  if (!renderData) return <IntroMSg />;

  return (
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
  );
}

export default ClipboardInspector;
