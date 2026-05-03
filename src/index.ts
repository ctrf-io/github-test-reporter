import { runAction } from './core/action-handler.js'

async function run(): Promise<void> {
  await runAction()
}

run()
  .then(() => {})
  .catch(() => {})
