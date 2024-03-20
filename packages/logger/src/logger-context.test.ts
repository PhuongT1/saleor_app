import { describe, it, expect } from "vitest";
import { LoggerContext } from "./logger-context";

describe("LoggerContext", () => {
  it("Wraps context and shares context globally", () => {
    expect.assertions(1);

    const loggerContext = new LoggerContext("package-logger");

    const assertFunction = () => {
      loggerContext.set("baz", "1");

      expect(loggerContext.getRawContext()).toEqual({
        foo: "bar",
        initialState: "exists",
        baz: "1",
        project_name: "package-logger",
      });
    };

    function someExecution() {
      loggerContext.set("foo", "bar");

      assertFunction();
    }

    loggerContext.wrap(() => someExecution(), { initialState: "exists" });
  });
});
