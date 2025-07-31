import { Pool, PoolClient } from 'pg'
import fs from 'fs'
import path from 'path'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

class Database {
  private pool: Pool | null = null
  private config: DatabaseConfig

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'grant_platform',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return
    }

    this.pool = new Pool(this.config)

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })

    // Test connection
    try {
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      console.log('Database connected successfully')
    } catch (error) {
      console.error('Failed to connect to database:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.pool
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const pool = this.getPool()
    const result = await pool.query(text, params)
    return result.rows
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params)
    return results.length > 0 ? results[0] : null
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = this.getPool()
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async initializeSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    const pool = this.getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      
      for (const statement of statements) {
        await client.query(statement)
      }
      
      await client.query('COMMIT')
      console.log('Database schema initialized successfully')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Utility methods for common queries
  async findById<T>(table: string, id: string): Promise<T | null> {
    return this.queryOne<T>(`SELECT * FROM ${table} WHERE id = $1`, [id])
  }

  async findByEmail<T>(table: string, email: string): Promise<T | null> {
    return this.queryOne<T>(`SELECT * FROM ${table} WHERE email = $1`, [email])
  }

  async insert<T>(table: string, data: Record<string, any>): Promise<T> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
    const columns = keys.join(', ')

    const query = `
      INSERT INTO ${table} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `

    const result = await this.queryOne<T>(query, values)
    if (!result) {
      throw new Error(`Failed to insert into ${table}`)
    }
    return result
  }

  async update<T>(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')

    const query = `
      UPDATE ${table}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    return this.queryOne<T>(query, [id, ...values])
  }

  async delete(table: string, id: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM ${table} WHERE id = $1`,
      [id]
    )
    return result.length > 0
  }

  // Vector search for RAG
  async searchSimilarChunks(
    queryEmbedding: number[],
    projectId: string,
    similarityThreshold: number = 0.7,
    maxResults: number = 10
  ): Promise<Array<{
    chunk_id: string
    content: string
    similarity: number
    metadata: any
  }>> {
    return this.query(
      `SELECT * FROM search_similar_chunks($1::vector, $2::uuid, $3, $4)`,
      [JSON.stringify(queryEmbedding), projectId, similarityThreshold, maxResults]
    )
  }

  // Check user regeneration quota
  async checkRegenerationQuota(userId: string): Promise<{
    used: number
    limit: number
    reset_date: string
  }> {
    const result = await this.queryOne(
      `SELECT * FROM check_regeneration_quota($1::uuid)`,
      [userId]
    )
    return result || { used: 0, limit: 10, reset_date: new Date().toISOString() }
  }
}

export const database = new Database()
export default database