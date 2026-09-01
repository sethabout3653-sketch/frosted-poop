async function run() {
  const url = "https://raw.githubusercontent.com/3kh0/3kh0-assets/main/1v1lol/1v1lol.wasm";
  const r = await fetch(url, { method: "HEAD" });
  console.log("CL:", r.headers.get("content-length"));
}
run().catch(console.error);
