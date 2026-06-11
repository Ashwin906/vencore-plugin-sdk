import { cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import chalk from 'chalk'

function replaceInFile(filePath: string, from: string, to: string): void {
  const content = readFileSync(filePath, 'utf-8')
  writeFileSync(filePath, content.replaceAll(from, to))
}

function replaceInDir(dir: string, from: string, to: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      replaceInDir(full, from, to)
    } else if (/\.(ts|tsx|json)$/.test(full)) {
      replaceInFile(full, from, to)
    }
  }
}

export async function runCreate(name: string): Promise<void> {
  const templateDir = join(__dirname, '..', 'template')
  const targetDir = resolve(process.cwd(), name)

  console.log(chalk.cyan(`Creating plugin "${name}"...`))

  cpSync(templateDir, targetDir, { recursive: true })
  replaceInDir(targetDir, 'example-plugin', name)
  replaceInDir(targetDir, 'Example Plugin', name)

  console.log(chalk.cyan('Installing dependencies...'))
  try {
    execSync('pnpm install', { stdio: 'inherit', cwd: targetDir })
  } catch {
    console.log(chalk.yellow('pnpm not found, skipping install. Run: npm install'))
  }

  console.log(chalk.green(`✓ Created "${name}" at ./${name}`))
  console.log(`  cd ${name} && vencore dev`)
}
