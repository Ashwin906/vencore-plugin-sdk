import { Command } from 'commander'
import { runCreate } from './commands/create'
import { runBuild } from './commands/build'
import { runDev } from './commands/dev'
import { runValidate } from './commands/validate'

const program = new Command()

program
  .name('vencore')
  .description('Vencore Plugin CLI')
  .version('0.1.0')

program
  .command('create <name>')
  .description('Scaffold a new plugin')
  .action(runCreate)

program
  .command('build')
  .description('Build plugin → <id>-<version>.zip')
  .action(runBuild)

program
  .command('dev')
  .description('Watch mode (no zip)')
  .action(runDev)

program
  .command('validate')
  .description('Lint plugin.json manifest')
  .action(runValidate)

program.parse()
