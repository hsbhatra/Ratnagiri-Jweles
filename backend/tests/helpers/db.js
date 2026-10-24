import mongoose from 'mongoose'

/**
 * Connects to TEST_MONGODB_URI if set, else spins up mongodb-memory-server.
 * Returns null (and the DB-backed suites skip) if neither is available, e.g. in a
 * sandbox that can't download the MongoDB binary.
 */
export async function startDb() {
  let server = null
  let uri = process.env.TEST_MONGODB_URI
  try {
    if (!uri) {
      const { MongoMemoryServer } = await import('mongodb-memory-server')
      server = await MongoMemoryServer.create()
      uri = server.getUri()
    }
    await mongoose.connect(uri, { dbName: `rg_test_${process.pid}` })
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
    return {
      async reset() {
        await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})))
      },
      async stop() {
        await mongoose.connection.dropDatabase().catch(() => {})
        await mongoose.disconnect()
        if (server) await server.stop()
      },
    }
  } catch (err) {
    console.warn(`\n[tests] No MongoDB available — skipping DB-backed suites (${err.message.split('\n')[0]})\n`)
    if (server) await server.stop().catch(() => {})
    return null
  }
}
