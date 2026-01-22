import { describe, expect, test, mock } from "bun:test";
import { handleRequest } from "../src/index";

// Mock CDOGS
mock.module("../src/cdogs", () => ({
  renderWithCdogs: async () => Buffer.from("mock pdf/html content"),
  loadCdogsTemplate: async () => {},
}));

describe("API Handler", () => {
  test("returns 404 for invalid path", async () => {
    const req = new Request("http://localhost/invalid", { method: "POST" });
    const res = await handleRequest(req);
    expect(res.status).toBe(404);
  });

  test("returns 404 for invalid method", async () => {
    const req = new Request("http://localhost/convert/email", { method: "GET" });
    const res = await handleRequest(req);
    expect(res.status).toBe(404);
  });

  test("returns 400 if multipart/form-data is missing", async () => {
    const req = new Request("http://localhost/convert/email", { 
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" }
    });
    const res = await handleRequest(req);
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Invalid multipart/form-data");
  });

  test("returns 400 if file is missing", async () => {
    const formData = new FormData();
    formData.append("other", "value");
    
    const req = new Request("http://localhost/convert/email", { 
        method: "POST",
        body: formData,
    });
    const res = await handleRequest(req);
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe("Missing file");
  });

  test("returns 200 for valid .eml file", async () => {
    const formData = new FormData();
    const emlContent = `From: test@test.com\nSubject: Test\n\nBody`;
    formData.append("file", new File([emlContent], "test.eml"));
    
    const req = new Request("http://localhost/convert/email", { 
        method: "POST",
        body: formData,
    });
    const res = await handleRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
  });
});
