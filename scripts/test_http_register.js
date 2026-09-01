async function testHttpRegister() {
  console.log("=== TESTING LIVE HTTP REGISTRATION ENDPOINT ===");
  try {
    const payload = {
      instituteName: "HTTP Test Institute",
      institutePhone: "1234567890",
      instituteEmail: `httptest_${Date.now()}@example.com`,
      address: "123 HTTP Street",
      name: "HTTP Owner",
      email: `httptest_${Date.now()}@example.com`,
      phone: "1234567890",
      password: "password123",
    };

    console.log("Sending POST payload to http://localhost:3000/api/auth/register...");

    const response = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("HTTP Fetch Error:", err);
  }
}

testHttpRegister();
