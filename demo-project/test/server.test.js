import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../dist/index.js";

test("root endpoint returns the product landing page", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.notEqual(address, null);

    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(html, /Commit Doc Agent/);
    assert.match(html, /Documentation that keeps up with every local commit/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test("health-check endpoint returns service status", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.notEqual(address, null);

    const response = await fetch(`http://127.0.0.1:${address.port}/health-check`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "commit-doc-agent-demo");
    assert.equal(typeof body.timestamp, "string");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test("architecture endpoint returns a designed architecture page", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.notEqual(address, null);

    const response = await fetch(`http://127.0.0.1:${address.port}/architecture`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(html, /Commit Doc Agent Architecture/);
    assert.match(html, /Commit To Documentation Flow/);
    assert.match(html, /Documentation schema/);
    assert.match(html, /docs\/\.schema\/feature-page\.md/);
    assert.match(html, /docs\/\*\.md for human-facing feature documentation/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
