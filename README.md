# Clipboard Inspector

Working with the clipboard in web browsers is subject to many inconsistencies. This tool helps you explore the content of the clipboard when you paste something on a web page.

Run it online: [https://evercoder.github.io/clipboard-inspector/](https://evercoder.github.io/clipboard-inspector/)

## Reading from the clipboard

A `paste` event contains the `clipboardData` property, which has the following properties of interest:

* `types` is an array of MIME types available in the clipboard;
* `items` is a list of `DataTransferItem` objects (`DataTransferItemList`);
* `files` is a list of `File` objects available in the clipboard.

Additionally, `clipboardData` contains the `getData(type)` method to fetch a string representation of the data for a specific format.

In our context `DataTransferItem.getAsString()` seems to be useless, as textual data can be read synchronously through other methods.

## Specification

[W3C Clipboard API and Events](https://w3c.github.io/clipboard-apis/), Editor's Draft.

## Scenarios

Exploring the behavior of Chrome, Firefox, and Safari in various situations.

### Pasting plain text content

All browsers have a `text/plain` type and the content is easily accessible.

### Pasting HTML content

All browsers provide the HTML content in the `text/html` type, and the stripped-down content in `text/plain` type (similar to `.innerHMTL` vs `.textContent`).

### Pasting RTF content

For example, from Notes or Pages.

__Firefox__ has `text/plain` and `text/rtf` types. No `text/html`.
__Chrome__ contains, in addition to `text/plain` and `text/rtf`, a `text/html` representation of the content.
__Safari__ only contains the stripped down `text/plain` type.

### Pasting Google Docs content

All browsers will contain `text/plain` and `text/html` versions of the content. Images sources are URLs. The _originating browser_ (where the Copy operation took place) retains custom, application-specific MIME types. In addition, _Safari_ can report which browser originated the copy through a specific MIME type (but empty content). 

### Pasting an image file from Finder

All three browsers report the file name in `text/plain` type.

__Chrome__ exposes a File of `image/png` type (regardless of the image format on the disk) containing the image data, with the `name` set to `image.png`. 

__Firefox__ exposes a File of `image/png` type containing... _the generic MacOS image thumbnail_, with the `name` set to `image.png`. [Issue here](https://bugzilla.mozilla.org/show_bug.cgi?id=1389961).

__Safari__ exposes a file of `image/*` (depending on the image format) containing, presumably, the image data, but which _cannot_ be transformed into an object URL, with the `name` set to the file name. (Error in console: `Failed to load resource: The operation couldn’t be completed. (WebKitBlobResource error 4.)`)

### Pasting multiple image files from Finder

All three browsers report the _concatenated file names_ in `text/plain` type.

__Firefox__ has no other usable data. [Issue here](https://bugzilla.mozilla.org/show_bug.cgi?id=1389964).

__Chrome__ offers a File with the content of the _last_ image in the selection, under the name `image.png` of type `image/png`.

__Safari__ has individual entries in `files` for each image, but with the same problem in using the image data as the single-image scenario.

### Pasting image data from a system app

For example, copying part of an image in Preview.

__Firefox__ and __Chrome__ report a single entry in the `types` array: `Files`. The image data is available in `files` under the name `image.png` of type `image/png`.

__Safari__ exposes the `public.tiff` and `image/tiff` data types (no actual data for them, though), and no `items`, nor `files` arrays ([issue here](https://bugs.webkit.org/show_bug.cgi?id=170449)). Data types _may_ be useful in isolating Safari and falling back to pasting into a contenteditable div and subsequently retrieving the image data from there.

### Pasting proprietary data from a system app

The W3C spec lists a series of MIME types that the browser must support (among which `text/plain`, `text/html`, et cetera).  Support for custom, application-specific MIME types is not mandated by the spec, but is indeed a Very Nice Thing To Have. 

__Firefox__ ([issue here](https://bugzilla.mozilla.org/show_bug.cgi?id=1389919)) and __Chrome__ ([issue here](https://bugs.chromium.org/p/chromium/issues/detail?id=487266)) filter out custom MIME types that the application might have put into the clipboard. __Safari__, on the other hand, provides much more liberal access to the clipboard's content, and is at the moment of writing the only browser in which a web application could potentially handle interesting file formats from the clipboard, like the ones from Sketch or Adobe Products.

### Some browser milestones

__Note:__ It turns out it's pretty hard to test this across browsers, as Browserstack, Sauce Labs, Browserling et al only support basic clipboard functionality.

#### Firefox

* Firefox 50 made [`clipboardData.items` available](https://bugzilla.mozilla.org/show_bug.cgi?id=906420)
* Firefox 52 changed [`clipboardData.types` to a simple array](https://bugzilla.mozilla.org/show_bug.cgi?id=1298243); that means it's best to always cast `types` to an array, just to be sure.


## Running the project locally

The project requires Node and NPM/Yarn to run locally. It's built with React (piped through Babel / Webpack) — a bit more cumbersome to set up but makes it easy to prototype quickly.

After cloning the repo, run `yarn` (or `npm install`) in the project folder to install all dependencies. 

To start a local server:

`yarn start` (or `npm start`)

This will make the project available on [http://localhost:1234](http://localhost:1234).

To build the project:

`yarn build` (or `npm build`)

I use this to build the JS bundle in the `dist` folder so that you can access the tool online via Github Pages (the repo has Pages set up based on the `master` branch).

## Additional resources

* [Clipboard test](http://madebyevan.com/clipboard-test/) is a similar tool built by Evan Wallace (of Figma) in May 2015.
