# 🟡 AWS SDK for JavaScript v3 – Universal CDN Package

This is a browser-ready distribution of [`@aws-sdk/client-secrets-manager`](https://github.com/aws/aws-sdk-js-v3) modules from AWS SDK for JavaScript v3. It is automatically built and published to a CDN, so developers can use AWS SDKs directly in the browser with zero bundling.

> ⚡️ No build step needed. Just import from a URL and use immediately.

---

## 📦 Usage

Use directly in the browser via [jsDelivr](https://www.jsdelivr.com/):

### Latest version

```html
<script type="module">
  import { } from "https://cdn.jsdelivr.net/gh/aws-sdk/client-secrets-manager/index.min.mjs";
  // your logic here
</script>
```

### Specific version

```html
<script type="module">
  import { S3Client } from "https://cdn.jsdelivr.net/gh/aws-sdk/client-s3@3.873.0/index.min.mjs";

  const client = new S3Client({ region: "us-east-1" });
</script>
```

Replace `client-s3` with any other AWS SDK v3 client like:

* `client-dynamodb`
* `client-iam`
* `client-ses`
* etc.

---

## 📚 Available Clients

You can request any official [`@aws-sdk/client-*`](https://github.com/aws/aws-sdk-js-v3/tree/main/clients) module from npm.

If a package you want isn’t available yet, [create an issue](https://github.com/aws-sdk/client-secrets-manager/issues/)

---

## 🔧 What This Contains

Each client directory contains:

* `index.min.mjs` – ES Module bundle
* `entry.mjs` – Source ES module export
* Example files (`examples/index.html`, `examples/main.mjs`, `examples/main.css`)

---

## 📤 CDN Link Format

* Latest:
  `https://cdn.jsdelivr.net/gh/aws-sdk/<service>/index.min.mjs`

* Specific version:
  `https://cdn.jsdelivr.net/gh/aws-sdk/<service>@<version>/index.min.mjs`

Examples:

```js
// Latest
https://cdn.jsdelivr.net/gh/aws-sdk/client-secrets-manager/index.min.mjs

// Specific
https://cdn.jsdelivr.net/gh/aws-sdk/client-secrets-manager@3.873.0/index.min.mjs
```

---

## 🔒 Security Warning

Using external scripts from a CDN in production requires care. To lock versions and ensure consistency:

✅ Use fixed versions (`@3.873.0`)
❌ Avoid always pointing to `latest` in production.

---

## 🤝 Contributing

To request support for a new AWS SDK v3 browder package, [open an issue](https://github.com/aws-sdk/client-secrets-manager/issues).

---

## 📜 License

[Apache-2.0](https://github.com/aws-sdk/aws-sdk-js-v3/blob/main/LICENSE)

---
