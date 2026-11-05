"use strict";
const vscode = require("vscode"),
	fs = require("fs/promises"),
	path = require("path"),
	os = require("os");
	
const {
	formatBytes
} = require("@draconides/format");

const {
	t
} = require("./i18n");

const out = vscode.window.createOutputChannel("Remote SSH Cleaner");


async function exists(p) {
	try {
		await fs.lstat(p);
		return true;
	} catch (e) {
		if (e.code === "ENOENT") return false;
		throw e;
	}
}

async function bytes(p) {
	try {
		const s = await fs.lstat(p);
		
		if (s.isSymbolicLink()) 
			return 0;
		
		if (!s.isDirectory()) 
			return s.size;
		
		let n = 0;
		for (const x of await fs.readdir(p)) 
			n += await bytes(path.join(p, x));
		
		return n;
	} catch {
		return 0;
	}
}

function human(bytes) {
	return formatBytes(bytes, {
		decimals: 1,
		conversion: "binary",
		style: "octet",
		unitFormat: "minimal",
		formatter: (value) =>
			new Intl.NumberFormat(
				vscode.env.language.toLowerCase().startsWith("fr") ? "fr-FR" : "en-US",
				{
					maximumFractionDigits: 1,
				}
			)
			.format(value),
	});
}

function inside(home, p) {
	const r = path.relative(home, p);
	
	return (
		r && r !== ".." && !r.startsWith(".." + path.sep) && !path.isAbsolute(r)
	);
}

function extInfo(n) {
	const m = n.match(/^(.+)-(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)$/);
	
	return m ? {
		id: m[1],
		v: m[2],
		n
	} : null;
}

function cmp(a, b) {
	return a.localeCompare(b, undefined, {
		numeric: true,
		sensitivity: "base"
	});
}

function strings(v, a = []) {
	if (typeof v === "string") 
		a.push(v);
	else if (Array.isArray(v)) 
		v.forEach((x) => strings(x, a));
	else if (v && typeof v === "object")
		Object.values(v)
		.forEach((x) => strings(x, a));
	return a;
}

async function plan() {
	const c = vscode.workspace.getConfiguration("remoteSshCleaner"),
		home = os.homedir(),
		root = path.join(home, ".vscode-server");
		
	if (!(await exists(root))) 
		throw Error(t("targetMissing", root));
	
	const items = [];
	const add = async (p, why) => {
		if (!inside(home, p)) 
			throw Error(t("pathRejected", p));
		
		if (await exists(p)) 
			items.push({
				p,
				why,
				b: await bytes(p)
			});
	};
	
	if (c.get("cleanDownloadedVsix", true))
		await add(
			path.join(root, "data", "CachedExtensionVSIXs"),
			t("downloadedVsix"),
		);
		
	const sr = path.join(root, "cli", "servers"),
		lru = path.join(sr, "lru.json");
	if ((await exists(sr)) && (await exists(lru))) {
		let keepVersions = [];
		try {
			for (const s of strings(JSON.parse(await fs.readFile(lru, "utf8")))) {
				for (const h of s.match(/[0-9a-f]{40}/gi) || []) {
					keepVersions.push(h);
				}
			}
		} catch (e) {
			throw Error(t("lruUnreadable", e.message));
		}
		
		if (keepVersions.length){
			for (const n of await fs.readdir(root))
				if (/^\.cli\..*\.log$/.test(n) && !keepVersions.some(el => n.includes(el))) 
					await add(path.join(root, n), t("cliLog"));
			
			if (c.get("cleanOldServers", true)) {
				for (const n of await fs.readdir(sr)) {
					if (n === "lru.json" || n === ".locks") 
						continue;
					
					if (!keepVersions.some(el => n.includes(el)))
						await add(path.join(sr, n), t("oldServer"));
				}
				
				for (const n of await fs.readdir(root))
					if (/^code-.*$/.test(n) && !keepVersions.some(el => n.includes(el))) 
						await add(path.join(root, n), t("cliLog"));
			}
		}
	} else 
		out.appendLine(t("lruMissing"));
	
	const er = path.join(root, "extensions");
	if (await exists(er)) {
		const ds = await fs.readdir(er, {
			withFileTypes: true
		});
		
		for (const d of ds)
			if (d.name.endsWith(".vsctmp"))
				await add(path.join(er, d.name), t("temporaryInstall"));
			
		if (c.get("cleanOldExtensions", true)) {
			const g = new Map();
			for (const d of ds) {
				if (!d.isDirectory()) 
					continue;
				
				const e = extInfo(d.name);
				if (!e) 
					continue;
				
				if (!g.has(e.id)) 
					g.set(e.id, []);
				
				g.get(e.id)
					.push(e);
			}
			
			for (const vs of g.values()) {
				vs.sort((a, b) => cmp(b.v, a.v));
				for (const e of vs.slice(1))
					await add(path.join(er, e.n), t("oldExtension", e.id));
			}
		}
	}
	
	if (c.get("cleanUserCache", false))
		await add(path.join(home, ".cache"), t("userCache"));
	
	return {
		root,
		items
	};
}

async function run(remove) {
	if (!vscode.env.remoteName) {
		const a = await vscode.window.showWarningMessage(
			t("localWindowWarning"), {
				modal: true
			},
			t("continueLocally"),
		);
		if (a !== t("continueLocally")) return;
	}
	
	out.clear();
	out.show(true);
	
	let x;
	try {
		x = await plan();
	} catch (e) {
		return vscode.window.showErrorMessage(t("cleanupError", e.message));
	}
	
	const total = x.items.reduce((n, i) => n + i.b, 0);
	
	out.appendLine(t("target", x.root));
	x.items.forEach((i) => out.appendLine(`- ${human(i.b)} | ${i.why} | ${i.p}`));
	out.appendLine(t("total", human(total)));
	
	if (!x.items.length)
		return vscode.window.showInformationMessage(t("nothingToClean"));
	
	if (!remove)
		return vscode.window.showInformationMessage(
			t("previewDone", x.items.length, human(total)),
		);
		
	const a = await vscode.window.showWarningMessage(
		t("confirmDelete", x.items.length, human(total)), {
			modal: true
		},
		t("delete"),
	);
	
	if (a !== t("delete")) 
		return;
	let ok = 0,
		bad = 0;
	for (const i of x.items)
		try {
			await fs.rm(i.p, {
				recursive: true,
				force: true
			});
			ok += i.b;
		} catch (e) {
			bad++;
			out.appendLine(t("deleteError", i.p, e.message));
		}
	vscode.window.showInformationMessage(
		t("cleanupDone", human(ok), bad ? t("failures", bad) : ""),
	);
}

async function checkOnStartup() {
	const c = vscode.workspace.getConfiguration("remoteSshCleaner");
	if (!c.get("checkOnStartup", true)) return;
	// Cette extension est destinee a l'hote distant. Ne pas analyser silencieusement la machine locale.
	if (!vscode.env.remoteName) return;
	let x;
	try {
		x = await plan();
	} catch (e) {
		out.appendLine(t("startupCheckError", e.message));
		return;
	}
	if (!x.items.length) return;
	const total = x.items.reduce((n, i) => n + i.b, 0);
	const a = await vscode.window.showInformationMessage(
		t("startupAvailable", x.items.length, human(total)),
		t("cleanNow"),
		t("showDetails"),
		t("ignore"),
	);
	if (a === t("cleanNow")) await run(true);
	else if (a === t("showDetails")) await run(false);
}

function activate(ctx) {
	ctx.subscriptions.push(
		out,
		vscode.commands.registerCommand("remoteSshCleaner.preview", () =>
			run(false),
		),
		vscode.commands.registerCommand("remoteSshCleaner.clean", () => run(true)),
	);
	const c = vscode.workspace.getConfiguration("remoteSshCleaner");
	const delay =
		Math.max(0, Math.min(300, Number(c.get("startupDelaySeconds", 5)) || 0)) *
		1000;
	const timer = setTimeout(() => checkOnStartup(), delay);
	ctx.subscriptions.push({
		dispose: () => clearTimeout(timer)
	});
}


module.exports = {
	activate,
	deactivate() {}
};
