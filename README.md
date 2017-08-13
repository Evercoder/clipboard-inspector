# Clipboard Inspector

Working with the clipboard in web browsers is subject to many inconsistencies. This tool helps you explore the content of the clipboard when you paste something on a web page.

Run it online: [https://danburzo.github.io/clipboard-inspector/](https://danburzo.github.io/clipboard-inspector/)

## Notes

`DataTransferItem.getAsString()` seems to be useless, textual data can be read synchronously through other methods.

## Browser Issues Reference

* [Chrome doesn't expose all of the formats on the clipboard](https://bugs.chromium.org/p/chromium/issues/detail?id=487266)

## Running the project locally

The project requires Node and NPM/Yarn to run locally. It's built with React (piped through Babel / Webpack) — bit more cumbersome to set up but makes it easy to prototype fast.

After cloning the repo, run `yarn` (or `npm install`) in the project folder to install all dependencies. 

To start a local server:

`yarn start` (or `npm start`)

This will make the project available on [http://localhost:8080](http://localhost:8080).

To build the project:

`yarn build` (or `npm build`)

I use this to build the JS bundle in the `dist` folder so that you can access the tool online via Github Pages (the repo has Pages set up based on the `master` branch).

## Additional resources

* [Clipboard test](http://madebyevan.com/clipboard-test/) is a similar tool built by Evan Wallace (of Figma) in May 2015.