import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CTRFReport } from "ctrf";
import type { SlackConfig } from "../../src/types/integrations.js";
import * as core from "@actions/core";
import { handleSlackIntegration } from "../../src/integrations/slack.js";

// Exercise the real Slack reporter and SDKs; capture requests at the fetch boundary.
const request = vi.fn<typeof fetch>();
vi.mock("@actions/core");

function createReport(): CTRFReport {
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		results: {
			tool: { name: "slack-regression" },
			summary: {
				tests: 2,
				passed: 1,
				failed: 1,
				skipped: 0,
				pending: 0,
				other: 0,
				start: 1000,
				stop: 2000,
			},
			tests: [
				{
					name: "failure",
					status: "failed",
					duration: 1,
					suite: ["parent", "child"],
					message: "expected failure",
					ai: "AI explanation",
					extra: { preserved: { nested: true } },
				},
				{
					name: "flaky",
					status: "passed",
					duration: 1,
					flaky: true,
					retries: 1,
				},
			],
		},
	};
}

const actions: SlackConfig["action"][] = ["results", "failed", "flaky", "ai"];
const envWebhook = "https://example.invalid/env-webhook";

describe("Slack integration compatibility", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.stubEnv("SLACK_WEBHOOK_URL", envWebhook);
		vi.stubGlobal("fetch", request);
		request.mockImplementation(async (url) =>
			String(url).startsWith("https://slack.com/api/")
				? Response.json({ ok: true })
				: new Response("ok"),
		);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it.each(actions)(
		"sends %s using the existing environment credential",
		async (action) => {
			const report = createReport();
			const original = structuredClone(report);
			await handleSlackIntegration({ enabled: true, action }, report);
			expect(request).toHaveBeenCalledExactlyOnceWith(
				envWebhook,
				expect.objectContaining({ method: "POST" }),
			);
			expect(request).toHaveBeenCalledOnce();
			expect(report).toEqual(original);
		},
	);

	it.each(actions)("preserves legacy options.token for %s", async (action) => {
		const options = { token: "https://example.invalid/legacy" };
		await handleSlackIntegration(
			{ enabled: true, action, options },
			createReport(),
		);
		expect(request).toHaveBeenCalledExactlyOnceWith(
			options.token,
			expect.any(Object),
		);
		expect(request).toHaveBeenCalledOnce();
		expect(options).toEqual({ token: "https://example.invalid/legacy" });
	});

	it.each(actions)(
		"preserves explicit webhook options for %s",
		async (action) => {
			const options = {
				webhookUrl: "https://example.invalid/explicit",
				token: "https://example.invalid/legacy",
				title: "Custom title",
				prefix: "Custom prefix",
				suffix: "Custom suffix",
			};
			await handleSlackIntegration(
				{ enabled: true, action, options },
				createReport(),
			);
			expect(request).toHaveBeenCalledExactlyOnceWith(
				options.webhookUrl,
				expect.any(Object),
			);
			const payload = String(request.mock.calls[0][1]?.body);
			for (const text of [options.title, options.prefix, options.suffix]) {
				expect(payload).toContain(text);
			}
			expect(core.debug).not.toHaveBeenCalled();
		},
	);

	it.each(actions)(
		"preserves explicit OAuth options for %s despite the environment webhook",
		async (action) => {
			const options = { oauthToken: "test-token", channelId: "test-channel" };
			await handleSlackIntegration(
				{ enabled: true, action, options },
				createReport(),
			);
			expect(request).toHaveBeenCalledExactlyOnceWith(
				"https://slack.com/api/chat.postMessage",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${options.oauthToken}`,
					}),
				}),
			);
			expect(String(request.mock.calls[0][1]?.body)).toContain(
				options.channelId,
			);
		},
	);

	it("keeps passing-only suppression without claiming delivery", async () => {
		const report = createReport();
		report.results.summary.failed = 0;
		await handleSlackIntegration(
			{ enabled: true, action: "results", options: { onFailOnly: true } },
			report,
		);
		expect(request).not.toHaveBeenCalled();
		expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining("Sent"));
	});

	it.each(["failed", "ai"] satisfies SlackConfig["action"][])(
		"keeps consolidated %s messages",
		async (action) => {
			const report = createReport();
			report.results.tests.push({
				...report.results.tests[0],
				name: "second failure",
			});
			await handleSlackIntegration(
				{ enabled: true, action, options: { consolidated: true } },
				report,
			);
			expect(request).toHaveBeenCalledOnce();
		},
	);

	it.each(actions)(
		"accepts older reports without suite fields for %s",
		async (action) => {
			const report = createReport();
			report.specVersion = "0.0.1";
			delete report.results.tests[0].suite;
			await handleSlackIntegration({ enabled: true, action }, report);
			expect(request).toHaveBeenCalledOnce();
		},
	);

	it("reports missing credentials instead of silently succeeding", async () => {
		vi.stubEnv("SLACK_WEBHOOK_URL", "");
		await expect(
			handleSlackIntegration(
				{ enabled: true, action: "results" },
				createReport(),
			),
		).rejects.toThrow("Slack credentials missing");
		expect(request).not.toHaveBeenCalled();
	});

	it("propagates delivery errors without claiming success", async () => {
		request.mockRejectedValueOnce(new Error("transport failed"));
		await expect(
			handleSlackIntegration(
				{ enabled: true, action: "results" },
				createReport(),
			),
		).rejects.toThrow("transport failed");
		expect(core.info).not.toHaveBeenCalledWith(
			"Processed Slack results notification",
		);
	});
});
