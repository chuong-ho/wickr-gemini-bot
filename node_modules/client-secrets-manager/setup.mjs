import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoFullName = process.env.GITHUB_REPOSITORY;
const repoName = repoFullName?.split("/")[1];

function run(cmd) {
	execSync(cmd, { stdio: "inherit" });
}

async function get_latest() {
	const res = await fetch(`https://registry.npmjs.org/@aws-sdk/${repoName}/latest`);
	const data = await res.json();
	return data.version;
}

const latest_version = await get_latest();

async function change_version() {
	let first = true;
	let old_version = "{repoVersion}";
	let old_name = repoName;
	const tags = await fetch(`https://api.github.com/repos/aws-sdk/${repoName}/tags`).then(r => r.json());
	if (tags && tags.length > 0) {
		old_version = tags[0].name;
		first = false;
	} else {
		old_name = "{repoName}";
	}

	if (latest_version === old_version) {return ""};
	const replaceInFile = (filepath) => {
		let data = readFileSync(filepath, "utf8");
		data = data.replaceAll(old_name, repoName).replaceAll(old_version, latest_version);
		writeFileSync(filepath, data);
	};

	replaceInFile(join(__dirname, "package.json"));
	replaceInFile(join(__dirname, "README.md"));
	replaceInFile(join(__dirname, ".github", "CONTRIBUTING.md"));
	replaceInFile(join(__dirname, "examples", "index.html"));
	replaceInFile(join(__dirname, "examples", "main.mjs"));
	replaceInFile(join(__dirname, "entry.mjs"));
	run(`npm install --prefix . @aws-sdk/${repoName}@${latest_version}`);
	run(`npm install --prefix . --save-dev webpack webpack-cli`);
	run("npm run build");
	run("git config --global user.name 'suryavaddiraju'");
	run("git config --global user.email '112264612+suryavaddiraju@users.noreply.github.com'");
	writeFileSync("/tmp/private.key", process.env.GPG_KEY);
	run("gpg --batch --yes --import /tmp/private.key");
	run("git config --global gpg.program gpg");
	run("git config --global commit.gpgsign true");
	run(`git config --global user.signingkey ${process.env.GPG_KEY_ID}`);
  	run("git add .");
	run(`git commit -S -m "chore: update to ${latest_version}"`);
	run("git push origin HEAD");
	let data = await fetch(`https://api.github.com/repos/aws-sdk/${repoName}/releases`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
			"Accept": "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
		body: JSON.stringify({
			tag_name: latest_version,
			name: latest_version,
			body: `Release for @aws-sdk/${repoName} v${latest_version}\n\nThis release includes the latest updates from the AWS SDK for JavaScript v3.\n\nCDN: https://cdn.jsdelivr.net/gh/aws-sdk/${repoName}@${latest_version}/index.min.mjs\n\nDocs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/`,
			draft: false,
			prerelease: false,
			generate_release_notes: false,
		})
	});
	data = await data.text();
	console.log(`Release created: ${data}`);
}

await change_version();
