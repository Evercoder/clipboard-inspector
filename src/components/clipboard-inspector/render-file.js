import * as React from "react";

const RenderFile = (file) => {
  return file ? (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
          <th>Type</th>
          <th>
            <a
              className="mdn"
              href="https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL"
            >
              URL.createObjectURL(file)
            </a>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <code>{file.name}</code>
          </td>
          <td>
            <code>{file.size}</code>
          </td>
          <td>
            <code>{file.type}</code>
          </td>
          <td>
            <code>
              <a href={file.url}>
                <img src={file.url} />
              </a>
            </code>
          </td>
        </tr>
      </tbody>
    </table>
  ) : (
    <em>N/A</em>
  );
};

export default RenderFile;
