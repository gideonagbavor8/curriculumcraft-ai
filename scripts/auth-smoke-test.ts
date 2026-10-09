import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

// Run against a local server only. Never automatically deletes test accounts.
const base = process.env.AUTH_TEST_BASE_URL || "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local server for smoke tests.");
const manifestPath = process.argv[2];
assert.ok(manifestPath, "Provide an absolute path for the temporary test-record manifest.");
const runId = randomUUID();
const password = `CurriculumCraft-${randomBytes(16).toString("hex")}`;
const results: string[] = [];
const accounts: { id: string; email: string; name: string }[] = [];
const records: { table: string; id: string; userId: string }[] = [];

function recordResult(message: string) {
  results.push(message);
  console.log(`PASS: ${message}`);
  persist();
}

function persist() {
  writeFileSync(manifestPath, JSON.stringify({ runId, accounts, records, results }, null, 2));
}

async function request(path: string, cookie = "", method = "GET", body?: unknown, origin = base) {
  return fetch(`${base}${path}`, {
    method, redirect: "manual",
    headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function json(response: Response) {
  const data = await response.json();
  assert.ok(!JSON.stringify(data).includes("passwordHash"), "Response must not expose password hashes.");
  return data;
}

function sessionCookie(response: Response) {
  const header = response.headers.get("set-cookie");
  assert.ok(header);
  assert.ok(header.includes("HttpOnly"));
  assert.ok(header.includes("SameSite=lax"));
  const cookie = header.split(";")[0];
  assert.ok(cookie.startsWith("cc_teacher_session="));
  return cookie;
}

async function main() {
  persist();
  for (const path of ["/api/lessons", "/api/resources", "/api/scheme-uploads", "/api/curriculum/catalog", "/api/locations?level=region"]) {
    assert.equal((await request(path)).status, 401);
  }
  for (const path of ["/account", "/saved", "/dashboard", "/activity-suite", "/lesson-builder", "/scheme-of-learning", "/settings"]) {
    const response = await request(path);
    assert.equal(response.status, 307);
    assert.ok(response.headers.get("location")?.includes("/sign-in"));
  }
  recordResult("Unauthenticated teacher APIs reject requests and every teacher page redirects to sign-in");
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/about")).status, 200);
  const publicHeader = await (await request("/sign-in")).text();
  assert.ok(publicHeader.includes("Create account"));
  recordResult("Public product/about/sign-in pages remain accessible with account actions");
  assert.equal((await request("/api/auth/sign-up", "", "POST", { name: "Test", email: "invalid", password: "short" })).status, 400);
  assert.equal((await request("/api/auth/sign-up", "", "POST", {}, "https://attacker.invalid")).status, 403);
  recordResult("Invalid registration and cross-origin requests are rejected");

  const cookies: string[] = [];
  for (const suffix of ["a", "b"]) {
    const email = `auth-smoke-${runId}.${suffix}@example.invalid`;
    const name = `CurriculumCraft Auth Test ${suffix.toUpperCase()} ${runId}`;
    const response = await request("/api/auth/sign-up", "", "POST", { name, email, password });
    assert.equal(response.status, 201);
    const cookie = sessionCookie(response);
    cookies.push(cookie);
    const session = await json(await request("/api/auth/session", cookie));
    assert.equal(session.data.email, email);
    accounts.push({ id: session.data.id, email, name });
    persist();
  }
  const [a, b] = cookies;
  recordResult("Two labelled teachers can register and receive private persistent session cookies");
  assert.equal((await request("/api/auth/sign-in", "", "POST", { email: accounts[0].email, password: "wrong-password-123" })).status, 401);
  const login = await request("/api/auth/sign-in", "", "POST", { email: accounts[0].email.toUpperCase(), password });
  assert.equal(login.status, 200);
  const loginCookie = sessionCookie(login);
  recordResult("Email/password sign-in works with normalised email; wrong password is rejected");

  for (const path of ["/account", "/saved", "/dashboard", "/activity-suite", "/lesson-builder", "/scheme-of-learning", "/settings"]) {
    const response = await request(path, a);
    assert.equal(response.status, 200, `Teacher cannot open ${path}`);
    const html = await response.text();
    assert.ok(!html.includes("is coming soon"));
    assert.ok(!html.includes("Enter your access code"));
    assert.ok(html.includes("Sign out"));
  }
  assert.equal((await request("/api/beta-access", a)).status, 404);
  assert.equal((await request("/access", a)).status, 404);
  assert.equal((await request("/api/curriculum/catalog", a)).status, 200);
  recordResult("New accounts immediately access all header tools, including Scheme of Learning, without a beta code");
  const refreshed = await json(await request("/api/auth/session", a));
  assert.equal(refreshed.data.id, accounts[0].id);
  recordResult("Session survives subsequent requests/page refresh and authenticated header offers account/sign-out");

  const lesson = {
    indicatorCode: "B4.1.1.1.1", subject: "Mathematics", grade: "B4", strand: "Number",
    subStrand: "Whole numbers", lessonPlan: "## Test lesson plan\nA private test lesson.",
    teacherNotes: "## Test notes\nOnly Teacher A should see this.",
    visualPrompts: "Use counters.", studentReading: "Count the counters.",
    userId: accounts[1].id,
  };
  const savedLesson = await request("/api/lessons", a, "POST", lesson);
  assert.equal(savedLesson.status, 201);
  const savedLessonData = (await json(savedLesson)).data;
  const lessonId = savedLessonData.id;
  assert.equal(savedLessonData.userId, accounts[0].id);
  records.push({ table: "saved_lessons", id: lessonId, userId: accounts[0].id }); persist();
  assert.equal((await request(`/api/lessons?id=${lessonId}`, b)).status, 404);
  assert.equal((await request(`/api/lessons?id=${lessonId}`, b, "DELETE")).status, 404);
  assert.equal((await request(`/api/lessons?id=${lessonId}`, a)).status, 200);
  assert.equal((await json(await request("/api/lessons", b))).data.length, 0);
  recordResult("Saved lesson ownership ignores a spoofed client userId; Teacher B cannot read/delete/list Teacher A's lesson");

  for (const [cookie, user, type] of [[a, accounts[0], "lesson_note"], [b, accounts[1], "assessment"]] as const) {
    const response = await request("/api/resources", cookie, "POST", {
      title: `Auth test ${type} ${runId}`, resourceType: type, content: "## Private test resource\nFor this teacher only.",
      userId: cookie === a ? accounts[1].id : accounts[0].id,
    });
    assert.equal(response.status, 201);
    const data = (await json(response)).data;
    assert.equal(data.userId, user.id);
    records.push({ table: "saved_resources", id: data.id, userId: user.id }); persist();
    const other = cookie === a ? b : a;
    assert.equal((await request(`/api/resources?id=${data.id}`, other)).status, 404);
    assert.equal((await request(`/api/resources?id=${data.id}`, other, "DELETE")).status, 404);
    assert.equal((await request(`/saved/resources/${data.id}`, other)).status, 404);
    assert.equal((await request(`/saved/resources/${data.id}`, cookie)).status, 200);
  }
  assert.equal((await json(await request("/api/resources", a))).data.length, 1);
  assert.equal((await json(await request("/api/resources", b))).data.length, 1);
  assert.equal((await request("/api/resources", a, "POST", { title: "Invalid", content: 1, resourceType: "assessment" })).status, 400);
  assert.equal((await request("/api/resources", a, "POST", {}, "https://attacker.invalid")).status, 403);
  recordResult("Both teachers can save/retrieve/open only their own resources; invalid content and CSRF attempts are rejected");

  const scheme = await request("/api/scheme-uploads/manual", a, "POST", {
    userId: accounts[1].id, gradeCode: "B4", subjectSlug: "mathematics", subjectLabel: "Mathematics",
    weekNumber: 1, indicatorsText: "B4.1.1.1.1 Model number quantities using counters.", termLabel: `AUTH TEST ${runId}`,
  });
  assert.equal(scheme.status, 201);
  const schemeId = (await json(scheme)).data.schemeUploadId;
  records.push({ table: "scheme_uploads", id: schemeId, userId: accounts[0].id }); persist();
  assert.equal((await request(`/api/scheme-uploads/${schemeId}`, b)).status, 404);
  assert.equal((await request(`/api/scheme-uploads/${schemeId}`, b, "DELETE")).status, 404);
  const review = await json(await request(`/api/scheme-uploads/${schemeId}`, a));
  assert.equal(review.data.upload.id, schemeId);
  const weekId = review.data.subjects[0].weeks[0].id;
  assert.equal((await request(`/api/scheme-weeks/${weekId}/generate-day`, b, "POST", { dayIndex: 0, totalDays: 1 })).status, 404);
  assert.equal((await request(`/api/scheme-weeks/${weekId}/generate-day`, a, "POST", { dayIndex: 0, totalDays: 0 })).status, 400);
  assert.equal((await json(await request("/api/scheme-uploads", b))).data.length, 0);
  recordResult("Manual scheme import/review works; other teachers cannot list/read/delete/generate from another teacher's scheme");
  assert.equal((await request("/api/auth/profile", a, "POST", { name: `${accounts[0].name} Updated`, userId: accounts[1].id })).status, 200);
  assert.equal((await json(await request("/api/auth/session", b))).data.name, accounts[1].name);
  recordResult("Profile updates apply to the authenticated teacher only");

  const disposable = await request("/api/resources", a, "POST", { title: `Auth delete test ${runId}`, resourceType: "activity", content: "Delete only this test." });
  assert.equal(disposable.status, 201);
  const disposableId = (await json(disposable)).data.id;
  records.push({ table: "saved_resources", id: disposableId, userId: accounts[0].id }); persist();
  recordResult("Own-resource deletion fixture is ready; destructive verification is deferred until cleanup approval");

  assert.equal((await request("/api/auth/sign-out", loginCookie, "POST")).status, 200);
  assert.equal((await json(await request("/api/auth/session", loginCookie))).data, null);
  assert.equal((await request("/api/resources", loginCookie)).status, 401);
  assert.equal((await request("/api/auth/sign-out", a, "POST")).status, 200);
  assert.equal((await request("/api/auth/sign-out", b, "POST")).status, 200);
  recordResult("Logout revokes server sessions; replaying an old cookie cannot access private resources");
  console.log(`\n${results.length} smoke-test groups passed. Test records are retained for review in ${manifestPath}.`);
}

main().catch((error) => {
  persist();
  console.error("Authentication smoke test failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
