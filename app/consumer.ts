import { runBuildPipeline } from './services/build/pipeline'
import type { BuildJob, Env } from './types'

export async function queue(
  batch: MessageBatch<BuildJob>,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body

    try {
      await runBuildPipeline(job, env)
      message.ack()
    } catch (err) {
      console.error(`Build failed for version ${job.versionId}:`, err)
      // Cloudflare Queues will retry with exponential backoff
      message.retry()
    }
  }
}
