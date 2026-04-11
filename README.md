# VSCode Extension for Fluid Templating Language

This extension for VSCode (and compatible code editors) provides language support
for the [Fluid Templating Engine](https://github.com/TYPO3/Fluid).

<mark>(TODO insert video)</mark>

## Installation

The extension is available in the common marketplaces:

* Visual Studio Marketplace <mark>(TODO add link)</mark>
* OpenVSX <mark>(TODO add link)</mark>

It has been tested with:

* [VSCode](https://code.visualstudio.com/)
* [VSCodium](https://vscodium.com/)
* <mark>(TODO add more)</mark>.

## Features

| Feature                           | Fluid (HTML)    | Fluid (Text)       |
|:----------------------------------|:---------------:|:------------------:|
| Syntax Highlighting               | ✅              | ✅                 |
| Code Snippets                     | ✅              | ✅                 |
| Live Template Analysis            | ✅               | ✅                 |
| HTML Language Features            | ✅              | -                  |
| ViewHelper Autocomplete (tags)    | *only built-in* | -                  |
| ViewHelper Documentation (tags)   | *only built-in* | -                  |
| ViewHelper Autocomplete (inline)  | -               | -                  |
| ViewHelper Documentation (inline) | -               | -                  |

### Live Template Analysis

The extension is able to utilize available binaries in your project to provide live
template analysis for Fluid templates, e. g. for detecting syntax errors or deprecations.
This works out-of-the-box for Fluid 5.3 (or higher) and TYPO3 14.3 (or higher). The
following folders are checked for the `fluid` and `typo3` binaries:

* `vendor/bin/`
* `bin/`
* `.Build/bin/`

`typo3` is preferred over `fluid` if both are available.

If [DDEV](https://ddev.com/) is available and the project has DDEV set up, the binaries
are executed inside of the web container by default. This can be turned off by disabling
`fluid.bin.useDdevIfAvailable` in the extension's configuration.

Custom paths to the binaries can also be specified in the extension's configuration via
`fluid.bin.typo3` and `fluid.bin.fluid`. `${workspaceFolder}` is substituted with the
path of the current workplace folder. Apart from that, these are currently **not**
preprocessed, so be extra careful.

Compatibility with older versions of TYPO3 might still be feasible, but this is not
implemented yet.

### ViewHelper Autocomplete & Documentation

The extension currently doesn't include a dedicated
[language server](https://microsoft.github.io/language-server-protocol/) for Fluid. Instead,
it relies on the built-in HTML language support of VSCode to provide autocompletion and
inline documentation for ViewHelpers. This comes with some limitations:

* only built-in ViewHelpers are supported (no XSD support yet)
* only tag syntax is supported (no inline syntax yet)

The advantage of this approach is that no built-in features for HTML are lost in the process,
this includes highlighting, autocompletion, auto-closing of tags, Emmet, inline documentation,
embedded CSS and JavaScript and previews for color values.

### File Detection

Files matching the following description are considered Fluid HTML files:

* `*.fluid.html` (available since Fluid 5 and TYPO3 14)
* `*.html` files in:
    * `Resources/Private/Templates/`
    * `Resources/Private/Layouts/`
    * `Resources/Private/Partials/`
    * `Resources/Private/Components/`
    * `Resources/Private/PageView/`
    * `ContentBlocks/**/templates/`

Files matching the following description are considered Fluid Text files:

* `*.fluid.*`, excluding `*.fluid.html` (available since Fluid 5 and TYPO3 14)
* `*.txt` files in:
    * `Resources/Private/Templates/`
    * `Resources/Private/Layouts/`
    * `Resources/Private/Partials/`
    * `Resources/Private/Components/`
    * `Resources/Private/PageView/`
    * `ContentBlocks/**/templates/`

## Development & Contribution

We welcome contributions from the community to further improve the developer experience
of Fluid templating in VSCode!

To get started with your local setup, you need `node` and `npm` available in your
development environment. To generate the ViewHelper autocompletion and documentation,
you also need `php` and `composer`.

### General Setup

* clone the project
* run `npm i`
* run `npm run compile` or `npm run lint` to transpile TypeScript into JavaScript
* run `npm run lint` to lint your code locally (is also performed in GitHub Actions)
* run `npm run package` to create a `VSIX` file, which can be installed manually in
  VSCode

For bigger changes, it is advisable to use the
[development and debugging workflow suggested in the official documentation](https://code.visualstudio.com/api/get-started/your-first-extension).

### Generate ViewHelper Autocompletion

The current autocompletion is based on the
[Custom Data format](https://code.visualstudio.com/api/extension-guides/custom-data-extension),
which is read by VSCode's built-in HTML language server.
To generate this file format, a small PHP project installs Fluid Standalone and
all TYPO3 core extensions that expose a global ViewHelper namespace (EXT:fluid, EXT:core
and EXT:form), extracts the ViewHelper API definitions from their source code and writes
the Custom Data json files to `fluid/out/`.

```sh
cd fluid/
composer install
composer generate
```

### Language Server Research

During the creation of this extension, research and experiments have been done on the topic
of a dedicated Fluid language server:

[Fluid Language Server](./LanguageServer.md)
