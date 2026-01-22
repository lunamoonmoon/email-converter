
import { describe, expect, test, mock, spyOn } from "bun:test";
import { convertEmailToZip } from "../src/converter";
import * as carboneRenderer from "../src/carbone-renderer";
import * as cdogs from "../src/cdogs";

// Mock CDOGS to avoid network/env issues
mock.module("../src/cdogs", () => ({
  renderWithCdogs: async () => new Uint8Array(Buffer.from("mock cdogs")),
  loadCdogsTemplate: async () => {},
}));

// Mock Carbone Renderer
const carboneSpy = spyOn(carboneRenderer, "renderWithCarbone");
mock.module("../src/carbone-renderer", () => ({
  renderWithCarbone: carboneSpy,
}));

describe("Carbone Integration", () => {
  test("calls renderWithCarbone when renderer is set to 'carbone'", async () => {
    carboneSpy.mockImplementation(async () => Buffer.from("mock carbone content"));
    carboneSpy.mockClear();

    const emlContent = `From: me@test.com
Subject: Test Carbone
Date: Wed, 21 Oct 2015 07:28:00 GMT

Body content
`;
    const emlFile = new File([emlContent], "carbone_test.eml");
    
    // Call with renderer='carbone'
    const zipBuffer = await convertEmailToZip(emlFile, "pdf", "carbone");
    
    expect(zipBuffer).toBeDefined();
    expect(carboneSpy).toHaveBeenCalled();
    const callArgs = carboneSpy.mock.calls[0];
    if (!callArgs) throw new Error("Expected renderWithCarbone to be called");
    const dataPassed = callArgs[0] as any;
    expect(dataPassed.email.subject).toBe("Test Carbone");
  });

  test("does not call renderWithCarbone when renderer is 'cdogs' (default)", async () => {
    carboneSpy.mockClear();
    
    const emlContent = `From: me@test.com
Subject: Test Cdogs
`;
    const emlFile = new File([emlContent], "cdogs_test.eml");
    
    await convertEmailToZip(emlFile, "pdf", "cdogs");
    
    expect(carboneSpy).not.toHaveBeenCalled();
  });
});
