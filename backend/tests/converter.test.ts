
import { describe, expect, test, mock, spyOn } from "bun:test";
import { convertEmailToZip } from "../src/converter";
import { file } from "bun";
import * as cdogs from "../src/cdogs";

// Mock CDOGS rendering
const renderSpy = spyOn(cdogs, "renderWithCdogs");
mock.module("../src/cdogs", () => ({
  renderWithCdogs: renderSpy,
  loadCdogsTemplate: async () => {},
}));

describe("convertEmailToZip", () => {
  test("throws error for unsupported file types", async () => {
    const txtFile = new File(["hello"], "hello.txt");
    expect(convertEmailToZip(txtFile)).rejects.toThrow(
      "Only .eml and .msg files are supported"
    );
  });

  test("converts .eml file and passes correct JSON to CDOGS", async () => {
    renderSpy.mockImplementation(async () => Buffer.from("mock pdf/html content"));
    renderSpy.mockClear();

    const emlContent = `From: sender@example.com
To: recipient@example.com
Subject: Test EML
Date: Wed, 21 Oct 2015 07:28:00 GMT
Content-Type: text/plain; charset=utf-8

Hello World
`;
    const emlFile = new File([emlContent], "test.eml");
    const zipBuffer = await convertEmailToZip(emlFile, "both");
    
    expect(zipBuffer).toBeDefined();
    
    // Verify CDOGS was called with correct data structure
    expect(renderSpy).toHaveBeenCalled();
    const callArgs = renderSpy.mock.calls[0];
    if (!callArgs) throw new Error("Expected renderWithCdogs to be called");
    const dataPassed = callArgs[0] as any;
    
    expect(dataPassed).toHaveProperty("email");
    expect(dataPassed.email.subject).toBe("Test EML");
    expect(dataPassed.email.from).toBe("sender@example.com");
    expect(dataPassed.email.body.text).toContain("Hello World");
  });
});
