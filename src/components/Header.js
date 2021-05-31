import * as React from "react";

const Header = () => {
  return (
    <header>
      <h1>Clipboard & Drop Inspector</h1>
      <p>
        Working with the clipboard in web browsers is subject to many quirks and
        inconsistencies. This tool helps you explore the content of the
        clipboard when you paste something on a web page, or the data available
        on a
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/Document/drop_event">
          drop
        </a>
        event.
      </p>

      <p>
        A <a href="https://labs.moqups.com">Moqups Labs</a> thing.
        <a href="http://github.com/evercoder/clipboard-inspector">
          The project's GitHub page
        </a>
        contains sources and more references.
      </p>
    </header>
  );
};

export default Header;
