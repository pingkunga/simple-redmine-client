import { describe, it, expect, test, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useRedmineAPI from "./useRedmineAPI";

// Mock `useRuntimeConfig` using `mockNuxtImport`
mockNuxtImport("useRuntimeConfig", () => {
  return () => ({
    public: { redmineUrl: "https://redmine.example.com" },
    redmineToken: "default-redmine-token",
  });
});

describe("createBaseRedmineHeader", () => {
  const { createBaseRedmineHeader, YourOwnRedmineAPI } = useRedmineAPI();

  test("should return default headers when no custom headers are provided", () => {
    const headers = createBaseRedmineHeader();

    expect(headers).toEqual({
      "Content-Type": "application/json",
      "X-Redmine-API-Key": "default-redmine-token",
    });
  });


  test("should override 'X-Redmine-API-Key' if custom header contains 'YourOwnRedmineAPI'", () => {
    const customHeaders = {
      [YourOwnRedmineAPI]: "Y3VzdG9tLWFwaS1rZXk=", //custom-api-key
    };

    const headers = createBaseRedmineHeader(customHeaders);

    expect(headers).toEqual({
      "Content-Type": "application/json",
      "X-Redmine-API-Key": "custom-api-key",
    });
  });
  
  test("should handle undefined custom headers gracefully", () => {
    const headers = createBaseRedmineHeader(undefined);

    expect(headers).toEqual({
      "Content-Type": "application/json",
      "X-Redmine-API-Key": "default-redmine-token",
    });
  });
  
});