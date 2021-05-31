import * as React from "react";
import IntroMSg from "./intro-msg";

const RenderData = ({ render_data }) => {
  return render_data ? (
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
            {render_data.data_by_type.length} type(s) available
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
            {render_data.data_by_type.map((obj, idx) => (
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
            {render_data.items ? (
              `${render_data.items.length} item(s) available`
            ) : (
              <em>Undefined</em>
            )}
          </span>
        </h2>

        {render_data.items ? (
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
              {render_data.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{item.kind}</code>
                  </td>
                  <td>
                    <code>{item.type}</code>
                  </td>
                  <td>{this.render_file(item.as_file)}</td>
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
            {render_data.files
              ? `${render_data.files.length} file(s) available`
              : "<em>Undefined</em>"}
          </span>
        </h2>
        {render_data.files ? (
          render_data.files.map((file, idx) => (
            <div key={idx}>{this.render_file(file)}</div>
          ))
        ) : (
          <span>N/A</span>
        )}
      </div>
    </div>
  ) : (
    <IntroMSg />
  );
};

export default RenderData;
