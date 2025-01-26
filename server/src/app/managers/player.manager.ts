import { Socket } from "socket.io";
import { logger } from "../utils/logger.ts";

export interface PlayerProfile {
  nickname: string;
  avatar: string;
  musicId: string;
  isSpectator?: boolean;
}

export class PlayerManager {
  private players: Map<string, PlayerProfile> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private nicknames: { [socketId: string]: string } = {};
  private avatars: { [socketId: string]: string } = {};
  private musics: { [socketId: string]: string } = {};
  private spectators: Set<string> = new Set();
  private connectedPlayers: Set<string> = new Set();

  addPlayer(socketId: string, profile: PlayerProfile): void {
    this.players.set(socketId, profile);
    this.nicknames[socketId] = profile.nickname;
    this.avatars[socketId] = profile.avatar;
    this.musics[socketId] = profile.musicId;
    this.connectedPlayers.add(socketId);

    if (profile.isSpectator) {
      this.spectators.add(socketId);
    }

    logger.info(`Player added`, { socketId, profile });
  }

  isSpectator(socketId: string): boolean {
    return this.spectators.has(socketId);
  }

  playerExists(socketId: string): boolean {
    return this.players.has(socketId);
  }

  updateSpectatorStatus(socketId: string, isSpectator: boolean): void {
    if (isSpectator) {
      this.spectators.add(socketId);
    } else {
      this.spectators.delete(socketId);
    }

    const profile = this.players.get(socketId);
    if (profile) {
      this.players.set(socketId, {
        ...profile,
        isSpectator,
      });
    }
  }

  updatePlayerProfile(socketId: string, updates: Partial<PlayerProfile>): void {
    const currentProfile = this.players.get(socketId);
    if (currentProfile) {
      const updatedProfile = { ...currentProfile, ...updates };
      this.players.set(socketId, updatedProfile);

      if (updates.nickname) {
        this.nicknames[socketId] = updates.nickname;
      }
      if (updates.avatar) {
        this.avatars[socketId] = updates.avatar;
      }
      if (updates.musicId) {
        this.musics[socketId] = updates.musicId;
      }
      if (updates.isSpectator !== undefined) {
        this.updateSpectatorStatus(socketId, updates.isSpectator);
      }

      logger.info(`Player profile updated`, { socketId, updates });
    }
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    delete this.nicknames[socketId];
    delete this.avatars[socketId];
    delete this.musics[socketId];
    this.spectators.delete(socketId);
    this.connectedPlayers.delete(socketId);
    this.clearTimer(socketId);
    logger.info(`Player removed`, { socketId });
  }

  isPlayerConnected(socketId: string): boolean {
    return this.connectedPlayers.has(socketId);
  }

  getPlayersInfo(): Array<{
    id: string;
    nickname: string;
    avatar: string;
    musicId: string;
    isSpectator: boolean;
  }> {
    return Array.from(this.players.entries()).map(([id, _profile]) => ({
      id,
      nickname: this.nicknames[id] || id,
      avatar: this.avatars[id] || "",
      musicId: this.musics[id] || "",
      isSpectator: this.spectators.has(id),
    }));
  }

  getActivePlayers(): string[] {
    return Array.from(this.players.keys()).filter(
      (id) => !this.spectators.has(id)
    );
  }

  getPlayerNicknames(): { [socketId: string]: string } {
    return this.nicknames;
  }

  getPlayerAvatars(): { [socketId: string]: string } {
    return this.avatars;
  }

  getPlayerMusics(): { [socketId: string]: string } {
    return this.musics;
  }

  startPlayerTimer(socketId: string, socket: Socket, timeout: number): void {
    this.clearTimer(socketId);
    const timer = setTimeout(() => {
      const isProfileComplete = Boolean(
        this.nicknames[socketId] &&
          this.avatars[socketId] &&
          this.musics[socketId]
      );

      if (!isProfileComplete) {
        logger.info(`Auto-kicking player ${socketId} for incomplete profile`);
        socket.emit(
          "kickNotification",
          "Vous avez été déconnecté pour inactivité"
        );
        socket.disconnect(true);
        this.removePlayer(socketId);
      }
    }, timeout);

    this.timers.set(socketId, timer);
  }

  getPlayerNickname(socketId: string): string {
    return this.nicknames[socketId] || "";
  }

  areAllPlayersReady(playerIds: string[]): boolean {
    const activePlayers = playerIds.filter(
      (id) => !this.spectators.has(id) && this.isPlayerConnected(id)
    );

    const playersStatus = activePlayers.map((playerId) => ({
      playerId,
      nickname: this.nicknames[playerId],
      avatar: this.avatars[playerId],
      music: this.musics[playerId],
      isSpectator: this.spectators.has(playerId),
      isReady: Boolean(
        this.nicknames[playerId] &&
          this.avatars[playerId] &&
          this.musics[playerId]
      ),
    }));

    logger.info("Checking players status:", { playersStatus });

    return activePlayers.every((playerId) => {
      const isReady = Boolean(
        this.nicknames[playerId] &&
          this.avatars[playerId] &&
          this.musics[playerId]
      );

      if (!isReady) {
        logger.info(`Player ${playerId} not ready:`, {
          hasNickname: Boolean(this.nicknames[playerId]),
          hasAvatar: Boolean(this.avatars[playerId]),
          hasMusic: Boolean(this.musics[playerId]),
        });
      }

      return isReady;
    });
  }

  private clearTimer(socketId: string): void {
    const timer = this.timers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(socketId);
    }
  }
}
