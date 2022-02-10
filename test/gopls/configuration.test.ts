/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

import assert from 'assert';
import { getGoplspConfig } from '../../src/config';
import * as lsp from '../../src/goLanguageServer';

suite('goplsp configuration tests', () => {
	test('filterGoplspDefaultConfigValues', async () => {
		const defaultGoplspConfig = getGoplspConfig();
		interface TestCase {
			name: string;
			section: string;
			input: any;
			want: any;
		}
		const testCases: TestCase[] = [
			{
				name: 'user set no goplsp settings',
				section: 'goplsp',
				input: defaultGoplspConfig,
				want: {}
			},
			{
				name: 'user set some goplsp settings',
				section: 'goplsp',
				input: Object.assign({}, defaultGoplspConfig, {
					buildFlags: ['-something'],
					env: { foo: 'bar' },
					hoverKind: 'NoDocumentation',
					usePlaceholders: true,
					linkTarget: 'godoc.org'
				}),
				want: {
					buildFlags: ['-something'],
					env: { foo: 'bar' },
					hoverKind: 'NoDocumentation',
					usePlaceholders: true,
					linkTarget: 'godoc.org'
				}
			},
			{
				name: 'user set extra goplsp settings',
				section: 'goplsp',
				input: Object.assign({}, defaultGoplspConfig, {
					undefinedGoplspSetting: true
				}),
				want: {
					undefinedGoplspSetting: true
				}
			},
			{
				name: 'never returns undefined',
				section: 'undefined.section',
				input: undefined,
				want: {}
			}
		];
		testCases.map((tc: TestCase) => {
			const actual = lsp.filterGoplspDefaultConfigValues(tc.input, undefined);
			assert.deepStrictEqual(actual, tc.want, `Failed: ${tc.name}`);
		});
	});

	test('passGoConfigToGoplspConfigValues', async () => {
		interface TestCase {
			name: string;
			goplspConfig: any;
			goConfig: any;
			want: any;
		}
		const testCases: TestCase[] = [
			{
				name: 'undefined goplsp, go configs result in an empty config',
				goplspConfig: undefined,
				goConfig: undefined,
				want: {}
			},
			{
				name: 'empty goplsp, go configs result in an empty config',
				goplspConfig: {},
				goConfig: {},
				want: {}
			},
			{
				name: 'empty goplsp, default go configs result in an empty config',
				goplspConfig: {},
				goConfig: {
					buildFlags: [],
					buildTags: ''
				},
				want: {}
			},
			{
				name: 'pass go config buildFlags to goplsp config',
				goplspConfig: {},
				goConfig: { buildFlags: ['-modfile', 'goplsp.mod', '-tags', 'tag1,tag2', '-modcacherw'] },
				want: { 'build.buildFlags': ['-modfile', 'goplsp.mod', '-tags', 'tag1,tag2', '-modcacherw'] }
			},
			{
				name: 'pass go config buildTags to goplsp config',
				goplspConfig: {},
				goConfig: { buildTags: 'tag1,tag2' },
				want: { 'build.buildFlags': ['-tags', 'tag1,tag2'] }
			},
			{
				name: 'do not pass go config buildTags if buildFlags already have tags',
				goplspConfig: {},
				goConfig: {
					buildFlags: ['-tags', 'tag0'],
					buildTags: 'tag1,tag2'
				},
				want: { 'build.buildFlags': ['-tags', 'tag0'] }
			},
			{
				name: 'do not mutate other goplsp config but goplsp.buildFlags',
				goplspConfig: {
					'build.env': { GOPROXY: 'direct' }
				},
				goConfig: { buildFlags: ['-modfile', 'goplsp.mod', '-tags', 'tag1,tag2', '-modcacherw'] },
				want: {
					'build.env': { GOPROXY: 'direct' },
					'build.buildFlags': ['-modfile', 'goplsp.mod', '-tags', 'tag1,tag2', '-modcacherw']
				}
			},

			{
				name: 'do not mutate misconfigured goplsp.buildFlags',
				goplspConfig: {
					'build.buildFlags': '-modfile goplsp.mod' // misconfiguration
				},
				goConfig: {
					buildFlags: '-modfile go.mod -tags tag1 -modcacherw'
				},
				want: { 'build.buildFlags': '-modfile goplsp.mod' }
			},
			{
				name: 'do not overwrite goplsp config if it is explicitly set',
				goplspConfig: {
					'build.env': { GOPROXY: 'direct' },
					'build.buildFlags': [] // empty
				},
				goConfig: {
					// expect only non-conflicting flags (tags, modcacherw) passing.
					buildFlags: ['-modfile go.mod -tags tag1 -modcacherw'],
					buildTags: 'tag3'
				},
				want: {
					'build.env': { GOPROXY: 'direct' },
					'build.buildFlags': []
				} // goplsp.buildFlags untouched.
			}
		];
		testCases.map((tc: TestCase) => {
			const actual = lsp.passGoConfigToGoplspConfigValues(tc.goplspConfig, tc.goConfig);
			assert.deepStrictEqual(actual, tc.want, `Failed: ${tc.name}`);
		});
	});
});
