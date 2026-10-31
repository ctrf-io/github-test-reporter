import { vi, describe, it, expect, beforeEach } from "vitest";
import * as core from "@actions/core";
import {
	getBooleanInputAllowEmpty,
	getInputs,
} from "../../src/core/inputs.js";

vi.mock("@actions/core");

describe("getBooleanInputAllowEmpty", () => {
	const mockCore = vi.mocked(core);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns false when input is empty", () => {
		mockCore.getInput.mockReturnValue("");

		expect(getBooleanInputAllowEmpty("pull-request")).toBe(false);
		expect(mockCore.getBooleanInput).not.toHaveBeenCalled();
	});

	it("uses getBooleanInput for nonempty values", () => {
		mockCore.getInput.mockReturnValue("true");
		mockCore.getBooleanInput.mockReturnValue(true);

		expect(getBooleanInputAllowEmpty("pull-request")).toBe(true);
		expect(mockCore.getBooleanInput).toHaveBeenCalledWith("pull-request");
	});

	it("returns false for explicit false values", () => {
		mockCore.getInput.mockReturnValue("false");
		mockCore.getBooleanInput.mockReturnValue(false);

		expect(getBooleanInputAllowEmpty("annotate")).toBe(false);
	});
});

describe("getInputs", () => {
	const mockCore = vi.mocked(core);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCore.getInput.mockImplementation((name: string) => {
			if (name === "report-path") {
				return "report.json";
			}
			return "";
		});
		mockCore.getBooleanInput.mockReturnValue(false);
	});

	it("treats empty boolean inputs as false without calling getBooleanInput", () => {
		const inputs = getInputs();

		expect(inputs.pullRequest).toBe(false);
		expect(inputs.annotate).toBe(false);
		expect(mockCore.getBooleanInput).not.toHaveBeenCalled();
	});
});
