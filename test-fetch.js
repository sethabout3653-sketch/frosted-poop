async function run() {
  const response = await fetch("https://example.com");
  const reader = response.body.getReader();
  console.log("Has reader:", !!reader);
}
run().catch(console.error);
