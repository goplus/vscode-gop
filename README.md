# Go/Go+ for Visual Studio Code

[![GitHub release](https://img.shields.io/github/v/tag/goplus/vscode-gop.svg?label=release)](https://github.com/goplus/vscode-gop/releases)
[![Language](https://img.shields.io/badge/language-Go+-blue.svg)](https://github.com/goplus/gop)

<!--TODO: We should add a badge for the build status or link to the build dashboard.-->

[The VS Code Go/Go+ extension](https://marketplace.visualstudio.com/items?itemName=goplus.gop)
provides rich language support for the
[Go programming language](https://go.dev/) and the [Go+ programming language](https://gop.dev/).

Please [file a new issue](https://github.com/goplus/vscode-gop/issues/new/choose) if you encounter any problems.


## Quick Start

Welcome! 👋🏻<br/>
Whether you are new to Go/Go+ or an experienced Go/Go+ developer, we hope this
extension fits your needs and enhances your development experience.

1.  Install [Go](https://go.dev) 1.18 or newer if you haven't already.

1.  Install [Go+](https://gop.dev) 1.1.13 or newer if you haven't already.

1.  Install the [VS Code Go/Go+ extension].

1.  Open any directory or workspace containing Go/Go+ code to automatically activate the
    extension. The [Go/Go+ status bar](https://github.com/goplus/vscode-gop/wiki/ui) 
    appears in the bottom left corner of the window and displays your Go/Go+ version.

1.  The extension depends on `go`, `gop`, `goxls`, `dlv` and other optional tools. If
    any of the dependencies are missing, the ⚠️ `Analysis Tools Missing` warning
    is displayed. Click on the warning to download dependencies.

    See the
    [tools documentation](https://github.com/goplus/vscode-gop/wiki/tools) for a
    complete list of tools the extension depends on.

<p align="center">
<img src="docs/images/installtools.gif" width=75%>
<br/>
<em>(Install Missing Tools)</em>
</p>

You are ready to Go :-) &nbsp;&nbsp; 🎉🎉🎉

## What's next

* Explore more [features][full feature breakdown] of the VS Code Go/Go+ extension.
* View the
  [settings documentation](https://github.com/goplus/vscode-gop/wiki/settings)
	and [advanced topics](https://github.com/golang/vscode-go/wiki/advanced) to
	customize the extension.
* View the [tools documentation](https://github.com/goplus/vscode-gop/wiki/tools)
  for a complete list of tools the VS Code Go extension depends on.
* Solve issues with the
  [general troubleshooting](https://github.com/goplus/vscode-gop/wiki/troubleshooting)
	and [debugging troubleshooting](https://github.com/goplus/vscode-gop/wiki/debugging#troubleshooting)
	guides.
* [file an issue](https://github.com/goplus/vscode-gop/issues/new/choose) for
  problems with the extension.
* Start a [GitHub discussion](https://github.com/goplus/vscode-gop/discussions)
  or get help on [Stack Overflow].
* Explore Go+ language resources on [Go+ Quick Start](https://github.com/goplus/gop/blob/main/doc/docs.md) and
  [Go+ tutorial](https://tutorial.goplus.org/).

If you are new to Go/Go+, [this article](https://github.com/goplus/gop/blob/main/doc/docs.md) provides
the overview on Go+ code organization and basic `gop` commands. Watch ["Getting
started with VS Code Go/Go+"] for an explanation of how to build your first Go/Go+
application using VS Code Go/Go+.

## Feature highlights

* [IntelliSense] - Results appear for symbols as you type.
* [Code navigation] - Jump to or peek at a symbol's declaration.
* [Code editing] - Support for saved snippets, formatting and code organization,
  and automatic organization of imports.
* [Diagnostics] -  Build, vet, and lint errors shown as you type or on save.
* Enhanced support for [testing] and [debugging]

See the [full feature breakdown] for more details.

<p align=center>
<img src="docs/images/completion-signature-help.gif" width=75%>
<br/>
<em>(Code completion and Signature Help)</em>
</p>

In addition to integrated editing features, the extension provides several
commands for working with Go files. You can access any of these by opening the
Command Palette (`Ctrl+Shift+P` on Linux/Windows and `Cmd+Shift+P` on Mac), and
then typing in the command name. See the
[full list of commands](https://github.com/goplus/vscode-gop/wiki/commands#detailed-list) provided by this
extension.

<p align=center>
<img src="docs/images/toggletestfile.gif" width=75%>
<br/><em>(Toggle Test File)</em></p>

We recommend enabling
[semantic highlighting](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)
by turning on [Goxls' `ui.semanticTokens` setting](https://github.com/goplus/vscode-gop/wiki/settings#uisemantictokens).
    ```
    "goxls": { "ui.semanticTokens": true }
    ```

## Setting up your workspace

The VS Code Go/Go+ extension supports both `GOPATH` and Go/Go+ modules modes.

[Go/Go+ modules](https://golang.org/ref/mod) are used to manage dependencies in
recent versions of Go/Go+. Modules replace the `GOPATH`-based approach to specifying
which source files are used in a given build, and they are the default build
mode in go1.16+. We highly recommend Go development in module mode. If you are
working on existing projects, please consider migrating to modules.

Unlike the traditional `GOPATH` mode, module mode does not require the workspace
to be located under `GOPATH` nor to use a specific structure. A module is
defined by a directory tree of Go/Go+ source files with a `go.mod` or `gop.mod` file
in the tree's root directory.

Your project may involve one or more modules. If you are working with multiple
modules or uncommon project layouts, you will need to configure your workspace
by using [Workspace Folders]. See the
[Supported workspace layouts documentation] for more information.

## Contributing

We welcome your contributions and thank you for working to improve the Go/Go+
development experience in VS Code. If you would like to help work on the VS Code
Go/Go+ extension, see our
[contribution guide](https://github.com/goplus/vscode-gop/wiki/contributing) to
learn how to build and run the VS Code Go extension locally and contribute to
the project.

## License

[MIT](LICENSE)

[Stack Overflow]: https://stackoverflow.com/questions/tagged/go+visual-studio-code
[Managing extensions in VS Code]: https://code.visualstudio.com/docs/editor/extension-gallery
[VS Code Go/Go+ extension]: https://marketplace.visualstudio.com/items?itemName=goplus.gop
[IntelliSense]: https://github.com/goplus/vscode-gop/wiki/features#intellisense
[Code navigation]: https://github.com/goplus/vscode-gop/wiki/features#code-navigation
[Code editing]: https://github.com/goplus/vscode-gop/wiki/features#code-editing
[diagnostics]: https://github.com/goplus/vscode-gop/wiki/features#diagnostics
[testing]: https://github.com/goplus/vscode-gop/wiki/features#run-and-test-in-the-editor
[debugging]: https://github.com/goplus/vscode-gop/wiki/debugging#features
[full feature breakdown]: https://github.com/goplus/vscode-gop/wiki/features
[workspace documentation]: https://github.com/goplus/tools/blob/master/gopls/doc/workspace.md
[Supported workspace layouts documentation]: https://github.com/goplus/tools/blob/master/gopls/doc/workspace.md
[Workspace Folders]: https://code.visualstudio.com/docs/editor/multi-root-workspaces
