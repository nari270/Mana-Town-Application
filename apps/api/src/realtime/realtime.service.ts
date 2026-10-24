import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createRealtime,
  rawSql,
  type RawSqlQuery,
  type RealtimeDirectServer,
} from '@neon/realtime/server';

const APPROVED_BUSINESSES_SQL = `SELECT id, name, locality, address, status, updated_at
  FROM businesses WHERE status = 'APPROVED' ORDER BY updated_at DESC LIMIT 50`;

export interface LiveBusinessRow {
  id: string;
  name: string;
  locality: string;
  address: string;
  status: string;
  updated_at: Date;
}

export function approvedBusinessesQuery() {
  return rawSql<LiveBusinessRow>(APPROVED_BUSINESSES_SQL, []);
}

export function databaseNameFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private server?: RealtimeDirectServer<RawSqlQuery<unknown>>;

  getServer() {
    if (this.server) return this.server;
    const secret = process.env.NEON_REALTIME_SECRET;
    const url = process.env.NEON_REALTIME_URL;
    const databaseUrl = process.env.DATABASE_URL;
    if (!secret || !url || !databaseUrl) {
      throw new ServiceUnavailableException('Neon Realtime is not configured.');
    }
    this.server = createRealtime({
      secret,
      url,
      db: databaseNameFromUrl(databaseUrl),
    });
    return this.server;
  }

  async sealApprovedBusinesses() {
    return this.getServer().seal({ query: approvedBusinessesQuery() });
  }

  onModuleDestroy() {
    this.server?.close();
  }
}
