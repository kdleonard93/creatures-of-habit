import fs from 'node:fs/promises';
import path from 'node:path';

const templatesDir = path.resolve(process.cwd(), 'scripts/templates');
const testsDir = path.resolve(process.cwd(), 'src/tests');

type TestType = 'component' | 'client' | 'api' | 'utility';

async function generateTest() {
	const [type, name] = process.argv.slice(2) as [TestType, string];

	if (!type || !name) {
		console.error('Usage: tsx scripts/generate-test.ts <type> <name>');
		console.error('Type can be one of: component, api, utility');
		process.exit(1);
	}

	const templateFile = `${type}.test.template`;
	const templatePath = path.join(templatesDir, templateFile);

	try {
		await fs.access(templatePath);
	} catch {
		console.error(`Error: Template not found at ${templatePath}`);
		process.exit(1);
	}

	const templateContent = await fs.readFile(templatePath, 'utf-8');

	let newContent: string;
	let targetDir: string;
	let targetFile: string;

	switch (type) {
		case 'component':
			newContent = templateContent.replace(/ComponentName/g, name);
			targetDir = path.join(testsDir, 'components');
			targetFile = path.join(targetDir, `${name}.test.ts`);
			break;
		case 'client':
			newContent = templateContent.replace(/ComponentName/g, name);
			targetDir = path.join(testsDir, 'client');
			targetFile = path.join(targetDir, `${name}.test.ts`);
			break;
		case 'api':
			newContent = templateContent.replace(/endpoint/g, name.toLowerCase());
			targetDir = path.join(testsDir, 'api');
			targetFile = path.join(targetDir, `${name}.api.test.ts`);
			break;
		case 'utility':
			newContent = templateContent
				.replace(/utilityFunction/g, name)
				.replace(/utility/g, name.toLowerCase());
			targetDir = path.join(testsDir, 'utils');
			targetFile = path.join(targetDir, `${name}.test.ts`);
			break;
		default:
			console.error(`Invalid type: ${type}. Must be one of: component, api, utility.`);
			process.exit(1);
	}

	await fs.mkdir(targetDir, { recursive: true });

	try {
		await fs.access(targetFile);
		console.error(`Error: Test file already exists at ${targetFile}`);
		process.exit(1);
	} catch {
	}

	await fs.writeFile(targetFile, newContent);
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log(`Successfully created test file at ${targetFile}`);
}

generateTest();
