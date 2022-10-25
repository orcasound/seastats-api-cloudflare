async function GetFrontEnd(request, env) {
  // Generate a script that will load the front-end from the CDN
  let baseUrl = env.CLIENT_URL;
  if (!baseUrl) {
    throw new Error("CLIENT_URL is not set");
  }
  // Add trailing slash if missing
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }
  const manifestUrl = `${baseUrl}.vite/manifest.json`;
  const manifestResponse = await fetch(manifestUrl);
  const manifest = await manifestResponse.json();
  const scriptUrl = `${baseUrl}${manifest["index.html"]["file"]}`;
  const cssUrl = `${baseUrl}${manifest["index.html"]["css"]}`;

  const embedScript = `
(() => {
  const style = document.createElement("link");
  style.href = '${cssUrl}';
  style.rel = 'stylesheet';
  document.head.appendChild(style);

  const script = document.createElement('script');
  script.src = '${scriptUrl}';
  script.type = 'module';
  document.head.appendChild(script);
})();
`;
  const response = new Response(embedScript);
  response.headers.set("Content-Type", "text/javascript");
  return response;
}

export default GetFrontEnd;
