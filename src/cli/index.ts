import { Command } from 'commander'
import { scanCommand } from './commands/scan'
import { initCommand } from './commands/init'
import { validateCommand } from './commands/validate'

const program = new Command()

program
  .name('cmdk-engine')
  .description('Smart command palette engine — route scanner and config generator')
  .version('0.0.0')

program.addCommand(scanCommand)
program.addCommand(initCommand)
program.addCommand(validateCommand)

program.parse()
