import fs from 'node:fs/promises';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';

const currentDir = process.cwd();

const listTxtFilename = 'files.txt';
const listTxtPath = path.join(currentDir, listTxtFilename);
const gitignore = path.join(currentDir, '.gitignore');

const git: SimpleGit = simpleGit({
  baseDir: currentDir,
});

async function initGit() {
  const isRepo = await git.checkIsRepo();
  if (isRepo) return;
  console.log('Initializing git repository...');
  await git.init();
}

async function saveList(text: string) {
  try {
    await fs.writeFile(
      listTxtPath.replace('.gitignore', ''),
      text.replace(/\n/g, '\r\n'),
      {
        encoding: 'utf-8',
      }
    );
  } catch (error) {
    console.error('Could not save list', error);
  }
}

async function deleteTempFiles() {
  try {
    await fs.unlink(listTxtPath);
    await fs.unlink(gitignore);
  } catch (error) {
    console.error('Could not delete temp files', error);
  }
}

async function getStats(filename: string) {
  try {
    const filePath = path.join(currentDir, filename);
    const stats = await fs.stat(filePath);
    return {
      filename,
      stats,
    };
  } catch (error) {
    return {
      filename,
      stats: null,
    };
  }
}

async function main() {
  try {
    await initGit();

    console.log('Listing files...');
    const files = await fs.readdir(currentDir);

    console.log('Getting stats...');
    const filesInfo = await Promise.all(files.map(getStats));

    console.log('Filtering files...');
    const filterFiles = filesInfo
      .filter((f) => f !== null && f.stats !== null && f.stats.isFile())
      .filter((f) => f.stats && f.stats.isFile());

    console.log('Sorting files by modified date...');
    const sortedFiles = filterFiles.sort((a, b) =>
      a.stats && b.stats ? a.stats.mtime.getTime() - b.stats.mtime.getTime() : 0
    );

    const fileNames = sortedFiles.map((f) => f.filename).join('\n');

    console.log(
      `Found ${filterFiles.length} files on ${path.basename(currentDir)}`
    );

    await fs.writeFile(gitignore, `*\n!${listTxtFilename}`);
    await saveList(fileNames);
    await git.add(listTxtFilename);
    await git.commit(`update ${listTxtFilename}`, listTxtFilename);
    await deleteTempFiles();
  } catch (error) {
    console.error('Error', error);
  }
}

main();
