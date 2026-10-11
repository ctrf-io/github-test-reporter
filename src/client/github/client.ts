import { GITHUB_TOKEN, GITHUB_API_URL } from "../../config/index.js";

import type { EnvHttpProxyAgent } from "undici";

let proxyDispatcher: EnvHttpProxyAgent | undefined;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function createGitHubClient() {
	const { Octokit } = await import("@octokit/rest");
	const { retry } = await import("@octokit/plugin-retry");
	const { fetch, EnvHttpProxyAgent } = await import("undici");

	const OctokitWithRetry = Octokit.plugin(retry);

	if (!GITHUB_TOKEN) {
		throw new Error("GitHub token is required to authenticate Octokit");
	}

	// Share connection pools across clients; routing is evaluated for each destination,
	// including redirects to artifact storage hosts.
	proxyDispatcher ??= new EnvHttpProxyAgent();
	const dispatcher = proxyDispatcher;

	const options: {
		auth: string;
		request: { fetch: typeof fetch };
		baseUrl?: string;
		retry?: { enabled: boolean; retries?: number };
	} = {
		auth: GITHUB_TOKEN,
		request: {
			fetch: (url, init) => fetch(url, { ...init, dispatcher }),
		},
		retry: {
			enabled: true,
			retries: 3,
		},
	};

	if (GITHUB_API_URL) {
		options.baseUrl = GITHUB_API_URL;
	}

	return new OctokitWithRetry(options);
}
