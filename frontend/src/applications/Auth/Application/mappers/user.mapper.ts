import { User } from "@/applications/Auth/Domain/entities/User.entity";

export interface UserDto {
  id: string;
  discord_id: string;
  username: string;
  avatar: string | null;
}

export const userMapper = {
  toDomain(dto: UserDto): User {
    return User.create(
      {
        discordId: dto.discord_id,
        username: dto.username,
        avatar: dto.avatar,
      },
      dto.id,
    );
  },

  toDto(user: User): UserDto {
    return {
      id: user.id,
      discord_id: user.discordId,
      username: user.username,
      avatar: user.avatar,
    };
  },
};
