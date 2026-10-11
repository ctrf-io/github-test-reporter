import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const run = promisify(execFile);
const fixtures = path.resolve("__tests__/fixtures/proxy");
let api: https.Server;
let proxy: http.Server;
let apiPort: number;
let proxyPort: number;
let tunnels: string[];
let credentials: (string | undefined)[];
let requests: { url: string; method: string; auth?: string }[];
let sockets: Set<net.Socket>;

async function listen(server: http.Server | https.Server): Promise<number> {
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	return (server.address() as net.AddressInfo).port;
}

beforeEach(async () => {
	tunnels = [];
	credentials = [];
	requests = [];
	sockets = new Set();
	api = https.createServer(
		{
			key: readFileSync(path.join(fixtures, "key.pem")),
			cert: readFileSync(path.join(fixtures, "cert.pem")),
		},
		(req, res) => {
			requests.push({
				url: req.url || "",
				method: req.method || "",
				auth: req.headers.authorization,
			});
			if (req.url === "/api/v3/artifact") {
				res.writeHead(302, {
					location: `https://localhost:${apiPort}/archive.zip`,
				});
				res.end();
			} else if (req.url === "/archive.zip") {
				res.writeHead(200, { "content-type": "application/zip" });
				res.end(Buffer.from([80, 75, 3, 4]));
			} else {
				res.writeHead(200, { "content-type": "application/json" });
				res.end(req.method === "GET" ? '[{"id":42}]' : '{"id":42}');
			}
		},
	);
	apiPort = await listen(api);
	proxy = http.createServer();
	proxy.on("connect", (req, client, head) => {
		tunnels.push(req.url || "");
		credentials.push(req.headers["proxy-authorization"]);
		const target = net.connect(apiPort, "127.0.0.1", () => {
			client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
			if (head.length) target.write(head);
			client.pipe(target);
			target.pipe(client);
		});
		sockets.add(target);
		target.on("error", () => client.destroy());
		client.on("error", () => target.destroy());
	});
	for (const server of [api, proxy]) {
		server.on("connection", (socket) => sockets.add(socket));
	}
	proxyPort = await listen(proxy);
});

afterEach(async () => {
	for (const socket of sockets) socket.destroy();
	await Promise.all(
		[api, proxy].map(
			(server) => new Promise<void>((resolve) => server.close(() => resolve())),
		),
	);
});

async function callClient(
	env: Record<string, string>,
	host = "reporter-api.test",
	artifact = false,
): Promise<void> {
	const childEnv = { ...process.env };
	for (const key of [
		"HTTP_PROXY",
		"HTTPS_PROXY",
		"NO_PROXY",
		"ALL_PROXY",
		"http_proxy",
		"https_proxy",
		"no_proxy",
		"all_proxy",
		"NODE_USE_ENV_PROXY",
		"NODE_TLS_REJECT_UNAUTHORIZED",
	])
		delete childEnv[key];
	await run(
		process.execPath,
		[
			"--import",
			"tsx",
			"--input-type=module",
			"-e",
			`
			import assert from 'node:assert/strict';
			import { createGitHubClient } from './src/client/github/client.ts';
			const client = await createGitHubClient();
			const comments = await client.paginate(client.issues.listComments, {
				owner: 'o', repo: 'r', issue_number: 1
			});
			assert.equal(comments[0].id, 42);
			await client.issues.updateComment({owner: 'o', repo: 'r', comment_id: 42, body: 'report'});
			if (${artifact}) {
				const archive = await client.request('GET /artifact');
				assert.deepEqual([...new Uint8Array(archive.data)], [80, 75, 3, 4]);
			}
			process.exit(0);
			`,
		],
		{
			env: {
				...childEnv,
				GITHUB_TOKEN: "test-token",
				GITHUB_API_URL: `https://${host}:${apiPort}/api/v3`,
				NODE_EXTRA_CA_CERTS: path.join(fixtures, "cert.pem"),
				...env,
			},
			timeout: 10000,
		},
	);
}

describe("GitHub API environment proxies", () => {
	it.each(["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"])(
		"uses %s for HTTPS API requests through HTTP CONNECT",
		async (variable) => {
			await callClient({ [variable]: `http://127.0.0.1:${proxyPort}` });
			expect(tunnels).toContain(`reporter-api.test:${apiPort}`);
			expect(requests.map((req) => req.method)).toEqual(["GET", "PATCH"]);
			expect(requests.every((req) => req.auth === "token test-token")).toBe(
				true,
			);
		},
	);
	it("prefers lowercase and HTTPS-specific proxy settings", async () => {
		await callClient({
			HTTPS_PROXY: "http://127.0.0.1:1",
			https_proxy: `http://127.0.0.1:${proxyPort}`,
			HTTP_PROXY: "http://127.0.0.1:1",
		});
		expect(tunnels).toContain(`reporter-api.test:${apiPort}`);
		expect(requests).toHaveLength(2);
	});
	it("prefers lowercase bypass settings", async () => {
		await callClient(
			{
				HTTPS_PROXY: "http://127.0.0.1:1",
				NO_PROXY: "other.test",
				no_proxy: "localhost",
			},
			"localhost",
		);
		expect(tunnels).toHaveLength(0);
		expect(requests).toHaveLength(2);
	});
	it.each(["NO_PROXY", "no_proxy"])("honors %s", async (variable) => {
		await callClient(
			{
				HTTPS_PROXY: "http://127.0.0.1:1",
				[variable]: `localhost:${apiPort}`,
			},
			"localhost",
		);
		expect(tunnels).toHaveLength(0);
		expect(requests).toHaveLength(2);
	});
	it("connects directly without a proxy", async () => {
		await callClient({}, "localhost");
		expect(tunnels).toHaveLength(0);
		expect(requests).toHaveLength(2);
	});
	it("supports proxy authentication and evaluates bypass on artifact redirects", async () => {
		await callClient(
			{
				HTTPS_PROXY: `http://user:password@127.0.0.1:${proxyPort}`,
				NO_PROXY: "localhost",
			},
			"reporter-api.test",
			true,
		);
		expect(
			credentials.every((value) => value === "Basic dXNlcjpwYXNzd29yZA=="),
		).toBe(true);
		expect(tunnels.length).toBeGreaterThan(0);
		expect(
			tunnels.every((host) => host === `reporter-api.test:${apiPort}`),
		).toBe(true);
		expect(requests.at(-1)?.url).toBe("/archive.zip");
		expect(requests.at(-1)?.auth).toBeUndefined();
	});
});
