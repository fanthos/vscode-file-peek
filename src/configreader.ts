import * as vscode from "vscode";
import * as path from "path";

function createWatcher(glob:string, callback: (uri : vscode.Uri) => any) {
	let watcher = vscode.workspace.createFileSystemWatcher(glob);
	// function listener(uri: vscode.Uri) {
	// 	callback(uri);
	// }
	watcher.onDidChange(callback);
	watcher.onDidCreate(callback);
	watcher.onDidDelete(callback);
	return watcher;
}

function stringLengthCompare(a, b) {
	return (a.length - b.length) || (a<b?-1:(a>b?1:0))
}

// interface WatchConfigItem {
// 	path: String,
// 	paths: Map<String, Array<String>>
// }

export async function watchConfig() {
	let configMap = new Map<string, Map<string, Array<string>>>();
	let pathsMap = new Map<string, string>();
	let configList = new Array<string>();
	async function updateConfigFile(...fileNames: vscode.Uri[]) {
		for (let uri of fileNames) {
			// configMap.set(uri.path, "test");
			// let filePath = uri.fsPath.replace(/[jt]sconfig.json$/, '');
			let filePath = path.dirname(uri.fsPath);
			let textDoc
			try {
				textDoc = await vscode.workspace.openTextDocument(uri);
			} catch {
				configMap.delete(filePath);
				continue;
			}
			let text = textDoc.getText();
			let json = JSON.parse(text);
			let paths = json?.compilerOptions?.paths;
			if (paths == null) {
				configMap.delete(filePath);
				continue;
			}
			let newPaths = new Map<string, Array<string>>();
			for (let newPath in paths) {
				let relPath = newPath;
				if (relPath.indexOf('*')) {
					relPath = relPath.substring(0, relPath.indexOf('*'));
				}
				let target = paths[newPath].map(
					it => {
						if (it.indexOf('*')) {
							it = it.substring(0, it.indexOf('*'));
						}
						return it
					}
				)
				newPaths.set(relPath, target);
			}
			configMap.set(filePath, newPaths)
			// configList.push({path: filePath, })
			// console.log(uri, paths);
		}
		// configList.sort((a, b) => stringLengthCompare(a.path, b.path))
		let newList = Array.from(configMap.keys()).sort((a,b) => stringLengthCompare(b,a));
		configList.splice(0, configList.length);
		Array.prototype.push.apply(configList, newList);
	}
	const files = await vscode.workspace.findFiles('**/[tj]sconfig.json', '**/node_modules/**');
	await updateConfigFile(...files);

	let watcher = createWatcher("**/[tj]sconfig.json", async uri => {
		await updateConfigFile(uri);
	});
	return {watcher, configMap, configList};
}