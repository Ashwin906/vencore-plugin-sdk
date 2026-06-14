import { execSync } from 'child_process'

export function runDev(): void {
  execSync('npx tsup --watch', { stdio: 'inherit', cwd: process.cwd() })
}
