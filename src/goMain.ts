/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Modification copyright 2020 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import { getGoConfig } from './config';
import { browsePackages } from './goBrowsePackage';
import { buildCode } from './goBuild';
import { notifyIfGeneratedFile, removeTestStatus } from './goCheck';
import {
	applyCodeCoverage,
	initCoverageDecorators,
	removeCodeCoverageOnFileSave,
	toggleCoverageCurrentPackage,
	trackCodeCoverageRemovalOnFileChange,
	updateCodeCoverageDecorators
} from './goCover';
import { GoDebugConfigurationProvider } from './goDebugConfiguration';
import * as GoDebugFactory from './goDebugFactory';
import { setGOROOTEnvVar, toolExecutionEnvironment } from './goEnv';
import {
	chooseGoEnvironment,
	offerToInstallLatestGoVersion,
	setEnvironmentVariableCollection
} from './goEnvironmentStatus';
import * as goGenerateTests from './goGenerateTests';
import { goGetPackage } from './goGetPackage';
import { addImport, addImportToWorkspace } from './goImport';
import { installCurrentPackage } from './goInstall';
import { offerToInstallTools, promptForMissingTool, updateGoVarsFromConfig, suggestUpdates } from './goInstallTools';
import { RestartReason, showServerOutputChannel, watchLanguageServerConfiguration } from './language/goLanguageServer';
import { lintCode } from './goLint';
import { setLogConfig } from './goLogging';
import { GO_MODE } from './goMode';
import { GO111MODULE, goModInit, isModSupported } from './goModules';
import { playgroundCommand } from './goPlayground';
import { GoRunTestCodeLensProvider } from './goRunTestCodelens';
import { disposeGoStatusBar, expandGoStatusBar, outputChannel, updateGoStatusBar } from './goStatus';

import { vetCode } from './goVet';
import {
	getFromGlobalState,
	resetGlobalState,
	resetWorkspaceState,
	setGlobalState,
	setWorkspaceState,
	updateGlobalState
} from './stateUtils';
import { cancelRunningTests, showTestOutput } from './testUtils';
import { cleanupTempDir, getBinPath, getToolsGopath, isGoPathSet, resolvePath } from './util';
import { clearCacheForTools } from './utils/pathUtils';
import { WelcomePanel } from './welcome';
import vscode = require('vscode');
import { getFormatTool } from './language/legacy/goFormat';
import { resetSurveyConfigs, showSurveyConfig } from './goSurvey';
import { ExtensionAPI } from './export';
import extensionAPI from './extensionAPI';
import { GoTestExplorer, isVscodeTestingAPIAvailable } from './goTest/explore';
import { killRunningPprof } from './goTest/profile';
import { GoExplorerProvider } from './goExplorer';
import { GoExtensionContext } from './context';
import * as commands from './commands';
import { toggleVulncheckCommandFactory, VulncheckOutputLinkProvider } from './goVulncheck';
import { GoTaskProvider } from './goTaskProvider';

const goCtx: GoExtensionContext = {};

export async function activate(ctx: vscode.ExtensionContext): Promise<ExtensionAPI | undefined> {
	if (process.env['VSCODE_GO_IN_TEST'] === '1') {
		// Make sure this does not run when running in test.
		return;
	}

	setGlobalState(ctx.globalState);
	setWorkspaceState(ctx.workspaceState);
	setEnvironmentVariableCollection(ctx.environmentVariableCollection);

	const cfg = getGoConfig();
	setLogConfig(cfg['logging']);

	WelcomePanel.activate(ctx, goCtx);

	const configGOROOT = getGoConfig()['goroot'];
	if (configGOROOT) {
		// We don't support unsetting go.goroot because we don't know whether
		// !configGOROOT case indicates the user wants to unset process.env['GOROOT']
		// or the user wants the extension to use the current process.env['GOROOT'] value.
		// TODO(hyangah): consider utilizing an empty value to indicate unset?
		await setGOROOTEnvVar(configGOROOT);
	}

	await showDeprecationWarning();
	await updateGoVarsFromConfig(goCtx);

	suggestUpdates();
	offerToInstallLatestGoVersion();
	offerToInstallTools();

	const registerCommand = commands.createRegisterCommand(ctx, goCtx);
	// goxls: conflicts fix
	registerCommand('gop.languageserver.restart', commands.startLanguageServer);
	registerCommand('gop.languageserver.maintain', commands.startGoplsMaintainerInterface);

	await commands.startLanguageServer(ctx, goCtx)(RestartReason.ACTIVATION);

	initCoverageDecorators(ctx);

	// goxls: conflicts fix
	registerCommand('gop.builds.run', commands.runBuilds);

	const activeDoc = vscode.window.activeTextEditor?.document;
	const supportLanguageId = activeDoc?.languageId === 'go' || activeDoc?.languageId === 'gop';
	if (!goCtx.languageServerIsRunning && supportLanguageId && isGoPathSet()) {
		// Check mod status so that cache is updated and then run build/lint/vet
		isModSupported(activeDoc.uri).then(() => {
			vscode.commands.executeCommand('gop.builds.run', activeDoc, getGoConfig(activeDoc.uri));
		});
	}

	// goxls: conflicts fix
	registerCommand('gop.environment.status', expandGoStatusBar);

	GoRunTestCodeLensProvider.activate(ctx, goCtx);
	GoDebugConfigurationProvider.activate(ctx, goCtx);
	GoDebugFactory.activate(ctx);

	goCtx.buildDiagnosticCollection = vscode.languages.createDiagnosticCollection('go');
	ctx.subscriptions.push(goCtx.buildDiagnosticCollection);
	goCtx.lintDiagnosticCollection = vscode.languages.createDiagnosticCollection(
		lintDiagnosticCollectionName(getGoConfig()['lintTool'])
	);
	ctx.subscriptions.push(goCtx.lintDiagnosticCollection);
	goCtx.vetDiagnosticCollection = vscode.languages.createDiagnosticCollection('go-vet');
	ctx.subscriptions.push(goCtx.vetDiagnosticCollection);

	// goxls: conflicts fix
	registerCommand('gop.gopath', commands.getCurrentGoPath);
	registerCommand('gop.goroot', commands.getCurrentGoRoot);
	registerCommand('gop.goproot', commands.getCurrentGopRoot);
	registerCommand('gop.locate.tools', commands.getConfiguredGoTools);
	registerCommand('gop.add.tags', commands.addTags);
	registerCommand('gop.remove.tags', commands.removeTags);
	registerCommand('gop.fill.struct', commands.runFillStruct);
	registerCommand('gop.impl.cursor', commands.implCursor);
	registerCommand('gop.godoctor.extract', commands.extractFunction);
	registerCommand('gop.godoctor.var', commands.extractVariable);
	registerCommand('gop.test.cursor', commands.testAtCursor('test'));
	registerCommand('gop.test.cursorOrPrevious', commands.testAtCursorOrPrevious('test'));
	registerCommand('gop.subtest.cursor', commands.subTestAtCursor('test'));
	registerCommand('gop.debug.cursor', commands.testAtCursor('debug'));
	registerCommand('gop.debug.subtest.cursor', commands.subTestAtCursor('debug'));
	registerCommand('gop.benchmark.cursor', commands.testAtCursor('benchmark'));
	registerCommand('gop.test.package', commands.testCurrentPackage(false));
	registerCommand('gop.benchmark.package', commands.testCurrentPackage(true));
	registerCommand('gop.test.file', commands.testCurrentFile(false));
	registerCommand('gop.benchmark.file', commands.testCurrentFile(true));
	registerCommand('gop.test.workspace', commands.testWorkspace(false));
	registerCommand('gop.test', commands.testWorkspace(true));
	registerCommand('gop.test.previous', commands.testPrevious);
	registerCommand('gop.debug.previous', commands.debugPrevious);

	// goxls: conflicts fix
	registerCommand('gop.test.coverage', toggleCoverageCurrentPackage);
	registerCommand('gop.test.showOutput', () => showTestOutput);
	registerCommand('gop.test.cancel', () => cancelRunningTests);
	registerCommand('gop.import.add', addImport);
	registerCommand('gop.add.package.workspace', addImportToWorkspace);
	registerCommand('gop.tools.install', commands.installTools);
	registerCommand('gop.browse.packages', browsePackages);

	if (isVscodeTestingAPIAvailable && cfg.get<boolean>('testExplorer.enable')) {
		GoTestExplorer.setup(ctx, goCtx);
	}

	GoExplorerProvider.setup(ctx);

	// goxls: conflicts fix
	registerCommand('gop.test.generate.package', goGenerateTests.generateTestCurrentPackage);
	registerCommand('gop.test.generate.file', goGenerateTests.generateTestCurrentFile);
	registerCommand('gop.test.generate.function', goGenerateTests.generateTestCurrentFunction);
	registerCommand('gop.toggle.test.file', goGenerateTests.toggleTestFile);
	registerCommand('gop.debug.startSession', commands.startDebugSession);
	registerCommand('gop.show.commands', commands.showCommands);
	registerCommand('gop.get.package', goGetPackage);
	registerCommand('gop.playground', playgroundCommand);
	registerCommand('gop.lint.package', lintCode('package'));
	registerCommand('gop.lint.workspace', lintCode('workspace'));
	registerCommand('gop.lint.file', lintCode('file'));
	registerCommand('gop.vet.package', vetCode(false));
	registerCommand('gop.vet.workspace', vetCode(true));
	registerCommand('gop.build.package', buildCode(false));
	registerCommand('gop.build.workspace', buildCode(true));
	registerCommand('gop.install.package', installCurrentPackage);
	registerCommand('gop.run.modinit', goModInit);
	registerCommand('gop.extractServerChannel', showServerOutputChannel);
	registerCommand('gop.workspace.resetState', resetWorkspaceState);
	registerCommand('gop.global.resetState', resetGlobalState);
	registerCommand('gop.toggle.gc_details', commands.toggleGCDetails);
	registerCommand('gop.apply.coverprofile', commands.applyCoverprofile);

	// Go+ Environment switching commands
	// goxls: conflicts fix
	registerCommand('gop.environment.choose', chooseGoEnvironment);

	// Survey related commands
	// goxls: conflicts fix
	registerCommand('gop.survey.showConfig', showSurveyConfig);
	registerCommand('gop.survey.resetConfig', resetSurveyConfigs);

	addOnDidChangeConfigListeners(ctx);
	addOnChangeTextDocumentListeners(ctx);
	addOnChangeActiveTextEditorListeners(ctx);
	addOnSaveTextDocumentListeners(ctx);

	vscode.languages.setLanguageConfiguration(GO_MODE.language, {
		wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g
	});

	GoTaskProvider.setup(ctx, vscode.workspace);

	// Vulncheck output link provider.
	VulncheckOutputLinkProvider.activate(ctx);
	// goxls: conflicts fix
	registerCommand('gop.vulncheck.toggle', toggleVulncheckCommandFactory);

	return extensionAPI;
}

export function deactivate() {
	return Promise.all([
		goCtx.languageClient?.stop(),
		cancelRunningTests(),
		killRunningPprof(),
		Promise.resolve(cleanupTempDir()),
		Promise.resolve(disposeGoStatusBar())
	]);
}

function addOnDidChangeConfigListeners(ctx: vscode.ExtensionContext) {
	// Subscribe to notifications for changes to the configuration
	// of the language server, even if it's not currently in use.
	ctx.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => watchLanguageServerConfiguration(goCtx, e))
	);
	ctx.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
			if (!e.affectsConfiguration('go')) {
				return;
			}
			const updatedGoConfig = getGoConfig();

			if (e.affectsConfiguration('gop.goroot')) {
				const configGOROOT = updatedGoConfig['goroot'];
				if (configGOROOT) {
					await setGOROOTEnvVar(configGOROOT);
				}
			}
			if (
				e.affectsConfiguration('gop.goroot') ||
				e.affectsConfiguration('gop.alternateTools') ||
				e.affectsConfiguration('gop.gopath') ||
				e.affectsConfiguration('gop.toolsEnvVars') ||
				e.affectsConfiguration('gop.testEnvFile')
			) {
				updateGoVarsFromConfig(goCtx);
			}
			if (e.affectsConfiguration('gop.logging')) {
				setLogConfig(updatedGoConfig['logging']);
			}
			// If there was a change in "toolsGopath" setting, then clear cache for go tools
			if (getToolsGopath() !== getToolsGopath(false)) {
				clearCacheForTools();
			}

			if (e.affectsConfiguration('gop.formatTool')) {
				checkToolExists(getFormatTool(updatedGoConfig));
			}
			if (e.affectsConfiguration('gop.lintTool')) {
				checkToolExists(updatedGoConfig['lintTool']);
			}
			if (e.affectsConfiguration('gop.docsTool')) {
				checkToolExists(updatedGoConfig['docsTool']);
			}
			if (e.affectsConfiguration('gop.coverageDecorator')) {
				updateCodeCoverageDecorators(updatedGoConfig['coverageDecorator']);
			}
			if (e.affectsConfiguration('gop.toolsEnvVars')) {
				const env = toolExecutionEnvironment();
				if (GO111MODULE !== env['GO111MODULE']) {
					const reloadMsg =
						'Reload VS Code window so that the Go tools can respect the change to GO111MODULE';
					vscode.window.showInformationMessage(reloadMsg, 'Reload').then((selected) => {
						if (selected === 'Reload') {
							vscode.commands.executeCommand('workbench.action.reloadWindow');
						}
					});
				}
			}
			if (e.affectsConfiguration('gop.lintTool')) {
				const lintTool = lintDiagnosticCollectionName(updatedGoConfig['lintTool']);
				if (goCtx.lintDiagnosticCollection && goCtx.lintDiagnosticCollection.name !== lintTool) {
					goCtx.lintDiagnosticCollection.dispose();
					goCtx.lintDiagnosticCollection = vscode.languages.createDiagnosticCollection(lintTool);
					ctx.subscriptions.push(goCtx.lintDiagnosticCollection);
					// TODO: actively maintain our own disposables instead of keeping pushing to ctx.subscription.
				}
			}
			if (e.affectsConfiguration('gop.testExplorer.enable')) {
				const msg =
					'Go test explorer has been enabled or disabled. For this change to take effect, the window must be reloaded.';
				vscode.window.showInformationMessage(msg, 'Reload').then((selected) => {
					if (selected === 'Reload') {
						vscode.commands.executeCommand('workbench.action.reloadWindow');
					}
				});
			}
		})
	);
}

function addOnSaveTextDocumentListeners(ctx: vscode.ExtensionContext) {
	vscode.workspace.onDidSaveTextDocument(removeCodeCoverageOnFileSave, null, ctx.subscriptions);
	vscode.workspace.onDidSaveTextDocument(
		(document) => {
			if (document.languageId !== 'go' && document.languageId !== 'gop') {
				return;
			}
			const session = vscode.debug.activeDebugSession;
			if (session && (session.type === 'go' || session.type === 'gop')) {
				const neverAgain = { title: "Don't Show Again" };
				const ignoreActiveDebugWarningKey = 'ignoreActiveDebugWarningKey';
				const ignoreActiveDebugWarning = getFromGlobalState(ignoreActiveDebugWarningKey);
				if (!ignoreActiveDebugWarning) {
					vscode.window
						.showWarningMessage(
							'A debug session is currently active. Changes to your Go files may result in unexpected behaviour.',
							neverAgain
						)
						.then((result) => {
							if (result === neverAgain) {
								updateGlobalState(ignoreActiveDebugWarningKey, true);
							}
						});
				}
			}
			if (vscode.window.visibleTextEditors.some((e) => e.document.fileName === document.fileName)) {
				vscode.commands.executeCommand('gop.builds.run', document, getGoConfig(document.uri));
			}
		},
		null,
		ctx.subscriptions
	);
}

function addOnChangeTextDocumentListeners(ctx: vscode.ExtensionContext) {
	vscode.workspace.onDidChangeTextDocument(trackCodeCoverageRemovalOnFileChange, null, ctx.subscriptions);
	vscode.workspace.onDidChangeTextDocument(removeTestStatus, null, ctx.subscriptions);
	vscode.workspace.onDidChangeTextDocument(notifyIfGeneratedFile, ctx, ctx.subscriptions);
}

function addOnChangeActiveTextEditorListeners(ctx: vscode.ExtensionContext) {
	[updateGoStatusBar, applyCodeCoverage].forEach((listener) => {
		// Call the listeners on initilization for current active text editor
		if (vscode.window.activeTextEditor) {
			listener(vscode.window.activeTextEditor);
		}
		vscode.window.onDidChangeActiveTextEditor(listener, null, ctx.subscriptions);
	});
}

function checkToolExists(tool: string) {
	if (tool === getBinPath(tool)) {
		promptForMissingTool(tool);
	}
}

function lintDiagnosticCollectionName(lintToolName: string) {
	if (!lintToolName || lintToolName === 'golint') {
		return 'go-lint';
	}
	return `go-${lintToolName}`;
}

async function showDeprecationWarning() {
	const cfg = getGoConfig();
	const disableLanguageServer = cfg['useLanguageServer'];
	if (disableLanguageServer === false) {
		const promptKey = 'promptedLegacyLanguageServerDeprecation';
		const prompted = getFromGlobalState(promptKey, false);
		if (!prompted) {
			const msg =
				'When [go.useLanguageServer](command:workbench.action.openSettings?%5B%22go.useLanguageServer%22%5D) is false, IntelliSense, code navigation, and refactoring features for Go will stop working. Linting, debugging and testing other than debug/test code lenses will continue to work. Please see [Issue 2799](https://go.dev/s/vscode-issue/2799).';
			const selected = await vscode.window.showInformationMessage(msg, 'Open settings', "Don't show again");
			switch (selected) {
				case 'Open settings':
					vscode.commands.executeCommand('workbench.action.openSettings', 'gop.useLanguageServer');
					break;
				case "Don't show again":
					updateGlobalState(promptKey, true);
			}
		}
	}
}
