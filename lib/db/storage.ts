import { PrismaClient } from '@prisma/client';
import type { TokenStorage, StoredTokens } from 'strava-sdk';

export class PrismaTokenStorage implements TokenStorage {
  constructor(private prisma: PrismaClient) {}

  async getTokens(athleteId: string): Promise<StoredTokens | null> {
    const token = await this.prisma.token.findUnique({
      where: { athleteId }
    });

    if (!token) return null;

    return {
      athleteId: token.athleteId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scopes: token.scopes
    };
  }

  async saveTokens(athleteId: string, tokens: StoredTokens): Promise<void> {
    const scopes = tokens.scopes ? Array.from(tokens.scopes) : [];

    await this.prisma.token.upsert({
      where: { athleteId },
      create: {
        athleteId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes
      }
    });
  }

  async deleteTokens(athleteId: string): Promise<void> {
    await this.prisma.token.delete({
      where: { athleteId }
    });
  }
}
