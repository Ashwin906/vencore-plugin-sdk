import { execSync } from 'child_process'
import { readFileSync, existsSync, createWriteStream } from 'fs'
import { resolve, join } from 'path'
import archiver from 'archiver'
import chalk from 'chalk'

export async function runBuild(): Promise<void> {
  const cwd = process.cwd()

  console.log(chalk.cyan('Building...'))
  try {
    execSync('npx tsup', { stdio: 'inherit', cwd })
  } catch {
    process.exit(1)
  }

  let manifest: { id: string; version: string }
  try {
    manifest = JSON.parse(readFileSync(resolve(cwd, 'plugin.json'), 'utf-8'))
  } catch {
    console.error(chalk.red('✗ plugin.json not found or invalid'))
    process.exit(1)
  }

  const { id, version } = manifest
  const zipName = `${id}-${version}.zip`
  const zipPath = resolve(cwd, zipName)

  await new Promise<void>((res, rej) => {
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', res)
    archive.on('error', rej)
    archive.pipe(output)

    archive.directory(join(cwd, 'dist'), 'dist')
    archive.file(join(cwd, 'plugin.json'), { name: 'plugin.json' })
    archive.file(join(cwd, 'package.json'), { name: 'package.json' })

    if (existsSync(join(cwd, 'assets'))) {
      archive.directory(join(cwd, 'assets'), 'assets')
    }

    archive.finalize()
  })

  console.log(chalk.green(`✓ ${zipName}`))
}
